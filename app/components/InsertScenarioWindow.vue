<script setup lang="ts">
defineProps<{ tags?: string[] }>()
defineEmits(['close-window'])
</script>
<template>
  <ResourceFormWindow
      mode="insert"
      endpoint="/api/v1/scenarios"
      resource-label="cenário"
      :tag-suggestions="tags"
      @close-window="$emit('close-window')"
  />
</template>
