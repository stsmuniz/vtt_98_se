<template>
  <ClientOnly>
    <div class="window main" @click="closeMenus">
      <div class="title-bar">
        <div class="title-bar-text">
          <img src="/assets/icons/desktop_mini.png" style="padding-right: 4px;"/>
          VTT 98 SE
        </div>
        <div class="title-bar-controls">
          <button aria-label="Close"></button>
        </div>
      </div>

      <nav class="window-menu-bar" v-if="menuBarVisible" @click.stop>
        <div class="window-menu">
          <!-- ===================== MENU ARQUIVO ===================== -->
          <div class="menu-root">
            <button class="menu-btn">Arquivo</button>
            <div class="dropdown">
              <div class="menu-item has-submenu">
                <span>Novo</span>
                <span class="arrow">▶</span>
                <div class="submenu">
                  <div class="menu-item" @mousedown.prevent="onAction('novo-token')">Token</div>
                  <div class="menu-item" @mousedown.prevent="onAction('novo-cenario')">Cenário</div>
                  <div class="menu-item" @mousedown.prevent="onAction('novo-cena')">Cena</div>
                </div>
              </div>

              <div class="menu-item" @mousedown.prevent="onAction('salvar')">Salvar</div>
              <hr class="menu-divider"/>
              <div class="menu-item" @mousedown.prevent="onAction('dashboard')">Dashboard</div>
              <hr class="menu-divider"/>
              <div class="menu-item" @mousedown.prevent="onAction('logout')">Logout</div>
            </div>
          </div>

          <!-- ===================== MENU JANELA ===================== -->
          <div class="menu-root">
            <button class="menu-btn">Janela</button>
            <div class="dropdown">
              <div class="menu-item" @mousedown.prevent="onAction('tela-cheia')">Tela Cheia</div>
            </div>
          </div>

          <!-- ===================== MENU AJUDA ===================== -->
          <div class="menu-root">
            <button class="menu-btn">Ajuda</button>
            <div class="dropdown">
              <div class="menu-item" @mousedown.prevent="onAction('ajuda')">Manual do VTT 98 SE</div>
            </div>
          </div>
        </div>
      </nav>
      <div class="window-menu-big-buttons" id="button-bar"></div>
      <div class="window-body">
        <slot name="default"/>
      </div>
      <HelpManualWindow
          v-if="isHelpManualWindowOpen"
          @close-window="isHelpManualWindowOpen = false"
      />
      <div id="footer-menu">

      </div>
      <div class="status-bar">
        <p class="status-bar-field">Pressione F1 para ajuda</p>
        <p class="status-bar-field">{{ flashText ?? statusText }}</p>
        <p class="status-bar-field">
          Usuário atual: {{ session.data?.user?.name || 'Desconhecido' }}
        </p>
      </div>
    </div>
  </ClientOnly>
</template>

<script lang="ts" setup>
import {authClient} from '~~/lib/auth-client'
import {useLoadingWindow} from '~~/composables/useLoadingWindow'
import {onMounted, onUnmounted, provide, reactive, ref} from 'vue'

const { withLoading } = useLoadingWindow()

const session = authClient.useSession()

// ============================================================
// Sistema de ações do menu (provide / inject)
// ============================================================
type MenuActionHandler = (payload?: any) => void | Promise<void>

const menuActions = reactive<Record<string, MenuActionHandler>>({})
const menuBarVisible = ref(true)
const statusText = ref('Dashboard')
const flashText = ref<string | null>(null)
let flashTimeout: ReturnType<typeof setTimeout> | null = null
const isHelpManualWindowOpen = ref(false)

function openHelpManual() {
  isHelpManualWindowOpen.value = true
}

/**
 * Permite que uma página sobrescreva o texto exibido na status bar (ex.: o
 * estado da sala em app/pages/rooms/[code].vue). A página deve restaurar
 * "Dashboard" (ou não fazer nada) ao ser desmontada.
 */
function setStatusText(text: string) {
  statusText.value = text
}

/**
 * Mostra brevemente uma mensagem na status bar (ex.: confirmação de "salvo com
 * sucesso" nos editores), sem sobrescrever permanentemente o statusText da página.
 */
function showStatusMessage(text: string, duration = 2000) {
  if (flashTimeout) clearTimeout(flashTimeout)
  flashText.value = text
  flashTimeout = setTimeout(() => {
    flashText.value = null
    flashTimeout = null
  }, duration)
}

/**
 * Permite que qualquer componente filho registre handlers.
 * Exemplo de uso em uma página:
 *
 * const { register } = useMenuActions()
 * register('salvar', () => { ... })
 */
function registerAction(name: string, handler: MenuActionHandler) {
  menuActions[name] = handler
}

function unregisterAction(name: string) {
  delete menuActions[name]
}

function setMenuBarVisible(visible: boolean) {
  menuBarVisible.value = visible
}

