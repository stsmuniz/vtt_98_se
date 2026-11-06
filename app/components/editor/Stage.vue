<script setup lang="ts">
/**
 * Canvas (vue-konva) compartilhado pelo editor de cenas e pela sala: cenário
 * de fundo, tokens arrastáveis, seletor de transformação (tamanho/rotação) e,
 * no editor, a alça para redimensionar o cenário.
 *
 * `tokens` é um v-model com os MESMOS objetos de quem usa (arrastar/transformar
 * altera o objeto do token), para que observadores profundos da página — como
 * a transmissão ao vivo da sala — continuem vendo cada alteração.
 *
 * O array está em ordem de exibição "de cima para baixo" (índice 0 = token no
 * topo); por isso é desenhado ao contrário.
 *
 * O canvas ocupa toda a área da janela (como nos VTTs em geral) e a cena é uma
 * "câmera" sobre ele: a roda do mouse dá zoom em torno do cursor, arrastar o
 * fundo (ou usar o botão do meio) move a cena, e ao abrir ela já vem ajustada à
 * janela e centralizada. `scale` vem de fora (controle de zoom da barra de
 * status); o zoom feito aqui dentro (roda, "Ajustar") volta pelo evento `zoom`.
 */
import type { SceneToken } from '#server/db/schema.ts'
import {
  Stage as VStage,
  Layer as VLayer,
  Rect as VRect,
  Image as VImage,
  Group as VGroup,
  Transformer as VTransformer,
} from 'vue-konva'
import { useTokenTransform } from '~~/composables/useTokenTransform'

type StageToken = Pick<SceneToken, 'id' | 'x' | 'y' | 'width' | 'height' | 'scaleX' | 'scaleY' | 'rotation' | 'opacity'>

const props = withDefaults(defineProps<{
  scale: number
  background?: HTMLImageElement | null
  images: Record<number, HTMLImageElement | null | undefined>
  selected: number | null
  /** Arrastar e transformar tokens (falso para visitantes da sala). */
  editable?: boolean
  /** Posições exibidas (movimento suavizado dos visitantes); ignora x/y dos tokens. */
  positions?: Record<number, { x: number; y: number }> | null
  /** Mostra a alça para redimensionar o cenário (editor). */
  resizable?: boolean
  /** Limites do zoom, em porcentagem. */
  minZoom?: number
  maxZoom?: number
}>(), {
  background: null,
  editable: true,
  positions: null,
  resizable: false,
  minZoom: 10,
  maxZoom: 500,
})

const tokens = defineModel<StageToken[]>('tokens', { required: true })
const width = defineModel<number>('width', { required: true })
const height = defineModel<number>('height', { required: true })

const emit = defineEmits<{
  select: [id: number | null]
  context: [payload: { id: number; x: number; y: number }]
  dblclick: [id: number]
  /** Novo zoom (em %) causado pela roda do mouse ou por "Ajustar". */
  zoom: [percent: number]
  /** Fim de arrastar/transformar um token. */
  change: [id: number]
  /** Fim do arraste da alça de tamanho do cenário. */
  resized: [size: { width: number; height: number }]
}>()

const MIN_SCENE = 100

const stageRef = ref<{ getNode: () => any } | null>(null)
const transformerRef = ref<{ getNode: () => any } | null>(null)

const { handleTransformEnd, handleDragEnd, hFlipToken, vFlipToken, resetTokenRotation } = useTokenTransform(tokens, stageRef, transformerRef)

// ---------- câmera: tamanho da área, posição (pan) e zoom ----------
const root = ref<HTMLElement | null>(null)
const viewport = reactive({ w: 0, h: 0 })
const offset = reactive({ x: 0, y: 0 })
/** Escala com a qual `offset` foi calculado (distingue o zoom de fora do zoom da roda). */
let appliedScale = props.scale
const MARGIN = 80 // fatia mínima da cena que sempre fica visível ao mover

function clampOffset() {
  const sw = width.value * props.scale
  const sh = height.value * props.scale
  offset.x = Math.min(viewport.w - MARGIN, Math.max(MARGIN - sw, offset.x))
  offset.y = Math.min(viewport.h - MARGIN, Math.max(MARGIN - sh, offset.y))
}

/** Zoom para a cena inteira caber na área, com uma folga em volta, e centralizada. */
function fit() {
  if (!viewport.w || !viewport.h || !width.value || !height.value) return
  const pad = 24
  const s = Math.min((viewport.w - pad * 2) / width.value, (viewport.h - pad * 2) / height.value)
  const percent = Math.max(props.minZoom, Math.min(props.maxZoom, Math.floor(s * 100)))
  const scale = percent / 100
  appliedScale = scale
  offset.x = (viewport.w - width.value * scale) / 2
  offset.y = (viewport.h - height.value * scale) / 2
  emit('zoom', percent)
}

/** Zoom vindo de fora (botões +/-, 100%, campo de texto): mantém o centro da área parado. */
watch(() => props.scale, (next) => {
  if (next === appliedScale || !viewport.w) return
  autoFit = false
  const cx = viewport.w / 2
  const cy = viewport.h / 2
  const wx = (cx - offset.x) / appliedScale
  const wy = (cy - offset.y) / appliedScale
  appliedScale = next
  offset.x = cx - wx * next
  offset.y = cy - wy * next
  clampOffset()
})

