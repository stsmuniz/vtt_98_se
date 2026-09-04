<script setup lang="ts">
defineProps<{
  src: string
  alt?: string
  width?: string | number
  height?: string | number
}>()
</script>

<template>
  <Lightbox
    :src="src"
    :alt="alt"
    :title="alt"
  />
</template>
