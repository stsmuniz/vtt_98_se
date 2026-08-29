<script setup lang="ts">
import {FormWizard} from "vue3-form-wizard";

defineProps<{
  wizardTitle: string,
  backButtonText?: string,
  nextButtonText?: string,
  finishButtonText?: string
}>()

defineEmits(['completed-wizard'])
</script>
<template>
  <base-window :title="wizardTitle"
  >
    <form-wizard
        @on-complete="$emit('completed-wizard')"
        :back-button-text="backButtonText ?? '< Voltar'"
        :next-button-text="nextButtonText ?? 'Próximo >'"
        :finish-button-text="finishButtonText ?? 'Finalizar'"
        color="silver"
    >
      <slot />
    </form-wizard>
  </base-window>
</template>
<style lang="css">
.vue-form-wizard {
  .wizard-navigation {
    padding: 1rem 0;
    border-bottom: 1px solid #808080;
    .wizard-nav {
      display: none;
    }
    .tab-container {
      display: flex;
      align-items: start;
      justify-content: center;
      gap: 2rem;
      max-width: 60vw;
      max-height: 60vh;
      .wizard-illustration {
        width: 20vw;
        border: 2px solid black;
      }
    }
  }
  .wizard-card-footer {
    border-top: 1px solid #dfdfdf;
    padding: 1rem 0 0.5rem;
    display: flex;
    justify-content: flex-end;
    [role=button] {
      .wizard-btn {
        color: black !important;
        &:disabled {
          color: #808080 !important;
        }
      }
    }
  }
}

@media screen and (min-width: 768px) {
  .vue-form-wizard .wizard-navigation {
    .tab-container .wizard-illustration {
      width: 300px;
    }
    .tab-container {
      justify-content: start;
      min-width: 500px;
      min-height: 50vh;
    }
  }
}
</style>