// Enquanto o usuário não mexe na câmera, a cena fica ajustada e centralizada: vale para a
// abertura (a área e os dados da cena podem chegar em momentos diferentes) e para
// redimensionar a janela. Depois de zoom/pan, a câmera fica onde o usuário deixou.
let autoFit = true
function tryInitialFit() {
  if (autoFit) fit()
}
watch([width, height], tryInitialFit)

let observer: ResizeObserver | null = null
function measure() {
  const el = root.value
  if (!el) return
  // Px de tela; o contra-zoom do CSS (abaixo) faz 1 px do canvas = 1 px de tela.
  const rect = el.getBoundingClientRect()
  viewport.w = Math.max(0, Math.floor(rect.width))
  viewport.h = Math.max(0, Math.floor(rect.height))
  tryInitialFit()
}
onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  if (root.value) observer.observe(root.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  stopPan()
})

const stageConfig = computed(() => ({
  width: viewport.w || 1,
  height: viewport.h || 1,
  x: offset.x,
  y: offset.y,
  scaleX: props.scale,
  scaleY: props.scale,
}))

// Zoom pela roda, em torno do cursor (o ponto do mapa sob o mouse não sai do lugar).
function onWheel(e: any) {
  const evt = e.evt as WheelEvent
  evt.preventDefault()
  const pointer = e.target.getStage().getPointerPosition()
  if (!pointer) return
  const factor = Math.exp(-evt.deltaY * (evt.ctrlKey ? 0.01 : 0.0012))
  const percent = Math.round(Math.max(props.minZoom, Math.min(props.maxZoom, props.scale * 100 * factor)))
  const next = percent / 100
  if (next === props.scale) return
  autoFit = false
  const wx = (pointer.x - offset.x) / props.scale
  const wy = (pointer.y - offset.y) / props.scale
  appliedScale = next
  offset.x = pointer.x - wx * next
  offset.y = pointer.y - wy * next
  emit('zoom', percent)
  nextTick(clampOffset)
}

// Mover a cena: botão esquerdo no fundo (ou no vazio) ou botão do meio em qualquer lugar.
let pan: { startX: number; startY: number; ox: number; oy: number; moved: boolean } | null = null
let justPanned = false

function setStageCursor(cursor: string) {
  const container = stageRef.value?.getNode()?.container?.()
  if (container) container.style.cursor = cursor
}

function onStageDown(e: any) {
  const evt = e.evt as MouseEvent | TouchEvent
  const isTouch = 'touches' in evt
  const button = isTouch ? 0 : (evt as MouseEvent).button
  const onEmpty = e.target === e.target.getStage() || e.target.attrs.id === 'scene'
  if (!(button === 1 || (button === 0 && onEmpty))) return
  const point = isTouch ? (evt as TouchEvent).touches[0] : (evt as MouseEvent)
  if (!point) return
  if (button === 1) evt.preventDefault()
  pan = { startX: point.clientX, startY: point.clientY, ox: offset.x, oy: offset.y, moved: false }
  window.addEventListener('mousemove', onPanMove)
  window.addEventListener('mouseup', stopPan)
  window.addEventListener('touchmove', onPanMove, { passive: true })
  window.addEventListener('touchend', stopPan)
  setStageCursor('grabbing')
}

function onPanMove(evt: MouseEvent | TouchEvent) {
  if (!pan) return
  const point = 'touches' in evt ? evt.touches[0] : evt
  if (!point) return
  const dx = point.clientX - pan.startX
  const dy = point.clientY - pan.startY
  if (!pan.moved && Math.hypot(dx, dy) < 4) return
  pan.moved = true
  autoFit = false
  offset.x = pan.ox + dx
  offset.y = pan.oy + dy
  clampOffset()
}

function stopPan() {
  window.removeEventListener('mousemove', onPanMove)
  window.removeEventListener('mouseup', stopPan)
  window.removeEventListener('touchmove', onPanMove)
  window.removeEventListener('touchend', stopPan)
  if (pan?.moved) {
    // O "click" que o Konva dispara depois de arrastar o fundo não deve desmarcar o token.
    justPanned = true
    setTimeout(() => { justPanned = false }, 0)
  }
  pan = null
  setStageCursor('')
}

const backgroundConfig = computed(() => ({
  x: 0,
  y: 0,
  width: width.value,
  height: height.value,
  image: props.background ?? undefined,
  id: 'scene',
}))

const tokenGroups = computed(() => [...tokens.value].reverse().map((token) => {
  const w = token.width || 100
  const h = token.height || 100
  const pos = !props.editable && props.positions ? (props.positions[token.id] ?? token) : token
  return {
    id: token.id,
    groupConfig: {
      x: pos.x,
      y: pos.y,
      draggable: props.editable,
      opacity: (token.opacity ?? 100) / 100,
    },
    imageConfig: {
      id: `token-${token.id}`,
      name: 'token-image',
      image: props.images[token.id] ?? undefined,
      x: w / 2,
      y: h / 2,
      width: w,
      height: h,
      offsetX: w / 2,
      offsetY: h / 2,
      scaleX: token.scaleX ?? 1,
      scaleY: token.scaleY ?? 1,
      rotation: token.rotation || 0,
    },
  }
}))

