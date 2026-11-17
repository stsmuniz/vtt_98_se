import { createHash } from 'node:crypto'
import { createError, getHeader, getQuery, type H3Event } from 'h3'

// Identidade e presença de quem está numa sala.
//
// Quem entra (/join) recebe um token opaco guardado no Redis que o identifica (nome + id de
// participante) e que events.get.ts / dice.post.ts exigem no lugar da senha ou do cookie. O dono
// da sala não usa token: é reconhecido pela sessão do better-auth, como antes. O nome é livre,
// mas único por sala (comparado sem caixa, acentos e espaços repetidos). Tudo vive no Redis —
// quando houver convites/campanhas, o `id` do participante pode virar a chave de uma
// `room_players` estendida.

export type RoomParticipantRole = 'gm' | 'player'

export interface RoomParticipant {
    /** Público: aparece na lista de presença e nas rolagens (`byId`). Nunca é o token. */
    id: string
    name: string
    role: RoomParticipantRole
    userId?: string
}

interface StoredParticipant extends RoomParticipant {
    code: string
    /** A senha da sala (se havia) já foi conferida para emitir este token. */
    verified: boolean
    /** Marca da senha que foi conferida (`roomAccessTag`): trocar ou remover a senha a invalida. */
    accessTag?: string
    /** Quando a senha foi conferida (ms). A prova vale no máximo VERIFIED_MAX_MS. */
    verifiedAt?: number
}

interface PresenceEntry {
    id: string
    name: string
    role: RoomParticipantRole
    seen: number
}

export const MAX_PARTICIPANT_NAME = 30

const TOKEN_TTL_SECONDS = 60 * 60 * 12
/**
 * Teto absoluto da senha provada: o token é renovado a cada uso (e nunca venceria numa sala
 * frequentada), mas a prova da senha não — depois disso a senha é pedida de novo.
 */
const VERIFIED_MAX_MS = 24 * 60 * 60_000
/** Quanto tempo o nome fica reservado depois que o participante some (recarregar a página, etc.). */
const NAME_GRACE_MS = 5 * 60_000
/** Sem sinal de vida (ping a cada 20s) por este tempo, o participante sai da lista. */
const PRESENCE_STALE_MS = 60_000

// Tetos contra inundação: sem eles, numa sala sem senha qualquer um com o código podia reservar
// nomes sem limite (deixando os jogadores reais sem nome), encher o mestre de pedidos de entrada
// e abrir streams em massa.
/** Nomes reservados ao mesmo tempo numa sala (os de quem sumiu há mais de NAME_GRACE_MS não contam). */
export const MAX_ROOM_NAMES = 100
/** Pedidos de entrada aguardando o mestre ao mesmo tempo. */
export const MAX_PENDING_REQUESTS = 20
/** Streams de eventos abertas ao mesmo tempo pelo mesmo participante (abas, reconexões). */
export const MAX_STREAMS_PER_PARTICIPANT = 5

const tokenKey = (token: string) => `room-participant:${token}`
const namesKey = (code: string) => `room:${code}:names`
const presenceKey = (code: string) => `room:${code}:presence`

// O cliente do Upstash devolve objetos já desserializados quando o JSON é válido, mas strings
// continuam possíveis — aceita as duas formas.
function parse<T>(value: unknown): T | null {
    if (value == null) return null
    if (typeof value === 'string') {
        try { return JSON.parse(value) as T } catch { return null }
    }
    return value as T
}

export function cleanParticipantName(name: unknown): string {
    if (typeof name !== 'string') return ''
    // Tira caracteres de controle e de formatação invisíveis (largura zero, marcas de direção
    // bidi, hífen discreto...): "Mestre" + U+200B pareceria o nome do mestre e passaria na
    // checagem de nome único.
    return name.replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/\s+/g, ' ').trim().slice(0, MAX_PARTICIPANT_NAME)
}

