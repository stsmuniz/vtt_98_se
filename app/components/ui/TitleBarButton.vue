<script setup lang="ts">
/**
 * Botão da barra de título. Usa os desenhos do 98.css (classes .minimize,
 * .maximize, .restore, .help, .close) com rótulo acessível em português.
 */
type Kind = 'minimize' | 'maximize' | 'restore' | 'help' | 'close'

const props = defineProps<{ kind: Kind; disabled?: boolean }>()
defineEmits<{ click: [event: MouseEvent] }>()

const LABELS: Record<Kind, string> = {
  minimize: 'Minimizar',
  maximize: 'Maximizar',
  restore: 'Restaurar',
  help: 'Ajuda',
  close: 'Fechar',
}
const label = computed(() => LABELS[props.kind])
</script>

<template>
  <button
    type="button"
    :class="kind"
    :aria-label="label"
    :title="label"
    :disabled="disabled"
    @pointerdown.stop
    @click.stop="$emit('click', $event)"
  />
</template>
