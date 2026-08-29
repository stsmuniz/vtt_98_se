/**
 * Estado global da LoadingWindow. Usa useState para que qualquer form/janela do app
 * compartilhe o mesmo overlay bloqueante ao consultar o banco de dados.
 */
export function useLoadingWindow() {
    const isActive = useState<boolean>('loading-window-active', () => false)
    const message = useState<string>('loading-window-message', () => 'Carregando...')

    const show = (msg = 'Carregando...') => {
        message.value = msg
        isActive.value = true
    }

    const hide = () => {
        isActive.value = false
    }

    async function withLoading<T>(fn: () => Promise<T>, msg = 'Carregando...'): Promise<T> {
        show(msg)
        try {
            return await fn()
        } finally {
            hide()
        }
    }

    return { isActive, message, show, hide, withLoading }
}
