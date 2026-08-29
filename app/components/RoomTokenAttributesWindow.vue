<script setup lang="ts">
import { useRoomTokenAttributes } from '~~/composables/useRoomTokenAttributes'
import type { Attribute } from '#server/db/schema.ts'

const props = defineProps<{
  token: { name: string; image: string; attributes?: Attribute[] | null }
}>()
const emit = defineEmits(['close-window', 'confirm'])

const { attributes, loadFromToken } = useRoomTokenAttributes()
loadFromToken(props.token.attributes)

function confirm() {
  emit('confirm', attributes.value)
}
</script>

<template>
  <BaseWindow title="Adicionar token à sala" icon="tokens" @close-window="$emit('close-window')">
    <div class="token-preview" style="display: flex; align-items: center; gap: 0.5rem;">
      <img :src="token.image" :alt="token.name" style="max-width: 64px; max-height: 64px;">
      <span>{{ token.name }}</span>
    </div>
    <table v-if="attributes.length" style="width: 100%; margin-top: 0.5rem;">
      <thead>
        <tr>
          <td>Atributo</td>
          <td>Atual</td>
          <td>Máximo</td>
          <td>Visibilidade</td>
        </tr>
      </thead>
      <tbody>
        <tr v-for="attribute in attributes" :key="attribute.name">
          <td>{{ attribute.name }}</td>
          <td><input type="text" v-model="attribute.currentValue" style="width: 4rem;"></td>
          <td><input type="text" v-model="attribute.maxValue" style="width: 4rem;"></td>
          <td>
            <select v-model="attribute.visibility">
              <option value="visible">Visível</option>
              <option value="hidden">Oculto</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else>Este token não possui atributos.</p>
    <template #footer>
      <button @click="confirm">Adicionar à sala</button>
      <button @click="$emit('close-window')">Cancelar</button>
    </template>
  </BaseWindow>
</template>
