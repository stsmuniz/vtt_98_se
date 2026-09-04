<template>
  <section>
    <div v-if="err">
      <alert-window
          title="Erro ao registrar"
          icon="warning"
          @alert-button-OK="clearError"
      >
        {{ err }}
      </alert-window>
    </div>
    <div class="window login-window">
      <div class="title-bar">
        <div class="title-bar-text">Boas vindas ao VTT 98 SE</div>
        <div class="title-bar-controls">
          <button aria-label="Ajuda"><strong>?</strong></button>
        </div>
      </div>
      <div class="window-body">
        <div class="window-icon">
          <img src="/assets/icons/login.png"/>
        </div>
        <div class="window-content">
          <form class="login-form" @submit.prevent="submitForm" style="display: grid; grid-template-columns: 1fr auto; gap: 1rem;">
            <div style="display: flex; flex-direction: column; gap: 0.2rem;">
              <div>
                <p>Entre com seus dados para criar um registro de novo usuário e permitir acesso ao sistema.</p>
                <p>Caso já tenha cadastro, clique no botão "Entrar" para seguir para o formulário de login.</p>
              </div>
              <div class="field-row">
                <label for="name">Seu Nome</label>
                <input v-model="form.name" type="text" name="name" id="name" :disabled="isSubmitting">
              </div>
              <div class="field-row">
                <label for="email">E-mail</label>
                <input v-model="form.email" type="email" name="email" id="email" :disabled="isSubmitting">
              </div>
              <div class="field-row">
                <label for="password">Senha</label>
                <input v-model="form.password" type="password" name="password" id="password" :disabled="isSubmitting">
              </div>
              <div class="field-row">
                <label for="password">Confirme Senha</label>
                <input v-model="form.passwordConfirm" type="password" name="password-confirm" id="password-confirm" :disabled="isSubmitting">
              </div>
            </div>
            <div class="buttons">
              <button id="submit-login-form" type="submit" :disabled="isSubmitting">
                OK
              </button>
              <NuxtLink to="/login">
                <button id="register" type="button" :disabled="isSubmitting">
                  Entrar
                </button>
              </NuxtLink>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { authClient } from "@@/lib/auth-client.ts";
import { useLoadingWindow } from "~~/composables/useLoadingWindow";

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

const err = ref<string|null>(null)
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

  isSubmitting.value = true
  try {
    await withLoading(() => authClient.signUp.email({
      name: form.name,
      email: form.email,
      password: form.password,
    }, {
      onRequest: (ctx) => {
        console.log(ctx)
      },
      onSuccess: (ctx) => {
          navigateTo('/login')
      },
      onError: (ctx) => {
        err.value = ctx.error.message
      }
    }), 'Registrando...')
  } finally {
    isSubmitting.value = false
  }
}

const clearError = () => {
  err.value = null
}

const form = reactive({
  password: '',
  passwordConfirm: '',
  name: '',
  email: '',
})
</script>
<style lang="css" scoped>
section {
  background-color: teal;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-window {
  width: 90vw;
}

.login-window .window-body, .alert-window .window-body {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2rem;
}

.window-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.window-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

.login-form label {
  min-width: 25%;
}

.login-form input {
  min-width: 80%;
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
}

@media screen and (min-width: 960px) {
  .login-window {
    width: 30vw;
  }
}
</style>
