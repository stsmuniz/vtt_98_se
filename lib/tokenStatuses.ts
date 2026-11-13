/**
 * Status de tokens: condições temporárias aplicadas a um token na sala.
 *
 * Os padrões ficam aqui (não no banco); os personalizados do usuário vivem na tabela
 * `statuses`. Ao aplicar um status a um token, nome e cor são COPIADOS para o token
 * (`TokenStatusEntry`), como nos atributos: visitantes sem conta enxergam o status sem
 * consultar o catálogo, e renomear/excluir um status depois não altera salas já salvas.
 */

export type TokenStatusEntry = {
  /** `default:<slug>` para os padrões, `custom:<id>` para os do usuário. */
  id: string
  name: string
  /** #rrggbb */
  color: string
  /** Efeito especial no lugar da cor por cima: 'grayscale' deixa o token preto-e-branco. */
  effect?: 'grayscale'
}

export const DEFAULT_STATUSES: readonly TokenStatusEntry[] = [
  { id: 'default:envenenado', name: 'Envenenado', color: '#3fa535' },
  { id: 'default:atordoado', name: 'Atordoado', color: '#e0c000' },
  { id: 'default:cego', name: 'Cego', color: '#606060' },
  { id: 'default:surdo', name: 'Surdo', color: '#a07040' },
  { id: 'default:paralisado', name: 'Paralisado', color: '#2080e0' },
  { id: 'default:caido', name: 'Caído', color: '#8b5a2b' },
  { id: 'default:inconsciente', name: 'Inconsciente', color: '#303080' },
  { id: 'default:amedrontado', name: 'Amedrontado', color: '#8030a0' },
  { id: 'default:enfeiticado', name: 'Enfeitiçado', color: '#e060c0' },
  { id: 'default:invisivel', name: 'Invisível', color: '#80c0e0' },
  { id: 'default:em-chamas', name: 'Em chamas', color: '#e05010' },
  { id: 'default:lento', name: 'Lento', color: '#40a0a0' },
  { id: 'default:morto', name: 'Morto', color: '#808080', effect: 'grayscale' },
]

export const MAX_STATUS_NAME_LENGTH = 30

export const STATUS_COLOR_RE = /^#[0-9a-f]{6}$/i

/** Inicial exibida no selo do status sobre o token. */
export function statusInitial(name: string): string {
  return (name.trim().charAt(0) || '?').toUpperCase()
}

/** Cor do texto do selo (preto ou branco) que contrasta com o fundo `#rrggbb`. */
export function statusTextColor(color: string): string {
  const n = parseInt(color.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? '#000000' : '#ffffff'
}
