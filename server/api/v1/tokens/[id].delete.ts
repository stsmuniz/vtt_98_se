import { tables } from "#server/utils/drizzle.ts";
import { createError } from 'h3';

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

    const id = parseIdParam(event)

    return deleteOwnedRow(tables.tokensTable, id, session.user.id, 'Token não encontrado.')
})
