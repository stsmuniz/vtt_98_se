import { eq } from 'drizzle-orm'
import { roomsTable } from '#server/db/schema.ts'
import { createError, getRouterParam, readBody } from 'h3'

// Recebe a transmissão ao vivo de edições de token do dono da sala (arrastar, redimensionar,
// duplicar, remover, atributos) e replica para quem está com a stream de eventos aberta (ver
// events.get.ts) — sem tocar no banco. Substitui a mensagem `snapshot:live` que antes ia por
// WebSocket; só o dono manda algo ao vivo, então um POST comum resolve.
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
        throw createError({ statusCode: 403, statusMessage: 'Apenas o dono da sala pode transmitir alterações.' })
    }

    const body = await readBody<{ snapshot?: unknown }>(event)
    if (!body?.snapshot) {
        throw createError({ statusCode: 400, statusMessage: 'Nenhum snapshot enviado.' })
    }

    await Promise.all([
        setRoomLiveSnapshot(code, body.snapshot),
        broadcastSnapshotLive(code, body.snapshot),
    ])

    return { ok: true }
})
