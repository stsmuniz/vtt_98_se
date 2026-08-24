<script setup lang="ts">
import {ref, reactive, computed, onMounted, onUnmounted, watchEffect, watch} from 'vue'
import type {Attribute, SceneToken} from "#server/db/schema.ts"
import {useMenuActions} from "~~/composables/useMenuActions"

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
import MenubarIcon from "~/components/MenubarIcon.vue";
import ScenariosWindow from "~/components/ScenariosWindow.vue";

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const {register, unregister} = useMenuActions()

const params = useRoute().params
const {data: currentScene} = useFetch(`/api/v1/scenes/${params.id}`)
const sceneZoom = ref(100) // 100 representa 100% (escala 1)

// Converte a porcentagem para a escala do Konva (ex: 100% -> 1, 50% -> 0.5)
const stageScale = computed(() => sceneZoom.value / 100)

// Funções dos botões
const zoomIn = () => {
  sceneZoom.value = Math.min(500, sceneZoom.value + 10) // Máximo de 500%
}

const zoomOut = () => {
  sceneZoom.value = Math.max(10, sceneZoom.value - 10) // Mínimo de 10%
}

const resetZoom = () => {
  sceneZoom.value = 100
}

// Atalho de Ctrl + Roda do Mouse (Wheel) sobre o canvas
const handleWheel = (e: any) => {
  const evt = e.evt
  if (evt.ctrlKey) {
    evt.preventDefault() // Impende o zoom padrão da página do navegador

    const zoomStep = 10
    if (evt.deltaY < 0) {
      sceneZoom.value = Math.min(500, sceneZoom.value + zoomStep)
    } else {
      sceneZoom.value = Math.max(10, sceneZoom.value - zoomStep)
    }
  }
}

// Watch opcional caso queira garantir que o input seja numérico e seguro
watch(sceneZoom, (newVal) => {
  // Se o usuário digitar algo inválido, força limites básicos
  if (isNaN(newVal) || newVal <= 0) {
    sceneZoom.value = 100
  }
})

const isTokenWindowOpen = ref(false)
const isScenarioWindowOpen = ref(false)
const nameBgImage = ref<HTMLImageElement | null>(null)
const bgImageObj = ref<HTMLImageElement | null>(null)
const tokenImages = reactive<Record<number, HTMLImageElement | null>>({})
const isDeleteTokenAlertOpen = ref(false)
const activeClass = ref('all-tokens')

register('salvar', async () => {
  console.log('Salvando...')
  saveTokenChanges(selectedTokenId.value!)
})

register('novo-token', () => {
  console.log('Novo token')
  isTokenWindowOpen.value = true
})

onUnmounted(() => {
  unregister('salvar')
  unregister('novo-token')
})

// ==========================================
// REFERÊNCIAS DO CANVAS E SELEÇÃO
// ==========================================
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
  const url = currentScene.value?.scenario?.image
  if (url) {
    const img = new Image()
    img.src = url
    img.onload = () => {
      bgImageObj.value = img
    }
  }
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
  newTokens.forEach(token => {
    if (!tokenImages[token.id] && token.image) {
      const img = new Image()
      img.src = token.image
      img.onload = () => {
        tokenImages[token.id] = img
      }
    }
  })
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

const tokensSortedForCanvas = computed(() => {
  const allTokens = [...localTokens.value]
  if (selectedTokenId.value) {
    const index = allTokens.findIndex(t => t.id === selectedTokenId.value)
    if (index !== -1) {
      const [selected] = allTokens.splice(index, 1)
      allTokens.push(selected) // Coloca o selecionado por último para renderizar por cima
    }
  }
  return allTokens
})

const duplicateToken = () => {
  const newToken = {...tokensSortedForCanvas.value.at(-1)}
  newToken.id = Date.now()
  newToken.x += 10
  newToken.y += 10
  localTokens.value.push(newToken)
}

const centerToken = () => {
  const selectedToken = tokensSortedForCanvas.value.find(t => t.id === selectedTokenId.value)
  if (selectedToken) {
    const centerX = selectedToken.width / 2
    const centerY = selectedToken.height / 2
    selectedToken.x = scene.value.width / 2 - centerX
    selectedToken.y = scene.value.height / 2 - centerY
  }
}

