<script setup lang="ts">
/**
 * Lista de itens de um menu (suspenso, de contexto ou submenu).
 *
 * Teclado (com o menu focado):
 *   ↑/↓ percorrem os itens habilitados · Enter/Espaço acionam · → abre submenu
 *   ← fecha o submenu (ou troca de menu na barra) · Esc fecha · letra = mnemônico.
 * Mouse: passar o mouse sobre um item com submenu abre o submenu após 300 ms.
 *
 * Eventos:
 *   close    — um item foi acionado ou Esc no menu raiz: feche toda a cadeia.
 *   back     — Esc/← num submenu: só ele fecha e o foco volta ao pai.
 *   navigate — ←/→ "vazando" do menu: a barra de menus troca para o vizinho.
 */
import { toValue } from 'vue'
import { iconUrl } from '~/utils/icons'
import {
  isItemDisabled, isSelectable, normalizeKey, parseMenuLabel, resolveItems, type MenuItemDef,
} from '~/utils/menu'

defineOptions({ name: 'UiMenu' })

const props = withDefaults(defineProps<{
  items: MenuItemDef[]
  /** Item destacado ao abrir (-1 = nenhum; abrir pelo teclado usa 0). */
  initialIndex?: number
  isSubmenu?: boolean
  /** Rótulo acessível do menu. */
  label?: string
  /** Itens altos com ícones de 32px (primeiro nível do menu Iniciar). */
  large?: boolean
}>(), {
  initialIndex: -1,
  isSubmenu: false,
  label: undefined,
  large: false,
})

const emit = defineEmits<{
  close: []
  back: []
  navigate: [direction: -1 | 1]
}>()

const SUBMENU_DELAY = 300

const listEl = ref<HTMLElement | null>(null)
const itemEls = ref<(HTMLElement | null)[]>([])
const activeIndex = ref(-1)
const openSubIndex = ref(-1)
const subInitialIndex = ref(-1)
let hoverTimer: ReturnType<typeof setTimeout> | null = null

const parsed = computed(() => props.items.map(i => parseMenuLabel(i.label)))
const selectableIndexes = computed(() => props.items.map((it, i) => (isSelectable(it) ? i : -1)).filter(i => i >= 0))
const hasIconColumn = computed(() => props.items.some(i => i.icon || i.type === 'check' || i.type === 'radio'))

function firstSelectable() {
  return selectableIndexes.value[0] ?? -1
}

onMounted(() => {
  activeIndex.value = props.initialIndex >= 0 ? firstSelectable() : -1
  listEl.value?.focus({ preventScroll: true })
})

onBeforeUnmount(clearHoverTimer)

function clearHoverTimer() {
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverTimer = null
}

function hasSubmenu(item: MenuItemDef) {
  return item.items !== undefined && item.type !== 'separator'
}

function openSubmenu(index: number, viaKeyboard: boolean) {
  clearHoverTimer()
  subInitialIndex.value = viaKeyboard ? 0 : -1
  openSubIndex.value = index
}

function closeSubmenu(refocus = true) {
  openSubIndex.value = -1
  if (refocus) nextTick(() => listEl.value?.focus({ preventScroll: true }))
}

function activate(index: number, viaKeyboard = false) {
  const item = props.items[index]
  if (!item || !isSelectable(item)) return
  if (hasSubmenu(item)) {
    openSubmenu(index, viaKeyboard)
    return
  }
  emit('close')
  // Executa depois de fechar, para que diálogos abertos pela ação recebam o foco.
  nextTick(() => item.action?.())
}

function move(delta: 1 | -1) {
  const list = selectableIndexes.value
  if (!list.length) return
  const pos = list.indexOf(activeIndex.value)
  const next = pos === -1 ? (delta === 1 ? 0 : list.length - 1) : (pos + delta + list.length) % list.length
  activeIndex.value = list[next]!
}

