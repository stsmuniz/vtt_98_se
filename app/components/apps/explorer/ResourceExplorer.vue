<script setup lang="ts">
/**
 * Pasta no estilo Explorer do Win98 para um recurso (Tokens, Cenários, Cenas,
 * Salas): barra lateral com nuvens e pré-visualização, busca, filtro por tag,
 * exibições Ícones/Lista/Detalhes (preferências salvas por usuário) e menu de
 * contexto nos itens. A área vazia não tem menu de contexto.
 *
 * Modos:
 *   browse — pasta normal (abrir, editar, duplicar, renomear, excluir…)
 *   pick   — seletor: "Abrir" vira "Selecionar" e emite `pick` com o registro
 * `embedded` desliga menus/atalhos de janela (uso dentro de outra janela).
 */
import type { MenuDef, MenuItemDef } from '~/utils/menu'
import { iconUrl } from '~/utils/icons'
import { formatDateTime, matchesSearch, toDate, type ListViewColumn, type ListViewItemId, type ListViewMode, type ListViewSort } from '~/utils/listView'
import { RESOURCES, toExplorerItem, type ExplorerItem, type ResourceKind, type ResourceRecord } from '~/desktop/resources'
import type { ExplorerColumn } from '~~/lib/preferences'
import { usePreferences } from '~~/composables/usePreferences'
import { useResourceActions, useResourceList } from '~~/composables/useResourceActions'
import { useWindow } from '~~/composables/useWindow'
import { useDesktop } from '~~/composables/useDesktop'

const props = withDefaults(defineProps<{
  resource: ResourceKind
  mode?: 'browse' | 'pick'
  embedded?: boolean
  confirmLabel?: string
}>(), {
  mode: 'browse',
  embedded: false,
  confirmLabel: 'Selecionar',
})

const emit = defineEmits<{ pick: [raw: ResourceRecord]; cancel: [] }>()

const desc = computed(() => RESOURCES[props.resource])
const actions = useResourceActions(props.resource)
const desktop = useDesktop()
const prefs = usePreferences()
const { data: records, status } = await useResourceList(props.resource)
await prefs.load()

const isPick = computed(() => props.mode === 'pick')
const win = props.embedded ? null : useWindow()

// ---------- itens, busca e filtro ----------
const search = ref('')
const tagFilter = ref('')
const selected = ref<ListViewItemId | null>(null)

const items = computed<ExplorerItem[]>(() => (records.value ?? []).map(r => toExplorerItem(desc.value, r)))
const allTags = computed(() => [...new Set(items.value.flatMap(i => i.tags))].sort((a, b) => a.localeCompare(b, 'pt-BR')))
const visibleItems = computed(() => items.value.filter(i =>
  (!tagFilter.value || i.tags.includes(tagFilter.value))
  && (matchesSearch(i.name, search.value) || i.tags.some(t => matchesSearch(t, search.value)))))
const selectedItem = computed(() => items.value.find(i => i.id === selected.value) ?? null)

// Se o item selecionado sumir (excluído ou filtrado), limpa a seleção.
watch(visibleItems, (list) => {
  if (selected.value !== null && !list.some(i => i.id === selected.value)) selected.value = null
})

// ---------- preferências de exibição ----------
const explorerPrefs = computed(() => prefs.preferences.value.explorer[props.resource])
const view = computed<ListViewMode>({
  get: () => explorerPrefs.value.view,
  set: v => prefs.update({ explorer: { [props.resource]: { view: v } } }),
})
const sort = computed<ListViewSort | null>({
  get: () => explorerPrefs.value.sort,
  set: v => { if (v) prefs.update({ explorer: { [props.resource]: { sort: { key: v.key as ExplorerColumn, dir: v.dir } } } }) },
})
const columnOrder = computed<string[] | undefined>({
  get: () => explorerPrefs.value.columns,
  set: v => { if (v) prefs.update({ explorer: { [props.resource]: { columns: v as ExplorerColumn[] } } }) },
})

