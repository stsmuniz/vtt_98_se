---
title: Salas de jogo
order: 8
icon: room
description: Como criar salas, convidar jogadores e conduzir uma sessão ao vivo.
---

Uma **sala** é onde a sessão acontece de verdade. Ela parte de uma cena — copiando o cenário e a posição dos tokens naquele momento — e permite ao mestre conduzir a partida em tempo real com os jogadores.

## Criando uma sala

Na pasta **Salas**, clique em **Novo**. O assistente pergunta, em etapas:

1. **Informações básicas** — o nome da sala e, se quiser, uma **senha**. Sem senha, qualquer pessoa com o link entra.
2. **Tags** — opcional.
3. **Cena inicial** — escolha a cena com **Procurar…**. Você pode trocar de cena depois.
4. **Resumo** — confira e clique em **Concluir**.

Ao terminar, o sistema pergunta se você quer **entrar na sala** agora. Cada sala recebe um **código** de dez caracteres (salas antigas mantêm o código de seis), que faz parte do link de convite.

## Convidando os jogadores

Na pasta **Salas**, clique com o botão direito na sala e escolha **Copiar link**; depois, envie o link ao grupo (e a senha, se houver). Quem tiver o link entra **sem precisar de conta**. **Abrir em nova aba** é útil para o mestre testar a sala vendo como jogador.

## Mestre e jogadores

- **Mestre (dono da sala)** — vê todas as ferramentas, mexe nos tokens, troca a cena, controla a iniciativa e abre ou fecha a sala.
- **Jogadores** — acompanham o mapa em tempo real e veem os tokens se movendo suavemente conforme o mestre os arrasta, mas não podem editar nada. Eles podem dar **zoom** (roda do mouse) e **mover o mapa** (arrastar o fundo) para olhar a mesa à vontade, e **abrir documentos** com dois cliques. A janela da sala deles tem só os menus **Exibir**, **Ferramentas** (rolador de dados) e **Ajuda**, e o menu **Iniciar** é reduzido: **Rolador de Dados**, **Ajuda**, **Tela cheia**, **Entrar…** e **Sair da sala**.

## Quem é quem na sala

- **Com conta** — quem entra logado usa o nome do cadastro, sem perguntas.
- **Sem conta** — antes de entrar, a janela **Quem é você?** pede um nome. Ele é livre, mas **não pode repetir** o de alguém que já está na sala (maiúsculas, acentos e espaços a mais não contam como diferença). Se o nome estiver em uso, a janela avisa e você escolhe outro.
- O navegador **lembra** o seu nome nesta sala: recarregar a página ou voltar mais tarde entra direto. Se você sair, o nome fica reservado por alguns minutos antes de outra pessoa poder usá-lo. O nome do mestre é sempre dele: ninguém mais entra na sala com esse nome.
- **Só o mestre vê quem está na sala.** **Ferramentas > Participantes…** (e o contador na barra de status) lista todos que estão conectados agora, com o papel de cada um. Os jogadores não veem essa lista. Quem fecha a página some dela em instantes.
- **Aprovar entradas (mestre)** — com a opção ligada em **Configurações de Sala > Acesso**, quem informa o nome (e a senha, se houver) fica numa tela de espera. O mestre recebe um aviso com **Aprovar**, **Recusar** e **Decidir depois** (também acionado por Esc ou pelo X; o pedido volta em 30 segundos). **Aprovar** libera a entrada. **Recusar** barra o acesso e coloca a pessoa na lista de removidos, marcada como "recusado". Se o mestre não estiver na sala, o pedido espera e o aviso aparece quando ele entrar. Quem já estava na sala ao ligar a opção continua nela.
- **Remover alguém (mestre)** — em **Arquivo > Configurações de Sala…**, a aba **Participantes** lista quem está conectado, e o ícone da lixeira desconecta a pessoa na hora (com confirmação). Quem foi removido vê um aviso e não consegue voltar com o mesmo link, nem recarregando a página. Quem tem conta continua barrado mesmo saindo e entrando de novo; já um visitante sem conta que apagar os dados do navegador ganha uma identidade nova e consegue entrar outra vez. Se isso acontecer, **feche a sala** ou ponha uma **senha**. O bloqueio dura até 12 horas.
- **Readmitir** — a seção **Removidos**, na mesma aba, mostra quem foi barrado. O ícone de setas (**readmitir**) libera a pessoa para entrar de novo (ela precisa abrir o link outra vez; nada reconecta sozinho).
- O nome aparece em cada rolagem de dados no histórico e no resultado. Ele vem do servidor: ninguém consegue rolar "como" outra pessoa.

