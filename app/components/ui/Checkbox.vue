<script setup lang="ts">
/** Caixa de seleção (checkbox) do 98.css. */
withDefaults(defineProps<{ label: string; disabled?: boolean }>(), { disabled: false })
const model = defineModel<boolean>({ default: false })
const id = useId()
</script>

<template>
  <div class="field-row ui-checkbox">
    <input :id="id" v-model="model" type="checkbox" :disabled="disabled">
    <label :for="id">{{ label }}</label>
  </div>
</template>

<style scoped>
.ui-checkbox {
  margin: 0;
}
.ui-checkbox label {
  font-family: var(--font-ui);
  font-size: var(--fs-1);
}
</style>
