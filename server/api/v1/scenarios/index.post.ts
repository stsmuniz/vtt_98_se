import { tables } from "#server/utils/drizzle.ts";

export default defineEventHandler((event) => {
    return createUploadableResource(event, {
        table: tables.scenariosTable,
        hasImage: true,
        storagePrefix: 'scenarios',
        requireImageOnCreate: true,
        fields: [
            { name: 'width', type: 'number' },
            { name: 'height', type: 'number' },
            { name: 'tags', type: 'json' },
        ],
    })
})
