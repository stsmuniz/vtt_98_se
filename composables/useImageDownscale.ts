/**
 * Prepara uma imagem para envio quando o corpo da requisição é limitado (as Functions da Vercel
 * recusam mais de 4,5 MB):
 *  - até SOFT_LIMIT: segue como está (o servidor faz o redimensionamento final, com mais qualidade);
 *  - acima disso, até HARD_LIMIT: o navegador reduz (canvas) até caber, em WebP (ou JPEG, se o
 *    navegador não exportar WebP);
 *  - acima de HARD_LIMIT, ou se o navegador não conseguir ler a imagem: erro pedindo para reduzir.
 * O servidor continua validando tudo; isto é só uma conveniência para o arquivo caber.
 */
export const SOFT_LIMIT = 4_000_000
export const HARD_LIMIT = 25_000_000

/** Erro com mensagem pronta para mostrar ao usuário. */
export class ImageUploadError extends Error {}

const megabytes = (bytes: number) => (bytes / 1_000_000).toFixed(1).replace('.', ',')

// Tentativas, da melhor para a mais agressiva: [lado maior máximo, qualidade].
const ATTEMPTS: [number, number][] = [[4096, 0.85], [3072, 0.8], [2560, 0.72], [2048, 0.65]]

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality))
}

export async function prepareImageForUpload(file: File): Promise<File> {
  if (file.size > HARD_LIMIT) {
    throw new ImageUploadError(`A imagem tem ${megabytes(file.size)} MB, grande demais para enviar. Reduza-a para menos de ${megabytes(HARD_LIMIT)} MB e tente de novo.`)
  }
  if (file.size <= SOFT_LIMIT) return file

  let bitmap: ImageBitmap
  try {
    // 'from-image' aplica a rotação EXIF (fotos de celular não ficam deitadas).
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new ImageUploadError(`A imagem tem ${megabytes(file.size)} MB e o navegador não conseguiu reduzi-la (formato não suportado ou imagem grande demais). Reduza-a por fora e tente de novo.`)
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height)
    for (const [maxSide, quality] of ATTEMPTS) {
      const ratio = Math.min(1, maxSide / longest)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio))
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
      const ctx = canvas.getContext('2d')
      if (!ctx) break
      ctx.imageSmoothingQuality = 'high'

      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      let blob = await toBlob(canvas, 'image/webp', quality)
      if (!blob || blob.type !== 'image/webp') {
        // Sem WebP no canvas (Safari mais antigo): JPEG, com fundo branco no lugar da transparência.
        ctx.globalCompositeOperation = 'destination-over'
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        blob = await toBlob(canvas, 'image/jpeg', quality)
      }

      if (blob && blob.size <= SOFT_LIMIT) {
        const base = file.name.replace(/\.[^.]+$/, '') || 'imagem'
        return new File([blob], `${base}.${blob.type === 'image/jpeg' ? 'jpg' : 'webp'}`, { type: blob.type })
      }
    }
  } finally {
    bitmap.close()
  }

  throw new ImageUploadError(`Não foi possível reduzir a imagem (${megabytes(file.size)} MB) o bastante para o envio. Reduza-a por fora e tente de novo.`)
}
