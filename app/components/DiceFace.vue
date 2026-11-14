<script setup lang="ts">
import { iconUrl, type IconName } from '~/utils/icons'

// Imagem de um dado; d100 não tem arte própria e mostra um selo de texto.
const props = withDefaults(defineProps<{ faces: number; size?: number; dropped?: boolean }>(), {
  size: 48,
  dropped: false,
})

const src = computed(() => (props.faces === 100 ? null : iconUrl(`d${props.faces}` as IconName)))
</script>

<template>
  <span class="dice-face" :class="{ dropped }" :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true">
    <img v-if="src" :src="src" alt="" :width="size" :height="size">
    <span v-else class="dice-face-badge" :style="{ fontSize: size >= 48 ? 'var(--fs-2)' : 'var(--fs-1)' }">%</span>
  </span>
</template>

<style scoped>
.dice-face {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.dice-face img {
  display: block;
  image-rendering: pixelated;
}
.dice-face-badge {
  font-family: var(--font-ui);
  line-height: 1;
}
.dice-face.dropped {
  filter: grayscale(1);
  opacity: 0.45;
}
</style>
