/**
 * Registro de aplicativos da área de trabalho.
 *
 * Tudo o que a área de trabalho mostra — ícones, itens do menu Iniciar, janelas
 * abertas — vem daqui, como dados. Nenhum layout lista ferramentas à mão
 * (isso permite reaproveitar o registro num futuro shell mobile).
 */
import { defineAsyncComponent, type Component } from 'vue'
import type { IconName } from '~/utils/icons'
import type { WinEntry } from '~~/composables/useWindowManager'

export interface AppDefinition {
  id: string
  title: string
  icon: IconName
  /** Ícone na área de trabalho (pastas usam o ícone de pasta). */
  desktopIcon?: IconName
  component: Component
  /** Chave da instância: mesma chave = mesma janela (foca em vez de abrir outra). */
  instanceKey?: (props: Record<string, unknown>) => string
  size: { w: number; h: number }
  minSize?: { w: number; h: number }
  resizable?: boolean
  variant?: WinEntry['variant']
  /** Conteúdo com margem interna (componentes antigos que esperavam o padding da janela). */
  padded?: boolean
  /** Onde aparece no menu Iniciar. */
  startMenu?: 'programs' | 'accessories' | null
  /** Mostra na área de trabalho (só para quem tem conta). */
  onDesktop?: boolean
  /** Disponível para visitantes sem conta (salas). */
  guestAllowed?: boolean
}

const lazy = (loader: () => Promise<{ default: Component }>) => defineAsyncComponent(loader)

export const APPS: AppDefinition[] = [
  {
    id: 'tokens',
    title: 'Tokens',
    icon: 'token',
    desktopIcon: 'folder',
    component: lazy(() => import('~/components/TokensWindow.vue')),
    size: { w: 820, h: 560 },
    minSize: { w: 420, h: 300 },
    startMenu: 'programs',
    onDesktop: true,
    padded: true,
  },
  {
    id: 'scenarios',
    title: 'Cenários',
    icon: 'scenario',
    desktopIcon: 'folder',
    component: lazy(() => import('~/components/ScenariosWindow.vue')),
    size: { w: 820, h: 560 },
    minSize: { w: 420, h: 300 },
    startMenu: 'programs',
    onDesktop: true,
    padded: true,
  },
  {
    id: 'scenes',
    title: 'Cenas',
    icon: 'scene',
    desktopIcon: 'folder',
    component: lazy(() => import('~/components/ScenesWindow.vue')),
    size: { w: 820, h: 560 },
    minSize: { w: 420, h: 300 },
    startMenu: 'programs',
    onDesktop: true,
    padded: true,
  },
  {
    id: 'rooms',
    title: 'Salas',
    icon: 'room',
    desktopIcon: 'folder',
    component: lazy(() => import('~/components/RoomsWindow.vue')),
    size: { w: 820, h: 560 },
    minSize: { w: 420, h: 300 },
    startMenu: 'programs',
    onDesktop: true,
    padded: true,
  },
  {
    id: 'dice',
    title: 'Rolador de Dados',
    icon: 'dice',
    component: lazy(() => import('~/components/DiceRoller.vue')),
    size: { w: 420, h: 560 },
    minSize: { w: 320, h: 360 },
    variant: 'tool',
    startMenu: 'accessories',
    onDesktop: true,
    guestAllowed: true,
  },
  {
    id: 'help',
    title: 'Manual do VTT 98 SE',
    icon: 'help',
    component: lazy(() => import('~/components/apps/HelpManualApp.vue')),
    size: { w: 780, h: 560 },
    minSize: { w: 420, h: 320 },
    startMenu: null,
    guestAllowed: true,
  },
]

const byId = new Map(APPS.map(a => [a.id, a]))

export function getApp(id: string): AppDefinition | undefined {
  return byId.get(id)
}

export function appInstanceId(app: AppDefinition, props: Record<string, unknown> = {}): string {
  return `app:${app.instanceKey ? app.instanceKey(props) : app.id}`
}
