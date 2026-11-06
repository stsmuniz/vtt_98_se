/**
 * Ações globais da área de trabalho: abrir apps, ajuda, tela cheia, menu
 * Iniciar, efetuar logoff. Escopo de janela fica em useWindow().
 */
import { authClient } from '~~/lib/auth-client'
import type { ResourceKind } from '~~/lib/preferences'
import { appInstanceId, getApp } from '~/desktop/apps'
import { useWindowManager } from '~~/composables/useWindowManager'
import { useDialog } from '~~/composables/useDialog'
import { useLoadingWindow } from '~~/composables/useLoadingWindow'
import { usePreferences } from '~~/composables/usePreferences'
import { useSystemSounds } from '~~/composables/useSystemSounds'

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
  const shutdownDialogOpen = useState('shutdown-dialog-open', () => false)
  /** Tela "Aguarde enquanto o VTT 98 SE é desligado" visível. */
  const shuttingDown = useState('shutting-down', () => false)

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
    resource: ResourceKind,
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

  /** Antes de sair: a janela da página pode ter alterações não salvas (Sim/Não/Cancelar). */
  async function confirmLeavePage(): Promise<boolean> {
    return wm.get('route') ? wm.canClose('route') : true
  }

  function closeEverything() {
    for (const w of [...wm.windows.value]) wm.unregister(w.id)
    usePreferences().reset()
  }

  /** Efetuar logoff. `confirm`: perguntar antes (o item do menu Iniciar pergunta; o diálogo Desligar já perguntou). */
  async function logoff({ confirm = true } = {}) {
    startMenuOpen.value = false
    if (confirm) {
      const name = user.value?.name
      const ok = await useDialog().confirm(
        name ? `Deseja efetuar logoff de ${name}?` : 'Deseja efetuar logoff?',
        { title: 'Efetuar logoff do VTT 98 SE', icon: 'question' },
      )
      if (!ok) return
    }
    if (!(await confirmLeavePage())) return
    useSystemSounds().play('shutdown')
    await useLoadingWindow().withLoading(() => authClient.signOut(), 'Efetuando logoff...')
    closeEverything()
    await navigateTo('/login')
  }

  function openShutdownDialog() {
    startMenuOpen.value = false
    shutdownDialogOpen.value = true
  }

  /**
   * "Desligar": tela de carga com nuvens e o som do disco rígido trabalhando por
   * alguns segundos, logoff e, por fim, a tela "já pode ser desligado".
   * Deve ser chamada a partir de um clique (libera o áudio).
   */
  async function shutdown() {
    shutdownDialogOpen.value = false
    if (!(await confirmLeavePage())) return
    const sounds = useSystemSounds()
    sounds.unlock()
    const disk = sounds.hardDisk()
    shuttingDown.value = true
    disk?.start()
    const minimumScreenTime = new Promise(resolve => setTimeout(resolve, 4500))
    await Promise.all([authClient.signOut().catch(() => {}), minimumScreenTime])
    await disk?.stop()
    closeEverything()
    await navigateTo('/turnoff', { replace: true })
    shuttingDown.value = false
  }

  return {
    session, user, isGuest, startMenuOpen, shutdownDialogOpen, shuttingDown,
    openApp, pick, openHelp, toggleFullscreen, logoff, openShutdownDialog, shutdown,
  }
}
