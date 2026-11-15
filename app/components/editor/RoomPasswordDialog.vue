<script setup lang="ts">
/** Pedido de senha de uma sala protegida (mostrado no centro da janela da sala). */
const props = defineProps<{
  error?: string
  /** Senhas erradas demais: instante (ms) em que a tentativa volta a ser aceita (0 = livre). */
  lockedUntil?: number
}>()
const emit = defineEmits<{ submit: [password: string]; cancel: [] }>()
const password = ref('')

// Contagem regressiva do bloqueio. O servidor é quem impõe; isto só mostra quanto falta e evita
// o clique que seria recusado.
const now = ref(Date.now())
const lockLeft = computed(() => Math.max(0, Math.ceil(((props.lockedUntil ?? 0) - now.value) / 1000)))
const lockText = computed(() => {
  const minutes = Math.floor(lockLeft.value / 60)
  const seconds = String(lockLeft.value % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
})
let timer: ReturnType<typeof setInterval> | null = null
function stopTimer() {
  if (timer) clearInterval(timer)
  timer = null
}
watch(() => props.lockedUntil, (until) => {
  stopTimer()
  now.value = Date.now()
  if (!until || until <= now.value) return
  timer = setInterval(() => {
    now.value = Date.now()
    if (now.value >= until) stopTimer()
  }, 250)
}, { immediate: true })
onBeforeUnmount(stopTimer)

function submit() {
  if (lockLeft.value > 0) return
  emit('submit', password.value)
}
</script>

<template>
  <div class="room-password">
    <UiWindow title="Sala protegida por senha" icon="password" variant="dialog" @close="emit('cancel')">
      <form class="room-password-form" @submit.prevent="submit">
        <div class="room-password-head">
          <UiIcon name="password" :size="32" />
          <p>Esta sala é protegida. Digite a senha que o mestre passou para entrar.</p>
        </div>
        <UiTextField v-model="password" type="password" label="Senha da sala:" autofocus autocomplete="current-password" data-test="room-password" />
        <p v-if="props.error" class="room-password-error" role="alert">{{ props.error }}</p>
        <p v-if="lockLeft > 0" class="room-password-error" role="status" data-test="room-password-lock">
          Muitas tentativas. Aguarde {{ lockText }} para tentar de novo.
        </p>
        <div class="room-password-buttons">
          <button type="submit" class="default" :disabled="lockLeft > 0" data-test="room-password-ok">{{ lockLeft > 0 ? lockText : 'Entrar' }}</button>
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
