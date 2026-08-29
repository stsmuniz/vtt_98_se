<script setup lang="ts">
const props = defineProps<{
  title?: string
  icon?: string
  x?: number
  y?: number
}>()
defineEmits(['close-window'])

const rootRef = ref<HTMLElement | null>(null)
const position = reactive({ x: props.x ?? 0, y: props.y ?? 0 })

onMounted(() => {
  if (props.x !== undefined && props.y !== undefined) return
  const el = rootRef.value
  if (!el) return
  position.x = Math.max(0, (window.innerWidth - el.offsetWidth) / 2)
  position.y = Math.max(0, (window.innerHeight - el.offsetHeight) / 2)
})

let dragOffsetX = 0
let dragOffsetY = 0

function startDrag(event: PointerEvent) {
  dragOffsetX = event.clientX - position.x
  dragOffsetY = event.clientY - position.y
  window.addEventListener('pointermove', onDrag)
  window.addEventListener('pointerup', stopDrag)
}

function onDrag(event: PointerEvent) {
  position.x = event.clientX - dragOffsetX
  position.y = event.clientY - dragOffsetY
}

function stopDrag() {
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup', stopDrag)
}

onUnmounted(stopDrag)
</script>

<template>
  <div
      ref="rootRef"
      class="window floating-window"
      :style="{ left: `${position.x}px`, top: `${position.y}px` }"
  >
    <div class="title-bar" @pointerdown="startDrag">
      <div class="title-bar-text">
        <img v-if="icon" :src="`/assets/icons/${icon}.png`" style="width: 16px; height: 16px;"/> {{ title }}
      </div>
      <div class="title-bar-controls">
        <slot name="title-bar-controls">
          <button aria-label="Fechar" @pointerdown.stop @click="$emit('close-window')">🗙</button>
        </slot>
      </div>
    </div>
    <div class="window-body">
      <slot/>
    </div>
    <div v-if="$slots.footer" class="window-footer">
      <slot name="footer"/>
    </div>
  </div>
</template>

<style lang="css" scoped>
.floating-window {
  position: fixed;
  z-index: 1000;
  max-height: 90vh;
  max-width: 90vw;
}

.title-bar {
  cursor: move;
  touch-action: none;
}

.window-body {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin: 0.125rem;
  padding: 0.25rem;
  max-height: 90vh;
  overflow: auto;
}

.window-footer {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0.5rem;
}
</style>
