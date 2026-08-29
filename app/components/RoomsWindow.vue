<script setup lang="ts">
defineEmits(['close-window', 'setScenarioToScene'])
</script>
<template>
  <resource-list-window
      endpoint="/api/v1/rooms"
      section-title="Salas"
      resource-label="sala"
      insert-title="Adicionar Sala"
      edit-title="Editar Sala"
      icon="desktop"
      @close-window="$emit('close-window')"
  >
    <template #insert-window="{ tags, close }">
      <insert-room-window :tag-suggestions="tags" @close-window="close"/>
    </template>
    <template #edit-window="{ item, close }">
      <edit-room-window :room="item" @close-window="close"/>
    </template>
    <template #extra-actions-before-close="{ item }">
      <button
          :disabled="!item"
          @click="navigateTo('/rooms/' + item.code, {open: {target: '_blank'}})">Entrar na sala</button>
    </template>
  </resource-list-window>
</template>