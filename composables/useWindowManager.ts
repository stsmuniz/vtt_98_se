/**
 * Gerenciador de janelas da área de trabalho.
 *
 * Estado serializável em `useState('wm')` (sobrevive à troca de página, já que
 * o layout `desktop` continua montado entre /dashboard, o editor e a sala).
 * O que não é serializável — atalhos de teclado e handlers de "antes de fechar"
 * — fica em Maps de módulo, só no cliente.
 *
 * Tipos de janela:
 *   app    — aberta pelo registry (`open(appId, props)`), renderizada pelo WindowLayer
 *   route  — a página atual (editor de cena, sala), sempre id 'route'
 *   inline — janela declarada por um componente (iniciativa, propriedades do token)
 */
import type { IconName } from '~/utils/icons'

export type WinState = 'normal' | 'minimized' | 'maximized'
export type WinKind = 'app' | 'route' | 'inline'

export interface Rect { x: number; y: number; w: number; h: number }

export interface WinEntry {
  id: string
  kind: WinKind
  appId?: string
  props?: Record<string, unknown>
  title: string
  icon: IconName
  rect: Rect
  restoreRect?: Rect
  state: WinState
  z: number
  /** Janela "dona" (ex.: 'route'): ao fechar a dona, as filhas fecham junto. */
  ownerId?: string
  resizable: boolean
  minimizable: boolean
  maximizable: boolean
  inTaskbar: boolean
  minSize: { w: number; h: number }
  variant: 'window' | 'dialog' | 'tool'
}

interface WmState {
  windows: Record<string, WinEntry>
  /** Ordem de abertura (botões da barra de tarefas). */
  order: string[]
  activeId: string | null
  zTop: number
  /** Posição da última janela aberta, para abrir as próximas em cascata. */
  cascade: { x: number; y: number } | null
  /** Tamanho atual da área útil (sem a barra de tarefas). */
  area: { w: number; h: number }
}

export type ShortcutHandler = (event: KeyboardEvent) => unknown
export interface ShortcutDef { run: ShortcutHandler; allowInInput?: boolean }
export type ShortcutMap = Record<string, ShortcutHandler | ShortcutDef>

export interface OpenOptions {
  id?: string
  title?: string
  icon?: IconName
  rect?: Partial<Rect>
  state?: WinState
  ownerId?: string
  resizable?: boolean
  minimizable?: boolean
  maximizable?: boolean
  inTaskbar?: boolean
  minSize?: { w: number; h: number }
  variant?: WinEntry['variant']
}

const CASCADE_STEP = 24
const Z_RENUMBER_AT = 5000
/** Abaixo desta largura toda janela abre maximizada. */
export const MOBILE_BREAKPOINT = 768

// ----- partes não serializáveis (só cliente) -----
const shortcutsById = new Map<string, ShortcutMap>()
const beforeCloseById = new Map<string, () => boolean | Promise<boolean>>()
const keyHandlerById = new Map<string, (event: KeyboardEvent) => boolean>()

/** Normaliza um evento para o formato das chaves de atalho: 'ctrl+shift+s', 'delete', 'f2'. */
export function eventToShortcut(event: KeyboardEvent): string {
  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) parts.push('ctrl')
  if (event.altKey) parts.push('alt')
  if (event.shiftKey) parts.push('shift')
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase()
  if (!['control', 'meta', 'alt', 'shift'].includes(key)) parts.push(key)
  return parts.join('+')
}

export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable
}

