// Guarda global de /api/v1/*: sem sessão válida, 401. Os handlers também conferem o usuário
// (`requireUser`), já que precisam do id dele para filtrar as linhas pelo dono.
// A sessão só é consultada nas rotas que a exigem — antes ela era buscada no banco em TODA
// requisição (páginas públicas, arquivos, salas), à toa.
export default defineEventHandler(async (event) => {
    if (!event.path.startsWith('/api/v1')) return

    const session = await auth.api.getSession({
        headers: event.headers,
    })

    if (!session || !session.user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Não autorizado.'
        })
    }
})
