<script setup lang="ts">
/**
 * Configurações ("Propriedades de Vídeo"): papel de parede e cor, escala da
 * interface e sons. Edita um rascunho; Aplicar/OK gravam nas preferências.
 */
import { UI_SCALES, type UiScale, type Wallpaper, type WallpaperMode } from '~~/lib/preferences'
import { usePreferences } from '~~/composables/usePreferences'
import { useSystemSounds } from '~~/composables/useSystemSounds'
import { useWindow } from '~~/composables/useWindow'

const win = useWindow()
const prefs = usePreferences()
const sounds = useSystemSounds()
await prefs.load()

const tab = ref('fundo')
const tabs = [
  { id: 'fundo', label: 'Plano de fundo' },
  { id: 'aparencia', label: 'Aparência' },
  { id: 'sons', label: 'Sons' },
]

const WALLPAPERS: { id: Wallpaper; label: string; url: string | null }[] = [
  { id: 'none', label: '(nenhum)', url: null },
  { id: 'clouds', label: 'Nuvens', url: '/assets/backgrounds/clouds_background.jpg' },
]
const MODES: { value: WallpaperMode; label: string }[] = [
  { value: 'center', label: 'Centralizar' },
  { value: 'tile', label: 'Lado a lado' },
  { value: 'stretch', label: 'Esticar' },
]
const COLORS = [
  { value: '#008080', label: 'Verde-azulado' },
  { value: '#000080', label: 'Azul-marinho' },
  { value: '#000000', label: 'Preto' },
  { value: '#808080', label: 'Cinza' },
  { value: '#008000', label: 'Verde' },
  { value: '#800000', label: 'Vinho' },
  { value: '#800080', label: 'Roxo' },
  { value: '#808000', label: 'Oliva' },
]
const SCALE_LABELS: Record<string, string> = { auto: 'Automática (recomendado)', 1: '100%', 1.5: '150%', 2: '200%' }

/**
 * A fonte pixel só fica nítida quando cada "pixel" da letra ocupa um número inteiro de
 * pixels físicos da tela, ou seja, quando escala × densidade da tela é inteiro. Com densidade 1,
 * 150% deixaria as letras irregulares; com densidade 2 (telas retina) ele fica perfeito.
 * Só oferecemos os degraus nítidos (e o que já estiver escolhido, para não esconder a sua opção).
 */
const density = import.meta.client ? window.devicePixelRatio || 1 : 1
const isCrisp = (scale: number) => Math.abs(scale * density - Math.round(scale * density)) < 0.02
const scaleOptions = computed(() => UI_SCALES
  .filter(s => s === 'auto' || isCrisp(s) || s === prefs.preferences.value.uiScale || s === draft.uiScale)
  .map(s => ({ value: s, label: SCALE_LABELS[String(s)] ?? String(s) })))

// ---------- rascunho ----------
function fromPrefs() {
  const p = prefs.preferences.value
  return { wallpaper: p.wallpaper, wallpaperMode: p.wallpaperMode, backgroundColor: p.backgroundColor, uiScale: p.uiScale as UiScale, sounds: p.sounds }
}
const draft = reactive(fromPrefs())
const changed = computed(() => JSON.stringify(draft) !== JSON.stringify(fromPrefs()))

const previewStyle = computed(() => {
  const wp = WALLPAPERS.find(w => w.id === draft.wallpaper)
  const style: Record<string, string> = { backgroundColor: draft.backgroundColor }
  if (wp?.url) {
    style.backgroundImage = `url(${wp.url})`
    style.backgroundRepeat = draft.wallpaperMode === 'tile' ? 'repeat' : 'no-repeat'
    style.backgroundPosition = 'center'
    // Na miniatura, "lado a lado" e "centralizar" usam a imagem reduzida na proporção da tela.
    style.backgroundSize = draft.wallpaperMode === 'stretch' ? '100% 100%' : draft.wallpaperMode === 'tile' ? '25% auto' : '60% auto'
  }
  return style
})

function apply() {
  prefs.update({ ...draft })
}

async function ok() {
  if (changed.value) apply()
  await prefs.flush()
  await win.close()
}

// ---------- teste de sons ----------
let testDisk: ReturnType<typeof sounds.hardDisk> = null
const diskPlaying = ref(false)

function testSound(sound: 'startup' | 'error' | 'shutdown') {
  sounds.unlock()
  sounds.play(sound, { force: true })
}

async function testHardDisk() {
  sounds.unlock()
  if (diskPlaying.value) return
  testDisk = sounds.hardDisk({ force: true })
  if (!testDisk) return
  diskPlaying.value = true
  testDisk.start()
  setTimeout(async () => {
    await testDisk?.stop()
    diskPlaying.value = false
  }, 4000)
}

onBeforeUnmount(() => testDisk?.stop())

const colorId = useId()
</script>

