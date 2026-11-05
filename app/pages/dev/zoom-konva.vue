<script setup lang="ts">
/**
 * Spike (somente desenvolvimento): a escala da interface pode ser feita com
 * `zoom: var(--ui-scale)` na raiz do shell sem quebrar o ponteiro do Konva?
 *
 * Estratégia testada: o shell inteiro recebe `zoom: escala`, e o contêiner do
 * canvas recebe o contra-zoom `zoom: 1/escala` (o canvas já tem zoom próprio).
 * O autoteste converte pontos conhecidos do palco em coordenadas de tela, entrega
 * ao Konva como faria um evento real (setPointersPositions) e compara o que ele
 * devolve em getPointerPosition(). Erro de até 1px é arredondamento.
 */
import Konva from 'konva'
import {
  Stage as VStage,
  Layer as VLayer,
  Rect as VRect,
  Transformer as VTransformer,
} from 'vue-konva'

if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: 'Página não encontrada' })
}

definePageMeta({ layout: false })
useHead({ title: 'Spike: zoom × Konva — VTT 98 SE' })

const SCALES = [1, 1.25, 1.5, 2]
const route = useRoute()
// ?scale=1.5&counter=0 permite que testes automatizados fixem o cenário.
const scale = ref(Number(route.query.scale) || 1.5)
const counterZoom = ref(route.query.counter !== "0")

const stageRef = ref<{ getNode: () => Konva.Stage } | null>(null)
const transformerRef = ref<{ getNode: () => Konva.Transformer } | null>(null)
const stageConfig = { width: 480, height: 320 }

const rects = ref([
  { id: 'a', x: 40, y: 40, width: 100, height: 80, fill: '#c00000' },
  { id: 'b', x: 220, y: 120, width: 120, height: 90, fill: '#000080' },
  { id: 'c', x: 360, y: 40, width: 80, height: 80, fill: '#008000' },
])

const pointer = ref<{ konva: string; dom: string } | null>(null)

function stage() {
  return stageRef.value?.getNode() ?? null
}

/** Posição do ponteiro calculada só pelo DOM, para comparar com a do Konva. */
function domPointer(e: MouseEvent) {
  const s = stage()
  if (!s) return null
  const rect = s.content.getBoundingClientRect()
  const k = rect.width / s.width()
  return { x: (e.clientX - rect.left) / k, y: (e.clientY - rect.top) / k }
}

function onMouseMove(evt: { evt: MouseEvent }) {
  const s = stage()
  const p = s?.getPointerPosition()
  const d = domPointer(evt.evt)
  if (!p || !d) return
  pointer.value = { konva: `${p.x.toFixed(1)}, ${p.y.toFixed(1)}`, dom: `${d.x.toFixed(1)}, ${d.y.toFixed(1)}` }
}

function selectShape(e: { target: Konva.Node }) {
  const tr = transformerRef.value?.getNode()
  if (!tr) return
  tr.nodes(e.target === stage() ? [] : [e.target])
}

if (import.meta.client) {
  // Exposto para o teste de arraste real (puppeteer).
  (window as unknown as { __spike: unknown }).__spike = { rects }
}

function onDragEnd(id: string, e: { target: Konva.Node }) {
  const r = rects.value.find(r => r.id === id)
  if (r) { r.x = e.target.x(); r.y = e.target.y() }
}

interface Result { scale: number; counter: boolean; maxError: number; ok: boolean }
const results = ref<Result[]>([])
const running = ref(false)
const testError = ref<string | null>(null)

const probes = [
  { x: 0, y: 0 }, { x: 10, y: 10 }, { x: 240, y: 160 }, { x: 479, y: 319 }, { x: 123, y: 287 },
]

async function measure(): Promise<number> {
  await nextTick()
  // setTimeout em vez de requestAnimationFrame: o rAF não dispara em navegador headless.
  await new Promise(r => setTimeout(r, 50))
  const s = stage()
  if (!s) return Number.NaN
  const rect = s.content.getBoundingClientRect()
  const k = rect.width / s.width()
  let maxError = 0
  for (const p of probes) {
    const clientX = rect.left + p.x * k
    const clientY = rect.top + p.y * k
    s.setPointersPositions({ clientX, clientY } as unknown as MouseEvent)
    const got = s.getPointerPosition()
    if (!got) return Number.NaN
    maxError = Math.max(maxError, Math.abs(got.x - p.x), Math.abs(got.y - p.y))
  }
  return maxError
}

