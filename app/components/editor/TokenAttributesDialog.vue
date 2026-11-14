<script setup lang="ts">
/**
 * Antes de um token entrar na sala, o mestre ajusta os valores atuais/máximos
 * e a visibilidade de cada atributo.
 */
import type { Attribute, SceneAttribute } from '#server/db/schema.ts'
import { useRoomTokenAttributes } from '~~/composables/useRoomTokenAttributes'
import { defaultBarColor } from '~~/lib/tokenBars'

const props = defineProps<{
  token: { name: string; image?: string | null; attributes?: Attribute[] | null } | null
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ confirm: [attributes: SceneAttribute[]] }>()

function setBarColor(attribute: { barColor?: string }, event: Event) {
  attribute.barColor = (event.target as HTMLInputElement).value
}

const { attributes, loadFromToken } = useRoomTokenAttributes()
watch(() => props.token, t => loadFromToken(t?.attributes), { immediate: true })
</script>

<template>
  <DesktopInlineWindow
    id="token-atributos"
    v-model:open="open"
    title="Adicionar token à sala"
    icon="token"
    variant="dialog"
    :width="480"
    :height="380"
  >
    <div v-if="token" class="token-head">
      <img v-if="token.image" :src="token.image" :alt="token.name">
      <strong>{{ token.name }}</strong>
    </div>
    <table v-if="attributes.length" class="attributes-table">
      <thead>
        <tr>
          <th>Atributo</th>
          <th>Atual</th>
          <th>Máximo</th>
          <th>Visibilidade</th>
          <th>Cor</th>
          <th>Números</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(attribute, index) in attributes" :key="attribute.name">
          <td>{{ attribute.name }}</td>
          <td><input v-model="attribute.currentValue" type="text" :aria-label="`${attribute.name}: atual`"></td>
          <td><input v-model="attribute.maxValue" type="text" :aria-label="`${attribute.name}: máximo`"></td>
          <td>
            <select v-model="attribute.showBar" :aria-label="`${attribute.name}: visibilidade`">
              <option :value="true">Visível</option>
              <option :value="false">Oculto</option>
            </select>
          </td>
          <td>
            <input
              type="color"
              :value="attribute.barColor || defaultBarColor(index)"
              :disabled="!attribute.showBar"
              :aria-label="`${attribute.name}: cor da barra`"
              @input="setBarColor(attribute, $event)"
            >
          </td>
          <td>
            <UiCheckbox
              v-model="attribute.showBarValues"
              :disabled="!attribute.showBar"
              :title="`${attribute.name}: exibir números na barra`"
            />
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else>Este token não possui atributos.</p>
    <template #footer>
      <button type="button" class="default" data-test="attributes-confirm" @click="emit('confirm', attributes)">Adicionar à sala</button>
      <button type="button" @click="open = false">Cancelar</button>
    </template>
  </DesktopInlineWindow>
</template>

<style scoped>
.token-head {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.token-head img {
  max-width: 64px;
  max-height: 64px;
}
.attributes-table {
  width: 100%;
  border-collapse: collapse;
}
.attributes-table input[type=color] {
  height: 22px;
  padding: 0;
}
.attributes-table th {
  text-align: left;
  font-weight: normal;
}
.attributes-table input,
.attributes-table select {
  width: 100%;
  box-sizing: border-box;
  height: auto;
  font: inherit;
}
</style>
