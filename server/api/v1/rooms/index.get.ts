import {useDrizzle} from "#server/utils/drizzle.ts";

export default defineEventHandler(async (event) => {
    const user = await requireUser(event)

    const rooms = await useDrizzle()
        .query
        .roomsTable
        .findMany({
            where: (roomsTable, { eq }) => eq(roomsTable.userId, user.id),
            with: {
                sourceScene: {
                    with: {
                        scenario: true
                    }
                }
            }
        })

    return rooms.map(({ password, ...room }) => ({
        ...room,
        // O hash da senha nunca sai do servidor; o cliente só precisa saber se existe.
        hasPassword: Boolean(password),
        // A cena de origem pode ter sido excluída (scene_id vira NULL).
        image: room.sourceScene?.scenario?.image ?? null,
    }))
})
