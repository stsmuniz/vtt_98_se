<script setup lang="ts">
withDefaults(defineProps<{ message?: string, image?: string, progress?: number }>(), {
  message: 'Carregando...',
})
</script>

<template>
  <BaseWindow title="Carregando...">
    <template #title-bar-controls></template>
    <div class="loading-content">
      <img v-if="image" :src="`/assets/gifs/${image}.gif`" :alt="message" />
      <div class="progress-indicator segmented" :class="{ indeterminate: progress === undefined }">
        <span
            class="progress-indicator-bar"
            :style="progress !== undefined ? `width: ${progress}%;` : undefined"
        />
      </div>
      <p>{{ message }}</p>
    </div>
  </BaseWindow>
</template>

<style scoped lang="css">
.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  min-width: 20rem;
  padding: 0.5rem 1rem;
  text-align: center;
}

.loading-content p {
  margin: 0;
}

.progress-indicator {
  width: 100%;
}

.progress-indicator.indeterminate .progress-indicator-bar {
  width: 40% !important;
  animation: loading-window-marquee 1.2s ease-in-out infinite;
}

@keyframes loading-window-marquee {
  0% { margin-left: 0; }
  50% { margin-left: 60%; }
  100% { margin-left: 0; }
}
</style>