export function useWindowManager() {
  const state = useState<WmState>('wm', () => ({
    windows: {},
    order: [],
    activeId: null,
    zTop: 0,
    cascade: null,
    area: { w: 1024, h: 700 },
  }))

  const windows = computed(() => state.value.order.map(id => state.value.windows[id]).filter((w): w is WinEntry => Boolean(w)))
  const active = computed(() => (state.value.activeId ? state.value.windows[state.value.activeId] ?? null : null))
  const isMobile = computed(() => state.value.area.w < MOBILE_BREAKPOINT)

  function get(id: string) {
    return state.value.windows[id]
  }

  function nextZ() {
    if (state.value.zTop >= Z_RENUMBER_AT) {
      // Renumera mantendo a ordem relativa, para o z-index não crescer sem limite.
      const sorted = Object.values(state.value.windows).sort((a, b) => a.z - b.z)
      sorted.forEach((w, i) => { w.z = i + 1 })
      state.value.zTop = sorted.length
    }
    return ++state.value.zTop
  }

  function clampRect(rect: Rect, entry?: Pick<WinEntry, 'minSize'>): Rect {
    const { w: aw, h: ah } = state.value.area
    const min = entry?.minSize ?? { w: 200, h: 120 }
    const w = Math.max(min.w, Math.min(rect.w, aw))
    const h = Math.max(min.h, Math.min(rect.h, ah))
    // A barra de título precisa continuar alcançável.
    const x = Math.max(-w + 80, Math.min(rect.x, aw - 80))
    const y = Math.max(0, Math.min(rect.y, ah - 24))
    return { x, y, w, h }
  }

  function cascadeRect(w: number, h: number): Rect {
    const { w: aw, h: ah } = state.value.area
    let x = state.value.cascade ? state.value.cascade.x + CASCADE_STEP : Math.max(8, (aw - w) / 2 - 120)
    let y = state.value.cascade ? state.value.cascade.y + CASCADE_STEP : Math.max(8, (ah - h) / 2 - 80)
    if (x + w > aw || y + h > ah) {
      x = 16
      y = 16
    }
    state.value.cascade = { x, y }
    return { x: Math.round(x), y: Math.round(y), w, h }
  }

  /** Cria (ou atualiza) uma entrada. Usado pelo `open` do registry e por janelas route/inline. */
  function register(id: string, kind: WinKind, opts: OpenOptions & { title: string; icon: IconName; appId?: string; props?: Record<string, unknown> }) {
    const existing = state.value.windows[id]
    if (existing) {
      Object.assign(existing, {
        title: opts.title,
        icon: opts.icon,
        props: opts.props ?? existing.props,
      })
      focus(id)
      return existing
    }
    const size = { w: opts.rect?.w ?? 640, h: opts.rect?.h ?? 460 }
    const base = opts.rect?.x !== undefined && opts.rect?.y !== undefined
      ? { x: opts.rect.x, y: opts.rect.y, ...size }
      : cascadeRect(size.w, size.h)
    const entry: WinEntry = {
      id,
      kind,
      appId: opts.appId,
      props: opts.props,
      title: opts.title,
      icon: opts.icon,
      rect: clampRect(base, { minSize: opts.minSize ?? { w: 200, h: 120 } }),
      state: opts.state ?? 'normal',
      z: nextZ(),
      ownerId: opts.ownerId,
      resizable: opts.resizable ?? true,
      minimizable: opts.minimizable ?? true,
      maximizable: opts.maximizable ?? (opts.resizable ?? true),
      inTaskbar: opts.inTaskbar ?? true,
      minSize: opts.minSize ?? { w: 200, h: 120 },
      variant: opts.variant ?? 'window',
    }
    if (entry.state === 'normal' && isMobile.value && entry.maximizable) entry.state = 'maximized'
    state.value.windows[id] = entry
    state.value.order.push(id)
    state.value.activeId = id
    return entry
  }

  function unregister(id: string) {
    if (!state.value.windows[id]) return
    // Fecha as janelas que pertencem a esta.
    for (const w of Object.values(state.value.windows)) {
      if (w.ownerId === id) unregister(w.id)
    }
    delete state.value.windows[id]
    state.value.order = state.value.order.filter(x => x !== id)
    shortcutsById.delete(id)
    beforeCloseById.delete(id)
    keyHandlerById.delete(id)
    if (state.value.activeId === id) activateTopmost()
  }

  /** Consulta o "antes de fechar" da janela (ex.: alterações não salvas). */
  async function canClose(id: string): Promise<boolean> {
    const guard = beforeCloseById.get(id)
    return guard ? Boolean(await guard()) : true
  }

  /** Fecha respeitando o "antes de fechar". Retorna se fechou. */
  async function close(id: string): Promise<boolean> {
    if (!(await canClose(id))) return false
    unregister(id)
    return true
  }

  function closeOwnedBy(ownerId: string) {
    for (const w of Object.values(state.value.windows)) {
      if (w.ownerId === ownerId) unregister(w.id)
    }
  }

  function activateTopmost() {
    const visible = Object.values(state.value.windows)
      .filter(w => w.state !== 'minimized')
      .sort((a, b) => b.z - a.z)
    state.value.activeId = visible[0]?.id ?? null
  }

  function focus(id: string) {
    const w = state.value.windows[id]
    if (!w) return
    if (w.state === 'minimized') w.state = w.restoreRect ? 'maximized' : 'normal'
    if (state.value.activeId !== id || w.z !== state.value.zTop) w.z = nextZ()
    state.value.activeId = id
  }

  function blurAll() {
    state.value.activeId = null
  }

  function minimize(id: string) {
    const w = state.value.windows[id]
    if (!w || !w.minimizable) return
    // Guarda se estava maximizada para restaurar no mesmo estado.
    if (w.state === 'maximized') w.restoreRect = w.restoreRect ?? { ...w.rect }
    else w.restoreRect = undefined
    w.state = 'minimized'
    if (state.value.activeId === id) activateTopmost()
  }

  function maximize(id: string) {
    const w = state.value.windows[id]
    if (!w || !w.maximizable) return
    w.restoreRect = { ...w.rect }
    w.state = 'maximized'
    focus(id)
  }

  function restore(id: string) {
    const w = state.value.windows[id]
    if (!w) return
    if (w.state === 'maximized' && !isMobile.value) {
      w.state = 'normal'
      if (w.restoreRect) w.rect = clampRect(w.restoreRect, w)
      w.restoreRect = undefined
    } else if (w.state === 'minimized') {
      w.state = w.restoreRect ? 'maximized' : 'normal'
    }
    focus(id)
  }

  function toggleMaximize(id: string) {
    const w = state.value.windows[id]
    if (!w) return
    if (w.state === 'maximized') restore(id)
    else maximize(id)
  }

  /** Clique no botão da barra de tarefas: minimiza a ativa, restaura/foca as outras. */
  function toggleFromTaskbar(id: string) {
    const w = state.value.windows[id]
    if (!w) return
    if (w.state === 'minimized') focus(id)
    else if (state.value.activeId === id) minimize(id)
    else focus(id)
  }

  function move(id: string, x: number, y: number) {
    const w = state.value.windows[id]
    if (!w || w.state !== 'normal') return
    w.rect = clampRect({ ...w.rect, x, y }, w)
  }

  function resize(id: string, rect: Rect) {
    const w = state.value.windows[id]
    if (!w || w.state !== 'normal' || !w.resizable) return
    w.rect = clampRect(rect, w)
  }

  function setTitle(id: string, title: string, icon?: IconName) {
    const w = state.value.windows[id]
    if (!w) return
    w.title = title
    if (icon) w.icon = icon
  }

  /** Janelas visíveis na barra de tarefas, na ordem de abertura. */
  const taskbarWindows = computed(() => windows.value.filter(w => w.inTaskbar))

  /** Ordem para Alt+W: da mais recente (z maior) para a mais antiga. */
  function switchOrder(): WinEntry[] {
    return [...taskbarWindows.value].sort((a, b) => b.z - a.z)
  }

  function setArea(w: number, h: number) {
    const wasMobile = isMobile.value
    state.value.area = { w, h }
    for (const win of Object.values(state.value.windows)) {
      if (win.state === 'normal') {
        if (isMobile.value && !wasMobile && win.maximizable) {
          win.restoreRect = { ...win.rect }
          win.state = 'maximized'
        } else {
          win.rect = clampRect(win.rect, win)
        }
      }
    }
  }

  // ----- atalhos e handlers por janela -----
  function setShortcuts(id: string, map: ShortcutMap | null) {
    if (map) shortcutsById.set(id, map)
    else shortcutsById.delete(id)
  }

  function setBeforeClose(id: string, fn: (() => boolean | Promise<boolean>) | null) {
    if (fn) beforeCloseById.set(id, fn)
    else beforeCloseById.delete(id)
  }

  function setKeyHandler(id: string, fn: ((event: KeyboardEvent) => boolean) | null) {
    if (fn) keyHandlerById.set(id, fn)
    else keyHandlerById.delete(id)
  }

  /** Despacha uma tecla para a janela ativa. Retorna se algum atalho tratou. */
  function dispatchKey(event: KeyboardEvent): boolean {
    const id = state.value.activeId
    if (!id) return false
    const map = shortcutsById.get(id)
    const combo = eventToShortcut(event)
    const entry = map?.[combo]
    if (entry) {
      const def: ShortcutDef = typeof entry === 'function' ? { run: entry } : entry
      if (!def.allowInInput && isTypingTarget(event.target)) return false
      event.preventDefault()
      def.run(event)
      return true
    }
    const handler = keyHandlerById.get(id)
    return handler ? handler(event) : false
  }

  return {
    state,
    windows,
    taskbarWindows,
    active,
    isMobile,
    get,
    register,
    unregister,
    canClose,
    close,
    closeOwnedBy,
    focus,
    blurAll,
    minimize,
    maximize,
    restore,
    toggleMaximize,
    toggleFromTaskbar,
    move,
    resize,
    setTitle,
    setArea,
    switchOrder,
    setShortcuts,
    setBeforeClose,
    setKeyHandler,
    dispatchKey,
  }
}
