import { tables } from "#server/utils/drizzle.ts";

export default defineEventHandler((event) => {
    return updateUploadableResource(event, {
        table: tables.scenariosTable,
        hasImage: true,
        storagePrefix: 'scenarios',
        fields: [
            { name: 'width', type: 'number' },
            { name: 'height', type: 'number' },
            { name: 'tags', type: 'json' },
        ],
    })
})
