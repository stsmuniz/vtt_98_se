<script setup lang="ts">
const props = defineProps<{ scenario?: Scenario }>()
defineEmits(['close-window'])
</script>
<template>
  <ResourceFormWindow
      mode="edit"
      endpoint="/api/v1/scenarios"
      resource-label="cenário"
      :id="props.scenario?.id"
      :initial="props.scenario"
      @close-window="$emit('close-window')"
  />
</template>
