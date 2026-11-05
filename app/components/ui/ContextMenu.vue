<script setup lang="ts">
/**
 * Menu de contexto (botão direito, Shift+F10, tecla Menu ou toque longo).
 * Abre na posição (x, y) em coordenadas de tela (clientX/clientY).
 */
import type { MenuItemDef } from '~/utils/menu'

withDefaults(defineProps<{
  open: boolean
  x: number
  y: number
  items: MenuItemDef[]
  /** Abrir pelo teclado destaca o primeiro item. */
  viaKeyboard?: boolean
  label?: string
}>(), {
  viaKeyboard: false,
  label: 'Menu de contexto',
})

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <UiPopup :open="open" :x="x" :y="y" placement="point" :close-on-escape="false" @close="emit('close')">
    <UiMenu
      :items="items"
      :initial-index="viaKeyboard ? 0 : -1"
      :label="label"
      @close="emit('close')"
      @navigate="() => {}"
    />
  </UiPopup>
</template>
