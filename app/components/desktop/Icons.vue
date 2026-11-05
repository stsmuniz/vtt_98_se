<script setup lang="ts">
/**
 * Ícones da área de trabalho, em colunas de cima para baixo como no Win98.
 * Clique seleciona, duplo clique (ou Enter) abre, setas mudam a seleção.
 * Sem menu de contexto (pastas não são criadas nem renomeadas pelo usuário).
 */
import { APPS } from '~/desktop/apps'
import { iconUrl } from '~/utils/icons'
import { useDesktop } from '~~/composables/useDesktop'

const desktop = useDesktop()
const icons = computed(() => APPS.filter(a => a.onDesktop))
const selected = ref<string | null>(null)
const rootEl = ref<HTMLElement | null>(null)
const itemEls = ref<(HTMLElement | null)[]>([])

function select(id: string) {
  selected.value = id
}

function open(id: string) {
  selected.value = id
  desktop.openApp(id)
}

function onKeyDown(event: KeyboardEvent) {
  const list = icons.value
  const i = list.findIndex(a => a.id === selected.value)
  let next = i
  // Os ícones fluem em colunas: ↑/↓ andam dentro da coluna.
  if (event.key === 'ArrowDown') next = Math.min(list.length - 1, i + 1)
  else if (event.key === 'ArrowUp') next = Math.max(0, i - 1)
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = list.length - 1
  else if (event.key === 'Enter' && i >= 0) { open(list[i]!.id); event.preventDefault(); return }
  else return
  event.preventDefault()
  if (next < 0) next = 0
  selected.value = list[next]!.id
  itemEls.value[next]?.focus()
}

function onBackground(event: PointerEvent) {
  if (event.target === event.currentTarget) selected.value = null
}
</script>

<template>
  <div ref="rootEl" class="desktop-icons" role="listbox" aria-label="Área de trabalho" @keydown="onKeyDown" @pointerdown="onBackground" @contextmenu.prevent>
    <button
      v-for="(app, i) in icons"
      :key="app.id"
      :ref="(el) => { itemEls[i] = el as HTMLElement | null }"
      type="button"
      class="desktop-icon"
      :class="{ selected: selected === app.id }"
      role="option"
      :aria-selected="selected === app.id"
      :data-app="app.id"
      @pointerdown="select(app.id)"
      @dblclick="open(app.id)"
    >
      <span class="desktop-icon-img" :style="{ '--icon-url': `url(${iconUrl(app.desktopIcon ?? app.icon, 32)})` }">
        <img :src="iconUrl(app.desktopIcon ?? app.icon, 32)" alt="" width="32" height="32" draggable="false">
      </span>
      <span class="desktop-icon-label">{{ app.title }}</span>
    </button>
  </div>
</template>

<style scoped>
.desktop-icons {
  position: absolute;
  inset: 0;
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(auto-fill, 76px);
  grid-auto-columns: var(--icon-cell);
  align-content: start;
  justify-content: start;
  gap: var(--sp-2) var(--sp-3);
  padding: var(--sp-3);
  user-select: none;
}

.desktop-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-1);
  width: var(--icon-cell);
  min-width: 0;
  min-height: 0;
  padding: var(--sp-1) 0;
  border: none;
  background: transparent;
  box-shadow: none;
  font-family: var(--font-ui);
  font-size: var(--fs-1);
  color: var(--c-text-inverse);
}
.desktop-icon:focus {
  outline: none;
}
.desktop-icon:active {
  box-shadow: none;
  padding: var(--sp-1) 0;
}

.desktop-icon-img {
  position: relative;
  display: inline-flex;
}
.desktop-icon-img img {
  image-rendering: pixelated;
}
.desktop-icon.selected .desktop-icon-img::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: repeating-conic-gradient(var(--c-selection) 0 25%, transparent 0 50%);
  background-size: 2px 2px;
  -webkit-mask: var(--icon-url) center / contain no-repeat;
  mask: var(--icon-url) center / contain no-repeat;
}

.desktop-icon-label {
  max-width: 100%;
  padding: 0 2px;
  text-align: center;
  overflow-wrap: anywhere;
  /* Texto branco legível sobre qualquer papel de parede */
  text-shadow: 1px 1px 0 rgb(0 0 0 / 0.6);
}
.desktop-icon.selected .desktop-icon-label {
  background: var(--c-selection);
  text-shadow: none;
}
.desktop-icon.selected:focus-visible .desktop-icon-label {
  outline: 1px dotted var(--c-highlight);
  outline-offset: -1px;
}
</style>
