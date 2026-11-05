/**
 * Ações sobre registros de Tokens/Cenários/Cenas/Salas, compartilhadas pela
 * pasta (Explorer), pelas Propriedades e pelos formulários. Toda alteração
 * atualiza o cache compartilhado do recurso, então todas as janelas abertas
 * daquele recurso (inclusive seletores) se atualizam juntas.
 */
import { RESOURCES, resourceCacheKey, withArticle, type ResourceKind, type ResourceRecord } from '~/desktop/resources'
import { useDesktop } from '~~/composables/useDesktop'
import { useDialog } from '~~/composables/useDialog'
import { useLoadingWindow } from '~~/composables/useLoadingWindow'

/** Lista compartilhada de um recurso (mesma chave em todas as janelas). */
export function useResourceList(kind: ResourceKind) {
  const desc = RESOURCES[kind]
  return useAsyncData(resourceCacheKey(kind), () => $fetch<ResourceRecord[]>(desc.endpoint), { default: () => [] })
}

/** Mensagem de erro legível a partir de uma falha do $fetch. */
export function errorMessage(error: unknown, fallback: string): string {
  const e = error as { data?: { statusMessage?: string; message?: string }; statusMessage?: string }
  return e?.data?.statusMessage ?? e?.data?.message ?? e?.statusMessage ?? fallback
}

const DELETE_WARNINGS: Partial<Record<ResourceKind, string>> = {
  scenarios: 'As cenas que usam este cenário também serão excluídas.',
  scenes: 'Salas criadas a partir desta cena continuam existindo.',
  rooms: 'Os jogadores conectados serão desconectados.',
}

export function useResourceActions(kind: ResourceKind) {
  const desc = RESOURCES[kind]
  const desktop = useDesktop()
  const dialog = useDialog()
  const { withLoading } = useLoadingWindow()

  const refresh = () => refreshNuxtData(resourceCacheKey(kind))
  const canDuplicate = kind !== 'rooms'

  async function remove(raw: ResourceRecord) {
    const warning = DELETE_WARNINGS[kind]
    const ok = await dialog.confirm(
      `Tem certeza de que deseja excluir ${withArticle(desc)} "${raw.name}"?${warning ? `\n${warning}` : ''}`,
      { title: `Excluir ${desc.singular}`, icon: 'warning' },
    )
    if (!ok) return false
    try {
      await withLoading(() => $fetch(`${desc.endpoint}/${raw.id}`, { method: 'DELETE' }), `Excluindo ${withArticle(desc)}...`, 'delete')
      await refresh()
      return true
    } catch (error) {
      await dialog.alert(errorMessage(error, `Não foi possível excluir ${withArticle(desc)}.`), { icon: 'error', title: 'Erro' })
      return false
    }
  }

  async function duplicate(raw: ResourceRecord) {
    if (!canDuplicate) return
    const { id: _id, ...payload } = raw
    try {
      await withLoading(() => $fetch(desc.endpoint, { method: 'POST', body: payload }), `Duplicando ${withArticle(desc)}...`, 'copy')
      await refresh()
    } catch (error) {
      await dialog.alert(errorMessage(error, `Não foi possível duplicar ${withArticle(desc)}.`), { icon: 'error', title: 'Erro' })
    }
  }

  async function rename(raw: ResourceRecord, name: string) {
    try {
      await $fetch(`${desc.endpoint}/${raw.id}`, { method: 'PATCH', body: { name } })
      await refresh()
    } catch (error) {
      await dialog.alert(errorMessage(error, 'Não foi possível renomear.'), { icon: 'error', title: 'Erro ao renomear' })
    }
  }

  function openNew() {
    if (desc.form.insertWith === 'room-wizard') desktop.openApp('room-wizard')
    else desktop.openApp('resource-form', { resource: kind }, { title: `Novo ${desc.singular}` })
  }

  function openEdit(raw: ResourceRecord) {
    desktop.openApp('resource-form', { resource: kind, id: raw.id }, { title: `Editar ${desc.singular}: ${raw.name}` })
  }

  function openProperties(raw: ResourceRecord) {
    desktop.openApp('properties', { resource: kind, id: raw.id }, { title: `Propriedades de ${raw.name}` })
  }

  function roomUrl(raw: ResourceRecord) {
    return `/rooms/${raw.code}`
  }

  async function copyRoomLink(raw: ResourceRecord) {
    const url = `${window.location.origin}${roomUrl(raw)}`
    try {
      await navigator.clipboard.writeText(url)
      await dialog.alert(`Link copiado:\n${url}`, { title: 'Copiar link' })
    } catch {
      await dialog.alert(`Copie o link da sala:\n${url}`, { title: 'Copiar link' })
    }
  }

  /** "Abrir" (duplo clique / Enter) conforme o recurso. */
  function openDefault(raw: ResourceRecord) {
    switch (desc.defaultVerb) {
      case 'edit':
        return openEdit(raw)
      case 'view-image':
        return desktop.openApp('image-viewer', { src: raw.image, name: raw.name }, { title: `${raw.name} - Visualizador de imagens` })
      case 'open-editor':
        return navigateTo(`/dashboard/scenes/${raw.id}`)
      case 'enter-room':
        return navigateTo(roomUrl(raw))
    }
  }

  return { desc, refresh, canDuplicate, remove, duplicate, rename, openNew, openEdit, openProperties, openDefault, roomUrl, copyRoomLink }
}
