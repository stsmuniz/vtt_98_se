/**
 * Desenhos sobre o mapa (cenas e salas): tipos, limites, paleta e a validação compartilhada
 * entre o navegador e o servidor. Cada desenho é um objeto vetorial (camada entre o cenário e
 * os tokens), gravado como JSON na cena (`scenes.drawings`) e no snapshot da sala.
 */

export const DRAWING_KINDS = ['pen', 'line', 'arrow', 'rect', 'ellipse', 'triangle', 'text'] as const
export type DrawingKind = (typeof DRAWING_KINDS)[number]

export type SceneDrawing = {
  id: string
  kind: DrawingKind
  /** Posição do nó no mapa. */
  x: number
  y: number
  rotation?: number
  scaleX?: number
  scaleY?: number
  /** rect / ellipse / triangle: caixa (a elipse é inscrita nela); text: largura da caixa. */
  width?: number
  height?: number
  /** pen / line / arrow: [x1, y1, x2, y2, ...] relativos a x/y. */
  points?: number[]
  text?: string
  fontSize?: number
  /** Fonte do texto (ausente = 'pixel', a fonte do sistema). */
  font?: TextFont
  /** #rrggbb; null = sem contorno. */
  stroke: string | null
  /** #rrggbb; null = sem preenchimento. */
  fill: string | null
  strokeWidth: number
  /** 0..100 (ausente = 100). */
  opacity?: number
}

/** Formas fechadas (têm interior para "Preencher"). */
export const CLOSED_KINDS: ReadonlySet<DrawingKind> = new Set(['rect', 'ellipse', 'triangle'])

export const MAX_DRAWINGS = 500
export const MAX_POINTS = 4000
export const MAX_TEXT = 500
const MAX_COORD = 100_000
const MAX_STROKE = 64
const MIN_FONT = 16
const MAX_FONT = 256

/** Espessuras da caixa de opções (px do mapa). */
export const STROKE_WIDTHS = [2, 4, 8, 16] as const
/** Tamanhos do texto (múltiplos de 16, por causa da fonte pixelada). */
export const FONT_SIZES = [16, 32, 48, 64] as const

/**
 * Fontes da ferramenta Texto. O desenho guarda só o `id`; `family` é a pilha CSS usada no canvas
 * e no campo de digitação (as fontes ficam em public/fonts, ver app/assets/css/fonts.css — todas
 * locais, para o texto sair igual para o mestre e os jogadores em qualquer sistema).
 */
export const TEXT_FONTS = [
  { id: 'pixel', label: 'Pixel (do sistema)', family: '"Pixel Operator", sans-serif' },
  { id: 'sans', label: 'Sem serifa', family: '"Liberation Sans", Arial, sans-serif' },
  { id: 'serif', label: 'Serifada', family: 'Tinos, "Times New Roman", serif' },
  { id: 'comic', label: 'Quadrinhos', family: '"Comic Neue", "Comic Sans MS", cursive' },
  { id: 'mono', label: 'Monoespaçada', family: 'Cousine, "Courier New", monospace' },
  { id: 'cursive', label: 'Cursiva', family: '"Dancing Script", cursive' },
  { id: 'slab', label: 'Serifa quadrada (slab)', family: 'Arvo, Rockwell, serif' },
  { id: 'impact', label: 'Impacto', family: 'Anton, Impact, sans-serif' },
] as const
export type TextFont = (typeof TEXT_FONTS)[number]['id']
export const DEFAULT_TEXT_FONT: TextFont = 'pixel'

export function isTextFont(value: unknown): value is TextFont {
  return TEXT_FONTS.some(f => f.id === value)
}

/** Pilha CSS da fonte de um texto (padrão: Pixel Operator). */
export function textFontFamily(font: unknown): string {
  return (TEXT_FONTS.find(f => f.id === font) ?? TEXT_FONTS[0]).family
}

/** Estilo de preenchimento das formas, como na caixa de opções do Paint. */
export type ShapeStyle = 'outline' | 'both' | 'fill'

/** As 28 cores da paleta padrão do Paint do Windows 98 (2 linhas de 14). */
export const PAINT_PALETTE = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080',
  '#800080', '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff',
  '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040',
] as const

const COLOR_RE = /^#[0-9a-f]{6}$/i

export function isDrawingColor(value: unknown): value is string {
  return typeof value === 'string' && COLOR_RE.test(value)
}

