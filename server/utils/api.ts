import { randomInt } from 'node:crypto'
import { hash } from 'bcrypt-ts'
import { and, eq } from 'drizzle-orm'
import { createError, getHeader, getRouterParam, readBody, readMultipartFormData } from 'h3'

export type ResourceFieldSpec = {
    name: string
    type: 'number' | 'json' | 'string' | 'boolean'
}

const invalidField = (name: string) => createError({ statusCode: 400, statusMessage: `Valor inválido em "${name}".` })

/** Limites dos atributos de um token (nome e valor curtos, quantidade razoável). */
export const MAX_ATTRIBUTES = 50
const MAX_ATTRIBUTE_NAME = 60
const MAX_ATTRIBUTE_VALUE = 100

/** Atributos de token: lista de `{ name, value }` (valor número ou texto curto). Lança 400. */
export function sanitizeAttributes(value: unknown): { name: string, value: string | number }[] {
    if (!Array.isArray(value) || value.length > MAX_ATTRIBUTES) throw invalidField('attributes')
    return value.map((item) => {
        if (!item || typeof item !== 'object') throw invalidField('attributes')
        const { name, value: attributeValue } = item as { name?: unknown, value?: unknown }
        if (typeof name !== 'string' || name.length > MAX_ATTRIBUTE_NAME) throw invalidField('attributes')
        if (typeof attributeValue === 'number') {
            if (!Number.isFinite(attributeValue)) throw invalidField('attributes')
            return { name, value: attributeValue }
        }
        if (typeof attributeValue !== 'string' || attributeValue.length > MAX_ATTRIBUTE_VALUE) throw invalidField('attributes')
        return { name, value: attributeValue }
    })
}

/**
 * Converte um campo vindo do corpo (JSON) ou do multipart (texto), recusando com 400 o que não
 * fizer sentido — antes `Number('abc')` virava NaN, um JSON quebrado virava erro 500 e tags/
 * atributos entravam com qualquer forma e tamanho.
 */
