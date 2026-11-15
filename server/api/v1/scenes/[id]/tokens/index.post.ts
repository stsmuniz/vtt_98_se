import { createError } from 'h3';
import { tables } from "#server/utils/drizzle.ts";
import { and, eq } from "drizzle-orm";
import type { SceneToken } from "#server/db/schema.ts";

export default defineEventHandler(async (event) => {
    const user = await requireUser(event)

    const id = parseIdParam(event)

    const body = await readBody<SceneToken | SceneToken[]>(event)

    if (!body || typeof body !== 'object') {
        throw createError({
            statusCode: 400,
            statusMessage: "Body inválido. Envie um SceneToken ou um array de SceneToken.",
        })
    }

    const db = useDrizzle()

    // A cena tem de ser do usuário (404 antes de qualquer coisa); os tokens já gravados nela
    // servem de referência para as imagens que continuam valendo.
    const scene = await getOwnedRowOrThrow(tables.scenesTable, id, user.id, "Cena não encontrada.")

    let newTokens: SceneToken[]

    if (Array.isArray(body)) {
        newTokens = body
    } else {
        newTokens = [...(scene.tokens ?? []), body]
    }

    if (!newTokens.every(token => token && typeof token === 'object')) {
        throw createError({ statusCode: 400, statusMessage: 'Token inválido.' })
    }
    await assertAllowedTokenImages(newTokens, user.id, scene.tokens ?? [])

    const [updated] = await db
        .update(tables.scenesTable)
        .set({
            tokens: newTokens,
        })
        .where(
            and(
                eq(tables.scenesTable.userId, user.id),
                eq(tables.scenesTable.id, id)
            )
        )
        .returning()

    if (!updated) {
        throw createError({
            statusCode: 404,
            statusMessage: "Cena não encontrada.",
        })
    }

    return updated
})
