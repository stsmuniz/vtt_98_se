import { eq } from 'drizzle-orm'
import { roomsTable } from '#server/db/schema.ts'
import { createError, getRouterParam, readBody } from 'h3'

// O mestre remove um participante da sala: ele perde o acesso (join, eventos e rolagens
// passam a responder 403), a stream dele é encerrada e todos recebem a lista de presença nova.
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
    if (!session?.user || session.user.id !== room.userId) {
        throw createError({ statusCode: 403, statusMessage: 'Apenas o dono da sala pode remover participantes.' })
    }

    const body = await readBody<{ participantId?: string }>(event).catch(() => null)
    const participantId = body?.participantId
    if (typeof participantId !== 'string' || !participantId || participantId === 'anonimo') {
        throw createError({ statusCode: 400, statusMessage: 'Participante não informado.' })
    }

    if (participantId === participantIdForUser(code, session.user.id)) {
        throw createError({ statusCode: 400, statusMessage: 'O mestre não pode se remover da sala.' })
    }

    try {
        // O nome vem da presença (o servidor, não o corpo da requisição) para a lista de removidos.
        const name = (await listPresence(code)).find(p => p.id === participantId)?.name ?? 'Participante'
        await kickParticipant(code, participantId, name)
    } catch (error) {
        console.error(`Erro ao remover participante da sala ${code} no Redis:`, error)
        throw createError({
            statusCode: 503,
            statusMessage: 'O serviço de tempo real está indisponível no momento. Tente novamente em instantes.',
        })
    }

    await broadcastKicked(code, participantId)
    await broadcastPresence(code, await listPresence(code))

    return { ok: true, kicked: await listKicked(code) }
})
