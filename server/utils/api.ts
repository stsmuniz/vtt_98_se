import { and, eq } from 'drizzle-orm'
import { createError, getHeader, getRouterParam, readBody, readMultipartFormData } from 'h3'

export type ResourceFieldSpec = {
    name: string
    type: 'number' | 'json' | 'string' | 'boolean'
}

function coerceField(spec: ResourceFieldSpec, raw: unknown, isJsonSource: boolean): unknown {
    if (spec.type === 'number') {
        return isJsonSource ? Number((raw as number) ?? 0) : Number((raw as string) || 0)
    }
    if (spec.type === 'json') {
        if (isJsonSource) return raw ?? []
        return raw ? JSON.parse(raw as string) : []
    }
    if (spec.type === 'boolean') {
        return isJsonSource ? Boolean(raw) : raw === 'true'
    }
    return raw ?? ''
}

/** Sessão obrigatória: devolve o usuário logado ou lança 401. */
export async function requireUser(event: any) {
    const session = await auth.api.getSession({ headers: event.headers })
    if (!session || !session.user) {
        throw createError({ statusCode: 401, statusMessage: 'Não autorizado.' })
    }
    return session.user
}

export const MAX_NAME_LENGTH = 120

/**
 * Valida `name`/`tags` vindos de um corpo JSON (renomear pelo F2, editar tags).
 * Devolve só os campos presentes; lança 400 se algum deles for inválido.
 */
export function sanitizeNameAndTags(body: Record<string, unknown>): { name?: string; tags?: string[] } {
    const out: { name?: string; tags?: string[] } = {}
    if ('name' in body) {
        const name = typeof body.name === 'string' ? body.name.trim() : ''
        if (!name) {
            throw createError({ statusCode: 400, statusMessage: 'O nome não pode ficar vazio.' })
        }
        if (name.length > MAX_NAME_LENGTH) {
            throw createError({ statusCode: 400, statusMessage: `O nome pode ter no máximo ${MAX_NAME_LENGTH} caracteres.` })
        }
        out.name = name
    }
    if ('tags' in body) {
        if (!Array.isArray(body.tags) || !body.tags.every(t => typeof t === 'string')) {
            throw createError({ statusCode: 400, statusMessage: 'Tags inválidas.' })
        }
        out.tags = [...new Set(body.tags.map(t => t.trim()).filter(Boolean))]
    }
    return out
}

/**
 * PATCH JSON de `name`/`tags` para recursos com dono (tokens, cenários).
 * Filtra pelo dono na própria query, como o resto da API.
 */
export async function patchOwnedNameAndTags(event: any, table: any, notFoundMessage: string) {
    const user = await requireUser(event)
    const id = parseIdParam(event)

    const body = await readBody<Record<string, unknown>>(event)
    if (!body || typeof body !== 'object') {
        throw createError({ statusCode: 400, statusMessage: 'Nenhum dado enviado.' })
    }

    const updateData = sanitizeNameAndTags(body)
    if (!Object.keys(updateData).length) {
        throw createError({ statusCode: 400, statusMessage: 'Nada para atualizar.' })
    }

    const [row] = await useDrizzle()
        .update(table)
        .set(updateData)
        .where(and(eq(table.id, id), eq(table.userId, user.id)))
        .returning()

    if (!row) {
        throw createError({ statusCode: 404, statusMessage: notFoundMessage })
    }

    return row
}

export function parseIdParam(event: any): number {
    const idParam = getRouterParam(event, 'id')
    const id = Number(idParam)

    if (!idParam || Number.isNaN(id)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'ID inválido.',
        })
    }

    return id
}

export async function getOwnedRowOrThrow(
    table: any,
    id: number,
    userId: string,
    notFoundMessage = 'Recurso não encontrado.',
) {
    const [row] = await useDrizzle()
        .select()
        .from(table)
        .where(and(eq(table.id, id), eq(table.userId, userId)))

    if (!row) {
        throw createError({
            statusCode: 404,
            statusMessage: notFoundMessage,
        })
    }

    return row
}

export async function deleteOwnedRow(
    table: any,
    id: number,
    userId: string,
    notFoundMessage = 'Recurso não encontrado.',
) {
    const result = await useDrizzle()
        .delete(table)
        .where(and(eq(table.id, id), eq(table.userId, userId)))
        .returning()

    if (!result.length) {
        throw createError({
            statusCode: 404,
            statusMessage: notFoundMessage,
        })
    }

    return result
}

type UploadableResourceOptions = {
    table: any
    fields: ResourceFieldSpec[]
    hasImage?: boolean
    storagePrefix?: string
    skipImageResize?: boolean
    requireImageOnCreate?: boolean
    transformUpdate?: (updateData: Record<string, unknown>, rawFields: Record<string, string>) => void | Promise<void>
}

