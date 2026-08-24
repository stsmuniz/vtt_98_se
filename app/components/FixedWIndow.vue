<script setup lang="ts">
defineProps([
  'icon', 'title'
])
defineEmits(['close-window'])
</script>
<template>
  <div class="window-overlay">
    <div class="window fixed-window">
      <div class="title-bar">
        <div class="title-bar-text">
          <img :src="`/assets/icons/${icon}.png`" style="width: 16px; height: 16px;"/> {{ title }}
        </div>
        <div class="title-bar-controls">
          <button aria-label="Fechar" @click="$emit('close-window')">🗙</button>
        </div>
      </div>
      <div class="window-body">
        <slot @close-window="$emit('close-window')"/>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>

</script>
<style lang="css" scoped>

.fixed-window {
  max-height: 90vh;
}

.fixed-window .window-body {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  gap: 2rem;
  margin: 0.125rem;
  padding: 0.25rem;
  max-height: 90vh;
}

.window-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}
</style>