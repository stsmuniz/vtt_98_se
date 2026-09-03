<template>
  <ClientOnly>
    <div class="window"
         v-if="isInitiativeWindowOpen"
         :style="{
                width: '300px',
                position: 'absolute',
                zIndex: 1000,
                left: `${initiativeWindowPosition.x}px`,
                top: `${initiativeWindowPosition.y}px`,
            }"
    >
      <div class="title-bar" style="cursor: move;" @pointerdown.stop.prevent="onInitiativePointerDown">
        <div class="title-bar-text">Iniciativa</div>
        <div class="title-bar-controls">
          <button aria-label="Close" @click="closeInitiativeWindow"></button>
        </div>
      </div>
      <div class="window-body">
        <div class="sunken-panel" style="max-height: 150px;">
          <table class="interactive" style="width: 100%;" id="initiative-table">
            <thead>
            <tr>
              <th style="width: 80%;">Nome</th>
              <th style="width: 10%;">Valor</th>
              <th style="width: 10%;">Ações</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(entry, index) in initiative" :key="entry.tokenId" :id="`initiative-${entry.tokenId}`">
              <td>{{ entry.name }}</td>
              <td style="padding: 0;">
                <input
                    :id="`initiative-value-${entry.tokenId}`"
                    type="text"
                    size="4"
                    v-model="entry.value"
                />
              </td>
              <td style="padding: 0; display:flex; gap:4px; justify-content:center;">
                <button
                    @click.prevent="initiativeUp(index)"
                    :disabled="index === 0"
                    style="font-family: Webdings; min-width: 16px;"
                >5
                </button>
                <button
                    @click.prevent="initiativeDown(index)"
                    :disabled="index === initiative.length - 1"
                    style="font-family: Webdings; min-width: 16px;"
                >6
                </button>
                <button
                    @click.prevent="initiativeRemove(index)"
                    style="font-family: Webdings; min-width: 16px;"
                >r
                </button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <dialog ref="helpDialogEl" class="window" style="border: 0;">
      <div class="title-bar">
        <div class="title-bar-text">Sobre VTT 98 SE</div>
        <div class="title-bar-controls">
          <button aria-label="Close" @click="closeHelpDialog"></button>
        </div>
      </div>
      <div class="window-body">
        <div style="display: flex; flex-direction: row;">
          <div style="padding-right: 16px">
            <img src="/assets/icons/desktop.png"/>
          </div>
          <div>
            <p>STSMUNIZ's VTT 98 SE</p>
            <p>VTT 98 Second Edition</p>
            <p>Copyright (?) 2026 STSMUNIZ</p>
            <p>Criado por <a href="https://github.com/stsmuniz" target="_blank">stsmuniz</a></p>
          </div>
        </div>
      </div>
      <div class="window-footer" style="text-align: right; padding: 8px;">
        <button @click="closeHelpDialog">OK</button>
      </div>
    </dialog>
    <dialog ref="dialogEl" class="window" style="border: 0;">
      <div class="title-bar">
        <div class="title-bar-text">Opções do Token</div>
        <div class="title-bar-controls">
          <button aria-label="Close" @click="closeDialog"></button>
        </div>
      </div>
      <div class="window-body">
        <p id="tokenName">{{ dialogName }}</p>
        <div class="field-row">
          <label for="currentHp">PVs: {{ dialogHp }}</label>
          <input type="range" id="currentHpRange" v-model.number="dialogHp" min="0" max="40"/>
        </div>
        <div class="field-row">
          <label for="currentEp">EPs: {{ dialogEp }}</label>
          <input type="range" id="currentEpRange" v-model.number="dialogEp" min="0" max="40"/>
        </div>
        <div class="field-row">
          <label for="status">Status: </label>
          <select id="status" v-model="dialogStatus">
            <option value="normal">Normal</option>
            <option value="machucado">Machucado</option>
            <option value="morrendo">Morrendo</option>
          </select>
        </div>
        <div class="field-row">
          <input type="checkbox" v-model="dialogShowAttributes" id="show-attributes"/>
          <label for="show-attributes"> Mostrar atributos do token</label>
        </div>
        <div class="field-row">
          <label for="scaleRange">Tamanho: </label>
          <input id="scaleRange" type="range" v-model.number="dialogScale" min="0.2" max="3" step="0.05"/>
          <span style="margin-left:8px;">{{ dialogScale.toFixed(2) }}×</span>
        </div>
        <div class="field-row">
          <button @click="saveDialog">Salvar</button>
          <button @click="closeDialog">Cancelar</button>
          <button @click="removeTokenFromDialog"
                  style="padding:6px 10px; border-radius:4px; background:#e44; color:#fff; border:none;">Remover token
          </button>
        </div>
      </div>
    </dialog>
    <dialog ref="sceneDialogEl" class="window" style="border: 0;">
      <div class="title-bar">
        <div class="title-bar-text">Opções de Cena</div>
        <div class="title-bar-controls">
          <button aria-label="Close" @click="closeSceneDialog"></button>
        </div>
      </div>
      <div class="window-body">
        <ul style="list-style:none; padding:0; margin:0 0 12px 0; max-height:300px; overflow:auto;">
          <li v-for="s in scenes" :key="s.id" style="margin-bottom:8px; display:flex; align-items:center; gap:8px;">
            <img :src="s.image" alt="" style="width:120px; height:64px; object-fit:cover; border-radius:4px;"/>
            <div style="flex:1">
              <div style="font-weight:600">{{ s.name }}</div>
              <div>{{ s.width }}×{{ s.height }}</div>
            </div>
            <button @click.prevent="selectScene(s)"
                    style="padding:6px 10px; border-radius:4px; background:#0b7; color:#012; border:none; cursor:pointer;">
              Selecionar
            </button>
          </li>
        </ul>
        <div class="window-footer" style="text-align: right;">
          <button @click="closeSceneDialog">OK</button>
        </div>
      </div>
    </dialog>
    <!-- Diálogo de tokens (listar e remover) -->
    <dialog ref="tokenListDialogEl" class="window" style="border: 0;">
      <div class="title-bar">
        <div class="title-bar-text">Opções de Tokens</div>
        <div class="title-bar-controls">
          <button aria-label="Close" @click="closeTokensDialog"></button>
        </div>
      </div>
      <div class="window-body">
        <p style="font-weight: bold;">Tokens na cena</p>
        <div class="field-border" style="padding: 0; padding-left: 8px;">
          <ul style="list-style:none; padding:0; margin:0 0 12px 0; max-height:300px; overflow:auto;">
            <li v-for="t in tokens" :key="t.id"
                style="display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid #333;">
              <img :src="t.image" alt=""
                   style="width:60px; height:90px; object-fit:contain; border-radius:4px; background:#000;"/>
              <div style="flex:1">
                <div style="font-weight:600">{{ t.name }}</div>
                <div>x: {{ Math.round(t.x) }}, y: {{ Math.round(t.y) }}</div>
                <div>Atributos: {{ t.showAttributes ? 'visíveis' : 'ocultos' }}</div>
              </div>
              <button @click.prevent="toggleTokenAttributes(t.id)"
                      style="padding:6px 10px; border-radius:4px; background:#0b7; color:#012; border:none; cursor:pointer;">
                {{ t.showAttributes ? 'Esconder' : 'Mostrar' }}
              </button>
              <button @click.prevent="removeToken(t.id)"
                      style="padding:6px 10px; border-radius:4px; background:#e44; color:#fff; border:none; cursor:pointer;">
                Remover
              </button>
            </li>
          </ul>
        </div>
        <div class="window-footer" style="display:flex; gap:8px; justify-content: space-between;">
          <button @click="openAddTokenDialog" style="padding:6px 10px;">Adicionar token</button>
          <button @click="closeTokensDialog">Fechar</button>
        </div>
      </div>
    </dialog>

    <!-- Diálogo de adicionar token -->
    <dialog ref="addTokenDialogEl" class="window" style="border: 0;">
      <div class="title-bar">
        <div class="title-bar-text">Adicionar Token</div>
        <div class="title-bar-controls">
          <button aria-label="Close" @click="closeAddTokenDialog"></button>
        </div>
      </div>
      <div class="window-body">
        <p style="font-weight: bold;">Adicionar token</p>
        <ul style="list-style:none; padding:0; margin:0 0 12px 0; display:grid; grid-template-columns:repeat(3,1fr); gap:8px;">
          <li v-for="p in availableTokens" :key="p.id"
              style="display:flex; flex-direction:column; align-items:center; gap:6px; padding:6px; background:#111; border-radius:6px;">
            <img :src="p.image" alt=""
                 style="width:100%; height:80px; object-fit:contain; background:#000; border-radius:4px;"/>
            <div style="color:#fff">{{ p.name }}</div>
            <button @click.prevent="addToken(p)"
                    style="padding:6px 8px; border-radius:4px; background:#0b7; color:#012; border:none; cursor:pointer;">
              Adicionar
            </button>
          </li>
        </ul>
        <p style="margin-top:8px;">
          <button @click="closeAddTokenDialog">Fechar</button>
        </p>
      </div>
    </dialog>
    <div class="window main">
      <div class="title-bar">
        <div class="title-bar-text" style="display: flex; justify-content: center; align-items: center;"><img
            src="/assets/icons/desktop_mini.png" style="padding-right: 4px;"/> VTT Prototype 98 SE
        </div>
        <div class="title-bar-controls">
          <button aria-label="Close"></button>
        </div>
      </div>
      <nav>
        <div style="display: flex;">
          <button
              style="width: 4px; min-width: 1px; padding: 0; margin-left: 2px; margin-top: 2px; margin-right: 6px; display: inline; height: 30px;"></button>
          <ul class="menu-bar">
            <li><a aria-label="Arquivo">Arquivo</a></li>
            <li><a aria-label="Ajuda" @click.prevent="openAboutDialog" href="#"><span
                style="text-decoration: underline;">A</span>juda</a></li>
            <li><a aria-label="Ajuda" href="/error-page">Erro</a></li>
          </ul>
        </div>
        <hr/>
      </nav>
      <nav>
        <div style="display: flex;">
          <button
              style="width: 4px; min-width: 1px; padding: 0; margin-left: 2px; margin-top: 2px; margin-right: 6px; display: inline; height: 64px;"></button>
          <ul class="menu-bar icons">
            <li>
              <a aria-label="Cenas" @click.prevent="openSceneDialog" href="#">
                <img src="/assets/icons/scenes.png" width="32px"/>
                <span><span style="text-decoration: underline;">C</span>enas</span>
              </a>
            </li>
            <li>
              <a aria-label="Tokens" @click.prevent="openTokensDialog" href="#">
                <img src="/assets/icons/tokens.png" width="32px"/>
                <span><span style="text-decoration: underline;">T</span>okens</span>
              </a>
            </li>
            <li>
              <a aria-label="Iniciativa" @click.prevent="openInitiativeWindow" href="#">
                <img src="/assets/icons/initiative.png" width="32px"/>
                <span><span style="text-decoration: underline;">I</span>niciativa</span>
              </a>
            </li>
            <li>
              <a aria-label="Ajuda" @click.prevent="openAboutDialog" href="#">
                <img src="/assets/icons/help.png" width="32px"/>
                <span><span style="text-decoration: underline;">A</span>juda</span>
              </a>
            </li>
          </ul>
        </div>
      </nav>
      <div class="window-body">
        <div class="field-border">
          <v-stage ref="stageRef" :config="stageConfig" style="display: block;">
            <v-layer>
              <v-image :config="scene" id="scene"/>
            </v-layer>
            <v-layer>
              <v-group
                  v-for="tokenGroup in tokenGroups"
                  :key="tokenGroup.id"
                  :config="tokenGroup.groupConfig"
                  @dblclick="openDialog(tokenGroup.id)"
                  @dragstart="onTokenDragStart($event, tokenGroup.id)"
                  @dragend="onTokenDragEnd($event, tokenGroup.id)"
              >
                <v-image :config="tokenGroup.imageConfig"/>
                <v-image :config="tokenGroup.nameBgConfig"/>
                <v-text :config="tokenGroup.nameConfig"/>
                <template v-if="tokenGroup.showAttributes">
                  <v-rect :config="tokenGroup.hpContainerConfig"/>
                  <v-rect :config="tokenGroup.hpBarConfig"/>
                  <v-text :config="tokenGroup.hpTextConfig"/>
                  <v-rect v-if="tokenGroup.hasEp" :config="tokenGroup.epContainerConfig"/>
                  <v-rect v-if="tokenGroup.hasEp" :config="tokenGroup.epBarConfig"/>
                  <v-text v-if="tokenGroup.hasEp" :config="tokenGroup.epTextConfig"/>
                  <v-text :config="tokenGroup.statusTextConfig"/>
                </template>
              </v-group>
            </v-layer>
          </v-stage>
        </div>
      </div>
      <div class="status-bar">
        <p class="status-bar-field">Press F1 for help</p>
        <p class="status-bar-field">Scene: {{ currentScene.name }}</p>
        <p class="status-bar-field">CPU Usage: 14%</p>
      </div>
    </div>
  </ClientOnly>
