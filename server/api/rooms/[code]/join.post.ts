import { useDrizzle } from "#server/utils/drizzle.ts";
import { eq } from "drizzle-orm";
import { createError, getRouterParam, readBody } from "h3";
import { roomsTable } from "#server/db/schema.ts";
import { compareSync } from "bcrypt-ts";

// Password is read from the JSON body (never a query string) so it never ends up in
// access logs, proxy logs, or browser history.
export default defineEventHandler(async (event) => {
    const code = getRouterParam(event, 'code')

    if (!code) {
        throw createError({
            statusCode: 400,
            statusMessage: "Código da Sala não informado."
        })
    }

    const room = await useDrizzle().query.roomsTable.findFirst({
        where: eq(roomsTable.code, code),
        with: {
            sourceScene: {
                with: {
                    scenario: true
                }
            }
        }
    })

    if (!room) {
        throw createError({
            statusCode: 404,
            statusMessage: "Sala não encontrada.",
        })
    }

    const session = await auth.api.getSession({ headers: event.headers })
    const isOwner = !!session?.user && session.user.id === room.userId

    if (room.password && !isOwner) {
        const body = await readBody<{ password?: string }>(event).catch(() => ({}))
        const providedPassword = body?.password

        if (typeof providedPassword !== 'string' || !compareSync(providedPassword, room.password)) {
            throw createError({
                statusCode: 401,
                statusMessage: "Senha incorreta.",
            })
        }
    }

    const { password, ...roomWithoutPassword } = room

    return {
        ...roomWithoutPassword,
        role: isOwner ? 'gm' : 'player',
    }
})
