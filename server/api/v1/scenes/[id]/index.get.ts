import { useDrizzle } from "#server/utils/drizzle.ts";
import { scenesTable } from "#server/db/schema.ts";
import { and, eq } from "drizzle-orm";
import { createError } from "h3";

export default defineEventHandler(async (event) => {
    const user = await requireUser(event)

    const id = parseIdParam(event)

    const scene = await useDrizzle().query.scenesTable.findFirst({
        where: and(
            eq(scenesTable.id, id),
            eq(scenesTable.userId, user.id)
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
