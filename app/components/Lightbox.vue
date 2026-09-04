<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    src: string
    thumbnail?: string
    width?: string | number
    height?: string | number
    alt?: string
    title?: string
    caption?: string
    imgClass?: string
    wrapperClass?: string
    loading?: 'lazy' | 'eager'
  }>(),
  {
    thumbnail: '',
    width: undefined,
    height: undefined,
    alt: '',
    title: '',
    caption: '',
    imgClass: '',
    wrapperClass: '',
    loading: 'lazy'
  }
)

const emit = defineEmits<{
  (e: 'open'): void
  (e: 'close'): void
}>()

const dialogRef = ref<HTMLDialogElement | null>(null)
const isOpen = ref(false)

const openLightbox = () => {
  if (dialogRef.value) {
    dialogRef.value.showModal()
    isOpen.value = true
    emit('open')
  }
}

const closeLightbox = () => {
  if (dialogRef.value) {
    dialogRef.value.close()
  }
  isOpen.value = false
  emit('close')
}

const onDialogClick = (event: MouseEvent) => {
  if (event.target === dialogRef.value) {
    closeLightbox()
    return
  }
  const rect = dialogRef.value?.getBoundingClientRect()
  if (rect) {
    const isOutside = (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
    if (isOutside) {
      closeLightbox()
    }
  }
}

const onNativeClose = () => {
  isOpen.value = false
  emit('close')
}

defineExpose({
  open: openLightbox,
  close: closeLightbox,
  isOpen
})
</script>

<template>
  <div class="lightbox-wrapper" :class="wrapperClass">
    <div
      class="lightbox-trigger"
      role="button"
      tabindex="0"
      :aria-label="alt ? `Ampliar imagem: ${alt}` : 'Ampliar imagem'"
      @click="openLightbox"
      @keydown.enter.prevent="openLightbox"
      @keydown.space.prevent="openLightbox"
    >
      <slot>
        <img
          :src="thumbnail || src"
          :alt="alt"
          :width="width"
          :height="height"
          :class="['lightbox-thumb', imgClass]"
          :loading="loading"
        />
      </slot>
    </div>

    <dialog
      ref="dialogRef"
      class="lightbox-dialog"
      @click="onDialogClick"
      @close="onNativeClose"
      @cancel="onNativeClose"
    >
      <div class="window lightbox-window" @click.stop>
        <div class="title-bar">
          <div class="title-bar-text">
            {{ title || alt || 'Visualizador de Imagem' }}
          </div>
          <div class="title-bar-controls">
            <button aria-label="Fechar" @click="closeLightbox">🗙</button>
          </div>
        </div>
        <div class="window-body lightbox-body">
          <img
            :src="src"
            :alt="alt"
            class="lightbox-expanded-img"
          />
          <p v-if="caption" class="lightbox-caption">{{ caption }}</p>
          <slot name="caption" />
        </div>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.lightbox-wrapper {
  display: inline-block;
  max-width: 100%;
}

.lightbox-trigger {
  display: inline-block;
  cursor: pointer;
  max-width: 100%;
  line-height: 0;
}

.lightbox-thumb {
  max-width: 100%;
  height: auto;
  display: block;
  cursor: pointer;
  transition: opacity 0.15s ease-in-out, filter 0.15s ease-in-out;
}

.lightbox-trigger:hover .lightbox-thumb,
.lightbox-thumb:hover {
  filter: brightness(1.04);
}

.lightbox-dialog {
  padding: 0;
  border: none;
  background: transparent;
  max-width: 90vw;
  max-height: 90vh;
  margin: auto;
  outline: none;
  overflow: visible;
}

.lightbox-dialog::backdrop {
  background-color: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(2px);
}

.lightbox-window {
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.5);
  margin: 0;
}

.lightbox-body {
  margin: 0.25rem;
  padding: 0.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: auto;
  max-height: calc(90vh - 42px);
}

.lightbox-expanded-img {
  max-width: 100%;
  max-height: calc(85vh - 60px);
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
  user-select: none;
}

.lightbox-caption {
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
  font-size: 0.85rem;
  text-align: center;
  line-height: 1.2;
}
</style>
