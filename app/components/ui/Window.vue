<script setup lang="ts">
/**
 * Moldura de janela Win98 — a ÚNICA implementação de janela do sistema.
 *
 * É puramente visual: posição, tamanho, foco, minimizar/maximizar e z-index
 * ficam com quem a usa (o gerenciador de janelas na área de trabalho, ou um
 * contêiner simples numa página). Por isso ela só emite eventos.
 *
 * Estrutura: barra de título · barra de menus (prop `menus`) · slot `toolbar`
 * · corpo (slot padrão) · slot `statusbar` · slot `footer` (botões de diálogo).
 *
 * Variantes:
 *   window — janela de aplicativo (corpo sem padding, ocupa a altura toda)
 *   dialog — caixa de diálogo (corpo com padding, rodapé de botões à direita)
 *   tool   — janela auxiliar pequena (iniciativa, propriedades do token)
 */
import type { IconName } from '~/utils/icons'
import type { MenuDef } from '~/utils/menu'

const props = withDefaults(defineProps<{
  title: string
  icon?: IconName
  active?: boolean
  variant?: 'window' | 'dialog' | 'tool'
  menus?: MenuDef[]
  minimizable?: boolean
  maximizable?: boolean
  maximized?: boolean
  closable?: boolean
  helpable?: boolean
  /** Ocupar 100% da altura do contêiner (janelas do gerenciador). */
  fill?: boolean
  /** Corpo com rolagem própria. Desligue para conteúdos que gerenciam a rolagem (canvas, ListView). */
  scrollBody?: boolean
}>(), {
  icon: undefined,
  active: true,
  variant: 'window',
  menus: undefined,
  minimizable: false,
  maximizable: false,
  maximized: false,
  closable: true,
  helpable: false,
  fill: false,
  scrollBody: true,
})

const emit = defineEmits<{
  'drag-start': [event: PointerEvent]
  'title-dblclick': [event: MouseEvent]
  minimize: []
  maximize: []
  restore: []
  help: []
  close: []
}>()

const menuBar = ref<{ openByAccessKey: (key: string) => boolean; openMenu: (i: number, k?: boolean) => void } | null>(null)

const titleId = useId()

defineExpose({
  /** Alt+letra abre o menu correspondente; retorna se havia menu com essa letra. */
  openMenuByAccessKey: (key: string) => menuBar.value?.openByAccessKey(key) ?? false,
  /** F10: abre o primeiro menu. */
  openFirstMenu: () => menuBar.value?.openMenu(0, true),
})

function onTitleDblClick(event: MouseEvent) {
  emit('title-dblclick', event)
}
</script>

<template>
  <section
    class="window ui-window"
    :class="[`ui-window--${variant}`, { 'ui-window--fill': fill, 'ui-window--maximized': maximized }]"
    role="dialog"
    :aria-labelledby="titleId"
  >
    <UiTitleBar
      :id="titleId"
      :title="title"
      :icon="icon"
      :active="active"
      :minimizable="minimizable && variant !== 'dialog'"
      :maximizable="maximizable && variant !== 'dialog'"
      :maximized="maximized"
      :closable="closable"
      :helpable="helpable"
      @drag-start="emit('drag-start', $event)"
      @dblclick="onTitleDblClick"
      @minimize="emit('minimize')"
      @maximize="emit('maximize')"
      @restore="emit('restore')"
      @help="emit('help')"
      @close="emit('close')"
    />

    <UiMenuBar v-if="menus?.length" ref="menuBar" :menus="menus" class="ui-window-menubar" />

    <div v-if="$slots.toolbar" class="ui-window-toolbar">
      <slot name="toolbar" />
    </div>

    <div class="window-body ui-window-body" :class="{ scroll: scrollBody }">
      <slot />
    </div>

    <div v-if="$slots.footer" class="ui-window-footer">
      <slot name="footer" />
    </div>

    <div v-if="$slots.statusbar" class="ui-window-statusbar">
      <slot name="statusbar" />
    </div>
  </section>
</template>

<style scoped>
.ui-window {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  max-width: 100%;
  font-family: var(--font-ui);
  font-size: var(--fs-1);
  color: var(--c-text);
}
.ui-window--fill {
  width: 100%;
  height: 100%;
}
/* Maximizada: sem a borda externa em relevo, como no Win98 */
.ui-window--maximized {
  box-shadow: none;
  padding: 0;
}

.ui-window-menubar {
  flex-shrink: 0;
}

.ui-window-toolbar {
  flex-shrink: 0;
  border-top: 1px solid var(--c-highlight);
  border-bottom: 1px solid var(--c-shadow);
}

.ui-window-body {
  flex: 1 1 auto;
  min-height: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}
.ui-window-body.scroll {
  overflow: auto;
}
.ui-window--window .ui-window-body {
  padding: 0;
}
.ui-window--dialog .ui-window-body,
.ui-window--tool .ui-window-body {
  padding: var(--sp-4);
  gap: var(--sp-3);
}

.ui-window-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--sp-3);
  padding: 0 var(--sp-4) var(--sp-4);
}
.ui-window--window .ui-window-footer {
  padding-top: var(--sp-3);
}

.ui-window-statusbar {
  flex-shrink: 0;
}
</style>
