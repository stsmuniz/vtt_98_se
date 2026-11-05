---
title: Tokens
order: 4
icon: token
description: Como cadastrar, editar e reaproveitar tokens (personagens, criaturas e objetos).
---

Um **token** é uma peça do jogo: um personagem, um monstro, um objeto. Na pasta **Tokens** você cadastra cada token uma vez, como um **modelo**, e o reaproveita em quantas cenas e salas quiser.

## Criando um token

1. Abra a pasta **Tokens** e clique em **Novo** (ou use **Arquivo > Novo token**).
2. Digite o **nome**.
3. Escolha a **imagem** com **Procurar…**. A imagem é obrigatória; a pré-visualização mostra como ela ficou.
4. Se quiser, acrescente **tags** (para achar o token depois) e **atributos**.
5. Clique em **OK**. **Ctrl+S** também grava.

Imagens com mais de 500 pixels de lado são reduzidas automaticamente, mantendo a proporção, para o sistema ficar leve.

## Tags

Digite uma tag e pressione **Enter** (ou clique em **Adicionar**). Para tirar uma, selecione-a na lista e clique em **Remover** (ou pressione **Delete**). Tags repetidas são ignoradas, e as que você já usou em outros tokens aparecem como sugestão.

## Atributos

Atributos são pares de **nome** e **valor numérico** — por exemplo, `Vida: 7` ou `Força: 14`. Eles servem de ponto de partida: quando o token entra numa sala, cada atributo ganha um valor **atual** e um **máximo**, que o mestre acompanha durante o jogo. Veja o capítulo **Salas**.

## Editando, duplicando e excluindo

- **Editar** — dê dois cliques no token (ou selecione-o e use **Arquivo > Abrir**). A imagem só muda se você escolher outra.
- **Duplicar** — menu de contexto ou **Editar > Duplicar**. A cópia recebe o nome com **(Cópia)** no fim.
- **Renomear** — **F2**.
- **Excluir** — **Delete**, com confirmação.

Alterar ou excluir um token cadastrado **não muda** os tokens que já foram colocados em cenas e salas: cada cena ou sala guarda a própria cópia, com posição, tamanho e atributos próprios.
