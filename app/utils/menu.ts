/**
 * Menus orientados a dados.
 *
 * Barra de menus, menu de contexto, menu Iniciar e (futuramente) a barra de
 * comandos de um shell mobile consomem a mesma estrutura — nenhum menu é
 * escrito à mão no template de um layout.
 *
 * Rótulos usam "&" para marcar a tecla de acesso (mnemônico), como no Windows:
 * `'&Arquivo'` sublinha o A e Alt+A / A (com o menu aberto) aciona o item.
 * Use `'&&'` para um "&" literal.
 */
import { toValue, type MaybeRefOrGetter } from 'vue'
import type { IconName } from './icons'

export interface MenuItemDef {
  /** Identificador estável (testes, chaves de v-for). Opcional. */
  id?: string
  type?: 'item' | 'separator' | 'check' | 'radio'
  label?: string
  /** Atalho exibido à direita, só informativo (ex.: 'Ctrl+S'). Quem trata a tecla é a janela. */
  shortcut?: string
  icon?: IconName
  disabled?: MaybeRefOrGetter<boolean | undefined>
  /** Para 'check' e 'radio'. */
  checked?: MaybeRefOrGetter<boolean | undefined>
  /** Item padrão (negrito), como "Abrir" no menu de contexto de um arquivo. */
  default?: boolean
  action?: () => unknown
  /** Submenu. */
  items?: MaybeRefOrGetter<MenuItemDef[]>
}

export interface MenuDef {
  id?: string
  label: string
  items: MaybeRefOrGetter<MenuItemDef[]>
  disabled?: MaybeRefOrGetter<boolean | undefined>
}

export interface ParsedLabel {
  before: string
  /** Caractere sublinhado (vazio se não houver mnemônico). */
  key: string
  after: string
  /** Tecla de acesso normalizada (minúscula, sem acento) ou null. */
  accessKey: string | null
  /** Texto puro, sem os marcadores. */
  text: string
}

/** Remove acentos e passa para minúsculas — "Ação" e "acao" casam. */
export function normalizeKey(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export function parseMenuLabel(label = ''): ParsedLabel {
  const placeholder = '\u0000'
  const escaped = label.replaceAll('&&', placeholder)
  const index = escaped.indexOf('&')
  const restore = (s: string) => s.replaceAll(placeholder, '&')
  if (index === -1 || index === escaped.length - 1) {
    const text = restore(escaped)
    return { before: text, key: '', after: '', accessKey: null, text }
  }
  const before = restore(escaped.slice(0, index))
  const key = restore(escaped.charAt(index + 1))
  const after = restore(escaped.slice(index + 2).replaceAll('&', ''))
  return { before, key, after, accessKey: normalizeKey(key), text: before + key + after }
}

export function isItemDisabled(item: Pick<MenuItemDef, 'disabled'>): boolean {
  return Boolean(toValue(item.disabled))
}

export function isSelectable(item: MenuItemDef): boolean {
  return item.type !== 'separator' && !isItemDisabled(item)
}

export function resolveItems(items: MaybeRefOrGetter<MenuItemDef[]> | undefined): MenuItemDef[] {
  return toValue(items) ?? []
}