const columns: ListViewColumn[] = [
  { key: 'name', label: 'Nome', width: 240 },
  { key: 'createdAt', label: 'Data de criação', width: 150, value: it => toDate(it.createdAt), format: it => formatDateTime(it.createdAt) },
  { key: 'tags', label: 'Tags', width: 200, value: it => (it.tags as string[]).join(', ') },
]

function setSortKey(key: ExplorerColumn) {
  sort.value = { key, dir: sort.value?.key === key && sort.value.dir === 'asc' ? 'desc' : 'asc' }
}

// ---------- ações ----------
const listView = ref<{ startRename: (id: ListViewItemId) => void; focus: () => void } | null>(null)

function asItem(item: unknown) {
  return item as ExplorerItem
}

function activate(item: ExplorerItem) {
  if (isPick.value) emit('pick', item.raw)
  else actions.openDefault(item.raw)
}

function confirmPick() {
  if (selectedItem.value) emit('pick', selectedItem.value.raw)
}

function startRename(item: ExplorerItem | null) {
  if (item && !isPick.value) listView.value?.startRename(item.id)
}

// ---------- menu de contexto (só nos itens) ----------
const ctx = reactive({ open: false, x: 0, y: 0, viaKeyboard: false, item: null as ExplorerItem | null })

const ctxItems = computed<MenuItemDef[]>(() => {
  const item = ctx.item
  if (!item) return []
  if (isPick.value) {
    return [
      { id: 'ctx-selecionar', label: `&${props.confirmLabel.replace(/^&/, '')}`, default: true, action: () => emit('pick', item.raw) },
      { type: 'separator' },
      { id: 'ctx-propriedades', label: 'P&ropriedades', action: () => actions.openProperties(item.raw) },
    ]
  }
  const list: MenuItemDef[] = [
    { id: 'ctx-abrir', label: desc.value.defaultVerbLabel, default: true, action: () => actions.openDefault(item.raw) },
  ]
  if (props.resource === 'rooms') {
    list.push(
      { id: 'ctx-nova-aba', label: 'Abrir em nova &aba', action: () => window.open(actions.roomUrl(item.raw), '_blank', 'noopener') },
      { id: 'ctx-copiar-link', label: '&Copiar link', icon: 'link', action: () => actions.copyRoomLink(item.raw) },
    )
  }
  if (desc.value.defaultVerb !== 'edit') {
    list.push({ id: 'ctx-editar', label: '&Editar…', icon: 'edit', action: () => actions.openEdit(item.raw) })
  }
  list.push({ type: 'separator' })
  if (actions.canDuplicate) list.push({ id: 'ctx-duplicar', label: '&Duplicar', icon: 'copy', action: () => actions.duplicate(item.raw) })
  list.push(
    { id: 'ctx-renomear', label: 'Re&nomear', shortcut: 'F2', action: () => startRename(item) },
    { id: 'ctx-excluir', label: 'E&xcluir', icon: 'delete', shortcut: 'Del', action: () => actions.remove(item.raw) },
    { type: 'separator' },
    { id: 'ctx-propriedades', label: 'P&ropriedades', icon: 'properties', shortcut: 'Alt+Enter', action: () => actions.openProperties(item.raw) },
  )
  return list
})

function onContext(payload: { item: unknown; x: number; y: number; viaKeyboard: boolean }) {
  Object.assign(ctx, { ...payload, item: asItem(payload.item), open: true })
}

