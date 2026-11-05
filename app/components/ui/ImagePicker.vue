<script setup lang="ts">
/**
 * Escolha de imagem com pré-visualização. Mostra a imagem existente
 * (`currentUrl`) até o usuário escolher um arquivo novo; informa as dimensões
 * reais do arquivo escolhido pelo evento `change`.
 */
const props = withDefaults(defineProps<{
  currentUrl?: string | null
  label?: string
  accept?: string
  disabled?: boolean
  /** Lado da caixa de pré-visualização, em px. */
  previewSize?: number
}>(), {
  currentUrl: null,
  label: 'Imagem',
  accept: 'image/*',
  disabled: false,
  previewSize: 160,
})

const file = defineModel<File | null>('file', { default: null })
const emit = defineEmits<{ change: [info: { file: File; url: string; width: number; height: number }] }>()

const inputEl = ref<HTMLInputElement | null>(null)
const objectUrl = ref<string | null>(null)
const dims = ref<{ width: number; height: number } | null>(null)
const inputId = useId()

const previewUrl = computed(() => objectUrl.value ?? props.currentUrl)

function revoke() {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
  objectUrl.value = null
}

function onChange(event: Event) {
  const chosen = (event.target as HTMLInputElement).files?.[0]
  if (!chosen) return
  revoke()
  const url = URL.createObjectURL(chosen)
  objectUrl.value = url
  file.value = chosen
  const img = new Image()
  img.onload = () => {
    dims.value = { width: img.naturalWidth, height: img.naturalHeight }
    emit('change', { file: chosen, url, width: img.naturalWidth, height: img.naturalHeight })
  }
  img.src = url
}

function onPreviewLoad(event: Event) {
  if (objectUrl.value) return
  const img = event.target as HTMLImageElement
  dims.value = { width: img.naturalWidth, height: img.naturalHeight }
}

watch(file, (f) => {
  if (!f) {
    revoke()
    if (inputEl.value) inputEl.value.value = ''
  }
})

onBeforeUnmount(revoke)
</script>

<template>
  <div class="ui-image-picker">
    <label :for="inputId" class="ui-image-picker-label">{{ label }}:</label>
    <div class="ui-image-preview" :style="{ width: `${previewSize}px`, height: `${previewSize}px` }">
      <img v-if="previewUrl" :src="previewUrl" alt="Pré-visualização" @load="onPreviewLoad">
      <span v-else class="ui-image-empty">(nenhuma imagem)</span>
    </div>
    <small v-if="dims" class="ui-image-dims">{{ dims.width }} × {{ dims.height }} px</small>
    <input
      :id="inputId"
      ref="inputEl"
      class="ui-image-input"
      type="file"
      :accept="accept"
      :disabled="disabled"
      @change="onChange"
    >
    <button type="button" :disabled="disabled" @click="inputEl?.click()">Procurar…</button>
  </div>
</template>

<style scoped>
.ui-image-picker {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sp-2);
  font-family: var(--font-ui);
  font-size: var(--fs-1);
}
.ui-image-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--bevel-sunken);
  padding: 2px;
  /* Xadrez para mostrar transparência */
  background: repeating-conic-gradient(#e0e0e0 0 25%, var(--c-window) 0 50%) 0 0 / 16px 16px;
}
.ui-image-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.ui-image-empty {
  color: var(--c-text-disabled);
}
.ui-image-dims {
  color: var(--c-text-disabled);
  font-size: var(--fs-1);
}
.ui-image-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
</style>
