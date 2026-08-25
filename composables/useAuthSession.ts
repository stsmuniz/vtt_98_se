import { authClient } from '~~/lib/auth-client'

/**
 * authClient.useSession(useFetch) resolves the session via a plain Nuxt useFetch call.
 * During SSR that call doesn't carry the incoming request's cookies by default, so a hard
 * reload always looks logged-out to the server even with a valid session cookie. Forwarding
 * the cookie header (empty on the client, where the browser attaches it automatically) fixes
 * that without changing behavior client-side.
 */
export function useAuthSession() {
    return authClient.useSession((url, options) =>
        useFetch(url, {
            ...options,
            headers: useRequestHeaders(['cookie']),
        })
    )
}
