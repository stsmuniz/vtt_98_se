<script setup lang="ts">
/** Moldura com título (fieldset/legend do 98.css). */
defineProps<{ label?: string; disabled?: boolean }>()
</script>

<template>
  <fieldset class="ui-group-box" :disabled="disabled">
    <legend v-if="label">{{ label }}</legend>
    <slot />
  </fieldset>
</template>

<style scoped>
.ui-group-box {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin: 0;
  min-width: 0;
  font-family: var(--font-ui);
  font-size: var(--fs-1);
}
.ui-group-box legend {
  font-family: var(--font-ui);
  font-size: var(--fs-1);
  padding: 0 var(--sp-1);
}
</style>
