<script setup lang="ts">
/** Caixa de seleção (checkbox) do 98.css. */
const props = withDefaults(defineProps<{ label?: string; inputId?: string; name?: string; disabled?: boolean }>(), { label: undefined, inputId: undefined, name: undefined, disabled: false })
const model = defineModel<boolean>({ default: false })
const generatedId = useId()
const id = computed(() => props.inputId ?? generatedId)
</script>

<template>
  <div class="field-row ui-checkbox">
    <input :id="id" v-model="model" type="checkbox" :name="name" :disabled="disabled">
    <!-- O 98.css usa inline-flex no rótulo; o span mantém texto e links numa linha só -->
    <label :for="id"><span><slot>{{ label }}</slot></span></label>
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
