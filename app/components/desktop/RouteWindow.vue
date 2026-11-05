<script setup lang="ts">
/**
 * Janela da página atual (editor de cena, sala). Abre maximizada, aparece na
 * barra de tarefas e, ao fechar, navega para `closeTo` — depois de consultar o
 * "antes de fechar" registrado pela página (alterações não salvas).
 */
import type { IconName } from '~/utils/icons'
import { useWindowManager } from '~~/composables/useWindowManager'

const ROUTE_ID = 'route'

const props = withDefaults(defineProps<{
  title: string
  icon: IconName
  closeTo?: string
  scrollBody?: boolean
}>(), {
  closeTo: '/dashboard',
  scrollBody: true,
})

const wm = useWindowManager()

wm.register(ROUTE_ID, 'route', {
  title: props.title,
  icon: props.icon,
  state: 'maximized',
  rect: { w: 960, h: 640 },
  minSize: { w: 360, h: 240 },
})

watch(() => [props.title, props.icon] as const, ([title, icon]) => wm.setTitle(ROUTE_ID, title, icon))

onBeforeUnmount(() => wm.unregister(ROUTE_ID))

async function onClose() {
  if (await wm.canClose(ROUTE_ID)) await navigateTo(props.closeTo)
}
</script>

<template>
  <DesktopWindow :id="ROUTE_ID" :close-handler="onClose" :scroll-body="scrollBody">
    <template v-if="$slots.toolbar" #toolbar><slot name="toolbar" /></template>
    <slot />
    <template v-if="$slots.statusbar" #statusbar><slot name="statusbar" /></template>
  </DesktopWindow>
</template>
