import { useDrizzle, tables } from "#server/utils/drizzle.ts";

export default defineEventHandler(async (event) => {
    const user = await requireUser(event)
    const data = sanitizeStatusBody(await readBody(event))

    const [row] = await useDrizzle()
        .insert(tables.statusesTable)
        .values({ ...data, userId: user.id })
        .returning()

    return row
})