// ---------- menus e atalhos da janela ----------
const menus = computed<MenuDef[]>(() => {
  const sel = selectedItem.value
  const none = !sel
  const viewItems: MenuItemDef[] = [
    { id: 'ver-icones', type: 'radio', label: 'Í&cones', checked: view.value === 'icons', action: () => { view.value = 'icons' } },
    { id: 'ver-lista', type: 'radio', label: '&Lista', checked: view.value === 'list', action: () => { view.value = 'list' } },
    { id: 'ver-detalhes', type: 'radio', label: '&Detalhes', checked: view.value === 'details', action: () => { view.value = 'details' } },
    { type: 'separator' },
    {
      id: 'organizar',
      label: '&Organizar ícones',
      items: [
        { id: 'org-nome', type: 'radio', label: 'Por &nome', checked: sort.value?.key === 'name', action: () => setSortKey('name') },
        { id: 'org-data', type: 'radio', label: 'Por &data', checked: sort.value?.key === 'createdAt', action: () => setSortKey('createdAt') },
        { id: 'org-tags', type: 'radio', label: 'Por &tags', checked: sort.value?.key === 'tags', action: () => setSortKey('tags') },
      ],
    },
    { type: 'separator' },
    { id: 'atualizar', label: '&Atualizar', icon: 'refresh', shortcut: 'F5', action: actions.refresh },
  ]
  const help: MenuDef = {
    id: 'ajuda',
    label: 'Aj&uda',
    items: [{ id: 'ajuda-pastas', label: '&Ajuda sobre pastas', icon: 'help', shortcut: 'F1', action: () => desktop.openHelp() }],
  }
  if (isPick.value) {
    return [
      { id: 'arquivo', label: '&Arquivo', items: [
        { id: 'selecionar', label: `&${props.confirmLabel}`, disabled: none, action: confirmPick },
        { type: 'separator' },
        { id: 'cancelar', label: '&Cancelar', action: () => emit('cancel') },
      ] },
      { id: 'exibir', label: 'E&xibir', items: viewItems },
      help,
    ]
  }
  return [
    {
      id: 'arquivo',
      label: '&Arquivo',
      items: [
        { id: 'novo', label: `&Novo ${desc.value.singular}…`, icon: 'new', action: actions.openNew },
        { id: 'abrir', label: desc.value.defaultVerbLabel, disabled: none, default: true, action: () => sel && actions.openDefault(sel.raw) },
        { type: 'separator' },
        { id: 'excluir', label: 'E&xcluir', icon: 'delete', disabled: none, action: () => sel && actions.remove(sel.raw) },
        { id: 'renomear', label: 'Re&nomear', disabled: none, action: () => startRename(sel) },
        { id: 'propriedades', label: 'P&ropriedades', icon: 'properties', disabled: none, action: () => sel && actions.openProperties(sel.raw) },
        { type: 'separator' },
        { id: 'fechar', label: '&Fechar', action: () => win?.close() },
      ],
    },
    {
      id: 'editar',
      label: '&Editar',
      items: [
        { id: 'editar-item', label: '&Editar…', icon: 'edit', disabled: none, action: () => sel && actions.openEdit(sel.raw) },
        ...(actions.canDuplicate ? [{ id: 'duplicar', label: '&Duplicar', icon: 'copy' as const, disabled: none, action: () => sel && actions.duplicate(sel.raw) }] : []),
      ],
    },
    { id: 'exibir', label: 'E&xibir', items: viewItems },
    help,
  ]
})

if (win) {
  win.setMenus(menus.value)
  watch(menus, m => win.setMenus(m))
  win.shortcuts({ f5: () => actions.refresh() })
}

const statusText = computed(() => {
  if (status.value === 'pending' && !items.value.length) return 'Carregando…'
  const n = visibleItems.value.length
  return `${n} objeto(s)${n !== items.value.length ? ` (de ${items.value.length})` : ''}`
})

/** Rótulo curto do verbo padrão para o botão da barra (Abrir / Visualizar / Entrar). */
const openLabel = computed(() => desc.value.defaultVerbLabel.replace('&', '').split(' ')[0] ?? 'Abrir')

const searchId = useId()
const tagId = useId()
</script>

