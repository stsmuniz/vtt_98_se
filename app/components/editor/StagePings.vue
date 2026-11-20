<script setup lang="ts">
/**
 * Animação da ferramenta Apontar: em cada ponto, três ondas saem do centro, crescem e somem
 * (defasadas), com o nome de quem apontou. Tamanhos em px de TELA (divididos pelo zoom), para a
 * animação ter o mesmo tamanho em qualquer zoom. O relógio (`now`) só anda enquanto houver pings.
 */
import { Layer as VLayer, Circle as VCircle, Text as VText } from 'vue-konva'
import { PING_DURATION_MS, type StagePing } from '~~/lib/drawings'

const props = defineProps<{ pings: StagePing[]; scale: number }>()

const RING_DELAYS = [0, 250, 500]
const RING_MS = 1000
const MIN_R = 6
const MAX_R = 64

const now = ref(performance.now())
let frame: number | null = null

function tick() {
  now.value = performance.now()
  frame = props.pings.length ? requestAnimationFrame(tick) : null
}

watch(() => props.pings.length, (count) => {
  if (count && frame === null) {
    now.value = performance.now()
    frame = requestAnimationFrame(tick)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (frame !== null) cancelAnimationFrame(frame)
})

const shapes = computed(() => {
  const px = 1 / props.scale
  return props.pings.map((ping) => {
    const elapsed = now.value - ping.at
    const rings = RING_DELAYS.flatMap((delay, i) => {
      const t = (elapsed - delay) / RING_MS
      if (t < 0 || t > 1) return []
      // Desacelera ao crescer (ease-out) e vai sumindo.
      const eased = 1 - (1 - t) ** 2
      const radius = (MIN_R + (MAX_R - MIN_R) * eased) * px
      const opacity = 1 - t
      return [
        { key: `${ping.id}-${i}-o`, config: { x: ping.x, y: ping.y, radius, stroke: '#000000', strokeWidth: 6 * px, opacity: opacity * 0.6, listening: false } },
        { key: `${ping.id}-${i}-i`, config: { x: ping.x, y: ping.y, radius, stroke: '#ffff00', strokeWidth: 3 * px, opacity, listening: false } },
      ]
    })
    const fade = Math.min(1, Math.max(0, (PING_DURATION_MS - elapsed) / 400))
    const font = 16 * px
    return {
      id: ping.id,
      rings,
      dot: { x: ping.x, y: ping.y, radius: 4 * px, fill: '#ffff00', stroke: '#000000', strokeWidth: px, opacity: fade, listening: false },
      label: ping.by
        ? {
            text: ping.by,
            x: ping.x - 100 * px,
            y: ping.y - (MAX_R * 0.5 + 8) * px - font,
            width: 200 * px,
            align: 'center',
            fontSize: font,
            fontFamily: 'Pixel Operator, sans-serif',
            fill: '#ffffff',
            stroke: '#000000',
            strokeWidth: 3 * px,
            fillAfterStrokeEnabled: true,
            opacity: fade,
            listening: false,
          }
        : null,
    }
  })
})
</script>

<template>
  <VLayer :config="{ listening: false }">
    <template v-for="shape in shapes" :key="shape.id">
      <VCircle v-for="ring in shape.rings" :key="ring.key" :config="ring.config" />
      <VCircle :config="shape.dot" />
      <VText v-if="shape.label" :config="shape.label" />
    </template>
  </VLayer>
</template>
