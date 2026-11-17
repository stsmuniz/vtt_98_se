import { useDrizzle } from "#server/utils/drizzle.ts";
import { eq } from "drizzle-orm";
import { createError, getRouterParam, readBody, setResponseStatus } from "h3";
import { roomsTable, user } from "#server/db/schema.ts";
import { compare } from "bcrypt-ts";
import { playerRoomResource, publicRoomResource } from "#server/utils/resources.ts";

// Password is read from the JSON body (never a query string) so it never ends up in
// access logs, proxy logs, or browser history.
export default defineEventHandler(async (event) => {
    const code = getRouterParam(event, 'code')

    if (!code) {
        throw createError({
            statusCode: 400,
            statusMessage: "Código da Sala não informado."
        })
    }

    // Limite geral por IP (antes de tocar no banco). Folgado o bastante para uma mesa inteira atrás
    // do mesmo IP (mesma casa) com todos aguardando aprovação, já que o cliente consulta o /join a
    // cada 3 s enquanto espera.
    const ip = clientIp(event)
    await enforceRateLimit(event, [{ key: `join:ip:${ip}`, max: 120, window: 60 }])

    const room = await useDrizzle().query.roomsTable.findFirst({
        where: eq(roomsTable.code, code),
        with: {
            sourceScene: {
                with: {
                    scenario: true
                }
            }
        }
    })

    if (!room) {
        throw createError({
            statusCode: 404,
            statusMessage: "Sala não encontrada.",
        })
    }

    const session = await auth.api.getSession({ headers: event.headers })
    const isOwner = !!session?.user && session.user.id === room.userId
    // O nome do dono fica reservado para ele na sala (ninguém se passa pelo mestre).
    const owner = isOwner ? null : await useDrizzle().query.user.findFirst({
        where: eq(user.id, room.userId),
        columns: { name: true },
    })

    const body = await readBody<{ password?: string, name?: string, token?: string }>(event).catch(() => null)

    const unavailable = () => createError({
        statusCode: 503,
        statusMessage: "O serviço de tempo real está indisponível no momento. Tente novamente em instantes.",
    })

    // Sala fechada (`isOpen: false`): ninguém além do mestre entra — nem quem já estava dentro,
    // que é desconectado no momento em que o mestre fecha (ver `broadcastRoomShut` no PATCH da
    // sala). Volta-se só quando ela for reaberta.
    if (!room.isOpen && !isOwner) {
        throw createError({
            statusCode: 403,
            statusMessage: "Esta sala está fechada no momento.",
            data: { reason: 'closed' },
        })
    }

    // Senha: conferida a cada entrada, a não ser que o token de uma entrada anterior (que já a
    // provou) seja reapresentado — recarregar a página não pede a senha de novo. O token vem
    // primeiro: é barato e é o caso comum (o cliente reenvia a senha guardada a cada consulta
    // enquanto aguarda a aprovação do mestre, e isso não deve contar como tentativa).
    let verified = !room.password || isOwner
    // Senha digitada e conferida AGORA (a prova trazida pelo token anterior não renova o prazo).
    let passwordProvedNow = false
    const accessTag = roomAccessTag(room.password)
    if (!verified) {
        let redisFailed = false
        try {
            verified = await isVerifiedParticipantToken(code, body?.token, accessTag)
        } catch (error) {
            console.error(`Erro ao validar acesso à sala ${code} no Redis:`, error)
            redisFailed = true
        }

        const providedPassword = body?.password
        if (!verified && typeof providedPassword === 'string' && providedPassword) {
            // Senhas erradas bloqueiam este IP nesta sala por um tempo crescente (1, 3, 5 e 10
            // minutos; ver server/utils/rateLimit.ts). Durante o bloqueio nem chega a conferir a
            // senha. O teto por sala (vários IPs) segura a força bruta distribuída. Tudo antes do
            // bcrypt, que é o trabalho caro; o assíncrono não trava o event loop (e com ele as
            // streams de eventos abertas na mesma instância).
            const lockKey = `join:ip:${ip}:${code}`
            const remaining = await passwordLockRemaining(lockKey)
            if (remaining > 0) {
                throw passwordLockedError(event, remaining, 'Muitas tentativas de senha. Aguarde para tentar de novo.')
            }
            await enforceRateLimit(event, [
                { key: `join-password:room:${code}`, max: 60, window: 600 },
            ], 'Muitas tentativas de senha nesta sala. Aguarde alguns minutos e tente de novo.')

            verified = await compare(providedPassword, room.password!)
            if (verified) {
                passwordProvedNow = true
                await clearPasswordFailures(lockKey)
            } else {
                const lockMs = await registerPasswordFailure(lockKey)
                if (lockMs > 0) {
                    throw passwordLockedError(event, lockMs, 'Senha incorreta. Muitas tentativas: aguarde para tentar de novo.')
                }
            }
        }

        if (!verified) {
            if (redisFailed) throw unavailable()
            throw createError({
                statusCode: 401,
                statusMessage: "Senha incorreta.",
            })
        }
    }

    const requireApproval = !isOwner && room.settings?.requireApproval === true

    // Identidade: quem entra recebe um token opaco (guardado no Redis) que a stream de eventos
    // (events.get.ts) e a rolagem (dice.post.ts) aceitam no lugar da senha/cookie e que diz QUEM
    // é — nome único na sala e id de participante. O dono continua reconhecido pela sessão.
    // Sala com senha precisa do Redis para isto (503); sala aberta segue funcionando sem ele,
    // só que sem identidade/presença.
    let participant: RoomParticipant
    let accessToken: string | undefined
    try {
        const identity = await joinRoomIdentity({
            code,
            user: session?.user,
            isOwner,
            name: body?.name,
            token: body?.token,
            ownerName: owner?.name,
            verified: passwordProvedNow,
            accessTag,
        })

        if (!identity.ok && identity.reason === 'room-full') {
            throw createError({ statusCode: 429, statusMessage: "A sala atingiu o limite de participantes.", data: { reason: 'room-full' } })
        }
        if (!identity.ok) {
            throw createError(identity.reason === 'name-required'
                ? { statusCode: 400, statusMessage: "Informe o seu nome para entrar na sala.", data: { reason: 'name-required' } }
                : identity.reason === 'kicked'
                    ? (identity.denied
                        ? { statusCode: 403, statusMessage: "O mestre não aprovou a sua entrada.", data: { reason: 'denied' } }
                        : { statusCode: 403, statusMessage: "Você foi removido da sala pelo mestre.", data: { reason: 'kicked' } })
                    : { statusCode: 409, statusMessage: "Já existe alguém na sala com esse nome. Escolha outro.", data: { reason: 'name-taken' } })
        }

        participant = identity.participant
        accessToken = identity.token
    } catch (error) {
        if ((error as { statusCode?: number })?.statusCode) throw error
        console.error(`Erro ao registrar participante da sala ${code} no Redis:`, error)
        // Senha e aprovação do mestre dependem do Redis: sem ele não há como garantir o controle.
        if (room.password || requireApproval) throw unavailable()
        participant = isOwner
            ? { id: 'anonimo', name: session?.user?.name || 'Mestre', role: 'gm' }
            : { id: 'anonimo', name: 'Jogador', role: 'player' }
    }

    // Aprovação do mestre (Configurações de Sala > Acesso): o nome já está reservado e o token
    // emitido, mas a sala só é entregue depois que o mestre aprovar. Enquanto isso o cliente
    // reapresenta o token a cada poucos segundos e recebe 202 até a decisão.
    if (!isOwner && participant.id !== 'anonimo') {
        let admission
        try {
            admission = await checkAdmission(code, participant, requireApproval)
        } catch (error) {
            console.error(`Erro ao verificar a aprovação de entrada na sala ${code} no Redis:`, error)
            throw unavailable()
        }

        if (admission.status === 'full') {
            throw createError({
                statusCode: 429,
                statusMessage: "Há muitos pedidos aguardando a aprovação do mestre. Tente de novo em instantes.",
                data: { reason: 'pending-full' },
            })
        }

        if (admission.status === 'pending') {
            if (admission.created) await broadcastJoinRequest(code, { id: participant.id, name: participant.name })
            setResponseStatus(event, 202)
            return {
                pending: true,
                accessToken,
                participant: { id: participant.id, name: participant.name },
            }
        }
    }

    // O mestre recebe a sala inteira; o jogador, só a visão de jogador (sem atributos ocultos,
    // sem a cena de origem e sem o id do dono). Nenhum dos dois recebe o hash da senha.
    return {
        ...(isOwner ? publicRoomResource(room) : playerRoomResource(room)),
        role: isOwner ? 'gm' : 'player',
        accessToken,
        participant: { id: participant.id, name: participant.name },
    }
})
