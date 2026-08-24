import { tables } from "#server/utils/drizzle.ts";
import { createError } from 'h3';
import {eq} from "drizzle-orm";

export default defineEventHandler(async (event) => {
    const session = await auth.api.getSession({
        headers: event.headers,
    })

    if (!session || !session.user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Não autorizado.'
        })
    }

    const id = parseInt(getRouterParam(event, 'id'))

    const result = await useDrizzle()
        .delete(tables.scenariosTable)
        .where(eq(tables.scenariosTable.id, id))
        .returning()

    return result
})
