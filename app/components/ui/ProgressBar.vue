<script setup lang="ts">
/**
 * Barra de progresso em blocos (98.css). Sem `value`, fica indeterminada:
 * um grupo de blocos percorre a barra em loop (telas de carga e "Desligar").
 */
const props = withDefaults(defineProps<{
  /** 0–100. Omitido = indeterminado. */
  value?: number
  segmented?: boolean
  label?: string
}>(), {
  value: undefined,
  segmented: true,
  label: 'Progresso',
})

const clamped = computed(() => (props.value === undefined ? undefined : Math.max(0, Math.min(100, props.value))))
</script>

<template>
  <div
    class="progress-indicator ui-progress"
    :class="{ segmented, indeterminate: clamped === undefined }"
    role="progressbar"
    :aria-label="label"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="clamped"
  >
    <span class="progress-indicator-bar" :style="clamped === undefined ? undefined : { width: `${clamped}%` }" />
  </div>
</template>

<style scoped>
.ui-progress {
  position: relative;
  overflow: hidden;
}
.ui-progress.indeterminate .progress-indicator-bar {
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 30%;
  animation: ui-progress-sweep 1.6s steps(20) infinite;
}
@keyframes ui-progress-sweep {
  from { left: -30%; }
  to { left: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .ui-progress.indeterminate .progress-indicator-bar {
    animation: none;
    left: 0;
    width: 100%;
    opacity: 0.5;
  }
}
</style>
