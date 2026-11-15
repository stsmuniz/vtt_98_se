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

/** Intervalo mínimo entre duas rolagens do mesmo jogador numa sala (o mestre não tem limite). */
export const DICE_COOLDOWN_MS = 5000

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

/** Máximo de dados num grupo (ex.: 100d6). */
export const MAX_DICE_PER_GROUP = 100
/** Máximo de grupos numa rolagem (há 8 tipos de dado; o rolador permite repetir o tipo). */
export const MAX_DICE_GROUPS = 10
/** Máximo de dados somando todos os grupos de uma rolagem. */
export const MAX_DICE_PER_ROLL = 200

/**
 * Confere a forma dos grupos de dados ANTES de sortear qualquer coisa (só olha números, não
 * aloca dados): lista não vazia e limitada, cada item um objeto com quantidade inteira em
 * 1..MAX_DICE_PER_GROUP e um tipo de dado suportado, e um total limitado de dados. Devolve os
 * grupos normalizados; lança Error com uma mensagem para o usuário.
 */
export function parseDiceGroups(raw: unknown): DiceGroup[] {
    if (!Array.isArray(raw) || raw.length === 0) {
        throw new Error('Nenhum dado selecionado')
    }
    if (raw.length > MAX_DICE_GROUPS) {
        throw new Error(`Máximo de ${MAX_DICE_GROUPS} grupos de dados por rolagem`)
    }

    let total = 0
    const groups = raw.map((item): DiceGroup => {
        if (!item || typeof item !== 'object') {
            throw new Error('Grupo de dados inválido')
        }
        const quantity = Number((item as Record<string, unknown>).quantity)
        const faces = Number((item as Record<string, unknown>).faces) as DiceType
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_DICE_PER_GROUP) {
            throw new Error(`Quantidade de dados inválida (de 1 a ${MAX_DICE_PER_GROUP})`)
        }
        if (!VALID_DICE.has(faces)) {
            throw new Error(`Tipo de dado não suportado: d${String((item as Record<string, unknown>).faces).slice(0, 10)}`)
        }
        total += quantity
        return { quantity, faces }
    })

    if (total > MAX_DICE_PER_ROLL) {
        throw new Error(`Máximo de ${MAX_DICE_PER_ROLL} dados por rolagem`)
    }
    return groups
}

/**
 * Um dado de `max` faces com o gerador criptográfico (Web Crypto: existe no navegador e no Node).
 * `Math.random` é previsível — com algumas saídas dá para reconstruir o estado e prever as
 * próximas rolagens. A rejeição de amostras evita o viés do módulo (2^32 não é múltiplo de max).
 */
function rollSingleDie(max: number): number {
    const limit = Math.floor(0x100000000 / max) * max
    const buffer = new Uint32Array(1)
    let value: number
    do {
        globalThis.crypto.getRandomValues(buffer)
        value = buffer[0]!
    } while (value >= limit)
    return (value % max) + 1
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
export function rollDiceGroups(rawGroups: DiceGroup[], rollType: RollType = 's', mod = 0, modSignal: ModSignal = '+', options: { coin?: boolean } = {}): RollResult {
    const groups = parseDiceGroups(rawGroups)

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
