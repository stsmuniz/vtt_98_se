import { tables } from "#server/utils/drizzle.ts";
import { readMultipartFormData, createError } from 'h3';
import { eq } from "drizzle-orm";

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

    const formData = await readMultipartFormData(event)
    if (!formData) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Nenhum dado enviado.'
        })
    }

    const id = parseInt(getRouterParam(event, 'id'))

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

    let uniqueFileName = ''

    if (file) {
        const fileExtension = file.filename.split('.').pop()
        const uniqueFileName = `${Date.now()}.${fileExtension}`

        const storage = useStorage('uploads')
        await storage.setItemRaw(`scenarios:${uniqueFileName}`, file.data)
    }

    const db = useDrizzle()

    const updateData = {
        name,
        width,
        height,
        tags,
        userId: session.user.id,
    };

    if (file) {
        updateData.image = `/scenarios/${uniqueFileName}`
    }

    const insertResult = await db
        .update(tables.scenariosTable)
        .set(updateData)
        .where(eq(tables.scenariosTable.id, id));

    return insertResult
})
