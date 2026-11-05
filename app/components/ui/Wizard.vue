<script setup lang="ts">
/**
 * Assistente no estilo Win98 (imagem à esquerda, páginas à direita e os botões
 * < Voltar · Avançar > · Concluir · Cancelar). O conteúdo de cada página vem do
 * slot `step-<id>`. Substitui o vue3-form-wizard.
 *
 * `canAdvance` controla se a página atual permite seguir (validação fica com
 * quem usa). Na última página, "Avançar >" vira "Concluir".
 */
export interface WizardStepDef {
  id: string
  title: string
  description?: string
}

const props = withDefaults(defineProps<{
  steps: WizardStepDef[]
  canAdvance?: boolean
  busy?: boolean
  image?: string | null
  finishLabel?: string
}>(), {
  canAdvance: true,
  busy: false,
  image: '/assets/wizard_side.png',
  finishLabel: 'Concluir',
})

const stepIndex = defineModel<number>('step', { default: 0 })
const emit = defineEmits<{ finish: []; cancel: [] }>()

const current = computed(() => props.steps[stepIndex.value])
const isFirst = computed(() => stepIndex.value === 0)
const isLast = computed(() => stepIndex.value === props.steps.length - 1)

function back() {
  if (!isFirst.value && !props.busy) stepIndex.value--
}

function next() {
  if (!props.canAdvance || props.busy) return
  if (isLast.value) emit('finish')
  else stepIndex.value++
}
</script>

<template>
  <div class="ui-wizard">
    <div class="ui-wizard-main">
      <div v-if="image" class="ui-wizard-image">
        <img :src="image" alt="">
      </div>
      <div class="ui-wizard-page">
        <h2 v-if="current" class="ui-wizard-title">{{ current.title }}</h2>
        <p v-if="current?.description" class="ui-wizard-description">{{ current.description }}</p>
        <div class="ui-wizard-content">
          <slot v-if="current" :name="`step-${current.id}`" />
        </div>
        <p class="ui-wizard-progress">Etapa {{ stepIndex + 1 }} de {{ steps.length }}</p>
      </div>
    </div>
    <hr class="ui-wizard-rule">
    <div class="ui-wizard-buttons">
      <button type="button" :disabled="isFirst || busy" @click="back">&lt; Voltar</button>
      <button type="button" class="default" :disabled="!canAdvance || busy" @click="next">
        {{ isLast ? finishLabel : 'Avançar >' }}
      </button>
      <button type="button" class="cancel" :disabled="busy" @click="emit('cancel')">Cancelar</button>
    </div>
  </div>
</template>

<style scoped>
.ui-wizard {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  min-height: 0;
  font-family: var(--font-ui);
  font-size: var(--fs-1);
}
.ui-wizard-main {
  display: flex;
  gap: var(--sp-4);
  min-height: 0;
  flex: 1 1 auto;
}
.ui-wizard-image {
  flex: 0 0 auto;
  box-shadow: var(--bevel-sunken);
  padding: 2px;
  background: var(--c-shadow);
}
.ui-wizard-image img {
  display: block;
  width: 140px;
  height: 100%;
  max-height: 320px;
  object-fit: cover;
}
.ui-wizard-page {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.ui-wizard-title {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--fs-1);
  font-weight: bold;
}
.ui-wizard-description {
  margin: 0;
}
.ui-wizard-content {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.ui-wizard-progress {
  margin: 0;
  color: var(--c-text-disabled);
}
.ui-wizard-rule {
  width: 100%;
  margin: 0;
  border: none;
  border-top: 1px solid var(--c-shadow);
  border-bottom: 1px solid var(--c-highlight);
}
.ui-wizard-buttons {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-2);
}
.ui-wizard-buttons .cancel {
  margin-left: var(--sp-3);
}
@media (max-width: 560px) {
  .ui-wizard-image {
    display: none;
  }
}
</style>
