import { tables } from "#server/utils/drizzle.ts";

export default defineEventHandler((event) => {
    return createUploadableResource(event, {
        table: tables.scenesTable,
        fields: [
            { name: 'width', type: 'number' },
            { name: 'height', type: 'number' },
            { name: 'tags', type: 'json' },
            { name: 'scenarioId', type: 'number' },
        ],
    })
})
