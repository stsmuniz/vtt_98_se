import { tables } from "#server/utils/drizzle.ts";

// Upload (multipart): gera miniatura + versão grande. Duplicar (JSON): reaproveita as duas URLs.
export default defineEventHandler((event) => {
    return createUploadableResource(event, {
        table: tables.documentsTable,
        hasImage: true,
        storagePrefix: 'documents',
        requireImageOnCreate: true,
        storeVariants: true,
        copyOnDuplicate: ['fullImage', 'fullWidth', 'fullHeight'],
        fields: [
            { name: 'width', type: 'number' },
            { name: 'height', type: 'number' },
            { name: 'tags', type: 'json' },
        ],
    })
})
