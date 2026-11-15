/**
 * Sessão de rolagem de dados.
 *
 * Fora de uma sala (`mode: 'local'`) as rolagens são feitas no navegador e o histórico fica em
 * `useState` — some ao recarregar a página/encerrar a sessão. Dentro de uma sala (`mode: 'room'`,
 * ativado por `app/pages/rooms/[code].vue`) a rolagem é feita no servidor (POST em
 * /api/rooms/:code/dice) e chega a todos pelo stream SSE; o histórico é o da sala.
 */
import { useDesktop } from '~~/composables/useDesktop'
import { DICE_COOLDOWN_MS, rollDiceGroups, type DiceGroup, type ModSignal, type RollType, type RoomRoll } from '~~/lib/rollDice'

interface RoomContext {
  code: string
  token?: string
  isOwner: boolean
}

const POPUP_KEY = 'vtt:dice-popup-local'

function readLocalPopupMode(): 'window' | 'joey' | 'off' {
  try {
    const value = localStorage.getItem(POPUP_KEY)
    if (value === 'window' || value === 'joey' || value === 'off') return value
  } catch { /* sem localStorage: usa o padrão */ }
  return 'window'
}

export function saveLocalPopupMode(value: 'window' | 'joey' | 'off') {
  try { localStorage.setItem(POPUP_KEY, value) } catch { /* ignora */ }
}

export type DiceScope = 'local' | 'room'

/**
 * `scope` separa os dois roladores: o da área de trabalho ('local', histórico próprio) e o da
 * sala ('room', histórico compartilhado). Cada um tem seu histórico, resultado e janela.
 */
