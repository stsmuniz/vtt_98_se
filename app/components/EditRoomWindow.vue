<script setup lang="ts">

const props = defineProps<{ room?: Room }>()

defineEmits(['close-window'])
</script>
<template>
  <resource-form-window
      mode="edit"
      endpoint="/api/v1/rooms"
      resource-label="salas"
      :id="props.room?.id"
      :initial="props.room"
      :omit-image="true"
      @close-window="$emit('close-window')"
  />
</template>
