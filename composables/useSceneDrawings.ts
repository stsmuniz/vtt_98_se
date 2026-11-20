import type { Ref } from 'vue'
import type { MenuItemDef } from '~/utils/menu'
import type { ShortcutMap } from '~~/composables/useWindowManager'
import { useDialog } from '~~/composables/useDialog'
import { useDrawingHistory } from '~~/composables/useDrawingHistory'
import {
  DEFAULT_DRAW_STYLE, DRAWING_TOOL_KEYS, cloneDrawings, newDrawingId, sanitizeDrawings,
  type DrawStyle, type DrawingTool, type SceneDrawing, type TextFont,
} from '~~/lib/drawings'

type Options = {
  /** Desenhos da página (os mesmos objetos passados ao `<EditorStage v-model:drawings>`). */
  drawings: Ref<SceneDrawing[]>
  /** Pode desenhar agora? (na sala, só o mestre). */
  canEdit: () => boolean
  /** Ferramenta Apontar disponível (só na sala). */
  allowPointer?: boolean
  /** Selecionar um desenho desmarca o token selecionado. */
  clearTokenSelection: () => void
}

/**
 * Estado e ações de desenho compartilhados pelo editor de cenas e pela sala: ferramenta e estilo
 * atuais, desenho selecionado, desfazer/refazer, itens de menu (Editar e clique direito numa
 * forma) e os atalhos de teclado das ferramentas.
 */
