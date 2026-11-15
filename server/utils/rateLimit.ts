import { createError, getRequestIP, setResponseHeader, type H3Event } from 'h3'
import { redis } from './redis'

// Limite de requisições por janela fixa, guardado no Upstash Redis — compartilhado entre as
// instâncias serverless da Vercel (um contador em memória só veria as requisições que caíram
// na mesma instância). Usado pelas rotas públicas das salas (/join, /dice, /events) e como
// armazenamento do rate limit do better-auth (server/utils/auth.ts).
//
// Como o resto do uso do Redis, é um reforço e não uma dependência: se o Upstash falhar, a
// requisição passa (e o erro é registrado).

// INCR + EXPIRE numa só operação atômica: a primeira requisição da janela define o prazo.
const CONSUME_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then redis.call('EXPIRE', KEYS[1], ARGV[1]) ttl = tonumber(ARGV[1]) end
return { count, ttl }
`

export interface RateLimitRule {
    /** Identifica o contador (ex.: `join:ip:1.2.3.4`). */
    key: string
    /** Máximo de requisições dentro da janela. */
    max: number
    /** Duração da janela, em segundos. */
    window: number
}

export interface RateLimitResult {
    allowed: boolean
    /** Segundos até a janela liberar (só quando `allowed` é falso). */
    retryAfter: number | null
}

/** Conta uma requisição contra `rule`. Falha do Redis libera (allowed: true). */
export async function consumeRateLimit(rule: RateLimitRule): Promise<RateLimitResult> {
    try {
        const [count, ttl] = await redis.eval<[number], [number, number]>(
            CONSUME_SCRIPT,
            [`ratelimit:${rule.key}`],
            [rule.window],
        )
        if (Number(count) <= rule.max) return { allowed: true, retryAfter: null }
        return { allowed: false, retryAfter: Math.max(1, Number(ttl) || rule.window) }
    } catch (error) {
        console.error(`Erro ao aplicar o limite de requisições (${rule.key}) no Redis:`, error)
        return { allowed: true, retryAfter: null }
    }
}

/** IP do cliente (na Vercel, `x-forwarded-for` é preenchido pela própria plataforma). */
export function clientIp(event: H3Event): string {
    return getRequestIP(event, { xForwardedFor: true }) || 'desconhecido'
}

/**
 * Aplica todas as regras (todas contam) e lança 429, com `Retry-After`, se alguma estourou.
 * `message` é o texto mostrado ao usuário.
 */
export async function enforceRateLimit(
    event: H3Event,
    rules: RateLimitRule[],
    message = 'Muitas tentativas. Aguarde um pouco e tente de novo.',
) {
    const results = await Promise.all(rules.map(consumeRateLimit))
    const blocked = results.filter(result => !result.allowed)
    if (!blocked.length) return

    const retryAfter = Math.max(...blocked.map(result => result.retryAfter ?? 1))
    setResponseHeader(event, 'Retry-After', retryAfter)
    throw createError({
        statusCode: 429,
        statusMessage: message,
        data: { reason: 'rate-limited', retryAfterMs: retryAfter * 1000 },
    })
}

// ---- Bloqueio progressivo de senha ----
// Senhas erradas numa sala, por IP. Depois de PASSWORD_FIRST_LOCK_AFTER erros seguidos, bloqueia
// por 1 minuto; a partir daí, cada PASSWORD_NEXT_LOCK_AFTER erros novos bloqueiam por mais tempo
// (3, 5 e, dali em diante, sempre 10 minutos). Acertar a senha zera tudo, e o histórico some
// sozinho depois de PASSWORD_STATE_TTL_SECONDS sem erros. Só os ERROS contam (não as tentativas):
// quem acerta nunca é bloqueado por este contador.

export const PASSWORD_FIRST_LOCK_AFTER = 10
export const PASSWORD_NEXT_LOCK_AFTER = 3
/** Duração de cada bloqueio, em ms: o último se repete. */
export const PASSWORD_LOCK_STEPS_MS = [60_000, 180_000, 300_000, 600_000]
const PASSWORD_STATE_TTL_SECONDS = 60 * 60

const passwordStateKey = (key: string) => `password-lock:${key}`

// Hash { fails, level, lockedUntil }. `level` = quantos bloqueios já houve (índice do próximo passo).
const PASSWORD_FAILURE_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local firstAfter = tonumber(ARGV[2])
local nextAfter = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])
local fails = redis.call('HINCRBY', key, 'fails', 1)
local level = tonumber(redis.call('HGET', key, 'level') or '0')
local threshold = firstAfter
if level > 0 then threshold = nextAfter end
local lockMs = 0
if fails >= threshold then
  local step = math.min(level + 1, #ARGV - 4)
  lockMs = tonumber(ARGV[4 + step])
  redis.call('HSET', key, 'fails', 0, 'level', step, 'lockedUntil', now + lockMs)
end
redis.call('EXPIRE', key, ttl)
return lockMs
`

/** Quanto falta (ms) do bloqueio de senha em `key`; 0 = liberado. Falha do Redis libera. */
export async function passwordLockRemaining(key: string): Promise<number> {
    try {
        const lockedUntil = Number(await redis.hget(passwordStateKey(key), 'lockedUntil')) || 0
        return Math.max(0, lockedUntil - Date.now())
    } catch (error) {
        console.error(`Erro ao consultar o bloqueio de senha (${key}) no Redis:`, error)
        return 0
    }
}

/** Registra uma senha errada; devolve a duração (ms) do bloqueio que ela disparou, ou 0. */
export async function registerPasswordFailure(key: string): Promise<number> {
    try {
        const lockMs = await redis.eval<(string | number)[], number>(
            PASSWORD_FAILURE_SCRIPT,
            [passwordStateKey(key)],
            [Date.now(), PASSWORD_FIRST_LOCK_AFTER, PASSWORD_NEXT_LOCK_AFTER, PASSWORD_STATE_TTL_SECONDS, ...PASSWORD_LOCK_STEPS_MS],
        )
        return Number(lockMs) || 0
    } catch (error) {
        console.error(`Erro ao registrar senha errada (${key}) no Redis:`, error)
        return 0
    }
}

/** Senha certa: esquece os erros e os bloqueios anteriores. */
export async function clearPasswordFailures(key: string) {
    await redis.del(passwordStateKey(key)).catch((error: unknown) => {
        console.error(`Erro ao limpar os erros de senha (${key}) no Redis:`, error)
    })
}

/** 429 de senha bloqueada, com o tempo restante para o cliente mostrar a contagem. */
export function passwordLockedError(event: H3Event, remainingMs: number, message: string) {
    setResponseHeader(event, 'Retry-After', Math.max(1, Math.ceil(remainingMs / 1000)))
    return createError({
        statusCode: 429,
        statusMessage: message,
        data: { reason: 'password-locked', retryAfterMs: remainingMs },
    })
}
