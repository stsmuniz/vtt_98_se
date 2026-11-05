<script setup lang="ts">
/** Pedido de senha de uma sala protegida (mostrado no centro da janela da sala). */
const props = defineProps<{ error?: string }>()
const emit = defineEmits<{ submit: [password: string]; cancel: [] }>()
const password = ref('')
</script>

<template>
  <div class="room-password">
    <UiWindow title="Sala protegida por senha" icon="password" variant="dialog" @close="emit('cancel')">
      <form class="room-password-form" @submit.prevent="emit('submit', password)">
        <div class="room-password-head">
          <UiIcon name="password" :size="32" />
          <p>Esta sala é protegida. Digite a senha que o mestre passou para entrar.</p>
        </div>
        <UiTextField v-model="password" type="password" label="Senha da sala:" autofocus autocomplete="current-password" data-test="room-password" />
        <p v-if="props.error" class="room-password-error" role="alert">{{ props.error }}</p>
        <div class="room-password-buttons">
          <button type="submit" class="default" data-test="room-password-ok">Entrar</button>
          <button type="button" @click="emit('cancel')">Cancelar</button>
        </div>
      </form>
    </UiWindow>
  </div>
</template>

<style scoped>
.room-password {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  min-height: 100%;
  padding: var(--sp-5);
  background: var(--c-desktop);
}
.room-password-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  max-width: 360px;
}
.room-password-head {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-4);
}
.room-password-head p {
  margin: 0;
}
.room-password-error {
  margin: 0;
  color: #a00000;
}
.room-password-buttons {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-3);
}
.room-password-buttons button {
  min-width: 80px;
}
</style>
