<script setup lang="ts">
/** Espera de quem já informou o nome numa sala que exige a aprovação do mestre. */
const emit = defineEmits<{ cancel: [] }>()
</script>

<template>
  <div class="room-waiting">
    <UiWindow title="Aguardando aprovação" icon="lock" variant="dialog" @close="emit('cancel')">
      <div class="room-waiting-body" role="status" data-test="room-waiting">
        <div class="room-waiting-head">
          <UiIcon name="lock" :size="32" />
          <p>O mestre precisa aprovar a sua entrada. Aguarde: esta janela some sozinha assim que ele decidir.</p>
        </div>
        <div class="room-waiting-buttons">
          <button type="button" @click="emit('cancel')">Cancelar</button>
        </div>
      </div>
    </UiWindow>
  </div>
</template>

<style scoped>
.room-waiting {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  min-height: 100%;
  padding: var(--sp-5);
  background: var(--c-desktop);
}
.room-waiting-body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  max-width: 360px;
}
.room-waiting-head {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-4);
}
.room-waiting-head p {
  margin: 0;
}
.room-waiting-buttons {
  display: flex;
  justify-content: flex-end;
}
.room-waiting-buttons button {
  min-width: 80px;
}
</style>
