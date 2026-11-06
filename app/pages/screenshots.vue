<script setup lang="ts">
definePageMeta({
  layout: 'website'
})

const description = 'Conheça o VTT 98 SE por dentro: área de trabalho com janelas, salas de jogo em tempo real, tokens, documentos que os jogadores abrem em tamanho grande, rolador de dados, iniciativa e manual integrado.'

useSeoMeta({
  title: 'Galeria de Telas - VTT 98 SE',
  ogTitle: 'Galeria de Telas - VTT 98 SE',
  description,
  ogDescription: description,
  ogImage: '/assets/screenshots/compartilhamento.jpg',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Galeria de Telas - VTT 98 SE',
  twitterDescription: description,
  twitterImage: '/assets/screenshots/compartilhamento.jpg',
})
</script>
<template>
  <article class="page-content screenshots-page">
    <header class="page-header">
      <h1>Galeria de Capturas de Tela</h1>
      <p class="subtitle">Conheça as principais interfaces do VTT 98 SE antes de criar sua conta. Clique numa imagem para ampliar.</p>
    </header>

    <div class="screenshots-list">
      <section class="screenshot-item">
        <h2>Área de trabalho</h2>
        <p>Depois de entrar, você cai numa área de trabalho como a do Windows 98: uma pasta para cada tipo de conteúdo, menu Iniciar, barra de tarefas e quantas janelas você quiser abertas ao mesmo tempo. Cada pasta tem um selo que mostra o que ela guarda.</p>
        <div class="media-container">
          <WebsiteLightbox
            src="/assets/screenshots/desktop_vazia.png"
            thumbnail="/assets/screenshots/desktop_vazia.avif"
            width="854"
            height="421"
            alt="Área de trabalho do VTT 98 SE com as pastas Tokens, Documentos, Cenários, Cenas e Salas e o menu Iniciar aberto"
            title="Área de trabalho"
          />
        </div>
      </section>

      <section class="screenshot-item">
        <h2>Sala de jogo</h2>
        <p>A tela principal da sessão. O mestre move os tokens sobre o mapa e tudo é propagado em tempo real para os jogadores conectados. O rolador de dados e a lista de iniciativa são janelas flutuantes que você posiciona onde quiser. Use a roda do mouse para dar zoom e arraste o fundo para mover o mapa.</p>
        <div class="media-container media-stack">
          <WebsiteLightbox
            src="/assets/screenshots/sala_dados_iniciativa.png"
            thumbnail="/assets/screenshots/sala_dados_iniciativa.avif"
            width="854"
            height="421"
            alt="Sala de jogo com mapa de taverna, vários tokens, a lista de iniciativa e o rolador de dados"
            title="Sala de jogo com iniciativa e rolador de dados"
          />
          <WebsiteLightbox
            src="/assets/screenshots/cena_dados_iniciativa.png"
            thumbnail="/assets/screenshots/cena_dados_iniciativa.avif"
            width="854"
            height="421"
            alt="Outra sala de jogo, com personagens sobre um cenário de rochas e a lista de iniciativa"
            title="Sala de jogo com a barra de ferramentas do mestre"
          />
        </div>
      </section>

      <section class="screenshot-item">
        <h2>Biblioteca de tokens</h2>
        <p>Suba suas próprias imagens de personagens, monstros e objetos e organize tudo com tags. Cada token pode ter atributos (como vida e sanidade) que o mestre acompanha durante o jogo.</p>
        <div class="media-container">
          <WebsiteLightbox
            src="/assets/screenshots/editar_token.png"
            thumbnail="/assets/screenshots/editar_token.avif"
            width="854"
            height="531"
            alt="Pasta Tokens ao fundo e a janela de edição de um token com tags e atributos"
            title="Biblioteca de tokens"
          />
        </div>
      </section>

      <section class="screenshot-item">
        <h2>Controle de cada token</h2>
        <p>Clique com o botão direito num token para abrir as configurações, duplicar, substituir, inverter, restaurar a rotação ou remover. As alças de seleção permitem redimensionar e girar direto no mapa.</p>
        <div class="media-container">
          <WebsiteLightbox
            src="/assets/screenshots/config_cena.png"
            thumbnail="/assets/screenshots/config_cena.avif"
            width="854"
            height="418"
            alt="Token selecionado com alças de redimensionamento e o menu de contexto aberto"
            title="Menu de contexto de um token"
          />
        </div>
      </section>

      <section class="screenshot-item">
        <h2>Documentos</h2>
        <p>Novo: cartas, pistas, mapas e handouts. O mestre coloca o documento na mesa como uma miniatura, e qualquer jogador abre a imagem em tamanho grande com dois cliques, com zoom e arrastar. Só o mestre move os documentos.</p>
        <div class="media-container media-stack">
          <WebsiteLightbox
            src="/assets/screenshots/sala_tela_cheia.png"
            thumbnail="/assets/screenshots/sala_tela_cheia.avif"
            width="854"
            height="420"
            alt="Visão do mestre: a miniatura de um documento sobre o mapa, ao lado de um personagem"
            title="Documento na mesa (visão do mestre)"
          />
          <WebsiteLightbox
            src="/assets/screenshots/documento.png"
            thumbnail="/assets/screenshots/documento.avif"
            width="854"
            height="424"
            alt="Visão do jogador: o documento aberto em tamanho grande numa janela do visualizador"
            title="Documento aberto em tamanho grande (visão do jogador)"
          />
        </div>
      </section>

      <section class="screenshot-item">
        <h2>Salas e várias janelas</h2>
        <p>Criar uma sala é um assistente de poucos passos: nome, senha opcional, tags e a cena inicial. Quem recebe o link entra sem precisar de conta.</p>
        <div class="media-container">
          <WebsiteLightbox
            src="/assets/screenshots/wizard_sala_multiplas_janelas.png"
            thumbnail="/assets/screenshots/wizard_sala_multiplas_janelas.avif"
            width="854"
            height="611"
            alt="Pasta Salas com o assistente para adicionar sala aberto por cima"
            title="Assistente para adicionar sala"
          />
        </div>
      </section>

      <section class="screenshot-item">
        <h2>Rolador de dados</h2>
        <p>D2, D4, D6, D8, D10, D12, D20 e D100, com modificador e soma, maior ou menor valor. Você pode combinar dados diferentes numa só rolagem, e o histórico guarda as últimas jogadas.</p>
        <div class="media-container">
          <WebsiteLightbox
            src="/assets/screenshots/rolador_dados.png"
            thumbnail="/assets/screenshots/rolador_dados.avif"
            width="420"
            height="636"
            alt="Janela do rolador de dados com os dados D2 a D100, configurações, resultado e histórico"
            title="Rolador de dados"
          />
        </div>
      </section>

      <section class="screenshot-item">
        <h2>Manual integrado e conta</h2>
        <p>Aperte F1 em qualquer janela e o manual abre direto no assunto, no estilo dos arquivos de ajuda do Office 97. Pela janela do usuário você gerencia o seu nome, a senha e a sua conta.</p>
        <div class="media-container media-stack">
          <WebsiteLightbox
            src="/assets/screenshots/ajuda.png"
            thumbnail="/assets/screenshots/ajuda.avif"
            width="814"
            height="602"
            alt="Manual do VTT 98 SE aberto no capítulo Salas de jogo, com o sumário à esquerda"
            title="Manual do VTT 98 SE"
          />
          <WebsiteLightbox
            src="/assets/screenshots/config_usuario.png"
            thumbnail="/assets/screenshots/config_usuario.avif"
            width="400"
            height="455"
            alt="Janela Conta do usuário, com as abas Geral, Senha, Plano e Excluir conta"
            title="Conta do usuário"
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

/* Seções com mais de uma imagem: empilhadas, com espaço entre elas */
.media-stack {
  flex-direction: column;
  gap: 1.25rem;
}
</style>
