import { tables } from "#server/utils/drizzle.ts";

export default defineEventHandler((event) => {
    return updateUploadableResource(event, {
        table: tables.tokensTable,
        hasImage: true,
        storagePrefix: 'tokens',
        fields: [
            { name: 'width', type: 'number' },
            { name: 'height', type: 'number' },
            { name: 'tags', type: 'json' },
            { name: 'attributes', type: 'json' },
        ],
    })
})
