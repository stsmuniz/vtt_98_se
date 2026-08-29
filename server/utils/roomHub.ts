// Nitro/crossws não suporta upgrade de WebSocket no preset da Vercel — só em Node.js, Bun,
// Deno e Cloudflare Workers (https://nitro.build/docs/websocket). Como a sala só precisa de
// entrega em uma direção (servidor -> navegador; a única mensagem que o dono manda ao vivo vai
// por HTTP normal, ver `server/api/rooms/[code]/live.post.ts`), o transporte usado aqui é
// Server-Sent Events (`createEventStream`, em `server/routes/api/rooms/[code]/events.get.ts`),
// que é só uma resposta HTTP normal em streaming e funciona sem configuração especial na Vercel.

type RoomListener = (message: unknown) => void

// Callbacks (um por stream SSE aberta) inscritos em cada sala, mantidos em memória por
// instância — a Vercel roda várias instâncias serverless da função, e cada uma só enxerga os
// listeners que conectaram nela. Por isso, qualquer mensagem que precise alcançar visitantes
// conectados em *outra* instância (uma edição salva via PATCH, por exemplo, quase certamente
// cai numa instância diferente da que segura a stream SSE) é publicada no Redis (ver
// `publishToRoom`) além de ser entregue localmente — cada instância com listeners de uma sala
// fica inscrita no canal dela e replica o que chega para os seus listeners locais.
const listenersByRoomCode = new Map<string, Set<RoomListener>>()
const subscriptionsByRoomCode = new Map<string, { unsubscribe: () => void }>()

// Último snapshot transmitido ao vivo (arrastar/redimensionar/adicionar/remover token) que
// ainda não foi salvo no banco — guardado no Redis (não em memória) para que um visitante que
// acabou de conectar numa instância qualquer veja o estado atual da sala, mesmo que o dono
// esteja conectado a uma instância diferente.
const liveSnapshotKey = (code: string) => `room:${code}:live-snapshot`
const channelName = (code: string) => `room:${code}:events`

// Expira o rascunho ao vivo caso `clearRoomLiveSnapshot` nunca seja chamado (ex.: processo
// derrubado no meio de uma sessão) — evita lixo permanente no Redis.
const LIVE_SNAPSHOT_TTL_SECONDS = 60 * 60 * 6

// Chamado quando uma stream SSE abre para uma sala. Retorna uma função de limpeza que deve ser
// chamada quando a stream fecha (ver `eventStream.onClosed` no handler da rota).
export function subscribeToRoomEvents(code: string, listener: RoomListener): () => void {
    let listeners = listenersByRoomCode.get(code)
    if (!listeners) {
        listeners = new Set()
        listenersByRoomCode.set(code, listeners)
    }
    listeners.add(listener)
    ensureSubscribed(code)

    return () => {
        const current = listenersByRoomCode.get(code)
        if (!current) return
        current.delete(listener)
        if (current.size === 0) {
            listenersByRoomCode.delete(code)
            unsubscribeFromRoom(code)
        }
    }
}

export async function getRoomLiveSnapshot(code: string): Promise<unknown> {
    return await redis.get(liveSnapshotKey(code))
}

export async function setRoomLiveSnapshot(code: string, snapshot: unknown) {
    await redis.set(liveSnapshotKey(code), snapshot, { ex: LIVE_SNAPSHOT_TTL_SECONDS })
}

export async function clearRoomLiveSnapshot(code: string) {
    await redis.del(liveSnapshotKey(code))
}

// Chamado pelo endpoint POST /api/rooms/:code/live quando o dono da sala transmite uma edição
// ao vivo. Entrega local é imediata (sem esperar o Redis) para não adicionar latência ao
// arrastar de tokens; a publicação no Redis roda em paralelo para alcançar visitantes em
// outras instâncias.
export async function broadcastSnapshotLive(code: string, snapshot: unknown) {
    const message = { type: 'snapshot:live', snapshot }
    broadcastToLocalListeners(code, message)
    await publishToRoom(code, message)
}

// Chamado pelos endpoints PATCH/PUT de /api/v1/rooms/:id — quase sempre numa instância
// diferente da que segura as streams SSE da sala, então a entrega depende do Redis.
export async function broadcastRoomUpdate(code: string, room: unknown) {
    // A partir daqui o banco é a fonte da verdade novamente — descarta qualquer
    // rascunho ao vivo (não salvo) que existia antes deste save.
    await clearRoomLiveSnapshot(code)
    await broadcastToRoom(code, { type: 'room:update', room })
}

export async function broadcastRoomClosed(code: string) {
    await clearRoomLiveSnapshot(code)
    await broadcastToRoom(code, { type: 'room:closed' })
}

async function broadcastToRoom(code: string, message: unknown) {
    broadcastToLocalListeners(code, message)
    await publishToRoom(code, message)
}

function broadcastToLocalListeners(code: string, message: unknown) {
    const listeners = listenersByRoomCode.get(code)
    if (!listeners || listeners.size === 0) return
    for (const listener of listeners) listener(message)
}

async function publishToRoom(code: string, message: unknown) {
    try {
        await redis.publish(channelName(code), JSON.stringify(message))
    } catch (error) {
        console.error(`Erro ao publicar evento da sala ${code} no Redis:`, error)
    }
}

// Mantém, por instância, no máximo uma inscrição por sala ativa: assinada quando o primeiro
// listener local conecta, cancelada quando o último se desconecta. Mensagens recebidas do
// Redis são replicadas só para os listeners locais (nunca republicadas), o que evita um loop
// de publicação.
function ensureSubscribed(code: string) {
    if (subscriptionsByRoomCode.has(code)) return

    const subscription = redis.subscribe([channelName(code)])
    subscription.on('message', ({ message }: { message: unknown }) => {
        try {
            const parsed = typeof message === 'string' ? JSON.parse(message) : message
            broadcastToLocalListeners(code, parsed)
        } catch (error) {
            console.error(`Erro ao processar evento recebido do Redis para a sala ${code}:`, error)
        }
    })
    subscription.on('error', (error: unknown) => {
        console.error(`Erro na inscrição Redis da sala ${code}:`, error)
    })

    subscriptionsByRoomCode.set(code, subscription)
}

function unsubscribeFromRoom(code: string) {
    const subscription = subscriptionsByRoomCode.get(code)
    if (!subscription) return
    subscription.unsubscribe()
    subscriptionsByRoomCode.delete(code)
}
