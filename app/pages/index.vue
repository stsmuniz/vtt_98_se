<script setup lang="ts">
definePageMeta({
  layout: 'website'
})

const { data: latestPost } = await useAsyncData('home-latest-post', () =>
  queryCollection('blog').order('date', 'DESC').first()
)

useSeoMeta({
  title: 'VTT 98 SE - Virtual Tabletop Retrô para RPG de Mesa',
  ogTitle: 'VTT 98 SE - Virtual Tabletop Retrô para RPG de Mesa',
  description: 'Mesa virtual gratuita e leve para RPG de mesa com visual nostálgico de Windows 98, suporte a tokens, mapas e sincronização em tempo real.',
  ogDescription: 'Mesa virtual gratuita e leve para RPG de mesa com visual nostálgico de Windows 98, suporte a tokens, mapas e sincronização em tempo real.',
  ogImage: '/assets/screenshots/vtt_98_screenshot_7.png',
  twitterCard: 'summary_large_image',
  twitterTitle: 'VTT 98 SE - Virtual Tabletop Retrô para RPG de Mesa',
  twitterDescription: 'Mesa virtual gratuita e leve para RPG de mesa com visual nostálgico de Windows 98, suporte a tokens, mapas e sincronização em tempo real.',
  twitterImage: '/assets/screenshots/vtt_98_screenshot_7.png',
})
</script>
<template>
  <article class="page-content home-page">
    <header class="page-header">
      <h1>VTT 98 SE</h1>
      <p class="subtitle">Um virtual tabletop gratuito, leve, sincronizado e sem complicação</p>
      <div class="clippy-tip">
        <img
          src="/assets/gifs/clippit.gif"
          alt="Clippit, o assistente virtual do Office 97"
          class="clippy-gif"
          width="80"
          height="70"
        />
        <div class="clippy-balloon">
          <p>Parece que você está vendo um site de 1998. Quer saber um segredo? Por baixo do visual, a tecnologia é de 2026.</p>
        </div>
      </div>
    </header>

    <section class="content-section">
      <h2>O que é</h2>
      <p>
        O VTT 98 SE é um sistema web <strong>100% gratuito</strong> para apoio visual em sessões de RPG de mesa e jogos de tabuleiro.
        Desenvolvido para rodar direto no seu navegador com a estética nostálgica das janelas do Windows 98 e a
        performance de tecnologias modernas.
      </p>

      <div class="list-wrapper">
        <ul>
          <li><strong>Sem poluição visual:</strong> Sem fichas automáticas complexas ou milhares de menus escondidos.</li>
          <li><strong>100% Sincronizado:</strong> O mestre move os tokens e a tela atualiza instantaneamente para todos os jogadores.</li>
          <li><strong>Agnóstico:</strong> Funciona com D&D, Tormenta20, Call of Cthulhu, Ordem Paranormal ou qualquer sistema.</li>
        </ul>
      </div>

      <div class="media-container">
        <Lightbox
          src="/assets/screenshots/vtt_98_screenshot_7.png"
          thumbnail="/assets/screenshots/vtt_98_screenshot_7.avif"
          width="854"
          height="406"
          alt="Tela inicial do sistema"
          title="VTT 98 SE - Tela inicial"
        />
      </div>
      <p class="see-more">
        <NuxtLink to="/screenshots">Ver mais telas do sistema &rarr;</NuxtLink>
      </p>
    </section>

    <section class="content-section">
      <h2>Recursos Principais</h2>
      <dl class="features-list">
        <dt>Canvas Realtime</dt>
        <dd>Posicione mapas de fundo e mova miniaturas com sincronização instantânea em tempo real.</dd>
        <dt>Gerenciador de Cenas</dt>
        <dd>Alterne rapidamente entre mapas, cenários de exploração e telas de descanso.</dd>
        <dt>Biblioteca de Tokens</dt>
        <dd>Suba suas próprias imagens de personagens, monstros e NPCs de forma simples.</dd>
        <dt>Rolador de Dados</dt>
        <dd>Janela flutuante para rolagem de dados rápidos (d4, d6, d8, d10, d12, d20).</dd>
        <dt>Lista de Iniciativa</dt>
        <dd>Organize a ordem de turno do combate de forma ágil para acompanhar todo o grupo.</dd>
      </dl>
    </section>

    <section v-if="latestPost" class="content-section news-section">
      <h2>Últimas Novidades</h2>
      <article class="news-item">
        <h3><NuxtLink :to="latestPost.path">{{ latestPost.title }}</NuxtLink></h3>
        <time class="news-date" :datetime="latestPost.date">{{ latestPost.date }}</time>
        <p>{{ latestPost.description }}</p>
        <NuxtLink to="/blog" class="see-more-link">Ver todas as novidades &rarr;</NuxtLink>
      </article>
    </section>

    <section class="content-section cta-section">
      <h2>Pronto para começar sua sessão?</h2>
      <p class="cta-free-note">Sem cartão de crédito, sem instalação. Crie sua conta gratuita agora.</p>
      <div class="cta-link-container">
        <NuxtLink to="/login" class="cta-link">Entrar no sistema</NuxtLink>
        <NuxtLink to="/register" class="cta-link cta-link-primary">Criar conta gratuita</NuxtLink>
      </div>
    </section>
  </article>
