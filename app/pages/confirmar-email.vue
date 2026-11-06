<template>
  <AuthLogonScreen :title="title" icon="info" :busy="isSubmitting" @submit="resend">
    <template #intro>
      <template v-if="confirmed">
        <p>Seu e-mail foi confirmado. Sua conta está pronta para usar!</p>
      </template>
      <template v-else-if="invalidLink">
        <p>O link de confirmação é inválido ou expirou.</p>
        <p>Digite seu e-mail e peça um novo.</p>
      </template>
      <template v-else>
        <p v-if="justSent">Enviamos um e-mail de confirmação para o endereço informado. Clique no link da mensagem para ativar a sua conta.</p>
        <p v-else>Você precisa confirmar o seu e-mail antes de usar o VTT 98 SE.</p>
        <p>Não recebeu? Confira a caixa de spam ou peça o envio de novo.</p>
      </template>
    </template>

    <UiTextField v-if="!confirmed" v-model="email" input-id="email" name="email" type="email" label="E-mail:" autocomplete="username" />

    <template #buttons>
      <button v-if="confirmed" type="button" class="default" @click="navigateTo(afterLogin)">Entrar</button>
      <template v-else>
        <button id="resend-confirmation" type="submit" class="default" :disabled="isSubmitting || cooldown > 0">
          {{ cooldown > 0 ? `Aguarde ${cooldown}s` : 'Enviar e-mail de confirmação' }}
        </button>
        <button type="button" :disabled="isSubmitting" @click="navigateTo(loginLink)">Voltar ao login</button>
      </template>
    </template>
  </AuthLogonScreen>
</template>

<script setup lang="ts">
import { useDialog } from "~~/composables/useDialog";
import { authClient } from "~~/lib/auth-client.ts";
import { useLoadingWindow } from "~~/composables/useLoadingWindow";
import { authErrorMessage } from "~~/lib/authErrors";

useSeoMeta({ title: 'Confirmar e-mail - VTT 98 SE', robots: 'noindex' })

const route = useRoute()
const first = (v: unknown) => (Array.isArray(v) ? v[0] : v)

const redirectQuery = computed(() => {
  const r = first(route.query.redirect)
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : ''
})
const afterLogin = computed(() => redirectQuery.value || '/dashboard')
const loginLink = computed(() => redirectQuery.value ? `/login?redirect=${encodeURIComponent(redirectQuery.value)}` : '/login')

const confirmed = computed(() => first(route.query.status) === 'ok' && !route.query.error)
const invalidLink = computed(() => Boolean(route.query.error))
const justSent = computed(() => first(route.query.enviado) === '1')
const title = computed(() => confirmed.value ? 'E-mail confirmado' : 'Confirme o seu e-mail')

const email = ref(typeof first(route.query.email) === 'string' ? first(route.query.email) as string : '')
const isSubmitting = ref(false)
const cooldown = ref(justSent.value ? 60 : 0) // o cadastro acabou de enviar um e-mail
const { withLoading } = useLoadingWindow()

let timer: ReturnType<typeof setInterval> | undefined
function startCooldown() {
  cooldown.value = 60
  clearInterval(timer)
  timer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) clearInterval(timer)
  }, 1000)
}
onMounted(() => { if (cooldown.value > 0) startCooldown() })
onBeforeUnmount(() => clearInterval(timer))

async function resend() {
  if (!email.value) {
    await useDialog().alert('Digite o seu e-mail.', { title: 'Confirmar e-mail', icon: 'warning' })
    return
  }
  isSubmitting.value = true
  let error: Parameters<typeof authErrorMessage>[0] = null
  try {
    const callbackURL = `/confirmar-email?status=ok${redirectQuery.value ? `&redirect=${encodeURIComponent(redirectQuery.value)}` : ''}`
    await withLoading(() => authClient.sendVerificationEmail({ email: email.value, callbackURL }, {
      onError: (ctx) => { error = ctx.error },
    }), 'Enviando...')
  } finally {
    isSubmitting.value = false
  }
  if (error) {
    await useDialog().alert(authErrorMessage(error, 'Não foi possível enviar o e-mail.'), { title: 'Não foi possível enviar', icon: 'warning' })
    return
  }
  startCooldown()
  // Resposta genérica: não revela se o e-mail tem conta.
  await useDialog().alert('Se houver uma conta com esse e-mail aguardando confirmação, enviamos a mensagem. Confira também a caixa de spam.', { title: 'E-mail enviado' })
}
</script>
