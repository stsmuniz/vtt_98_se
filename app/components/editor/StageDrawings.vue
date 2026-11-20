<script setup lang="ts">
/**
 * Camada de desenhos do canvas (entre o cenário e os tokens): formas, traços, setas e textos de
 * `drawings` (os MESMOS objetos da página — arrastar/transformar altera o objeto, como nos tokens).
 * Com `interactive` (ferramenta Selecionar, mestre), as formas são arrastáveis e a selecionada
 * ganha um transformador (tamanho/rotação). `preview` é o desenho em andamento (não interativo).
 */
import {
  Layer as VLayer,
  Line as VLine,
  Arrow as VArrow,
  Rect as VRect,
  Ellipse as VEllipse,
  Text as VText,
  Transformer as VTransformer,
} from 'vue-konva'
import { textFontFamily, type SceneDrawing } from '~~/lib/drawings'

const props = withDefaults(defineProps<{
  scale: number
  preview?: SceneDrawing | null
  interactive?: boolean
  selectedId?: string | null
  /** Desenho escondido (texto sendo editado no campo sobreposto). */
  hiddenId?: string | null
}>(), {
  preview: null,
  interactive: false,
  selectedId: null,
  hiddenId: null,
})

const drawings = defineModel<SceneDrawing[]>('drawings', { required: true })

const emit = defineEmits<{
  select: [id: string]
  /** Fim de arrastar/transformar (para o histórico e a transmissão). */
  commit: []
  context: [payload: { id: string; x: number; y: number }]
  dblclick: [id: string]
}>()

const layerRef = ref<{ getNode: () => any } | null>(null)
const transformerRef = ref<{ getNode: () => any } | null>(null)

function nodeId(id: string) {
  return `drawing-${id}`
}

/** Tipo de componente Konva e configuração de um desenho. */
function shapeOf(d: SceneDrawing, isPreview = false) {
  const strokeWidth = d.strokeWidth || 1
  const base: Record<string, unknown> = {
    id: isPreview ? undefined : nodeId(d.id),
    name: isPreview ? undefined : 'drawing',
    x: d.x,
    y: d.y,
    rotation: d.rotation ?? 0,
    scaleX: d.scaleX ?? 1,
    scaleY: d.scaleY ?? 1,
    opacity: d.id === props.hiddenId ? 0 : (d.opacity ?? 100) / 100,
    stroke: d.stroke ?? undefined,
    strokeEnabled: !!d.stroke,
    strokeWidth,
    fill: d.fill ?? undefined,
    draggable: props.interactive && !isPreview,
    listening: !isPreview,
    // Traços finos ficam fáceis de acertar com o mouse (borracha, seleção) em qualquer zoom.
    hitStrokeWidth: Math.max(strokeWidth, 12 / props.scale),
    lineCap: 'round',
    lineJoin: 'round',
  }
  const w = d.width ?? 0
  const h = d.height ?? 0
  switch (d.kind) {
    case 'pen':
      return { is: VLine, config: { ...base, points: d.points ?? [], tension: 0.4, fillEnabled: false } }
    case 'line':
      return { is: VLine, config: { ...base, points: d.points ?? [], fillEnabled: false } }
    case 'arrow': {
      const head = Math.max(10, strokeWidth * 3)
      return { is: VArrow, config: { ...base, points: d.points ?? [], pointerLength: head, pointerWidth: head, fill: d.stroke ?? undefined } }
    }
    case 'rect':
      return { is: VRect, config: { ...base, width: w, height: h, lineCap: 'square', lineJoin: 'miter' } }
    case 'ellipse':
      // A elipse do Konva é posicionada pelo centro; o desenho guarda o canto da caixa.
      return { is: VEllipse, config: { ...base, radiusX: w / 2, radiusY: h / 2, offsetX: -w / 2, offsetY: -h / 2 } }
    case 'triangle':
      return { is: VLine, config: { ...base, points: [w / 2, 0, w, h, 0, h], closed: true, lineJoin: 'miter' } }
    case 'text':
      return {
        is: VText,
        config: {
          ...base,
          text: d.text ?? '',
          fontSize: d.fontSize ?? 32,
          fontFamily: textFontFamily(d.font),
          lineHeight: 1.25,
          stroke: undefined,
          strokeEnabled: false,
          fill: d.fill ?? d.stroke ?? '#000000',
        },
      }
  }
}

// ---------- fontes dos textos ----------
// O Konva mede e desenha o texto com a fonte disponível NAQUELE momento: uma fonte da web ainda
// não baixada sai na fonte reserva e fica assim. Cada fonte usada é carregada explicitamente e,
// quando chega, os textos são recriados (`fontEpoch` entra na chave) para medir de novo.
const fontEpoch = ref(0)
const requestedFonts = new Set<string>()
function ensureFonts(list: (SceneDrawing | null | undefined)[]) {
  if (typeof document === 'undefined' || !document.fonts) return
  for (const d of list) {
    if (d?.kind !== 'text') continue
    const family = textFontFamily(d.font)
    if (requestedFonts.has(family)) continue
    requestedFonts.add(family)
    document.fonts.load(`32px ${family}`, d.text || 'Aa')
      .then(loaded => { if (loaded.length) fontEpoch.value++ })
      .catch(() => { /* fica a fonte reserva */ })
  }
}
watch(() => [drawings.value.map(d => d.kind === 'text' ? d.font ?? '' : '').join(), props.preview?.font], () => {
  ensureFonts([...drawings.value, props.preview])
}, { immediate: true })

