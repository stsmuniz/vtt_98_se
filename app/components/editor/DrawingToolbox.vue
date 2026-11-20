<script setup lang="ts">
/**
 * Caixa de ferramentas de desenho, no estilo da do Paint do Windows 98: coluna à esquerda do
 * canvas com as ferramentas (2 colunas), desfazer/refazer, a caixa de opções da ferramenta
 * (espessura, estilo da forma, fonte e tamanho do texto) e as cores — primária (botão esquerdo:
 * contorno, traço, texto) e secundária (botão direito: preenchimento).
 * O estilo escolhido fica guardado no navegador (localStorage), por conveniência.
 */
import type { IconName } from '~/utils/icons'
import {
  DRAWING_TOOL_KEYS, FONT_SIZES, PAINT_PALETTE, STROKE_WIDTHS, TEXT_FONTS, sanitizeDrawStyle,
  type DrawStyle, type DrawingTool, type ShapeStyle,
} from '~~/lib/drawings'

const props = withDefaults(defineProps<{
  /** Mostra a ferramenta Apontar (só na sala). */
  showPointer?: boolean
  canUndo?: boolean
  canRedo?: boolean
  /** Há um texto em digitação no canvas (mostra as opções de texto mesmo fora da ferramenta Texto). */
  editingText?: boolean
}>(), { showPointer: false, canUndo: false, canRedo: false, editingText: false })

const tool = defineModel<DrawingTool>('tool', { required: true })
const style = defineModel<DrawStyle>('drawStyle', { required: true })

const emit = defineEmits<{ undo: []; redo: [] }>()

type ToolDef = { id: DrawingTool; label: string; icon: IconName }

/** Ferramentas (os atalhos ficam em `DRAWING_TOOL_KEYS` e são registrados pela página). */
const TOOLS: ToolDef[] = [
  { id: 'select', label: 'Selecionar', icon: 'draw-select' },
  { id: 'point', label: 'Apontar', icon: 'draw-point' },
  { id: 'pen', label: 'Lápis', icon: 'draw-pen' },
  { id: 'eraser', label: 'Borracha', icon: 'draw-eraser' },
  { id: 'line', label: 'Linha', icon: 'draw-line' },
  { id: 'arrow', label: 'Seta', icon: 'draw-arrow' },
  { id: 'rect', label: 'Retângulo', icon: 'draw-rect' },
  { id: 'ellipse', label: 'Elipse', icon: 'draw-ellipse' },
  { id: 'triangle', label: 'Triângulo', icon: 'draw-triangle' },
  { id: 'text', label: 'Texto', icon: 'draw-text' },
  { id: 'fill', label: 'Preencher com cor', icon: 'draw-fill' },
  { id: 'picker', label: 'Selecionar cor', icon: 'draw-picker' },
]

const keyOf = (id: DrawingTool) => Object.keys(DRAWING_TOOL_KEYS).find(k => DRAWING_TOOL_KEYS[k] === id)?.toUpperCase() ?? ''

const tools = computed(() => TOOLS
  .filter(t => props.showPointer || t.id !== 'point')
  .map(t => ({ ...t, key: keyOf(t.id) })))

const showsWidths = computed(() => ['pen', 'line', 'arrow', 'rect', 'ellipse', 'triangle'].includes(tool.value))
const showsShapeStyle = computed(() => ['rect', 'ellipse', 'triangle'].includes(tool.value))
const showsText = computed(() => tool.value === 'text' || props.editingText)

const SHAPE_STYLES: { id: ShapeStyle; label: string }[] = [
  { id: 'outline', label: 'Só contorno' },
  { id: 'both', label: 'Contorno e preenchimento' },
  { id: 'fill', label: 'Só preenchimento' },
]

function set<K extends keyof DrawStyle>(key: K, value: DrawStyle[K]) {
  style.value = { ...style.value, [key]: value }
}

function onPalette(color: string, which: 'primary' | 'secondary') {
  set(which, color)
}

function swapColors() {
  style.value = { ...style.value, primary: style.value.secondary, secondary: style.value.primary }
}

const colorInput = ref<HTMLInputElement | null>(null)
function editColors() {
  colorInput.value?.click()
}