function onKeyDown(event: KeyboardEvent) {
  // Teclas digitadas dentro de um submenu aberto são tratadas por ele.
  if (event.target !== listEl.value) return
  const item = props.items[activeIndex.value]
  switch (event.key) {
    case 'ArrowDown':
      move(1)
      break
    case 'ArrowUp':
      move(-1)
      break
    case 'Home':
      activeIndex.value = firstSelectable()
      break
    case 'End':
      activeIndex.value = selectableIndexes.value.at(-1) ?? -1
      break
    case 'ArrowRight':
      if (item && hasSubmenu(item) && isSelectable(item)) openSubmenu(activeIndex.value, true)
      else emit('navigate', 1)
      break
    case 'ArrowLeft':
      if (props.isSubmenu) emit('back')
      else emit('navigate', -1)
      break
    case 'Enter':
    case ' ':
      if (activeIndex.value >= 0) activate(activeIndex.value, true)
      break
    case 'Escape':
      if (props.isSubmenu) emit('back')
      else emit('close')
      break
    case 'Tab':
      emit('close')
      break
    default: {
      if (event.key.length !== 1 || event.ctrlKey || event.metaKey) return
      const key = normalizeKey(event.key)
      const matches = props.items
        .map((it, i) => (isSelectable(it) && parsed.value[i]!.accessKey === key ? i : -1))
        .filter(i => i >= 0)
      if (!matches.length) return
      if (matches.length === 1) {
        activeIndex.value = matches[0]!
        activate(matches[0]!, true)
      } else {
        const after = matches.find(i => i > activeIndex.value)
        activeIndex.value = after ?? matches[0]!
      }
    }
  }
  event.preventDefault()
  event.stopPropagation()
}

function onItemEnter(index: number) {
  const item = props.items[index]!
  if (item.type === 'separator') return
  activeIndex.value = index
  clearHoverTimer()
  if (openSubIndex.value === index) return
  hoverTimer = setTimeout(() => {
    if (hasSubmenu(item) && isSelectable(item)) openSubmenu(index, false)
    else if (openSubIndex.value !== -1) closeSubmenu()
  }, SUBMENU_DELAY)
}

function onItemClick(index: number) {
  activate(index, false)
}

function onSubBack() {
  closeSubmenu()
}

function onSubNavigate(direction: -1 | 1) {
  // ← dentro de um submenu já é tratado como "back"; só → chega aqui e sobe até a barra.
  closeSubmenu(false)
  emit('navigate', direction)
}

function roleOf(item: MenuItemDef) {
  if (item.type === 'separator') return 'separator'
  if (item.type === 'check') return 'menuitemcheckbox'
  if (item.type === 'radio') return 'menuitemradio'
  return 'menuitem'
}

const menuId = useId()
const activeId = computed(() => (activeIndex.value >= 0 ? `${menuId}-${activeIndex.value}` : undefined))

defineExpose({ focus: () => listEl.value?.focus({ preventScroll: true }) })
</script>

