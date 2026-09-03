<script setup lang="ts">
</script>
<template>
    <session class="main">
      <header>
        <img class="main-page-logo" src="/assets/logos/vtt_98_se_logo_v1_vertical.png" alt="Logo do VTT 98 SE" />
        <nav>
          <menu class="main-menu">
            <li><NuxtLink to="/">Home</NuxtLink></li>
            <li><NuxtLink to="/">Sobre</NuxtLink></li>
            <li><NuxtLink to="/">Screenshots</NuxtLink></li>
            <li><NuxtLink to="/">Blog</NuxtLink></li>
            <li><NuxtLink to="/">Ajude-nos</NuxtLink></li>
            <li><NuxtLink to="/login">Login</NuxtLink></li>
          </menu>
        </nav>
      </header>
    </session>
</template>
<style lang="css">
.main {
  text-align: center;
  font-family: "Arial", sans-serif;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  header {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    .main-page-logo {
      width: 256px;
      object-fit: contain;
    }
    .main-menu {
      display: flex;
      gap: 1rem;
      list-style: none;
      padding: 0;
      margin: 0;
    }
  }
}
</style>