<script setup lang="ts">
/** Alternador de janelas (Alt+W), no estilo do "coolswitch" do Win98. */
import { iconUrl } from '~/utils/icons'
import type { WinEntry } from '~~/composables/useWindowManager'

const props = defineProps<{ windows: WinEntry[]; index: number }>()
const current = computed(() => props.windows[props.index])
</script>

<template>
  <div class="switcher-overlay" role="dialog" aria-label="Alternar janelas">
    <div class="switcher">
      <div class="switcher-icons">
        <span v-for="(w, i) in windows" :key="w.id" class="switcher-icon" :class="{ current: i === index }">
          <img :src="iconUrl(w.icon, 32)" alt="" width="32" height="32">
        </span>
      </div>
      <p class="switcher-title" aria-live="polite">{{ current?.title }}</p>
    </div>
  </div>
</template>

<style scoped>
.switcher-overlay {
  position: absolute;
  inset: 0;
  z-index: var(--z-system-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.switcher {
  max-width: 90vw;
  padding: var(--sp-4);
  background: var(--c-surface);
  box-shadow: var(--bevel-raised);
  font-family: var(--font-ui);
  font-size: var(--fs-1);
}
.switcher-icons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--sp-2);
}
.switcher-icon {
  padding: var(--sp-2);
  border: 1px solid transparent;
}
.switcher-icon.current {
  border-color: var(--c-dark-shadow);
}
.switcher-icon img {
  display: block;
  image-rendering: pixelated;
}
.switcher-title {
  margin: var(--sp-3) 0 0;
  padding: var(--sp-1) var(--sp-2);
  text-align: center;
  box-shadow: var(--bevel-thin-sunken);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
