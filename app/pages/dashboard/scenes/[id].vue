<script setup lang="ts">
/**
 * Editor de cenas: posiciona tokens sobre o cenário. Roda dentro da janela da
 * página (DesktopRouteWindow) com menus, barra de ferramentas e barra de status
 * próprias. Avisa sobre alterações não salvas ao fechar, sair ou recarregar.
 */
import type { SceneToken } from '#server/db/schema.ts'
import type { MenuDef, MenuItemDef } from '~/utils/menu'
import type { ResourceRecord } from '~/desktop/resources'
import { buildTokenMenu } from '~/utils/tokenMenu'
import { useDialog } from '~~/composables/useDialog'
import { useDesktop } from '~~/composables/useDesktop'
import { useWindow } from '~~/composables/useWindow'
import { useCanvasZoom } from '~~/composables/useCanvasZoom'
import { usePreloadedImage, useImageMap } from '~~/composables/useImagePreloader'

definePageMeta({
  layout: 'desktop',
  middleware: 'auth',
})

type TokenTemplate = ResourceRecord & { image?: string; width?: number; height?: number; attributes?: SceneToken['attributes'] }
type StageApi = { hFlip: (id: number) => void; vFlip: (id: number) => void; resetRotation: (id: number) => void }

const desktop = useDesktop()
const dialog = useDialog()
const routeWindow = useWindow('route')
const params = useRoute().params

const { data: currentScene } = useFetch<Record<string, any>>(`/api/v1/scenes/${params.id}`)
const { zoom: sceneZoom, scale: stageScale, zoomIn, zoomOut, resetZoom, handleWheel, fitTo } = useCanvasZoom()
const { image: bgImageObj, load: loadBgImage } = usePreloadedImage()
const { images: tokenImages, ensureLoaded: ensureTokenImageLoaded } = useImageMap()

const stage = ref<StageApi | null>(null)
const canvasWrap = ref<HTMLElement | null>(null)
const isTokenWindowOpen = ref(false)
const selectedTokenId = ref<number | null>(null)
const localTokens = ref<SceneToken[]>([])
const sceneWidth = ref(1920)
const sceneHeight = ref(1084)

// ---------- barra de status ----------
const statusFlash = ref<string | null>(null)
let statusFlashTimer: ReturnType<typeof setTimeout> | null = null
function showStatusMessage(text: string, duration = 2000) {
  if (statusFlashTimer) clearTimeout(statusFlashTimer)
  statusFlash.value = text
  statusFlashTimer = setTimeout(() => { statusFlash.value = null }, duration)
}

// ---------- alterações não salvas ----------
const savedSignature = ref('[]')
const signature = (tokens: SceneToken[]) => JSON.stringify(tokens)
const isDirty = computed(() => signature(localTokens.value) !== savedSignature.value)

// ---------- dados da cena ----------
watch(() => currentScene.value, (scene) => {
  if (!scene) return
  sceneWidth.value = scene.width ?? 1920
  sceneHeight.value = scene.height ?? 1084
}, { immediate: true, deep: true })

watchEffect(() => loadBgImage(currentScene.value?.scenario?.image))

watch(() => currentScene.value?.tokens, (tokens: SceneToken[] | undefined) => {
  if (!tokens) return
  localTokens.value = [...tokens]
  savedSignature.value = signature(localTokens.value)
}, { immediate: true, deep: true })

watch(localTokens, tokens => tokens.forEach(t => ensureTokenImageLoaded(t.id, t.image)), { immediate: true, deep: true })

const selectedToken = computed(() => localTokens.value.find(t => t.id === selectedTokenId.value) ?? null)

/** Seleciona e traz o token para o topo (índice 0 = topo). */
function selectToken(id: number | null) {
  selectedTokenId.value = id
  if (id === null) return
  const index = localTokens.value.findIndex(t => t.id === id)
  if (index > 0) {
    const [token] = localTokens.value.splice(index, 1)
    localTokens.value.unshift(token!)
  }
}

// ---------- persistência ----------
/** Grava todos os tokens da cena. Retorna se deu certo. */
async function saveSceneTokens(): Promise<boolean> {
  try {
    await $fetch(`/api/v1/scenes/${params.id}/tokens`, { method: 'POST', body: localTokens.value })
    savedSignature.value = signature(localTokens.value)
    showStatusMessage('Cena salva com sucesso!')
    return true
  } catch (error) {
    console.error('Erro ao salvar tokens da cena:', error)
    await dialog.alert('Não foi possível salvar a cena. Tente novamente.', { title: 'Erro ao salvar', icon: 'error' })
    return false
  }
}

async function updateSceneSize(size: { width: number; height: number }) {
  try {
    await $fetch(`/api/v1/scenes/${params.id}`, { method: 'PATCH', body: size })
  } catch (error) {
    console.error('Erro ao salvar o novo tamanho da cena:', error)
  }
}

