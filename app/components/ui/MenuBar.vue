<script setup lang="ts">
/**
 * Barra de menus de uma janela (Arquivo, Editar, Exibir…), orientada a dados.
 *
 * Clique abre/fecha; com um menu aberto, passar o mouse sobre outro título troca
 * de menu; ←/→ dentro do menu passam para o vizinho. `openMenu(index, viaKeyboard)`
 * fica exposto para a janela tratar Alt+letra / F10.
 */
import { toValue } from 'vue'
import { normalizeKey, parseMenuLabel, resolveItems, type MenuDef } from '~/utils/menu'

const props = defineProps<{ menus: MenuDef[] }>()

const openIndex = ref(-1)
const openedViaKeyboard = ref(false)
const buttonEls = ref<(HTMLElement | null)[]>([])
const parsed = computed(() => props.menus.map(m => parseMenuLabel(m.label)))

function isDisabled(i: number) {
  return Boolean(toValue(props.menus[i]?.disabled))
}

function openMenu(index: number, viaKeyboard = false) {
  if (index < 0 || index >= props.menus.length || isDisabled(index)) return
  openedViaKeyboard.value = viaKeyboard
  openIndex.value = index
}

function close() {
  openIndex.value = -1
}

function toggle(index: number) {
  if (openIndex.value === index) close()
  else openMenu(index)
}

function onHover(index: number) {
  if (openIndex.value !== -1 && openIndex.value !== index) openMenu(index, openedViaKeyboard.value)
}

function navigate(direction: -1 | 1) {
  const n = props.menus.length
  let next = openIndex.value
  for (let step = 0; step < n; step++) {
    next = (next + direction + n) % n
    if (!isDisabled(next)) break
  }
  openMenu(next, true)
}

/** Alt+letra: abre o menu cujo mnemônico casa com a tecla. Retorna se tratou. */
function openByAccessKey(key: string): boolean {
  const k = normalizeKey(key)
  const index = parsed.value.findIndex((p, i) => p.accessKey === k && !isDisabled(i))
  if (index === -1) return false
  openMenu(index, true)
  return true
}

defineExpose({ openMenu, openByAccessKey, close, isOpen: computed(() => openIndex.value !== -1) })
</script>

<template>
  <div class="ui-menubar" role="menubar">
    <div v-for="(menu, i) in menus" :key="menu.id ?? i" class="ui-menubar-entry">
      <button
        :ref="(el) => { buttonEls[i] = el as HTMLElement | null }"
        type="button"
        class="ui-menubar-button"
        :class="{ open: openIndex === i }"
        role="menuitem"
        aria-haspopup="menu"
        :aria-expanded="openIndex === i"
        :disabled="isDisabled(i)"
        @pointerdown.prevent="toggle(i)"
        @pointerenter="onHover(i)"
        @keydown.enter.prevent="openMenu(i, true)"
        @keydown.down.prevent="openMenu(i, true)"
      >{{ parsed[i]!.before }}<u v-if="parsed[i]!.key">{{ parsed[i]!.key }}</u>{{ parsed[i]!.after }}</button>

      <UiPopup :open="openIndex === i" :anchor="buttonEls[i]" placement="bottom-start" :close-on-escape="false" @close="close">
        <UiMenu
          :items="resolveItems(menu.items)"
          :initial-index="openedViaKeyboard ? 0 : -1"
          :label="parsed[i]!.text"
          @close="close"
          @navigate="navigate"
        />
      </UiPopup>
    </div>
  </div>
</template>

<style scoped>
.ui-menubar {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  padding: 1px 2px;
  font-family: var(--font-ui);
  font-size: var(--fs-1);
  user-select: none;
}

/* Botões planos: sem o relevo padrão do 98.css */
.ui-menubar-button {
  min-width: 0;
  min-height: 0;
  padding: 2px var(--sp-3);
  border: none;
  background: transparent;
  box-shadow: none;
  font: inherit;
  color: var(--c-text);
}
.ui-menubar-button:focus {
  outline: none;
}
.ui-menubar-button:focus-visible {
  outline: 1px dotted var(--c-text);
  outline-offset: -2px;
}
.ui-menubar-button.open,
.ui-menubar-button:active {
  background: var(--c-selection);
  color: var(--c-selection-text);
  box-shadow: none;
  padding: 2px var(--sp-3);
}
.ui-menubar-button:disabled {
  color: var(--c-text-disabled);
  text-shadow: 1px 1px 0 var(--c-highlight);
}
</style>
