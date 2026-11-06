<template>
  <AuthLogonScreen title="Entrar no VTT 98 SE" :busy="isSubmitting" @submit="submitForm">
    <template #intro>
      <p>Digite seu e-mail e sua senha para entrar.</p>
      <p>Ainda não tem uma conta? Clique em Registrar.</p>
    </template>

    <UiTextField v-model="form.email" input-id="email" name="email" type="email" label="E-mail:" autocomplete="username" autofocus />
    <UiTextField v-model="form.password" input-id="password" name="password" type="password" label="Senha:" autocomplete="current-password" />

    <template #buttons>
      <button id="submit-login-form" type="submit" class="default" :disabled="isSubmitting">OK</button>
      <button type="button" :disabled="isSubmitting" @click="navigateTo('/')">Cancelar</button>
      <button id="register" type="button" :disabled="isSubmitting" @click="navigateTo(registerLink)">Registrar…</button>
    </template>

    <template #footer>
      <NuxtLink :to="forgotLink">Esqueci minha senha</NuxtLink>
    </template>
  </AuthLogonScreen>
</template>
<script setup lang="ts">
import { useDialog } from "~~/composables/useDialog";
import {authClient} from "~~/lib/auth-client.ts";
import {useLoadingWindow} from "~~/composables/useLoadingWindow";
import { authErrorMessage } from "~~/lib/authErrors";

useSeoMeta({
  title: 'Entrar - VTT 98 SE',
  ogTitle: 'Entrar - VTT 98 SE',
  description: 'Conecte-se ao VTT 98 SE para acessar suas salas e mesas de RPG de mesa virtuais.',
  ogDescription: 'Conecte-se ao VTT 98 SE para acessar suas salas e mesas de RPG de mesa virtuais.',
  ogImage: '/assets/screenshots/vtt_98_screenshot_7.png',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Entrar - VTT 98 SE',
  twitterDescription: 'Conecte-se ao VTT 98 SE para acessar suas salas e mesas de RPG de mesa virtuais.',
  twitterImage: '/assets/screenshots/vtt_98_screenshot_7.png',
})

const route = useRoute()

/** O ?redirect= recebido (só caminhos internos), repassado ao cadastro. */
const redirectQuery = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : ''
})

/** Para onde ir depois de entrar: só caminhos internos (evita redirecionar para outro site). */
const redirectTarget = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/dashboard'
})

const err = ref<string|null>(null)

// Depois de excluir a conta, o usuário cai aqui com ?conta=excluida.
onMounted(() => {
  if (route.query.conta === 'excluida') useDialog().alert('Sua conta foi excluída. Obrigado por ter usado o VTT 98 SE.', { title: 'Conta excluída' })
})

// Erros aparecem numa caixa de mensagem (DesktopDialogHost, em app.vue).
watch(err, async (message) => {
  if (!message) return
  await useDialog().alert(message, { title: 'Não foi possível entrar', icon: 'warning' })
  err.value = null
})
const isSubmitting = ref(false)
const { withLoading } = useLoadingWindow()

const submitForm = async () => {
  err.value = null

  if (form.email === '' || form.password === '') {
    err.value = 'Preencha todos os campos'
    return
  }

  isSubmitting.value = true
  try {
    await withLoading(() => authClient.signIn.email({
      email: form.email,
      password: form.password,
    }, {
      onSuccess: (ctx) => {
        navigateTo(redirectTarget.value)
      },
      onError: (ctx) => {
        // E-mail ainda não confirmado: leva à página onde se pede um novo e-mail de confirmação.
        if (ctx.error.code === 'EMAIL_NOT_VERIFIED') {
          navigateTo(confirmLink.value)
          return
        }
        err.value = authErrorMessage(ctx.error)
      }
    }), 'Entrando...')
  } finally {
    isSubmitting.value = false
  }
}


const registerLink = computed(() => redirectQuery.value ? `/register?redirect=${encodeURIComponent(redirectQuery.value)}` : '/register')

const forgotLink = computed(() => form.email ? `/esqueci-senha?email=${encodeURIComponent(form.email)}` : '/esqueci-senha')

const confirmLink = computed(() => {
  const q = new URLSearchParams({ email: form.email })
  if (redirectQuery.value) q.set('redirect', redirectQuery.value)
  return `/confirmar-email?${q}`
})

const form = reactive({
  email: '',
  password: '',
})
</script>