provide('menuActions', {
  register: registerAction,
  unregister: unregisterAction,
  actions: menuActions,
  setMenuBarVisible,
  setStatusText,
  showStatusMessage,
  openHelpManual,
})

// Função central que o layout chama
async function onAction(name: string, payload?: any) {
  const handler = menuActions[name]
  if (handler) {
    await handler(payload)
  } else {
    // fallback / log
    console.log(`[menu] ação sem handler: ${name}`, payload)
  }
  // fecha os menus após a ação
  closeMenus()
}

// Fecha todos os menus (remove focus)
function closeMenus() {
  const activeEl = document.activeElement as HTMLElement | null;

  // Se não houver elemento ativo, não faz nada
  if (!activeEl) return;

  // Verifica se o elemento ativo é um campo de texto/formulário
  const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT', 'LABEL'].includes(activeEl.tagName) || activeEl.isContentEditable;

  // Só remove o foco se NÃO for um campo de texto
  if (!isInputFocused) {
    activeEl.blur();
  }
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    }
  }
}

registerAction('tela-cheia', toggleFullScreen)
registerAction('dashboard', () => navigateTo('/dashboard'))
registerAction('logout', handleLogout)
registerAction('ajuda', openHelpManual)

// Atalho global F1 = abrir o manual de ajuda (funciona em qualquer página que use este layout)
function handleGlobalKeyDown(e: KeyboardEvent) {
  if (e.key === 'F1') {
    e.preventDefault()
    openHelpManual()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeyDown)
  document.body.classList.add('dashboard-desktop')
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown)
  document.body.classList.remove('dashboard-desktop')
})

async function handleLogout() {
  await withLoading(() => authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        navigateTo('/login')
      },
    },
  }), 'Saindo...')
}

</script>

<style>
/* ===== ESTILOS GLOBAIS (sem scoped) ===== */
html,
body,
#__nuxt {
  height: 100%;
  margin: 0;
  padding: 0;
}

/*
 * O fundo teal e o overflow:hidden simulam a área de trabalho do Windows 98,
 * mas só podem se aplicar enquanto este layout estiver montado — como estas
 * regras miram html/body (fora da árvore do componente), "scoped" não as
 * atinge, então a classe é adicionada/removida via onMounted/onUnmounted
 * abaixo. Sem isso, elas vazam para o layout `website` após uma navegação
 * client-side (SPA) para fora do dashboard.
 */
body.dashboard-desktop {
  background: teal;
  overflow: hidden;
}

/* Garante que qualquer wrapper do Nuxt também herde */
#__nuxt > div {
  height: 100%;
}
</style>

<style scoped>
/* ===== Janela principal ===== */
.window.main {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

/* ===== Corpo da janela ===== */
.window.main .window-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  margin: 2px;
  background: white;
  border: 2px solid;
  border-color: #808080 #ffffff #ffffff #808080;
}

/* ===== Barras que não encolhem ===== */
.title-bar,
.window-menu-bar,
.status-bar {
  flex-shrink: 0;
}

/* ===== Resto do menu (igual ao que você já tem) ===== */
.window-menu {
  display: flex;
  gap: 0;
  padding: 0;
}

.menu-root {
  position: relative;
}

.menu-btn {
  background: transparent;
  border: 1px solid transparent;
  padding: 0px 8px;
  cursor: pointer;
  color: #000;
  min-width: 40px;
  box-shadow: none;
}

.menu-btn:hover,
.menu-root:focus-within > .menu-btn {
  box-shadow: inset -1px -1px #0a0a0a, inset 1px 1px #fff,
  inset -2px -2px grey, inset 2px 2px #dfdfdf;
}

.menu-root:focus-within > .menu-btn {
  background: #000080;
  color: white;
  box-shadow: none;
}

.dropdown {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 180px;
  background: #c0c0c0;
  border: 2px solid;
  border-color: #ffffff #808080 #808080 #ffffff;
  padding: 2px 0;
  z-index: 1000;
}

.menu-root:focus-within > .dropdown {
  display: block;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 20px 4px 16px;
  color: #000;
  cursor: pointer;
  white-space: nowrap;
  position: relative;
}

.menu-item:hover {
  background: #000080;
  color: white;
}

.menu-item .arrow {
  margin-left: 24px;
}

.submenu {
  display: none;
  position: absolute;
  left: 100%;
  top: -2px;
  min-width: 150px;
  background: #c0c0c0;
  border: 2px solid;
  border-color: #ffffff #808080 #808080 #ffffff;
  padding: 2px 0;
  z-index: 1001;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.menu-item.has-submenu:hover > .submenu {
  display: block;
}

.menu-divider {
  border: none;
  border-top: 1px solid #808080;
  border-bottom: 1px solid #ffffff;
  margin: 2px 8px;
}

.window-menu-big-buttons {
  display: flex;
  gap: 0;
  background: #c0c0c0;
  flex-shrink: 0;
}
</style>