<script setup lang="ts">
/**
 * Lista de itens no estilo do Explorer do Win98, com três exibições:
 *   icons   — grade de ícones 32×32 com rótulo embaixo
 *   list    — ícone 16×16 + nome, em colunas que fluem para a direita
 *   details — tabela com cabeçalhos: clique ordena, arrastar reordena,
 *             arrastar a borda direita redimensiona
 *
 * Seleção única (v-model:selected). Teclado com o foco na lista:
 *   setas (respeitam o layout de cada exibição) · Home/End · PageUp/PageDown
 *   Enter = abrir · Alt+Enter = propriedades · Delete = excluir · F2 = renomear
 *   Shift+F10 ou tecla Menu = menu de contexto · letras = ir para o item.
 *
 * Só emite eventos: quem usa decide o que "abrir", "excluir" etc. fazem.
 * Não há menu de contexto na área vazia (de propósito).
 */
import { iconUrl } from '~/utils/icons'
import { normalizeKey } from '~/utils/menu'
import {
  columnValue, sortListItems,
  type ListViewColumn, type ListViewItem, type ListViewItemId, type ListViewMode, type ListViewSort,
} from '~/utils/listView'

const props = withDefaults(defineProps<{
  items: ListViewItem[]
  columns?: ListViewColumn[]
  view?: ListViewMode
  renamable?: boolean
  emptyText?: string
  label?: string
}>(), {
  columns: () => [{ key: 'name', label: 'Nome' }],
  view: 'icons',
  renamable: false,
  emptyText: 'Esta pasta está vazia.',
  label: 'Itens',
})

const selected = defineModel<ListViewItemId | null>('selected', { default: null })
const sort = defineModel<ListViewSort | null>('sort', { default: null })
const columnOrder = defineModel<string[] | undefined>('columnOrder', { default: undefined })

const emit = defineEmits<{
  open: [item: ListViewItem]
  properties: [item: ListViewItem]
  delete: [item: ListViewItem]
  rename: [item: ListViewItem, name: string]
  context: [payload: { item: ListViewItem; x: number; y: number; viaKeyboard: boolean }]
}>()

const DEFAULT_WIDTH = 160
const NAME_WIDTH = 240
const MIN_WIDTH = 48
const DRAG_THRESHOLD = 4
const TYPEAHEAD_RESET_MS = 700

const rootEl = ref<HTMLElement | null>(null)
const itemEls = new Map<ListViewItemId, HTMLElement>()
const baseId = useId()

// ---------- dados exibidos ----------

const sortedItems = computed(() => sortListItems(props.items, props.columns, sort.value))
const indexById = computed(() => new Map(sortedItems.value.map((it, i) => [it.id, i])))
const selectedIndex = computed(() => (selected.value === null ? -1 : indexById.value.get(selected.value) ?? -1))

const orderedColumns = computed<ListViewColumn[]>(() => {
  const order = columnOrder.value
  if (!order?.length) return props.columns
  const byKey = new Map(props.columns.map(c => [c.key, c]))
  const ordered = order.map(k => byKey.get(k)).filter((c): c is ListViewColumn => Boolean(c))
  // Colunas novas que ainda não estão na ordem salva vão para o fim.
  return [...ordered, ...props.columns.filter(c => !order.includes(c.key))]
})

const widths = reactive<Record<string, number>>({})
function widthOf(col: ListViewColumn) {
  return widths[col.key] ?? col.width ?? (col.key === 'name' ? NAME_WIDTH : DEFAULT_WIDTH)
}
const gridTemplate = computed(() => `${orderedColumns.value.map(c => `${widthOf(c)}px`).join(' ')} minmax(0, 1fr)`)

function cellText(col: ListViewColumn, item: ListViewItem) {
  if (col.format) return col.format(item)
  const v = columnValue(col, item, col.key)
  return v === null || v === undefined ? '' : String(v)
}

function itemIcon(item: ListViewItem, size: 16 | 32) {
  return item.icon ? iconUrl(item.icon, size) : iconUrl('image', size)
}

// ---------- seleção e navegação ----------

