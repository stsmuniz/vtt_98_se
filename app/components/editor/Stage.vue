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
 *
 * Desenhos (`v-model:drawings`) ficam numa camada entre o cenário e os tokens. Com uma
 * ferramenta de desenho (`tool` diferente de 'select'), os tokens ficam travados e o botão
 * esquerdo desenha (o do meio e a roda continuam movendo a câmera e dando zoom). `pings` são
 * as animações da ferramenta Apontar.
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
import { barFraction, barZoomFactor, defaultBarColor } from '~~/lib/tokenBars'
import { statusInitial, statusTextColor, type TokenStatusEntry } from '~~/lib/tokenStatuses'
import { DEFAULT_DRAW_STYLE, DEFAULT_TEXT_FONT, newDrawingId, textFontFamily, type DrawStyle, type DrawingTool, type SceneDrawing, type StagePing, type TextFont } from '~~/lib/drawings'
import { useDrawingTools } from '~~/composables/useDrawingTools'

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
  attributes?: Pick<SceneAttribute, 'name' | 'value' | 'currentValue' | 'maxValue' | 'showBar' | 'showBarValues' | 'barColor'>[]
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
  /** Ferramenta de desenho ativa ('select' = modo normal). Só vale com `editable`. */
  tool?: DrawingTool
  drawStyle?: DrawStyle
  /** Desenho selecionado (ferramenta Selecionar). */
  selectedDrawing?: string | null
  /** Animações da ferramenta Apontar em andamento. */
  pings?: StagePing[]
}>(), {
  background: null,
  editable: true,
  positions: null,
  resizable: false,
  minZoom: 10,
  maxZoom: 500,
  tool: 'select',
  drawStyle: () => DEFAULT_DRAW_STYLE,
  selectedDrawing: null,
  pings: () => [],
})

const tokens = defineModel<StageToken[]>('tokens', { required: true })
const width = defineModel<number>('width', { required: true })
const height = defineModel<number>('height', { required: true })
const drawings = defineModel<SceneDrawing[]>('drawings', { default: () => [] })

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
  'select-drawing': [id: string | null]
  /** Uma alteração nos desenhos terminou (histórico de desfazer e transmissão). */
  'drawings-commit': []
  'context-drawing': [payload: { id: string; x: number; y: number }]
  /** Campo de texto aberto (fonte e tamanho do texto) ou fechado (`null`). */
  'text-editing': [payload: { font: TextFont; fontSize: number } | null]
  /** Ferramenta Apontar: ponto do mapa clicado. */
  point: [point: { x: number; y: number }]
  /** Conta-gotas: cor pega (botão esquerdo = primária, direito = secundária). */
  'pick-color': [color: string, which: 'primary' | 'secondary']
}>()

const MIN_SCENE = 100

const stageRef = ref<{ getNode: () => any } | null>(null)
const transformerRef = ref<{ getNode: () => any } | null>(null)

const { handleTransformEnd, handleDragEnd, hFlipToken, vFlipToken, resetTokenRotation } = useTokenTransform(tokens, stageRef, transformerRef)

// ---------- ferramentas de desenho ----------
/** Visitantes (não editável) ficam sempre no modo normal. */
const activeTool = computed<DrawingTool>(() => (props.editable ? props.tool : 'select'))
const drawingsInteractive = computed(() => props.editable && activeTool.value === 'select')

const drawingTools = useDrawingTools({
  stage: () => stageRef.value?.getNode(),
  drawings,
  tool: () => activeTool.value,
  style: () => props.drawStyle,
  scale: () => props.scale,
  onCommit: () => emit('drawings-commit'),
  onPoint: point => emit('point', point),
  onPick: (color, which) => emit('pick-color', color, which),
  onText: point => openTextEditor(point),
})
const drawingPreview = drawingTools.preview

function toolCursor(): string {
  switch (activeTool.value) {
    case 'select': return ''
    case 'text': return 'text'
    case 'point': return 'pointer'
    default: return 'crosshair'
  }
}

// ---------- texto: campo sobreposto ao canvas ----------
const textEdit = reactive({ open: false, id: null as string | null, x: 0, y: 0, value: '', fontSize: 32, font: DEFAULT_TEXT_FONT as TextFont, color: '#000000' })
const textAreaRef = ref<HTMLTextAreaElement | null>(null)

