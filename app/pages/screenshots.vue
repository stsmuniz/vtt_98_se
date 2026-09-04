<script setup lang="ts">
definePageMeta({
  layout: 'website'
})
</script>
<template>
  <article class="page-content screenshots-page">
    <header class="page-header">
      <h2>Galeria de Capturas de Tela</h2>
      <p class="subtitle">Conheça as principais interfaces do VTT 98 SE antes de criar sua conta.</p>
    </header>

    <div class="screenshots-list">
      <section class="screenshot-item">
        <h3>Sala</h3>
        <p>A tela principal do jogo, onde a ação acontece. O mestre controla os tokens no cenário e os movimentos são propagados em tempo real para os jogadores conectados à sala.</p>
        <div class="media-container">
          <Lightbox src="/assets/screenshots/vtt_98_screenshot_2.png" alt="Tela da sala" title="Sala de Jogo" />
        </div>
      </section>

      <section class="screenshot-item">
        <h3>Gerenciador de Cenas e Cenários</h3>
        <p>Organize os mapas da sua aventura. Alterne entre o mapa da masmorra, a taverna da cidade ou a imagem de um NPC importante com apenas um clique.</p>
        <div class="media-container">
          <Lightbox src="/assets/screenshots/vtt_98_screenshot_4.png" alt="Gerenciador de Cenas e Cenários" title="Gerenciador de Cenas e Cenários" />
        </div>
      </section>

      <section class="screenshot-item">
        <h3>Biblioteca de Tokens e Recursos</h3>
        <p>Suba suas próprias artes de miniaturas para o sistema. O gerenciador de tokens permite organizar personagens, monstros e objetos por categorias.</p>
        <div class="media-container">
          <Lightbox src="/assets/screenshots/vtt_98_screenshot_0.png" alt="Biblioteca de Tokens e Recursos" title="Biblioteca de Tokens e Recursos" />
        </div>
      </section>

      <section class="screenshot-item">
        <h3>Rolador de Dados e Lista de Iniciativa</h3>
        <p>Ferramentas de apoio flutuantes que podem ser movidas ou minimizadas na tela como janelas do sistema operacional.</p>
        <div class="media-container">
          <Lightbox src="/assets/screenshots/vtt_98_screenshot_7.png" alt="Rolador de Dados e Lista de Iniciativa" title="Rolador de Dados e Lista de Iniciativa" />
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