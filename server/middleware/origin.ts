import { createError, getHeader, getRequestHost } from 'h3'
import { trustedOrigins } from '../utils/auth'

// Proteção contra CSRF nas rotas que alteram dados (POST/PUT/PATCH/DELETE em /api/*).
//
// Até aqui a única barreira era o cookie de sessão ser `SameSite=Lax` (padrão do better-auth):
// outro site não consegue mandá-lo num POST. Mas isso depende de um padrão que pode mudar, e o
// `readBody` do h3 aceita JSON enviado como `text/plain` (que o navegador manda entre sites sem
// preflight). Então: se o navegador disse de onde vem a requisição (`Origin`), ela tem de vir do
// próprio site (mesmo host) ou de uma origem confiável do better-auth; sem `Origin`, um
// `Sec-Fetch-Site: cross-site` também é recusado. Requisições sem nenhum dos dois cabeçalhos
// (curl, scripts) não carregam cookies de um navegador e passam.
// /api/auth/* fica de fora: o better-auth faz a própria checagem de origem.
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

let trusted: Set<string> | null = null

export default defineEventHandler((event) => {
    if (!UNSAFE_METHODS.has(event.method) || !event.path.startsWith('/api/') || event.path.startsWith('/api/auth/')) return

    const origin = getHeader(event, 'origin')
    if (origin) {
        let originHost: string | null = null
        try {
            originHost = new URL(origin).host
        } catch {
            originHost = null
        }
        trusted ??= new Set(trustedOrigins())
        const sameHost = !!originHost && originHost === getRequestHost(event, { xForwardedHost: true })
        if (sameHost || trusted.has(origin.replace(/\/+$/, ''))) return
        throw createError({ statusCode: 403, statusMessage: 'Origem da requisição não permitida.' })
    }

    if (getHeader(event, 'sec-fetch-site') === 'cross-site') {
        throw createError({ statusCode: 403, statusMessage: 'Origem da requisição não permitida.' })
    }
})
