<script setup lang="ts">
/**
 * /dashboard é a própria área de trabalho: ícones, janelas e barra de tarefas
 * vêm do layout `desktop`. `?abrir=<app>` abre um aplicativo ao entrar
 * (ex.: /dashboard?abrir=tokens).
 */
import { useDesktop } from '~~/composables/useDesktop'

definePageMeta({
  layout: 'desktop',
  middleware: 'auth',
})

useHead({ title: 'Área de trabalho - VTT 98 SE' })

const route = useRoute()
const desktop = useDesktop()

onMounted(() => {
  const app = route.query.abrir
  if (typeof app === 'string') desktop.openApp(app)
})
</script>

<template>
  <span class="visually-hidden">Área de trabalho do VTT 98 SE</span>
</template>

<style scoped>
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
