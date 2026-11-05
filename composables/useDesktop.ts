/**
 * Ações globais da área de trabalho: abrir apps, ajuda, tela cheia, menu
 * Iniciar, efetuar logoff. Escopo de janela fica em useWindow().
 */
import { authClient } from '~~/lib/auth-client'
import { appInstanceId, getApp } from '~/desktop/apps'
import { useWindowManager } from '~~/composables/useWindowManager'
import { useDialog } from '~~/composables/useDialog'
import { useLoadingWindow } from '~~/composables/useLoadingWindow'

let sessionStore: ReturnType<typeof authClient.useSession> | null = null

function useSessionStore() {
  // Uma única assinatura da sessão para todo o shell.
  if (!sessionStore) sessionStore = authClient.useSession()
  return sessionStore
}

export function useDesktop() {
  const wm = useWindowManager()
  const session = useSessionStore()
  const startMenuOpen = useState('start-menu-open', () => false)

  const user = computed(() => session.value.data?.user ?? null)
  /** Visitante sem conta (só acontece na página de sala). */
  const isGuest = computed(() => !session.value.isPending && !user.value)

  function openApp(
    appId: string,
    extraProps: Record<string, unknown> = {},
    opts: { ownerId?: string; title?: string } = {},
  ): string | null {
    const app = getApp(appId)
    if (!app) return null
    if (isGuest.value && !app.guestAllowed) return null
    const props = { ...app.defaultProps, ...extraProps }
    const id = appInstanceId(app, props)
    wm.register(id, 'app', {
      appId,
      props,
      ownerId: opts.ownerId,
      title: opts.title ?? (app.titleFor?.(props) || app.title),
      icon: app.icon,
      rect: { w: app.size.w, h: app.size.h },
      minSize: app.minSize,
      resizable: app.resizable ?? true,
      variant: app.variant ?? 'window',
    })
    startMenuOpen.value = false
    return id
  }

  /**
   * Abre uma pasta como seletor e devolve o registro escolhido, ou null se o
   * usuário cancelar/fechar. `ownerId` (ex.: 'route') fecha o seletor junto
   * com a janela dona.
   */
  function pick<T = Record<string, unknown>>(
    resource: 'tokens' | 'scenarios' | 'scenes' | 'rooms',
    opts: { ownerId?: string; title?: string; confirmLabel?: string } = {},
  ): Promise<T | null> {
    return new Promise((resolve) => {
      const id = openApp(resource, { mode: 'pick', ownerId: opts.ownerId, confirmLabel: opts.confirmLabel, title: opts.title }, { ownerId: opts.ownerId })
      if (!id) return resolve(null)
      wm.setPickResolver(id, value => resolve(value as T | null))
    })
  }

  function openHelp(topic?: string) {
    return openApp('help', topic ? { topic } : {})
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  async function logoff() {
    startMenuOpen.value = false
    const name = user.value?.name
    const ok = await useDialog().confirm(
      name ? `Deseja efetuar logoff de ${name}?` : 'Deseja efetuar logoff?',
      { title: 'Efetuar logoff do VTT 98 SE', icon: 'question' },
    )
    if (!ok) return
    await useLoadingWindow().withLoading(() => authClient.signOut(), 'Efetuando logoff...')
    // Fecha todas as janelas da sessão que terminou.
    for (const w of [...wm.windows.value]) wm.unregister(w.id)
    await navigateTo('/login')
  }

  return { session, user, isGuest, startMenuOpen, openApp, pick, openHelp, toggleFullscreen, logoff }
}
