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

    watch(zoom, (newVal) => {
        if (isNaN(newVal) || newVal <= 0) {
            zoom.value = initial
        }
    })

    return { zoom, scale, zoomIn, zoomOut, resetZoom, handleWheel }
}
