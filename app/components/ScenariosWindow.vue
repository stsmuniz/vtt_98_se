<script setup lang="ts">
defineProps<{ setScenarioToScene?: boolean | string }>()
defineEmits(['close-window', 'setScenarioToScene'])
</script>
<template>
  <ResourceListWindow
      endpoint="/api/v1/scenarios"
      section-title="Cenários"
      resource-label="cenário"
      insert-title="Adicionar Cenário"
      edit-title="Editar Cenário"
      icon="scenario"
      @close-window="$emit('close-window')"
  >
    <template #insert-window="{ tags, close }">
      <InsertScenarioWindow :tags="tags" @close-window="close"/>
    </template>
    <template #edit-window="{ item, close }">
      <EditScenarioWindow :scenario="item" @close-window="close"/>
    </template>
    <template v-if="setScenarioToScene" #extra-actions-after-insert="{ item }">
      <button @click="$emit('setScenarioToScene', item)">Adicionar na cena</button>
    </template>
  </ResourceListWindow>
</template>
