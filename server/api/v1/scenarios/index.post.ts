import { tables } from "#server/utils/drizzle.ts";
import { readMultipartFormData, createError, readBody, getHeader } from 'h3';

export default defineEventHandler(async (event) => {
    const session = await auth.api.getSession({
        headers: event.headers,
    })

    if (!session || !session.user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Não autorizado.'
        })
    }

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
            .insert(tables.scenariosTable)
            .values({
                name: `${body.name} (Cópia)`,
                image: body.image,
                width: Number(body.width || 0),
                height: Number(body.height || 0),
                tags: body.tags || [],
                userId: session.user.id,
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

    if (!file) {
        throw createError({
            statusCode: 400,
            statusMessage: 'A imagem é obrigatória.'
        })
    }

    const name = fields.name
    const width = Number(fields.width || 0)
    const height = Number(fields.height || 0)
    const tags = fields.tags ? JSON.parse(fields.tags) : []

    const fileExtension = file.filename.split('.').pop()
    const uniqueFileName = `${Date.now()}.${fileExtension}`

    const storage = useStorage('uploads')
    await storage.setItemRaw(`scenarios:${uniqueFileName}`, file.data)

    const db = useDrizzle()

    const insertResult = await db
        .insert(tables.scenariosTable)
        .values({
            name,
            image: `/scenarios/${uniqueFileName}`,
            width,
            height,
            tags,
            userId: session.user.id,
        })
        .returning()

    return insertResult
})