<script setup lang="ts">
/** Fim do "Desligar": tela preta com o aviso em laranja. Qualquer tecla ou clique "religa". */
definePageMeta({ layout: false })
useHead({ title: 'VTT 98 SE' })

function powerOn() {
  navigateTo('/login')
}

onMounted(() => window.addEventListener('keydown', powerOn, { once: true }))
onBeforeUnmount(() => window.removeEventListener('keydown', powerOn))
</script>

<template>
  <main class="turnoff" data-test="turnoff" @click="powerOn">
    <h1 class="turnoff-text">Seu VTT já pode ser desligado com segurança.</h1>
    <p class="turnoff-hint">Pressione qualquer tecla ou clique para ligar novamente.</p>
  </main>
</template>

<style scoped>
.turnoff {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-5);
  padding: var(--sp-5);
  background: #000;
  cursor: pointer;
}
.turnoff-text {
  max-width: 18ch;
  margin: 0;
  color: #ff8a00;
  font-family: var(--font-display);
  font-size: var(--fs-4);
  font-weight: normal;
  line-height: calc(var(--fs-4) * 1.25);
  text-align: center;
}
.turnoff-hint {
  margin: 0;
  color: #5a3a10;
  font-family: var(--font-ui);
  font-size: var(--fs-1);
  text-align: center;
}
</style>
