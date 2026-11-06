<script setup lang="ts">
/** Renderiza as janelas de aplicativos abertas pelo registro (kind 'app'). */
import { getApp } from '~/desktop/apps'
import { useWindowManager } from '~~/composables/useWindowManager'

const wm = useWindowManager()
const appWindows = computed(() => wm.windows.value.filter(w => w.kind === 'app' && w.appId && getApp(w.appId)))

/** Pastas (Tokens, Cenários, Cenas, Salas) mostram a animação de pasta enquanto carregam. */
const isFolder = (appId: string) => Boolean(getApp(appId)?.defaultProps?.resource)
</script>

<template>
  <DesktopWindow
    v-for="win in appWindows"
    :id="win.id"
    :key="win.id"
    :teleport="false"
  >
    <div class="app-content" :class="{ padded: getApp(win.appId!)!.padded }">
      <Suspense>
        <component :is="getApp(win.appId!)!.component" v-bind="win.props" @close-window="wm.close(win.id)" />
        <template #fallback>
          <div v-if="isFolder(win.appId!)" class="folder-loading" role="status" aria-label="Carregando…">
            <img src="/assets/gifs/folder.gif" alt="">
          </div>
          <p v-else class="app-loading">Carregando…</p>
        </template>
      </Suspense>
    </div>
  </DesktopWindow>
</template>

<style scoped>
.app-content {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}
.app-content.padded {
  padding: var(--sp-3);
}
.folder-loading {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}
.folder-loading img {
  image-rendering: pixelated;
}
.app-loading {
  margin: var(--sp-4);
}
</style>
