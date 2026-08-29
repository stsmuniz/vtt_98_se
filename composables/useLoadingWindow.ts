/**
 * Estado global da LoadingWindow. Usa useState para que qualquer form/janela do app
 * compartilhe o mesmo overlay bloqueante ao consultar o banco de dados.
 */
export type LoadingWindowImage = 'loading' | 'copy' | 'delete'

export function useLoadingWindow() {
    const isActive = useState<boolean>('loading-window-active', () => false)
    const message = useState<string>('loading-window-message', () => 'Carregando...')
    const image = useState<LoadingWindowImage>('loading-window-image', () => 'loading')

    const show = (msg = 'Carregando...', img: LoadingWindowImage = 'loading') => {
        message.value = msg
        image.value = img
        isActive.value = true
    }

    const hide = () => {
        isActive.value = false
    }

    async function withLoading<T>(fn: () => Promise<T>, msg = 'Carregando...', img: LoadingWindowImage = 'loading'): Promise<T> {
        show(msg, img)
        try {
            return await fn()
        } finally {
            hide()
        }
    }

    return { isActive, message, image, show, hide, withLoading }
}
