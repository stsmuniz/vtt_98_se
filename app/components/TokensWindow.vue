<script setup lang="ts">
defineProps<{ addTokenToScene?: boolean | string }>()
defineEmits(['close-window', 'addTokenToScene'])
</script>
<template>
  <ResourceListWindow
      endpoint="/api/v1/tokens"
      section-title="Tokens"
      resource-label="token"
      insert-title="Adicionar Token"
      edit-title="Editar Token"
      icon="tokens"
      @close-window="$emit('close-window')"
  >
    <template #insert-window="{ tags, close }">
      <InsertTokenWindow :tags="tags" @close-window="close"/>
    </template>
    <template #edit-window="{ item, close }">
      <EditTokenWindow :token="item" @close-window="close"/>
    </template>
    <template v-if="addTokenToScene" #extra-actions-after-insert="{ item }">
      <button @click="$emit('addTokenToScene', item)">Adicionar na cena</button>
    </template>
  </ResourceListWindow>
</template>
