# Histórico e brilhos — 2026-09-27

Diagnóstico somente leitura no Firebase: a partida `gclluu_1790481769845`, Gabriel × Luana, estava finalizada, classificada como `players` e gravada no histórico. Não houve necessidade de recriar resultados ou alterar regras.

A contagem baseada nas últimas 30 partidas mantinha 21 jogos entre jogadores: a nova partida substituía outra partida da mesma categoria nessa janela. A base completa aumentou de 38 para 39 registros, dos quais 29 entre jogadores. A gravação desta partida estava correta; o contador limitado e a leitura pontual da interface eram inadequados.

Agora menu e perfil compartilham uma assinatura `onSnapshot` da coleção completa do próprio usuário, ordenada por encerramento. O perfil recebe novas partidas enquanto aberto. O cabeçalho continua excluindo bots, chefes e testes. Fechar o perfil remove seu consumidor, preservando o listener do menu; o último consumidor encerra o listener. Erros de leitura são sinalizados e podem ser tentados novamente. Não há leitura de histórico de terceiros.

Brilhos: pseudoelementos em dois pontos dos botões Chamar amigas e Carta, alternados em ciclos longos. Sem interferir em cliques ou tamanho do botão; não aparecem em botões desativados/ocultos e respeitam redução de movimento.

Validações offline: histórico de 31/32 partidas, inclusão ao vivo simultânea no menu/perfil, ausência de duplicação de listener, testes de pontuação/gravação e navegador em três larguras; efeitos com botão indisponível e movimento reduzido. Cache v208. Publicação do frontend não realizada.
