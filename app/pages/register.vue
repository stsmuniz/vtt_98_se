<template>
  <AuthLogonScreen title="Criar conta no VTT 98 SE" :busy="isSubmitting" @submit="submitForm">
    <template #intro>
      <p>Preencha os dados para criar sua conta gratuita.</p>
      <p>Já tem conta? Clique em Entrar.</p>
    </template>

    <UiTextField v-model="form.name" input-id="name" name="name" label="Seu nome:" autocomplete="name" :maxlength="80" autofocus />
    <UiTextField v-model="form.email" input-id="email" name="email" type="email" label="E-mail:" autocomplete="username" />
    <UiTextField v-model="form.password" input-id="password" name="password" type="password" label="Senha:" autocomplete="new-password" />
    <UiTextField v-model="form.passwordConfirm" input-id="password-confirm" name="password-confirm" type="password" label="Confirme a senha:" autocomplete="new-password" />
    <UiCheckbox v-model="form.acceptedTerms" input-id="accepted-terms" name="accepted-terms" class="accept-terms">
      Li e aceito os <NuxtLink to="/termos" target="_blank">Termos de Uso</NuxtLink>
      e a <NuxtLink to="/privacidade" target="_blank">Política de Privacidade</NuxtLink>.
    </UiCheckbox>

    <template #buttons>
      <button id="submit-login-form" type="submit" class="default" :disabled="isSubmitting">OK</button>
      <button type="button" :disabled="isSubmitting" @click="navigateTo('/')">Cancelar</button>
      <button id="register" type="button" :disabled="isSubmitting" @click="navigateTo(loginLink)">Entrar…</button>
    </template>
  </AuthLogonScreen>
</template>
<script setup lang="ts">
import { useDialog } from "~~/composables/useDialog";
import { authClient } from "@@/lib/auth-client.ts";
import { useLoadingWindow } from "~~/composables/useLoadingWindow";
import { authErrorMessage } from "~~/lib/authErrors";

useSeoMeta({
  title: 'Criar Conta - VTT 98 SE',
  ogTitle: 'Criar Conta - VTT 98 SE',
  description: 'Cadastre-se gratuitamente no VTT 98 SE e comece a mestrar suas sessões de RPG com facilidade.',
  ogDescription: 'Cadastre-se gratuitamente no VTT 98 SE e comece a mestrar suas sessões de RPG com facilidade.',
  ogImage: '/assets/screenshots/vtt_98_screenshot_7.png',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Criar Conta - VTT 98 SE',
  twitterDescription: 'Cadastre-se gratuitamente no VTT 98 SE e comece a mestrar suas sessões de RPG com facilidade.',
  twitterImage: '/assets/screenshots/vtt_98_screenshot_7.png',
})

const route = useRoute()

/** Mantém o ?redirect= (só caminhos internos) para depois do primeiro login. */
const redirectQuery = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : ''
})
const loginLink = computed(() => redirectQuery.value ? `/login?redirect=${encodeURIComponent(redirectQuery.value)}` : '/login')

const err = ref<string|null>(null)

// Erros aparecem numa caixa de mensagem (DesktopDialogHost, em app.vue).
watch(err, async (message) => {
  if (!message) return
  await useDialog().alert(message, { title: 'Não foi possível criar a conta', icon: 'warning' })
  err.value = null
})
const isSubmitting = ref(false)
const { withLoading } = useLoadingWindow()

const submitForm = async () => {

  err.value = null

  if (!form.password || !form.passwordConfirm || !form.name || !form.email) {
    err.value = 'Preencha todos os campos'
    return
  }

  if (form.password !== form.passwordConfirm) {
    err.value = "A senha não confere com a confirmação"
    return
  }

  if (!form.acceptedTerms) {
    err.value = 'Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.'
    return
  }

  isSubmitting.value = true
  try {
    await withLoading(() => authClient.signUp.email({
      name: form.name,
      email: form.email,
      password: form.password,
    }, {
      onSuccess: (ctx) => {
          navigateTo(loginLink.value)
      },
      onError: (ctx) => {
        err.value = authErrorMessage(ctx.error)
      }
    }), 'Registrando...')
  } finally {
    isSubmitting.value = false
  }
}


const form = reactive({
  password: '',
  passwordConfirm: '',
  name: '',
  email: '',
  acceptedTerms: false,
})
</script>
