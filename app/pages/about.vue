<script setup lang="ts">
definePageMeta({
  layout: 'website'
})
</script>
<template>
  <section>
    <header>
      <h2>Sobre o VTT 98 SE</h2>
    </header>
    <article>
      <H3>História e Motivação</H3>
      <p>Muitas mesas virtuais modernas se tornaram ecossistemas pesados, repletos de automações de regras, compêndios pagos e interfaces poluídas. Embora sejam ótimas para alguns grupos, muitas vezes o mestre só precisa de uma tela simples para mostrar onde cada personagem está no mapa.</p>
      <p>O vtt 98 se nasceu dessa necessidade real: criar uma ferramenta leve e ágil para jogar RPG online com o meu grupo de amigos, onde o foco está na narrativa e no apoio visual em tempo real, sem perder tempo configurando automações antes da sessão.</p>
      <h3>Filosofia do Sistema</h3>
      <dl>
        <dt>Simplicidade:</dt>
        <dd>Cadastre seus cenários, suba seus tokens e jogue.</dd>
        <dt>Independência:</dt>
        <dd>Sem travar o jogo a sistemas de regras específicos.</dd>
        <dt>Acessibilidade:</dt>
        <dd>Roda direto no navegador sem necessidade de download ou instalação.</dd>
      </dl>
      <h3>O Desenvolvedor</h3>
      <p>Desenvolvido por um entusiasta de RPG e programação que buscava unir a nostalgia das interfaces clássicas do final dos anos 90 com os padrões de arquitetura e performance da web atual.</p>
      <!-- espaço para uma foto minha -->
      <h3>Arquitetura & Tecnologia</h3>
      <p>Para os curiosos e desenvolvedores: sob a casca visual inspirada no Windows 98, o vtt 98 se roda em uma arquitetura stateless moderna e otimizada:</p>

      <table>
        <tbody>
        <tr>
          <td>Frontend</td>
          <td>Nuxt 4 / HTML5 / 98.css / TypeScript</td>
        </tr>
        <tr>
          <td>Sincronização em Tempo Real</td>
          <td>WebSockets & Redis</td>
        </tr>
        <tr>
          <td>Backend & API</td>
          <td>API REST stateless com autenticação via JWT</td>
        </tr>
        <tr>
          <td>Banco de Dados</td>
          <td>PostgreSQL (hospedado no Supabase)</td>
        </tr>
        <tr>
          <td>Hospedagem</td>
          <td>Vercel</td>
        </tr>
        </tbody>
      </table>
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
table {
  margin: 0 auto;
  border: 1px solid #ccc;
  border-collapse: collapse;
  width: 100%;
  max-width: 600px;
  font-family: Arial, sans-serif;
  tr {
    border-bottom: 1px solid #ccc;
    &:last-child {
      border-bottom: none;
    }
    td {
      padding: 0.5rem;
      text-align: left;
      border-right: 1px solid #ccc;
      &:last-child {
        border-right: none;
      }
      &:first-child {
        font-weight: bold;
        width: 150px;
        text-align: right;
        padding-right: 1rem;
        background-color: #f2f2f2;
      }
    }
  }
}
</style>