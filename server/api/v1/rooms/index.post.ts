import { tables, useDrizzle } from "#server/utils/drizzle.ts";
import { generateRoomCode } from "#server/utils/api.ts";
import { buildRoomSnapshotFromScene } from "#server/utils/resources.ts";
import { and, eq } from "drizzle-orm";
import { createError, readBody } from "h3";
import {hashSync} from "bcrypt-ts";

export default defineEventHandler(async (event) => {
    const session = await auth.api.getSession({ headers: event.headers })
    if (!session || !session.user) {
        throw createError({ statusCode: 401, statusMessage: 'Não autorizado.' })
    }

    const body = await readBody<Record<string, unknown>>(event)
    if (!body) {
        throw createError({ statusCode: 400, statusMessage: 'Nenhum dado enviado.' })
    }

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) {
        throw createError({ statusCode: 400, statusMessage: 'O nome da sala é obrigatório.' })
    }

    const sceneId = Number(body.sceneId)
    if (!sceneId || Number.isNaN(sceneId)) {
        throw createError({ statusCode: 400, statusMessage: 'Selecione uma cena inicial para a sala.' })
    }

    const db = useDrizzle()

    const scene = await db.query.scenesTable.findFirst({
        where: and(eq(tables.scenesTable.id, sceneId), eq(tables.scenesTable.userId, session.user.id)),
    })

    if (!scene) {
        throw createError({ statusCode: 404, statusMessage: 'Cena não encontrada.' })
    }

    const snapshot = buildRoomSnapshotFromScene(scene)

    const code = await generateRoomCode()

    const [room] = await db.insert(tables.roomsTable).values({
        code,
        name,
        password: typeof body.password === 'string' && body.password ? hashSync(body.password) : null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        userId: session.user.id,
        sceneId: scene.id,
        snapshot,
    }).returning()

    return room
})