const transformerConfig = {
  keepRatio: true,
  enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
}

// Liga o transformador ao token selecionado (à IMAGEM, não ao grupo).
watch(() => props.selected, async (id) => {
  if (!props.editable || !transformerRef.value) return
  await nextTick()
  const transformer = transformerRef.value.getNode()
  if (!id) {
    transformer.nodes([])
    return
  }
  const node = stageRef.value?.getNode()?.findOne(`#token-${id}`)
  transformer.nodes(node ? [node] : [])
})

function onStageClick(e: any) {
  if (justPanned) return
  if (e.target === e.target.getStage() || e.target.attrs.id === 'scene') emit('select', null)
}

function onGroupDown(id: number) {
  emit('select', id)
}

function onDragEnd(e: any, id: number) {
  handleDragEnd(e, id)
  emit('change', id)
}

function onTransformEnd(e: any, id: number) {
  handleTransformEnd(e, id)
  emit('change', id)
}

function onContext(e: any, id: number) {
  e.evt.preventDefault()
  emit('select', id)
  emit('context', { id, x: e.evt.clientX, y: e.evt.clientY })
}

// ---------- alça de redimensionar o cenário ----------
const resizeHandleConfig = computed(() => ({
  x: width.value,
  y: height.value,
  // Tamanho constante na tela, qualquer que seja o zoom.
  width: 20 / props.scale,
  height: 20 / props.scale,
  offsetX: 10 / props.scale,
  offsetY: 10 / props.scale,
  fill: '#000080',
  stroke: '#ffffff',
  strokeWidth: 2 / props.scale,
  draggable: true,
  name: 'resize-handle',
}))

function onResizeMove(e: any) {
  autoFit = false
  const node = e.target
  width.value = Math.max(MIN_SCENE, node.x())
  height.value = Math.max(MIN_SCENE, node.y())
  node.x(width.value)
  node.y(height.value)
}

function onResizeEnd(e: any) {
  onResizeMove(e)
  emit('resized', { width: width.value, height: height.value })
}

function setCursor(e: any, cursor: string) {
  e.target.getStage().container().style.cursor = cursor
}

function onBackgroundEnter(e: any) {
  if (!pan) setCursor(e, 'grab')
}

function onBackgroundLeave(e: any) {
  if (!pan) setCursor(e, '')
}

defineExpose({
  hFlip: (id: number) => hFlipToken(id),
  vFlip: (id: number) => vFlipToken(id),
  resetRotation: (id: number) => resetTokenRotation(id),
  getStage: () => stageRef.value?.getNode(),
  /** Ajusta o zoom para a cena inteira caber na janela e a centraliza. */
  fit: () => { autoFit = true; fit() },
})
</script>

<template>
  <div ref="root" class="editor-stage" data-test="editor-stage">
    <VStage
      ref="stageRef"
      class="editor-stage-canvas"
      :config="stageConfig"
      @click="onStageClick"
      @tap="onStageClick"
      @wheel="onWheel"
      @mousedown="onStageDown"
      @touchstart="onStageDown"
    >
      <VLayer>
        <VImage :config="backgroundConfig" @mouseenter="onBackgroundEnter" @mouseleave="onBackgroundLeave" />
      </VLayer>
      <VLayer>
        <VGroup
          v-for="group in tokenGroups"
          :key="group.id"
          :config="group.groupConfig"
          @mousedown="onGroupDown(group.id)"
          @touchstart="onGroupDown(group.id)"
          @dragend="(e: any) => onDragEnd(e, group.id)"
          @contextmenu="(e: any) => onContext(e, group.id)"
          @dblclick="emit('dblclick', group.id)"
        >
          <VImage :config="group.imageConfig" @transformend="(e: any) => onTransformEnd(e, group.id)" />
        </VGroup>

        <VTransformer v-if="editable" ref="transformerRef" :config="transformerConfig" />

        <VRect
          v-if="resizable && editable"
          :config="resizeHandleConfig"
          @dragmove="onResizeMove"
          @dragend="onResizeEnd"
          @mouseenter="(e: any) => setCursor(e, 'nwse-resize')"
          @mouseleave="(e: any) => setCursor(e, 'default')"
        />
      </VLayer>
    </VStage>
  </div>
</template>

<style scoped>
/* O canvas ocupa toda a área do pai (que precisa ser position: relative). */
.editor-stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--c-shadow);
}
.editor-stage-canvas {
  /* Contra-zoom: a escala da interface não amplia o mapa (o canvas tem zoom próprio)
     e o ponteiro do Konva continua acertando os tokens. */
  zoom: calc(1 / var(--ui-scale, 1));
}
.editor-stage :deep(.konvajs-content) {
  background: var(--c-shadow);
}
</style>
