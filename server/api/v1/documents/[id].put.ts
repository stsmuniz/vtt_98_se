import { tables } from "#server/utils/drizzle.ts";

export default defineEventHandler((event) => {
    return updateUploadableResource(event, {
        table: tables.documentsTable,
        hasImage: true,
        storagePrefix: 'documents',
        storeVariants: true,
        fields: [
            { name: 'width', type: 'number' },
            { name: 'height', type: 'number' },
            { name: 'tags', type: 'json' },
        ],
    })
})
