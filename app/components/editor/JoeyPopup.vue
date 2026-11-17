<script setup lang="ts">
/**
 * Joey (o d20 mascote) mostra o resultado de uma rolagem: o GIF toca uma vez (a cada rolagem
 * nova ele é recriado para reiniciar) e o balão aponta para ele. Some sozinho depois de um tempo.
 */
import { useDiceSession } from '~~/composables/useDiceSession'
import { dieText, rollSummaryParts } from '~~/lib/rollDice'

const props = withDefaults(defineProps<{ scope?: 'local' | 'room'; fixed?: boolean }>(), { scope: 'room', fixed: false })
const emit = defineEmits<{ newRoll: [] }>()
const session = useDiceSession(props.scope)
const latest = session.latest

const VISIBLE_MS = 15000
let hideTimer: ReturnType<typeof setTimeout> | null = null

watch(() => session.joeyTick.value, () => {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => { session.joeyVisible.value = false }, VISIBLE_MS)
})
onBeforeUnmount(() => { if (hideTimer) clearTimeout(hideTimer) })

function close() {
  session.joeyVisible.value = false
}

// Arrastar pela barra de título: Joey e o balão se movem juntos (deslocamento sobre a posição
// padrão no canto). A posição vale enquanto o componente existir, então as próximas rolagens
// aparecem onde o usuário o deixou. Não sai da área visível da página.
const rootEl = ref<HTMLElement | null>(null)
const offset = ref({ x: 0, y: 0 })

function onDragStart(event: PointerEvent) {
  const root = rootEl.value
  // O X da barra de título não inicia arraste (a captura do ponteiro roubaria o clique dele).
  if (!root || event.button !== 0 || (event.target as HTMLElement).closest('button')) return
  // Zoom da interface (body.desktop-mode): o deslocamento é em px CSS, o ponteiro em px de tela.
  const zoom = root.getBoundingClientRect().width / root.offsetWidth || 1
  const rect = root.getBoundingClientRect()
  const start = { px: event.clientX, py: event.clientY, x: offset.value.x, y: offset.value.y }
  event.preventDefault()
  // Ouve na janela do navegador, não com setPointerCapture: clicar no Joey foca a janela da sala,
  // e o gerenciador de janelas reordena o DOM — o que cancela a captura no meio do arraste.
  const onMove = (ev: PointerEvent) => {
    if (ev.pointerId !== event.pointerId) return
    const dx = Math.min(Math.max(ev.clientX - start.px, -rect.left), window.innerWidth - rect.right)
    const dy = Math.min(Math.max(ev.clientY - start.py, -rect.top), window.innerHeight - rect.bottom)
    offset.value = { x: start.x + dx / zoom, y: start.y + dy / zoom }
  }
  const onUp = (ev: PointerEvent) => {
    if (ev.pointerId !== event.pointerId) return
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}
</script>

<template>
  <div
    v-if="session.joeyVisible.value && latest"
    ref="rootEl"
    class="joey"
    :class="{ fixed }"
    :style="{ transform: `translate(${offset.x}px, ${offset.y}px)` }"
    role="status"
    aria-live="polite"
  >
    <div class="balloon">
        <p class="who">
          {{ latest.by }} rolou {{ latest.input }}<strong v-if="latest.hidden"> (escondida)</strong>
        </p>
        <div class="dice">
          <span v-for="(value, i) in latest.rolls" :key="i" class="die" :class="{ dropped: latest.dropped[i] }">
            <DiceFace :faces="latest.faces[i]!" :size="24" :dropped="latest.dropped[i]" />
            <span>{{ dieText(latest, latest.faces[i]!, value) }}</span>
          </span>
        </div>
        <p v-if="rollSummaryParts(latest).length === 1" class="total">{{ rollSummaryParts(latest)[0] }}</p>
        <ul v-else class="parts">
          <li v-for="part in rollSummaryParts(latest)" :key="part">{{ part }}</li>
        </ul>
        <!-- Opções no estilo do assistente do Office: marcador azul + texto em negrito, sem cara de botão. -->
        <ul class="options">
          <li><button type="button" class="option" @click="emit('newRoll')"><img class="bullet" src="/assets/icons/joey-bullet.png" alt="" width="13" height="13"><span>Nova rolagem</span></button></li>
          <li><button type="button" class="option" @click="close"><img class="bullet" src="/assets/icons/joey-bullet.png" alt="" width="13" height="13"><span>Fechar</span></button></li>
        </ul>
      </div>
    <!-- A moldura de janela envolve só a imagem do Joey. -->
    <UiWindow class="joey-window" title="Joey" icon="dice" variant="tool" :scroll-body="false" @close="close" @drag-start="onDragStart">
      <img
        :key="session.joeyTick.value"
        class="joey-gif"
        :src="`/assets/gifs/dicey_wink_once.gif?t=${session.joeyTick.value}`"
        alt="Joey, o d20 mascote"
        width="128"
        height="128"
      >
    </UiWindow>
  </div>
</template>

<style scoped>
.joey {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 5;
  display: flex;
  align-items: flex-end;
  gap: 20px;
  max-width: calc(100% - 32px);
}
.joey.fixed { position: fixed; bottom: 48px; z-index: 9000; }
.joey-window { flex: none; width: max-content; }
/* O GIF encosta na moldura: sem o respiro que a variante "tool" dá ao corpo da janela. */
.joey-window :deep(.ui-window-body) { padding: 0; }
.joey-gif { display: block; flex: none; }
.balloon {
  position: relative;
  max-width: 260px;
  padding: var(--sp-3) var(--sp-4);
  margin-bottom: 24px;
  background: var(--c-tooltip);
  border: 2px solid var(--c-dark-shadow);
  border-radius: 12px;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  align-items: flex-start;
}
/* Rabinho do balão apontando para o Joey (à direita). */
.balloon::before,
.balloon::after {
  content: "";
  position: absolute;
  border-style: solid;
  border-top-color: transparent;
  border-bottom-color: transparent;
  border-right-color: transparent;
}
.balloon::before { right: -18px; bottom: 24px; border-width: 8px 0 8px 18px; border-left-color: var(--c-dark-shadow); }
.balloon::after { right: -14px; bottom: 26px; border-width: 6px 0 6px 14px; border-left-color: var(--c-tooltip); }
.balloon p { margin: 0; }
.dice { display: flex; flex-wrap: wrap; gap: var(--sp-3); }
.die { display: inline-flex; align-items: center; gap: var(--sp-2); }
.die.dropped { color: var(--c-text-disabled); }
.parts { list-style: none; margin: 0; padding: 0; font-weight: bold; }
.total { font-size: var(--fs-2); line-height: var(--lh-heading); }

.options { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--sp-2); }
/* Link, não botão: zera todo o visual de botão do 98.css. */
.option {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-3);
  min-width: 0;
  min-height: 0;
  padding: 0;
  margin: 0;
  border: 0;
  border-radius: 0;
  background: none;
  box-shadow: none;
  color: var(--c-text);
  font: inherit;
  font-weight: bold;
  text-align: left;
  cursor: pointer;
}
.option:hover span { text-decoration: underline; }
.option:active { box-shadow: none; padding: 0; }
.option:focus-visible { outline: 1px dotted var(--c-text); outline-offset: 2px; }
.bullet { image-rendering: pixelated; flex: none; }
</style>
