<script setup lang="ts">
import type { SceneInitiativeEntry } from "#server/db/schema.ts"

const props = defineProps<{
  initiativeList: SceneInitiativeEntry[]
}>()

const emit = defineEmits<{
  'update:initiativeList': [SceneInitiativeEntry[]]
}>()

const updateValue = (index: number, value: string) => {
  const next = [...props.initiativeList]
  next[index] = { ...next[index], value }
  emit('update:initiativeList', next)
}

const moveUp = (index: number) => {
  if (index <= 0) return
  const next = [...props.initiativeList]
  const [entry] = next.splice(index, 1)
  next.splice(index - 1, 0, entry)
  emit('update:initiativeList', next)
}

const moveDown = (index: number) => {
  if (index >= props.initiativeList.length - 1) return
  const next = [...props.initiativeList]
  const [entry] = next.splice(index, 1)
  next.splice(index + 1, 0, entry)
  emit('update:initiativeList', next)
}

const remove = (index: number) => {
  const next = [...props.initiativeList]
  next.splice(index, 1)
  emit('update:initiativeList', next)
}
</script>

<template>
  <div class="sunken-panel">
    <table class="interactive initiative-table">
      <thead>
      <tr>
        <th>Nome</th>
        <th>Valor</th>
        <th>Ações</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="(entry, index) in initiativeList" :key="entry.tokenId">
        <td>{{ entry.name }}</td>
        <td style="padding: 0;">
          <input
              type="text"
              size="4"
              :value="entry.value"
              @change="updateValue(index, ($event.target as HTMLInputElement).value)"
          >
        </td>
        <td style="padding: 0; display: flex; gap: 4px; justify-content: center;">
          <button class="initiative-actions" :disabled="index === 0" @click="moveUp(index)">5</button>
          <button class="initiative-actions" :disabled="index === initiativeList.length - 1" @click="moveDown(index)">6</button>
          <button class="initiative-actions" @click="remove(index)">r</button>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped lang="css">
.initiative-table {
  width: 100%;
  height: 100%;

  .initiative-actions {
    font-family: "Webdings", sans-serif;
    font-size: 1.2rem;
    min-width: 16px;
  }
}
</style>
