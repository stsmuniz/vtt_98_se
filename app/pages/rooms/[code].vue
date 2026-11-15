<script setup lang="ts">
import type { DicePopupMode, RoomSettings, RoomToken, SceneAttribute, SceneInitiativeEntry } from "#server/db/schema.ts"
import type { MenuDef, MenuItemDef } from "~/utils/menu"
import { useDialog } from "~~/composables/useDialog"
import { useDesktop } from "~~/composables/useDesktop"
import { useWindow } from "~~/composables/useWindow"
import { useDiceSession } from "~~/composables/useDiceSession"
import { resourceCacheKey } from "~/desktop/resources"
import { useCanvasZoom } from "~~/composables/useCanvasZoom"
import { usePreloadedImage, useImageMap } from "~~/composables/useImagePreloader"
import { buildTokenMenu } from "~/utils/tokenMenu"
import { documentTokenBase, isDocument, openDocumentViewer, type DocumentRecord } from "~/utils/documents"



definePageMeta({
  layout: 'desktop',
})

const route = useRoute()
const code = route.params.code as string
const dice = useDiceSession('room')

// ==========================================
// CARREGAMENTO DA SALA (código + senha, sem exigir conta)
// ==========================================

const room = ref<any>(null)
const isPasswordWindowOpen = ref(false)
const isInitiativeWindowOpen = ref(false)
const isRoomSettingsWindowOpen = ref(false)
const passwordError = ref('')
const loadError = ref('')

const isGm = computed(() => room.value?.role === 'gm')

// Config. de popup de dados escolhida pelo mestre (vem em `room.settings`, inclusive nos
// `room:update` ao vivo) - espelhada no estado da sessão de dados.
const dicePopupSetting = computed<DicePopupMode>({
  get: () => room.value?.settings?.dicePopup ?? 'window',
  set: (value) => { saveRoomSettings({ dicePopup: value }) },
})
watch(dicePopupSetting, (value) => { dice.popupMode.value = value }, { immediate: true })

const allowPlayerRollsSetting = computed<boolean>({
  get: () => room.value?.settings?.allowPlayerRolls !== false,
  set: (value) => { saveRoomSettings({ allowPlayerRolls: value }) },
})
watch(allowPlayerRollsSetting, (value) => { dice.playerRollsAllowed.value = value }, { immediate: true })

const requireApprovalSetting = computed<boolean>({
  get: () => room.value?.settings?.requireApproval === true,
  set: (value) => { saveRoomSettings({ requireApproval: value }) },
})

/** PATCH genérico da sala (nome, senha...). Devolve se deu certo; mostra o erro ao mestre. */
async function patchRoom(body: Record<string, unknown>): Promise<boolean> {
  if (!room.value || !isGm.value) return false
  try {
    const response = await fetch(`/api/v1/rooms/${room.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      await dialog.alert(data?.statusMessage || 'Não foi possível salvar a alteração.', { icon: 'error' })
      return false
    }
    setRoom({ ...room.value, ...(await response.json()) })
    return true
  } catch (error) {
    console.error(error)
    await dialog.alert('Não foi possível salvar a alteração.', { icon: 'error' })
    return false
  }
}

const renameRoom = (name: string) => patchRoom({ name })

async function setRoomPassword(password: string) {
  if (await patchRoom({ password })) showStatusMessage('Senha da sala atualizada.')
}

async function removeRoomPassword() {
  const ok = await dialog.confirm('Remover a senha da sala?\nQualquer pessoa com o código poderá entrar.', { title: 'Remover senha', icon: 'question' })
  if (ok && await patchRoom({ removePassword: true })) showStatusMessage('Senha da sala removida.')
}

async function deleteRoom() {
  if (!room.value || !isGm.value) return
  const ok = await dialog.confirm(
    `Excluir a sala "${room.value.name}"?\nTodos os que estão nela serão desconectados.\nEsta ação não pode ser desfeita.`,
    { title: 'Excluir sala', icon: 'warning', okLabel: 'Excluir' },
  )
  if (!ok) return
  try {
    const response = await fetch(`/api/v1/rooms/${room.value.id}`, { method: 'DELETE' })
    if (!response.ok) throw new Error('Erro ao excluir a sala.')
    // A sala não existe mais: não adianta perguntar se quer salvar as alterações.
    leaveConfirmed = true
    isRoomSettingsWindowOpen.value = false
    await refreshNuxtData(resourceCacheKey('rooms'))
    await navigateTo('/dashboard')
  } catch (error) {
    console.error(error)
    await dialog.alert('Não foi possível excluir a sala.', { icon: 'error' })
  }
}

async function saveRoomSettings(settings: RoomSettings) {
  if (!room.value || !isGm.value) return
  const previous = room.value.settings
  // Otimista: a janela reflete a escolha na hora; volta atrás se o servidor recusar.
  setRoom({ ...room.value, settings: { ...previous, ...settings } })
  try {
    const response = await fetch(`/api/v1/rooms/${room.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    })
    if (!response.ok) throw new Error('Erro ao salvar as configurações da sala.')
  } catch (error) {
    console.error(error)
    setRoom({ ...room.value, settings: previous })
  }
}

// Distingue "room.value alterado a partir de uma resposta do servidor" (fetch ou evento ao
// vivo) de "localTokens alterado por uma edição local do usuário" — evita que reaplicar um
// snapshot vindo do servidor dispare de volta uma transmissão ao vivo (loop infinito). Ver o
// watcher de `localTokens` na seção PERSISTÊNCIA.
let isApplyingRemoteUpdate = false
/** Verdadeiro enquanto aplica um `snapshot:live` (rascunho não salvo). */
let isLiveSnapshot = false

function setRoom(next: any) {
  isApplyingRemoteUpdate = true
  room.value = next
  nextTick(() => { isApplyingRemoteUpdate = false })
}

// ---- Identidade (nome único na sala + token do servidor, lembrados neste navegador) ----
const isNameWindowOpen = ref(false)
const nameError = ref('')
/** Quem está na sala agora (evento `presence` do SSE) e quem sou eu nela. */
const participants = ref<{ id: string; name: string; role: 'gm' | 'player' }[]>([])
const selfParticipantId = ref<string | undefined>(undefined)
const isParticipantsWindowOpen = ref(false)
/** Senha já digitada nesta visita (só em memória), reenviada se o nome precisar ser pedido depois. */
let enteredPassword: string | undefined

