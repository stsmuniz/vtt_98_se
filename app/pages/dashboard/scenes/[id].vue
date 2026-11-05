<script setup lang="ts">
import type {SceneToken} from "#server/db/schema.ts"
import type { MenuDef } from "~/utils/menu"
import {useDesktop} from "~~/composables/useDesktop"
import {useWindow} from "~~/composables/useWindow"
import {useCanvasZoom} from "~~/composables/useCanvasZoom"
import {usePreloadedImage, useImageMap} from "~~/composables/useImagePreloader"
import {useTokenTransform} from "~~/composables/useTokenTransform"

import {
  Stage as VStage,
  Layer as VLayer,
  Rect as VRect,
  Image as VImage,
  Text as VText,
  Group as VGroup,
  Transformer as VTransformer,
} from 'vue-konva'

import TokensWindow from "~/components/TokensWindow.vue"
import FixedWindow from "~/components/FixedWIndow.vue"
import ScenariosWindow from "~/components/ScenariosWindow.vue";

definePageMeta({
  layout: 'desktop',
  middleware: 'auth',
})

const desktop = useDesktop()
const routeWindow = useWindow('route')
const openHelpManual = () => desktop.openHelp()

// Mensagem temporária na barra de status (ex.: "Cena salva com sucesso!")
const statusFlash = ref<string | null>(null)
let statusFlashTimer: ReturnType<typeof setTimeout> | null = null
function showStatusMessage(text: string, duration = 2000) {
  if (statusFlashTimer) clearTimeout(statusFlashTimer)
  statusFlash.value = text
  statusFlashTimer = setTimeout(() => { statusFlash.value = null }, duration)
}

const params = useRoute().params
const {data: currentScene} = useFetch(`/api/v1/scenes/${params.id}`)
const { zoom: sceneZoom, scale: stageScale, zoomIn, zoomOut, resetZoom, handleWheel } = useCanvasZoom()

const isTokenWindowOpen = ref(false)
const isScenarioWindowOpen = ref(false)
const { image: nameBgImage, load: loadNameBgImage } = usePreloadedImage()
const { image: bgImageObj, load: loadBgImage } = usePreloadedImage()
const { images: tokenImages, ensureLoaded: ensureTokenImageLoaded } = useImageMap()
const isDeleteTokenAlertOpen = ref(false)
const isReplaceTokenWindowOpen = ref(false)
const activeClass = ref('all-tokens')


const stageRef = ref(null)
const transformerRef = ref(null)
const selectedTokenId = ref<number | null>(null) // Guarda qual token está selecionado

// Adicione este reactive para controlar os tokens localmente
const localTokens = ref<SceneToken[]>([])

const sceneWidth = ref(1920)
const sceneHeight = ref(1084)

// Sincronizar tamanho inicial do servidor
watch(() => currentScene.value, (newScene) => {
  if (newScene) {
    sceneWidth.value = newScene.width ?? 1920
    sceneHeight.value = newScene.height ?? 1084
  }
}, { immediate: true, deep: true })

watchEffect(() => {
  loadBgImage(currentScene.value?.scenario?.image)
})

// Sincronizar tokens do servidor com tokens locais
watch(() => currentScene.value?.tokens, (newTokens) => {
  if (newTokens) {
    localTokens.value = [...newTokens]
  }
}, {immediate: true, deep: true})

// Carregar imagens dos tokens
watch(() => localTokens.value, (newTokens) => {
  if (!newTokens) return;
  newTokens.forEach(token => ensureTokenImageLoaded(token.id, token.image))
}, {immediate: true, deep: true})

// Configuração atualizada do Stage para aplicar o scaleX e scaleY
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

// Usar localTokens em vez de currentScene.value?.tokens
const tokens = computed(() => localTokens.value ?? [])

const selectedToken = computed(() => localTokens.value.find(t => t.id === selectedTokenId.value) ?? null)

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

const duplicateToken = () => {
  const token = selectedToken.value
  if (!token) return
  const newToken = {...token}
  newToken.id = Date.now()
  newToken.x += 10
  newToken.y += 10
  localTokens.value.unshift(newToken)
  selectToken(newToken.id)
}

const centerToken = () => {
  const token = selectedToken.value
  if (token) {
    const centerX = token.width / 2
    const centerY = token.height / 2
    token.x = scene.value.width / 2 - centerX
    token.y = scene.value.height / 2 - centerY
  }
}

