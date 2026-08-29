<script lang="ts" setup>
import type { SceneToken } from "#server/db/schema.ts"

const props = defineProps<{token: SceneToken}>()
const emit = defineEmits(['deleteToken', 'close-window'])

const handleDelete = () => {
  emit('deleteToken')
}
</script>
<template>
  <form>
    <fieldset>
      <legend>Estado</legend>
      <div class="field-row">
        <label for="token-name">Nome:</label>
        <input id="token-name" type="text" v-model="props.token.name"></input>
      </div>
      <div class="field-row">
        <label for="opacity">Opacidade:</label>
        <label for="opacity">0</label>
        <input type="range" id="opacity" min="0" max="100" v-model="props.token.opacity">
        <label for="opacity">100</label>
      </div>
    </fieldset>
    <fieldset>
      <legend>Atributos</legend>
      <table style="width: 100%; table-layout: fixed;" class="attributes-table">
        <thead>
        <tr>
          <th style="width: 40%;">Nome</th>
          <th style="width: 20%;">Atual</th>
          <th style="width: 20%;">Máximo</th>
          <th style="width: 20%;">Visibilidade</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="(attribute, idx) in props.token.attributes" :key="idx">
          <td>{{ attribute.name }}</td>
          <td><input type="number" style="width: 100%; box-sizing: border-box;" v-model="attribute.currentValue"></td>
          <td><input type="number" style="width: 100%; box-sizing: border-box;" v-model="attribute.value"></td>
          <td>
            <select style="width: 100%; box-sizing: border-box;" v-model="attribute.visibility">
              <option value="visible">Visível</option>
              <option value="hidden">Oculto</option>
            </select>
          </td>
        </tr>
        </tbody>
      </table>
    </fieldset>
    <fieldset>
      <legend>Ações</legend>
      <div class="field-row">
        <button @click.prevent="handleDelete">Remover</button>
      </div>
    </fieldset>
  </form>
</template>