function openTextEditor(point: { x: number; y: number }, existing?: SceneDrawing) {
  commitText()
  Object.assign(textEdit, existing
    ? { open: true, id: existing.id, x: existing.x, y: existing.y, value: existing.text ?? '', fontSize: existing.fontSize ?? 32, font: existing.font ?? DEFAULT_TEXT_FONT, color: existing.fill ?? existing.stroke ?? '#000000' }
    : { open: true, id: null, x: point.x, y: point.y, value: '', fontSize: props.drawStyle.fontSize, font: props.drawStyle.font, color: props.drawStyle.primary })
  // A página mostra as opções de texto na caixa de ferramentas (e, editando um texto existente,
  // a fonte e o tamanho dele); trocar ali muda o texto em digitação (watch abaixo).
  emit('text-editing', { font: textEdit.font, fontSize: textEdit.fontSize })
  nextTick(() => textAreaRef.value?.focus())
}

// Fonte/tamanho escolhidos na caixa de ferramentas durante a digitação valem para este texto.
watch(() => [props.drawStyle.font, props.drawStyle.fontSize] as const, ([font, fontSize]) => {
  if (!textEdit.open) return
  textEdit.font = font
  textEdit.fontSize = fontSize
  nextTick(() => textAreaRef.value?.focus())
})

function commitText() {
  if (!textEdit.open) return
  textEdit.open = false
  emit('text-editing', null)
  const value = textEdit.value.replace(/\s+$/, '')
  const font = textEdit.font === DEFAULT_TEXT_FONT ? undefined : textEdit.font
  if (textEdit.id) {
    const target = drawings.value.find(d => d.id === textEdit.id)
    if (!target) return
    if (!value.trim()) drawings.value = drawings.value.filter(d => d !== target)
    else if (target.text !== value || target.fontSize !== textEdit.fontSize || target.font !== font) {
      target.text = value
      target.fontSize = textEdit.fontSize
      if (font) target.font = font
      else delete target.font
    } else return
  } else {
    if (!value.trim()) return
    drawings.value = [...drawings.value, {
      id: newDrawingId(),
      kind: 'text',
      x: textEdit.x,
      y: textEdit.y,
      width: 0,
      height: 0,
      text: value,
      fontSize: textEdit.fontSize,
      ...(font ? { font } : {}),
      stroke: null,
      fill: textEdit.color,
      strokeWidth: 0,
    }]
  }
  emit('drawings-commit')
}

function cancelText() {
  if (!textEdit.open) return
  textEdit.open = false
  emit('text-editing', null)
}

function onTextKeydown(e: KeyboardEvent) {
  // As teclas não chegam aos atalhos da janela (letras das ferramentas, Delete...).
  e.stopPropagation()
  if (e.key === 'Escape') {
    e.preventDefault()
    cancelText()
  } else if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    commitText()
  }
}

const textEditStyle = computed(() => {
  const lines = textEdit.value.split('\n')
  const longest = Math.max(4, ...lines.map(line => line.length + 1))
  const fontPx = textEdit.fontSize * props.scale
  return {
    left: `${offset.x + textEdit.x * props.scale}px`,
    top: `${offset.y + textEdit.y * props.scale}px`,
    fontSize: `${fontPx}px`,
    lineHeight: `${fontPx * 1.25}px`,
    fontFamily: textFontFamily(textEdit.font),
    width: `${longest * fontPx * 0.6 + 8}px`,
    height: `${lines.length * fontPx * 1.25 + 4}px`,
    color: textEdit.color,
  }
})

function onDrawingDblClick(id: string) {
  const target = drawings.value.find(d => d.id === id)
  if (target?.kind === 'text') openTextEditor(target, target)
}

watch(activeTool, () => {
  commitText()
  setStageCursor(toolCursor())
})

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
  setStageCursor(toolCursor())
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
  // Ferramenta de desenho: o botão do meio continua movendo a câmera; o resto desenha.
  if (activeTool.value !== 'select' && button !== 1) {
    if (isTouch && (evt as TouchEvent).touches.length > 1) return
    drawingTools.down(evt, button)
    return
  }
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
  setStageCursor(toolCursor())
}