const identityKey = `vtt:room-identity:${code}`

function readIdentity(): { token?: string; name?: string } {
  try {
    const raw = localStorage.getItem(identityKey)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveIdentity(identity: { token?: string; name?: string }) {
  try { localStorage.setItem(identityKey, JSON.stringify(identity)) } catch { /* sem localStorage: pede o nome de novo ao recarregar */ }
}

function submitPassword(password: string) {
  enteredPassword = password
  loadRoom({ password })
}

function submitName(name: string) {
  loadRoom({ name })
}

/** Mestre: remove um participante da sala (ele perde o acesso e é desconectado na hora). */
async function kickParticipant(participant: { id: string; name: string }) {
  if (!isGm.value) return
  const ok = await dialog.confirm(
    `Remover "${participant.name}" da sala?\nEle será desconectado e não conseguirá voltar.`,
    { title: 'Remover participante', icon: 'warning', okLabel: 'Remover' },
  )
  if (!ok) return
  try {
    const response = await fetch(`/api/rooms/${code}/kick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: participant.id }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      await dialog.alert(data?.statusMessage || 'Não foi possível remover o participante.', { icon: 'error' })
      return
    }
    kickedList.value = (await response.json()).kicked ?? kickedList.value
    showStatusMessage(`${participant.name} foi removido da sala.`)
  } catch (error) {
    console.error(error)
    await dialog.alert('Não foi possível remover o participante.', { icon: 'error' })
  }
}

/** Mestre: revoga a remoção (a pessoa volta a poder entrar). */
async function unkickParticipant(participant: { id: string; name: string }) {
  if (!isGm.value) return
  try {
    const response = await fetch(`/api/rooms/${code}/unkick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: participant.id }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      await dialog.alert(data?.statusMessage || 'Não foi possível readmitir o participante.', { icon: 'error' })
      return
    }
    kickedList.value = (await response.json()).kicked ?? []
    showStatusMessage(`${participant.name} pode entrar na sala de novo.`)
  } catch (error) {
    console.error(error)
    await dialog.alert('Não foi possível readmitir o participante.', { icon: 'error' })
  }
}

// Removidos: carregados ao abrir as Configurações de Sala (só o mestre).
const kickedList = ref<{ id: string; name: string; at: number; denied?: boolean }[]>([])
async function loadKicked() {
  if (!isGm.value) return
  try {
    const response = await fetch(`/api/rooms/${code}/kicked`)
    if (response.ok) kickedList.value = (await response.json()).kicked ?? []
  } catch (error) {
    console.error('Erro ao carregar os participantes removidos:', error)
  }
}
watch(isRoomSettingsWindowOpen, (isOpen) => { if (isOpen) loadKicked() })

/** O mestre me removeu: corta a conexão, esquece a identidade e mostra o motivo. */
function handleKicked() {
  disconnectRoomEvents()
  dice.leaveRoom()
  try { localStorage.removeItem(identityKey) } catch { /* ignora */ }
  isParticipantsWindowOpen.value = false
  participants.value = []
  room.value = null
  loadError.value = 'Você foi removido da sala pelo mestre.'
}

// ---- Espera pela aprovação do mestre (Configurações de Sala > Acesso) ----
const isWaitingApproval = ref(false)
let approvalPollTimer: ReturnType<typeof setTimeout> | null = null

function stopWaitingForApproval() {
  if (approvalPollTimer) clearTimeout(approvalPollTimer)
  approvalPollTimer = null
  isWaitingApproval.value = false
}

// ---- Mestre: pedidos de entrada ----
// Chegam por `join:request` (na hora) e por `join:pending` (lista completa ao conectar e a cada
// ping). Um popup por vez; "Decidir depois" (também Esc/X) não decide nada e o pedido volta
// em 30 s, se a pessoa ainda estiver esperando.
type JoinRequest = { id: string; name: string }
const joinQueue: JoinRequest[] = []
let askingJoinId: string | null = null
let processingJoins = false
/** Ids decididos há instantes: uma lista atrasada do servidor não pode reabrir o popup. */
const recentlyDecided = new Set<string>()
/** Pedidos que o servidor diz estarem vivos (para saber se vale a pena perguntar de novo). */
let alivePendingIds = new Set<string>()

function enqueueJoinRequest(request: JoinRequest) {
  if (!isGm.value || !request?.id) return
  if (recentlyDecided.has(request.id) || askingJoinId === request.id || joinQueue.some(r => r.id === request.id)) return
  joinQueue.push(request)
  processJoinQueue()
}

function onPendingList(requests: JoinRequest[]) {
  alivePendingIds = new Set(requests.map(r => r.id))
  requests.forEach(enqueueJoinRequest)
}

async function processJoinQueue() {
  if (processingJoins) return
  processingJoins = true
  try {
    while (joinQueue.length) {
      const request = joinQueue.shift()!
      askingJoinId = request.id
      const answer = await dialog.ask({
        title: 'Pedido de entrada',
        icon: 'question',
        message: `"${request.name}" deseja entrar na sala.\n\nRecusar impede o acesso e coloca "${request.name}" na lista de removidos (Configurações de Sala > Participantes).`,
        buttons: [
          { label: 'Aprovar', value: 'approve', default: true },
          { label: 'Recusar', value: 'deny' },
          { label: 'Decidir depois', value: 'later', cancel: true },
        ],
      })
      askingJoinId = null
      if (answer === 'later') {
        setTimeout(() => { if (alivePendingIds.has(request.id)) enqueueJoinRequest(request) }, 30_000)
      } else {
        await decideJoinRequest(request, answer === 'approve')
      }
    }
  } finally {
    processingJoins = false
    askingJoinId = null
  }
}

async function decideJoinRequest(request: JoinRequest, approve: boolean) {
  recentlyDecided.add(request.id)
  alivePendingIds.delete(request.id)
  setTimeout(() => recentlyDecided.delete(request.id), 5000)
  try {
    const response = await fetch(`/api/rooms/${code}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: request.id, approve }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      recentlyDecided.delete(request.id)
      await dialog.alert(data?.statusMessage || 'Não foi possível registrar a decisão.', { icon: 'error' })
      return
    }
    const data = await response.json()
    if (data.kicked) kickedList.value = data.kicked
    showStatusMessage(
      approve
        ? `"${request.name}" foi aprovado e já pode entrar.`
        : `"${request.name}" foi recusado e adicionado à lista de removidos.`,
      5000,
    )
  } catch (error) {
    console.error(error)
    recentlyDecided.delete(request.id)
    await dialog.alert('Não foi possível registrar a decisão.', { icon: 'error' })
  }
}

function cancelEntry() {
  stopWaitingForApproval()
  navigateTo(desktop.isGuest.value ? '/' : '/dashboard')
}

async function loadRoom(attempt: { password?: string; name?: string } = {}) {
  const password = attempt.password ?? enteredPassword
  const stored = readIdentity()
  // Deslogado: reaproveita o nome da última visita; um nome digitado agora tem prioridade.
  const name = attempt.name ?? stored.name
  try {
    const response = await fetch(`/api/rooms/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, name, token: stored.token }),
    })

    if (response.status === 401) {
      isNameWindowOpen.value = false
      isPasswordWindowOpen.value = true
      passwordError.value = attempt.password ? 'Senha incorreta.' : ''
      return
    }

    if (response.status === 400 || response.status === 409) {
      const data = await response.json().catch(() => null)
      isPasswordWindowOpen.value = false
      isNameWindowOpen.value = true
      // Sem nome ainda (400) só pede; nome repetido (409) explica o motivo.
      nameError.value = response.status === 409 ? (data?.statusMessage || 'Já existe alguém na sala com esse nome.') : ''
      return
    }

    if (response.status === 403) {
      const data = await response.json().catch(() => null)
      stopWaitingForApproval()
      const reason = data?.data?.reason
      loadError.value = reason === 'denied'
        ? 'O mestre não aprovou a sua entrada.'
        : reason === 'kicked'
          ? 'Você foi removido da sala pelo mestre.'
          : 'Esta sala está fechada no momento.'
      return
    }

    if (response.status === 503) {
      stopWaitingForApproval()
      isPasswordWindowOpen.value = false
      loadError.value = 'O serviço de tempo real está indisponível no momento. Tente novamente em instantes.'
      return
    }

    // 202: o mestre exige aprovar cada entrada. A sala não vem junto; fica consultando o /join
    // (com o token guardado) até o mestre decidir — aprovado devolve a sala, recusado dá 403.
    if (response.status === 202) {
      const data = await response.json()
      isPasswordWindowOpen.value = false
      isNameWindowOpen.value = false
      nameError.value = ''
      if (data.accessToken) saveIdentity({ token: data.accessToken, name: data.participant?.name })
      isWaitingApproval.value = true
      approvalPollTimer = setTimeout(() => loadRoom(), 3000)
      return
    }

    if (!response.ok) {
      stopWaitingForApproval()
      loadError.value = 'Erro ao carregar a sala.'
      console.error('Erro ao carregar a sala.')
      return
    }

    const data = await response.json()
    stopWaitingForApproval()
    setRoom(data)
    isPasswordWindowOpen.value = false
    isNameWindowOpen.value = false
    passwordError.value = ''
    nameError.value = ''
    loadError.value = ''
    lastAccessToken.value = data.accessToken
    selfParticipantId.value = data.participant?.id
    if (data.role !== 'gm' && data.accessToken) saveIdentity({ token: data.accessToken, name: data.participant?.name })
    dice.enterRoom({
      code: String(code),
      token: data.accessToken,
      isOwner: data.role === 'gm',
    })
    connectRoomEvents()
  } catch (error) {
    console.error('Erro ao carregar a sala:', error)
  }
}

