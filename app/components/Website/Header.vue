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
      </ul>
    </nav>
    <nav aria-label="Conta">
      <ul class="account-menu">
        <li><NuxtLink to="/login" class="account-link">Login</NuxtLink></li>
        <li><NuxtLink to="/register" class="account-link account-link-primary">Cadastre-se grátis</NuxtLink></li>
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

.account-menu {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  list-style: none;
  padding: 0;
  margin: 0 0 0.5rem;
}

.account-menu li {
  white-space: nowrap;
}

.account-link {
  display: inline-block;
  padding: 0.4rem 0.9rem;
  background-color: #c0c0c0;
  color: #000000;
  border: 2px solid;
  border-color: #ffffff #808080 #808080 #ffffff;
  box-shadow: inset 1px 1px 0px #dfdfdf, inset -1px -1px 0px #000000;
  text-decoration: none;
  font-weight: bold;
  font-size: 0.95rem;
}

.account-link:hover {
  background-color: #d0d0d0;
}

.account-link:active {
  border-color: #808080 #ffffff #ffffff #808080;
  box-shadow: inset 1px 1px 0px #000000, inset -1px -1px 0px #dfdfdf;
}

.account-link-primary {
  background-color: #000080;
  color: #ffffff;
}

.account-link-primary:hover {
  background-color: #0000a8;
}
</style>