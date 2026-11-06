/**
 * Preferências do usuário (Configurações) — tipos, valores padrão e validação.
 *
 * Compartilhado entre cliente e servidor. O banco guarda apenas o que o usuário
 * alterou (`StoredPreferences`, parcial); a resposta da API é sempre o resultado
 * de `resolvePreferences(stored)`, ou seja, padrões + alterações. Assim os padrões
 * podem mudar no futuro sem migração de dados.
 */

export const RESOURCE_KINDS = ['tokens', 'documents', 'scenarios', 'scenes', 'rooms'] as const
export type ResourceKind = (typeof RESOURCE_KINDS)[number]

export const EXPLORER_VIEWS = ['icons', 'list', 'details'] as const
export type ExplorerView = (typeof EXPLORER_VIEWS)[number]

export const EXPLORER_COLUMNS = ['name', 'createdAt', 'tags'] as const
export type ExplorerColumn = (typeof EXPLORER_COLUMNS)[number]

export const SORT_DIRS = ['asc', 'desc'] as const
export type SortDir = (typeof SORT_DIRS)[number]

export interface ExplorerPreferences {
  view: ExplorerView
  /** Ordem das colunas na exibição "Detalhes" (sempre uma permutação de EXPLORER_COLUMNS). */
  columns: ExplorerColumn[]
  sort: { key: ExplorerColumn; dir: SortDir }
}

export const WALLPAPERS = ['none', 'clouds'] as const
export type Wallpaper = (typeof WALLPAPERS)[number]

export const WALLPAPER_MODES = ['center', 'tile', 'stretch'] as const
export type WallpaperMode = (typeof WALLPAPER_MODES)[number]

/**
 * Degraus de escala. Só múltiplos em que a fonte pixel (grade de 16px) cai em
 * pixels inteiros: 16px × 1,5 = 24px, × 2 = 32px. 'auto' alinha ao devicePixelRatio.
 */
export const UI_SCALES = ['auto', 1, 1.5, 2] as const
export type UiScale = (typeof UI_SCALES)[number]

export interface UserPreferences {
  wallpaper: Wallpaper
  wallpaperMode: WallpaperMode
  /** Cor sólida da área de trabalho (#rrggbb), visível onde não há papel de parede. */
  backgroundColor: string
  uiScale: UiScale
  sounds: boolean
  explorer: Record<ResourceKind, ExplorerPreferences>
}

/** Formato guardado no banco e aceito no PATCH: tudo opcional. */
export type StoredPreferences = Partial<Omit<UserPreferences, 'explorer'>> & {
  explorer?: Partial<Record<ResourceKind, Partial<ExplorerPreferences>>>
}

const DEFAULT_EXPLORER: ExplorerPreferences = {
  view: 'icons',
  columns: [...EXPLORER_COLUMNS],
  sort: { key: 'name', dir: 'asc' },
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  wallpaper: 'none',
  wallpaperMode: 'stretch',
  backgroundColor: '#008080',
  uiScale: 1,
  sounds: true,
  explorer: {
    tokens: { ...DEFAULT_EXPLORER },
    documents: { ...DEFAULT_EXPLORER },
    scenarios: { ...DEFAULT_EXPLORER },
    scenes: { ...DEFAULT_EXPLORER },
    rooms: { ...DEFAULT_EXPLORER },
  },
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const oneOf = <T>(list: readonly T[], v: unknown): v is T => list.includes(v as T)

function sanitizeExplorer(input: unknown): Partial<ExplorerPreferences> | undefined {
  if (!isObject(input)) return undefined
  const out: Partial<ExplorerPreferences> = {}
  if (oneOf(EXPLORER_VIEWS, input.view)) out.view = input.view
  if (
    Array.isArray(input.columns)
    && input.columns.length === EXPLORER_COLUMNS.length
    && EXPLORER_COLUMNS.every(c => (input.columns as unknown[]).includes(c))
  ) {
    out.columns = [...input.columns] as ExplorerColumn[]
  }
  if (isObject(input.sort) && oneOf(EXPLORER_COLUMNS, input.sort.key) && oneOf(SORT_DIRS, input.sort.dir)) {
    out.sort = { key: input.sort.key, dir: input.sort.dir }
  }
  return Object.keys(out).length ? out : undefined
}

/**
 * Filtra uma entrada arbitrária (corpo de requisição, localStorage, JSON do banco)
 * mantendo só campos conhecidos e com valores válidos. Campos inválidos são
 * descartados em silêncio — nunca lança.
 */
export function sanitizePreferences(input: unknown): StoredPreferences {
  if (!isObject(input)) return {}
  const out: StoredPreferences = {}
  if (oneOf(WALLPAPERS, input.wallpaper)) out.wallpaper = input.wallpaper
  if (oneOf(WALLPAPER_MODES, input.wallpaperMode)) out.wallpaperMode = input.wallpaperMode
  if (typeof input.backgroundColor === 'string' && /^#[0-9a-f]{6}$/i.test(input.backgroundColor)) {
    out.backgroundColor = input.backgroundColor.toLowerCase()
  }
  if (oneOf(UI_SCALES, input.uiScale)) out.uiScale = input.uiScale
  if (typeof input.sounds === 'boolean') out.sounds = input.sounds
  if (isObject(input.explorer)) {
    const explorer: NonNullable<StoredPreferences['explorer']> = {}
    for (const kind of RESOURCE_KINDS) {
      const e = sanitizeExplorer(input.explorer[kind])
      if (e) explorer[kind] = e
    }
    if (Object.keys(explorer).length) out.explorer = explorer
  }
  return out
}

/** Aplica um patch (já sanitizado) sobre o que está guardado. `explorer` é mesclado por recurso. */
export function mergeStoredPreferences(stored: StoredPreferences, patch: StoredPreferences): StoredPreferences {
  const { explorer: patchExplorer, ...rest } = patch
  const merged: StoredPreferences = { ...stored, ...rest }
  if (patchExplorer) {
    merged.explorer = { ...stored.explorer }
    for (const kind of RESOURCE_KINDS) {
      if (patchExplorer[kind]) merged.explorer[kind] = { ...stored.explorer?.[kind], ...patchExplorer[kind] }
    }
  }
  return merged
}

/** Preferências completas: padrões + o que o usuário alterou. */
export function resolvePreferences(stored: StoredPreferences | null | undefined): UserPreferences {
  const s = sanitizePreferences(stored)
  const { explorer, ...rest } = s
  return {
    ...DEFAULT_PREFERENCES,
    ...rest,
    explorer: Object.fromEntries(
      RESOURCE_KINDS.map(kind => [kind, { ...DEFAULT_PREFERENCES.explorer[kind], ...explorer?.[kind] }]),
    ) as Record<ResourceKind, ExplorerPreferences>,
  }
}