// ==========================================
// SINCRONIZAÇÃO EM TEMPO REAL (Server-Sent Events)
// ==========================================
// Replica, ao vivo, as mudanças feitas pelo dono da sala para todos os visitantes conectados
// nesta mesma sala: edições de token (`snapshot:live`, ver o watcher de `localTokens` mais
// abaixo) trafegam sem tocar no banco (via POST em /api/rooms/:code/live), enquanto mudanças
// salvas (`room:update`, disparado pelos endpoints PATCH/PUT de `/api/v1/rooms/:id`) refletem
// o estado persistido. O WebSocket original não funciona no Nitro/Vercel (sem suporte), então
// a entrega servidor -> navegador usa Server-Sent Events, que só precisa de uma direção.

const lastAccessToken = ref<string | undefined>(undefined)
let roomEvents: EventSource | null = null
let roomEventsReconnectTimer: ReturnType<typeof setTimeout> | null = null

function connectRoomEvents() {
  if (typeof window === 'undefined') return

  const url = new URL(`/api/rooms/${code}/events`, window.location.origin)
  if (lastAccessToken.value) url.searchParams.set('token', lastAccessToken.value)
  roomEvents = new EventSource(url)

  roomEvents.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'room:update' && data.room) {
        setRoom({ ...room.value, ...data.room })
      } else if (data.type === 'snapshot:live' && data.snapshot) {
        isLiveSnapshot = true
        setRoom({ ...room.value, snapshot: data.snapshot })
        nextTick(() => { isLiveSnapshot = false })
      } else if (data.type === 'room:closed') {
        console.error('A sala foi encerrada pelo dono.')
      } else if (data.type === 'dice:roll' && data.roll) {
        dice.receiveRoll(data.roll)
      } else if (data.type === 'dice:log' && Array.isArray(data.rolls)) {
        dice.receiveLog(data.rolls)
      } else if (data.type === 'dice:clear') {
        dice.clearRoom()
      } else if (data.type === 'presence' && Array.isArray(data.participants)) {
        participants.value = data.participants
      } else if (data.type === 'join:request' && data.request) {
        alivePendingIds.add(data.request.id)
        enqueueJoinRequest(data.request)
      } else if (data.type === 'join:pending' && Array.isArray(data.requests)) {
        onPendingList(data.requests)
      } else if (data.type === 'kicked' && data.participantId === selfParticipantId.value) {
        handleKicked()
      }
    } catch (error) {
      console.error('Erro ao processar mensagem da sala:', error)
    }
  })

  // O EventSource já reconecta sozinho quando a conexão cai no meio (ex.: a função da Vercel
  // atinge o tempo máximo de execução) — só precisamos recriar manualmente quando o navegador
  // encerra a stream de vez (readyState CLOSED), o que acontece se a resposta inicial não for
  // 2xx (ex.: token de acesso expirado).
  roomEvents.addEventListener('error', () => {
    if (roomEvents?.readyState === EventSource.CLOSED) {
      roomEvents = null
      roomEventsReconnectTimer = setTimeout(connectRoomEvents, 2000)
    }
  })
}

