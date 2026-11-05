<script setup lang="ts">
definePageMeta({
  layout: 'website'
})

const description = 'Regras de uso do VTT 98 SE: o que é permitido, o que é proibido e como denunciar conteúdo ilegal.'

useSeoMeta({
  title: 'Termos de Uso - VTT 98 SE',
  ogTitle: 'Termos de Uso - VTT 98 SE',
  description,
  ogDescription: description,
  twitterCard: 'summary',
  twitterTitle: 'Termos de Uso - VTT 98 SE',
  twitterDescription: description,
})

const toc = [
  { id: 'aceitacao', title: 'Aceitação' },
  { id: 'servico', title: 'O serviço' },
  { id: 'conta', title: 'Sua conta' },
  { id: 'conteudo', title: 'Seu conteúdo' },
  { id: 'proibicoes', title: 'Usos proibidos' },
  { id: 'denuncias', title: 'Denúncias e medidas' },
  { id: 'propriedade', title: 'Propriedade intelectual' },
  { id: 'responsabilidade', title: 'Disponibilidade e responsabilidade' },
  { id: 'encerramento', title: 'Encerramento da conta' },
  { id: 'alteracoes', title: 'Alterações nestes termos' },
  { id: 'lei', title: 'Lei aplicável e foro' },
  { id: 'contato', title: 'Contato' },
]
</script>

