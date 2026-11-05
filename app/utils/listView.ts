/**
 * Tipos e utilitários do UiListView (vistas Ícones / Lista / Detalhes).
 */
import type { IconName } from './icons'
import { normalizeKey } from './menu'

export type ListViewMode = 'icons' | 'list' | 'details'
export type ListViewItemId = string | number

export interface ListViewItem {
  id: ListViewItemId
  name: string
  icon?: IconName
  [key: string]: unknown
}

export type ListViewValue = string | number | Date | null | undefined

export interface ListViewColumn<T extends ListViewItem = ListViewItem> {
  key: string
  label: string
  /** Largura inicial em px (o usuário pode redimensionar arrastando a borda do cabeçalho). */
  width?: number
  /** Valor usado para ordenar. Padrão: item[key]. */
  value?: (item: T) => ListViewValue
  /** Texto exibido na célula. Padrão: String(valor). */
  format?: (item: T) => string
  align?: 'left' | 'right'
}

export interface ListViewSort {
  key: string
  dir: 'asc' | 'desc'
}

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

/** Compara valores de coluna; vazios vão sempre para o fim. */
export function compareListValues(a: ListViewValue, b: ListViewValue): number {
  const emptyA = a === null || a === undefined || a === ''
  const emptyB = b === null || b === undefined || b === ''
  if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1
  if (a instanceof Date || b instanceof Date) return new Date(a).getTime() - new Date(b).getTime()
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return collator.compare(String(a), String(b))
}

export function columnValue<T extends ListViewItem>(column: ListViewColumn<T> | undefined, item: T, key: string): ListViewValue {
  if (column?.value) return column.value(item)
  const v = item[key]
  if (Array.isArray(v)) return v.join(', ')
  return v as ListViewValue
}

export function sortListItems<T extends ListViewItem>(items: T[], columns: ListViewColumn<T>[], sort: ListViewSort | null | undefined): T[] {
  if (!sort) return items
  const column = columns.find(c => c.key === sort.key)
  const factor = sort.dir === 'desc' ? -1 : 1
  return [...items].sort((x, y) => {
    const a = columnValue(column, x, sort.key)
    const b = columnValue(column, y, sort.key)
    const emptyA = a === null || a === undefined || a === ''
    const emptyB = b === null || b === undefined || b === ''
    // Vazios no fim nos dois sentidos de ordenação.
    if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1
    return factor * compareListValues(a, b) || collator.compare(x.name, y.name)
  })
}

/** Busca sem diferenciar acentos/maiúsculas: "acao" encontra "Ação". */
export function matchesSearch(text: string, query: string): boolean {
  const q = normalizeKey(query.trim())
  return !q || normalizeKey(text).includes(q)
}

/** Data curta em pt-BR (dd/mm/aaaa hh:mm) ou vazio. */
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
export function formatDateTime(value: unknown): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? '' : dateFormatter.format(d)
}

export function toDate(value: unknown): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}