// ---------- estilo guardado no navegador ----------
const STORAGE_KEY = 'vtt98.drawStyle'
onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) style.value = sanitizeDrawStyle(JSON.parse(saved))
  } catch { /* sem localStorage (aba anônima, bloqueado): fica o padrão */ }
})
watch(style, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch { /* idem */ }
}, { deep: true })
</script>

<template>
  <div class="drawing-toolbox" role="toolbar" aria-label="Ferramentas de desenho" aria-orientation="vertical">
    <div class="tool-grid">
      <button
        v-for="item in tools"
        :key="item.id"
        type="button"
        class="tool-button"
        :class="{ pressed: tool === item.id }"
        :title="`${item.label} (${item.key})`"
        :aria-label="item.label"
        :aria-pressed="tool === item.id"
        :data-test="`draw-tool-${item.id}`"
        @click="tool = item.id"
      >
        <UiIcon :name="item.icon" :size="16" :display-size="22" />
      </button>
    </div>
    <div class="tool-grid">
      <button type="button" class="tool-button" title="Desfazer (Ctrl+Z)" aria-label="Desfazer" :disabled="!canUndo" @click="emit('undo')">
        <UiIcon name="draw-undo" :size="16" :display-size="16" />
      </button>
      <button type="button" class="tool-button" title="Refazer (Ctrl+Y)" aria-label="Refazer" :disabled="!canRedo" @click="emit('redo')">
        <UiIcon name="draw-redo" :size="16" :display-size="16" />
      </button>
    </div>

    <!-- Caixa de opções da ferramenta atual -->
    <div class="options-box">
      <template v-if="showsShapeStyle">
        <button
          v-for="option in SHAPE_STYLES"
          :key="option.id"
          type="button"
          class="option-row"
          :class="{ selected: style.shapeStyle === option.id }"
          :title="option.label"
          :aria-label="option.label"
          :aria-pressed="style.shapeStyle === option.id"
          @click="set('shapeStyle', option.id)"
        >
          <span class="shape-sample" :class="option.id" />
        </button>
      </template>
      <template v-if="showsWidths">
        <button
          v-for="w in STROKE_WIDTHS"
          :key="w"
          type="button"
          class="option-row"
          :class="{ selected: style.strokeWidth === w }"
          :title="`Espessura ${w}`"
          :aria-label="`Espessura ${w}`"
          :aria-pressed="style.strokeWidth === w"
          @click="set('strokeWidth', w)"
        >
          <span class="width-sample" :style="{ height: `${Math.max(1, w / 2)}px` }" />
        </button>
      </template>
      <template v-if="showsText">
        <!-- Amostras "Aa" em cada fonte (exceção à regra da fonte do sistema: é a prévia da fonte).
             mousedown.prevent: o clique não tira o foco do texto em digitação, que muda de fonte. -->
        <div class="font-grid" role="group" aria-label="Fonte do texto">
          <button
            v-for="font in TEXT_FONTS"
            :key="font.id"
            type="button"
            class="font-option"
            :class="{ selected: style.font === font.id }"
            :style="{ fontFamily: font.family }"
            :title="`Fonte: ${font.label}`"
            :aria-label="`Fonte: ${font.label}`"
            :aria-pressed="style.font === font.id"
            :data-test="`draw-font-${font.id}`"
            @mousedown.prevent
            @click="set('font', font.id)"
          >
            Aa
          </button>
        </div>
        <button
          v-for="size in FONT_SIZES"
          :key="size"
          type="button"
          class="option-row"
          :class="{ selected: style.fontSize === size }"
          :title="`Texto tamanho ${size}`"
          :aria-pressed="style.fontSize === size"
          @mousedown.prevent
          @click="set('fontSize', size)"
        >
          {{ size }}
        </button>
      </template>
    </div>

    <!-- Cores -->
    <div class="color-well" title="Cor primária (contorno) e secundária (preenchimento). Clique na de trás para trocar.">
      <button type="button" class="swatch secondary" :style="{ background: style.secondary }" aria-label="Trocar cores primária e secundária" @click="swapColors" />
      <span class="swatch primary" :style="{ background: style.primary }" aria-hidden="true" />
    </div>
    <div class="palette" title="Botão esquerdo: cor primária. Botão direito: cor secundária.">
      <button
        v-for="color in PAINT_PALETTE"
        :key="color"
        type="button"
        class="palette-color"
        :style="{ background: color }"
        :aria-label="`Cor ${color}`"
        @click="onPalette(color, 'primary')"
        @contextmenu.prevent="onPalette(color, 'secondary')"
      />
    </div>
    <button type="button" class="tool-button edit-colors" title="Editar cores (cor primária)…" aria-label="Editar cores" @click="editColors">
      <UiIcon name="draw-colors" :size="16" :display-size="16" />
    </button>
    <input
      ref="colorInput"
      class="color-input"
      type="color"
      tabindex="-1"
      aria-hidden="true"
      :value="style.primary"
      @input="set('primary', ($event.target as HTMLInputElement).value)"
    >
  </div>
