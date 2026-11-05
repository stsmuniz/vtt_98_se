<script setup lang="ts">
/**
 * Conteúdo do menu Iniciar: faixa lateral com o nome do sistema e os itens
 * (montados a partir do registro de apps). Visitantes de sala veem um menu
 * reduzido.
 */
import { APPS } from '~/desktop/apps'
import type { MenuItemDef } from '~/utils/menu'
import { useDesktop } from '~~/composables/useDesktop'

const props = withDefaults(defineProps<{ viaKeyboard?: boolean }>(), { viaKeyboard: false })
const emit = defineEmits<{ close: [] }>()

const desktop = useDesktop()
const route = useRoute()

function appItems(group: 'programs' | 'accessories'): MenuItemDef[] {
  return APPS.filter(a => a.startMenu === group).map(a => ({
    id: `start-${a.id}`,
    label: a.title,
    icon: a.icon,
    action: () => desktop.openApp(a.id),
  }))
}

const items = computed<MenuItemDef[]>(() => {
  if (desktop.isGuest.value) {
    return [
      { id: 'start-dice', label: '&Rolador de Dados', icon: 'dice', action: () => desktop.openApp('dice') },
      { id: 'start-help', label: 'Aj&uda', icon: 'help', action: () => desktop.openHelp() },
      { id: 'start-fullscreen', label: '&Tela cheia', icon: 'fullscreen', action: () => desktop.toggleFullscreen() },
      { type: 'separator' },
      { id: 'start-login', label: '&Entrar…', icon: 'logoff', action: () => navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`) },
      { id: 'start-leave', label: '&Sair da sala', icon: 'shutdown', action: () => navigateTo('/') },
    ]
  }
  const name = desktop.user.value?.name ?? ''
  return [
    {
      id: 'start-programs',
      label: '&Programas',
      icon: 'programs',
      items: [
        ...appItems('programs'),
        { id: 'start-accessories', label: '&Acessórios', icon: 'accessories', items: appItems('accessories') },
      ],
    },
    { id: 'start-settings', label: '&Configurações', icon: 'settings', action: () => desktop.openApp('settings') },
    { id: 'start-help', label: 'Aj&uda', icon: 'help', action: () => desktop.openHelp() },
    { id: 'start-user', label: 'U&suário', icon: 'users', action: () => desktop.openApp('user-account') },
    { type: 'separator' },
    { id: 'start-logoff', label: `&Efetuar logoff de ${name}…`, icon: 'logoff', action: () => desktop.logoff() },
    { id: 'start-shutdown', label: '&Desligar…', icon: 'shutdown', action: () => desktop.openShutdownDialog() },
  ]
})
</script>

<template>
  <div class="start-menu">
    <div class="start-banner" aria-hidden="true">
      <span class="start-banner-text"><strong>VTT</strong>98 SE</span>
    </div>
    <UiMenu
      class="start-menu-items"
      :items="items"
      :initial-index="props.viaKeyboard ? 0 : -1"
      large
      label="Iniciar"
      @close="emit('close')"
      @navigate="() => {}"
    />
  </div>
</template>

<style scoped>
.start-menu {
  display: flex;
  background: var(--c-surface);
  box-shadow: var(--bevel-raised);
  padding: 3px;
}
.start-banner {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 24px;
  background: linear-gradient(0deg, var(--c-title-active-from), var(--c-title-active-to));
}
.start-banner-text {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  padding: var(--sp-2) 0;
  color: var(--c-surface-light);
  font-family: var(--font-display);
  font-size: var(--fs-1);
  letter-spacing: 1px;
  white-space: nowrap;
}
.start-banner-text strong {
  color: var(--c-text-inverse);
  margin-bottom: 2px;
}
.start-menu-items {
  box-shadow: none;
  min-width: 190px;
}
</style>