const shapes = computed(() => drawings.value.map(d => ({
  id: d.id,
  key: d.kind === 'text' ? `${d.id}:${fontEpoch.value}` : d.id,
  ...shapeOf(d),
})))
const previewShape = computed(() => (props.preview ? shapeOf(props.preview, true) : null))

const transformerConfig = computed(() => {
  const selected = drawings.value.find(d => d.id === props.selectedId)
  const keepRatio = selected?.kind === 'text'
  return {
    keepRatio,
    rotateEnabled: true,
    ignoreStroke: true,
    enabledAnchors: keepRatio
      ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
      : ['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right'],
    borderStroke: '#000080',
    anchorStroke: '#000080',
    anchorFill: '#ffffff',
    anchorSize: 8,
  }
})

// Liga o transformador à forma selecionada (e religa se o nó for recriado).
async function attachTransformer() {
  await nextTick()
  const transformer = transformerRef.value?.getNode()
  if (!transformer) return
  const node = props.interactive && props.selectedId ? layerRef.value?.getNode()?.findOne(`#${nodeId(props.selectedId)}`) : null
  transformer.nodes(node ? [node] : [])
  transformer.getLayer()?.batchDraw()
}
watch(() => [props.selectedId, props.interactive, drawings.value.length, fontEpoch.value], attachTransformer)
onMounted(attachTransformer)

function find(id: string) {
  return drawings.value.find(d => d.id === id)
}

function onDown(e: any, id: string) {
  if (!props.interactive) return
  // Não deixa o fundo mover a câmera nem desmarcar.
  e.cancelBubble = true
  emit('select', id)
}

function onDragEnd(e: any, id: string) {
  const d = find(id)
  if (!d) return
  d.x = Math.round(e.target.x() * 10) / 10
  d.y = Math.round(e.target.y() * 10) / 10
  emit('commit')
}

/** Incorpora a escala do transformador nas medidas do desenho (a espessura do traço não muda). */
function onTransformEnd(e: any, id: string) {
  const d = find(id)
  const node = e.target
  if (!d) return
  const sx = node.scaleX()
  const sy = node.scaleY()
  const round = (n: number) => Math.round(n * 10) / 10
  d.x = round(node.x())
  d.y = round(node.y())
  d.rotation = round(node.rotation())
  if (d.kind === 'pen' || d.kind === 'line' || d.kind === 'arrow') {
    d.points = (d.points ?? []).map((p, i) => round(p * (i % 2 === 0 ? sx : sy)))
    d.scaleX = 1
    d.scaleY = 1
  } else if (d.kind === 'text') {
    d.fontSize = Math.max(8, Math.min(256, Math.round((d.fontSize ?? 32) * Math.abs(sy))))
    d.scaleX = 1
    d.scaleY = 1
  } else {
    d.width = round(Math.max(1, (d.width ?? 0) * Math.abs(sx)))
    d.height = round(Math.max(1, (d.height ?? 0) * Math.abs(sy)))
    // Espelhar arrastando uma alça por cima da outra fica no sinal da escala.
    d.scaleX = sx < 0 ? -1 : 1
    d.scaleY = sy < 0 ? -1 : 1
  }
  // O vue-konva só reaplica o que mudou na configuração: a escala do nó volta à mão.
  node.scaleX(d.scaleX ?? 1)
  node.scaleY(d.scaleY ?? 1)
  emit('commit')
}

function onContext(e: any, id: string) {
  if (!props.interactive) return
  e.evt.preventDefault()
  e.cancelBubble = true
  emit('select', id)
  emit('context', { id, x: e.evt.clientX, y: e.evt.clientY })
}

function onDblClick(e: any, id: string) {
  if (!props.interactive) return
  e.cancelBubble = true
  emit('dblclick', id)
}

function setCursor(e: any, cursor: string) {
  if (!props.interactive) return
  const container = e.target.getStage()?.container()
  if (container) container.style.cursor = cursor
}

defineExpose({ getLayer: () => layerRef.value?.getNode() })
</script>

<template>
  <VLayer ref="layerRef">
    <component
      :is="shape.is"
      v-for="shape in shapes"
      :key="shape.key"
      :config="shape.config"
      @mousedown="(e: any) => onDown(e, shape.id)"
      @touchstart="(e: any) => onDown(e, shape.id)"
      @dragend="(e: any) => onDragEnd(e, shape.id)"
      @transformend="(e: any) => onTransformEnd(e, shape.id)"
      @contextmenu="(e: any) => onContext(e, shape.id)"
      @dblclick="(e: any) => onDblClick(e, shape.id)"
      @dbltap="(e: any) => onDblClick(e, shape.id)"
      @mouseenter="(e: any) => setCursor(e, 'move')"
      @mouseleave="(e: any) => setCursor(e, '')"
    />
    <component :is="previewShape.is" v-if="previewShape" :config="previewShape.config" />
    <VTransformer v-if="interactive" ref="transformerRef" :config="transformerConfig" />
  </VLayer>
</template>
