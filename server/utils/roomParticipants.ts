import { createHash } from 'node:crypto'
import { createError, getQuery, type H3Event } from 'h3'

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
}

interface PresenceEntry {
    id: string
    name: string
    role: RoomParticipantRole
    seen: number
}

export const MAX_PARTICIPANT_NAME = 30

const TOKEN_TTL_SECONDS = 60 * 60 * 12
/** Quanto tempo o nome fica reservado depois que o participante some (recarregar a página, etc.). */
const NAME_GRACE_MS = 5 * 60_000
/** Sem sinal de vida (ping a cada 20s) por este tempo, o participante sai da lista. */
const PRESENCE_STALE_MS = 60_000

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
    return name.replace(/\s+/g, ' ').trim().slice(0, MAX_PARTICIPANT_NAME)
}

function normalizeName(name: string): string {
    return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
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
async function reserveName(code: string, id: string, desired: string, opts: { allowSuffix?: boolean, force?: boolean } = {}): Promise<string | null> {
    for (let attempt = 1; attempt <= 50; attempt++) {
        if (attempt > 1 && !opts.allowSuffix) return null
        const candidate = attempt === 1
            ? desired
            : `${desired.slice(0, MAX_PARTICIPANT_NAME - 5)} (${attempt})`
        const field = normalizeName(candidate)
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

async function releaseName(code: string, id: string, name: string) {
    const field = normalizeName(name)
    const holder = parse<{ id: string }>(await redis.hget(namesKey(code), field))
    if (holder?.id === id) await redis.hdel(namesKey(code), field)
}

/** O token já foi emitido para esta sala e provou a senha? (reentrada sem digitar a senha de novo) */
export async function isVerifiedParticipantToken(code: string, token: unknown): Promise<boolean> {
    if (typeof token !== 'string') return false
    const stored = parse<StoredParticipant>(await redis.get(tokenKey(token)))
    return !!stored && stored.code === code && stored.verified
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
    /** A senha da sala (se havia) acabou de ser conferida ou o token anterior já a provava. */
    verified: boolean
}

export type JoinIdentityResult =
    | { ok: true, participant: RoomParticipant, token?: string }
    | { ok: false, reason: 'name-required' | 'name-taken' }
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
        // Conta: o nome do cadastro, sem popup. Se outro já o usa, ganha um sufixo.
        name = await reserveName(code, id, cleanParticipantName(user.name) || 'Jogador', { allowSuffix: true })
    } else if (reusableBan) {
        return { ok: false, reason: 'kicked', denied: !!reusableBan.denied }
    } else if (reusable && (!typedName || normalizeName(typedName) === normalizeName(reusable.name))) {
        id = reusable.id
        name = await reserveName(code, id, reusable.name)
    } else {
        if (!typedName) return { ok: false, reason: 'name-required' }
        id = reusable?.id ?? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
        name = await reserveName(code, id, typedName)
        // Trocou de nome: libera o antigo.
        if (name && reusable && normalizeName(reusable.name) !== normalizeName(name)) {
            await releaseName(code, id, reusable.name)
        }
    }

    if (!name) return { ok: false, reason: 'name-taken' }

    const participant: RoomParticipant = { id, name, role: 'player', ...(user ? { userId: user.id } : {}) }
    const token = typeof input.token === 'string' && reusable ? input.token : crypto.randomUUID()
    const stored: StoredParticipant = { ...participant, code, verified: input.verified || !!reusable?.verified }
    await redis.set(tokenKey(token), stored, { ex: TOKEN_TTL_SECONDS })

    return { ok: true, participant, token }
}

/**
 * Quem está fazendo a requisição (events/dice): o dono pela sessão, os demais pelo `?token=`.
 * Lança 403 (sala fechada) / 401 (sem acesso). Redis fora do ar numa sala SEM senha degrada
 * para um participante genérico (a sala segue funcionando); com senha responde 401.
 */
export async function resolveRoomParticipant(
    event: H3Event,
    room: { code: string, userId: string, isOpen: boolean, password: string | null },
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

    if (!room.isOpen) {
        throw createError({ statusCode: 403, statusMessage: 'Esta sala está fechada no momento.' })
    }

    const token = getQuery(event).token
    if (typeof token === 'string') {
        let stored: StoredParticipant | null
        try {
            stored = parse<StoredParticipant>(await redis.get(tokenKey(token)))
        } catch (error) {
            console.error(`Erro ao validar acesso à sala ${room.code} no Redis:`, error)
            if (room.password) throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
            return { id: 'anonimo', name: 'Jogador', role: 'player' }
        }

        if (stored && stored.code === room.code) {
            const banned = await getKicked(room.code, stored.id).catch(() => null)
            if (banned) {
                throw createError({
                    statusCode: 403,
                    statusMessage: banned.denied ? 'O mestre não aprovou a sua entrada.' : 'Você foi removido da sala pelo mestre.',
                    data: { reason: banned.denied ? 'denied' : 'kicked' },
                })
            }
            // Ainda esperando a aprovação do mestre: nada de eventos nem rolagens.
            if (await isPending(room.code, stored.id).catch(() => false)) {
                throw createError({ statusCode: 403, statusMessage: 'Aguardando a aprovação do mestre.', data: { reason: 'pending' } })
            }
        }

        if (stored && stored.code === room.code && (!room.password || stored.verified)) {
            // Uso mantém o acesso vivo.
            redis.expire(tokenKey(token), TOKEN_TTL_SECONDS).catch(() => {})
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

export type AdmissionResult =
    | { status: 'admitted' }
    /** `created`: pedido novo (o mestre ainda não foi avisado dele). */
    | { status: 'pending', created: boolean }

/** Decide se `participant` entra agora ou espera o mestre. Lança se o Redis falhar. */
export async function checkAdmission(code: string, participant: RoomParticipant, requireApproval: boolean): Promise<AdmissionResult> {
    if (!requireApproval) {
        // Aprovação desligada depois do pedido: quem esperava entra.
        await redis.hdel(pendingKey(code), participant.id)
        return { status: 'admitted' }
    }

    if (await redis.hexists(approvedKey(code), participant.id) === 1) return { status: 'admitted' }

    const existing = parse<{ at: number }>(await redis.hget(pendingKey(code), participant.id))
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
