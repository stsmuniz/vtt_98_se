/** s = soma, h = maior, l = menor, g = grupos exibidos separadamente (2d20: 26, 1d100: 48). */
export type RollType = 's' | 'h' | 'l' | 'g'
export type DiceType = 2 | 4 | 6 | 8 | 10 | 12 | 20 | 100
export type ModSignal = '+' | '-'

export interface DiceGroup {
    quantity: number
    faces: DiceType
}

export interface RollResult {
    rolls: number[]
    /** Faces de cada dado rolado (paralelo a `rolls`). */
    faces: number[]
    /** Dados que não contaram no resultado (rolagens "maior"/"menor"); paralelo a `rolls`. */
    dropped: boolean[]
    result: number
    input: string
    type: RollType
    /** Cada grupo rolado, com o seu total (sempre preenchido em rolagens novas). */
    groups?: RollGroupResult[]
    /** d2 exibido como cara (1) ou coroa (2). */
    coin?: boolean
}

export interface RollGroupResult {
    quantity: number
    faces: number
    rolls: number[]
    total: number
}

/** Rolagem registrada no histórico (local ou da sala). */
export interface RoomRoll extends RollResult {
    id: string
    at: number
    by: string
    /** Id de participante de quem rolou (só em salas; ver server/utils/roomParticipants.ts). */
    byId?: string
    hidden: boolean
}

const VALID_DICE = new Set<DiceType>([2, 4, 6, 8, 10, 12, 20, 100])

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
export function rollDiceGroups(groups: DiceGroup[], rollType: RollType = 's', mod = 0, modSignal: ModSignal = '+', options: { coin?: boolean } = {}): RollResult {
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

    const faces = groups.flatMap(g => Array.from({ length: g.quantity }, () => g.faces as number))
    const rolls = faces.map(f => rollSingleDie(f))

    // Quebra dos dados rolados por grupo (a ordem de `rolls` segue a de `groups`).
    let offset = 0
    const groupResults: RollGroupResult[] = groups.map((g) => {
        const slice = rolls.slice(offset, offset + g.quantity)
        offset += g.quantity
        return { quantity: g.quantity, faces: g.faces, rolls: slice, total: slice.reduce((sum, r) => sum + r, 0) }
    })
    const signedMod = modSignal === '-' ? -mod : mod

    // Em "separado" o modificador não se aplica (cada grupo mostra só a sua soma).
    const result =
        rollType === 'g' ? rolls.reduce((sum, r) => sum + r, 0)
        : rollType === 's' ? rolls.reduce((sum, r) => sum + r, 0) + signedMod
        : rollType === 'h' ? Math.max(...rolls) + signedMod
        : Math.min(...rolls) + signedMod

    const keptIndex =
        rollType === 'h' ? rolls.indexOf(Math.max(...rolls))
        : rollType === 'l' ? rolls.indexOf(Math.min(...rolls))
        : -1
    const dropped = rolls.map((_, i) => (rollType === 'h' || rollType === 'l') && i !== keptIndex)
    const appliedMod = rollType === 'g' ? 0 : mod

    return {
        rolls,
        faces,
        dropped,
        result,
        input: buildInput(groups, appliedMod, modSignal),
        type: rollType,
        groups: groupResults,
        coin: options.coin === true,
    }
}

export const COIN_HEADS = 'Cara'
export const COIN_TAILS = 'Coroa'

/** Texto de um dado: número, ou Cara/Coroa quando é um d2 e a rolagem usa cara-ou-coroa. */
export function dieText(roll: Pick<RollResult, 'coin'>, faces: number, value: number): string {
    return roll.coin && faces === 2 ? (value === 1 ? COIN_HEADS : COIN_TAILS) : String(value)
}

function groupTotalText(roll: Pick<RollResult, 'coin'>, group: RollGroupResult): string {
    if (!(roll.coin && group.faces === 2)) return String(group.total)
    if (group.rolls.length === 1) return dieText(roll, 2, group.rolls[0]!)
    const heads = group.rolls.filter(r => r === 1).length
    const tails = group.rolls.length - heads
    return `${heads} ${heads === 1 ? 'cara' : 'caras'}, ${tails} ${tails === 1 ? 'coroa' : 'coroas'}`
}

/**
 * Linhas do resultado de uma rolagem: uma única (o total) ou, em "separado", uma por grupo
 * ("2d20: 26"). Tolera rolagens antigas sem `groups`.
 */
export function rollSummaryParts(roll: RollResult): string[] {
    if (roll.type === 'g' && roll.groups?.length) {
        return roll.groups.map(g => `${g.quantity}d${g.faces}: ${groupTotalText(roll, g)}`)
    }
    // Um único d2 de cara-ou-coroa, sem modificador: mostra a palavra em vez do número.
    if (roll.coin && roll.rolls.length === 1 && roll.faces[0] === 2 && roll.result === roll.rolls[0]) {
        return [dieText(roll, 2, roll.rolls[0]!)]
    }
    return [String(roll.result)]
}