async function runAutotest() {
  running.value = true
  testError.value = null
  const prev = { scale: scale.value, counter: counterZoom.value }
  try {
    const out: Result[] = []
    for (const counter of [true, false]) {
      for (const sc of SCALES) {
        scale.value = sc
        counterZoom.value = counter
        const maxError = await measure()
        out.push({ scale: sc, counter, maxError, ok: maxError <= 1 })
      }
    }
    results.value = out
  } catch (e) {
    testError.value = e instanceof Error ? `${e.message}\n${e.stack}` : String(e)
  } finally {
    scale.value = prev.scale
    counterZoom.value = prev.counter
    running.value = false
  }
}

watch(stageRef, (s) => {
  if (s && route.query.auto !== undefined && !results.value.length) runAutotest()
})
</script>

<template>
  <div class="page">
    <div class="shell" :style="{ zoom: scale }">
      <div class="window">
        <div class="title-bar">
          <div class="title-bar-text">Spike: escala da interface × ponteiro do Konva</div>
          <div class="title-bar-controls">
            <button aria-label="Close" />
          </div>
        </div>
        <div class="window-body">
          <fieldset>
            <legend>Escala da interface</legend>
            <div class="field-row">
              <template v-for="s in SCALES" :key="s">
                <input :id="`s-${s}`" v-model="scale" type="radio" :value="s">
                <label :for="`s-${s}`">{{ s * 100 }}%</label>
              </template>
            </div>
            <div class="field-row">
              <input id="counter" v-model="counterZoom" type="checkbox">
              <label for="counter">Contra-zoom no contêiner do canvas</label>
            </div>
            <div class="field-row">
              <button :disabled="running" @click="runAutotest">Executar autoteste</button>
              <span>Arraste e redimensione os quadrados: devem acompanhar o ponteiro exatamente.</span>
            </div>
          </fieldset>

          <div class="canvas-scroll" :style="{ zoom: counterZoom ? 1 / scale : 1 }">
            <ClientOnly>
            <VStage
              ref="stageRef"
              :config="stageConfig"
              @mousemove="onMouseMove"
              @mousedown="selectShape"
            >
              <VLayer>
                <VRect :config="{ x: 0, y: 0, width: 480, height: 320, fill: '#ffffff', listening: false }" />
                <VRect
                  v-for="r in rects"
                  :key="r.id"
                  :config="{ ...r, draggable: true }"
                  @dragend="(e: { target: Konva.Node }) => onDragEnd(r.id, e)"
                />
                <VTransformer ref="transformerRef" />
              </VLayer>
            </VStage>
            </ClientOnly>
          </div>

          <p v-if="pointer" class="readout">
            Ponteiro segundo o Konva: <strong>{{ pointer.konva }}</strong> · segundo o DOM: <strong>{{ pointer.dom }}</strong>
          </p>

          <pre v-if="testError" class="test-error">{{ testError }}</pre>

          <table v-if="results.length" class="results">
            <thead>
              <tr><th>Escala</th><th>Contra-zoom</th><th>Erro máximo (px)</th><th>Resultado</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in results" :key="`${r.scale}-${r.counter}`" :class="r.ok ? 'ok' : 'fail'">
                <td>{{ r.scale * 100 }}%</td>
                <td>{{ r.counter ? 'sim' : 'não' }}</td>
                <td>{{ Number.isNaN(r.maxError) ? '—' : r.maxError.toFixed(2) }}</td>
                <td>{{ r.ok ? 'OK' : 'FALHOU' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--c-desktop);
  padding: var(--sp-5);
}
.shell { width: max-content; }
.canvas-scroll {
  margin: var(--sp-3) 0;
  width: 480px;
  height: 320px;
  overflow: auto;
  box-shadow: var(--bevel-sunken);
  background: var(--c-shadow);
}
.readout { margin: var(--sp-2) 0; }
.results { border-collapse: collapse; background: var(--c-window); }
.results th, .results td { padding: var(--sp-1) var(--sp-3); border: 1px solid var(--c-shadow); text-align: left; }
.results tr.ok td:last-child { color: #006000; font-weight: bold; }
.results tr.fail td:last-child { color: #c00000; font-weight: bold; }
</style>