function select(id: ListViewItemId | null, scroll = true) {
  selected.value = id
  if (scroll && id !== null) nextTick(() => itemEls.get(id)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }))
}

function selectIndex(i: number) {
  const list = sortedItems.value
  if (!list.length) return
  const clamped = Math.max(0, Math.min(list.length - 1, i))
  select(list[clamped]!.id)
}

/** Quantos itens cabem numa "linha" da grade (ícones) ou numa "coluna" (lista). */
function lineLength(): number {
  const els = sortedItems.value.map(it => itemEls.get(it.id)).filter((e): e is HTMLElement => Boolean(e))
  if (els.length < 2) return 1
  const first = els[0]!
  let n = 1
  if (props.view === 'icons') {
    while (n < els.length && els[n]!.offsetTop === first.offsetTop) n++
  } else {
    while (n < els.length && els[n]!.offsetLeft === first.offsetLeft) n++
  }
  return n
}

function pageSize(): number {
  const root = rootEl.value
  const first = sortedItems.value[0] ? itemEls.get(sortedItems.value[0].id) : undefined
  if (!root || !first || !first.offsetHeight) return 10
  return Math.max(1, Math.floor(root.clientHeight / first.offsetHeight) - 1)
}

let typeahead = ''
let typeaheadTimer: ReturnType<typeof setTimeout> | null = null

function onTypeahead(char: string) {
  if (typeaheadTimer) clearTimeout(typeaheadTimer)
  typeaheadTimer = setTimeout(() => { typeahead = '' }, TYPEAHEAD_RESET_MS)
  const repeated = typeahead.length === 1 && typeahead === normalizeKey(char)
  typeahead = repeated ? typeahead : typeahead + normalizeKey(char)
  const list = sortedItems.value
  const start = repeated || typeahead.length === 1 ? selectedIndex.value + 1 : Math.max(0, selectedIndex.value)
  for (let k = 0; k < list.length; k++) {
    const i = (start + k) % list.length
    if (normalizeKey(list[i]!.name).startsWith(typeahead)) {
      selectIndex(i)
      return
    }
  }
}

function openContextForSelected() {
  const item = sortedItems.value[selectedIndex.value]
  if (!item) return
  const r = (itemEls.get(item.id)?.querySelector('.ui-lv-label') ?? itemEls.get(item.id))?.getBoundingClientRect()
  emit('context', { item, x: r ? r.left + 4 : 0, y: r ? r.bottom : 0, viaKeyboard: true })
}

function onKeyDown(event: KeyboardEvent) {
  if (renamingId.value !== null) return
  const i = selectedIndex.value
  const current = sortedItems.value[i]
  const line = props.view === 'details' ? 1 : lineLength()
  let handled = true

  switch (event.key) {
    case 'ArrowDown':
      if (i === -1) selectIndex(0)
      else selectIndex(props.view === 'icons' ? i + line : i + 1)
      break
    case 'ArrowUp':
      if (i === -1) selectIndex(0)
      else selectIndex(props.view === 'icons' ? i - line : i - 1)
      break
    case 'ArrowRight':
      if (props.view === 'details') { handled = false; break }
      if (i === -1) selectIndex(0)
      else selectIndex(props.view === 'icons' ? i + 1 : i + line)
      break
    case 'ArrowLeft':
      if (props.view === 'details') { handled = false; break }
      if (i === -1) selectIndex(0)
      else selectIndex(props.view === 'icons' ? i - 1 : i - line)
      break
    case 'Home':
      selectIndex(0)
      break
    case 'End':
      selectIndex(sortedItems.value.length - 1)
      break
    case 'PageDown':
      selectIndex(i + pageSize())
      break
    case 'PageUp':
      selectIndex(i - pageSize())
      break
    case 'Enter':
      if (!current) break
      if (event.altKey) emit('properties', current)
      else emit('open', current)
      break
    case 'Delete':
      if (current) emit('delete', current)
      break
    case 'F2':
      if (current && props.renamable) startRename(current)
      break
    case 'ContextMenu':
      openContextForSelected()
      break
    case 'F10':
      if (event.shiftKey) openContextForSelected()
      else handled = false
      break
    default:
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== ' ') {
        onTypeahead(event.key)
      } else {
        handled = false
      }
  }

  if (handled) {
    event.preventDefault()
    event.stopPropagation()
  }
}

