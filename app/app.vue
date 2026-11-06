<template>
  <!--
    Filtro "sem anti-aliasing" (classe .no-aa em fonts.css). O navegador não deixa a página desligar a
    suavização do texto (font-smooth só vale no macOS), então o texto vetorial é desenhado normalmente e
    este filtro transforma a transparência das bordas das letras em liga/desliga.
  -->
  <svg class="no-aa-defs" width="0" height="0" aria-hidden="true" focusable="false">
    <filter id="no-aa" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feComponentTransfer>
        <feFuncA type="discrete" tableValues="0 0 1 1 1 1 1 1 1 1" />
      </feComponentTransfer>
    </filter>
  </svg>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <!-- Globais: aviso "Aguarde" (useLoadingWindow) e caixas de mensagem (useDialog) -->
  <DesktopBusyOverlay />
  <DesktopDialogHost />
</template>
<style lang="css">
body {
  margin: 0;
  padding: 0;
}

.no-aa-defs {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}
</style>