</template>
<script setup lang="ts">
import {
  Stage as VStage,
  Layer as VLayer,
  Rect as VRect,
  Image as VImage,
  Text as VText,
  Group as VGroup
} from 'vue-konva'

const isHelpDialogOpen = ref(false)
const isInitiativeWindowOpen = ref(false)
const initiativeWindowPosition = ref({x: 0, y: 0})
const isInitiativeDragging = ref(false)
const initiativeDragOffset = ref({x: 0, y: 0})

const onInitiativePointerMove = (event: PointerEvent) => {
  if (!isInitiativeDragging.value) return
  initiativeWindowPosition.value.x = Math.max(0, event.clientX - initiativeDragOffset.value.x)
  initiativeWindowPosition.value.y = Math.max(0, event.clientY - initiativeDragOffset.value.y)
}

const onInitiativePointerUp = () => {
  isInitiativeDragging.value = false
  window.removeEventListener('pointermove', onInitiativePointerMove)
  window.removeEventListener('pointerup', onInitiativePointerUp)
}

const onInitiativePointerDown = (event: PointerEvent) => {
  if (event.button !== 0) return
  isInitiativeDragging.value = true
  initiativeDragOffset.value = {
    x: event.clientX - initiativeWindowPosition.value.x,
    y: event.clientY - initiativeWindowPosition.value.y,
  }
  window.addEventListener('pointermove', onInitiativePointerMove)
  window.addEventListener('pointerup', onInitiativePointerUp)
}

