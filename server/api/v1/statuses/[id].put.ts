import { useDrizzle, tables } from "#server/utils/drizzle.ts";
import { and, eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
    const user = await requireUser(event)
    const id = parseIdParam(event)
    const data = sanitizeStatusBody(await readBody(event))

    const [row] = await useDrizzle()
        .update(tables.statusesTable)
        .set(data)
        .where(and(eq(tables.statusesTable.id, id), eq(tables.statusesTable.userId, user.id)))
        .returning()

    if (!row) {
        throw createError({ statusCode: 404, statusMessage: 'Status não encontrado.' })
    }

    return row
})