/**
 * POST create handler shared by scenarios/tokens/scenes: branches on content-type between
 * "duplicate an existing resource" (JSON body, reuses `image`) and "create via upload" (multipart).
 */
export async function createUploadableResource(event: any, options: UploadableResourceOptions) {
    const session = await auth.api.getSession({ headers: event.headers })
    if (!session || !session.user) {
        throw createError({ statusCode: 401, statusMessage: 'Não autorizado.' })
    }

    const contentType = getHeader(event, 'content-type') || ''
    const db = useDrizzle()

    if (contentType.includes('application/json')) {
        const body = await readBody(event)
        if (!body) {
            throw createError({ statusCode: 400, statusMessage: 'Nenhum dado enviado.' })
        }

        const values: Record<string, unknown> = {
            name: `${body.name} (Cópia)`,
            userId: session.user.id,
        }
        if (options.hasImage) values.image = body.image
        for (const field of options.fields) {
            values[field.name] = coerceField(field, body[field.name], true)
        }

        return db.insert(options.table).values(values).returning()
    }

    const formData = await readMultipartFormData(event)
    if (!formData) {
        throw createError({ statusCode: 400, statusMessage: 'Nenhum dado enviado.' })
    }

    let file: any = null
    const rawFields: Record<string, string> = {}
    for (const item of formData) {
        if (item.name === 'image' && item.filename) {
            file = item
        } else if (item.name) {
            rawFields[item.name] = item.data.toString('utf-8')
        }
    }

    if (options.hasImage && options.requireImageOnCreate && !file) {
        throw createError({ statusCode: 400, statusMessage: 'A imagem é obrigatória.' })
    }

    const values: Record<string, unknown> = {
        name: rawFields.name,
        userId: session.user.id,
    }
    for (const field of options.fields) {
        values[field.name] = coerceField(field, rawFields[field.name], false)
    }

    if (options.hasImage && file) {
        const fileExtension = file.filename.split('.').pop()
        const uniqueFileName = `${Date.now()}.${fileExtension}`
        const stored = await storeImage(options.storagePrefix!, uniqueFileName, file.data, options.skipImageResize)
        values.image = stored.url
        values.width = stored.width
        values.height = stored.height
    }

    return db.insert(options.table).values(values).returning()
}

export const generateRoomCode = async (): Promise<string> => {
    const allowedCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

    const roomCode = Array.from({ length: 6 }, () => allowedCharacters.charAt(Math.floor(Math.random() * allowedCharacters.length)))

    const isRoomCodeTaken = await useDrizzle().query.roomsTable.findFirst({
        where: (rooms, { eq }) => eq(rooms.code, roomCode.join(''))
    });

    if (isRoomCodeTaken) return generateRoomCode()

    return roomCode.join('')
}

/**
 * PUT update handler shared by scenarios/tokens: multipart body, optional image replacement.
 * Scoped to the owning user, fixing the missing-ownership-check (IDOR) present in the
 * hand-written versions of these routes.
 */
export async function updateUploadableResource(event: any, options: UploadableResourceOptions) {
    const session = await auth.api.getSession({ headers: event.headers })
    if (!session || !session.user) {
        throw createError({ statusCode: 401, statusMessage: 'Não autorizado.' })
    }

    const id = parseIdParam(event)

    const formData = await readMultipartFormData(event)
    if (!formData) {
        throw createError({ statusCode: 400, statusMessage: 'Nenhum dado enviado.' })
    }

    let file: any = null
    const rawFields: Record<string, string> = {}
    for (const item of formData) {
        if (item.name === 'image' && item.filename) {
            file = item
        } else if (item.name) {
            rawFields[item.name] = item.data.toString('utf-8')
        }
    }

    const updateData: Record<string, unknown> = { name: rawFields.name }
    for (const field of options.fields) {
        updateData[field.name] = coerceField(field, rawFields[field.name], false)
    }

    if (options.hasImage && file) {
        const fileExtension = file.filename.split('.').pop()
        const uniqueFileName = `${Date.now()}.${fileExtension}`
        const stored = await storeImage(options.storagePrefix!, uniqueFileName, file.data, options.skipImageResize)
        updateData.image = stored.url
        updateData.width = stored.width
        updateData.height = stored.height
    }

    if (options.transformUpdate) {
        await options.transformUpdate(updateData, rawFields)
    }

    const [row] = await useDrizzle()
        .update(options.table)
        .set(updateData)
        .where(and(eq(options.table.id, id), eq(options.table.userId, session.user.id)))
        .returning()

    if (!row) {
        throw createError({ statusCode: 404, statusMessage: 'Recurso não encontrado.' })
    }

    return row
}
