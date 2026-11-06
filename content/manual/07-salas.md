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

Ao terminar, o sistema pergunta se você quer **entrar na sala** agora. Cada sala recebe um **código** de seis caracteres, que faz parte do link de convite.

## Convidando os jogadores

Na pasta **Salas**, clique com o botão direito na sala e escolha **Copiar link**; depois, envie o link ao grupo (e a senha, se houver). Quem tiver o link entra **sem precisar de conta**. **Abrir em nova aba** é útil para o mestre testar a sala vendo como jogador.

## Mestre e jogadores

- **Mestre (dono da sala)** — vê todas as ferramentas, mexe nos tokens, troca a cena, controla a iniciativa e abre ou fecha a sala.
- **Jogadores** — acompanham o mapa em tempo real e veem os tokens se movendo suavemente conforme o mestre os arrasta, mas não podem editar nada. Eles podem dar **zoom** (roda do mouse) e **mover o mapa** (arrastar o fundo) para olhar a mesa à vontade, e **abrir documentos** com dois cliques. A janela da sala deles tem só os menus **Exibir**, **Ferramentas** (rolador de dados) e **Ajuda**, e o menu **Iniciar** é reduzido: **Rolador de Dados**, **Ajuda**, **Tela cheia**, **Entrar…** e **Sair da sala**.

## Conduzindo a sessão (visão do mestre)

A barra de ferramentas da sala tem:

- **Token** — adiciona um token. Antes de entrar, uma janela deixa você ajustar o valor **atual** e o **máximo** de cada atributo e se ele fica **visível** ou **oculto**.
- **Cena** — troca a cena usada como base, reconstruindo o mapa.
- **Salvar** — grava o estado atual da sala (**Ctrl+S**).
- **Dados** e **Iniciativa** — abrem essas janelas (veja o capítulo seguinte).
- **Fechar sala** / **Abrir sala** — controla se novos visitantes conseguem entrar.

Os tokens funcionam como no editor de cenas: arraste, redimensione, gire, duplique, use o menu de contexto e o menu **Editar**. **Dois cliques** num token abrem as **Configurações do token**: nome, opacidade e os atributos (atual, máximo e visibilidade).

## Documentos na sala

O mestre coloca documentos na mesa com **Inserir > Documento…**. Todos na sala, inclusive quem entrou sem conta, abrem a imagem em tamanho grande com **dois cliques** na miniatura ou pelo menu de contexto (**Abrir documento**). Só o mestre move os documentos. Eles não aparecem na iniciativa. Veja o capítulo **Documentos**.

## Ao vivo e salvo são coisas diferentes

Tudo o que o mestre faz — mover, girar, duplicar, ajustar atributos — chega **na hora** aos jogadores conectados, mesmo sem salvar. Já o botão **Salvar** grava o estado no banco, para que ele continue lá na próxima vez que a sala for aberta. A barra de status mostra **Alterações não salvas** enquanto houver diferença, e o sistema pergunta se você quer salvar antes de sair.

## Salas fechadas e com senha

- Fechar a sala impede a entrada de **novos** visitantes; quem já estava dentro continua. Quem tentar entrar vê "Esta sala está fechada no momento".
- Numa sala com senha, o visitante vê uma janela pedindo a senha antes de entrar.

## Nomes repetidos

Ao adicionar vários tokens iguais (por exemplo, três goblins), o sistema numera cada um — `Goblin #1`, `Goblin #2`, `Goblin #3` — para ficarem fáceis de distinguir na iniciativa e nos atributos.
