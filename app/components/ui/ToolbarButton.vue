<script setup lang="ts">
/**
 * Botão "plano" de barra de ferramentas, estilo Explorer do Win98: sem relevo em
 * repouso, relevo fino ao passar o mouse, afundado quando pressionado/ativo.
 * `showLabel` põe o rótulo abaixo do ícone (botões grandes); sem ele o rótulo
 * vira dica (title) e rótulo acessível.
 */
import type { IconName } from '~/utils/icons'

withDefaults(defineProps<{
  label: string
  icon?: IconName
  showLabel?: boolean
  /** Botão de alternância (ex.: modo de exibição atual). */
  pressed?: boolean
  disabled?: boolean
}>(), {
  icon: undefined,
  showLabel: false,
  pressed: undefined,
  disabled: false,
})

defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <button
    type="button"
    class="ui-toolbar-button"
    :class="{ 'with-label': showLabel, pressed }"
    :title="showLabel ? undefined : label"
    :aria-label="showLabel ? undefined : label"
    :aria-pressed="pressed"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <UiIcon v-if="icon" :name="icon" :size="showLabel ? 32 : 16" :display-size="showLabel ? 24 : 16" />
    <span v-if="showLabel || !icon" class="ui-toolbar-button-label">{{ label }}</span>
  </button>
</template>

<style scoped>
.ui-toolbar-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  min-width: 0;
  min-height: 0;
  padding: var(--sp-1) var(--sp-2);
  border: none;
  background: transparent;
  box-shadow: none;
  font: inherit;
  color: var(--c-text);
}
.ui-toolbar-button.with-label {
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 52px;
  padding: var(--sp-1) var(--sp-3);
}
.ui-toolbar-button:not(:disabled):hover {
  box-shadow: var(--bevel-thin-raised);
}
.ui-toolbar-button:not(:disabled):active,
.ui-toolbar-button.pressed {
  box-shadow: var(--bevel-thin-sunken);
  padding: calc(var(--sp-1) + 1px) calc(var(--sp-2) - 1px) calc(var(--sp-1) - 1px) calc(var(--sp-2) + 1px);
}
.ui-toolbar-button.with-label:not(:disabled):active,
.ui-toolbar-button.with-label.pressed {
  padding: calc(var(--sp-1) + 1px) calc(var(--sp-3) - 1px) calc(var(--sp-1) - 1px) calc(var(--sp-3) + 1px);
}
/* Alternado e sem hover: fundo pontilhado, como no Win98 */
.ui-toolbar-button.pressed:not(:hover) {
  background-image: repeating-conic-gradient(var(--c-highlight) 0 25%, var(--c-surface) 0 50%);
  background-size: 2px 2px;
}
.ui-toolbar-button:focus {
  outline: none;
}
.ui-toolbar-button:focus-visible {
  outline: 1px dotted var(--c-text);
  outline-offset: -3px;
}
.ui-toolbar-button:disabled {
  color: var(--c-text-disabled);
  text-shadow: 1px 1px 0 var(--c-highlight);
}
.ui-toolbar-button:disabled :deep(img) {
  filter: grayscale(1) opacity(0.5);
}
.ui-toolbar-button-label {
  white-space: nowrap;
}
</style>
