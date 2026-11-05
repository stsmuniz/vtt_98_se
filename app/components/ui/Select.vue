<script setup lang="ts" generic="T extends string | number">
/** Caixa de seleção (combobox) com rótulo. */
withDefaults(defineProps<{
  options: { value: T; label: string; disabled?: boolean }[]
  label?: string
  disabled?: boolean
  stacked?: boolean
}>(), {
  label: undefined,
  disabled: false,
  stacked: false,
})

const model = defineModel<T>({ required: true })
</script>

<template>
  <UiField :label="label" :stacked="stacked">
    <template #default="{ id }">
      <select :id="id" v-model="model" class="ui-select" :disabled="disabled">
        <option v-for="opt in options" :key="opt.value" :value="opt.value" :disabled="opt.disabled">{{ opt.label }}</option>
      </select>
    </template>
  </UiField>
</template>

<style scoped>
.ui-select {
  font-family: var(--font-ui);
  font-size: var(--fs-1);
  height: auto;
  min-height: 21px;
}
</style>