export function useSceneDrawings(options: Options) {
  const dialog = useDialog()
  const tool = ref<DrawingTool>('select')
  const drawStyle = ref<DrawStyle>({ ...DEFAULT_DRAW_STYLE })
  /** Campo de texto aberto no canvas (a caixa de ferramentas mostra as opções de texto). */
  const textEditing = ref(false)

  /** Evento `text-editing` do Stage: abre/fecha o campo; a caixa passa a mostrar a fonte e o tamanho do texto. */
  function onTextEditing(payload: { font: TextFont; fontSize: number } | null) {
    textEditing.value = !!payload
    if (payload && (drawStyle.value.font !== payload.font || drawStyle.value.fontSize !== payload.fontSize)) {
      drawStyle.value = { ...drawStyle.value, font: payload.font, fontSize: payload.fontSize }
    }
  }
  const selectedDrawingId = ref<string | null>(null)
  const toolboxVisible = ref(true)
  const history = useDrawingHistory(options.drawings)

  /** Ferramenta antes do conta-gotas (para onde ele volta depois de pegar a cor). */
  let beforePicker: DrawingTool = 'select'
  watch(tool, (next, previous) => {
    if (next === 'picker' && previous !== 'picker') beforePicker = previous
    if (next !== 'select') selectedDrawingId.value = null
  })

  const selectedDrawing = computed(() => options.drawings.value.find(d => d.id === selectedDrawingId.value) ?? null)

  // A forma selecionada pode sumir (desfazer, borracha, outra cena): desmarca.
  watch(() => options.drawings.value, (list) => {
    if (selectedDrawingId.value && !list.some(d => d.id === selectedDrawingId.value)) selectedDrawingId.value = null
  })

  function selectDrawing(id: string | null) {
    selectedDrawingId.value = id
    if (id) options.clearTokenSelection()
  }

  function commit() {
    history.commit()
  }

  /**
   * Troca o conjunto inteiro (abriu a cena, chegou outro snapshot) e recomeça o histórico. Não faz
   * nada se o conteúdo for o mesmo — o servidor devolve os desenhos normalizados (sem `rotation: 0`,
   * números arredondados), então a comparação é feita sobre a versão normalizada dos locais.
   */
  function load(list: SceneDrawing[] | null | undefined) {
    const incoming = JSON.stringify(list ?? [])
    let current: string
    try {
      current = JSON.stringify(sanitizeDrawings(options.drawings.value))
    } catch {
      current = JSON.stringify(options.drawings.value)
    }
    if (incoming === current) return
    options.drawings.value = cloneDrawings(list)
    history.resetIfChanged()
  }

  function onPickColor(color: string, which: 'primary' | 'secondary') {
    drawStyle.value = { ...drawStyle.value, [which]: color }
    tool.value = beforePicker === 'picker' ? 'select' : beforePicker
  }

  function deleteSelected() {
    const target = selectedDrawing.value
    if (!target) return
    options.drawings.value = options.drawings.value.filter(d => d !== target)
    selectedDrawingId.value = null
    commit()
  }

  function duplicateSelected() {
    const target = selectedDrawing.value
    if (!target) return
    const copy: SceneDrawing = { ...cloneDrawings([target])[0]!, id: newDrawingId(), x: target.x + 16, y: target.y + 16 }
    options.drawings.value = [...options.drawings.value, copy]
    selectedDrawingId.value = copy.id
    commit()
  }

  /** Muda a ordem dentro da camada de desenhos (sempre abaixo dos tokens). */
  function reorder(toFront: boolean) {
    const target = selectedDrawing.value
    if (!target) return
    const rest = options.drawings.value.filter(d => d !== target)
    options.drawings.value = toFront ? [...rest, target] : [target, ...rest]
    commit()
  }

  async function clearAll() {
    if (!options.drawings.value.length) return
    const ok = await dialog.confirm('Apagar todos os desenhos? (Dá para desfazer com Ctrl+Z.)', { title: 'Limpar desenhos', icon: 'warning' })
    if (!ok) return
    options.drawings.value = []
    selectedDrawingId.value = null
    commit()
  }

  function undo() {
    selectedDrawingId.value = null
    history.undo()
  }

  function redo() {
    selectedDrawingId.value = null
    history.redo()
  }

  /** Itens do menu Editar (antes dos itens de token). */
  const editMenuItems = computed<MenuItemDef[]>(() => [
    { id: 'desfazer', label: '&Desfazer desenho', icon: 'draw-undo', shortcut: 'Ctrl+Z', disabled: !history.canUndo.value, action: undo },
    { id: 'refazer', label: '&Refazer desenho', icon: 'draw-redo', shortcut: 'Ctrl+Y', disabled: !history.canRedo.value, action: redo },
    { type: 'separator' },
    ...(selectedDrawing.value ? [...drawingContextItems.value, { type: 'separator' as const }] : []),
    { id: 'limpar-desenhos', label: '&Limpar desenhos…', icon: 'draw-clear', disabled: !options.drawings.value.length, action: clearAll },
  ])

  /** Clique direito numa forma (e parte do menu Editar quando há uma selecionada). */
  const drawingContextItems = computed<MenuItemDef[]>(() => [
    { id: 'desenho-duplicar', label: 'D&uplicar desenho', icon: 'copy', action: duplicateSelected },
    { id: 'desenho-frente', label: 'Trazer para a &frente', action: () => reorder(true) },
    { id: 'desenho-tras', label: 'Enviar para &trás', action: () => reorder(false) },
    { type: 'separator' },
    { id: 'desenho-excluir', label: '&Excluir desenho', icon: 'delete', shortcut: 'Del', action: deleteSelected },
  ])

  /** Item marcável do menu Exibir. */
  const toolboxMenuItem = computed<MenuItemDef>(() => ({
    id: 'caixa-ferramentas',
    type: 'check',
    label: 'Cai&xa de ferramentas',
    checked: toolboxVisible.value,
    action: () => { toolboxVisible.value = !toolboxVisible.value },
  }))

  /** Menu de contexto de uma forma. */
  const contextMenu = reactive({ show: false, x: 0, y: 0 })
  function openContextMenu(payload: { id: string; x: number; y: number }) {
    selectDrawing(payload.id)
    Object.assign(contextMenu, { show: true, x: payload.x, y: payload.y })
  }

  /** Atalhos das ferramentas (mesclados aos da página em `routeWindow.shortcuts`). */
  const shortcuts: ShortcutMap = {
    'ctrl+z': () => { if (options.canEdit()) undo() },
    'ctrl+y': () => { if (options.canEdit()) redo() },
    'ctrl+shift+z': () => { if (options.canEdit()) redo() },
    escape: () => {
      if (!options.canEdit()) return
      if (tool.value !== 'select') tool.value = 'select'
      else selectedDrawingId.value = null
    },
  }
  for (const [key, value] of Object.entries(DRAWING_TOOL_KEYS)) {
    if (value === 'point' && !options.allowPointer) continue
    shortcuts[key] = () => { if (options.canEdit()) tool.value = value }
  }

  return {
    tool,
    drawStyle,
    textEditing,
    onTextEditing,
    selectedDrawingId,
    selectedDrawing,
    toolboxVisible,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    commit,
    load,
    resetHistory: history.reset,
    selectDrawing,
    onPickColor,
    deleteSelected,
    undo,
    redo,
    clearAll,
    editMenuItems,
    drawingContextItems,
    toolboxMenuItem,
    contextMenu,
    openContextMenu,
    shortcuts,
  }
}
