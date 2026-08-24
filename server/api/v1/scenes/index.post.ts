import { tables } from "#server/utils/drizzle.ts";
import { readMultipartFormData, createError, readBody, getHeader } from 'h3';

export default defineEventHandler(async (event) => {
    const session = await auth.api.getSession({
        headers: event.headers,
    })

    const contentType = getHeader(event, 'content-type') || '';

    // ==========================================
    // FLUXO DE DUPLICAÇÃO (JSON)
    // ==========================================
    if (contentType.includes('application/json')) {
        const body = await readBody(event)

        if (!body) {
            throw createError({ statusCode: 400, statusMessage: 'Nenhum dado enviado.' })
        }

        const db = useDrizzle()

        const insertResult = await db
            .insert(tables.scenesTable)
            .values({
                name: `${body.name} (Cópia)`,
                width: Number(body.width || 0),
                height: Number(body.height || 0),
                tags: body.tags || [],
                userId: session.user.id,
                scenarioId: Number(body.scenarioId)
            })
            .returning()

        return insertResult
    }

    const formData = await readMultipartFormData(event)
    if (!formData) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Nenhum dado enviado.'
        })
    }

    let file: any = null
    const fields: Record<string, string> = {}

    for (const item of formData) {
        if (item.name === 'image' && item.filename) {
            file = item
        } else if (item.name) {
            fields[item.name] = item.data.toString('utf-8')
        }
    }

    const name = fields.name
    const width = Number(fields.width || 0)
    const height = Number(fields.height || 0)
    const tags = fields.tags ? JSON.parse(fields.tags) : []
    const scenarioId = fields.scenarioId

    const db = useDrizzle()

    const insertResult = await db
        .insert(tables.scenesTable)
        .values({
            name,
            width,
            height,
            tags,
            scenarioId,
            userId: session.user.id,
        })
        .returning()

    return insertResult
})