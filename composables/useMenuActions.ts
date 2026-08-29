import { inject } from 'vue'

export function useMenuActions() {
    const menu = inject<{
        register: (name: string, handler: (payload?: any) => void | Promise<void>) => void
        unregister: (name: string) => void
        setMenuBarVisible: (visible: boolean) => void
        setStatusText: (text: string) => void
    }>('menuActions')

    if (!menu) {
        throw new Error('useMenuActions deve ser usado dentro do layout que fornece menuActions')
    }

    return menu
}