// ---------- mouse ----------

function onItemPointerDown(item: ListViewItem, event: PointerEvent) {
  if (event.button === 0 || event.button === 2) select(item.id, false)
}

function onItemContextMenu(item: ListViewItem, event: MouseEvent) {
  select(item.id, false)
  emit('context', { item, x: event.clientX, y: event.clientY, viaKeyboard: false })
}

function onBackgroundPointerDown(event: PointerEvent) {
  if (event.target === event.currentTarget && event.button === 0) selected.value = null
}

// ---------- renomear ----------

const renamingId = ref<ListViewItemId | null>(null)
const renameDraft = ref('')
const renameInput = ref<HTMLInputElement | null>(null)

function startRename(item: ListViewItem) {
  renamingId.value = item.id
  renameDraft.value = item.name
  nextTick(() => {
    const input = Array.isArray(renameInput.value) ? renameInput.value[0] : renameInput.value
    input?.focus()
    input?.select()
  })
}

function finishRename(commit: boolean) {
  const id = renamingId.value
  if (id === null) return
  renamingId.value = null
  const item = props.items.find(it => it.id === id)
  const name = renameDraft.value.trim()
  if (commit && item && name && name !== item.name) emit('rename', item, name)
  nextTick(() => rootEl.value?.focus({ preventScroll: true }))
}

function onRenameKey(event: KeyboardEvent) {
  event.stopPropagation()
  if (event.key === 'Enter') finishRename(true)
  else if (event.key === 'Escape') finishRename(false)
}

// ---------- cabeçalhos: ordenar, reordenar, redimensionar ----------

const headerEl = ref<HTMLElement | null>(null)
const headerCellEls = new Map<string, HTMLElement>()
const drag = reactive({ key: '', active: false, startX: 0, offset: 0, ghostX: 0, insertAt: -1, markerX: 0 })

function toggleSort(key: string) {
  sort.value = sort.value?.key === key
    ? { key, dir: sort.value.dir === 'asc' ? 'desc' : 'asc' }
    : { key, dir: 'asc' }
}

function onHeaderPointerDown(col: ListViewColumn, event: PointerEvent) {
  if (event.button !== 0) return
  const cell = event.currentTarget as HTMLElement
  cell.setPointerCapture(event.pointerId)
  const cellRect = cell.getBoundingClientRect()
  drag.key = col.key
  drag.active = false
  drag.startX = event.clientX
  drag.offset = event.clientX - cellRect.left
  drag.insertAt = -1
}

function onHeaderPointerMove(event: PointerEvent) {
  if (!drag.key) return
  if (!drag.active && Math.abs(event.clientX - drag.startX) < DRAG_THRESHOLD) return
  drag.active = true
  const header = headerEl.value
  if (!header) return
  const hr = header.getBoundingClientRect()
  const zoom = hr.width / header.offsetWidth || 1
  drag.ghostX = (event.clientX - hr.left) / zoom - drag.offset / zoom + header.scrollLeft

  // Ponto de inserção: antes da primeira coluna cujo meio está à direita do ponteiro.
  const cols = orderedColumns.value
  let insertAt = cols.length
  for (let k = 0; k < cols.length; k++) {
    const r = headerCellEls.get(cols[k]!.key)?.getBoundingClientRect()
    if (r && event.clientX < r.left + r.width / 2) { insertAt = k; break }
  }
  drag.insertAt = insertAt
  const ref = insertAt < cols.length
    ? headerCellEls.get(cols[insertAt]!.key)?.getBoundingClientRect().left
    : headerCellEls.get(cols.at(-1)!.key)?.getBoundingClientRect().right
  drag.markerX = ref === undefined ? 0 : (ref - hr.left) / zoom + header.scrollLeft
}

