/**
 * Estado global do aviso "Aguarde" (DesktopBusyOverlay). Usa useState para que qualquer form/janela do app
 * compartilhe o mesmo overlay bloqueante ao consultar o banco de dados.
 */
/** Tempo mínimo da janela "Salvando..." do editor de cenas e da sala. */
export const SAVE_WINDOW_MIN_MS = 400

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

    /**
     * Mostra o aviso enquanto `fn` roda. `minMs` mantém o aviso aberto um tempo mínimo, para uma
     * resposta rápida não virar só um piscar de janela.
     */
    async function withLoading<T>(
        fn: () => Promise<T>,
        msg = 'Carregando...',
        img: LoadingWindowImage = 'loading',
        { minMs = 0 }: { minMs?: number } = {},
    ): Promise<T> {
        show(msg, img)
        const minDelay = minMs > 0 ? new Promise(resolve => setTimeout(resolve, minMs)) : null
        try {
            const result = await fn()
            if (minDelay) await minDelay
            return result
        } finally {
            hide()
        }
    }

    return { isActive, message, image, show, hide, withLoading }
}
