<script setup lang="ts">
/** Controle deslizante com rótulos nas pontas (ex.: Menor ↔ Maior). */
withDefaults(defineProps<{
  min?: number
  max?: number
  step?: number
  label?: string
  minLabel?: string
  maxLabel?: string
  disabled?: boolean
}>(), {
  min: 0,
  max: 100,
  step: 1,
  label: undefined,
  minLabel: undefined,
  maxLabel: undefined,
  disabled: false,
})

const model = defineModel<number>({ required: true })
</script>

<template>
  <UiField :label="label" stacked>
    <template #default="{ id }">
      <span v-if="minLabel" class="ui-slider-end">{{ minLabel }}</span>
      <input
        :id="id"
        v-model.number="model"
        class="ui-slider has-box-indicator"
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
      >
      <span v-if="maxLabel" class="ui-slider-end">{{ maxLabel }}</span>
    </template>
  </UiField>
</template>

<style scoped>
.ui-slider {
  flex: 1 1 auto;
}
.ui-slider-end {
  font-family: var(--font-ui);
  font-size: var(--fs-1);
  white-space: nowrap;
}
</style>
