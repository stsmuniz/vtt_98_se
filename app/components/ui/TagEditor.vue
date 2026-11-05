<script setup lang="ts">
/**
 * Editor de tags: lista afundada + campo para adicionar (Enter ou botão) e
 * botão para remover a selecionada. Ignora tags vazias e repetidas (sem
 * diferenciar maiúsculas/acentos).
 */
import { normalizeKey } from '~/utils/menu'

const props = withDefaults(defineProps<{
  suggestions?: string[]
  label?: string
  disabled?: boolean
}>(), {
  suggestions: () => [],
  label: 'Tags',
  disabled: false,
})

const tags = defineModel<string[]>({ default: () => [] })
const draft = ref('')
const selectedIndex = ref(-1)
const inputId = useId()
const listId = useId()

const availableSuggestions = computed(() => {
  const used = new Set(tags.value.map(normalizeKey))
  return props.suggestions.filter(s => !used.has(normalizeKey(s)))
})

function add() {
  const tag = draft.value.trim()
  if (!tag) return
  if (!tags.value.some(t => normalizeKey(t) === normalizeKey(tag))) {
    tags.value = [...tags.value, tag]
  }
  draft.value = ''
}

function remove() {
  if (selectedIndex.value < 0) return
  tags.value = tags.value.filter((_, i) => i !== selectedIndex.value)
  selectedIndex.value = Math.min(selectedIndex.value, tags.value.length - 1)
}

function onListKey(event: KeyboardEvent) {
  if (event.key === 'Delete') remove()
  else if (event.key === 'ArrowDown') selectedIndex.value = Math.min(tags.value.length - 1, selectedIndex.value + 1)
  else if (event.key === 'ArrowUp') selectedIndex.value = Math.max(0, selectedIndex.value - 1)
  else return
  event.preventDefault()
}
</script>

<template>
  <div class="ui-tag-editor">
    <label :for="inputId" class="ui-tag-editor-label">{{ label }}:</label>
    <ul
      class="ui-tag-list"
      role="listbox"
      :aria-label="label"
      tabindex="0"
      @keydown="onListKey"
    >
      <li
        v-for="(tag, i) in tags"
        :key="tag"
        role="option"
        :aria-selected="selectedIndex === i"
        :class="{ selected: selectedIndex === i }"
        @pointerdown="selectedIndex = i"
      >
        {{ tag }}
      </li>
      <li v-if="!tags.length" class="empty" aria-disabled="true">Nenhuma tag.</li>
    </ul>
    <div class="ui-tag-editor-row">
      <input
        :id="inputId"
        v-model="draft"
        type="text"
        :list="availableSuggestions.length ? listId : undefined"
        :disabled="disabled"
        placeholder="nova-tag"
        maxlength="40"
        @keydown.enter.prevent="add"
      >
      <datalist v-if="availableSuggestions.length" :id="listId">
        <option v-for="s in availableSuggestions" :key="s" :value="s" />
      </datalist>
      <button type="button" :disabled="disabled || !draft.trim()" @click="add">Adicionar</button>
      <button type="button" :disabled="disabled || selectedIndex < 0" @click="remove">Remover</button>
    </div>
  </div>
</template>

<style scoped>
.ui-tag-editor {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  font-family: var(--font-ui);
  font-size: var(--fs-1);
}
.ui-tag-list {
  margin: 0;
  padding: 2px;
  list-style: none;
  min-height: 64px;
  max-height: 120px;
  overflow: auto;
  background: var(--c-window);
  box-shadow: var(--bevel-sunken);
  outline: none;
}
.ui-tag-list li {
  padding: 0 var(--sp-2);
  cursor: default;
}
.ui-tag-list li.selected {
  background: var(--c-surface);
}
.ui-tag-list:focus li.selected {
  background: var(--c-selection);
  color: var(--c-selection-text);
}
.ui-tag-list li.empty {
  color: var(--c-text-disabled);
}
.ui-tag-editor-row {
  display: flex;
  gap: var(--sp-2);
}
.ui-tag-editor-row input {
  flex: 1 1 auto;
  min-width: 0;
  font-family: var(--font-ui);
  font-size: var(--fs-1);
  height: auto;
}
</style>
