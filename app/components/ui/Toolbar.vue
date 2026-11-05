<script setup lang="ts">
/** Barra de ferramentas (fileira de UiToolbarButton / UiToolbarSeparator / campos). */
withDefaults(defineProps<{ label?: string }>(), { label: 'Barra de ferramentas' })
</script>

<template>
  <div class="ui-toolbar" role="toolbar" :aria-label="label">
    <slot />
  </div>
</template>

<style scoped>
.ui-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-1) var(--sp-2);
  font-family: var(--font-ui);
  font-size: var(--fs-1);
}
</style>
