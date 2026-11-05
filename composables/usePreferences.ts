/**
 * Preferências do usuário no cliente (Configurações e modo de exibição das pastas).
 *
 * - Carrega uma vez de /api/v1/preferences.
 * - Alterações são otimistas: a tela muda na hora e o PATCH vai depois de 500 ms,
 *   juntando o que mudou nesse intervalo.
 * - Um espelho no localStorage faz a área de trabalho já abrir com o papel de
 *   parede/escala certos (sem "piscar" o padrão enquanto a API responde).
 * - Visitantes (sem conta) usam só o localStorage.
 */
import {
  DEFAULT_PREFERENCES, mergeStoredPreferences, resolvePreferences, sanitizePreferences,
  type StoredPreferences, type UserPreferences,
} from '~~/lib/preferences'

const SAVE_DELAY_MS = 500
const LOCAL_KEY = 'vtt98:preferencias'

let pendingPatch: StoredPreferences = {}
let saveTimer: ReturnType<typeof setTimeout> | null = null
let loading: Promise<void> | null = null

function readLocal(): StoredPreferences {
  if (!import.meta.client) return {}
  try {
    return sanitizePreferences(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}'))
  } catch {
    return {}
  }
}

function writeLocal(value: StoredPreferences) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(value))
  } catch {
    // Armazenamento bloqueado (modo privado etc.): segue só em memória.
  }
}

export function usePreferences() {
  /** O que o usuário alterou (espelho do banco). */
  const stored = useState<StoredPreferences>('prefs-stored', readLocal)
  const loaded = useState<boolean>('prefs-loaded', () => false)
  /** Sem conta: não há o que gravar no servidor. */
  const localOnly = useState<boolean>('prefs-local-only', () => false)
  const preferences = computed<UserPreferences>(() => resolvePreferences(stored.value))

  async function load(force = false) {
    if (loaded.value && !force) return
    if (loading) return loading
    loading = (async () => {
      try {
        const remote = await $fetch<UserPreferences>('/api/v1/preferences')
        stored.value = sanitizePreferences(remote)
        localOnly.value = false
        writeLocal(stored.value)
      } catch {
        // Sem sessão (visitante) ou falha de rede: fica com o que está salvo no navegador.
        localOnly.value = true
        stored.value = readLocal()
      } finally {
        loaded.value = true
        loading = null
      }
    })()
    return loading
  }

  async function flush() {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = null
    const patch = pendingPatch
    pendingPatch = {}
    if (!Object.keys(patch).length || localOnly.value) return
    try {
      await $fetch('/api/v1/preferences', { method: 'PATCH', body: patch })
    } catch (error) {
      console.error('[preferências] falha ao salvar', error)
    }
  }

  /** Altera preferências (parcialmente) — aplica já e salva em seguida. */
  function update(patch: StoredPreferences, { persist = true } = {}) {
    const clean = sanitizePreferences(patch)
    stored.value = mergeStoredPreferences(stored.value, clean)
    writeLocal(stored.value)
    if (!persist || localOnly.value) return
    pendingPatch = mergeStoredPreferences(pendingPatch, clean)
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(flush, SAVE_DELAY_MS)
  }

  /** Esquece as preferências locais (ex.: ao efetuar logoff). */
  function reset() {
    stored.value = {}
    loaded.value = false
    writeLocal({})
  }

  return { preferences, loaded, localOnly, load, update, flush, reset, defaults: DEFAULT_PREFERENCES }
}
