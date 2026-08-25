import { useAuthSession } from "~~/composables/useAuthSession"

export default defineNuxtRouteMiddleware(async (to) => {
    const { data: session } = await useAuthSession()

    if (!session.value) {
        return navigateTo({
            path: '/login',
            query: { redirect: to.fullPath },
        })
    }
})
