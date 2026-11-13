/** Cores padrão das barras de atributo (usadas por posição até o mestre escolher outra). */
export const DEFAULT_BAR_COLORS = ['#c80000', '#0000c8', '#00a000', '#e0a000', '#8000a0', '#00a0a0']

export function defaultBarColor(index: number): string {
  return DEFAULT_BAR_COLORS[index % DEFAULT_BAR_COLORS.length]!
}

type BarAttribute = { value?: string | number; currentValue?: string | number; maxValue?: string | number }

/** Fração (0–1) preenchida: atual / máximo. `null` se os valores não forem numéricos. */
export function barFraction(attribute: BarAttribute): number | null {
  const current = Number(attribute.currentValue ?? attribute.value)
  const max = Number(attribute.maxValue ?? attribute.value)
  if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0) return null
  return Math.min(1, Math.max(0, current / max))
}