function fail(message: string): never {
  throw new Error(message)
}

function num(value: unknown, label: string, min = -MAX_COORD, max = MAX_COORD): number {
  const n = Number(value)
  if (typeof value === 'boolean' || value === null || value === '' || !Number.isFinite(n)) fail(`Desenho inválido: ${label}.`)
  return Math.round(Math.min(max, Math.max(min, n)) * 10) / 10
}

function optNum(value: unknown, label: string, min?: number, max?: number): number | undefined {
  return value === undefined ? undefined : num(value, label, min, max)
}

function color(value: unknown, label: string): string | null {
  if (value === null || value === undefined) return null
  if (!isDrawingColor(value)) fail(`Desenho inválido: cor (${label}).`)
  return value.toLowerCase()
}

/**
 * Valida e normaliza uma lista de desenhos vinda de fora (corpo de requisição, snapshot):
 * descarta campos desconhecidos, arredonda números a 1 casa e aplica os limites. Lança `Error`
 * com mensagem em português se algo estiver errado.
 */
export function sanitizeDrawings(value: unknown): SceneDrawing[] {
  if (value === null || value === undefined) return []
  if (!Array.isArray(value)) fail('Desenhos inválidos.')
  if (value.length > MAX_DRAWINGS) fail(`Limite de ${MAX_DRAWINGS} desenhos por cena.`)
  const seen = new Set<string>()
  return value.map((raw): SceneDrawing => {
    if (!raw || typeof raw !== 'object') fail('Desenho inválido.')
    const d = raw as Record<string, unknown>
    const kind = d.kind as DrawingKind
    if (!DRAWING_KINDS.includes(kind)) fail('Desenho inválido: tipo.')
    const id = typeof d.id === 'string' && d.id.length > 0 && d.id.length <= 64 ? d.id : fail('Desenho inválido: id.')
    if (seen.has(id)) fail('Desenho inválido: id repetido.')
    seen.add(id)

    const drawing: SceneDrawing = {
      id,
      kind,
      x: num(d.x, 'x'),
      y: num(d.y, 'y'),
      stroke: color(d.stroke, 'contorno'),
      fill: color(d.fill, 'preenchimento'),
      strokeWidth: num(d.strokeWidth ?? 0, 'espessura', 0, MAX_STROKE),
    }
    const rotation = optNum(d.rotation, 'rotação', -360, 360)
    const scaleX = optNum(d.scaleX, 'escala', -100, 100)
    const scaleY = optNum(d.scaleY, 'escala', -100, 100)
    const opacity = optNum(d.opacity, 'opacidade', 0, 100)
    if (rotation) drawing.rotation = rotation
    if (scaleX !== undefined && scaleX !== 1) drawing.scaleX = scaleX
    if (scaleY !== undefined && scaleY !== 1) drawing.scaleY = scaleY
    if (opacity !== undefined && opacity !== 100) drawing.opacity = opacity

    if (kind === 'pen' || kind === 'line' || kind === 'arrow') {
      if (!Array.isArray(d.points) || d.points.length < 2 || d.points.length % 2 !== 0) fail('Desenho inválido: pontos.')
      if (d.points.length > MAX_POINTS * 2) fail(`Traço longo demais (máximo de ${MAX_POINTS} pontos).`)
      drawing.points = d.points.map(p => num(p, 'ponto'))
    } else {
      drawing.width = num(d.width ?? 0, 'largura', 0)
      drawing.height = num(d.height ?? 0, 'altura', 0)
    }

    if (kind === 'text') {
      if (typeof d.text !== 'string' || !d.text.trim()) fail('Desenho inválido: texto vazio.')
      if (d.text.length > MAX_TEXT) fail(`Texto longo demais (máximo de ${MAX_TEXT} caracteres).`)
      drawing.text = d.text
      drawing.fontSize = num(d.fontSize ?? 32, 'tamanho da fonte', MIN_FONT, MAX_FONT)
      if (d.font !== undefined && !isTextFont(d.font)) fail('Desenho inválido: fonte.')
      if (d.font && d.font !== DEFAULT_TEXT_FONT) drawing.font = d.font as TextFont
    }

    if (!drawing.stroke && !drawing.fill) fail('Desenho inválido: sem cor.')
    return drawing
  })
}