const tokenGroups = computed(() => {
  return [...localTokens.value].reverse().map(token => {
    const width = token.width || 100
    const height = token.height || 100
    const centerX = width / 2
    const centerY = height / 2

    return {
      id: token.id,

      groupConfig: {
        x: token.x,
        y: token.y,
        draggable: true,
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
        rotation: token.rotation || 0, // ADICIONADO AQUI
      },
    }
  })
})

// Única fonte de verdade para persistir os tokens da cena: sempre envia o array
// completo atual de localTokens, usada por save/adicionar/apagar token.
const saveSceneTokens = async () => {
  try {
    const response = await fetch(`/api/v1/scenes/${params.id}/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(localTokens.value),
    });

    if (response.ok) {
      showStatusMessage('Cena salva com sucesso!')
    } else {
      console.error('Erro ao salvar tokens da cena.')
    }
  } catch (error) {
    console.error('Erro ao salvar tokens da cena:', error);
  }
};

const addToken = async (token: Omit<Token, "tags"> & { x?: number; y?: number; }) => {
  const sceneToken: SceneToken = {
    ...token,
    id: Date.now(),
    tokenId: token.id,
    x: token.x ?? scene.value.width / 2 - token.width / 2,
    y: token.y ?? scene.value.height / 2 - token.height / 2,
    width: token.width ?? 100,
    height: token.height ?? 100,
    image: token.image ?? '',
    name: token.name ?? '',
    attributes: token.attributes ?? [],
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 100
  }

  localTokens.value = [sceneToken, ...localTokens.value]
  selectToken(sceneToken.id)
  ensureTokenImageLoaded(sceneToken.id, sceneToken.image)

  await saveSceneTokens()
  isTokenWindowOpen.value = false
}

const setScenario = async (scenario) => {
  console.log(scenario)
  try {
    const response = await fetch(`/api/v1/scenes/${params.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({scenarioId: scenario.id}),
    })
    if (response.ok) {
      const res = await response.json()
      console.log(res)
      currentScene.value = res
    }
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  loadNameBgImage('/assets/name_background.png')
})

// ==========================================
// EVENTOS DE SELEÇÃO E TRANSFORM (RESIZE/ROTATE)
// ==========================================

// 1. Monitora mudanças na seleção para conectar o Transformer
watch(selectedTokenId, async (newId) => {
  if (!transformerRef.value) return;
  await nextTick();
  const transformerNode = transformerRef.value.getNode();

  if (!newId) {
    transformerNode.nodes([]);
    return;
  }

  const stageNode = stageRef.value.getNode();
  // Busca a IMAGEM do token selecionado pelo ID, não o grupo
  const selectedNode = stageNode?.findOne(`#token-${newId}`);
  if (selectedNode) {
    transformerNode.nodes([selectedNode]);
  }
});

// 2. Clique no Canvas geral (para desselecionar)
const handleStageClick = (e: any) => {
  // Se clicou no Stage vazio ou na imagem de fundo, desseleciona
  if (e.target === e.target.getStage() || e.target.attrs.id === 'scene') {
    selectToken(null);
  }
};

const { handleTransformEnd, handleDragEnd, hFlipToken: flipTokenHorizontally, vFlipToken: flipTokenVertically, resetTokenRotation: resetSelectedTokenRotation } = useTokenTransform(localTokens, stageRef, transformerRef)

const handleDeleteToken = async () => {
  if (!selectedTokenId.value) return

  const tokenId = selectedTokenId.value
  const index = localTokens.value.findIndex(t => t.id === tokenId)
  if (index === -1) return

  // Remove localmente imediatamente (otimista)
  localTokens.value.splice(index, 1)
  selectedTokenId.value = null

  // Limpa o transformer
  if (transformerRef.value) {
    transformerRef.value.getNode().nodes([])
  }

  // Persiste no backend (envie o array completo atualizado)
  await saveSceneTokens()
  isDeleteTokenAlertOpen.value = false
}

const handleDeleteTokenAlertWindow = () => {
  isDeleteTokenAlertOpen.value = true
}

const openReplaceTokenWindow = () => {
  if (!selectedTokenId.value) return
  isReplaceTokenWindowOpen.value = true
}

