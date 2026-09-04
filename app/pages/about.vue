<script setup lang="ts">
definePageMeta({
  layout: 'website'
})
</script>
<template>
  <article class="page-content about-page">
    <header class="page-header">
      <h2>Sobre o VTT 98 SE</h2>
    </header>

    <section class="content-section">
      <h3>História e Motivação</h3>
      <p>Muitas mesas virtuais modernas se tornaram ecossistemas pesados, repletos de automações de regras, compêndios pagos e interfaces poluídas. Embora sejam ótimas para alguns grupos, muitas vezes o mestre só precisa de uma tela simples para mostrar onde cada personagem está no mapa.</p>
      <p>O VTT 98 SE nasceu dessa necessidade real: criar uma ferramenta leve e ágil para jogar RPG online com o meu grupo de amigos, onde o foco está na narrativa e no apoio visual em tempo real, sem perder tempo configurando automações antes da sessão.</p>
    </section>

    <section class="content-section">
      <h3>Filosofia do Sistema</h3>
      <dl class="philosophy-list">
        <dt>Simplicidade:</dt>
        <dd>Cadastre seus cenários, suba seus tokens e jogue.</dd>
        <dt>Independência:</dt>
        <dd>Sem travar o jogo a sistemas de regras específicos.</dd>
        <dt>Acessibilidade:</dt>
        <dd>Roda direto no navegador sem necessidade de download ou instalação.</dd>
      </dl>
    </section>

    <section class="content-section">
      <h3>O Desenvolvedor</h3>
      <p>Desenvolvido por um entusiasta de RPG e programação que buscava unir a nostalgia das interfaces clássicas do final dos anos 90 com os padrões de arquitetura e performance da web atual.</p>
    </section>

    <section class="content-section">
      <h3>Arquitetura &amp; Tecnologia</h3>
      <p>Para os curiosos e desenvolvedores: sob a casca visual inspirada no Windows 98, o VTT 98 SE roda em uma arquitetura stateless moderna e otimizada:</p>

      <div class="table-responsive">
        <table class="tech-table">
          <tbody>
            <tr>
              <th scope="row">Frontend</th>
              <td>Nuxt 4 / HTML5 / 98.css / TypeScript</td>
            </tr>
            <tr>
              <th scope="row">Sincronização em Tempo Real</th>
              <td>WebSockets &amp; Redis</td>
            </tr>
            <tr>
              <th scope="row">Backend &amp; API</th>
              <td>API REST stateless com autenticação via JWT</td>
            </tr>
            <tr>
              <th scope="row">Banco de Dados</th>
              <td>PostgreSQL (hospedado no Supabase)</td>
            </tr>
            <tr>
              <th scope="row">Hospedagem</th>
              <td>Vercel</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </article>
</template>
<style lang="css" scoped>
.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.content-section {
  margin-bottom: 2rem;
}

.philosophy-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 1rem 0;
}

.philosophy-list dt {
  font-weight: bold;
}

.philosophy-list dd {
  margin-left: 1rem;
  margin-top: 0.15rem;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
  margin: 1.5rem 0;
  -webkit-overflow-scrolling: touch;
}

.tech-table {
  margin: 0 auto;
  border: 1px solid #808080;
  border-collapse: collapse;
  width: 100%;
  font-size: 1rem;
  font-family: "Times New Roman", Times, serif;
}

.tech-table th,
.tech-table td {
  padding: 0.65rem 0.85rem;
  text-align: left;
  border: 1px solid #808080;
}

.tech-table thead th {
  background-color: #000080;
  color: #ffffff;
  font-weight: bold;
}

.tech-table tbody th {
  background-color: #f2f2f2;
  font-weight: bold;
  width: 35%;
}

@media screen and (max-width: 576px) {
  .tech-table tbody th {
    width: 40%;
  }
}
</style>