function disconnectRoomEvents() {
  if (roomEventsReconnectTimer) {
    clearTimeout(roomEventsReconnectTimer)
    roomEventsReconnectTimer = null
  }
  roomEvents?.close()
  roomEvents = null
}

onMounted(() => {
  loadRoom()
})

onUnmounted(() => {
  stopWaitingForApproval()
  disconnectRoomEvents()
  dice.leaveRoom()
})

// ==========================================
// CANVAS (mesmo padrão do editor de cenas)
// ==========================================

const { zoom: sceneZoom, scale: stageScale, zoomIn, zoomOut, resetZoom } = useCanvasZoom()
const { image: bgImageObj, load: loadBgImage } = usePreloadedImage()
const { images: tokenImages, ensureLoaded: ensureTokenImageLoaded } = useImageMap()

type StageApi = { hFlip: (id: number) => void; vFlip: (id: number) => void; resetRotation: (id: number) => void; fit: () => void }
const stage = ref<StageApi | null>(null)
const selectedTokenId = ref<number | null>(null)

const initiativeList = ref<SceneInitiativeEntry[]>([])

const localTokens = ref<RoomToken[]>([])
/** Tokens como estão gravados no banco (para saber se há alterações não salvas). */
const savedSignature = ref('[]')
const isDirty = computed(() => isGm.value && JSON.stringify(localTokens.value) !== savedSignature.value)
const sceneWidth = ref(1920)
const sceneHeight = ref(1080)

// Strips a previously-applied " #N" disambiguation suffix, recovering the
// name a token would have if it were the only one of its kind in the room.
function getTokenBaseName(name: string): string {
  const match = name.match(/^(.*) #\d+$/)
  return match ? match[1] : name
}

// Ensures every token in the room has a unique display name: tokens sharing
// the same base name get a stable, ascending " #N" suffix (in array order),
// while a token that's the only one of its kind keeps its plain base name.
function disambiguateTokenNames(tokensList: RoomToken[]) {
  const groups = new Map<string, RoomToken[]>()
  for (const token of tokensList) {
    const baseName = getTokenBaseName(token.name)
    const group = groups.get(baseName)
    if (group) {
      group.push(token)
    } else {
      groups.set(baseName, [token])
    }
  }

  for (const [baseName, group] of groups) {
    group.forEach((token, index) => {
      const newName = group.length > 1 ? `${baseName} #${index + 1}` : baseName
      if (token.name !== newName) token.name = newName
    })
  }
}

// Keeps initiativeList in sync with the room's live tokens: drops entries for
// tokens no longer present, adds entries for newly added tokens, and refreshes
// names — while preserving each surviving entry's order and initiative value.
watch(localTokens, (newTokens) => {
  if (!newTokens) return

  disambiguateTokenNames(newTokens)

  // Documentos (imagens da mesa) não entram na iniciativa.
  const initiativeTokens = newTokens.filter(token => !isDocument(token))
  const tokenIds = new Set(initiativeTokens.map(token => token.id))
  const survivors = initiativeList.value.filter(entry => tokenIds.has(entry.tokenId))

  const existingIds = new Set(survivors.map(entry => entry.tokenId))
  const newEntries = initiativeTokens
      .filter(token => !existingIds.has(token.id))
      .map(token => ({ tokenId: token.id, name: token.name, value: '' }))

  const nameById = new Map(newTokens.map(token => [token.id, token.name]))
  initiativeList.value = [...survivors, ...newEntries].map(entry => ({
    ...entry,
    name: nameById.get(entry.tokenId) ?? entry.name,
  }))
}, { immediate: true, deep: true })

watch(() => room.value, (newRoom) => {
  const snapshot = newRoom?.snapshot
  if (!snapshot) return
  sceneWidth.value = snapshot.width ?? 1920
  sceneHeight.value = snapshot.height ?? 1080
  // Deep-clone (not a shallow spread): localTokens must own independent token objects.
  // A shallow copy shares the same token objects with room.value.snapshot, so dragging a
  // token mutates a property this same deep watcher is watching, which re-fires and rebuilds
  // localTokens from the (unsaved) snapshot — silently wiping out any local-only token, such
  // as one just duplicated or added but not yet saved.
  localTokens.value = JSON.parse(JSON.stringify(snapshot.tokens ?? []))
  // Snapshot ao vivo (rascunho do mestre) não conta como salvo; o do banco, sim.
  if (!isLiveSnapshot) savedSignature.value = JSON.stringify(localTokens.value)
}, { immediate: true, deep: true })

watchEffect(() => {
  loadBgImage(room.value?.sourceScene?.scenario?.image)
})

watch(localTokens, (newTokens) => {
  if (!newTokens) return
  newTokens.forEach(token => ensureTokenImageLoaded(token.id, token.image))
}, { immediate: true, deep: true })


const selectToken = (id: number | null) => {
  if (id === null) {
    selectedTokenId.value = null
    return
  }
  selectedTokenId.value = id
  const index = localTokens.value.findIndex(t => t.id === id)
  if (index > 0) {
    const [token] = localTokens.value.splice(index, 1)
    localTokens.value.unshift(token)
  }
}

const selectedToken = computed(() => localTokens.value.find(t => t.id === selectedTokenId.value))

// ==========================================
// INTERPOLAÇÃO DE MOVIMENTO (somente visitantes)
// ==========================================
// O dono da sala arrasta os tokens diretamente (posição já é local, não precisa suavizar).
// Já os visitantes recebem a posição pronta via `snapshot:live`, o que faria o token "teleportar"
// de uma posição pra outra a cada atualização. Para dar uma sensação de movimento, cada token
// visitante tem uma posição exibida (`displayPositions`) que persegue a posição alvo (`localTokens`)
// suavemente, quadro a quadro, em vez de saltar direto pra ela.
const displayPositions = reactive<Record<number, { x: number; y: number }>>({})
let displayAnimationFrame: number | null = null

function stepDisplayPositions() {
  const smoothing = 0.18
  const threshold = 0.5
  let stillMoving = false

  for (const token of localTokens.value) {
    const pos = displayPositions[token.id]
    if (!pos) continue

    const dx = token.x - pos.x
    const dy = token.y - pos.y

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
      pos.x = token.x
      pos.y = token.y
    } else {
      pos.x += dx * smoothing
      pos.y += dy * smoothing
      stillMoving = true
    }
  }

  displayAnimationFrame = stillMoving ? requestAnimationFrame(stepDisplayPositions) : null
}

