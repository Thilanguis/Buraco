# Perfil e histórico — v200

O nome no cabeçalho do menu abre uma área de perfil com retorno ao menu, histórico paginado (30 registros por página), filtros, detalhes de placar/canastras/duração, edição de nome/Pix e redefinição de senha por e-mail. O e-mail de login é exibido como somente leitura.

## Persistência e identidade

- A partir desta versão, `players[].accountUid` acompanha a cadeira desde o lobby até a revanche. Nome não é identificador de conta. Bots não recebem UID.
- Resumos finais ficam em `userProfiles/{uid}/matches/{roomId}_{matchStartedAt}`, com uma cópia para cada participante autenticado. Não contêm e-mail, Pix, cartas ou senha.
- O encerramento normal grava o estado e os resumos na mesma transação. O ID estável e as regras de atualização idêntica impedem duplicatas e alterações posteriores. Há recuperação ao receber um estado final sem resumo e antes da revanche.
- Partidas já existentes sem UID não são atribuídas por nome. Partidas antigas sobrescritas não são recuperáveis. Abandono/interrupção sem encerramento não conta como vitória nem como partida concluída.
- Mudanças de perfil são aplicadas no lobby, não no meio de uma partida. Os registros mantêm os nomes usados na época.

## Estatísticas

- Resultados normais consideram o maior placar final (ou empate). `finisherTeamId` preserva separadamente quem bateu; no motor legado `winnerTeamId` indica a batida e também concede o bônus.
- Chefes usam `boss.result.victory`, não comparação de placares contra o time fictício do chefe.
- Filtros: todas, jogadores, bots, chefes, testes. Testes não entram nos totais, vitórias, taxa ou melhor placar.
- Estatísticas referem-se **às partidas carregadas**, explicitamente indicado na interface. “Carregar mais” amplia o período. Não apresentar esses números como um total vitalício enquanto houver páginas pendentes.
- Inícios pelo laboratório, cenários e ferramentas que alteram a partida marcam `historyTest`. Revanche preserva essa marca, sem tornar uma partida normal em teste só por usar a mesma função de reinício.

## Segurança e publicação

As regras de histórico já foram publicadas no Firebase, preservando as permissões que as salas tinham antes desta alteração. Leitura/listagem é limitada ao dono da subcoleção; gravação exige participante do resultado e resumo correspondente no documento da sala na mesma operação. Atualizações só podem repetir exatamente o documento existente, sem exclusão pelo cliente.

Isso **não é um ranking antifraude**: o motor de jogo e a pontuação continuam no cliente, e as permissões legadas das salas não garantem autoria confiável das jogadas. Histórico é um registro funcional para os participantes, não comprovação financeira ou competição auditável. Para um ranking público confiável seria necessária validação autoritativa de partidas no servidor.

Falta publicar os arquivos do site v200. A exigência final de login nas salas continua dependendo da publicação coordenada de `firestore.rules`, conforme `docs/login-firebase.md`. Não foi alterado o plano Firebase nem adicionada Cloud Function.

## Testes

- `node --test tests/match-history.test.mjs tests/account-profile.test.mjs tests/dev-menu-shortcuts.test.mjs tests/boss-lab-persistence.test.mjs tests/match-control.test.mjs`: 23 testes passaram.
- `tests/account-page.browser.mjs`: visual/fluxo em três larguras, filtros, paginação, edição, senha, retorno/foco e texto escapado.
- `tests/account-lobby.browser.mjs`: abrir perfil pelo nome, editar e refletir no lobby, sem partida real.
- `tests/account-auth.browser.mjs`: login/cadastro existentes preservados.
- Compilação de regras e dez testes de autorização passaram no Firebase Rules, usando mocks, sem criar partidas/contas reais.
- A suíte antiga `domination-friend.test.mjs` mantém 15 falhas; comparada com o `app.js` de HEAD, as mesmas 15 falhas já existiam antes desta alteração.
