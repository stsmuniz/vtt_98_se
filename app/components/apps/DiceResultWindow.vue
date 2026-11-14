<script setup lang="ts">
import { useDiceSession } from '~~/composables/useDiceSession'
import { dieText, rollSummaryParts } from '~~/lib/rollDice'

// Popup com o resultado da última rolagem: dados lado a lado (os que não contaram, em cinza)
// e o total embaixo. Atualiza sozinho a cada nova rolagem (inclusive de outros jogadores).
const props = withDefaults(defineProps<{ scope?: 'local' | 'room' }>(), { scope: 'local' })
const { latest } = useDiceSession(props.scope)

const typeLabel = computed(() => {
  const t = latest.value?.type
  return t === 'h' ? 'Maior' : t === 'l' ? 'Menor' : t === 'g' ? 'Separado' : 'Soma'
})
</script>

<template>
  <section class="dice-result">
    <template v-if="latest">
      <p class="who">
        {{ latest.by }} rolou {{ latest.input }}
        <span v-if="latest.type !== 's'">({{ typeLabel }})</span>
        <strong v-if="latest.hidden"> (escondida)</strong>
      </p>
      <div class="faces">
        <div v-for="(value, i) in latest.rolls" :key="i" class="die">
          <DiceFace :faces="latest.faces[i]!" :size="48" :dropped="latest.dropped[i]" />
          <span class="value" :class="{ dropped: latest.dropped[i] }">{{ dieText(latest, latest.faces[i]!, value) }}</span>
        </div>
      </div>
      <p v-if="rollSummaryParts(latest).length === 1" class="total">= {{ rollSummaryParts(latest)[0] }}</p>
      <ul v-else class="parts">
        <li v-for="part in rollSummaryParts(latest)" :key="part">{{ part }}</li>
      </ul>
    </template>
    <p v-else class="empty">Nenhuma rolagem ainda.</p>
  </section>
</template>

<style scoped>
.dice-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  width: 100%;
}
.who, .empty { margin: 0; text-align: center; }
.faces {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--sp-3);
}
.die { display: flex; flex-direction: column; align-items: center; }
.value.dropped { color: var(--c-text-disabled); }
.parts { list-style: none; margin: 0; padding: 0; font-weight: bold; text-align: center; }
.total {
  margin: 0;
  font-size: var(--fs-3);
  line-height: var(--lh-heading);
}
</style>
