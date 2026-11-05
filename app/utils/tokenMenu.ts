/**
 * Itens de menu das ações sobre um token na cena — usados no menu de contexto
 * do canvas e no menu "Editar" do editor e da sala.
 */
import type { MenuItemDef } from './menu'

export interface TokenMenuHandlers {
  duplicate: () => unknown
  replace: () => unknown
  hFlip: () => unknown
  vFlip: () => unknown
  resetRotation: () => unknown
  remove: () => unknown
  /** Opcional: abre as configurações do token (sala). */
  configure?: () => unknown
}

export function buildTokenMenu(h: TokenMenuHandlers, opts: { disabled?: boolean } = {}): MenuItemDef[] {
  const disabled = opts.disabled ?? false
  return [
    ...(h.configure ? [{ id: 'tk-config', label: '&Configurações do token…', icon: 'properties' as const, default: true, disabled, action: h.configure }, { type: 'separator' as const }] : []),
    { id: 'tk-duplicar', label: '&Duplicar token', icon: 'copy', disabled, action: h.duplicate },
    { id: 'tk-substituir', label: '&Substituir token…', icon: 'token', disabled, action: h.replace },
    { type: 'separator' },
    { id: 'tk-inverter-h', label: 'Inverter &horizontalmente', disabled, action: h.hFlip },
    { id: 'tk-inverter-v', label: 'Inverter &verticalmente', disabled, action: h.vFlip },
    { id: 'tk-rotacao', label: '&Restaurar rotação', disabled, action: h.resetRotation },
    { type: 'separator' },
    { id: 'tk-remover', label: 'Re&mover token', icon: 'delete', shortcut: 'Del', disabled, action: h.remove },
  ]
}
