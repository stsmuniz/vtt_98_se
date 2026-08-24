<script setup lang="ts">
defineProps([
  'icon', 'title', 'cancelAction'
])
defineEmits(['alert-button-OK'])
</script>
<template>
  <div class="window-overlay">
    <div class="window alert-window">
      <div class="title-bar">
        <div class="title-bar-text">{{ title }}</div>
        <div class="title-bar-controls">
          <button aria-label="Ajuda"><strong>?</strong></button>
        </div>
      </div>
      <div class="window-body">
        <div class="window-content-container">
          <div class="window-icon">
            <img :src="`/assets/icons/${icon}.png`"/>
          </div>
          <div class="window-content">
            <p>
              <slot/>
            </p>
          </div>
        </div>
        <div class="window-footer">
          <button @click="$emit('alert-button-OK')">OK</button>
          <button
              v-if="cancelAction"
              @click="cancelAction()"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="css" scoped>

.alert-window .window-body {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  gap: 2rem;
}

.alert-window .window-content-container {
  display: flex;
  gap: 1rem;
}

.alert-window .window-footer {
  display: flex;
  justify-content: space-around;
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