const openInitiativeWindow = () => {
  nextTick(() => {
    if (initiativeWindowPosition.value.x === 0 && initiativeWindowPosition.value.y === 0 && typeof window !== 'undefined') {
      initiativeWindowPosition.value.x = Math.max(8, window.innerWidth - 320)
      initiativeWindowPosition.value.y = Math.max(8, Math.round(window.innerHeight * 0.08))
    }
    isInitiativeWindowOpen.value = true
  })
}

const closeInitiativeWindow = () => {
  nextTick(() => isInitiativeWindowOpen.value = false)
}

const handleF1 = (event) => {
  if (event.key === 'F1') {
    event.preventDefault();
    openAboutDialog()
  }

  if (event.altKey && event.key.toLowerCase() === 'c') {
    openSceneDialog()
  }

  if (event.altKey && event.key.toLowerCase() === 't') {
    openTokensDialog()
  }

  if (event.altKey && event.key.toLowerCase() === 'a') {
    openAboutDialog()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleF1)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleF1)
  window.removeEventListener('pointermove', onInitiativePointerMove)
  window.removeEventListener('pointerup', onInitiativePointerUp)
})

const bgImage = ref<HTMLImageElement | null>(null)
const nameBgImage = ref<HTMLImageElement | null>(null)
const tokenImages = reactive<Record<number, HTMLImageElement | null>>({})

