import {useDrizzle} from "#server/utils/drizzle.ts";
import {scenesTable} from "#server/db/schema.ts";
import {and, eq} from "drizzle-orm";
import {createError} from "h3";

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

    const scene = useDrizzle().query.scenesTable.findFirst({
            where: and(
                eq(scenesTable.id, id),
                eq(scenesTable.userId, session.user.id)
            ),
            with: {
                scenario: true
            }
        })

    if (!scene) {
        throw createError({
            statusCode: 404,
            statusMessage: "Cena não encontrada.",
        })
    }

    return scene;
})