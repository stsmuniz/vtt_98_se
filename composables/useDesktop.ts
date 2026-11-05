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

  function openApp(appId: string, props: Record<string, unknown> = {}): string | null {
    const app = getApp(appId)
    if (!app) return null
    if (isGuest.value && !app.guestAllowed) return null
    const id = appInstanceId(app, props)
    wm.register(id, 'app', {
      appId,
      props,
      title: app.title,
      icon: app.icon,
      rect: { w: app.size.w, h: app.size.h },
      minSize: app.minSize,
      resizable: app.resizable ?? true,
      variant: app.variant ?? 'window',
    })
    startMenuOpen.value = false
    return id
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

  return { session, user, isGuest, startMenuOpen, openApp, openHelp, toggleFullscreen, logoff }
}
