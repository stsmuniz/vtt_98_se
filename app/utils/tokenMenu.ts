/**
 * Itens de menu das ações sobre um token na cena — usados no menu de contexto
 * do canvas e no menu "Editar" do editor e da sala. Para um documento (imagem
 * da mesa) os itens são os mesmos, com "Abrir documento" no lugar das
 * configurações do token.
 */
import type { MenuItemDef } from './menu'

export interface TokenMenuHandlers {
  duplicate: () => unknown
  replace: () => unknown
  hFlip: () => unknown
  vFlip: () => unknown
  resetRotation: () => unknown
  remove: () => unknown
  /** Opcional: abre as configurações do token (sala). Não se aplica a documentos. */
  configure?: () => unknown
  /** Opcional: abre o documento no tamanho grande. */
  open?: () => unknown
}

export function buildTokenMenu(h: TokenMenuHandlers, opts: { disabled?: boolean; document?: boolean } = {}): MenuItemDef[] {
  const disabled = opts.disabled ?? false
  const isDoc = opts.document ?? false
  const noun = isDoc ? 'documento' : 'token'
  const first: MenuItemDef[] = isDoc
    ? (h.open ? [{ id: 'tk-abrir', label: '&Abrir documento', icon: 'image' as const, default: true, disabled, action: h.open }, { type: 'separator' as const }] : [])
    : (h.configure ? [{ id: 'tk-config', label: '&Configurações do token…', icon: 'properties' as const, default: true, disabled, action: h.configure }, { type: 'separator' as const }] : [])
  return [
    ...first,
    { id: 'tk-duplicar', label: `&Duplicar ${noun}`, icon: 'copy', disabled, action: h.duplicate },
    { id: 'tk-substituir', label: `&Substituir ${noun}…`, icon: isDoc ? 'image' : 'token', disabled, action: h.replace },
    { type: 'separator' },
    { id: 'tk-inverter-h', label: 'Inverter &horizontalmente', disabled, action: h.hFlip },
    { id: 'tk-inverter-v', label: 'Inverter &verticalmente', disabled, action: h.vFlip },
    { id: 'tk-rotacao', label: '&Restaurar rotação', disabled, action: h.resetRotation },
    { type: 'separator' },
    { id: 'tk-remover', label: `Re&mover ${noun}`, icon: 'delete', shortcut: 'Del', disabled, action: h.remove },
  ]
}
