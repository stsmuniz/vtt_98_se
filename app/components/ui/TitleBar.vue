<script setup lang="ts">
/**
 * Barra de título de janela. Puramente visual: arrastar/maximizar ao dar
 * duplo clique são tratados por quem a usa (eventos drag-start/dblclick).
 */
import type { IconName } from '~/utils/icons'

withDefaults(defineProps<{
  title: string
  icon?: IconName
  active?: boolean
  minimizable?: boolean
  maximizable?: boolean
  maximized?: boolean
  closable?: boolean
  helpable?: boolean
}>(), {
  icon: undefined,
  active: true,
  minimizable: false,
  maximizable: false,
  maximized: false,
  closable: true,
  helpable: false,
})

const emit = defineEmits<{
  'drag-start': [event: PointerEvent]
  dblclick: [event: MouseEvent]
  minimize: []
  maximize: []
  restore: []
  help: []
  close: []
}>()
</script>

<template>
  <div
    class="title-bar ui-title-bar"
    :class="{ inactive: !active }"
    @pointerdown="emit('drag-start', $event)"
    @dblclick="emit('dblclick', $event)"
  >
    <div class="title-bar-text ui-title-bar-text">
      <UiIcon v-if="icon" :name="icon" :size="16" />
      <span class="ui-title-bar-label">{{ title }}</span>
    </div>
    <div class="title-bar-controls">
      <UiTitleBarButton v-if="helpable" kind="help" @click="emit('help')" />
      <UiTitleBarButton v-if="minimizable" kind="minimize" @click="emit('minimize')" />
      <UiTitleBarButton v-if="maximizable && !maximized" kind="maximize" @click="emit('maximize')" />
      <UiTitleBarButton v-if="maximizable && maximized" kind="restore" @click="emit('restore')" />
      <UiTitleBarButton v-if="closable" kind="close" class="ui-title-bar-close" @click="emit('close')" />
    </div>
  </div>
</template>

<style scoped>
.ui-title-bar {
  flex-shrink: 0;
  user-select: none;
  touch-action: none;
}
.ui-title-bar-text {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
  font-family: var(--font-ui);
  font-size: var(--fs-1);
}
.ui-title-bar-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* No Win98 o botão Fechar fica separado dos demais por um pequeno espaço */
.ui-title-bar-close {
  margin-left: 2px;
}
</style>
