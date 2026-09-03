<script setup lang="ts">
</script>
<template>
  <header>
    <img class="main-page-logo" :src="`/assets/logos/vtt_98_se_logo_v1_vertical.png`" alt="Logo do VTT 98 SE" />
    <nav>
      <menu class="main-menu">
        <li><NuxtLink to="/">Home</NuxtLink></li>
        <li><NuxtLink to="/about">Sobre</NuxtLink></li>
        <li><NuxtLink to="/screenshots">Screenshots</NuxtLink></li>
        <li><NuxtLink to="/blog">Blog</NuxtLink></li>
        <li><NuxtLink to="/support">Ajude-nos</NuxtLink></li>
        <li><NuxtLink to="/login">Login</NuxtLink></li>
        <li><NuxtLink to="/register">Cadastre-se</NuxtLink></li>
      </menu>
    </nav>
  </header>
</template>
<style lang="css" scoped>
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
</style>