const tokenGroups = computed(() => {
  return tokensSortedForCanvas.value.map(token => {
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
        // REMOVIDO: rotation: token.rotation || 0,
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

const saveTokenChanges = async () => {
  try {
    const response = await fetch(`/api/v1/scenes/${params.id}/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(localTokens.value),
    });

    if (response.ok) {
      console.log('Token atualizado com sucesso!');
    }
  } catch (error) {
    console.error('Erro ao salvar token:', error);
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

  const response = await fetch(`/api/v1/scenes/${params.id}/tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sceneToken),
  })
  if (response.ok) {
    const res = await response.json()
    console.log(res.tokens.at(-1))

    // Adicionar o novo token ao array local
    const newToken = res.tokens.at(-1) as SceneToken
    localTokens.value = [...localTokens.value, newToken]
    console.log(localTokens.value)
    // Carregar a imagem do novo token imediatamente
    if (newToken.image) {
      const img = new Image()
      img.src = newToken.image
      img.onload = () => {
        tokenImages[newToken.id] = img
      }
    }

    isTokenWindowOpen.value = false
  }
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
  const nameBg = new Image()
  nameBg.src = '/assets/name_background.png'
  nameBg.onload = () => {
    nameBgImage.value = nameBg
  }
})

// ==========================================
// EVENTOS DE SELEÇÃO E TRANSFORM (RESIZE/ROTATE)
// ==========================================

// 1. Monitora mudanças na seleção para conectar o Transformer
watch(selectedTokenId, (newId) => {
  if (!transformerRef.value) return;
  const transformerNode = transformerRef.value.getNode();

  if (!newId) {
    transformerNode.nodes([]);
    return;
  }

  const stageNode = stageRef.value.getNode();
  // Busca a IMAGEM do token selecionado pelo ID, não o grupo
  const selectedNode = stageNode.findOne(`#token-${newId}`);
  if (selectedNode) {
    transformerNode.nodes([selectedNode]);
  }
});

// 2. Clique no Canvas geral (para desselecionar)
const handleStageClick = (e: any) => {
  // Se clicou no Stage vazio ou na imagem de fundo, desseleciona
  if (e.target === e.target.getStage() || e.target.attrs.id === 'scene') {
    selectedTokenId.value = null;
  }
};

const handleTransformEnd = (e: any, tokenId: number) => {
  const node = e.target // A imagem que o transformer acabou de modificar
  const targetToken = localTokens.value.find(t => t.id === tokenId)
  if (!targetToken) return

  const scaleX = node.scaleX()
  const scaleY = node.scaleY()

  // 1. Calcula o novo tamanho real absoluto
  const newWidth = Math.max(20, node.width() * Math.abs(scaleX))
  const newHeight = Math.max(20, node.height() * Math.abs(scaleY))

  // 2. Preserva o sinal do espelhamento (flip)
  const currentSignX = scaleX < 0 ? -1 : 1
  const currentSignY = scaleY < 0 ? -1 : 1

  targetToken.scaleX = (targetToken.scaleX < 0 ? -1 : 1) * currentSignX
  targetToken.scaleY = (targetToken.scaleY < 0 ? -1 : 1) * currentSignY

  // 3. Salva a rotação lendo diretamente da IMAGEM
  targetToken.rotation = node.rotation()

  // Limpa a escala visual temporária gerada pelo Transformer
  node.scaleX(targetToken.scaleX)
  node.scaleY(targetToken.scaleY)

  // 4. Atualiza as dimensões
  targetToken.width = newWidth
  targetToken.height = newHeight

  // 5. Compensa a posição do Grupo
  const groupNode = node.getParent()
  if (groupNode) {
    // Pegamos a nova posição que o Transformer calculou para a imagem
    const centerX = groupNode.x() + node.x()
    const centerY = groupNode.y() + node.y()

    // Movemos o grupo para compensar o novo centro
    targetToken.x = centerX - (newWidth / 2)
    targetToken.y = centerY - (newHeight / 2)
  }
}

const handleDragEnd = (e: any, tokenId: number) => {
  const targetToken = localTokens.value.find(t => t.id === tokenId)
  if (!targetToken) return

  // e.target aqui é o Group
  const pos = e.target.position() // ou absolutePosition() se precisar
  targetToken.x = pos.x
  targetToken.y = pos.y
}

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
  try {
    const response = await fetch(`/api/v1/scenes/${params.id}/tokens`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(localTokens.value),
    })
    isDeleteTokenAlertOpen.value = false
  } catch (err) {
    console.error('Erro ao deletar token:', err)
    // opcional: reverter o localTokens se falhar
  }
}

const handleDeleteTokenAlertWindow = () => {
  isDeleteTokenAlertOpen.value = true
}

const closeDeleteAlert = () => {
  isDeleteTokenAlertOpen.value = false
}

const setTokenTab = (tab: string) => {
  activeClass.value = tab
}