function startDisplayAnimation() {
  if (displayAnimationFrame === null) {
    displayAnimationFrame = requestAnimationFrame(stepDisplayPositions)
  }
}

watch(localTokens, (newTokens) => {
  if (isGm.value || !newTokens) return

  const currentIds = new Set(newTokens.map(token => token.id))
  for (const id of Object.keys(displayPositions).map(Number)) {
    if (!currentIds.has(id)) delete displayPositions[id]
  }

  for (const token of newTokens) {
    if (!displayPositions[token.id]) {
      displayPositions[token.id] = { x: token.x, y: token.y }
    }
  }

  startDisplayAnimation()
}, { immediate: true, deep: true })

onUnmounted(() => {
  if (displayAnimationFrame !== null) cancelAnimationFrame(displayAnimationFrame)
})



const hFlipToken = () => { if (selectedTokenId.value) stage.value?.hFlip(selectedTokenId.value) }
const vFlipToken = () => { if (selectedTokenId.value) stage.value?.vFlip(selectedTokenId.value) }
const resetTokenRotation = () => { if (selectedTokenId.value) stage.value?.resetRotation(selectedTokenId.value) }

const duplicateToken = () => {
  const token = selectedToken.value
  if (!token) return
  const newToken = { ...token, id: Date.now(), x: token.x + 10, y: token.y + 10 }
  localTokens.value.unshift(newToken)
  selectToken(newToken.id)
  ensureTokenImageLoaded(newToken.id, newToken.image)
}

const menuState = reactive({ show: false, x: 0, y: 0 })

function onTokenContext(payload: { x: number; y: number }) {
  // Visitantes só têm menu sobre documentos (para abri-los).
  if (!isGm.value && !isDocument(selectedToken.value)) return
  Object.assign(menuState, { show: true, x: payload.x, y: payload.y })
}

function onTokenDblClick(id: number) {
  selectToken(id)
  const token = localTokens.value.find(t => t.id === id)
  // Documento: todos (mestre e visitantes) abrem a versão grande; o resto abre as configurações, só para o mestre.
  if (token && isDocument(token)) openDocumentViewer(desktop, token)
  else if (isGm.value) isTokenConfigWindowOpen.value = true
}

function openSelectedDocument() {
  const token = selectedToken.value
  if (token && isDocument(token)) openDocumentViewer(desktop, token)
}

function fitToWindow() {
  stage.value?.fit()
}

// ==========================================
// PERSISTÊNCIA (somente GM)
// ==========================================

function buildSnapshotPayload() {
  return {
    sceneId: room.value?.snapshot?.sceneId ?? room.value?.sceneId,
    width: sceneWidth.value,
    height: sceneHeight.value,
    startingPosition: room.value?.snapshot?.startingPosition ?? null,
    tokens: localTokens.value,
  }
}

async function sendLiveSnapshot() {
  try {
    await fetch(`/api/rooms/${code}/live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot: buildSnapshotPayload() }),
    })
  } catch (error) {
    console.error('Erro ao transmitir alteração ao vivo:', error)
  }
}

// Transmite qualquer edição local de tokens (arrastar, redimensionar, girar, duplicar,
// remover, adicionar, editar atributos) para os visitantes assim que ela acontece — sem
// gravar no banco. A gravação só ocorre quando o dono clica em "Salvar" (`saveRoomSnapshot`).
// O guard de `isApplyingRemoteUpdate` evita reenviar um snapshot que acabou de chegar do
// próprio servidor (via `setRoom`), o que causaria um loop infinito de mensagens.
watch(localTokens, () => {
  if (!isGm.value || isApplyingRemoteUpdate) return
  sendLiveSnapshot()
}, { deep: true })

/** Grava a sala. Retorna se deu certo. */
async function saveRoomSnapshot(): Promise<boolean> {
  if (!room.value) return false
  try {
    const response = await fetch(`/api/v1/rooms/${room.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot: buildSnapshotPayload() }),
    })
    if (response.ok) {
      setRoom({ ...(await response.json()), role: 'gm' })
      savedSignature.value = JSON.stringify(localTokens.value)
      showStatusMessage('Sala salva com sucesso!')
      return true
    }
    console.error('Erro ao salvar a sala.')
  } catch (error) {
    console.error('Erro ao salvar a sala:', error)
  }
  await dialog.alert('Não foi possível salvar a sala. Tente novamente.', { title: 'Erro ao salvar', icon: 'error' })
  return false
}

let leaveConfirmed = false

/** Pergunta se salva antes de sair (só o mestre tem o que salvar). */
async function confirmLeave(): Promise<boolean> {
  if (leaveConfirmed || !isDirty.value) return true
  const answer = await dialog.ask({
    title: 'Sala',
    icon: 'warning',
    message: `Deseja salvar as alterações na sala "${room.value?.name ?? ''}"?`,
    buttons: [
      { label: 'Sim', value: 'yes', default: true },
      { label: 'Não', value: 'no' },
      { label: 'Cancelar', value: 'cancel', cancel: true },
    ],
  })
  if (answer === 'cancel') return false
  if (answer === 'yes' && !(await saveRoomSnapshot())) return false
  leaveConfirmed = true
  return true
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!isDirty.value) return
  event.preventDefault()
  event.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
