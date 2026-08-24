import {useDrizzle} from "#server/utils/drizzle.ts";

export default defineEventHandler(async (event) => {
    const session = await auth.api.getSession({
        headers: event.headers,
    })

    if (event.path.startsWith('/api/v1')) {
        if (!session || !session.user) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Não autorizado.'
            })
        }
    }
})