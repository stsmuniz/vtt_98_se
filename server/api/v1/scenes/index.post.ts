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
        // O cenário tem de ser do próprio usuário: senão a cena passaria a carregar (e expor)
        // o cenário de outra pessoa em todo lugar que faz `with: { scenario: true }`.
        validate: async (values, userId) => {
            const scenarioId = parseBodyId(values.scenarioId, 'Cenário inválido.')
            await getOwnedRowOrThrow(tables.scenariosTable, scenarioId, userId, 'Cenário não encontrado.')
            values.scenarioId = scenarioId
            values.width = parseSceneDimension(values.width)
            values.height = parseSceneDimension(values.height)
        },
    })
})
