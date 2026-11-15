import { tables } from "#server/utils/drizzle.ts";
import { and, eq } from "drizzle-orm";
import { createError } from "h3";

export default defineEventHandler(async (event) => {
    const user = await requireUser(event)
    const id = parseIdParam(event)

    const body = await readBody<Record<string, unknown>>(event)
    if (!body) {
        throw createError({ statusCode: 400, statusMessage: 'Nenhum dado enviado.' })
    }

    const updateData: Record<string, unknown> = {}
    // O cenário tem de ser do próprio usuário: o `where` abaixo só garante que a *cena* é dele,
    // e a resposta (e o /join das salas) carregaria o cenário apontado com `with: { scenario }`.
    if ('scenarioId' in body) {
        const scenarioId = parseBodyId(body.scenarioId, 'Cenário inválido.')
        await getOwnedRowOrThrow(tables.scenariosTable, scenarioId, user.id, 'Cenário não encontrado.')
        updateData.scenarioId = scenarioId
    }
    if ('width' in body) updateData.width = parseSceneDimension(body.width)
    if ('height' in body) updateData.height = parseSceneDimension(body.height)
    // name/tags passam pela validação compartilhada (renomear com F2 nas pastas).
    Object.assign(updateData, sanitizeNameAndTags(body))
    if (!Object.keys(updateData).length) {
        throw createError({ statusCode: 400, statusMessage: 'Nada para atualizar.' })
    }

    const db = useDrizzle()
    const [scene] = await db
        .update(tables.scenesTable)
        .set(updateData)
        .where(and(eq(tables.scenesTable.id, id), eq(tables.scenesTable.userId, user.id)))
        .returning({ id: tables.scenesTable.id })

    if (!scene) {
        throw createError({
            statusCode: 404,
            statusMessage: "Cena não encontrada.",
        })
    }

    return db.query.scenesTable.findFirst({
        where: eq(tables.scenesTable.id, scene.id),
        with: {
            scenario: true
        }
    })
})