onBeforeRouteLeave(async () => {
  const ok = await confirmLeave()
  if (!ok) leaveConfirmed = false
  return ok
})

async function handleDeleteTokenAlertWindow() {
  if (!selectedTokenId.value) return
  const ok = await dialog.confirm('Tem certeza de que deseja remover este token da sala?', { title: 'Remover token', icon: 'warning' })
  if (ok) handleDeleteToken()
}

async function openReplaceDocumentWindow() {
  const index = localTokens.value.findIndex(t => t.id === selectedTokenId.value)
  if (index === -1) return
  const doc = await desktop.pick<DocumentRecord>('documents', { ownerId: 'route', title: 'Substituir documento', confirmLabel: 'Substituir' })
  if (!doc) return
  const current = localTokens.value[index]
  // Mantém a altura do documento na sala e ajusta a largura à proporção do novo.
  const width = doc.width && doc.height ? current.height * (doc.width / doc.height) : current.width
  const base = documentTokenBase(doc, 0, 0)
  localTokens.value.splice(index, 1, { ...current, documentId: base.documentId, name: base.name, image: base.image, fullImage: base.fullImage, width })
  tokenImages[current.id] = null
  ensureTokenImageLoaded(current.id, base.image)
}

async function openReplaceTokenWindow() {
  if (!selectedTokenId.value) return
  if (isDocument(selectedToken.value)) return openReplaceDocumentWindow()
  const token = await desktop.pick('tokens', { ownerId: 'route', title: 'Substituir token', confirmLabel: 'Substituir' })
  if (token) replaceToken(token)
}

const replaceToken = (token: any) => {
  const index = localTokens.value.findIndex(t => t.id === selectedTokenId.value)
  if (index === -1) return

  const current = localTokens.value[index]
  // Mantém a altura atual do token na sala, mas ajusta a largura para preservar
  // a proporção (largura/altura) do token escolhido para substituição.
  const width = token.width && token.height
      ? current.height * (token.width / token.height)
      : current.width
  const replaced: RoomToken = {
    ...current,
    tokenId: token.id,
    name: token.name ?? '',
    image: token.image ?? '',
    attributes: token.attributes ?? [],
    width,
  }
  localTokens.value.splice(index, 1, replaced)

  // Força o recarregamento da imagem: ensureTokenImageLoaded ignora ids já
  // presentes no mapa, mas aqui a imagem do token mudou mesmo mantendo o id.
  tokenImages[current.id] = null
  ensureTokenImageLoaded(current.id, replaced.image)

}

const handleDeleteToken = () => {
  if (!selectedTokenId.value) return

  const tokenId = selectedTokenId.value
  const index = localTokens.value.findIndex(t => t.id === tokenId)
  if (index === -1) return

  localTokens.value.splice(index, 1)
  selectedTokenId.value = null

  isTokenConfigWindowOpen.value = false
}

const isTokenConfigWindowOpen = ref(false)

watch(selectedToken, (newToken) => {
  if (!newToken) return
  localTokens.value.map(token => {
    if (token.id === newToken.id) {
      Object.assign(token, newToken)
    }
  })
})

// ==========================================
// ADICIONAR TOKEN (com atributos: atual/máximo/visibilidade)
// ==========================================

const isTokenAttributesWindowOpen = ref(false)
const pendingToken = ref<any>(null)

function onTokenPicked(token: any) {
  if (!token) return
  pendingToken.value = token
  isTokenAttributesWindowOpen.value = true
}

async function pickTokenToAdd() {
  const token = await desktop.pick('tokens', { ownerId: 'route', title: 'Adicionar token à sala', confirmLabel: 'Adicionar à sala' })
  if (token) onTokenPicked(token)
}

/** Documento na sala: entra direto, sem o diálogo de atributos (documentos não têm atributos). */
async function pickDocumentToAdd() {
  const doc = await desktop.pick<DocumentRecord>('documents', { ownerId: 'route', title: 'Adicionar documento à sala', confirmLabel: 'Adicionar à sala' })
  if (!doc) return
  const roomToken: RoomToken = {
    id: Date.now(),
    ...documentTokenBase(doc, sceneWidth.value / 2, sceneHeight.value / 2),
  }
  localTokens.value = [roomToken, ...localTokens.value]
  selectToken(roomToken.id)
  ensureTokenImageLoaded(roomToken.id, roomToken.image)
}

function closeTokenAttributesWindow() {
  isTokenAttributesWindowOpen.value = false
  pendingToken.value = null
}

function onTokenAttributesConfirmed(attributes: SceneAttribute[]) {
  const token = pendingToken.value
  if (!token) return

  const roomToken: RoomToken = {
    id: Date.now(),
    tokenId: token.id,
    name: token.name ?? '',
    image: token.image ?? '',
    x: sceneWidth.value / 2 - (token.width ?? 100) / 2,
    y: sceneHeight.value / 2 - (token.height ?? 100) / 2,
    width: token.width ?? 100,
    height: token.height ?? 100,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 100,
    statuses: [],
    attributes,
  }

  localTokens.value = [roomToken, ...localTokens.value]
  selectToken(roomToken.id)
  ensureTokenImageLoaded(roomToken.id, roomToken.image)

  closeTokenAttributesWindow()
}

// ==========================================
// MUDAR CENA (reconstrói o snapshot a partir da nova cena)
// ==========================================

async function chooseRoomScene() {
  const scene = await desktop.pick('scenes', { ownerId: 'route', title: 'Trocar cena da sala', confirmLabel: 'Usar esta cena' })
  if (scene) await changeRoomScene(scene)
}

