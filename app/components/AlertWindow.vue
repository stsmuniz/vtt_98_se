<script setup lang="ts">
defineProps(['icon', 'title', 'cancelAction'])
defineEmits(['alert-button-OK'])
</script>
<template>
  <BaseWindow :title="title">
    <template #title-bar-controls>
      <button aria-label="Ajuda"><strong>?</strong></button>
    </template>
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
    <template #footer class="window-footer">
      <button @click="$emit('alert-button-OK')">OK</button>
      <button
          v-if="cancelAction"
          @click="cancelAction()"
      >
        Cancelar
      </button>
    </template>
  </BaseWindow>
</template>
<style lang="css" scoped>
.window-content-container {
  display: flex;
  gap: 1rem;
  max-width: 20rem;
  min-height: 3rem;
}
</style>
