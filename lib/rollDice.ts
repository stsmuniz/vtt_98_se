export type RollType = 's' | 'h' | 'l'
export type DiceType = 4 | 6 | 8 | 10 | 12 | 20 | 100
export type ModSignal = '+' | '-'

export interface DiceGroup {
    quantity: number
    faces: DiceType
}

export interface RollResult {
    rolls: number[]
    result: number
    input: string
    type: RollType
}

const VALID_DICE = new Set<DiceType>([4, 6, 8, 10, 12, 20, 100])

function rollSingleDie(max: number): number {
    return Math.floor(Math.random() * max) + 1
}

function buildInput(groups: DiceGroup[], mod: number, modSignal: ModSignal): string {
    const dicePart = groups.map(g => `${g.quantity}d${g.faces}`).join('+')
    return mod === 0 ? dicePart : `${dicePart}${modSignal}${mod}`
}

/**
 * Rola um ou mais grupos de dados (ex: 2d6 + 1d8 + 1d20) em uma única rolagem.
 * `rollType` define como o resultado final é calculado a partir de todos os dados rolados:
 * "s" (soma) soma tudo, "h" (maior) usa o maior valor rolado, "l" (menor) usa o menor.
 * O modificador é aplicado uma única vez sobre o resultado final.
 */
export function rollDiceGroups(groups: DiceGroup[], rollType: RollType = 's', mod = 0, modSignal: ModSignal = '+'): RollResult {
    if (groups.length === 0) {
        throw new Error('Nenhum dado selecionado')
    }

    for (const group of groups) {
        if (group.quantity < 1 || group.quantity > 100) {
            throw new Error(`Quantidade de dados inválida: ${group.quantity}`)
        }

        if (!VALID_DICE.has(group.faces)) {
            throw new Error(`Tipo de dado não suportado: d${group.faces}`)
        }
    }

    const rolls = groups.flatMap(g => Array.from({ length: g.quantity }, () => rollSingleDie(g.faces)))
    const signedMod = modSignal === '-' ? -mod : mod

    const result =
        rollType === 's' ? rolls.reduce((sum, r) => sum + r, 0) + signedMod
        : rollType === 'h' ? Math.max(...rolls) + signedMod
        : Math.min(...rolls) + signedMod

    return {
        rolls,
        result,
        input: buildInput(groups, mod, modSignal),
        type: rollType,
    }
}
