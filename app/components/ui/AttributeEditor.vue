<script setup lang="ts">
/**
 * Editor de atributos (nome + valor numérico) de um token: tabela em
 * "Detalhes" + campos para adicionar e botão para remover o selecionado.
 */
import type { ListViewColumn, ListViewItem, ListViewItemId } from '~/utils/listView'

export interface EditableAttribute {
  name: string
  value: number
}

withDefaults(defineProps<{ label?: string; disabled?: boolean }>(), {
  label: 'Atributos',
  disabled: false,
})

const attributes = defineModel<EditableAttribute[]>({ default: () => [] })
const selected = ref<ListViewItemId | null>(null)
const draftName = ref('')
const draftValue = ref<number>(0)
const nameId = useId()

const columns: ListViewColumn[] = [
  { key: 'name', label: 'Nome', width: 180 },
  { key: 'value', label: 'Valor', width: 80, align: 'right' },
]

const items = computed<ListViewItem[]>(() =>
  attributes.value.map((a, i) => ({ id: i, name: a.name, value: a.value, icon: 'properties' })),
)

function add() {
  const name = draftName.value.trim()
  if (!name) return
  attributes.value = [...attributes.value, { name, value: Number(draftValue.value) || 0 }]
  draftName.value = ''
  draftValue.value = 0
}

function remove() {
  if (selected.value === null) return
  attributes.value = attributes.value.filter((_, i) => i !== selected.value)
  selected.value = null
}
</script>

<template>
  <div class="ui-attribute-editor">
    <span class="ui-attribute-editor-label">{{ label }}:</span>
    <UiListView
      v-model:selected="selected"
      class="ui-attribute-list"
      :items="items"
      :columns="columns"
      view="details"
      :label="label"
      empty-text="Nenhum atributo."
      @delete="remove"
    />
    <div class="ui-attribute-editor-row">
      <label :for="nameId" class="visually-hidden">Nome do atributo</label>
      <input :id="nameId" v-model="draftName" type="text" placeholder="Nome do atributo" maxlength="40" :disabled="disabled" @keydown.enter.prevent="add">
      <input v-model.number="draftValue" type="number" aria-label="Valor do atributo" class="value" :disabled="disabled" @keydown.enter.prevent="add">
      <button type="button" :disabled="disabled || !draftName.trim()" @click="add">Adicionar</button>
      <button type="button" :disabled="disabled || selected === null" @click="remove">Remover</button>
    </div>
  </div>
</template>

<style scoped>
.ui-attribute-editor {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  font-family: var(--font-ui);
  font-size: var(--fs-1);
}
.ui-attribute-list {
  min-height: 90px;
  max-height: 160px;
}
.ui-attribute-editor-row {
  display: flex;
  gap: var(--sp-2);
}
.ui-attribute-editor-row input {
  flex: 1 1 auto;
  min-width: 0;
  font-family: var(--font-ui);
  font-size: var(--fs-1);
  height: auto;
}
.ui-attribute-editor-row input.value {
  flex: 0 0 70px;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