export function useDiceSession(scope: DiceScope = 'local') {
  const desktop = useDesktop()
  const mode = useState<'local' | 'room'>('dice-mode', () => 'local')
  const context = useState<RoomContext | null>('dice-room-context', () => null)
  const localRolls = useState<RoomRoll[]>('dice-local-rolls', () => [])
  const roomRolls = useState<RoomRoll[]>('dice-room-rolls', () => [])
  const latestLocal = useState<RoomRoll | null>('dice-latest', () => null)
  const latestRoom = useState<RoomRoll | null>('dice-latest-room', () => null)
  const isRoomScope = scope === 'room'
  const latest = isRoomScope ? latestRoom : latestLocal
  /** Como o resultado aparece na sala (config. do mestre). Fora de sala é sempre a janela. */
  const roomPopupMode = useState<'window' | 'joey' | 'off'>('dice-popup-mode', () => 'window')
  /** Fora da sala quem escolhe é o próprio usuário (lembrado neste navegador). */
  const localPopupMode = useState<'window' | 'joey' | 'off'>('dice-popup-mode-local', () => readLocalPopupMode())
  const popupMode = isRoomScope ? roomPopupMode : localPopupMode
  /** Joey visível + contador que reinicia a animação a cada rolagem. */
  /** Config. do mestre: jogadores podem rolar? (o mestre sempre pode). */
  const playerRollsAllowed = useState('dice-player-rolls-allowed', () => true)
  /** Instante (ms) em que o jogador pode rolar de novo na sala; 0 = sem espera. */
  const cooldownUntil = useState('dice-cooldown-until', () => 0)
  const joeyVisibleRoom = useState('dice-joey-visible', () => false)
  const joeyTickRoom = useState('dice-joey-tick', () => 0)
  const joeyVisibleLocal = useState('dice-joey-visible-local', () => false)
  const joeyTickLocal = useState('dice-joey-tick-local', () => 0)
  const joeyVisible = isRoomScope ? joeyVisibleRoom : joeyVisibleLocal
  const joeyTick = isRoomScope ? joeyTickRoom : joeyTickLocal

  const inRoom = computed(() => mode.value === 'room' && !!context.value)
  const rolls = isRoomScope ? roomRolls : localRolls
  const isOwner = computed(() => isRoomScope && inRoom.value && !!context.value?.isOwner)
  /** Pode rolar agora: fora de sala sempre; em sala, o mestre sempre e os jogadores se permitido. */
  const canRoll = computed(() => !isRoomScope || (inRoom.value && (isOwner.value || playerRollsAllowed.value)))

  function openResult() {
    if (isRoomScope) desktop.openApp('dice-result-room', {}, { ownerId: 'route' })
    else desktop.openApp('dice-result')
  }

  /** Mostra o resultado de uma rolagem nova conforme a configuração da sala. */
  function announce() {
    const popup = popupMode.value
    if (popup === 'window') openResult()
    else if (popup === 'joey') {
      joeyTick.value++
      joeyVisible.value = true
    }
  }

  /** Chamado pela página da sala ao conectar. */
  function enterRoom(next: RoomContext) {
    context.value = next
    mode.value = 'room'
    roomRolls.value = []
    latestRoom.value = null
    cooldownUntil.value = 0
  }

  function leaveRoom() {
    mode.value = 'local'
    context.value = null
    roomRolls.value = []
    latestRoom.value = null
    joeyVisibleRoom.value = false
    roomPopupMode.value = 'window'
    playerRollsAllowed.value = true
    cooldownUntil.value = 0
  }

  /** Evento `dice:roll` do SSE (ou resposta do POST). Ignora duplicatas pelo id. */
  function receiveRoll(roll: RoomRoll, { open = true } = {}) {
    if (roomRolls.value.some(r => r.id === roll.id)) return
    roomRolls.value = [roll, ...roomRolls.value].slice(0, 100)
    latestRoom.value = roll
    if (open) announce()
  }

  /** Evento `dice:log`: histórico inicial ao conectar (mais recente primeiro). */
  function receiveLog(log: RoomRoll[]) {
    roomRolls.value = log
  }

  /** Evento `dice:clear`: o mestre fechou a sala. */
  function clearRoom() {
    roomRolls.value = []
    latestRoom.value = null
  }

  /** Mestre limpa o histórico da sala (o servidor avisa todos com `dice:clear`). */
  async function clearRoomHistory() {
    const ctx = context.value
    if (!inRoom.value || !ctx?.isOwner) return
    const response = await fetch(`/api/rooms/${ctx.code}/dice`, { method: 'DELETE' })
    if (!response.ok) throw new Error('Não foi possível limpar o histórico da sala.')
    clearRoom()
  }

  function clearLocal() {
    localRolls.value = []
    latestLocal.value = null
  }

  async function roll(groups: DiceGroup[], type: RollType, mod: number, modSignal: ModSignal, hidden = false, coin = false) {
    if (isRoomScope) {
      const ctx = context.value
      if (!ctx) throw new Error('Você não está em uma sala.')
      const url = new URL(`/api/rooms/${ctx.code}/dice`, window.location.origin)
      if (ctx.token) url.searchParams.set('token', ctx.token)
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups, type, mod, modSignal, hidden, coin }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        // 429: o servidor diz quanto falta; o botão do rolador fica desabilitado até lá.
        if (response.status === 429 && typeof data?.data?.retryAfterMs === 'number') {
          cooldownUntil.value = Date.now() + data.data.retryAfterMs
        }
        throw new Error(data?.statusMessage || 'Não foi possível rolar os dados na sala.')
      }
      // O mestre não tem limite; os jogadores esperam DICE_COOLDOWN_MS entre rolagens.
      if (!ctx.isOwner) cooldownUntil.value = Date.now() + DICE_COOLDOWN_MS
      receiveRoll(await response.json())
      return
    }

    const result = rollDiceGroups(groups, type, mod, modSignal, { coin })
    const entry: RoomRoll = {
      ...result,
      id: crypto.randomUUID(),
      at: Date.now(),
      by: desktop.user.value?.name || 'Você',
      hidden: false,
    }
    localRolls.value = [entry, ...localRolls.value].slice(0, 100)
    latestLocal.value = entry
    announce()
  }

  return { inRoom, popupMode, playerRollsAllowed, cooldownUntil, canRoll, joeyVisible, joeyTick, clearRoomHistory, rolls, latest, isOwner, enterRoom, leaveRoom, receiveRoll, receiveLog, clearRoom, clearLocal, roll, openResult }
}
