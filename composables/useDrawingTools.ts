import type { Ref } from 'vue'
import {
  MAX_POINTS, drawingColor, newDrawingId, paintDrawing, shapeColors,
  type DrawStyle, type DrawingTool, type SceneDrawing,
} from '~~/lib/drawings'

type Point = { x: number; y: number }

export type DrawingToolsOptions = {
  /** Nó Konva do Stage. */
  stage: () => any
  drawings: Ref<SceneDrawing[]>
  tool: () => DrawingTool
  style: () => DrawStyle
  scale: () => number
  /** Uma alteração terminou (histórico/transmissão). */
  onCommit: () => void
  onPoint: (point: Point) => void
  /** Conta-gotas: cor pega com o botão esquerdo (primária) ou direito (secundária). */
  onPick: (color: string, button: 'primary' | 'secondary') => void
  /** Ferramenta Texto: abre o campo de digitação nesse ponto do mapa. */
  onText: (point: Point) => void
}

const round = (n: number) => Math.round(n * 10) / 10

/**
 * Interação das ferramentas de desenho sobre o canvas (tudo menos Selecionar, que é o modo normal
 * do Stage). O Stage chama `down()` no mousedown/touchstart; o resto do gesto é ouvido na janela
 * do navegador (como o arraste da câmera), então soltar fora do canvas também termina o desenho.
 * Coordenadas: px do canvas = px de tela (o canvas tem contra-zoom), convertidos para o mapa pela
 * transformação do Stage.
 */