<template>
  <ul
    ref="listEl"
    class="ui-menu"
    :class="{ 'has-icons': hasIconColumn, large }"
    role="menu"
    tabindex="-1"
    :aria-label="label"
    :aria-activedescendant="activeId"
    @keydown="onKeyDown"
  >
    <template v-for="(item, i) in items" :key="item.id ?? i">
      <li v-if="item.type === 'separator'" class="ui-menu-separator" role="separator" />
      <li
        v-else
        :id="`${menuId}-${i}`"
        :ref="(el) => { itemEls[i] = el as HTMLElement | null }"
        class="ui-menu-item"
        :class="{
          active: activeIndex === i,
          disabled: isItemDisabled(item),
          default: item.default,
          'submenu-open': openSubIndex === i,
        }"
        :role="roleOf(item)"
        :aria-disabled="isItemDisabled(item) || undefined"
        :aria-checked="item.type === 'check' || item.type === 'radio' ? Boolean(toValue(item.checked)) : undefined"
        :aria-haspopup="hasSubmenu(item) ? 'menu' : undefined"
        :aria-expanded="hasSubmenu(item) ? openSubIndex === i : undefined"
        @pointerenter="onItemEnter(i)"
        @click.stop="onItemClick(i)"
      >
        <span v-if="hasIconColumn" class="ui-menu-icon" aria-hidden="true">
          <span v-if="item.type === 'check' && toValue(item.checked)" class="mark-check" />
          <span v-else-if="item.type === 'radio' && toValue(item.checked)" class="mark-radio" />
          <img v-else-if="item.icon" :src="iconUrl(item.icon, large ? 32 : 16)" alt="" :width="large ? 32 : 16" :height="large ? 32 : 16">
        </span>
        <span class="ui-menu-label">{{ parsed[i]!.before }}<u v-if="parsed[i]!.key">{{ parsed[i]!.key }}</u>{{ parsed[i]!.after }}</span>
        <span v-if="item.shortcut" class="ui-menu-shortcut">{{ item.shortcut }}</span>
        <span v-if="hasSubmenu(item)" class="ui-menu-arrow" aria-hidden="true" />

        <UiPopup
          v-if="hasSubmenu(item)"
          :open="openSubIndex === i"
          :anchor="itemEls[i]"
          placement="right-start"
          :close-on-outside="false"
          :close-on-escape="false"
        >
          <UiMenu
            :items="resolveItems(item.items)"
            :initial-index="subInitialIndex"
            :label="parsed[i]!.text"
            is-submenu
            @close="emit('close')"
            @back="onSubBack"
            @navigate="onSubNavigate"
          />
        </UiPopup>
      </li>
    </template>
  </ul>
</template>

<style scoped>
.ui-menu {
  margin: 0;
  padding: 2px;
  list-style: none;
  min-width: 150px;
  background: var(--c-surface);
  box-shadow: var(--bevel-raised);
  font-family: var(--font-ui);
  font-size: var(--fs-1);
  color: var(--c-text);
  outline: none;
  user-select: none;
  white-space: nowrap;
}

.ui-menu-item {
  display: grid;
  grid-template-columns: 0 1fr auto 12px;
  align-items: center;
  gap: var(--sp-3);
  padding: 2px var(--sp-2) 2px var(--sp-4);
  cursor: default;
}
.has-icons .ui-menu-item {
  grid-template-columns: 18px 1fr auto 12px;
  padding-left: var(--sp-2);
}

.ui-menu-item.active,
.ui-menu-item.submenu-open {
  background: var(--c-selection);
  color: var(--c-selection-text);
}

.ui-menu-item.default .ui-menu-label {
  font-weight: bold;
}

/* Texto desabilitado com relevo, como no Win98 */
.ui-menu-item.disabled {
  color: var(--c-text-disabled);
  text-shadow: 1px 1px 0 var(--c-highlight);
}
.ui-menu-item.disabled.active {
  background: transparent;
}

.ui-menu-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}
.ui-menu-icon img {
  image-rendering: pixelated;
}

.ui-menu-shortcut {
  padding-left: var(--sp-4);
}

.ui-menu-arrow {
  justify-self: end;
  width: 0;
  height: 0;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 4px solid currentColor;
}

.mark-check {
  width: 7px;
  height: 7px;
  background: url("data:image/svg+xml;charset=utf-8,%3Csvg width='7' height='7' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23000' d='M6 0h1v3H6zM5 1h1v3H5zM0 2h1v3H0zM1 3h1v3H1zM2 4h1v3H2zM3 3h1v3H3zM4 2h1v3H4z'/%3E%3C/svg%3E") no-repeat;
}
.active .mark-check,
.submenu-open .mark-check {
  filter: invert(1);
}
.ui-menu.large .ui-menu-item {
  grid-template-columns: 36px 1fr auto 12px;
  min-height: 40px;
  padding: 2px var(--sp-2) 2px var(--sp-1);
}
.ui-menu.large .ui-menu-icon {
  width: 32px;
  height: 32px;
}

.mark-radio {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.ui-menu-separator {
  height: 0;
  margin: 3px 1px;
  border-top: 1px solid var(--c-shadow);
  border-bottom: 1px solid var(--c-highlight);
}
</style>
