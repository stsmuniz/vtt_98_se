import { createError } from 'h3';
import {tables} from "#server/utils/drizzle.ts";
import {and, eq} from "drizzle-orm";
import {SceneToken} from "#server/db/schema.ts"; // Importe readBody e getHeader

export default defineEventHandler(async (event) => {
    const session = await auth.api.getSession({
        headers: event.headers,
    })

    const idParam = getRouterParam(event, "id");
    const id = Number(idParam);

    if (!idParam || Number.isNaN(id)) {
        throw createError({
            statusCode: 400,
            statusMessage: "ID inválido.",
        });
    }

    const body = await readBody<SceneToken | SceneToken[]>(event)

    // Validação básica
    if (!body || typeof body !== 'object') {
        throw createError({
            statusCode: 400,
            statusMessage: "Body inválido. Envie um SceneToken ou um array de SceneToken.",
        })
    }

    const db = useDrizzle()

    let newTokens: SceneToken[]

    if (Array.isArray(body)) {
        newTokens = body
    } else {
        const [scene] = await db
            .select({ tokens: tables.scenesTable.tokens })
            .from(tables.scenesTable)
            .where(
                and(
                    eq(tables.scenesTable.userId, session.user.id),
                    eq(tables.scenesTable.id, id)
                )
            )

        if (!scene) {
            throw createError({
                statusCode: 404,
                statusMessage: "Cena não encontrada.",
            })
        }

        newTokens = [...(scene.tokens ?? []), body]
    }

    // Atualiza a coluna
    const [updated] = await db
        .update(tables.scenesTable)
        .set({
            tokens: newTokens,
        })
        .where(
            and(
                eq(tables.scenesTable.userId, session.user.id),
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