<template>
  <div class="explorer" :class="{ embedded, pick: isPick }">
    <UiToolbar class="explorer-toolbar" :label="`Ferramentas de ${desc.title}`">
      <template v-if="!isPick">
        <UiToolbarButton label="Novo" icon="new" show-label data-test="tb-novo" @click="actions.openNew()" />
        <UiToolbarButton :label="openLabel" icon="open" show-label :disabled="!selectedItem" @click="selectedItem && actions.openDefault(selectedItem.raw)" />
        <UiToolbarButton label="Excluir" icon="delete" show-label :disabled="!selectedItem" data-test="tb-excluir" @click="selectedItem && actions.remove(selectedItem.raw)" />
        <UiToolbarButton label="Propriedades" icon="properties" show-label :disabled="!selectedItem" @click="selectedItem && actions.openProperties(selectedItem.raw)" />
        <UiToolbarSeparator />
      </template>
      <UiToolbarButton label="Ícones" icon="view-icons" :pressed="view === 'icons'" data-test="view-icons" @click="view = 'icons'" />
      <UiToolbarButton label="Lista" icon="view-list" :pressed="view === 'list'" data-test="view-list" @click="view = 'list'" />
      <UiToolbarButton label="Detalhes" icon="view-details" :pressed="view === 'details'" data-test="view-details" @click="view = 'details'" />
      <UiToolbarSeparator />
      <label :for="searchId" class="explorer-label">Procurar:</label>
      <input :id="searchId" v-model="search" type="search" class="explorer-search" data-test="search" placeholder="Nome ou tag">
      <label :for="tagId" class="explorer-label">Tag:</label>
      <select :id="tagId" v-model="tagFilter" class="explorer-tag" data-test="tag-filter">
        <option value="">(todas)</option>
        <option v-for="t in allTags" :key="t" :value="t">{{ t }}</option>
      </select>
    </UiToolbar>

    <div class="explorer-body">
      <aside class="explorer-sidebar" :aria-label="`Sobre ${desc.title}`">
        <div class="sidebar-head">
          <img :src="iconUrl(isPick ? 'folder-open' : 'folder', 48)" alt="" width="48" height="48">
          <h2 class="sidebar-title">{{ desc.title }}</h2>
        </div>
        <div class="sidebar-rainbow" aria-hidden="true" />
        <div v-if="selectedItem" class="sidebar-preview" data-test="preview">
          <div v-if="selectedItem.thumb" class="preview-image">
            <img :src="selectedItem.thumb" :alt="`Imagem de ${selectedItem.name}`">
          </div>
          <p class="preview-name">{{ selectedItem.name }}</p>
          <p class="preview-type">{{ desc.singular.charAt(0).toUpperCase() + desc.singular.slice(1) }}</p>
          <dl class="preview-fields">
            <template v-if="selectedItem.createdAt">
              <dt>Criado em:</dt>
              <dd>{{ formatDateTime(selectedItem.createdAt) }}</dd>
            </template>
            <template v-for="f in desc.previewFields(selectedItem.raw)" :key="f.label">
              <dt>{{ f.label }}:</dt>
              <dd>{{ f.value }}</dd>
            </template>
            <template v-if="selectedItem.tags.length">
              <dt>Tags:</dt>
              <dd>{{ selectedItem.tags.join(', ') }}</dd>
            </template>
          </dl>
        </div>
        <div v-else class="sidebar-info">
          <p>{{ desc.description }}</p>
          <p>{{ isPick ? 'Selecione um item e clique em "' + confirmLabel + '".' : 'Selecione um item para ver sua descrição.' }}</p>
        </div>
      </aside>

      <UiListView
        ref="listView"
        v-model:selected="selected"
        v-model:sort="sort"
        v-model:column-order="columnOrder"
        class="explorer-list"
        data-test="explorer-list"
        :items="visibleItems"
        :columns="columns"
        :view="view"
        :renamable="!isPick"
        :label="desc.title"
        :empty-text="search || tagFilter ? 'Nenhum item corresponde à busca.' : 'Esta pasta está vazia.'"
        @open="activate(asItem($event))"
        @delete="!isPick && actions.remove(asItem($event).raw)"
        @properties="actions.openProperties(asItem($event).raw)"
        @rename="(item, name) => actions.rename(asItem(item).raw, name)"
        @context="onContext"
      />
    </div>

    <div v-if="isPick" class="explorer-pickbar">
      <label class="explorer-label">Nome do objeto:</label>
      <input class="pick-name" type="text" readonly :value="selectedItem?.name ?? ''" data-test="pick-name">
      <button type="button" class="default" :disabled="!selectedItem" data-test="pick-confirm" @click="confirmPick">{{ confirmLabel }}</button>
      <button type="button" data-test="pick-cancel" @click="emit('cancel')">Cancelar</button>
    </div>

    <UiStatusBar class="explorer-status">
      <UiStatusField grow data-test="explorer-count">{{ statusText }}</UiStatusField>
      <UiStatusField grow>{{ selectedItem?.name ?? '' }}</UiStatusField>
    </UiStatusBar>

    <UiContextMenu
      :open="ctx.open"
      :x="ctx.x"
      :y="ctx.y"
      :via-keyboard="ctx.viaKeyboard"
      :items="ctxItems"
      :label="ctx.item?.name"
      @close="ctx.open = false"
    />
  </div>
