<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ error?: string }>()
const emit = defineEmits(['submit'])

const password = ref('')

function submit() {
  emit('submit', password.value)
}
</script>

<template>
  <BaseWindow title="Sala protegida por senha" icon="login">
    <template #title-bar-controls>
      <button aria-label="Fechar" @click="navigateTo('/dashboard')"></button>
    </template>
    <div class="field-row" style="display: flex; flex-direction: column; gap: 0.25rem; min-width: 16rem;">
      <label for="room-password">Senha da sala:</label>
      <input
          id="room-password"
          type="password"
          v-model="password"
          @keyup.enter="submit"
      >
    </div>
    <p v-if="props.error" style="color: darkred;">{{ props.error }}</p>
    <template #footer>
      <button @click="submit">Entrar</button>
      <button @click="navigateTo('/dashboard')">Cancelar</button>
    </template>
  </BaseWindow>
</template>
