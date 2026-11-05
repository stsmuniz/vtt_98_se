<script setup lang="ts">
/**
 * "Desligar o VTT 98 SE": a tela escurece (pontilhado, como no Win98) e o
 * usuário escolhe entre desligar e efetuar logoff.
 */
import { useDesktop } from '~~/composables/useDesktop'
import { useSystemSounds } from '~~/composables/useSystemSounds'

const desktop = useDesktop()
const sounds = useSystemSounds()
const choice = ref<'shutdown' | 'logoff'>('shutdown')

const options = computed(() => [
  { value: 'shutdown' as const, label: 'Desligar o VTT' },
  { value: 'logoff' as const, label: `Efetuar logoff de ${desktop.user.value?.name ?? 'usuário'}` },
])

function cancel() {
  desktop.shutdownDialogOpen.value = false
}

function confirm() {
  sounds.unlock() // ainda dentro do clique: libera o áudio para o som do disco
  if (choice.value === 'shutdown') desktop.shutdown()
  else {
    desktop.shutdownDialogOpen.value = false
    desktop.logoff({ confirm: false })
  }
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    cancel()
  }
}
</script>

<template>
  <div class="shutdown-overlay" data-test="shutdown-dialog" @keydown="onKeyDown">
    <UiWindow title="Desligar o VTT 98 SE" icon="shutdown" variant="dialog" helpable @close="cancel" @help="desktop.openHelp()">
      <div class="shutdown-body">
        <UiIcon name="shutdown" :size="48" />
        <div class="shutdown-options">
          <p>O que você deseja fazer?</p>
          <UiRadioGroup v-model="choice" :options="options" label="O que você deseja fazer?" />
        </div>
      </div>
      <template #footer>
        <button type="button" class="default" data-test="shutdown-ok" autofocus @click="confirm">OK</button>
        <button type="button" @click="cancel">Cancelar</button>
        <button type="button" @click="desktop.openHelp()">Ajuda</button>
      </template>
    </UiWindow>
  </div>
</template>

<style scoped>
.shutdown-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-system-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-5);
  /* Tela "apagada" com pontilhado preto, como no Win98 */
  background-image: repeating-conic-gradient(rgb(0 0 0 / 0.55) 0 25%, transparent 0 50%);
  background-size: 2px 2px;
}
.shutdown-body {
  display: flex;
  gap: var(--sp-5);
  align-items: flex-start;
  padding: var(--sp-2);
}
.shutdown-options p {
  margin: 0 0 var(--sp-3);
}
.shutdown-overlay :deep(.ui-window-footer button) {
  min-width: 75px;
}
</style>