// ---------- ações sobre tokens ----------
async function addToken(token: TokenTemplate) {
  const width = token.width ?? 100
  const height = token.height ?? 100
  const sceneToken: SceneToken = {
    id: Date.now(),
    tokenId: token.id,
    name: token.name ?? '',
    image: token.image ?? '',
    x: sceneWidth.value / 2 - width / 2,
    y: sceneHeight.value / 2 - height / 2,
    width,
    height,
    attributes: token.attributes ?? [],
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 100,
  }
  localTokens.value = [sceneToken, ...localTokens.value]
  selectToken(sceneToken.id)
  ensureTokenImageLoaded(sceneToken.id, sceneToken.image)
  await saveSceneTokens()
}

function duplicateToken() {
  const token = selectedToken.value
  if (!token) return
  const copy = { ...token, id: Date.now(), x: token.x + 10, y: token.y + 10 }
  localTokens.value.unshift(copy)
  selectToken(copy.id)
}

function centerToken() {
  const token = selectedToken.value
  if (!token) return
  token.x = sceneWidth.value / 2 - token.width / 2
  token.y = sceneHeight.value / 2 - token.height / 2
}

async function removeSelectedToken() {
  const id = selectedTokenId.value
  if (id === null) return
  const ok = await dialog.confirm('Tem certeza de que deseja remover este token da cena?', { title: 'Remover token', icon: 'warning' })
  if (!ok) return
  localTokens.value = localTokens.value.filter(t => t.id !== id)
  selectedTokenId.value = null
  await saveSceneTokens()
}

async function replaceSelectedToken() {
  if (selectedTokenId.value === null) return
  const token = await desktop.pick<TokenTemplate>('tokens', { ownerId: 'route', title: 'Substituir token', confirmLabel: 'Substituir' })
  const index = localTokens.value.findIndex(t => t.id === selectedTokenId.value)
  if (!token || index === -1) return
  const current = localTokens.value[index]!
  // Mantém a altura do token na cena e ajusta a largura à proporção do novo.
  const width = token.width && token.height ? current.height * (token.width / token.height) : current.width
  localTokens.value.splice(index, 1, {
    ...current,
    tokenId: token.id,
    name: token.name ?? '',
    image: token.image ?? '',
    attributes: token.attributes ?? [],
    width,
  })
  // Força recarregar a imagem (o cache ignora ids já carregados).
  tokenImages[current.id] = null
  ensureTokenImageLoaded(current.id, token.image ?? '')
  await saveSceneTokens()
}

const withSelected = (fn: (id: number) => void) => () => { if (selectedTokenId.value !== null) fn(selectedTokenId.value) }

const tokenMenuItems = computed<MenuItemDef[]>(() => buildTokenMenu({
  duplicate: duplicateToken,
  replace: replaceSelectedToken,
  hFlip: withSelected(id => stage.value?.hFlip(id)),
  vFlip: withSelected(id => stage.value?.vFlip(id)),
  resetRotation: withSelected(id => stage.value?.resetRotation(id)),
  remove: removeSelectedToken,
}, { disabled: selectedTokenId.value === null }))

// ---------- seletores ----------
async function pickTokenToAdd() {
  const token = await desktop.pick<TokenTemplate>('tokens', { ownerId: 'route', title: 'Adicionar token à cena', confirmLabel: 'Adicionar na cena' })
  if (token) await addToken(token)
}

async function chooseScenario() {
  const scenario = await desktop.pick('scenarios', { ownerId: 'route', title: 'Trocar cenário', confirmLabel: 'Usar este cenário' })
  if (!scenario) return
  try {
    currentScene.value = await $fetch(`/api/v1/scenes/${params.id}`, { method: 'PATCH', body: { scenarioId: scenario.id } })
  } catch (error) {
    console.error('Erro ao trocar o cenário:', error)
    await dialog.alert('Não foi possível trocar o cenário.', { title: 'Erro', icon: 'error' })
  }
}

// ---------- zoom ----------
function fitToWindow() {
  const area = canvasWrap.value?.parentElement
  if (area) fitTo(area.clientWidth - 24, area.clientHeight - 24, sceneWidth.value, sceneHeight.value)
}

// ---------- menu de contexto do canvas ----------
const ctxMenu = reactive({ open: false, x: 0, y: 0 })
function onTokenContext(payload: { x: number; y: number }) {
  Object.assign(ctxMenu, { open: true, x: payload.x, y: payload.y })
}

// ---------- sair com alterações não salvas ----------
let leaveConfirmed = false

/** Pergunta se salva antes de sair. Retorna se pode sair. */
async function confirmLeave(): Promise<boolean> {
  if (leaveConfirmed || !isDirty.value) return true
  const answer = await dialog.ask({
    title: 'Editor de cenas',
    icon: 'warning',
    message: `Deseja salvar as alterações em "${currentScene.value?.name ?? 'cena'}"?`,
    buttons: [
      { label: 'Sim', value: 'yes', default: true },
      { label: 'Não', value: 'no' },
      { label: 'Cancelar', value: 'cancel', cancel: true },
    ],
  })
  if (answer === 'cancel') return false
  if (answer === 'yes' && !(await saveSceneTokens())) return false
  leaveConfirmed = true
  return true
}

