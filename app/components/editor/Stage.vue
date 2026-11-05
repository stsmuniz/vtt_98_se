<script setup lang="ts">
/**
 * Canvas (vue-konva) compartilhado pelo editor de cenas e pela sala: cenário
 * de fundo, tokens arrastáveis, seletor de transformação (tamanho/rotação) e,
 * no editor, a alça para redimensionar o cenário.
 *
 * `tokens` é um v-model com os MESMOS objetos de quem usa (arrastar/transformar
 * altera o objeto do token), para que observadores profundos da página — como
 * a transmissão ao vivo da sala — continuem vendo cada alteração.
 *
 * O array está em ordem de exibição "de cima para baixo" (índice 0 = token no
 * topo); por isso é desenhado ao contrário.
 */
import type { SceneToken } from '#server/db/schema.ts'
import {
  Stage as VStage,
  Layer as VLayer,
  Rect as VRect,
  Image as VImage,
  Group as VGroup,
  Transformer as VTransformer,
} from 'vue-konva'
import { useTokenTransform } from '~~/composables/useTokenTransform'

type StageToken = Pick<SceneToken, 'id' | 'x' | 'y' | 'width' | 'height' | 'scaleX' | 'scaleY' | 'rotation' | 'opacity'>

const props = withDefaults(defineProps<{
  scale: number
  background?: HTMLImageElement | null
  images: Record<number, HTMLImageElement | null | undefined>
  selected: number | null
  /** Arrastar e transformar tokens (falso para visitantes da sala). */
  editable?: boolean
  /** Posições exibidas (movimento suavizado dos visitantes); ignora x/y dos tokens. */
  positions?: Record<number, { x: number; y: number }> | null
  /** Mostra a alça para redimensionar o cenário (editor). */
  resizable?: boolean
}>(), {
  background: null,
  editable: true,
  positions: null,
  resizable: false,
})

const tokens = defineModel<StageToken[]>('tokens', { required: true })
const width = defineModel<number>('width', { required: true })
const height = defineModel<number>('height', { required: true })

const emit = defineEmits<{
  select: [id: number | null]
  context: [payload: { id: number; x: number; y: number }]
  dblclick: [id: number]
  wheel: [event: unknown]
  /** Fim de arrastar/transformar um token. */
  change: [id: number]
  /** Fim do arraste da alça de tamanho do cenário. */
  resized: [size: { width: number; height: number }]
}>()

const MIN_SCENE = 100

const stageRef = ref<{ getNode: () => any } | null>(null)
const transformerRef = ref<{ getNode: () => any } | null>(null)

const { handleTransformEnd, handleDragEnd, hFlipToken, vFlipToken, resetTokenRotation } = useTokenTransform(tokens, stageRef, transformerRef)

// O canvas acompanha o zoom (a janela rola para mostrar o resto do mapa). No
// editor sobra uma margem para a alça de redimensionar não ficar cortada.
const HANDLE_MARGIN = 24
const stageConfig = computed(() => ({
  width: width.value * props.scale + (props.resizable ? HANDLE_MARGIN : 0),
  height: height.value * props.scale + (props.resizable ? HANDLE_MARGIN : 0),
  scaleX: props.scale,
  scaleY: props.scale,
}))

const backgroundConfig = computed(() => ({
  x: 0,
  y: 0,
  width: width.value,
  height: height.value,
  image: props.background ?? undefined,
  id: 'scene',
}))

const tokenGroups = computed(() => [...tokens.value].reverse().map((token) => {
  const w = token.width || 100
  const h = token.height || 100
  const pos = !props.editable && props.positions ? (props.positions[token.id] ?? token) : token
  return {
    id: token.id,
    groupConfig: {
      x: pos.x,
      y: pos.y,
      draggable: props.editable,
      opacity: (token.opacity ?? 100) / 100,
    },
    imageConfig: {
      id: `token-${token.id}`,
      name: 'token-image',
      image: props.images[token.id] ?? undefined,
      x: w / 2,
      y: h / 2,
      width: w,
      height: h,
      offsetX: w / 2,
      offsetY: h / 2,
      scaleX: token.scaleX ?? 1,
      scaleY: token.scaleY ?? 1,
      rotation: token.rotation || 0,
    },
  }
}))

