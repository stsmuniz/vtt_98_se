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
  /** Props passadas sempre (ex.: qual recurso a pasta mostra). */
  defaultProps?: Record<string, unknown>
  /** Título dinâmico (ex.: "Editar token: Goblin"). */
  titleFor?: (props: Record<string, unknown>) => string
  /**
   * Chave da instância: mesma chave = mesma janela (foca em vez de abrir outra).
   * null = instância única do app.
   */
  instanceKey?: (props: Record<string, unknown>) => string | null
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

/**
 * Selo do ícone de uma pasta: as pastas (Tokens, Documentos, Cenários, Cenas, Salas) usam todas a
 * imagem de pasta, e o selo (o mesmo ícone que identifica o item dentro da pasta) as diferencia.
 */
export const folderOverlay = (app: AppDefinition): IconName | undefined => (app.desktopIcon ? app.icon : undefined)

const lazy = (loader: () => Promise<{ default: Component }>) => defineAsyncComponent(loader)

const explorer = lazy(() => import('~/components/apps/ExplorerApp.vue'))
/** Pasta normal = uma janela por recurso; seletor (pick) = uma por janela dona. */
const explorerKey = (props: Record<string, unknown>) =>
  props.mode === 'pick' ? `pick:${props.ownerId ?? 'desktop'}` : null
const PICK_TITLES: Record<string, string> = { tokens: 'Selecionar token', documents: 'Selecionar documento', scenarios: 'Selecionar cenário', scenes: 'Selecionar cena', rooms: 'Selecionar sala' }
const explorerTitle = (kind: string) => (props: Record<string, unknown>) =>
  props.mode === 'pick' ? String(props.title ?? PICK_TITLES[kind]) : ''

export const APPS: AppDefinition[] = [
  {
    id: 'tokens',
    title: 'Tokens',
    icon: 'token',
    desktopIcon: 'folder',
    component: explorer,
    defaultProps: { resource: 'tokens' },
    instanceKey: explorerKey,
    titleFor: explorerTitle('tokens'),
    size: { w: 820, h: 560 },
    minSize: { w: 420, h: 300 },
    startMenu: 'programs',
    onDesktop: true,
  },
  {
    id: 'documents',
    title: 'Documentos',
    icon: 'image',
    desktopIcon: 'folder',
    component: explorer,
    defaultProps: { resource: 'documents' },
    instanceKey: explorerKey,
    titleFor: explorerTitle('documents'),
    size: { w: 820, h: 560 },
    minSize: { w: 420, h: 300 },
    startMenu: 'programs',
    onDesktop: true,
  },
  {
    id: 'scenarios',
    title: 'Cenários',
    icon: 'scenario',
    desktopIcon: 'folder',
    component: explorer,
    defaultProps: { resource: 'scenarios' },
    instanceKey: explorerKey,
    titleFor: explorerTitle('scenarios'),
    size: { w: 820, h: 560 },
    minSize: { w: 420, h: 300 },
    startMenu: 'programs',
    onDesktop: true,
  },
  {
    id: 'scenes',
    title: 'Cenas',
    icon: 'scene',
    desktopIcon: 'folder',
    component: explorer,
    defaultProps: { resource: 'scenes' },
    instanceKey: explorerKey,
    titleFor: explorerTitle('scenes'),
    size: { w: 820, h: 560 },
    minSize: { w: 420, h: 300 },
    startMenu: 'programs',
    onDesktop: true,
  },
  {
    id: 'rooms',
    title: 'Salas',
    icon: 'room',
    desktopIcon: 'folder',
    component: explorer,
    defaultProps: { resource: 'rooms' },
    instanceKey: explorerKey,
    titleFor: explorerTitle('rooms'),
    size: { w: 820, h: 560 },
    minSize: { w: 420, h: 300 },
    startMenu: 'programs',
    onDesktop: true,
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
    id: 'resource-form',
    title: 'Formulário',
    icon: 'edit',
    component: lazy(() => import('~/components/apps/ResourceFormApp.vue')),
    instanceKey: props => `${props.resource}:${props.id ?? 'novo'}`,
    size: { w: 640, h: 560 },
    minSize: { w: 380, h: 320 },
  },
  {
    id: 'room-wizard',
    title: 'Assistente para Adicionar Sala',
    icon: 'room',
    component: lazy(() => import('~/components/apps/RoomWizardApp.vue')),
    size: { w: 600, h: 440 },
    minSize: { w: 360, h: 360 },
    variant: 'dialog',
    resizable: false,
  },
  {
    id: 'properties',
    title: 'Propriedades',
    icon: 'properties',
    component: lazy(() => import('~/components/apps/PropertiesApp.vue')),
    instanceKey: props => `${props.resource}:${props.id}`,
    size: { w: 400, h: 480 },
    minSize: { w: 320, h: 360 },
    variant: 'dialog',
  },
  {
    id: 'image-viewer',
    title: 'Visualizador de imagens',
    icon: 'image',
    component: lazy(() => import('~/components/apps/ImageViewerApp.vue')),
    instanceKey: props => String(props.src),
    size: { w: 720, h: 520 },
    minSize: { w: 300, h: 220 },
    // Visitantes da sala (sem conta) abrem os documentos da mesa neste visualizador.
    guestAllowed: true,
  },
  {
    id: 'settings',
    title: 'Propriedades de Vídeo',
    icon: 'display',
    component: lazy(() => import('~/components/apps/SettingsApp.vue')),
    size: { w: 460, h: 540 },
    minSize: { w: 360, h: 460 },
    variant: 'dialog',
    resizable: false,
  },
  {
    id: 'user-account',
    title: 'Conta do usuário',
    icon: 'users',
    component: lazy(() => import('~/components/apps/UserAccountApp.vue')),
    size: { w: 480, h: 540 },
    minSize: { w: 360, h: 460 },
    variant: 'dialog',
    resizable: false,
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

/** Id da janela: sempre começa pelo app, para chaves iguais de apps diferentes não colidirem. */
export function appInstanceId(app: AppDefinition, props: Record<string, unknown> = {}): string {
  const key = app.instanceKey?.(props)
  return key ? `app:${app.id}:${key}` : `app:${app.id}`
}
