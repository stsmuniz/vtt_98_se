---
title: "Configurações de Sala, Participantes e Dados"
date: "2026-11-16"
description: "Melhor gerenciamento de salas, mais controle dos participantes e das rolagens de dados."
---

Olá

Dessa vez, estou trazendo vários pequenos ajustes (ou não tão pequenos) para a sala de jogo. Enquanto eu testava, vi que havia várias coisas que precisava melhorar pra garantir segurança e controle para os mestres. Eis as mudanças: 

## Barras de Atributo
Eu adicionei as barras de atributo da última vez, mas vi que precisava de melhorias tanto na visualização quanto no controle. Então, adicionei a opção de mostrar o nome do atributo, o valor, e controles para adicionar ou remover com botões nas laterais da barra ou segurando e arrastando o mouse sobre ela. Agora fica claro o que a barra representa e fácil de atualizar seu valor.

![Barras de atributo com nome, números e os botões - e +](/assets/screenshots/sala_barras.png)

![Configurações do token com a coluna Números](/assets/screenshots/sala_barras_config.png)

## Configurações de Sala
Adicionei um painel de configurações de sala. De lá, você pode controlar várias opções, desde gerenciar a senha da sala, fechar ou exluí-la, ou gerenciar opções relacionadas às próximas funcionalidades. 

![Configurações de Sala, aba Acesso](/assets/screenshots/sala_configuracoes.png)

## Participantes e Presença
Uma das novas configurações de sala é a janela de participantes, que lista os jogadores. Toda vez que um jogador novo entrar, ele vai informar seu nome, e isso vai para a lista de participantes. No painel de configurações, você pode remover um jogador da sala, e ele não vai poder mais entrar por 12 horas ou até que você permita novamente a entrada através da opção "readmitir" nas configurações da sala. A lista de participantes fica disponível apenas para o mestre.

![Configurações de Sala, aba Participantes](/assets/screenshots/sala_participantes.png)

## Aprovação de Entrada
Dependendo da configuração de sala para participantes, você pode permitir todo mundo com link a acessar  ou só permitir que visitantes acessem a  página se você aprovar. Se escolher a segunda opção, um popup vai aparecer na tela do mestre com o nome do jogador perguntando se você aceita, rejeita a entrada ou deixa pra decidir depois.

![Pedido de entrada na tela do mestre](/assets/screenshots/sala_aprovacao_mestre.png)

![Tela de espera do visitante](/assets/screenshots/sala_aprovacao_visitante.png)

## Dados
Rolar dados ficou melhor e mais divertido. A janela de rolagem de dados da sala agora guarda o histórico de rolagens com o nome do jogador e o valor. O mestre pode rolar os dados secretamente. E também há uma nova configuração sobre como o resultado do dado será exibido. As opções são:

![Configurações de Sala, aba Dados](/assets/screenshots/dados_config_popup.png)

### Apenas no histórico

![Histórico da sala com o nome de quem rolou](/assets/screenshots/dados_historico.png)

### Com uma janela popup

![Janela de resultado da rolagem](/assets/screenshots/dados_popup_janela.png)

### Pelo Joey, nosso querido assistente virtual.

![Joey mostrando o resultado](/assets/screenshots/dados_joey.png)

Essas opções estão disponíveis para rolagens tanto na sala quanto pelo app fora da sala, acessível pelo ícone na área de trabalho e no menú iniciar. Esses últimos têm histórico separado do da sala.

Também foi criado um novo tipo de rolagem chamado "Separado". Ele mostra o resultado dos grupos de dados sem somá-los. Por exemplo, se você rolar 2d6+1d6, ele vai mostrar o resultado do 2d6 e o resultado do 1d6 separadamente.
O mestre também pode bloquear a rolagem de dados para outros jogadores. Controlando assim quem e quando pode rolar dados.

![Rolagem escondida no histórico do mestre](/assets/screenshots/dados_escondida.png)

## Segurança
Pra deixar as salas mais seguras, a funcionalidade de senha foi melhorada. Com essa atualização, foi implementado um limite progressivo de tentativas de senha erradas. Além disso, quando o mestre fecha a sala, todos os jogadores são removidos dela, só podendo acessar novamente quando o mestre abrir a sala novamente.

![Bloqueio após muitas tentativas de senha](/assets/screenshots/sala_senha_bloqueio.png)

## Correções
Foram feitas várias correções de sistema para deixar o sistema mais seguro e menos propenso a bugs. Algumas delas são:
- Correção no comportamento dos tokens quando são girados ou espelhados
- Mudar as configurações da sala não desfaz as alterações não salvas