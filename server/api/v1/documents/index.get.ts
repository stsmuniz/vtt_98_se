import {useDrizzle} from "#server/utils/drizzle.ts";
import {documentsTable} from "#server/db/schema.ts";
import {desc, eq} from "drizzle-orm";
import {createError} from "h3";

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

    return useDrizzle().query.documentsTable.findMany({
        where: eq(documentsTable.userId, session.user.id),
        orderBy: desc(documentsTable.createdAt),
    })
})
