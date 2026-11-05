/**
 * Preferências do usuário no cliente (Configurações e modo de exibição das pastas).
 *
 * Carrega uma vez de /api/v1/preferences e aplica alterações de forma otimista:
 * a tela muda na hora e o PATCH vai para o servidor depois de 500 ms, juntando
 * as alterações feitas nesse intervalo. Visitantes (sem conta) ficam só com os
 * padrões em memória.
 */
import {
  DEFAULT_PREFERENCES, mergeStoredPreferences, resolvePreferences, sanitizePreferences,
  type StoredPreferences, type UserPreferences,
} from '~~/lib/preferences'

const SAVE_DELAY_MS = 500

let pendingPatch: StoredPreferences = {}
let saveTimer: ReturnType<typeof setTimeout> | null = null
let loading: Promise<void> | null = null

export function usePreferences() {
  /** O que o usuário alterou (espelho do banco). */
  const stored = useState<StoredPreferences>('prefs-stored', () => ({}))
  const loaded = useState<boolean>('prefs-loaded', () => false)
  const preferences = computed<UserPreferences>(() => resolvePreferences(stored.value))

  async function load(force = false) {
    if (loaded.value && !force) return
    if (loading) return loading
    loading = (async () => {
      try {
        const remote = await $fetch<UserPreferences>('/api/v1/preferences')
        stored.value = sanitizePreferences(remote)
      } catch {
        // Sem sessão (visitante) ou falha de rede: segue com os padrões.
        stored.value = {}
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
    if (!Object.keys(patch).length) return
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
    if (!persist) return
    pendingPatch = mergeStoredPreferences(pendingPatch, clean)
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(flush, SAVE_DELAY_MS)
  }

  return { preferences, loaded, load, update, flush, defaults: DEFAULT_PREFERENCES }
}
