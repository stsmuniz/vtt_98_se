import { tables } from "#server/utils/drizzle.ts";
import { eq } from "drizzle-orm";
import { resolvePreferences } from "~~/lib/preferences";

// Preferências completas do usuário logado (padrões + o que ele alterou).
export default defineEventHandler(async (event) => {
    const user = await requireUser(event)

    const row = await useDrizzle().query.userPreferencesTable.findFirst({
        where: eq(tables.userPreferencesTable.userId, user.id),
    })

    return resolvePreferences(row?.data)
})
