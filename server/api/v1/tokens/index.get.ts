import {useDrizzle} from "#server/utils/drizzle.ts";
import {tokensTable} from "#server/db/schema.ts";
import {eq} from "drizzle-orm";
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

    const tokens = useDrizzle().query.tokensTable.findMany({
        where: eq(tokensTable.userId, session.user.id),
    })

    return tokens
})