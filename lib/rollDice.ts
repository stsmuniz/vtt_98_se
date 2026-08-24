export type RollType = 's' | 'h'
export type DiceType = 4 | 6 | 8 | 10 | 12 | 20 | 100

export interface RollResult {
    rolls: number[]
    result: number
    input: string
    type: RollType
}

const VALID_DICE = new Set<DiceType>([4, 6, 8, 10, 12, 20, 100])

/**
 * Rola dados no formato "XdY+Z" ou "XdY-Z" ou "dY"
 * Exemplos: "2d6+3", "1d20", "d8-1", "4d10"
 */
export function roll(rollInput: string, rollType: RollType = 's'): RollResult {
    const normalized = rollInput.trim().toLowerCase().replace(/\s+/g, '')

    // Aceita: [qty]d[faces][+|-mod]
    const match = normalized.match(/^(\d*)d(\d+)([+-]\d+)?$/)

    if (!match) {
        throw new Error(`Formato inválido: "${rollInput}". Use algo como "2d6+3" ou "d20"`)
    }

    const qty = match[1] === '' ? 1 : parseInt(match[1], 10)
    const faces = parseInt(match[2], 10) as DiceType
    const mod = match[3] ? parseInt(match[3], 10) : 0

    if (qty < 1 || qty > 100) {
        throw new Error(`Quantidade de dados inválida: ${qty}`)
    }

    if (!VALID_DICE.has(faces)) {
        throw new Error(`Tipo de dado não suportado: d${faces}`)
    }

    const rollDice = (max: number): number =>
        Math.floor(Math.random() * max) + 1

    const rolls: number[] = Array.from({ length: qty }, () => rollDice(faces))

    const result =
        rollType === 's'
            ? rolls.reduce((sum, r) => sum + r, 0) + mod
            : Math.max(...rolls) + mod   // modificador aplicado uma vez (comportamento mais comum)

    return {
        rolls,
        result,
        input: normalized,
        type: rollType,
    }
}