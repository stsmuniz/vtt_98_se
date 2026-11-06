import { createError } from 'h3'
import { put } from '@vercel/blob'
import sharp from 'sharp'

const MAX_DIMENSION = 500

/** Lado maior das duas versões de um Documento. */
const DOCUMENT_THUMB_MAX = 500
const DOCUMENT_FULL_MAX = 2048
/** Recusa imagens com mais pixels que isso (proteção contra imagens "bomba" que estouram a memória). */
const MAX_INPUT_PIXELS = 100_000_000

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
export async function storeImage(prefix: string, filename: string, buffer: Buffer, skipResize = false): Promise<StoredImage> {
    const metadata = await sharp(buffer).metadata()
    let data = buffer
    let width = metadata.width ?? 0
    let height = metadata.height ?? 0

    if (!skipResize && (width > MAX_DIMENSION || height > MAX_DIMENSION)) {
        const resized = await sharp(buffer)
            .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
            .toBuffer({ resolveWithObject: true })
        data = resized.data
        width = resized.info.width
        height = resized.info.height
    }

    const blob = await put(`${prefix}/${filename}`, data, {
        access: 'public',
        addRandomSuffix: true,
    })

    return { url: blob.url, width, height }
}

/**
 * Documentos: a partir do original gera a miniatura (500 px) e a versão grande (2048 px), ambas em
 * WebP, sempre com o lado maior limitado (proporção preservada, sem ampliar imagens menores) e com
 * a rotação EXIF aplicada. O original NÃO é guardado. Lança 400 se o arquivo não for uma imagem.
 */
export async function storeImageVariants(prefix: string, baseName: string, buffer: Buffer): Promise<StoredImageVariants> {
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
