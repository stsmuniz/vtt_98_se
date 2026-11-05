<script setup lang="ts">
/** Campo de texto com rótulo. Enter emite `enter` (ex.: confirmar um diálogo). */
const props = withDefaults(defineProps<{
  label?: string
  type?: 'text' | 'password' | 'email' | 'number' | 'search'
  placeholder?: string
  disabled?: boolean
  autofocus?: boolean
  stacked?: boolean
  maxlength?: number
  autocomplete?: string
  /** id de um <datalist> com sugestões. */
  list?: string
  hint?: string
}>(), {
  label: undefined,
  type: 'text',
  placeholder: undefined,
  disabled: false,
  autofocus: false,
  stacked: false,
  maxlength: undefined,
  autocomplete: undefined,
  list: undefined,
  hint: undefined,
})

const model = defineModel<string | number>({ default: '' })
const emit = defineEmits<{ enter: [] }>()
const inputEl = ref<HTMLInputElement | null>(null)

onMounted(() => {
  if (props.autofocus) inputEl.value?.focus()
})

defineExpose({ focus: () => inputEl.value?.focus(), select: () => inputEl.value?.select() })
</script>

<template>
  <UiField :label="label" :stacked="stacked" :hint="hint">
    <template #default="{ id }">
      <input
        :id="id"
        ref="inputEl"
        v-model="model"
        class="ui-text-field"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxlength"
        :autocomplete="autocomplete"
        :list="list"
        @keydown.enter="emit('enter')"
      >
    </template>
  </UiField>
</template>

<style scoped>
.ui-text-field {
  font-family: var(--font-ui);
  font-size: var(--fs-1);
  height: auto;
  min-height: 21px;
}
</style>
