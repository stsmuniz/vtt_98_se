---
title: Salas de jogo
order: 5
icon: desktop
description: Como criar salas, convidar jogadores e conduzir uma sessão ao vivo.
---

Uma **sala** é onde a sessão de jogo realmente acontece. Ela parte de uma cena existente — copiando o cenário e a disposição de tokens daquele momento em diante — e permite que o mestre conduza a partida em tempo real com os jogadores.

## Criando uma sala

Abra **Dashboard → Sala** para ver a lista de salas e criar uma nova, escolhendo a cena de origem e, opcionalmente, uma senha de acesso. Cada sala recebe um código único, usado no link de convite para os jogadores.

## Entrando em uma sala

Qualquer pessoa com o link da sala (`/rooms/<código>`) pode entrar **sem precisar de conta**. Se a sala tiver senha, será exibida uma janela pedindo que ela seja informada antes de liberar o acesso.

## Papéis dentro da sala

- **Dono (GM)** — quem criou a sala. É o único que enxerga a barra de menus e a barra de botões completas, pode mover e editar tokens, trocar a cena, rolar a iniciativa e abrir ou fechar a sala.
- **Jogador / Espectador** — visitantes que entram pelo link. Eles acompanham o mapa em tempo real, mas não podem editar nada; veem os tokens se movendo suavemente conforme o mestre os arrasta.

## Conduzindo a sessão (visão do mestre)

A barra de botões do editor de sala oferece:

- **Token** — adiciona um token à sala. Diferente do editor de cenas, aqui é possível (e recomendado) definir atributos como valor atual/máximo e visibilidade logo ao adicionar, através da janela de atributos do token.
- **Cena** — troca a cena usada como base da sala, reconstruindo o mapa a partir dela.
- **Salvar** — grava permanentemente o estado atual da sala (posições, tokens, cena) no banco de dados. Também acionado pelo atalho **Ctrl+S**, com confirmação breve na barra de status.
- **Dados** — abre o rolador de dados.
- **Iniciativa** — abre a janela de iniciativa.
- **Abrir Sala / Fechar Sala** — controla se novos visitantes conseguem entrar. Uma sala fechada barra a entrada de quem ainda não estava dentro dela.

Assim como no editor de cenas, tokens podem ser arrastados, redimensionados, girados e duplicados, e o menu de contexto (clique com o botão direito) e a tecla **Delete** funcionam da mesma forma. Um duplo clique em um token abre a janela de **Configurações do Token**, com seus atributos.

## Transmissão em tempo real

Toda edição feita pelo mestre — mover um token, girar, duplicar — é transmitida instantaneamente para todos os visitantes conectados, mesmo sem clicar em "Salvar". O botão **Salvar** existe para persistir esse estado no banco, garantindo que ele continue lá na próxima vez que a sala for aberta.

## Nomes duplicados

Ao adicionar vários tokens iguais a uma sala (por exemplo, três goblins), o sistema numera automaticamente cada cópia (`Goblin #1`, `Goblin #2`, `Goblin #3`) para que fiquem fáceis de distinguir na lista de iniciativa e nos atributos.
