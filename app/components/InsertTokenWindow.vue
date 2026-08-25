<script setup lang="ts">
defineProps<{ tags?: string[] }>()
defineEmits(['close-window'])
</script>
<template>
  <ResourceFormWindow
      mode="insert"
      endpoint="/api/v1/tokens"
      resource-label="token"
      has-attributes
      :tag-suggestions="tags"
      missing-fields-message="Por favor, insira pelo menos uma imagem, um atributo ou uma tag."
      @close-window="$emit('close-window')"
  />
</template>