const transformerConfig = {
  keepRatio: true,
  enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
}

// Liga o transformador ao token selecionado (à IMAGEM, não ao grupo).
watch(() => props.selected, async (id) => {
  if (!props.editable || !transformerRef.value) return
  await nextTick()
  const transformer = transformerRef.value.getNode()
  if (!id) {
    transformer.nodes([])
    return
  }
  const node = stageRef.value?.getNode()?.findOne(`#token-${id}`)
  transformer.nodes(node ? [node] : [])
})

function onStageClick(e: any) {
  if (e.target === e.target.getStage() || e.target.attrs.id === 'scene') emit('select', null)
}

function onGroupDown(id: number) {
  emit('select', id)
}

function onDragEnd(e: any, id: number) {
  handleDragEnd(e, id)
  emit('change', id)
}

function onTransformEnd(e: any, id: number) {
  handleTransformEnd(e, id)
  emit('change', id)
}

function onContext(e: any, id: number) {
  e.evt.preventDefault()
  emit('select', id)
  emit('context', { id, x: e.evt.clientX, y: e.evt.clientY })
}

// ---------- alça de redimensionar o cenário ----------
const resizeHandleConfig = computed(() => ({
  x: width.value,
  y: height.value,
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

function onResizeMove(e: any) {
  const node = e.target
  width.value = Math.max(MIN_SCENE, node.x())
  height.value = Math.max(MIN_SCENE, node.y())
  node.x(width.value)
  node.y(height.value)
}

function onResizeEnd(e: any) {
  onResizeMove(e)
  emit('resized', { width: width.value, height: height.value })
}

function setCursor(e: any, cursor: string) {
  e.target.getStage().container().style.cursor = cursor
}

defineExpose({
  hFlip: (id: number) => hFlipToken(id),
  vFlip: (id: number) => vFlipToken(id),
  resetRotation: (id: number) => resetTokenRotation(id),
  getStage: () => stageRef.value?.getNode(),
})
</script>

<template>
  <div class="editor-stage" data-test="editor-stage">
    <VStage
      ref="stageRef"
      :config="stageConfig"
      @click="onStageClick"
      @tap="onStageClick"
      @wheel="emit('wheel', $event)"
    >
      <VLayer>
        <VImage :config="backgroundConfig" />
      </VLayer>
      <VLayer>
        <VGroup
          v-for="group in tokenGroups"
          :key="group.id"
          :config="group.groupConfig"
          @mousedown="onGroupDown(group.id)"
          @touchstart="onGroupDown(group.id)"
          @dragend="(e: any) => onDragEnd(e, group.id)"
          @contextmenu="(e: any) => onContext(e, group.id)"
          @dblclick="emit('dblclick', group.id)"
        >
          <VImage :config="group.imageConfig" @transformend="(e: any) => onTransformEnd(e, group.id)" />
        </VGroup>

        <VTransformer v-if="editable" ref="transformerRef" :config="transformerConfig" />

        <VRect
          v-if="resizable && editable"
          :config="resizeHandleConfig"
          @dragmove="onResizeMove"
          @dragend="onResizeEnd"
          @mouseenter="(e: any) => setCursor(e, 'nwse-resize')"
          @mouseleave="(e: any) => setCursor(e, 'default')"
        />
      </VLayer>
    </VStage>
  </div>
</template>

<style scoped>
.editor-stage {
  display: inline-block;
  min-width: 100%;
  min-height: 100%;
  background: var(--c-shadow);
  /* Contra-zoom: a escala da interface não amplia o mapa (o canvas tem zoom próprio)
     e o ponteiro do Konva continua acertando os tokens. */
  zoom: calc(1 / var(--ui-scale, 1));
}
.editor-stage :deep(.konvajs-content) {
  background: var(--c-shadow);
}
</style>