const SESSION_STATE_KEY = 'vtt-rpg-room-state'

const isDialogOpen = ref(false)

//tokenDialog
const dialogEl = ref<HTMLDialogElement | null>(null)

//helpDialogEl
const helpDialogEl = ref<HTMLDialogElement | null>(null)

// Scene dialog ref and current scene
const sceneDialogEl = ref<HTMLDialogElement | null>(null)
const currentScene = ref<any | null>(null)

const loadSceneImage = (s: any) => {
  const bg = new Image()
  bg.src = s.image
  bg.onload = () => {
    bgImage.value = bg
  }
}

const openSceneDialog = () => {
  nextTick(() => sceneDialogEl.value?.showModal?.())
}

const openAboutDialog = () => {
  nextTick(() => helpDialogEl.value?.showModal?.())
}

const closeSceneDialog = () => {
  sceneDialogEl.value?.close?.()
}

const selectScene = (s: any) => {
  currentScene.value = s
  loadSceneImage(s)
  saveSessionState()
  closeSceneDialog()
}

// Tokens dialog controls
const tokenListDialogEl = ref<HTMLDialogElement | null>(null)
const addTokenDialogEl = ref<HTMLDialogElement | null>(null)

const openTokensDialog = () => {
  nextTick(() => tokenListDialogEl.value?.showModal?.())
}

