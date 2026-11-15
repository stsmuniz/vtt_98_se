---
title: Dados e iniciativa
order: 9
icon: dice
description: Como rolar dados e organizar a ordem de turnos durante a sessão.
---

## Rolador de dados

O **Rolador de Dados** fica na área de trabalho, em **Iniciar > Programas > Acessórios**. Dentro da sala, o menu **Ferramentas** e a barra de ferramentas abrem o rolador da sala. É uma janela comum: você pode deixá-la aberta ao lado da sala durante o jogo.

Na janela você configura:

- **Escolha o dado** — d2, d4, d6, d8, d10, d12, d20 ou d100.
- **Qtde** — quantos dados rolar.
- **Mod** — um modificador, positivo ou negativo, somado ao resultado final.
- **Rolagem** — como o resultado é calculado: **Soma** (todos os dados somados), **Maior** (o maior valor rolado), **Menor** (o menor valor rolado) ou **Separado** (cada grupo de dados mostra a sua própria soma, por exemplo `2d20: 26, 1d100: 48, 1d2: 2`; o modificador não se aplica).
- **d2 como cara ou coroa** — marque para que o d2 mostre **Cara** (1) ou **Coroa** (2) em vez do número. Com vários d2 num grupo, o resultado conta quantas caras e coroas saíram.

Ao rolar, abre a janela **Resultado da Rolagem**: os dados aparecem lado a lado, com o valor de cada um, e o total na linha de baixo. Nas rolagens **Maior** e **Menor**, os dados que não contaram aparecem em cinza. Clique numa rolagem do **Histórico** para vê-la de novo.

### Histórico

Existem dois roladores independentes, cada um com o seu histórico: o **Rolador de Dados** da área de trabalho (Iniciar > Programas > Acessórios) é sempre pessoal, e o **Dados da Sala**, aberto pelo menu **Ferramentas** ou pela barra de ferramentas dentro da sala, é o da sala. Rolar num não aparece no outro, e os dois podem ficar abertos ao mesmo tempo.

- **Fora de uma sala**, o histórico é só seu e some quando você recarrega a página ou encerra a sessão. **Limpar Histórico** apaga na hora.
- No menu **Configurações** do Rolador de Dados (fora da sala), você escolhe como o resultado aparece: **Janela de resultado**, **Joey** ou **Nenhum**. A escolha fica salva neste navegador. Dentro da sala quem decide é o mestre.
- **Dentro de uma sala**, todas as rolagens de todos entram no histórico da sala, com o nome de quem rolou (o nome com que a pessoa entrou na sala, único e confirmado pelo servidor), e o resultado aparece para todos. O histórico é apagado quando o mestre **fecha a sala**.
- O mestre vê o botão **Limpar Histórico** também dentro da sala: ele apaga o histórico para todos.
- Em **Arquivo > Configurações de Sala**, o mestre escolhe como o resultado aparece para todos: **Janela de resultado**, **Joey** (o mascote aparece com um balão com o resultado e o botão **Nova rolagem**) ou **Nenhum** (só o histórico). Clicar numa rolagem do histórico sempre abre a janela de resultado.
- Cada jogador só pode rolar **uma vez a cada 5 segundos** na sala. Depois de rolar, o botão **Rolar** mostra a contagem ("Aguarde 3s") e volta sozinho. O mestre não tem esse limite. Fora da sala, no rolador pessoal, também não há espera.
- Em **Configurações de Sala**, o mestre pode desmarcar **Permitir outros jogadores rolarem dados**: nesse caso só ele rola na sala, e para os jogadores o botão **Rolar** fica desativado.
- O mestre pode marcar **Rolagem escondida**: ela entra no histórico dele, mas os jogadores não a veem nem recebem o resultado.

### Misturando tipos de dado

Para combinar dados diferentes numa só rolagem (por exemplo, 2d6 junto com 1d8), escolha o dado e a quantidade e clique em **Adicionar dado**; ele entra numa lista, onde também pode ser removido. Repita para cada tipo.

Enquanto a lista estiver vazia, **Rolar** usa a Qtde e o dado visíveis na tela. Assim que houver pelo menos um dado na lista, **Rolar** considera **somente** os dados da lista; o modificador e o tipo de rolagem se aplicam ao conjunto.

## Iniciativa

Na sala, o mestre abre a janela **Iniciativa** pela barra de ferramentas ou pelo menu **Ferramentas**. Ela lista todos os tokens da sala, e a lista acompanha as mudanças: ao adicionar ou remover um token, a iniciativa se atualiza.

- Digite o **valor** de iniciativa de cada token.
- Use as **setas** ao lado de cada nome para subir ou descer um token na ordem.
- **Ordenar por valor** organiza a lista do maior para o menor valor, com os tokens sem valor no fim.
