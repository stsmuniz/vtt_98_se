<script setup lang="ts">
/**
 * Painel de Controle: pasta de applets (Vídeo, Usuário, Status…) no mesmo layout das
 * pastas do Explorer do Win98 SE — barra lateral "página da Web" + lista de ícones.
 */
import { CONTROL_PANEL_APPLETS } from '~/desktop/controlPanel'
import type { ListViewItem } from '~/utils/listView'
import type { MenuDef } from '~/utils/menu'
import { useDesktop } from '~~/composables/useDesktop'
import { useWindow } from '~~/composables/useWindow'

const win = useWindow()
const desktop = useDesktop()

const items: (ListViewItem & { description: string })[] = CONTROL_PANEL_APPLETS.map(a => ({
  id: a.appId,
  name: a.name,
  icon: a.icon,
  description: a.description,
}))

const selected = ref<string | number | null>(null)
const selectedItem = computed(() => items.find(i => i.id === selected.value) ?? null)

function open(item: ListViewItem | null) {
  if (item) desktop.openApp(String(item.id))
}

const menus = computed<MenuDef[]>(() => [
  {
    id: 'arquivo',
    label: '&Arquivo',
    items: [
      { id: 'abrir', label: '&Abrir', default: true, disabled: !selectedItem.value, action: () => open(selectedItem.value) },
      { type: 'separator' },
      { id: 'fechar', label: '&Fechar', action: () => win.close() },
    ],
  },
  {
    id: 'ajuda',
    label: 'Aj&uda',
    items: [{ id: 'ajuda-painel', label: '&Ajuda sobre o Painel de Controle', icon: 'help', shortcut: 'F1', action: () => desktop.openHelp() }],
  },
])
win.setMenus(menus.value)
watch(menus, m => win.setMenus(m))
</script>

<template>
  <div class="control-panel">
    <div class="cp-body">
      <aside class="cp-sidebar" aria-label="Sobre o Painel de Controle">
        <div class="sidebar-head">
          <UiIcon name="control-panel" :size="48" />
          <h2 class="sidebar-title no-aa">Painel de Controle</h2>
        </div>
        <div class="sidebar-rainbow" aria-hidden="true" />
        <div v-if="selectedItem" class="sidebar-preview" data-test="cp-preview">
          <p class="preview-name">{{ selectedItem.name }}</p>
          <p>{{ selectedItem.description }}</p>
        </div>
        <div v-else class="sidebar-info">
          <p>Use as configurações do Painel de Controle para personalizar o VTT 98 SE.</p>
          <p>Selecione um item para ver sua descrição.</p>
        </div>
      </aside>

      <UiListView
        v-model:selected="selected"
        class="cp-list"
        data-test="control-panel-list"
        :items="items"
        view="icons"
        label="Painel de Controle"
        @open="open"
      />
    </div>

    <UiStatusBar>
      <UiStatusField grow>{{ items.length }} objeto(s)</UiStatusField>
      <UiStatusField grow>{{ selectedItem?.name ?? '' }}</UiStatusField>
    </UiStatusBar>
  </div>
</template>

<style scoped>
.control-panel {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  container-type: inline-size;
}

.cp-body {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  flex: 1 1 auto;
  min-height: 0;
  padding: var(--sp-1);
  box-shadow: var(--bevel-sunken);
}

/* Mesma barra lateral das pastas (Explorer do Win98 SE) */
.cp-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  min-height: 0;
  overflow: auto;
  padding: var(--sp-4) var(--sp-3);
  background: var(--c-window) url('/assets/backgrounds/directory_sidebar_bg.jpg') left top / auto no-repeat;
  box-shadow: inset 1px 1px var(--c-shadow), inset 0 -1px var(--c-highlight);
  color: var(--c-text);
  background-size: 250px;
}
.sidebar-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sp-2);
}
.sidebar-head img {
  image-rendering: pixelated;
}
.sidebar-title {
  margin: 0;
  font-family: var(--font-sidebar);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
  overflow-wrap: anywhere;
}
.sidebar-rainbow {
  height: 3px;
  flex-shrink: 0;
  background: linear-gradient(90deg, #f00, #f80, #ff0, #0c0, #00f, #808);
}
.sidebar-info p,
.sidebar-preview p {
  margin: 0 0 var(--sp-2);
}
.preview-name {
  font-weight: bold;
  overflow-wrap: anywhere;
}

.cp-list {
  min-width: 0;
}

/* Janela estreita: some a barra lateral (como no Explorer) */
@container (max-width: 420px) {
  .cp-body {
    grid-template-columns: minmax(0, 1fr);
  }
  .cp-sidebar {
    display: none;
  }
}
</style>
