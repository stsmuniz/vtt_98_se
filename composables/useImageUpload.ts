import { ref } from 'vue'

export function useImageUpload() {
    const imageFile = ref<File | null>(null)
    const imagePreviewUrl = ref<string | null>(null)
    const imageWidth = ref(0)
    const imageHeight = ref(0)

    function handleImageUpload(event: Event) {
        const target = event.target as HTMLInputElement
        const file = target.files?.[0]

        if (!file) {
            imageFile.value = null
            imagePreviewUrl.value = null
            return
        }

        imageFile.value = file

        if (imagePreviewUrl.value) {
            URL.revokeObjectURL(imagePreviewUrl.value)
        }

        const objectUrl = URL.createObjectURL(file)
        imagePreviewUrl.value = objectUrl

        const img = new Image()
        img.onload = () => {
            imageWidth.value = img.width
            imageHeight.value = img.height
        }
        img.src = objectUrl
    }

    function setExistingImage(url?: string | null, width = 0, height = 0) {
        imagePreviewUrl.value = url ?? null
        imageWidth.value = width
        imageHeight.value = height
    }

    return { imageFile, imagePreviewUrl, imageWidth, imageHeight, handleImageUpload, setExistingImage }
}
