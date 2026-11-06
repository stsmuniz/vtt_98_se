<script setup lang="ts">
/**
 * Ícone do sistema pelo nome lógico (ver app/utils/icons.ts). Com `overlay`, um segundo ícone menor
 * (metade do tamanho) é sobreposto no canto inferior direito, como os ícones de sobreposição do
 * Windows (a seta do atalho, a mão do compartilhamento): serve para diferenciar ícones que usam a
 * mesma imagem de base, como as pastas de cada recurso.
 */
import { iconUrl, overlayMetrics, type IconName, type IconSize } from '~/utils/icons'

const props = withDefaults(defineProps<{
  name: IconName
  size?: IconSize
  /** Tamanho de exibição, se diferente do arquivo (ampliado sem suavizar). */
  displaySize?: number
  alt?: string
  /** Selo no canto inferior direito. */
  overlay?: IconName | null
}>(), {
  size: 32,
  displaySize: undefined,
  alt: '',
  overlay: null,
})

const px = computed(() => props.displaySize ?? props.size)
const badge = computed(() => (props.overlay ? overlayMetrics(props.overlay, px.value) : null))
</script>

<template>
  <span v-if="overlay && badge" class="ui-icon-stack" :style="{ width: `${px}px`, height: `${px}px` }">
    <img class="ui-icon" :src="iconUrl(name, size)" :alt="alt" :width="px" :height="px" draggable="false">
    <img class="ui-icon ui-icon-overlay" :src="badge.url" alt="" :width="badge.px" :height="badge.px" draggable="false">
  </span>
  <img v-else class="ui-icon" :src="iconUrl(name, size)" :alt="alt" :width="px" :height="px" draggable="false">
</template>

<style scoped>
.ui-icon {
  image-rendering: pixelated;
  flex-shrink: 0;
}
.ui-icon-stack {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}
.ui-icon-overlay {
  position: absolute;
  right: 0;
  bottom: 0;
}
</style>