routeWindow.onBeforeClose(confirmLeave)
onBeforeRouteLeave(async () => {
  const ok = await confirmLeave()
  if (!ok) leaveConfirmed = false
  return ok
})

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!isDirty.value) return
  event.preventDefault()
  event.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

// ---------- janela: título, menus, atalhos ----------
const windowTitle = computed(() => (currentScene.value?.name ? `${currentScene.value.name} - Editor de cenas` : 'Editor de cenas'))

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
  { id: 'editar', label: '&Editar', items: tokenMenuItems.value },
  {
    id: 'inserir',
    label: '&Inserir',
    items: [
      { id: 'inserir-token', label: '&Token…', icon: 'token', action: pickTokenToAdd },
      { id: 'trocar-cenario', label: '&Cenário…', icon: 'scenario', action: chooseScenario },
    ],
  },
  {
    id: 'exibir',
    label: 'E&xibir',
    items: [
      { id: 'janela-tokens', type: 'check', label: 'Janela de &tokens', checked: isTokenWindowOpen.value, action: () => { isTokenWindowOpen.value = !isTokenWindowOpen.value } },
      { type: 'separator' },
      { id: 'zoom-mais', label: '&Aumentar zoom', icon: 'zoom-in', action: zoomIn },
      { id: 'zoom-menos', label: '&Diminuir zoom', icon: 'zoom-out', action: zoomOut },
      { id: 'zoom-100', label: '&Tamanho real (100%)', action: resetZoom },
      { id: 'zoom-ajustar', label: 'Ajustar à &janela', action: fitToWindow },
      { type: 'separator' },
      { id: 'tela-cheia', label: 'Tela &cheia', icon: 'fullscreen', action: desktop.toggleFullscreen },
    ],
  },
  {
    id: 'ajuda',
    label: 'Aj&uda',
    items: [{ id: 'manual', label: '&Manual do VTT 98 SE', icon: 'help', shortcut: 'F1', action: () => desktop.openHelp() }],
  },
])
routeWindow.setMenus(editorMenus.value)
watch(editorMenus, m => routeWindow.setMenus(m))
onBeforeUnmount(() => routeWindow.setMenus(undefined))

// Atalhos só com a janela do editor ativa. Ctrl+S funciona mesmo digitando.
routeWindow.shortcuts({
  'ctrl+s': { run: () => saveSceneTokens(), allowInInput: true },
  delete: () => removeSelectedToken(),
})
</script>

<template>
  <DesktopRouteWindow :title="windowTitle" icon="scene">
    <template #toolbar>
      <UiToolbar label="Ferramentas do editor">
        <UiToolbarButton label="Tokens" icon="token" show-label :pressed="isTokenWindowOpen" data-test="tb-tokens" @click="isTokenWindowOpen = !isTokenWindowOpen" />
        <UiToolbarButton label="Cenário" icon="scenario" show-label @click="chooseScenario" />
        <UiToolbarButton label="Salvar" icon="save" show-label data-test="tb-salvar" @click="saveSceneTokens" />
        <UiToolbarSeparator />
        <UiToolbarButton label="Ajuda" icon="help" show-label @click="desktop.openHelp()" />
      </UiToolbar>
    </template>

    <div ref="canvasWrap" class="canvas-wrap">
      <EditorStage
        ref="stage"
        v-model:tokens="localTokens"
        v-model:width="sceneWidth"
        v-model:height="sceneHeight"
        :scale="stageScale"
        :background="bgImageObj"
        :images="tokenImages"
        :selected="selectedTokenId"
        resizable
        @select="selectToken"
        @context="onTokenContext"
        @wheel="handleWheel"
        @resized="updateSceneSize"
      />
    </div>

    <UiContextMenu
      :open="ctxMenu.open"
      :x="ctxMenu.x"
      :y="ctxMenu.y"
      :items="tokenMenuItems"
      label="Token"
      @close="ctxMenu.open = false"
    />

    <EditorSceneTokensWindow
      v-model:open="isTokenWindowOpen"
      :tokens="localTokens"
      :selected="selectedTokenId"
      @select="selectToken"
      @remove="removeSelectedToken"
      @duplicate="duplicateToken"
      @center="centerToken"
      @add="addToken"
    />

    <template #statusbar>
      <UiStatusBar>
        <UiStatusField grow data-test="editor-status">{{ statusFlash ?? 'Pronto' }}</UiStatusField>
        <UiStatusField v-if="isDirty" data-test="editor-dirty">Alterações não salvas</UiStatusField>
        <UiStatusField data-test="editor-token-count">{{ localTokens.length }} token(s)</UiStatusField>
        <UiStatusField>{{ sceneWidth }} × {{ sceneHeight }}</UiStatusField>
        <UiStatusField class="zoom-field">
          <EditorZoomControl v-model="sceneZoom" @in="zoomIn" @out="zoomOut" @reset="resetZoom" @fit="fitToWindow" />
        </UiStatusField>
      </UiStatusBar>
    </template>
  </DesktopRouteWindow>
</template>

<style scoped>
.canvas-wrap {
  flex: 1 1 auto;
  min-width: 0;
  background: var(--c-shadow);
}
.zoom-field {
  padding-top: 0;
  padding-bottom: 0;
}
</style>
