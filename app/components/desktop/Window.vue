<script setup lang="ts">
/**
 * Liga uma entrada do gerenciador de janelas (posição, tamanho, z-index, estado)
 * à moldura visual UiWindow: arrastar pela barra de título, redimensionar pelas
 * bordas, focar ao clicar, minimizar/maximizar/fechar, Alt+letra nos menus.
 *
 * O conteúdo recebe o contexto da janela por `useWindow()`.
 */
import { useWindowManager, type Rect } from '~~/composables/useWindowManager'
import { provideWindowContext } from '~~/composables/useWindow'

const props = withDefaults(defineProps<{
  id: string
  /** Renderizar em #wm-layer (padrão). O WindowLayer já está lá e desliga isso. */
  teleport?: boolean
  scrollBody?: boolean
  /** Substitui o "fechar" padrão (ex.: a janela da página navega de volta). */
  closeHandler?: (() => void) | null
}>(), {
  teleport: true,
  scrollBody: true,
  closeHandler: null,
})

const wm = useWindowManager()
const ctx = provideWindowContext(props.id)
const entry = computed(() => wm.get(props.id))
const isActive = computed(() => wm.state.value.activeId === props.id)
const maximized = computed(() => entry.value?.state === 'maximized')

const frameEl = ref<HTMLElement | null>(null)
const uiWindow = ref<{ openMenuByAccessKey: (k: string) => boolean; openFirstMenu: () => void } | null>(null)

const frameStyle = computed(() => {
  const e = entry.value
  if (!e) return {}
  if (e.state === 'maximized') return { zIndex: e.z }
  return { left: `${e.rect.x}px`, top: `${e.rect.y}px`, width: `${e.rect.w}px`, height: `${e.rect.h}px`, zIndex: e.z }
})

// Alt+letra abre o menu da janela; F10 abre o primeiro menu.
wm.setKeyHandler(props.id, (event) => {
  if (event.key === 'F10' && !event.shiftKey && !event.ctrlKey && !event.altKey) {
    if (!ctx.menus.value?.length) return false
    event.preventDefault()
    uiWindow.value?.openFirstMenu()
    return true
  }
  if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.length === 1) {
    const handled = uiWindow.value?.openMenuByAccessKey(event.key) ?? false
    if (handled) event.preventDefault()
    return handled
  }
  return false
})
onBeforeUnmount(() => wm.setKeyHandler(props.id, null))

function zoomOf(el: HTMLElement) {
  return el.getBoundingClientRect().width / el.offsetWidth || 1
}

// ---------- arrastar ----------
function onDragStart(event: PointerEvent) {
  const e = entry.value
  const frame = frameEl.value
  if (!e || !frame || event.button !== 0 || e.state !== 'normal') return
  const zoom = zoomOf(frame)
  const start = { px: event.clientX, py: event.clientY, x: e.rect.x, y: e.rect.y }
  frame.setPointerCapture(event.pointerId)
  const onMove = (ev: PointerEvent) => {
    wm.move(props.id, start.x + (ev.clientX - start.px) / zoom, start.y + (ev.clientY - start.py) / zoom)
  }
  const onUp = () => {
    frame.removeEventListener('pointermove', onMove)
    frame.removeEventListener('pointerup', onUp)
    frame.removeEventListener('pointercancel', onUp)
  }
  frame.addEventListener('pointermove', onMove)
  frame.addEventListener('pointerup', onUp)
  frame.addEventListener('pointercancel', onUp)
}

// ---------- redimensionar ----------
const HANDLES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const
type Dir = (typeof HANDLES)[number]

