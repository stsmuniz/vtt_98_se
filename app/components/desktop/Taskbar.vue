<script setup lang="ts">
/**
 * Barra de tarefas: botão Iniciar, um botão por janela aberta e a bandeja com
 * o relógio. Clique no botão da janela ativa minimiza; nas outras, restaura e
 * foca. Botão direito no botão da janela abre o menu da janela.
 */
import type { MenuItemDef } from '~/utils/menu'
import { iconUrl } from '~/utils/icons'
import { useWindowManager } from '~~/composables/useWindowManager'
import { useDesktop } from '~~/composables/useDesktop'

const wm = useWindowManager()
const desktop = useDesktop()

const startButton = ref<HTMLElement | null>(null)
const startViaKeyboard = ref(false)

function toggleStart(viaKeyboard = false) {
  startViaKeyboard.value = viaKeyboard
  desktop.startMenuOpen.value = !desktop.startMenuOpen.value
}

defineExpose({ toggleStart })

// ---------- relógio ----------
const now = ref(new Date())
let clockTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => { clockTimer = setInterval(() => { now.value = new Date() }, 15_000) })
onBeforeUnmount(() => { if (clockTimer) clearInterval(clockTimer) })
const clock = computed(() => now.value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
const clockTitle = computed(() => now.value.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))

// ---------- menu da janela (botão direito) ----------
const winMenu = reactive({ open: false, x: 0, y: 0, id: '' })
const winMenuItems = computed<MenuItemDef[]>(() => {
  const w = wm.get(winMenu.id)
  if (!w) return []
  return [
    { id: 'win-restore', label: '&Restaurar', disabled: w.state === 'normal', action: () => wm.restore(w.id) },
    { id: 'win-minimize', label: 'Mi&nimizar', disabled: w.state === 'minimized' || !w.minimizable, action: () => wm.minimize(w.id) },
    { id: 'win-maximize', label: 'Ma&ximizar', disabled: w.state === 'maximized' || !w.maximizable, action: () => wm.maximize(w.id) },
    { type: 'separator' },
    { id: 'win-close', label: '&Fechar', default: true, action: () => wm.close(w.id) },
  ]
})

function openWinMenu(id: string, event: MouseEvent) {
  Object.assign(winMenu, { open: true, x: event.clientX, y: event.clientY, id })
}
</script>

<template>
  <div class="taskbar" role="toolbar" aria-label="Barra de tarefas">
    <button
      ref="startButton"
      type="button"
      class="start-button"
      :class="{ pressed: desktop.startMenuOpen.value }"
      aria-haspopup="menu"
      :aria-expanded="desktop.startMenuOpen.value"
      data-test="start-button"
      @pointerdown.prevent="toggleStart(false)"
      @keydown.enter.prevent="toggleStart(true)"
      @keydown.space.prevent="toggleStart(true)"
    >
      <img :src="iconUrl('logo')" alt="" width="18" height="18">
      <strong>Iniciar</strong>
    </button>

    <span class="taskbar-sep" aria-hidden="true" />

    <div class="taskbar-windows">
      <button
        v-for="w in wm.taskbarWindows.value"
        :key="w.id"
        type="button"
        class="taskbar-window"
        :class="{ active: wm.state.value.activeId === w.id && w.state !== 'minimized' }"
        :title="w.title"
        :data-window-id="w.id"
        @click="wm.toggleFromTaskbar(w.id)"
        @contextmenu.prevent="openWinMenu(w.id, $event)"
      >
        <img :src="iconUrl(w.icon, 16)" alt="" width="16" height="16">
        <span class="taskbar-window-title">{{ w.title }}</span>
      </button>
    </div>

    <div class="taskbar-tray">
      <time class="taskbar-clock" :title="clockTitle">{{ clock }}</time>
    </div>

    <UiPopup
      :open="desktop.startMenuOpen.value"
      :anchor="startButton"
      placement="top-start"
      :close-on-escape="false"
      @close="desktop.startMenuOpen.value = false"
    >
      <DesktopStartMenu :via-keyboard="startViaKeyboard" @close="desktop.startMenuOpen.value = false" />
    </UiPopup>

    <UiContextMenu
      :open="winMenu.open"
      :x="winMenu.x"
      :y="winMenu.y"
      :items="winMenuItems"
      label="Menu da janela"
      @close="winMenu.open = false"
    />
  </div>
</template>

<style scoped>
.taskbar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-taskbar);
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  height: var(--taskbar-h);
  padding: 2px;
  background: var(--c-surface);
  box-shadow: inset 0 1px var(--c-surface-light), inset 0 2px var(--c-highlight);
  font-family: var(--font-ui);
  font-size: var(--fs-1);
  user-select: none;
}

.start-button {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
  height: 100%;
  padding: 0 var(--sp-2);
  font: inherit;
}
.start-button.pressed {
  box-shadow: var(--bevel-sunken);
  padding: 1px var(--sp-2) 0 calc(var(--sp-2) + 1px);
}
.start-button img {
  image-rendering: pixelated;
}

.taskbar-sep {
  align-self: stretch;
  width: 0;
  margin: 2px 1px;
  border-left: 1px solid var(--c-shadow);
  border-right: 1px solid var(--c-highlight);
}

.taskbar-windows {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  gap: 3px;
  height: 100%;
}

.taskbar-window {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  flex: 0 1 160px;
  min-width: 40px;
  height: 100%;
  padding: 0 var(--sp-2);
  justify-content: flex-start;
  font: inherit;
  text-align: left;
}
.taskbar-window img {
  flex-shrink: 0;
  image-rendering: pixelated;
}
.taskbar-window-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* Janela ativa: afundado com fundo pontilhado */
.taskbar-window.active {
  box-shadow: var(--bevel-sunken);
  background-image: repeating-conic-gradient(var(--c-highlight) 0 25%, var(--c-surface) 0 50%);
  background-size: 2px 2px;
  font-weight: bold;
}

.taskbar-tray {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 var(--sp-3);
  box-shadow: var(--bevel-thin-sunken);
}
.taskbar-clock {
  white-space: nowrap;
}

@media (max-width: 480px) {
  .taskbar-window {
    flex-basis: 40px;
  }
  .taskbar-window-title {
    display: none;
  }
}
</style>
