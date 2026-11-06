<script setup lang="ts">
import type { RoomToken, SceneAttribute, SceneInitiativeEntry } from "#server/db/schema.ts"
import type { MenuDef, MenuItemDef } from "~/utils/menu"
import { useDialog } from "~~/composables/useDialog"
import { useDesktop } from "~~/composables/useDesktop"
import { useWindow } from "~~/composables/useWindow"
import { useCanvasZoom } from "~~/composables/useCanvasZoom"
import { usePreloadedImage, useImageMap } from "~~/composables/useImagePreloader"
import { buildTokenMenu } from "~/utils/tokenMenu"



definePageMeta({
  layout: 'desktop',
})

const route = useRoute()
const code = route.params.code as string

// ==========================================
// CARREGAMENTO DA SALA (código + senha, sem exigir conta)
// ==========================================

const room = ref<any>(null)
const isPasswordWindowOpen = ref(false)
const isInitiativeWindowOpen = ref(false)
const passwordError = ref('')
const loadError = ref('')

const isGm = computed(() => room.value?.role === 'gm')

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

async function loadRoom(password?: string) {
  try {
    const response = await fetch(`/api/rooms/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (response.status === 401) {
      isPasswordWindowOpen.value = true
      passwordError.value = password ? 'Senha incorreta.' : ''
      return
    }

    if (response.status === 403) {
      loadError.value = 'Esta sala está fechada no momento.'
      return
    }

    if (response.status === 503) {
      isPasswordWindowOpen.value = false
      loadError.value = 'O serviço de tempo real está indisponível no momento. Tente novamente em instantes.'
      return
    }

    if (!response.ok) {
      loadError.value = 'Erro ao carregar a sala.'
      console.error('Erro ao carregar a sala.')
      return
    }

    const data = await response.json()
    setRoom(data)
    isPasswordWindowOpen.value = false
    passwordError.value = ''
    loadError.value = ''
    lastAccessToken.value = data.accessToken
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
  disconnectRoomEvents()
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

  const tokenIds = new Set(newTokens.map(token => token.id))
  const survivors = initiativeList.value.filter(entry => tokenIds.has(entry.tokenId))

  const existingIds = new Set(survivors.map(entry => entry.tokenId))
  const newEntries = newTokens
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
  if (!isGm.value) return
  Object.assign(menuState, { show: true, x: payload.x, y: payload.y })
}

function onTokenDblClick(id: number) {
  selectToken(id)
  if (isGm.value) isTokenConfigWindowOpen.value = true
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

async function openReplaceTokenWindow() {
  if (!selectedTokenId.value) return
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
    status: 'normal',
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
const openDiceRoller = () => desktop.openApp('dice')

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



const tokenContextItems = computed<MenuItemDef[]>(() => isGm.value ? buildTokenMenu({
  configure: () => { isTokenConfigWindowOpen.value = true },
  duplicate: duplicateToken,
  replace: openReplaceTokenWindow,
  hFlip: hFlipToken,
  vFlip: vFlipToken,
  resetRotation: resetTokenRotation,
  remove: handleDeleteTokenAlertWindow,
}, { disabled: selectedTokenId.value === null }) : [])

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
        { id: 'iniciativa', label: '&Iniciativa', icon: 'initiative' as const, action: () => { isInitiativeWindowOpen.value = true } },
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
        { id: 'fechar', label: '&Fechar', action: () => navigateTo('/dashboard') },
      ],
    },
    { id: 'editar', label: '&Editar', items: tokenContextItems.value },
    {
      id: 'inserir',
      label: '&Inserir',
      items: [
        { id: 'inserir-token', label: '&Token…', icon: 'token', action: pickTokenToAdd },
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
        <UiToolbarButton label="Cena" icon="scene" show-label @click="chooseRoomScene" />
        <UiToolbarButton label="Salvar" icon="save" show-label @click="saveRoomSnapshot" />
        <UiToolbarSeparator />
        <UiToolbarButton label="Dados" icon="dice" show-label @click="openDiceRoller" />
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

      <EditorInitiativeWindow v-if="isGm" v-model:open="isInitiativeWindowOpen" v-model:list="initiativeList" />
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
      </div>
    </template>
    <EditorRoomPasswordDialog
        v-else-if="isPasswordWindowOpen"
        :error="passwordError"
        @submit="loadRoom"
        @cancel="navigateTo(desktop.isGuest.value ? '/' : '/dashboard')"
    />
    <p v-else-if="loadError" style="padding: 1rem;">{{ loadError }}</p>
    <p v-else style="padding: 1rem;">Carregando sala...</p>
    <template v-if="room" #statusbar>
      <UiStatusBar>
        <UiStatusField grow>{{ statusFlash ?? roomStatusText }}</UiStatusField>
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
