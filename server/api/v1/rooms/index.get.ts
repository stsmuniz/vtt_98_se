import {useDrizzle} from "#server/utils/drizzle.ts";

export default defineEventHandler(async (event) => {
    const session = await auth.api.getSession({
        headers: event.headers,
    })

    const scenes = await useDrizzle()
        .query
        .roomsTable
        .findMany({
            where: (
                roomsTable, { eq }) => eq(roomsTable.userId, session.user.id),
            with: {
                sourceScene: {
                    with: {
                        scenario: true
                    }
                }
            }
        })

    const returnedScenes = scenes.map(room => {
        return {
            ...room,
            image: room.sourceScene.scenario.image,
        }
    })

    return returnedScenes;
})