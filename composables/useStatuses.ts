/**
 * Catálogo de status de tokens: os padrões (código) + os personalizados do usuário (banco).
 * Todas as janelas leem o mesmo cache (`statuses`), então criar/editar/excluir aqui atualiza
 * o applet Status e as Configurações do token ao mesmo tempo.
 */
import { DEFAULT_STATUSES, type TokenStatusEntry } from '~~/lib/tokenStatuses'
import { errorMessage } from '~~/composables/useResourceActions'

export const STATUSES_CACHE_KEY = 'statuses'

type StatusRow = { id: number; name: string; color: string }

export type CatalogStatus = TokenStatusEntry & {
  origin: 'default' | 'custom'
  /** id da linha no banco (só personalizados). */
  rowId?: number
}

export function useStatuses() {
  const { data: rows, pending } = useAsyncData(
    STATUSES_CACHE_KEY,
    () => $fetch<StatusRow[]>('/api/v1/statuses'),
    { default: () => [] },
  )

  const catalog = computed<CatalogStatus[]>(() => [
    ...DEFAULT_STATUSES.map(s => ({ ...s, origin: 'default' as const })), // inclui `effect`
    ...rows.value.map(r => ({ id: `custom:${r.id}`, name: r.name, color: r.color, origin: 'custom' as const, rowId: r.id })),
  ])

  const refresh = () => refreshNuxtData(STATUSES_CACHE_KEY)

  /** Cria (sem `rowId`) ou atualiza um status personalizado. Lança com mensagem legível. */
  async function save(input: { rowId?: number; name: string; color: string }) {
    try {
      if (input.rowId) {
        await $fetch(`/api/v1/statuses/${input.rowId}`, { method: 'PUT', body: { name: input.name, color: input.color } })
      } else {
        await $fetch('/api/v1/statuses', { method: 'POST', body: { name: input.name, color: input.color } })
      }
    } catch (error) {
      throw new Error(errorMessage(error, 'Não foi possível salvar o status.'))
    }
    await refresh()
  }

  async function remove(rowId: number) {
    try {
      await $fetch(`/api/v1/statuses/${rowId}`, { method: 'DELETE' })
    } catch (error) {
      throw new Error(errorMessage(error, 'Não foi possível excluir o status.'))
    }
    await refresh()
  }

  return { catalog, pending, save, remove, refresh }
}
