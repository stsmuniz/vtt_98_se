<script setup lang="ts">
/**
 * Exibe as caixas de mensagem pedidas por useDialog(). Só a mais recente
 * recebe cliques; uma camada transparente bloqueia o resto da tela (modal).
 */
import { useDialog } from '~~/composables/useDialog'

const dialog = useDialog()
const current = computed(() => dialog.queue.value.at(-1))
</script>

<template>
  <div v-if="current" class="dialog-host" data-test="dialog-host">
    <UiMessageBox
      :key="current.id"
      :title="current.title"
      :message="current.message"
      :icon="current.icon"
      :buttons="current.buttons"
      @choose="dialog.resolve(current.id, $event)"
    />
  </div>
</template>

<style scoped>
.dialog-host {
  position: fixed;
  inset: 0;
  z-index: var(--z-system-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-5);
}
</style>
