<script setup lang="ts">
definePageMeta({
  layout: 'website'
})
const chavePix = '198de8e9-ed9f-4f73-8a18-5045bb98436c'
const copyToClipboard = async () => {
  await navigator.clipboard.writeText(chavePix)
  alert('chave pix copiada para a área de transferência')
}

</script>
<template>
  <section>
    <header>
      <h2>Apoie o vtt 98 se</h2>
      <p>O vtt 98 se é um projeto independente criado por paixão ao RPG e ao desenvolvimento web. Ele é oferecido
        gratuitamente para a comunidade para apoiar sessões de jogo simples e acessíveis.</p>
    </header>
  </section>
  <article>
    <h3>Transparência de Custos e Limites</h3>
    <p>Atualmente o sistema opera em camadas gratuitas dos serviços de hospedagem:</p>
    <table>
      <tbody>
        <tr>
          <td>Vercel</td>
          <td>Hospedagem da aplicação web (limite de tráfego e requisições mensais).</td>
        </tr>
        <tr>
          <td>Supabase</td>
          <td>Banco de dados PostgreSQL (limite de armazenamento e conexões simultâneas).</td>
        </tr>
        <tr>
          <td>Redis</td>
          <td>Gerenciamento de estado de salas e tempo real.</td>
        </tr>
      </tbody>
    </table>
    <p>Conforme mais grupos utilizam o sistema, as cotas gratuitas mensais chegam perto do limite. O objetivo de
      arrecadação é cobrir os custos operacionais de servidor e adquirir um domínio próprio (.com ou .com.br).</p>
    <h3>Plano de Novas Funcionalidades (Roadmap)</h3>
    <p>Com o apoio da comunidade, os próximos passos do projeto incluem:</p>
    <div class="list-wrapper">
      <ul>
        <li>Domínio Próprio</li>
        <li>Envio de e-mails para alertas, mudança de senha, etc.</li>
        <li>Atribuição de tokens para jogadores</li>
        <li>Fog of War.</li>
        <li>E o que mais a comunidade opinar e for possível.</li>
      </ul>
    </div>
    <h3>Como Ajudar</h3>
    <p>Você pode contribuir de duas formas simples:</p>
    <p>Doação via Pix: Ajude a manter os servidores ativos e a pagar a anuidade do domínio.</p>
    <h4>Chave Pix:</h4>
    <pre id="chave-pix" @click="copyToClipboard">198de8e9-ed9f-4f73-8a18-5045bb98436c</pre>
    <small>Clique no texto para copiar a chave.</small>
    <h4>Feedback e Divulgação:</h4>
    Reporte bugs, sugira melhorias e indique o VTT 98 SE para seu grupo de RPG e amigos mestres!
  </article>
</template>
<style lang="css" scoped>
.list-wrapper {
  text-align: center;
  ul {
    display: inline-block;
    text-align: left;
    li {
      font-weight: bold;
      padding: 0.25rem;
    }
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