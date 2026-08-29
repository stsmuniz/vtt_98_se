<template>
  <section>
    <div v-if="err">
      <alert-window
          title="Erro ao registrar"
          icon="warning"
          @alert-button-OK="clearError">
        {{ err }}
      </alert-window>
    </div>
    <div class="window login-window">
      <div class="title-bar">
        <div class="title-bar-text">Boas vindas ao VTT Prototype 98 SE</div>
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
                <p>Entre com suas credenciais no formulário abaixo para se conectar ao sistema. Para sua segurança, pediremos seu nome de usuário e senha toda vez que você fizer um novo acesso.</p>
                <p>Caso ainda não tenha um cadastro, clique no botão "Registrar" para seguir para o formulário de cadastro.</p>
              </div>
              <div class="field-row">
                <label for="email">E-mail</label>
                <input v-model="form.email" type="email" name="email" id="email">
              </div>
              <div class="field-row">
                <label for="password">Senha</label>
                <input v-model="form.password" type="password" name="password" id="password">
              </div>
            </div>
            <div class="buttons">
              <button id="submit-login-form" type="submit">
                OK
              </button>
              <NuxtLink to="/register">
                <button id="register">
                  Registrar
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
import AlertWindow from "../components/AlertWindow.vue";
import {authClient} from "~~/lib/auth-client.ts";

const err = ref<string|null>(null)

const submitForm = async () => {
  err.value = null

  if (form.email === '' || form.password === '') {
    err.value = 'Preencha todos os campos'
    return
  }

  const {data, error} = await authClient.signIn.email({
    email: form.email,
    password: form.password,
  }, {
    onRequest: (ctx) => {
      console.log(ctx)
    },
    onSuccess: (ctx) => {
      navigateTo('/dashboard')
    },
    onError: (ctx) => {
      err.value = ctx.error.message
    }
  });
}

const clearError = () => {
  err.value = null
}

const form = reactive({
  email: '',
  password: '',
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
