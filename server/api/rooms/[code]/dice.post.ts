import { eq } from 'drizzle-orm'
import { roomsTable } from '#server/db/schema.ts'
import { createError, getRouterParam, readBody } from 'h3'
import { rollDiceGroups, type DiceGroup, type RollType, type ModSignal } from '../../../../lib/rollDice'

// Rolagem de dados dentro da sala: qualquer participante (mesma checagem de acesso do
// events.get.ts) rola; o servidor sorteia, grava no histórico da sala e transmite a todos.
// `hidden` só vale para o dono (mestre) e a rolagem só é entregue a ele.
export default defineEventHandler(async (event) => {
    const code = getRouterParam(event, 'code')
    if (!code) {
        throw createError({ statusCode: 400, statusMessage: 'Código da sala não informado.' })
    }

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
        groups?: DiceGroup[]
        type?: RollType
        mod?: number
        modSignal?: ModSignal
        hidden?: boolean
        coin?: boolean
    }>(event).catch(() => null)

    if (!body || !Array.isArray(body.groups)) {
        throw createError({ statusCode: 400, statusMessage: 'Nenhum dado enviado.' })
    }

    const type: RollType = body.type === 'h' || body.type === 'l' || body.type === 'g' ? body.type : 's'
    const modSignal: ModSignal = body.modSignal === '-' ? '-' : '+'
    const mod = Math.min(Math.max(Math.trunc(Number(body.mod) || 0), 0), 1000)
    const groups = body.groups.map(g => ({ quantity: Math.trunc(Number(g.quantity)), faces: Number(g.faces) as DiceGroup['faces'] }))

    let result
    try {
        result = rollDiceGroups(groups, type, mod, modSignal, { coin: body.coin === true })
    } catch (error) {
        throw createError({ statusCode: 400, statusMessage: (error as Error).message })
    }

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
