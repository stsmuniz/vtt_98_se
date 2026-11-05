<script setup lang="ts">
/** Janela de ordem de iniciativa da sala (só o mestre edita). */
import type { SceneInitiativeEntry } from '#server/db/schema.ts'

const open = defineModel<boolean>('open', { default: false })
const list = defineModel<SceneInitiativeEntry[]>('list', { required: true })

function updateValue(index: number, value: string) {
  const next = [...list.value]
  next[index] = { ...next[index]!, value }
  list.value = next
}

function move(index: number, delta: -1 | 1) {
  const target = index + delta
  if (target < 0 || target >= list.value.length) return
  const next = [...list.value]
  const [entry] = next.splice(index, 1)
  next.splice(target, 0, entry!)
  list.value = next
}

function remove(index: number) {
  list.value = list.value.filter((_, i) => i !== index)
}

/** Ordena do maior para o menor valor (valores vazios vão para o fim). */
function sortByValue() {
  const num = (v: string) => (v.trim() === '' || Number.isNaN(Number(v)) ? -Infinity : Number(v))
  list.value = [...list.value].sort((a, b) => num(b.value) - num(a.value))
}
</script>

<template>
  <DesktopInlineWindow id="iniciativa" v-model:open="open" title="Iniciativa" icon="initiative" :width="380" :height="380">
    <template #toolbar>
      <UiToolbar label="Iniciativa">
        <UiToolbarButton label="Ordenar por valor" icon="view-list" @click="sortByValue" />
      </UiToolbar>
    </template>
    <div class="sunken-panel initiative-panel">
      <table class="interactive initiative-table" data-test="initiative-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Valor</th>
            <th><span class="visually-hidden">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(entry, index) in list" :key="entry.tokenId">
            <td>{{ entry.name }}</td>
            <td class="value-cell">
              <input
                type="text"
                size="4"
                :value="entry.value"
                :aria-label="`Iniciativa de ${entry.name}`"
                @change="updateValue(index, ($event.target as HTMLInputElement).value)"
              >
            </td>
            <td class="actions-cell">
              <button type="button" :disabled="index === 0" :aria-label="`Subir ${entry.name}`" title="Subir" @click="move(index, -1)"><span class="arrow up" aria-hidden="true" /></button>
              <button type="button" :disabled="index === list.length - 1" :aria-label="`Descer ${entry.name}`" title="Descer" @click="move(index, 1)"><span class="arrow down" aria-hidden="true" /></button>
              <button type="button" :aria-label="`Tirar ${entry.name} da iniciativa`" title="Remover" @click="remove(index)">×</button>
            </td>
          </tr>
          <tr v-if="!list.length">
            <td colspan="3" class="empty">Nenhum token na sala.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </DesktopInlineWindow>
</template>

<style scoped>
.initiative-panel {
  flex: 1 1 auto;
  min-height: 0;
}
.initiative-table {
  width: 100%;
}
.value-cell {
  padding: 0;
}
.value-cell input {
  width: 100%;
  height: auto;
  font: inherit;
}
.actions-cell {
  display: flex;
  gap: 2px;
  justify-content: center;
  padding: 1px;
}
.actions-cell button {
  min-width: 22px;
  min-height: 0;
  padding: 0 2px;
  font-size: var(--fs-1);
  line-height: 1;
}
/* Setas desenhadas em CSS: a fonte pixel não tem ▲ ▼ */
.arrow {
  display: inline-block;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  vertical-align: middle;
}
.arrow.up { border-bottom: 5px solid currentColor; }
.arrow.down { border-top: 5px solid currentColor; }
.empty {
  color: var(--c-text-disabled);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
