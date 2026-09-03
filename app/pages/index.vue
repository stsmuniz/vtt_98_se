<script setup lang="ts">
definePageMeta({
  layout: 'website'
})
</script>
<template>
  <section>
    <header>
      <h2>VTT 98 SE</h2>
      <p>Um virtual tabletop leve, sincronizado e sem complicação</p>
    </header>
    <article>
      <h3>O que é</h3>
      <p>O VTT 98 SE é um sistema web gratuito para apoio visual em sessões de RPG de mesa e jogos de tabuleiro.
        Desenvolvido para rodar direto no seu navegador com a estética nostálgica das janelas do Windows 98 e a
        performance de tecnologias modernas.</p>
      <div class="list-wrapper">
        <ul>
          <li><strong>Sem poluição visual:</strong> Sem fichas automáticas complexas ou milhares de menus escondidos.</li>
          <li><strong>100% Sincronizado:</strong> O mestre move os tokens e a tela atualiza instantaneamente para todos os
            jogadores.
          </li>
          <li><strong>Agnóstico:</strong> Funciona com D&D, Tormenta20, Call of Cthulhu, Ordem Paranormal ou qualquer
            sistema.
          </li>
        </ul>
      </div>
      <h3>Recursos Principais</h3>
      <dl>
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
      <h3>Pronto para começar sua sessão?</h3>
      <div class="cta-link-container">
        <NuxtLink to="/login" class="cta-link">Entrar no sistema</NuxtLink>
        <NuxtLink to="/register" class="cta-link">Criar conta gratuíta</NuxtLink>
      </div>
    </article>
  </section>
</template>
<style lang="css" scoped>
dl {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  dt {
    font-weight: bold;
  }
}

.list-wrapper {
  text-align: center;
  ul {
    display: inline-block;
    text-align: left;
    li {
      padding: 0.25rem;
    }
  }
}

.cta-link-container {
  display: flex;
  justify-content: center;
  gap: 1rem;

  .cta-link {
    padding: 0.5rem 1rem;
    background-color: silver;
    color: black;
    border: 2px solid;
    border-color: #dfdfdf #808080 #808080 #dfdfdf;
    text-decoration: none;

    &:hover {
      background-color: #808080;
    }
  }
}
</style>