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
import type { SceneAttribute, SceneToken } from '#server/db/schema.ts'
import {
  Stage as VStage,
  Layer as VLayer,
  Rect as VRect,
  Image as VImage,
  Group as VGroup,
  Text as VText,
  Transformer as VTransformer,
} from 'vue-konva'
import { useTokenTransform } from '~~/composables/useTokenTransform'
import { barFraction, defaultBarColor } from '~~/lib/tokenBars'
import { statusInitial, statusTextColor, type TokenStatusEntry } from '~~/lib/tokenStatuses'

/**
 * Versão da imagem do token "recolorida" por um status: a cor é pintada só onde a imagem
 * tem pixels (source-atop), preservando a transparência/contorno do token. Memoizada por
 * imagem e cor para não redesenhar a cada renderização.
 */
const tintCache = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>()
function tintedImage(img: HTMLImageElement, color: string): HTMLCanvasElement | null {
  if (!img.complete || !img.naturalWidth) return null
  let byColor = tintCache.get(img)
  if (!byColor) tintCache.set(img, (byColor = new Map()))
  let canvas = byColor.get(color)
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    ctx.globalCompositeOperation = 'source-atop'
    ctx.fillStyle = color
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    byColor.set(color, canvas)
  }
  return canvas
}

/** Versão em preto-e-branco da imagem (status com efeito 'grayscale'). Memoizada por imagem. */
const grayCache = new WeakMap<HTMLImageElement, HTMLCanvasElement>()
function grayscaleImage(img: HTMLImageElement): HTMLCanvasElement | null {
  if (!img.complete || !img.naturalWidth) return null
  let canvas = grayCache.get(img)
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    // Sem suporte a ctx.filter (ex.: Safari antigo) o token segue colorido.
    if (!ctx || !('filter' in ctx)) return null
    ctx.filter = 'grayscale(1)'
    ctx.drawImage(img, 0, 0)
    grayCache.set(img, canvas)
  }
  return canvas
}

const MAX_BADGES = 6