function onHeaderPointerUp(col: ListViewColumn) {
  if (!drag.key) return
  if (drag.active) {
    const keys = orderedColumns.value.map(c => c.key)
    const from = keys.indexOf(drag.key)
    let to = drag.insertAt
    if (from !== -1 && to !== -1 && to !== from && to !== from + 1) {
      keys.splice(from, 1)
      if (to > from) to--
      keys.splice(to, 0, drag.key)
      columnOrder.value = keys
    }
  } else {
    toggleSort(col.key)
  }
  drag.key = ''
  drag.active = false
}

function onHeaderKeyDown(col: ListViewColumn, event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    toggleSort(col.key)
  }
}

let resizing: { key: string; startX: number; startWidth: number; zoom: number } | null = null

function onResizePointerDown(col: ListViewColumn, event: PointerEvent) {
  event.stopPropagation()
  const handle = event.currentTarget as HTMLElement
  handle.setPointerCapture(event.pointerId)
  const cell = headerCellEls.get(col.key)
  const zoom = cell ? cell.getBoundingClientRect().width / cell.offsetWidth || 1 : 1
  resizing = { key: col.key, startX: event.clientX, startWidth: widthOf(col), zoom }
}

function onResizePointerMove(event: PointerEvent) {
  if (!resizing) return
  widths[resizing.key] = Math.max(MIN_WIDTH, Math.round(resizing.startWidth + (event.clientX - resizing.startX) / resizing.zoom))
}

function onResizePointerUp() {
  resizing = null
}

function sortArrow(key: string) {
  if (sort.value?.key !== key) return ''
  return sort.value.dir === 'asc' ? '▲' : '▼'
}

// Refs de função ficam no script: o template do Vue não enxerga globais como HTMLElement.
function setItemEl(id: ListViewItemId, el: unknown) {
  if (el instanceof HTMLElement) itemEls.set(id, el)
  else itemEls.delete(id)
}

function setHeaderEl(key: string, el: unknown) {
  if (el instanceof HTMLElement) headerCellEls.set(key, el)
  else headerCellEls.delete(key)
}

const activeDescendant = computed(() => (selectedIndex.value >= 0 ? `${baseId}-item-${selectedIndex.value}` : undefined))

defineExpose({
  focus: () => rootEl.value?.focus({ preventScroll: true }),
  startRename: (id: ListViewItemId) => {
    const item = props.items.find(it => it.id === id)
    if (item && props.renamable) startRename(item)
  },
})
</script>

