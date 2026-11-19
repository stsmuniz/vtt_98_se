import { useAuthSession } from "~~/composables/useAuthSession"
import { authClient } from "~~/lib/auth-client"

export default defineNuxtRouteMiddleware(async (to) => {
    const { data: session } = await useAuthSession()

    // O useFetch da sessão (chave fixa) guarda o resultado "sem sessão" de antes do login: quando já há um
    // resultado em cache, a nova chamada não busca de novo e devolve esse null velho, e o usuário que acabou
    // de entrar era mandado de volta para /login até recarregar a página. No cliente, um null é conferido
    // direto no servidor antes de redirecionar, e o cache é atualizado com a resposta.
    if (!session.value && import.meta.client) {
        const { data: fresh } = await authClient.getSession()
        if (fresh) session.value = fresh as typeof session.value
    }

    if (!session.value) {
        return navigateTo({
            path: '/login',
            query: { redirect: to.fullPath },
        })
    }
})
