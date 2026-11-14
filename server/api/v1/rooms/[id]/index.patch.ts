import { tables } from "#server/utils/drizzle.ts";
import { buildRoomSnapshotFromScene, publicRoomResource } from "#server/utils/resources.ts";
import { and, eq } from "drizzle-orm";
import { createError } from "h3";
import { hashSync } from "bcrypt-ts";
import type { RoomSettings } from "#server/db/schema.ts";

const PATCHABLE_FIELDS = ['name', 'tags', 'sceneId', 'snapshot', 'initiative', 'isOpen', 'settings'] as const

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
    // name/tags passam pela validação compartilhada (renomear com F2 nas pastas).
    Object.assign(updateData, sanitizeNameAndTags(body))

    // Senha: `password` (texto) define/troca; `removePassword: true` tira a proteção. O hash
    // nunca é aceito direto do cliente e nunca volta na resposta.
    if (typeof body.password === 'string' && body.password.trim()) {
        updateData.password = hashSync(body.password)
    } else if (body.removePassword === true) {
        updateData.password = null
    }

    // Configurações de sala: só chaves conhecidas, com valores válidos; mescla com as atuais
    // para que salvar uma opção não apague as outras.
    if ('settings' in body) {
        const incoming = (body.settings ?? {}) as Record<string, unknown>
        const current = await useDrizzle().query.roomsTable.findFirst({
            where: and(eq(tables.roomsTable.id, id), eq(tables.roomsTable.userId, session.user.id)),
            columns: { settings: true },
        })
        const next: RoomSettings = { ...(current?.settings ?? {}) }
        if (incoming.dicePopup === 'window' || incoming.dicePopup === 'joey' || incoming.dicePopup === 'off') {
            next.dicePopup = incoming.dicePopup
        }
        if (typeof incoming.allowPlayerRolls === 'boolean') {
            next.allowPlayerRolls = incoming.allowPlayerRolls
        }
        updateData.settings = next
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
        // Fechar a sala encerra a "sessão": o histórico de rolagens recomeça vazio.
        if (body.isOpen === false) await resetDiceLog(updatedRoom.code)
    }

    return updatedRoom ? publicRoomResource(updatedRoom) : updatedRoom
})
