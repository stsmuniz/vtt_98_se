<script setup lang="ts">
/** Renderiza as janelas de aplicativos abertas pelo registro (kind 'app'). */
import { getApp } from '~/desktop/apps'
import { useWindowManager } from '~~/composables/useWindowManager'

const wm = useWindowManager()
const appWindows = computed(() => wm.windows.value.filter(w => w.kind === 'app' && w.appId && getApp(w.appId)))
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
          <p class="app-loading">Carregando…</p>
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
.app-loading {
  margin: var(--sp-4);
}
</style>