function onResizeStart(dir: Dir, event: PointerEvent) {
  const e = entry.value
  const frame = frameEl.value
  if (!e || !frame || event.button !== 0) return
  event.stopPropagation()
  const handle = event.currentTarget as HTMLElement
  handle.setPointerCapture(event.pointerId)
  const zoom = zoomOf(frame)
  const start = { px: event.clientX, py: event.clientY, rect: { ...e.rect } }
  const min = e.minSize
  const onMove = (ev: PointerEvent) => {
    const dx = (ev.clientX - start.px) / zoom
    const dy = (ev.clientY - start.py) / zoom
    const r: Rect = { ...start.rect }
    if (dir.includes('e')) r.w = Math.max(min.w, start.rect.w + dx)
    if (dir.includes('s')) r.h = Math.max(min.h, start.rect.h + dy)
    if (dir.includes('w')) {
      r.w = Math.max(min.w, start.rect.w - dx)
      r.x = start.rect.x + (start.rect.w - r.w)
    }
    if (dir.includes('n')) {
      r.h = Math.max(min.h, start.rect.h - dy)
      r.y = start.rect.y + (start.rect.h - r.h)
    }
    wm.resize(props.id, r)
  }
  const onUp = () => {
    handle.removeEventListener('pointermove', onMove)
    handle.removeEventListener('pointerup', onUp)
    handle.removeEventListener('pointercancel', onUp)
  }
  handle.addEventListener('pointermove', onMove)
  handle.addEventListener('pointerup', onUp)
  handle.addEventListener('pointercancel', onUp)
}

function onClose() {
  if (props.closeHandler) props.closeHandler()
  else wm.close(props.id)
}
</script>

<template>
  <Teleport defer to="#wm-layer" :disabled="!teleport">
    <div
      v-if="entry"
      v-show="entry.state !== 'minimized'"
      ref="frameEl"
      class="wm-frame"
      :class="{ maximized, active: isActive }"
      :style="frameStyle"
      :data-window-id="id"
      @pointerdown.capture="wm.focus(id)"
    >
      <UiWindow
        ref="uiWindow"
        fill
        :title="entry.title"
        :icon="entry.icon"
        :active="isActive"
        :variant="entry.variant"
        :menus="ctx.menus.value"
        :minimizable="entry.minimizable"
        :maximizable="entry.maximizable"
        :maximized="maximized"
        :scroll-body="scrollBody"
        @drag-start="onDragStart"
        @title-dblclick="entry.maximizable && wm.toggleMaximize(id)"
        @minimize="wm.minimize(id)"
        @maximize="wm.maximize(id)"
        @restore="wm.restore(id)"
        @close="onClose"
      >
        <template v-if="$slots.toolbar" #toolbar><slot name="toolbar" /></template>
        <slot />
        <template v-if="$slots.footer" #footer><slot name="footer" /></template>
        <template v-if="$slots.statusbar" #statusbar><slot name="statusbar" /></template>
      </UiWindow>

      <template v-if="entry.resizable && entry.state === 'normal'">
        <span
          v-for="dir in HANDLES"
          :key="dir"
          class="wm-resize"
          :class="`wm-resize-${dir}`"
          aria-hidden="true"
          @pointerdown="onResizeStart(dir, $event)"
        />
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.wm-frame {
  position: absolute;
  display: flex;
  pointer-events: auto;
  min-width: 0;
  min-height: 0;
}
.wm-frame.maximized {
  inset: 0;
}

.wm-resize {
  position: absolute;
  z-index: 2;
  touch-action: none;
}
.wm-resize-n, .wm-resize-s { left: 6px; right: 6px; height: 6px; cursor: ns-resize; }
.wm-resize-e, .wm-resize-w { top: 6px; bottom: 6px; width: 6px; cursor: ew-resize; }
.wm-resize-n { top: -3px; }
.wm-resize-s { bottom: -3px; }
.wm-resize-e { right: -3px; }
.wm-resize-w { left: -3px; }
.wm-resize-ne, .wm-resize-nw, .wm-resize-se, .wm-resize-sw { width: 12px; height: 12px; }
.wm-resize-ne { top: -3px; right: -3px; cursor: nesw-resize; }
.wm-resize-sw { bottom: -3px; left: -3px; cursor: nesw-resize; }
.wm-resize-nw { top: -3px; left: -3px; cursor: nwse-resize; }
.wm-resize-se { bottom: -3px; right: -3px; cursor: nwse-resize; }
</style>
