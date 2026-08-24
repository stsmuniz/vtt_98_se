import { tables } from "#server/utils/drizzle.ts";
import { readMultipartFormData, createError, readBody, getHeader } from 'h3'; // Importe readBody e getHeader

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

    // 1. Verifica qual é o tipo de dado que está chegando
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
            .insert(tables.tokensTable)
            .values({
                name: `${body.name} (Cópia)`, // Opcional: Adiciona "(Cópia)" ao nome
                image: body.image, // Reaproveita a URL da imagem existente
                width: Number(body.width || 0),
                height: Number(body.height || 0),
                tags: body.tags || [],
                attributes: body.attributes || [],
                userId: session.user.id,
            })
            .returning()

        return insertResult
    }

    // ==========================================
    // FLUXO DE CRIAÇÃO NORMAL (UPLOAD DE ARQUIVO)
    // ==========================================
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
    const attributes = fields.attributes ? JSON.parse(fields.attributes) : []

    const fileExtension = file.filename.split('.').pop()
    const uniqueFileName = `${Date.now()}.${fileExtension}`

    const storage = useStorage('uploads')
    await storage.setItemRaw(`tokens:${uniqueFileName}`, file.data)

    const db = useDrizzle()

    const insertResult = await db
        .insert(tables.tokensTable)
        .values({
            name,
            image: `/tokens/${uniqueFileName}`,
            width,
            height,
            tags,
            attributes,
            userId: session.user.id,
        })
        .returning()

    return insertResult
})