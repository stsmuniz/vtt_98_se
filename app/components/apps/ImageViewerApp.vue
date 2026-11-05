<script setup lang="ts">
/** Visualizador de imagens (abrir um cenário): ajustar à janela ou tamanho real. */
import type { MenuDef } from '~/utils/menu'
import { useWindow } from '~~/composables/useWindow'

const props = defineProps<{ src: string; name?: string }>()

const win = useWindow()
const fit = ref(true)
const natural = ref<{ w: number; h: number } | null>(null)

function onLoad(event: Event) {
  const img = event.target as HTMLImageElement
  natural.value = { w: img.naturalWidth, h: img.naturalHeight }
}

const menus = computed<MenuDef[]>(() => [
  { id: 'arquivo', label: '&Arquivo', items: [{ id: 'fechar', label: '&Fechar', action: () => win.close() }] },
  {
    id: 'exibir',
    label: 'E&xibir',
    items: [
      { id: 'ajustar', type: 'radio', label: '&Ajustar à janela', checked: fit.value, action: () => { fit.value = true } },
      { id: 'real', type: 'radio', label: '&Tamanho real', checked: !fit.value, action: () => { fit.value = false } },
    ],
  },
])
win.setMenus(menus.value)
watch(menus, m => win.setMenus(m))
</script>

<template>
  <div class="viewer">
    <UiToolbar label="Visualização">
      <UiToolbarButton label="Ajustar à janela" icon="zoom-out" :pressed="fit" @click="fit = true" />
      <UiToolbarButton label="Tamanho real" icon="zoom-in" :pressed="!fit" @click="fit = false" />
    </UiToolbar>
    <div class="viewer-canvas" :class="{ fit }">
      <img :src="props.src" :alt="props.name ?? 'Imagem'" @load="onLoad">
    </div>
    <UiStatusBar>
      <UiStatusField grow>{{ props.name }}</UiStatusField>
      <UiStatusField>{{ natural ? `${natural.w} × ${natural.h} px` : '' }}</UiStatusField>
      <UiStatusField>{{ fit ? 'Ajustada' : '100%' }}</UiStatusField>
    </UiStatusBar>
  </div>
</template>

<style scoped>
.viewer {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}
.viewer-canvas {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  margin: var(--sp-1);
  background: var(--c-shadow);
  box-shadow: var(--bevel-sunken);
}
.viewer-canvas.fit {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.viewer-canvas.fit img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.viewer-canvas:not(.fit) img {
  display: block;
}
</style>