const closeTokensDialog = () => {
  tokenListDialogEl.value?.close?.()
}

const openAddTokenDialog = () => {
  nextTick(() => addTokenDialogEl.value?.showModal?.())
}

const closeAddTokenDialog = () => {
  addTokenDialogEl.value?.close?.()
}

// Available prototypes to add
const {data: availableTokens} = await useFetch('/api/v1/tokens')

type InitiativeState = {
  name: string
  tokenId: number
  value: string
}

const initiative = reactive<InitiativeState[]>([])

const getTokenBaseName = (name: string) => {
  const match = name.match(/^(.*) #\d+$/)
  return match ? match[1] : name
}

const updateDuplicateNamesForAll = () => {
  const groups = tokens.reduce<Record<string, TokenState[]>>((acc, token) => {
    const baseName = token.baseName ?? getTokenBaseName(token.name)
    token.baseName = baseName
    if (!acc[baseName]) acc[baseName] = []
    acc[baseName].push(token)
    return acc
  }, {})

  Object.keys(groups).forEach((baseName) => {
    const group = groups[baseName]
    if (group.length > 1) {
      group.forEach((token, index) => {
        token.name = `${baseName} #${index + 1}`
      })
    } else {
      group[0].name = baseName
    }
  })
}

const refreshInitiativeNamesFromTokens = () => {
  initiative.forEach((entry) => {
    const token = tokens.find((t) => t.id === entry.tokenId)
    if (token) {
      entry.name = token.name
    }
  })
}

const createInitiativeFromTokens = () => {
  initiative.splice(0, initiative.length, ...tokens.map((token) => ({
    name: token.name,
    tokenId: token.id,
    value: '',
  })))
}

const addTokenToInitiative = (token: TokenState) => {
  if (!initiative.some((entry) => entry.tokenId === token.id)) {
    initiative.push({
      name: token.name,
      tokenId: token.id,
      value: '',
    })
  }
}

const removeInitiativeForTokenId = (tokenId: number) => {
  const idx = initiative.findIndex((entry) => entry.tokenId === tokenId)
  if (idx !== -1) initiative.splice(idx, 1)
}

const initiativeUp = (index: number) => {
  if (index <= 0 || index >= initiative.length) return
  const [entry] = initiative.splice(index, 1)
  initiative.splice(index - 1, 0, entry)
  saveSessionState()
}

const initiativeDown = (index: number) => {
  if (index < 0 || index >= initiative.length - 1) return
  const [entry] = initiative.splice(index, 1)
  initiative.splice(index + 1, 0, entry)
  saveSessionState()
}

const initiativeRemove = (index: number) => {
  if (index < 0 || index >= initiative.length) return
  initiative.splice(index, 1)
  saveSessionState()
}

const saveSessionState = () => {
  if (typeof window === 'undefined') return

  const payload = {
    sceneId: currentScene.value?.id ?? null,
    tokens: tokens.map((token) => ({...token})),
    initiative: initiative.map((entry) => ({...entry})),
  }

  window.sessionStorage.setItem(SESSION_STATE_KEY, JSON.stringify(payload))
}

const restoreSessionState = () => {
  if (typeof window === 'undefined') return null

  const raw = window.sessionStorage.getItem(SESSION_STATE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)

    if (parsed?.sceneId) {
      const restoredScene = scenes.find((scene) => scene.id === parsed.sceneId)
      if (restoredScene) {
        currentScene.value = restoredScene
      }
    }

    if (Array.isArray(parsed?.tokens)) {
      tokens.splice(0, tokens.length, ...parsed.tokens.map((token: TokenState) => ({
        ...token,
        showAttributes: token.showAttributes ?? false,
        visibility: token.visibility ?? {hp: 'full', name: 'full'},
        baseName: token.baseName ?? getTokenBaseName(token.name),
      })))
    }

    updateDuplicateNamesForAll()

    if (Array.isArray(parsed?.initiative)) {
      initiative.splice(0, initiative.length, ...parsed.initiative
          .filter((entry: any) => tokens.some((t) => t.id === entry.tokenId))
          .map((entry: any) => ({
            name: entry.name,
            tokenId: entry.tokenId,
            value: entry.value ?? '',
          }))
      )
    } else {
      createInitiativeFromTokens()
    }

    refreshInitiativeNamesFromTokens()

    return parsed
  } catch (error) {
    return null
  }
}

