---
title: Cenas e editor
order: 7
icon: scene
description: Como montar uma cena e usar o editor de cenas.
---

Uma **cena** junta um **cenário** com os **tokens** posicionados sobre ele (e, se quiser, **desenhos** por cima do mapa) — o "estado inicial" de uma situação de jogo. Você monta a cena com calma, antes da sessão, e depois cria uma **sala** a partir dela.

## Criando uma cena

Na pasta **Cenas**, clique em **Novo**, digite o nome, escolha o **cenário** com **Procurar…** e clique em **OK**. Depois, dê dois cliques na cena para abri-la no **editor de cenas**.

**Duplicar** (menu de contexto da pasta) cria uma cópia completa da cena, com o mesmo cenário, os tokens nas mesmas posições e os desenhos.

## O editor de cenas

O editor abre numa janela própria, com estes menus:

| Menu | O que tem |
| --- | --- |
| **Arquivo** | **Salvar** e **Fechar**. |
| **Editar** | **Desfazer** e **Refazer** desenho, **Limpar desenhos…**, as ações sobre o desenho selecionado e as ações sobre o token selecionado (veja abaixo). |
| **Inserir** | **Token…** e **Documento…** (adicionam à cena) e **Cenário…** (troca o mapa de fundo). |
| **Exibir** | A janela de tokens, a **Caixa de ferramentas** de desenho, o zoom, **Ajustar à janela** e **Tela cheia**. |
| **Ajuda** | Este manual. |

A barra de ferramentas repete os atalhos mais usados: **Tokens**, **Cenário**, **Salvar** e **Ajuda**.

## Colocando tokens

- **Inserir > Token…** abre a pasta de Tokens em modo de seleção; escolha um (dois cliques) e ele entra no centro do mapa.
- **Inserir > Documento…** faz o mesmo com a pasta de Documentos. Dois cliques num documento da cena (ou **Abrir documento** no menu de contexto) abrem a imagem em tamanho grande. Veja o capítulo **Documentos**.
- O botão **Tokens** abre a **janela de tokens**, com duas abas: **Tokens da cena**, onde você vê o que já está no mapa e pode **Remover**, **Duplicar** ou **Centralizar** o token selecionado, e **Tokens cadastrados**, para adicionar mais.

## Mexendo nos tokens

Clique num token para selecioná-lo. Então:

- **arraste** para mover;
- arraste os **cantos** para mudar o tamanho (a proporção é mantida) e a **alça de cima** para girar;
- use o **menu de contexto** (botão direito) ou o menu **Editar** para **Duplicar**, **Substituir token…** (troca a imagem e os atributos mantendo a posição), **Inverter horizontalmente**, **Inverter verticalmente**, **Restaurar rotação** e **Remover token**;
- **Delete** remove o token selecionado, depois de confirmar.

## Desenhando no mapa

À esquerda do mapa fica a **caixa de ferramentas**, como a do Paint. Os desenhos ficam **por cima do cenário e por baixo dos tokens**, e são gravados com a cena: uma sala criada a partir dela começa com os mesmos desenhos. Para esconder a caixa, desmarque **Exibir > Caixa de ferramentas**.

| Ferramenta | Tecla | Como usar |
| --- | --- | --- |
| **Selecionar** | S | O modo normal: mexe nos tokens e nos desenhos. Clique num desenho para selecioná-lo, arraste para mover, use as alças para mudar o tamanho e a de cima para girar. |
| **Lápis** | P | Desenho à mão livre. |
| **Borracha** | E | Clique ou passe por cima de um desenho para apagá-lo inteiro. |
| **Linha** e **Seta** | L e W | Arraste do início ao fim. Com **Shift**, a direção trava de 45 em 45 graus. |
| **Retângulo**, **Elipse** e **Triângulo** | R, O e T | Arraste para formar a caixa. Com **Shift**, sai um quadrado, um círculo ou um triângulo equilátero. |
| **Texto** | X | Clique onde o texto começa e digite. **Enter** confirma, **Shift+Enter** pula linha e **Esc** desiste. Dois cliques num texto (com **Selecionar**) editam o texto, a fonte e o tamanho. |
| **Preencher com cor** | F | Clique num desenho para pintá-lo: o interior das formas, ou a cor de linhas, setas, traços e textos. Botão esquerdo usa a cor primária; o direito, a secundária. |
| **Selecionar cor** | I | Clique num desenho para pegar a cor dele (botão esquerdo para a primária, direito para a secundária). Depois a ferramenta anterior volta. |

Com uma ferramenta de desenho escolhida, os tokens ficam travados (o clique desenha). A **roda do mouse** continua dando zoom e o **botão do meio** continua movendo o mapa. **Esc** volta para **Selecionar**.

Embaixo das ferramentas ficam os botões **Desfazer** e **Refazer**, que valem só para os desenhos (**Ctrl+Z** e **Ctrl+Y**). Depois vem a **caixa de opções** da ferramenta atual: a **espessura** do traço, o **estilo** das formas (só contorno, contorno e preenchimento, ou só preenchimento) e, para o texto, a **fonte** e o **tamanho**.

**Fontes do texto.** Cada amostra **Aa** é uma fonte (deixe o mouse sobre ela para ver o nome): **Pixel** (a do sistema, o padrão), **Sem serifa**, **Serifada**, **Quadrinhos**, **Monoespaçada**, **Cursiva**, **Serifa quadrada (slab)** e **Impacto**. Dá para trocar a fonte e o tamanho enquanto digita. As fontes vêm junto com o sistema, então os jogadores veem o texto igual ao do mestre em qualquer computador.

**Cores.** Há duas: a **primária** (o quadrado da frente), usada no contorno, nos traços e nos textos, e a **secundária** (o de trás), usada no preenchimento das formas com contorno. Na paleta, o **botão esquerdo** escolhe a primária e o **direito**, a secundária. Clique no quadrado de trás para trocar as duas, e no botão de arco-íris (**Editar cores…**) para escolher qualquer cor para a primária.

Com um desenho selecionado, o **menu de contexto** (botão direito) e o menu **Editar** têm **Duplicar desenho**, **Trazer para a frente**, **Enviar para trás** e **Excluir desenho** (também com **Delete**). **Editar > Limpar desenhos…** apaga todos de uma vez (dá para desfazer).

## Zoom e tamanho do mapa

- Na barra de status, digite o zoom em porcentagem ou use **−**, **+**, **100%** e **Ajustar**, que faz o mapa inteiro caber na janela e o centraliza.
- O mapa ocupa toda a janela e abre já ajustado e centralizado. Use a **roda do mouse** para dar zoom em torno do cursor e **arraste o fundo** (ou use o **botão do meio** do mouse) para mover o mapa. Arrastar um token move só o token.
- Para mudar o **tamanho do mapa**, arraste o quadradinho azul no canto inferior direito. O novo tamanho é gravado ao soltar.

## Salvando

**Salvar** (**Ctrl+S**) grava os tokens e os desenhos da cena. Adicionar, substituir ou remover um token já grava na hora (junto com os desenhos); **mover, girar, redimensionar e desenhar só são gravados quando você salva**. Enquanto a cena é gravada, a janela **Salvando a cena...**, com uma barra de progresso, bloqueia o editor até o servidor confirmar, para nenhuma alteração ficar de fora. A barra de status avisa **Alterações não salvas**, e, se você tentar fechar o editor assim, o sistema pergunta **Deseja salvar?** (Sim, Não ou Cancelar).