async function changeRoomScene(scene: any) {
  if (!scene || !room.value) return
  try {
    const response = await fetch(`/api/v1/rooms/${room.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sceneId: scene.id }),
    })
    if (response.ok) {
      setRoom({ ...(await response.json()), role: 'gm' })
      selectedTokenId.value = null
    } else {
      console.error('Erro ao trocar a cena da sala.')
    }
  } catch (error) {
    console.error('Erro ao trocar a cena da sala:', error)
  }
}

// ==========================================
// AÇÕES DO MENU / ATALHOS
// ==========================================

const desktop = useDesktop()
const dialog = useDialog()
const routeWindow = useWindow('route')
const openHelpManual = () => desktop.openHelp()
const openDiceRoller = () => desktop.openApp('dice-room', {}, { ownerId: 'route' })

// Mensagem temporária na barra de status (ex.: "Sala salva com sucesso!")
const statusFlash = ref<string | null>(null)
let statusFlashTimer: ReturnType<typeof setTimeout> | null = null
function showStatusMessage(text: string, duration = 2000) {
  if (statusFlashTimer) clearTimeout(statusFlashTimer)
  statusFlash.value = text
  statusFlashTimer = setTimeout(() => { statusFlash.value = null }, duration)
}

const roomStatusText = computed(() => room.value ? `Sala ${room.value.isOpen ? 'aberta' : 'fechada'}` : 'Conectando…')

// ==========================================
// ABRIR / FECHAR SALA (somente GM)
// ==========================================

async function openToggleRoomOpenAlert() {
  if (!room.value) return
  const closing = room.value.isOpen
  const ok = await dialog.confirm(
    closing
      ? 'Tem certeza de que deseja fechar a sala?\nVisitantes não conseguirão entrar até que ela seja reaberta.'
      : 'Tem certeza de que deseja abrir a sala?\nVisitantes poderão entrar novamente.',
    { title: closing ? 'Fechar sala' : 'Abrir sala', icon: 'question' },
  )
  if (ok) await confirmToggleRoomOpen()
}

async function confirmToggleRoomOpen() {
  if (!room.value) return
  try {
    const response = await fetch(`/api/v1/rooms/${room.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOpen: !room.value.isOpen }),
    })
    if (response.ok) {
      setRoom({ ...(await response.json()), role: 'gm' })
    } else {
      console.error('Erro ao mudar o estado da sala.')
    }
  } catch (error) {
    console.error('Erro ao mudar o estado da sala:', error)
  }
}

// Atalhos da sala (só o GM edita): valem com a janela da sala ativa.
routeWindow.onBeforeClose(confirmLeave)

routeWindow.shortcuts({
  'ctrl+s': { run: () => { if (isGm.value) saveRoomSnapshot() }, allowInInput: true },
  delete: () => { if (isGm.value) handleDeleteTokenAlertWindow() },
})



const tokenContextItems = computed<MenuItemDef[]>(() => {
  const document = isDocument(selectedToken.value)
  if (!isGm.value) {
    // Visitante: só "Abrir documento", e só quando o item selecionado é um documento.
    return document ? [{ id: 'tk-abrir', label: '&Abrir documento', icon: 'image', default: true, action: openSelectedDocument }] : []
  }
  return buildTokenMenu({
    configure: () => { isTokenConfigWindowOpen.value = true },
    open: openSelectedDocument,
    duplicate: duplicateToken,
    replace: openReplaceTokenWindow,
    hFlip: hFlipToken,
    vFlip: vFlipToken,
    resetRotation: resetTokenRotation,
    remove: handleDeleteTokenAlertWindow,
  }, { disabled: selectedTokenId.value === null, document })
})

const windowTitle = computed(() => room.value?.name ? `${room.value.name} - Sala` : 'Sala')

const roomMenus = computed<MenuDef[]>(() => {
  const view: MenuDef = {
    id: 'exibir',
    label: 'E&xibir',
    items: [
      { id: 'zoom-mais', label: '&Aumentar zoom', icon: 'zoom-in', action: zoomIn },
      { id: 'zoom-menos', label: '&Diminuir zoom', icon: 'zoom-out', action: zoomOut },
      { id: 'zoom-100', label: '&Tamanho real (100%)', action: resetZoom },
      { id: 'zoom-ajustar', label: 'Ajustar à &janela', action: fitToWindow },
      { type: 'separator' },
      { id: 'tela-cheia', label: '&Tela cheia', icon: 'fullscreen', action: desktop.toggleFullscreen },
    ],
  }
  const help: MenuDef = {
    id: 'ajuda',
    label: 'Aj&uda',
    items: [{ id: 'manual', label: '&Manual do VTT 98 SE', icon: 'help', shortcut: 'F1', action: openHelpManual }],
  }
  const tools: MenuDef = {
    id: 'ferramentas',
    label: '&Ferramentas',
    items: [
      { id: 'dados', label: '&Rolador de dados', icon: 'dice', action: openDiceRoller },
      ...(isGm.value ? [
        { id: 'participantes', label: '&Participantes…', icon: 'users' as const, action: () => { isParticipantsWindowOpen.value = true } },
        { id: 'iniciativa', label: '&Iniciativa', icon: 'initiative' as const, action: () => { isInitiativeWindowOpen.value = true } },
        { id: 'status', label: '&Status…', icon: 'warning' as const, action: () => { desktop.openApp('status-manager') } },
        { type: 'separator' as const },
        { id: 'abrir-fechar', label: room.value?.isOpen ? '&Fechar sala…' : '&Abrir sala…', icon: 'lock' as const, action: openToggleRoomOpenAlert },
      ] : []),
    ],
  }
  if (!isGm.value) return [view, tools, help]
  return [
    {
      id: 'arquivo',
      label: '&Arquivo',
      items: [
        { id: 'salvar', label: '&Salvar', icon: 'save', shortcut: 'Ctrl+S', action: saveRoomSnapshot },
        { type: 'separator' },
        { id: 'config-sala', label: 'Configurações de S&ala…', icon: 'room' as const, action: () => { isRoomSettingsWindowOpen.value = true } },
        { type: 'separator' },
        { id: 'fechar', label: '&Fechar', action: () => navigateTo('/dashboard') },
      ],
    },
    { id: 'editar', label: '&Editar', items: tokenContextItems.value },
    {
      id: 'inserir',
      label: '&Inserir',
      items: [
        { id: 'inserir-token', label: '&Token…', icon: 'token', action: pickTokenToAdd },
        { id: 'inserir-documento', label: '&Documento…', icon: 'image', action: pickDocumentToAdd },
        { id: 'trocar-cena', label: '&Cena…', icon: 'scene', action: chooseRoomScene },
      ],
    },
    view,
    tools,
    help,
  ]
})
routeWindow.setMenus(roomMenus.value)
watch(roomMenus, m => routeWindow.setMenus(m))
onBeforeUnmount(() => routeWindow.setMenus(undefined))
</script>

