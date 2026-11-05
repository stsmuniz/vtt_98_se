<script setup lang="ts">
/**
 * Tela de logon do VTT 98 SE (login e cadastro): nuvens, logo e uma caixa de
 * diálogo no estilo "Bem-vindo ao Windows". O conteúdo (campos) vem no slot
 * padrão; os botões, no slot `buttons`. Enter envia o formulário.
 * Fechar a caixa (X) equivale a Cancelar e volta ao site.
 */
import type { IconName } from '~/utils/icons'

withDefaults(defineProps<{
  title: string
  icon?: IconName
  /** Para onde vai o X / Cancelar. */
  closeTo?: string
  busy?: boolean
}>(), {
  icon: 'password',
  closeTo: '/',
  busy: false,
})

const emit = defineEmits<{ submit: [] }>()
</script>

<template>
  <main class="logon" :aria-busy="busy">
    <div class="logon-stack">
      <img class="logon-logo" src="/assets/logos/vtt_98_se_logo_v1.png" alt="VTT 98 SE" width="128" height="128">
      <UiWindow :title="title" :icon="icon" variant="dialog" class="logon-window" @close="navigateTo(closeTo)">
        <form class="logon-form" novalidate @submit.prevent="emit('submit')">
          <div class="logon-intro">
            <UiIcon :name="icon" :size="32" />
            <div class="logon-intro-text">
              <slot name="intro" />
            </div>
          </div>
          <fieldset class="logon-fields" :disabled="busy">
            <slot />
          </fieldset>
          <div class="logon-buttons">
            <slot name="buttons" />
          </div>
        </form>
      </UiWindow>
    </div>
  </main>
</template>

<style scoped>
.logon {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: var(--sp-5);
  box-sizing: border-box;
  background: #6fa3d8 url('/assets/backgrounds/clouds_background.jpg') center / cover no-repeat;
}
.logon-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-4);
  width: 100%;
  max-width: 460px;
}
.logon-logo {
  width: 96px;
  height: 96px;
  image-rendering: pixelated;
  filter: drop-shadow(2px 2px 0 rgb(0 0 0 / 0.3));
}
.logon-window {
  width: 100%;
}
.logon-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}
.logon-intro {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-4);
}
.logon-intro-text :deep(p) {
  margin: 0 0 var(--sp-2);
}
.logon-fields {
  --field-label-w: 136px;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin: 0;
  padding: 0;
  border: none;
  min-width: 0;
}
.logon-buttons {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--sp-2);
}
.logon-buttons :deep(button) {
  min-width: 80px;
}
</style>
