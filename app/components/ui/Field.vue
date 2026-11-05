<script setup lang="ts">
/**
 * Linha de formulário: rótulo + controle. O slot recebe `id` para ligar o
 * controle ao rótulo (`<input :id="id">`).
 */
const props = withDefaults(defineProps<{
  label?: string
  /** id do controle (estável, ex.: para autopreenchimento do navegador). Padrão: gerado. */
  fieldId?: string
  /** Rótulo acima do controle em vez de ao lado. */
  stacked?: boolean
  hint?: string
}>(), {
  label: undefined,
  fieldId: undefined,
  stacked: false,
  hint: undefined,
})

const generatedId = useId()
const id = computed(() => props.fieldId ?? generatedId)
</script>

<template>
  <div class="ui-field" :class="{ stacked }">
    <label v-if="label" :for="id" class="ui-field-label">{{ label }}</label>
    <div class="ui-field-control">
      <slot :id="id" />
    </div>
    <small v-if="hint" class="ui-field-hint">{{ hint }}</small>
  </div>
</template>

<style scoped>
.ui-field {
  display: grid;
  /* --field-label-w permite a um formulário alinhar a coluna dos rótulos em todos os campos */
  grid-template-columns: var(--field-label-w, minmax(80px, max-content)) minmax(0, 1fr);
  align-items: center;
  gap: var(--sp-1) var(--sp-3);
  font-family: var(--font-ui);
  font-size: var(--fs-1);
}
.ui-field.stacked {
  grid-template-columns: minmax(0, 1fr);
}
.ui-field-label {
  font: inherit;
}
.ui-field-control {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}
.ui-field-control > :deep(input:not([type=checkbox]):not([type=radio])),
.ui-field-control > :deep(select),
.ui-field-control > :deep(textarea) {
  flex: 1 1 auto;
  min-width: 0;
}
.ui-field-hint {
  grid-column: 1 / -1;
  color: var(--c-text-disabled);
  font-size: var(--fs-1);
}
.ui-field:not(.stacked) .ui-field-hint {
  grid-column: 2;
}
</style>