</template>

<style scoped>
.drawing-toolbox {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  width: 64px;
  padding: var(--sp-2) var(--sp-1);
  background: var(--c-surface);
  border-right: 1px solid var(--c-shadow);
  overflow-y: auto;
  overflow-x: hidden;
}
.tool-grid {
  display: grid;
  grid-template-columns: repeat(2, 26px);
  gap: 0;
}
.tool-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  min-width: 0;
  min-height: 0;
  padding: 0;
  background: var(--c-surface);
  box-shadow: var(--bevel-raised);
  border: none;
  border-radius: 0;
}
.tool-button:not(:disabled):active,
.tool-button.pressed {
  box-shadow: var(--bevel-sunken);
  padding: 1px 0 0 1px;
}
/* Ferramenta ativa: fundo pontilhado, como no Paint. */
.tool-button.pressed {
  background-image: repeating-conic-gradient(var(--c-highlight) 0 25%, var(--c-surface) 0 50%);
  background-size: 2px 2px;
}
.tool-button:focus { outline: none; }
.tool-button:focus-visible { outline: 1px dotted var(--c-text); outline-offset: -4px; }
.tool-button:disabled :deep(img) { filter: grayscale(1) opacity(0.4); }

.options-box {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  width: 52px;
  min-height: 72px;
  padding: var(--sp-1);
  background: var(--c-surface);
  box-shadow: var(--bevel-thin-sunken);
}
.option-row {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 16px;
  min-width: 0;
  min-height: 0;
  padding: 0 var(--sp-1);
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  font: inherit;
  font-size: var(--fs-1);
  line-height: 16px;
  color: var(--c-text);
}
.option-row.selected {
  background: var(--c-selection);
  color: var(--c-selection-text);
}
.option-row:active { padding: 0 var(--sp-1); box-shadow: none; }
.font-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  margin-bottom: var(--sp-1);
}
.font-option {
  height: 20px;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  font-size: var(--fs-1);
  line-height: 20px;
  color: var(--c-text);
  overflow: hidden;
}
.font-option.selected {
  background: var(--c-selection);
  color: var(--c-selection-text);
}
.font-option:active { padding: 0; box-shadow: none; }
.font-option:focus { outline: none; }
.font-option:focus-visible { outline: 1px dotted currentColor; outline-offset: -2px; }
.width-sample {
  display: block;
  width: 100%;
  background: currentColor;
}
.shape-sample {
  display: block;
  width: 32px;
  height: 10px;
}
.shape-sample.outline { border: 1px solid currentColor; }
.shape-sample.both { border: 1px solid currentColor; background: var(--c-shadow); }
.shape-sample.fill { background: var(--c-shadow); }
.option-row.selected .shape-sample.both,
.option-row.selected .shape-sample.fill { background: var(--c-surface); }

.color-well {
  position: relative;
  width: 36px;
  height: 32px;
  flex: none;
}
.swatch {
  position: absolute;
  width: 20px;
  height: 20px;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  box-shadow: var(--bevel-sunken);
}
.swatch.primary { left: 0; top: 0; pointer-events: none; }
.swatch.secondary { right: 0; bottom: 0; }
.palette {
  display: grid;
  grid-template-columns: repeat(4, 13px);
  gap: 1px;
}
.palette-color {
  width: 13px;
  height: 13px;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  box-shadow: var(--bevel-thin-sunken);
}
.palette-color:focus { outline: none; }
.palette-color:focus-visible { outline: 1px dotted var(--c-text); outline-offset: 1px; }
.edit-colors { flex: none; }
.color-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
</style>