<template>
  <DesktopRouteWindow :title="windowTitle" icon="room" :close-to="desktop.isGuest.value ? '/' : '/dashboard'">
    <template v-if="room && isGm" #toolbar>
      <UiToolbar label="Ferramentas da sala">
        <UiToolbarButton label="Token" icon="token" show-label @click="pickTokenToAdd" />
        <UiToolbarButton label="Documento" icon="image" show-label @click="pickDocumentToAdd" />
        <UiToolbarButton label="Cena" icon="scene" show-label @click="chooseRoomScene" />
        <UiToolbarButton label="Salvar" icon="save" show-label @click="saveRoomSnapshot" />
        <UiToolbarSeparator />
        <UiToolbarButton label="Dados" icon="dice" show-label @click="openDiceRoller" />
        <UiToolbarButton label="Participantes" icon="users" show-label @click="isParticipantsWindowOpen = true" />
        <UiToolbarButton label="Iniciativa" icon="initiative" show-label @click="isInitiativeWindowOpen = true" />
        <UiToolbarButton :label="room.isOpen ? 'Fechar sala' : 'Abrir sala'" icon="lock" show-label :pressed="!room.isOpen" @click="openToggleRoomOpenAlert" />
        <UiToolbarSeparator />
        <UiToolbarButton label="Ajuda" icon="help" show-label @click="openHelpManual" />
      </UiToolbar>
    </template>
    <template v-if="room">
      <UiContextMenu
          :open="menuState.show && tokenContextItems.length > 0"
          :x="menuState.x"
          :y="menuState.y"
          :items="tokenContextItems"
          label="Token"
          @close="menuState.show = false"
      />



      <EditorTokenAttributesDialog
          v-model:open="isTokenAttributesWindowOpen"
          :token="pendingToken"
          @confirm="onTokenAttributesConfirmed"
      />

      <EditorRoomParticipantsWindow v-if="isGm" v-model:open="isParticipantsWindowOpen" :participants="participants" :self-id="selfParticipantId" />
      <EditorInitiativeWindow v-if="isGm" v-model:open="isInitiativeWindowOpen" v-model:list="initiativeList" />
      <EditorRoomSettingsWindow
          v-if="isGm"
          v-model:open="isRoomSettingsWindowOpen"
          v-model:dice-popup="dicePopupSetting"
          v-model:allow-player-rolls="allowPlayerRollsSetting"
          v-model:require-approval="requireApprovalSetting"
          :name="room.name"
          :has-password="!!room.hasPassword"
          :is-open="!!room.isOpen"
          :participants="participants"
          :self-id="selfParticipantId"
          :kicked="kickedList"
          @kick="kickParticipant"
          @unkick="unkickParticipant"
          @rename="renameRoom"
          @set-password="setRoomPassword"
          @remove-password="removeRoomPassword"
          @toggle-open="openToggleRoomOpenAlert"
          @delete-room="deleteRoom"
        />
      <EditorTokenConfigWindow
          v-if="isGm"
          v-model:open="isTokenConfigWindowOpen"
          :token="selectedToken ?? null"
          @remove="handleDeleteTokenAlertWindow"
      />



      <div class="canvas-wrap">
        <EditorStage
            ref="stage"
            v-model:tokens="localTokens"
            v-model:width="sceneWidth"
            v-model:height="sceneHeight"
            :scale="stageScale"
            :background="bgImageObj"
            :images="tokenImages"
            :selected="selectedTokenId"
            :editable="isGm"
            :positions="isGm ? null : displayPositions"
            @select="selectToken"
            @context="onTokenContext"
            @dblclick="onTokenDblClick"
            @zoom="sceneZoom = $event"
        />
        <EditorJoeyPopup @new-roll="openDiceRoller" />
      </div>
    </template>
    <EditorRoomPasswordDialog
        v-else-if="isPasswordWindowOpen"
        :error="passwordError"
        @submit="submitPassword"
        @cancel="cancelEntry"
    />
    <EditorRoomNameDialog
        v-else-if="isNameWindowOpen"
        :error="nameError"
        @submit="submitName"
        @cancel="cancelEntry"
    />
    <EditorRoomWaitingDialog
        v-else-if="isWaitingApproval"
        @cancel="cancelEntry"
    />
    <p v-else-if="loadError" style="padding: 1rem;">{{ loadError }}</p>
    <p v-else style="padding: 1rem;">Carregando sala...</p>
    <template v-if="room" #statusbar>
      <UiStatusBar>
        <UiStatusField grow>{{ statusFlash ?? roomStatusText }}</UiStatusField>
        <UiStatusField v-if="isGm">{{ participants.length }} {{ participants.length === 1 ? 'participante' : 'participantes' }}</UiStatusField>
        <UiStatusField>{{ isGm ? 'Mestre' : 'Jogador' }}</UiStatusField>
        <UiStatusField v-if="isDirty">Alterações não salvas</UiStatusField>
        <UiStatusField class="zoom-field">
          <EditorZoomControl v-model="sceneZoom" @in="zoomIn" @out="zoomOut" @reset="resetZoom" @fit="fitToWindow" />
        </UiStatusField>
      </UiStatusBar>
    </template>
  </DesktopRouteWindow>
</template>

<style lang="css" scoped>
/* Controle de zoom na barra de status da janela */
.zoom-field {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding-top: 0;
  padding-bottom: 0;
}

.canvas-wrap {
  position: relative; /* o canvas ocupa toda a área (position: absolute) */
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  background: var(--c-shadow);
}

.dice-selector-button {
  box-shadow: none;
  padding: 0;
  min-width: 4rem;
}

.scene-footer {
  display: flex;
  align-items: center;
}

.footer-separator {
  align-self: stretch;
  width: 0;
  margin: 2px 8px;
  border: none;
  border-left: 1px solid #808080;
  border-right: 1px solid #ffffff;
}

.zoom-control-container {
  button {
    min-width: 0.25rem;
  }
}
</style>
