<script setup lang="ts">
const props = defineProps<{ token?: Token }>()
defineEmits(['close-window'])
</script>
<template>
  <ResourceFormWindow
      mode="edit"
      endpoint="/api/v1/tokens"
      resource-label="token"
      has-attributes
      :id="props.token?.id"
      :initial="props.token"
      missing-fields-message="Por favor, insira pelo menos uma imagem, um atributo ou uma tag."
      @close-window="$emit('close-window')"
  />
</template>
