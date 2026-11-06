<template>
  <AuthLogonScreen title="Redefinir senha" icon="password" :busy="isSubmitting" close-to="/login" @submit="submitForm">
    <template #intro>
      <p v-if="!token">O link de redefinição é inválido ou expirou. Peça um novo.</p>
      <p v-else>Escolha uma nova senha para a sua conta.</p>
    </template>

    <template v-if="token">
      <UiTextField v-model="form.password" input-id="password" name="password" type="password" label="Nova senha:" autocomplete="new-password" autofocus />
      <UiTextField v-model="form.passwordConfirm" input-id="password-confirm" name="password-confirm" type="password" label="Confirme a senha:" autocomplete="new-password" />
    </template>

    <template #buttons>
      <button v-if="token" id="submit-reset-form" type="submit" class="default" :disabled="isSubmitting">OK</button>
      <button v-else type="button" class="default" @click="navigateTo('/esqueci-senha')">Pedir novo link</button>
      <button type="button" :disabled="isSubmitting" @click="navigateTo('/login')">Cancelar</button>
    </template>
  </AuthLogonScreen>
</template>

<script setup lang="ts">
import { useDialog } from "~~/composables/useDialog";
import { authClient } from "~~/lib/auth-client.ts";
import { useLoadingWindow } from "~~/composables/useLoadingWindow";
import { authErrorMessage } from "~~/lib/authErrors";

useSeoMeta({ title: 'Redefinir senha - VTT 98 SE', robots: 'noindex' })

const route = useRoute()
// O better-auth redireciona para cá com ?token=... (ou ?error=INVALID_TOKEN se o link não vale mais).
const token = computed(() => {
  const t = Array.isArray(route.query.token) ? route.query.token[0] : route.query.token
  return route.query.error || typeof t !== 'string' ? '' : t
})

const form = reactive({ password: '', passwordConfirm: '' })
const isSubmitting = ref(false)
const { withLoading } = useLoadingWindow()

async function submitForm() {
  const alert = (message: string) => useDialog().alert(message, { title: 'Não foi possível redefinir a senha', icon: 'warning' })
  if (!form.password || !form.passwordConfirm) return alert('Preencha todos os campos')
  if (form.password !== form.passwordConfirm) return alert('A senha não confere com a confirmação')

  isSubmitting.value = true
  let error: Parameters<typeof authErrorMessage>[0] = null
  try {
    await withLoading(() => authClient.resetPassword({ newPassword: form.password, token: token.value }, {
      onError: (ctx) => { error = ctx.error },
    }), 'Salvando...')
  } finally {
    isSubmitting.value = false
  }
  if (error) {
    const code = (error as { code?: string }).code
    return alert(code === 'INVALID_TOKEN' ? 'O link de redefinição é inválido ou expirou. Peça um novo.' : authErrorMessage(error))
  }
  await useDialog().alert('Senha alterada. Entre com a nova senha.', { title: 'Senha redefinida' })
  navigateTo('/login')
}
</script>