/** Cópia profunda (os desenhos são JSON puro). */
export function cloneDrawings(drawings: readonly SceneDrawing[] | null | undefined): SceneDrawing[] {
  return JSON.parse(JSON.stringify(drawings ?? []))
}

export function newDrawingId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// ---------- ferramentas (cliente) ----------

export type DrawingTool =
  | 'select' | 'point' | 'pen' | 'eraser' | 'line' | 'arrow'
  | 'rect' | 'ellipse' | 'triangle' | 'text' | 'fill' | 'picker'

/** Opções correntes da caixa de ferramentas. */
export type DrawStyle = {
  /** Cor primária (botão esquerdo): contorno, traço, texto. */
  primary: string
  /** Cor secundária (botão direito): preenchimento das formas. */
  secondary: string
  strokeWidth: number
  shapeStyle: ShapeStyle
  fontSize: number
  font: TextFont
}

export const DEFAULT_DRAW_STYLE: DrawStyle = {
  primary: '#000000',
  secondary: '#ffffff',
  strokeWidth: 4,
  shapeStyle: 'outline',
  fontSize: 32,
  font: DEFAULT_TEXT_FONT,
}

/** Normaliza um estilo salvo (localStorage), caindo no padrão no que estiver estranho. */
export function sanitizeDrawStyle(value: unknown): DrawStyle {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<DrawStyle>
  return {
    primary: isDrawingColor(v.primary) ? v.primary : DEFAULT_DRAW_STYLE.primary,
    secondary: isDrawingColor(v.secondary) ? v.secondary : DEFAULT_DRAW_STYLE.secondary,
    strokeWidth: (STROKE_WIDTHS as readonly number[]).includes(Number(v.strokeWidth)) ? Number(v.strokeWidth) : DEFAULT_DRAW_STYLE.strokeWidth,
    shapeStyle: v.shapeStyle === 'both' || v.shapeStyle === 'fill' ? v.shapeStyle : 'outline',
    fontSize: (FONT_SIZES as readonly number[]).includes(Number(v.fontSize)) ? Number(v.fontSize) : DEFAULT_DRAW_STYLE.fontSize,
    font: isTextFont(v.font) ? v.font : DEFAULT_TEXT_FONT,
  }
}

/** Contorno e preenchimento de uma forma fechada nova, conforme o estilo (como no Paint). */
export function shapeColors(style: DrawStyle): { stroke: string | null; fill: string | null } {
  if (style.shapeStyle === 'fill') return { stroke: null, fill: style.primary }
  if (style.shapeStyle === 'both') return { stroke: style.primary, fill: style.secondary }
  return { stroke: style.primary, fill: null }
}

/** Cor "principal" de um desenho (conta-gotas): interior das formas preenchidas, senão o traço. */
export function drawingColor(drawing: SceneDrawing): string {
  if (drawing.kind === 'text') return drawing.fill ?? drawing.stroke ?? '#000000'
  if (CLOSED_KINDS.has(drawing.kind)) return drawing.fill ?? drawing.stroke ?? '#000000'
  return drawing.stroke ?? drawing.fill ?? '#000000'
}

/** Ferramenta Preencher: pinta o interior das formas fechadas e a cor de traços/linhas/textos. */
export function paintDrawing(drawing: SceneDrawing, color: string) {
  if (drawing.kind === 'text') drawing.fill = color
  else if (CLOSED_KINDS.has(drawing.kind)) drawing.fill = color
  else drawing.stroke = color
}

// ---------- Apontar ----------

/** Um apontamento do mestre (ferramenta Apontar), como a animação o usa. */
export type StagePing = {
  id: string
  /** Ponto no mapa. */
  x: number
  y: number
  /** Nome de quem apontou. */
  by: string
  /** `performance.now()` de quando chegou neste navegador (relógios de máquinas diferentes não batem). */
  at: number
}

/** Duração total da animação do Apontar (depois disso o ping é descartado). */
export const PING_DURATION_MS = 1600

/** Atalhos de teclado das ferramentas (tecla minúscula -> ferramenta), como as letras do Paint. */
export const DRAWING_TOOL_KEYS: Record<string, DrawingTool> = {
  s: 'select', a: 'point', p: 'pen', e: 'eraser', l: 'line', w: 'arrow',
  r: 'rect', o: 'ellipse', t: 'triangle', x: 'text', f: 'fill', i: 'picker',
}
