<script setup lang="ts">
defineProps<{ title?: string; icon?: string }>()
defineEmits(['close-window'])
</script>
<template>
  <div class="window-overlay">
    <div class="window base-window">
      <div class="title-bar">
        <div class="title-bar-text">
          <img v-if="icon" :src="`/assets/icons/${icon}.png`" style="width: 16px; height: 16px;"/> {{ title }}
        </div>
        <div class="title-bar-controls">
          <slot name="title-bar-controls">
            <button aria-label="Fechar" @click="$emit('close-window')">🗙</button>
          </slot>
        </div>
      </div>
      <div class="window-body">
        <slot/>
      </div>
      <div v-if="$slots.footer" class="window-footer">
        <slot name="footer"/>
      </div>
    </div>
  </div>
</template>
<style lang="css" scoped>
.base-window {
  max-height: 90vh;
}

.window-body {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin: 0.125rem;
  padding: 0.25rem;
  max-height: 90vh;
}

.window-footer {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0.5rem;
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
