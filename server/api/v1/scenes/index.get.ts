import {useDrizzle} from "#server/utils/drizzle.ts";

export default defineEventHandler(async (event) => {
    const user = await requireUser(event)

    const scenes = useDrizzle()
        .query
        .scenesTable
        .findMany({
            where: (
                scenesTable, { eq }) => eq(scenesTable.userId, user.id),
            with: {
                scenario: true
            }
        })

    return scenes;
})