import { createError } from 'h3'
import { put } from '@vercel/blob'
import sharp from 'sharp'

const MAX_DIMENSION = 500

/** Lado maior das duas versões de um Documento. */
const DOCUMENT_THUMB_MAX = 500
const DOCUMENT_FULL_MAX = 2048
/** Recusa imagens com mais pixels que isso (proteção contra imagens "bomba" que estouram a memória). */
const MAX_INPUT_PIXELS = 100_000_000
/** Tamanho máximo do arquivo enviado (a Vercel já corta corpos acima de 4,5 MB). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/**
 * Formatos aceitos, identificados pelo conteúdo (sharp), nunca pelo nome do arquivo: a extensão e
 * o Content-Type gravados no Blob vêm daqui. SVG fica de fora (pode conter script), assim como
 * qualquer coisa que o navegador pudesse tratar como página (ex.: `x.html` com cabeçalho de PNG).
 */
const ALLOWED_FORMATS: Record<string, { extension: string, contentType: string }> = {
    png: { extension: 'png', contentType: 'image/png' },
    jpeg: { extension: 'jpg', contentType: 'image/jpeg' },
    webp: { extension: 'webp', contentType: 'image/webp' },
    gif: { extension: 'gif', contentType: 'image/gif' },
}

const invalidImage = () => createError({
    statusCode: 400,
    statusMessage: 'O arquivo não é uma imagem válida. Use PNG, JPEG, WebP ou GIF.',
})

/** Confere tamanho e formato real do arquivo; lança 400 se não for uma imagem aceita. */
async function inspectImage(buffer: Buffer) {
    if (!buffer?.length) throw invalidImage()
    if (buffer.length > MAX_UPLOAD_BYTES) {
        throw createError({ statusCode: 400, statusMessage: 'A imagem é grande demais (máximo de 10 MB).' })
    }
    let metadata: sharp.Metadata
    try {
        metadata = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS }).metadata()
    } catch {
        throw invalidImage()
    }
    const format = ALLOWED_FORMATS[metadata.format ?? '']
    if (!format || !metadata.width || !metadata.height) throw invalidImage()
    if (metadata.width * metadata.height > MAX_INPUT_PIXELS) {
        throw createError({ statusCode: 400, statusMessage: 'A imagem tem resolução grande demais.' })
    }
    return { metadata, format }
}

export type StoredImageVariants = {
    thumb: StoredImage
    full: StoredImage
}

export type StoredImage = {
    url: string
    width: number
    height: number
}

/**
 * Redimensiona a imagem (mantendo proporção) quando largura ou altura passam de
 * MAX_DIMENSION, e sobe o resultado pro Vercel Blob. Retorna a URL pública e as
 * dimensões reais do arquivo salvo, para manter width/height do registro
 * consistentes com a imagem que de fato foi armazenada. `skipResize` mantém a
 * resolução original (usado por cenários, cujo mapa perde qualidade se for reduzido).
 */
export async function storeImage(prefix: string, baseName: string, buffer: Buffer, skipResize = false): Promise<StoredImage> {
    const { metadata, format } = await inspectImage(buffer)
    let data = buffer
    let width = metadata.width ?? 0
    let height = metadata.height ?? 0

    if (!skipResize && (width > MAX_DIMENSION || height > MAX_DIMENSION)) {
        let resized: { data: Buffer, info: sharp.OutputInfo }
        try {
            // O formato de saída do sharp é o mesmo da entrada (já conferido acima).
            resized = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
                .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
                .toBuffer({ resolveWithObject: true })
        } catch {
            throw invalidImage()
        }
        data = resized.data
        width = resized.info.width
        height = resized.info.height
    }

    const blob = await put(`${prefix}/${baseName}.${format.extension}`, data, {
        access: 'public',
        addRandomSuffix: true,
        contentType: format.contentType,
    })

    return { url: blob.url, width, height }
}

/**
 * Documentos: a partir do original gera a miniatura (500 px) e a versão grande (2048 px), ambas em
 * WebP, sempre com o lado maior limitado (proporção preservada, sem ampliar imagens menores) e com
 * a rotação EXIF aplicada. O original NÃO é guardado. Lança 400 se o arquivo não for uma imagem.
 */
export async function storeImageVariants(prefix: string, baseName: string, buffer: Buffer): Promise<StoredImageVariants> {
    await inspectImage(buffer)
    const render = (max: number, quality: number) => sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        .resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toBuffer({ resolveWithObject: true })

    let thumb: Awaited<ReturnType<typeof render>>
    let full: Awaited<ReturnType<typeof render>>
    try {
        [thumb, full] = await Promise.all([render(DOCUMENT_THUMB_MAX, 80), render(DOCUMENT_FULL_MAX, 85)])
    } catch {
        throw createError({ statusCode: 400, statusMessage: 'O arquivo não é uma imagem válida (ou é grande demais).' })
    }

    const upload = async (suffix: string, rendered: typeof thumb): Promise<StoredImage> => {
        const blob = await put(`${prefix}/${baseName}-${suffix}.webp`, rendered.data, {
            access: 'public',
            addRandomSuffix: true,
            contentType: 'image/webp',
        })
        return { url: blob.url, width: rendered.info.width, height: rendered.info.height }
    }

    const [thumbStored, fullStored] = await Promise.all([upload('thumb', thumb), upload('full', full)])
    return { thumb: thumbStored, full: fullStored }
}