</template>
<style lang="css" scoped>
.page-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 1.5rem;
}

.subtitle {
  text-align: center;
  font-style: italic;
  margin-top: 0.25rem;
}

.clippy-tip {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  margin: 1rem auto 0;
}

.clippy-gif {
  flex-shrink: 0;
  image-rendering: pixelated;
}

.clippy-balloon {
  position: relative;
  background-color: #ffffcc;
  border: 2px solid #000000;
  border-radius: 12px;
  padding: 0.6rem 0.9rem;
  margin-left: 1rem;
  margin-bottom: 0.5rem;
  max-width: 260px;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.25);
}

.clippy-balloon p {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.35;
  text-align: left;
  font-style: normal;
}

.clippy-balloon::before,
.clippy-balloon::after {
  content: "";
  position: absolute;
  bottom: 10px;
  border-style: solid;
  border-top-color: transparent;
  border-bottom-color: transparent;
  border-left-color: transparent;
}

.clippy-balloon::before {
  left: -16px;
  border-width: 8px 16px 8px 0;
  border-right-color: #000000;
}

.clippy-balloon::after {
  left: -12px;
  border-width: 6px 12px 6px 0;
  border-right-color: #ffffcc;
}

@media screen and (max-width: 480px) {
  .clippy-balloon {
    max-width: 180px;
    font-size: 0.8rem;
  }
}

.content-section {
  margin-bottom: 2rem;
}

.see-more {
  text-align: center;
  margin-top: 0.75rem;
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 1rem 0;
}

.features-list dt {
  font-weight: bold;
}

.features-list dd {
  margin-left: 1rem;
  margin-top: 0.15rem;
}

.list-wrapper {
  margin: 1.25rem 0;
  display: flex;
  justify-content: center;
}

.list-wrapper ul {
  display: inline-block;
  text-align: left;
  padding-left: 1.5rem;
  margin: 0;
}

.list-wrapper li {
  padding: 0.35rem 0;
}

.media-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1.5rem 0;
  width: 100%;
}

.news-section {
  border-top: 1px dotted #808080;
  padding-top: 1.5rem;
}

.news-item h3 {
  text-align: left;
  margin-top: 0;
  margin-bottom: 0.25rem;
}

.news-item h3 a {
  color: #000080;
  text-decoration: underline;
}

.news-item h3 a:hover {
  color: #0000ee;
}

.news-date {
  display: block;
  font-size: 0.9rem;
  color: #555555;
  margin-bottom: 0.5rem;
}

.see-more-link {
  color: #0000ee;
  text-decoration: underline;
  font-size: 0.95rem;
}

.cta-section {
  text-align: center;
  margin-top: 2.5rem;
}

.cta-free-note {
  font-size: 0.95rem;
  color: #333333;
}

.cta-link-container {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1.25rem;
}

.cta-link {
  display: inline-block;
  padding: 0.6rem 1.25rem;
  background-color: #c0c0c0;
  color: #000000;
  border: 2px solid;
  border-color: #ffffff #808080 #808080 #ffffff;
  box-shadow: inset 1px 1px 0px #dfdfdf, inset -1px -1px 0px #000000;
  text-decoration: none;
  font-weight: bold;
  font-size: 1rem;
  text-align: center;
  min-width: 150px;
}

.cta-link:active {
  border-color: #808080 #ffffff #ffffff #808080;
  box-shadow: inset 1px 1px 0px #000000, inset -1px -1px 0px #dfdfdf;
}

.cta-link:hover {
  background-color: #d0d0d0;
}
</style>