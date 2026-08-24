<template>
  <fixed-window
      title="Tokens"
      icon="tokens"
      v-if="isTokenWindowOpen"
      @close-window="isTokenWindowOpen = false">
    <tokens-window @close-window="isTokenWindowOpen = false"/>
  </fixed-window>
  <fixed-window
      title="Cenários"
      icon="scenario"
      v-if="isScenarioWindowOpen"
      @close-window="isScenarioWindowOpen = false">
    <scenarios-window @close-window="isScenarioWindowOpen = false"/>
  </fixed-window>
  <fixed-window
      title="Cenas"
      icon="scenes"
      v-if="isSceneWindowOpen"
      @close-window="isSceneWindowOpen = false">
    <scenes-window @close-window="isSceneWindowOpen = false"/>
  </fixed-window>
  <div class="dashboard-main-window">
    <aside class="sidebar">
      <h3>Dashboard</h3>
      <div class="rainbow-line"></div>
      <p class="description">Selecione um elemento para abrir a janela de listagem.</p>
    </aside>
    <section class="main">
      <Icon name="Token" icon="tokens" @click="openTokenWindow"/>
      <Icon name="Cenário" icon="scenario" @click="openScenarioWindow"/>
      <Icon name="Cena" icon="scenes" @click="openSceneWindow"/>
    </section>
  </div>
</template>
<script setup lang="ts">
import TokensWindow from "@/components/TokensWindow.vue";
import ScenariosWindow from "@/components/ScenariosWindow.vue";
import FixedWindow from "@/components/FixedWIndow.vue";
import Icon from "~/components/Icon.vue";
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const isTokenWindowOpen = ref(false)
const isScenarioWindowOpen = ref(false)
const isSceneWindowOpen = ref(false)

const openTokenWindow = () => {
  isTokenWindowOpen.value = true
}

const openScenarioWindow = () => {
  isScenarioWindowOpen.value = true
}

const openSceneWindow = () => {
  isSceneWindowOpen.value = true
}
</script>
<style lang="css" scoped>
.main {
  padding: 1rem;
  gap: 2rem;
  display: flex;
  align-items: flex-start;
}
aside.sidebar {
  display: none;
}
@media screen and (min-width: 768px) {
  .dashboard-main-window {
    display: flex;
    gap: 2rem;
    aside.sidebar {
      display: block;
      font-family: "Geist Pixel", sans-serif;
      background: url('/assets/backgrounds/directory.jpg') no-repeat top left;
      background-size: 125%;
      padding: 0;
      width: 20vw;
      h3 {
        font-size: 2rem;
        margin: 2rem;
      }
      .description {
        margin: 2rem;
        font-size: 1.4rem;
      }
    }
  }
}
.rainbow-line {
  height: 4px;
  width: 100%;
  background: linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet);
}
</style>