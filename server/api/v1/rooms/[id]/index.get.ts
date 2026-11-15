import { useDrizzle } from "#server/utils/drizzle.ts";
import { and, eq } from "drizzle-orm";
import { createError } from "h3";
import { roomsTable } from "#server/db/schema.ts";
import { publicRoomResource } from "#server/utils/resources.ts";

export default defineEventHandler(async (event) => {
    const session = await auth.api.getSession({
        headers: event.headers,
    })

    const id = parseIdParam(event)

    const room = await useDrizzle().query.roomsTable.findFirst({
        where: and(
            eq(roomsTable.id, id),
            eq(roomsTable.userId, session.user.id)
        ),
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

    // Nunca devolve o hash da senha, nem ao dono (só `hasPassword`).
    return publicRoomResource(room);
})
