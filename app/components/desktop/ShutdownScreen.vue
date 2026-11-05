<script setup lang="ts">
/**
 * Tela de desligamento: nuvens, logo do sistema ao centro e barra de progresso
 * no rodapé, enquanto o "disco rígido" trabalha (ver useDesktop().shutdown()).
 */
</script>

<template>
  <div class="shutdown-screen" role="status" aria-live="polite" data-test="shutdown-screen">
    <div class="shutdown-center">
      <img src="/assets/logos/vtt_98_se_logo_v1.png" alt="VTT 98 SE" class="shutdown-logo">
      <p class="shutdown-text">Aguarde enquanto o VTT 98 SE é desligado...</p>
    </div>
    <div class="shutdown-bar">
      <UiProgressBar label="Desligando" />
    </div>
  </div>
</template>

<style scoped>
.shutdown-screen {
  position: fixed;
  inset: 0;
  z-index: var(--z-shutdown);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #6fa3d8 url('/assets/backgrounds/clouds_background.jpg') center / cover no-repeat;
  cursor: wait;
}
.shutdown-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-5);
}
.shutdown-logo {
  width: min(256px, 50vw);
  height: auto;
  image-rendering: pixelated;
  filter: drop-shadow(2px 2px 0 rgb(0 0 0 / 0.35));
}
.shutdown-text {
  margin: 0;
  padding: var(--sp-2) var(--sp-4);
  color: #000040;
  font-family: var(--font-display);
  font-size: var(--fs-2);
  text-align: center;
  text-shadow: 1px 1px 0 rgb(255 255 255 / 0.7);
}
.shutdown-bar {
  position: absolute;
  left: 50%;
  bottom: 8%;
  width: min(480px, 80vw);
  transform: translateX(-50%);
}
.shutdown-bar :deep(.ui-progress) {
  width: 100%;
}
</style>