<template>
  <div
    ref="rootEl"
    class="ui-listview"
    :class="`view-${view}`"
    role="listbox"
    tabindex="0"
    :aria-label="label"
    :aria-activedescendant="activeDescendant"
    @keydown="onKeyDown"
    @contextmenu.prevent
  >
    <!-- Cabeçalho (só em Detalhes) -->
    <div
      v-if="view === 'details'"
      ref="headerEl"
      class="ui-lv-header"
      role="row"
      :style="{ gridTemplateColumns: gridTemplate }"
    >
      <div
        v-for="col in orderedColumns"
        :key="col.key"
        :ref="(el) => setHeaderEl(col.key, el)"
        class="ui-lv-header-cell"
        :class="{ dragging: drag.active && drag.key === col.key, right: col.align === 'right' }"
        role="columnheader"
        tabindex="-1"
        :aria-sort="sort?.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'"
        :data-column="col.key"
        @pointerdown="onHeaderPointerDown(col, $event)"
        @pointermove="onHeaderPointerMove"
        @pointerup="onHeaderPointerUp(col)"
        @pointercancel="drag.key = ''; drag.active = false"
        @keydown="onHeaderKeyDown(col, $event)"
      >
        <span class="ui-lv-header-label">{{ col.label }}</span>
        <span class="ui-lv-sort" aria-hidden="true">{{ sortArrow(col.key) }}</span>
        <span
          class="ui-lv-resize"
          aria-hidden="true"
          @pointerdown="onResizePointerDown(col, $event)"
          @pointermove="onResizePointerMove"
          @pointerup="onResizePointerUp"
          @pointercancel="onResizePointerUp"
        />
      </div>
      <div class="ui-lv-header-filler" />
      <div v-if="drag.active" class="ui-lv-ghost" :style="{ left: `${drag.ghostX}px`, width: `${widthOf(orderedColumns.find(c => c.key === drag.key)!)}px` }">
        {{ orderedColumns.find(c => c.key === drag.key)?.label }}
      </div>
      <div v-if="drag.active && drag.insertAt >= 0" class="ui-lv-marker" :style="{ left: `${drag.markerX - 1}px` }" />
    </div>

    <div class="ui-lv-body" @pointerdown="onBackgroundPointerDown">
      <p v-if="!sortedItems.length" class="ui-lv-empty">
        <slot name="empty">{{ emptyText }}</slot>
      </p>

      <div
        v-for="(item, i) in sortedItems"
        :id="`${baseId}-item-${i}`"
        :key="item.id"
        :ref="(el) => setItemEl(item.id, el)"
        class="ui-lv-item"
        :class="{ selected: selected === item.id, renaming: renamingId === item.id }"
        role="option"
        :aria-selected="selected === item.id"
        :data-id="item.id"
        :style="view === 'details' ? { gridTemplateColumns: gridTemplate } : undefined"
        @pointerdown="onItemPointerDown(item, $event)"
        @dblclick="emit('open', item)"
        @contextmenu.prevent.stop="onItemContextMenu(item, $event)"
      >
        <template v-if="view === 'details'">
          <div
            v-for="col in orderedColumns"
            :key="col.key"
            class="ui-lv-cell"
            :class="{ 'name-cell': col.key === 'name', right: col.align === 'right' }"
          >
            <template v-if="col.key === 'name'">
              <img class="ui-lv-icon16" :src="itemIcon(item, 16)" alt="" width="16" height="16" draggable="false">
              <input
                v-if="renamingId === item.id"
                ref="renameInput"
                v-model="renameDraft"
                class="ui-lv-rename"
                maxlength="120"
                @keydown="onRenameKey"
                @blur="finishRename(true)"
                @pointerdown.stop
              >
              <span v-else class="ui-lv-label">{{ item.name }}</span>
            </template>
            <span v-else class="ui-lv-cell-text">{{ cellText(col, item) }}</span>
          </div>
        </template>

        <template v-else>
          <span
            class="ui-lv-iconwrap"
            :class="view === 'icons' ? 'size-32' : 'size-16'"
            :style="{ '--icon-url': `url(${itemIcon(item, view === 'icons' ? 32 : 16)})` }"
          >
            <img
              :src="itemIcon(item, view === 'icons' ? 32 : 16)"
              alt=""
              :width="view === 'icons' ? 32 : 16"
              :height="view === 'icons' ? 32 : 16"
              draggable="false"
            >
          </span>
          <input
            v-if="renamingId === item.id"
            ref="renameInput"
            v-model="renameDraft"
            class="ui-lv-rename"
            maxlength="120"
            @keydown="onRenameKey"
            @blur="finishRename(true)"
            @pointerdown.stop
          >
          <span v-else class="ui-lv-label">{{ item.name }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ui-listview {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
  background: var(--c-window);
  box-shadow: var(--bevel-sunken);
  padding: 2px;
  font-family: var(--font-ui);
  font-size: var(--fs-1);
  color: var(--c-text);
  outline: none;
  user-select: none;
}

.ui-lv-body {
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
}

.ui-lv-empty {
  margin: var(--sp-4);
  color: var(--c-text-disabled);
}

/* ---------- Ícones ---------- */
.view-icons .ui-lv-body {
  display: grid;
  grid-template-columns: repeat(auto-fill, var(--icon-cell));
  grid-auto-rows: min-content;
  align-content: start;
  gap: var(--sp-3) var(--sp-2);
  padding: var(--sp-3);
}
.view-icons .ui-lv-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-1);
  width: var(--icon-cell);
  position: relative;
}
.view-icons .ui-lv-label {
  max-width: 100%;
  padding: 0 2px;
  text-align: center;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
/* Selecionado mostra o nome inteiro, por cima dos vizinhos */
.view-icons .ui-lv-item.selected {
  z-index: 1;
}
.view-icons .ui-lv-item.selected .ui-lv-label {
  -webkit-line-clamp: unset;
  overflow: visible;
}

/* ---------- Lista ---------- */
.view-list .ui-lv-body {
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(auto-fill, 20px);
  grid-auto-columns: max-content;
  align-content: start;
  column-gap: var(--sp-5);
  height: 100%;
  padding: var(--sp-1);
}
.view-list .ui-lv-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  height: 20px;
  max-width: 260px;
}
.view-list .ui-lv-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- Detalhes ---------- */
.ui-lv-header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: grid;
  margin: -2px -2px 0;
  background: var(--c-surface);
  min-width: max-content;
}
.ui-lv-header-cell {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: 1px var(--sp-3);
  box-shadow: var(--bevel-raised);
  background: var(--c-surface);
  cursor: default;
  white-space: nowrap;
  overflow: hidden;
  touch-action: none;
}
.ui-lv-header-cell:active {
  box-shadow: var(--bevel-thin-sunken);
}
.ui-lv-header-cell.dragging {
  opacity: 0.5;
}
.ui-lv-header-cell.right {
  justify-content: flex-end;
}
.ui-lv-header-label {
  overflow: hidden;
  text-overflow: ellipsis;
}
.ui-lv-sort {
  font-size: 8px;
}
.ui-lv-resize {
  position: absolute;
  top: 0;
  right: 0;
  width: 6px;
  height: 100%;
  cursor: col-resize;
}
.ui-lv-header-filler {
  box-shadow: var(--bevel-raised);
}
.ui-lv-ghost {
  position: absolute;
  top: 0;
  height: 100%;
  padding: 1px var(--sp-3);
  background: var(--c-shadow);
  color: var(--c-text-inverse);
  opacity: 0.7;
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
}
.ui-lv-marker {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: var(--c-dark-shadow);
  pointer-events: none;
}
.view-details .ui-lv-body {
  min-width: max-content;
}
.view-details .ui-lv-item {
  display: grid;
  align-items: center;
  height: 20px;
}
.ui-lv-cell {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: 0 var(--sp-3);
  min-width: 0;
  white-space: nowrap;
}
.ui-lv-cell.right {
  justify-content: flex-end;
}
.ui-lv-cell-text,
.name-cell .ui-lv-label {
  overflow: hidden;
  text-overflow: ellipsis;
}
.ui-lv-icon16 {
  flex-shrink: 0;
  image-rendering: pixelated;
}