const removeToken = (id: number) => {
  const idx = tokens.findIndex((t) => t.id === id)
  if (idx !== -1) {
    tokens.splice(idx, 1)
    removeInitiativeForTokenId(id)
    updateDuplicateNamesForAll()
    refreshInitiativeNamesFromTokens()
    saveSessionState()
  }
}

const toggleTokenAttributes = (id: number) => {
  const token = tokens.find((t) => t.id === id)
  if (!token) return
  token.showAttributes = !token.showAttributes
  saveSessionState()
}

const closeDialog = () => {
  isDialogOpen.value = false
  dialogEl.value?.close?.()
  selectedTokenId.value = null
}


const closeHelpDialog = () => {
  isDialogOpen.value = false
  helpDialogEl.value?.close?.()
}

const removeTokenFromDialog = () => {
  if (selectedTokenId.value === null) return
  const id = selectedTokenId.value
  if (!confirm('Remover token selecionado?')) return
  removeToken(id)
  // cleanup image cache
  try {
    delete tokenImages[id]
  } catch (e) {
  }
  closeDialog()
}

const addToken = (proto: any) => {
  const maxId = tokens.reduce((m, t) => Math.max(m, t.id), 0)
  const newId = maxId + 1
  const stageW = currentScene.value?.width ?? 1920
  const stageH = currentScene.value?.height ?? 1084
  const groupWidth = proto.width ?? 200
  const groupHeight = proto.height ?? 300
  const x = Math.round(stageW / 2 - groupWidth / 2)
  const y = Math.round(stageH / 2 - groupHeight / 2)
  const baseName = proto.name

  const newToken: TokenState = {
    id: newId,
    baseName,
    name: baseName,
    image: proto.image,
    x,
    y,
    status: 'normal',
    hp: 40,
    ep: 40,
    visibility: {hp: 'full', name: 'full'},
    showAttributes: false,
    scale: 1,
    width: proto.width ?? 200,
    height: proto.height ?? 300,
  }
  tokens.push(newToken)
  updateDuplicateNamesForAll()
  refreshInitiativeNamesFromTokens()
  addTokenToInitiative(newToken)
  saveSessionState()

  // preload image
  const img = new Image()
  img.src = newToken.image
  img.onload = () => {
    tokenImages[newId] = img
  }

  closeAddTokenDialog()
}

const selectedTokenId = ref<number | null>(null)
const dialogHp = ref<number | null>(null)
const dialogEp = ref<number | null>(null)
const dialogStatus = ref<TokenStatus>('normal')
const dialogName = ref<string>('')
const dialogShowAttributes = ref<boolean>(true)
const dialogScale = ref<number>(1)

const isDragging = ref(false)
const lastDragAt = ref(0)

// Stage ref to control stage dragging while tokens are dragged
const stageRef = ref<any | null>(null)

const bringTokenToFront = (id: number) => {
  const idx = tokens.findIndex((t) => t.id === id)
  if (idx === -1 || idx === tokens.length - 1) return
  const [token] = tokens.splice(idx, 1)
  tokens.push(token)
}

const onTokenDragStart = (e: any, id: number) => {
  bringTokenToFront(id)
  isDragging.value = true
  const stageNode = stageRef.value?.getNode?.() ?? stageRef.value?.getStage?.()
  if (stageNode) {
    try {
      if (typeof stageNode.draggable === 'function') stageNode.draggable(false)
      else stageNode.draggable = false
    } catch (err) {
      // ignore
    }
  }
}

