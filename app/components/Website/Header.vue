<script setup lang="ts">
</script>
<template>
  <header class="site-header">
    <NuxtLink to="/" class="logo-link" aria-label="Página inicial do VTT 98 SE">
      <img class="main-page-logo" :src="`/assets/logos/vtt_98_se_logo_v1_vertical.png`" alt="Logo do VTT 98 SE" />
    </NuxtLink>
    <nav aria-label="Navegação principal">
      <ul class="main-menu">
        <li><NuxtLink to="/">Home</NuxtLink></li>
        <li><NuxtLink to="/about">Sobre</NuxtLink></li>
        <li><NuxtLink to="/screenshots">Screenshots</NuxtLink></li>
        <li><NuxtLink to="/blog">Blog</NuxtLink></li>
        <li><NuxtLink to="/support">Ajude-nos</NuxtLink></li>
        <li><NuxtLink to="/login">Login</NuxtLink></li>
        <li><NuxtLink to="/register">Cadastre-se</NuxtLink></li>
      </ul>
    </nav>
  </header>
</template>
<style lang="css" scoped>
.site-header {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  width: 100%;
  margin-bottom: 1.5rem;
}

.logo-link {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  text-decoration: none;
  max-width: 100%;
}

.main-page-logo {
  max-width: 100%;
  width: 256px;
  height: auto;
  object-fit: contain;
}

nav {
  width: 100%;
}

.main-menu {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.5rem 1rem;
  list-style: none;
  padding: 0;
  margin: 1rem 0 0.5rem;
}

.main-menu li {
  white-space: nowrap;
}

.main-menu a {
  color: #0000ee;
  text-decoration: underline;
  font-size: 1.05rem;
}

.main-menu a:hover {
  color: #551a8b;
}
</style>