export function useDrawingTools(options: DrawingToolsOptions) {
  /** Desenho em andamento (renderizado por cima, ainda fora de `drawings`). */
  const preview = ref<SceneDrawing | null>(null)

  let start: Point | null = null
  let erased = false

  function canvasPoint(clientX: number, clientY: number): Point | null {
    const stage = options.stage()
    if (!stage) return null
    const rect = stage.container().getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  function toMap(clientX: number, clientY: number): Point | null {
    const stage = options.stage()
    const p = canvasPoint(clientX, clientY)
    if (!stage || !p) return null
    return stage.getAbsoluteTransform().copy().invert().point(p)
  }

  /** Desenho sob o ponteiro (o de cima), ou null. */
  function drawingAt(clientX: number, clientY: number): SceneDrawing | null {
    const stage = options.stage()
    const p = canvasPoint(clientX, clientY)
    if (!stage || !p) return null
    const shape = stage.getIntersection(p)
    if (!shape || shape.name() !== 'drawing') return null
    const id = String(shape.id()).replace(/^drawing-/, '')
    return options.drawings.value.find(d => d.id === id) ?? null
  }

  function eventPoint(evt: MouseEvent | TouchEvent) {
    return 'touches' in evt ? (evt.touches[0] ?? evt.changedTouches[0]) : evt
  }

  function newDrawing(kind: SceneDrawing['kind'], at: Point, extra: Partial<SceneDrawing>): SceneDrawing {
    const style = options.style()
    return {
      id: newDrawingId(),
      kind,
      x: round(at.x),
      y: round(at.y),
      stroke: style.primary,
      fill: null,
      strokeWidth: style.strokeWidth,
      ...extra,
    }
  }

  /** Atualiza a prévia com a posição atual do ponteiro. */
  function update(current: Point, shift: boolean) {
    const d = preview.value
    if (!d || !start) return
    let dx = current.x - start.x
    let dy = current.y - start.y

    if (d.kind === 'pen') {
      const points = d.points!
      const lx = points[points.length - 2]!
      const ly = points[points.length - 1]!
      // Só guarda pontos a pelo menos 2 px de tela do anterior (traço leve, sem perder forma).
      if (Math.hypot(dx - lx, dy - ly) >= 2 / options.scale() && points.length < MAX_POINTS * 2) {
        points.push(round(dx), round(dy))
      }
      return
    }

    if (d.kind === 'line' || d.kind === 'arrow') {
      if (shift) {
        // Trava em múltiplos de 45°.
        const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4)
        const length = Math.hypot(dx, dy)
        dx = Math.cos(angle) * length
        dy = Math.sin(angle) * length
      }
      d.points = [0, 0, round(dx), round(dy)]
      return
    }

    // Formas pela caixa arrastada; Shift = quadrado / círculo / triângulo equilátero.
    let w = Math.abs(dx)
    let h = Math.abs(dy)
    if (shift) {
      if (d.kind === 'triangle') h = w * Math.sqrt(3) / 2
      else w = h = Math.max(w, h)
    }
    d.x = round(dx < 0 ? start.x - w : start.x)
    d.y = round(dy < 0 ? start.y - h : start.y)
    d.width = round(w)
    d.height = round(h)
  }

  /** Grande o bastante para virar um desenho (cliques sem arraste são descartados). */
  function bigEnough(d: SceneDrawing): boolean {
    const min = 3 / options.scale()
    if (d.kind === 'pen') return true
    if (d.kind === 'line' || d.kind === 'arrow') {
      const [, , x2 = 0, y2 = 0] = d.points ?? []
      return Math.hypot(x2, y2) >= min
    }
    return (d.width ?? 0) >= min && (d.height ?? 0) >= min
  }

  function eraseAt(clientX: number, clientY: number) {
    const target = drawingAt(clientX, clientY)
    if (!target) return
    options.drawings.value = options.drawings.value.filter(d => d !== target)
    erased = true
  }

  function onMove(evt: MouseEvent | TouchEvent) {
    const point = eventPoint(evt)
    if (!point) return
    if (options.tool() === 'eraser') {
      eraseAt(point.clientX, point.clientY)
      return
    }
    const current = toMap(point.clientX, point.clientY)
    if (current) update(current, evt.shiftKey)
  }

  function onUp() {
    stopListening()
    if (options.tool() === 'eraser') {
      if (erased) options.onCommit()
      erased = false
      return
    }
    const d = preview.value
    preview.value = null
    start = null
    if (!d) return
    if (d.kind === 'pen' && d.points!.length === 2) {
      // Clique sem arraste: um ponto (segmento mínimo com ponta redonda).
      d.points!.push(0.1, 0)
    }
    if (!bigEnough(d)) return
    options.drawings.value = [...options.drawings.value, d]
    options.onCommit()
  }

  function listen() {
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
  }

  function stopListening() {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('touchend', onUp)
  }

  /** Início de um gesto com uma ferramenta de desenho. `button`: 0 esquerdo, 2 direito. */
  function down(evt: MouseEvent | TouchEvent, button: number) {
    const point = eventPoint(evt)
    if (!point) return
    const at = toMap(point.clientX, point.clientY)
    if (!at) return
    const tool = options.tool()
    const style = options.style()

    if (tool === 'fill' || tool === 'picker') {
      const target = drawingAt(point.clientX, point.clientY)
      if (!target) return
      const which = button === 2 ? 'secondary' : 'primary'
      if (tool === 'picker') {
        options.onPick(drawingColor(target), which)
      } else {
        paintDrawing(target, which === 'primary' ? style.primary : style.secondary)
        options.onCommit()
      }
      return
    }

    if (button !== 0) return

    switch (tool) {
      case 'point':
        options.onPoint({ x: round(at.x), y: round(at.y) })
        return
      case 'text':
        // Sem isto o clique tira o foco do campo que acabou de abrir (e o fecha vazio).
        if (evt.cancelable) evt.preventDefault()
        options.onText({ x: round(at.x), y: round(at.y) })
        return
      case 'eraser':
        erased = false
        eraseAt(point.clientX, point.clientY)
        listen()
        return
      case 'pen':
      case 'line':
      case 'arrow':
        start = at
        preview.value = newDrawing(tool, at, { points: [0, 0] })
        if (tool !== 'pen') preview.value.points = [0, 0, 0, 0]
        listen()
        return
      case 'rect':
      case 'ellipse':
      case 'triangle':
        start = at
        preview.value = newDrawing(tool, at, { ...shapeColors(style), width: 0, height: 0 })
        listen()
        return
    }
  }

  onBeforeUnmount(stopListening)

  return { preview, down, drawingAt, toMap }
}

