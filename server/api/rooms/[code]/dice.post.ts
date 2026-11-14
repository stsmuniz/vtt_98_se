import { eq } from 'drizzle-orm'
import { roomsTable } from '#server/db/schema.ts'
import { createError, getQuery, getRouterParam, readBody } from 'h3'
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

    const session = await auth.api.getSession({ headers: event.headers }).catch(() => null)
    const isOwner = !!session?.user && session.user.id === room.userId

    if (!room.isOpen && !isOwner) {
        throw createError({ statusCode: 403, statusMessage: 'Esta sala está fechada no momento.' })
    }

    if (room.password && !isOwner) {
        const token = getQuery(event).token
        const grantedCode = typeof token === 'string'
            ? await redis.get(`room-access:${token}`).catch(() => null)
            : null
        if (grantedCode !== code) {
            throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
        }
    }

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
        by?: string
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

    const by = isOwner
        ? (session!.user.name || 'Mestre')
        : (typeof body.by === 'string' && body.by.trim() ? body.by.trim().slice(0, 30) : 'Jogador')

    const roll = {
        ...result,
        id: crypto.randomUUID(),
        at: Date.now(),
        by,
        hidden: isOwner && body.hidden === true,
    }

    await appendDiceRoll(code, roll)
    await broadcastDiceRoll(code, roll)

    return roll
})
