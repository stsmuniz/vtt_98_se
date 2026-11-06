import { tables } from "#server/utils/drizzle.ts";

// Atualização parcial em JSON ({ name?, tags? }) — usada para renomear (F2) nas pastas.
export default defineEventHandler((event) => {
    return patchOwnedNameAndTags(event, tables.documentsTable, 'Documento não encontrado.')
})