## Conduzindo a sessão (visão do mestre)

A barra de ferramentas da sala tem:

- **Token** — adiciona um token. Antes de entrar, uma janela deixa você ajustar o valor **atual** e o **máximo** de cada atributo e se ele fica **visível** ou **oculto**.
- **Cena** — troca a cena usada como base, reconstruindo o mapa.
- **Salvar** — grava o estado atual da sala (**Ctrl+S**).
- **Dados** e **Iniciativa** — abrem essas janelas (veja o capítulo seguinte).
- **Fechar sala** / **Abrir sala** — controla se novos visitantes conseguem entrar.
- **Arquivo > Configurações de Sala…** — janela do mestre, dividida em abas:
  - **Geral** — muda o **nome** da sala e **exclui a sala**. A exclusão não pode ser desfeita e desconecta todos que estão na sala.
  - **Acesso** — abre ou fecha a sala, liga a **aprovação de entradas** e define, altera ou remove a **senha**. Mudar ou remover a senha não derruba quem está na sala; quem estiver fora precisa da senha nova para voltar (a antiga deixa de valer na hora). Quem erra a senha 10 vezes seguidas precisa esperar 1 minuto para tentar de novo (a janela de senha mostra a contagem). Cada 3 erros depois disso aumentam a espera para 3, 5 e, a partir daí, 10 minutos. Acertar a senha zera a contagem.
  - **Participantes** — duas tabelas: quem está conectado (ícone da lixeira para **remover**) e quem foi removido, com data e hora (ícone de setas para **readmitir**). Deixe o mouse sobre o ícone para ver a dica.
  - **Dados** — se os jogadores podem rolar dados e como o **popup de resultado** aparece.

Os tokens funcionam como no editor de cenas: arraste, redimensione, gire, duplique, use o menu de contexto e o menu **Editar**. **Dois cliques** num token abrem as **Configurações do token**: nome, opacidade e os atributos (atual e máximo).

Marque **Exibir nome sobre o token** para mostrar o nome acima do token. Em cada atributo, a coluna **Visibilidade** define se ele aparece como uma barra logo abaixo do token (preenchida conforme atual/máximo): **Visível** ou **Oculto**. O nome do atributo é escrito dentro da barra. A coluna **Cor** escolhe a cor da barra e a coluna **Números** (opcional) acrescenta os valores atual/máximo no meio dela, por exemplo "PV 5/10". As barras crescem um pouco ao aproximar o zoom (e têm um tamanho mínimo ao afastar), para continuarem legíveis. O mestre pode **arrastar a barra** para mudar o valor atual, ou passar o mouse sobre ela e usar os botões **-** e **+** nos cantos (com **Shift**, o passo é de 5). Quanto à visibilidade, o seletor é o único controle: em **Oculto**, a barra não aparece para ninguém, e os valores do atributo nem chegam ao navegador dos jogadores. Sem **Números**, os jogadores recebem só a proporção da barra, não os valores.

## Documentos na sala

O mestre coloca documentos na mesa com **Inserir > Documento…**. Todos na sala, inclusive quem entrou sem conta, abrem a imagem em tamanho grande com **dois cliques** na miniatura ou pelo menu de contexto (**Abrir documento**). Só o mestre move os documentos. Eles não aparecem na iniciativa. Veja o capítulo **Documentos**.

## Ao vivo e salvo são coisas diferentes

Tudo o que o mestre faz — mover, girar, duplicar, ajustar atributos — chega **na hora** aos jogadores conectados, mesmo sem salvar. Já o botão **Salvar** grava o estado no banco, para que ele continue lá na próxima vez que a sala for aberta. A barra de status mostra **Alterações não salvas** enquanto houver diferença, e o sistema pergunta se você quer salvar antes de sair.

## Salas fechadas e com senha

- Fechar a sala impede a entrada de **novos** visitantes; quem já estava dentro continua, mesmo recarregando a página. Quem sair da sala por mais de um minuto só volta quando ela for reaberta. Quem tentar entrar vê "Esta sala está fechada no momento".
- Numa sala com senha, o visitante vê uma janela pedindo a senha antes de entrar. A senha digitada vale por até 24 horas naquele navegador; depois disso ela é pedida de novo.
- Uma sala recebe até 100 participantes ao mesmo tempo, e até 20 pedidos de entrada podem aguardar a aprovação do mestre.

## Nomes repetidos

Ao adicionar vários tokens iguais (por exemplo, três goblins), o sistema numera cada um — `Goblin #1`, `Goblin #2`, `Goblin #3` — para ficarem fáceis de distinguir na iniciativa e nos atributos.