<template>
  <div class="settings">
    <UiTabs v-model="tab" :tabs="tabs">
      <template #fundo>
        <div class="monitor" aria-hidden="true">
          <div class="monitor-screen" :style="previewStyle" data-test="settings-preview" />
          <div class="monitor-base" />
        </div>
        <div class="fundo-grid">
          <UiGroupBox label="Papel de parede">
            <ul class="wallpaper-list" role="listbox" aria-label="Papel de parede">
              <li
                v-for="w in WALLPAPERS"
                :key="w.id"
                role="option"
                tabindex="0"
                :aria-selected="draft.wallpaper === w.id"
                :class="{ selected: draft.wallpaper === w.id }"
                :data-test="`wallpaper-${w.id}`"
                @click="draft.wallpaper = w.id"
                @keydown.enter="draft.wallpaper = w.id"
              >
                {{ w.label }}
              </li>
            </ul>
            <UiSelect v-model="draft.wallpaperMode" label="Exibir:" :options="MODES" :disabled="draft.wallpaper === 'none'" />
          </UiGroupBox>
          <UiGroupBox label="Cor">
            <div class="swatches" role="radiogroup" aria-label="Cor da área de trabalho">
              <button
                v-for="c in COLORS"
                :key="c.value"
                type="button"
                class="swatch"
                :class="{ selected: draft.backgroundColor === c.value }"
                :style="{ backgroundColor: c.value }"
                role="radio"
                :aria-checked="draft.backgroundColor === c.value"
                :aria-label="c.label"
                :title="c.label"
                :data-test="`color-${c.value.slice(1)}`"
                @click="draft.backgroundColor = c.value"
              />
            </div>
            <div class="custom-color">
              <label :for="colorId">Outra cor:</label>
              <input :id="colorId" v-model="draft.backgroundColor" type="color">
            </div>
          </UiGroupBox>
        </div>
      </template>

      <template #aparencia>
        <UiGroupBox label="Tamanho da interface">
          <UiRadioGroup
            v-model="draft.uiScale"
            :options="scaleOptions"
            label="Tamanho da interface"
          />
          <p class="hint">
            A fonte pixel só fica nítida em tamanhos que cabem em pixels inteiros da sua tela, por isso só aparecem os
            degraus que funcionam bem nela. "Automática" escolhe o melhor para a sua tela. O mapa das cenas não é
            afetado — ele tem zoom próprio.
          </p>
        </UiGroupBox>
      </template>

      <template #sons>
        <UiGroupBox label="Sons do sistema">
          <UiCheckbox v-model="draft.sounds" label="Tocar sons do sistema" data-test="settings-sounds" />
          <p class="hint">Sons de inicialização, avisos e do desligamento. Todos são sintetizados pelo navegador.</p>
          <div class="sound-tests">
            <button type="button" @click="testSound('startup')">Inicialização</button>
            <button type="button" @click="testSound('error')">Aviso</button>
            <button type="button" @click="testSound('shutdown')">Desligamento</button>
            <button type="button" :disabled="diskPlaying" @click="testHardDisk">{{ diskPlaying ? 'Tocando…' : 'Disco rígido' }}</button>
          </div>
        </UiGroupBox>
      </template>
    </UiTabs>

    <div class="settings-buttons">
      <button type="button" class="default" data-test="settings-ok" @click="ok">OK</button>
      <button type="button" @click="win.close()">Cancelar</button>
      <button type="button" :disabled="!changed" data-test="settings-apply" @click="apply">Aplicar</button>
    </div>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  gap: var(--sp-3);
}

/* Monitor desenhado em CSS, como em "Propriedades de Vídeo" */
.monitor {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 auto var(--sp-2);
}
.monitor-screen {
  width: 176px;
  height: 128px;
  border: 10px solid #c0bfa5;
  border-bottom-width: 16px;
  box-shadow: inset 0 0 0 2px #000, 2px 2px 0 #807f6b;
  background-color: var(--c-desktop);
}
.monitor-base {
  width: 80px;
  height: 10px;
  background: #c0bfa5;
  box-shadow: 2px 2px 0 #807f6b;
  clip-path: polygon(15% 0, 85% 0, 100% 100%, 0 100%);
}

.fundo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3);
}
.wallpaper-list {
  margin: 0;
  padding: 2px;
  list-style: none;
  height: 64px;
  overflow: auto;
  background: var(--c-window);
  box-shadow: var(--bevel-sunken);
}
.wallpaper-list li {
  padding: 0 var(--sp-2);
  cursor: default;
}
.wallpaper-list li.selected {
  background: var(--c-selection);
  color: var(--c-selection-text);
}
.swatches {
  display: grid;
  grid-template-columns: repeat(4, 24px);
  gap: var(--sp-2);
}
.swatch {
  width: 24px;
  height: 20px;
  min-width: 0;
  min-height: 0;
  padding: 0;
  box-shadow: var(--bevel-thin-sunken);
}
.swatch.selected {
  outline: 2px solid var(--c-text);
  outline-offset: 1px;
}
.custom-color {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.custom-color input {
  width: 48px;
  height: 22px;
  padding: 0;
}
.hint {
  margin: 0;
  color: var(--c-shadow);
}
.sound-tests {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}
.settings-buttons {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-2);
  flex-shrink: 0;
}
.settings-buttons button {
  min-width: 75px;
}
@media (max-width: 480px) {
  .fundo-grid {
    grid-template-columns: 1fr;
  }
}
</style>
