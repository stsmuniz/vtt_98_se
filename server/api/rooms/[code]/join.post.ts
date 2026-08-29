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

    // Um visitante autenticado por senha não tem sessão do better-auth, então a stream de
    // eventos ao vivo (events.get.ts) não consegue reconhecê-lo pelo cookie de sessão como faz
    // com o dono. Em vez de reenviar a senha (que não deve trafegar numa query string do
    // EventSource), emitimos aqui um token de acesso opaco e de curta duração, guardado no
    // Redis, que a stream aceita no lugar da senha.
    let accessToken: string | undefined

    if (room.password && !isOwner) {
        const body = await readBody<{ password?: string }>(event).catch(() => ({}))
        const providedPassword = body?.password

        if (typeof providedPassword !== 'string' || !compareSync(providedPassword, room.password)) {
            throw createError({
                statusCode: 401,
                statusMessage: "Senha incorreta.",
            })
        }

        accessToken = crypto.randomUUID()
        await redis.set(`room-access:${accessToken}`, code, { ex: 60 * 60 * 12 })
    }

    const { password, ...roomWithoutPassword } = room

    return {
        ...roomWithoutPassword,
        role: isOwner ? 'gm' : 'player',
        accessToken,
    }
})
