import { tables } from "#server/utils/drizzle.ts";

export default defineEventHandler(async (event) => {
    const user = await requireUser(event)
    const id = parseIdParam(event)

    return deleteOwnedRow(tables.statusesTable, id, user.id, 'Status não encontrado.')
})