const onTokenDragEnd = (e: any, id: number) => {
  isDragging.value = false
  lastDragAt.value = Date.now()
  const stageNode = stageRef.value?.getNode?.() ?? stageRef.value?.getStage?.()
  if (stageNode) {
    try {
      if (typeof stageNode.draggable === 'function') stageNode.draggable(true)
      else stageNode.draggable = true
    } catch (err) {
      // ignore
    }
  }

  const node = e.target || e.currentTarget
  const x = node?.x?.() ?? node?.x ?? 0
  const y = node?.y?.() ?? node?.y ?? 0
  const token = tokens.find((t) => t.id === id)
  if (token) {
    token.x = x
    token.y = y
    saveSessionState()
  }
}

const openDialog = (id: number) => {
  // ignore clicks that happen right after a drag
  if (isDragging.value) return
  if (Date.now() - lastDragAt.value < 200) return

  const token = tokens.find((t) => t.id === id)
  if (!token) return
  selectedTokenId.value = id
  dialogName.value = token.name
  dialogHp.value = token.hp
  dialogEp.value = token.ep ?? null
  dialogStatus.value = token.status
  dialogShowAttributes.value = token.showAttributes ?? false
  dialogScale.value = token.scale
  isDialogOpen.value = true
  nextTick(() => {
    dialogEl.value?.showModal?.()
  })
}

const saveDialog = () => {
  if (selectedTokenId.value === null) return
  const token = tokens.find((t) => t.id === selectedTokenId.value)
  if (!token) return
  if (dialogHp.value !== null) token.hp = Math.max(0, Math.min(40, dialogHp.value))
  if (token.ep !== undefined && dialogEp.value !== null) token.ep = Math.max(0, Math.min(40, dialogEp.value))
  token.status = dialogStatus.value
  token.showAttributes = dialogShowAttributes.value
  if ((dialogScale.value ?? null) !== null) token.scale = Math.max(0.2, Math.min(3, dialogScale.value))
  saveSessionState()
  closeDialog()
}

type TokenStatus = 'normal' | 'machucado' | 'morrendo'

type TokenState = {
  id: number
  name: string
  image: string
  x: number
  y: number
  status: TokenStatus
  hp: number
  ep?: number
  baseName?: string
  visibility: {
    hp: 'full' | 'status' | 'hidden'
    name: 'full' | 'hidden'
  }
  showAttributes: boolean
  scale: number
  width: number
  height: number
}

const tokens = reactive<TokenState[]>([])

const {data: scenes} = await useFetch('/api/v1/scenarios')

onMounted(() => {
  // initialize current scene after `scenes` is available
  restoreSessionState()

  if (!currentScene.value) {
    currentScene.value = scenes.value[0]
  }

  loadSceneImage(currentScene.value)

  const nameBg = new Image()
  nameBg.src = '/assets/name_background.png'
  nameBg.onload = () => {
    nameBgImage.value = nameBg
  }

  tokens.forEach((token) => {
    const img = new Image()
    img.src = token.image
    img.onload = () => {
      tokenImages[token.id] = img
    }
  })
})

const scene = computed(() => ({
  x: 0,
  y: 0,
  width: currentScene.value?.width ?? 1920,
  height: currentScene.value?.height ?? 1084,
  image: bgImage.value ?? undefined,
}))

const stageConfig = computed(() => ({
  width: currentScene.value?.width ?? 1920,
  height: currentScene.value?.height ?? 1084,
}))

