import type { Peer } from 'crossws'

// Peers WebSocket inscritos em cada sala, mantidos em memória por instância — a Vercel roda
// várias instâncias serverless da função, e cada uma só enxerga os peers que conectaram nela.
// Por isso, qualquer mensagem que precise alcançar visitantes conectados em *outra* instância
// (uma edição salva via PATCH, por exemplo, quase certamente cai numa instância diferente da
// que segura a conexão WebSocket) é publicada no Redis (ver `publishToRoom`) além de ser
// entregue localmente — cada instância com peers de uma sala fica inscrita no canal dela e
// replica o que chega para os seus peers locais.
const peersByRoomCode = new Map<string, Set<Peer>>()
const subscriptionsByRoomCode = new Map<string, { unsubscribe: () => void }>()

// Último snapshot transmitido ao vivo (arrastar/redimensionar/adicionar/remover token) que
// ainda não foi salvo no banco — guardado no Redis (não em memória) para que um peer que
// acabou de conectar numa instância qualquer veja o estado atual da sala, mesmo que o dono
// esteja conectado a uma instância diferente.
const liveSnapshotKey = (code: string) => `room:${code}:live-snapshot`
const channelName = (code: string) => `room:${code}:events`

// Expira o rascunho ao vivo caso `clearRoomLiveSnapshot` nunca seja chamado (ex.: processo
// derrubado no meio de uma sessão) — evita lixo permanente no Redis.
const LIVE_SNAPSHOT_TTL_SECONDS = 60 * 60 * 6

export function addRoomPeer(code: string, peer: Peer) {
    let peers = peersByRoomCode.get(code)
    if (!peers) {
        peers = new Set()
        peersByRoomCode.set(code, peers)
    }
    peers.add(peer)
    ensureSubscribed(code)
}

export function removeRoomPeer(code: string, peer: Peer) {
    const peers = peersByRoomCode.get(code)
    if (!peers) return
    peers.delete(peer)
    if (peers.size === 0) {
        peersByRoomCode.delete(code)
        unsubscribeFromRoom(code)
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

// Chamado pelo handler do WebSocket quando o dono da sala transmite uma edição ao vivo.
// Entrega local é imediata (sem esperar o Redis) para não adicionar latência ao arrastar de
// tokens; a publicação no Redis roda em paralelo para alcançar visitantes em outras instâncias.
export async function broadcastSnapshotLive(code: string, snapshot: unknown, sender?: Peer) {
    const message = { type: 'snapshot:live', snapshot }
    broadcastToLocalPeers(code, message, sender)
    await publishToRoom(code, message)
}

// Chamado pelos endpoints PATCH/PUT de /api/v1/rooms/:id — quase sempre numa instância
// diferente da que segura as conexões WebSocket da sala, então a entrega depende do Redis.
export async function broadcastRoomUpdate(code: string, room: unknown) {
    // A partir daqui o banco é a fonte da verdade novamente — descarta qualquer
    // rascunho ao vivo (não salvo) que existia antes deste save.
    await clearRoomLiveSnapshot(code)
    await broadcastToRoom(code, { type: 'room:update', room })
}

export async function broadcastRoomClosed(code: string) {
    await clearRoomLiveSnapshot(code)
    await broadcastToRoom(code, { type: 'room:closed' })
    const peers = peersByRoomCode.get(code)
    if (peers) {
        for (const peer of peers) peer.close(4000, 'Sala encerrada.')
        peersByRoomCode.delete(code)
    }
    unsubscribeFromRoom(code)
}

async function broadcastToRoom(code: string, message: unknown) {
    broadcastToLocalPeers(code, message)
    await publishToRoom(code, message)
}

function broadcastToLocalPeers(code: string, message: unknown, sender?: Peer) {
    const peers = peersByRoomCode.get(code)
    if (!peers || peers.size === 0) return
    const data = JSON.stringify(message)
    for (const peer of peers) {
        if (peer === sender) continue
        peer.send(data)
    }
}

async function publishToRoom(code: string, message: unknown) {
    try {
        await redis.publish(channelName(code), JSON.stringify(message))
    } catch (error) {
        console.error(`Erro ao publicar evento da sala ${code} no Redis:`, error)
    }
}

// Mantém, por instância, no máximo uma inscrição por sala ativa: assinada quando o primeiro
// peer local conecta, cancelada quando o último se desconecta. Mensagens recebidas do Redis são
// replicadas só para os peers locais (nunca republicadas), o que evita um loop de publicação.
function ensureSubscribed(code: string) {
    if (subscriptionsByRoomCode.has(code)) return

    const subscription = redis.subscribe([channelName(code)])
    subscription.on('message', ({ message }: { message: unknown }) => {
        try {
            const parsed = typeof message === 'string' ? JSON.parse(message) : message
            broadcastToLocalPeers(code, parsed)
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
