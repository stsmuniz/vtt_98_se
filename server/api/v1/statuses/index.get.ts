import { useDrizzle } from "#server/utils/drizzle.ts";
import { statusesTable } from "#server/db/schema.ts";
import { asc, eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
    const user = await requireUser(event)

    return useDrizzle().query.statusesTable.findMany({
        where: eq(statusesTable.userId, user.id),
        orderBy: asc(statusesTable.name),
    })
})
