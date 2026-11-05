/**
 * Caixas de mensagem modais com Promise — substituem alert()/confirm() nativos.
 *
 *   await useDialog().alert('Arquivo salvo.')
 *   if (await useDialog().confirm('Excluir o token?', { icon: 'warning' })) …
 *   const r = await useDialog().ask({ title, message, buttons: [...] })
 *
 * O DesktopDialogHost (no layout e em app.vue) renderiza a pilha de diálogos.
 */
import type { MessageBoxButton } from '~/components/ui/MessageBox.vue'

export type DialogIcon = 'info' | 'warning' | 'error' | 'question'

export interface DialogRequest {
  id: number
  title: string
  message: string
  icon: DialogIcon | null
  buttons: MessageBoxButton<string>[]
}

const resolvers = new Map<number, (value: string) => void>()
let seq = 0

export function useDialog() {
  const queue = useState<DialogRequest[]>('dialogs', () => [])

  function ask(opts: { title?: string; message: string; icon?: DialogIcon | null; buttons: MessageBoxButton<string>[] }): Promise<string> {
    const id = ++seq
    queue.value.push({
      id,
      title: opts.title ?? 'VTT 98 SE',
      message: opts.message,
      icon: opts.icon === undefined ? 'info' : opts.icon,
      buttons: opts.buttons,
    })
    return new Promise(resolve => resolvers.set(id, resolve))
  }

  async function alert(message: string, opts: { title?: string; icon?: DialogIcon } = {}): Promise<void> {
    await ask({ ...opts, message, icon: opts.icon ?? 'info', buttons: [{ label: 'OK', value: 'ok', default: true, cancel: true }] })
  }

  async function confirm(message: string, opts: { title?: string; icon?: DialogIcon; okLabel?: string; cancelLabel?: string } = {}): Promise<boolean> {
    const r = await ask({
      ...opts,
      message,
      icon: opts.icon ?? 'question',
      buttons: [
        { label: opts.okLabel ?? 'Sim', value: 'yes', default: true },
        { label: opts.cancelLabel ?? 'Não', value: 'no', cancel: true },
      ],
    })
    return r === 'yes'
  }

  function resolve(id: number, value: string) {
    queue.value = queue.value.filter(d => d.id !== id)
    resolvers.get(id)?.(value)
    resolvers.delete(id)
  }

  return { queue, ask, alert, confirm, resolve }
}
