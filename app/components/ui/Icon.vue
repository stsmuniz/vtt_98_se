<script setup lang="ts">
/** Ícone do sistema pelo nome lógico (ver app/utils/icons.ts). */
import { iconUrl, type IconName, type IconSize } from '~/utils/icons'

const props = withDefaults(defineProps<{
  name: IconName
  size?: IconSize
  /** Tamanho de exibição, se diferente do arquivo (ampliado sem suavizar). */
  displaySize?: number
  alt?: string
}>(), {
  size: 32,
  displaySize: undefined,
  alt: '',
})

const px = computed(() => props.displaySize ?? props.size)
</script>

<template>
  <img class="ui-icon" :src="iconUrl(name, size)" :alt="alt" :width="px" :height="px" draggable="false">
</template>

<style scoped>
.ui-icon {
  image-rendering: pixelated;
  flex-shrink: 0;
}
</style>
