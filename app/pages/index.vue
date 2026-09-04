<script setup lang="ts">
definePageMeta({
  layout: 'website'
})
</script>
<template>
  <article class="page-content home-page">
    <header class="page-header">
      <h2>VTT 98 SE</h2>
      <p class="subtitle">Um virtual tabletop leve, sincronizado e sem complicação</p>
    </header>

    <section class="content-section">
      <h3>O que é</h3>
      <p>
        O VTT 98 SE é um sistema web gratuito para apoio visual em sessões de RPG de mesa e jogos de tabuleiro.
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
          alt="Tela inicial do sistema"
          title="VTT 98 SE - Tela inicial"
        />
      </div>
    </section>

    <section class="content-section">
      <h3>Recursos Principais</h3>
      <dl class="features-list">
        <dt>Canvas Realtime</dt>
        <dd>Posicione mapas de fundo e mova miniaturas com sincronização instantânea via WebSockets.</dd>
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

    <section class="content-section cta-section">
      <h3>Pronto para começar sua sessão?</h3>
      <div class="cta-link-container">
        <NuxtLink to="/login" class="cta-link">Entrar no sistema</NuxtLink>
        <NuxtLink to="/register" class="cta-link cta-link-primary">Criar conta gratuita</NuxtLink>
      </div>
    </section>
  </article>
</template>
<style lang="css" scoped>
.page-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.subtitle {
  text-align: center;
  font-style: italic;
  margin-top: 0.25rem;
}

.content-section {
  margin-bottom: 2rem;
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

.cta-section {
  text-align: center;
  margin-top: 2.5rem;
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