// Com ferramenta de desenho, o botão direito é do Preencher/Conta-gotas (sem menu do navegador).
function onStageContext(e: any) {
  if (activeTool.value !== 'select') e.evt.preventDefault()
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
  // Barras "elásticas": crescem com o zoom dentro de um intervalo (ver barZoomFactor).
  // `bp` = unidades do mapa por "px de barra". Altas o bastante para caber o texto.
  const bp = barZoomFactor(props.scale) / props.scale
  const barH = 14 * bp
  const barGap = 2 * bp
  const barW = Math.max(sw, 24 * bp)
  let barY = cy + halfH + 4 * px
  const bars = (token.attributes ?? []).flatMap((attribute, index) => {
    if (!attribute.showBar) return []
    const fraction = barFraction(attribute)
    if (fraction === null) return []
    const y = barY
    barY += barH + barGap
    const label = attribute.showBarValues
      ? `${attribute.name} ${attribute.currentValue ?? attribute.value}/${attribute.maxValue ?? attribute.value}`
      : attribute.name
    const buttonW = barH
    const buttonStyle = { y, width: buttonW, height: barH, fill: 'rgba(0,0,0,0.7)', stroke: '#ffffff', strokeWidth: px }
    const buttonText = { y, width: buttonW, height: barH, align: 'center', verticalAlign: 'middle', fontSize: 12 * bp, fontStyle: 'bold', fontFamily: 'Pixel Operator, sans-serif', fill: '#ffffff', listening: false }
    return [{
      key: `${token.id}-${index}`,
      index,
      minus: { rect: { ...buttonStyle, x: cx - barW / 2 }, text: { ...buttonText, x: cx - barW / 2, text: '-' } },
      plus: { rect: { ...buttonStyle, x: cx + barW / 2 - buttonW }, text: { ...buttonText, x: cx + barW / 2 - buttonW, text: '+' } },
      text: {
        x: cx - barW / 2,
        y,
        width: barW,
        height: barH,
        text: label,
        align: 'center',
        verticalAlign: 'middle',
        wrap: 'none',
        ellipsis: true,
        fontSize: 10 * bp,
        fontStyle: 'bold',
        fontFamily: 'Pixel Operator, sans-serif',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2 * bp,
        fillAfterStrokeEnabled: true,
        listening: false,
      },
      back: { x: cx - barW / 2, y, width: barW, height: barH, fill: '#000000', stroke: '#ffffff', strokeWidth: px, listening: props.editable },
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
  if (justPanned || activeTool.value !== 'select') return
  if (e.target === e.target.getStage() || e.target.attrs.id === 'scene') {
    emit('select', null)
    emit('select-drawing', null)
  }
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

// ---------- barras de atributo editáveis (mestre): arrastar e botões − / + ----------
/** Barra sob o mouse (mostra os botões − e +). */
const hoverBar = ref<string | null>(null)
let barDrag: { node: any; id: number; index: number } | null = null

function setBarValue(id: number, index: number, value: number) {
  const attribute = tokens.value.find(t => t.id === id)?.attributes?.[index]
  if (!attribute) return
  const max = Number(attribute.maxValue ?? attribute.value)
  if (!Number.isFinite(max) || max <= 0) return
  attribute.currentValue = String(Math.min(max, Math.max(0, Math.round(value))))
}

/** Define o valor pela posição horizontal do ponteiro sobre a barra (px de tela). */
function dragBarTo(clientX: number, clientY: number) {
  if (!barDrag) return
  const stage = stageRef.value?.getNode()
  const attribute = tokens.value.find(t => t.id === barDrag!.id)?.attributes?.[barDrag.index]
  if (!stage || !attribute) return
  const rect = stage.container().getBoundingClientRect()
  const local = barDrag.node.getAbsoluteTransform().copy().invert().point({ x: clientX - rect.left, y: clientY - rect.top })
  const fraction = Math.min(1, Math.max(0, local.x / barDrag.node.width()))
  setBarValue(barDrag.id, barDrag.index, fraction * Number(attribute.maxValue ?? attribute.value))
}

function onBarMove(evt: MouseEvent | TouchEvent) {
  const point = 'touches' in evt ? evt.touches[0] : evt
  if (point) dragBarTo(point.clientX, point.clientY)
}

function stopBarDrag() {
  window.removeEventListener('mousemove', onBarMove)
  window.removeEventListener('mouseup', stopBarDrag)
  window.removeEventListener('touchmove', onBarMove)
  window.removeEventListener('touchend', stopBarDrag)
  if (barDrag) emit('change', barDrag.id)
  barDrag = null
}

function onBarDown(e: any, id: number, index: number) {
  if (!props.editable) return
  // Não deixa o token (grupo) começar a ser arrastado nem o fundo mover a cena.
  e.cancelBubble = true
  emit('select', id)
  barDrag = { node: e.target, id, index }
  const evt = e.evt as MouseEvent | TouchEvent
  const point = 'touches' in evt ? evt.touches[0] : evt
  if (point) dragBarTo(point.clientX, point.clientY)
  window.addEventListener('mousemove', onBarMove)
  window.addEventListener('mouseup', stopBarDrag)
  window.addEventListener('touchmove', onBarMove, { passive: true })
  window.addEventListener('touchend', stopBarDrag)
}

function onBarStep(e: any, id: number, index: number, delta: number) {
  e.cancelBubble = true
  emit('select', id)
  const attribute = tokens.value.find(t => t.id === id)?.attributes?.[index]
  if (!attribute) return
  // Shift = passos de 5.
  const step = (e.evt as MouseEvent).shiftKey ? 5 : 1
  setBarValue(id, index, Number(attribute.currentValue ?? attribute.value) + delta * step)
  emit('change', id)
}

onBeforeUnmount(stopBarDrag)

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
  if (!pan && activeTool.value === 'select') setCursor(e, 'grab')
}

function onBackgroundLeave(e: any) {
  if (!pan && activeTool.value === 'select') setCursor(e, '')
}

defineExpose({
  hFlip: (id: number) => hFlipToken(id),
  vFlip: (id: number) => vFlipToken(id),
  resetRotation: (id: number) => resetTokenRotation(id),
  getStage: () => stageRef.value?.getNode(),
  /** Ajusta o zoom para a cena inteira caber na janela e a centraliza. */
  fit: () => { autoFit = true; fit() },
  /** Confirma o texto em digitação (antes de salvar, trocar de ferramenta...). */
  commitText,
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
      @contextmenu="onStageContext"
    >
      <VLayer>
        <VImage :config="backgroundConfig" @mouseenter="onBackgroundEnter" @mouseleave="onBackgroundLeave" />
      </VLayer>
      <EditorStageDrawings
        v-model:drawings="drawings"
        :scale="scale"
        :preview="drawingPreview"
        :interactive="drawingsInteractive"
        :selected-id="selectedDrawing"
        :hidden-id="textEdit.open ? textEdit.id : null"
        @select="(id: string) => emit('select-drawing', id)"
        @commit="emit('drawings-commit')"
        @context="(payload: { id: string; x: number; y: number }) => emit('context-drawing', payload)"
        @dblclick="onDrawingDblClick"
      />
      <VLayer :config="{ listening: activeTool === 'select' }">
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
          <VGroup
            v-for="bar in group.bars"
            :key="bar.key"
            @mouseenter="hoverBar = bar.key"
            @mouseleave="hoverBar = null"
            @dblclick="(e: any) => { e.cancelBubble = true }"
            @dbltap="(e: any) => { e.cancelBubble = true }"
          >
            <VRect
              :config="bar.back"
              @mousedown="(e: any) => onBarDown(e, group.id, bar.index)"
              @touchstart="(e: any) => onBarDown(e, group.id, bar.index)"
              @mouseenter="(e: any) => setCursor(e, 'ew-resize')"
              @mouseleave="(e: any) => setCursor(e, '')"
            />
            <VRect :config="bar.fill" />
            <VText :config="bar.text" />
            <template v-if="editable && hoverBar === bar.key">
              <VRect
                :config="bar.minus.rect"
                @mousedown="(e: any) => onBarStep(e, group.id, bar.index, -1)"
                @touchstart="(e: any) => onBarStep(e, group.id, bar.index, -1)"
                @mouseenter="(e: any) => setCursor(e, 'pointer')"
                @mouseleave="(e: any) => setCursor(e, '')"
              />
              <VText :config="bar.minus.text" />
              <VRect
                :config="bar.plus.rect"
                @mousedown="(e: any) => onBarStep(e, group.id, bar.index, 1)"
                @touchstart="(e: any) => onBarStep(e, group.id, bar.index, 1)"
                @mouseenter="(e: any) => setCursor(e, 'pointer')"
                @mouseleave="(e: any) => setCursor(e, '')"
              />
              <VText :config="bar.plus.text" />
            </template>
          </VGroup>
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
      <EditorStagePings :pings="pings" :scale="scale" />
    </VStage>
    <!-- Campo do texto em digitação (contra-zoom, como o canvas: 1 px aqui = 1 px de tela). -->
    <div v-if="textEdit.open" class="text-layer">
      <textarea
        ref="textAreaRef"
        v-model="textEdit.value"
        class="text-edit"
        :style="textEditStyle"
        spellcheck="false"
        aria-label="Texto do desenho"
        @keydown="onTextKeydown"
        @blur="commitText"
      />
    </div>
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
.text-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  zoom: calc(1 / var(--ui-scale, 1));
}
/* Mesmo tamanho e fonte do texto no canvas (por isso px calculados, fora da escala de --fs-*). */
.text-edit {
  position: absolute;
  pointer-events: auto;
  margin: 0;
  padding: 0 2px;
  border: 1px dashed #000080;
  background: rgba(255, 255, 255, 0.5);
  font-family: var(--font-ui);
  white-space: pre;
  overflow: hidden;
  resize: none;
  outline: none;
  box-shadow: none;
}
.editor-stage :deep(.konvajs-content) {
  background: var(--c-shadow);
}
</style>