</template>

<style scoped>
.explorer {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  container-type: inline-size;
}

.explorer-toolbar {
  flex-shrink: 0;
  border-bottom: 1px solid var(--c-shadow);
  box-shadow: 0 1px var(--c-highlight);
}
.explorer-label {
  margin-left: var(--sp-2);
  font: inherit;
}
.explorer-search {
  width: 150px;
  height: auto;
  font: inherit;
}
.explorer-tag {
  height: auto;
  font: inherit;
}

.explorer-body {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  flex: 1 1 auto;
  min-height: 0;
  padding: var(--sp-1);
  gap: 0;
}

/* Barra lateral "Exibir como página da Web" do Explorer do Win98, com nuvens */
.explorer-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  min-height: 0;
  overflow: auto;
  padding: var(--sp-4) var(--sp-3);
  background: var(--c-window) url('/assets/backgrounds/clouds_background.jpg') center top / cover no-repeat;
  box-shadow: var(--bevel-sunken);
  color: var(--c-text);
}
.sidebar-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sp-2);
}
.sidebar-head img {
  image-rendering: pixelated;
}
.sidebar-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-2);
  line-height: 1;
  overflow-wrap: anywhere;
}
.sidebar-rainbow {
  height: 3px;
  flex-shrink: 0;
  background: linear-gradient(90deg, #f00, #f80, #ff0, #0c0, #00f, #808);
}
.sidebar-info p,
.sidebar-preview p {
  margin: 0 0 var(--sp-2);
  text-shadow: 0 0 2px var(--c-window);
}
.preview-image {
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 180px;
  padding: 2px;
  background: repeating-conic-gradient(#e0e0e0 0 25%, var(--c-window) 0 50%) 0 0 / 16px 16px;
  box-shadow: var(--bevel-thin-sunken);
}
.preview-image img {
  max-width: 100%;
  max-height: 176px;
  object-fit: contain;
}
.preview-name {
  font-weight: bold;
  overflow-wrap: anywhere;
}
.preview-type {
  color: var(--c-shadow);
}
.preview-fields {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--sp-1) var(--sp-2);
  margin: 0;
}
.preview-fields dt {
  white-space: nowrap;
}
.preview-fields dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.explorer-list {
  min-width: 0;
}

.explorer-pickbar {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  flex-shrink: 0;
}
.pick-name {
  flex: 1 1 auto;
  min-width: 0;
  height: auto;
  font: inherit;
}
.explorer-pickbar button {
  min-width: 90px;
}

.explorer-status {
  flex-shrink: 0;
}

/* Janela estreita: some a barra lateral (como no Explorer) */
@container (max-width: 560px) {
  .explorer-body {
    grid-template-columns: minmax(0, 1fr);
  }
  .explorer-sidebar {
    display: none;
  }
  .explorer-search {
    width: 100px;
  }
}

.embedded .explorer-sidebar {
  display: none;
}
.embedded .explorer-body {
  grid-template-columns: minmax(0, 1fr);
}
</style>
