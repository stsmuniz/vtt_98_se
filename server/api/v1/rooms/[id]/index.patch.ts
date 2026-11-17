import { tables } from "#server/utils/drizzle.ts";
import { buildRoomSnapshotFromScene, publicRoomResource } from "#server/utils/resources.ts";
import { and, eq } from "drizzle-orm";
import { createError } from "h3";
import type { RoomSettings } from "#server/db/schema.ts";

// `sceneId`, `snapshot` e `initiative` ficam fora: são validados um a um mais abaixo.
const PATCHABLE_FIELDS = ['name', 'tags', 'isOpen', 'settings'] as const

/** Forma mínima do estado da sala vindo do cliente (o resto do JSON é do próprio dono). */
function isRoomSnapshot(value: unknown): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    const snapshot = value as Record<string, unknown>
    return Array.isArray(snapshot.tokens)
        && Number.isFinite(snapshot.width)
        && Number.isFinite(snapshot.height)
}

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
        updateData.password = await hashRoomPassword(body.password)
    } else if (body.removePassword === true) {
        updateData.password = null
    }

    // Configurações de sala: só chaves conhecidas, com valores válidos; mescla com as atuais
    // para que salvar uma opção não apague as outras.
    let enablingApproval = false
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
        if (typeof incoming.requireApproval === 'boolean') {
            next.requireApproval = incoming.requireApproval
            enablingApproval = incoming.requireApproval && !current?.settings?.requireApproval
        }
        updateData.settings = next
    }

    const db = useDrizzle()

    // Cena de origem: o dono é conferido SEMPRE que `sceneId` vier — mesmo junto de um
    // `snapshot` explícito —, senão a sala apontaria para a cena de outro usuário, que a resposta,
    // a listagem e o /join público carregam inteira (`sourceScene` + cenário).
    if ('sceneId' in body) {
        const newSceneId = parseBodyId(body.sceneId, 'ID de cena inválido.')
        const scene = await getOwnedRowOrThrow(tables.scenesTable, newSceneId, session.user.id, 'Cena não encontrada.')
        updateData.sceneId = scene.id
        // Trocar de cena (sem um snapshot explícito) reconstrói o estado de jogo a partir dela, como
        // na criação da sala, em vez de só reapontar `sceneId` para tokens desatualizados.
        if (!('snapshot' in body)) updateData.snapshot = buildRoomSnapshotFromScene(scene)
    }
    if ('snapshot' in body) {
        if (!isRoomSnapshot(body.snapshot)) {
            throw createError({ statusCode: 400, statusMessage: 'Estado da sala inválido.' })
        }
        // Imagens dos tokens: só as aceitas (ver server/utils/imageUrls.ts); as que já estavam
        // gravadas nesta sala continuam valendo.
        const current = await db.query.roomsTable.findFirst({
            where: and(eq(tables.roomsTable.id, id), eq(tables.roomsTable.userId, session.user.id)),
            columns: { snapshot: true },
        })
        if (!current) {
            throw createError({ statusCode: 404, statusMessage: "Sala não encontrada." })
        }
        await assertAllowedTokenImages((body.snapshot as { tokens: unknown[] }).tokens, session.user.id, current.snapshot?.tokens ?? [])
        updateData.snapshot = body.snapshot
    }
    if ('initiative' in body) {
        if (!Array.isArray(body.initiative)) {
            throw createError({ statusCode: 400, statusMessage: 'Iniciativa inválida.' })
        }
        updateData.initiative = body.initiative
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
        // Ligou a aprovação: quem já está na sala segue nela (e não pede aprovação ao recarregar).
        if (enablingApproval) {
            await approveEveryoneInRoom(updatedRoom.code).catch((error: unknown) => {
                console.error(`Erro ao liberar quem já estava na sala ${updatedRoom.code}:`, error)
            })
        }
        // Senha definida, trocada ou removida: quem está conectado segue na sala; os tokens de quem
        // não está deixam de valer (ver `roomAccessTag` em server/utils/roomParticipants.ts).
        if ('password' in updateData) await broadcastAccessChanged(updatedRoom.code, roomAccessTag(updatedRoom.password))
        // O snapshot só vai junto quando mudou (salvar a sala, trocar de cena). Numa mudança de
        // configuração, nome, senha ou abrir/fechar, o snapshot do banco é o último SALVO: mandá-lo
        // faria todos (mestre e jogadores) voltarem ao estado salvo, perdendo o rascunho ao vivo.
        const { snapshot: _snapshot, ...withoutSnapshot } = publicRoomResource(updatedRoom)
        await broadcastRoomUpdate(updatedRoom.code, 'snapshot' in updateData ? publicRoomResource(updatedRoom) : withoutSnapshot)
        // Fechar a sala encerra a "sessão": todos os jogadores são desconectados e o histórico de
        // rolagens recomeça vazio.
        if (body.isOpen === false) {
            await broadcastRoomShut(updatedRoom.code)
            await resetDiceLog(updatedRoom.code)
        }
    }

    return updatedRoom ? publicRoomResource(updatedRoom) : updatedRoom
})
