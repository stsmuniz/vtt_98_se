<template>
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
</style>