function normalizeName(name: string): string {
    // NFKC antes: variantes de compatibilidade (letras de largura total, ligaduras) contam como
    // a letra comum na comparação de nomes.
    return name.normalize('NFKC').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** Nome que o dono da sala usa nela (o mesmo critério de `joinRoomIdentity` para o mestre). */
export function ownerDisplayName(ownerName: unknown): string {
    return cleanParticipantName(ownerName) || 'Mestre'
}

/** Id estável (e não reversível) de um usuário logado numa sala. */
export function participantIdForUser(code: string, userId: string): string {
    return createHash('sha256').update(`${code}:${userId}`).digest('hex').slice(0, 16)
}

/**
 * Reserva `desired` para o participante `id`. Devolve o nome efetivo ou `null` se estiver em
 * uso por outro (e `allowSuffix` for falso). Com `allowSuffix`, tenta "Nome (2)", "Nome (3)"...
 * Com `force` (dono), toma o nome mesmo que esteja reservado.
 */
async function reserveName(code: string, id: string, desired: string, opts: { allowSuffix?: boolean, force?: boolean, reserved?: string } = {}): Promise<string | null> {
    const reserved = opts.reserved ? normalizeName(opts.reserved) : null
    for (let attempt = 1; attempt <= 50; attempt++) {
        if (attempt > 1 && !opts.allowSuffix) return null
        const candidate = attempt === 1
            ? desired
            : `${desired.slice(0, MAX_PARTICIPANT_NAME - 5)} (${attempt})`
        const field = normalizeName(candidate)
        // O nome do dono da sala é sempre dele, esteja ele conectado ou não.
        if (!opts.force && field === reserved) continue
        const holder = parse<{ id: string, seen: number }>(await redis.hget(namesKey(code), field))
        const entry = { id, seen: Date.now() }

        if (!holder) {
            // HSETNX: duas entradas simultâneas com o mesmo nome não passam as duas.
            if (await redis.hsetnx(namesKey(code), field, entry)) {
                await redis.expire(namesKey(code), TOKEN_TTL_SECONDS)
                return candidate
            }
            continue
        }

        if (opts.force || holder.id === id || Date.now() - holder.seen > NAME_GRACE_MS) {
            await redis.hset(namesKey(code), { [field]: entry })
            await redis.expire(namesKey(code), TOKEN_TTL_SECONDS)
            return candidate
        }
    }
    return null
}

/**
 * Cabe mais um nome na sala para `id`? Quem já reserva um nome sempre cabe. No teto, libera antes
 * os nomes de quem sumiu há mais de NAME_GRACE_MS (que já poderiam ser tomados por outro).
 */
async function hasRoomForNewName(code: string, id: string): Promise<boolean> {
    if ((await redis.hlen(namesKey(code))) < MAX_ROOM_NAMES) return true
    const all = await redis.hgetall(namesKey(code)) as Record<string, unknown> | null
    const limit = Date.now() - NAME_GRACE_MS
    let active = 0
    for (const [field, value] of Object.entries(all ?? {})) {
        const holder = parse<{ id: string, seen: number }>(value)
        if (holder?.id === id) return true
        if (!holder || holder.seen < limit) await redis.hdel(namesKey(code), field)
        else active++
    }
    return active < MAX_ROOM_NAMES
}

async function releaseName(code: string, id: string, name: string) {
    const field = normalizeName(name)
    const holder = parse<{ id: string }>(await redis.hget(namesKey(code), field))
    if (holder?.id === id) await redis.hdel(namesKey(code), field)
}

/**
 * Marca da senha atual de uma sala, guardada no token quando a senha é conferida. Muda sempre que
 * a senha é definida, trocada ou removida (o bcrypt gera um sal novo a cada hash), o que invalida
 * a prova de quem conhecia a senha antiga. Derivada do hash e truncada: não serve para nada além
 * de comparar.
 */
export function roomAccessTag(passwordHash: string | null | undefined): string {
    return createHash('sha256').update(`room-access:${passwordHash ?? ''}`).digest('hex').slice(0, 16)
}

/** A senha provada por este token ainda vale (mesma senha e dentro do teto)? */
function hasValidVerification(stored: StoredParticipant | null | undefined, accessTag: string): boolean {
    return !!stored
        && stored.verified
        && stored.accessTag === accessTag
        && typeof stored.verifiedAt === 'number'
        && Date.now() - stored.verifiedAt < VERIFIED_MAX_MS
}

/** O token já foi emitido para esta sala e provou a senha ATUAL? (reentrada sem digitar a senha de novo) */
export async function isVerifiedParticipantToken(code: string, token: unknown, accessTag: string): Promise<boolean> {
    if (typeof token !== 'string') return false
    const stored = parse<StoredParticipant>(await redis.get(tokenKey(token)))
    return !!stored && stored.code === code && hasValidVerification(stored, accessTag)
}

/**
 * A senha da sala mudou com este participante conectado (stream aberta): ele continua na sala,
 * então o token passa a provar a senha nova. Quem não estava conectado não passa por aqui e
 * precisa da senha nova para voltar.
 */
export async function reverifyParticipantToken(code: string, token: unknown, accessTag: string) {
    if (typeof token !== 'string') return
    const stored = parse<StoredParticipant>(await redis.get(tokenKey(token)))
    if (!stored || stored.code !== code) return
    await redis.set(tokenKey(token), { ...stored, verified: true, accessTag, verifiedAt: Date.now() }, { ex: TOKEN_TTL_SECONDS })
}

export interface JoinIdentityInput {
    code: string
    /** Sessão do better-auth, se houver. */
    user?: { id: string, name?: string | null } | null
    isOwner: boolean
    /** Nome informado pelo visitante deslogado. */
    name?: unknown
    /** Token de uma entrada anterior (recarregar a página mantém nome e id). */
    token?: unknown
    /** Nome da conta do dono da sala: reservado para ele (ninguém mais entra com esse nome). */
    ownerName?: string | null
    /** A senha da sala acabou de ser digitada e conferida (o token anterior, se ainda válido, é levado adiante sozinho). */
    verified: boolean
    /** Marca da senha atual da sala (`roomAccessTag`). */
    accessTag: string
}

export type JoinIdentityResult =
    | { ok: true, participant: RoomParticipant, token?: string }
    /** `room-full`: a sala chegou a MAX_ROOM_NAMES participantes. */
    | { ok: false, reason: 'name-required' | 'name-taken' | 'room-full' }
    /** `denied`: o mestre recusou a entrada (em vez de remover alguém que já estava na sala). */
    | { ok: false, reason: 'kicked', denied: boolean }

// ---- Expulsão ----
// Ids de participante removidos pelo mestre, por sala. Vale por id: quem tem conta é sempre o
// mesmo id na sala (não volta nem deslogando); um visitante sem conta que limpar os dados do
// navegador ganha um id novo e consegue entrar de novo (o mestre pode então fechar a sala ou
// pôr uma senha).
// Hash id -> { name, at }: o nome fica guardado para o mestre ver (e readmitir) quem foi removido.
const kickedKey = (code: string) => `room:${code}:banned`

export interface KickedItem {
    id: string
    name: string
    at: number
    /** Recusado na aprovação de entrada (nunca chegou a entrar), em vez de removido da sala. */
    denied?: boolean
}

export async function isKicked(code: string, id: string): Promise<boolean> {
    return (await redis.hexists(kickedKey(code), id)) === 1
}

/** A entrada do bloqueio de `id` (ou `null`): usada para dar a mensagem certa a quem foi barrado. */
async function getKicked(code: string, id: string): Promise<KickedItem | null> {
    const value = parse<Omit<KickedItem, 'id'>>(await redis.hget(kickedKey(code), id))
    return value ? { id, ...value } : null
}

export async function listKicked(code: string): Promise<KickedItem[]> {
    const all = await redis.hgetall(kickedKey(code)) as Record<string, unknown> | null
    return Object.entries(all ?? {})
        .map(([id, value]) => ({ id, ...(parse<{ name: string, at: number, denied?: boolean }>(value) ?? { name: 'Participante', at: 0 }) }))
        .sort((a, b) => b.at - a.at)
}

/** Readmite `id`: ele volta a poder entrar (com um novo join). */
export async function unkickParticipant(code: string, id: string) {
    await redis.hdel(kickedKey(code), id)
}

/** Expulsa `id`: bloqueia o acesso, libera o nome e tira da lista de presença. */
export async function kickParticipant(code: string, id: string, name: string, opts: { denied?: boolean } = {}) {
    await redis.hset(kickedKey(code), { [id]: { name, at: Date.now(), ...(opts.denied ? { denied: true } : {}) } })
    await redis.expire(kickedKey(code), TOKEN_TTL_SECONDS)
    // O nome fica livre na hora (a entrada é achada pelo id que o reserva).
    const names = await redis.hgetall(namesKey(code)) as Record<string, unknown> | null
    for (const [field, value] of Object.entries(names ?? {})) {
        if (parse<{ id: string }>(value)?.id === id) await redis.hdel(namesKey(code), field)
    }
    await removePresence(code, id)
}

/**
 * Resolve quem está entrando e, para quem não é dono, emite (ou reaproveita) o token. Lança se o
 * Redis falhar — o chamador decide se degrada (sala sem senha) ou responde 503.
 */
export async function joinRoomIdentity(input: JoinIdentityInput): Promise<JoinIdentityResult> {
    const { code, user, isOwner } = input

    if (isOwner && user) {
        const id = participantIdForUser(code, user.id)
        const name = await reserveName(code, id, cleanParticipantName(user.name) || 'Mestre', { allowSuffix: true, force: true })
        return { ok: true, participant: { id, name: name ?? 'Mestre', role: 'gm', userId: user.id } }
    }

    const typedName = cleanParticipantName(input.name)

    // Token anterior válido para esta sala: mesmo participante, mesmo nome.
    const previous = typeof input.token === 'string'
        ? parse<StoredParticipant>(await redis.get(tokenKey(input.token)))
        : null
    const reusable = previous && previous.code === code && previous.role === 'player' && (!user || previous.userId === user.id)
        ? previous
        : null

    // Quem volta com o token de um participante já barrado continua barrado (mesmo digitando outro nome).
    const reusableBan = !user && reusable ? await getKicked(code, reusable.id) : null

    let id: string
    let name: string | null

    if (user) {
        id = participantIdForUser(code, user.id)
        const banned = await getKicked(code, id)
        if (banned) return { ok: false, reason: 'kicked', denied: !!banned.denied }
        if (!await hasRoomForNewName(code, id)) return { ok: false, reason: 'room-full' }
        // Conta: o nome do cadastro, sem popup. Se outro já o usa, ganha um sufixo.
        name = await reserveName(code, id, cleanParticipantName(user.name) || 'Jogador', { allowSuffix: true, reserved: ownerDisplayName(input.ownerName) })
    } else if (reusableBan) {
        return { ok: false, reason: 'kicked', denied: !!reusableBan.denied }
    } else if (reusable && (!typedName || normalizeName(typedName) === normalizeName(reusable.name))) {
        id = reusable.id
        name = await reserveName(code, id, reusable.name, { reserved: ownerDisplayName(input.ownerName) })
    } else {
        if (!typedName) return { ok: false, reason: 'name-required' }
        id = reusable?.id ?? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
        if (!await hasRoomForNewName(code, id)) return { ok: false, reason: 'room-full' }
        name = await reserveName(code, id, typedName, { reserved: ownerDisplayName(input.ownerName) })
        // Trocou de nome: libera o antigo.
        if (name && reusable && normalizeName(reusable.name) !== normalizeName(name)) {
            await releaseName(code, id, reusable.name)
        }
    }

    if (!name) return { ok: false, reason: 'name-taken' }

    const participant: RoomParticipant = { id, name, role: 'player', ...(user ? { userId: user.id } : {}) }
    const token = typeof input.token === 'string' && reusable ? input.token : crypto.randomUUID()
    // A prova da senha: nova, se acabou de ser digitada; senão a do token anterior, se ainda vale
    // (mesma senha e dentro do teto) — reapresentar o token não renova o prazo.
    const carried = !input.verified && reusable && hasValidVerification(reusable, input.accessTag) ? reusable : null
    const stored: StoredParticipant = {
        ...participant,
        code,
        verified: input.verified || !!carried,
        accessTag: input.accessTag,
        ...(input.verified ? { verifiedAt: Date.now() } : carried ? { verifiedAt: carried.verifiedAt } : {}),
    }
    await redis.set(tokenKey(token), stored, { ex: TOKEN_TTL_SECONDS })

    return { ok: true, participant, token }
}

/**
 * Quem está fazendo a requisição (events/dice): o dono pela sessão, os demais pelo `?token=`.
 * Lança 403 (sala fechada, removido, aguardando aprovação) / 401 (sem acesso).
 *
 * Com "Aprovar entradas" ligado, o token só vale para quem o mestre aprovou (ou já estava na
 * sala quando a opção foi ligada) — não basta não estar na fila de pedidos: um token emitido
 * pelo /join antes de a aprovação ser ligada não pode pular a fila chamando /events ou /dice
 * direto.
 *
 * Redis fora do ar: numa sala sem senha e sem aprovação degrada para um participante genérico
 * (a sala segue funcionando); com senha ou aprovação falha FECHADO (503), já que não há como
 * conferir o token, a expulsão nem a aprovação.
 */
export async function resolveRoomParticipant(
    event: H3Event,
    room: { code: string, userId: string, isOpen: boolean, password: string | null, settings?: { requireApproval?: boolean } | null },
): Promise<RoomParticipant> {
    const session = await auth.api.getSession({ headers: event.headers }).catch(() => null)

    if (session?.user && session.user.id === room.userId) {
        return {
            id: participantIdForUser(room.code, session.user.id),
            name: cleanParticipantName(session.user.name) || 'Mestre',
            role: 'gm',
            userId: session.user.id,
        }
    }

    // Sala fechada: só o mestre fica. Quem estava dentro foi desconectado ao fechar (ver
    // `broadcastRoomShut`) e não volta, nem com um token válido, até a sala ser reaberta.
    if (!room.isOpen) {
        throw createError({ statusCode: 403, statusMessage: 'Esta sala está fechada no momento.', data: { reason: 'closed' } })
    }

    const requireApproval = room.settings?.requireApproval === true
    // Sala em que o acesso depende de conferir algo no Redis.
    const strict = !!room.password || requireApproval
    const unavailable = () => createError({
        statusCode: 503,
        statusMessage: 'O serviço de tempo real está indisponível no momento. Tente novamente em instantes.',
    })

    // Token de participante: no cabeçalho `X-Room-Token` (POSTs como /dice) ou, só onde não há
    // como mandar cabeçalho (o EventSource de /events), na query string.
    const token = getHeader(event, 'x-room-token') || getQuery(event).token
    if (typeof token === 'string') {
        let stored: StoredParticipant | null
        try {
            stored = parse<StoredParticipant>(await redis.get(tokenKey(token)))
        } catch (error) {
            console.error(`Erro ao validar acesso à sala ${room.code} no Redis:`, error)
            if (strict) throw unavailable()
            return { id: 'anonimo', name: 'Jogador', role: 'player' }
        }

        if (stored && stored.code === room.code) {
            let banned: KickedItem | null = null
            let pending = false
            let approved = true
            try {
                [banned, pending, approved] = await Promise.all([
                    getKicked(room.code, stored.id),
                    isPending(room.code, stored.id),
                    requireApproval ? isApproved(room.code, stored.id) : Promise.resolve(true),
                ])
            } catch (error) {
                console.error(`Erro ao verificar expulsão/aprovação na sala ${room.code} no Redis:`, error)
                if (strict) throw unavailable()
            }

            if (banned) {
                throw createError({
                    statusCode: 403,
                    statusMessage: banned.denied ? 'O mestre não aprovou a sua entrada.' : 'Você foi removido da sala pelo mestre.',
                    data: { reason: banned.denied ? 'denied' : 'kicked' },
                })
            }
            // Ainda esperando a aprovação do mestre (ou nunca pediu): nada de eventos nem rolagens.
            // O cliente refaz o /join, que põe o pedido na fila do mestre.
            if (pending || !approved) {
                throw createError({ statusCode: 403, statusMessage: 'Aguardando a aprovação do mestre.', data: { reason: 'pending' } })
            }
        }

        if (stored && stored.code === room.code && (!room.password || hasValidVerification(stored, roomAccessTag(room.password)))) {
            // Uso mantém o acesso vivo.
            redis.expire(tokenKey(token), TOKEN_TTL_SECONDS).catch(() => {})
            // ...inclusive a aprovação: numa sessão longa ela não pode vencer antes do token.
            if (requireApproval) redis.expire(approvedKey(room.code), TOKEN_TTL_SECONDS).catch(() => {})
            return { id: stored.id, name: stored.name, role: 'player', userId: stored.userId }
        }
    }

    throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
}

// ---- Aprovação de entrada ----
// Com `settings.requireApproval`, quem acaba de informar o nome (e a senha, se houver) espera o
// mestre decidir. Dois hashes por sala: `pending` (id -> { name, at, seen }) com quem aguarda e
// `approved` (id -> true) com quem já foi liberado — este segundo evita pedir a aprovação de
// novo quando a pessoa recarrega a página. Quem aguarda reapresenta o token a cada poucos
// segundos (/join), o que atualiza `seen`: pedidos de quem fechou a aba somem sozinhos.
const pendingKey = (code: string) => `room:${code}:pending`
const approvedKey = (code: string) => `room:${code}:approved`
/** Pedido sem sinal de vida por este tempo é considerado abandonado. */
const PENDING_STALE_MS = 20_000

export interface JoinRequest {
    id: string
    name: string
    at: number
}

export async function isPending(code: string, id: string): Promise<boolean> {
    return (await redis.hexists(pendingKey(code), id)) === 1
}

/** O mestre aprovou `id` (ou ele já estava na sala quando a aprovação foi ligada)? */
export async function isApproved(code: string, id: string): Promise<boolean> {
    return (await redis.hexists(approvedKey(code), id)) === 1
}

export type AdmissionResult =
    | { status: 'admitted' }
    /** `created`: pedido novo (o mestre ainda não foi avisado dele). */
    | { status: 'pending', created: boolean }
    /** Já há MAX_PENDING_REQUESTS pedidos aguardando: este não entra na fila. */
    | { status: 'full' }

/** Decide se `participant` entra agora ou espera o mestre. Lança se o Redis falhar. */
export async function checkAdmission(code: string, participant: RoomParticipant, requireApproval: boolean): Promise<AdmissionResult> {
    if (!requireApproval) {
        // Aprovação desligada depois do pedido: quem esperava entra.
        await redis.hdel(pendingKey(code), participant.id)
        return { status: 'admitted' }
    }

    if (await redis.hexists(approvedKey(code), participant.id) === 1) return { status: 'admitted' }

    const existing = parse<{ at: number }>(await redis.hget(pendingKey(code), participant.id))
    if (!existing && (await listPending(code)).length >= MAX_PENDING_REQUESTS) return { status: 'full' }
    const entry = { name: participant.name, at: existing?.at ?? Date.now(), seen: Date.now() }
    await redis.hset(pendingKey(code), { [participant.id]: entry })
    await redis.expire(pendingKey(code), TOKEN_TTL_SECONDS)
    return { status: 'pending', created: !existing }
}

/** Pedidos de entrada ainda vivos, do mais antigo para o mais novo. */
export async function listPending(code: string): Promise<JoinRequest[]> {
    const all = await redis.hgetall(pendingKey(code)) as Record<string, unknown> | null
    const limit = Date.now() - PENDING_STALE_MS
    return Object.entries(all ?? {})
        .map(([id, value]) => ({ id, value: parse<{ name: string, at: number, seen: number }>(value) }))
        .filter((item): item is { id: string, value: { name: string, at: number, seen: number } } => !!item.value && item.value.seen > limit)
        .map(({ id, value }) => ({ id, name: value.name, at: value.at }))
        .sort((a, b) => a.at - b.at)
}

/** O mestre aprovou: libera o acesso (inclusive em futuras recargas da página). */
export async function approveParticipant(code: string, id: string) {
    await redis.hset(approvedKey(code), { [id]: 1 })
    await redis.expire(approvedKey(code), TOKEN_TTL_SECONDS)
    await redis.hdel(pendingKey(code), id)
}

/**
 * O mestre recusou: barra o acesso (na lista de removidos, marcado como recusado) e devolve o
 * nome que o pedido tinha, para a mensagem ao mestre.
 */
export async function denyParticipant(code: string, id: string): Promise<string> {
    const request = parse<{ name: string }>(await redis.hget(pendingKey(code), id))
    const name = request?.name ?? 'Participante'
    await redis.hdel(pendingKey(code), id)
    await kickParticipant(code, id, name, { denied: true })
    return name
}

/** Ao ligar a aprovação, quem já está na sala continua nela (e não precisa ser aprovado ao recarregar). */
export async function approveEveryoneInRoom(code: string) {
    for (const person of await listPresence(code)) {
        await redis.hset(approvedKey(code), { [person.id]: 1 })
    }
    await redis.expire(approvedKey(code), TOKEN_TTL_SECONDS)
}

// ---- Presença ----

export async function touchPresence(code: string, participant: RoomParticipant) {
    try {
        const entry: PresenceEntry = { id: participant.id, name: participant.name, role: participant.role, seen: Date.now() }
        await redis.hset(presenceKey(code), { [participant.id]: entry })
        await redis.expire(presenceKey(code), TOKEN_TTL_SECONDS)
        await reserveName(code, participant.id, participant.name, { force: participant.role === 'gm' })
    } catch (error) {
        console.error(`Erro ao registrar presença na sala ${code} no Redis:`, error)
    }
}

export async function removePresence(code: string, id: string) {
    try {
        await redis.hdel(presenceKey(code), id)
    } catch (error) {
        console.error(`Erro ao remover presença da sala ${code} no Redis:`, error)
    }
}

export interface PresenceListItem {
    id: string
    name: string
    role: RoomParticipantRole
}

export async function listPresence(code: string): Promise<PresenceListItem[]> {
    try {
        const all = await redis.hgetall(presenceKey(code)) as Record<string, unknown> | null
        if (!all) return []
        const limit = Date.now() - PRESENCE_STALE_MS
        return Object.values(all)
            .map(value => parse<PresenceEntry>(value))
            .filter((entry): entry is PresenceEntry => !!entry && entry.seen > limit)
            .map(({ id, name, role }) => ({ id, name, role }))
            .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'gm' ? -1 : 1))
    } catch (error) {
        console.error(`Erro ao ler presença da sala ${code} no Redis:`, error)
        return []
    }
}

