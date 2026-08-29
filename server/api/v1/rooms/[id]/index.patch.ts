import { tables } from "#server/utils/drizzle.ts";
import { buildRoomSnapshotFromScene, publicRoomResource } from "#server/utils/resources.ts";
import { and, eq } from "drizzle-orm";
import { createError } from "h3";

const PATCHABLE_FIELDS = ['name', 'tags', 'sceneId', 'snapshot', 'initiative', 'isOpen'] as const

export default defineEventHandler(async (event) => {
    const session = await auth.api.getSession({
        headers: event.headers,
    })

    if (!session || !session.user) {
        throw createError({ statusCode: 401, statusMessage: 'Não autorizado.' })
    }

    const id = parseIdParam(event)

    const body = await readBody<Record<string, unknown>>(event)
    if (!body) {
        throw createError({ statusCode: 400, statusMessage: 'Nenhum dado enviado.' })
    }

    const updateData: Record<string, unknown> = {}
    for (const field of PATCHABLE_FIELDS) {
        if (field in body) updateData[field] = body[field]
    }

    const db = useDrizzle()

    // Switching a room to a different scene (without an explicit snapshot override) rebuilds
    // its live-play state from that scene, mirroring how a room's snapshot is first built on
    // creation, instead of just repointing sceneId at stale token data.
    if ('sceneId' in body && !('snapshot' in body)) {
        const newSceneId = Number(body.sceneId)
        if (!newSceneId || Number.isNaN(newSceneId)) {
            throw createError({ statusCode: 400, statusMessage: 'ID de cena inválido.' })
        }

        const scene = await getOwnedRowOrThrow(tables.scenesTable, newSceneId, session.user.id, 'Cena não encontrada.')
        updateData.snapshot = buildRoomSnapshotFromScene(scene)
    }
    const [room] = await db
        .update(tables.roomsTable)
        .set(updateData)
        .where(and(eq(tables.roomsTable.id, id), eq(tables.roomsTable.userId, session.user.id)))
        .returning({ id: tables.roomsTable.id })

    if (!room) {
        throw createError({
            statusCode: 404,
            statusMessage: "Sala não encontrada.",
        })
    }

    const updatedRoom = await db.query.roomsTable.findFirst({
        where: eq(tables.roomsTable.id, room.id),
        with: {
            sourceScene: {
                with: {
                    scenario: true
                }
            }
        }
    })

    if (updatedRoom) {
        await broadcastRoomUpdate(updatedRoom.code, publicRoomResource(updatedRoom))
    }

    return updatedRoom
})
