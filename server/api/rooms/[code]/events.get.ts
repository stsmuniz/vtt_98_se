import { eq } from 'drizzle-orm'
import { roomsTable } from '#server/db/schema.ts'
import { createEventStream, createError, getQuery, getRouterParam } from 'h3'

// Stream de eventos ao vivo da sala (Server-Sent Events): substitui o WebSocket original, que
// não é suportado pelo preset da Vercel (ver roomHub.ts). Só entrega dados nesta direção — a
// única mensagem que o dono da sala manda ao vivo (`snapshot:live`) vai por um POST comum em
// server/api/rooms/[code]/live.post.ts, então não há necessidade de um canal bidirecional.
//
// Autenticação: o dono usa a sessão do better-auth (mesmo cookie do dashboard). Um visitante
// de sala com senha não tem essa sessão, então precisa de um `token` de acesso de curta
// duração emitido por /join (ver comentário lá) — a senha em si nunca trafega numa query string.
export default defineEventHandler(async (event) => {
    const code = getRouterParam(event, 'code')
    if (!code) {
        throw createError({ statusCode: 400, statusMessage: 'Código da sala não informado.' })
    }

    const room = await useDrizzle().query.roomsTable.findFirst({
        where: eq(roomsTable.code, code),
    })

    if (!room) {
        throw createError({ statusCode: 404, statusMessage: 'Sala não encontrada.' })
    }

    const session = await auth.api.getSession({ headers: event.headers }).catch(() => null)
    const isOwner = !!session?.user && session.user.id === room.userId

    if (!room.isOpen && !isOwner) {
        throw createError({ statusCode: 403, statusMessage: 'Esta sala está fechada no momento.' })
    }

    if (room.password && !isOwner) {
        const token = getQuery(event).token
        const grantedCode = typeof token === 'string' ? await redis.get(`room-access:${token}`) : null
        if (grantedCode !== code) {
            throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
        }
    }

    const eventStream = createEventStream(event)

    const unsubscribe = subscribeToRoomEvents(code, (message) => {
        eventStream.push(JSON.stringify(message)).catch(() => {})
    })

    // Mantém a stream viva quando a sala fica sem atividade (ninguém arrastou nada) — sem
    // isto, nenhum byte trafega até o primeiro evento real, e tanto o EventSource do
    // navegador quanto qualquer proxy no meio do caminho podem tratar isso como uma conexão
    // parada e encerrá-la.
    const heartbeat = setInterval(() => {
        eventStream.push(JSON.stringify({ type: 'ping' })).catch(() => {})
    }, 20_000)

    eventStream.onClosed(() => {
        clearInterval(heartbeat)
        unsubscribe()
    })

    // IMPORTANTE: nenhum `push` acima é aguardado (`await`), e o rascunho ao vivo abaixo
    // também não é. `push()` escreve num stream interno que só é drenado depois que
    // `send()` (a última linha) conecta o leitor da resposta HTTP — aguardar um `push` antes
    // disso trava para sempre, porque o leitor ainda não existe.
    eventStream.push(JSON.stringify({ type: 'connected' })).catch(() => {})
    getRoomLiveSnapshot(code)
        .then((liveSnapshot) => {
            if (liveSnapshot) {
                return eventStream.push(JSON.stringify({ type: 'snapshot:live', snapshot: liveSnapshot }))
            }
        })
        .catch(() => {})

    return eventStream.send()
})
