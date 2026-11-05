<script setup lang="ts">
/** Controle de zoom da barra de status (editor e sala). */
const zoom = defineModel<number>({ required: true })
const emit = defineEmits<{ in: []; out: []; reset: []; fit: [] }>()
const id = useId()
</script>

<template>
  <span class="zoom-control">
    <label :for="id">Zoom:</label>
    <input :id="id" v-model.number="zoom" type="text" inputmode="numeric" class="zoom-input" data-test="zoom-input">
    <span>%</span>
    <button type="button" title="Diminuir zoom" aria-label="Diminuir zoom" @click="emit('out')">−</button>
    <button type="button" title="Aumentar zoom" aria-label="Aumentar zoom" @click="emit('in')">+</button>
    <button type="button" title="Tamanho real (100%)" @click="emit('reset')">100%</button>
    <button type="button" title="Ajustar à janela" data-test="zoom-fit" @click="emit('fit')">Ajustar</button>
  </span>
</template>

<style scoped>
.zoom-control {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
}
.zoom-input {
  width: 3.5em;
  height: auto;
  font: inherit;
}
.zoom-control button {
  min-width: 0;
  min-height: 0;
  padding: 0 var(--sp-2);
  font: inherit;
}
</style>
