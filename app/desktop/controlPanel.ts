/**
 * Applets do Painel de Controle. Cada um só abre um app do registro (`apps.ts`).
 * Para uma nova entidade "de sistema" (sem a complexidade de um recurso), basta
 * registrar o app e acrescentar uma linha aqui.
 */
import type { IconName } from '~/utils/icons'

export interface ControlPanelApplet {
  /** id do app em `app/desktop/apps.ts`. */
  appId: string
  name: string
  icon: IconName
  /** Texto curto exibido como dica. */
  description: string
}

export const CONTROL_PANEL_APPLETS: ControlPanelApplet[] = [
  { appId: 'settings', name: 'Vídeo', icon: 'display', description: 'Papel de parede, cores, escala da interface e sons.' },
  { appId: 'user-account', name: 'Usuário', icon: 'users', description: 'Nome, senha e exclusão da conta.' },
  { appId: 'status-manager', name: 'Status', icon: 'warning', description: 'Condições temporárias que o mestre aplica aos tokens, com nome e cor.' },
]
