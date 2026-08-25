import { tables } from "#server/utils/drizzle.ts";
import { and, eq } from "drizzle-orm";
import { createError } from "h3";

const PATCHABLE_FIELDS = ['scenarioId', 'width', 'height'] as const

export default defineEventHandler(async (event) => {
    const session = await auth.api.getSession({
        headers: event.headers,
    })

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
    const [scene] = await db
        .update(tables.scenesTable)
        .set(updateData)
        .where(and(eq(tables.scenesTable.id, id), eq(tables.scenesTable.userId, session.user.id)))
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