const tokenGroups = computed(() => {
  return tokens.map((token) => {
    const statusStroke = token.status === 'machucado' ? '#ff8c00' : token.status === 'morrendo' ? '#ff0000' : '#00d100'
    const statusLabel = token.status === 'normal' ? 'Normal' : token.status === 'machucado' ? 'Machucado' : 'Morrendo'
    const imageWidth = token.width * token.scale
    const imageHeight = token.height * token.scale
    const nameY = 10 + imageHeight + 10
    const hpY = 10 + imageHeight + 56
    const epY = 10 + imageHeight + 86
    const statusY = 10 + imageHeight + 118
    const barWidth = token.visibility.hp === 'hidden' ? 0 : Math.max(0, Math.min(imageWidth, (token.hp / 40) * imageWidth))
    const epBarWidth = token.ep ? Math.max(0, Math.min(imageWidth, (token.ep / 40) * imageWidth)) : 0
    const contentWidth = Math.max(0, imageWidth - 20)

    return {
      id: token.id,
      groupConfig: {
        x: token.x,
        y: token.y,
        draggable: true,
        cursor: 'pointer',
      },
      imageConfig: {
        x: 10,
        y: 10,
        width: imageWidth,
        height: imageHeight,
        image: tokenImages[token.id] ?? undefined,
      },
      nameBgConfig: {
        x: 10,
        y: nameY,
        width: imageWidth,
        height: 40,
        image: nameBgImage.value ?? undefined,
      },
      nameConfig: {
        x: 10,
        y: nameY + 8,
        text: token.visibility.name === 'full' ? token.name : '????????',
        fontSize: 19,
        width: imageWidth,
        fontFamily: 'Arial',
        fill: '#fff',
        align: 'center',
      },
      hpContainerConfig: {
        x: 10,
        y: hpY,
        width: imageWidth,
        height: 24,
        fill: '#00000099',
        stroke: '#ffffff66',
        strokeWidth: 2,
        cornerRadius: 4,
      },
      hpBarConfig: {
        x: 10,
        y: hpY,
        width: barWidth,
        height: 24,
        fill: token.status === 'morrendo' ? '#ff4d4d' : token.status === 'machucado' ? '#ffb347' : '#4caf50',
        cornerRadius: 4,
      },
      hpTextConfig: {
        x: 10,
        y: hpY + 2,
        text: token.visibility.hp === 'hidden' ? '' : `HP: ${token.hp}`,
        fontSize: 16 * token.scale,
        width: contentWidth,
        fontFamily: 'Arial',
        fill: '#fff',
        align: 'left',
      },
      epContainerConfig: {
        x: 10,
        y: epY,
        width: imageWidth,
        height: 24,
        fill: '#00000099',
        stroke: '#ffffff66',
        strokeWidth: 2,
        cornerRadius: 4,
      },
      epBarConfig: {
        x: 10,
        y: epY,
        width: epBarWidth,
        height: 24,
        fill: '#2196f3',
        cornerRadius: 4,
      },
      epTextConfig: {
        x: 10,
        y: epY + 2,
        text: token.ep ? `EP: ${token.ep}` : '',
        fontSize: 16 * token.scale,
        width: contentWidth,
        fontFamily: 'Arial',
        fill: '#fff',
        align: 'left',
      },
      statusTextConfig: {
        x: 10,
        y: statusY,
        text: statusLabel,
        fontSize: 18 * token.scale,
        width: imageWidth,
        fontFamily: 'Arial',
        fill: statusStroke,
        align: 'center',
      },
      hasEp: token.ep !== undefined,
      showAttributes: token.showAttributes,
    }
  })
})
</script>

<style lang="css">
html,
body,
#__nuxt,
#app {
  min-height: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

body {
  background: #000;
}

.window.main {
  width: 100vw !important;
  min-height: 100vh !important;
  max-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.window.main .window-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  margin: 2px;
}

.window.main .window-body > * {
  box-sizing: border-box;
}

nav .menu-bar {
  display: inline-block;
  padding: 0;
  margin: 0;
  margin-top: 10px;
}

nav .menu-bar.icons {
  margin-top: 0;
}

nav .menu-bar.icons li {
  display: inline-block;
}

nav .menu-bar.icons li a {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 48px;
  height: 52px;

  &:hover {
    width: 46px;
    height: 50px;
  }
}

nav .menu-bar.icons li a img {
  width: 32px;
  margin: 4px
}

nav .menu-bar li {
  display: inline;
}


nav .menu-bar li a {
  color: black;
  text-decoration: none;
  padding: 8px;
  cursor: pointer;

  &:hover {
    border-width: 1px;
    border-style: solid;
    border-color: white black black white;
  }

  &:active {
    border-width: 2px;
    border-style: solid;
    border-color: #333333 lightgray lightgray #333333;
  }
}
</style>