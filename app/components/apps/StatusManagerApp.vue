<script setup lang="ts">
/** Applet "Status" do Painel de Controle: catálogo de status (padrões + personalizados). */
import type { ListViewColumn, ListViewItem } from '~/utils/listView'
import type { MenuDef } from '~/utils/menu'
import { useDesktop } from '~~/composables/useDesktop'
import { useDialog } from '~~/composables/useDialog'
import { useStatuses, type CatalogStatus } from '~~/composables/useStatuses'
import { useWindow } from '~~/composables/useWindow'

const win = useWindow()
const desktop = useDesktop()
const dialog = useDialog()
const { catalog, pending, remove } = useStatuses()

type StatusItem = ListViewItem & { status: CatalogStatus }

const items = computed<StatusItem[]>(() => catalog.value.map(s => ({ id: s.id, name: s.name, icon: 'warning' as const, status: s })))
const columns: ListViewColumn<StatusItem>[] = [
  { key: 'name', label: 'Nome', width: 200 },
  { key: 'color', label: 'Cor', width: 120, value: i => i.status.color },
  { key: 'origin', label: 'Origem', width: 120, value: i => (i.status.origin === 'default' ? 'Padrão' : 'Personalizado') },
]

const view = ref<'icons' | 'list' | 'details'>('details')
const selected = ref<string | number | null>(null)
const sort = ref<{ key: string; dir: 'asc' | 'desc' } | null>({ key: 'name', dir: 'asc' })
const selectedItem = computed(() => items.value.find(i => i.id === selected.value) ?? null)
const isCustom = computed(() => selectedItem.value?.status.origin === 'custom')

function openNew() {
  desktop.openApp('status-form', {}, { title: 'Novo status' })
}

function openEdit(item: StatusItem | null = selectedItem.value) {
  const s = item?.status
  if (!s || s.origin !== 'custom') return
  desktop.openApp('status-form', { rowId: s.rowId, name: s.name, color: s.color }, { title: `Editar status: ${s.name}` })
}

async function removeSelected(item: StatusItem | null = selectedItem.value) {
  const s = item?.status
  if (!s || s.origin !== 'custom' || !s.rowId) return
  const ok = await dialog.confirm(
    `Tem certeza de que deseja excluir o status "${s.name}"?\nTokens de salas que já o usam continuam mostrando o status.`,
    { title: 'Excluir status', icon: 'warning' },
  )
  if (!ok) return
  try {
    await remove(s.rowId)
    selected.value = null
  } catch (error) {
    await dialog.alert((error as Error).message, { title: 'Erro', icon: 'error' })
  }
}

function onOpen(item: ListViewItem) {
  const s = (item as StatusItem).status
  if (s.origin === 'custom') openEdit(item as StatusItem)
}

const menus = computed<MenuDef[]>(() => [
  {
    id: 'arquivo',
    label: '&Arquivo',
    items: [
      { id: 'novo', label: '&Novo status…', icon: 'new', action: openNew },
      { id: 'editar', label: '&Editar…', icon: 'edit', disabled: !isCustom.value, action: () => openEdit() },
      { id: 'excluir', label: 'E&xcluir', icon: 'delete', disabled: !isCustom.value, action: () => removeSelected() },
      { type: 'separator' },
      { id: 'fechar', label: '&Fechar', action: () => win.close() },
    ],
  },
  {
    id: 'exibir',
    label: 'E&xibir',
    items: [
      { id: 'ver-icones', type: 'radio', label: 'Í&cones', checked: view.value === 'icons', action: () => { view.value = 'icons' } },
      { id: 'ver-lista', type: 'radio', label: '&Lista', checked: view.value === 'list', action: () => { view.value = 'list' } },
      { id: 'ver-detalhes', type: 'radio', label: '&Detalhes', checked: view.value === 'details', action: () => { view.value = 'details' } },
    ],
  },
  {
    id: 'ajuda',
    label: 'Aj&uda',
    items: [{ id: 'ajuda-status', label: '&Ajuda sobre status', icon: 'help', shortcut: 'F1', action: () => desktop.openHelp() }],
  },
])
win.setMenus(menus.value)
watch(menus, m => win.setMenus(m))

const statusText = computed(() => (pending.value && !items.value.length ? 'Carregando…' : `${items.value.length} objeto(s)`))
</script>

<template>
  <div class="status-manager">
    <UiToolbar label="Ferramentas de Status">
      <UiToolbarButton label="Novo" icon="new" show-label data-test="status-novo" @click="openNew" />
      <UiToolbarButton label="Editar" icon="edit" show-label :disabled="!isCustom" data-test="status-editar" @click="openEdit()" />
      <UiToolbarButton label="Excluir" icon="delete" show-label :disabled="!isCustom" data-test="status-excluir" @click="removeSelected()" />
      <UiToolbarSeparator />
      <UiToolbarButton label="Ícones" icon="view-icons" :pressed="view === 'icons'" @click="view = 'icons'" />
      <UiToolbarButton label="Lista" icon="view-list" :pressed="view === 'list'" @click="view = 'list'" />
      <UiToolbarButton label="Detalhes" icon="view-details" :pressed="view === 'details'" @click="view = 'details'" />
    </UiToolbar>

    <UiListView
      v-model:selected="selected"
      v-model:sort="sort"
      class="status-list"
      data-test="status-list"
      :items="items"
      :columns="columns"
      :view="view"
      label="Status"
      empty-text="Nenhum status."
      @open="onOpen"
      @delete="removeSelected($event as StatusItem)"
    >
      <template #cell-color="{ item }">
        <span class="swatch" :style="{ background: (item as StatusItem).status.color }" aria-hidden="true" />
        <span class="ui-lv-cell-text">{{ (item as StatusItem).status.color }}</span>
      </template>
    </UiListView>

    <UiStatusBar>
      <UiStatusField grow>{{ statusText }}</UiStatusField>
      <UiStatusField grow>{{ selectedItem ? (isCustom ? 'Personalizado' : 'Padrão (somente leitura)') : '' }}</UiStatusField>
    </UiStatusBar>
  </div>
</template>

<style scoped>
.status-manager {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}
.status-list {
  flex: 1 1 auto;
  min-height: 0;
  box-shadow: var(--bevel-sunken);
}
.swatch {
  display: inline-block;
  width: 16px;
  height: 12px;
  margin-right: var(--sp-2);
  box-shadow: 0 0 0 1px #000;
  vertical-align: middle;
}
</style>
