<script setup lang="ts">
/**
 * Área de trabalho do VTT 98 SE: papel de parede, ícones, janelas, barra de
 * tarefas e menu Iniciar. Atende /dashboard, o editor de cenas e a sala — como
 * as três rotas usam este layout, ele continua montado ao navegar entre elas,
 * e as janelas abertas sobrevivem à troca de página.
 *
 * Teclado (um único listener):
 *   F1 = Ajuda · Alt+I ou Ctrl+Esc = menu Iniciar · Alt+W (Shift volta) = alternar janelas
 *   o resto vai para a janela ativa (atalhos registrados com useWindow().shortcuts).
 */
import { useWindowManager, type WinEntry } from '~~/composables/useWindowManager'
import { useDesktop } from '~~/composables/useDesktop'
import { useDialog } from '~~/composables/useDialog'
import { usePreferences } from '~~/composables/usePreferences'
import { useSystemSounds } from '~~/composables/useSystemSounds'

const wm = useWindowManager()
const desktop = useDesktop()
const dialog = useDialog()
const prefs = usePreferences()
const sounds = useSystemSounds()

// ---------- preferências: papel de parede e escala ----------
const WALLPAPER_URLS: Record<string, string | null> = {
  none: null,
  clouds: '/assets/backgrounds/clouds_background.jpg',
}

const desktopStyle = computed(() => {
  const p = prefs.preferences.value
  const url = WALLPAPER_URLS[p.wallpaper] ?? null
  const style: Record<string, string> = { backgroundColor: p.backgroundColor }
  if (url) {
    style.backgroundImage = `url(${url})`
    style.backgroundRepeat = p.wallpaperMode === 'tile' ? 'repeat' : 'no-repeat'
    style.backgroundPosition = 'center'
    style.backgroundSize = p.wallpaperMode === 'stretch' ? '100% 100%' : 'auto'
  }
  return style
})

/** Escala efetiva: "Automática" alinha a fonte pixel aos pixels físicos em telas de alta densidade. */
const devicePixelRatio = ref(1)
const uiScale = computed(() => {
  const s = prefs.preferences.value.uiScale
  if (s !== 'auto') return s
  const dpr = devicePixelRatio.value
  return dpr < 1.5 ? 1 : Math.round(dpr) / dpr
})

watch(uiScale, (s) => {
  if (import.meta.client) document.documentElement.style.setProperty('--ui-scale', String(s))
}, { immediate: true })

function updateDpr() {
  devicePixelRatio.value = window.devicePixelRatio || 1
}

const areaEl = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

// ---------- alternador de janelas (Alt+W) ----------
const switcher = reactive({ open: false, index: 0, list: [] as WinEntry[] })

function stepSwitcher(direction: 1 | -1) {
  if (!switcher.open) {
    switcher.list = wm.switchOrder()
    if (!switcher.list.length) return
    switcher.open = true
    switcher.index = 0
  }
  const n = switcher.list.length
  switcher.index = (switcher.index + direction + n) % n
}

function finishSwitcher() {
  if (!switcher.open) return
  const chosen = switcher.list[switcher.index]
  switcher.open = false
  if (chosen) wm.focus(chosen.id)
}

function onKeyDown(event: KeyboardEvent) {
  // Com uma caixa de mensagem aberta, só ela responde ao teclado.
  if (dialog.queue.value.length) return

  if (event.key === 'F1') {
    event.preventDefault()
    desktop.openHelp()
    return
  }
  const startCombo = (event.altKey && !event.ctrlKey && event.key.toLowerCase() === 'i')
    || (event.ctrlKey && event.key === 'Escape')
  if (startCombo) {
    event.preventDefault()
    desktop.startMenuOpen.value = !desktop.startMenuOpen.value
    return
  }
  if (event.altKey && !event.ctrlKey && event.key.toLowerCase() === 'w') {
    event.preventDefault()
    stepSwitcher(event.shiftKey ? -1 : 1)
    return
  }
  if (event.key === 'Escape' && switcher.open) {
    switcher.open = false
    return
  }
  if (desktop.startMenuOpen.value) return
  wm.dispatchKey(event)
}

function onKeyUp(event: KeyboardEvent) {
  if (event.key === 'Alt') finishSwitcher()
}

function onWindowBlur() {
  // Alt+Tab do sistema com o alternador aberto: fecha sem trocar.
  switcher.open = false
}

/**
 * Clique no papel de parede (ou nos ícones): nenhuma janela ativa. Cliques em
 * menus, caixas de mensagem e barra de tarefas não contam — eles ficam fora da
 * área de trabalho e não podem tirar o foco da janela que os abriu.
 */
function onDesktopPointerDown(event: PointerEvent) {
  const t = event.target as HTMLElement
  if (t.closest('.desktop-area') && !t.closest('.wm-frame')) wm.blurAll()
}

onMounted(() => {
  updateDpr()
  window.addEventListener('resize', updateDpr)
  // Som de inicialização depois de carregar as preferências (que podem tê-lo desligado).
  prefs.load().then(() => { if (!desktop.isGuest.value) sounds.playStartupOnce() })
  window.addEventListener('pointerdown', sounds.unlock, { once: true })
  window.addEventListener('keydown', sounds.unlock, { once: true })
  document.body.classList.add('desktop-mode')
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onWindowBlur)
  if (areaEl.value) {
    resizeObserver = new ResizeObserver(([e]) => {
      if (e) wm.setArea(Math.round(e.contentRect.width), Math.round(e.contentRect.height))
    })
    resizeObserver.observe(areaEl.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateDpr)
  document.documentElement.style.removeProperty('--ui-scale')
  document.body.classList.remove('desktop-mode')
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onWindowBlur)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="desktop" :style="desktopStyle" data-test="desktop" @pointerdown="onDesktopPointerDown">
    <div ref="areaEl" class="desktop-area">
      <DesktopIcons v-if="!desktop.isGuest.value" />
      <div id="wm-layer" class="wm-layer">
        <DesktopWindowLayer />
      </div>
    </div>

    <!-- Páginas (editor, sala) renderizam aqui uma DesktopRouteWindow, que vai para #wm-layer -->
    <slot />

    <DesktopTaskbar />
    <DesktopWindowSwitcher v-if="switcher.open" :windows="switcher.list" :index="switcher.index" />
    <div id="popup-layer" class="popup-layer" />
    <DesktopShutdownDialog v-if="desktop.shutdownDialogOpen.value" />
    <DesktopShutdownScreen v-if="desktop.shuttingDown.value" />
  </div>
</template>

<style>
/* Só enquanto a área de trabalho está montada (a classe é removida ao sair, para não vazar no site). */
body.desktop-mode {
  margin: 0;
  overflow: hidden;
  background: var(--c-desktop);
  /* Escala da interface (Configurações > Aparência). O canvas do Konva desfaz o zoom. */
  zoom: var(--ui-scale, 1);
}
</style>

<style scoped>
.desktop {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: var(--c-desktop);
  font-family: var(--font-ui);
  font-size: var(--fs-1);
}

.desktop-area {
  position: absolute;
  inset: 0 0 var(--taskbar-h) 0;
  overflow: hidden;
}

.wm-layer {
  position: absolute;
  inset: 0;
  z-index: var(--z-windows);
  /* A camada não bloqueia os ícones; só as janelas recebem cliques. */
  pointer-events: none;
}

.popup-layer {
  position: absolute;
  inset: 0;
  z-index: var(--z-popup);
  pointer-events: none;
}
.popup-layer > :deep(*) {
  pointer-events: auto;
}
</style>
