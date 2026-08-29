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
  <fixed-window
      title="Salas"
      icon="desktop"
      v-if="isRoomWindowOpen"
      @close-window="isRoomWindowOpen = false">
    <rooms-window @close-window="isRoomWindowOpen = false"/>
  </fixed-window>
  <floating-window
      title="Rolador de dados"
      icon="dices/d20"
      v-if="isDiceRollerWindowOpen"
      @close-window="isDiceRollerWindowOpen = false"
  >
    <dice-roller />
  </floating-window>
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
      <Icon name="Sala" icon="desktop" @click="openRoomWindow"/>
      <Icon name="Dados" icon="dices/d20" @click="isDiceRollerWindowOpen = true"/>
    </section>
  </div>
</template>
<script setup lang="ts">
import FixedWindow from "@/components/FixedWIndow.vue";
import FloatingWindow from "~/components/FloatingWindow.vue";

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const isTokenWindowOpen = ref(false)
const isScenarioWindowOpen = ref(false)
const isSceneWindowOpen = ref(false)
const isRoomWindowOpen = ref(false)
const isDiceRollerWindowOpen = ref(false)

const openTokenWindow = () => {
  isTokenWindowOpen.value = true
}

const openScenarioWindow = () => {
  isScenarioWindowOpen.value = true
}

const openSceneWindow = () => {
  isSceneWindowOpen.value = true
}

const openRoomWindow = () => {
  isRoomWindowOpen.value = true
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
      background: url('/assets/backgrounds/directory.jpg') no-repeat top left;
      background-size: 125%;
      padding: 0;
      width: 20vw;
      h3 {
        margin: 2rem;
      }
      .description {
        margin: 2rem;
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