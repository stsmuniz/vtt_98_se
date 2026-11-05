<script setup lang="ts">
definePageMeta({
  layout: 'website'
})

const description = 'Como o VTT 98 SE coleta, usa, protege e elimina seus dados pessoais, em conformidade com a LGPD. Não vendemos dados e não fazemos marketing.'

useSeoMeta({
  title: 'Política de Privacidade - VTT 98 SE',
  ogTitle: 'Política de Privacidade - VTT 98 SE',
  description,
  ogDescription: description,
  twitterCard: 'summary',
  twitterTitle: 'Política de Privacidade - VTT 98 SE',
  twitterDescription: description,
})

const toc = [
  { id: 'resumo', title: 'Resumo' },
  { id: 'controlador', title: 'Quem é o responsável' },
  { id: 'dados', title: 'Quais dados coletamos' },
  { id: 'finalidades', title: 'Para que usamos e com qual base legal' },
  { id: 'nao-fazemos', title: 'O que nunca fazemos' },
  { id: 'compartilhamento', title: 'Com quem compartilhamos' },
  { id: 'transferencia', title: 'Transferência internacional' },
  { id: 'links-publicos', title: 'Imagens, salas e links' },
  { id: 'seguranca', title: 'Segurança' },
  { id: 'retencao', title: 'Por quanto tempo guardamos' },
  { id: 'direitos', title: 'Seus direitos' },
  { id: 'criancas', title: 'Crianças e adolescentes' },
  { id: 'cookies', title: 'Cookies e armazenamento local' },
  { id: 'alteracoes', title: 'Alterações nesta política' },
  { id: 'contato', title: 'Contato' },
]
</script>

