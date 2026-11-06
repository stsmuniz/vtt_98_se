<template>
  <AuthLogonScreen title="Esqueci minha senha" icon="password" :busy="isSubmitting" close-to="/login" @submit="submitForm">
    <template #intro>
      <p>Digite o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.</p>
    </template>

    <UiTextField v-model="email" input-id="email" name="email" type="email" label="E-mail:" autocomplete="username" autofocus />

    <template #buttons>
      <button id="submit-forgot-form" type="submit" class="default" :disabled="isSubmitting">Enviar link</button>
      <button type="button" :disabled="isSubmitting" @click="navigateTo('/login')">Voltar ao login</button>
    </template>
  </AuthLogonScreen>
</template>

<script setup lang="ts">
import { useDialog } from "~~/composables/useDialog";
import { authClient } from "~~/lib/auth-client.ts";
import { useLoadingWindow } from "~~/composables/useLoadingWindow";
import { authErrorMessage } from "~~/lib/authErrors";

useSeoMeta({ title: 'Esqueci minha senha - VTT 98 SE', robots: 'noindex' })

const route = useRoute()
const q = Array.isArray(route.query.email) ? route.query.email[0] : route.query.email
const email = ref(typeof q === 'string' ? q : '')
const isSubmitting = ref(false)
const { withLoading } = useLoadingWindow()

async function submitForm() {
  if (!email.value) {
    await useDialog().alert('Digite o seu e-mail.', { title: 'Esqueci minha senha', icon: 'warning' })
    return
  }
  isSubmitting.value = true
  let error: Parameters<typeof authErrorMessage>[0] = null
  try {
    await withLoading(() => authClient.requestPasswordReset({ email: email.value, redirectTo: '/redefinir-senha' }, {
      onError: (ctx) => { error = ctx.error },
    }), 'Enviando...')
  } finally {
    isSubmitting.value = false
  }
  if (error) {
    await useDialog().alert(authErrorMessage(error, 'Não foi possível enviar o e-mail.'), { title: 'Não foi possível enviar', icon: 'warning' })
    return
  }
  // Resposta genérica: não revela se o e-mail tem conta.
  await useDialog().alert('Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha. Ele vale por 1 hora.', { title: 'Verifique seu e-mail' })
  navigateTo('/login')
}
</script>
