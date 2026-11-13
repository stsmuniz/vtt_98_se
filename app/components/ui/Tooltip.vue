<script setup lang="ts">
/**
 * Dica de ferramenta do Win98: caixa amarela com borda preta de 1 px. Só desenha a
 * caixa; quem usa decide onde posicioná-la (ex.: sobre o canvas dos tokens).
 */
defineProps<{ text: string }>()
</script>

<template>
  <div class="ui-tooltip" role="tooltip">{{ text }}</div>
</template>

<style scoped>
.ui-tooltip {
  display: inline-block;
  padding: 1px 4px;
  background: var(--c-tooltip);
  border: 1px solid #000;
  color: #000;
  font-family: var(--font-ui);
  font-size: var(--fs-1);
  line-height: var(--lh);
  white-space: nowrap;
  pointer-events: none;
}
</style>
