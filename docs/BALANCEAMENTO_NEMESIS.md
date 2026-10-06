# Balanceamento do Nemesis

## Decisão atual — 06/10/2026

| Combatente | HP anterior (histórico) | HP atual |
|---|---:|---:|
| Nemesis | 2600 | 2200 |
| Agarrador | 350 | 220 |
| Infectado | 300 | 240 |
| Devorador | 400 | 260 |

Agarrador deixa de depender de cartas adquiridas do Lixo. Após a compra de cada jogador (Monte ou Lixo), restringe cartas jogáveis da mão até o fim desse turno: normal 1, Mutado 2, Reforçado normal 2, ambos 3. Só bloqueia jogo; descarte é permitido. Preserva uma solução legal completa de objetivo ativo. Sem candidato seguro, pode prender menos ou nenhuma carta, sem punição adicional.

Objetivo: cada zumbi deve ser uma ameaça que mereça consideração como alvo, sem transformar o pacote em milhares de HP obrigatórios adicionais. O envelope de durabilidade deve ser testado antes de alterar outros números.

Preservados: Infecção 0–100 e valores das habilidades; Infectado +2/+4, reforço +2; Devorador 40/70, reforço +30; Regeneração 100; Reanimação 50% (110/120/130), uma vez por fase, teto 1/2/3 e Mutado na F3; lifecycle, pesos, alívio por canastras, S.T.A.R.S., dano sem overflow e regra global do Lixo. Nenhum outro chefe foi rebalanceado.

## Estimativa histórica, não resultado atual

A estimativa antiga de **~68,9%**, citada no pedido desta revisão, é anterior à regra global do Lixo e anterior a esta mudança de HP/passiva. É mantida aqui somente como histórico, não como probabilidade atual validada. Não foi encontrada uma simulação correspondente no workspace local para reproduzi-la. Não há novo percentual de vitória afirmado neste patch; recalibração depende de partidas, simulação ou telemetria posteriores.

## Validação e migração

Saves antigos mantêm lifecycle, alvo, S.T.A.R.S., quotas e HP restante (limitado somente ao novo máximo). Compras são deduplicadas por turno/jogador; render/reload/snapshot/undo não devem repetir o pulso. O BOT reutiliza a restrição canônica nas jogadas, sem mudar avaliação de alvos ou heurística de dano.

Regressões: `nemesis-grabber.test.mjs`, `nemesis-boss.test.mjs`, `nemesis-progress-meters.test.mjs`, handlers de compra e `nemesis-ui.browser.mjs`; depois executar todos os `tests/*.test.mjs`. Testes automatizados não substituem duas sessões Firebase reais nem medição de força contra jogadores.

## Resultado desta revisão

- Focados: **132 testes, 132 passaram, 0 falhas** em Nemesis, Grabber, medidores, descarte/HUD, handlers de compra, controle de partida, Dominação e arquitetura de combate.
- Suíte ampla local (`node --test` sobre todos os `tests/*.test.mjs`): **855 testes, 855 passaram, 0 falhas, 0 cancelados, 0 skipped, 0 todo**.
- Browser local: passou em 1920×1080, 1024×768, 844×390, 390×844 e 3840×2160, mais ajuda por toque; captura de tablet revisada. Alvos, marcas, ajuda, HPs atuais, pulso/reload/undo e redução de movimento cobertos.
- Sintaxe dos 15 JS/MJS alterados/adicionados e `git diff --check`: passaram.
- Os logs locais estão em `.cache/nemesis-durability-focused-final.tap`, `.cache/nemesis-durability-wide-final.tap` e `.cache/nemesis-durability-browser-final.log`.

Expectativas antigas ajustadas: máximos/HP de reanimação, dano absorvido sem overflow e passiva só no Lixo. Harnesses que extraem funções de `app.js` receberam a dependência real `notifyBossPurchaseCompleted`, não um desvio de regra para passar assertions. A falha real identificada no BOT era a ausência de consulta ao bloqueio em rotas genéricas de meld; a correção usa o predicado existente e fica restrita ao modo Nemesis. A proteção cooperativa também considera apenas os jogos anunciados e o progresso já feito pelo parceiro, nunca um jogo criado depois como substituto do objetivo.

Produção alterada: `app.js`, `boss-bot.js`, `js/boss/boss-engine.js`, `js/boss/bosses/nemesis.js`, `js/boss/mechanics/nemesis.js`, `js/boss/presentation/nemesis.js`, `js/boss/ui/nemesis-ui.js`.

Testes alterados/adicionados: `tests/discard-pickup.test.mjs`, `tests/domination-balance.test.mjs`, `tests/match-control.test.mjs`, `tests/nemesis-boss.test.mjs`, `tests/nemesis-progress-meters.test.mjs`, `tests/nemesis-ui.browser.mjs`, `tests/stock-draw-animation.test.mjs`, novo `tests/nemesis-grabber.test.mjs`.

Documentação: este novo documento, `docs/NEMESIS_IMPLEMENTACAO.md`, `docs/INVENTARIO_HABILIDADES_CHEFES.md`, `docs/DOCUMENTACAO_CHEFE_DA_MESA.md` e `docs/CHECKLIST_REGRESSOES_E_ATUALIZACOES.md`.

Nenhuma definição/mecânica dos outros cinco chefes, regra global de retirada, peso, Infecção, cura, condição de vitória ou alívio por canastra foi alterada. Service Worker e assets intactos. Sem commit, deploy ou Google Drive. O workspace estava limpo no início. Não há regressão pendente nos testes executados; riscos restantes são o transporte real em dois clientes Firebase, a densidade de uma partida completa e a força efetiva do novo envelope contra jogadores. O planejador é conservador: preservar a solução pode resultar em menos cartas presas.

### Git diff --stat

Saída dos arquivos já rastreados (não inclui arquivos novos sem staging):

```text
 app.js                                      |  8 +++
 boss-bot.js                                 |  4 ++
 docs/CHECKLIST_REGRESSOES_E_ATUALIZACOES.md | 10 ++++
 docs/DOCUMENTACAO_CHEFE_DA_MESA.md          | 14 +++---
 docs/INVENTARIO_HABILIDADES_CHEFES.md       |  4 +-
 docs/NEMESIS_IMPLEMENTACAO.md               | 24 ++++++---
 js/boss/boss-engine.js                      |  6 +++
 js/boss/bosses/nemesis.js                   |  8 +--
 js/boss/mechanics/nemesis.js                | 77 ++++++++++++++++++++++-------
 js/boss/presentation/nemesis.js             |  4 +-
 js/boss/ui/nemesis-ui.js                    | 10 ++--
 tests/discard-pickup.test.mjs               | 31 +++++++++++-
 tests/domination-balance.test.mjs           |  4 +-
 tests/match-control.test.mjs                |  3 +-
 tests/nemesis-boss.test.mjs                 | 58 ++++++++++++----------
 tests/nemesis-progress-meters.test.mjs      |  2 +-
 tests/nemesis-ui.browser.mjs                | 17 ++++---
 tests/stock-draw-animation.test.mjs         | 27 +++++++++-
 18 files changed, 228 insertions(+), 83 deletions(-)
```

Além deles, há dois novos arquivos: este documento e `tests/nemesis-grabber.test.mjs`. Resumo do diff: quatro máximos de HP; migração limitada aos máximos; hook pós-compra e trava por turno; seleção legal/proteção de objetivos; bloqueio do BOT; ajuda atualizada; regressões e registro da decisão.
