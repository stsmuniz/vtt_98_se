/**
 * Documentos na mesa (editor de cenas e sala). Um documento colocado na mesa é um item do mesmo
 * array de tokens, marcado com `kind: 'document'`: a miniatura fica em `image` (é a que o canvas
 * desenha) e a versão grande em `fullImage` (abre no visualizador de imagens).
 */
import type { ResourceRecord } from '~/desktop/resources'

export type DocumentRecord = ResourceRecord & {
  image?: string
  width?: number
  height?: number
  fullImage?: string
}

/** Lado maior, em px da cena, de um documento recém-colocado (o mestre pode redimensionar depois). */
const DEFAULT_LONGEST_SIDE = 150

/** Item de mesa (sem `id`) para um documento cadastrado, centralizado em (centerX, centerY). */
export function documentTokenBase(doc: DocumentRecord, centerX: number, centerY: number) {
  const w = doc.width || 100
  const h = doc.height || 100
  const ratio = Math.min(1, DEFAULT_LONGEST_SIDE / Math.max(w, h))
  const width = Math.round(w * ratio)
  const height = Math.round(h * ratio)
  return {
    kind: 'document' as const,
    documentId: doc.id,
    name: doc.name ?? '',
    image: doc.image ?? '',
    fullImage: doc.fullImage ?? doc.image ?? '',
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 100,
    attributes: [] as never[],
  }
}

export const isDocument = (token: { kind?: string } | null | undefined) => token?.kind === 'document'

/** Abre a versão grande no visualizador de imagens (com zoom). Serve a visitantes sem conta. */
export function openDocumentViewer(
  desktop: { openApp: (id: string, props?: Record<string, unknown>, opts?: { title?: string }) => unknown },
  token: { name: string; image: string; fullImage?: string },
) {
  return desktop.openApp('image-viewer', { src: token.fullImage || token.image, name: token.name }, { title: `${token.name} - Documento` })
}
