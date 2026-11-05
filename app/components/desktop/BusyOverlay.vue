<script setup lang="ts">
/**
 * Aviso bloqueante "Aguarde" (substitui a antiga LoadingWindow). Controlado por
 * useLoadingWindow() — show/hide/withLoading continuam iguais.
 */
import { useLoadingWindow } from '~~/composables/useLoadingWindow'

const { isActive, message, image } = useLoadingWindow()
</script>

<template>
  <div v-if="isActive" class="busy-overlay" role="alertdialog" aria-busy="true" :aria-label="message">
    <UiWindow :title="message" variant="dialog" :closable="false" class="busy-window">
      <div class="busy-content">
        <img v-if="image" :src="`/assets/gifs/${image}.gif`" alt="">
        <UiProgressBar :label="message" />
        <p>{{ message }}</p>
      </div>
    </UiWindow>
  </div>
</template>

<style scoped>
.busy-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-busy);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-5);
  cursor: wait;
}
.busy-window {
  width: min(360px, 100%);
}
.busy-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  text-align: center;
}
.busy-content :deep(.ui-progress) {
  width: 100%;
}
.busy-content p {
  margin: 0;
}
</style>
