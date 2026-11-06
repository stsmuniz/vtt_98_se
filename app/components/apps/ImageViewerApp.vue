<script setup lang="ts">
/**
 * Visualizador de imagens (cenários e documentos): abre ajustado à janela e centralizado; a roda do
 * mouse dá zoom em torno do cursor, arrastar move a imagem e o duplo clique alterna entre "ajustada"
 * e tamanho real. Também serve a visitantes da sala (documentos da mesa).
 */
import type { MenuDef } from '~/utils/menu'
import { useWindow } from '~~/composables/useWindow'

const props = defineProps<{ src: string; name?: string }>()

const MIN_SCALE = 0.05
const MAX_SCALE = 8
const KEEP_VISIBLE = 60 // fatia mínima da imagem que fica sempre visível ao mover

const win = useWindow()
const canvas = ref<HTMLElement | null>(null)
const natural = ref<{ w: number; h: number } | null>(null)
const view = reactive({ w: 0, h: 0 })
const scale = ref(1)
const offset = reactive({ x: 0, y: 0 })
/** Enquanto o usuário não mexe, a imagem fica ajustada (inclusive ao redimensionar a janela). */
const autoFit = ref(true)

const percent = computed(() => Math.round(scale.value * 100))

function clamp() {
  if (!natural.value) return
  const iw = natural.value.w * scale.value
  const ih = natural.value.h * scale.value
  offset.x = Math.min(view.w - KEEP_VISIBLE, Math.max(KEEP_VISIBLE - iw, offset.x))
  offset.y = Math.min(view.h - KEEP_VISIBLE, Math.max(KEEP_VISIBLE - ih, offset.y))
}

function fit() {
  if (!natural.value || !view.w || !view.h) return
  const s = Math.min(1, (view.w - 16) / natural.value.w, (view.h - 16) / natural.value.h)
  scale.value = Math.max(MIN_SCALE, s)
  offset.x = (view.w - natural.value.w * scale.value) / 2
  offset.y = (view.h - natural.value.h * scale.value) / 2
  autoFit.value = true
}

/** Muda o zoom mantendo (px, py) — em coordenadas da área — parado. */
function zoomAt(next: number, px: number, py: number) {
  if (!natural.value) return
  const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next))
  const wx = (px - offset.x) / scale.value
  const wy = (py - offset.y) / scale.value
  scale.value = clamped
  offset.x = px - wx * clamped
  offset.y = py - wy * clamped
  autoFit.value = false
  clamp()
}

const zoomIn = () => zoomAt(scale.value * 1.25, view.w / 2, view.h / 2)
const zoomOut = () => zoomAt(scale.value / 1.25, view.w / 2, view.h / 2)
const actualSize = () => zoomAt(1, view.w / 2, view.h / 2)

function onWheel(event: WheelEvent) {
  event.preventDefault()
  const rect = canvas.value!.getBoundingClientRect()
  zoomAt(scale.value * Math.exp(-event.deltaY * 0.0015), event.clientX - rect.left, event.clientY - rect.top)
}

// Mover: arrastar com o botão esquerdo (ou toque).
let drag: { x: number; y: number; ox: number; oy: number } | null = null
const dragging = ref(false)
function onPointerDown(event: PointerEvent) {
  if (event.button !== 0 && event.pointerType === 'mouse') return
  drag = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y }
  dragging.value = true
  canvas.value?.setPointerCapture(event.pointerId)
}
function onPointerMove(event: PointerEvent) {
  if (!drag) return
  offset.x = drag.ox + (event.clientX - drag.x)
  offset.y = drag.oy + (event.clientY - drag.y)
  autoFit.value = false
  clamp()
}
function onPointerUp(event: PointerEvent) {
  drag = null
  dragging.value = false
  canvas.value?.releasePointerCapture(event.pointerId)
}

function toggleFit() {
  if (autoFit.value) actualSize()
  else fit()
}

function onLoad(event: Event) {
  const img = event.target as HTMLImageElement
  natural.value = { w: img.naturalWidth, h: img.naturalHeight }
  fit()
}

let observer: ResizeObserver | null = null
function measure() {
  const el = canvas.value
  if (!el) return
  view.w = el.clientWidth
  view.h = el.clientHeight
  if (autoFit.value) fit()
  else clamp()
}
onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  if (canvas.value) observer.observe(canvas.value)
})
onBeforeUnmount(() => observer?.disconnect())

const menus = computed<MenuDef[]>(() => [
  { id: 'arquivo', label: '&Arquivo', items: [{ id: 'fechar', label: '&Fechar', action: () => win.close() }] },
  {
    id: 'exibir',
    label: 'E&xibir',
    items: [
      { id: 'zoom-mais', label: '&Aumentar zoom', icon: 'zoom-in', action: zoomIn },
      { id: 'zoom-menos', label: '&Diminuir zoom', icon: 'zoom-out', action: zoomOut },
      { type: 'separator' },
      { id: 'ajustar', type: 'radio', label: 'A&justar à janela', checked: autoFit.value, action: fit },
      { id: 'real', type: 'radio', label: '&Tamanho real', checked: !autoFit.value && percent.value === 100, action: actualSize },
    ],
  },
])
win.setMenus(menus.value)
watch(menus, m => win.setMenus(m))
</script>

<template>
  <div class="viewer">
    <UiToolbar label="Visualização">
      <UiToolbarButton label="Aumentar zoom" icon="zoom-in" @click="zoomIn" />
      <UiToolbarButton label="Diminuir zoom" icon="zoom-out" @click="zoomOut" />
      <UiToolbarSeparator />
      <UiToolbarButton label="Ajustar à janela" icon="fullscreen" show-label :pressed="autoFit" @click="fit" />
      <UiToolbarButton label="Tamanho real" show-label :pressed="!autoFit && percent === 100" @click="actualSize" />
    </UiToolbar>
    <div
      ref="canvas"
      class="viewer-canvas"
      :class="{ dragging }"
      data-test="viewer-canvas"
      @wheel="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @dblclick="toggleFit"
    >
      <img
        :src="props.src"
        :alt="props.name ?? 'Imagem'"
        draggable="false"
        :style="{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }"
        @load="onLoad"
      >
    </div>
    <UiStatusBar>
      <UiStatusField grow>{{ props.name }}</UiStatusField>
      <UiStatusField>{{ natural ? `${natural.w} × ${natural.h} px` : '' }}</UiStatusField>
      <UiStatusField>{{ percent }}%</UiStatusField>
    </UiStatusBar>
  </div>
</template>

<style scoped>
.viewer {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}
.viewer-canvas {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  margin: var(--sp-1);
  background: var(--c-shadow);
  box-shadow: var(--bevel-sunken);
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.viewer-canvas.dragging {
  cursor: grabbing;
}
.viewer-canvas img {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  max-width: none;
  transform-origin: 0 0;
  /* Ampliar além de 100% mostra pixels, não borrão. */
  image-rendering: auto;
}
</style>
