import { useDrizzle } from "#server/utils/drizzle.ts";
import { eq } from "drizzle-orm";
import { createError, getRouterParam, readBody, setResponseStatus } from "h3";
import { roomsTable } from "#server/db/schema.ts";
import { compareSync } from "bcrypt-ts";

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

    // Uma sala fechada (`isOpen: false`) só é acessível para o dono — visitantes ficam de fora
    // até o dono reabri-la (ver o botão de abrir/fechar em app/pages/rooms/[code].vue).
    if (!room.isOpen && !isOwner) {
        throw createError({
            statusCode: 403,
            statusMessage: "Esta sala está fechada no momento.",
        })
    }

    const body = await readBody<{ password?: string, name?: string, token?: string }>(event).catch(() => null)

    const unavailable = () => createError({
        statusCode: 503,
        statusMessage: "O serviço de tempo real está indisponível no momento. Tente novamente em instantes.",
    })

    // Senha: conferida a cada entrada, a não ser que o token de uma entrada anterior (que já a
    // provou) seja reapresentado — recarregar a página não pede a senha de novo.
    let verified = !room.password || isOwner
    if (!verified) {
        const providedPassword = body?.password
        if (typeof providedPassword === 'string' && compareSync(providedPassword, room.password!)) {
            verified = true
        } else {
            try {
                verified = await isVerifiedParticipantToken(code, body?.token)
            } catch (error) {
                console.error(`Erro ao validar acesso à sala ${code} no Redis:`, error)
                throw unavailable()
            }
        }
        if (!verified) {
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
            verified: !!room.password,
        })

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

    const { password, ...roomWithoutPassword } = room

    return {
        ...roomWithoutPassword,
        hasPassword: !!password,
        role: isOwner ? 'gm' : 'player',
        accessToken,
        participant: { id: participant.id, name: participant.name },
    }
})
