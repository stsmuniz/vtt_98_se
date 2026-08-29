import { put } from '@vercel/blob'
import sharp from 'sharp'

const MAX_DIMENSION = 500

export type StoredImage = {
    url: string
    width: number
    height: number
}

/**
 * Redimensiona a imagem (mantendo proporção) quando largura ou altura passam de
 * MAX_DIMENSION, e sobe o resultado pro Vercel Blob. Retorna a URL pública e as
 * dimensões reais do arquivo salvo, para manter width/height do registro
 * consistentes com a imagem que de fato foi armazenada.
 */
export async function storeImage(prefix: string, filename: string, buffer: Buffer): Promise<StoredImage> {
    const metadata = await sharp(buffer).metadata()
    let data = buffer
    let width = metadata.width ?? 0
    let height = metadata.height ?? 0

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
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