<template>
  <WebsiteLegalDocument title="Política de Privacidade" version="1.1" effective-date="5 de novembro de 2026" :toc="toc">
    <section id="resumo">
      <h2>1. Resumo</h2>
      <div class="legal-summary">
        <p>Em poucas palavras:</p>
        <ul>
          <li><strong>Não vendemos, não alugamos e não cedemos seus dados</strong> a ninguém.</li>
          <li><strong>Não usamos seus dados para marketing</strong> de nenhuma forma: não há anúncios, newsletters promocionais nem criação de perfis.</li>
          <li>Coletamos apenas o necessário para o VTT 98 SE funcionar: nome, e-mail, senha (guardada de forma irreversível) e o conteúdo que você cria.</li>
          <li>Os dados ficam em servidores protegidos, com conexão criptografada e acesso restrito.</li>
          <li>Tratamos seus dados de acordo com a <strong>Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)</strong>.</li>
          <li>Você pode consultar, corrigir ou excluir seus dados a qualquer momento — inclusive apagando a conta pelo próprio sistema.</li>
        </ul>
      </div>
    </section>

    <section id="controlador">
      <h2>2. Quem é o responsável pelos seus dados</h2>
      <p>
        O <strong>VTT 98 SE</strong> (vtt98se.com.br) é mantido por <strong>Salustiano Muniz</strong>, pessoa física, que atua como
        <strong>controlador</strong> dos dados pessoais tratados no serviço, nos termos do art. 5º, VI, da LGPD.
      </p>
      <p>
        O canal de comunicação para assuntos de privacidade e proteção de dados — inclusive pedidos dos titulares e
        contatos da Autoridade Nacional de Proteção de Dados (ANPD) — é o e-mail
        <a href="mailto:privacidade@vtt98se.com.br">privacidade@vtt98se.com.br</a>.
      </p>
    </section>

    <section id="dados">
      <h2>3. Quais dados coletamos</h2>
      <h3>3.1. Dados que você nos fornece</h3>
      <ul>
        <li><strong>Cadastro:</strong> nome, endereço de e-mail e senha. A senha nunca é armazenada em texto: guardamos apenas um <em>hash</em> criptográfico, que não permite recuperá-la.</li>
        <li><strong>Conteúdo do jogo:</strong> imagens que você envia (tokens e cenários), nomes, tags, atributos de personagens, cenas, salas, ordem de iniciativa e, se você definir, a senha de uma sala (também guardada apenas como <em>hash</em>).</li>
        <li><strong>Preferências:</strong> configurações da interface, como papel de parede, escala da tela, sons e modo de exibição das pastas.</li>
      </ul>
      <h3>3.2. Dados gerados pelo uso</h3>
      <ul>
        <li><strong>Sessão de acesso:</strong> quando você entra no sistema, registramos um identificador de sessão, o endereço IP e a identificação do navegador (<em>user agent</em>) usados naquela sessão, para manter você conectado e proteger sua conta contra uso indevido.</li>
        <li><strong>Diagnóstico técnico:</strong> registros de erros e de desempenho do aplicativo (por exemplo, a página em que ocorreu um erro, tipo de navegador e sistema operacional e tempo de carregamento), usados exclusivamente para encontrar e corrigir falhas.</li>
        <li><strong>Estatísticas de acesso:</strong> contagem agregada de visitas às páginas, sem cookies e sem identificar quem você é.</li>
      </ul>
      <h3>3.3. Visitantes de salas</h3>
      <p>
        Jogadores convidados para uma sala não precisam de conta. Para salas protegidas por senha, geramos um código de acesso
        temporário. O estado da partida em tempo real (posição dos tokens ainda não salva) fica guardado temporariamente por no
        máximo 6 horas.
      </p>
      <h3>3.4. O que não coletamos</h3>
      <p>
        Não pedimos CPF, endereço, telefone, dados de pagamento ou localização precisa, e não coletamos dados pessoais sensíveis
        (como origem racial, religião, saúde ou orientação sexual). Pedimos que você também não inclua esse tipo de informação em
        imagens, nomes ou anotações.
      </p>
    </section>

    <section id="finalidades">
      <h2>4. Para que usamos seus dados e com qual base legal</h2>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th scope="col">Finalidade</th>
              <th scope="col">Dados</th>
              <th scope="col">Base legal (LGPD, art. 7º)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Criar e manter sua conta, autenticar seu acesso e oferecer as funcionalidades do VTT (tokens, cenários, cenas, salas)</td>
              <td>Cadastro, conteúdo do jogo, preferências</td>
              <td>Execução de contrato — os Termos de Uso (inciso V)</td>
            </tr>
            <tr>
              <td>Proteger sua conta e o serviço contra fraudes, invasões e abusos</td>
              <td>Sessão de acesso (IP, navegador)</td>
              <td>Legítimo interesse (inciso IX)</td>
            </tr>
            <tr>
              <td>Diagnosticar erros e melhorar o desempenho do aplicativo</td>
              <td>Diagnóstico técnico, estatísticas agregadas</td>
              <td>Legítimo interesse (inciso IX)</td>
            </tr>
            <tr>
              <td>Atender seus pedidos, apurar denúncias e cumprir ordens judiciais ou requisições de autoridades</td>
              <td>Os dados necessários a cada caso</td>
              <td>Cumprimento de obrigação legal (inciso II) e exercício regular de direitos (inciso VI)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Usamos o e-mail apenas para identificar sua conta e, quando necessário, para comunicações sobre o próprio serviço
        (por exemplo, avisos importantes sobre sua conta ou sobre estes documentos) — nunca para propaganda.
      </p>
    </section>

    <section id="nao-fazemos">
      <h2>5. O que nunca fazemos</h2>
      <ul>
        <li>Vender, alugar, trocar ou ceder seus dados pessoais a terceiros.</li>
        <li>Usar seus dados para marketing, publicidade direcionada ou envio de propaganda.</li>
        <li>Exibir anúncios no VTT 98 SE.</li>
        <li>Criar perfis comportamentais ou tomar decisões automatizadas a seu respeito.</li>
        <li>Usar suas imagens ou conteúdos para treinar sistemas de inteligência artificial.</li>
      </ul>
    </section>

    <section id="compartilhamento">
      <h2>6. Com quem compartilhamos</h2>
      <p>
        Para o VTT 98 SE funcionar, contamos com prestadores de infraestrutura que tratam dados <strong>apenas em nosso nome e
        sob nossas instruções</strong> (operadores, nos termos da LGPD). Eles não podem usar seus dados para fins próprios:
      </p>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th scope="col">Prestador</th>
              <th scope="col">Para quê</th>
              <th scope="col">Onde</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Vercel Inc.</td>
              <td>Hospedagem do aplicativo, armazenamento das imagens enviadas e estatísticas agregadas de acesso</td>
              <td>Estados Unidos e rede global</td>
            </tr>
            <tr>
              <td>Supabase Inc.</td>
              <td>Banco de dados (contas, conteúdo do jogo, preferências)</td>
              <td>Estados Unidos</td>
            </tr>
            <tr>
              <td>Upstash Inc.</td>
              <td>Sincronização em tempo real das salas (dados temporários)</td>
              <td>Estados Unidos</td>
            </tr>
            <tr>
              <td>Grafana Labs</td>
              <td>Registro de erros e desempenho (diagnóstico técnico)</td>
              <td>Brasil (São Paulo)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Além disso, podemos fornecer dados a autoridades públicas quando houver <strong>ordem judicial ou requisição legal</strong>,
        ou quando necessário para apurar e denunciar crimes, conforme descrito nos
        <NuxtLink to="/termos">Termos de Uso</NuxtLink>.
      </p>
    </section>

    <section id="transferencia">
      <h2>7. Transferência internacional de dados</h2>
      <p>
        Parte dos prestadores listados acima armazena dados fora do Brasil, principalmente nos Estados Unidos. Essas transferências
        ocorrem nas hipóteses do art. 33 da LGPD, apenas para a execução do serviço que você contratou, e com prestadores que adotam
        salvaguardas contratuais e técnicas de proteção de dados compatíveis com as exigidas pela legislação brasileira.
      </p>
    </section>

    <section id="links-publicos">
      <h2>8. Imagens, salas e links</h2>
      <p>
        Para que os jogadores de uma sala possam ver o mapa e os tokens, as imagens enviadas são servidas por endereços
        (URLs) longos e aleatórios, que não aparecem em buscadores nem são listados publicamente. Porém, <strong>qualquer pessoa
        que tenha o endereço exato de uma imagem consegue abri-la</strong>. Da mesma forma, quem tiver o código de uma sala (e a senha,
        se houver) pode acompanhar a partida. Compartilhe códigos e senhas de sala apenas com quem você quer que participe e não
        envie imagens que você não compartilharia com seus jogadores.
      </p>
    </section>

    <section id="seguranca">
      <h2>9. Segurança</h2>
      <p>Adotamos medidas técnicas e administrativas para proteger seus dados (art. 46 da LGPD), entre elas:</p>
      <ul>
        <li>Toda a comunicação entre seu navegador e nossos servidores é criptografada (HTTPS/TLS).</li>
        <li>Senhas de conta e de sala são armazenadas apenas como <em>hash</em> criptográfico.</li>
        <li>O banco de dados tem acesso restrito, com bloqueio de acesso externo por regras de segurança em nível de linha (<em>Row Level Security</em>), e cada conteúdo só pode ser lido ou alterado pela conta dona dele.</li>
        <li>Os servidores são operados por provedores de infraestrutura com certificações e práticas reconhecidas de segurança.</li>
        <li>Coletamos o mínimo de dados necessário e eliminamos o que não é mais preciso.</li>
      </ul>
      <p>
        Nenhum sistema conectado à internet é totalmente invulnerável. Se ocorrer um incidente de segurança que possa trazer risco
        ou dano relevante a você, comunicaremos os titulares afetados e a ANPD, nos termos do art. 48 da LGPD.
      </p>
    </section>

    <section id="retencao">
      <h2>10. Por quanto tempo guardamos seus dados</h2>
      <ul>
        <li><strong>Conta, conteúdo e preferências:</strong> enquanto sua conta existir. Ao excluir a conta, apagamos imediatamente seus dados do banco e as imagens que você enviou.</li>
        <li><strong>Sessões de acesso:</strong> até a sessão expirar ou você sair do sistema.</li>
        <li><strong>Estado temporário das salas:</strong> no máximo 6 horas.</li>
        <li><strong>Diagnóstico técnico:</strong> pelo período limitado de retenção do prestador, apenas o necessário para investigar falhas.</li>
        <li><strong>Cópias de segurança</strong> mantidas pelos provedores de infraestrutura podem conter dados excluídos por um curto período, até serem sobrescritas automaticamente.</li>
      </ul>
      <p>
        Poderemos conservar dados por mais tempo apenas quando a lei exigir ou para preservar provas em casos de denúncia de
        conteúdo ilegal ou de ordem judicial (art. 16 da LGPD).
      </p>
    </section>

    <section id="direitos">
      <h2>11. Seus direitos</h2>
      <p>Como titular dos dados, você pode, a qualquer momento (art. 18 da LGPD):</p>
      <ul>
        <li>confirmar se tratamos seus dados e acessá-los;</li>
        <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
        <li>pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários ou tratados em desacordo com a lei;</li>
        <li>pedir a portabilidade dos seus dados;</li>
        <li>pedir a eliminação dos seus dados e informações sobre com quem eles são compartilhados;</li>
        <li>opor-se a tratamentos baseados em legítimo interesse, quando cabível;</li>
        <li>apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).</li>
      </ul>
      <p>
        Você pode alterar seu nome e <strong>excluir sua conta diretamente no sistema</strong>, em
        <strong>Iniciar &gt; Usuário</strong> (a exclusão pede sua senha e apaga na hora todos os seus dados e imagens).
        Para os demais pedidos, escreva para <a href="mailto:privacidade@vtt98se.com.br">privacidade@vtt98se.com.br</a>
        a partir do e-mail cadastrado. Responderemos em até 15 dias.
      </p>
    </section>

    <section id="criancas">
      <h2>12. Crianças e adolescentes</h2>
      <p>
        O VTT 98 SE é uma ferramenta de RPG de mesa que pode ser usada por adolescentes. Em respeito ao Estatuto da Criança e do
        Adolescente, ao ECA Digital (Lei nº 15.211/2025) e ao art. 14 da LGPD:
      </p>
      <ul>
        <li>não exibimos publicidade, não criamos perfis e não usamos dados de crianças e adolescentes para nenhuma finalidade comercial;</li>
        <li>coletamos apenas os dados indispensáveis para o funcionamento do serviço;</li>
        <li>crianças com menos de 12 anos só podem criar conta com o consentimento e o acompanhamento de um dos pais ou responsável legal;</li>
        <li>recomendamos que adolescentes usem o serviço com o conhecimento dos responsáveis.</li>
      </ul>
      <p>
        Se identificarmos dados de uma criança coletados sem o consentimento exigido, eles serão eliminados. Pais ou responsáveis
        podem solicitar acesso, correção ou exclusão pelo e-mail <a href="mailto:privacidade@vtt98se.com.br">privacidade@vtt98se.com.br</a>.
        Denúncias de conteúdo que coloque crianças ou adolescentes em risco devem ser enviadas para
        <a href="mailto:denuncia@vtt98se.com.br">denuncia@vtt98se.com.br</a>.
      </p>
    </section>

    <section id="cookies">
      <h2>13. Cookies e armazenamento local</h2>
      <p>
        Usamos apenas um <strong>cookie essencial de sessão</strong>, que mantém você conectado depois de entrar no sistema. Sem ele, o
        login não funciona. Também podemos guardar preferências da interface no armazenamento local do seu navegador, para que a
        tela abra do jeito que você deixou. Não usamos cookies de publicidade nem de rastreamento de terceiros, e as estatísticas de
        acesso são coletadas sem cookies.
      </p>
    </section>

    <section id="alteracoes">
      <h2>14. Alterações nesta política</h2>
      <p>
        Podemos atualizar esta política para refletir mudanças no serviço ou na legislação. A data de vigência no topo da página
        sempre indica a versão atual. Mudanças relevantes serão avisadas no próprio sistema antes de entrarem em vigor.
      </p>
    </section>

    <section id="contato">
      <h2>15. Contato</h2>
      <p>
        Dúvidas, pedidos ou reclamações sobre privacidade:
        <a href="mailto:privacidade@vtt98se.com.br">privacidade@vtt98se.com.br</a>.
        Veja também os <NuxtLink to="/termos">Termos de Uso</NuxtLink>.
      </p>
    </section>
  </WebsiteLegalDocument>
</template>