function coerceField(spec: ResourceFieldSpec, raw: unknown, isJsonSource: boolean): unknown {
    if (spec.type === 'number') {
        const value = isJsonSource ? Number((raw as number) ?? 0) : Number((raw as string) || 0)
        // Colunas numéricas daqui são dimensões (inteiros, não negativos).
        if (!Number.isFinite(value) || value < 0 || value > 100_000) throw invalidField(spec.name)
        return Math.round(value)
    }
    if (spec.type === 'json') {
        let value: unknown = isJsonSource ? raw ?? [] : []
        if (!isJsonSource && raw) {
            try {
                value = JSON.parse(raw as string)
            } catch {
                throw invalidField(spec.name)
            }
        }
        if (spec.name === 'tags') return sanitizeNameAndTags({ tags: value }).tags
        if (spec.name === 'attributes') return sanitizeAttributes(value)
        return value
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
export const MAX_TAGS = 30
export const MAX_TAG_LENGTH = 40

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
        const tags = [...new Set(body.tags.map(t => t.trim()).filter(Boolean))]
        if (tags.length > MAX_TAGS || tags.some(t => t.length > MAX_TAG_LENGTH)) {
            throw createError({ statusCode: 400, statusMessage: `Use no máximo ${MAX_TAGS} tags, com até ${MAX_TAG_LENGTH} caracteres cada.` })
        }
        out.tags = tags
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

/** O bcrypt só usa os primeiros 72 bytes: o que passasse disso seria ignorado sem aviso. */
export const MAX_ROOM_PASSWORD_BYTES = 72

/** Confere e gera o hash da senha de uma sala (lança 400 se for longa demais). */
export async function hashRoomPassword(password: string): Promise<string> {
    if (Buffer.byteLength(password, 'utf8') > MAX_ROOM_PASSWORD_BYTES) {
        throw createError({
            statusCode: 400,
            statusMessage: `A senha da sala pode ter no máximo ${MAX_ROOM_PASSWORD_BYTES} caracteres (menos, se tiver acentos).`,
        })
    }
    return hash(password, 10)
}

/** Id de outra linha vindo do corpo (ex.: `scenarioId`, `sceneId`): inteiro positivo, senão 400. */
export function parseBodyId(raw: unknown, message = 'ID inválido.'): number {
    const id = Number(raw)
    if (!Number.isInteger(id) || id < 1) {
        throw createError({ statusCode: 400, statusMessage: message })
    }
    return id
}

export const MAX_SCENE_DIMENSION = 20000

/**
 * Largura/altura de cena: arredonda (a alça de redimensionar manda valores fracionários, que a
 * coluna `integer` recusaria) e exige uma faixa válida, senão 400.
 */
export function parseSceneDimension(raw: unknown): number {
    const value = Math.round(Number(raw))
    if (!Number.isFinite(value) || value < 1 || value > MAX_SCENE_DIMENSION) {
        throw createError({ statusCode: 400, statusMessage: `Tamanho de cena inválido (de 1 a ${MAX_SCENE_DIMENSION} px).` })
    }
    return value
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
    /** Documentos: gera miniatura + versão grande (WebP) em vez de uma imagem só. */
    storeVariants?: boolean
    /** Campos copiados do corpo JSON ao duplicar, sem passar pelos `fields` (ex.: URLs da versão grande). */
    copyOnDuplicate?: string[]
    transformUpdate?: (updateData: Record<string, unknown>, rawFields: Record<string, string>) => void | Promise<void>
    /**
     * Confere/ajusta os valores já convertidos antes do INSERT, nos dois ramos (upload e
     * duplicar) — ex.: que o `scenarioId` de uma cena nova é um cenário do próprio usuário.
     * Roda antes do upload da imagem, para um pedido recusado não deixar arquivo órfão no Blob.
     */
    validate?: (values: Record<string, unknown>, userId: string) => void | Promise<void>
}

/** Grava o arquivo enviado e devolve as colunas de imagem da linha (uma imagem, ou miniatura + versão grande). */
async function storeUploadedImage(file: { filename: string; data: Buffer }, options: UploadableResourceOptions): Promise<Record<string, unknown>> {
    if (options.storeVariants) {
        const { thumb, full } = await storeImageVariants(options.storagePrefix!, String(Date.now()), file.data)
        return {
            image: thumb.url, width: thumb.width, height: thumb.height,
            fullImage: full.url, fullWidth: full.width, fullHeight: full.height,
        }
    }
    // A extensão vem do formato real da imagem (ver imageStorage.ts), nunca do nome enviado.
    const stored = await storeImage(options.storagePrefix!, String(Date.now()), file.data, options.skipImageResize)
    return { image: stored.url, width: stored.width, height: stored.height }
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
        if (!body || typeof body !== 'object') {
            throw createError({ statusCode: 400, statusMessage: 'Nenhum dado enviado.' })
        }

        // Duplicar: o cliente manda só o id da linha de origem e TUDO é copiado do banco (linha do
        // próprio usuário). Antes os valores vinham do corpo, o que permitia gravar uma URL de
        // imagem qualquer (inclusive de terceiros) que depois era carregada no navegador de outros.
        const sourceId = parseBodyId(body.sourceId, 'Informe o item a duplicar.')
        const source = await getOwnedRowOrThrow(options.table, sourceId, session.user.id) as Record<string, unknown>

        const values: Record<string, unknown> = {
            name: `${String(source.name ?? '').slice(0, MAX_NAME_LENGTH - ' (Cópia)'.length)} (Cópia)`,
            userId: session.user.id,
        }
        if (options.hasImage) values.image = source.image
        for (const field of options.fields) {
            values[field.name] = source[field.name] ?? coerceField(field, undefined, true)
        }
        for (const key of options.copyOnDuplicate ?? []) values[key] = source[key]
        await options.validate?.(values, session.user.id)

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
        // Nome obrigatório e com tamanho limitado (mesma regra de renomear).
        name: sanitizeNameAndTags({ name: rawFields.name }).name,
        userId: session.user.id,
    }
    for (const field of options.fields) {
        values[field.name] = coerceField(field, rawFields[field.name], false)
    }
    await options.validate?.(values, session.user.id)

    if (options.hasImage && file) {
        Object.assign(values, await storeUploadedImage(file, options))
    }

    return db.insert(options.table).values(values).returning()
}

/**
 * Código de sala novo: 10 caracteres de 62 com `crypto.randomInt` (~59,5 bits). Numa sala sem
 * senha o código é a única proteção, então não pode ser adivinhável (`Math.random` não é
 * criptográfico) nem curto o bastante para varrer. Códigos antigos (6 caracteres) continuam valendo.
 */
export const ROOM_CODE_LENGTH = 10

export const generateRoomCode = async (): Promise<string> => {
    const allowedCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

    const roomCode = Array.from({ length: ROOM_CODE_LENGTH }, () => allowedCharacters.charAt(randomInt(allowedCharacters.length))).join('')

    const isRoomCodeTaken = await useDrizzle().query.roomsTable.findFirst({
        where: (rooms, { eq }) => eq(rooms.code, roomCode)
    });

    if (isRoomCodeTaken) return generateRoomCode()

    return roomCode
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

    const updateData: Record<string, unknown> = {}
    if ('name' in rawFields) updateData.name = sanitizeNameAndTags({ name: rawFields.name }).name
    for (const field of options.fields) {
        updateData[field.name] = coerceField(field, rawFields[field.name], false)
    }

    if (options.hasImage && file) {
        Object.assign(updateData, await storeUploadedImage(file, options))
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
