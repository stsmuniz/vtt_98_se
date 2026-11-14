import { eq } from 'drizzle-orm'
import { roomsTable } from '#server/db/schema.ts'
import { createError, getRouterParam } from 'h3'

// Mestre limpa o histórico de rolagens da sala (todos os conectados recebem `dice:clear`).
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
        throw createError({ statusCode: 403, statusMessage: 'Apenas o dono da sala pode limpar o histórico.' })
    }

    await resetDiceLog(code)
    return { ok: true }
})
