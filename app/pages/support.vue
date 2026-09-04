<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({
  layout: 'website'
})

const chavePix = '198de8e9-ed9f-4f73-8a18-5045bb98436c'
const copied = ref(false)

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(chavePix)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 3000)
  } catch {
    alert('Chave Pix: ' + chavePix)
  }
}
</script>
<template>
  <article class="page-content support-page">
    <header class="page-header">
      <h2>Apoie o VTT 98 SE</h2>
      <p class="subtitle">
        O VTT 98 SE é um projeto independente criado por paixão ao RPG e ao desenvolvimento web.
        Ele é oferecido gratuitamente para a comunidade para apoiar sessões de jogo simples e acessíveis.
      </p>
    </header>

    <section class="content-section">
      <h3>Transparência de Custos e Limites</h3>
      <p>Atualmente o sistema opera em camadas gratuitas dos serviços de hospedagem:</p>

      <div class="table-responsive">
        <table class="tech-table">
          <tbody>
            <tr>
              <th scope="row">Vercel</th>
              <td>Hospedagem da aplicação web (limite de tráfego e requisições mensais).</td>
            </tr>
            <tr>
              <th scope="row">Supabase</th>
              <td>Banco de dados PostgreSQL (limite de armazenamento e conexões simultâneas).</td>
            </tr>
            <tr>
              <th scope="row">Redis</th>
              <td>Gerenciamento de estado de salas e tempo real.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Conforme mais grupos utilizam o sistema, as cotas gratuitas mensais chegam perto do limite.
        O objetivo de arrecadação é cobrir os custos operacionais de servidor e adquirir um domínio próprio (.com ou .com.br).
      </p>
    </section>

    <section class="content-section">
      <h3>Plano de Novas Funcionalidades (Roadmap)</h3>
      <p>Com o apoio da comunidade, os próximos passos do projeto incluem:</p>
      <div class="list-wrapper">
        <ul>
          <li>Domínio Próprio</li>
          <li>Envio de e-mails para alertas, mudança de senha, etc.</li>
          <li>Atribuição de tokens para jogadores</li>
          <li>Fog of War</li>
          <li>E o que mais a comunidade opinar e for possível.</li>
        </ul>
      </div>
    </section>

    <section class="content-section">
      <h3>Como Ajudar</h3>
      <p>Você pode contribuir de duas formas simples:</p>

      <h4>1. Doação via Pix</h4>
      <p>Ajude a manter os servidores ativos e a pagar a anuidade do domínio.</p>

      <div class="pix-container">
        <strong>Chave Pix:</strong>
        <pre
          id="chave-pix"
          role="button"
          tabindex="0"
          title="Clique para copiar a chave Pix"
          @click="copyToClipboard"
          @keydown.enter.prevent="copyToClipboard"
          @keydown.space.prevent="copyToClipboard"
        >{{ chavePix }}</pre>
        <small class="pix-tip">
          {{ copied ? '✓ Chave Pix copiada para a área de transferência!' : 'Clique no quadro acima para copiar a chave.' }}
        </small>
      </div>

      <h4>2. Feedback e Divulgação</h4>
      <p>Reporte bugs, sugira melhorias e indique o VTT 98 SE para seu grupo de RPG e amigos mestres!</p>
    </section>
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

.content-section {
  margin-bottom: 2rem;
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
  width: 25%;
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
  font-weight: bold;
  padding: 0.35rem 0;
}

.pix-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem 0;
  width: 100%;
}

#chave-pix {
  background-color: #ffffff;
  color: #000000;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  padding: 0.75rem 1rem;
  font-family: monospace;
  font-size: 1rem;
  cursor: pointer;
  max-width: 100%;
  overflow-x: auto;
  word-break: break-all;
  white-space: pre-wrap;
  text-align: center;
  box-sizing: border-box;
}

#chave-pix:hover {
  background-color: #f8f8f8;
}

.pix-tip {
  color: #000080;
  font-weight: bold;
  font-size: 0.85rem;
  text-align: center;
}
</style>