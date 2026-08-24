import {useDrizzle} from "#server/utils/drizzle.ts";

export default defineEventHandler(async (event) => {
    const session = await auth.api.getSession({
        headers: event.headers,
    })

    const scenes = useDrizzle()
        .query
        .scenesTable
        .findMany({
            where: (
                scenesTable, { eq }) => eq(scenesTable.userId, session.user.id),
            with: {
                scenario: true
            }
        })

    return scenes;
})