// ---- Streams simultâneas ----
// Por participante, um sorted set stream -> último sinal de vida (abertura e ping a cada 20 s).
// Contam só as streams vistas no último minuto: uma função da Vercel derrubada sem fechar a stream
// (sem `onClosed`) deixa de contar sozinha, sem prender o participante.
const streamsKey = (code: string, id: string) => `room:${code}:streams:${id}`
const STREAM_STALE_MS = 60_000

/** Registra a stream `streamId`; devolve `false` (e não registra) se o participante já está no teto. Redis fora do ar libera. */
export async function registerStream(code: string, participantId: string, streamId: string): Promise<boolean> {
    try {
        const key = streamsKey(code, participantId)
        const now = Date.now()
        await redis.zremrangebyscore(key, 0, now - STREAM_STALE_MS)
        if ((await redis.zcard(key)) >= MAX_STREAMS_PER_PARTICIPANT) return false
        await redis.zadd(key, { score: now, member: streamId })
        await redis.expire(key, 120)
        return true
    } catch (error) {
        console.error(`Erro ao registrar stream na sala ${code} no Redis:`, error)
        return true
    }
}

export async function touchStream(code: string, participantId: string, streamId: string) {
    const key = streamsKey(code, participantId)
    await redis.zadd(key, { score: Date.now(), member: streamId })
    await redis.expire(key, 120)
}

export async function unregisterStream(code: string, participantId: string, streamId: string) {
    await redis.zrem(streamsKey(code, participantId), streamId)
}
