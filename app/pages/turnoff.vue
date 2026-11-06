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
    <h1 class="turnoff-text no-aa">Seu VTT já pode ser desligado com segurança.</h1>
    <p class="turnoff-hint no-aa">Pressione qualquer tecla ou clique para ligar novamente.</p>
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
  max-width: 20ch;
  margin: 0;
  color: #ff8a00;
  font-family: var(--font-turnoff);
  font-size: var(--fs-4);
  font-weight: 700;
  line-height: calc(var(--fs-4) * 1.25);
  text-align: center;
}
.turnoff-hint {
  margin: 0;
  color: #5a3a10;
  font-family: var(--font-turnoff);
  font-size: var(--fs-1);
  font-weight: 400;
  text-align: center;
}
</style>
