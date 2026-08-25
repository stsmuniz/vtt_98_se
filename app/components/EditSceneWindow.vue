<script setup lang="ts">
const props = defineProps<{ scene?: Scene }>()
defineEmits(['close-window'])
</script>
<template>
  <ResourceFormWindow
      mode="edit"
      endpoint="/api/v1/scenes"
      resource-label="cena"
      resource-article="a"
      :has-image="false"
      :id="props.scene?.id"
      :initial="props.scene"
      @close-window="$emit('close-window')"
  />
</template>
