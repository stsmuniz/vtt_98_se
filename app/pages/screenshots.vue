<script setup lang="ts">
definePageMeta({
  layout: 'website'
})

useSeoMeta({
  title: 'Galeria de Telas - VTT 98 SE',
  ogTitle: 'Galeria de Telas - VTT 98 SE',
  description: 'Conheça as principais interfaces e ferramentas do VTT 98 SE: salas de jogo em tempo real, gerenciador de cenas, biblioteca de tokens, rolador de dados e iniciativa.',
  ogDescription: 'Conheça as principais interfaces e ferramentas do VTT 98 SE: salas de jogo em tempo real, gerenciador de cenas, biblioteca de tokens, rolador de dados e iniciativa.',
  ogImage: '/assets/screenshots/vtt_98_screenshot_7.png',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Galeria de Telas - VTT 98 SE',
  twitterDescription: 'Conheça as principais interfaces e ferramentas do VTT 98 SE: salas de jogo em tempo real, gerenciador de cenas, biblioteca de tokens, rolador de dados e iniciativa.',
  twitterImage: '/assets/screenshots/vtt_98_screenshot_7.png',
})
</script>
<template>
  <article class="page-content screenshots-page">
    <header class="page-header">
      <h1>Galeria de Capturas de Tela</h1>
      <p class="subtitle">Conheça as principais interfaces do VTT 98 SE antes de criar sua conta.</p>
    </header>

    <div class="screenshots-list">
      <section class="screenshot-item">
        <h2>Sala</h2>
        <p>A tela principal do jogo, onde a ação acontece. O mestre controla os tokens no cenário e os movimentos são propagados em tempo real para os jogadores conectados à sala.</p>
        <div class="media-container">
          <Lightbox
            src="/assets/screenshots/vtt_98_screenshot_2.png"
            thumbnail="/assets/screenshots/vtt_98_screenshot_2.avif"
            width="854"
            height="406"
            alt="Tela da sala"
            title="Sala de Jogo"
          />
        </div>
      </section>

      <section class="screenshot-item">
        <h2>Gerenciador de Cenas e Cenários</h2>
        <p>Organize os mapas da sua aventura. Alterne entre o mapa da masmorra, a taverna da cidade ou a imagem de um NPC importante com apenas um clique.</p>
        <div class="media-container">
          <Lightbox
            src="/assets/screenshots/vtt_98_screenshot_4.png"
            thumbnail="/assets/screenshots/vtt_98_screenshot_4.avif"
            width="854"
            height="407"
            alt="Gerenciador de Cenas e Cenários"
            title="Gerenciador de Cenas e Cenários"
          />
        </div>
      </section>

      <section class="screenshot-item">
        <h2>Biblioteca de Tokens e Recursos</h2>
        <p>Suba suas próprias artes de miniaturas para o sistema. O gerenciador de tokens permite organizar personagens, monstros e objetos por categorias.</p>
        <div class="media-container">
          <Lightbox
            src="/assets/screenshots/vtt_98_screenshot_0.png"
            thumbnail="/assets/screenshots/vtt_98_screenshot_0.avif"
            width="854"
            height="403"
            alt="Biblioteca de Tokens e Recursos"
            title="Biblioteca de Tokens e Recursos"
          />
        </div>
      </section>

      <section class="screenshot-item">
        <h2>Rolador de Dados e Lista de Iniciativa</h2>
        <p>Ferramentas de apoio flutuantes que podem ser movidas ou minimizadas na tela como janelas do sistema operacional.</p>
        <div class="media-container">
          <Lightbox
            src="/assets/screenshots/vtt_98_screenshot_7.png"
            thumbnail="/assets/screenshots/vtt_98_screenshot_7.avif"
            width="854"
            height="406"
            alt="Rolador de Dados e Lista de Iniciativa"
            title="Rolador de Dados e Lista de Iniciativa"
          />
        </div>
      </section>
    </div>
  </article>
</template>
<style lang="css" scoped>
.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.subtitle {
  text-align: center;
  font-style: italic;
  margin-top: 0.25rem;
}

.screenshots-list {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.screenshot-item {
  display: flex;
  flex-direction: column;
}

.media-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1rem;
  width: 100%;
}
</style>