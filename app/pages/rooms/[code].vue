<script setup lang="ts">
import type { RoomToken, SceneAttribute, SceneInitiativeEntry } from "#server/db/schema.ts"
import { useMenuActions } from "~~/composables/useMenuActions"
import { useCanvasZoom } from "~~/composables/useCanvasZoom"
import { usePreloadedImage, useImageMap } from "~~/composables/useImagePreloader"
import { useTokenTransform } from "~~/composables/useTokenTransform"

import {
  Stage as VStage,
  Layer as VLayer,
  Image as VImage,
  Group as VGroup,
  Transformer as VTransformer,
} from 'vue-konva'

import TokensWindow from "~/components/TokensWindow.vue"
import ScenesWindow from "~/components/ScenesWindow.vue"
import FixedWindow from "~/components/FixedWIndow.vue"
import RoomPasswordWindow from "~/components/RoomPasswordWindow.vue"
import RoomTokenAttributesWindow from "~/components/RoomTokenAttributesWindow.vue"
import FloatingWindow from "~/components/FloatingWindow.vue";
import Initiative from "~/components/Initiative.vue";
import TokenConfig from "~/components/TokenConfig.vue";

definePageMeta({
  layout: 'dashboard',
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
        setRoom({ ...room.value, snapshot: data.snapshot })
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

const { zoom: sceneZoom, scale: stageScale, zoomIn, zoomOut, resetZoom, handleWheel } = useCanvasZoom()
const { image: bgImageObj, load: loadBgImage } = usePreloadedImage()
const { images: tokenImages, ensureLoaded: ensureTokenImageLoaded } = useImageMap()

const stageRef = ref(null)
const transformerRef = ref(null)
const selectedTokenId = ref<number | null>(null)

const initiativeList = ref<SceneInitiativeEntry[]>([])

const localTokens = ref<RoomToken[]>([])
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
}, { immediate: true, deep: true })

watchEffect(() => {
  loadBgImage(room.value?.sourceScene?.scenario?.image)
})

watch(localTokens, (newTokens) => {
  if (!newTokens) return
  newTokens.forEach(token => ensureTokenImageLoaded(token.id, token.image))
}, { immediate: true, deep: true })

const stageConfig = computed(() => ({
  width: sceneWidth.value,
  height: sceneHeight.value,
  scaleX: stageScale.value,
  scaleY: stageScale.value,
}))

const scene = computed(() => ({
  x: 0,
  y: 0,
  width: sceneWidth.value,
  height: sceneHeight.value,
  image: bgImageObj.value ?? undefined,
  id: 'scene',
}))

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

const tokenGroups = computed(() => {
  return [...localTokens.value].reverse().map(token => {
    const width = token.width || 100
    const height = token.height || 100
    const centerX = width / 2
    const centerY = height / 2
    const position = isGm.value ? token : (displayPositions[token.id] ?? token)

    return {
      id: token.id,

      groupConfig: {
        x: position.x,
        y: position.y,
        draggable: isGm.value,
        opacity: (token.opacity ?? 100) / 100,
      },

      imageConfig: {
        id: `token-${token.id}`,
        name: 'token-image',
        image: tokenImages[token.id] ?? undefined,
        x: centerX,
        y: centerY,
        width,
        height,
        offsetX: centerX,
        offsetY: centerY,
        scaleX: token.scaleX ?? 1,
        scaleY: token.scaleY ?? 1,
        rotation: token.rotation || 0,
      },
    }
  })
})

watch(selectedTokenId, async (newId) => {
  if (!isGm.value || !transformerRef.value) return
  await nextTick()
  const transformerNode = transformerRef.value.getNode()

  if (!newId) {
    transformerNode.nodes([])
    return
  }

  const stageNode = stageRef.value.getNode()
  const selectedNode = stageNode?.findOne(`#token-${newId}`)
  if (selectedNode) {
    transformerNode.nodes([selectedNode])
  }
})

