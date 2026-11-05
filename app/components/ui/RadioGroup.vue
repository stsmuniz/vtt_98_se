<script setup lang="ts" generic="T extends string | number">
/** Grupo de botões de opção (radio). */
withDefaults(defineProps<{
  options: { value: T; label: string; disabled?: boolean }[]
  label?: string
  direction?: 'vertical' | 'horizontal'
}>(), {
  label: undefined,
  direction: 'vertical',
})

const model = defineModel<T>({ required: true })
const name = useId()
</script>

<template>
  <div class="ui-radio-group" :class="direction" role="radiogroup" :aria-label="label">
    <div v-for="opt in options" :key="opt.value" class="field-row">
      <input
        :id="`${name}-${opt.value}`"
        v-model="model"
        type="radio"
        :name="name"
        :value="opt.value"
        :disabled="opt.disabled"
      >
      <label :for="`${name}-${opt.value}`">{{ opt.label }}</label>
    </div>
  </div>
</template>

<style scoped>
.ui-radio-group {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.ui-radio-group.horizontal {
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--sp-4);
}
.ui-radio-group .field-row {
  margin: 0;
}
.ui-radio-group label {
  font-family: var(--font-ui);
  font-size: var(--fs-1);
}
</style>
