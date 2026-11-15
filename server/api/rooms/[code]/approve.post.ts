import { eq } from 'drizzle-orm'
import { roomsTable } from '#server/db/schema.ts'
import { createError, getRouterParam, readBody } from 'h3'

// O mestre decide um pedido de entrada (Configurações de Sala > Acesso > "Aprovar entradas").
// Aprovar libera o acesso: quem espera recebe a sala na próxima consulta ao /join. Recusar
// barra o acesso e põe a pessoa na lista de removidos (marcada como recusada).
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
        throw createError({ statusCode: 403, statusMessage: 'Apenas o dono da sala pode aprovar entradas.' })
    }

    const body = await readBody<{ participantId?: string, approve?: boolean }>(event).catch(() => null)
    const participantId = body?.participantId
    if (typeof participantId !== 'string' || !participantId || participantId === 'anonimo' || typeof body?.approve !== 'boolean') {
        throw createError({ statusCode: 400, statusMessage: 'Pedido inválido.' })
    }

    if (participantId === participantIdForUser(code, session.user.id)) {
        throw createError({ statusCode: 400, statusMessage: 'O mestre não precisa de aprovação.' })
    }

    try {
        if (body.approve) {
            await approveParticipant(code, participantId)
            return { ok: true, approved: true, kicked: await listKicked(code) }
        }

        const name = await denyParticipant(code, participantId)
        return { ok: true, approved: false, name, kicked: await listKicked(code) }
    } catch (error) {
        console.error(`Erro ao decidir o pedido de entrada na sala ${code} no Redis:`, error)
        throw createError({
            statusCode: 503,
            statusMessage: 'O serviço de tempo real está indisponível no momento. Tente novamente em instantes.',
        })
    }
})