const handleStageClick = (e: any) => {
  if (e.target === e.target.getStage() || e.target.attrs.id === 'scene') {
    selectToken(null)
  }
}

const {
  handleTransformEnd,
  handleDragEnd,
  hFlipToken: flipTokenHorizontally,
  vFlipToken: flipTokenVertically,
  resetTokenRotation: resetSelectedTokenRotation,
} = useTokenTransform(localTokens, stageRef, transformerRef)

const hFlipToken = () => selectedTokenId.value && flipTokenHorizontally(selectedTokenId.value)
const vFlipToken = () => selectedTokenId.value && flipTokenVertically(selectedTokenId.value)
const resetTokenRotation = () => selectedTokenId.value && resetSelectedTokenRotation(selectedTokenId.value)

const duplicateToken = () => {
  const token = selectedToken.value
  if (!token) return
  const newToken = { ...token, id: Date.now(), x: token.x + 10, y: token.y + 10 }
  localTokens.value.unshift(newToken)
  selectToken(newToken.id)
  ensureTokenImageLoaded(newToken.id, newToken.image)
}

const menuState = reactive({ show: false, x: 0, y: 0 })

const openMenu = (e: any) => {
  if (!isGm.value) return
  const event = e.evt
  event.preventDefault()
  menuState.x = event.clientX
  menuState.y = event.clientY
  menuState.show = true
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

async function saveRoomSnapshot() {
  if (!room.value) return
  try {
    const response = await fetch(`/api/v1/rooms/${room.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot: buildSnapshotPayload() }),
    })
    if (response.ok) {
      setRoom({ ...(await response.json()), role: 'gm' })
    } else {
      console.error('Erro ao salvar a sala.')
    }
  } catch (error) {
    console.error('Erro ao salvar a sala:', error)
  }
}

const isDeleteTokenAlertOpen = ref(false)
const handleDeleteTokenAlertWindow = () => { isDeleteTokenAlertOpen.value = true }
const closeDeleteAlert = () => { isDeleteTokenAlertOpen.value = false }

const handleDeleteToken = () => {
  if (!selectedTokenId.value) return

  const tokenId = selectedTokenId.value
  const index = localTokens.value.findIndex(t => t.id === tokenId)
  if (index === -1) return

  localTokens.value.splice(index, 1)
  selectedTokenId.value = null

  if (transformerRef.value) {
    transformerRef.value.getNode().nodes([])
  }

  if (isTokenConfigWindowOpen) {
    isTokenConfigWindowOpen.value = false
  }
  isDeleteTokenAlertOpen.value = false
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

const isTokenPickerOpen = ref(false)
const isTokenAttributesWindowOpen = ref(false)
const isDiceRollerWindowOpen = ref(false)
const pendingToken = ref<any>(null)

function onTokenPicked(token: any) {
  if (!token) return
  pendingToken.value = token
  isTokenPickerOpen.value = false
  isTokenAttributesWindowOpen.value = true
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

const isSceneWindowOpen = ref(false)

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
  } finally {
    isSceneWindowOpen.value = false
  }
}

// ==========================================
// AÇÕES DO MENU / ATALHOS
// ==========================================

const { register, unregister, setMenuBarVisible, setStatusText } = useMenuActions()

register('salvar', async () => {
  if (isGm.value) await saveRoomSnapshot()
})

register('novo-token', () => {
  if (isGm.value) isTokenPickerOpen.value = true
})

// Visitantes não têm ações de menu disponíveis nesta página — a menubar só
// faz sentido para o dono da sala (GM).
watchEffect(() => {
  setMenuBarVisible(isGm.value)
})

// Mostra o estado da sala (aberta/fechada) na status bar do layout no lugar do "Dashboard" padrão.
watchEffect(() => {
  setStatusText(room.value ? `Sala ${room.value.isOpen ? 'Aberta' : 'Fechada'}` : 'Dashboard')
})

onUnmounted(() => {
  unregister('salvar')
  unregister('novo-token')
  setMenuBarVisible(true)
  setStatusText('Dashboard')
})

// ==========================================
// ABRIR / FECHAR SALA (somente GM)
// ==========================================

const isToggleRoomOpenAlertOpen = ref(false)
const openToggleRoomOpenAlert = () => { isToggleRoomOpenAlertOpen.value = true }
const closeToggleRoomOpenAlert = () => { isToggleRoomOpenAlertOpen.value = false }

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
  } finally {
    isToggleRoomOpenAlertOpen.value = false
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (!isGm.value) return

  const activeElement = document.activeElement as HTMLElement | null
  const isInputFocused = activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)
  if (isInputFocused) return

  if (e.key === 'Delete') {
    e.preventDefault()
    handleDeleteTokenAlertWindow()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})


function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    }
  }
}
</script>

<template>
  <template v-if="room">
    <ContextMenu
        :show="menuState.show"
        :x="menuState.x"
        :y="menuState.y"
        @close="menuState.show = false"
    >
      <li @click="duplicateToken">Duplicar Token</li>
      <li @click="hFlipToken">Inverter Horizontalmente</li>
      <li @click="vFlipToken">Inverter Verticalmente</li>
      <li @click="resetTokenRotation()">Restaurar Rotação</li>
      <li @click="handleDeleteTokenAlertWindow()">Remover Token</li>
    </ContextMenu>

    <fixed-window
        title="Tokens"
        icon="tokens"
        v-if="isTokenPickerOpen"
        @close-window="isTokenPickerOpen = false"
    >
      <tokens-window
          add-token-to-scene="true"
          add-button-label="Adicionar à sala"
          @addTokenToScene="onTokenPicked"
          @close-window="isTokenPickerOpen = false"
      />
    </fixed-window>

    <RoomTokenAttributesWindow
        v-if="isTokenAttributesWindowOpen && pendingToken"
        :token="pendingToken"
        @confirm="onTokenAttributesConfirmed"
        @close-window="closeTokenAttributesWindow"
    />

    <fixed-window
        title="Cenas"
        icon="scenes"
        v-if="isSceneWindowOpen"
        @close-window="isSceneWindowOpen = false"
    >
      <scenes-window
          select-scene-for-room="true"
          @selectSceneForRoom="changeRoomScene"
          @close-window="isSceneWindowOpen = false"
      />
    </fixed-window>
    <floating-window
        title="Rolador de dados"
        icon="dices/d20"
        v-if="isDiceRollerWindowOpen"
        @close-window="isDiceRollerWindowOpen = false"
    >
      <dice-roller />
    </floating-window>
    <floating-window
        title="Iniciativa"
        icon="initiative"
        v-if="isInitiativeWindowOpen"
        @close-window="isInitiativeWindowOpen = false"
    >
      <initiative v-model:initiative-list="initiativeList" />
    </floating-window>
    <floating-window
        title="Configurações do Token"
        icon="objects"
        v-if="isTokenConfigWindowOpen"
        @close-window="isTokenConfigWindowOpen = false"
    >
      <token-config
          style="max-width: 30rem"
          :token="selectedToken"
          @delete-token="handleDeleteToken"
      />
    </floating-window>
    <alert-window
        v-if="isDeleteTokenAlertOpen"
        icon="warning"
        title="Apagar Token"
        @alert-button-OK="handleDeleteToken"
        :cancelAction="closeDeleteAlert"
    >
      Tem certeza que quer apagar este token?
    </alert-window>

    <alert-window
        v-if="isToggleRoomOpenAlertOpen"
        :icon="room.isOpen ? 'restrict' : 'success'"
        :title="room.isOpen ? 'Fechar Sala' : 'Abrir Sala'"
        @alert-button-OK="confirmToggleRoomOpen"
        :cancelAction="closeToggleRoomOpenAlert"
    >
      Tem certeza que quer {{ room.isOpen ? 'fechar' : 'abrir' }} a sala? {{ room.isOpen ? 'Visitantes não conseguirão mais entrar até que ela seja reaberta.' : 'Visitantes poderão entrar novamente.' }}
    </alert-window>

    <Teleport to="#button-bar" v-if="isGm">
      <button class="dice-selector-button">
        <Icon size="sm" style="padding: 4px; box-sizing: border-box" name="Token" icon="tokens" @click="isTokenPickerOpen = true"/>
      </button>
      <button class="dice-selector-button">
        <Icon size="sm" style="padding: 4px; box-sizing: border-box" name="Cena" icon="scenes" @click="isSceneWindowOpen = true"/>
      </button>
      <button class="dice-selector-button">
        <Icon size="sm" style="padding: 4px; box-sizing: border-box" name="Salvar" icon="save" @click="saveRoomSnapshot"/>
      </button>
      <button class="dice-selector-button">
        <Icon size="sm" style="padding: 4px; box-sizing: border-box" name="Dados" icon="dices/d20" @click="isDiceRollerWindowOpen = true"/>
      </button>
      <button class="dice-selector-button">
        <Icon size="sm" style="padding: 4px; box-sizing: border-box" name="Iniciativa" icon="initiative" @click="isInitiativeWindowOpen = true"/>
      </button>
      <button class="dice-selector-button">
        <Icon
            size="sm"
            style="padding: 4px; box-sizing: border-box"
            :name="room.isOpen ? 'Fechar Sala' : 'Abrir Sala'"
            :icon="room.isOpen ? 'success' : 'restrict'"
            @click="openToggleRoomOpenAlert"
        />
      </button>
    </Teleport>

    <div class="scene-canvas">
      <v-stage
          ref="stageRef"
          :config="stageConfig"
          style="display: block;background-color: #808080"
          @click="handleStageClick"
          @tap="handleStageClick"
          @wheel="handleWheel"
      >
        <v-layer>
          <v-image :config="scene" id="scene"/>
        </v-layer>
        <v-layer>
          <v-group
              v-for="tokenGroup in tokenGroups"
              :key="tokenGroup.id"
              :config="tokenGroup.groupConfig"
              @mousedown="selectToken(tokenGroup.id)"
              @touchstart="selectToken(tokenGroup.id)"
              @dragend="(e) => handleDragEnd(e, tokenGroup.id)"
              @contextmenu="openMenu"
              @dblclick="isTokenConfigWindowOpen = true"
          >
            <v-image
                :config="tokenGroup.imageConfig"
                @transformend="(e) => handleTransformEnd(e, tokenGroup.id)"
            />
          </v-group>

          <v-transformer
              v-if="isGm"
              ref="transformerRef"
              :config="{
                keepRatio: true,
                enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
              }"
          />
        </v-layer>
      </v-stage>
    </div>

    <teleport to="#footer-menu">
      <div class="scene-footer">
        <div class="zoom-control-container">
          <div class="field-row">
            <label for="zoom">Zoom:</label>
            <input type="text" id="zoom" v-model.number="sceneZoom" class="scene-zoom-input"/>
            <span style="margin-right: 4px;">%</span>
            <button @click="zoomOut">-</button>
            <button @click="zoomIn">+</button>
            <button @click="resetZoom">Restaurar</button>
          </div>
        </div>
        <hr class="footer-separator"/>
        <div class="extra-buttons">
          <button @click="toggleFullScreen">Tela Cheia</button>
        </div>
      </div>
    </teleport>
  </template>
  <RoomPasswordWindow
      v-else-if="isPasswordWindowOpen"
      :error="passwordError"
      @submit="loadRoom"
  />
  <p v-else-if="loadError" style="padding: 1rem;">{{ loadError }}</p>
  <p v-else style="padding: 1rem;">Carregando sala...</p>
</template>

<style lang="css" scoped>
.scene-canvas {
  background-color: #808080;
  width: 100%;
  height: 100%;
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