const replaceToken = async (token: Token) => {
  const index = localTokens.value.findIndex(t => t.id === selectedTokenId.value)
  if (index === -1) return

  const current = localTokens.value[index]
  // Mantém a altura atual do token na cena, mas ajusta a largura para preservar
  // a proporção (largura/altura) do token escolhido para substituição.
  const width = token.width && token.height
      ? current.height * (token.width / token.height)
      : current.width
  const replaced: SceneToken = {
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

  await saveSceneTokens()
  isReplaceTokenWindowOpen.value = false
}

const closeDeleteAlert = () => {
  isDeleteTokenAlertOpen.value = false
}

const setTokenTab = (tab: string) => {
  activeClass.value = tab
}

// Atalhos do editor: só disparam com a janela do editor ativa.
// Ctrl+S funciona mesmo com um campo de texto em foco (evita o "Salvar" do navegador).
routeWindow.shortcuts({
  'ctrl+s': { run: () => saveSceneTokens(), allowInInput: true },
  delete: () => handleDeleteTokenAlertWindow(),
})

const menuState = reactive({
  show: false,
  x: 0,
  y: 0
});

const openMenu = (e, item) => {
  const event = e.evt;
  event.preventDefault();

  // Assign mouse coordinates
  menuState.x = event.clientX;
  menuState.y = event.clientY;
  menuState.show = true;
};

const hFlipToken = () => flipTokenHorizontally(selectedTokenId.value!)
const vFlipToken = () => flipTokenVertically(selectedTokenId.value!)
const resetTokenRotation = () => resetSelectedTokenRotation(selectedTokenId.value!)
// ==========================================
// REDIMENSIONAMENTO DO CANVAS
// ==========================================

// 1. Função para salvar o novo tamanho no backend
const updateSceneSize = async (newWidth: number, newHeight: number) => {
  try {
    const response = await fetch(`/api/v1/scenes/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ width: newWidth, height: newHeight }),
    })

    if (!response.ok) {
      console.error('Erro ao salvar novo tamanho da cena')
    }
  } catch (error) {
    console.error('Erro de conexão ao redimensionar:', error)
  }
}

const resizeHandleConfig = computed(() => ({
  x: sceneWidth.value,
  y: sceneHeight.value,
  width: 20,
  height: 20,
  offsetX: 10,
  offsetY: 10,
  fill: '#000080',
  stroke: '#ffffff',
  strokeWidth: 2,
  draggable: true,
  name: 'resize-handle',
}))

const onResizeHandleDragMove = (e: any) => {
  const node = e.target

  sceneWidth.value = Math.max(100, node.x())
  sceneHeight.value = Math.max(100, node.y())

  // Força o nó a não passar do limite mínimo
  node.x(sceneWidth.value)
  node.y(sceneHeight.value)
}

const onResizeHandleDragEnd = (e: any) => {
  const node = e.target

  sceneWidth.value = Math.max(100, node.x())
  sceneHeight.value = Math.max(100, node.y())

  // Salva no banco de dados quando soltar o mouse
  updateSceneSize(sceneWidth.value, sceneHeight.value)
}

// 5. Muda o cursor do mouse ao passar por cima da alça
const onHandleMouseEnter = (e: any) => {
  const container = e.target.getStage().container()
  container.style.cursor = 'nwse-resize'
}

const onHandleMouseLeave = (e: any) => {
  const container = e.target.getStage().container()
  container.style.cursor = 'default'
}

const windowTitle = computed(() => currentScene.value?.name ? `${currentScene.value.name} - Editor de cenas` : 'Editor de cenas')

const editorMenus = computed<MenuDef[]>(() => [
  {
    id: 'arquivo',
    label: '&Arquivo',
    items: [
      { id: 'salvar', label: '&Salvar', icon: 'save', shortcut: 'Ctrl+S', action: saveSceneTokens },
      { type: 'separator' },
      { id: 'fechar', label: '&Fechar', action: () => navigateTo('/dashboard') },
    ],
  },
  {
    id: 'inserir',
    label: '&Inserir',
    items: [
      { id: 'inserir-token', label: '&Token…', icon: 'token', action: () => { isTokenWindowOpen.value = true } },
      { id: 'trocar-cenario', label: '&Cenário…', icon: 'scenario', action: () => { isScenarioWindowOpen.value = true } },
    ],
  },
  {
    id: 'exibir',
    label: 'E&xibir',
    items: [
      { id: 'zoom-mais', label: '&Aumentar zoom', icon: 'zoom-in', action: zoomIn },
      { id: 'zoom-menos', label: '&Diminuir zoom', icon: 'zoom-out', action: zoomOut },
      { id: 'zoom-100', label: '&Restaurar zoom', action: resetZoom },
      { type: 'separator' },
      { id: 'tela-cheia', label: '&Tela cheia', icon: 'fullscreen', action: desktop.toggleFullscreen },
    ],
  },
  {
    id: 'ajuda',
    label: 'Aj&uda',
    items: [{ id: 'manual', label: '&Manual do VTT 98 SE', icon: 'help', shortcut: 'F1', action: openHelpManual }],
  },
])
routeWindow.setMenus(editorMenus.value)
watch(editorMenus, m => routeWindow.setMenus(m))
onBeforeUnmount(() => routeWindow.setMenus(undefined))
</script>

<template>
  <DesktopRouteWindow :title="windowTitle" icon="scene">
    <template #toolbar>
      <UiToolbar label="Ferramentas do editor">
        <UiToolbarButton label="Tokens" icon="token" show-label @click="isTokenWindowOpen = true" />
        <UiToolbarButton label="Cenário" icon="scenario" show-label @click="isScenarioWindowOpen = true" />
        <UiToolbarButton label="Salvar" icon="save" show-label @click="saveSceneTokens" />
        <UiToolbarSeparator />
        <UiToolbarButton label="Ajuda" icon="help" show-label @click="openHelpManual" />
      </UiToolbar>
    </template>
    <ContextMenu
        :show="menuState.show"
        :x="menuState.x"
        :y="menuState.y"
        @close="menuState.show = false"
    >
      <li @click="duplicateToken">Duplicar Token</li>
      <li @click="openReplaceTokenWindow">Substituir Token</li>
      <li @click="hFlipToken">Inverter Horizontalmente</li>
      <li @click="vFlipToken">Inverter Verticalmente</li>
      <li @click="resetTokenRotation()">Restaurar Rotação</li>
      <li @click="handleDeleteTokenAlertWindow()">Remover Token</li>
    </ContextMenu>
    <fixed-window
        title="Substituir Token"
        icon="tokens" v-if="isReplaceTokenWindowOpen"
        @close-window="isReplaceTokenWindowOpen = false"
    >
      <tokens-window
          add-token-to-scene="true"
          add-button-label="Substituir Token"
          @addTokenToScene="replaceToken"
          @close-window="isReplaceTokenWindowOpen = false"
      />
    </fixed-window>
    <fixed-window
        title="Tokens"
        icon="tokens" v-if="isTokenWindowOpen"
        @close-window="isTokenWindowOpen = false"
    >
      <div>
        <menu role="tablist">
          <li role="tab" :aria-selected="activeClass == 'scene-tokens'" @click="setTokenTab('scene-tokens')"><span>Tokens da cena</span>
          </li>
          <li role="tab" :aria-selected="activeClass == 'all-tokens'" @click="setTokenTab('all-tokens')"><span>Tokens cadastrados</span>
          </li>
        </menu>
        <div class="window" role="tabpanel">
          <div class="window-body">
            <div class="tokens-tabs" :class="activeClass == 'scene-tokens' ? 'active' : ''" id="scene-tokens">
              <div class="window-content-container">
                <div>
                  <div class="section-header">Tokens</div>
                  <div class="content">
                    <div class="scenes-grid">
                      <div
                          class="scene-item"
                          v-for="token in tokens"
                          :key="token.id"
                          :class="{ selected: selectedTokenId === token.id }"
                          @click="selectToken(token.id)"
                      >
                        <img :src="token.image" :alt="token.name">
                        <span>{{ token.name }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <aside class="window-sidebar">
                  <div class="buttons" style="display: flex; flex-direction: column; gap: 0.25rem;">
                    <button :disabled="!selectedTokenId" class="disabled" @click.prevent="handleDeleteTokenAlertWindow">
                      Apagar
                    </button>
                    <button :disabled="!selectedTokenId" @click.prevent="duplicateToken" class="disabled">Duplicar</button>
                    <button :disabled="!selectedTokenId" @click.prevent="centerToken" class="disabled">Centralizar</button>
                  </div>
                  <div class="information" v-if="selectedToken">
                    <dl>
                      <dt>Tamanho</dt>
                      <dd>{{ Math.trunc(selectedToken.width) }}x{{ Math.trunc(selectedToken.height) }}</dd>
                      <dt>Tags</dt>
                      <dd>{{ selectedToken.tags }}</dd>
                      <dt>Posição</dt>
                      <dd>X: {{ selectedToken.x }}, Y: {{ selectedToken.y }}</dd>
                    </dl>
                  </div>
                </aside>
              </div>
            </div>
            <div class="tokens-tabs" :class="activeClass == 'all-tokens' ? 'active' : ''" id="all-tokens">
              <tokens-window
                  add-token-to-scene="true"
                  @addTokenToScene="addToken"
                  @close-window="isTokenWindowOpen = false"
              />
            </div>
          </div>
        </div>
      </div>
    </fixed-window>
    <fixed-window
        title="Cenários"
        icon="scenario"
        v-if="isScenarioWindowOpen"
        @close-window="isScenarioWindowOpen = false">
      <scenarios-window
          set-scenario-to-scene="true"
          @setScenarioToScene="setScenario"
          @close-window="isScenarioWindowOpen = false"
      />
    </fixed-window>
    <alert-window
        v-if="isDeleteTokenAlertOpen"
        icon="warning"
        title="Apagar Token"
        @alert-button-OK="handleDeleteToken"
        :cancelAction="closeDeleteAlert"
    >
      Tem certeza que quer apagar este token?
    </alert-window>
    <div class="scene-canvas">
      <!-- Adicionado eventos de click no Stage -->
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
              @contextmenu="(e) => openMenu(e, 'Target Box Alpha')"
          >
            <v-image
                :config="tokenGroup.imageConfig"
                @transformend="(e) => handleTransformEnd(e, tokenGroup.id)"
            />
          </v-group>

          <v-transformer
              ref="transformerRef"
              :config="{
          keepRatio: true,
          enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
        }"
          />

          <v-rect
              :config="resizeHandleConfig"
              @dragmove="onResizeHandleDragMove"
              @dragend="onResizeHandleDragEnd"
              @mouseenter="onHandleMouseEnter"
              @mouseleave="onHandleMouseLeave"
          />
        </v-layer>
      </v-stage>
    </div>
    <template #statusbar>
      <UiStatusBar>
        <UiStatusField grow>{{ statusFlash ?? 'Pronto' }}</UiStatusField>
        <UiStatusField>{{ tokens.length }} token(s)</UiStatusField>
        <UiStatusField class="zoom-field">
          <label for="zoom">Zoom:</label>
          <input id="zoom" v-model.number="sceneZoom" type="text" class="scene-zoom-input">
          <span>%</span>
          <button type="button" title="Diminuir zoom" @click="zoomOut">-</button>
          <button type="button" title="Aumentar zoom" @click="zoomIn">+</button>
          <button type="button" @click="resetZoom">Restaurar</button>
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
.zoom-field input {
  width: 3.5em;
  height: auto;
}
.zoom-field button {
  min-width: 0;
  min-height: 0;
  padding: 0 var(--sp-2);
}

.zoom-control-container {
  button {
    min-width: 0.25rem;
  }
}

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

[role="tablist"] {
  [role="tab"] {
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition: border-color 0.3s ease;
  }
}

.tokens-tabs {
  display: none;

  &.active {
    display: block;
  }

  .section-header {
    background-color: black;
    color: white;
    padding: 0.25rem;
    border-radius: 0.25rem 0.25rem 0 0;
  }

  .window-content-container {
    display: grid;
    grid-template-columns: 5fr 1fr;
    gap: 0.25rem;
  }

  .window-sidebar {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .content {
    background-color: white;
    color: black;
    padding: 0.25rem;
    border: 2px solid;
    border-color: #333333 lightgray lightgray #333333;
    min-height: 54vh;
    max-height: 60vh;
    overflow-y: scroll;

    .scenes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 0.25rem;
    }

    .scene-item {
      width: 150px;
      display: flex;
      padding: 0.25rem;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      gap: 0.25rem;
      cursor: pointer;

      &:hover, &.selected {
        background-color: darkblue;
        color: white;
      }

      img {
        max-width: 100%;
        max-height: 200px;
      }
    }
  }
}

@media screen and (min-width: 768px) {
  .window-content-container {
    width: 60vw;
  }
}
</style>