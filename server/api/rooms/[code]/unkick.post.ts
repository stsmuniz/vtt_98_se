import { eq } from 'drizzle-orm'
import { roomsTable } from '#server/db/schema.ts'
import { createError, getRouterParam, readBody } from 'h3'

// O mestre revoga a remoção de um participante: ele volta a poder entrar na sala.
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
        throw createError({ statusCode: 403, statusMessage: 'Apenas o dono da sala pode readmitir participantes.' })
    }

    const body = await readBody<{ participantId?: string }>(event).catch(() => null)
    if (typeof body?.participantId !== 'string' || !body.participantId) {
        throw createError({ statusCode: 400, statusMessage: 'Participante não informado.' })
    }

    try {
        await unkickParticipant(code, body.participantId)
        return { ok: true, kicked: await listKicked(code) }
    } catch (error) {
        console.error(`Erro ao readmitir participante da sala ${code} no Redis:`, error)
        throw createError({
            statusCode: 503,
            statusMessage: 'O serviço de tempo real está indisponível no momento. Tente novamente em instantes.',
        })
    }
})
