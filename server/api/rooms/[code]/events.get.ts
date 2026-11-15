import { eq } from 'drizzle-orm'
import { roomsTable } from '#server/db/schema.ts'
import { createEventStream, createError, getQuery, getRouterParam } from 'h3'
import { playerRoomMessage, playerSnapshot } from '#server/utils/resources.ts'

// Mensagem já filtrada para jogadores, por mensagem: a mesma mensagem vai para todas as streams
// desta instância, então o filtro (e o JSON) é feito uma vez só e não uma vez por jogador.
const playerPayloadCache = new WeakMap<object, string>()

function playerPayload(message: unknown): string {
    if (!message || typeof message !== 'object') return JSON.stringify(playerRoomMessage(message))
    let payload = playerPayloadCache.get(message)
    if (payload === undefined) {
        payload = JSON.stringify(playerRoomMessage(message))
        playerPayloadCache.set(message, payload)
    }
    return payload
}

// Stream de eventos ao vivo da sala (Server-Sent Events): substitui o WebSocket original, que
// não é suportado pelo preset da Vercel (ver roomHub.ts). Só entrega dados nesta direção — a
// única mensagem que o dono da sala manda ao vivo (`snapshot:live`) vai por um POST comum em
// server/api/rooms/[code]/live.post.ts, então não há necessidade de um canal bidirecional.
//
// Autenticação: o dono usa a sessão do better-auth (mesmo cookie do dashboard). Os demais
// precisam de um `token` de participante de curta duração emitido por /join (ver
// roomParticipants.ts) — ele também diz quem é (nome único na sala) e a senha em si nunca
// trafega numa query string.
export default defineEventHandler(async (event) => {
    const code = getRouterParam(event, 'code')
    if (!code) {
        throw createError({ statusCode: 400, statusMessage: 'Código da sala não informado.' })
    }

    // Abrir streams em massa custa tempo de função e comandos no Redis. Uma conexão normal dura
    // minutos (até a Vercel encerrar a função e o EventSource reconectar), então o limite por IP
    // só pesa para quem abre e fecha streams sem parar.
    await enforceRateLimit(event, [{ key: `events:ip:${clientIp(event)}`, max: 60, window: 60 }])

    const room = await useDrizzle().query.roomsTable.findFirst({
        where: eq(roomsTable.code, code),
    })

    if (!room) {
        throw createError({ statusCode: 404, statusMessage: 'Sala não encontrada.' })
    }

    // Dono (sessão) ou participante com token emitido por /join; lança 401/403 se não houver acesso.
    const participant = await resolveRoomParticipant(event, room)
    const isOwner = participant.role === 'gm'
    // Sem Redis (modo degradado) não há identidade nem presença para acompanhar.
    const tracksPresence = participant.id !== 'anonimo'

    // Teto de streams simultâneas por participante (abas, reconexões em massa).
    const streamId = crypto.randomUUID()
    if (tracksPresence && !await registerStream(code, participant.id, streamId)) {
        throw createError({ statusCode: 429, statusMessage: 'Conexões demais abertas para esta sala.' })
    }

    const eventStream = createEventStream(event)
    // Verdadeiro depois que o mestre removeu este participante: o `onClosed` não deve devolvê-lo
    // à lista de presença (já foi tirado dela pelo kick).
    let kickedHere = false

    const accessToken = getQuery(event).token

    const unsubscribe = subscribeToRoomEvents(code, (message) => {
        const typed = message as { type?: string, accessTag?: string }

        // Senha trocada com esta stream aberta: quem está na sala continua nela (o token passa a
        // provar a senha nova). Mensagem interna: não vai para o navegador de ninguém.
        if (typed?.type === 'access:changed') {
            if (!isOwner && tracksPresence && typed.accessTag) {
                reverifyParticipantToken(code, accessToken, typed.accessTag).catch((error: unknown) => {
                    console.error(`Erro ao renovar o acesso de um participante da sala ${code}:`, error)
                })
            }
            return
        }

        // Sala excluída: o jogador recebe o aviso e a stream acaba (o EventSource tenta reconectar,
        // recebe 404 e o cliente mostra o erro) — sem isso a stream seguiria aberta à toa. Fechar
        // a sala (`isOpen: false`) NÃO derruba ninguém: quem está dentro continua (ver
        // resolveRoomParticipant); só novos visitantes ficam de fora.
        if (!isOwner && typed?.type === 'room:closed') {
            eventStream.push(playerPayload(message))
                .catch(() => {})
                .finally(() => eventStream.close().catch(() => {}))
            return
        }

        // Rolagens escondidas só chegam ao mestre.
        if ((message as { gmOnly?: boolean })?.gmOnly && !isOwner) return

        // Removido pelo mestre: avisa (o cliente mostra o motivo) e encerra a stream. O
        // `presence` que o mestre publica em seguida já não inclui este participante.
        const kicked = message as { type?: string, participantId?: string }
        if (kicked?.type === 'kicked') {
            if (kicked.participantId !== participant.id) return
            kickedHere = true
            eventStream.push(JSON.stringify(message))
                .catch(() => {})
                .finally(() => eventStream.close().catch(() => {}))
            return
        }

        // Jogadores recebem a sala e o rascunho ao vivo sem o que é só do mestre (ver
        // `playerRoomResource` em server/utils/resources.ts).
        eventStream.push(isOwner ? JSON.stringify(message) : playerPayload(message)).catch(() => {})
    })

    // Mantém a stream viva quando a sala fica sem atividade (ninguém arrastou nada) — sem
    // isto, nenhum byte trafega até o primeiro evento real, e tanto o EventSource do
    // navegador quanto qualquer proxy no meio do caminho podem tratar isso como uma conexão
    // parada e encerrá-la.
    // O mesmo ping renova a presença e, como quem some sem avisar (aba fechada, função da
    // Vercel derrubada) só deixa de dar sinal, confere se a lista mudou e avisa SÓ esta stream —
    // cada stream faz o mesmo, então todas acabam sabendo sem precisar de um broadcast.
    // Só o mestre vê quem está na sala (e os pedidos de entrada): jogadores não recebem a
    // lista, nem aqui nem pelo broadcast (`gmOnly`, filtrado acima).
    let lastPresence = ''
    const pushPresence = (participants: unknown[]) => {
        if (!isOwner) return
        const serialized = JSON.stringify(participants)
        if (serialized === lastPresence) return
        lastPresence = serialized
        eventStream.push(JSON.stringify({ type: 'presence', participants })).catch(() => {})
    }

    // Pedidos de entrada aguardando aprovação: lista completa ao conectar e a cada ping (o
    // cliente ignora os que já mostrou), então um pedido feito com o mestre desconectado
    // aparece assim que ele volta, e os abandonados (ver `listPending`) deixam de aparecer.
    let lastPending = ''
    const pushPending = (requests: unknown[]) => {
        if (!isOwner) return
        const serialized = JSON.stringify(requests)
        if (serialized === lastPending) return
        lastPending = serialized
        eventStream.push(JSON.stringify({ type: 'join:pending', requests })).catch(() => {})
    }

    const heartbeat = setInterval(() => {
        eventStream.push(JSON.stringify({ type: 'ping' })).catch(() => {})
        if (!tracksPresence || kickedHere) return
        touchStream(code, participant.id, streamId).catch(() => {})
        touchPresence(code, participant)
            .then(() => isOwner ? listPresence(code) : [])
            .then(pushPresence)
            .catch(() => {})
        if (isOwner) listPending(code).then(pushPending).catch(() => {})
    }, 20_000)

    eventStream.onClosed(() => {
        clearInterval(heartbeat)
        unsubscribe()
        if (tracksPresence) unregisterStream(code, participant.id, streamId).catch(() => {})
        if (tracksPresence && !kickedHere) {
            removePresence(code, participant.id)
                .then(() => listPresence(code))
                .then(list => broadcastPresence(code, list))
                .catch(() => {})
        }
    })

    // IMPORTANTE: nenhum `push` acima é aguardado (`await`), e o rascunho ao vivo abaixo
    // também não é. `push()` escreve num stream interno que só é drenado depois que
    // `send()` (a última linha) conecta o leitor da resposta HTTP — aguardar um `push` antes
    // disso trava para sempre, porque o leitor ainda não existe.
    eventStream.push(JSON.stringify({ type: 'connected' })).catch(() => {})
    getRoomLiveSnapshot(code)
        .then((liveSnapshot) => {
            if (liveSnapshot) {
                return eventStream.push(JSON.stringify({ type: 'snapshot:live', snapshot: isOwner ? liveSnapshot : playerSnapshot(liveSnapshot) }))
            }
        })
        .catch(() => {})

    // Entrada: registra a presença, manda a lista a esta stream e avisa os demais.
    if (tracksPresence) {
        touchPresence(code, participant)
            .then(() => listPresence(code))
            .then((list) => {
                pushPresence(list)
                return broadcastPresence(code, list)
            })
            .catch(() => {})
    }
    if (isOwner) listPending(code).then(pushPending).catch(() => {})

    getDiceLog(code)
        .then((rolls) => {
            const visible = isOwner ? rolls : rolls.filter((roll) => !roll.hidden)
            return eventStream.push(JSON.stringify({ type: 'dice:log', rolls: visible }))
        })
        .catch(() => {})

    return eventStream.send()
})
