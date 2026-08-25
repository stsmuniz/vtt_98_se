<script setup lang="ts">
defineProps(['icon', 'title'])
defineEmits(['close-window'])
</script>
<template>
  <BaseWindow :title="title" :icon="icon" @close-window="$emit('close-window')">
    <slot/>
  </BaseWindow>
</template>
