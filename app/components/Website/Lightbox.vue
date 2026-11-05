<script setup lang="ts">
/**
 * Imagem ampliável do site: miniatura clicável que abre a imagem grande sobre o
 * fundo escurecido. Sem moldura de janela: as screenshots do sistema já trazem
 * a própria borda do Windows, e uma segunda janela em volta duplicava o efeito.
 *
 * Usa <dialog> nativo (modal): Esc fecha, o foco fica preso na caixa e volta
 * para a miniatura ao fechar. Clicar fora da imagem ou no × também fecha.
 */
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    src: string
    thumbnail?: string
    width?: string | number
    height?: string | number
    alt?: string
    /** Nome acessível da caixa ampliada (padrão: o texto alternativo). */
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
    loading: 'lazy',
  },
)

const emit = defineEmits<{
  (e: 'open'): void
  (e: 'close'): void
}>()

const dialogRef = ref<HTMLDialogElement | null>(null)
const isOpen = ref(false)
let previousOverflow = ''

function lockScroll(lock: boolean) {
  if (lock) {
    previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
  } else {
    document.documentElement.style.overflow = previousOverflow
  }
}

const openLightbox = () => {
  const dialog = dialogRef.value
  if (!dialog || dialog.open) return
  dialog.showModal()
  lockScroll(true)
  isOpen.value = true
  emit('open')
}

const closeLightbox = () => {
  if (dialogRef.value?.open) dialogRef.value.close()
}

/** O evento `close` do <dialog> dispara para Esc, para o × e para close(). */
const onNativeClose = () => {
  if (!isOpen.value) return
  lockScroll(false)
  isOpen.value = false
  emit('close')
}

/** O <dialog> ocupa a tela toda: um clique nele mesmo (e não na imagem ou no ×) é "clique fora". */
const onDialogClick = (event: MouseEvent) => {
  if (event.target === dialogRef.value) closeLightbox()
}

onBeforeUnmount(() => {
  if (isOpen.value) lockScroll(false)
})

defineExpose({
  open: openLightbox,
  close: closeLightbox,
  isOpen,
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
        >
      </slot>
    </div>

    <dialog
      ref="dialogRef"
      class="lightbox-dialog"
      :aria-label="title || alt || 'Imagem ampliada'"
      @click="onDialogClick"
      @close="onNativeClose"
    >
      <button type="button" class="lightbox-close" aria-label="Fechar" title="Fechar (Esc)" @click="closeLightbox">×</button>
      <figure class="lightbox-figure">
        <img :src="src" :alt="alt" class="lightbox-expanded-img">
        <figcaption v-if="caption || $slots.caption" class="lightbox-caption">
          {{ caption }}
          <slot name="caption" />
        </figcaption>
      </figure>
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
  cursor: zoom-in;
  max-width: 100%;
  line-height: 0;
}

.lightbox-trigger:focus-visible {
  outline: 2px dotted #000080;
  outline-offset: 2px;
}

.lightbox-thumb {
  max-width: 100%;
  height: auto;
  display: block;
  transition: opacity 0.15s ease-in-out, filter 0.15s ease-in-out;
}

.lightbox-trigger:hover .lightbox-thumb {
  filter: brightness(1.04);
}

/* A caixa cobre a tela inteira; o fundo escuro é do próprio ::backdrop */
.lightbox-dialog {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: var(--sp-5);
  box-sizing: border-box;
  border: none;
  background: transparent;
  color: #ffffff;
  outline: none;
  overflow: hidden;
  cursor: zoom-out;
}

.lightbox-dialog[open] {
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-dialog::backdrop {
  background-color: rgba(0, 0, 0, 0.82);
}

.lightbox-figure {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  margin: 0;
  max-width: 100%;
  max-height: 100%;
  cursor: default;
}

.lightbox-expanded-img {
  display: block;
  max-width: 100%;
  max-height: calc(100vh - 120px);
  max-height: calc(100dvh - 120px);
  width: auto;
  height: auto;
  object-fit: contain;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.15), 4px 4px 0 rgba(0, 0, 0, 0.5);
}

.lightbox-caption {
  max-width: 70ch;
  margin: 0;
  color: #ffffff;
  font-size: var(--fs-1);
  line-height: var(--lh);
  text-align: center;
}

/* "×" discreto no canto: não disputa atenção com a imagem */
.lightbox-close {
  position: absolute;
  top: var(--sp-4);
  right: var(--sp-4);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 0;
  background: rgba(0, 0, 0, 0.45);
  box-shadow: none;
  color: #ffffff;
  font-family: var(--font-ui);
  font-size: var(--fs-2);
  line-height: 1;
  cursor: pointer;
}

.lightbox-close:hover {
  background: rgba(0, 0, 0, 0.75);
  border-color: #ffffff;
}

.lightbox-close:focus-visible {
  outline: 2px dotted #ffffff;
  outline-offset: 2px;
}
</style>
