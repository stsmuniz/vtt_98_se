import { reactive, ref, type Ref } from 'vue'

export function usePreloadedImage(): { image: Ref<HTMLImageElement | null>; load: (url?: string | null) => void } {
    const image = ref<HTMLImageElement | null>(null)

    function load(url?: string | null) {
        if (!url) return
        const img = new Image()
        img.src = url
        img.onload = () => {
            image.value = img
        }
    }

    return { image, load }
}

export function useImageMap() {
    const images = reactive<Record<string | number, HTMLImageElement | null>>({})

    function ensureLoaded(id: string | number, url?: string | null) {
        if (!url || images[id]) return
        const img = new Image()
        img.src = url
        img.onload = () => {
            images[id] = img
        }
    }

    return { images, ensureLoaded }
}
