import { reactive, ref, type Ref } from 'vue'

export function usePreloadedImage(): { image: Ref<HTMLImageElement | null>; load: (url?: string | null) => void } {
    const image = ref<HTMLImageElement | null>(null)

    function load(url?: string | null) {
        if (!url) return
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = url
        img.onload = () => {
            image.value = img
        }
    }

    return { image, load }
}

/**
 * Imagens por id (tokens e documentos). A URL carregada de cada id é lembrada: quando o mesmo id
 * passa a apontar para outra URL (token/documento substituído, e quem acompanha a sala recebe a
 * troca ao vivo), a imagem nova é carregada e substitui a antiga.
 */
export function useImageMap() {
    const images = reactive<Record<string | number, HTMLImageElement | null>>({})
    const requested = new Map<string | number, string>()

    function ensureLoaded(id: string | number, url?: string | null) {
        if (!url) return
        // Já carregada (ou carregando) esta mesma URL para este id: nada a fazer.
        if (requested.get(id) === url && (images[id] || pending.has(id))) return
        requested.set(id, url)
        pending.add(id)
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = url
        img.onload = () => {
            // Uma troca mais recente pode ter chegado enquanto esta carregava.
            if (requested.get(id) !== url) return
            pending.delete(id)
            images[id] = img
        }
        img.onerror = () => {
            if (requested.get(id) === url) pending.delete(id)
        }
    }

    const pending = new Set<string | number>()

    return { images, ensureLoaded }
}
