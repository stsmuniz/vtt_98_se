<script setup lang="ts">
/**
 * Janela declarada dentro de uma página/componente (ex.: Iniciativa da sala).
 * O conteúdo continua ligado ao estado de quem a declara (v-model, props), mas
 * posição, foco, z-order e barra de tarefas ficam com o gerenciador de janelas.
 *
 *   <DesktopInlineWindow v-model:open="isInitiativeOpen" id="iniciativa" title="Iniciativa" icon="initiative">
 *     …conteúdo…
 *   </DesktopInlineWindow>
 *
 * Fechar pelo "X" (ou pela barra de tarefas) põe `open` em false. Por padrão a
 * janela pertence à janela da página ('route') e fecha junto com ela.
 */
import type { IconName } from '~/utils/icons'
import { useWindowManager, type WinEntry } from '~~/composables/useWindowManager'

const props = withDefaults(defineProps<{
  id: string
  title: string
  icon: IconName
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
  variant?: WinEntry['variant']
  resizable?: boolean
  ownerId?: string | null
  scrollBody?: boolean
}>(), {
  width: 420,
  height: 360,
  minWidth: 260,
  minHeight: 180,
  variant: 'tool',
  resizable: true,
  ownerId: 'route',
  scrollBody: true,
})

const open = defineModel<boolean>('open', { default: false })
const wm = useWindowManager()
const winId = computed(() => `inline:${props.id}`)

function register() {
  wm.register(winId.value, 'inline', {
    title: props.title,
    icon: props.icon,
    rect: { w: props.width, h: props.height },
    minSize: { w: props.minWidth, h: props.minHeight },
    variant: props.variant,
    resizable: props.resizable,
    maximizable: props.resizable,
    ownerId: props.ownerId ?? undefined,
  })
}

watch(open, (isOpen) => {
  if (isOpen) register()
  else wm.unregister(winId.value)
}, { immediate: true })

watch(() => [props.title, props.icon] as const, ([title, icon]) => {
  if (wm.get(winId.value)) wm.setTitle(winId.value, title, icon)
})

// Fechada por fora (X, barra de tarefas, dona fechou): reflete no v-model.
watch(() => wm.get(winId.value), (entry) => {
  if (!entry && open.value) open.value = false
})

onBeforeUnmount(() => wm.unregister(winId.value))

defineExpose({ id: winId })
</script>

<template>
  <DesktopWindow v-if="open" :id="winId" :scroll-body="scrollBody">
    <template v-if="$slots.toolbar" #toolbar><slot name="toolbar" /></template>
    <slot />
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
    <template v-if="$slots.statusbar" #statusbar><slot name="statusbar" /></template>
  </DesktopWindow>
</template>
