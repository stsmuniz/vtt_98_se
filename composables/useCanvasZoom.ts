import { computed, ref, watch } from 'vue'

export function useCanvasZoom(initial = 100, min = 10, max = 500, step = 10) {
    const zoom = ref(initial)
    const scale = computed(() => zoom.value / 100)

    const zoomIn = () => {
        zoom.value = Math.min(max, zoom.value + step)
    }

    const zoomOut = () => {
        zoom.value = Math.max(min, zoom.value - step)
    }

    const resetZoom = () => {
        zoom.value = initial
    }

    const handleWheel = (e: any) => {
        const evt = e.evt
        if (evt.ctrlKey) {
            evt.preventDefault()
            if (evt.deltaY < 0) {
                zoomIn()
            } else {
                zoomOut()
            }
        }
    }

    /** Ajusta o zoom para a cena inteira caber na área visível (em degraus de 5%). */
    const fitTo = (areaWidth: number, areaHeight: number, sceneWidth: number, sceneHeight: number) => {
        if (!areaWidth || !areaHeight || !sceneWidth || !sceneHeight) return
        const fit = Math.min(areaWidth / sceneWidth, areaHeight / sceneHeight) * 100
        zoom.value = Math.max(min, Math.min(max, Math.floor(fit / 5) * 5))
    }

    watch(zoom, (newVal) => {
        if (isNaN(newVal) || newVal <= 0) {
            zoom.value = initial
        }
    })

    return { zoom, scale, zoomIn, zoomOut, resetZoom, handleWheel, fitTo }
}
