<script setup lang="ts">
/**
 * Camada flutuante posicionada (menus, submenus, menu de contexto, Iniciar).
 *
 * Enquanto mede o próprio tamanho fica com opacity 0 (e não visibility: hidden,
 * que impediria o menu de receber o foco ao montar).
 *
 * Renderiza em `#popup-layer` (criado pelo layout do desktop) ou, na falta dele,
 * no `body` — assim o popup nunca é cortado pelo `overflow` de uma janela.
 * Ajusta a posição para não sair da tela (vira para cima/esquerda) e fecha com
 * clique fora. Cliques dentro de QUALQUER popup (submenus aninhados) ou dentro
 * do elemento âncora não contam como "fora".
 */
type Placement = 'bottom-start' | 'top-start' | 'right-start' | 'point'

const props = withDefaults(defineProps<{
  open: boolean
  /** Elemento de referência (botão do menu, item com submenu). */
  anchor?: HTMLElement | null
  /** Coordenadas de tela (clientX/clientY) para placement 'point'. */
  x?: number
  y?: number
  placement?: Placement
  closeOnOutside?: boolean
  closeOnEscape?: boolean
}>(), {
  anchor: null,
  x: 0,
  y: 0,
  placement: 'bottom-start',
  closeOnOutside: true,
  closeOnEscape: true,
})

const emit = defineEmits<{ close: [reason: 'outside' | 'escape'] }>()

const popupEl = ref<HTMLElement | null>(null)
const target = ref<string | null>(null)
const pos = reactive({ left: 0, top: 0, visible: false })

onMounted(() => {
  target.value = document.querySelector('#popup-layer') ? '#popup-layer' : 'body'
})

/** Fator de zoom CSS do contêiner (escala da interface). Coordenadas de tela ÷ zoom = px CSS. */
function containerZoom(): number {
  const el = target.value ? document.querySelector(target.value) : null
  const zoom = (el as (HTMLElement & { currentCSSZoom?: number }) | null)?.currentCSSZoom
  return zoom && zoom > 0 ? zoom : 1
}

async function updatePosition() {
  pos.visible = false
  await nextTick()
  const el = popupEl.value
  if (!el) return

  const zoom = containerZoom()
  const vw = window.innerWidth / zoom
  const vh = window.innerHeight / zoom
  const w = el.offsetWidth
  const h = el.offsetHeight
  const r = props.anchor?.getBoundingClientRect()
  const rect = r
    ? { left: r.left / zoom, top: r.top / zoom, right: r.right / zoom, bottom: r.bottom / zoom }
    : { left: props.x / zoom, top: props.y / zoom, right: props.x / zoom, bottom: props.y / zoom }

  let left: number
  let top: number
  switch (props.placement) {
    case 'right-start':
      left = rect.right - 3
      top = rect.top - 3
      if (left + w > vw) left = rect.left - w + 3
      break
    case 'top-start':
      left = rect.left
      top = rect.top - h
      if (top < 0) top = rect.bottom
      break
    case 'point':
      left = rect.left
      top = rect.top
      if (left + w > vw) left = rect.left - w
      if (top + h > vh) top = rect.top - h
      break
    default: // bottom-start
      left = rect.left
      top = rect.bottom
      if (top + h > vh) top = rect.top - h
  }

  pos.left = Math.max(0, Math.min(left, vw - w))
  pos.top = Math.max(0, Math.min(top, vh - h))
  pos.visible = true
}

function onPointerDown(event: PointerEvent) {
  if (!props.closeOnOutside) return
  const t = event.target as Element | null
  if (!t) return
  if (t.closest('[data-ui-popup]')) return
  if (props.anchor?.contains(t)) return
  emit('close', 'outside')
}

function onKeyDown(event: KeyboardEvent) {
  if (props.closeOnEscape && event.key === 'Escape') {
    event.stopPropagation()
    emit('close', 'escape')
  }
}

function onViewportChange() {
  if (props.open) updatePosition()
}

watch(() => [props.open, props.x, props.y, props.anchor, target.value], () => {
  if (props.open && target.value) updatePosition()
}, { immediate: true })

watch(() => props.open, (open) => {
  if (!import.meta.client) return
  if (open) {
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('resize', onViewportChange)
  } else {
    document.removeEventListener('pointerdown', onPointerDown, true)
    window.removeEventListener('resize', onViewportChange)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown, true)
  window.removeEventListener('resize', onViewportChange)
})

defineExpose({ el: popupEl, updatePosition })
</script>

<template>
  <Teleport v-if="target && open" :to="target">
    <div
      ref="popupEl"
      class="ui-popup"
      data-ui-popup
      :style="{ left: `${pos.left}px`, top: `${pos.top}px`, opacity: pos.visible ? 1 : 0, pointerEvents: pos.visible ? undefined : 'none' }"
      @keydown="onKeyDown"
      @contextmenu.prevent
    >
      <slot />
    </div>
  </Teleport>
</template>

<style scoped>
.ui-popup {
  position: fixed;
  z-index: var(--z-popup);
}
</style>
