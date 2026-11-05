<script setup lang="ts">
/** Campo afundado da barra de status. `grow` faz o campo ocupar o espaço livre. */
withDefaults(defineProps<{ grow?: boolean; width?: string }>(), { grow: false, width: undefined })
</script>

<template>
  <p class="status-bar-field ui-status-field" :class="{ grow }" :style="width ? { flex: `0 0 ${width}` } : undefined">
    <slot />
  </p>
</template>

<style scoped>
.ui-status-field {
  margin: 0;
  padding: var(--sp-1) var(--sp-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 0 1 auto;
}
.ui-status-field.grow {
  flex: 1 1 auto;
}
</style>
