import { tables } from "#server/utils/drizzle.ts";

export default defineEventHandler((event) => {
    return updateUploadableResource(event, {
        table: tables.scenesTable,
        fields: [
            { name: 'tags', type: 'json' },
        ],
    })
})
