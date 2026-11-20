import type { Ref } from 'vue'
import type { SceneDrawing } from '~~/lib/drawings'

const LIMIT = 100

/**
 * Desfazer/refazer dos desenhos (só dos desenhos — tokens não entram). Guarda cópias
 * serializadas do array inteiro: `baseline` é o último estado confirmado; cada `commit()` (chamado
 * DEPOIS de uma alteração terminada: criar, mover, recolorir, apagar, limpar...) empilha o estado
 * anterior. Local à sessão: recarregar a página zera o histórico.
 */
export function useDrawingHistory(drawings: Ref<SceneDrawing[]>) {
  const undoStack = ref<string[]>([])
  const redoStack = ref<string[]>([])
  let baseline = JSON.stringify(drawings.value)

  /** Recomeça o histórico a partir do estado atual (abriu a cena, outra cena entrou na sala...). */
  function reset() {
    baseline = JSON.stringify(drawings.value)
    undoStack.value = []
    redoStack.value = []
  }

  /** Recomeça só se o estado atual difere do último confirmado (ex.: snapshot igual após salvar). */
  function resetIfChanged() {
    if (JSON.stringify(drawings.value) !== baseline) reset()
  }

  function commit() {
    const now = JSON.stringify(drawings.value)
    if (now === baseline) return
    undoStack.value.push(baseline)
    if (undoStack.value.length > LIMIT) undoStack.value.shift()
    redoStack.value = []
    baseline = now
  }

  function apply(state: string) {
    baseline = state
    drawings.value = JSON.parse(state)
  }

  function undo() {
    const previous = undoStack.value.pop()
    if (previous === undefined) return
    redoStack.value.push(baseline)
    apply(previous)
  }

  function redo() {
    const next = redoStack.value.pop()
    if (next === undefined) return
    undoStack.value.push(baseline)
    apply(next)
  }

  return {
    canUndo: computed(() => undoStack.value.length > 0),
    canRedo: computed(() => redoStack.value.length > 0),
    commit,
    undo,
    redo,
    reset,
    resetIfChanged,
  }
}
