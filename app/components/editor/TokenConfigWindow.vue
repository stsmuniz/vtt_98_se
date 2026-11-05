<script setup lang="ts">
/**
 * Configurações de um token na sala (nome, opacidade, atributos). Edita o
 * objeto do token diretamente — a sala transmite cada alteração ao vivo.
 */
import type { RoomToken } from '#server/db/schema.ts'

const props = defineProps<{ token: RoomToken | null }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ remove: [] }>()

const t = computed(() => props.token)
const nameId = useId()
const opacityId = useId()
</script>

<template>
  <DesktopInlineWindow
    id="token-config"
    v-model:open="open"
    :title="t ? `Configurações de ${t.name}` : 'Configurações do token'"
    icon="properties"
    :width="460"
    :height="420"
  >
    <p v-if="!t" class="empty">Selecione um token na sala.</p>
    <template v-else>
      <UiGroupBox label="Estado">
        <div class="field-row-stacked config-row">
          <label :for="nameId">Nome:</label>
          <input :id="nameId" v-model="t.name" type="text" data-test="token-config-name">
        </div>
        <div class="config-row">
          <label :for="opacityId">Opacidade: {{ t.opacity ?? 100 }}%</label>
          <input :id="opacityId" v-model.number="t.opacity" type="range" min="0" max="100" class="has-box-indicator">
        </div>
      </UiGroupBox>
      <UiGroupBox label="Atributos">
        <p v-if="!t.attributes?.length" class="empty">Este token não tem atributos.</p>
        <table v-else class="attributes-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Atual</th>
              <th>Máximo</th>
              <th>Visibilidade</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(attribute, idx) in t.attributes" :key="idx">
              <td>{{ attribute.name }}</td>
              <td><input v-model="attribute.currentValue" type="number" :aria-label="`${attribute.name}: valor atual`"></td>
              <td><input v-model="attribute.value" type="number" :aria-label="`${attribute.name}: máximo`"></td>
              <td>
                <select v-model="attribute.visibility" :aria-label="`${attribute.name}: visibilidade`">
                  <option value="visible">Visível</option>
                  <option value="hidden">Oculto</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </UiGroupBox>
    </template>
    <template #footer>
      <button type="button" :disabled="!t" @click="emit('remove')">Remover da sala</button>
      <button type="button" class="default" @click="open = false">Fechar</button>
    </template>
  </DesktopInlineWindow>
</template>

<style scoped>
.config-row {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}
.config-row input[type=text] {
  height: auto;
  font: inherit;
}
.attributes-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
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
.empty {
  color: var(--c-text-disabled);
  margin: 0;
}
</style>
