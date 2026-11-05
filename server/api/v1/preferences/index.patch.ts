import { tables } from "#server/utils/drizzle.ts";
import { eq } from "drizzle-orm";
import { mergeStoredPreferences, resolvePreferences, sanitizePreferences } from "~~/lib/preferences";

/**
 * Atualização parcial das preferências. Campos desconhecidos ou inválidos são
 * descartados (não geram erro), e `explorer` é mesclado por recurso. Devolve as
 * preferências completas já resolvidas.
 */
export default defineEventHandler(async (event) => {
    const user = await requireUser(event)

    const patch = sanitizePreferences(await readBody(event))

    const db = useDrizzle()
    const data = await db.transaction(async (tx) => {
        // FOR UPDATE: dois PATCHes simultâneos não perdem as alterações um do outro.
        const [current] = await tx
            .select({ data: tables.userPreferencesTable.data })
            .from(tables.userPreferencesTable)
            .where(eq(tables.userPreferencesTable.userId, user.id))
            .for('update')

        const merged = mergeStoredPreferences(sanitizePreferences(current?.data), patch)

        await tx
            .insert(tables.userPreferencesTable)
            .values({ userId: user.id, data: merged })
            .onConflictDoUpdate({
                target: tables.userPreferencesTable.userId,
                set: { data: merged, updatedAt: new Date() },
            })

        return merged
    })

    return resolvePreferences(data)
})