const handleKeyDown = (e: KeyboardEvent) => {
  // 1. Identifica qual elemento está em foco no momento
  const activeElement = document.activeElement as HTMLElement | null;

  // 2. Verifica se é um elemento de formulário
  const isInputFocused = activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName);

  // 3. Se o usuário estiver digitando, aborta a função para não atrapalhar
  if (isInputFocused) {
    return;
  }

  // Comportamento normal do seu atalho
  if (e.key === 'Delete') {
    e.preventDefault();
    handleDeleteTokenAlertWindow();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

const menuState = reactive({
  show: false,
  x: 0,
  y: 0
});

const activeItem = ref(null);

const openMenu = (e, item) => {
  console.log(e);
  const event = e.evt;
  event.preventDefault();
  // Track context data (e.g., which item was right-clicked)
  activeItem.value = item;

  // Assign mouse coordinates
  menuState.x = event.clientX;
  menuState.y = event.clientY;
  menuState.show = true;
};

const hFlipToken = () => {
  const selectedToken = localTokens.value.find(t => t.id === selectedTokenId.value)
  if (selectedToken) {
    selectedToken.scaleX = (selectedToken.scaleX ?? 1) * -1;

    // Atualiza o nó visualmente de imediato no Konva
    const stageNode = stageRef.value.getNode();
    const node = stageNode.findOne(`#token-${selectedTokenId.value}`);
    if (node) {
      node.scaleX(selectedToken.scaleX);
      stageNode.batchDraw();
    }
  }
}

const vFlipToken = () => {
  const selectedToken = localTokens.value.find(t => t.id === selectedTokenId.value)
  if (selectedToken) {
    selectedToken.scaleY = (selectedToken.scaleY ?? 1) * -1;

    const stageNode = stageRef.value.getNode();
    const node = stageNode.findOne(`#token-${selectedTokenId.value}`);
    if (node) {
      node.scaleY(selectedToken.scaleY);
      stageNode.batchDraw();
    }
  }
}

const resetTokenRotation = () => {
  const selectedToken = localTokens.value.find(t => t.id === selectedTokenId.value)
  if (selectedToken) {
    // Atualiza no estado para que a gravação do token saiba que zerou
    selectedToken.rotation = 0;

    // Força a atualização visual na IMAGEM e alinha o Transformer
    const stageNode = stageRef.value.getNode();
    if (stageNode) {
      const imageNode = stageNode.findOne(`#token-${selectedTokenId.value}`);
      if (imageNode) {
        imageNode.rotation(0);
        stageNode.batchDraw();

        // Força a caixa de contorno do Transformer a se redesenhar alinhada
        if (transformerRef.value) {
          transformerRef.value.getNode().forceUpdate();
        }
      }
    }
  }
}
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
</script>

<template>
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
                        @click="selectedTokenId = token.id"
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
                <div class="information">
                  <dl>
                    <dt>Tamanho</dt>
                    <dd>{{ Math.trunc(localTokens.at(-1).width) }}x{{ Math.trunc(localTokens.at(-1).height) }}</dd>
                    <dt>Tags</dt>
                    <dd>{{ localTokens.at(-1).tags }}</dd>
                    <dt>Posição</dt>
                    <dd>X: {{ localTokens.at(-1).x }}, Y: {{ localTokens.at(-1).y }}</dd>
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
  <Teleport to="#button-bar">
    <button class="button-bar-button">
      <MenubarIcon
          style="padding: 4px; box-sizing: border-box"
          name="Tokens"
          icon="tokens"
          @click="isTokenWindowOpen = true"
      />
    </button>
    <button class="button-bar-button">
      <MenubarIcon
          style="padding: 4px; box-sizing: border-box"
          name="Cenário"
          icon="scenario"
          @click="isScenarioWindowOpen = true"
      />
    </button>
    <button class="button-bar-button">
      <MenubarIcon
          style="padding: 4px; box-sizing: border-box"
          name="Salvar"
          icon="save"
          @click="saveTokenChanges"
      />
    </button>
  </Teleport>
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
            @mousedown="selectedTokenId = tokenGroup.id"
            @touchstart="selectedTokenId = tokenGroup.id"
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
  <teleport to="#footer-menu">
    <div class="scene-footer">
      <div class="zoom-control-container">
        <div class="field-row">
          <label for="zoom">Zoom:</label>
          <!-- v-model.number garante que o valor seja tratado como número -->
          <input type="text" id="zoom" v-model.number="sceneZoom" class="scene-zoom-input" />
          <span style="font-size: 11px; margin-right: 4px;">%</span>
          <button @click="zoomOut">-</button>
          <button @click="zoomIn">+</button>
          <button @click="resetZoom">Restaurar</button>
        </div>
      </div>
    </div>
  </teleport>
</template>
<style lang="css" scoped>
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

.button-bar-button {
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