<template>
  <WebsiteLegalDocument title="Termos de Uso" version="1.0" effective-date="5 de novembro de 2026" :toc="toc">
    <section id="aceitacao">
      <h2>1. Aceitação</h2>
      <p>
        Estes Termos de Uso regulam o uso do <strong>VTT 98 SE</strong> (vtt98se.com.br), mesa virtual para RPG mantida por
        Salustiano Muniz. Ao criar uma conta ou usar o serviço — inclusive como visitante de uma sala —, você declara que leu,
        entendeu e concorda com estes termos e com a <NuxtLink to="/privacidade">Política de Privacidade</NuxtLink>. Se não
        concordar, não use o serviço.
      </p>
    </section>

    <section id="servico">
      <h2>2. O serviço</h2>
      <p>
        O VTT 98 SE é uma ferramenta para organizar e conduzir sessões de RPG de mesa pela internet: cadastro de tokens e
        cenários, montagem de cenas e salas de jogo compartilhadas em tempo real. O serviço é oferecido gratuitamente,
        atualmente em fase de testes (<em>beta</em>). Funcionalidades podem ser criadas, alteradas ou removidas a qualquer
        momento.
      </p>
    </section>

    <section id="conta">
      <h2>3. Sua conta</h2>
      <ul>
        <li>Informe dados verdadeiros no cadastro e mantenha seu e-mail atualizado.</li>
        <li>Sua senha é pessoal: não a compartilhe. Você é responsável pelas atividades realizadas com a sua conta.</li>
        <li>Avise-nos imediatamente se suspeitar de uso não autorizado da sua conta.</li>
        <li>Crianças com menos de 12 anos só podem criar conta com o consentimento e o acompanhamento de um dos pais ou responsável legal. Recomendamos que adolescentes usem o serviço com o conhecimento dos responsáveis.</li>
      </ul>
    </section>

    <section id="conteudo">
      <h2>4. Seu conteúdo</h2>
      <p>
        Tudo o que você envia ou cria no VTT 98 SE (imagens, nomes, atributos, cenas, salas) continua sendo seu. Para que o
        serviço funcione, você nos autoriza a armazenar, processar e exibir esse conteúdo — para você e para as pessoas que
        você convidar para suas salas — apenas enquanto ele estiver na plataforma e somente para operar o serviço.
      </p>
      <p>
        Você é o único responsável pelo conteúdo que envia e declara ter o direito de usá-lo. Envie apenas imagens que você
        criou, que estejam em domínio público ou licenciadas para esse uso, ou que você esteja autorizado a utilizar.
      </p>
    </section>

    <section id="proibicoes">
      <h2>5. Usos proibidos</h2>
      <p>
        O VTT 98 SE existe para jogar RPG. <strong>É proibido usar a plataforma para armazenar, transmitir, exibir ou
        compartilhar conteúdo ilegal</strong>, ou para qualquer atividade contrária às leis brasileiras. Em especial, é proibido:
      </p>
      <ul>
        <li>qualquer conteúdo de exploração ou abuso sexual de crianças e adolescentes (Estatuto da Criança e do Adolescente, arts. 240 a 241-E);</li>
        <li>divulgar cena de sexo, nudez ou pornografia sem o consentimento das pessoas retratadas, ou imagens íntimas de terceiros (Código Penal, art. 218-C);</li>
        <li>conteúdo racista ou que pratique, induza ou incite discriminação ou preconceito de raça, cor, etnia, religião ou procedência nacional (Lei nº 7.716/1989), incluindo a injúria racial;</li>
        <li>ameaças, perseguição, assédio, incitação à violência, apologia de crime ou de terrorismo;</li>
        <li>violar direitos autorais, marcas ou outros direitos de terceiros (Lei nº 9.610/1998), inclusive distribuindo material protegido sem autorização;</li>
        <li>expor dados pessoais de outras pessoas sem autorização;</li>
        <li>golpes, fraudes, <em>phishing</em> ou distribuição de vírus e programas maliciosos;</li>
        <li>usar o VTT 98 SE como depósito ou hospedagem de arquivos sem relação com partidas de RPG;</li>
        <li>tentar invadir, sobrecarregar ou burlar a segurança do serviço, acessar contas ou dados de outras pessoas, ou coletar dados de forma automatizada;</li>
        <li>passar-se por outra pessoa ou criar contas para contornar uma suspensão.</li>
      </ul>
      <p>
        Conteúdo violento, sombrio ou de terror faz parte de muitas histórias de RPG e não é proibido por si só, desde que seja
        ficcional, compartilhado apenas com quem concordou em jogar e não se enquadre nas proibições acima.
      </p>
    </section>

    <section id="denuncias">
      <h2>6. Denúncias e medidas</h2>
      <p>
        Se você encontrar conteúdo que viole estes termos, denuncie pelo e-mail
        <a href="mailto:denuncia@vtt98se.com.br">denuncia@vtt98se.com.br</a>, informando o código da sala ou o endereço do
        conteúdo e uma breve descrição. Denúncias são analisadas com prioridade e sigilo.
      </p>
      <p>Diante de uma violação, poderemos, conforme a gravidade:</p>
      <ul>
        <li>remover o conteúdo;</li>
        <li>suspender ou excluir a conta responsável, sem aviso prévio nos casos graves;</li>
        <li>preservar os dados e registros relacionados como prova;</li>
        <li>
          <strong>comunicar o fato às autoridades competentes</strong> — como a Polícia Federal, a Polícia Civil e o Ministério
          Público — e colaborar com as investigações, nos termos da legislação brasileira, inclusive do Marco Civil da Internet
          (Lei nº 12.965/2014) e do Estatuto da Criança e do Adolescente.
        </li>
      </ul>
      <p>
        O uso da plataforma para fins ilegais sujeita o responsável às sanções civis e penais previstas em lei. Crimes contra
        crianças e adolescentes também podem ser denunciados diretamente pela
        <a href="https://new.safernet.org.br/denuncie" target="_blank" rel="noopener noreferrer">Central de Denúncias da SaferNet Brasil</a>
        ou pelo Disque 100.
      </p>
    </section>

    <section id="propriedade">
      <h2>7. Propriedade intelectual</h2>
      <p>
        O software, o nome e a identidade visual do VTT 98 SE pertencem ao seu mantenedor, exceto os componentes de terceiros
        usados sob suas próprias licenças, como os ícones do tema Chicago95 (GPL-3.0) e a biblioteca 98.css (MIT). O VTT 98 SE
        é inspirado na estética de sistemas operacionais dos anos 1990 e <strong>não tem nenhuma relação com a Microsoft</strong>;
        "Windows" é marca registrada da Microsoft Corporation.
      </p>
    </section>

    <section id="responsabilidade">
      <h2>8. Disponibilidade e responsabilidade</h2>
      <p>
        Trabalhamos para manter o serviço disponível e seus dados protegidos, mas, por se tratar de um serviço gratuito em fase
        de testes, ele é oferecido no estado em que se encontra, podendo passar por interrupções, instabilidades ou perda de
        dados. Recomendamos guardar cópias das imagens que forem importantes para você.
      </p>
      <p>
        Não respondemos pelo conteúdo enviado pelos usuários nem por danos decorrentes do uso indevido do serviço por terceiros,
        na forma do art. 19 do Marco Civil da Internet. Nada nestes termos limita direitos que o Código de Defesa do Consumidor
        lhe garanta.
      </p>
    </section>

    <section id="encerramento">
      <h2>9. Encerramento da conta</h2>
      <p>
        Você pode encerrar sua conta a qualquer momento, solicitando pelo e-mail
        <a href="mailto:privacidade@vtt98se.com.br">privacidade@vtt98se.com.br</a>. A exclusão apaga seus dados e conteúdos,
        conforme a <NuxtLink to="/privacidade">Política de Privacidade</NuxtLink>. Também podemos encerrar contas que violem
        estes termos ou descontinuar o serviço, avisando com antecedência razoável sempre que possível.
      </p>
    </section>

    <section id="alteracoes">
      <h2>10. Alterações nestes termos</h2>
      <p>
        Estes termos podem ser atualizados. A data de vigência no topo da página indica a versão atual, e mudanças relevantes
        serão avisadas no próprio sistema antes de entrarem em vigor. Continuar usando o serviço depois disso significa
        concordar com a nova versão.
      </p>
    </section>

    <section id="lei">
      <h2>11. Lei aplicável e foro</h2>
      <p>
        Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro do domicílio do usuário para
        resolver qualquer controvérsia relacionada a eles.
      </p>
    </section>

    <section id="contato">
      <h2>12. Contato</h2>
      <ul>
        <li>Denúncias de conteúdo: <a href="mailto:denuncia@vtt98se.com.br">denuncia@vtt98se.com.br</a></li>
        <li>Privacidade e dados pessoais: <a href="mailto:privacidade@vtt98se.com.br">privacidade@vtt98se.com.br</a></li>
      </ul>
    </section>
  </WebsiteLegalDocument>
</template>
