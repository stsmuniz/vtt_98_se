<script setup lang="ts">
/** Pedido de nome de quem entra numa sala sem estar logado (mostrado no centro da janela da sala). */
const props = defineProps<{ error?: string }>()
const emit = defineEmits<{ submit: [name: string]; cancel: [] }>()
const name = ref('')
</script>

<template>
  <div class="room-name">
    <UiWindow title="Quem é você?" icon="user" variant="dialog" @close="emit('cancel')">
      <form class="room-name-form" @submit.prevent="emit('submit', name)">
        <div class="room-name-head">
          <UiIcon name="user" :size="32" />
          <p>Informe o seu nome para entrar na sala. Os outros participantes e o histórico de dados vão mostrá-lo.</p>
        </div>
        <UiTextField v-model="name" label="Seu nome:" autofocus maxlength="30" autocomplete="nickname" data-test="room-name" />
        <p v-if="props.error" class="room-name-error" role="alert">{{ props.error }}</p>
        <div class="room-name-buttons">
          <button type="submit" class="default" :disabled="!name.trim()" data-test="room-name-ok">Entrar</button>
          <button type="button" @click="emit('cancel')">Cancelar</button>
        </div>
      </form>
    </UiWindow>
  </div>
</template>

<style scoped>
.room-name {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  min-height: 100%;
  padding: var(--sp-5);
  background: var(--c-desktop);
}
.room-name-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  max-width: 360px;
}
.room-name-head {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-4);
}
.room-name-head p {
  margin: 0;
}
.room-name-error {
  margin: 0;
  color: #a00000;
}
.room-name-buttons {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-3);
}
.room-name-buttons button {
  min-width: 80px;
}
</style>
