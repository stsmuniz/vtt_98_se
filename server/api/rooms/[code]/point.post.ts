import { eq } from 'drizzle-orm'
import { roomsTable } from '#server/db/schema.ts'
import { createError, getRouterParam, readBody } from 'h3'

// Ferramenta "Apontar": o mestre clica num ponto do mapa e todos os conectados veem uma
// animação ali (3 ondas com o nome dele). Nada é gravado — só transmitido pela stream de eventos.
export default defineEventHandler(async (event) => {
    const code = getRouterParam(event, 'code')
    if (!code) {
        throw createError({ statusCode: 400, statusMessage: 'Código da sala não informado.' })
    }

    await enforceRateLimit(event, [{ key: `point:ip:${clientIp(event)}`, max: 90, window: 60 }])

    const room = await useDrizzle().query.roomsTable.findFirst({
        where: eq(roomsTable.code, code),
    })
    if (!room) {
        throw createError({ statusCode: 404, statusMessage: 'Sala não encontrada.' })
    }

    const participant = await resolveRoomParticipant(event, room)
    if (participant.role !== 'gm') {
        throw createError({ statusCode: 403, statusMessage: 'Apenas o mestre pode apontar.' })
    }

    const body = await readBody<{ x?: unknown, y?: unknown }>(event).catch(() => null)
    const x = Number(body?.x)
    const y = Number(body?.y)
    // Um pouco de folga em volta da cena (o clique pode cair na borda escura do canvas).
    const width = room.snapshot?.width ?? 10_000
    const height = room.snapshot?.height ?? 10_000
    const pad = Math.max(width, height)
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < -pad || y < -pad || x > width + pad || y > height + pad) {
        throw createError({ statusCode: 400, statusMessage: 'Ponto inválido.' })
    }

    const ping = {
        id: crypto.randomUUID(),
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        by: participant.name,
        at: Date.now(),
    }
    await broadcastPointer(code, ping)
    return ping
})
