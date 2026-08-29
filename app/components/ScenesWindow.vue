<script setup lang="ts">
defineProps<{ selectSceneForRoom?: boolean | string }>()
defineEmits(['close-window', 'selectSceneForRoom'])

const openEditorWindow = (item: any) => {
  navigateTo(`/dashboard/scenes/${item?.id}`)
}
</script>
<template>
  <ResourceListWindow
      endpoint="/api/v1/scenes"
      section-title="Cenas"
      resource-label="cena"
      resource-article="a"
      insert-title="Adicionar Cena"
      edit-title="Editar Cena"
      icon="scenes"
      insert-button-label="Adicionar..."
      @close-window="$emit('close-window')"
  >
    <template #insert-window="{ tags, close }">
      <InsertSceneWindow :tags="tags" @close-window="close"/>
    </template>
    <template #edit-window="{ item, close }">
      <EditSceneWindow :scene="item" @close-window="close"/>
    </template>
    <template #item="{ item }">
      <img :src="item.scenario.image" :alt="item.scenario.name"/>
      <span>{{ item.name }}</span>
    </template>
    <template #extra-actions-before-close="{ item }">
      <button :disabled="!item" @click="openEditorWindow(item)">Abrir no editor</button>
    </template>
    <template v-if="selectSceneForRoom" #extra-actions-after-insert="{ item }">
      <button :disabled="!item" @click="$emit('selectSceneForRoom', item)">Selecionar para a sala</button>
    </template>
  </ResourceListWindow>
</template>
