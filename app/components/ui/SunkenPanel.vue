<script setup lang="ts">
/** Área afundada com fundo branco (listas, pré-visualizações, áreas de conteúdo). */
withDefaults(defineProps<{ background?: 'window' | 'surface' | 'dark' }>(), { background: 'window' })
</script>

<template>
  <div class="ui-sunken-panel" :class="`bg-${background}`">
    <slot />
  </div>
</template>

<style scoped>
.ui-sunken-panel {
  box-shadow: var(--bevel-sunken);
  padding: 2px;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}
.bg-window { background: var(--c-window); }
.bg-surface { background: var(--c-surface); }
.bg-dark { background: var(--c-shadow); }
</style>
