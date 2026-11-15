import { eq } from 'drizzle-orm'
import { roomsTable } from '#server/db/schema.ts'
import { createError, getRouterParam, readBody, setResponseHeader } from 'h3'
import { parseDiceGroups, rollDiceGroups, type DiceGroup, type RollType, type ModSignal } from '../../../../lib/rollDice'

// Rolagem de dados dentro da sala: qualquer participante (mesma checagem de acesso do
// events.get.ts) rola; o servidor sorteia, grava no histórico da sala e transmite a todos.
// `hidden` só vale para o dono (mestre) e a rolagem só é entregue a ele.
export default defineEventHandler(async (event) => {
    const code = getRouterParam(event, 'code')
    if (!code) {
        throw createError({ statusCode: 400, statusMessage: 'Código da sala não informado.' })
    }

    // Limite por IP antes de qualquer trabalho (o intervalo por jogador vem depois, já com a
    // identidade). Folgado para uma mesa inteira atrás do mesmo IP, mestre incluído.
    await enforceRateLimit(event, [{ key: `dice:ip:${clientIp(event)}`, max: 120, window: 60 }])

    const room = await useDrizzle().query.roomsTable.findFirst({
        where: eq(roomsTable.code, code),
    })
    if (!room) {
        throw createError({ statusCode: 404, statusMessage: 'Sala não encontrada.' })
    }

    // Quem rola é quem o servidor identifica (sessão do dono ou token de /join) — o nome nunca
    // vem do corpo da requisição, então ninguém rola "como" outra pessoa.
    const participant = await resolveRoomParticipant(event, room)
    const isOwner = participant.role === 'gm'

    // O mestre pode reservar as rolagens para si (Configurações de Sala).
    if (!isOwner && room.settings?.allowPlayerRolls === false) {
        throw createError({ statusCode: 403, statusMessage: 'O mestre desativou as rolagens de dados dos jogadores.' })
    }

    const body = await readBody<{
        groups?: unknown
        type?: RollType
        mod?: number
        modSignal?: ModSignal
        hidden?: boolean
        coin?: boolean
    }>(event).catch(() => null)

    if (!body || typeof body !== 'object' || !Array.isArray(body.groups)) {
        throw createError({ statusCode: 400, statusMessage: 'Nenhum dado enviado.' })
    }

    const type: RollType = body.type === 'h' || body.type === 'l' || body.type === 'g' ? body.type : 's'
    const modSignal: ModSignal = body.modSignal === '-' ? '-' : '+'
    const mod = Math.min(Math.max(Math.trunc(Number(body.mod) || 0), 0), 1000)

    // Validação barata (só a forma e os limites de grupos/dados, sem sortear nada) antes de
    // qualquer outra coisa: vale para todos, inclusive o mestre.
    let groups: DiceGroup[]
    try {
        groups = parseDiceGroups(body.groups)
    } catch (error) {
        throw createError({ statusCode: 400, statusMessage: (error as Error).message })
    }

    // Uma rolagem a cada DICE_COOLDOWN_MS por jogador (o mestre não tem limite). Reivindicada
    // depois da validação (um pedido inválido não gasta o intervalo) mas ANTES do sorteio, para
    // que pedidos que acabam em 429 não gastem CPU; sem identidade (Redis fora do ar) não há
    // como limitar por pessoa, então libera.
    if (!isOwner && participant.id !== 'anonimo') {
        const waitMs = await claimRollSlot(code, participant.id)
        if (waitMs > 0) {
            const seconds = Math.ceil(waitMs / 1000)
            setResponseHeader(event, 'Retry-After', seconds)
            throw createError({
                statusCode: 429,
                statusMessage: `Aguarde ${seconds} ${seconds === 1 ? 'segundo' : 'segundos'} para rolar de novo.`,
                data: { retryAfterMs: waitMs },
            })
        }
    }

    const result = rollDiceGroups(groups, type, mod, modSignal, { coin: body.coin === true })

    const roll = {
        ...result,
        id: crypto.randomUUID(),
        at: Date.now(),
        by: participant.name,
        byId: participant.id,
        hidden: isOwner && body.hidden === true,
    }

    await appendDiceRoll(code, roll)
    await broadcastDiceRoll(code, roll)

    return roll
})