type StageToken = Pick<SceneToken, 'id' | 'x' | 'y' | 'width' | 'height' | 'scaleX' | 'scaleY' | 'rotation' | 'opacity'> & {
  name?: string
  showName?: boolean
  kind?: SceneToken['kind']
  statuses?: TokenStatusEntry[]
  attributes?: Pick<SceneAttribute, 'name' | 'value' | 'currentValue' | 'maxValue' | 'showBar' | 'barColor'>[]
}

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
  // Extensão do token já escalado e girado (caixa envolvente, em torno do centro da imagem).
  const sw = w * Math.abs(token.scaleX ?? 1)
  const sh = h * Math.abs(token.scaleY ?? 1)
  const rad = ((token.rotation || 0) * Math.PI) / 180
  const halfW = (Math.abs(sw * Math.cos(rad)) + Math.abs(sh * Math.sin(rad))) / 2
  const halfH = (Math.abs(sw * Math.sin(rad)) + Math.abs(sh * Math.cos(rad))) / 2
  const cx = w / 2
  const cy = h / 2

  // Tamanhos constantes na tela, qualquer que seja o zoom.
  const px = 1 / props.scale
  const barH = 8 * px
  const barGap = 2 * px
  const barW = Math.max(sw, 24 * px)
  let barY = cy + halfH + 4 * px
  const bars = (token.attributes ?? []).flatMap((attribute, index) => {
    if (!attribute.showBar) return []
    const fraction = barFraction(attribute)
    if (fraction === null) return []
    const y = barY
    barY += barH + barGap
    return [{
      key: `${token.id}-${index}`,
      back: { x: cx - barW / 2, y, width: barW, height: barH, fill: '#000000', stroke: '#ffffff', strokeWidth: px, listening: false },
      fill: { x: cx - barW / 2, y, width: barW * fraction, height: barH, fill: attribute.barColor || defaultBarColor(index), listening: false },
    }]
  })

  const nameFont = 14 * px
  const nameConfig = token.showName && token.name
    ? {
        text: token.name,
        x: cx - Math.max(barW, 160 * px) / 2,
        y: cy - halfH - nameFont - 4 * px,
        width: Math.max(barW, 160 * px),
        align: 'center',
        fontSize: nameFont,
        fontFamily: 'Pixel Operator, sans-serif',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 3 * px,
        fillAfterStrokeEnabled: true,
        listening: false,
      }
    : null

  // Status: cor por cima (do último aplicado) + um selo com a inicial de cada status.
  const statuses = token.statuses ?? []
  const baseImage = props.images[token.id] ?? undefined
  const isGray = statuses.some(s => s.effect === 'grayscale')
  const grayImage = isGray && baseImage ? grayscaleImage(baseImage) : null
  // A cor por cima vem do último status SEM efeito especial (o efeito já muda a imagem).
  const tintStatus = [...statuses].reverse().find(s => !s.effect)
  const tinted = tintStatus && baseImage ? tintedImage(grayImage ?? baseImage, tintStatus.color) : null
  const badgeSize = 14 * px
  const shown = statuses.slice(0, MAX_BADGES)
  const badges = shown.map((status, i) => {
    const overflow = i === MAX_BADGES - 1 && statuses.length > MAX_BADGES
    const bx = cx + halfW - (i + 1) * (badgeSize + px)
    const by = cy - halfH
    const color = overflow ? '#ffffff' : status.color
    return {
      key: `${token.id}-st-${status.id}`,
      // Nome(s) mostrados na dica ao passar o mouse; o selo "+N" lista os que não couberam.
      label: overflow ? statuses.slice(MAX_BADGES - 1).map(s => s.name).join(', ') : status.name,
      rect: { x: bx, y: by, width: badgeSize, height: badgeSize, fill: color, stroke: '#000000', strokeWidth: px },
      text: {
        x: bx,
        y: by,
        width: badgeSize,
        height: badgeSize,
        text: overflow ? `+${statuses.length - MAX_BADGES + 1}` : statusInitial(status.name),
        align: 'center',
        verticalAlign: 'middle',
        fontSize: 10 * px,
        fontStyle: 'bold',
        fontFamily: 'Pixel Operator, sans-serif',
        fill: statusTextColor(color),
        listening: false,
      },
    }
  })

  return {
    id: token.id,
    isDocument: token.kind === 'document',
    bars,
    badges,
    nameConfig,
    tintConfig: tinted
      ? {
          image: tinted,
          x: w / 2,
          y: h / 2,
          width: w,
          height: h,
          offsetX: w / 2,
          offsetY: h / 2,
          scaleX: token.scaleX ?? 1,
          scaleY: token.scaleY ?? 1,
          rotation: token.rotation || 0,
          opacity: 0.5,
          listening: false,
        }
      : null,
    groupConfig: {
      x: pos.x,
      y: pos.y,
      draggable: props.editable,
      opacity: (token.opacity ?? 100) / 100,
    },
    imageConfig: {
      id: `token-${token.id}`,
      name: 'token-image',
      image: grayImage ?? baseImage,
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

// ---------- dica (tooltip) dos selos de status ----------
const tip = reactive({ text: '', x: 0, y: 0 })

function showTip(e: any, text: string) {
  const pointer = e.target.getStage()?.getPointerPosition()
  if (!pointer) return
  tip.text = text
  tip.x = pointer.x
  tip.y = pointer.y
}

function hideTip() {
  tip.text = ''
}

// Perto da borda direita a dica abre para a esquerda do cursor, para não sair da janela.
const tipFlip = computed(() => tip.x > viewport.w - 180)

// Miniaturas de documento abrem a versão grande: o ponteiro vira a "mãozinha".
function onGroupEnter(e: any, isDocument: boolean) {
  if (isDocument && !pan) setCursor(e, 'pointer')
}

function onGroupLeave(e: any, isDocument: boolean) {
  if (isDocument && !pan) setCursor(e, '')
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
          @mouseenter="(e: any) => onGroupEnter(e, group.isDocument)"
          @mouseleave="(e: any) => onGroupLeave(e, group.isDocument)"
          @mousedown="onGroupDown(group.id)"
          @touchstart="onGroupDown(group.id)"
          @dragend="(e: any) => onDragEnd(e, group.id)"
          @contextmenu="(e: any) => onContext(e, group.id)"
          @dblclick="emit('dblclick', group.id)"
        >
          <VImage :config="group.imageConfig" @transformend="(e: any) => onTransformEnd(e, group.id)" />
          <VImage v-if="group.tintConfig" :config="group.tintConfig" />
          <template v-for="badge in group.badges" :key="badge.key">
            <VRect
              :config="badge.rect"
              @mouseenter="(e: any) => showTip(e, badge.label)"
              @mousemove="(e: any) => showTip(e, badge.label)"
              @mouseleave="hideTip"
              @mousedown="hideTip"
            />
            <VText :config="badge.text" />
          </template>
          <VText v-if="group.nameConfig" :config="group.nameConfig" />
          <template v-for="bar in group.bars" :key="bar.key">
            <VRect :config="bar.back" />
            <VRect :config="bar.fill" />
          </template>
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
    <!-- Camada com contra-zoom (como o canvas): 1 px aqui = 1 px de tela, igual ao ponteiro do Konva. -->
    <div v-if="tip.text" class="tip-layer" aria-hidden="true">
      <div class="tip-anchor" :class="{ flip: tipFlip }" :style="{ left: `${tip.x}px`, top: `${tip.y}px` }">
        <UiTooltip :text="tip.text" class="tip-box" />
      </div>
    </div>
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
.tip-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  zoom: calc(1 / var(--ui-scale, 1));
}
.tip-anchor {
  position: absolute;
  /* Abaixo e à direita do cursor, como a dica do Windows. */
  transform: translate(12px, 18px);
}
.tip-anchor.flip {
  transform: translate(calc(-100% - 6px), 18px);
}
/* Devolve a escala da interface ao texto da dica. */
.tip-box {
  zoom: var(--ui-scale, 1);
}
.editor-stage :deep(.konvajs-content) {
  background: var(--c-shadow);
}
</style>