/* ---------- Seleção ---------- */
.ui-lv-iconwrap {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}
.ui-lv-iconwrap img {
  image-rendering: pixelated;
}
/* Ícone selecionado ganha o pontilhado azul do Win98, recortado no formato do ícone */
.ui-lv-item.selected .ui-lv-iconwrap::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: repeating-conic-gradient(var(--c-selection) 0 25%, transparent 0 50%);
  background-size: 2px 2px;
  -webkit-mask: var(--icon-url) center / contain no-repeat;
  mask: var(--icon-url) center / contain no-repeat;
}

.ui-lv-label {
  padding: 0 2px;
}
/* Lista sem foco: seleção cinza; com foco: azul com retângulo pontilhado */
.ui-lv-item.selected .ui-lv-label {
  background: var(--c-surface);
}
.ui-listview:focus .ui-lv-item.selected .ui-lv-label,
.ui-listview:focus-within .ui-lv-item.selected .ui-lv-label {
  background: var(--c-selection);
  color: var(--c-selection-text);
  outline: 1px dotted var(--c-highlight);
  outline-offset: -1px;
}
.view-details .ui-lv-item.selected {
  background: var(--c-surface);
}
.view-details:focus .ui-lv-item.selected {
  background: var(--c-selection);
  color: var(--c-selection-text);
}
.view-details:focus .ui-lv-item.selected .ui-lv-label {
  outline: none;
  background: transparent;
}

.ui-lv-rename {
  min-width: 60px;
  max-width: 100%;
  height: auto;
  padding: 0 2px;
  font: inherit;
  border: 1px solid var(--c-dark-shadow);
  box-shadow: none;
}
.view-icons .ui-lv-rename {
  width: calc(var(--icon-cell) + 10px);
  text-align: center;
}
</style>
