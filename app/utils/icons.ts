/**
 * Mapa central de ícones do VTT 98 SE.
 *
 * Todo ícone usado na interface deve ser referenciado por um nome lógico daqui
 * (`iconUrl('folder', 32)`), nunca por caminho de arquivo. Assim trocar um ícone
 * é mudar uma linha, e o arquivo de atribuição continua correto.
 *
 * - Ícones do tema Chicago95 (GPL-3.0+/MIT) ficam em
 *   public/assets/icons/chicago95/{16,32,48}/<nome>.png — ver ATTRIBUTION.md lá.
 * - Ícones próprios do projeto (dados, iniciativa, logo) ficam em CUSTOM_ICONS.
 */

export type IconSize = 16 | 32 | 48

const CHICAGO95_BASE = '/assets/icons/chicago95'

/** Nomes disponíveis no conjunto Chicago95 copiado para o projeto. */
export const CHICAGO95_ICONS = [
  'accessories', 'computer', 'copy', 'delete', 'desktop', 'display', 'edit', 'error',
  'folder', 'folder-open', 'fullscreen', 'games', 'help', 'help-contents', 'image', 'info',
  'link', 'lock', 'logoff', 'network', 'new', 'open', 'password', 'programs', 'properties',
  'question', 'refresh', 'room', 'save', 'scenario', 'scene', 'search', 'settings',
  'shutdown', 'sound', 'token', 'user', 'users', 'view-details', 'view-icons', 'view-list',
  'volume', 'volume-muted', 'wallpaper', 'warning', 'zoom-in', 'zoom-out',
] as const

/**
 * Tamanhos que NÃO existem no tema para um dado ícone. O `iconUrl` cai para o
 * tamanho disponível mais próximo (o navegador escala com `image-rendering: pixelated`).
 */
const MISSING_SIZES: Partial<Record<Chicago95Icon, IconSize[]>> = {
  'view-details': [32, 48],
  'view-icons': [32, 48],
  'view-list': [32, 48],
  volume: [48],
  'volume-muted': [48],
}

/** Ícones próprios do projeto (tamanho único; o arquivo é usado em qualquer tamanho). */
const CUSTOM_ICONS = {
  d2: '/assets/icons/dices/d2.png', // moeda (gerada para o projeto)
  d4: '/assets/icons/dices/d4.png',
  d6: '/assets/icons/dices/d6.png',
  d8: '/assets/icons/dices/d8.png',
  d10: '/assets/icons/dices/d10.png',
  d12: '/assets/icons/dices/d12.png',
  d20: '/assets/icons/dices/d20.png',
  dice: '/assets/icons/dices/d20.png',
  initiative: '/assets/icons/initiative.png',
  logo: '/assets/logos/vtt_98_se_logo_v1.png',
} as const

export type Chicago95Icon = (typeof CHICAGO95_ICONS)[number]
export type CustomIcon = keyof typeof CUSTOM_ICONS
export type IconName = Chicago95Icon | CustomIcon

const chicagoSet = new Set<string>(CHICAGO95_ICONS)

export function isIconName(name: string): name is IconName {
  return chicagoSet.has(name) || name in CUSTOM_ICONS
}

/**
 * Selo (ícone de sobreposição): metade do tamanho do ícone de base, no canto inferior direito.
 * Usa o arquivo mais próximo do tamanho final (16 px para bases de até 32 px, senão 32 px).
 */
export function overlayMetrics(name: IconName, basePx: number): { url: string; px: number } {
  const px = Math.max(8, Math.round(basePx / 2))
  return { url: iconUrl(name, px <= 16 ? 16 : 32), px }
}

/** Resolve o caminho público de um ícone no tamanho pedido (ou o mais próximo disponível). */
export function iconUrl(name: IconName, size: IconSize = 32): string {
  if (name in CUSTOM_ICONS) return CUSTOM_ICONS[name as CustomIcon]

  const missing = MISSING_SIZES[name as Chicago95Icon] ?? []
  let resolved: IconSize = size
  if (missing.includes(size)) {
    const available = ([16, 32, 48] as IconSize[]).filter(s => !missing.includes(s))
    resolved = available.reduce((best, s) => (Math.abs(s - size) < Math.abs(best - size) ? s : best))
  }
  return `${CHICAGO95_BASE}/${resolved}/${name}.png`
}
