/**
 * Controle de UMA janela (título, menus, atalhos, fechar, "antes de fechar").
 *
 * Dentro de uma janela (conteúdo renderizado por DesktopWindow), use
 * `useWindow()` sem argumentos — o contexto vem por provide/inject.
 * Fora dela (uma página que contém a própria DesktopRouteWindow), passe o id:
 * `useWindow('route')`.
 *
 * Atalhos registrados aqui só disparam quando ESTA janela está ativa, e são
 * removidos automaticamente quando o componente que os registrou é desmontado.
 */
import { inject, provide, shallowRef, type InjectionKey, type ShallowRef } from 'vue'
import type { IconName } from '~/utils/icons'
import type { MenuDef } from '~/utils/menu'
import { useWindowManager, type ShortcutMap } from '~~/composables/useWindowManager'

export interface WindowContext {
  id: string
  menus: ShallowRef<MenuDef[] | undefined>
}

export const WINDOW_CONTEXT: InjectionKey<WindowContext> = Symbol('desktop-window')

/** Usado por DesktopWindow para disponibilizar o contexto ao conteúdo. */
export function provideWindowContext(id: string): WindowContext {
  const ctx: WindowContext = { id, menus: menusRegistry(id) }
  provide(WINDOW_CONTEXT, ctx)
  return ctx
}

// Menus por janela: precisam ser reativos e acessíveis tanto de dentro (conteúdo)
// quanto de fora (página dona da janela route). Ficam fora do useState porque
// guardam funções.
const menusById = new Map<string, ShallowRef<MenuDef[] | undefined>>()
export function menusRegistry(id: string) {
  let r = menusById.get(id)
  if (!r) {
    r = shallowRef<MenuDef[] | undefined>(undefined)
    menusById.set(id, r)
  }
  return r
}

export function useWindow(explicitId?: string) {
  const ctx = explicitId ? null : inject(WINDOW_CONTEXT, null)
  const id = explicitId ?? ctx?.id
  if (!id) throw new Error('useWindow() precisa estar dentro de uma janela ou receber o id da janela')

  const wm = useWindowManager()
  const entry = computed(() => wm.get(id))
  const isActive = computed(() => wm.state.value.activeId === id)

  function setTitle(title: string, icon?: IconName) {
    wm.setTitle(id!, title, icon)
  }

  function setMenus(menus: MenuDef[] | undefined) {
    menusRegistry(id!).value = menus
  }

  function shortcuts(map: ShortcutMap) {
    wm.setShortcuts(id!, map)
    if (getCurrentInstance()) onBeforeUnmount(() => wm.setShortcuts(id!, null))
  }

  function onBeforeClose(fn: () => boolean | Promise<boolean>) {
    wm.setBeforeClose(id!, fn)
    if (getCurrentInstance()) onBeforeUnmount(() => wm.setBeforeClose(id!, null))
  }

  return {
    id,
    entry,
    isActive,
    setTitle,
    setMenus,
    shortcuts,
    onBeforeClose,
    focus: () => wm.focus(id!),
    close: () => wm.close(id!),
    minimize: () => wm.minimize(id!),
    toggleMaximize: () => wm.toggleMaximize(id!),
  }
}
