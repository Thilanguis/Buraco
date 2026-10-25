# Histórico consolidado — modo Chefe — outubro de 2026

Este arquivo reúne os relatórios datados, comparações, propostas e estados anteriores da documentação. **Não é especificação vigente nem lista de tarefas a executar.** Valores experimentais, resultados, limitações e propostas foram preservados; palavras como “atual”, “final” e “pendente” nos relatos abaixo valem para a data de cada registro.

Para trabalhar hoje, consulte [regras funcionais](../DOCUMENTACAO_CHEFE_DA_MESA.md), [inventário](../INVENTARIO_HABILIDADES_CHEFES.md) e [status do playtest](../CHECKLIST_PLAYTEST_CHEFES_2026-10-10_ATUALIZADO.md).

## Estado verificado ao consolidar — 13/10/2026

- Pacote dos seis chefes aplicado: canastras100/200/500/1000; HPs2650/2800/2300/2400/2500/2000 (Banqueiro/Dominadora/Matriarca/Nehelenia/Nemesis/Lady).
- Seis PNGs e seis MP3s do Especial já implementados; não são trabalho futuro. Falta homologação em hardware/dupla humana real.
- Última execução conferida: `scripts/verificar_suite_chefes.mjs`, 58 arquivos, 1293 testes, 1292 aprovados e uma falha no laboratório (`nemesis/horde_invasion/1/phase_cap`: esperado Invasão, observado Caçada). Log: `../../.cache/commit-suite-chefes.log`. Os23 erros citados no relatório anterior não são o estado mais recente; o histórico original abaixo não foi reescrito.
- Nenhuma nova execução de gameplay nesta consolidação. Meta70% contra humanos não foi medida. Firebase autenticado/tablets físicos não foram homologados pelos fixtures.
- As métricas JSON/CSV/traços comprimidos continuam em [metrics](../metrics/), nos caminhos usados pelos scripts e testes.

## Como o arquivo foi organizado

Os21 arquivos datados antes soltos na raiz e os6 relatos do arquivo histórico anterior foram reunidos integralmente abaixo. O catálogo paralelo `REGRAS_VIGENTES_SEIS_CHEFES_2026-10-13.md` foi arquivado para não competir com o inventário e a especificação. Também foram preservados o checklist original completo, o handoff anterior e os contextos antigos dos documentos ativos.

Apenas hierarquia de títulos e destinos de links locais foram adaptados à reunião neste arquivo; números de experimentos, tabelas, causas e relatos permanecem. Um link para outro relatório arquivado leva ao começo desse relatório, não ao antigo arquivo separado. Nomes de arquivos em blocos de código continuam como rastreabilidade histórica. As versões originais também são recuperáveis no Git até o commit005ff9d. Arquivos de mídia não foram alterados.

## Índice por arquivo de origem

- [ARQUIVO_HISTORICO/BALANCEAMENTO_NEMESIS.md](#arquivo-balanceamento-nemesis)
- [ARQUIVO_HISTORICO/LIMPEZA_SUITE_2026-10-06.md](#arquivo-limpeza-suite-2026-10-06)
- [ARQUIVO_HISTORICO/NEMESIS_IMPLEMENTACAO.md](#arquivo-nemesis-implementacao)
- [ARQUIVO_HISTORICO/REGRA_LIXO_E_UX_NEMESIS_2026-10-06.md](#arquivo-regra-lixo-e-ux-nemesis-2026-10-06)
- [ARQUIVO_HISTORICO/REVISAO_OBJETIVOS_CHEFES.md](#arquivo-revisao-objetivos-chefes)
- [ARQUIVO_HISTORICO/REWORK_DIMITRESCU_2026-10-07.md](#arquivo-rework-dimitrescu-2026-10-07)
- [REWORK_ITENS_DIMITRESCU_2026-10-08.md](#arquivo-rework-itens-dimitrescu-2026-10-08)
- [REWORK_NEMESIS_MATRIARCA_E_UX_DIMITRESCU_2026-10-08.md](#arquivo-rework-nemesis-matriarca-e-ux-dimitrescu-2026-10-08)
- [AJUSTE_FINAL_NEMESIS_2026-10-09.md](#arquivo-ajuste-final-nemesis-2026-10-09)
- [AUDITORIA_ELEGIBILIDADE_CHEFES_2026-10-09.md](#arquivo-auditoria-elegibilidade-chefes-2026-10-09)
- [BOT_COOPERATIVO_CHEFE_2026-10-09.md](#arquivo-bot-cooperativo-chefe-2026-10-09)
- [REVISAO_TEXTOS_CHEFES_2026-10-09.md](#arquivo-revisao-textos-chefes-2026-10-09)
- [ETAPA_1_PLAYTEST_P0_2026-10-10.md](#arquivo-etapa-1-playtest-p0-2026-10-10)
- [ETAPA_2_DIMITRESCU_2026-10-10.md](#arquivo-etapa-2-dimitrescu-2026-10-10)
- [PACOTE_CONSOLIDADO_CHEFES_2026-10-10.md](#arquivo-pacote-consolidado-chefes-2026-10-10)
- [BALANCEAMENTO_SEIS_CHEFES_2026-10-10.md](#arquivo-balanceamento-seis-chefes-2026-10-10)
- [LOTE_FINAL_ITENS_DIMITRESCU_2026-10-10.md](#arquivo-lote-final-itens-dimitrescu-2026-10-10)
- [PROPOSTAS_DIMITRESCU_2026-10-10.md](#arquivo-propostas-dimitrescu-2026-10-10)
- [DIMITRESCU_ITENS_SELECAO_DIRETA_2026-10-11.md](#arquivo-dimitrescu-itens-selecao-direta-2026-10-11)
- [ESPECIAL_COOPERATIVO_ANIMACAO_2026-10-11.md](#arquivo-especial-cooperativo-animacao-2026-10-11)
- [ESPECIAL_E_DEVTOOLS_REFINAMENTO_2026-10-11.md](#arquivo-especial-e-devtools-refinamento-2026-10-11)
- [AUDIO_E_ITENS_PADRAO_2026-10-11.md](#arquivo-audio-e-itens-padrao-2026-10-11)
- [BALANCEAMENTO_DOMINADORA_MATRIARCA_2026-10-12.md](#arquivo-balanceamento-dominadora-matriarca-2026-10-12)
- [PACOTE_COOPERATIVO_E_BOT_ITENS_2026-10-12.md](#arquivo-pacote-cooperativo-e-bot-itens-2026-10-12)
- [ANALISE_DANO_CANASTRAS_HP_2026-10-12.md](#arquivo-analise-dano-canastras-hp-2026-10-12)
- [BALANCEAMENTO_SEIS_CHEFES_2026-10-13.md](#arquivo-balanceamento-seis-chefes-2026-10-13)
- [REGRAS_VIGENTES_SEIS_CHEFES_2026-10-13.md](#arquivo-regras-vigentes-seis-chefes-2026-10-13)
- [CHECKLIST_ORIGINAL_E_ADENDOS_ANTES_CONSOLIDACAO.md](#arquivo-checklist-original-e-adendos-antes-consolidacao)
- [HANDOFF_ANTES_CONSOLIDACAO.md](#arquivo-handoff-antes-consolidacao)
- [CONTEXTO_DOCUMENTACAO_ANTES_CONSOLIDACAO.md](#arquivo-contexto-documentacao-antes-consolidacao)
- [CONTEXTO_INVENTARIO_ANTES_CONSOLIDACAO.md](#arquivo-contexto-inventario-antes-consolidacao)


---

<a id="arquivo-balanceamento-nemesis"></a>

## Origem: BALANCEAMENTO_NEMESIS.md

### Balanceamento do Nemesis

**Nota posterior — 09/10/2026:** elegibilidade passou a permitir desafios sem solução pronta. Devorador exige jogo estruturalmente extensível, Infectado não exige provar duas cartas e marcas do Agarrador/Tentáculos aceitam saída legal por jogo ou descarte. Pesos/HP/cura/Infecção não mudaram; métricas antigas abaixo são históricas. Referência atual: `../AUDITORIA_ELEGIBILIDADE_CHEFES_2026-10-09.md`.

#### Durabilidade — 06/10/2026; correções funcionais — 07/10/2026

O modelo atual usa **batida fixa de 100 HP**, pelo pipeline oficial, sem escala por pontos nem redução percentual da Dominadora. A passiva persistente do Devorador acumula cartas novas da equipe entre jogos, jogadores e turnos; cada 3 créditos cura 40/70 HP (+30 Reforçado), no máximo uma vez por turno. Excedentes ficam pendentes e são consumidos na próxima contribuição ou no fim de um turno posterior elegível. Morte/reanimação zeram progresso. Entrada da Invasão permanece independente. Nenhum HP/peso/valor de cura/Infecção foi alterado neste pacote.

| Combatente | HP anterior (histórico) | HP atual |
|---|---:|---:|
| Nemesis | 2600 | 2200 |
| Agarrador | 350 | 220 |
| Infectado | 300 | 240 |
| Devorador | 400 | 260 |

Agarrador deixa de depender de cartas adquiridas do Lixo. Após a compra de cada jogador (Monte ou Lixo), restringe cartas da mão até o fim desse turno: normal 1, Mutado 2, Reforçado normal 2, ambos 3. Essas são quantidades efetivas pretendidas: prioriza cartas jogáveis e completa com outras seguras, mesmo sem jogada imediata. Só bloqueia jogo; descarte é permitido. Testa combinações determinísticas com o planner canônico no estado resultante, preservando uma solução legal (inclusive descartando AGARRADA), não as cartas fixas do primeiro plano. Só reduz a quota se nenhuma combinação desse tamanho funcionar. Prende menos somente por falta física de cartas ou proteção necessária contra estado impossível, sem punição adicional.

Objetivo: cada zumbi deve ser uma ameaça que mereça consideração como alvo, sem transformar o pacote em milhares de HP obrigatórios adicionais. O envelope de durabilidade deve ser testado antes de alterar outros números.

Preservados na revisão histórica de 07/10: Infecção 0–100 e valores das habilidades; Infectado +2/+4, reforço +2; Devorador 40/70, reforço +30; Regeneração 100; Reanimação 50% (110/120/130), uma vez por fase, teto 1/2/3 e Mutado na F3; lifecycle, pesos, alívio por canastras, S.T.A.R.S., dano sem overflow e regra global do Lixo. Nenhum outro chefe foi rebalanceado.

**Regra atual (08/10/2026):** cada Agarrador, Infectado e Devorador só pode ser reanimado **uma vez por partida**, mesmo se morrer novamente em outra fase. Continua também o limite de uma Reanimação Viral por fase, com espaço no teto. O contador `combatEntities[].revivals` já serializado permanece em save, undo e reload; só cadáveres com `revivals < 1` são elegíveis. A Infecção, pesos, cura e HP não mudaram nesta alteração.

#### Estimativa histórica, não resultado atual

A estimativa antiga de **~68,9%**, citada no pedido desta revisão, é anterior à regra global do Lixo e anterior a esta mudança de HP/passiva. Também não há evidência de que ela modelava corretamente o dano histórico de encerramento. É mantida aqui somente como histórico, não como probabilidade atual validada sob batida fixa de 100 e contador coletivo do Devorador. Não foi encontrada uma simulação correspondente no workspace local para reproduzi-la. Não há novo percentual de vitória afirmado neste patch; recalibração depende de partidas, simulação ou telemetria posteriores.

#### Validação e migração

Saves antigos mantêm lifecycle, alvo, S.T.A.R.S., quotas e HP restante (limitado somente ao novo máximo). Compras são deduplicadas por turno/jogador; render/reload/snapshot/undo não devem repetir o pulso. O BOT reutiliza a restrição canônica nas jogadas, sem mudar avaliação de alvos ou heurística de dano.

Regressões: `nemesis-grabber.test.mjs`, `nemesis-boss.test.mjs`, `nemesis-progress-meters.test.mjs`, handlers de compra e `nemesis-ui.browser.mjs`; depois executar todos os `tests/*.test.mjs`. Testes automatizados não substituem duas sessões Firebase reais nem medição de força contra jogadores.

#### Registro histórico da revisão de 06/10/2026

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

##### Git diff --stat

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


---

<a id="arquivo-limpeza-suite-2026-10-06"></a>

## Origem: LIMPEZA_SUITE_2026-10-06.md

### Limpeza da suíte local — 06/10/2026

#### Fonte e resultados

Fonte de verdade: workspace local atual, com `git status` e `git diff` conferidos antes e depois. Não foi utilizado Google Drive. Nenhum commit, deploy, alteração de versão ou rebalanceamento foi realizado.

A primeira execução completa encontrou um loop síncrono infinito em `boss-debug-scenarios.test.mjs`: o teste esperava `players`, mas Ordem Final estava aguardando escolha humana. Foi necessário interromper essa execução. Para coletar o restante da baseline, foi executada uma rodada diagnóstica dos outros 50 arquivos: **721 testes, 670 passando e 51 falhando**. O arquivo travado não foi escondido: foi corrigido e voltou às execuções completas.

Resultados finais:

- Suítes focadas afetadas e invariantes aprovadas: **507 testes, 507 passando, 0 falhas**.
- Suíte ampla, todos os 51 arquivos `tests/*.test.mjs`: **758 testes, 758 passando, 0 falhas, 0 cancelados, 0 skipped, 0 todo**.
- Browser test do Nemesis: aprovado em 1920×1080, 1024×768, 844×390, 390×844 e 3840×2160. Usa fixture local do renderer real; não é sessão Firebase em dois clientes.
- Checagem sintática dos 21 arquivos JS/MJS modificados: aprovada. `git diff --check`: aprovado.

A diferença entre 721 e 758 não é remoção de casos: 29 testes do arquivo antes travado voltaram a rodar; o módulo de BOT da Dominadora, antes bloqueado por import incorreto e contabilizado como um arquivo falho, passou a executar seus 7 casos (+6); foram adicionadas 2 regressões (+2).

Logs locais em `.cache/suite-cleanup-baseline-rest.tap`, `.cache/suite-cleanup-focused-final.tap` e `.cache/suite-cleanup-final.tap`. Capturas do navegador em `.cache/nemesis-ui/`.

#### Classificação e correções

##### Regressões reais / defeitos da implementação

- **DevTools de Dominação:** `debugFriendMeld()` concedia o bônus, mas não registrava a proteção usada por `processDominationReward()`. Reprocessar após JSON reload podia comprar outra carta. Agora persiste o mesmo controle de turno; a regressão cobre Limpa, Real e Ás-a-Ás e mantém a igualdade integral do estado após repetição.
- **Laboratório, cenários sem alvo:** algumas fixtures mantinham alvos elegíveis. Pesadelo Eterno precisa de apenas uma carta, portanto preservar uma ainda era incorreto; Laço do Tigre mantinha jogos; Olho do Falcão, Mão no Espelho e Reflexo Invertido mantinham cartas. As fixtures retiram os alvos e devolvem cartas ao monte, conservando o baralho. Nenhuma regra de elegibilidade do jogo foi alterada.
- **HUD compacto do Nemesis:** a consequência de Extermínio S.T.A.R.S. excedia o orçamento existente. Foi encurtada para “Falha: bônus de Infectado/Ômega”. O teste de orçamento foi mantido intacto; mecânica e detalhes não mudaram.
- **Texto da Matriarca:** Pólen anunciava 40 em vez de até 30 HP; o resumo da ameaça Colheita anunciava 60/100 em vez de 50/80. Somente essas strings foram corrigidas, com nova regressão para apresentação, ajuda, faixas e ameaça criada pelo motor real.

##### Expectativas antigas, sem mudanças nas regras corretas

- **Dominadora:** testes antigos tratavam Correntes como punições/alívios inteiros. Atualizados para a representação interna atual de Dominação: 1 ponto = 0,08; Limpa remove 4 pontos = 0,32; punições atuais permanecem. Exposição, Escolha Forçada e Ordem Final seguem os valores atuais, não os antigos. Ordem Final é cega antes do aceite e só então marca duas cartas realmente jogáveis; fixtures agora oferecem uma solução legal.
- **HUD/diálogos/Casulo:** assertions acompanhavam markup anterior ou texto simples; atualizadas para speech separado, nome do chefe, renderer de texto rico e guarda condicional atuais, mantendo as verificações funcionais.
- **Laboratório Nemesis:** `phase_cap` e `persistent_corpse` na F1 são cenários intencionalmente inelegíveis; fallback é esperado somente nesses casos e em `no_target`. Os demais continuam obrigados a apresentar a habilidade solicitada.
- **Domination Friend:** a opção Decreto já está ativa por padrão. Trincas naturais abrem antes da despedida; aberturas sujas aguardam a despedida; reta final usa monte ≤4 sem mortos; segundo jogo preserva reservas do primeiro e usa valores já presentes nele. Essas mudanças preexistiam no histórico local (commits `74da334` e `3ff6729`). Atualizadas as expectativas antigas, sem modificar IA/estratégia. O caso de trinca natural foi preservado em teste explícito separado.
- **Service worker:** expectativa antiga `buraco-v269` substituída por validação da release atual ≥276, mantendo verificações de `skipWaiting` e assets. A versão atual não foi reduzida nem editada.

##### Harness / mocks / imports / execução

- `localActionGate is not defined` vinha das VMs que executavam handlers extraídos sem suas novas dependências. Os testes agora usam o gate e pausa reais, os helpers importados e ambas as funções wrapper/`Once`. Não foi colocado um global falso no app.
- Mocks faltantes de animação local, reação de Decreto, cancelamento de BOT, refresh do Laboratório e `renderHand` foram fornecidos onde a fixture isola deliberadamente esses fluxos. Seus módulos específicos continuam cobertos pela suíte ampla.
- Laboratório injeta o BOT específico de chefe; VM do BOT prepara imports e `import.meta` para executar a classe real no contexto isolado.
- Import antigo `boss-engine.js` na raiz corrigido para `js/boss/boss-engine.js`.
- Tests de CSS agora incluem os arquivos específicos para Matriarca/Dominadora, para onde os estilos haviam sido movidos.
- Loop infinito do cenário Ordem Final substituído por avanço limitado com assertion de `choice`; a escolha é resolvida antes de conferir `players`. Não é um skip nem um timeout artificial para aceitar comportamento incorreto.
- Nenhuma falha remanescente foi atribuída genericamente a flake. Não foram introduzidos sleeps para obter teste verde.

#### Arquivos de produção alterados

1. `js/boss/boss-debug-scenarios.js` — fixtures sem alvo.
2. `js/game/domination-dev-tools.js` — persistência do controle de bônus.
3. `js/boss/presentation/nemesis.js` — texto compacto.
4. `js/boss/presentation/matriarch.js` — texto de Pólen até 30 HP.
5. `js/boss/boss-engine.js` — somente texto de Colheita 50/80 HP.

#### Testes atualizados

- `tests/boss-cocoon-visual.test.mjs`
- `tests/boss-debug-scenarios.test.mjs`
- `tests/boss-engine.test.mjs`
- `tests/boss-help-content.test.mjs` — inclui nova regressão de textos da Matriarca.
- `tests/boss-integration.test.mjs`
- `tests/boss-lab-persistence.test.mjs`
- `tests/boss-lab-selection-regressions.test.mjs`
- `tests/boss-september-regressions.test.mjs`
- `tests/discard-pickup.test.mjs`
- `tests/domination-balance.test.mjs`
- `tests/domination-decree.test.mjs`
- `tests/domination-friend.test.mjs` — inclui teste explícito de abertura natural e guarda após reload.
- `tests/dominatrix-bot-v5.test.mjs`
- `tests/match-control.test.mjs`
- `tests/service-worker-update.test.mjs`
- `tests/stock-draw-animation.test.mjs`

#### Regras e alterações do usuário preservadas

- Favorita F2/F3: protegida 0, punida +8, cooperadora menos dominada continua sendo punida. Nunca restaurado −2.
- Demais valores/controles atuais da Dominadora e recuperação por canastra intactos.
- Sucesso/partial de habilidade não reduz recursos especiais; canastras aprovadas e gastos internos permitidos permanecem. A regressão global continua passando sem flexibilização.
- Matriarca: teto +1 Flor por ativação, canastra não reabre quota, propagação independente permanece; HP 2000, derrota em 5 Flores, Renascimento, Orvalho e Casulo intactos.
- Nemesis: nenhum peso, HP, lifecycle, regra de dano, Infecção ou mecanismo redesenhado/rebalanceado.
- `service-worker.js` e `styles/domination.css` já estavam staged no início e foram preservados sem edição nesta tarefa. Permanecem staged; os arquivos desta revisão não foram staged.
- Inventário e documentação funcional já descreviam Pólen/Colheita corretamente; não receberam alterações de números para acompanhar os textos errados. Documentação técnica e checklist receberam apenas o registro das correções pertinentes.


---

<a id="arquivo-nemesis-implementacao"></a>

## Origem: NEMESIS_IMPLEMENTACAO.md

### Nemesis — implementação e validação

#### Contador do Devorador e batida — 07/10/2026

Batida usa 100 HP fixos no pipeline oficial; o BOT só encerra se a simulação canônica confirmar vitória. Devorador persistente soma todas as cartas novas da equipe, entre jogos (inclusive novos), turnos e jogadores. Cada 3 créditos cura pelo helper 40/70 HP, Reforçado +30, no máximo 1x/turno; excedentes seguem pendentes para uma contribuição ou fim de turno posterior. `devourerFeed` versão 1 deduplica cardIds; `devourerTurnIds` guarda quota. Saves antigos iniciam zero sem contar mesa anterior; normalização não cura. Entrada/morte/reanimação zeram o contador; undo restaura créditos/IDs/quota juntos. A entrada da Invasão não mudou. Sem alterações em HP, Infecção, pesos, Regeneração ou Reanimação. Estimativas anteriores continuam históricas, não win rate atual.

#### Durabilidade e Agarrador — revisão de 06/10/2026

Estado atual: Nemesis **2200 HP**; Agarrador **220**, Infectado **240**, Devorador **260**. Após concluir a compra do Monte ou do Lixo, Agarrador prende exatamente **1 normal / 2 Mutado / 2 Reforçado / 3 ambos**, quando houver cartas seguras suficientes. A seleção seeded prioriza cartas com uso legal real (`findNemesisLegalPlan()`) e completa com outras cartas seguras da mão, mesmo sem jogada imediata. Testa combinações determinísticas da quota completa no estado resultante com o planner canônico, incluindo objetivo cooperativo e todos os descartes legais (AGARRADA bloqueia somente jogo). Só tenta uma quota menor após esgotar as combinações do tamanho anterior; não reserva cegamente cartas do primeiro plano. Quantidade menor somente por falta física de cartas ou proteção necessária contra estado impossível. Sem descarte legal, preserva a rota de Morto/batida validada pelo planner.

`notifyBossPurchaseCompleted()` é chamado após a compra efetiva e, no Lixo Fechado, após sua jogada obrigatória. A restrição só impede jogo, nunca descarte; termina no turno do dono ou na morte do Agarrador. `grabbedTurnIds` e o evento estável `nemesisGrab:<turno>:<jogador>` evitam reaplicação por reload/snapshot; a apresentação existente também deduplica undo/reaplicação. O BOT recalcula a partir da mão atual e consulta o bloqueio canônico nas rotas genéricas e de objetivo, sem nova heurística de combate.

Registro da primeira correção de quantidade de 06/10/2026 (anterior à busca de combinações): 143 testes focados passaram; suíte ampla `tests/*.test.mjs`: 879/879, sem falhas, skips ou todo. Browser do Nemesis passou nos cinco viewports existentes. Regressões cobrem prioridade jogável + complemento seguro, quantidades físicas insuficientes, solução única/alternativas, Invasão cooperativa, descarte, Morto/batida, morte/fim do turno e deduplicação de reload/snapshot/undo. Testes e fixture local, não uma partida Firebase ao vivo. Nenhum HP, bônus, peso, outra passiva ou BOT foi rebalanceado.

Correção posterior de 06/10/2026: o planner considera todos os descartes legais, não só o primeiro. A seleção do Agarrador valida combinações da quota completa no estado resultante antes de tentar quantidades menores. Barragem com 3 MARCADAS mantém 2 saídas legais com AGARRA 2 (Mutado ou Reforçado); a regressão também executa AGARRA 3 com ambos. A mesma carta pode ser MARCADA e AGARRADA: dois status legíveis em um único selo, com um único overlay verde, sem brilho duplicado. Os estados expiram independentemente; descarte permanece permitido. Validação: 147 testes focados, 883/883 na suíte ampla, nenhum skip/todo; browser nos cinco viewports, incluindo carta pequena 65×95 e NOVA. Nenhum rebalanceamento adicional.

Reanimações usam os máximos atuais: **110/120/130 HP**. Infecção, cura, pesos, lifecycle, regras do Lixo e demais chefes não foram rebalanceados. Decisão e limites das estimativas históricas: [BALANCEAMENTO_NEMESIS.md](#arquivo-balanceamento-nemesis).

Validação desta rodada de durabilidade: **132/132 focados**, **855/855 na suíte ampla**, zero falhas/skip/todo; browser local nos cinco viewports passou. Resultados, arquivos e limitações estão no documento de balanceamento acima; números de validação das rodadas anteriores abaixo permanecem históricos.

#### Medidores de objetivos

Comando da Horda é um reforço temporário em um único zumbi, sem objetivo cumulativo/faixas: não usa barra de progresso. O HUD identifica o zumbi e o prazo, seguido apenas da passiva reforçada total (Agarrador: cartas presas para jogo; Infectado: Infecção extra por falha; Devorador: cura a cada 3 cartas novas acumuladas pela equipe). A ajuda explica o gatilho real, sem listar como ativos os bônus dos outros dois zumbis. Mudar o alvo de dano não muda quem recebeu o comando.

Lança-Foguetes cobra por **carta nova** adicionada à Zona de Impacto: +10 Infecção na fase 2 e +12 na fase 3. Três cartas juntas custam +30/+36, igual a três jogadas separadas. Cartas já contabilizadas/reorganizadas não cobram novamente. O teto de Infecção e a derrota imediata permanecem; a cobrança de uma jogada é um único evento/SFX.

Zona Contaminada aplica à carta exata do topo a infecção verde compartilhada, com selo CONTAMINADA e custo +6 Infecção por retirada durante o turno do alvo. O destaque é removido fora desse turno ou ao encerrar a partida. Zona de Impacto permanece laranja e independente: marca somente as cartas do jogo do lança-foguetes enquanto o efeito ainda não expirou.

O painel reutiliza o medidor de faixas dos outros chefes somente no Extermínio S.T.A.R.S.: 0/1/2 exigências cumpridas têm base +16/+8/+0. HUD e faixas exibem o total projetado atual, somando Infectado (normal/Mutado), Reforçado e Ômega somente se houver falha, respeitando o limite 100. Caçada e Tentáculos também mostram esse total; o `?` apresenta a composição curta. `getNemesisObjectiveOutcome()` e `projectNemesisInfection()` são compartilhados com a resolução real, sem conta paralela no HUD. Invasão, Caçada e Tentáculos mantêm contadores/estado do objetivo, sem barras binárias desnecessárias. Nenhuma regra ou punição foi alterada.

Seleção de alvo usa o gate local de ações durante o salvamento, assim como compra/descarte: snapshots aguardam sua conclusão. Clique no alvo já escolhido não repete a gravação. Regressão de browser simula salvamento atrasado, clique concorrente e snapshots antigo/novo; não substitui teste ao vivo em dois clientes Firebase.

#### Marcação das cartas — correção de 05/10/2026

Objetivos de carta usam selo MARCADA; cartas presas pelo Agarrador usam AGARRADA; topo do Lixo sob Zona Contaminada usa CONTAMINADA. Todos compartilham borda verde e manchas de infecção, sem asset novo, sem cobrir número/naipe nem interceptar cliques. Ao entrar a restrição do Agarrador, a carta exata pulsa uma vez pelo evento de aquisição; depois mantém a marca estática. Rerender/reload/snapshot/undo não repetem o pulso. O selo NOVA permanece separado. Redução de movimento desativa o pulso. Marcação visual não cria cobrança de Infecção nem muda permissões.

O adapter `nemesisBossUi.decorateCard()` é aplicado depois da face da carta. Antes disso, `innerHTML` apagava o selo inserido antecipadamente na mão. A decoração é idempotente e removida quando não há efeito; a lógica de escolha/saída das cartas permanece intacta.

Padronização de 06/10/2026: removidos contorno e brilho extras do contêiner/face do Lixo, que se somavam ao overlay da carta e engrossavam a marca. MARCADA, AGARRADA e CONTAMINADA usam exatamente o mesmo overlay original. O pulso de aquisição varia somente a opacidade, sem ampliar o brilho. Nenhuma mecânica alterada.

Validação desta correção: 80 testes específicos (`nemesis-boss`, `nemesis-discard-ui`, `nemesis-progress-meters`) passaram; `nemesis-ui.browser.mjs` passou nos cinco viewports já adotados e sua captura foi revisada. Cobertura inclui carta real do Agarrador, parceiro, limpeza, repetição, NOVA e redução de movimento. Não foi uma partida completa com Firebase ao vivo nem uma nova execução da suíte ampla; os resultados históricos abaixo pertencem às rodadas indicadas. Checklist permanente: seção 23 de `CHECKLIST_REGRESSOES_E_ATUALIZACOES.md`.

Revisão de 05/10/2026 sobre a implementação já existente. A base local foi comparada com os arquivos oficiais do Google Drive antes dos patches. Não foi reconstruída a batalha a partir do prompt antigo. O nome exibido, o relatório e o retrato usam somente **Nemesis**, sem sufixos de versão.

#### 1. Arquivos desta revisão

- `js/boss/boss-combat.js`: lifecycle opcional na primitiva genérica.
- `js/boss/bosses/nemesis.js`: Invasão, metadata do Laboratório, retrato e títulos por causa.
- `js/boss/mechanics/nemesis.js`: entrada, planos legais/cooperativos, passivas, quotas, BOT e fixtures.
- `js/boss/presentation/nemesis.js`: objetivo, progresso e ajuda da Invasão.
- `js/boss/ui/nemesis-ui.js`: cards contextuais, ajuda e alvos integrados.
- `js/boss/boss-engine.js`: hook genérico de anúncio, duração por payload, alvo válido e títulos por motivo.
- `js/boss/boss-debug-scenarios.js`: variantes/targets por metadata, solução cooperativa pelo motor real, fallback e rótulo do recurso.
- `app.js`: renderer genérico dos cards, seleção, ajuda e animação por evento.
- `styles/boss/nemesis.css`: estados dos cards, retirada, reforço e redução de movimento.
- `index.html`: opção Nemesis sem sufixo.
- `service-worker.js`: caminho do retrato renomeado; cache `buraco-v272` preservado.
- `assets/images/boss-nemesis.png`: renomeação do retrato existente, bytes preservados.
- `tests/nemesis-boss.test.mjs`: adaptação dos 45 testes anteriores e regressões adicionais.
- `tests/nemesis-ui.browser.mjs`: renderer real, lifecycle, alvo no card e ajuda em cinco telas.
- `tests/boss-control-balance-v2.test.mjs`: somente expectativa obsoleta da Prisão no Espelho atualizada.
- `docs/DOCUMENTACAO_CHEFE_DA_MESA.md`, `docs/INVENTARIO_HABILIDADES_CHEFES.md` e este relatório `docs/NEMESIS_IMPLEMENTACAO.md`.

Os registros e a integração anterior do BOT permanecem. O ajuste final acrescenta somente apresentação/ajuda e SFX de ganho real de Infecção; nenhuma alteração de geometria de cartas, publicação ou regra funcional de outro chefe. As exclusões de assets legados e do áudio da Thayanne presentes na árvore de trabalho não pertencem a esta revisão.

#### 2. Lifecycle final

Partida nova: Nemesis 2200 HP, Infecção 0/100, S.T.A.R.S. e três entidades **absent**, sem passiva nem espaço permanente no HUD.

- `absent`: ainda fora da mesa.
- `entering`: objetivo de entrada ativo; sem passiva e não atacável.
- `repelled`: objetivo cumprido; ameaça sai, pode tentar novamente, não é cadáver.
- `persistent`: objetivo falhou; HP máximo e passiva imediatamente ativos; atacável.
- `corpse`: persistente morto por dano; passiva desligada, possível alvo de Reanimação.

Somente persistentes vivos aplicam debuff. A falha da entrada não aumenta Infecção, inclusive sem bônus retroativo do Infectado. Não há alívio pela morte nem transbordamento de dano. Dano direto efetivo em Nemesis altera S.T.A.R.S.; dano em zumbi não.

Teto por fase: **1 / 2 / 3** persistentes vivos. Invasão e Reanimação respeitam o mesmo teto.

#### 3. Migração dos saves antigos

A normalização opcional de lifecycle mantém entidades antigas vivas como `persistent` e antigas mortas como `corpse`, preservando HP, seleção, S.T.A.R.S., bônus, cargas e estado da batalha. Novos estados não são remigrados. O marcador numérico de schema é interno, não nome de chefe/versão pública.

Na revisão de durabilidade, o HP restante é mantido quando abaixo do novo máximo, ou limitado ao novo máximo quando acima; não há reset/cura proporcional. Travas antigas válidas continuam até o fim do turno, sem sortear novamente ou emitir pulso novo. Travas de outro turno são removidas. A quota de Reanimação e o estado cadáver/repelido são preservados.

Saves antigos com mais vivos que o teto da fase não perdem entidades silenciosamente: novas entradas/reanimações são bloqueadas até haver espaço. Reload, snapshot e undo transportam os campos no objeto `boss` existente.

#### 4. Invasão da Horda

`horde_invasion`: fases 1/2/3, peso **4**; onze habilidades e soma dos pesos **39**. A seleção seeded usa apenas ausentes/repelidos elegíveis. Agarrador/Infectado preservam a prova do objetivo; Devorador exige apenas uma contribuição legal possível em jogo existente. Evita o último repelido imediatamente quando outro candidato real existe.

- **Agarrador:** escolhe carta com rota real de uso legal em jogo no turno do alvo. Após marcada, sair por jogo ou descarte continua cumprindo o objetivo. Um descarte legal isolado não torna a habilidade elegível. Não marca descarte final proibido por falta de Morto/canastra. Falha: 220 HP.
- **Infectado:** equipe contribui duas cartas válidas para jogos durante a rodada. O plano pode ser individual ou cooperativo. Falha: 240 HP.
- **Devorador:** elegível quando ao menos um jogo existente aceita uma contribuição legal; não exige prova antecipada da expulsão. A equipe acumula 3 cartas novas em jogos que existiam no início da invasão, registrando seus IDs. Pode alimentar o mesmo jogo, em contribuições separadas, por um jogador ou pelos dois. Ao atingir 3, é repelido; menos de 3 no fim da rodada deixa-o persistente com 260 HP (Mutado na F3). IDs de cartas deduplicados; reorganização e jogos novos não contam, inclusive após reload/snapshot/undo. Entrada e passiva são distintas: a passiva persistente agora soma cartas novas em qualquer jogo, inclusive jogos novos, entre turnos e jogadores; cada 3 créditos cura 40/70 HP, Reforçado +30, máximo uma vez por turno, sem perder excedentes nem ultrapassar o HP máximo.

O planejamento considera jogadores que ainda podem agir e a ordem real da rodada. Para Agarrador/Infectado, não escolhe objetivo que só funcionaria invertendo turnos. Para Devorador, não exige que as três cartas já estejam disponíveis na elegibilidade; o BOT tenta contribuições incrementais válidas. Sucesso repele; falha só estabelece o zumbi. Em F3, novas persistências já entram Mutadas.

#### 5. Comando, passivas e recuperação

Comando da Horda continua separado da Invasão: não traz zumbis, exige persistente vivo e reforça sua passiva até o fim da rodada seguinte.

| Zumbi | Normal | Mutado | Reforço |
|---|---|---|---|
| Agarrador | Após compra do Monte/Lixo, prende 1 carta da mão para jogo, não descarte, até fim do turno | 2 cartas | +1 carta (2 normal / 3 Mutado) |
| Infectado | +2 Infecção em falha positiva real | +4 | +2 |
| Devorador | Cura Nemesis 40 HP a cada 3 cartas novas acumuladas pela equipe; 1x/turno, excedentes pendentes | 70 HP | +30 HP |

Os totais aparecem diretamente em chips clicáveis: AGARRA 1/2/3, INFECÇÃO +2/+4/+6 e CURA 40/70/100. Normal + Reforçado mostra 2/4/70. O mesmo helper calcula a passiva aplicada e o total exibido; MUTADO e REFORÇADO abrem ajuda específica. Comando usa `expiresRound = roundNumber + 1`, válido até essa rodada inclusive; não reforça entering/repelled/corpse. Regeneração só cura persistente ferido. Reanimação só revive cadáver com 50% HP, **no máximo uma vez por zumbi durante a partida**, uma vez por fase e com espaço no teto; em F3 retorna Mutado. Mortes posteriores do mesmo zumbi não permitem nova Reanimação. O campo persistido `revivals` garante esse limite mesmo após reload, snapshot e undo. A entrada da F3 muta todos os persistentes vivos.

BOT executa planos legais para impedir entradas, respeita guard de batida segura e seleciona apenas persistentes vivos; mantém avaliação de Infecção/letalidade/cura, sem simplificação para menor HP.

#### 6. Artes conectadas

Encontrados/usados:
- `assets/images/boss-nemesis.png`: retrato existente, apenas renomeado.
- `assets/images/nemesis-infection-meter-frame.png`: moldura de Infecção existente, preservada.

As três artes foram enviadas pelo usuário e conectadas às respectivas entidades:
- `assets/images/nemesis-agarrador.png`;
- `assets/images/nemesis-infectado.png`;
- `assets/images/nemesis-devorador.png`.

Os arquivos foram copiados sem alterar seus bytes. Os cards reutilizam `boss-daughter-card` e `boss-daughter-state` dos ajudantes aprovados, com arte panorâmica 8:3 full-bleed (`object-fit: cover`), nome integrado e sem áreas vazias. Em telas estreitas o recorte natural protege a altura mínima dos controles, sem distorcer o arquivo. Todos os retratos estão no precache. Nenhuma imagem foi fabricada ou substituída.

#### 7. HUD e Laboratório

Cards entram apenas quando relevantes, em faixa própria abaixo do HUD principal, como Filhas/Capangas, sem aumentar sua altura. `entering` mostra o chip INVADINDO; o objetivo continua no painel de Invasão da Horda. Persistente mostra nome, HP/barra e chips compactos ATIVO, MUTADO e REFORÇADO; cadáver mostra CADÁVER. O próprio card seleciona alvo e mantém destaque. O alvo atual e o botão ↩ para voltar ao Nemesis ficam na própria arte principal, sem linha abaixo dos zumbis. O `?` de 17px fica dentro do card e abre o popover oficial compartilhado junto ao botão clicado, com ponteiro, explicando passiva normal, Mutado e Comando da Horda em blocos curtos.

S.T.A.R.S. aparece como overlay discreto à direita da arte principal, sem linha estrutural extra. Sua ajuda usa o mesmo popover oficial e explica prioridade ofensiva, troca após dano direto ao Nemesis e ausência de troca por dano aos zumbis. Sua lógica não foi alterada. A arte principal inteira também seleciona Nemesis como alvo, por toque/clique ou teclado, quando permitido; clicar nos chips/ajuda não troca alvo.

##### Objetivos viáveis e Lixo protegido (06/10/2026)

`findNemesisLegalPlan()` prepara marcas a partir de possibilidades reais de jogo. Tentáculo exige duas alternativas jogáveis; Barragem exige três marcas jogáveis e uma solução conjunta de duas; Extermínio comprova contribuição e segunda carta utilizável. Descartar a carta marcada continua contando na resolução. Carta inútil apenas descartável não é candidata; ausência de plano implica inelegibilidade/fallback normal.

A regra compartilhada de Lixo do modo Chefe vale também para Nemesis: natural comum em jogo existente → somente topo se entrar sozinho; se depender de cartas da mão como ponte/complemento → Lixo inteiro. Jogo novo pela mão → Lixo inteiro; Joker → topo; 2 existente ou coringa em jogo novo → topo; 2 natural em jogo novo → Lixo inteiro. A consulta usa o validador canônico, não ordem visual, e somente o destino realmente escolhido. Zona Contaminada calcula viabilidade com o tamanho real da retirada e continua cobrando por retirada, não por carta. Após a jogada obrigatória, Agarrador considera a mão inteira restante, incluindo cartas anteriores à compra, nunca cartas já colocadas na mesa.

Resultado da revisão atual: ver `REGRA_LIXO_E_UX_NEMESIS_2026-10-06.md`. Os resultados abaixo são históricos, não o estado atual da suíte.

Horda/Ômega e duração ficam no painel amarelo, sem faixa de texto acima dos zumbis. Zona de Impacto usa moldura compartilhada apenas em `.meld-line-cards`; Canastra/Limpa e contribuição ficam fora, como nos demais efeitos de chefes. Nenhuma regra de alvo, dano, prazo ou lifecycle mudou.

SFX: `assets/sfx/ganho-infeccao-nemesis.mp3`, original fornecido preservado e incluído no precache/registro central `BOSS_SFX`. O adaptador de apresentação identifica eventos `infection` e `nemesisObjective` apenas com `amount > 0` efetivamente aplicado. Objetivos registram o delta já calculado; resultados posteriores não repetem o som. O sincronizador existente deduplica `actionId` inclusive no mesmo lote, marca eventos iniciais/reload sem tocar e não repete Firebase/rerender/undo. Infectado/Horda/Ômega continuam no único cálculo central, sem reprodução na função de estado. Redução e +0 ficam silenciosos.

Repelido tem retirada breve e desaparece. Cadáver é discreto, identificado e sem barra/debuff ativo. Animações pontuais por evento não repetem em reload/rerender; respeitam `prefers-reduced-motion` e telas touch. Sem cinematografia ou efeito contínuo pesado.

Laboratório usa o motor real: três entradas, sucesso/falha, reentrada, proteção contra repetição, teto da fase selecionada, persistente/cadáver, BOT, reload/undo, Comando sem alvo, buff real, Reanimação e Regeneração. Cenários especiais fixam seu alvo apropriado por metadata, evitando combinações incompatíveis com um zumbi escolhido antes. Recurso do Nemesis mostra Infecção, não Dívida.

#### 8. Auditoria e testes

- Títulos por causa: `max_infection` → **Infecção Total**; ataque final insuficiente → **Nemesis sobreviveu**; exaustão → **Recursos esgotados**.
- Zona Contaminada exige plano real de retirada do Lixo Fechado, validador oficial, bloqueios e condições de Morto/batida; lixo não vazio sozinho não basta.
- Só o teste obsoleto da Nehelenia mudou: Prisão no Espelho permanece peso 2/fases 1/2/3, elegível com resgate real, sucesso sem penalidade e falha +8/+10/+12. Sua regra não foi alterada.

Cobertura adicional: lifecycle completo, entrada sem passiva/dano, success/failure sem Infecção extra, migração idempotente, quotas/caps, reentrada, não repetição, mutação, offboard inativo, planos cooperativos/ordem e cartas não duplicadas, BOT realmente jogando/descartando, persistência, ajuda/seleção no card, títulos e Zona.

#### 9. Resultado de validação

- Nemesis: **72/72 passaram**, incluindo ações reais do BOT para as três entradas e três regressões de SFX/delta/deduplicação.
- Ajuste final: apresentação/mecânicas/arquitetura de isolamento relacionados **50/50 passaram**; junto ao Nemesis, **122/122**. A validação anterior de Nehelenia/balanceamento/apresentação/isolamento passou **66/66**.
- Browser: renderer real passou em **1920×1080, 1024×768, 844×390, 390×844 e 3840×2160**; ajuda oficial de zumbis/S.T.A.R.S., alvo no card, permissões, estabilidade de DOM, retirada/redução de movimento e cadáver sem barra. Artes reais carregadas, correspondência por entidade, full-bleed e ajuda completamente dentro do card verificados. Fixture local sem Firebase autenticado.
- Sintaxe: **12 JS/MJS desta revisão** passaram em `node --check`; `git diff --check` passou.
- Suíte ampla possível, excluindo somente o arquivo bloqueado descrito abaixo: **528 testes, 477 passaram, 51 falharam**.
- Baseline imediatamente anterior: **504 testes, 452 passaram, 52 falharam**. Nenhum nome de falha adicional; a única falha removida é o teste obsoleto da Prisão no Espelho atualizado com a regra aprovada.
- Validação anterior do lifecycle no Drive: **18 arquivos** foram relidos pelo conector e seus hashes SHA-256 coincidiram com os locais; a cópia de readback passou **69/69 testes e o browser nos cinco viewports**. As renomeações foram verificadas. Antes do ajuste visual/SFX final, `js/boss/mechanics/nemesis.js` foi novamente relido do link fornecido e coincidiu com a base local, normalizando apenas quebras de linha.

O arquivo antigo `tests/boss-debug-scenarios.test.mjs` foi tentado separadamente e voltou a ficar preso depois do teste da Ordem Final. Foi encerrado após **30 segundos** com processo isolado, sem alterar regras para fazê-lo terminar. O runner principal não o inclui; esta limitação não é omitida.

Comparação anterior à revisão: 504 testes, 452 passaram, 52 falharam. As falhas pré-existentes incluem expectativas antigas de balanceamento/visual, fixtures VM incompletas, importações antigas, amigas da Dominação e SW. A suíte inteira não será declarada verde enquanto permanecerem.

#### 10. Teste manual e riscos restantes

- Feedback de HP (06/10/2026): dano aparece no card do alvo registrado no evento, inclusive no golpe fatal; o número usa o HP efetivamente perdido, sem overflow. O HUD principal só recebe impacto quando o alvo é Nemesis. Barras dos zumbis: verde acima de 50%, amarelo de 50% até acima de 25%, vermelho em 25% ou menos. No Nemesis, tensão usa âmbar mais evidente e perigo vermelho vivo. Pulsos respeitam reduced motion; nenhuma regra de dano/vida mudou.

- Ajuste visual/SFX final: 72/72 testes do Nemesis e browser nos cinco viewports passaram; cards full-bleed, chips/ajuda oficiais, S.T.A.R.S. integrado e ganho de Infecção deduplicado. Originais de imagem/MP3 preservados, sem mudança de mecânica.
- Partida completa humano/humano em dois clientes reais: transporte Firebase ao vivo, reload no turno do parceiro, morte/reanimação e alvo.
- Partida completa humano/BOT em todas as fases para avaliar balanceamento; ações específicas passaram, não se promete IA perfeita.
- Mesa densa no fim da partida em tablet landscape: teste browser atual valida HUD, não toda a densidade de jogos/cartas.
- Um plano legal no anúncio pode deixar de funcionar se os jogadores consumirem as cartas/alterarem a mesa depois. Não há troca silenciosa de exigência.
- O comprovador de Zona é conservador: pode deixar de escolher a habilidade em extensões muito longas que exigem mais cartas simultâneas que o planejador examina. Nunca é autorizado retirar o Lixo fora das regras oficiais.
- Ataque final direcionado a zumbi pode perder a batalha; mantém aviso, sem overflow.
- Deploy/cache não foram publicados nem alterados naquela rodada de 06/10.

##### Apresentação de Infecção e auxiliares no laboratório — 07/10/2026

- Ganhos de Infecção entram em fila: base da habilidade, bônus efetivamente aplicado do Infectado (incluindo Mutado/Reforçado) e Ômega. Um traço verde liga o Infectado à barra antes do seu número. Os componentes vêm da projeção canônica usada pela resolução, registrados no evento; não se recalculam com buffs futuros. Perto de 100, só se anima a parte aplicada. Sem mudança de Infecção, cadência, HP ou pesos.
- Render/reload não repetem histórico; undo e troca de mesa cancelam transferências. Reduced motion elimina voo/pulso. Nenhum novo som ou asset; efeitos usam elementos CSS/WAAPI temporários.
- DevTools → Laboratório → Auxiliares permite trazer/retirar/derrotar zumbis, ajustar vida e preparar Mutado/Reforçado, independente da habilidade ou do teto de invasão. Exceder o teto só é permitido na fixture manual, não no combate normal. Fase 3 continua normalizando Mutado; só um zumbi pode receber o reforço vigente. Retirar Agarrador libera travas; ajustar Devorador reinicia seus créditos de teste sem premiar cartas antigas. Snapshot/undo preservam as edições.
- Cache local atualizado para v285 para carregar o módulo novo; nenhum deploy ou push.


---

<a id="arquivo-regra-lixo-e-ux-nemesis-2026-10-06"></a>

## Origem: REGRA_LIXO_E_UX_NEMESIS_2026-10-06.md

### Lixo protegido e UX do Nemesis — 06/10/2026

Fonte de verdade: workspace local atual. Limpeza documental pós-rebalanceamento em 06/10/2026. As regras finais abaixo continuam correntes; arquivos, alterações e resultados de testes da revisão original são registros históricos, não uma nova execução ou especificação anterior de HP. Nenhuma operação no Google Drive, commit ou deploy. Alterações de artes Resident Evil surgidas paralelamente no workspace foram preservadas e não fazem parte do patch original.

#### Regra final do Lixo

Somente modo Chefe, para todos os seis chefes. Outros modos permanecem inalterados.

| Topo / destino real escolhido | Quantidade retirada |
|---|---|
| Natural comum / jogo existente, topo entra sozinho | 1 |
| Natural comum / jogo existente, depende de cartas da mão como ponte/complemento | Lixo inteiro |
| Natural / jogo novo pela mão | Lixo inteiro |
| Joker / qualquer jogo | 1 |
| 2 natural ou coringa / jogo existente | 1 |
| 2 coringa / jogo novo pela mão | 1 |
| 2 natural / jogo novo pela mão | Lixo inteiro |

A escolha oficial do Fechado foi preservada. Um encaixe público alternativo não restringe um jogo novo escolhido pelo jogador. Decisão final de apresentação: somente o pequeno `?` ao lado do Lixo explica a regra; sem aviso extra durante seleção, escolha do destino, confirmação ou compra.

Validação reutilizada: `isValidBossSequence()`, incluindo seus flags oficiais `forceNatural`/`forceWild`. `isBossCardNaturalInSequence()` consulta esse mesmo validador com o topo na função natural; não implementa uma segunda regra de sequência nem usa posição visual. A consulta não altera cartas/flags. 2–3–4 e 3–4–2 são equivalentes.

`quoteBossDiscardPickup()` é compartilhada pelo humano, BOT e planejamento de Zona Contaminada. Validação de seleção, limites, mão restante e condições de Morto/batida consideram a quantidade realmente adquirida. O BOT não passa pelo atalho de compra aberta sem destino no modo Chefe. Tentativa inválida não move cartas; aquisição não duplica após snapshot/reload. O clique normal no Lixo após comprar continua sendo o comando de descarte, como antes.

#### Nemesis

- INVADINDO: chip/ajuda de expulsão, sem HP de combate nem seleção. Lifecycle e resolução preservados.
- Retrato principal clicável e acessível por teclado seleciona `boss` quando permitido. Chips/ajuda não selecionam nem persistem mudança de alvo.
- Chips mostram o efeito final calculado pelo mesmo helper usado na passiva: AGARRA 1/2/3, INFECÇÃO +2/+4/+6 e CURA 40/70/100. Normal + Reforçado: 2/4/70.
- MUTADO e REFORÇADO explicam mudanças separadas; reforço informa a rodada final inclusiva. Comando continua apenas persistent vivo, até `roundNumber + 1`, sem mudança de duração.
- Chips reutilizam o popover oficial. Quebram linha sem sobrepor HP/ajuda; cards estreitos têm altura mínima de 120 px, mantendo a faixa externa ao HUD e arte full-bleed.
- MARCADA / AGARRADA / CONTAMINADA na carta exata, com identidade verde compartilhada. Zona de Impacto continua laranja, somente em `.meld-line-cards`.
- AGARRADA pulsa uma vez por evento novo. O pulso pausa durante o voo de compra e continua quando a carta aparece; não reinicia. Rerender/reload/snapshot/undo não repetem; marca permanece até expirar e redução de movimento deixa apenas a marca estática.
- Agarrador/Tentáculo/Barragem/Extermínio escolhem marcas com rota real de jogo por `findNemesisLegalPlan()`. Barragem comprova duas saídas utilizáveis em conjunto; Extermínio comprova contribuição e segunda carta utilizável. Descarte continua contando depois da marcação. Sem plano viável: inelegibilidade/fallback normal.

**Estado atual pós-rebalanceamento:** Nemesis 2200 HP, Agarrador 220, Infectado 240 e Devorador 260. A passiva do Agarrador prioriza cartas jogáveis e completa com outras seguras da mão após compra do Monte ou Lixo, bloqueando jogo, não descarte, até o fim do turno; Normal 1, Mutado 2, Reforçado +1, ambos 3. Referência: `BALANCEAMENTO_NEMESIS.md`.

**Registro histórico da revisão original de Lixo/UX, anterior ao rebalanceamento:** aquela rodada não mudou HP, Infecção, punições, pesos, fases, cura, alívio por canastra, S.T.A.R.S., overflow, mutação ou reanimação. A afirmação de HP preservado pertence apenas àquela rodada; os máximos atuais são os listados acima. Nenhuma regra aprovada dos outros chefes foi revertida.

#### Histórico — arquivos de produção alterados na revisão original

- `app.js`: retirada humano/BOT, quantidade real, retrato/chips oficiais, pulso durante voo e conexão da apresentação da mão.
- `boss-bot.js`: avaliação usa a quantidade cotada; modo Chefe não tenta compra aberta.
- `js/boss/boss-engine.js`: consulta compartilhada de retirada e papel natural do 2 via validador canônico.
- `js/boss/mechanics/nemesis.js`: objetivos utilizáveis, planejamento da retirada real, evento de Agarrada e cálculo compartilhado das passivas.
- `js/boss/ui/nemesis-ui.js`: chips/ajudas, selos e pulso deduplicado.
- `js/boss/presentation/nemesis.js`: explicações de entrada/alvo.
- `styles/boss/nemesis.css`: chips responsivos, retrato selecionável e identidade verde de contaminação.

Sem novos assets/dependências. Service Worker/cache preservados; não houve publicação.

#### Histórico — testes e documentação da revisão original

Testes adicionados/atualizados: `boss-discard-rule.test.mjs` (matriz de oito casos nos seis chefes), `discard-pickup.test.mjs` (handlers reais humano/BOT, destino, bloqueio, mão final, snapshot e voo), `nemesis-boss.test.mjs` (marcas realmente jogáveis, descarte e chips), `nemesis-ui.browser.mjs` (renderer real, teclado, permissões, pulso, ajuda e geometria), `boss-integration.test.mjs` e `domination-balance.test.mjs` (expectativa da quantidade real/dependência importada na VM).

- Suítes focadas: **197/197**, zero falhas, zero skip/todo. Arquivos executados: regra do Lixo, retirada, Nemesis, integração, seleção do laboratório, Dominação, descarte UI do Nemesis, medidores, legibilidade de chefes e BOT.
- Suíte ampla: **819/819**, zero falhas, zero skip/todo.
- Browser: passou em **1920×1080, 1024×768, 844×390, 390×844 e 3840×2160**. Inclui quatro chips sem sobrepor HP, entrada sem barra/alvo, oito famílias de molduras excluindo metadados, ajuda ancorada, marcas/limpeza/reload, pulso único e redução de movimento. Capturas desktop/mobile revisadas.
- Sintaxe: 12 JS/MJS alterados passaram em `node --check`; `git diff --check` sem erros.

A primeira execução ampla deste patch revelou uma expectativa antiga que exigia validar o lixo inteiro. Ela foi atualizada para o conjunto realmente retirado, preservando validação antes da mutação. O teste de proximidade do popover também passou a medir distância entre bordas: medir a partir do centro de um chip largo incluía incorretamente metade da largura do botão. A tolerância não aumentou.

Documentos atualizados: `DOCUMENTACAO_CHEFE_DA_MESA.md`, `NEMESIS_IMPLEMENTACAO.md`, `INVENTARIO_HABILIDADES_CHEFES.md` e `CHECKLIST_REGRESSOES_E_ATUALIZACOES.md` (regra permanente, seção 25).

Limites da validação: browser usa fixture local com renderer/handlers reais, não uma partida completa em dois clientes Firebase autenticados. Avaliação de balanceamento e desempenho de partida inteira continua sendo uma etapa de teste de jogo; não foi simulada por estes resultados.

#### Histórico do complemento — ajuda opcional do Lixo (decisão vigente)

Adicionado `?` pequeno junto ao contador, exclusivamente no modo Chefe. Reutiliza botão/popover/âncora oficiais; texto curto contém jogo existente/novo, Joker e as três situações do 2. Sem avisos novos na seleção, escolha ou confirmação; nenhum ajuste às mecânicas. Clique/toque não propagam para a compra, teclado funciona e a ajuda permanece acessível com compra bloqueada. Remover o modo remove também o controle e fecha sua ajuda.

Arquivos deste complemento: `app.js`, `styles/boss-mode.css`, `tests/nemesis-ui.browser.mjs` e os três documentos atualizados. A infraestrutura oficial de ajuda agora inicializa seus controles mesmo sem objetivo ativo. A fixture de browser passou a extrair o HUD externo completo (havia uma seção aninhada oculta que interrompia a extração) e usa o markup real do Lixo.

Validação do complemento: **819/819** na suíte ampla, sem falhas/skip/todo. Browser passou nos mesmos cinco viewports, com mouse/Enter/Escape, consulta com retirada bloqueada, saída do modo, ausência de duplicação e página adicional com toque real em 390×844. Captura mobile revisada. Sem commit/deploy/cache novo.

#### Histórico — correção do excesso de destaque nas cartas

Removidos os contornos/glows extras aplicados simultaneamente à pilha e à face do Lixo. Eles se acumulavam com a marca compartilhada da carta. Mantidos os detalhes e a espessura originais do overlay MARCADA/AGARRADA/CONTAMINADA; o pulso de aquisição agora varia apenas a opacidade, sem expandir o brilho. Nenhuma mudança de regras, seleção ou balanceamento.

Regressão visual compara borda, sombra e inset dos três estados e da face real do Lixo, além de exigir que os wrappers preservem suas sombras normais. Checklist atualizado para impedir camadas extras. Validação: 96/96 focados, 819/819 na suíte ampla (zero falhas/skip/todo), browser nos cinco viewports e toque; captura mobile revisada. Log: `.cache/nemesis-marking-full.tap`.


---

<a id="arquivo-revisao-objetivos-chefes"></a>

## Origem: REVISAO_OBJETIVOS_CHEFES.md

### Revisão de objetivos dos chefes — 05/10/2026

Fonte: workspace local atual. Sem Google Drive, publicação, alteração de HP, fases, frequência, pesos ou valores de falha.

#### Regra permanente

Sucesso de objetivo não reduz a condição especial. Evita sua punição. Canastras mantêm todo o alívio aprovado. Gastos do próprio chefe por vantagem permanecem.

#### Correções funcionais

| Chefe / habilidade | Alívio removido | Falha mantida |
| --- | --- | --- |
| Dimitrescu — Caçada de Bela | -3 Sede por sucesso | +14 / +16 |
| Dimitrescu — Marca Carmesim | -2 Sede por marca cumprida | +7 / +9 por marca falhada |
| Dimitrescu — Banquete de Cassandra | -4 Sede por sucesso | +16 / +18 |
| Dimitrescu — Enxame de Daniela | -3 Sede por evitar o Lixo | +12 / +15 na retirada, sem cobrança duplicada na resolução |
| Dimitrescu — Coágulo Carmesim | -6 Sede ao romper por dano | Sobreviver à rodada cura metade da proteção restante |
| Dimitrescu — As Três Filhas | -2 Sede por objetivo cumprido | +8 por objetivo falhado |

Auditoria do Banqueiro já usava sucesso +0, mas agora ignora `successDelta` negativo em snapshots antigos. O evento registra sucesso explicitamente; o HUD não exige mais delta negativo para mostrar “Objetivo concluído”, mantendo compatibilidade com eventos antigos. Não houve mudança de falha.

Auditoria global ampliada em 05/10/2026: Favorita também não pode recuperar Dominação, mesmo sendo uma escolha automática. Removido −2 da protegida na F2; F2/F3 agora são 0/+8, preservando o alvo menos dominado. Nenhuma outra habilidade ativa mostrou alívio fora das canastras e dos gastos internos aprovados. Preservados: Vinho Carmesim (consumo de Sede para cura), Renascimento (consumo de Flor), custos positivos de escolha/obediência e purificação do Morto por canastra.

**Regra permanente:** Cumprir uma habilidade nunca reduz a condição especial de vitória do chefe. O sucesso apenas evita a punição. A recuperação concedida aos jogadores ocorre somente através das canastras aprovadas. Sucesso parcial evita apenas a punição correspondente, sem recuperar recurso. Gastos internos explicitamente aprovados do próprio chefe não são recompensas ao jogador.

BOT e Laboratório usam as resoluções reais; não existia expectativa numérica negativa específica a substituir nos cenários. Definições, mensagens compactas, ajuda e feedback de rompimento do Coágulo foram corrigidos.

#### Nemesis visual

Cards em faixa própria abaixo do HUD, reutilizando arte full-bleed, chip e ajuda oficiais. INVADINDO indica entrada; ATIVO indica persistência. MUTADO, REFORÇADO e CADÁVER continuam compactos. A ajuda das passivas e das habilidades afetadas foi enxugada sem remover prazos, regras ou punições. Lifecycle e mecânicas preservados.

#### Validação

- Regressões novas: **30/30** passaram, cobrindo os seis chefes, sucessos parciais, reload, Coágulo e exceções preservadas.
- Chefes / alívio / HUD / ajuda / apresentação / mecânicas / arquitetura: **193/193** passaram.
- Browser real do Nemesis: **1920×1080, 1024×768, 844×390, 390×844 e 3840×2160** passaram, incluindo altura independente do HUD e chips/arte/ajuda contidos. Fixture local, sem sessão Firebase autenticada.
- Suíte ampla: **561 testes, 510 passaram, 51 falharam**. Comparação dos nomes das falhas com `.cache/nemesis-lifecycle-wide.log` (528 testes, 477 passaram, 51 falharam): nenhuma falha adicional. A baseline iniciada nesta rodada também mostrou falhas antigas antes de ficar presa.
- O teste antigo `boss-debug-scenarios.test.mjs` já travava na baseline; foi interrompido antes das alterações. Suíte ampla executada separadamente sem esse arquivo, mantendo a limitação explícita. Não se declara suíte inteira verde.
- `git status` / `git diff` conferidos antes e depois; mudanças anteriores preservadas. Sem stage, commit, deploy, cache bump ou Drive.


---

<a id="arquivo-rework-dimitrescu-2026-10-07"></a>

## Origem: REWORK_DIMITRESCU_2026-10-07.md

### Rework experimental — Lady Dimitrescu — 07/10/2026

Fonte: briefs principal/adendo do usuário e implementação local. Não há win rate medido desta versão; 65–75% (alvo ~70%) é apenas a meta de calibração.

#### Contrato de combate

Atualização de balanceamento — 08/10/2026: filhas 450 HP, regeneração 50 por rodada e 25 com Anticoagulante. Permanecem 500 PROT. sustentados por filha, piso de 200 HP, redução de máximo de 100 por item e passivas +3 Sede. Lady, Sede e Fúria não mudaram neste passe.

Durabilidade nominal, sem cura, itens, excesso de dano ou Fúria: matar as três filhas e depois Lady custa 1350 + 2000 = 3350 de dano, contra 3500 pela rota direta da proteção. Vantagem de 150 (4,3% do total direto), antes inexistente. HP conjunto das filhas cai 10%; regeneração cai 16,7% (máximo conjunto de 180 para 150 por rodada com três vivas e feridas). Uma regeneração de 50 por filha já consome sua vantagem nominal; cura/Sede da Fúria continuam sendo custos da rota. É uma estimativa de durabilidade, não win rate medido nem garantia de que essa rota seja sempre melhor.

Migração de saves do rework: `castleDaughterBalanceVersion: 2` aplica uma vez a redução de 50 ao máximo anterior, respeitando piso 200 e perdas por itens. HP restante só é limitado ao novo máximo, sem cura ou ressurreição. Regen antiga 60/30 passa a 50/25. Itens, anexos, Frio/Relíquia, Sede e proteção consumida são preservados; reload/snapshot/undo não repetem a redução.

- Lady 2000 HP; Bela/Cassandra/Daniela permanentes 450/450, sem revive. Valores em `js/boss/dimitrescu-castle.js` (`CASTLE_BALANCE`). Não existe resistência percentual nem bônus de HP por filha.
- Vínculo consumível: Lady começa com 2000 HP e 1500 PROT. adicionais. Cada filha viva sustenta capacidade de 500 PROT. Dano à Lady passa por Coágulo → PROT. → vida, com excedente, inclusive Ataque Final de 100. Morte de filha retira até 500 da proteção restante, sem dano automático à vida. Proteção esgotada não volta com cura/regen/rodada: a vida fica exposta mesmo com filhas vivas.
- Alvo por jogador: Lady ou filha viva; uma fonte, um alvo, sem overflow. Seleção inválida após morte volta para Lady. Passivas/regen das filhas são independentes do lifecycle de invasão/reanimação do Nemesis.
- Fim de rodada: resolver obrigações/Sede, converter Coágulo quando aplicável, regenerar filhas vivas, avançar rodada. Regen própria até 50; não cura Lady. Frio bloqueia uma regen; Anticoagulante fixa 25 permanentemente, sem stack.
- Bela: marca carta legal no começo da rodada, prazo fim do turno do alvo; falha +3. Cassandra: jogo com contribuição concreta, prazo fim da rodada; falha +3. Sem candidato legal não há obrigação/punição. Os validadores consideram descarte e Morto/batida. Daniela: primeira retirada efetiva do Lixo pela equipe +3, uma vez por rodada, protegida ou completa. Sem compra não pune.
- Cadência atual: exatamente uma filha viva é escolhida por rodada normal com o RNG canônico. Evita a última escolha normal quando há outra viva; com uma viva, sempre ela. `castleSelectedDaughterIds`/`castleLastDaughterId` e os objetivos persistem no snapshot/undo, sem sorteio no render. Entidades continuam apenas `alive`/`dead`; as outras permanecem atacáveis, regeneram, protegem a Lady e aceitam itens. Sem candidata legal, a filha escolhida não inventa objetivo.
- Sucesso apenas evita punição. Canastras continuam Limpa -4, Real -8, Ás-a-Ás -12, descontando a diferença entre tiers. Gastos internos do Vinho continuam permitidos.

#### Troca de poder e Fúria

Saíram de pools/introduções/catálogo: `bela_hunt`, `cassandra_feast`, `daniela_swarm`. A versão antiga de `three_daughters` (+8 por objetivo) também foi aposentada; snapshots com esse payload são cancelados sem punição. Banquete dos Mortos (`cassandra_dead_feast`) é da Lady e funciona mesmo com Cassandra morta. Demais pesos-base/números-base e regras dos outros chefes foram preservados.

Passe de cadência de 07/10: `three_daughters` versão 2 retorna nas F2/F3, peso 3: substitui a escolha única por todas as filhas vivas, usando as passivas padrão +3 e seus próprios prazos; sem quarta passiva, duplicação ou cobrança adicional no fim. `impure_blood` (Sangue Impuro), F1/F2/F3, peso 3: primeiro Joker/2 usado como coringa por cada cooperador +3, máximo +6 por rodada inclusive com Fúria; 2 natural não ativa. Consulta sequência e flags canônicas da contribuição real, não posição visual. IDs de jogadores já acionados persistem no payload; não há cobrança extra na resolução. Introduções F2/F3 incluem ambas para ampliar variedade.

Modelo de projeto: 45% pressão especial, 25% durabilidade/cura/barreira/auxiliares, 20% controle/produtividade, 10% burst/snowball. A cadência reduz principalmente a pressão especial. A estimativa histórica ~75% antecede o rework e mudanças globais; não é telemetria nem percentual atual. Não foi localizado harness probabilístico da Dimitrescu; os testes de balanceamento do workspace são regressões de regras, não simulador de win rate. HP, Vínculo, itens, regeneração e Fúria não foram nerfados neste passe; calibração depende de playtest.

0/1/2/3 mortes = NORMAL/FÚRIA I/FÚRIA II/FÚRIA FINAL. Cura da Lady ×1/1,10/1,20/1,30, arredondada para baixo e limitada ao HP máximo; inclui Vinho, Banquete e Coágulo. Sede ofensiva própria +0/2/4/6 **por evento positivo**, não por marca/faixa individual dentro da mesma resolução. Não aumenta +3 das filhas, Sangue Impuro (máximo +6), regen, custo do Vinho ou HP máximo. Fotos/áudios de fase são independentes da Fúria.

##### Revisão de Sede — 07/10/2026

Tributo por jogador: 0–7 cartas não cobra; 8–10 cobra +3/+4/+6 nas F1/F2/F3; 11+ cobra +6/+8/+10. Marca Carmesim: +5/+7/+9 por marca que falhar. Banquete dos Mortos: +10/+14 nas F2/F3, mantendo cura 90/130 e purificação base +4 sem cura. Fúria acrescenta +2 por filha morta ao evento positivo da Lady, uma única vez por resolução. Passivas +3, Sangue Impuro +3 por jogador/máximo +6, barra 100, HP, Vínculo, regeneração, itens e cura da Fúria não mudaram. Os passes anteriores que preservaram os números-base são históricos, anteriores a esta revisão.

#### Associação física dos itens

- 108 cartas físicas, sem criar cartas extras; exatamente 15 IDs distintos, 3 de cada tipo. Todas as cartas são candidatas, incluindo Jokers e ambos os baralhos.
- Associação determinística pela seed, uma vez antes de embaralhar/distribuir. Não favorece posição/mão/Morto/Lixo; não garante item inicial nem rerrola resultados ruins.
- `boss.castleItems[cardId] = { type, consumed }` é a fonte persistente; `card.castleItem` acompanha a face real. Normalizar apenas reidrata metadata, sem sorteio/consumo.
- Associação acompanha Monte, mão, Morto, Lixo, jogo, reload/reconexão e undo. Itens consumidos nunca voltam utilizáveis ao retornar ao Lixo.
- Laboratório distribui 15 itens nos mesmos 108 IDs do cenário, uma vez, sem fabricar mãos favorecidas.

#### Sacrifício

Somente carta da própria mão após compra, no turno autorizado e com filha viva. Não é meld/descarte, não fecha turno nem autoriza batida. Preserva uma carta de descarte legal, topo obrigatório do Lixo e gates de ação existentes. A carta real sai da mão e fica anexada à filha.

Todo item reduz máximo em 100, piso 200, e limita HP atual. Depois executa o especial, mesmo no piso:

| Tipo | Especial |
|---|---|
| Adaga | 50 de dano |
| Frasco de Frio | Bloqueia exatamente a próxima regen |
| Anticoagulante | Regen 50→25 permanente; não acumula |
| Explosivo | 100 de dano |
| Relíquia | Suprime uma janela da passiva da filha: atual se pendente, próxima se já resolvida |

Morte cancela obrigação/regen, impede alvo/item e devolve cartas reais ao **fundo** do Lixo sem mexer no topo. Marca `deathRecorded`, atualiza Vínculo/Fúria e emite evento individual. Rerender/reload não repete morte, devolução ou áudio.

#### Apresentação e áudio

- `ITEM_DEFINITIONS` centraliza labels/paths dos cinco PNGs reais em `assets/images/items/`: `adaga.png`, `frasco-frio.png`, `anticoagulante.png`, `explosivo.png`, `reliquia.png`. Artes do usuário copiadas com transparência preservada; nenhuma substituição por emoji.
- Face original mantida; overlay central 46%/máximo 40% nas demais zonas; na mão ampliado a 64%/máximo 55%, com contraste escuro, sem cobrir cantos. O PNG é a área clicável/focável da ação de item, com aria-label e popover; sem botão textual grande. Marca de Bela fica na borda/glow e identificador periférico, nunca no centro do item. `object-fit: contain`, PNG com `pointer-events: none`; faces ocultas continuam ocultas.
- Miniaturas reais anexadas em fan compacto. Faixa “ITENS DO CASTELO” entre Sede e Próxima Fase, cinco artes clicáveis e `i`, usando popover oficial por mouse/toque/teclado, Escape/clique fora e viewport.
- Filhas em três colunas alinhadas. Arte integral, HP/passivas sobrepostos, cartas sacrificadas laterais sem painel de fundo. Barra na escala visual de 450: verde/amarelo/vermelho e fundo escuro como os zumbis do Nemesis; área cinza petrificada destaca o máximo perdido por itens, sem hachura. Texto vida/450; chip ↓ MÁX e ajuda informam o máximo recuperável real. Não altera HP, dano ou regeneração.
- Uma única barra da Lady: vida vermelha à esquerda e proteção dourada anexada à direita, sem sobreposição. Total soma HP atual + PROT. restante (3500/3500 inicialmente); máximo visual = 2000 + capacidade das filhas vivas. Segmento PROT. mostra o restante e preenchimento consumível, mantendo espaço escuro para o que foi gasto. `i` explica ordem de absorção, excedente e perda na morte da filha. Não existe mais piso de HP da Lady.
- Fúria clicável (+10% cura e +2 Sede ofensiva própria por morte). Ícones do castelo maiores, distribuídos pela largura sem aumentar a altura padrão do HUD, sem molduras, com disponíveis/total (3/3). Ajuda mostra usados/anexados; disponíveis significa não usados em qualquer zona, sem revelar localização oculta. Contraste e tamanho ampliados nos itens da mão, preservando rank/naipe.
- Sem chip permanente REGEN +50: regeneração permanece na ajuda da filha. Cada filha viva tem um único chip de identidade consultável à direita: CAÇADA, BANQUETE ou LIXO +3. Neutro quando não age; destacado quando selecionada, com carta/jogo concreto no mesmo chip (CAÇADA · 8♥ / BANQUETE · JOGO 2). As Três Filhas destaca os três, sem chips extras de falha. Consequência e resultado ficam no help completo do próprio chip, não em CUMPRIDA/APLICADO permanentes. Mesmas classes, dimensões e popover do Nemesis; sem ATIVA/AGUARDANDO/INATIVA. Debuffs Frio/Anticoagulante/Relíquia/↓ MÁX continuam separados. Relíquia pendente espera a próxima oportunidade de passiva, não expira em rodada não selecionada. Esta revisão de chips é exclusivamente de UX, sem alterar cadência ou números.
- Alvo selecionado pelo retrato da Lady ou das filhas, borda/aria-pressed e teclado como Nemesis. Removido o botão separado abaixo das filhas. Ajuda/Fúria/itens não mudam alvo. Monte/Lixo não se deslocam ao trocar alvo.
- Cada morte individual toca o arquivo fornecido `assets/sfx/what-have-you-done-to-my-daughter.mp3` e flash na Lady; inicialização/reload não toca eventos históricos. Reprodução respeita desbloqueio de áudio do navegador. Reduced motion remove o flash/voo; não remove informações.
- Novos módulos/artes/áudio precacheados; cache do service worker atualizado sem reduzir versão anterior.

#### BOT

Mesmo pipeline de dano e guard de sacrifício do humano. Respeita alvo explicitamente selecionado; sem seleção, prioriza Lady exposta ou golpe letal na filha, caso contrário consome PROT. com ataques diretos. Preserva Jokers/2, cartas em grupos óbvios por naipe e marcas obrigatórias; usa cartas isoladas com item, evitando Frio/Anticoagulante/Relíquia redundantes. Heurística mínima, não otimizador perfeito nem simulação de win rate.

##### Persistência do Vínculo consumível — 07/10/2026

`boss.bloodLinkProtection` guarda a proteção restante, limitada a `500 × filhas vivas`. Saves anteriores sem esse campo recebem uma vez a capacidade das filhas vivas, sem mudar HP, itens ou Sede. Zero é preservado; normalizar/renderizar não recarrega. Snapshot/undo transportam proteção junto às filhas. Morte retira 500 restantes (mínimo zero), uma vez por filha, e limita ao novo teto. Esta revisão substitui o piso descrito nos registros históricos anteriores; não altera Sede, Fúria, cura, HP das filhas, regen ou itens.

#### Compatibilidade

Snapshots com `bela_hunt`, `cassandra_feast`, `daniela_swarm` ou payload antigo de `three_daughters` são cancelados sem punição retroativa. A nova `three_daughters` com `passiveVersion: 2` permanece válida. Saves pré-rework recebem filhas e clamp do máximo da Lady, mas **não sorteiam 15 itens retroativamente** em reload, para não inventar uma distribuição após o deal. Para testar o contrato completo, começar uma partida/scenário novo. Saves versão 1 preservam consumo, anexos, estados e RNG sem reaplicação; undo restaura todos juntos.

#### Regressões e validação

##### Passe de UX dos chips — 07/10/2026

Um chip principal por filha viva, com identidade persistente e neutra fora da ação; contexto e destaque no mesmo chip quando age. Debuffs continuam separados, consequência/resultado no help, sem chips de log. Renderer e CSS da Dimitrescu somente; nenhum motor, BOT ou número alterado neste passe. Testes atualizados: `dimitrescu-castle.test.mjs`, `dimitrescu-cadence.test.mjs`, `dimitrescu-castle.browser.mjs`. Resultado: 129/129 focados e 998/998 ampla, sem falhas, skip ou todo; browser Dimitrescu 1920/1376/390 e Nemesis em cinco viewports. Mouse/toque/Enter, help completo sem mutação de estado/target, geometria compartilhada, neutro/destacado, resultados sem chips extras e debuffs preservados. Screenshots locais inspecionadas; fixture com módulos/CSS reais, não partida Firebase. `git diff --check` limpo; sem commit/push.

Fundo da mesa: `dimitrescu` selecionável nos menus normal/debug e padrão da Lady, com `assets/resident/dimitrescu-table.webp` (1774×887, cerca de 459 KB). `resident` continua compatível com saves e associado ao Nemesis, agora rotulado Resident Evil 3 — R.P.D. Baralho e sons Resident Evil preservados; cache v284 inclui a nova arte. Regressões em `dimitrescu-table-theme.test.mjs`, `resident-theme.browser.mjs` e `table-background.browser.mjs`.

`tests/dimitrescu-cadence.test.mjs`: escolha única determinística, não repetição, mortas excluídas, snapshot/undo, Relíquia na próxima oportunidade real, As Três Filhas sem duplicação, Sangue Impuro canônico por jogador e teto +6, inclusive com Fúria. Regressões compartilhadas em `boss-mechanics-isolation.test.mjs` e `boss-objective-resource-rule.test.mjs`.

`tests/dimitrescu-castle.test.mjs`: pisos, dano/Coágulo/final, associação física/seed/Joker, snapshot/undo, sacrifício/descarte, efeitos e duração, morte/retorno, passivas/prazos/candidatos, Fúria, Banquete com Cassandra morta, BOT, migração, Laboratório e áudio três vezes sem replay.

`tests/dimitrescu-castle.browser.mjs`: DOM/estilos oficiais e módulos reais, desktop 1920, tablet 1376, celular 390; PNGs, overlay proporcional, conteúdo não recortado, ajuda/Escape/viewport, seleção de filha e consumo de carta, reduced motion e ausência de erros JavaScript. Fixture local, não sessão Firebase real.

Risco restante: 2000 + três filhas/regen + distribuição aleatória + Fúria exige playtest/telemetria. Não afirmar vitória ~70% como resultado. Nenhum asset pendente.

##### Resultado local

Passe atual de cadência/targeting: **798/798 focados**, mais **48/48 focados** após o fundo do castelo; execução ampla final **995/995**, zero falhas, skip ou todo. Browser Dimitrescu em 1920/1376/390: retrato da Lady selecionável, sem botão separado, chips reais, itens/ajuda por mouse/toque/teclado, viewport e reduced motion. Browser Nemesis passou em cinco viewports. Fundos: quatro temas em cinco viewports; CSS/decodificação reais do Castelo e Resident em desktop/tablet, sem alterar dimensões das cartas. Fixtures com módulos/CSS reais; Firebase e win rate não medidos. `git diff --check` limpo; sem commit/push.

Resultados abaixo são históricos das etapas anteriores deste rework, não a execução atual:

- Baseline fresco: 954 testes, 953 passavam; falha preexistente do parser de URLs CSS ao encontrar `url()` dentro de SVG inline. Corrigido o harness, sem remover o SVG/efeito do usuário.
- Rework: 26 regressões novas; focados chefes/integração 714/714; ampla final 972/972, zero falhas, skip ou todo. Contagem ampla também reflete retirada de casos parametrizados das quatro habilidades removidas do catálogo.
- Browser: 1920/1376/390, mouse/toque/Enter, Escape/clique fora, viewport, faces/PNGs, sacrifício e anexos, três estados de HP, filhas mortas/Fúria final e reduced motion. 13 JavaScripts de produção com sintaxe válida; `git diff --check` limpo.
- Sem commit/push. Alteração manual prévia em `tests/nemesis-progress-meters.test.mjs` preservada. Firebase real e win rate não validados.

##### Arquivos deste patch

Histórico da correção de interação anterior ao passe de cadência: regeneração e passivas foram reunidas em chips consultáveis no canto superior direito (66/66 focados). O chip REGEN foi depois removido pelo novo brief; a regeneração está na ajuda. Retarget não ativa a marcação legada de Enxame de Daniela; ausência de Pólen não alterna sua classe. Mantida a descrição acessível da passiva de Daniela no Lixo. Browser 1920/1376/390 verifica cliques repetidos sem deslocar Monte/Lixo/mão e ajuda sem troca de alvo.

Histórico da primeira correção visual de 07/10: alinhamento em terços, suporte lateral e debuffs consultáveis (715/715 focados; 973/973 ampla). A régua separada do Vínculo e faixa faltante das filhas dessa iteração foram substituídas pela apresentação acima a pedido do usuário. Nenhuma dessas correções altera motor, BOT ou balanceamento. Fixture usa CSS/renderer/popover reais; não substitui playtest Firebase.

Validação da apresentação final: 716/716 focados e 974/974 ampla, sem skip/todo. Navegador em 1920/1376/390: vida/proteção na mesma barra, nenhuma sobreposição com 3/2/1 filhas, inventário após uso, Fúria/debuffs por toque/teclado, viewport e reduced motion. `git diff --check` limpo; sem commit/push.

Refinamento visual posterior no mesmo dia: itens ampliados horizontalmente com altura do HUD comparada à versão anterior (inalterada); mão 64%/55%; barra das filhas na escala original 500 com petrificação de máximo por itens e paleta/fundo Nemesis; removido painel atrás dos sacrifícios. Browser 1920/1376/390 passou, incluindo três estados de vida e faixa petrificada de 20% após item; suíte ampla 974/974. Mecânica de máximo recuperável continua intacta.

- Integração: `app.js`, `bot.js`, `js/audio.js`, `service-worker.js`, `js/game/card-face.js`.
- Motor: `js/boss/boss-engine.js`, `js/boss/boss-debug-scenarios.js`, `js/boss/bosses/dimitrescu.js`, `js/boss/mechanics/dimitrescu.js`; novo `js/boss/dimitrescu-castle.js`.
- UI: `js/boss/presentation/dimitrescu.js`, `js/boss/ui/dimitrescu-ui.js`; novo `js/boss/ui/dimitrescu-castle-view.js`; `styles/boss/dimitrescu.css`, `styles/cards.css`.
- Testes atualizados: `boss-debug-scenarios.test.mjs`, `boss-hud-copy-v1.test.mjs`, `boss-isolation-architecture.test.mjs`, `boss-mechanics-isolation.test.mjs`, `boss-october-package.test.mjs`, todos em `tests/`. Novos: `dimitrescu-castle.test.mjs`, `dimitrescu-castle.browser.mjs`. Teste manual do Nemesis não foi editado pelo rework.
- Docs: este contrato, `INVENTARIO_HABILIDADES_CHEFES.md`, `DOCUMENTACAO_CHEFE_DA_MESA.md`, `CHECKLIST_REGRESSOES_E_ATUALIZACOES.md`, todos em `docs/`.
- Assets novos: cinco PNGs em `assets/images/items/` listados acima e `assets/sfx/what-have-you-done-to-my-daughter.mp3`.

##### Polimento das ajudas e inventário — 07/10/2026

As ajudas da Lady, habilidades, filhas, Vínculo, Fúria e itens priorizam ação, efeito e prazo em blocos curtos. A carta anexada mantém sua imagem e explica o efeito especial + petrificação de 100 HP; a devolução ao fundo do Lixo fica em uma nota breve. Não repetir avisos de item já usado. A mesma descrição de item atende à mão, ao inventário e à carta anexada.

Contadores disponíveis/total ficam ao lado dos ícones. Imagens limitadas ao espaço do inventário, sem escala que invada a moldura PNG da Sede; altura do HUD preservada. Chips e seleção/cadência das passivas não mudaram.

Validação deste polimento: 56/56 focados; 1000/1000 ampla, sem skip/todo; navegador 1920/1376/390 com mouse/toque/teclado, Escape/clique fora, viewport e reduced motion. Geometria confirma contador lateral e separação da moldura real da Sede. Nenhuma mecânica, número, balanceamento ou BOT alterado; sem commit/push.

##### Ganhos de Sede por origem e laboratório — 07/10/2026

A Sede causada por Bela/Cassandra/Daniela tem um traço vermelho do retrato à barra; a chegada atualiza o preenchimento e mostra seu número. Ganhos da Lady e das filhas são apresentados um por vez. Trata-se apenas da apresentação: a resolução continua imediata, com os mesmos valores. Eventos registram origem e valor aplicado; render/reload não reproduzem histórico. Undo cancela a fila. Reduced motion mantém número breve, sem voo/pulso.

DevTools → Laboratório → Auxiliares permite selecionar uma filha e ajustar vida/restaurar/derrotar, sem depender da habilidade preparada. Derrota devolve anexos ao fundo do Lixo pelo helper real; restauração manual é exclusiva do laboratório, não uma nova regra de combate. Item/piso de HP, Vínculo, Fúria e seleção de passivas do jogo normal não mudaram.


---

<a id="arquivo-rework-itens-dimitrescu-2026-10-08"></a>

## Origem: REWORK_ITENS_DIMITRESCU_2026-10-08.md

### Itens v2 da Lady Dimitrescu — 08/10/2026

**Estado atual de 10/10/2026:** Explosivo100+15 permanente, Relíquia+20% de ataque direto até morrer, Frasco global por duas oportunidades de turno. Regen20/10 e Adaga80% preservados. Contrato vigente: [lote final de itens](#arquivo-lote-final-itens-dimitrescu-2026-10-10). As tabelas e medições abaixo permanecem históricas, não foram recalculadas.

#### Atualização anterior — pacote B, antes do lote final de itens

No pacote B anterior, foram aplicados regen20/Anti10, Adaga80%, Explosivo100+20 permanente e Frasco de duas cargas. O lote final substituiu somente hemorragia para15 e os efeitos de Frasco/Relíquia. Não reutilizar números ou descrição antigos como regra atual.

Saves v2 anteriores são atualizados uma vez, preservando ferimentos, consumo, anexos, proteção e guardas de eventos. Sangramento expirado não retorna; saves v1 mantêm o contrato legado. Contrato vigente: seção7 da `DOCUMENTACAO_CHEFE_DA_MESA.md` e `ETAPA_2_DIMITRESCU_2026-10-10.md`.

**As seções abaixo são o registro histórico do experimento de 08/10**, não os números atuais. Suas tabelas/resultados não foram recalculados nem apresentados como win rate humano. A aprovação de implementação do pacote B não comprova que a dificuldade final já esteja calibrada.

#### Resultado e limite da calibração

Implementado no workspace local, preservando as alterações anteriores de Nemesis/Matriarca e da apresentação das filhas. Suíte inicial nova: **1112/1112**. Suíte final: **1163/1163**, zero falhas, cancelados, skips e todos. Sem commit, push ou deploy.

**A meta de 70% de vitória da Lady contra uma dupla competente NÃO está validada.** O experimento reproduzível abaixo exercita batalhas inteiras pelo motor, mas sua política gulosa não é uma dupla competente. Não há win rate humano atual, inicial ou final. Nenhum percentual histórico foi reutilizado. Os valores propostos ficaram como configuração experimental conservadora, não como ótimo estatístico nem balanceamento concluído.

#### 1. Contrato anterior e configuração final experimental

| Parâmetro | Anterior, itens v1 | Partidas novas, itens v2 |
|---|---|---|
| Lady | 2000 HP | 2000 HP, inalterado |
| Vínculo de Sangue | 1500 PROT. consumível, 500/filha | Inalterado; Coágulo → PROT. → HP |
| Filha, HP inicial | 450 | 500 |
| Regeneração / Anticoagulante | 50 / 25 | 50 / 25, inalterado |
| Piso do máximo recuperável | 200 | 300 |
| Adaga | Máximo −100; impacto 50 | Máximo −5% do original = 25; vínculo permanente de 30%, sem impacto |
| Explosivo | Máximo −100; impacto 100 | Máximo −10% = 50; impacto 60; hemorragia 10% = 50 por 2 fechamentos |
| Frasco Congelante (`cold_flask`) | Máximo −100; bloqueio consumido no próximo fechamento | Máximo −20% = 100; bloqueia a próxima cura efetiva, guarda carga em vida cheia, teto 2 |
| Anticoagulante | Máximo −100; regen 25 permanente | Máximo −15% = 75; regen 25 permanente, sem stack |
| Relíquia | Máximo −100; suprimia a janela selecionada, inclusive sem candidato | Máximo −20% = 100; suprime uma oportunidade válida, atual pendente ou próxima |

Perdas de máximo são **aditivas sobre os 500 HP originais**, não percentuais compostos do máximo reduzido. O HP atual só é limitado ao novo máximo quando necessário: uma filha já abaixo dele não sofre outro dano pela petrificação. O piso limita o máximo recuperável, não a vida atual: a filha pode ser ferida abaixo de 300 e morrer normalmente.

Lady, capacidade/consumo de PROT., Coágulo, Sede, Fúria, passivas ofensivas +3, seleção/cadência, pesos, regeneração e distribuição dos 15 itens não foram rebalanceados neste patch. Não há ressurreição de filhas nem nova exigência de matar duas.

##### Justificativa dos percentuais e duplicatas

- **Adaga 5%:** perda menor porque acrescenta uma fonte permanente de dano ao HP real da Lady. 30% é o ponto intermediário entre 25% e 35%, não uma taxa escolhida para fabricar 70%.
- **Explosivo 10%:** acrescenta impacto e desgaste; perda menor evita juntar petrificação máxima, burst e dois ticks no mesmo item.
- **Frio/Relíquia 20%:** ferramentas de janela/controle, sem dano direto próprio. Ganham petrificação maior para permanecer escolhas diferentes e úteis.
- **Anticoagulante 15%:** efeito permanente de regen inferior recebe uma perda intermediária; cada duplicata mantém sua perda própria, mas nunca reduz regen abaixo de 25.
- **Adagas repetidas:** mantêm um único vínculo de 30%, sem multiplicar percentual, impactos ou criar outro canal. Cada cópia petrifica mais 25 até o piso. Como o vínculo já é permanente, não foi inventada uma capacidade finita adicional. Uma primeira Adaga ainda ativa o vínculo no piso; outra em uma filha já vinculada e no piso é redundante e o BOT a evita.
- **Explosivos repetidos:** cada cópia mantém o impacto próprio de 60 e renova os dois fechamentos; não soma amplitudes nem ticks. Mesmo no piso continua causando impacto/hemorragia.
- **Frio:** no máximo duas curas efetivas bloqueadas de cada vez; uma terceira aplicação não cria uma terceira carga. O bloqueio não se perde em vida cheia.
- **Relíquias:** não empilham uma fila ilimitada de supressões. Nova aplicação após o efeito anterior ser consumido pode preparar outra oportunidade; pendente/sem candidato/não selecionada não gasta a reserva.

#### 2. Dano, ordenação e persistência

Adaga transmite `floor(dano efetivamente sofrido × 0,30)`, limitado à vida restante da Lady. Ataques humanos, BOT, cartas/canastras e Ataque Final usam a mesma resolução. Overkill não aumenta transmissão. A transmissão subtrai o **HP real** da Lady, ignorando PROT. e Coágulo sem gastá-los; pode encerrar a batalha com ambos intactos. Itens, hemorragia e outras fontes não acionam o vínculo nem geram ciclos.

Fechamento: obrigações/Sede existentes → hemorragia → morte canônica, se letal → regeneração das sobreviventes. Frio bloqueia somente cura que recuperaria HP. Hemorragia é limitada à vida restante, não transmite Adaga, gera Fúria/morte/remoção de até 500 PROT. restantes normalmente. A cura da Lady por Fúria e seus números de Sede permanecem os atuais.

`castleItemRulesVersion: 2` e configuração são salvos na criação; `castleDaughterBalanceVersion: 3` identifica as novas filhas. Original de HP, anexos/consumo, cargas de Frio, vínculo, hemorragia/rodadas/último tick e IDs de ataque persistem. Guards por rodada e evento impedem duplicação. Undo restaura a versão inteira, não reaplica efeitos.

**Compatibilidade:** save sem versão de itens continua v1: filhas 450, piso 200, perdas uniformes 100, Adaga 50 e Explosivo 100 imediatos, efeitos históricos. Itens já consumidos não ganham vínculo ou hemorragia retroativos. A migração anterior 500/60 → 450/50 permanece só no caminho legado, idempotente e sem curar. Saves pré-castelo não recebem associação nova de itens. A ajuda usa a versão da partida, não os defaults de uma partida nova.

#### 3. Experimento de batalha reproduzível

Arquivo: `scripts/dimitrescu-item-experiment.mjs`. Executado:

```bash
node scripts/dimitrescu-item-experiment.mjs 2000 60 40
```

Saída local: `.cache/dimit-items-experiment.jsonl`. Seeds **2000–2059**, 60 por política/versão: 8 × 2 × 60 = **960 batalhas**. Sensibilidades nas mesmas seeds **2000–2039**, 40 por candidato: 14 × 40 = **560 batalhas**. Total **1520 execuções de batalha**, com seeds reutilizadas deliberadamente para comparação; não são 1520 amostras independentes de humanos. Coortes são subconjuntos das 60 híbridas, não partidas adicionais.

Inclui deck físico de 108 IDs, distribuição 3/tipo antes do embaralhamento, duas mãos/Monte/Lixo/dois Mortos, cotação canônica do Lixo escolhido, validação de sequência, sacrifício de carta real antes de planejar, dano incremental/canastras/alívio, fases e seleção oficial das habilidades, PROT./Coágulo, filhas/regen/itens/Fúria/Sede/cura e condições finais. Confere conservação das 108 cartas, inclusive anexos e devoluções. Limite de 180 turnos é inconclusivo, não vitória; não ocorreu no lote.

**Limitações:** busca gulosa até 128 planos, pontuação local, sem look-ahead de canastra ou coordenação de longo prazo, compras/descarte e Morto/batida aproximados. Não executa todo o worker/dispatcher do BOT nem duas pessoas competentes. As políticas de combo escolhem entre itens efetivamente encontrados; não garantem pares, não criam cartas nem dão itens grátis. Muitos finais prematuros e exaustão indicam que esta política é inadequada para estimar a dificuldade humana.

##### Estratégias antes/depois — todas 60 seeds por coluna

Nenhuma política encontrou vitória dos jogadores. **Todas perderam as 60 batalhas nas duas versões.** Portanto não existe aqui uma estratégia comprovadamente vencedora nem uma discriminação confiável da meta. A tabela mostra efeitos observados, não um ranking competitivo humano.

| Política | Rodadas v1 → v2 | Filhas mortas v1 → v2 (média) | HP final da Lady v1 → v2 (média) | Itens usados v2 (média) |
|---|---:|---:|---:|---:|
| Ignorar filhas / dano direto | 31,22 → 31,22 | 0 → 0 | 1979,08 → 1979,08 | 0 |
| Tentar matar uma | 29,42 → 29,05 | 0,95 → 0,78 | 1995,67 → 1967,33 | 3,65 |
| Tentar matar duas | 29,57 → 28,25 | 1,12 → 0,88 | 2000 → 1965,40 | 4,32 |
| Tentar matar três | 29,57 → 28,25 | 1,12 → 0,88 | 2000 → 1964,68 | 4,35 |
| Priorizar Adaga | 29,12 → 28,47 | 0,17 → 0,83 | 1995,75 → 1962,77 | 4,42 |
| Priorizar Explosivo + Anti | 29,02 → 28,72 | 0,17 → 0,83 | 1995,75 → 1964,43 | 4,42 |
| Frio + sangramento | 29,12 → 28,47 | 0,17 → 0,82 | 1995,75 → 1962,93 | 4,42 |
| Híbrida, decisão de item do BOT | 29,12 → 28,40 | 0,17 → 0,65 | 1995,75 → 1949,63 | 4,37 |

Na híbrida v1: 42 perdas por recursos / 18 por Ataque Final insuficiente. Na v2: 38 por recursos / 20 por final / 2 por Sede. Na rota duas filhas v2: 39/18/3, respectivamente. Maior dano transmitido pode ser curado posteriormente: não equivale à queda líquida do HP final.

**Taxa só desta política artificial:** 60/60 vitórias da Lady por estratégia, antes e depois; Wilson 95% **93,98%–100%**. Nas sensibilidades 40/40; **91,24%–100%**. Esses intervalos descrevem a amostra artificial, não cobrem o erro de modelo e **não estimam win rate contra dupla competente**. Não se deve juntar todas as políticas como observações independentes nem declarar Lady calibrada a 100%.

#### 4. Sensibilidade conjunta e configuração retida

Todas as linhas abaixo têm 40 seeds, 40 perdas da política e zero inconclusivas. Candidatos alteram apenas configuração de estados experimentais, não defaults de produção. HP final tem influência da cura/tempo/decisões, portanto não deve ser lido como monotonicidade direta de um parâmetro.

| Candidato | Rodadas médias | Filhas mortas | HP final Lady | Transmissão acumulada | Hemorragia acumulada |
|---|---:|---:|---:|---:|---:|
| Baseline 500 / piso300 / Adaga30% / 60+50×2 | 27,25 | 0,675 | 1947,05 | 115,40 | 68,88 |
| Filhas450 | 27,33 | 0,775 | 1946,98 | 109,48 | 63,63 |
| Piso250 | 27,33 | 0,675 | 1945,33 | 110,38 | 65,88 |
| Adaga25% | 27,23 | 0,675 | 1958,58 | 92,88 | 68,88 |
| Adaga35% | 27,25 | 0,675 | 1938,53 | 131,88 | 68,88 |
| Hemorragia8% / 40 | 27,40 | 0,650 | 1947,43 | 117,73 | 58,13 |
| Hemorragia12% / 60 | 27,25 | 0,675 | 1946,90 | 115,03 | 82,50 |
| Sangramento3 fechamentos | 27,20 | 0,700 | 1946,30 | 114,63 | 98,88 |
| Impacto40 | 27,25 | 0,675 | 1947,00 | 115,73 | 69,75 |
| Impacto80 | 27,23 | 0,650 | 1946,30 | 116,10 | 68,75 |
| Frio teto1 | 27,25 | 0,675 | 1947,05 | 115,40 | 68,88 |
| Perdas menores: 5/8/15/10/15% | 27,13 | 0,625 | 1941,38 | 115,70 | 66,63 |
| Perdas maiores: 10/15/25/20/25% | 27,50 | 0,725 | 1948,53 | 110,08 | 72,63 |
| Combo alto: impacto80 / 12% / 3 / piso250 | 27,40 | 0,775 | 1943,03 | 109,10 | 103,38 |

Ordem dos percentuais nas duas linhas de perdas: Adaga, Explosivo, Frio, Anti, Relíquia. Valores em HP são arredondados ao inteiro mais próximo; no candidato450, Adaga5% é 23, hemorragia10% é45. Em produção500, todos são inteiros exatos. Transmissão de ataque sempre arredonda para baixo.

##### Adaga25/30/35

Em 200 de dano efetivo, transmitem **50/60/70**, respectivamente; overkill e dano de item/hemorragia transmitem zero extra. O lote teve transmissão média **92,88/115,40/131,88**, mas não separou vitórias. Retidos **30%** como meio-termo da proposta, sem somar por duplicata. Permanece útil sem PROT.; atacar uma filha vinculada pode ferir Lady mesmo com Coágulo inteiro.

##### Hemorragia8/10/12 e combos reais

Ticks são **40/50/60**. Contra regen50, o saldo de um fechamento é +10/0/−10 HP; contra Anti25, é −15/−25/−35. Frio cria um fechamento sem cura. Isso evita que Explosivo sozinho invalide regeneração e torna as combinações importantes.

Probes determinísticos `castleComboProbe()` usam itens reais relocalizados **somente no cenário controlado**, não nas batalhas aleatórias. Nenhum ataque, duas rodadas, filha inicialmente500; ordem explícita porque o clamp do máximo pode mudar o resultado:

| Ordem de uso | HP após 2 fechamentos, 8% | 10% | 12% |
|---|---:|---:|---:|
| Explosivo | 410 | 390 | 370 |
| Anti → Explosivo | 285 | 265 | 245 |
| Frio → Explosivo | 260 | 240 | 220 |

**Anti → Frio → Explosivo**, baseline10%: máximo300, HP240 após itens, HP165 após dois fechamentos; Lady2000 intacta, nenhuma transmissão. Confirma sinergia, não vitória automática. Impacto80/12%/3/piso250 aumenta desgaste acumulado, mas os dados não justificam promover tudo junto: retidos **60/10%/2/piso300**, sem prolongar indefinidamente sangramento.

##### 450 vs500 e piso250 vs300

500 aumenta cada filha em50 (**11,1%**), o pool inicial das três de1350 para1500. Piso300 mantém até40% de petrificação máxima, enquanto a configuração histórica450/piso200 permitia55,6%. No candidato450 os percentuais também têm referência450: não é uma comparação de HP isolada com perdas absolutas iguais.

Piso250 diminuiria o máximo totalmente petrificado em50 por filha:100 na rota de duas,150 nas três. Não diminui PROT. nem muda Lady. A política não distinguiu vitórias; manter **500/piso300** preserva filhas fortes e evita buff conjunto sem evidência.

#### 5. Rota das filhas: durabilidade teórica, não promessa de vitória

Sem cura/regen, sem itens, sem Coágulo e ignorando custo de cartas/tempo:

- Diretamente na Lady: **1500 PROT. + 2000 HP = 3500** de dano.
- Matar duas filhas500: **1000 + 500 PROT. restante + 2000 = 3500**. Regen e Fúria tornam essa rota mais cara se não houver enfraquecimento; não é rigidamente obrigatória.
- Uma Adaga por cada uma de duas filhas: **950** de dano nas filhas475 e até285 de transmissão; aproximadamente **3165** de dano total em ataques, antes de arredondamento por golpe, cura, regen e sacrifício. Ganho idealizado335 (~9,6%) versus3500; cada arredondamento pode reduzir o ganho.
- Uma Adaga em cada uma das três:1425 nas filhas e até427,5 transmitidos; custo idealizado perto de **2997,5**, maior ao arredondar por golpe. Lady não recebe dano da petrificação em si.
- Duas filhas no piso300:600 nas filhas +500 PROT. restante +2000 Lady = **3100**, antes de impacto/bleed/transmissão/regen/Fúria. O piso reduz durabilidade, não dá dano gratuito à Lady.

A Fúria continua adicionando +2/+4/+6 à Sede própria e +10%/+20%/+30% à cura da Lady. Remover duas filhas elimina duas passivas/regen e1000 de PROT. restante, mas gera FúriaII. A matemática oferece incentivo com itens; **a competitividade dessa rota contra dupla competente ainda requer playtest**. O modelo inclusive matou menos filhas nas políticas de quota v2 do que v1, sinal para acompanhamento, não evidência de objetivo já alcançado.

#### 6. Disponibilidade e momento dos itens

São15 itens/108 cartas,3 por tipo, sem garantia de mãos, zona ou momento. Em duas mãos iniciais de11, expectativa combinatória **22×15/108 = 3,06 itens**. Probabilidade de ao menos uma cópia de um tipo específico nessas22: **1−C(105,22)/C(108,22) = 49,87%**. Encontrar Adaga/Anti/Frio simultaneamente não é garantido. Os itens podem estar nos Mortos, Lixo ou cartas que valem mais como jogo; sacrificar remove uma carta real e preserva descarte.

Coortes da híbrida, observadas sem forçar deal:

| Coorte | n v1 → v2 | Rodadas v1 → v2 | HP Lady v1 → v2 | Itens usados v1 → v2 |
|---|---:|---:|---:|---:|
| Poucos, ≤8 encontrados | 3 → 4 | 16,00 → 14,75 | 2000 → 1861 | 3,67 → 4,00 |
| Cedo, ≥4 até4 turnos completos | 33 → 33 | 27,70 → 27,27 | 1996,21 → 1935,52 | 4,94 → 4,82 |
| Muitos, ≥13 encontrados | 46 → 43 | 32,65 → 32,86 | 1997,28 → 1970,74 | 4,33 → 4,23 |

Todas perderam; coortes se sobrepõem e não são novos braços independentes. Poucos itens costuma significar batalha encerrada cedo: menor HP final nessa coorte **não demonstra que encontrar menos é melhor**. Muitos encontrados não é muitos sacrificados: na híbrida v2, médias13,47 encontrados e4,37 usados. O custo de carta, de descarte e o momento impedem assumir os15 efeitos disponíveis desde o início. A amostra pequena de poucos itens não sustenta inferência causal.

#### 7. BOT, UI e validação

BOT v2 avalia efeitos distintos e custo local; conserva coringas/marcas/carta obrigatória do topo/descarte. Prefere filha investida ou golpe letal, e escolhe dano direto na Lady quando é letal considerando PROT./Coágulo. Vínculo continua considerado mesmo com PROT.0. É uma heurística local, não prova de planejamento ótimo de duas filhas.

UI mantém artes/áudio/chips PASSIVA anteriores. Ajuda de item/anexo/mão segue versão da partida; vínculo30%, hemorragia/fechamentos, Frio/cargas e Anti25 são consultáveis. Vida original500 permanece no denominador, máximo recuperável fica explícito e a parte petrificada reflete cada perda. No celular, máximo ocupa segunda linha e anexos não a sobrepõem.

Adaga usa um fluxo vermelho discreto até o retrato da Lady e `−N HP · Vínculo`, sem animação de gasto de PROT. Impacto/hemorragia têm número vermelho na filha; hemorragia e regen verde entram sequencialmente no mesmo retrato. Outras filhas podem regenerar em paralelo. Presenter usa eventos resolvidos, dedup/baseline/cancelamento existentes e reduced motion sem voo. Não recalcula dano/HP no HUD.

##### Testes executados

- Inicial: `node --test` sobre todos os `tests/*.test.mjs` descobertos: **1112/1112**.
- Relacionados chefes/Dimitrescu/Nemesis: **943/943**; depois inclusão dos quatro probes adicionais, nova execução dos arquivos de itens/experimento: **51/51**. As contagens se sobrepõem, não devem ser somadas.
- Ampla final, todos os arquivos `.test.mjs`: **1163/1163**, **0** falhas/cancelados/skips/todos. Os51 testes adicionais cobrem o novo contrato e experimento.
- `tests/dimitrescu-castle.browser.mjs`: **1920/1376/390px**; legado+v2, popovers, mouse/toque/teclado/Escape/clique fora, barra original/recuperável/petrificada, ausência de overflow/sobreposição de anexos, transmissão, bleed→regen, snapshot/replay e reduced motion. Screenshots inspecionados em desktop e celular.
- `tests/boss-resource-feedback.browser.mjs`: **1920/1376/390px**; transferências de Infecção/Sede/HP, sincronização da borda, fontes, filas, dedup/cancelamento e controles reais do laboratório/undo.
- `tests/nemesis-ui.browser.mjs`: renderer real, seleção, estabilidade e **5 viewports** passaram, sem reabrir suas mecânicas.

Cobertura específica: cinco sacrifícios; referência inicial/baixo HP/piso; Adaga humana/BOT/canastra/Final, PROT.0/1500+Coágulo, overkill, duplicatas, fontes não elegíveis e morte Lady; hemorragia+Anti/Frio/regen/morte/Fúria/PROT., reaplicação/último tick; Frio cheio/teto; Relíquia pendente/idle/não selecionada/As Três Filhas; legacy/snapshot/undo/reconexão sem efeitos repetidos; laboratório novo108 IDs/15 itens. Testes antigos v1 preservados com fixture explicitamente legado; expectativas de partidas novas passaram a500.

**Regressões conhecidas restantes: nenhuma encontrada na suíte executada.** Browser é fixture local com módulos/handlers reais, não sessão Firebase com dois clientes. Áudio/arte existentes não foram modificados; reprodução de som real entre dois clientes e um playtest competente não foram feitos. Não existe teste ocultado com skip/todo.

#### 8. Arquivos deste patch e diffs

Produção/apresentação: `app.js` (ajuda usa boss atual), `js/boss/dimitrescu-castle.js`, `js/boss/mechanics/dimitrescu.js`, `js/boss/ui/dimitrescu-castle-view.js`, `js/boss/ui/resource-feedback.js`, `styles/boss/dimitrescu.css`.

Testes existentes atualizados: `tests/dimitrescu-castle.test.mjs`, `tests/dimitrescu-castle.browser.mjs`, `tests/boss-objective-resource-rule.test.mjs`, `tests/boss-resource-feedback.test.mjs`, `tests/boss-rework-october.test.mjs` (fixture de HP/regen do trabalho anterior). Novos: `tests/dimitrescu-items-v2.test.mjs`, `tests/dimitrescu-item-experiment.test.mjs`.

Experimento novo: `scripts/dimitrescu-item-experiment.mjs`. Documentação: este relatório, `docs/DOCUMENTACAO_CHEFE_DA_MESA.md`, `docs/INVENTARIO_HABILIDADES_CHEFES.md`, `docs/CHECKLIST_REGRESSOES_E_ATUALIZACOES.md`.

`git diff --stat` do workspace: **24 files changed, 638 insertions(+), 166 deletions(-)**. Inclui mudanças anteriores ainda não commitadas, especialmente Nemesis/Matriarca. Esses arquivos não foram alterados neste patch. Arquivos novos não aparecem no stat comum até serem adicionados; este patch acrescenta quatro (relatório, experimento e dois testes), além dos untracked anteriores. Não foi feito staging.

`git diff --check`: **sem saída, exit0**. Arquivos novos também verificados quanto a espaços finais. Diff não foi limpo por reversão de alterações anteriores.

#### 9. Próxima medição necessária

Playtest pareado por seed com duplas competentes, estratégias livres incluindo dano direto/duas filhas/combos, registrando fase/turnos, encontros e usos de cada item, dano PROT./HP/transmitido, regen/bleed, mortes/Fúria/Sede, motivo final. Não fornecer combos iniciais artificiais. Comparar configurações com mesmas seeds e jogadores; separar aprendizagem/ordem e intervalos de confiança. Por exemplo,200 batalhas a70% teriam intervalo aproximado de±6,4 pontos (ainda largo para65–75), sem incluir viés de seleção de jogadores. Só então escolher/revisar configuração para a meta.

Riscos a observar: novas filhas mais duráveis sem itens; custo/cadência para matar duas antes de regen/Fúria; Adaga com canastras fortes; Frio+Anti+Explosivo; timing de Relíquia; duplicatas redundantes no piso. Não baixar dificuldade global nem promover o combo alto para compensar uma política de simulação fraca.


---

<a id="arquivo-rework-nemesis-matriarca-e-ux-dimitrescu-2026-10-08"></a>

## Origem: REWORK_NEMESIS_MATRIARCA_E_UX_DIMITRESCU_2026-10-08.md

### Rework Nemesis/Matriarca e correções visuais Dimitrescu — 08/10/2026

**Atualização de elegibilidade em 09/10/2026:** as provas antecipadas de sucesso descritas neste relatório histórico deixaram de filtrar Caçada/Extermínio e desafios da Invasão. Marcas preservam saída individual legal; jogos precisam existir e aceitar extensão. Resolução, valores e o planner de execução/BOT continuam. A ordem inversa sem solução agora pode anunciar Extermínio e aplicar a consequência existente. Dados atuais e classificação: `AUDITORIA_ELEGIBILIDADE_CHEFES_2026-10-09.md`. As medições de 08/10 abaixo não representam a nova distribuição.

#### Status e escopo

Implementação experimental baseada exclusivamente no workspace local. Referência anterior: commit local `b1658cc8c2b3acda87db65afed4dbe43c3e37f12`. Workspace inicialmente limpo; suíte inicial nova: **1066/1066**. Sem consulta à branch remota, commit, push ou deploy.

**Meta 70% (faixa 65%–75%) NÃO validada contra dupla competente.** Os experimentos abaixo são partidas completas de uma política gulosa, não telemetria humana nem previsão confiável de vitória real. Mantidos HP, pesos e punições completas; novos custos parciais conservadores devem passar por playtest antes de outra calibração.

#### Nemesis

| Habilidade | Antes | Agora | Valores/peso |
|---|---|---|---|
| Caçada S.T.A.R.S. | Contribuir uma carta, inclusive atacando zumbi | S.T.A.R.S. congelado deve causar dano efetivo positivo à vida do Nemesis no próprio turno | Mínimo 1 HP; falha base +8/+10/+12; peso **5 → 5** |
| Tentáculo Infeccioso | Uma das duas marcas sair por jogo OU descarte evitava tudo | Jogar marcada neutraliza; só descartar é parcial; nenhuma resolvida é falha completa | Duas marcas; parcial **+4/+5/+6**, completa +8/+10/+12; peso **5 → 5** |
| Extermínio S.T.A.R.S. F3 | Um jogador contribuir e resolver segunda carta no turno | Rodada cooperativa: S.T.A.R.S. ataca Nemesis; parceiro alimenta jogo existente congelado | Ambos/um/nenhum **+0/+8/+16 → +0/+8/+16**; peso **4 → 4** |

A diversidade vem do alvo de dano, da escolha entre jogo/descarte e dos papéis cooperativos, não de mais HP ou penalidade completa. Qualquer dano positivo permite uma contribuição simples cumprir a Caçada sem inventar uma exigência de canastra difícil de calibrar.

Elegibilidade usa sequência canônica, dano novo/incremental, descarte restante e Morto/batida. Cartas já creditadas sem evolução não provam dano. Extermínio prova ambos os planos na ordem real: contribuição do parceiro pode abrir a ponte necessária ao ataque seguinte. Ordem inversa sem solução é inelegível. Não substitui silenciosamente S.T.A.R.S. impossível pelo parceiro; antes de existir marcador, pode escolher um alvo legal.

O BOT usa o plano por papel e escolhe Nemesis enquanto precisa cumprir dano direto; depois mantém sua seleção de zumbis. Agarrador testa o estado pós-travas com a solução conjunta, sem reservar cegamente o primeiro plano. Contribuição do parceiro só conta no ID de jogo escolhido; novo jogo, reorganização, descarte e ataque do parceiro não substituem esse objetivo.

HUD/medidores/ajuda e resolução compartilham `getNemesisObjectiveOutcome()`/`projectNemesisInfection()`. Infectado normal/Mutado, Reforçado e Ômega entram uma única vez nas consequências positivas, inclusive parciais; sucesso não reduz Infecção. O HUD acompanha o progresso atual e o limite real 100.

Justificativa quantitativa: a punição parcial do Tentáculo é metade da base completa. Com bônus fixo B, fora do limite 100, o custo esperado é `parcial × P(descarte) + completa × P(falha) + B × [P(descarte) + P(falha)]`. Não foram inventadas probabilidades de cumprimento humano. Bônus não são reduzidos à metade nem duplicados. Extermínio conserva suas bases 8/16, agora por cumprimento dos dois papéis.

Preservados: Nemesis **2200**, zumbis **220/240/260**, Infecção **100**, passivas atuais (inclusive créditos do Devorador), entrada/invasão, Mutação, Horda, regeneração, reanimação, Lança-Foguetes, Zona, Ômega, canastras/alívio e Ataque Final fixo **100**. Saves v1 concluem objetivos já anunciados sob a regra salva; somente anúncios novos usam `objectiveVersion: 2`.

#### Matriarca — Enxerto

Antes: dois lados neutralizavam; um lado e zero lados geravam +1 Flor, com propagação somente no zero. Isso repetia a obrigação de alimentar ambos de Trepadeiras.

Agora:

- Dois lados: sem efeito.
- Um lado: cura **até 50 HP**, sem Flor nem propagação comum do Enxerto.
- Zero lados: **+1 Flor** e propagação posterior conforme os guards existentes.

Peso **3 → 3**, fases 2/3 e dois jogos existentes preservados. Coroa mantém sua reação própria a uma ameaça parcialmente falhada; não foi redesenhada.

50 HP são **2,5% de 2000**: custo secundário limitado, recuperável por dano, em vez de avançar automaticamente a condição de cinco Flores. Representam no máximo um terço do teto de cura F2 (150) e um quarto do F3 (200). A cura efetiva é limitada pelo espaço até o HP máximo e pela quota restante da rodada. Testados headroom de 5 HP, quota restante de 10 HP e quota esgotada.

Com P0/P1/P2 para zero/um/dois lados, o Enxerto comum gera em média P0 Flor em vez de P0+P1; a cura adicional média é `P1 × min(50, espaço de HP, quota restante)`. Esses são custos condicionais, não uma estimativa de win rate. As variantes 40/50/60 abaixo não discriminam dificuldade humana; 50 fica como referência intermediária conservadora, não como ótimo estatístico.

Preservados: **2000 HP**, derrota em **5 Flores**, no máximo **+1 Flor por ativação normal**, canastra não reabre quota, propagação independente, tetos de cura, Renascimento (1x, 1 Flor/300 HP), Orvalho, Casulo e demais habilidades. Save com Enxerto já anunciado sem `partialHeal` mantém a regra anterior, inclusive na ajuda, até resolver; novos anúncios congelam 50 no payload.

#### Experimentos reproduzíveis

Não havia simulador completo pronto. `scripts/boss-battle-experiment.mjs` usa embaralhamento seeded de 108 cartas físicas, duas mãos, dois Mortos, Monte/Lixo, sequência canônica, cotação compartilhada do Lixo protegido, contribuições/dano/canastras, fases, habilidades elegíveis, restrições, zumbis/regen/reanimação, Flores/propagação/Casulo/cura/Renascimento e condições finais do motor. Teste de conservação exige exatamente 108 IDs únicos. Limite de 180 turnos é reportado como `policy_turn_limit`, nunca como vitória; não ocorreu nos lotes registrados.

Política: busca gulosa até 96 planos por ação, objetivos do planner priorizados, sem planejamento longo de canastra/dupla. `autoTarget=true` usa a decisão real de dano do BOT com o dano real do motor, incluindo matar zumbis e escolher Nemesis para perseguição. Isso NÃO executa toda a inteligência/worker do BOT de produção: compras/descarte/organização de longo prazo continuam simplificados. A comprovação de Morto/batida da política é um modelo local, não o dispatcher integral da mesa.

##### Comparação antes/depois, mesma política e seeds 5000–5079

O motor anterior foi extraído com `git archive` do HEAD local para `.cache/rework-baseline-engine`; único ajuste instrumental: exportar o classificador já existente, sem alterar regra. Driver atual copiado para essa pasta, imports apontando ao motor anterior.

| Motor | Chefe | Vitórias do chefe / 80 | Rodadas médias | Motivo das derrotas da política |
|---|---|---:|---:|---|
| Antes | Nemesis | 80/80 (100%) | 30,55 | 51 recursos; 29 Ataque Final insuficiente |
| Depois | Nemesis | 80/80 (100%) | 30,59 | 52 recursos; 27 final; 1 Infecção |
| Antes | Matriarca | 80/80 (100%) | 11,21 | 80 Flores |
| Depois | Matriarca | 80/80 (100%) | 11,38 | 80 Flores |

Ocorrências efetivas, não probabilidades fixas dos pesos: Nemesis Caçada **79 → 31**, Tentáculo **48 → 54**, Extermínio **46 → 17**. No motor novo, Caçada F1/F2/F3: **28/1/2**; Tentáculo **36/7/11**; Extermínio F3 **17**. Regeneração Parasita **51 → 64**, Reanimação **13 → 18**: a política efetivamente feriu/matou zumbis, não os ignorou como na primeira exploração. Enxerto **25 → 25**, F2/F3 **22/3**. A queda de perseguições reflete elegibilidade mais específica e escolhas desta política; não justifica automaticamente elevar os pesos.

##### Sensibilidade conjunta de custos e pesos

Lotes independentes de comparação: seeds **7000–7059**, depois **9000–9059**, 60 por chefe/configuração. Todas as três variantes desta tabela usam o mesmo alocador experimental seeded: pool legal real, introdução de fase e não repetição preservados; pesos relativos dos objetivos multiplicados fora do catálogo de produção. Resultados não são comparações de uma variável isolada.

| Variante | Cura parcial Enxerto | Bases parciais Nemesis | Multiplicador dos pesos Caçada/Tentáculo/Extermínio/Enxerto | Nemesis 7000 / 9000 | Matriarca 7000 / 9000 |
|---|---:|---|---:|---|---|
| Baixa | 40 | Tentáculo 3/4/5; Extermínio 6 | 0,75 | 58/60 / 60/60 | 60/60 / 60/60 |
| Central | 50 | Tentáculo 4/5/6; Extermínio 8 | 1,00 | 58/60 / 60/60 | 60/60 / 60/60 |
| Alta | 60 | Tentáculo 5/6/8; Extermínio 10 | 1,25 | 58/60 / 60/60 | 60/60 / 60/60 |

Bases de sensibilidade arredondadas; bônus/custos completos/HP não mudam. Nas seeds 7000, rodadas Nemesis baixa/central/alta: **28,52/28,53/28,53**; Matriarca: **11,82/11,82/11,95**. Nas seeds 9000: Nemesis **29,35/29,35/29,37**; Matriarca **11,25/11,27/11,25**. Enxerto ocorreu 19/19/20 vezes no lote 7000 e 21/22/25 no 9000. Nenhuma configuração se aproximou da faixa desejada neste modelo.

Verificação independente do catálogo/seleção OFICIAL, seeds **9000–9079**: Nemesis **80/80**, 29,68 rodadas; Matriarca **80/80**, 11,43 rodadas. Houve também exploração preliminar de 120 seeds 1000–1119 antes/depois, sem seleção de alvos dos zumbis: ambos 100%; descartada como evidência de competência. Seus números não foram usados para ajustar HP.

##### Reprodução

```bash
node scripts/boss-battle-experiment.mjs 5000 80 '' 1 1 1 true
node scripts/boss-battle-experiment.mjs 7000 60 40 0.75 1 0.75 true experimental
node scripts/boss-battle-experiment.mjs 7000 60 50 1 1 1 true experimental
node scripts/boss-battle-experiment.mjs 7000 60 60 1.25 1 1.25 true experimental
# Repetir as três variantes com start=9000 para seeds independentes.
node scripts/boss-battle-experiment.mjs 9000 80 '' 1 1 1 true
```

Argumentos: start, count, graftHeal opcional, partialScale, objectiveFollow, objectiveWeightFactor, autoTarget, allocator opcional. `objectiveFollow` é adesão da política ao objetivo, NÃO peso do catálogo. Saída JSON inclui motivos, rodadas, retiradas, frequências por fase e aviso de limitação. Outputs locais `.cache/rework-{target-baseline,target-current,variant-low,variant-middle,variant-high,independent-current,independent-low,independent-middle,independent-high}.jsonl`.

Conclusão: modelo claramente insuficiente para medir uma dupla competente, com perdas predominantemente por recursos/final no Nemesis e Flores na Matriarca. Não há base para selecionar um ótimo 70%, nem para usar percentuais históricos como atuais. Preservar catálogo/HP e coletar playtest antes de aumentar frequência/pressão. Custos parciais acima são experimentais, matematicamente limitados.

#### Lady Dimitrescu — somente apresentação

Causa 1: PASSIVA e CAÇADA/BANQUETE/LIXO usavam o mesmo `daughterPassiveHelp()`. Agora PASSIVA chama ajuda própria de regeneração: 50, Anticoagulante 25, Frio na próxima cura, máximo recuperável, vida cheia, morte e valor efetivo no estado real. Objetivos ofensivos, seleção/cadência e debuffs permanecem.

Causa 2: `regenerateDaughters()` já emitia `daughterRegen`, mas o presenter ignorava esse tipo. Agora usa `targetId`, `amount` e `hp` reais para número verde no retrato individual, sem mudar HP de novo. As três curas são independentes e simultâneas, fora da fila da Lady/Sede. O gate existente de `app.js` já encaminhava eventos ao presenter, então não foi necessário alterar o aplicativo principal.

Cobertura: +50 Bela, +20 Cassandra em 430/450, +25 Daniela com Anticoagulante; filha não selecionada; Frio, vida cheia, morte e zero sem animação. Deduplicação por `actionId`, baseline inicial em reload/reconexão, render repetido, undo/cancelamento; texto acessível e reduced motion sem deslocamento. Lady/filhas **HP, Sede, Fúria, Vínculo, itens, regen e passivas não foram alterados**.

#### Validação e arquivos

- Inicial ampla: **1066 aprovados, zero falhas**.
- Final focada: **896 aprovados, zero falhas** dos chefes/Nemesis/Dimitrescu e infraestrutura atingida.
- Final ampla: **1112 aprovados, zero falhas**, sem cancelamentos/skip/todo. Logs: `.cache/rework-focused-final.log` e `.cache/rework-wide-final.log`.
- Novas regressões: objetivos nas fases/ordens/papéis; parcial só do parceiro; bônus únicos; alvos/IDs congelados; ponte cooperativa; Agarrador; dano já creditado/Ataque Final; Enxerto/caps/legado antes e depois da aplicação; regeneração real/ajuda; conservação/determinismo das partidas.
- Browsers locais: `nemesis-ui` (1920/1024/844/390/3840), `dimitrescu-castle` (1920/1376/390), `boss-resource-feedback` (1920/1376/390), `boss-hud-ux` (1920/1376/1024/390), mouse/toque/teclado/Escape, viewport e reduced motion. Capturas dos novos objetivos e números revisadas visualmente. Fixtures usam renderers/CSS reais, sem sessão Firebase ao vivo.

Produção: `js/boss/boss-balance.js`, `boss-engine.js`, `bosses/{nemesis,matriarch}.js`, `mechanics/nemesis.js`, `presentation/{nemesis,matriarch}.js`, `ui/{dimitrescu-castle-view,resource-feedback}.js`. Nenhum CSS, `app.js`, BOT worker ou definição dos demais chefes alterado.

Testes: novos `boss-rework-october.test.mjs`, `boss-battle-experiment.test.mjs`; atualizados `boss-engine.test.mjs`, `boss-final-balance.test.mjs`, `nemesis-boss.test.mjs`, `dimitrescu-castle.browser.mjs`, `nemesis-ui.browser.mjs`. Fixtures manuais de Enxerto explicitam payload novo; os saves antigos são testados separadamente, não mascarados.

Documentação: este relatório, `DOCUMENTACAO_CHEFE_DA_MESA.md`, `INVENTARIO_HABILIDADES_CHEFES.md`, `CHECKLIST_REGRESSOES_E_ATUALIZACOES.md`. Harness: `scripts/boss-battle-experiment.mjs`.

`git diff --stat`: 17 arquivos rastreados, 373 inserções/101 remoções; mais quatro novos ainda fora do índice (relatório, harness e duas suítes), total 21 arquivos. `git diff --check` sem erros. Nada foi colocado em staging automaticamente.

#### Pendências reais

- Playtest com dupla competente, registrando habilidade/fase/elegibilidade, sucesso/parcial/falha, dano e alvos, canastras/alívio, zumbis, duração e motivo final. Comparar lotes independentes antes de declarar 65%–75%.
- Verificar se a seleção estrita de S.T.A.R.S. reduz demais Caçada/Extermínio em jogo humano; não aumentar peso com base na política gulosa.
- Medir se aceitar 50 HP de cura oferece decisão útil ou se jogadores sempre alimentam ambos; avaliar custo de oportunidade de cartas/preparação de canastra.
- Sessão real de dois clientes Firebase para transporte/concorrência e playtest visual no aparelho do usuário. Snapshots e guards têm cobertura local; isso não substitui rede real.

Nenhuma mecânica de outro chefe, regra global de recuperação ou teto de Flores foi revertida. Sem commit/push/deploy.


---

<a id="arquivo-ajuste-final-nemesis-2026-10-09"></a>

## Origem: AJUSTE_FINAL_NEMESIS_2026-10-09.md

### Nemesis — ajuste final de 09/10/2026

#### Resultado

Agarrador alterna um jogador por rodada completa. Devorador cura a cada três cartas novas, **sem limite por turno/jogada, cooldown ou trava compensatória**. Normal 20, Mutado 35, Reforçado 35, ambos 50 HP por cura. HP dos combatentes, duração das travas, Infecção, ressurreição, demais chefes e estratégia dos Coringas não foram rebalanceados. Sem stage, commit, push ou deploy.

#### Causa e implementação

Antes, o Agarrador extraía cartas do primeiro plano legal encontrado, separava jogáveis das demais e rodava cada lista por um único deslocamento seeded. Isso priorizava cartas úteis e mantinha o viés de ordem da mão/planner. Tentáculo/Barragem e marca inicial da Invasão escolhiam os primeiros IDs de uma lista que também priorizava jogo.

Agora IDs únicos são ordenados canonicamente e embaralhados com Fisher–Yates e RNG determinístico por evento. Seed, rodada, turno/jogador e identificador da marca distinguem os sorteios; rank, naipe, Joker/2 e utilidade não entram no score. Resultados anunciados/locks salvos não são reconstruídos no reload.

`grabberPursuit.playerIds` persiste a ordem dos jogadores, cujo primeiro é sorteado por seed. O índice `(roundNumber−1) % 2` determina o perseguido. É a rodada canônica, não o contador de compras/render. Mudar fase, morrer, retornar à mesa ou ser reanimado não reinicia essa ordem. Só compra efetiva do perseguido aciona a trava. Monte e Lixo usam o mesmo hook; no Lixo Fechado, o topo já jogado não é candidato. Normal/Mutado/Reforçado/ambos continuam agarrando 1/2/2/3 cartas.

As proteções anteriores das combinações de travas permanecem: saída legal de descarte/Morto/batida e solução de objetivo já existente, inclusive cooperativa. Isso pode condicionar os candidatos em estados sobrepostos; não é uma promessa de distribuição uniforme em mãos com restrições diferentes. Não foi adicionada prova antecipada de sucesso à elegibilidade dos anúncios: desafios sem solução continuam permitidos. O sorteio sem restrições especiais foi medido separadamente abaixo.

Antes, `devourerTurnIds` permitia só uma cura por turno e o fim de turno drenava créditos acumulados sem nova contribuição. Agora um loop consome **todos** os grupos completos em `onMeldTransition`, e o fim de turno não cura. Cada ID novo conta uma vez, em abertura/extensão, por qualquer cooperador. Somente 0–2 créditos continuam entre jogadores/turnos. HP cheio ainda consome os grupos, mas não emite cura zero/animação falsa. Não cura com HP zero, derrotado, resultado terminal ou partida encerrada.

Cada grupo incrementa a sequência persistida `devourerHealSequence`; eventos efetivos usam `devourer:v2:N`, distinguindo curas da mesma ação. A sequência não zera com a morte do Devorador. O apresentador existente enfileira cada evento e ignora repetição do ID, sem novo sistema visual paralelo. Laboratório dispara uma cura isolada de teste sem consumir o progresso real; não impõe limite à partida.

#### Saves, undo e sincronização

Feed v1 migra para v2 conservando `credits % 3` e os IDs já contados. Grupos completos pendentes são descartados e registrados em `discardedLegacyCredits`, sem cura retroativa no load. Exemplo: 8 créditos viram 2, descartando 6. Sem feed, registra a mesa existente e começa do zero. Normalização repetida não cura nem emite eventos. Morte/reanimação zeram progresso; cartas da mesa anterior não são creditadas novamente. Snapshot, undo e cópias de sincronização preservam progresso, ordem de perseguição, locks e sequência.

#### Distribuição estatística reproduzível

`tests/nemesis-final-balance.test.mjs`, seeds 0–2999, mão com cinco candidatos igualmente elegíveis. Inverter a mão não mudou os resultados. Primeiro alvo: jogador 0 **1490 (49,67%)**, jogador 1 **1510 (50,33%)**.

| Carta/candidato | Agarrada (1 por seed) | Tentáculo (2 marcas) | Barragem (3 marcas) | Invasão (1 marca) |
|---|---:|---:|---:|---:|
| Jogável/extensão | 610 | 1166 | 1805 | 571 |
| Não jogável Q | 609 | 1189 | 1793 | 627 |
| Joker | 562 | 1237 | 1798 | 622 |
| Descarte K | 639 | 1276 | 1841 | 589 |
| 2 | 580 | 1132 | 1763 | 591 |

Esperado por candidato: 600/1200/1800/600. A maior diferença no Agarrador foi 39 sorteios (1,3 ponto percentual). Este teste não mede todas as distribuições possíveis nem elimina condicionamentos legítimos de proteção canônica.

#### Curas imediatas — exemplos reproduzíveis

Devorador normal, zero créditos iniciais, HP suficiente para receber toda a cura. Antes: uma cura de 40 e créditos completos pendentes; depois: cada grupo cura 20 imediatamente.

| Cartas na mesma ação | Cura anterior imediata | Cura atual imediata | Créditos atuais |
|---:|---:|---:|---:|
| 1 | 0 | 0 | 1 |
| 2 | 0 | 0 | 2 |
| 3 | 40 | 20 | 0 |
| 4 | 40 | 20 | 1 |
| 6 | 40 | 40 | 0 |
| 7 | 40 | 40 | 1 |
| 9 | 40 | 60 | 0 |
| 12 | 40 | 80 | 0 |

Com 2 créditos anteriores e 5 cartas novas: duas curas, 40 HP e resto 1. Quatro contribuições separadas de 3 no mesmo turno: quatro curas. Mutado/Reforçado curam 140 no exemplo de 12 cartas; ambos, 200. Vida máxima só limita o valor efetivamente recuperado, não quantas ativações podem ocorrer.

#### Batalhas com as mesmas seeds

Baseline `72d247276ba805f28305a9358251163e786f16ce`, seeds 7300–7307, 108 cartas físicas, BOT+BOT real com worker/esperas desativados no adaptador headless. **Tanto regras quanto BOT/fixtures anteriores foram carregados numa árvore isolada**, sem misturar regras novas com BOT antigo. 32 execuções: 8 seeds × 2 versões × 2 coortes. Conservação dos 108 IDs conferida após os turnos.

| Coorte (8 seeds por versão) | Cura total antes → depois | Eventos de cura antes → depois | Vitórias antes → depois |
|---|---:|---:|---:|
| Entrada natural dos zumbis | 365 → 950 HP | 11 → 31 | 4/8 → 1/8 |
| Devorador vivo desde o início | 700 → 750 HP | 21 → 29 | 0/8 → 1/8 |

Na coorte natural a cura média mudou de 45,625 para 118,75 HP por batalha; na focada, de 87,5 para 93,75. Isso inclui o novo sorteio/perseguição e trajetórias de decisão, não isola só a cura. Não é um nerf uniforme de 50%, e baixar muitas cartas com Devorador vivo continua tendo o custo estratégico desejado. Amostra pequena, sem estimativa de win rate humano nem recomendação de ajuste extra.

| Seed | Natural antes/depois (HP curado) | Devorador inicial antes/depois |
|---:|---:|---:|
| 7300 | 0 / 0 | 140 / 110 |
| 7301 | 0 / 110 | 20 / 55 |
| 7302 | 0 / 0 | 120 / 0 |
| 7303 | 285 / 335 | 250 / 300 |
| 7304 | 0 / 105 | 60 / 165 |
| 7305 | 80 / 225 | 35 / 40 |
| 7306 | 0 / 0 | 40 / 60 |
| 7307 | 0 / 175 | 35 / 20 |

Reprodução: `node scripts/nemesis-final-experiment.mjs 72d2472 8 7300`. Dados locais em `.cache/nemesis-final-battles.jsonl`; logs/snapshots de teste são gerados/ignorados, não entram no commit.

#### Interface e evidências

AGARRA e ALVO são chips separados; nome real e help de alternância. Alvo não aparece em cadáver/repelido/entrada/ausente. ATIVO/MUTADO/REFORÇADO preservados. CURA20/35/50 mantém três segmentos verdes e nenhuma contagem x/3 no rótulo. Progresso numérico e explicação completos ficam no help, sem cooldown antigo.

Browser com renderer/CSS reais: 1920×1080, 3840, 1024, 844 e 390 pixels de largura; cliques/teclado, ajuda ancorada, encaixe, ausência de overflow e estabilidade do HUD. Capturas inspecionadas visualmente:

- [Desktop](../../.cache/nemesis-ui/final-chips-1920.png)
- [Tablet](../../.cache/nemesis-ui/final-chips-1024.png)
- [Celular](../../.cache/nemesis-ui/final-chips-390.png)

Browser de feedback passou em 1920/1376/390: 12 cartas geram quatro transferências reais de +20, HP final 2080 a partir de 2000, progresso zero. Enfileirar cada evento duas vezes e reapresentar cópia serializada não repete animação. Borda anterior do HP é o destino; só após chegada a barra cresce. Reduced motion e cancelamento mantidos.

#### Testes e arquivos

Validação final: **309/309 testes focados e 1322/1322 na suíte ampla** dos seis chefes e BOT/coringas, sem falhas, cancelamentos, skips ou todos. Asserções antigas de prioridade jogável/cura única foram atualizadas para a regra nova, sem esconder falhas ou reduzir cobertura. Novo teste cobre sorteios, 1/2/3/4/6/7/9/12 cartas, múltiplas curas mesma ação/turno, ambos cooperadores, duplicação por ID, teto de HP, migração, morte/reanimação, terminal e snapshot/undo/sync; cobertura adicional para mão grande.

Arquivos do ajuste: `js/boss/mechanics/nemesis.js`, `js/boss/bosses/nemesis.js`, `js/boss/presentation/nemesis.js`, `js/boss/ui/nemesis-ui.js`, `service-worker.js` (v294), `scripts/boss-baseline-loader.mjs`, `scripts/nemesis-final-experiment.mjs`; testes `nemesis-final-balance`, `nemesis-devourer-chip`, `nemesis-boss`, `nemesis-grabber`, `nemesis-progress-meters`, `nemesis-ui.browser`, `boss-october-package`, `boss-resource-feedback.test/browser`, `boss-rework-october`, `discard-pickup` e `stock-draw-animation`; documentação oficial, inventário, checklist e este relatório. Mudanças prévias do chip em `app.js`/`styles/boss-mode.css` foram preservadas, sem novo painel ou glow.

Limites: testes de sync são snapshots serializados/cópias, não uma partida Firebase remota com dois clientes reais. Browser usa fixture do renderer real, não autenticação/partida publicada. Nenhum multiplayer remoto, deploy, commit ou push foi feito. Balanceamento humano continua por validar.

`git diff --check` passou; Git apenas avisou da conversão habitual LF/CRLF. `git diff --stat`: **21 arquivos rastreados, 251 inserções e 123 exclusões**, incluindo alterações prévias preservadas. Esse comando não inclui os quatro arquivos ainda não rastreados: este relatório, o script de comparação, `tests/nemesis-devourer-chip.test.mjs` (já existia como mudança local) e `tests/nemesis-final-balance.test.mjs`. O índice/staged permaneceu vazio.


---

<a id="arquivo-auditoria-elegibilidade-chefes-2026-10-09"></a>

## Origem: AUDITORIA_ELEGIBILIDADE_CHEFES_2026-10-09.md

### Auditoria de elegibilidade e variedade — seis chefes — 09/10/2026

#### Escopo e conclusão

Fonte: workspace local. Baseline isolada: `675106b3e1dfc15b80603886e3c8683dad7cc3a8`, com toda a árvore JS anterior materializada pelo loader existente; não mistura imports antigos com estratégia atual. Workspace inicialmente limpo. Sem commit, push, deploy ou consulta remota.

Problemas comprovados:

1. Nemesis exigia plano de dano da Caçada, plano conjunto ordenado de Extermínio, duas contribuições para Infectado e planos de jogo para todas as marcas. Barragem ainda exigia duas cartas jogadas no plano. Isso retirava desafios legítimos de mãos fracas da rotação.
2. Devorador exigia uma contribuição legal já disponível na mão, embora o desafio pudesse falhar normalmente. Impacto também exigia carta/plano imediato, não apenas jogo válido.
3. Prisão da Nehelenia exigia carta de resgate na mão do parceiro; Laço exigia duas alimentações conjuntamente possíveis, com cartas distintas e descarte restante. São desafios com consequência por falha, não bloqueios que precisem garantir sucesso.
4. O seletor compartilhado retirava a última habilidade antes de validar as alternativas. Mesmo havendo uma opção válida para repetir, podia resultar em lista vazia. Reproduzido também na Matriarca com apenas Orvalho elegível.
5. Não foi comprovado favorecimento especial do Devorador no sorteio. Com os três elegíveis, o sorteio é uniforme entre candidatos; filtros diferentes e estados da mesa alteram o conjunto disponível. Não há pesos individuais para os zumbis.

Corrigidos os filtros excessivos e a exclusão prematura da última habilidade. Mantidos pesos, fase-intro, recursos, HP, dano, cura, Lixo, objetivos/consequências, BOT estratégico e regras clássicas. Uma habilidade sem solução pode ser anunciada, falhar e aplicar a consequência existente. Não se elimina alvo obrigatório nem se remedia a dificuldade cancelando o objetivo.

#### Critério A/B/C e auditoria individual

A: dependência obrigatória/segurança de ações. B: prova antecipada excessiva de sucesso. C: alvo real necessário, solução antecipada desnecessária. As condições abaixo identificam os filtros que causam exclusão; fase continua obrigatória para todas. `payload:<id>` no JSON identifica a validação de alvo do construtor/validador daquela habilidade; `prerequisite:<id>` identifica o pré-filtro compartilhado. Não é uma nova regra de interface.

##### Nemesis — 11 habilidades

| Habilidade | Classe/decisão | Exclusão preservada ou removida |
|---|---|---|
| Caçada S.T.A.R.S. | B removida; A alvo | Mantém cooperador S.T.A.R.S. e turno restante; retira prova de dano imediato. Sem S.T.A.R.S., escolhe cooperador válido; nunca troca um S.T.A.R.S. sem ataque por parceiro com mão melhor. |
| Tentáculo Infeccioso | B removida; A marcas | Precisa de duas cartas com saída individual legal por jogo ou descarte. Não exige plano de jogo completo; jogar continua sucesso, apenas descartar continua parcial. |
| Barragem de Tentáculos | B removida; A marcas | Precisa de três marcas reais com saída individual legal, não prova de duas saídas conjuntas nem duas cartas jogadas. Exigência de duas saídas e falha +16 permanecem. |
| Extermínio S.T.A.R.S. | B removida; C destino | Mantém dois papéis, turnos restantes e um jogo existente extensível, congelado por ID. Não prova planos conjuntos nem sucesso na ordem atual. |
| Invasão da Horda | B/C revisadas; A lifecycle | Teto da fase, ausente/repelido e jogador com turno restante. Agarrador precisa de marca com saída legal, não contribuição pronta. Infectado não precisa provar duas cartas. Devorador precisa de jogo estruturalmente extensível, não carta na mão. |
| Lança-Foguetes | C revisada | Mantém jogo legal extensível; não exige plano imediato para alimentá-lo. Jogo inexistente/Ás-a-Ás completo é inválido. |
| Zona Contaminada | A preservada | Topo real, recursos de compra, Lixo desbloqueado e retirada legal pela cotação canônica do destino real. Não cria alvo de cobrança sem retirada possível. |
| Comando da Horda | A preservada | Persistente vivo; entering/repelled/corpse não são alvos de reforço. |
| Regeneração Parasita | A preservada | Persistente vivo ferido, menor percentual de HP. Sem alvo ferido não participa. |
| Reanimação Viral | A preservada | Cadáver com `revivals < 1`, espaço no teto e quota da fase não consumida. Não revive repelido nem revive o mesmo zumbi pela segunda vez na batalha. |
| Surto Ômega | A fase | Apenas fase final; nenhum plano da mão é exigido. |

As marcas usam helpers canônicos de sequência/descartes/bloqueios/condição de saída. Carta recém-retirada que não possa sair não vira marca; último descarte ilegal sem Morto/canastra boa continua rejeitado. Prioridade determinística: jogáveis, depois apenas descartáveis; não se exige sucesso simultâneo. Nenhuma marca nova bloqueia descarte.

Invasão mantém IDs dos jogos iniciais/IDs de cartas para Devorador, contadores coletivos, expulsão imediata ao atingir três, persistência/Mutação e **zero Infecção adicional por falha**. `inspectBossAbilityEligibility().details` explica cada candidato: teto, lifecycle, ausência de turno, ausência de jogo extensível ou ausência de saída legal da marca. Não marca cadáver como invasor.

O planner não foi removido do jogo: continua na execução do BOT, na proteção pós-compra do Agarrador e nos cenários de sucesso do Laboratório. Este último calcula plano quando solicitado, em vez de exigir/persistir uma solução no anúncio. Saves já anunciados preservam payload/versão/IDs, inclusive campos `solution` antigos; não são sorteados novamente após reload.

##### Rainha Nehelenia — 11 habilidades

| Habilidade | Classe/decisão | Filtro |
|---|---|---|
| Jogo Espelhado | A preservada | Par alvo/jogo com carta realmente utilizável e descarte seguro; rejeita locks persistentes incompatíveis e respeita Presa. A ilusão física exige essa ação legal. |
| Siga o Reflexo | A preservada | Dois cooperadores distintos. Não prova igualdade do total de cartas dos dois turnos. |
| Espelho do Lixo | A preservada | Topo existente, jogador e Lixo desbloqueado pelo helper canônico. Sem prova de compra completa da pilha. |
| Prisão no Espelho | C revisada | Jogador com pressão, parceiro distinto, jogo existente extensível. Retira prova de alimentação na mão do resgatador. Mantém prioridade do mais pressionado e falha por fase. |
| Pesadelo Eterno | A preservada | Carta verdadeira existente e escolha válida; identidade/sorteio persistidos. Não prova acerto do jogador. |
| Laço do Tigre | B/C revisadas | Dois jogos distintos estruturalmente extensíveis, sem plano conjunto/cartas distintas na mão/descarte conjunto. Falha/garras continuam; elas não proíbem descartar ou jogar em outro destino. |
| Presa Marcada | A preservada | Rota real e segura para alimentar o jogo; bloqueia outros jogos existentes até cumprir, logo retirar esse filtro criaria controle sem saída. |
| Olho do Falcão | A preservada | Naipe com descartes legais e alternativa; preserva conflitos de marca/topo recém-retirado e preferência de combo. |
| Vigilância | A preservada | Alvo com dois jogos realmente alimentáveis; bloquear um deixa outro disponível. Não relaxada como Laço. |
| Mão no Espelho | A preservada | Carta com saída por jogo ou descarte, excluindo conflitos reais. REFLEXO MORTO continua descartável. |
| Reflexo Invertido | A preservada | Rota segura em jogo existente para romper restrição persistente de criar jogo novo. |

Payloads de Laço conservam `eligiblePlayerIds` como informação atual para UI/BOT, possivelmente vazia. Essa informação não é requisito para anunciar o desafio nem uma reserva de jogador; os jogos permanecem congelados por ID. Imagem Falsa, Roubo dos Sonhos e Espelho Estilhaçado continuam compatíveis com saves legados, fora da rotação atual. Não são reintroduzidos para aumentar variedade.

##### Lady Dimitrescu — 8 habilidades

| Habilidade | Classe preservada | Filtro |
|---|---|---|
| Tributo de Sangue | A fase | Não exige prova de redução da mão. |
| Vinho Carmesim | A | Lady ferida e Sede ≥20. Não anuncia cura sem vida perdida/recurso. |
| Marca Carmesim | A | Marca específica realmente jogável por cooperador; não é uma prova conjunta da rodada. |
| Banquete dos Mortos | A | Morto existente e profanação ainda não ativa. |
| Coágulo Carmesim | A | Sede ≥30 e Coágulo ainda não ativo. |
| Portas do Castelo | A fase | Somente fase final; não prova previamente sobrevivência da equipe. |
| As Três Filhas | A | Ao menos uma filha viva e modelo de passivas atual. Não exige cumprir as três. |
| Sangue Impuro | A | Cooperador existente; não exige um coringa utilizável na mão. |

Passivas individuais mantidas: Bela só marca carta realmente jogável; Cassandra só escolhe jogo com contribuição legal; Daniela só reage à retirada real. Sem alvo válido continuam sem punição. Itens, Vínculo, Fúria, regen e HP não foram alterados.

##### Matriarca Esmeralda — 10 habilidades de rotação

| Habilidade | Classe preservada | Filtro |
|---|---|---|
| Semente Viva | A | Slot de ameaça e carta jogável sem lock contraditório; a marca restringe descarte. |
| Raiz Faminta | C já correta | Slot e jogo estruturalmente extensível ainda não ameaçado; não exige carta na mão. |
| Orvalho Restaurador | A | Slot de ameaça; não exige provar seis contribuições. |
| Trepadeiras Gêmeas | C já correta | Slot/jogos extensíveis; pode escolher só um quando permitido pelo estado. |
| Enxerto | C já correta | Slot e dois jogos reais extensíveis distintos; não prova cumprir ambos. |
| Pólen do Lixo | A | Slot, topo real e estado apropriado do Lixo. |
| Colheita | A | Slot e jogador alvo; não prova reduzir a mão. |
| Florescimento Real | A/C já corretas | Slots e objetivos individuais válidos de semente/raiz/pólen, até o limite; sem prova conjunta. |
| Casulo Esmeralda | A | Sem Casulo ativo. |
| Coroa da Primavera | A | Ameaça ativa existente para reforçar. |

Renascimento continua passiva/debug-only, peso zero, fora da seleção normal. Recursos, cancelamento por perda real do alvo, propagação/limites e cura não mudaram. A correção compartilhada permite repetir Orvalho quando for a única habilidade elegível, em vez de ficar sem anúncio.

##### Dominadora — 13 habilidades

| Habilidade | Classe preservada | Filtro |
|---|---|---|
| Coleira | A | Cartas úteis/seguras, até duas, sem eliminar descarte legal. |
| Escolha Forçada | A/C | Jogador e ordem real: alimentação/evolução legal, descarte por naipe com alternativa ou mão com tamanho necessário. Ordens específicas restringem ações; não remover sua rota legal. Não exige provar cumprir redução da mão. |
| Exposição | A | Carta específica jogável e lock de descarte seguro. |
| Troca Forçada | A | Dois jogadores com carta real para a troca. |
| Mãos Atadas | A | Dois jogadores; vínculo ao primeiro jogo não exige solução completa. |
| Posse | A | Jogo extensível não possuído e menos de duas Posses. |
| Etiqueta de Ferro | A | Descarte do naipe exigido e alternativa legais; não contradiz locks. |
| Favorita | A | Dois cooperadores; prioriza menos dominado, sem prova de solução. |
| Dupla Coleira | A | Carta por cooperador, com descarte legal remanescente. |
| Separação | A | Dois cooperadores; nenhum plano conjunto exigido. |
| Controle Absoluto | A | Jogador alvo existente. |
| Quebra de Vontade | A | Alvo com pressão mínima e ≥120 HP perdidos para opção de cura significativa. |
| Ordem Final | A | Dois jogadores com duas cartas individualmente jogáveis cada para o sorteio às cegas após aceitação. Não prova jogar ambas conjuntamente; retirá-lo faria a própria escolha cancelar sem cobrança por falta de cartas para marcar. |

Interdito segue legado fora da rotação. Não se afrouxam locks que podem impedir descarte. As exigências de cartas individuais são diferentes da prova conjunta removida da Barragem.

##### Banqueiro — 8 habilidades

| Habilidade | Classe preservada | Filtro |
|---|---|---|
| Juros Fixos | A fase | Contrato/tributo definidos pelo motor; sem prova de pagar. |
| Taxa de Manutenção | A | Quota da mesma rodada na fase final. |
| Bloqueio de Crédito | A fase | Sem prova de escapar da cobrança. |
| Limite de Crédito | A fase | Limite/contador real; sem prova de cumprir. |
| Juros Compostos | A fase | Pressão calculada pelo estado; sem solução antecipada. |
| Auditoria de Naipe | A fase | Naipe/contrato escolhidos pelo modelo existente; não exige plano coletivo. |
| Penhora | C já correta | Jogo existente estruturalmente extensível; não exige contribuição na mão. |
| Sobretaxa do Lixo | A fase | Aguarda retirada real; não cria prova antecipada de toda a compra. |

Nenhum filtro desses quatro chefes foi removido apenas para forçar distribuição uniforme. Inspeção de fase, capacidade, recursos, bloqueios, escolhas pendentes, resultado/derrota e payloads permanece.

#### Sorteio e diagnóstico

O seletor monta e valida candidatos antes de evitar o último. Havendo duas ou mais opções elegíveis, a última sai. Havendo apenas uma, pode repetir. Introduções de fase conservam seus subconjuntos prioritários e caem na seleção normal se faltarem alvos; debug-only e seleção forçada continuam separados. Sem candidato real continua `null`, sem inventar habilidade/penalidade.

O peso só atua entre candidatos elegíveis: não representa frequência fixa na batalha. Fase-intro e lifecycle dos zumbis também mudam a distribuição. `reasonCode` identifica pré-filtro/payload; `details` detalha os candidatos da Invasão. O diagnóstico não altera consequências nem escreve eventos de jogo.

#### Método estatístico e limites

Comando: `node scripts/boss-eligibility-audit.mjs` na raiz. Pode receber outro commit local como primeiro argumento. Saída detalhada: `.cache/boss-eligibility-audit.json` (regenerável; não versionada). O script verifica que IDs/fases/pesos/HP/limites das definições são iguais à baseline.

64 sementes × 15 cenários × 3 fases = **2.880 sorteios por chefe por versão**, 34.560 no A/B. Também 720 sorteios sequenciais condicionais por chefe/versão, mais 1.024 sorteios de Invasão por versão com os três candidatos elegíveis. Total **45.248 chamadas de seleção/inspeção de distribuição**, além dos probes de elegibilidade.

Cenários: mão pronta/fraca/unitária, mesa vazia/Ás-a-Ás completo, Monte/Mortos esgotados, recurso disponível/limite, pressão com mão fraca, múltiplos alvos, ameaça ativa, zumbis presentes/cadáveres/ressurreições já gastas e estado adversarial sem jogadores. 25% das sementes testam última habilidade, e nas fases 2/3 outros 25% testam introdução de fase. Sequências mantêm combate/mesa congelados, mudando só rodada e histórico de seleção; **não são partidas completas**.

O cenário `repeat_only` sem jogadores é adversarial, não uma mesa normal. `full_resource` pode produzir estado terminal da Matriarca. Vazios legítimos desses cenários não devem ser eliminados à força. Nenhum número abaixo é taxa de vitória, telemetria de partidas, benchmark de aparelho físico ou garantia de balanceamento.

##### Catálogo e média de elegíveis por fase

Média sobre os mesmos 15 cenários, inclusive adversariais. Catálogo exclui Renascimento/debug-only.

| Chefe | Catálogo F1/F2/F3 | Elegíveis F1 antes→depois | F2 | F3 |
|---|---|---|---|---|
| Banqueiro | 4/8/8 | 4,00→4,00 | 7,80→7,80 | 7,80→7,80 |
| Dominadora | 4/8/12 | 3,20→3,20 | 6,80→6,80 | 9,40→9,40 |
| Matriarca | 3/7/10 | 2,20→2,20 | 5,73→5,73 | 7,73→7,73 |
| Dimitrescu | 4/7/8 | 2,73→2,73 | 4,73→4,73 | 5,73→5,73 |
| Nehelenia | 7/10/11 | 4,60→4,87 | 6,13→6,40 | 7,07→7,33 |
| Nemesis | 5/8/11 | 2,13→3,07 | 2,87→4,00 | 5,07→6,67 |

##### Casos sem seleção e repetição

| Chefe | Sem seleção em 2.880 antes→depois | Repetiu último em 2.880 | Vazios sequenciais em 720 | Repetições sequenciais | Maior sequência nova |
|---|---|---|---|---|---|
| Banqueiro | 0→0 | 0→0 | 0→0 | 0→0 | 1 |
| Dominadora | 256→256 | 0→0 | 64→64 | 0→0 | 1 |
| Matriarca | 81→64 | 0→17 | 48→16 | 0→60 | 16 |
| Dimitrescu | 0→0 | 0→0 | 0→0 | 0→0 | 1 |
| Nehelenia | 192→192 | 0→0 | 48→48 | 0→0 | 1 |
| Nemesis | 822→128 | 0→49 | 240→32 | 0→15 | 16 |

Repetições novas são da **única opção válida** nos estados congelados/adversariais, não uma regressão da proteção contra repetir com alternativas. Nemesis restante sem seleção: cenário sem jogadores nas fases 1/2 (64 sementes cada). Nehelenia: mesmo cenário nas três fases. Matriarca: estado terminal/sem candidatos na fase final. Dominadora também conserva casos com mão unitária sem alvo/ordem válida. Não alterar pesos para esconder esses estados.

##### Exemplo de exclusões corrigidas

| Cenário/chefe | Fase | Elegíveis antes→depois | Causa |
|---|---|---|---|
| Mão fraca, Nemesis | 1 | 0→3 | Provas de ataque/jogo/repulsão retiravam Caçada, Tentáculo e Invasão. |
| Mão fraca, Nemesis | 2 | 0→4 | Idem; Impacto agora aceita jogo extensível sem carta imediata. |
| Mão fraca, Nemesis | 3 | 1→7 | Ômega era quase o único; entram Caçada, Tentáculo, Barragem, Extermínio, Invasão e Impacto. |
| Mesa vazia/fechada, Nemesis | 3 | 1→5 | Devorador, Impacto e Extermínio continuam sem destino válido; demais desafios não exigem mesa. |
| Pressão e mão fraca, Nehelenia | 1/2/3 | 3/4/5→5/6/7 | Laço e Prisão deixam de exigir cartas de solução. |
| Mesa vazia, Matriarca | 1 | 1→1 | Elegibilidade não muda, mas 5/64 sorteios vazios viram repetição válida de Orvalho. |
| Sem jogadores, Nemesis | 3 | 1→1 | 49/64 vazios artificiais viram Ômega; nenhum alvo fictício criado. |

JSON registra exclusões por habilidade/cenário/fase e soma por filtro, permitindo distinguir falta de alvo obrigatório de prova removida. Para o baseline, que não tinha `reasonCode`, usa identificador `payload/prerequisite:<id>` e as condições antigas descritas acima.

#### Frequência de cada habilidade

Ocorrências em 2.880 sorteios condicionais por versão/chefe. Contagem zero/vazio não é redistribuída. Pesos intactos.

| Chefe | Habilidade | Antes | Depois |
|---|---|---:|---:|
| Banqueiro | Juros Fixos | 677 | 677 |
| Banqueiro | Taxa de Manutenção | 394 | 394 |
| Banqueiro | Bloqueio de Crédito | 196 | 196 |
| Banqueiro | Limite de Crédito | 516 | 516 |
| Banqueiro | Juros Compostos | 356 | 356 |
| Banqueiro | Auditoria de Naipe | 417 | 417 |
| Banqueiro | Penhora | 108 | 108 |
| Banqueiro | Sobretaxa do Lixo | 216 | 216 |
| Dominadora | Coleira | 446 | 446 |
| Dominadora | Escolha Forçada | 362 | 362 |
| Dominadora | Exposição | 178 | 178 |
| Dominadora | Troca Forçada | 242 | 242 |
| Dominadora | Mãos Atadas | 199 | 199 |
| Dominadora | Posse | 126 | 126 |
| Dominadora | Etiqueta de Ferro | 357 | 357 |
| Dominadora | Favorita | 196 | 196 |
| Dominadora | Dupla Coleira | 179 | 179 |
| Dominadora | Separação | 171 | 171 |
| Dominadora | Controle Absoluto | 92 | 92 |
| Dominadora | Quebra de Vontade | 14 | 14 |
| Dominadora | Ordem Final | 62 | 62 |
| Matriarca | Semente Viva | 392 | 392 |
| Matriarca | Raiz Faminta | 506 | 506 |
| Matriarca | Orvalho Restaurador | 644 | 661 |
| Matriarca | Trepadeiras Gêmeas | 235 | 235 |
| Matriarca | Enxerto | 161 | 161 |
| Matriarca | Pólen do Lixo | 223 | 223 |
| Matriarca | Colheita | 180 | 180 |
| Matriarca | Florescimento Real | 267 | 267 |
| Matriarca | Casulo Esmeralda | 183 | 183 |
| Matriarca | Coroa da Primavera | 8 | 8 |
| Dimitrescu | Tributo de Sangue | 828 | 828 |
| Dimitrescu | Vinho Carmesim | 42 | 42 |
| Dimitrescu | Marca Carmesim | 414 | 414 |
| Dimitrescu | Banquete dos Mortos | 251 | 251 |
| Dimitrescu | Coágulo Carmesim | 41 | 41 |
| Dimitrescu | Portas do Castelo | 171 | 171 |
| Dimitrescu | As Três Filhas | 482 | 482 |
| Dimitrescu | Sangue Impuro | 651 | 651 |
| Nehelenia | Jogo Espelhado | 411 | 411 |
| Nehelenia | Siga o Reflexo | 678 | 629 |
| Nehelenia | Espelho do Lixo | 256 | 242 |
| Nehelenia | Prisão no Espelho | 13 | 28 |
| Nehelenia | Pesadelo Eterno | 233 | 223 |
| Nehelenia | Laço do Tigre | 169 | 275 |
| Nehelenia | Presa Marcada | 135 | 135 |
| Nehelenia | Olho do Falcão | 338 | 321 |
| Nehelenia | Vigilância | 10 | 10 |
| Nehelenia | Mão no Espelho | 365 | 334 |
| Nehelenia | Reflexo Invertido | 80 | 80 |
| Nemesis | Invasão da Horda | 236 | 502 |
| Nemesis | Caçada S.T.A.R.S. | 363 | 577 |
| Nemesis | Tentáculo Infeccioso | 327 | 527 |
| Nemesis | Zona Contaminada | 176 | 176 |
| Nemesis | Comando da Horda | 26 | 26 |
| Nemesis | Lança-Foguetes | 258 | 355 |
| Nemesis | Regeneração Parasita | 6 | 6 |
| Nemesis | Reanimação Viral | 8 | 8 |
| Nemesis | Barragem de Tentáculos | 186 | 284 |
| Nemesis | Extermínio S.T.A.R.S. | 90 | 137 |
| Nemesis | Surto Ômega | 382 | 154 |

Ômega cai porque deixa de monopolizar estados em que os demais desafios eram artificialmente inelegíveis. Prisão/Laço sobem por ampliação legítima de alvos. Banqueiro/Dominadora/Dimitrescu têm distribuição idêntica na amostra; Matriarca só ganha seleções antes vazias.

##### Zumbis

| Zumbi | Escolhido na rotação antes→depois | Elegível em 45 probes isolados | Sorteado entre os três elegíveis (1.024) antes/depois |
|---|---|---|---|
| Agarrador | 88→196 | 18→33 | 364/364 (35,55%) |
| Infectado | 86→203 | 18→33 | 322/322 (31,45%) |
| Devorador | 62→103 | 18→27 | 338/338 (33,01%) |

No A/B com os três disponíveis, o mesmo índice seeded produz exatamente a mesma distribuição. A amostra finita não exige 33,33% exatos. Fora desse conjunto, Devorador tem menos estados elegíveis por mesa inexistente/fechada. Agarrador tem dependência de carta com saída; Infectado precisa de turno restante, não de mão já resolvida. Todos respeitam lifecycle/teto. Evitar o último repelido ocorre só depois de construir candidatos e somente havendo alternativa; esse trecho já estava correto.

#### Testes e interface

- Baseline ampla: **1.228/1.228**.
- Novas regressões: **27**; objetivos impossíveis, punição única, reload/undo, marca/topo/último descarte, cap/cadáver/ressurreição, destino extensível, Prisão/Laço sem solução, última opção, fase-intro, seleção determinística nos seis chefes e BOT terminando legalmente desafios impossíveis.
- Focados finais: **1.062/1.062** (`boss*.test.mjs`, `nemesis*.test.mjs`, `nehelenia*.test.mjs`, `dimitrescu*.test.mjs`).
- Suíte ampla final: **1.255/1.255**, zero falhas/cancelamentos/skip/todo; 27 novas regressões sobre as 1.228 da baseline.
- Edge headless, renderer real: `nemesis-ui.browser.mjs` passou 1920×1080, 1024×768, 844×390, 390×844 e 3840×2160; alvo/ajuda/teclado/toque, snapshot concorrente, lifecycle/cores e descarte. `boss-hud-ux.browser.mjs` passou seis chefes em desktop/tablet 1920/1376/1024 e mobile390, overflow, ajuda e reduced motion.
- Dois testes de browser tinham expectativas textuais anteriores ao polimento já commitado (expulsar/expulsá-lo; texto dos gatilhos de fase e bônus Infectado). Ajustadas apenas assertions para a ajuda atual e mesmos valores; nenhuma mudança de UI para satisfazer strings antigas.

Comandos adicionais: `node --test tests/*.test.mjs`; `git diff --check`. Browser utiliza `PLAYWRIGHT_PATH` configurado no runtime local e Edge instalado. Logs/JSON/screenshots em `.cache/`; não foram adicionados ao Git. Sem prova de dois clientes Firebase reais ou testes em aparelhos físicos.

`git diff --check`: passou, sem erro de whitespace. Git avisa a conversão configurada LF→CRLF, sem erro. `git diff --stat` cobre os 12 arquivos já rastreados; quatro arquivos novos ainda não rastreados são relatório/script/fixture/regressões listados abaixo. Nada foi adicionado ao stage automaticamente.

#### Risco e proposta separada de balanceamento

Mais desafios sem solução aumentam pressão e persistências possíveis. Esse é o comportamento solicitado, mas pode mudar a dificuldade real sem alterar nenhum número. Reanimação/Regeneração/Coroa/Vigilância continuam raras nesta matriz por dependências específicas, não por pesos comprovadamente insuficientes. Não subir pesos com base nesses números condicionais.

Próximo passo proposto, não implementado: playtest de batalhas completas dos seis chefes, registrando fase, conjunto elegível, anúncio, sucesso/parcial/falha, zombie/lifecycle e motivo final. Comparar a participação **quando elegível**, separando fase-intro. Só então discutir pesos se variedade continuar insuficiente. Não há evidência aqui para declarar taxa de vitória ou rebalancear automaticamente.

#### Arquivos

Produção: `js/boss/boss-engine.js`, `js/boss/mechanics/nemesis.js`. Instrumentação: `scripts/boss-eligibility-audit.mjs`, `tests/boss-eligibility-fixture.mjs`. Regressões: `tests/boss-eligibility-audit.test.mjs`, `tests/nemesis-boss.test.mjs`, `tests/nemesis-devourer-entry.test.mjs`, `tests/boss-rework-october.test.mjs`, `tests/nemesis-ui.browser.mjs`, `tests/boss-hud-ux.browser.mjs`.

Documentação: este relatório, `DOCUMENTACAO_CHEFE_DA_MESA.md`, `INVENTARIO_HABILIDADES_CHEFES.md`, `CHECKLIST_REGRESSOES_E_ATUALIZACOES.md`, `REWORK_NEMESIS_MATRIARCA_E_UX_DIMITRESCU_2026-10-08.md` e nota de atualização em `ARQUIVO_HISTORICO/BALANCEAMENTO_NEMESIS.md`. Nenhum arquivo de estratégia do BOT, definição numérica de chefe, CSS, asset ou Service Worker alterado.


---

<a id="arquivo-bot-cooperativo-chefe-2026-10-09"></a>

## Origem: BOT_COOPERATIVO_CHEFE_2026-10-09.md

### BOT cooperativo no modo Chefe — 09/10/2026

As seções iniciais registram a primeira revisão. A segunda revisão, suas
medições e as correções do experimento estão registradas ao final.
Inclui também a revisão de preservação de coringas, após a auditoria de
elegibilidade dos seis chefes; as comparações anteriores permanecem históricas.

#### Escopo e problemas encontrados

Revisão estratégica do `BossBuracoBot`, sem modificar regras, HP, pesos, baralho,
Mortos, dano, canastras ou vitória. `boss-engine.js` e os adaptadores mecânicos
permanecem intactos. Os BOTs dos modos clássicos não foram alterados.

A política anterior rejeitava pilhas grandes do Lixo por tamanho/Monte baixo;
priorizava algumas obrigações com bônus fixos enormes; fazia extensões naturais
incondicionais depois do planejamento; e permitia esvaziamento inseguro no modo
de pânico. Seu fingerprint não incluía mudanças nas restrições do chefe.

#### Implementação

- `js/game/bot-planner.js`: fronteira de informação pública, potencial de mão,
  expectativa do Monte baseada no conjunto desconhecido e histórico público
  curto. Parceiro humano e BOT recebem a mesma fronteira: somente quantidade
  de cartas, sem identidades/ranks da mão; ordem/cartas do Monte e Mortos ocultas.
- `js/boss/boss-bot-strategy.js`: uma política compartilhada pelos seis chefes.
  Cotação do Lixo, validação, contribuições, punições, cura e Ataque Final usam
  o motor canônico em cópias. Não há tabela paralela de consequências.
- `boss-bot.js`: compara compra do Monte, topo protegido e retirada completa;
  prefere rotas naturais longas; compara custo de coringas/sujar jogos com
  consequências reais; preserva descarte e evita batida sabidamente insuficiente.
- Descarte cooperativo favorece modestamente uma carta isolada quando uma
  contribuição pública recente do parceiro indica interesse próximo no naipe.
  Não presume que ele tenha a ponte necessária nem sacrifica sequência própria.
- Planejamento considera potencial Limpa/Real/Ás-a-Ás e escassez gradual com
  Mortos. Limites: 32 cotações legais, shortlist de 20 jogadas, 400 pares de
  ponte, 180 trincas e até 25 contribuições. Trincas usam o Worker existente;
  scans locais cedem execução. Não é busca exaustiva de vários turnos.
- Mudanças de chefe/restrições, ação pública, recursos, turno e mão invalidam
  planos assíncronos; respostas de Worker conferem token. Histórico auxiliar
  fica em WeakMap, não em Firebase/snapshot, e desaparece conservadoramente no
  reload. Execução/commit/undo continuam nos handlers oficiais.
- Novo módulo incluído no precache do Service Worker.

Um objetivo não deve ser obedecido a qualquer preço. Exemplos cobertos: aceitar
falha barata para preservar uma limpa; cumprir quando a falha seria letal;
adiar contribuição pequena que acionaria cura maior do Devorador. Nenhuma
punição ou cura foi reduzida para tornar essas decisões melhores.

#### Comparação reproduzível

Baseline local: `9faa112348b1ba2656a28b342d8f6799a612cc45`.

```sh
node scripts/boss-cooperative-experiment.mjs 9faa112348b1ba2656a28b342d8f6799a612cc45 3 7300
```

24 execuções: antigo/novo × Nemesis/Matriarca × BOT+BOT/parceiro roteirizado+BOT
× sementes 7300–7302. Mesmo baralho físico de 108 IDs e mesma seed do chefe.
O parceiro roteirizado utiliza a política antiga com `isBot=false`: testa a
fronteira humano/BOT, mas **não representa um humano competente**. Sem sleeps
artificiais, Worker desativado nesse experimento headless, limite de 100 turnos.
O adaptador testa ações reais/cotação/consequências e conserva os 108 IDs;
não substitui a orquestração completa da interface/Firebase. Escolhas não
suportadas, limite de turnos e travamento são reportados, nunca como vitórias.

Totais de seis partidas por linha:

| Chefe / política | Limpas | Dano no chefe | Dano nos auxiliares | Lixo completo | Joker em jogo curto | Turnos sem progresso | Esgotamento | Vitórias |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Nemesis / antiga | 6 | 8490 | 0 | 10 | 12 | 76 | 4 | 0 |
| Nemesis / nova | 11 | 9090 | 2465 | 43 | 19 | 72 | 4 | 0 |
| Matriarca / antiga | 12 | 6420 | 0 | 8 | 8 | 62 | 0 | 0 |
| Matriarca / nova | 13 | 9115 | 0 | 31 | 16 | 51 | 1 | 2 |

Definições: dano é `appliedDamage` dos eventos canônicos de contribuição e
Ataque Final, separado pelo alvo, não dano bruto nem saldo líquido após cura.
Limpas inclui a primeira evolução para Limpa/Real/Ás-a-Ás. Turno sem progresso
não teve contribuição nem dano. Joker em jogo curto é um **indicador imperfeito
de gasto**, não prova de desperdício: pode cumprir obrigação e evoluir depois.
Não foi feita classificação manual de todas as cartas desperdiçadas.

Resultado misto: mais limpas, dano e retiradas completas no agregado; menos
turnos ociosos; duas vitórias na Matriarca. Porém o indicador de gasto de Joker
subiu nos dois chefes, e houve uma derrota adicional por esgotamento na
Matriarca. Na dupla BOT+BOT contra a Matriarca, duas sementes também pioraram.
Nemesis ainda não venceu nestas sementes. Portanto **não afirmar superioridade
em todas as situações nem estimar win rate humano a partir desta amostra**.

#### Testes e desempenho

Suíte ampla: **1204/1204**, sem falhas. Novos cenários determinísticos cobrem
parceiro humano/BOT, Lixos 20/50, Monte 30/15/8/0, retirada boa/ruim/topo
protegido, limpa próxima, reserva de extensão, cooperação pública, ausência
de informação oculta, punição barata/letal, guard de batida, Nehelenia
Desorientada, cancelamento, reload/undo e resposta stale do Worker.
Regressões Nemesis/Lixo/chefes/itens/modos clássicos continuam passando.

Browser Edge headless com Worker real, desktop/tablet/mobile emulados:

```sh
node tests/boss-cooperative-performance.browser.mjs
```

Se Playwright não estiver no projeto, indicar seu caminho em `PLAYWRIGHT_PATH`.
Uma amostra por cenário, sem erro de página; tempos não são percentis:

| Perfil | Cotar Lixo 20 | Cotar Lixo 50 | Worker + mão 17 | Stress mão 50 |
| --- | ---: | ---: | ---: | ---: |
| 1920px / CPU 1× | 11 ms | 20 ms | 31 ms | 129 ms |
| 1376px / CPU 4× | 50 ms | 98 ms | 128 ms | 656 ms |
| 390px / CPU 6× | 85 ms | 152 ms | 209 ms | 1163 ms |

A política antiga recusou as duas pilhas úteis nesses cenários. A nova aceitou
ambas legalmente e formou limpa nos testes de planejamento. Está mais cara:
o stress mobile de 50 cartas passou de um segundo. CPU reduzida não equivale
a aparelho físico; cotações/ranking ainda executam no thread principal.

#### Limitações e validação pendente

- Heurística limitada, não solução ótima nem previsão garantida do próximo
  turno. A projeção de fim da rodada não promete contribuições da mão oculta
  do parceiro; normalizadores podem descartar alvos não observáveis na cópia.
- Cooperação por histórico público é conservadora e perde o cache no reload.
- Ainda falta reduzir gasto ineficiente de coringas, validar risco de estoque
  e calibrar em outras sementes sem sobreajustar a esta pequena amostra.
- Outros quatro chefes têm cobertura de regressão/estado público, mas não
  comparação de batalhas completas antiga/nova neste experimento.
- Validar em celular/tablet físicos, partidas humano+BOT e dois clientes
  Firebase reais, incluindo reconexão simultânea. Testes stale/cancelamento
  locais não comprovam sincronização de rede ponta a ponta.
- Sem commit, push, deploy ou mudanças de balanceamento.

#### Segunda revisão — problemas comprovados

- **Orçamento do Lixo:** com 20 jogos existentes `3–4–5♣`, topo `6♣` e
  `4♣/5♣/7♣` na mão, a política da primeira revisão consumia suas 32
  avaliações em extensões. Nenhum jogo novo era avaliado, embora `4–5–6♣`
  permitisse adquirir legalmente toda a pilha útil. Reproduzido antes da
  correção e coberto com Lixos de 20/50 cartas, permutação da mão/mesa e
  limites explícitos de candidatos.
- **Cálculos repetidos:** cada candidato recalculava o potencial da mão para
  remover cada carta adquirida. O perfil de CPU da reprodução com mão/Lixo
  de 50 cartas concentrou aproximadamente 88% das amostras nas funções e
  callbacks de potencial/ranks. Não era principalmente o Worker de trincas.
- **Cauda de latência real:** a semente 7307 revelou um turno de Nemesis com
  159.318 ms no perfil isolado, enquanto todas as ações executadas somaram
  menos de 1 ms. Cerca de 99% das amostras estavam na projeção do prazo,
  que anunciava a próxima habilidade e tentava provar Extermínio com mãos
  ocultas. Após limitar a projeção à rodada atual, o mesmo replay chegou ao
  turno em 135 ms. Não se trata de reduzir o orçamento da regra do Agarrador.
- **Experimento de vitória:** o adaptador anterior ignorava `boss.defeated`
  após uma contribuição letal. `app.js` encerra imediatamente nesse caso.
  O adaptador agora espelha esse encerramento; não modifica o motor.
  As vitórias/esgotamentos do experimento anterior não devem ser usados como
  baseline dessa segunda revisão.
- **Projeção estratégica:** a política também podia projetar punições futuras
  depois de uma contribuição já letal. O ranking agora reconhece a mesma
  flag canônica de vitória antes de calcular o prazo. Regressão cobre o caso
  com Joker: uma vitória real não deve ser recusada para preservar a carta.

O aumento de Joker em jogos curtos **não comprovava desperdício**. Não se
transformou essa hipótese numa proibição de jogar coringas. Também não foi
encontrado acesso novo à mão oculta do parceiro: a fronteira pública permanece
igual para humano e BOT.

#### Segunda revisão — implementação e decisões descartadas

- Potencial indexado por naipe/rank e marginais de remoção em lote, com o
  mesmo valor da primeira revisão. Teste compara 120 mãos variadas e cada
  remoção contra a fórmula anterior, incluindo Ás alto/baixo, duplicatas,
  Joker, 2 natural/coringa e ordem dos jogos. Não é um novo validador.
- Cotação oficial de todos os destinos gerados; até **64 simulações**:
  preserva os 32 candidatos anteriores e reserva espaço para categorias
  topo/completo × existente/novo. Candidatos adicionais são ordenados por
  potencial. O placar final continua usando consequências canônicas. Não
  foram adicionadas buscas de trios da mão para extensões nem busca exaustiva.
- Pré-visualizações de jogos reutilizadas somente dentro da mesma iteração;
  nenhum cache de plano em snapshot/Firebase. Checagens de fingerprint,
  cancelamento e token continuam antes da execução e depois das pausas.
- Pausas também no scan de jogos novos. No browser, `scheduler.yield()` ou
  `MessageChannel` evita o atraso mínimo dos timers aninhados; timer continua
  disponível em ambientes sem essas APIs. Nenhum novo Worker ou animação.
- `completeBossPlayerTurn(..., {deferNextBossTurn:true})` é usado somente nas
  cópias de análise: resolve punições, passivas, cura, fim da rodada e fase
  canonicamente, mas deixa o próximo anúncio aguardando. O padrão permanece
  `false`; jogo real, humano, BOT, pesos e critérios de elegibilidade continuam
  como antes. Regressões dos seis chefes conferem o fechamento e o padrão.
- Cooperação por ações públicas continua conservadora: não sacrifica carta
  conectada com base apenas no naipe que o parceiro mostrou.
- Cache local atualizado para `buraco-v290`, para os módulos corrigidos não
  ficarem presos ao cache antigo quando o usuário publicar a atualização.

Uma variante intermediária com reserva mais forte de coringa em extensões e
pré-seleção diferente de trincas foi **rejeitada**, não entregue. Na primeira
medição exploratória, reduziu canastras/dano, especialmente na Matriarca
(20→7 limpas no adaptador ainda não corrigido). Também foi rejeitada a
substituição de todos os candidatos antigos por uma estimativa barata.
Esses dados serviram para rejeitar as variantes, não para afirmar vitórias
ou balanceamento. Custos de coringa e ordem de trincas da primeira revisão
permanecem; não há bônus novo para o 2 natural nem regra absoluta de reserva.

#### Segunda revisão — método de comparação

Baseline: **`f0d4551b1718af3020429f12f566ce2ad953ee27`**, a primeira revisão,
não o commit anterior a ela. O loader materializa toda a árvore JS antiga
num diretório temporário próprio e remove-o ao terminar. Importar só o
`boss-bot.js` antigo permitiria que ele usasse o planejador novo.

```sh
node scripts/boss-cooperative-experiment.mjs f0d4551 8 7300 .cache/bot-review2-delivered.jsonl
node tests/boss-cooperative-performance.browser.mjs
node --cpu-prof --cpu-prof-dir=.cache scripts/boss-hand-profile.mjs f0d4551
node --cpu-prof --cpu-prof-dir=.cache scripts/boss-hand-profile.mjs
node scripts/boss-tail-profile.mjs 7307 30
node --test tests/*.test.mjs
git diff --check
```

São **64 execuções finais**: antiga/nova × dois chefes × duas composições ×
oito sementes (7300–7307), mesmas 108 cartas físicas, Mortos e seed do chefe.
Ambas usam o adaptador de encerramento corrigido. O parceiro roteirizado
continua fixo na política antiga com `isBot=false`, sem acesso privilegiado
às cartas: não representa a competência de um humano. Limite de 100 turnos;
Worker desativado no experimento de batalhas e exercitado no browser.

##### Métrica de coringas

`tests/boss-wildcard-audit.mjs` usa apenas estado observável e validação oficial.
Para cada coringa efetivamente gasto, tenta substituir **uma carta** por uma
natural disponível na própria mão, incluindo 2 se canonicamente natural.

- **Dominado:** alternativa legal, sem batida insegura, que preserva o coringa
  e não piora derrota/vitória, perigo, HP restante dos inimigos nem quantidade
  de boas canastras na projeção canônica do prazo.
- **Benefício observado:** sem alternativa dominadora encontrada e com dano
  líquido, alívio de perigo, boa canastra, vitória ou prevenção de derrota
  observável na projeção. Isso não prova que foi a melhor jogada futura.
- **Não comprovado:** nenhuma dessas evidências. Não significa desperdício.

As três categorias somam o gasto; o 2 natural é contado separadamente, nunca
como coringa. Essa auditoria não faz busca global/multiturno nem substituições
de múltiplas cartas. Zero casos dominados **não prova ausência de desperdício**.
O antigo contador de Joker em jogo curto permanece apenas como diagnóstico.
Retirada completa/protegida é classificada pelo campo `protected` da cotação
oficial, não pela quantidade adquirida: um Lixo inteiro de uma carta continua
sendo retirada completa. Regressão distingue esse caso do topo protegido.
Tempos de batalha descontam a classificação contrafactual e incluem o
adaptador/cálculo de regras; não são latência de rede ou duração de animações.

#### Segunda revisão — resultados finais das batalhas

Cada coluna agrega 16 partidas por chefe/versão: oito BOT+BOT e oito com
parceiro roteirizado fixo. **Os 32 pares antiga/nova tiveram os mesmos valores
de jogo abaixo**, não somente a mesma soma. A correção do orçamento do Lixo
é demonstrada pelos cenários dirigidos; essa situação não mudou os resultados
das sementes de batalha escolhidas.

| Indicador | Nemesis antiga | Nemesis nova | Matriarca antiga | Matriarca nova |
|---|---:|---:|---:|---:|
| Canastras limpas | 48 | 48 | 20 | 20 |
| Dano efetivo ao chefe | 26480 | 26480 | 22110 | 22110 |
| Dano efetivo aos auxiliares | 6035 | 6035 | 0 | 0 |
| Retiradas completas do Lixo | 137 | 137 | 104 | 104 |
| Retiradas de topo protegido | 12 | 12 | 6 | 6 |
| Coringas gastos (Joker + 2 coringa) | 122 | 122 | 112 | 112 |
| Gastos com alternativa natural dominadora encontrada | 0 | 0 | 0 | 0 |
| Gastos com benefício observado | 115 | 115 | 110 | 110 |
| Gastos sem benefício comprovado pela métrica | 7 | 7 | 2 | 2 |
| Cartas 2 gastas como coringa | 70 | 70 | 70 | 70 |
| Cartas 2 jogadas como natural | 44 | 44 | 26 | 26 |
| Turnos sem contribuição/dano | 239 | 239 | 168 | 168 |
| Total de turnos medidos | 721 | 721 | 564 | 564 |
| Vitórias / derrotas | 0 / 16 | 0 / 16 | 0 / 16 | 0 / 16 |
| Derrotas por esgotamento | 16 | 16 | 6 | 6 |
| Derrotas por Flores no máximo | 0 | 0 | 10 | 10 |

Conclusão negativa importante: **não foi demonstrada melhora de vitória,
progresso ou preservação de coringas nessas batalhas**. Tampouco o gasto maior
da primeira revisão foi confirmado como desperdício por essa auditoria
limitada. As regressões dirigidas demonstram que uma alternativa natural
superior é preferida, inclusive 2 natural, e que um coringa vantajoso continua
permitido. Não justificar uma penalidade universal com o contador de Jokers
curtos nem apresentar esses números como vitória esperada de jogadores humanos.

##### Tempo das decisões nas batalhas

Em milissegundos; P95 calculado sobre todos os turnos de cada grupo, não sobre
as médias das partidas. Mesmo processo Node, sem Worker/pausas artificiais.

| Chefe / versão | Amostras | Média | P95 | Pior |
|---|---:|---:|---:|---:|
| Nemesis antiga | 721 | 363,8 | 465,9 | 155381,3 |
| Nemesis nova | 721 | 133,3 | 435,2 | 1247,0 |
| Matriarca antiga | 564 | 130,0 | 412,5 | 856,8 |
| Matriarca nova | 564 | 122,1 | 408,2 | 933,9 |

O pico antigo do Nemesis apareceu na semente 7307. Em reprodução isolada com
perfil de CPU, o turno 30 levou 159318ms antes e 135ms depois de adiar somente
o anúncio futuro nas cópias; as ações reais do motor somaram menos de 1ms.
O anúncio seguinte tentava provar Extermínio/soluções conjuntas a partir da
mão oculta substituída por placeholders e dominava o perfil. A média do
Nemesis é fortemente influenciada por esse outlier: não declarar que todos
os turnos ficaram três vezes mais rápidos. Na Matriarca, o pior tempo final
**aumentou**, apesar de média/P95 menores.

#### Segunda revisão — browser e responsividade

Edge headless, Worker real, mesmas versões e cenários, warm-up e ordem antiga/
nova alternada. 9 medições por cenário/versão/perfil: **324 medições comparativas**.
CPU 1× em 1920px, 4× em 1376px e 6× em 390px; tablet/celular têm toque emulado.
Com nove amostras, o P95 pelo método de nearest-rank coincide com o pior caso.
Cada célula abaixo é **média / P95 / pior**, em milissegundos.

| Perfil | Cenário | Antiga | Nova |
|---|---|---:|---:|
| Desktop | Lixo 20 | 2,3 / 2,9 / 2,9 | 1,1 / 1,5 / 1,5 |
| Desktop | Lixo 50 | 17,1 / 18,9 / 18,9 | 0,9 / 1,2 / 1,2 |
| Desktop | 20 jogos, Lixo 20 | 11,3 / 13,1 / 13,1 | 13,5 / 15,5 / 15,5 |
| Desktop | 20 jogos, Lixo 50 | 10,9 / 12,1 / 12,1 | 13,1 / 14,1 / 14,1 |
| Desktop | Mão 17 | 17,2 / 24,3 / 24,3 | 15,8 / 16,7 / 16,7 |
| Desktop | Mão 50 | 115,3 / 149,0 / 149,0 | 99,6 / 176,6 / 176,6 |
| Tablet | Lixo 20 | 10,9 / 13,9 / 13,9 | 5,2 / 7,3 / 7,3 |
| Tablet | Lixo 50 | 100,8 / 146,6 / 146,6 | 4,9 / 6,3 / 6,3 |
| Tablet | 20 jogos, Lixo 20 | 84,3 / 98,7 / 98,7 | 91,0 / 106,7 / 106,7 |
| Tablet | 20 jogos, Lixo 50 | 73,2 / 97,5 / 97,5 | 93,3 / 117,2 / 117,2 |
| Tablet | Mão 17 | 66,9 / 88,7 / 88,7 | 61,3 / 67,1 / 67,1 |
| Tablet | Mão 50 | 621,3 / 750,6 / 750,6 | 473,8 / 539,3 / 539,3 |
| Celular | Lixo 20 | 18,2 / 21,6 / 21,6 | 9,1 / 10,8 / 10,8 |
| Celular | Lixo 50 | 138,0 / 148,8 / 148,8 | 9,2 / 11,7 / 11,7 |
| Celular | 20 jogos, Lixo 20 | 110,7 / 131,0 / 131,0 | 133,0 / 165,1 / 165,1 |
| Celular | 20 jogos, Lixo 50 | 114,7 / 133,8 / 133,8 | 132,7 / 158,3 / 158,3 |
| Celular | Mão 17 | 100,6 / 118,8 / 118,8 | 93,7 / 110,6 / 110,6 |
| Celular | Mão 50 | 1195,7 / 1479,2 / 1479,2 | 773,8 / 898,1 / 898,1 |

No stress móvel de 50 cartas, média −35% e P95 −39%; maior long task
279→123ms. No tablet, maior long task 155→82ms. Não significa ausência de
bloqueio: o ranking canônico continua síncrono em trechos. Com muitos jogos,
dar oportunidade a até 64 candidatos custa mais que os 32 antigos; média
piorou em todos os perfis, chegando a +27% no tablet. No celular, maior long
task desse cenário aumentou de 135 para 159ms (Lixo 50). No desktop, o P95 da
mão de 50 também piorou (149→177ms). Essas regressões ficam registradas,
não foram escondidas escolhendo apenas o cenário favorável.

O fallback real de `MessageChannel`, com `scheduler` desabilitado, completou
o stress e cancelamento nos três perfis. Três medições adicionais por perfil:
desktop 210/220/207ms, tablet 434/502/468ms, celular 785/759/732ms. No desktop
foi mais lento que o caminho nativo; não prometer o mesmo ganho em browsers
antigos. Worker obsoleto foi recusado nos três perfis. São emulações, não
testes em aparelhos físicos nem medição de rede/Firebase.

#### Segunda revisão — regressões e limites permanentes

- **174/174 testes focados**: segunda revisão, estratégia cooperativa,
  pacote de chefes de outubro, Lixo, estabilidade do BOT e Service Worker.
- **1228/1228 testes da suíte ampla**, incluindo regressões dos seis chefes
  e modos clássicos. Os logs de erros simulados dos mocks de laboratório
  são esperados por esses testes; não são falhas de execução no browser.
- Browser desktop/tablet/mobile passou: cotação completa após muitos destinos,
  canastra natural, Worker real, resposta obsoleta e fallback/cancelamento.
- Potencial/marginais equivalentes em 120 mãos; Lixo 20/50 e permutações;
  orçamento 0/1 respeitado e classificação do Lixo unitário; coringa dominado/útil e 2 natural; pista pública
  fraca do parceiro; estado sincronizado alterado durante yield; vitória
  canônica imediata; fechamento diferido preserva as consequências dos seis
  chefes e o fluxo real padrão.
- Monte baixo/zero, ausência de Limpa, batida/Mortos e mão oculta permanecem
  cobertos pela primeira revisão, cuja suíte continua passando.

Limites: shortlist não exaustiva, extensões do Lixo geradas com zero/uma carta
auxiliar e jogos novos com pares; 32 incumbentes mantêm alguma influência da
ordem original. A reserva das categorias elimina a starvation reproduzida,
não garante ótimo global. Coringa sem alternativa dominadora encontrada não
é automaticamente eficiente; é preciso mais estados e horizonte maior para
afirmar isso. O problema de esgotamento continua nas batalhas medidas.
Playtest humano competente, aparelhos físicos, batalhas completas dos outros
quatro chefes e dois clientes Firebase reais continuam pendentes.

Arquivos de evidência locais (ignorados pelo Git):
`.cache/bot-review2-delivered.jsonl`,
`.cache/bot-review2-performance-delivered.json`, perfis de mão e turno.
Os scripts e tabelas ficam no repositório para reprodução. Nenhum commit,
push ou deploy realizado.

##### Arquivos desta segunda revisão

- Produção: `boss-bot.js`, `js/game/bot-planner.js`,
  `js/boss/boss-bot-strategy.js`, `js/boss/boss-engine.js` (opção de análise),
  `service-worker.js` (versão do cache).
- Verificação: `tests/boss-cooperative-fixture.mjs`,
  `tests/boss-cooperative-second-review.test.mjs`,
  `tests/boss-wildcard-audit.mjs`, `tests/boss-cooperative-performance.browser.mjs`.
- Reprodução: `scripts/boss-cooperative-experiment.mjs`,
  `scripts/boss-baseline-loader.mjs`, `scripts/boss-hand-profile.mjs`,
  `scripts/boss-tail-profile.mjs`.
- Documentação: este relatório e `CHECKLIST_REGRESSOES_E_ATUALIZACOES.md`.

#### Preservação de coringas — terceira revisão, 09/10/2026

##### Causa comprovada e limites da reprodução

`rankBossDiscardPickups()` descontava `wildcardCost()` na pré-seleção, mas não
no score final comparado com o Monte. O custo influenciava quem era avaliado,
não se valia a pena executar a retirada. A abertura direta já descontava o
custo. Também faltava cobrar coringas nas continuações simuladas dos planos.
O bônus de cartas naturais excluía todos os 2, inclusive o 2 natural legal.

As duas imagens mostram o resultado, não a origem da compra/obrigação nem a
mão completa do BOT. Não permitem afirmar que aquelas jogadas específicas
vieram do Lixo. Reproduções usam A♠–Joker–3♠ e 10♠–J♠–2♥–K♠, sem Morto,
Monte59/61/80 e Infecção0/8. Nas mãos controladas sem benefício adicional, a
política antiga **já recusava** a abertura direta; o defeito comprovado está
no score final da compra. A reprodução do Lixo do segundo caso forma o trio
sujo inicial, não garante que a contribuição real fotografada tenha seguido
esse caminho. Estados mais complexos ainda podem justificar uma abertura.

##### Política entregue

- Mesmo custo compartilhado na pré-seleção e no placar final do Lixo, nas
  jogadas da mão e em continuações efetivamente simuladas. Conservado o custo
  calibrado anterior de reserva (100, modulado pela escassez) e sacrifício da
  limpa; não adicionado um veto nem uma penalidade universal maior.
- Pequeno custo de oportunidade para jogo curto ainda limpo que fica sujo:
  substitui o único coringa por candidatos naturais, usando o validador
  canônico. Estima a chance de reposição pelo conjunto público não visto,
  cópias expostas e até seis compras futuras; não olha cartas do Monte,
  Mortos ou parceiro. Peso é a diferença do potencial já existente, não uma
  nova tabela de canastras. Zero quando as cópias já estão expostas; nenhuma
  promessa de obter a carta. É uma aproximação de curto horizonte.
- Joker/2 coringa pagam reserva. 2 canonicamente natural não paga e recebe o
  mesmo bônus das outras naturais. Dano efetivo/proteção, cura, punição,
  vitória/derrota, potencial de mão/mesa e escassez com Mortos continuam
  calculados pelas avaliações e simulações existentes.
- Guardar cartas continua uma alternativa com score incremental0; jogada
  da mão precisa superar0, retirada precisa superar a expectativa pública do
  Monte. Lixo útil, canastra e consequência letal podem superar a reserva.
- Sem alteração de elegibilidade/habilidades, números de combate, regras do
  Lixo/Mortos/canastras, BOT clássico, fronteira pública, Worker, orçamento,
  cancelamento ou fingerprint. Cache local passa a `buraco-v292`.

##### Diagnóstico sem poluir o jogo

Resultados do ranking expõem `diagnostics`: score do prazo, bônus natural,
reserva, sacrifício, oportunidade limpa, custo de continuações, isolamento,
quantidade/valor das cartas adquiridas e efeito previsto da habilidade
(recurso/derrota com e sem ação, variação ponderada de vida inimiga).
`cleanPotentialDelta` inclui evolução de canastra/comprimento, não é chance
garantida de completar uma Limpa. Valores são estratégicos, não dano extra.

No console do DevTools existente, sem novo botão/aviso na interface:

```js
const { inspectBossBotDecision } = await import('./js/boss/boss-bot-strategy.js');
const s = window.getState();
const botIndex = s.players.findIndex(p => p.isBot);
inspectBossBotDecision(s, botIndex);
// Opcional: terceiro argumento com jogadas {meldIndex, cardIds, followups}.
```

O diagnóstico é somente leitura, não executa ações e usa a mão do BOT e dados
públicos. Sem terceiro argumento, mostra Monte/guardar e as compras do Lixo;
não afirma enumerar todas as aberturas da mão. Nenhum log de carta oculta ou
novo dado persistido em snapshot/Firebase.

##### Comparação dirigida antes/depois

Baseline isolada: `946c2addcf1b5392e568a93d366d33791bf46b03`, incluindo a
auditoria de elegibilidade. 48 estados (Joker/2 × seis situações × sementes
41/73/901/7307), 96 avaliações antiga/nova; compras legais e execução da mão.
Os mesmos critérios de segurança do adaptador são usados nas duas versões.

Scores da semente73, Monte61, Infecção8, Lixo de uma carta:

| Situação | Joker antes→depois | 2 coringa antes→depois | Decisão nova |
|---|---:|---:|---|
| Sem obrigação, Lixo pequeno | 23→−78,61 | 27,75→−73,86 | Monte; guardar coringa |
| Caçada, falha barata | 47,49→−54,12 | 52,24→−49,37 | Aceitar falha; guardar |
| Caçada, falha letal (Infecção99) | 98957,52→98855,92 | 98962,27→98860,67 | Usar coringa |
| Lixo útil com21 cartas | 303→201,39 | 307,75→206,14 | Adquirir Lixo completo |
| Contribuição vence agora | 100018,68→99917,08 | 100018,68→99917,08 | Vencer, sem hesitação |

Monte esperado8,97 no caso Joker e10,71 no 2; Lixo rico tem outra expectativa
pública. 2 natural em A–2–3: custo0 e score de compra21,75→33,75. A reserva
total dos trios sujos é101,61 (100 já calibrados +1,61 de oportunidade), não
um novo peso enorme. Guardar/baixar da mão já era preferível nos casos baratos.
Scores podem ser positivos mesmo quando o guard de batida impede execução;
o executor continua validando descarte/Mortos/vitória canonicamente.

##### Batalhas com as mesmas sementes

16 execuções: antiga/nova × Nemesis/Matriarca × BOT+BOT/parceiro roteirizado
fixo × sementes7300/7301. Mesmo baralho108IDs, Mortos e seed; até100 turnos.
Parceiro roteirizado usa a baseline com `isBot=false`, não representa um
humano competente. Worker desativado no experimento; testado no browser.

Cada coluna agrega quatro partidas:

| Indicador | Nemesis antes | Depois | Matriarca antes | Depois |
|---|---:|---:|---:|---:|
| Canastras limpas | 6 | 12 | 2 | 9 |
| Coringas gastos (Joker + 2 coringa) | 35 | 25 | 24 | 24 |
| 2 como coringa | 20 | 11 | 16 | 13 |
| 2 como natural | 9 | 15 | 0 | 11 |
| Dano aplicado ao chefe | 5665 | 7385 | 2480 | 5590 |
| Dano aplicado nos auxiliares | 1730 | 660 | 0 | 0 |
| Lixo completo | 37 | 31 | 32 | 24 |
| Turnos sem contribuição/dano | 56 | 51 | 34 | 43 |
| Turnos totais | 187 | 170 | 104 | 143 |
| Vitórias | 0 | 1 | 0 | 0 |

Limitações/regressões: dano nos auxiliares do Nemesis diminuiu. Gasto total
de coringas não diminuiu na Matriarca e houve mais turnos sem contribuição.
Antes, quatro derrotas dela eram por Flores; depois, três por esgotamento e
uma por Flores. Uma vitória nova no Nemesis **não é taxa de vitória estimada**.
Nemesis continua com três derrotas por esgotamento. Não declarar melhora
uniforme nem rebalancear números com base nesta amostra pequena.

##### Regressões e reprodução

- 28 regressões novas: duas sequências, Joker/2, Monte59/61/80, Infecção0/8,
  guardar/Monte, custo final do Lixo, obrigação barata/letal, Lixo rico,
  vitória, canastra útil, 2 natural, continuações, reposições públicas e
  invariância a cartas ocultas/reload, sem mutar o estado.
- Focados: **1219/1219**; suíte ampla: **1283/1283**, sem falhas.
- Edge headless desktop1920/tablet1376/mobile390, CPU1×/4×/6×: Worker real,
  token obsoleto, fallback MessageChannel/cancelamento, natural longa e Lixo
  útil após muitos destinos. Emulação não equivale a aparelho físico ou rede.
- `git diff --check` sem erro. Sem stage/commit/push/deploy.

Browser comparativo: 324 medições (nove por versão/cenário/perfil). Média /
P95 (= pior, pois são nove amostras), ms arredondados, baseline946c2ad:

| Perfil / cenário | Antes | Depois |
|---|---:|---:|
| Desktop,20 jogos/Lixo50 | 12/13 | 13/15 |
| Desktop,mão50 | 92/102 | 95/105 |
| Tablet,20 jogos/Lixo50 | 105/117 | 111/134 |
| Tablet,mão50 | 568/673 | 589/660 |
| Mobile,20 jogos/Lixo50 | 184/202 | 202/250 |
| Mobile,mão50 | 1057/1174 | 1088/1235 |

Há custo adicional nas avaliações/diagnósticos: não foi uma otimização de
latência. Stress móvel ainda supera um segundo; Worker/pausas/cancelamento
passarem não significa ausência de long tasks. Sem promessa de melhoria de
desempenho ou extrapolação das emulações para aparelhos físicos.

```sh
node scripts/boss-wildcard-preservation-audit.mjs 946c2ad
node scripts/boss-cooperative-experiment.mjs 946c2ad 2 7300 .cache/bot-wildcard-preservation-battles.jsonl
node --test tests/boss-wildcard-preservation.test.mjs
node --test tests/*.test.mjs
# Browser: configurar PLAYWRIGHT_PATH e BOT_BASELINE=946c2ad.
node tests/boss-cooperative-performance.browser.mjs
git diff --check
```

Evidências locais regeneráveis/ignoradas: `.cache/bot-wildcard-preservation-*`.
Arquivos: estratégia e versão do Service Worker; novo script de auditoria,
fixture e teste `boss-wildcard-preservation`; este documento e checklist.
Busca permanece limitada; reposição de uma natural não é planejamento ótimo
multiturno. Batalhas dos outros quatro chefes, humanos competentes, aparelhos
físicos e sincronização Firebase real continuam pendentes.


---

<a id="arquivo-revisao-textos-chefes-2026-10-09"></a>

## Origem: REVISAO_TEXTOS_CHEFES_2026-10-09.md

### Revisão dos textos dos chefes — 09/10/2026

Revisão editorial do guia de habilidades, painel laranja e ajudas. Sem mudanças de regras, números, pesos, BOT ou balanceamento. Alterações anteriores no staging foram preservadas.

#### Cobertura

Foram conferidas as 62 habilidades do catálogo local, incluindo Renascimento. O teste `boss-player-language.test.mjs` percorre as 136 combinações de habilidade e fase disponíveis, exige ajuda e instrução, procura abreviações técnicas e verifica que consultar a apresentação não altera o estado.

| Chefe | Habilidades conferidas |
| --- | --- |
| Banqueiro | Juros Fixos; Tarifa de Manutenção; Bloqueio de Crédito; Auditoria de Naipe; Penhora; Juros Compostos; Limite de Crédito; Ágio do Lixo |
| Dominadora | Coleira; Escolha Forçada; Exposição; Troca Forçada; Mãos Atadas; Posse; Etiqueta de Ferro; Favorita; Dupla Coleira; Separação; Controle Absoluto; Quebra de Vontade; Ordem Final |
| Matriarca | Semente Viva; Raiz Faminta; Orvalho Restaurador; Trepadeiras Gêmeas; Enxerto; Pólen do Lixo; Colheita; Florescimento Real; Casulo Esmeralda; Coroa da Primavera; Renascimento |
| Dimitrescu | Tributo de Sangue; Vinho Carmesim; Marca Carmesim; Banquete dos Mortos; Coágulo Carmesim; Portas do Castelo; As Três Filhas; Sangue Impuro |
| Nehelenia | Jogo Espelhado; Siga o Reflexo; Espelho do Lixo; Prisão no Espelho; Pesadelo Eterno; Laço do Tigre; Presa Marcada; Olho do Falcão; Vigilância; Mão no Espelho; Reflexo Invertido |
| Nemesis | Invasão da Horda; Caçada S.T.A.R.S.; Tentáculo Infeccioso; Zona Contaminada; Comando da Horda; Lança-Foguetes; Regeneração Parasita; Reanimação Viral; Barragem de Tentáculos; Extermínio S.T.A.R.S.; Surto Ômega |

Textos já claros foram mantidos. Foram revisadas também as ajudas de itens/debuffs das filhas, passivas dos zumbis, progressão de fase e mensagens antigas ainda apresentáveis.

#### Correções principais

- Renascimento ganhou instrução e ajuda próprias. Uma descrição técnica salva anteriormente não reaparece como instrução no painel. O teste de HUD deixou de excluir essa habilidade.
- O guia de Enxerto deixou de afirmar incorretamente que a falha parcial sempre dá uma Flor. A ajuda continua respeitando a regra de partidas antigas já anunciadas.
- Removidas expressões de implementação, como `tier`, `créditos excedentes`, condições comprimidas e explicações de seleção interna, nas ajudas revisadas.
- Custos, prazos e exceções relevantes foram preservados, mas descritos como ações e consequências para o jogador.

#### Validação visual

O teste de navegador usa o renderer e popover reais extraídos da aplicação, em uma página de teste local. Verifica desktop (1920 px), tablet (1376 px) e celular (390 px), com exemplos dos seis chefes e Renascimento, toque, fechamento por Escape, limites do popover e ausência de erro de JavaScript. Não representa uma partida completa manual em cada dispositivo.


---

<a id="arquivo-etapa-1-playtest-p0-2026-10-10"></a>

## Origem: ETAPA_1_PLAYTEST_P0_2026-10-10.md

### Etapa 1 — correções do playtest cooperativo de 10/10/2026

**Relatório histórico de causas e evidências.** Status atual no [resumo do checklist](../CHECKLIST_PLAYTEST_CHEFES_2026-10-10_ATUALIZADO.md#resumo-executivo-do-checklist--estado-em-10102026). Correções técnicas entregues não devem ser refeitas para obter homologação humana. O espaçamento próprio para cartas com item mencionado na execução inicial foi posteriormente removido a pedido do usuário; vale o espaçamento original da mão, conforme Etapa 2/pacote consolidado. Contagens de testes/cache abaixo descrevem este lote, não a última versão.

Referência principal: `CHECKLIST_PLAYTEST_CHEFES_2026-10-10_ATUALIZADO.md`, P0-01 a P0-11. Checklist atualizado e vídeo anexados pelo usuário foram lidos/examinados; as cópias inicialmente indicadas em `docs/` e `.cache/playtest/` não existiam. O checklist foi acrescentado a `docs/`; o vídeo foi lido diretamente do anexo em `C:/Users/gabri/Videos/Captures/`.

#### Causas e correções

| Item | Causa encontrada / resultado |
| --- | --- |
| P0-01 — Granada | `renderHand` preservava o nó físico da carta, mas copiava a nova face com `innerHTML`. Essa serialização perdia o `onclick` do botão filho. Uma marca NOVA/compra/efeito que mudasse a face deixava o item sem resposta; o item vizinho sem mudança continuava funcionando. Agora os filhos vivos são movidos com `replaceChildren`, mantendo handlers. Também foi conferida a sobreposição entre contextos de empilhamento das cartas: somente cartas com item recebem espaço próprio, sem modificar a regra de seleção. |
| P0-02 — Frasco | O motor permite reaplicar Frasco em filha já congelada; o teste de dois humanos confirma uma carga e depois duas, incluindo undo/snapshot/reload. O problema de handler pode afetar qualquer item, não só Granada. A interface agora informa a razão quando a regra realmente impede uso: vez, compra incompleta, carta comprada do Lixo, último descarte, bloqueio, escolha pendente ou alvo morto. Sem o estado original do Frasco, não é possível afirmar qual desses casos ocorreu no playtest. |
| P0-03 — item no Lixo | Metadata já era preservada, mas o CSS posicionava o símbolo somente dentro de `.carta`, não em `.discard-face`. O ícone do Lixo agora usa o mesmo posicionamento. O teste percorre mão→Lixo→mão do parceiro→sacrifício→morte→fundo do Lixo, mantendo 108 IDs únicos; só o consumo efetivo remove o item. |
| P0-04 — HUD | A mesa real é uma coluna flex de altura restrita. O HUD encolhia abaixo do conteúdo da grade, que então invadia filhas/próxima fase. Fixtures antigas de bloco livre não reproduziam isso. HUD, faixas e filhos dos vitais agora não encolhem dessa forma. Geometria testada com mesa restrita, itens e fases 1/2/3. |
| P0-05 — nomes | O chip de alvo não tinha limite adequado e a ajuda podia encolher no flex do S.T.A.R.S. Chips agora têm limite/reticências, ajuda permanece acessível e mostra o nome inteiro, inclusive no alvo do Agarrador. |
| P0-06 — retrato | A classe `boss-nehelenia-dream-stolen` acionava pseudo-elementos sobre o retrato. Ela não é mais aplicada e os pseudo-elementos não geram conteúdo. Espelhos/recursos/efeitos mecânicos não foram removidos. |
| P0-07 — Fish Eye | Habilidade atual pode coexistir legitimamente com Reflexo Morto e Reflexo Invertido anteriores. O renderer fragmentava textos em `small` não interativos e o contexto desativava pointer events. Agora há botões de ajuda: a habilidade atual fica dourada, os efeitos persistentes ficam discretos. Conforme revisão do usuário, não há prefixos ATUAL/PERSISTENTE nos chips; ficam somente jogador e efeito. Carta afetada e obrigação são explicadas na ajuda. **A string “jarcado” não foi encontrada nem reproduzida**, portanto essa parte continua pendente. |
| P0-08 — Daniela | Dois caminhos de renderização do Lixo consultavam principalmente a marca de habilidades legadas, em vez da passiva permanente real. Ambos usam o mesmo helper de apresentação, considerando rodada/status/vida. O topo mostra LIXO +3 antes da reação e deixa de destacar depois. O motor de cobrança não mudou; teste confirma apenas +3 na primeira retirada efetiva, sem duplicar e sem modificar Bela/Cassandra. |
| P0-09 — relógio | O intervalo genérico de 60 s também atendia humanos nos chefes. Agora não inicia nesses modos e callbacks já pendentes são barrados. O tempo total continua contando. BOTs mantêm a recuperação existente com watchdog separado de 60 s, somente no anfitrião, ligado à sessão/turno e respeitando pausa/escolhas. Os modos normais mantêm timeout/autoplay. |
| P0-10 — chip na mão | Botão do item ganhou efeito curto e área própria. Mouse/toque no item abre ajuda/alvos, sem selecionar carta; tocar número/naipe seleciona a carta. Testes intercalam e reordenam cartas comuns e os cinco tipos de item. Textos extensos e motivos de impedimento ficam na ajuda. |
| P0-11 — nome | Somente o rótulo de `cold_flask` mudou para Frasco Congelante. ID, PNG interno e compatibilidade de saves permanecem. |

O vídeo confirma o contraste: Relíquia abre seleção aproximadamente em 9 s; Granada é levantada/selecionada, mas não abre o item aproximadamente em 12 s. Ele não prova sozinho a causa interna. A perda do handler foi reproduzida separadamente contra HEAD, antes da correção, e deixou de ocorrer depois dela.

#### Verificação

- `node --test tests/*.test.mjs`: **1.337 aprovados, zero falhas**. Inclui todos os seis chefes, cooperação, escolhas, dano, saves, undo, BOTs e os 15 casos novos de `playtest-p0.test.mjs`.
- `node tests/playtest-p0.browser.mjs`: Edge/Chromium real, 1024×768, 1376×1032, 1920×1080 e 390×844. Mouse e toque; dois clientes humanos simulados trocando snapshots serializados; uso dos cinco itens; compra/segundo Frasco; atualização de face; seleção independente; ordenação; undo/reload; botões desabilitados; Daniela; Fish Eye por toque/Enter; nomes longos; relógio acelerado dos seis chefes; duração total; timeout antigo pendente; watchdog anfitrião/pausa/não anfitrião; timeout normal preservado.
- Regressões aprovadas: `tests/dimitrescu-castle.browser.mjs`, `tests/nemesis-ui.browser.mjs`, `tests/boss-hud-ux.browser.mjs`, `tests/matriarch-hud-polish.browser.mjs`, `tests/boss-resource-feedback.browser.mjs`, `tests/boss-vault-layout.browser.mjs`.
- `P0_BASELINE=1 node tests/playtest-p0.browser.mjs`: reprodução anterior por resolução; handler perdido e item sem abrir. Essa modalidade lê app/CSS de HEAD, sem reverter arquivos.
- `git diff --check`: sem erros de whitespace. Sem commit, staging, push ou deploy.

Os scripts de navegador usam funções reais extraídas de `app.js`, módulos reais e o HTML/CSS da mesa restrita; serviços externos, áudio e operações não relacionadas são substituídos. Os dois clientes **não são uma sessão Firebase real**, e o reload do estado é simulado por serialização. As regras Firestore e o módulo Firebase local não contêm um cronômetro de turno no servidor; nenhuma configuração remota foi alterada ou verificada. Autenticação/relogin, latência e corrida transacional reais continuam exigindo homologação humana em dois dispositivos. Esses limites impedem declarar encerrados todos os P0.

#### Evidências locais

Capturas de cenário controlado, comparáveis entre HEAD e patch; não são screenshots de uma partida Firebase publicada.

- [Antes 1024×768](../../.cache/playtest-p0/before-1024.png) / [depois](../../.cache/playtest-p0/after-1024.png).
- [Antes 1376×1032](../../.cache/playtest-p0/before-1376.png) / [depois](../../.cache/playtest-p0/after-1376.png).
- [Antes 1920×1080](../../.cache/playtest-p0/before-1920.png) / [depois](../../.cache/playtest-p0/after-1920.png).
- [Antes 390×844](../../.cache/playtest-p0/before-390.png) / [depois](../../.cache/playtest-p0/after-390.png).
- [Fish Eye tablet](../../.cache/playtest-p0/fish-1024.png), [celular](../../.cache/playtest-p0/fish-390.png).
- [Nemesis tablet](../../.cache/playtest-p0/nemesis-1024.png), [celular](../../.cache/playtest-p0/nemesis-390.png).
- [Vídeo: Relíquia em 9 s](../../.cache/playtest-p0/video-9.png), [Granada em 12 s](../../.cache/playtest-p0/video-12.png).
- Logs locais: `.cache/playtest-p0-unit.log`, `.cache/playtest-p0-before.log`, `.cache/playtest-p0-regression.log` e `.cache/*-regression.log` dos seis scripts citados.

Os arquivos de `.cache` são evidências locais ignoradas pelo Git. Os testes permitem regenerá-las.

#### Arquivos modificados

- `app.js`: preservação de handlers, explicação de uso, chips/indicadores, nomes e relógios.
- `js/boss/boss-engine.js`: diagnóstico de elegibilidade usando as mesmas regras existentes.
- `js/boss/dimitrescu-castle.js`: rótulo visual.
- `js/boss/ui/dimitrescu-castle-view.js`, `js/boss/ui/nemesis-ui.js`: captions/helper visual e ajuda de nome completo.
- `styles/cards.css`, `styles/boss-mode.css`, `styles/boss/{dimitrescu,nemesis,nehelenia}.css`: ícone no Lixo, limites/layout e interação.
- `service-worker.js`: cache v295 para entregar os arquivos atualizados após publicação manual, sem deploy automático.
- `tests/playtest-p0.{test,browser}.mjs`, `tests/boss-integration.test.mjs`, `tests/dimitrescu-castle.browser.mjs`, `tests/nemesis-ui.browser.mjs`: cobertura nova e compatibilidade das fixtures existentes.
- Este relatório, checklist atualizado, `DOCUMENTACAO_CHEFE_DA_MESA.md` e `REWORK_ITENS_DIMITRESCU_2026-10-08.md`.

#### Escopo preservado e fechamento

##### Refinamento visual solicitado após a etapa 1

Nehelenia: chips sem prefixos ATUAL/PERSISTENTE, mantendo jogador/efeito e ajuda; dourado identifica a habilidade atual, azul-cinza discreto identifica efeitos anteriores. Ao trocar de habilidade, o destaque acompanha o novo objetivo sem remover efeitos persistentes.

Dimitrescu: somente marcas nas cartas da mão receberam escorrimentos arredondados em vez de tiles retangulares. Posições/tamanhos variam por carta, tipo e nova marcação, permanecendo estáveis no rerender; o renderer reaplica as variáveis de sangue também nos nós físicos reutilizados. O Banquete da mesa foi preservado, inclusive seu seed. Sem partículas, canvas, novas imagens ou tarefas aleatórias por frame. Evidências: `.cache/playtest-p0/blood-rounded-{1024,1376,1920,390}.png`. Teste adicional de variação/estabilidade em `tests/dimitrescu-blood-visual.test.mjs`; suíte passa agora 1.338 casos.

Nenhum número de HP/PROT., regeneração, Sede, Fúria, Adaga, sangramento ou demais itens foi rebalanceado. Lixo protegido, Mortos e Devorador sem teto de curas permanecem. Não foram criadas habilidades novas.

Especial Cooperativo **apenas registrado**: barra compartilhada 0–100 nos seis chefes; Limpa +25, Real +50, Ás-a-Ás +100; evolução do mesmo jogo físico credita só a diferença. Não existe implementação nova neste patch. Ativação/retirada do Lixo ainda precisam de especificação.

Checklist: caixas P0 ficam abertas até revisão do usuário e homologação Firebase. P0-07 é parcial pela string não reproduzida. **P3-06 permanece para depois**: antes de encerrar o projeto, aprovar a apresentação compacta da barra e a animação temática dos seis chefes, com acessibilidade/reduced motion/performance.


---

<a id="arquivo-etapa-2-dimitrescu-2026-10-10"></a>

## Origem: ETAPA_2_DIMITRESCU_2026-10-10.md

### Etapa 2 — Dimitrescu: comparação de balanceamento e ajustes de leitura

**Ajuste final de 10/10/2026:** Explosivo/Granada causa **100 HP imediatos + 20 HP por rodada até a morte**, sem acumular sangramentos; petrificação −50 HP máximo, regen20/10 e Adaga80% preservados. Referências a impacto60 em experimentos abaixo são históricas, não valores atuais. Resultados anteriores não foram recalculados.

**Adendo do pacote consolidado:** o Especial compartilhado foi posteriormente implementado com cinco cartas do topo do Lixo, mínimo cinco e bloqueios/reações preservados. Não altera os números B abaixo. A nova comparação dos seis chefes está em [BALANCEAMENTO_SEIS_CHEFES_2026-10-10.md](#arquivo-balanceamento-seis-chefes-2026-10-10); as1.344 batalhas históricas deste relatório não foram substituídas nem reinterpretadas como teste humano.

#### Pacote B aprovado e aplicado — atualização anterior ao lote final de itens

**Este pacote e suas medições são históricos.** O [lote final de itens](#arquivo-lote-final-itens-dimitrescu-2026-10-10) substituiu hemorragia20 por15 e os efeitos de Frasco/Relíquia. Os números atuais constam na documentação funcional; os resultados experimentais abaixo não foram recalculados.

Status/homologação no [checklist-mestre](../CHECKLIST_PLAYTEST_CHEFES_2026-10-10_ATUALIZADO.md#resumo-executivo-do-checklist--estado-em-10102026); não reabrir o comparativo já entregue. Impacto100 confirmado em1.384 testes e browser Lady1920/1376/390 no último patch. Saves v2 anteriores atualizam somente impactos futuros com `castleExplosiveBalanceVersion: 1`; feridas, consumo e último tick permanecem. As tabelas experimentais abaixo antecedem esse buff e não medem sua dificuldade final.

Após a comparação abaixo, o usuário aprovou explicitamente **aplicar B agora**. Os valores finais no código de produção local são:

| Mecânica | Valor aplicado |
| --- | --- |
| HP das filhas / Lady | 500 cada / 2.000, sem mudança |
| Regeneração / Anticoagulante | 20 / 10 HP por rodada; Anti permanente, sem stack |
| Adaga | 80% do dano efetivo de ataques à filha, direto à vida da Lady; sem stack |
| Explosivo | 100 imediatos + 20 antes da regen por rodada até a morte |
| Reaplicação de Explosivo | Novo impacto100, uma hemorragia20, sem tick extra na mesma rodada |
| Frasco Congelante | Uma cura efetiva bloqueada por uso, teto de duas cargas; temporário |
| Demais regras | PROT.500 por filha, Sede, Fúria, Relíquia e petrificação intactos |

Hemorragia permanente agora tem estado explícito (`permanent: true`, `remaining: null`), não duração artificial de1.000 rodadas. Saves modernos v2 são atualizados uma vez por `castleRebalanceVersion: 1`; normalização não cura, não muda HP/petrificação/PROT. consumida, não refaz itens nem ticks. Só hemorragia ainda ativa vira permanente; efeito expirado não retorna. Saves v1 continuam450/50/25 e seus efeitos legados. Snapshot/reload/reconexão/undo cobertos.

Com as três filhas feridas, capacidade de regeneração cai150→60 HP/rodada (−60%). Sangramento20 neutraliza regen20; com Anti10, remove10 HP líquidos por rodada; durante Frio, remove20. Adaga transmite160 em um ataque efetivo de200 (antes60). A durabilidade nominal sem cura/itens continua3.500 nas duas rotas. **Dificuldade “difícil, mas justa” ainda exige novo playtest humano; não há win rate humano inferido.**

##### Comparação histórica anterior à aprovação

O baseline das tabelas abaixo é a configuração anterior: 500 HP, regen50/25, Adaga30%, Explosivo60 + sangramento50 por duas rodadas. Esses resultados foram preservados, não recalculados como se fossem partidas humanas ou um novo lote de produção. O script congela esse baseline explicitamente para continuar reproduzível após a alteração dos defaults.

Foram executadas **1.344 batalhas completas: 64 sementes pareadas × 7 configurações × 3 rotas**. A e B reduzem o esforço para matar a primeira filha, mas **nenhuma configuração mostrou uma rota consistente de vitória com o controlador utilizado**. A Lady ainda termina com muita vida. Portanto, não é correto declarar a dificuldade resolvida nem extrapolar esses resultados para taxa de vitória humana.

**Recomendação do estudo, agora aprovada para implementação: B com500 HP e Adaga80%.** B resolve diretamente o problema do sangramento ser superado pela regeneração normal. Não acrescentar450 HP ou Adaga100% ao mesmo tempo permite distinguir o efeito desse pacote. A era a alternativa mais conservadora, mas ainda permite que uma filha sangrando recupere até5 HP por rodada.

Referências: checklist atualizado e relatório `ETAPA_1_PLAYTEST_P0_2026-10-10.md`. P0 preservado, exceto o espaçamento extra da mão, cuja remoção foi solicitada expressamente. Especial Cooperativo continua **somente reservado/documentado**: compartilhado 0–100, canastras 25/50/100, crédito incremental por jogo físico. Sem commit, push ou deploy.

#### Método e limites

- Sementes 10100–10163, mesmas cartas físicas e posições iniciais em todas as configurações; 108 IDs conservados ao terminar cada batalha. Não foram fabricados itens ou garantidas suas chegadas à mão.
- Motor canônico de combate, passivas, Sede, Fúria, proteção, petrificação, custos dos itens, seleção, Ataque Final, regras de sequência, bloqueios de jogos, Lixo protegido e Mortos. Compra do Monte: **uma carta**, como a aplicação atual.
- Controlador experimental de dois jogadores automáticos: busca gulosa limitada a 128 planos, sem previsão do Monte, com preferência por objetivos, preservação de coringas e descarte aproximado. **Não é o BOT de produção, nem uma simulação validada de dois humanos competentes.** Seus participantes têm `isBot` para execução automática, mas a decisão vem do script experimental.
- Rotas: `direct` não utiliza itens e ataca a Lady; `kill_three` concentra ataques na filha com menos vida até matar as três; `hybrid` usa a seleção híbrida existente. Política de compra, descarte e uso de itens permanece igual entre variantes da mesma rota. Na híbrida, a ordenação de itens é fixa para a duração experimental do sangramento não distorcer o score de uso do BOT.
- Comparamos batalhas inteiras, não dano gratuito isolado. Limite técnico de 180 turnos de jogadores; **nenhuma das 1.344 execuções foi censurada por esse limite**. Todas encerraram por condição do motor.
- Sangramento permanente experimental: um único slot de hemorragia, duração de 1.000 rodadas, maior que todo o horizonte possível da batalha. Isso é equivalente a não expirar neste experimento; **não é implementação definitiva de um estado infinito**.
- Tempo medido em turnos/rodadas, não minutos de uma dupla humana. Sementes pareadas não significam 1.344 observações humanas independentes.

##### Correções do instrumento de medição

O script anterior aceitava um override de regeneração nas regras, mas mantinha 50 no estado de cada filha. Agora aplica o valor também às entidades; teste confirma persistência após normalização/reload. A busca também verifica permissões de criar/usar jogos e jogos bloqueados antes de propor uma jogada.

Eventos são contados uma vez por `actionId`. O motor registra a morte antes do evento do golpe/sangramento que a matou: os contadores finais por filha incluem esse último evento. Na tabela de primeira morte, o dano de ataques é **somente o sofrido pela filha morta**, incluindo o golpe final. Na última morte, é o esforço total de ataques contra as três. Dano imediato de item, hemorragia e petrificação não são somados à coluna de ataques.

#### Configurações

| Configuração | HP | Regen / Anticoagulante | Adaga | Sangramento |
| --- | ---: | ---: | ---: | --- |
| Baseline anterior | 500 | 50 / 25 | 30% | 50 por duas rodadas |
| A | 500 | 25 / 10 | 80% | 20 enquanto viva |
| B | 500 | 20 / 10 | 80% | 20 enquanto viva |
| Atual + HP450 | 450 | 50 / 25 | 30% | 50 por duas rodadas |
| A + HP450 | 450 | 25 / 10 | 80% | 20 enquanto viva |
| A + Adaga60 | 500 | 25 / 10 | 60% | 20 enquanto viva |
| A + Adaga100 | 500 | 25 / 10 | 100% | 20 enquanto viva |

No experimento histórico, explosivo imediato 60 e proteção 500 por filha são iguais em todas. Nas sensibilidades de HP, o coeficiente de hemorragia é compensado apenas no script para manter exatamente 50 ou 20 HP por tick. Do contrário, mudar HP também mudaria inadvertidamente o sangramento.

#### Batalhas completas — médias por configuração e rota

Cada linha tem 64 execuções. Regen e sangramento são valores **efetivos**, já limitados pela vida disponível/recuperável. Adaga é dano transmitido acumulado, não dano líquido final: a Lady pode curar depois. Filhas é a média eliminada, de 0 a 3.

| Configuração / rota | Filhas | Regen | Sangramento | Adaga | HP final Lady | PROT. final | Itens usados |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Atual / filhas | 0,97 | 539,77 | 97,66 | 70,31 | 1.967,41 | 992,19 | 4,81 |
| A / filhas | 1,27 | 390,55 | 136,95 | 166,38 | 1.909,22 | 846,88 | 4,80 |
| B / filhas | 1,33 | 335,63 | 137,27 | 157,13 | 1.912,03 | 812,50 | 4,80 |
| Atual + HP450 / filhas | 1,05 | 543,19 | 96,78 | 69,75 | 1.968,52 | 953,13 | 4,81 |
| A + HP450 / filhas | 1,34 | 383,94 | 137,27 | 155,67 | 1.918,22 | 806,25 | 4,83 |
| A + Adaga60 / filhas | 1,27 | 390,55 | 136,95 | 124,78 | 1.931,78 | 846,88 | 4,80 |
| A + Adaga100 / filhas | 1,27 | 390,55 | 136,95 | 207,97 | 1.885,25 | 846,88 | 4,80 |
| Atual / híbrida | 0,89 | 358,28 | 88,28 | 73,50 | 1.967,53 | 760,86 | 4,83 |
| A / híbrida | 1,09 | 268,67 | 147,11 | 166,44 | 1.912,27 | 644,53 | 4,88 |
| B / híbrida | 1,14 | 221,17 | 140,55 | 161,19 | 1.911,91 | 609,77 | 4,84 |
| Atual + HP450 / híbrida | 0,97 | 350,39 | 87,00 | 69,48 | 1.967,42 | 721,56 | 4,83 |
| A + HP450 / híbrida | 1,17 | 255,69 | 141,86 | 164,19 | 1.912,20 | 595,39 | 4,88 |
| A + Adaga60 / híbrida | 1,09 | 268,67 | 147,11 | 124,83 | 1.933,89 | 644,53 | 4,88 |
| A + Adaga100 / híbrida | 1,09 | 268,67 | 147,11 | 208,05 | 1.887,94 | 644,53 | 4,88 |

**Rota direta:** resultado idêntico nas sete configurações, como controle: 0 filhas mortas, 0 itens, 0 regen/sangramento/Adaga; HP final médio da Lady **1.986,64**, proteção **502,58**, duração **61,44 turnos**. Alterar filhas/itens não deve facilitar uma rota que não os utiliza. Nas outras rotas, os finais duraram aproximadamente 59–60 turnos; isso não representa tempo humano estimado.

#### Primeira e última filha

Médias condicionais: quando não houve morte, o caso não entra na média de tempo/dano. Isso é mostrado na coluna de ocorrências, evitando fingir que todas chegaram à última filha.

| Configuração / rota | Primeira morte (de 64) | Turno da primeira | Ataques na primeira | Três mortas (de 64) | Turno da última | Ataques totais nas três |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Atual / filhas | 54 | 22,37 | 560,37 | 0 | — | — |
| A / filhas | 63 | 21,16 | 473,33 | 1 | 49 | 1.230 |
| B / filhas | 64 | 20,92 | 459,61 | 1 | 49 | 1.225 |
| Atual / híbrida | 53 | 22,60 | 485,19 | 0 | — | — |
| A / híbrida | 61 | 21,26 | 394,84 | 0 | — | — |
| B / híbrida | 62 | 21,06 | 383,23 | 0 | — | — |

Na rota filhas, a primeira morta recebeu em média **274,07 HP de regen** no baseline, **154,21 em A**, **132,11 em B**; sangramento efetivo nela: 77,78 / 72,86 / 70,55; dano imediato de Explosivo: 57,78 / 50,63 / 48,98. Não houve troca do dano60: as médias variam pela chegada/uso de itens e overkill.

Sensibilidades na rota filhas: HP450 atual reduz primeira morte para 21,81 turnos e ataques para 532,68; A+HP450 para 20,34 e 443,62. Adaga60/100 não alteram mortes/regen nessa política fixa; alteram dano transmitido à Lady. Todos os dados condicionais das outras rotas estão no JSON anexo.

As execuções que mataram as três pertencem à **mesma semente 10105**: A/B/Adaga60/100 aos turnos 37,47,49; A+HP450 em 37,46,49; A+HP450 híbrida em 37,47,53. Todas perderam por Ataque Final insuficiente, mesmo com PROT. zero. HP final Lady: A 1.491; B 1.495; A+HP450 filhas 1.629; A+HP450 híbrida 1.504; Adaga60 1.522; Adaga100 1.460. **Um caso não permite estimar a duração típica da última filha.**

#### Depois dos Mortos e com Monte em 30–20

Ambos os Mortos foram retirados em todas as 64 execuções de cada grupo. Para Monte30/20, as médias abaixo incluem apenas quem alcançou o marco; os demais terminaram antes. Isso não é uma medição humana de estagnação.

| Configuração / rota | Lady / PROT. após ambos Mortos | Lady / PROT. no Monte30 | Lady / PROT. no Monte20 | Casos Monte30 / Monte20 |
| --- | --- | --- | --- | --- |
| Atual / filhas | 1.980,66 / 1.343,75 | 1.968,09 / 1.077,59 | 1.970,98 / 1.088,24 | 58 / 51 |
| A / filhas | 1.924,62 / 1.257,81 | 1.918,18 / 950,00 | 1.920,70 / 943,40 | 60 / 53 |
| B / filhas | 1.926,00 / 1.250,00 | 1.920,51 / 932,20 | 1.923,20 / 921,57 | 59 / 51 |
| Atual / híbrida | 1.980,66 / 1.216,25 | 1.968,50 / 861,12 | 1.971,16 / 857,35 | 58 / 51 |
| A / híbrida | 1.924,69 / 1.144,30 | 1.912,30 / 759,33 | 1.918,71 / 754,23 | 60 / 52 |
| B / híbrida | 1.926,06 / 1.126,09 | 1.913,80 / 731,53 | 1.919,63 / 724,31 | 59 / 51 |

Na rota direta, após os Mortos: Lady2.000/PROT.862,11; Monte30: 2.000/706,02 (59 casos); Monte20: 1.997,82/605,82 (55). O JSON inclui os mesmos marcos das sensibilidades e o HP de cada filha. Médias de marcos podem subir pela cura e pela mudança da coorte; não são a trajetória de uma única partida.

#### Vitórias, derrotas e causas

**Controlador experimental: 0 vitórias / 64 derrotas em cada um dos 21 grupos. Produção BOT: não medida. Humanos: nenhum novo playtest realizado nesta execução.** O relato original dos dois humanos continua sendo evidência qualitativa, não uma amostra de win rate.

| Configuração / rota | Recursos esgotados | Ataque Final insuficiente | Sede100 |
| --- | ---: | ---: | ---: |
| Atual / direta (igual nas sete) | 47 | 15 | 2 |
| Atual / filhas | 45 | 16 | 3 |
| A / filhas | 46 | 16 | 2 |
| B / filhas | 44 | 18 | 2 |
| Atual / híbrida | 45 | 17 | 2 |
| A / híbrida | 47 | 16 | 1 |
| B / híbrida | 46 | 17 | 1 |

Aumentar Adaga ajuda a tirar vida através da proteção, mas não cria mais cartas legais nem garante canastras. A limitação da política gulosa também pesa. Não dá para atribuir todas as derrotas à dificuldade do chefe, nem concluir que A/B são impossíveis para humanos. Também não há evidência para dizer que estão fáceis.

#### Sangramento permanente e reaplicação aprovada

Regra final aprovada: cada Explosivo consumido aplica a petrificação atual e até100 de dano imediato, respeitando HP disponível. **A filha possui somente uma hemorragia de20 por rodada.** Outro Explosivo não aumenta esse valor, não cria outro tick e não remove a guarda de rodada. A hemorragia termina com a morte da filha; dano dela continua sem transferência pela Adaga. São cartas físicas diferentes, consumidas normalmente.

| Situação | Cura normal | Sangramento | Variação líquida por rodada |
| --- | ---: | ---: | ---: |
| Baseline anterior, enquanto os dois ticks duram | 50 | 50 | 0 |
| Baseline anterior + Anticoagulante | 25 | 50 | −25, por duas rodadas |
| A | 25 | 20 | +5 |
| B | 20 | 20 | 0 |
| A/B + Anticoagulante | 10 | 20 | −10 |
| A/B + Frasco, enquanto bloquear cura | 0 | 20 | −20 |

Essa conta supõe vida/ferimento suficientes. O motor aplica sangramento **antes** da regeneração: uma filha com até20 HP pode morrer antes de recuperar vida. Cura efetiva no máximo recuperável pode ser menor. O Frasco guarda suas duas cargas quando não existe cura efetiva a bloquear. Após duas rodadas, o Explosivo do baseline anterior deixava de sangrar; em B, continua até a morte. Anticoagulante não acumula.

#### Durabilidade e petrificação

Sem cura/itens, rota direta: Lady2.000 + PROT.1.500 = **3.500**. Matar as três filhas de500 e depois a Lady também exige nominalmente **3.500** de dano, mas enfrenta regen e Fúria; cada morte remove até500 de proteção restante. HP450 reduz essa soma para **3.350**, queda de150 (4,3%). A/B não alteram durabilidade nominal: reduzem o custo recorrente de cura. Capacidade de regen das três feridas: 150 →75 em A ou →60 em B por rodada.

Petrificação **não foi alterada**: percentuais 5%/10%/20%/15%/20%, piso recuperável300 na versão2 atual do workspace (não o antigo piso200 da versão1). Em500: perdas25/50/100/75/100. Em450: 23/45/90/68/90, pelo arredondamento canônico. O piso permanece300, deixando só150 petrificáveis em vez de200. Logo, a sensibilidade HP450 não equivale a simplesmente tirar50 mantendo todas as perdas absolutas. É um motivo adicional para não aplicar450 automaticamente.

Na híbrida do estudo, B reduz regen efetiva total de358,28 para221,17 (−38,3%); A para268,67 (−25,0%). A primeira morte fica cerca de1,54 turno mais cedo em B, e o ataque necessário nela cai485,19→383,23 (−21,0%). Contudo, HP final da Lady fica perto de1.912: apenas cerca de88 líquidos removidos. Essa distância impede afirmar que a dificuldade final esteja calibrada somente com este experimento; não invalida a aprovação posterior do usuário para aplicar B.

#### Ajustes de UX implementados

- Espelho do Lixo: espaço temporário calculado a partir da moldura existente, somente enquanto a PNG estiver visível; tamanho/alinhamento da PNG intactos. Contador oculto nesse estado, interrogação visível e clicável; espaço/contador voltam depois.
- HUD: instrução, progresso, resultado e situações por jogador em linhas próprias. Renderer compartilhado transforma separadores `·`/`•` de descrições em quebras de linha; textos das seis famílias de habilidades e popovers passam pelo mesmo caminho. Guia e detalhes também usam o renderer, efeitos persistentes ganham quebras, escolha do Cofre passa a ter frases separadas. Chips compactos de identidade (p.ex. `BANQUETE · JOGO2`) não foram convertidos em parágrafos.
- Ênfase pontual: referências de carta no HUD/ajuda em1,3em e título8% maior, com informações em linhas. No ajuste final solicitado, chips passam de escala1,18 para **1,5 somente no valor+naipe**, preservando fonte do restante, caixa, altura, padding e espaçamento. Copas/Ouros em rosa claro sobre vinho; Espadas/Paus em azul claro sobre fundo escuro, sem neon. Factory compartilhada cobre auxiliares/passivas; renderer de efeitos persistentes também destaca cartas, inclusive nas estruturas de compatibilidade do Banqueiro/Dominadora. Nenhum novo chip é criado onde o chefe não possui referência. Passivas escolhidas continuam seguindo a seleção existente; neutras continuam discretas. Marcações e legendas da mão mantêm os tamanhos originais.
- Removida a margem de 4px específica das cartas com item. Espaçamento original compartilhado da mão restaurado; handlers de itens e seleção da carta preservados.
- Cache preparado em v297, sem publicação.

#### Evidências e testes

- Suíte ampla após aplicação de B: **1.356 testes aprovados**, zero falhas/skips/cancelados. Inclui seis chefes, humano/BOT/Ataque Final, itens, snapshots/undo, Devorador e P0. Oito novos casos de B cobrem defaults, sangramento em oito rodadas, Frasco temporário, migração v2 com/sem regras, morte e contrato legado. Testes anteriores foram atualizados para os novos números; fixtures v1 seguem protegendo os antigos50/25.
- Navegador Edge real, fixtures locais usando renderer real, CSS real e snapshots entre dois clientes simulados: 1024×768, 1376×1032, 1920×1080, 390×844, sem zoom. **136 combinações habilidade/fase × quatro resoluções**, ajuda de cada uma, sem separadores no HUD/popover e HUD sem vazamento. Comparação em pixels de chips com/sem referência destacada: mesma caixa e fonte-base, naipe com contraste próprio. Mouse/toque/teclado, ícones próximos sem espaçamento extra, reload/undo e regressões P0.
- Moldura: medição de `::before` contra a borda da área de jogos, folga mínima de 3px, estado temporário removível e ajuda clicável mesmo com contador oculto. Teste usa a PNG existente.
- Browser Dimitrescu: legado + versão2, HP/petrificação, itens, passivas, animações e replay, desktop/tablet/mobile. Browser Nemesis: cinco viewports, seleção, persistência e permissões.
- Imagens em `.cache/playtest-p0/`: `mirror-clearance-{1024,1376,1920,390}.png`, `copy-dimitrescu-crimson_brand-1-{largura}.png`, `copy-nehelenia-fish_marked_card-1-{largura}.png`, além das capturas P0. São evidências locais, não screenshots de uma nova sessão Firebase humana. Revisadas visualmente em tablet, desktop e mobile.
- `git diff --check` sem erros. Nenhum commit/push/deploy; índice de staging não manipulado.
- Regressão final de chips: cinco legendas incluindo10♦ e10♣ no meio do texto, seis temas × quatro viewports, com medição de caixa e contenção do trecho ampliado. Suportes usam a factory real; chips legados de compatibilidade são tornados visíveis somente na fixture, não no jogo. Logs finais em `.cache/package-b-full-final.log`, `.cache/package-b-p0-final.log`, `.cache/package-b-dimi-browser.log` e `.cache/package-b-nemesis-browser.log`; capturas `chip-reference-{chefe}-{largura}.png` em `.cache/playtest-p0/`. Não são novas partidas humanas no Firebase.

#### Dados e reprodução

Resultados agregados, marcos, coortes, causas e casos individuais de três mortes: [JSON verificável](../experiments/dimitrescu-stage2-2026-10-10.json). Cada execução completa está em `.cache/dimitrescu-stage2.jsonl`; SHA256 desse arquivo está no JSON. Scripts não são importados pela aplicação.

```bash
node scripts/dimitrescu-stage2-experiment.mjs 64 10100 > .cache/dimitrescu-stage2.jsonl
node scripts/dimitrescu-stage2-report.mjs
node --test tests/*.test.mjs
node tests/playtest-p0.browser.mjs
node tests/dimitrescu-castle.browser.mjs
node tests/nemesis-ui.browser.mjs
git diff --check
```

Para navegador, configurar `PLAYWRIGHT_PATH` para a instalação disponível. Node utilizado nesta execução: v24.19.0, runtime local do Codex.

**Próximo passo de validação:** playtest humano com B já aplicada, especialmente última filha/dano na Lady e fim dos recursos. Não implementar o Especial para compensar estes resultados antes de fechar sua especificação. P3-06 continua reservado para apresentação compacta/animações após as etapas funcionais.


---

<a id="arquivo-pacote-consolidado-chefes-2026-10-10"></a>

## Origem: PACOTE_CONSOLIDADO_CHEFES_2026-10-10.md

### Pacote consolidado do modo Chefe — 10/10/2026

#### Resultado e regra vigente

Status de trabalho centralizado no [resumo do checklist-mestre](../CHECKLIST_PLAYTEST_CHEFES_2026-10-10_ATUALIZADO.md#resumo-executivo-do-checklist--estado-em-10102026); contexto de retomada no [handoff vigente](../HANDOFF_DESENVOLVIMENTO_BURACO.md). Não reabrir entregas por caixas de homologação ainda abertas.

##### Lote posterior — somente itens da Lady

Estado vigente: Explosivo100+15 permanente, Relíquia+20% de ataque direto e Frasco global por duas oportunidades de turno. Regras e validação estão no [relatório do lote final](#arquivo-lote-final-itens-dimitrescu-2026-10-10). Especial e outros chefes não foram alterados neste lote. As evidências e medições abaixo descrevem os lotes anteriores, não a dificuldade humana da versão atual.

##### Adendo anterior — Explosivo100 e chip Adaga

Explosivo/Granada100 **aplicado e testado**, não apenas solicitado. Preservados sangramento20 permanente sem stack, petrificação−50, regen20/10 e Adaga80%. Novos usos em saves v2 atualizados por `castleExplosiveBalanceVersion: 1`, sem dano retroativo. Chip Adaga corrigido de faixa vertical para cerca de75×14 px, com ajuda preservada; sem alteração mecânica.

Últimos logs conferidos: `.cache/explosive100-unit.log` (**1.384 aprovados**) e `.cache/explosive100-browser.log` (Lady1920/1376/390, ajuda100+20 e regressões). A suíte1.380 e browser nas quatro dimensões descritos abaixo pertencem ao lote anterior. Os144 pares experimentais e1.344 batalhas da Etapa 2 também antecedem o impacto100; não foram recalculados nem usados para estimar taxa humana pós100. Cache local atualv301; não houve deploy.

Esta revisão só organizou Markdown. Nenhum novo teste de gameplay, mudança de código, staging ou escrita remota foi feito.

Especial funcional nos seis chefes: **cinco cartas físicas do topo do Lixo**, não do Monte. Com menos de cinco, não ativa nem gasta. Respeita bloqueios do usuário/beneficiário e os efeitos de retirada. Esta regra substitui a seção B3 do brief inicial conforme as duas correções explícitas posteriores do usuário.

P0, legibilidade, espaçamento da mão e pacote B da Lady preservados. Nenhuma das duas habilidades propostas foi implementada. Sem commit, push ou deploy. Não declarar homologação humana/Firebase a partir dos testes locais.

#### A — O que já existia e foi conferido

Referências: [Etapa 1](#arquivo-etapa-1-playtest-p0-2026-10-10) e [Etapa 2](#arquivo-etapa-2-dimitrescu-2026-10-10). Os lotes e dados históricos não foram refeitos nem apresentados como novos.

| Requisito | Evidência técnica atual | Limite |
| --- | --- | --- |
| Granada e outros itens clicáveis | Handlers reais da mão, hits em cartas intercaladas/sobrepostas, mouse/toque e bloqueios com ajuda | Confirmar partida humana autenticada |
| Item no Lixo, consumo só na filha | Metadata e IDs preservados, descarte/undo/reload/morte testados | Saves humanos reais continuam úteis |
| Carta versus chip | Áreas independentes; chip não propaga seleção indevida | Não aumentou espaçamento da mão |
| Cronômetro | Seis chefes sem timeout individual/autoplay; duração total/BOT watchdog e outros modos preservados | Não equivale a teste de rede prolongado |
| HUDs, nomes e filhas | Testes geométricos nas quatro dimensões; regressões específicas Nemesis/Dimitrescu | Tablets físicos pendentes |
| Nehelenia/Fish Eye | Retrato sem overlay quebrado; Espelho com espaço temporário; ajuda interativa e persistência dos auxiliares | String anômala do Fish Eye não reproduzida |
| Daniela | Marca o Lixo e reage uma vez por rodada | Especial reutiliza o mesmo hook |
| Leitura | Textos separados em linhas; referência valor+naipe com escala visual 1,5, caixa/fonte restante preservadas | Inspeção em tamanho normal, sem zoom; não afirma acessibilidade universal |
| Sangue | Gotas arredondadas, distribuição orgânica determinística por marca | Não muda mecânica nem PNG |
| Pacote B | 500 HP, regeneração 20/Anti 10, Adaga 80%, Explosivo 100 + hemorragia 20 permanente sem stack | Sede/Fúria/PROT./Frasco e demais regras intactas |

As causas exatas P0 estão no relatório da Etapa 1. A causa do item era a atualização da face removendo seu handler; não foi “consertada” escondendo a Granada. Este pacote não refez aquela correção.

#### B — Implementação nova

##### Poder da equipe e compra especial

- Limpa 25, Real 50, Ás-a-Ás 100; ledger da categoria máxima por ID canônico do jogo físico. Evoluções acrescentam só 25/50/75.
- Saldo compartilhado ilimitado. Cada ativação gasta 100; 125 deixa 25, 200 permite dois usos. Nenhum cooldown ou requisito adicional de fase, mão, Monte ou Mortos.
- Humano escolhe o cooperador beneficiado, inclusive BOT. BOT de produção não gasta automaticamente.
- Cinco `pop()` do Lixo para a mão escolhida, sem fabricação, duplicação, perda de item ou uso do Monte. Zero a quatro não ativam. Monte vazio não impede o benefício se o Lixo tiver cinco e as demais condições forem válidas.
- A compra normal permanece disponível e separada. Não exige jogar imediatamente o topo recuperado; a obrigação de encaixe da compra normal fechada não foi alterada fora desta ação. Objetivos já existentes não são anulados pelo Especial.

##### Reações e limites

| Sistema | Regra do Especial |
| --- | --- |
| Bloqueios | Checar usuário e beneficiário: castelo fechado, crédito, Cofre obrigatório, selo/lock/guarda Hawk e bloqueios canônicos |
| Daniela | Primeira retirada efetiva: +3 Sede uma vez; uma segunda ativação não cobra de novo |
| Pólen | Reage se a carta contaminada estiver entre as cinco, inclusive enterrada |
| Ágio | Cobra a primeira retirada, uma única vez na rodada |
| Espelho | Registra os cinco IDs e beneficiário; escolhas, bloqueios e consequências existentes continuam |
| Agarrador / financiamento | Não transforma o benefício em compra normal; seus gatilhos de compra normal continuam separados |
| Itens | Continuam nas cartas recuperadas; consumo somente por uso real |
| Derrota por reação | Resultado, horário e histórico na mesma transação do benefício |

##### Atomicidade

Transação lê o snapshot autoritativo, valida sessão/revisão/pausa/estado, executa retirada e reações, grava revisão incrementada e ID de ação. Dois clientes com a mesma revisão: só o primeiro pedido válido grava, inclusive com 200 pontos; o segundo precisa receber a nova revisão antes de outro uso. Um commit comum atrasado do modo Chefe também é rejeitado, para não apagar cartas/carga recebidas.

Undo/snapshot/reload restauram saldo, ledger, cartas e efeitos juntos. Restauração conserva a revisão atual antes de gravar. Saves antigos recebem as categorias já conquistadas uma vez, com aliases posicionais mapeados aos IDs físicos. Re-render não pontua.

##### Bugs encontrados ao validar a integração

1. O footer herdava `pointer-events: none` no desktop. O controle novo tem área própria clicável, comprovada por hit test e toque/teclado.
2. Writer comum atrasado poderia sobrescrever o benefício; revisão compartilhada e teste com retry transacional impedem isso.
3. A animação podia segurar a action gate enquanto a aba de fundo era throttled. Agora é cosmética, não aguardada pela ação confirmada nem pelo recebimento remoto.
4. A regra inicial do brief era Monte/parcial. Foi substituída por Lixo/exatamente cinco, incluindo testes, comparação, ajuda e documentação — não apenas rótulo visual.

#### C — Ritmo e comparação

[Relatório quantitativo](#arquivo-balanceamento-seis-chefes-2026-10-10) com 144 batalhas (12 pares por chefe), mesmas seeds/baralho/política em cada braço, traços completos e conservação dos 108 IDs. Inclui turnos sem baixar/sem dano creditado, mãos, Monte, canastras, cargas/usos/cartas, causas, CPU e janela de dois Mortos retirados com Monte 20–30.

Não usar vitórias desse controlador como win rate humano. A retirada não consome Monte, mas altera indiretamente duração e compras posteriores. A política experimental usa cedo, não reserva para a janela crítica. Contador de dano tem limites descritos no relatório. Não implementar outras recuperações a partir destes resultados. Homologação humana do travamento ainda necessária.

Neste lote, só houve 12 ativações (60 cartas) nas 72 batalhas com Especial: Banqueiro1, Lady3, Nemesis8; os três outros chefes não chegaram a usá-lo. Vitórias permaneceram iguais em todos os pares agregados. Na janela crítica da Lady, turnos sem baixar ficaram39→38 de67 observados, sem mudança na pior sequência11. O ganho medido foi pequeno; não seria correto afirmar que esta regra sozinha resolveu o ritmo.

#### D — Variedade e propostas

Catálogos confirmados: Dominadora 13; Nemesis/Nehelenia 11; Matriarca 10; Banqueiro/Dimitrescu 8. Especial não é habilidade sorteada. Frequências/eligibilidade por fase das batalhas e 17.280 sorteios condicionais + 4.320 sequenciais estão no relatório de balanceamento. Não igualar contagens por obrigação; não mudar pesos para compensar condições que não apareceram na amostra.

Designs completos, **fora da rotação**, em [PROPOSTAS_DIMITRESCU_2026-10-10.md](#arquivo-propostas-dimitrescu-2026-10-10):

- **Bifurcação Carmesim:** escolha entre pressão direta na Lady e avanço pela ala das filhas; progresso de dano efetivo compartilhado. Não confundir com `Portas do Castelo`, já existente.
- **Salão das Duas Sombras:** contribuição legal dos dois jogadores, sem marcar outra carta específica.

Fases, pesos candidatos, elegibilidade, parcial/falha, interações, help e testes estão descritos. Exigem aprovação antes de codificação.

#### E — Browser, desempenho e limites de homologação

1.380 testes automatizados aprovados. Browser real Chromium: 1024×768, 1376×1032, 1920×1080 e 390 px; mouse/toque/Enter/Escape; dois humanos simulados, retry simultâneo, Lixo insuficiente, undo/reload, cartas próximas, nomes longos, P0 e os 136 pares habilidade/fase de HUD/help. Regressões específicas da Lady em três viewports e Nemesis em cinco também passaram.

O teste de dois clientes usa handlers extraídos do aplicativo e armazenamento CAS substituto; não faz login nem usa Firebase real. O fixture mantém cenário de mesa fixo para medir layout, portanto imagens de outros chefes nesse teste não validam automaticamente o fundo de mesa escolhido no menu. Não confundir isso com uma partida autenticada completa.

Animatic: 20 ciclos em cada viewport, máximo cinco nós temporários, zero resíduos e mesma quantidade de nós antes/depois. Em foreground, duração máxima observada 605–608 ms. Heap amostrado ficou abaixo do inicial nos quatro runs; isso não prova ausência universal de vazamento. Reduced motion não cria voos. Em aba de fundo houve throttling de cerca de 2–3 s no primeiro ensaio; a ação não espera a animação. Não há benchmark em tablet físico.

Evidências locais (zoom 1, screenshots do fixture): [mobile Lady](../../.cache/playtest-p0/special-dimitrescu-390.png), [tablet Lady](../../.cache/playtest-p0/special-dimitrescu-1376.png), [desktop Nemesis](../../.cache/playtest-p0/special-nemesis-1920.png), [P0 depois](../../.cache/playtest-p0/after-1024.png). Logs: `.cache/consolidado-special-browser.log`, `consolidado-dimitrescu-browser.log`, `consolidado-nemesis-browser.log`, `consolidado-full-final.log`.

Sem erros em `git diff --check`, staged diff check e sintaxe dos módulos principais. Nenhuma PNG foi alterada. Não houve stage/commit/push/deploy nesta execução.

##### Pendências de homologação/design — resumo, não um segundo backlog

- Dois clientes Firebase autenticados, reconexão real e tablets físicos; inventário de sessões de browser disponível não forneceu sessão autenticada utilizável. Não acessar contas nem fazer escrita remota para contornar isso.
- Nova validação humana do ritmo e pacote B; amostras experimentais não encerram esse aceite.
- String anômala do Fish Eye não reproduzida: manter pendente, não marcar como resolvida.
- Aprovação das duas habilidades da Lady.
- **P3-06: aprovar barrinha funcional e animação heroica final.** Proposta abaixo, sem arte externa implementada.

O checklist-mestre é o responsável por atualizar esses status. Origem Lixo e impacto100 não são decisões pendentes.

##### Proposta visual P3-06 — para aprovação

Posição aprovada e aplicada posteriormente: ao lado do X nos controles do jogador, fora do HUD do chefe. Barra horizontal de100 px (92 no celular),16 px visuais/28 px de toque, ícone de energia, saldo/cargas e popover curto preservados. Não reabrir a decisão de posição; arte/animação heroica final ainda depende de aprovação.

| Universo | Direção candidata | Asset / aprovação |
| --- | --- | --- |
| Nemesis | Silhueta heroica de resgate, verde discreto; cartas do Lixo à mão | Confirmar personagem/asset autorizado antes de usar |
| Dimitrescu | Resgate contra o castelo, fio carmesim e brilho metálico curto | Reutilizar somente assets locais autorizados; personagem depende de aprovação |
| Nehelenia | Heroína/luz lunar, reflexo violeta que libera cinco cartas | Não alterar a PNG do Espelho nem baixar imagem externa |
| Matriarca | Energia esmeralda e pétalas em volta das cartas | Lótus local disponível; uso específico no Especial depende de aprovação |
| Dominadora | Ruptura visual de correntes, lilás, retorno do controle à equipe | Sem nova habilidade ou redução de Dominação |
| Banqueiro | Recuperação do cofre/recibo dourado, cinco cartas em leque | Sem quitar Dívida automaticamente |

Até aprovação: cinco silhuetas pequenas com a cor do universo, em cerca de 600 ms, sem personagem externa. Esta proposta não declara direitos sobre arte nova. A escolha final de personagens, assets e aparência continua com o usuário.

#### Arquivos principais

Motor: `js/boss/boss-special.js`, `js/boss/boss-engine.js`. Persistência: `js/game/boss-state-transaction.js`, integração `app.js`. UI: `js/boss/ui/cooperative-special-ui.js`, slot `index.html`, `styles/boss-mode.css`, cache `service-worker.js`. Cobertura: `tests/boss-special.test.mjs`, `tests/playtest-p0.browser.mjs` e fixtures de regressão. Experimentos/report: `scripts/boss-special-experiment.mjs`, `scripts/boss-variety-current.mjs`, `scripts/boss-consolidated-report.mjs`.

Documentação oficial, inventário e checklists atualizados. O `.gdoc` de balanceamento é um ponteiro externo; não foi alterado remotamente. O relatório Markdown local registra os dados novos.


---

<a id="arquivo-balanceamento-seis-chefes-2026-10-10"></a>

## Origem: BALANCEAMENTO_SEIS_CHEFES_2026-10-10.md

### Balanceamento e ritmo dos seis chefes — 10/10/2026

**Estado atual de 10/10/2026:** Explosivo100+15 permanente, Relíquia+20% de ataque direto até morrer, Frasco global por duas oportunidades dos cooperadores. Regen20/10, Adaga80% e petrificação preservados. Ver [lote final](#arquivo-lote-final-itens-dimitrescu-2026-10-10). Este documento preserva experimentos anteriores, sem recálculo ou estimativa de taxa humana atual.

#### Método e limites

**Lote histórico anterior ao impacto100.** Dados/JSON preservados sem recálculo. O buff100 está confirmado no último patch, mas não existe aqui um novo experimento da versão pósbuff. Pendências de teste humano e decisões estão somente no [checklist-mestre](../CHECKLIST_PLAYTEST_CHEFES_2026-10-10_ATUALIZADO.md#resumo-executivo-do-checklist--estado-em-10102026).

144 batalhas completas: 12 seeds (101001–101012) por chefe, pareadas com/sem Especial. Todos os braços usam o mesmo baralho físico inicial, motor canônico e política de baixar cartas BossBuracoBot. O controlador experimental escolhe usar o Especial assim que puder, para o jogador da vez. Não é uma política nova do BOT de produção.

O experimento aplica o mesmo seletor canônico de itens nos dois braços da Lady, depois da compra normal. Não equivale a um humano competente nem à automação completa do aplicativo. Compra normal de uma carta, financiamento real, escolhas canônicas, reciclagem Fisher–Yates com seed por Morto e derrota por recursos antes das passivas de fim de turno. Limite de segurança: 180 turnos.

O Especial retira exatamente cinco cartas do topo do Lixo; respeita bloqueios/reações e não consome cartas do Monte. Não altera a compra normal. Tempo abaixo é execução CPU sem pausas/animações, não duração de uma partida humana. Rodar outros processos altera essa medida.

O contador `damage` vem de `boss.stats.totalDamage`: contribuições creditadas ao HP dos alvos e Ataque Final contabilizado pelo motor. Não mede dano absorvido pela PROT./Coágulo nem transferência da Adaga/ticks como uma nova contribuição. Portanto “sem dano” abaixo significa sem aumento desse contador, não ausência de qualquer progresso de combate. Os arquivos preservam o traço de cada turno; não presumir benefício humano a partir da taxa de vitória deste controlador.

#### Comparação pareada

Médias por batalha, salvo vitórias e maior sequência. Canastras incluem as categorias contabilizadas pelo motor; pontos do Especial só vêm de Limpa/Real/Ás-a-Ás.

| Chefe | Especial | Vitórias / completas | Turnos | Máx. sequência sem baixar (média / pior) | Sem dano creditado (média / pior) | Cartas na mão ao fim (equipe) | Monte ao fim | Canastras | Pontos ganhos | Usos / cartas recebidas | CPU (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| O Banqueiro | Sem | 0 / 12 | 42.5 | 8.0 / 14 | 8.0 / 14 | 13.5 | 20.8 | 2.3 | 39.6 | 0 / 0 | 3.1 |
| O Banqueiro | Com | 0 / 12 | 41.4 | 7.9 / 14 | 7.9 / 14 | 15.3 | 22.2 | 2.2 | 37.5 | 1 / 5 | 3.0 |
| A Dominadora | Sem | 0 / 12 | 36.4 | 10.8 / 24 | 10.8 / 24 | 16.1 | 29.2 | 1.2 | 14.6 | 0 / 0 | 2.5 |
| A Dominadora | Com | 0 / 12 | 36.4 | 10.8 / 24 | 10.8 / 24 | 16.1 | 29.2 | 1.2 | 14.6 | 0 / 0 | 2.4 |
| A Matriarca Esmeralda | Sem | 0 / 12 | 30.8 | 5.8 / 8 | 5.8 / 8 | 12.4 | 34.8 | 2.1 | 8.3 | 0 / 0 | 1.6 |
| A Matriarca Esmeralda | Com | 0 / 12 | 30.8 | 5.8 / 8 | 5.8 / 8 | 12.4 | 34.8 | 2.1 | 8.3 | 0 / 0 | 1.6 |
| Lady Dimitrescu | Sem | 0 / 12 | 58.6 | 13.4 / 23 | 16.2 / 32 | 6.2 | 8.3 | 4.8 | 60.4 | 0 / 0 | 4.5 |
| Lady Dimitrescu | Com | 0 / 12 | 58.8 | 13.2 / 23 | 16.2 / 32 | 6.2 | 8.3 | 4.8 | 56.3 | 3 / 15 | 4.6 |
| Rainha Nehelenia | Sem | 0 / 12 | 41.3 | 9.9 / 20 | 10.7 / 25 | 16.7 | 26.8 | 1.6 | 16.7 | 0 / 0 | 2.8 |
| Rainha Nehelenia | Com | 0 / 12 | 41.3 | 9.9 / 20 | 10.7 / 25 | 16.7 | 26.8 | 1.6 | 16.7 | 0 / 0 | 2.8 |
| Nemesis | Sem | 1 / 12 | 71.3 | 10.0 / 13 | 10.0 / 13 | 2.3 | 0.8 | 7.8 | 114.6 | 0 / 0 | 7.5 |
| Nemesis | Com | 1 / 12 | 71.0 | 9.9 / 15 | 9.9 / 15 | 3.1 | 0.9 | 8.0 | 120.8 | 8 / 40 | 7.7 |

#### Janela crítica: dois Mortos retirados, Monte de 20–30 cartas

Janela exige `deadTaken >= 2`, não apenas pilhas vazias por reciclagem. Sequências são os contadores correntes do turno observado. Ausência de amostra é explicitada, não substituída por estados fabricados.

| Chefe | Especial | Batalhas que chegaram à janela | Turnos observados | Mão média (equipe) | Sem baixar / sem dano nesses turnos | Maior sequência sem baixar / sem dano |
| --- | --- | --- | --- | --- | --- | --- |
| O Banqueiro | Sem | 1 / 12 | 4 | 24.5 | 3 / 3 | 3 / 3 |
| O Banqueiro | Com | 1 / 12 | 4 | 24.5 | 3 / 3 | 3 / 3 |
| A Dominadora | Sem | 0 / 12 | 0 | — | 0 / 0 | — / — |
| A Dominadora | Com | 0 / 12 | 0 | — | 0 / 0 | — / — |
| A Matriarca Esmeralda | Sem | 1 / 12 | 7 | 7.7 | 4 / 4 | 3 / 3 |
| A Matriarca Esmeralda | Com | 1 / 12 | 7 | 7.7 | 4 / 4 | 3 / 3 |
| Lady Dimitrescu | Sem | 7 / 12 | 67 | 10.3 | 39 / 39 | 11 / 11 |
| Lady Dimitrescu | Com | 7 / 12 | 67 | 10.5 | 38 / 38 | 11 / 11 |
| Rainha Nehelenia | Sem | 0 / 12 | 0 | — | 0 / 0 | — / — |
| Rainha Nehelenia | Com | 0 / 12 | 0 | — | 0 / 0 | — / — |
| Nemesis | Sem | 2 / 12 | 8 | 17.1 | 3 / 3 | 1 / 1 |
| Nemesis | Com | 2 / 12 | 8 | 17.1 | 3 / 3 | 1 / 1 |

#### Cargas, itens e causas de encerramento

##### O Banqueiro

- Sem: causas max_debt=11, resources_exhausted=1; primeiro turno observado com saldo conquistado de pelo menos 100: 40; ativações nos turnos nenhuma; itens usados: 0.
- Com: causas max_debt=12; primeiro turno observado com saldo conquistado de pelo menos 100: 40; ativações nos turnos 41; itens usados: 0.

##### A Dominadora

- Sem: causas both_players_dominated=12; primeiro turno observado com saldo conquistado de pelo menos 100: nenhum; ativações nos turnos nenhuma; itens usados: 0.
- Com: causas both_players_dominated=12; primeiro turno observado com saldo conquistado de pelo menos 100: nenhum; ativações nos turnos nenhuma; itens usados: 0.

##### A Matriarca Esmeralda

- Sem: causas max_bloom=12; primeiro turno observado com saldo conquistado de pelo menos 100: nenhum; ativações nos turnos nenhuma; itens usados: 0.
- Com: causas max_bloom=12; primeiro turno observado com saldo conquistado de pelo menos 100: nenhum; ativações nos turnos nenhuma; itens usados: 0.

##### Lady Dimitrescu

- Sem: causas resources_exhausted=7, max_blood=5; primeiro turno observado com saldo conquistado de pelo menos 100: 44; ativações nos turnos nenhuma; itens usados: 69.
- Com: causas resources_exhausted=7, max_blood=5; primeiro turno observado com saldo conquistado de pelo menos 100: 44; ativações nos turnos 45, 61, 69; itens usados: 68.

##### Rainha Nehelenia

- Sem: causas five_dream_mirrors=12; primeiro turno observado com saldo conquistado de pelo menos 100: nenhum; ativações nos turnos nenhuma; itens usados: 0.
- Com: causas five_dream_mirrors=12; primeiro turno observado com saldo conquistado de pelo menos 100: nenhum; ativações nos turnos nenhuma; itens usados: 0.

##### Nemesis

- Sem: causas resources_exhausted=9, max_infection=2, boss_defeated=1; primeiro turno observado com saldo conquistado de pelo menos 100: 38; ativações nos turnos nenhuma; itens usados: 0.
- Com: causas resources_exhausted=9, max_infection=2, boss_defeated=1; primeiro turno observado com saldo conquistado de pelo menos 100: 38; ativações nos turnos 42, 53, 54, 56, 61, 66, 67, 69; itens usados: 0.

#### Interpretação

A retirada do Lixo não acelera diretamente o esgotamento do Monte: a ativação deixa seu tamanho intacto. Pode mudar indiretamente quantos turnos a batalha dura e quantas compras normais serão necessárias. Compare essas trajetórias, não apenas o Monte final.

Cargas conquistadas tarde, Lixo abaixo de cinco ou bloqueios podem impedir uso justamente no trecho ocioso. Os totais acima mostram a cobertura efetiva; este controlador gasta cedo e não reserva cargas para a janela crítica. Não autoriza concluir que o Especial resolveu o travamento humano. Recomendação: manter as regras aprovadas, coletar logs de humanos e comparar uso imediato versus reserva estratégica em uma próxima validação, sem criar outra recuperação ou mudar números agora.

Dados integrais: [144 batalhas e traços](../experiments/chefe-especial-pareado-2026-10-10.json). Reprodução: `node scripts/boss-special-experiment.mjs 12 101001`, depois `node scripts/boss-consolidated-report.mjs`.

#### Variedade: catálogo atual, elegibilidade e frequência observada

A tabela combina as 144 batalhas para medir oportunidades reais por fase. A observação de elegibilidade acontece antes do sorteio; o primeiro anúncio já resolvido pelo fixture conta em seleções, não inventa uma oportunidade anterior. “0 oportunidades” não significa habilidade inelegível; significa fase/condição não observada neste lote.

Separadamente, 15 estados dirigidos × 64 seeds × 3 fases × 6 chefes = 17.280 sorteios condicionais, mais 4.320 sorteios em sequências de histórico. São testes de variedade, não frequência de partidas humanas. Elegibilidade dirigida é uma contagem de cenários, não probabilidade de ocorrer.

| Chefe | Habilidades oficiais | F1 / F2 / F3 |
| --- | --- | --- |
| O Banqueiro | 8 | 4 / 8 / 8 |
| A Dominadora | 13 | 4 / 8 / 12 |
| A Matriarca Esmeralda | 10 | 3 / 7 / 10 |
| Lady Dimitrescu | 8 | 4 / 7 / 8 |
| Rainha Nehelenia | 11 | 7 / 10 / 11 |
| Nemesis | 11 | 5 / 8 / 11 |

##### O Banqueiro

| Fase | Habilidade | Elegível / oportunidades em batalha | Seleções em batalha | Elegível em cenários dirigidos | Seleções condicionais / 960 |
| --- | --- | --- | --- | --- | --- |
| 1 | Juros Fixos (fixed_interest) | 248 / 248 | 90 | 15 / 15 | 364 |
| 1 | Tarifa de Manutenção (maintenance_fee) | 248 / 248 | 58 | 15 / 15 | 177 |
| 1 | Bloqueio de Crédito (credit_block) | 248 / 248 | 56 | 15 / 15 | 141 |
| 1 | Limite de Crédito (credit_limit) | 248 / 248 | 68 | 15 / 15 | 278 |
| 2 | Juros Fixos (fixed_interest) | 213 / 213 | 28 | 15 / 15 | 212 |
| 2 | Tarifa de Manutenção (maintenance_fee) | 213 / 213 | 18 | 15 / 15 | 110 |
| 2 | Bloqueio de Crédito (credit_block) | 213 / 213 | 18 | 15 / 15 | 100 |
| 2 | Auditoria de Naipe (suit_audit) | 213 / 213 | 47 | 15 / 15 | 134 |
| 2 | Penhora (pledge) | 213 / 213 | 12 | 12 / 15 | 24 |
| 2 | Juros Compostos (compound_interest) | 213 / 213 | 34 | 15 / 15 | 128 |
| 2 | Limite de Crédito (credit_limit) | 213 / 213 | 30 | 15 / 15 | 155 |
| 2 | Ágio do Lixo (discard_surcharge) | 213 / 213 | 26 | 15 / 15 | 97 |
| 3 | Juros Fixos (fixed_interest) | 22 / 22 | 2 | 15 / 15 | 212 |
| 3 | Tarifa de Manutenção (maintenance_fee) | 22 / 22 | 3 | 15 / 15 | 110 |
| 3 | Bloqueio de Crédito (credit_block) | 22 / 22 | 2 | 15 / 15 | 100 |
| 3 | Auditoria de Naipe (suit_audit) | 22 / 22 | 4 | 15 / 15 | 134 |
| 3 | Penhora (pledge) | 22 / 22 | 1 | 12 / 15 | 24 |
| 3 | Juros Compostos (compound_interest) | 22 / 22 | 7 | 15 / 15 | 128 |
| 3 | Limite de Crédito (credit_limit) | 22 / 22 | 1 | 15 / 15 | 155 |
| 3 | Ágio do Lixo (discard_surcharge) | 22 / 22 | 2 | 15 / 15 | 97 |

Repetições consecutivas observadas na mesma fase: 0. Repetições nos 720 sorteios sequenciais dirigidos: 0.

##### A Dominadora

| Fase | Habilidade | Elegível / oportunidades em batalha | Seleções em batalha | Elegível em cenários dirigidos | Seleções condicionais / 960 |
| --- | --- | --- | --- | --- | --- |
| 1 | Coleira (collar) | 140 / 140 | 86 | 13 / 15 | 306 |
| 1 | Escolha Forçada (forced_choice) | 140 / 140 | 84 | 13 / 15 | 208 |
| 1 | Exposição (exposure) | 138 / 140 | 68 | 9 / 15 | 108 |
| 1 | Etiqueta de Ferro (iron_etiquette) | 140 / 140 | 66 | 13 / 15 | 210 |
| 2 | Coleira (collar) | 82 / 82 | 22 | 13 / 15 | 179 |
| 2 | Escolha Forçada (forced_choice) | 76 / 82 | 20 | 13 / 15 | 136 |
| 2 | Exposição (exposure) | 82 / 82 | 16 | 9 / 15 | 81 |
| 2 | Troca Forçada (forced_swap) | 82 / 82 | 18 | 14 / 15 | 103 |
| 2 | Mãos Atadas (hands_tied) | 82 / 82 | 20 | 14 / 15 | 58 |
| 2 | Posse (possession) | 82 / 82 | 8 | 12 / 15 | 113 |
| 2 | Etiqueta de Ferro (iron_etiquette) | 82 / 82 | 22 | 13 / 15 | 85 |
| 2 | Favorita (favorite) | 82 / 82 | 28 | 14 / 15 | 141 |
| 3 | Escolha Forçada (forced_choice) | 0 / 0 | 0 | 13 / 15 | 125 |
| 3 | Exposição (exposure) | 0 / 0 | 0 | 9 / 15 | 71 |
| 3 | Troca Forçada (forced_swap) | 0 / 0 | 0 | 14 / 15 | 92 |
| 3 | Mãos Atadas (hands_tied) | 0 / 0 | 0 | 14 / 15 | 86 |
| 3 | Posse (possession) | 0 / 0 | 0 | 12 / 15 | 60 |
| 3 | Etiqueta de Ferro (iron_etiquette) | 0 / 0 | 0 | 13 / 15 | 79 |
| 3 | Favorita (favorite) | 0 / 0 | 0 | 14 / 15 | 32 |
| 3 | Dupla Coleira (double_collar) | 0 / 0 | 0 | 13 / 15 | 96 |
| 3 | Separação (separation) | 0 / 0 | 0 | 14 / 15 | 108 |
| 3 | Controle Absoluto (absolute_control) | 0 / 0 | 0 | 14 / 15 | 91 |
| 3 | Quebra de Vontade (break_will) | 0 / 0 | 0 | 2 / 15 | 12 |
| 3 | Ordem Final (final_order) | 0 / 0 | 0 | 9 / 15 | 44 |

Repetições consecutivas observadas na mesma fase: 0. Repetições nos 720 sorteios sequenciais dirigidos: 0.

##### A Matriarca Esmeralda

| Fase | Habilidade | Elegível / oportunidades em batalha | Seleções em batalha | Elegível em cenários dirigidos | Seleções condicionais / 960 |
| --- | --- | --- | --- | --- | --- |
| 1 | Semente Viva (living_seed) | 84 / 140 | 92 | 8 / 15 | 216 |
| 1 | Raiz Faminta (hungry_root) | 86 / 140 | 82 | 11 / 15 | 301 |
| 1 | Orvalho Restaurador (restorative_dew) | 96 / 140 | 78 | 14 / 15 | 379 |
| 2 | Semente Viva (living_seed) | 48 / 56 | 4 | 9 / 15 | 157 |
| 2 | Raiz Faminta (hungry_root) | 56 / 56 | 12 | 12 / 15 | 167 |
| 2 | Orvalho Restaurador (restorative_dew) | 56 / 56 | 6 | 15 / 15 | 213 |
| 2 | Trepadeiras Gemeas (twin_vines) | 56 / 56 | 12 | 12 / 15 | 75 |
| 2 | Enxerto (graft) | 56 / 56 | 12 | 11 / 15 | 116 |
| 2 | Polen do Lixo (discard_pollen) | 56 / 56 | 12 | 13 / 15 | 144 |
| 2 | Colheita (harvest) | 56 / 56 | 8 | 14 / 15 | 88 |
| 3 | Semente Viva (living_seed) | 4 / 4 | 2 | 9 / 15 | 119 |
| 3 | Raiz Faminta (hungry_root) | 4 / 4 | 0 | 12 / 15 | 137 |
| 3 | Orvalho Restaurador (restorative_dew) | 4 / 4 | 0 | 15 / 15 | 145 |
| 3 | Trepadeiras Gemeas (twin_vines) | 4 / 4 | 0 | 12 / 15 | 99 |
| 3 | Enxerto (graft) | 4 / 4 | 0 | 11 / 15 | 35 |
| 3 | Polen do Lixo (discard_pollen) | 4 / 4 | 0 | 13 / 15 | 65 |
| 3 | Colheita (harvest) | 4 / 4 | 0 | 14 / 15 | 95 |
| 3 | Florescimento Real (royal_bloom) | 4 / 4 | 4 | 14 / 15 | 137 |
| 3 | Casulo Esmeralda (emerald_cocoon) | 4 / 4 | 2 | 15 / 15 | 123 |
| 3 | Coroa da Primavera (spring_crown) | 0 / 4 | 0 | 1 / 15 | 5 |

Repetições consecutivas observadas na mesma fase: 2. Repetições nos 720 sorteios sequenciais dirigidos: 60.

##### Lady Dimitrescu

| Fase | Habilidade | Elegível / oportunidades em batalha | Seleções em batalha | Elegível em cenários dirigidos | Seleções condicionais / 960 |
| --- | --- | --- | --- | --- | --- |
| 1 | Tributo de Sangue (blood_tithe) | 246 / 246 | 120 | 15 / 15 | 423 |
| 1 | Vinho Carmesim (red_wine) | 42 / 246 | 10 | 2 / 15 | 20 |
| 1 | Marca Carmesim (crimson_brand) | 164 / 246 | 58 | 10 / 15 | 231 |
| 1 | Sangue Impuro (impure_blood) | 246 / 246 | 92 | 14 / 15 | 286 |
| 2 | Tributo de Sangue (blood_tithe) | 152 / 152 | 38 | 15 / 15 | 287 |
| 2 | Vinho Carmesim (red_wine) | 84 / 152 | 12 | 2 / 15 | 13 |
| 2 | Marca Carmesim (crimson_brand) | 104 / 152 | 26 | 10 / 15 | 180 |
| 2 | Banquete dos Mortos (cassandra_dead_feast) | 76 / 152 | 22 | 13 / 15 | 91 |
| 2 | Coágulo Carmesim (crimson_clot) | 128 / 152 | 28 | 2 / 15 | 12 |
| 2 | As Três Filhas (three_daughters) | 152 / 152 | 28 | 15 / 15 | 210 |
| 2 | Sangue Impuro (impure_blood) | 152 / 152 | 44 | 14 / 15 | 167 |
| 3 | Tributo de Sangue (blood_tithe) | 205 / 205 | 40 | 15 / 15 | 250 |
| 3 | Vinho Carmesim (red_wine) | 151 / 205 | 19 | 2 / 15 | 11 |
| 3 | Marca Carmesim (crimson_brand) | 168 / 205 | 33 | 10 / 15 | 129 |
| 3 | Banquete dos Mortos (cassandra_dead_feast) | 8 / 205 | 0 | 13 / 15 | 130 |
| 3 | Coágulo Carmesim (crimson_clot) | 193 / 205 | 32 | 2 / 15 | 8 |
| 3 | Portas do Castelo (castle_lockdown) | 205 / 205 | 40 | 15 / 15 | 88 |
| 3 | As Três Filhas (three_daughters) | 138 / 205 | 31 | 15 / 15 | 188 |
| 3 | Sangue Impuro (impure_blood) | 205 / 205 | 36 | 14 / 15 | 156 |

Repetições consecutivas observadas na mesma fase: 0. Repetições nos 720 sorteios sequenciais dirigidos: 0.

##### Rainha Nehelenia

| Fase | Habilidade | Elegível / oportunidades em batalha | Seleções em batalha | Elegível em cenários dirigidos | Seleções condicionais / 960 |
| --- | --- | --- | --- | --- | --- |
| 1 | Jogo Espelhado (mirrored_meld) | 240 / 280 | 54 | 9 / 15 | 153 |
| 1 | Siga o Reflexo (follow_reflection) | 280 / 280 | 76 | 14 / 15 | 278 |
| 1 | Prisão no Espelho (mirror_prison) | 196 / 280 | 22 | 2 / 15 | 16 |
| 1 | Laço do Tigre (tiger_link) | 174 / 280 | 26 | 12 / 15 | 97 |
| 1 | Presa Marcada (tiger_prey) | 226 / 280 | 20 | 9 / 15 | 75 |
| 1 | Olho do Falcão (hawk_suit) | 278 / 280 | 50 | 13 / 15 | 120 |
| 1 | Mão no Espelho (fish_marked_card) | 280 / 280 | 56 | 14 / 15 | 157 |
| 2 | Jogo Espelhado (mirrored_meld) | 156 / 156 | 36 | 9 / 15 | 132 |
| 2 | Siga o Reflexo (follow_reflection) | 156 / 156 | 24 | 14 / 15 | 212 |
| 2 | Espelho do Lixo (discard_mirror) | 154 / 156 | 12 | 13 / 15 | 145 |
| 2 | Prisão no Espelho (mirror_prison) | 156 / 156 | 6 | 2 / 15 | 9 |
| 2 | Laço do Tigre (tiger_link) | 156 / 156 | 24 | 12 / 15 | 55 |
| 2 | Presa Marcada (tiger_prey) | 118 / 156 | 14 | 9 / 15 | 28 |
| 2 | Olho do Falcão (hawk_suit) | 152 / 156 | 16 | 13 / 15 | 133 |
| 2 | Vigilância (hawk_watch) | 120 / 156 | 8 | 1 / 15 | 6 |
| 2 | Mão no Espelho (fish_marked_card) | 156 / 156 | 12 | 14 / 15 | 123 |
| 2 | Reflexo Invertido (fish_inverted) | 150 / 156 | 14 | 9 / 15 | 53 |
| 3 | Jogo Espelhado (mirrored_meld) | 26 / 26 | 0 | 9 / 15 | 109 |
| 3 | Siga o Reflexo (follow_reflection) | 26 / 26 | 6 | 14 / 15 | 180 |
| 3 | Espelho do Lixo (discard_mirror) | 26 / 26 | 4 | 13 / 15 | 111 |
| 3 | Prisão no Espelho (mirror_prison) | 26 / 26 | 4 | 2 / 15 | 10 |
| 3 | Pesadelo Eterno (eternal_nightmare) | 26 / 26 | 4 | 14 / 15 | 121 |
| 3 | Laço do Tigre (tiger_link) | 26 / 26 | 2 | 12 / 15 | 59 |
| 3 | Presa Marcada (tiger_prey) | 16 / 26 | 0 | 9 / 15 | 65 |
| 3 | Olho do Falcão (hawk_suit) | 26 / 26 | 2 | 13 / 15 | 89 |
| 3 | Vigilância (hawk_watch) | 26 / 26 | 4 | 1 / 15 | 3 |
| 3 | Mão no Espelho (fish_marked_card) | 26 / 26 | 4 | 14 / 15 | 112 |
| 3 | Reflexo Invertido (fish_inverted) | 24 / 26 | 2 | 9 / 15 | 37 |

Repetições consecutivas observadas na mesma fase: 0. Repetições nos 720 sorteios sequenciais dirigidos: 0.

##### Nemesis

| Fase | Habilidade | Elegível / oportunidades em batalha | Seleções em batalha | Elegível em cenários dirigidos | Seleções condicionais / 960 |
| --- | --- | --- | --- | --- | --- |
| 1 | Invasão da Horda (horde_invasion) | 184 / 280 | 56 | 11 / 15 | 244 |
| 1 | Caçada S.T.A.R.S. (stars_hunt) | 280 / 280 | 98 | 14 / 15 | 279 |
| 1 | Tentáculo Infeccioso (infectious_tentacle) | 280 / 280 | 104 | 13 / 15 | 276 |
| 1 | Zona Contaminada (contaminated_zone) | 156 / 280 | 26 | 7 / 15 | 85 |
| 1 | Comando da Horda (horde_command) | 96 / 280 | 20 | 1 / 15 | 12 |
| 2 | Invasão da Horda (horde_invasion) | 264 / 290 | 42 | 11 / 15 | 203 |
| 2 | Caçada S.T.A.R.S. (stars_hunt) | 290 / 290 | 72 | 14 / 15 | 249 |
| 2 | Tentáculo Infeccioso (infectious_tentacle) | 280 / 290 | 55 | 13 / 15 | 186 |
| 2 | Zona Contaminada (contaminated_zone) | 180 / 290 | 35 | 7 / 15 | 68 |
| 2 | Comando da Horda (horde_command) | 160 / 290 | 20 | 1 / 15 | 8 |
| 2 | Lança-Foguetes (rocket_launcher) | 290 / 290 | 64 | 12 / 15 | 171 |
| 2 | Regeneração Parasita (parasite_regeneration) | 134 / 290 | 8 | 1 / 15 | 5 |
| 2 | Reanimação Viral (viral_reanimation) | 90 / 290 | 6 | 1 / 15 | 6 |
| 3 | Invasão da Horda (horde_invasion) | 240 / 240 | 31 | 11 / 15 | 133 |
| 3 | Caçada S.T.A.R.S. (stars_hunt) | 240 / 240 | 36 | 14 / 15 | 188 |
| 3 | Tentáculo Infeccioso (infectious_tentacle) | 160 / 240 | 25 | 13 / 15 | 141 |
| 3 | Zona Contaminada (contaminated_zone) | 170 / 240 | 18 | 7 / 15 | 40 |
| 3 | Comando da Horda (horde_command) | 69 / 240 | 7 | 1 / 15 | 8 |
| 3 | Lança-Foguetes (rocket_launcher) | 240 / 240 | 35 | 12 / 15 | 41 |
| 3 | Regeneração Parasita (parasite_regeneration) | 51 / 240 | 4 | 1 / 15 | 1 |
| 3 | Reanimação Viral (viral_reanimation) | 126 / 240 | 11 | 1 / 15 | 1 |
| 3 | Barragem de Tentáculos (tentacle_barrage) | 149 / 240 | 28 | 13 / 15 | 141 |
| 3 | Extermínio S.T.A.R.S. (stars_extermination) | 240 / 240 | 38 | 12 / 15 | 108 |
| 3 | Surto Ômega (omega_outbreak) | 240 / 240 | 21 | 15 / 15 | 158 |

Repetições consecutivas observadas na mesma fase: 0. Repetições nos 720 sorteios sequenciais dirigidos: 15.

##### Recomendação de variedade

Não igualar catálogos a 13 por obrigação. O Banqueiro dispõe de quatro habilidades na fase 1 e oito nas fases seguintes; Juros Fixos tem peso maior, e Garantia exige condições reais. Frequência baixa de uma habilidade condicional não justifica removê-las nem forçar alvos inválidos. A proteção contra repetição só se aplica quando há outra elegível. Nenhum peso ou regra de elegibilidade foi alterado neste pacote.

Para a Lady, duas propostas temáticas completas estão em [PROPOSTAS_DIMITRESCU_2026-10-10.md](#arquivo-propostas-dimitrescu-2026-10-10). Continuam fora da rotação, aguardando aprovação. Os demais chefes precisam de validação humana do incômodo com repetição antes de expandir o catálogo.

Dados condicionais: [variedade atual](../experiments/chefe-variedade-atual-2026-10-10.json).


---

<a id="arquivo-lote-final-itens-dimitrescu-2026-10-10"></a>

## Origem: LOTE_FINAL_ITENS_DIMITRESCU_2026-10-10.md

### Lote final — itens da Lady Dimitrescu

Implementação local iniciada em 10/10/2026 e validada em 11/10/2026, somente o lote solicitado. Nenhum checklist antigo foi reaberto; outros chefes e animações do Especial não foram alterados. Sem commit, push ou deploy.

#### Regras aplicadas

| Item | Petrificação do alvo | Efeito vigente | Rótulo na mão |
| --- | ---: | --- | --- |
| Frasco Congelante | −100 HP máximo | Congela todas as filhas vivas por duas oportunidades consecutivas dos cooperadores, incluindo a atual | CONGELA AS 3 |
| Relíquia | −100 HP máximo | +20% de dano recebido de ataques diretos até morrer; não acumula | DANO +20% |
| Explosivo/Granada | −50 HP máximo | 100 de impacto e 15 por rodada até morrer; sem empilhar hemorragia | 100 DANO · SANGRA 15 |
| Adaga | −25 HP máximo, preservado | Transmite 80% do dano efetivo de ataques à vida da Lady | VÍNCULO 80% |
| Anticoagulante | −75 HP máximo, preservado | Regeneração 20→10 permanente | REGEN 20→10 |

Lady com 2000 HP, filhas com 500 HP, piso recuperável de 300, regeneração 20/10, PROT. de 500 por filha, Sede e Fúria preservados. O workspace estava em hemorragia de 20; foi alterada para 15. Sem alterar a associação dos 15 itens às cartas.

Frasco impede regeneração e passivas de Bela, Cassandra e Daniela; cancela objetivos individuais pendentes sem punição. As Três Filhas respeita o bloqueio. Hemorragia, ataques, habilidades próprias da Lady e outros itens continuam funcionando. Só o alvo perde 100 de máximo; as outras filhas não são petrificadas.

Relíquia não silencia mais. Ordem: dano-base → bônus de 20% → limite de HP disponível → Adaga transmite 80% do efetivo. Base 100 causa 120 na filha e 96 na Lady; filha com 40 recebe 40 e transmite 32. Bônus e transmissão arredondam para baixo. Granada, hemorragia e outras fontes indiretas não recebem bônus nem transmitem pela Adaga.

#### Decisões de duração, duplicatas e saves

- Reaplicar Frasco **renova para duas oportunidades a partir do uso mais recente**, não soma durações. Conta a oportunidade atual mesmo com HP completo. Morte da filha-alvo não descongela as demais.
- Expiração ocorre depois das consequências do segundo turno, inclusive regen ao fechar a rodada. Primeiro jogador: resto do próprio turno+parceiro; segundo: resto do próprio turno+primeiro da rodada seguinte. Não usa somente `roundNumber`.
- Objetivo cancelado não é recriado no meio da rodada nem punido após o descongelamento. Novas passivas surgem na próxima seleção normal. Regen e efeitos próprios da Lady retomam seus fluxos normais.
- Relíquia duplicada mantém 20%, mas anexa/consome carta e petrifica respeitando o piso. Explosivo reaplicado mantém um único sangramento de 15 e preserva o controle do último tick; novo impacto de 100 é permitido.
- Saves v2 anteriores migram uma única vez (`castleItemEffectsVersion:1`, regras `itemEffectsVersion:2`): Relíquias anexadas a filhas vivas passam ao bônus de 20%; Frio antigo ainda ativo vira duas oportunidades globais a partir da retomada; hemorragia ainda ativa passa a 15. Sem repetir petrificação, impacto, cura ou tick; preserva feridas, consumo, anexos, PROT. e último tick. Sangramento expirado não volta.
- Saves v1 continuam no contrato legado já existente. Experimentos históricos pinam `itemEffectsVersion:1`; dados e resultados anteriores não foram recalculados.
- Snapshot/undo/reload guardam efeito global, turnos já consumidos e bônus da Relíquia. Eventos/turnos duplicados não gastam duração outra vez.

#### Interface

As cinco legendas usam um helper único para qualquer cópia. Ajuda informa efeito completo e petrificação. Rótulos mais longos ocupam somente a parte exposta da carta, sem alterar espaçamento da mão, tamanho da carta ou tamanho da fonte. No celular, o espaçamento entre letras da legenda foi reduzido em 0,5 px para caber sem diminuir a fonte. A legenda também recebe toque no mesmo controle do item. Carta e item continuam controles separados.

As três filhas congeladas recebem borda azul, frost leve nas extremidades e chip CONGELADA com duração restante. HP, status e anexos permanecem visíveis e clicáveis. `prefers-reduced-motion` elimina a pulsação, mantendo o estado estático. Não há partículas/loops JS nem animação nova no Especial.

#### Arquivos deste lote

- Motor: `js/boss/dimitrescu-castle.js`, `js/boss/mechanics/dimitrescu.js`, guarda da reação de Daniela em `js/boss/boss-engine.js`.
- UI/cache: `js/boss/ui/dimitrescu-castle-view.js`, `styles/boss/dimitrescu.css`, `service-worker.js` (v303, sem publicação).
- Reprodutibilidade histórica: `scripts/dimitrescu-item-experiment.mjs` (fixa contrato antigo, sem recalcular resultados).
- Testes: novo `tests/dimitrescu-item-final.test.mjs`; expectativas em `tests/dimitrescu-items-v2.test.mjs`, `tests/dimitrescu-package-b.test.mjs`, `tests/dimitrescu-cadence.test.mjs`, `tests/boss-resource-feedback.test.mjs`, `tests/dimitrescu-item-experiment.test.mjs`, `tests/playtest-p0.test.mjs`; navegador em `tests/dimitrescu-castle.browser.mjs` e `tests/playtest-p0.browser.mjs`.
- Documentação: `docs/DOCUMENTACAO_CHEFE_DA_MESA.md`, `docs/INVENTARIO_HABILIDADES_CHEFES.md`, `docs/HANDOFF_DESENVOLVIMENTO_BURACO.md`, `docs/ETAPA_2_DIMITRESCU_2026-10-10.md`, `docs/PACOTE_CONSOLIDADO_CHEFES_2026-10-10.md`, `docs/REWORK_ITENS_DIMITRESCU_2026-10-08.md`, `docs/BALANCEAMENTO_SEIS_CHEFES_2026-10-10.md` e este relatório. Relatórios anteriores receberam indicação de supersessão, sem alterar tabelas históricas. Checklist antigo intacto.

#### Validação

- Suíte ampla: **1.401 aprovados, zero falhas/skips** — `.cache/dimitrescu-final-unit.log`.
- 17 testes novos: dois posicionamentos do Frasco, travessia de rodada, objetivos pendentes, As Três Filhas, reaplicação, eventos duplicados, bleed/Anti/ataques/morte, combo Relíquia/Adaga, humano/BOT/Final, migração e undo/reload/snapshot.
- Browser dedicado da Lady: 1920/1376/390 px; mouse/toque/teclado, gelo e ajuda, Relíquia, hemorragia de 15, HP/anexos, ausência de overflow e movimento reduzido — `.cache/dimitrescu-final-browser.log`.
- Fixture real de UI com dois clientes serializados: 1024×768, 1376×1032, 1920×1080 e 390 px, zoom 1; rótulos, toque separado, redraw/reordenação/compra/undo/reload, gelo nas três e popovers acessíveis. Log final: `.cache/dimitrescu-final-verified-browser.log`. Capturas: `.cache/playtest-p0/freeze-{largura}.png`; `.cache/dimitrescu-ux/freeze-reduced-{largura}.png`.
- `git diff --check` sem erros. Staging existente preservado.

#### Aprovações e limites

Nenhuma aprovação funcional adicional necessária para este lote: as regras foram autorizadas. Restam homologação em tablet/celular físicos e partida autenticada de dois humanos no Firebase. Browser emulado e suíte automatizada não equivalem a esses testes nem comprovam taxa de vitória humana. Nenhuma frente antiga foi reiniciada.


---

<a id="arquivo-propostas-dimitrescu-2026-10-10"></a>

## Origem: PROPOSTAS_DIMITRESCU_2026-10-10.md

### Duas propostas para a Lady — aguardando aprovação

Não implementadas, não adicionadas ao catálogo nem ao sorteio. Números abaixo são **candidatos de teste**, não mudanças de produção. O pacote B e as oito habilidades atuais permanecem.

#### 1. Bifurcação Carmesim — escolha estratégica

**Tema:** escolher enfrentar a matriarca no salão principal ou avançar pela ala das filhas. Fases 2–3; peso-base candidato 3. Anúncio antes dos dois turnos da equipe, escolha compartilhada única e persistida.

**Elegibilidade:** Lady viva, ao menos uma filha viva e PROT. restante positiva. As duas rotas precisam ter alvo real; nenhuma carta específica é marcada. Não exigir uma jogada pronta na mão para anunciar. Não anunciar no meio de uma rodada, quando um dos jogadores já perdeu sua oportunidade de contribuir.

**Escolha e objetivo, até o fim da rodada:**

| Rota | Objetivo candidato | Sucesso | Parcial | Falha |
| --- | --- | --- | --- | --- |
| Salão principal | Causar 80 de dano direto efetivo à Lady, incluindo dano consumido pela PROT./Coágulo | 80 ou mais: sem punição | 40–79: +3 Sede na fase 2, +4 na 3 | 0–39: +6/+8 Sede |
| Ala das filhas | Causar 120 de dano efetivo às filhas | 120 ou mais: sem punição | 60–119: +3/+4 Sede | 0–59: +6/+8 Sede |

Contar ataques legais e o impacto imediato de itens. Não contar cura revertida, ticks passivos de hemorragia, remoção de PROT. por morte ou dano retransmitido pela Adaga uma segunda vez. O teto do alvo limita dano efetivo. A morte de todas as filhas após escolher a ala encerra o objetivo com sucesso, mesmo quando tinham menos de 120 HP disponíveis: não exigir dano em um alvo morto.

**Interações:** pipeline atual Coágulo → PROT. → HP; matar filha mantém remoção de PROT. e Fúria atuais. Adaga continua funcionando, mas não duplica o progresso. Sede da falha é uma fonte própria, sem substituir Tributo, Fúria ou passivas. Frio, Anti, Relíquia e hemorragia não são alterados. Especial continua voluntário, com as regras compartilhadas.

**HUD:** `Bifurcação Carmesim`, linha `Rota: Ala das filhas`, barra `Dano 60/120`, linha `Prazo: fim da rodada`, consequência em outra linha. Ajuda: “Escolham atacar a Lady ou as filhas. Os dois podem ajudar. Cumprir o dano escolhido evita a Sede extra.” Mostrar os dois objetivos e consequências no diálogo de escolha; não ocultar o custo antes da decisão. Nome distinto da habilidade existente `Portas do Castelo`, que bloqueia o Lixo.

**Áudio/animação:** reutilizar destaque curto da área de alvo; nenhuma arte externa, fala nova ou efeito pesado obrigatório.

**Testes previstos:** escolha concorrente atômica; dois jogadores no mesmo progresso; ataque à PROT., Coágulo e HP; dano limitado ao HP restante; impacto/tick distintos; Adaga sem crédito duplicado; mortes; undo/reload; prazo; sucesso/parcial/falha; nenhuma cobrança duplicada; tela pequena e teclado.

**Impacto previsto:** cria tensão entre remover uma filha e atravessar a proteção, sem premiar dano gratuito ou repetir uma carta marcada. Pode favorecer ataques preparados: comparar sementes e manter a habilidade fora da rotação até medir Sede por rodada e tempo de morte da última filha. Peso 3 não está aprovado.

#### 2. Salão das Duas Sombras — cooperação

**Tema:** a Lady tenta separar a equipe; a resposta exige que os dois participem da mesa. Fases 2–3; peso-base candidato 2.

**Elegibilidade:** dois cooperadores com pelo menos uma carta não bloqueada para jogar, ambos ainda com um turno completo nesta rodada e mesa que permita criar ou ampliar jogos. Validar alvos e bloqueios reais, sem exigir prova de uma combinação pronta. Sem jogador disponível, não anunciar nem punir artificialmente.

**Objetivo:** cada jogador deve contribuir ao menos uma carta da própria mão em uma jogada legal, até o fim da rodada. Pode ser criação ou extensão, no mesmo jogo ou em jogos diferentes. Não contar apenas comprar, descartar, sacrificar um item, trocar uma carta de controle, reorganizar ou o topo obrigatório vindo do Lixo. Contribuições adicionais da mão na retirada do Lixo contam normalmente.

- Sucesso: os dois contribuíram — sem Sede extra.
- Parcial: somente um contribuiu — +3 Sede na fase 2 / +4 na fase 3.
- Falha: nenhum contribuiu — +6 / +8 Sede.

Não reduzir Sede acumulada por outros efeitos; não adicionar recompensa de dano, cura ou PROT. A contribuição é por ID físico e autor, não por render ou tamanho final do jogo. BOT pode cumprir o objetivo pelas jogadas normais, mas não recebe permissão para gastar o Especial automaticamente.

**Interações:** filhas mantêm suas passivas e podem criar pressão paralela; Relíquia não silencia esta habilidade da Lady. Itens, Fúria e Vínculo permanecem; dano da Adaga não substitui a contribuição do segundo jogador. Cartas recebidas pelo Especial são da mão, livres para contribuir depois, sem obrigação de jogar imediatamente.

**HUD:** `Salão das Duas Sombras`; uma linha por jogador: `Biel: falta contribuir` / `Luana: contribuiu`; prazo e consequência em linhas próprias. Ajuda: “Cada um precisa jogar uma carta em um jogo válido. Comprar ou descartar não conta. Os dois têm até o fim da rodada.” Sem rótulo ATUAL ou frase única dividida por pontos.

**Áudio/animação:** breve confirmação no nome de cada jogador, reutilizando feedback de contribuição; movimento reduzido mostra só o estado atualizado.

**Testes previstos:** novo jogo/extensão; autores diferentes; IDs duplicados; carta do Especial; origem mão versus topo do Lixo; sacrifício de item não conta; bloqueios; BOT/humano; final antecipado; escolha/prazo/undo/sync; nome longo; dois turnos completos garantidos.

**Impacto previsto:** pode aumentar Sede quando uma mão fica sem combinação mesmo com um parceiro forte. Deve substituir parte da frequência de pressão existente, não apenas adicionar mais punição por rodada. Primeiro testar peso 2 e consequências candidatas; não aprovar automaticamente pela temática.

#### Aprovação necessária

Escolher aceitar, ajustar ou rejeitar cada proposta e seus números. Após aprovação: implementação, testes dirigidos e A/B ampliado. Nenhuma dessas propostas está “pronta em produção”.


---

<a id="arquivo-dimitrescu-itens-selecao-direta-2026-10-11"></a>

## Origem: DIMITRESCU_ITENS_SELECAO_DIRETA_2026-10-11.md

### Dimitrescu — aplicação direta dos itens da mão

#### Entrega

O toque principal no item inicia o modo de aplicação. O mesmo item cancela;
outro item troca a seleção. As filhas elegíveis recebem contorno discreto e o
toque no retrato aplica o item imediatamente, sem popover de alvos nem confirmação.
Escape e toque fora cancelam sem consumir a carta. O controle separado “?”
preserva a explicação completa. Selecionar a carta pelo valor/naipe continua
independente de selecionar seu item.

A seleção é exclusivamente local: não entra em Firebase, saves ou undo. É
invalidada por troca de turno/jogador/partida, morte de filha, encerramento,
pausa, undo, retirada/consumo da carta e perda de elegibilidade. Reload começa
sem seleção. Os dois listeners de cancelamento são registrados uma única vez.

O modo usa `getCastleItemUseStatus`, `canUseCastleItem` e `useCastleItem`.
O fluxo anterior de sacrifício, registro de ação, animação, undo e commit foi
mantido. A seleção é retirada antes de entrar no action gate, evitando que
duas tentativas enfileirem dois usos do mesmo item. O alvo normal de dano não
é alterado pelo uso de item.

#### Legibilidade e áreas clicáveis

As legendas agora ocupam até duas linhas, com faixa própria abaixo da arte.
As cartas e o espaçamento da mão não foram alterados; a fonte original de 8px
foi preservada. Apenas a arte sobreposta do item foi reposicionada dentro da
carta para reservar essa faixa. Valor, naipe, ilustração e marcadores continuam.

| Item | Texto completo | Forma compacta no celular |
| --- | --- | --- |
| Explosivo | 100 DANO / SANGRA 15 | 100 HP / 15/ROD |
| Adaga | VÍNCULO / 80% | VÍNC. / 80% |
| Frasco | CONGELA / AS 3 | GELA / AS 3 |
| Relíquia | DANO / +20% | DANO / +20% |
| Anticoagulante | REGEN / 20→10 | REGEN / 20→10 |

Os valores são derivados das regras da partida, não hardcoded para partidas
antigas. O texto completo permanece na ajuda e nos nomes acessíveis dos controles.

Durante a validação mobile, a pilha de cartas sacrificadas de Cassandra
interceptou o toque destinado ao retrato. No modo de aplicação, essa pilha não
captura ponteiro; ao cancelar/aplicar, sua ajuda volta a funcionar normalmente.
Os chips de ajuda das filhas continuam independentes do botão do retrato.

#### Regras preservadas

- Explosivo: 100 impacto, hemorragia permanente de 15 por rodada, sem empilhar.
- Adaga: transmissão de 80%.
- Frasco Congelante: congelamento global temporário existente.
- Relíquia: +20% de dano direto.
- Anticoagulante: regeneração 20→10.
- Petrificação por tipo, limite de HP, carta física sacrificada, descarte e
  retorno após morte continuam exclusivamente no motor canônico.

Nenhum arquivo do motor de combate, BOT ou Especial foi modificado.

#### Arquivos

- `app.js`: seleção, cancelamento, aplicação canônica e ajuda separada na mão.
- `js/boss/ui/dimitrescu-castle-view.js`: elegibilidade e destino do clique das filhas.
- `styles/boss/dimitrescu.css`: estado selecionado, contornos, ajuda e legendas.
- `service-worker.js`: versão de cache v305 para entregar o JS/CSS atualizado.
- `tests/dimitrescu-item-selection.test.mjs`: seis testes do código real da seleção.
- `tests/dimitrescu-item-selection.browser-cases.mjs`: interação e geometria nos dois clientes.
- `tests/playtest-p0.browser.mjs`: integração dos novos casos e substituição das
  expectativas do seletor antigo; opção `P0_UI_ONLY=1` evita apresentações do Especial.
- `tests/dimitrescu-castle.browser.mjs`: fixture legada adaptada ao alvo direto.

#### Validação

- Suíte unitária completa: **1.415 aprovados, zero falhas**. Inclui regressões
  dos seis chefes, BOTs, itens modernos/legados, saves e combate.
- Edge/Chromium real headless: **1024×768, 1376×1032, 1920×1080 e 390×844**.
- Dois humanos simulados em páginas separadas com snapshots serializados;
  aplicação por ambos e comparação de resultado com o motor para os cinco itens.
- Mouse, toque e teclado; toggle, troca, Escape, fora dos alvos, filha morta,
  restrições da compra/descarte, dupla tentativa, mudanças de estado, undo/reload,
  conflito com alvo normal de dano e segunda aplicação sobre filha com carta anexada.
- Geometria dos cinco rótulos em escala normal e ampliação CSS de 125%:
  contidos na carta, sem overflow nem sobreposição com arte ou controle de ajuda.
- Regressão da interface: 136 combinações habilidade/fase dos seis chefes por
  resolução, além dos casos P0 e watchdog dos BOTs, usando `P0_UI_ONLY=1`.
- Renderer legado: 1920, 1376 e 390px, com itens v1/v2, toque, teclado,
  petrificação, hemorragia/regeneração e movimento reduzido.
- `git diff --check`: sem erros.

##### Evidências locais

- `.cache/playtest-p0/items-direct-1024.png`
- `.cache/playtest-p0/items-direct-1376.png`
- `.cache/playtest-p0/items-direct-1920.png`
- `.cache/playtest-p0/items-direct-390.png`
- `.cache/dimitrescu-item-unit.log`
- `.cache/dimitrescu-items-browser.log`
- `.cache/dimitrescu-items-ui-regression.log`
- `.cache/dimitrescu-item-legacy-browser.log`

##### Limites da validação

Não houve partida humana em aparelhos físicos nem escrita em Firebase real.
A sincronização foi simulada com o código/estado real em dois navegadores.
A ampliação adicional é CSS, não o zoom nativo do navegador.

A execução sem filtros parou na asserção visual do Especial
`character holds fully on screen during the flight`; ela não foi corrigida
neste lote, pois a animação está fora do escopo. Log:
`.cache/dimitrescu-items-full-browser.log`. Os testes do Especial na suíte
unitária passaram; não se declara aprovação integral daquele teste visual.

Sem commit, push ou deploy. Nenhum checklist anterior foi reaberto.


---

<a id="arquivo-especial-cooperativo-animacao-2026-10-11"></a>

## Origem: ESPECIAL_COOPERATIVO_ANIMACAO_2026-10-11.md

### Especial Cooperativo — apresentação visual (11/10/2026)

#### Escopo

Somente apresentação cosmética após uma transação aceita. Custo, pontuação,
beneficiário, retirada das cinco cartas do Lixo e todas as reações dos chefes
permanecem inalterados. Inclui agora as seis PNGs e os seis MP3s fornecidos.
Sem commit, push ou deploy.

#### Sequência e ajuste solicitado durante a validação

Configuração central: `js/boss/ui/cooperative-special-presentation.js`, constante
`SPECIAL_PRESENTATION`. Duração final: **3.000 ms**, aumentada após o feedback de
que a imagem estava pequena e a entrada/saída rápidas.

- Entrada pela direita: 750 ms, com fade discreto.
- Personagem parado: 1.500 ms. O easing é aplicado por trecho, não ao relógio
  inteiro, para preservar essa pausa.
- Cinco versos começam a voar aos 900 ms, do Lixo à mão local/remota.
  Cada voo dura 900 ms, com 75 ms entre cartas. A última chega aos 2.100 ms.
- Feedback discreto de chegada, sem mostrar faces ocultas.
- Saída para a direita: últimos 750 ms.

Os elementos têm posição fixa e `pointer-events: none`. Não deslocam cartas,
HUD ou controles. As seis imagens usam o mesmo quadro de referência da Jill
(proporção 1200:1800), com `object-fit: contain` para preservar cada original.
A posição e o tamanho não dependem mais dos chips/auxiliares de cada chefe.
A faixa da apresentação mantém a mão, o Lixo, o Monte e os botões livres;
retratos e auxiliares podem ser sobrepostos brevemente pelo efeito cosmético. A entrada
e saída pela direita são recortadas à área segura; a PNG aparece inteira durante
a pausa, sem atravessar visualmente os textos e controles no percurso.
Em telas pequenas a personagem permanece menor que no desktop. Sem espaço
seguro, utiliza somente o voo das cartas.

#### Assets originais

Mapeamento central: `js/boss/ui/cooperative-special-assets.js`, export
`SPECIAL_CHARACTER_ASSETS` (reexportado pelo módulo de apresentação).
Os arquivos fornecidos
foram copiados sem recorte, reprocessamento, compressão ou alteração de pixels;
SHA-256 foi comparado com os originais.

| Chefe | Personagem | Caminho no projeto | Resolução original |
| --- | --- | --- | --- |
| Dimitrescu | Ada Wong | `assets/images/special/ada-wong.png` | 1024 × 1536 |
| Nemesis | Jill Valentine | `assets/images/special/jill-valentine.png` | 1200 × 1800 |
| Nehelenia | Sailor Moon | `assets/images/special/sailor-moon.png` | 941 × 1672 |
| Banqueiro | PNG “17_29_15-1” | `assets/images/special/banker.png` | 1024 × 1536 |
| Dominadora | PNG “17_29_17-2” | `assets/images/special/dominadora.png` | 1024 × 1536 |
| Matriarca Esmeralda | PNG “17_29_19-3” | `assets/images/special/matriarca-esmeralda.png` | 1024 × 1536 |

Todos os seis chefes têm asset configurado. Imagem ausente, inválida,
carregamento acima de 400 ms ou falta de espaço seguro usam o voo das cinco
cartas como fallback, sem inventar outra imagem. As três PNGs novas são RGBA;
transparência, proporção, resolução e pixels foram preservados byte a byte.

#### Sincronização e limpeza

- Ambos os clientes usam o ID confirmado em `resolvedActionIds`; abrir ajuda ou
  uma transação rejeitada não dispara apresentação.
- Histórico cosmético por partida/cliente, persistido em `sessionStorage` quando
  disponível. Snapshot inicial/reload é baseline, não reprodução de eventos.
- Snapshots repetidos, undo, reconexão e revisões antigas não repetem a ação.
- O cliente remoto aplica e renderiza o snapshot antes de iniciar o efeito.
  O autor também inicia sem aguardar imagem/slide. A liberação do action gate
  e a atualização real da mão não aguardam a animação.
- Undo, troca/saída de partida, substituição por outro evento, aba ocultada e
  resize cancelam nós/animações/timers. Respostas de imagens atrasadas não
  ressuscitam um efeito cancelado. Existe limpeza de segurança por prazo.
- `prefers-reduced-motion` dispensa movimentos, sem cancelar o Especial real.
- `onCue('entry')` inicia um único SFX no mesmo relógio da entrada do personagem;
  se a PNG falhar, inicia junto ao voo fallback. Chegada não toca outro MP3.
- Som por cliente/evento confirmado: ambos os cooperadores ouvem uma vez
  localmente; não há comando extra de áudio gravado/enviado pelo Firebase.
- O som é um clone do SFX, sem loop. O volume fixo 0,8 foi substituído pela calibração por arquivo em `js/audio-balance.js`; ver [áudio e padrão dos itens](#arquivo-audio-e-itens-padrao-2026-10-11). A ordem de reprodução e as regras do Especial permanecem iguais.
  Mute geral silencia/interrompe; “música desligada” ainda permite esse SFX.
  O primeiro clique de desbloqueio de áudio não toca os clipes do Especial.
- PNG/voo mantêm os 3 segundos. Clipes maiores terminam naturalmente, mantendo
  somente um som cancelável depois da remoção do overlay, nunca bloqueando o jogo.
  Undo/saída/resize/aba oculta/novo evento também param esse trecho final.
- Falha de arquivo, decoder ou autoplay segue silenciosamente, sem retries de
  reprodução, erro de gameplay ou repetição posterior. Há prazo máximo de limpeza.
- Movimento reduzido mantém a política anterior: sem apresentação cosmética,
  inclusive sem áudio de entrada; as cinco cartas são concedidas normalmente.

#### Arquivos de implementação

- `app.js`: disparo confirmado local/remoto e cancelamento de apresentação.
- `js/boss/ui/cooperative-special-assets.js`: pares PNG/MP3 dos seis chefes.
- `js/boss/ui/cooperative-special-audio.js`: cue único e vida útil do som.
- `js/audio.js`: fontes dos seis SFX; mute, clones canceláveis e limpeza.
- `js/boss/ui/cooperative-special-presentation.js`: tempos, geometria,
  sequência e deduplicação.
- `js/boss/ui/cooperative-special-ui.js`: mantém renderer e reexport compatível.
- `styles/boss-mode.css`: estilos exclusivos dos nós cosméticos.
- `service-worker.js`: cache local v309; não publicado.
- Três PNGs novas em `assets/images/special/` e seis MP3s em `assets/sfx/special/`.

#### MP3s originais — integração final

| Chefe | Arquivo fornecido | Arquivo no projeto | Duração decodificada |
| --- | --- | --- | ---: |
| Dimitrescu/Ada | `poder ada wong.mp3` | `assets/sfx/special/ada-wong.mp3` | 1,985 s |
| Nemesis/Jill | `poder kill valentine.mp3` | `assets/sfx/special/jill-valentine.mp3` | 3,474 s |
| Nehelenia/Sailor | `poder sailor moon.mp3` | `assets/sfx/special/sailor-moon.mp3` | 2,509 s |
| Banqueiro | `poder contra banqueiro.mp3` | `assets/sfx/special/banker.mp3` | 3,056 s |
| Dominadora | `poder contra dominadora.mp3` | `assets/sfx/special/dominadora.mp3` | 3,918 s |
| Matriarca Esmeralda | `poder contra matriarca.mp3` | `assets/sfx/special/matriarca-esmeralda.mp3` | 3,814 s |

Os MP3s também foram copiados sem edição/recompressão. Os nove arquivos novos
passaram pela comparação SHA-256 original × destino. O teste de integridade
mantém esses hashes e verifica formato RGBA/resolução das PNGs novas.

#### Verificação histórica — antes da integração dos MP3s

- Suíte automatizada: **1.409 testes aprovados**, incluindo regressões dos seis
  chefes. Log local: `.cache/special-character-full-unit.log`.
- Novos testes: `tests/cooperative-special-presentation.test.mjs` e
  `tests/cooperative-special-presentation.browser-cases.mjs`.
- Fixtures existentes atualizadas: `tests/playtest-p0.browser.mjs`,
  `tests/match-history.test.mjs`, `tests/boss-lab-persistence.test.mjs`.
- Chromium em 1024×768, 1376×1032, 1920×1080 e 390×844, sem zoom; dois clientes
  sincronizados por transporte CAS simulado, destinatário local, parceiro e BOT.
  Testa contagem, deduplicação, pausa visual, geometria, cleanup, undo, reload,
  mudança de partida, imagem ausente/lenta e movimento reduzido.
- Matriz visual final aprovada: **36 apresentações em dois clientes** (três
  personagens × três destinatários × quatro resoluções), além dos casos de
  cancelamento/fallback. Log: `.cache/special-character-visual-final.log`.
- Regressão ampla de navegador aprovada nas quatro resoluções: seis chefes,
  136 combinações de habilidade/fase por resolução, mouse/toque, transações,
  itens, undo/reload, cronômetros e recuperação de BOT. Log:
  `.cache/special-character-browser-complete.log`.
- `node --check app.js`, sintaxe do módulo novo e `git diff --check`: aprovados.
- Capturas: `.cache/playtest-p0/hero-{dimitrescu,nemesis,nehelenia}-{largura}.png`.

Limitação: os testes de dois humanos usam handlers reais em fixture de navegador
e estado serializado; não são uma partida autenticada no Firebase nem um teste
em tablet físico. O ajuste de percepção visual final ainda pode ser avaliado no
playtest humano, sem modificar as regras.

#### Refinamento solicitado — voo visível e quadro compartilhado

O voo não havia sido removido do motor: os versos tinham somente 22×32 px e
começavam a desaparecer logo após 12% do percurso. Além disso, a cor foi atribuída
como propriedade JavaScript do objeto `style`, em vez de uma variável CSS real,
deixando as bordas sem contraste. Agora a variável usa `style.setProperty`.

- Versos com largura entre 36 e 72 px, relativa ao Lixo; borda colorida e desenho
  discreto de verso, sem faces ou metadados das cartas.
- Movimento em arco, chegada levemente espalhada, opacidade mantida até 90% do
  percurso e fade somente no final. O fallback também ganhou voo de 850 ms.
- Quadro baseado na Jill, em uma faixa comum da mesa: mesma posição e mesmas
  dimensões para Ada, Jill e Sailor em cada viewport. A Sailor naturalmente ocupa
  menos largura dentro desse quadro, pois seu original é mais estreito; não há
  esticamento ou alteração da PNG.
- Os testes de navegador comparam numericamente os quadros das três personagens,
  verificam cinco versos visíveis e suas bordas, destinatários local/remoto/BOT,
  duplicatas, cancelamento, reload, undo e fallback.

Resultados e evidências deste refinamento estão registrados em
`ESPECIAL_E_DEVTOOLS_REFINAMENTO_2026-10-11.md`. A matriz histórica acima pertence
à implementação anterior; não substitui a validação deste ajuste.

#### Verificação final — seis personagens e áudio

- **1.451 testes automatizados aprovados**, zero falhas/skips:
  `.cache/special-six-audio-all.log`.
- **15 testes focados** de apresentação/áudio: integridade SHA-256, pares de
  assets, ambos os clientes, beneficiários humano/local/remoto/BOT, IDs
  confirmados, snapshots duplicados/obsoletos, reload/undo, áudio bloqueado,
  mute, pausa, AudioContext atrasado, fim natural e cancelamento do trecho final.
  Log: `.cache/special-six-audio-focused.log`.
- **72 apresentações em dois clientes**: seis chefes × três beneficiários ×
  quatro viewports (1024×768, 1376×1032, 1920×1080, 390×844), sem zoom.
  Cinco versos por cliente, imagem e som corretos, uma reprodução por ação e
  início do áudio junto ao slide; quadro comum com tolerância de até 1 px CSS
  para arredondamentos dos obstáculos/fontes. Proporção do original preservada.
- MP3s decodificados no navegador real; durações registradas na tabela acima.
  Política de autoplay bloqueada e MP3 ausente não interrompem o Especial.
- PNG ausente/lenta e load cancelado mantêm fallback/cleanup. Mute não toca o
  clipe; música desligada ainda permite SFX. Resize/undo/troca de partida param
  áudio. Movimento reduzido não cria PNG, voo ou áudio, mas concede cartas.
- A mesma execução de navegador também passou na regressão P0 completa dos
  seis chefes, nas **136 combinações de habilidade/fase por resolução**,
  transações concorrentes, mouse/toque, itens, cronômetros, undo/reload e BOT.
  Logs: `.cache/special-six-audio-{1024,1376,1920,390}.log`.
- Capturas inspecionadas: `.cache/playtest-p0/hero-{chefe}-{largura}.png`,
  incluindo Banqueiro, Dominadora e Matriarca; sem mudança do layout real.
- Sintaxe de `app.js`, `js/audio.js` e módulos do Especial e `git diff --check`
  aprovados. Sem commit, push ou deploy.

Arquivos alterados neste lote: `app.js`, `js/audio.js`,
`js/boss/ui/cooperative-special-presentation.js`, `service-worker.js`, este
documento, `tests/cooperative-special-presentation.test.mjs`,
`tests/cooperative-special-presentation.browser-cases.mjs`,
`tests/playtest-p0.browser.mjs`. Novos: os módulos de assets e de cue de áudio,
`tests/cooperative-special-audio.test.mjs`, três PNGs e seis MP3s listados acima.
Alterações anteriores do workspace foram preservadas.

Limites: dois clientes e Firebase/CAS são simulados com handlers/engine reais;
não são duas contas autenticadas no servidor ou tablets físicos. Reprodução e
decodificação foram verificadas no navegador, não uma avaliação auditiva em
alto-falantes físicos. O navegador pode recusar som antes da interação do
usuário; nesse caso não há repetição tardia nem bloqueio da partida.


---

<a id="arquivo-especial-e-devtools-refinamento-2026-10-11"></a>

## Origem: ESPECIAL_E_DEVTOOLS_REFINAMENTO_2026-10-11.md

### Especial e DevTools — refinamento de 11/10/2026

#### Alterações

Somente apresentação do Especial e ferramentas autorizadas de cenário. Sem
mudança nas regras, no custo, nos cinco resgates do Lixo ou no balanceamento.
Sem alteração das PNGs, do espaçamento da mão ou dos controles normais de jogo.
Sem commit, push ou deploy.

##### Especial

O voo existente estava pouco visível: versos pequenos, fade durante quase todo
o trajeto e uma variável de cor que não era efetivamente gravada no CSS. Agora
são cinco versos mais legíveis, com bordas, arco e opacidade sustentada até perto
da chegada. A apresentação total continua com 3.000 ms; início do voo em 900 ms,
900 ms de voo por carta, intervalo de 75 ms e última chegada em 2.100 ms.

Ada, Jill e Sailor usam o quadro comum baseado na proporção da Jill e uma faixa
comum da mesa. Não há mais seleção de quadro por proporção da PNG ou por chips
específicos do chefe. `object-fit: contain` mantém a proporção original: quadro
igual não significa esticar a Sailor para a largura da Jill. Cartas/controles
continuam independentes da animação e acessíveis; o overlay pode passar pela arte
dos retratos/auxiliares, sem capturar cliques ou mudar seu layout.

Fallback, movimento reduzido, ID confirmado, deduplicação, proteção de faces,
snapshot, undo/reload e cancelamento permanecem no fluxo existente.

##### DevTools

A causa das compras/descarte bloqueados era o uso de `ensureMyTurn`, destinado
aos controles normais do jogador. As ferramentas agora têm validação própria,
limitada ao acesso DEV já existente: localhost ou autorização administrativa.

- `Mão / jogador do cenário` seleciona compras, descarte, canastra e preparações.
  `Minha mão` é o padrão; é possível escolher o jogador do turno ou outro jogador.
- +5, +30, -5 Lixo, canastras, preparação e encerramento não exigem a vez do dono
  do painel. Pause/resume também funciona na vez do BOT.
- Mutações DEV são serializadas entre si para preservar os saves. Interrompem
  imediatamente timers/planejamento, BOT em execução, gesto da mesa, voo e
  operação antiga da amiga. Não aguardam o turno, a promessa do BOT ou a trava
  normal da mesa. Usam um bloqueio temporário antes de salvar o cenário.
  Ao terminar, retomam automaticamente uma partida que estava rodando.
  Se o usuário já havia congelado a partida, preservam essa escolha. Somente o
  botão Congelar/Descongelar mantém ou remove a pausa manual.
  O bloqueio temporário não mostra o overlay nem troca o texto do botão de pausa.
- Snapshots congelados interrompem a automação nos outros clientes também,
  antes de esperar um gesto pendente. Revisões antigas não cancelam a mesa.
  Controles normais, timeout, BOT e avanço automático do chefe ficam bloqueados
  durante esse congelamento; não ganham permissão administrativa.
- Commits DEV podem editar cenário mesmo durante pausa normal, mas continuam
  respeitando identidade da partida, revisão e votação/surrender. Uma revisão
  concorrente não é sobrescrita à força.
- Se outro cliente salvar a jogada do BOT antes do congelamento, a ferramenta
  tenta novamente sobre a revisão recebida, no máximo três vezes. Se não for
  seguro congelar, informa o motivo e não altera as cartas.
- O bloqueio temporário tem ID próprio. A limpeza não remove uma pausa explícita
  recebida de outro cliente nem edita outra partida. A retomada também respeita
  as revisões canônicas e tem no máximo três tentativas.
- Operações/commits antigos têm um identificador de geração local. Após a
  intervenção DEV não podem gravar/adotar resultados atrasados, liberar uma
  trava mais nova nem retomar o BOT interrompido. Transações normais também
  rejeitam escrita sobre um congelamento DEV recebido do servidor.
- O laboratório usa a mesma prioridade: preparar, recursos, auxiliares,
  passivas, objetivos, BOT, Voltar e Resetar. A execução manual do BOT tem
  permissão estrita de teste para agir durante o congelamento; o BOT normal
  não tem essa permissão. Nova ferramenta interrompe o teste manual do BOT.
- Voltar no laboratório restaura o undo do cenário independentemente da vez
  do jogador. Reset preserva a escolha de pausa atual, sem copiar um bloqueio
  temporário obsoleto do snapshot-base. Undo normal do jogador não foi alterado.
- Voos de recompensa/Morto não seguram a conclusão do comando DEV. Reciclagem
  feita por comando DEV não espera os dois segundos da apresentação normal.
- Persistência ainda depende da resposta do Firebase. Não há escrita forçada
  sobre revisão concorrente, operação em outra partida ou acesso não autorizado.
- O resultado permanece marcado como teste (`historyTest`).
- Painel com posição fixa, rolagem e camada própria fora de `gameSection`, acima
  dos overlays da partida. O acesso/autenticação não foi ampliado.

#### Arquivos

- `app.js`: enquadramento, alvo das ferramentas, prioridade DEV, congelamento
  local/remoto, cancelamento e proteção contra commits/snapshots obsoletos.
- `js/game/match-control.js`: cancelamento da trava sem liberar uma ação nova.
- `boss-bot.js`: somente o BOT de teste autorizado ignora o congelamento DEV.
- `js/boss/ui/cooperative-special-presentation.js`: quadro/tempo, versos e cor.
- `styles/boss-mode.css`, `index.html`: somente overlay/painel e seletor DEV.
- `service-worker.js`: versão local v308.
- Testes de apresentação, DevTools, fixtures P0 e regressões de Dominação/menu.

#### Evidências e limites

Os testes usam handlers reais com estados serializados/transportes simulados.
Não são duas contas autenticadas no Firebase nem dispositivos físicos.

- Primeira execução: 1.433 unitários aprovados em `.cache/special-devtools-full-unit.log`.
  Após a correção da pausa automática, 1.436 testes aprovados em
  `.cache/devtools-pause-fix-unit.log`.
- Especial: 36 apresentações (três personagens, três destinatários e quatro
  viewports), com cinco versos, quadro comum e verificações de deduplicação,
  cancelamento, fallback e movimento reduzido.
- Regressão ampla de navegador: `.cache/special-devtools-complete-browser.log`
  registra os três viewports maiores aprovados e as apresentações nos quatro.
  A medição antiga de chip em 390 px incluiu o zoom de foco existente (6%);
  o teste agora mede o chip em repouso, sem alterar o CSS dos chips.
  `.cache/special-devtools-final-mobile.log` registra a execução completa de
  390 px aprovada, incluindo as 136 combinações de habilidade/fase e P0.
- DevTools: 48 cenários (12 modos × quatro viewports), mouse/toque e vez do BOT,
  inicialmente em `.cache/devtools-pause-fix-browser.log`. A revisão de prioridade
  amplia para todos os comandos gerais visíveis, incluindo quatro canastras,
  preparações, fim/reinício, temas, amigas e Visão; BOT/trava sem resolução são
  injetados para comprovar que a ferramenta não os espera.
  Resultado: `.cache/devtools-priority-browser.log`.
- Laboratório: seis chefes × quatro viewports; recursos −/+/quase cheio/zerar,
  preparar/resetar, BOT sucesso/falha, todos os zumbis e filhas, aplicação/undo
  de auxiliar e resolver objetivo do Infectado. BOT manual também testado durante
  pausa explícita, preservando-a. Handlers, engine do cenário, BOT, descarte e avanço de turno reais;
  transporte/saves simulados. Mesma evidência de navegador acima.
- 29 testes focados em `.cache/devtools-priority-focused.log`: acesso, todos os
  bindings mutáveis, takeover, preservação de pausa, fila DEV, commits obsoletos,
  snapshot remoto prioritário, CAS e execução manual do BOT sob congelamento.
- Suíte final: 1.445 testes aprovados, sem falhas ou skips, em
  `.cache/devtools-priority-all.log`.
- Regressão da seleção normal de alvo/turno do Nemesis, DOM e ajuda por toque:
  cinco viewports aprovados em `.cache/devtools-priority-nemesis-browser.log`.
- Capturas: `.cache/playtest-p0/hero-{dimitrescu,nemesis,nehelenia}-{largura}.png`
  e `.cache/devtools-free-control/panel-{largura}.png`.
- Viewports: 1024×768, 1376×1032, 1920×1080 e 390×844, sem zoom.

Nenhum checklist antigo foi reaberto.

#### Auditoria dos controles DEV

| Grupo | Controles e tratamento |
| --- | --- |
| Mão/cenário | +5, +30, −5 Lixo, quatro canastras, Prep: Morto e Prep: Bater usam o jogador escolhido, sem exigir seu turno. |
| Dominação | Amigas e Visão usam a prioridade DEV; não esperam uma operação antiga. Pré-requisitos do recurso continuam necessários. |
| Partida | Congelar/Descongelar, Terminar, Reiniciar; somente Congelar mantém pausa manual. Reinício cria outra sessão e invalida operações antigas. |
| Aparência | Fundo e baralho passam pela fila DEV; abrir/minimizar o painel e alterar seletores não pausam nem editam a partida. |
| Laboratório | Todos os botões mutáveis usam a fila DEV. Recurso, vida/estado/modificadores, passiva, objetivo e preparação não dependem da vez do jogador. |
| Diagnóstico | Varredura continua somente leitura. Campos/seletores atualizam a UI; sem botão de mutação não consomem cartas nem avançam turnos. |

Botões sem cenário, alvo/entidade ou fase compatível continuam desabilitados ou
explicam o motivo. Isso é validação de entrada, não espera por turno. Cenários
encerrados podem ser reiniciados/preparados/resetados; comandos de carta não
ressuscitam uma partida encerrada. Não houve mudança de balanceamento/regras.

Quadros medidos em pixels CSS (iguais para Ada, Jill e Sailor em cada viewport):

| Viewport | Esquerda | Topo | Largura | Altura |
| --- | ---: | ---: | ---: | ---: |
| 1024×768 | 674,316 | 226,880 | 249,684 | 374,526 |
| 1376×1032 | 900,476 | 302,120 | 375,524 | 563,286 |
| 1920×1080 | 1424,000 | 317,603 | 396,000 | 594,000 |
| 390×844 | 268,800 | 548,600 | 109,200 | 163,800 |


---

<a id="arquivo-audio-e-itens-padrao-2026-10-11"></a>

## Origem: AUDIO_E_ITENS_PADRAO_2026-10-11.md

### Áudio e padrão dos itens — 11/10/2026

#### Entrega

- Medidos os 66 MP3s em assets e o WAV de abertura: todos decodificaram.
- Não houve edição, normalização destrutiva ou recompressão dos masters.
- Ganhos por arquivo em `js/audio-balance.js`; hashes SHA-256 dos originais no inventário.
- Música de fundo: alvo de energia 6 dB abaixo dos efeitos principais.
- Cartas e coração têm categoria mais discreta; não são equiparados às falas.
- Itens ativos mantêm emblema contrastado na mão, mesa, Lixo e voo visível.
- Cartas consumidas não recuperam emblema; versos ocultos não expõem item/face.
- Sem alteração de custo/regras de itens, HP, regen, Sede ou Especial.
- Sem commit, push ou deploy executado pelo agente. Branch atual conferida: main.

#### Causas

Os masters têm amplitudes muito diferentes. Ada e Matriarca do Especial diferiam
cerca de 18 dB na energia RMS com o mesmo volume 0,8. Transformaçao F3 e alguns
masters Resident têm picos muito maiores que os demais. Música também não era
uniforme: aplicar 10–35% a arquivos diferentes não garante som percebido equivalente.

A face compartilhada já tinha emblema, mas a mão usava medalhão escuro de 64%
e a mesa/Lixo usavam uma versão menor, sem a mesma base de contraste. Além disso,
`packCard` descartava `castleItem`: a apresentação remota podia perder o símbolo
durante o voo, mesmo quando o estado definitivo ainda conservava o item.

#### Política de volume

Medição de PCM decodificado em 48 kHz: energia média por blocos de 400 ms;
descarta silêncio abaixo de −60 dBFS e blocos 15 dB abaixo da média dos blocos
audíveis. É RMS com gate, não LUFS nem uma afirmação de loudness perceptual exato.

Alvos: efeitos/falas −22 dBFS RMS; música/aberturas −28; movimento de cartas −30;
coração −32. Ganho máximo 4× (cerca de +12 dB). O ganho de cada arquivo também
é limitado para manter seu pico amostrado a −3 dBFS. Não há compressor,
recorte do original, mudança de duração, loop novo ou nova ordem de reprodução.
Esse limite é por arquivo, não uma garantia sobre a soma de efeitos simultâneos.

Os efeitos clonados aplicam um único ganho no Web Audio quando disponível,
sem multiplicar por antigos volumes ajustados manualmente ou pelo boost
antigo da Matriarca. Sem Web Audio, usa volume nativo seguro de até 1; os
masters muito baixos podem ficar mais discretos nesse fallback. Música
continua com seus fades, ducking e prioridades; usa o ganho medido do arquivo,
não apenas uma porcentagem fixa. O antigo teto 0,35 permanece como fallback
para faixas sem medição. Mute geral e modo só efeitos foram preservados.

Arquivos com transientes grandes podem ficar abaixo do alvo para preservar o
pico. Ex.: Jill fica em torno de −24,31, em vez de forçar −22 e saturar os picos.
O som de procura também tem crest factor alto e continua discreto. A percepção
final depende de frequência, alto-falantes e volume do dispositivo.

#### Verificação

- 1.457 testes automatizados: `.cache/audio-items-all.log`.
- 12 focados: integridade dos 67 masters, inventário completo, perfil/limites,
  ganho Web Audio real do código, fade da música, mute/cancelamento, metadados e faces ocultas.
  `.cache/audio-items-focused.log`.
- Cinco itens × quatro viewports: mão, mesa, Lixo e voo, imagem carregada,
  valor/naipe, base de contraste, metadados transmitidos, consumo e verso oculto.
  `.cache/card-item-face-browser.log`; capturas em `.cache/card-item-face/`.
  Essa fixture usa a face compartilhada e os containers/CSS do index real;
  não simula uma transação de aplicação de item.
- Regressão P0 nas quatro resoluções: 1024×768, 1376×1032, 1920×1080 e 390×844.
  Handlers reais, dois clientes/CAS simulados, seis chefes, itens e 136 combinações
  de habilidade/fase por resolução. `.cache/audio-items-p0-{largura}.log`.
- Em 1024, a matriz do Especial também verifica os seis personagens × três
  destinatários em dois clientes e o coeficiente dos GainNodes reais no navegador,
  com mute, arquivo ausente, cancelamento e reprodução única.
- Limites: não são contas autenticadas no Firebase nem tablets físicos; não foi
  feita avaliação auditiva em alto-falantes físicos. O Web Audio tem fallback
  nativo, com as limitações de volume do navegador/dispositivo.
- Sintaxe e `git diff --check` verificados; nenhum master foi modificado.

#### Arquivos deste lote

`app.js`, `js/audio.js`, novo `js/audio-balance.js`,
`js/game/domination-friend-sound.js`, `js/game/card-face.js`,
`styles/boss/dimitrescu.css`, `service-worker.js` (v310),
testes de áudio/itens e fixtures do Especial/P0. Alterações anteriores, inclusive
as já staged, foram preservadas.

#### Inventário medido

A coluna “saída” é a energia estimada após ganho no Web Audio; não mede o mixer
com vários sons juntos nem o fallback nativo com ganho máximo 1.

| Arquivo | Categoria | Entrada RMS (dBFS) | Ganho | Saída estimada (dBFS) |
| --- | --- | ---: | ---: | ---: |
| `assets/audio/cofre-abrindo.mp3` | effect | -20.76 | 0.830 | -22.38 |
| `assets/audio/cofre-fechando.mp3` | effect | -18.13 | 0.641 | -22.00 |
| `assets/music/mesa-cassino.mp3` | music | -14.53 | 0.212 | -28.00 |
| `assets/music/mesa-feltro.mp3` | music | -17.92 | 0.313 | -28.00 |
| `assets/music/mesa-findom.mp3` | music | -18.02 | 0.317 | -28.00 |
| `assets/music/mesa-lunar-abertura.mp3` | music | -19.12 | 0.360 | -28.00 |
| `assets/music/mesa-lunar.mp3` | music | -18.20 | 0.324 | -28.00 |
| `assets/music/mesa-masmorra.mp3` | music | -14.45 | 0.210 | -28.00 |
| `assets/music/mesa-ostentacao.mp3` | music | -10.79 | 0.138 | -28.00 |
| `assets/music/mesa-resident.mp3` | music | -25.99 | 0.793 | -28.00 |
| `assets/music/mesa-submissao.mp3` | music | -13.47 | 0.188 | -28.00 |
| `assets/music/mesa-wwe.mp3` | music | -9.18 | 0.115 | -28.00 |
| `assets/sfx/abertura-lunar-curta.wav` | intro | -30.47 | 1.329 | -28.00 |
| `assets/sfx/abertura-lunar.mp3` | intro | -28.16 | 1.019 | -28.00 |
| `assets/sfx/abertura-resident.mp3` | intro | -31.74 | 1.538 | -28.00 |
| `assets/sfx/abertura-wwe.mp3` | intro | -19.42 | 0.372 | -28.00 |
| `assets/sfx/amiga-bruna-turno-extra.mp3` | effect | -18.15 | 0.642 | -22.00 |
| `assets/sfx/amiga-entrada.mp3` | effect | -10.13 | 0.255 | -22.00 |
| `assets/sfx/amiga-nathalia-turno-extra.mp3` | effect | -18.24 | 0.648 | -22.00 |
| `assets/sfx/amiga-saida.mp3` | effect | -15.83 | 0.491 | -22.00 |
| `assets/sfx/amiga-turno-extra.mp3` | effect | -20.79 | 0.870 | -22.00 |
| `assets/sfx/asas-lunar.mp3` | effect | -27.20 | 1.820 | -22.00 |
| `assets/sfx/barulho-cartas.mp3` | cards | -26.31 | 0.654 | -30.00 |
| `assets/sfx/canastra-as-a-as-lunar.mp3` | effect | -18.16 | 0.643 | -22.00 |
| `assets/sfx/canastra-as-a-as-resident.mp3` | effect | -13.12 | 0.360 | -22.00 |
| `assets/sfx/canastra-as-a-as.mp3` | effect | -18.58 | 0.674 | -22.00 |
| `assets/sfx/canastra-limpa-lunar.mp3` | effect | -19.69 | 0.767 | -22.00 |
| `assets/sfx/canastra-limpa-resident.mp3` | effect | -9.27 | 0.231 | -22.00 |
| `assets/sfx/canastra-limpa-wwe.mp3` | effect | -14.05 | 0.400 | -22.00 |
| `assets/sfx/canastra-limpa.mp3` | effect | -21.86 | 0.984 | -22.00 |
| `assets/sfx/canastra-real-lunar.mp3` | effect | -19.44 | 0.745 | -22.00 |
| `assets/sfx/canastra-real-resident.mp3` | effect | -10.62 | 0.270 | -22.00 |
| `assets/sfx/canastra-real-wwe.mp3` | effect | -20.82 | 0.853 | -22.20 |
| `assets/sfx/canastra-real.mp3` | effect | -22.69 | 1.083 | -22.00 |
| `assets/sfx/canastra-suja-lunar.mp3` | effect | -19.66 | 0.764 | -22.00 |
| `assets/sfx/canastra-suja-resident.mp3` | effect | -12.43 | 0.332 | -22.00 |
| `assets/sfx/canastra-suja-wwe.mp3` | effect | -10.56 | 0.268 | -22.00 |
| `assets/sfx/canastra-suja.mp3` | effect | -18.32 | 0.654 | -22.00 |
| `assets/sfx/compra-lunar.mp3` | cards | -27.96 | 0.791 | -30.00 |
| `assets/sfx/compra-resident.mp3` | cards | -7.40 | 0.074 | -30.00 |
| `assets/sfx/compra-wwe.mp3` | cards | -15.02 | 0.178 | -30.00 |
| `assets/sfx/coracao-batendo.mp3` | heartbeat | -10.13 | 0.081 | -32.00 |
| `assets/sfx/cura-matriarca.mp3` | effect | -22.73 | 1.088 | -22.00 |
| `assets/sfx/dominador-luana-turno-extra.mp3` | effect | -17.94 | 0.627 | -22.00 |
| `assets/sfx/fim-de-jogo-banqueiro.mp3` | effect | -21.53 | 0.873 | -22.71 |
| `assets/sfx/fim-de-jogo-dominadora.mp3` | effect | -24.13 | 1.278 | -22.00 |
| `assets/sfx/fim-de-jogo-matriarca.mp3` | effect | -34.53 | 3.332 | -24.08 |
| `assets/sfx/fim-de-jogo.mp3` | effect | -21.91 | 0.990 | -22.00 |
| `assets/sfx/ganho-infeccao-nemesis.mp3` | effect | -14.57 | 0.425 | -22.00 |
| `assets/sfx/ganho-sangue-dimitresco.mp3` | effect | -19.08 | 0.714 | -22.00 |
| `assets/sfx/habilidade-banqueiro.mp3` | effect | -21.53 | 0.873 | -22.71 |
| `assets/sfx/habilidade-dominadora.mp3` | effect | -24.13 | 1.278 | -22.00 |
| `assets/sfx/habilidade-matriarca.mp3` | effect | -34.53 | 3.332 | -24.08 |
| `assets/sfx/procurar-carta.mp3` | effect | -30.16 | 0.708 | -33.16 |
| `assets/sfx/renascimento-matriarca.mp3` | effect | -24.59 | 0.832 | -26.18 |
| `assets/sfx/risada-nehelenia.mp3` | effect | -24.18 | 1.286 | -22.00 |
| `assets/sfx/roubo-mao.mp3` | effect | -24.93 | 1.402 | -22.00 |
| `assets/sfx/seu-turno.mp3` | effect | -18.72 | 0.685 | -22.00 |
| `assets/sfx/special/ada-wong.mp3` | effect | -12.41 | 0.332 | -22.00 |
| `assets/sfx/special/banker.mp3` | effect | -22.52 | 0.878 | -23.65 |
| `assets/sfx/special/dominadora.mp3` | effect | -18.27 | 0.651 | -22.00 |
| `assets/sfx/special/jill-valentine.mp3` | effect | -27.00 | 1.363 | -24.31 |
| `assets/sfx/special/matriarca-esmeralda.mp3` | effect | -30.34 | 2.611 | -22.00 |
| `assets/sfx/special/sailor-moon.mp3` | effect | -23.09 | 1.133 | -22.00 |
| `assets/sfx/transformacao-dimitrescu-fase2.mp3` | effect | -19.61 | 0.760 | -22.00 |
| `assets/sfx/transformacao-dimitrescu-fase3.mp3` | effect | -12.12 | 0.321 | -22.00 |
| `assets/sfx/what-have-you-done-to-my-daughter.mp3` | effect | -19.43 | 0.744 | -22.00 |


---

<a id="arquivo-balanceamento-dominadora-matriarca-2026-10-12"></a>

## Origem: BALANCEAMENTO_DOMINADORA_MATRIARCA_2026-10-12.md

### Dominadora: decisões do BOT; Matriarca: dez Flores — 12/10/2026

#### Escopo entregue

Somente este lote. Nenhum checklist antigo foi reaberto. Não houve alteração
de áudio, PNG, animação/regra do Especial, HP ou habilidade de outro chefe.
Não houve commit, push ou deploy.

#### 1. Causas das decisões do BOT

1. `dangerCost()` usava `boss.danger`, que não representa a Dominação. O recurso
   verdadeiro são as duas parcelas fracionárias em `chainsByPlayer`: quatro
   unidades legadas equivalem a 50 pontos por jogador.
2. `deadlineProjection()` terminava o turno sem simular o descarte. Guardar a
   única carta ordenada e gastar essa carta podiam parecer igualmente ruins.
   Em risco terminal, a projeção errada podia prever derrota nas duas opções,
   cancelar a penalidade na diferença de valores e favorecer uma canastra fatal.
3. A seleção curta de movimentos favorecia os maiores ganhos imediatos e podia
   deixar de fora movimentos menores que preservavam o descarte ordenado.

O caminho de descarte de produção já usa `rankBossDiscards`, e não o heurístico
de naipe abaixo dele em `boss-bot.js`. Corrigir apenas esse heurístico não resolveria.

#### 2. Correções da estratégia

- Perigo considera as duas barras públicas: pressão total e concentração em um
  cooperador. Curva contínua aumenta o custo ao se aproximar de 100 no total.
- Cada alternativa é clonada e passa pelos hooks reais: contribuição, retirada
  do Lixo, descarte e encerramento. Obediência, falha, cancelamento, resistências,
  transbordamento e derrota são calculados pelo motor, sem tabela nova de punições.
- Movimentos e compras avaliam também o melhor descarte legal que restará.
  A carta única ordenada deixa de ser consumida gratuitamente pelo ranking.
- Custo de guardar carta conectada, coringa ou extensão de canastra continua
  competindo com a punição. Não há uma regra absoluta de obedecer ou de não sujar.
- A shortlist reserva parte de seu orçamento para opções que preservam o naipe,
  mantendo opções de sacrifício concorrentes. Não cresce sem limite.
- Na Dominadora, a projeção não encerra artificialmente o turno futuro do parceiro
  usando sua mão oculta. Seu saldo atual continua participando do risco.
- Diagnósticos incluem barras antes/depois, derrota projetada, custo de
  oportunidade e ID do descarte previsto.
- Produção usa os resultados corrigidos nos três rankings. Os testes chamam os
  loops reais de jogada e descarte, inclusive com BOT primeiro e segundo na rodada.

Política de perigo (não é regra de combate): para cada barra `r = chains/4`,
limitada a 0–1, `t = média(r)`. Custo = `300t + 800t⁴ + 100 média(r⁴)`.
Derrota canônica continua recebendo custo 100.000. As punições não foram alteradas.

#### 3. Demonstrações antes/depois

Referência anterior: `7174a1d3999b66aba00bca1e56cba9e4e8b37cef`.
O script carrega a estratégia anterior em memória e compara com o motor atual da
Dominadora, cujas regras não mudaram. Não faz checkout nem modifica o Git.

| Reprodução, fase 3 | Antes | Depois |
| --- | --- | --- |
| 0/0 pontos, Paus barato disponível | Descartava outro naipe; saldo 14/0 | Descarta Paus; saldo 3/0 |
| 25/20 pontos, Paus barato disponível | Outro naipe; saldo 39/20 | Paus; saldo 28/20 |
| BOT segundo jogador, 25/20 | Outro naipe; saldo 25/34 | Paus; saldo 25/23 |
| 47/47 ou 50/40, descarte barato | Já escolhia Paus pelo risco terminal | Continua escolhendo Paus |
| Único Paus completa Limpa; equipe 50/40 | Movimento +196,50; consumia Paus e projetava derrota em ambas as opções | Movimento −98.736,71; preserva Paus, cuja obediência deixa 50/43 |
| Mesmo movimento com pressão 0/0 | +196,50 | +196,50: sacrifício ainda aceitável |

Reproduções adicionais: vários Paus (guarda extensão útil e descarta isolado),
carta bloqueada, topo obrigatório que não pode ser descartado, ordem impossível,
movimento menor que preserva o Paus, compra completa do Lixo trazendo o Paus e
evitando derrota, ordem de alimentar jogo e sacrifício de coringa.
O coringa que suja um jogo é recusado com pressão baixa e aceito quando cumprir
a ordem evita derrota. Em nenhum caso o ranking usa faces ocultas do parceiro,
Monte ou Mortos.

##### Batalhas pareadas de BOTs

Mesmas sementes/baralho físico (108 IDs únicos), regras, aquisição normal de uma
carta, políticas de escolha e limite de 180 turnos. Somente estratégia varia.
Os números de turnos são oportunidades individuais, não rodadas coletivas.

| Semente | Antes | Depois |
| --- | --- | --- |
| 7300 | 31 turnos, derrota por Dominação; Dominadora com 2.365 HP; 0 Limpas | 72 turnos, chefe derrotada; 0 HP; 5 Limpas |
| 7301 | 32 turnos, derrota por Dominação; 2.360 HP; 0 Limpas | 76 turnos, recursos esgotados; 910 HP; 3 Limpas |
| 7302 | 34 turnos, derrota por Dominação; 2.175 HP; 1 Limpa | 72 turnos, recursos esgotados; 865 HP; 6 Limpas |

“Limpas” nesta tabela é a métrica existente `clean`, que conta jogos passando
de simples a Limpa/Real/Ás-a-Ás. HP final e dano acumulado diferem quando há cura.
As duas derrotas por recursos foram preservadas; o ajuste não garante vitória.
Amostra pequena, BOT+BOT em adaptador local, sem estimativa de win rate humano.

Execução: `node scripts/dominatrix-balance-compare.mjs 7174a1d`.
Evidência completa: `.cache/balance-oct12-compare.jsonl`.

#### 4. Matriarca — dez Flores

- `MATRIARCH_MAX_FLOWERS = 10`, compartilhado pela definição, motor, ajuda e desenho.
- `bloom`/`danger`: mesma contagem literal de Flores, limitada a 0–10.
- 0–9: partida ativa. 10: derrota imediata por `max_bloom`.
- Punições continuam +1 conforme a regra de quota já existente.
- Canastra remove Flores incrementalmente por tier; não reabre quotas de punição.
- Renascimento permanece 1x, consome uma Flor e restaura 300 HP. Não revive após
  derrota por dez Flores.
- Saves ativos antigos `/5` migram apenas o teto, sem repetir eventos ou zerar
  saldo. Saves já encerrados continuam encerrados, incluindo derrota antiga em cinco.
- Snapshot válido com dez Flores já confirma derrota na normalização; não
  depende de receber uma décima primeira punição.
- HUD mostra dez PNGs, contador `/10` e barra proporcional. Nenhuma imagem mudou.
- Laboratório: “Quase cheio” fica em nove; ajuste não dispara derrota artificial.
- Urgência do BOT e fallback de risco seguem o novo teto. HP, pesos, frequência,
  elegibilidade da Raiz, curas e ameaças simultâneas foram preservados.

Demonstrados 4, 5, 8, 9 e 10, com ganhos, duplicação de evento, save/reload,
undo, reduções acima de cinco e Renascimento. Somente dez encerra partida ativa.

#### 5. Testes e evidências

- Suíte completa: **1.484 aprovados**, nenhum falhou; inclui regressões do BOT
  e motor dos seis chefes. `.cache/balance-oct12-all.log`.
- Novos direcionados: **27 aprovados**. `.cache/balance-oct12-targeted.log`.
- Edge real em 1920, 1376, 1024 e 390 px: dez imagens carregadas, estados
  4/5/8/9/10, contador, proporção renderizada da barra, ajuda, reduced motion e
  ausência de overflow. `.cache/balance-oct12-hud.log`.
- Capturas: `.cache/hud-polish/matriarch-{largura}-{flores}-flowers.png`.
- `git diff --check` e sintaxe verificados. Nenhum arquivo PNG/MP3 foi alterado.

Limitações: navegador/adaptador local, não partidas autenticadas com duas contas
Firebase nem tablet físico. A comparação cobre três sementes e não avalia todas
as estratégias de longo prazo. Saves/reload/undo foram simulados por snapshot;
o playtest humano continua necessário para avaliar a experiência estratégica.

#### 6. Arquivos alterados

- Estratégia: `js/boss/boss-bot-strategy.js`; fallback Matriarca em `boss-bot.js`.
- Regra/save: `js/boss/boss-balance.js`, `js/boss/bosses/matriarch.js`,
  `js/boss/boss-engine.js`, `js/boss/boss-debug-scenarios.js`.
- HUD/ajuda: `js/boss/ui/matriarch-bloom-view.js`,
  `js/boss/presentation/matriarch.js`, `app.js`.
- Cache: `service-worker.js`, v307, sem deploy.
- Novos: `tests/dominatrix-balance-fixture.mjs`, `tests/dominatrix-balance.test.mjs`,
  `tests/matriarch-ten-flowers.test.mjs`, `scripts/dominatrix-balance-compare.mjs`.
- Expectativas/UI: `tests/boss-engine.test.mjs`, `tests/boss-debug-scenarios.test.mjs`,
  `tests/boss-hud-polish.test.mjs`, `tests/boss-presentation-isolation.test.mjs`,
  `tests/matriarch-hud-polish.browser.mjs`.
- Documentos principais: `DOCUMENTACAO_CHEFE_DA_MESA.md`,
  `INVENTARIO_HABILIDADES_CHEFES.md` e este relatório.


---

<a id="arquivo-pacote-cooperativo-e-bot-itens-2026-10-12"></a>

## Origem: PACOTE_COOPERATIVO_E_BOT_ITENS_2026-10-12.md

### Pacote Cooperativo e correção do BOT com itens — 12/10/2026

#### Escopo

Os dois pedidos foram entregues como lotes independentes: correção do BOT da
Lady e os valores decididos de combate. Não foi iniciada nova pesquisa de
balanceamento, benchmark ou bateria de batalhas. Não houve commit/push/deploy.
Imagens, áudio, animações, Especial, a inteligência da Dominadora e as dez Flores
da Matriarca não foram modificados.

#### A. Desperdício de itens: causa comprovada

`app.js` usa `BossBuracoBot` no modo Chefe. O BOT antigo chamava
`executeCastleItems()`, mas o cooperativo não chamava. O descarte ranqueado não
protegia o registro `boss.castleItems`, e a recuperação/watchdog/fallback
selecionavam a primeira carta legal. Ícone visual não determina a disponibilidade.

Reprodução anterior baseada em `08873ce831d3285b8310df3c9dffac5d9b27dfd1`, carregada
em memória, sem checkout. Mesmas regras atuais, mesma mão isolada e os métodos
reais de item/descarte do `app.js`, executados em VM com persistência instrumentada.

| Item disponível | Antes | Depois |
| --- | --- | --- |
| Explosivo | Vai ao Lixo sem uso | Aplicado; carta comum descartada |
| Adaga | Vai ao Lixo sem uso | Aplicada; carta comum descartada |
| Relíquia | Vai ao Lixo sem uso | Aplicada; carta comum descartada |
| Frasco | Vai ao Lixo sem uso | Aplicado quando útil; comum descartada |
| Anticoagulante | Vai ao Lixo sem uso | Aplicado; comum descartada |

Antes: zero eventos de item, um commit de descarte. Depois: um evento/commit de
item e um commit distinto de descarte. Dois commits para duas ações não são
duplicação. O item descartado não era consumido, mas saía inutilmente da mão.
IDs físicos e metadados continuam preservados no Lixo.

Evidência: `.cache/castle-bot-items-before-after.jsonl`.
Reproduzir: `node scripts/castle-bot-items-reproduction.mjs 08873ce`.
Somente dez decisões determinísticas; não são partidas nem taxas de vitória.

##### Política e execução corrigidas

- Usa o registro canônico `boss.castleItems[card.id]`, inclusive sem ícone visual.
- Após comprar e antes de descartar, chama a rotina existente do app.
- `getCastleBotItem()` ranqueia pares carta/filha com aplicação real de
  `useCastleItem()` numa cópia pública. Não duplica elegibilidade ou efeitos.
- Compara dano/clamp/proteção efetivos, petrificação, efeitos novos, risco dos
  prazos no motor e custo de perder a carta. Valor futuro usa horizonte heurístico
  curto de três rodadas, não uma nova duração de efeito nem simulação de batalhas.
- Conserva Joker, 2 e conclusão útil de canastra quando o sacrifício não compensa.
  Não existe proibição absoluta: uma aplicação que ganha a batalha pode compensar.
- Não renova um congelamento já ativo na tentativa normal; evita efeitos
  redundantes no piso. Outro Explosivo ainda é elegível se houver impacto útil.
- Itens não consumidos ficam depois das cartas comuns legais no descarte.
  Exceção: consequência canônica terminal evitada pela alternativa com item.
- Sem carta comum legal, itens continuam descartáveis: não cria travamento.
- Recuperação normal, fallback fatal e watchdog compartilham a seleção segura.
  Fallback após falha no ranking ainda prioriza carta comum. Fora da Lady,
  recuperação mantém a política anterior de primeira carta legal.
- Carta obrigatória do Lixo é rejeitada também no `executeDiscard()`.
- As transações de item releem o estado/sessão a cada iteração e param em mudança
  de turno, resultado ou sessão inválida; consumo canônico evita reexecução.
- Compra incompleta, escolha pendente, fase da chefe, último descarte e filha
  morta continuam bloqueados. O predicado canônico de carta bloqueada foi testado
  por injeção: não foi inventada uma nova regra de lock para a Lady.
- Não usa faces ocultas de parceiro, Monte ou Mortos.

#### B. Valores finais

##### Cartas e canastras

| Carta | Dano |
| --- | ---: |
| 2 natural ou coringa | 10 |
| Ás | 15 |
| Joker | 20 |
| 3–7 | 5 |
| 8–K | 10 |

Pontuação normal não mudou. Cotação e combate concordam; IDs já creditados não
recebem dano novamente. Canastras permanecem Suja100, Limpa180, Real300,
Ás-a-Ás450, com incremento pela diferença e sem aumento de HP dos chefes.

##### Nemesis

Agarrador180, Infectado190, Devorador200 HP. Até três diferentes persistentes
em qualquer fase. Novas partidas continuam sem zumbis ativos. Entrada depende
da Invasão sorteada: sucesso repele; falha persiste. Não há aparição obrigatória,
bônus de dano contra zumbis ou geração por fase/turno.

Reanimação mantém suas fases normais 2/3, uma ativação por fase e uma ressurreição
por zumbi na partida. Remove somente o teto de persistentes por fase. Ressurge
com metade do novo máximo: 90/95/100. Mutação, passivas, Infecção, alvos e
lifecycle permanecem. Saves preservam ferimentos, cadáveres e contadores; HP
atual acima do novo máximo é limitado, sem curar ou ressuscitar.
O ID histórico `phase_cap` do laboratório foi mantido, agora com três presentes.

##### Filhas e petrificação

Três filhas iniciam com500. Lady2000, PROT.1500 inicial, Sede máxima100.

| Item | Redução fixa do máximo |
| --- | ---: |
| Adaga | 80 |
| Explosivo | 110 |
| Anticoagulante | 100 |
| Frasco | 160 |
| Relíquia | 160 |

Piso130. Reduções aditivas sobre os500 originais: 500→340→180→130 no exemplo
Frasco/Relíquia/Adaga. HP atual é limitado ao máximo, nunca curado. Itens ainda
funcionam no piso; a filha pode receber dano e morrer.

Preservados: Adaga80%, Explosivo100/hemorragia15 permanente sem stack,
regeneração20→10, Frasco global temporário, Relíquia+20% direto, 15 itens/3 de
cada tipo, distribuição/sorteio, carta sacrificada e retorno consumido ao Lixo.

##### Tributo e Marca

Tributo: mão0–7 não cobra; 8–10 soma2; 11+ soma4. Esses valores-base são iguais
nas três fases; a agressividade aumenta com as filhas mortas. Bônus coletivo
0/4/8/10 na Fúria0/1/2/3, somente se existir cobrança positiva.

| Fúria | Duas mãos com11+ |
| --- | ---: |
| 0 | 8 |
| 1 | 12 |
| 2 | 16 |
| 3 | 18 |

Uma passagem pelo modificador, não uma por jogador nem a nova curva mais o
bônus antigo. Motor, projeção do HUD, medidor, ajuda e resultado concordam.

Marca: base por falha cresce pela fração40/60/80/100% da base anterior,
arredondada para baixo. O bônus geral existente +2 por filha morta é cobrado uma
única vez no total positivo. Duas marcas que falham:

| Fase | Fúria0 | Fúria1 | Fúria2 | Fúria3 |
| --- | ---: | ---: | ---: | ---: |
| 1 | 4 | 8 | 12 | 16 |
| 2 | 4 | 10 | 14 | 20 |
| 3 | 6 | 12 | 18 | 24 |

Os máximos16/20/24 são exatamente os anteriores. Usar as marcas evita sua
punição; descartar não cumpre o objetivo. Cura por Fúria continua +10% por filha
morta; Sangue Impuro, demais habilidades e curas não recebem modificador novo.

#### Compatibilidade

Saves modernos migram perdas futuras e piso uma vez, sem reaplicar perdas em
cartas já anexadas nem modificar ferimentos, proteção consumida ou ticks. Saves
v1 mantêm o contrato histórico dos itens. Um Tributo/Marca já anunciado por um
save anterior mantém a cotação antiga até resolver; novos anúncios usam a nova
curva. Snapshots/undo preservam versões, consumo e IDs de eventos.

As tabelas históricas do simulador de petrificação foram explicitamente fixadas
nos valores antigos para não herdar silenciosamente o pacote atual. Esse
experimento não foi executado nem recalibrado.

#### Validação

**296 testes direcionados e regressões necessárias aprovados**, nenhum falhou;
`.cache/package-oct12-essential.log`. Não foi rodada a suíte geral completa.
Cobertura: cinco tipos, mão sem propriedade visual, compra e descarte reais,
recuperação e watchdog, falha fatal, mão só com itens, Joker/2/canastra, filha
morta/todas mortas, efeitos redundantes, restrições, sessão cancelada, commits,
108IDs no laboratório, snapshot/reload/undo, cotação/dano incremental, perdas
aditivas/piso/morte e curva de Sede nas três fases e quatro níveis de Fúria.
Inclui regressões da Dominadora/Matriarca para preservar o lote anterior.

Sintaxe e `git diff --check` aprovados. Sem mudanças em assets ou CSS.
Limites: os métodos reais do app foram executados em VM com commits simulados;
não são duas contas autenticadas no Firebase nem um playtest humano em tablet.
Não foi medida uma nova taxa de vitória nem executado benchmark extensivo.

#### Arquivos

- Fluxo e recuperação: `boss-bot.js`, `app.js`, `js/boss/boss-bot-strategy.js`.
- Política de itens nova: `js/boss/castle-bot-strategy.js`.
- Combate/valores/save: `js/boss/boss-engine.js`, `js/boss/dimitrescu-castle.js`,
  `js/boss/bosses/dimitrescu.js`, `js/boss/bosses/nemesis.js`,
  `js/boss/mechanics/nemesis.js`, `js/boss/boss-debug-scenarios.js`.
- Ajuda/HUD: `js/boss/presentation/dimitrescu.js`,
  `js/boss/ui/dimitrescu-castle-view.js`.
- Cache: `service-worker.js` v308, com o módulo novo.
- Novos testes: `tests/castle-bot-fixture.mjs`,
  `tests/dimitrescu-bot-items.test.mjs`, `tests/cooperative-fixed-package.test.mjs`.
- Expectativas atualizadas: `tests/dimitrescu-items-v2.test.mjs`,
  `tests/dimitrescu-item-final.test.mjs`, `tests/dimitrescu-package-b.test.mjs`,
  `tests/nemesis-boss.test.mjs`, `tests/nemesis-reanimation-once.test.mjs`,
  `tests/nemesis-devourer-entry.test.mjs`.
- Reprodução: `scripts/castle-bot-items-reproduction.mjs`.
- Compatibilidade de configuração histórica: `scripts/dimitrescu-item-experiment.mjs`.
- Referências: este relatório, `DOCUMENTACAO_CHEFE_DA_MESA.md` e
  `INVENTARIO_HABILIDADES_CHEFES.md`. Nenhum checklist antigo reaberto.


---

<a id="arquivo-analise-dano-canastras-hp-2026-10-12"></a>

## Origem: ANALISE_DANO_CANASTRAS_HP_2026-10-12.md

### Canastras: pontuação como dano e HP dos seis chefes

Análise executada em 12/10/2026. Referência de produção:
`967722db47ad3e6ffdefb7753df2f1da3c5bf0c0`.

#### Resultado principal

Foram executadas **2.240 tentativas oficiais**, das quais **2.084 terminaram pelo
motor** e **156 foram interrompidas por uma limitação do BOT no Cofre do Banqueiro**.
As interrupções não foram transformadas em derrotas nem completadas artificialmente.

A comparação principal contém as mesmas **100 sementes completas por chefe** em
três condições: sistema atual, dano proposto com HP atual e dano proposto com HP
candidato. São **600 + 600 + 600 batalhas completas pareadas**. As outras 284
batalhas completas são suplementos e sensibilidades; continuam disponíveis.

O aumento observado é muito menor que presumir várias Ás-a-Ás em toda partida.
O BOT terminou entre 80 e 96 das 100 partidas de referência de cada chefe sem
concluir nenhuma Ás-a-Ás. Entretanto, o ganho muda decisões, fases, duração e
curas: não basta somar o bônus extra à partida antiga.

**Recomendação: testar os HPs abaixo, sem tratá-los como um pacote homologado.**
Eles amortecem o ganho, mas não reproduzem exatamente a dificuldade anterior do
BOT. Não existe estimativa validada de taxa de vitória de jogadores humanos.

#### 1. O que foi executado

- `BossBuracoBot` atual, para ambos os cooperadores.
- Métodos reais de `botEngine` extraídos do `app.js`: compra do Monte/Lixo,
  extensão/abertura de jogos, validação de Crédito e Interdito, escolha de ilusões,
  Cofre, uso estratégico dos itens e descarte/recuperação.
- Funções reais de normalização, classificação visual, pontuação, ordenação,
  Mortos, reciclagem e encerramento do `app.js`.
- Baralho real de 108 cartas criado por `js/deck.js`, distribuição alternada de
  11 cartas por jogador, dois Mortos de 11 e uma carta inicial no Lixo.
- Sorteio reproduzível Fisher–Yates; mesma ordem física e mesmo sorteio inicial
  de itens em cada comparação. Primeiro cooperador alterna pela paridade da semente.
- Habilidades, probabilidades, bloqueios, escolhas, fases e condições de derrota
  verdadeiros. Não foram preparados jogos ou canastras artificialmente.
- Nemesis com Agarrador 180, Infectado 190, Devorador 200, três persistentes
  possíveis desde a primeira fase; a amostra chegou a três simultâneos.
- Matriarca com dez Flores; Dimitrescu com os 15 itens e valores atuais, incluindo
  impacto 100, hemorragia 15, transferência 80%, regeneração 20/10 e petrificação.

Somente DOM, áudio, animações, espera entre ações e gravação Firebase foram
substituídos por execução local sem apresentação. O algoritmo de decisão não foi
trocado por uma política simplificada. O planner usa seu fallback local existente,
sem Web Worker, e sem pausas cosméticas. Não são partidas de navegador/Firebase.

O Especial permanece no motor, acumula normalmente e não foi alterado. O BOT
atual não possui ativação automática do Especial da equipe; não foi inventada
uma estratégia de ativação para melhorar seus resultados.

##### Sistemas comparados

| Categoria | Atual | Proposto |
| --- | ---: | ---: |
| Suja | 100 | 100 |
| Limpa | 180 | 200 |
| Real | 300 | 500 |
| Ás-a-Ás | 450 | 1.000 |

Dano individual preservado: 2 = 10, Ás = 15, Joker = 20; demais valores iguais
à produção. Evolução incremental preservada: Limpa → Real concede somente
300 adicionais no proposto, e Real → Ás-a-Ás somente 500 adicionais.

Os valores experimentais são carregados por hooks de módulos **apenas dentro dos
workers do experimento**. Nenhuma tabela, HP ou regra de produção foi editada.

#### 2. Amostra e censura

Sementes iniciais: `120000` a `120099`, nos seis chefes. Banqueiro também teve
`120100` a `120179`, nos três cenários, para repor tentativas interrompidas.

| Grupo oficial | Tentativas | Completas | Interrompidas |
| --- | ---: | ---: | ---: |
| Atual, seis chefes + suplemento Banqueiro | 680 | 628 | 52 |
| Proposto/HP atual + suplemento Banqueiro | 680 | 628 | 52 |
| HPs candidatos e sensibilidades | 880 | 828 | 52 |
| Total | 2.240 | 2.084 | 156 |

Cada coorte principal usa as primeiras 100 sementes, em ordem crescente, que
terminaram nas três condições comparadas. Banqueiro vai de 120000 a 120140,
com as sementes interrompidas excluídas; os demais usam 120000–120099.
Os IDs exatos estão em `metrics/canastra-hp-2026-10-12/cohort.json`.

Essa exclusão é uma limitação: jogos que acionam o problema do Cofre podem ter
um perfil diferente. Os 52 casos por condição continuam nos arquivos brutos e
no CSV geral; seus números parciais não entram como partidas completas.

##### Limitação comprovada do Cofre

Na semente 120001, turno 35, o BOT estava sem compra concluída, sem escolha
pendente e no estágio normal dos jogadores. `shouldBossBotReclaimVault()` pode
considerar a utilidade da carta mesmo com o Cofre fechado. `executeDrawStock()`
tenta o resgate; `reclaimBossVault()` rejeita legitimamente o Cofre fechado;
a rotina retorna sem comprar. O descarte e a recuperação permanecem bloqueados.

O mesmo padrão ocorreu em 52 das 180 sementes do Banqueiro, nas três condições.
Não foi corrigido nem contornado neste lote: seria uma alteração de produção
fora da análise solicitada.

#### 3. Canastras realmente concluídas

Uma canastra física conta **uma vez, pela maior categoria que realmente atingiu**.
Limpa → Real → Ás-a-Ás conta uma Ás-a-Ás nesta tabela, não três canastras.
Também estão registrados separadamente a categoria ao terminar a partida,
todas as categorias visitadas e cada evolução com seu bônus incremental.

##### Médias por partida, sistema atual, 100 partidas completas por chefe

| Chefe | Sujas | Limpas | Reais | Ás-a-Ás |
| --- | ---: | ---: | ---: | ---: |
| Banqueiro | 1,26 | 2,02 | 0,12 | 0,06 |
| Dominadora | 3,97 | 2,29 | 0,33 | 0,19 |
| Matriarca | 3,28 | 1,60 | 0,11 | 0,06 |
| Nehelenia | 0,65 | 0,75 | 0,03 | 0,06 |
| Nemesis | 4,26 | 3,05 | 0,44 | 0,23 |
| Dimitrescu | 3,69 | 2,66 | 0,21 | 0,15 |

##### Mediana e máximo por partida

Cada célula mostra **mediana / máximo**; não é intervalo de confiança.

| Chefe | Sujas | Limpas | Reais | Ás-a-Ás |
| --- | ---: | ---: | ---: | ---: |
| Banqueiro | 1 / 5 | 2 / 6 | 0 / 2 | 0 / 1 |
| Dominadora | 4 / 7 | 2 / 5 | 0 / 3 | 0 / 2 |
| Matriarca | 3 / 7 | 1 / 5 | 0 / 2 | 0 / 2 |
| Nehelenia | 0 / 4 | 0 / 5 | 0 / 1 | 0 / 3 |
| Nemesis | 4 / 7 | 3 / 8 | 0 / 3 | 0 / 2 |
| Dimitrescu | 4 / 8 | 3 / 6 | 0 / 2 | 0 / 2 |

##### Distribuição de partidas por quantidade de Ás-a-Ás

| Chefe | Zero | Uma | Duas | Mais de duas |
| --- | ---: | ---: | ---: | ---: |
| Banqueiro | 94 | 6 | 0 | 0 |
| Dominadora | 82 | 17 | 1 | 0 |
| Matriarca | 95 | 4 | 1 | 0 |
| Nehelenia | 96 | 3 | 0 | 1 |
| Nemesis | 80 | 17 | 3 | 0 |
| Dimitrescu | 88 | 9 | 3 | 0 |

Todos os histogramas, inclusive Sujas/Limpas/Reais, estão em `cohort.json`,
em `cohorts.<chefe>.current.highestCounts.<categoria>.histogram`.

#### 4. Dano adicional: projeção aritmética versus novas batalhas

“Extra nominal” reaplica os novos bônus às canastras da trajetória antiga:
`20 × Limpas + 200 × Reais + 550 × Ás-a-Ás`, sem repetir evoluções.
Não inclui multiplicadores, proteções, cura ou alteração de escolhas.

As duas últimas colunas são diferenças entre **novas partidas reais pareadas**,
com HP atual. “Dano na vida principal” inclui a transmissão da Adaga, mas não
subtrai cura; não é redução líquida de HP. As médias podem divergir porque a
nova partida não termina com os mesmos jogos, ataques, fases ou turnos.

| Chefe | Extra nominal na trajetória antiga | Extra observado nos bônus | Extra observado na vida principal |
| --- | ---: | ---: | ---: |
| Banqueiro | 97,40 | 95,40 | 90,95 |
| Dominadora | 216,30 | 196,30 | 174,70 |
| Matriarca | 87,00 | 101,00 | 85,72 |
| Nehelenia | 54,00 | 31,00 | 27,35 |
| Nemesis | 275,50 | 250,50 | 236,25 |
| Dimitrescu | 177,70 | 177,70 | 147,26 |

##### Dano e recuperação médios na referência atual

| Chefe | Cartas | Bônus | Absorvido | Excesso perdido | Cura/restauração do chefe |
| --- | ---: | ---: | ---: | ---: | ---: |
| Banqueiro | 457,30 | 552,60 | 0 | 0,35 | 0 |
| Dominadora | 725,15 | 990,70 | 0 | 0 | 360,00 |
| Matriarca | 587,55 | 676,00 | 12,05 | 0,60 | 296,26 |
| Nehelenia | 298,80 | 236,00 | 0 | 0,80 | 0 |
| Nemesis | 848,00 | 1.210,50 | 0 | 160,90 | 116,10 |
| Dimitrescu | 754,55 | 978,30 | 110,90 | 106,02 | 751,31 |

- Dominadora: 185,85 dos 360 representam dano restaurado pela Posse; essa
  restauração não é regeneração. Reaplicação após romper a Posse é outra métrica.
- Matriarca: Renascimento separado, média 6 HP por partida (duas ativações de 300).
- Nemesis: 458,80 de ataques efetivos aos zumbis e 46,85 de cura dos auxiliares,
  além dos 116,10 recuperados pelo chefe. Ataque no zumbi não transborda para Nemesis.
- Dimitrescu: ataques nas filhas 664,92; transferência à Lady 282,70; impacto de
  itens 157,15; hemorragia 168,46; regeneração das filhas 314,72. Média 7,51 itens
  usados. Petrificação e redução de proteção não foram rotuladas como dano de cartas.
- Excesso perdido é dano calculado além do que o alvo podia receber, após
  proteções/multiplicadores. Dano corretamente absorvido não é contado novamente
  como excesso. Cartas nunca baixadas não são inventadas como dano desperdiçado.

#### 5. Resultado e duração das batalhas

Duração expressa em turnos individuais e rodadas do motor, não em minutos de
playtest humano. `wallMs` nos arquivos mede o tempo computacional de execução,
com espera cosmética removida e workers concorrentes.

| Chefe | HP restante médio, atual | Turnos médios | Rodadas médias | Fase final: F1 / F2 / F3 |
| --- | ---: | ---: | ---: | --- |
| Banqueiro | 1.636,45 | 44,52 | 22,95 | 0 / 55 / 45 |
| Dominadora | 1.157,50 | 69,02 | 35,01 | 0 / 3 / 97 |
| Matriarca | 1.051,36 | 51,41 | 26,62 | 0 / 38 / 62 |
| Nehelenia | 1.866,00 | 41,89 | 21,82 | 3 / 73 / 24 |
| Nemesis | 875,30 | 72,09 | 36,32 | 0 / 0 / 100 |
| Dimitrescu | 1.559,71 | 67,64 | 34,16 | 0 / 3 / 97 |

Motivos na referência:

- Banqueiro: 94 Dívida máxima, 3 ataque final insuficiente, 2 recursos esgotados,
  1 chefe derrotado; casos de Cofre não entram nestes 100.
- Dominadora: 46 ambos dominados, 53 recursos esgotados, 1 chefe derrotada.
- Matriarca: 96 dez Flores, 4 recursos esgotados.
- Nehelenia: 98 cinco Espelhos dos Sonhos, 2 chefe derrotada.
- Nemesis: 87 recursos esgotados, 8 Infecção máxima, 5 chefe derrotado.
- Dimitrescu: 83 recursos esgotados, 14 Sede máxima, 2 ataque final insuficiente,
  1 chefe derrotada.

Motivos, HP, turnos, fases e marcos de ambos os Mortos e Monte ≤30/≤20 estão
armazenados também para cada condição nova e para cada partida individual.

#### 6. HPs recomendados para teste, não para produção

Faixas são hipóteses de ajuste fino, **não intervalos estatísticos nem todos os
valores já simulados**. O valor central de cada linha foi efetivamente simulado
em 100 partidas completas com o dano proposto.

| Chefe | HP atual | Média S / L / R / AA | Extra nominal | HP para testar | Faixa plausível |
| --- | ---: | --- | ---: | ---: | --- |
| Banqueiro | 2.650 | 1,26 / 2,02 / 0,12 / 0,06 | 97,40 | **2.750** | 2.650–2.900 |
| Dominadora | 2.600 | 3,97 / 2,29 / 0,33 / 0,19 | 216,30 | **2.900** | 2.800–3.100 |
| Matriarca | 2.000 | 3,28 / 1,60 / 0,11 / 0,06 | 87,00 | **2.400** | 2.200–2.400 |
| Nehelenia | 2.400 | 0,65 / 0,75 / 0,03 / 0,06 | 54,00 | **2.500** | 2.400–2.600 |
| Nemesis | 2.200 | 4,26 / 3,05 / 0,44 / 0,23 | 275,50 | **2.600** | 2.400–2.700 |
| Dimitrescu | 2.000 | 3,69 / 2,66 / 0,21 / 0,15 | 177,70 | **2.200** | 2.000–2.400 |

##### Vitórias do BOT em 100 partidas completas pareadas

| Chefe | Atual | Proposto, HP atual | Proposto, HP recomendado |
| --- | ---: | ---: | ---: |
| Banqueiro | 1 | 7 | 4 |
| Dominadora | 1 | 17 | 7 |
| Matriarca | 0 | 5 | 1 |
| Nehelenia | 2 | 3 | 3 |
| Nemesis | 5 | 28 | 10 |
| Dimitrescu | 1 | 11 | 9 |

Sensibilidades adicionais: Nemesis 2.500 teve 13 vitórias/100; Matriarca 2.300
teve 2/100. Esses cenários estão no resumo geral, fora da seleção recomendada.

Justificativas:

- **Banqueiro:** ganho efetivo médio de cerca de 91 HP; 2.750 compensou quase
  todo esse ganho na média. A Dívida, não a vida, encerrou a maior parte das lutas.
  Os casos interrompidos e a censura reduzem a confiança na recomendação.
- **Dominadora:** 2.900 reduziu o salto de 17 para 7 vitórias; ordens, Posse,
  Interdito e Dominação continuam importantes. Ainda está acima da referência
  de 1 vitória: 2.900 não prova dificuldade idêntica. Extremo superior da faixa
  deve ser considerado somente após observar humanos, não para forçar 1% de vitórias.
- **Matriarca:** 2.400 reduziu 5 para 1 vitória; preserva dez Flores, curas e
  Renascimento. Também fica acima dos 2.250 de duas Ás-a-Ás naturais completas,
  inclusive dos 2.350 se somado um ataque final de 100. Não é uma afirmação de
  que esse HP seja necessário por causa do ganho médio, que foi pequeno.
- **Nehelenia:** ganho efetivo médio de apenas 27,35; 2.800, sugerido antes sem
  simulação, não é sustentado pela amostra. 2.500 é um ajuste conservador; a
  derrota por Espelhos é o principal limitador do BOT.
- **Nemesis:** 2.600 amortizou 28 para 10 vitórias; 2.500 teve 13. Desvio de dano
  aos zumbis, excesso perdido, Reanimação e cura do Devorador impedem aplicar
  diretamente os 275,50 extras nominais ao HP principal.
- **Dimitrescu:** 2.200 compensa aproximadamente os 147,26 extras na vida
  principal; preserva proteção inicial de 1.500 e filhas de 500. Ainda teve
  9 vitórias contra 1 na referência: é a recomendação menos fechada em termos
  de dificuldade. A melhora das rotas/curas importa mais que um multiplicador de HP.

##### Critérios estratégicos que a amostra NÃO homologou

1. **Duas Ás-a-Ás não garantirem vitória:** nas coortes propostas, as poucas
   partidas que chegaram a duas ou mais venceram. Elas também tinham outros
   jogos/cartas; isso não isola o efeito das duas canastras. Não foi demonstrada
   uma taxa de sucesso/fracasso estável nesse subconjunto. Os HPs centrais ficam
   acima do dano bruto de duas Ás-a-Ás, com a exceção da Lady, cuja proteção
   inicial eleva a barreira direta a 3.700. Isso não substitui playtest.
2. **Vitória sem Ás-a-Ás em todos os chefes:** com HP recomendado, houve vitórias
   sem Ás-a-Ás no Banqueiro (1), Nehelenia (1) e Nemesis (2). Não houve na
   Dominadora, Matriarca ou Dimitrescu. Isso não prova impossibilidade para
   humanos, mas também não permite afirmar que o requisito já foi validado.
3. **Preservar dificuldade aproximadamente:** o pacote candidato reduz o salto,
   mas sobretudo Dominadora e Dimitrescu ainda ganharam vitórias no BOT.
   Não declarar equivalência nem selecionar HP para reproduzir artificialmente
   um índice de vitória de um agente limitado.

#### 7. Exemplos pareados verificáveis

| Chefe / semente | Atual | Proposto / HP atual | Proposto / HP candidato |
| --- | --- | --- | --- |
| Dominadora / 120004 | Recursos, 73 turnos, 990 HP, 0 AA | Vitória, 57 turnos, 0 HP, 1 AA | HP 2.900: recursos, 73 turnos, 870 HP, 0 AA |
| Nemesis / 120003 | Recursos, 74 turnos, 770 HP, 1 AA | Vitória, 67 turnos, 0 HP, 1 AA | HP 2.600: recursos, 74 turnos, 580 HP, 1 AA |
| Dimitrescu / 120000 | Recursos, 69 turnos, 951 HP, 1 AA | Vitória, 53 turnos, 0 HP, 1 AA | HP 2.200: vitória, 61 turnos, 0 HP, 1 AA |

Na Dimitrescu 120000, a cura da Lady mudou de 735 para 228. Esse exemplo
demonstra por que somar 590 extras à luta antiga não descreve a luta nova:
ela tem duração e oportunidades de cura diferentes.

#### 8. Outras limitações do BOT

- Não há planejamento humano de longo prazo de naipes e Ás-a-Ás. A execução
  preservou seus limites e heurísticas atuais; não foi usado um BOT melhorado.
- As mãos ocultas continuam ocultas nas projeções canônicas. O adaptador não
  fornece faces do Monte ou dos Mortos para escolher ações.
- Nas ilusões de memória, o BOT usa a mesma política do app, que modela acompanhar
  a imagem correta. No Espelho do Lixo mantém a escolha deliberada 50/50.
- O planner `classifyBossMeldKind()` pode chamar de Ás-a-Ás uma sequência de 14
  cartas com substituição de coringa, enquanto a classificação real do app
  corretamente chama de Suja. Há divergências finais em 1/3/3/0/5/6 partidas de
  referência, respectivamente Banqueiro/Dominadora/Matriarca/Nehelenia/Nemesis/Lady.
  Essa limitação pode distorcer decisões. Os números deste relatório usam a
  categoria real do app e os eventos efetivamente concedidos, não o palpite do
  planner. Nenhuma correção de produção foi feita.
- O BOT não ativa o Especial da equipe. Humanos têm essa rota adicional de
  cinco cartas do topo do Lixo, sob os bloqueios e efeitos existentes.
- Não são duas contas Firebase ou tablets físicos. Nenhum resultado aqui é
  apresentado como taxa de vitória humana, nem como previsão de minutos de partida.

#### 9. Evidências e reprodução

Na pasta `metrics/canastra-hp-2026-10-12/`:

- `cohort.json`: coortes principais, sementes, média/mediana/extremos/histogramas,
  motivos, dano e comparações pareadas.
- `cohort.csv`: tabela central para leitura em planilha.
- `cohort-metrics.jsonl`: métricas das 1.800 partidas das três coortes principais.
- `summary.json`, `summary.csv`, `battles.csv`: todas as condições e tentativas,
  inclusive sensibilidades e interrupções, sem esconder casos desfavoráveis.
- `*.jsonl.gz` e subpastas: logs completos, com ações reais, eventos, ataques,
  evoluções, marcos e erros de cada semente. Compressão sem perdas dos eventos.
- `archives.json`: índice, tamanhos e SHA-256 dos arquivos comprimidos.
- `manifest.json` e `completion.json` de cada lote: comando, versão Node,
  revisão, hashes da produção e verificação de nenhuma alteração de produção.

Reprodução com Node 24, em uma pasta de saída NOVA para não substituir evidências:

```bash
node scripts/canastra-hp-experiment.mjs --count=100 --start=120000 --scenarios=current,proposed --workers=6 --batch=10 --output=.cache/canastra-hp-reproduction
node scripts/canastra-hp-summary.mjs .cache/canastra-hp-reproduction
node --test tests/canastra-hp-experiment.test.mjs
```

Os comandos exatos dos suplementos/HPs estão nos sete manifests. Copiar seus
argumentos de sistema, HP, etiqueta e sementes, trocando apenas o destino da saída.
Para reconstruir a coorte, reunir os lotes em uma pasta raiz com subpastas e usar:

```bash
node scripts/canastra-hp-cohort.mjs CAMINHO_DA_PASTA_RAIZ
node scripts/canastra-hp-pack.mjs CAMINHO_DA_PASTA_RAIZ
```

O empacotador valida o round-trip gzip e substitui somente os seus logs gerados
por versões comprimidas recuperáveis. Ele não toca em assets ou arquivos de produção.

#### 10. Validação e arquivos novos

- Oito testes focados aprovados: determinismo, reprodução da trajetória arquivada,
  tabelas incrementais, grafo
  experimental isolado, persistência do HP na normalização, itens reais,
  conservação física, censura e coortes de 100 por chefe/condição.
- Conservação de 108 IDs físicos únicos e legalidade dos jogos verificadas em
  cada commit local e ao finalizar cada turno, inclusive Cofre e cartas sacrificadas.
- As 2.240 tentativas reconciliam: dano na vida principal + Adaga − cura/restauração
  − Renascimento = HP inicial − HP final. Projeções do planner não entram na coleta.
- Hashes dos arquivos de produção permaneceram iguais em todos os lotes.
- `git diff --check` aprovado. Não houve alteração de arquivo rastreado de produção.

Novos: este relatório, pasta de métricas, seis scripts `canastra-hp-*.mjs` e
`tests/canastra-hp-experiment.test.mjs`. Nenhum dano, HP, regra, imagem, áudio ou
layout de produção foi alterado. Sem commit, push ou deploy.


---

<a id="arquivo-balanceamento-seis-chefes-2026-10-13"></a>

## Origem: BALANCEAMENTO_SEIS_CHEFES_2026-10-13.md

### Balanceamento aplicado — seis chefes — 13/10/2026

Pacote aprovado implementado no workspace local. Sem commit, push ou deploy. Não houve nova bateria de calibração de dificuldade. A referência futura de aproximadamente 70% de vitórias dos chefes contra uma dupla humana competente **não foi medida** nem inferida pelo BOT.

#### Valores vigentes

| Canastra | Bônus de dano |
| --- | ---: |
| Suja | 100 |
| Limpa | 200 |
| Real | 500 |
| Ás-a-Ás | 1000 |

O bônus é adicional ao dano individual das cartas, contabilizado por ID físico apenas uma vez. Carta2 permanece10, Ás15, Joker20. Suja→Limpa acrescenta100; Limpa→Real300; Real→Ás-a-Ás500. Repetir render/snapshot/transição do mesmo tier não causa novo dano. O teste canônico com2/Ás/Joker e Limpa causa245, depois300 e500 nas evoluções, sem repetir os45 das cartas. HP nunca fica negativo.

| Chefe | HP |
| --- | ---: |
| Banqueiro | 2650 |
| Dominadora | 2800 |
| Matriarca Esmeralda | 2300 |
| Nehelenia | 2400 |
| Nemesis | 2500 |
| Lady Dimitrescu | 2000 |

##### Penalidades pontuais

| Nehelenia — Mundo do Espelho | Novo valor |
| --- | ---: |
| Jogo Espelhado, erro ou ignorar | +14 |
| Siga o Reflexo, quantidades diferentes | +12 |
| Espelho do Lixo, erro | +12 |
| Pesadelo Eterno, erro | +20 |

O motor conserva a escala interna0–5 (cada unidade equivale a20 no HUD); os valores apresentados continuam em0–100. Os cinco Espelhos, os três auxiliares, ilusões, bloqueios, demais penalidades e limite100 permanecem.

| Banqueiro — Juros Fixos | Leve | Padrão | Severo |
| --- | ---: | ---: | ---: |
| Integral F1/F2 | 8 | 10 | 12 |
| Integral F3 | 12 | 14 | 15 |
| Garantia F1/F2, preservada | 4 | 5 | 6 |
| Garantia F3, preservada | 6 | 7 | 8 |

Pesos25%/50%/25%, juros por adiamento2/3 e teto100 preservados. Auditoria de Naipe cobra10 na F2 e14 na F3 por falha. Demais habilidades e Cofre intactos.

| Dominadora — Etiqueta de Ferro | F1 | F2 | F3 |
| --- | ---: | ---: | ---: |
| Naipe errado | 8 | 10 | 12 |
| Obediência, preservada | 2 | 2 | 3 |

Dominação continua limitada a50 por jogador. Transbordamento, demais habilidades e estratégia recente do BOT não foram alterados.

#### Compatibilidade e idempotência

`cooperativeBalanceVersion:2` registra a normalização única do pacote.

- Nos saves antigos, créditos de bônus180/300/450 passam a200/500/1000 **somente no ledger**, sem causar dano retroativo. Mantêm-se IDs já danificados, contribuições, alívios de recursos, estatísticas e eventos. Uma Limpa antiga que já causou180 não recebe mais20 ao abrir o save; se evoluir para Real, acrescenta300.
- Habilidades já anunciadas conservam sua cobrança original. Juros/Auditoria preservam o payload; ordens antigas da Etiqueta e ilusões pendentes recebem o valor antigo explícito quando necessário. Novas ativações usam os valores deste pacote. Ajuda/HUD leem o valor persistido, não um número divergente do cálculo.
- Partidas antigas em andamento dos três chefes cujo HP mudou recebem o novo máximo, preservando o HP absoluto restante e limitando-o ao máximo. Não há cura ao carregar. Partidas encerradas não são reabertas nem têm seu HP máximo histórico reescrito.
- Serialização, reload, normalização repetida e Voltar foram cobertos. Não foram alterados schema/regras do Firebase; não foi realizado teste com clientes Firebase autenticados nesta etapa.

#### Cofre fechado — causa e correção

`shouldBossBotReclaimVault()` avaliava utilidade da carta sem exigir que a cotação estivesse aberta. O BOT podia escolher o resgate de um Cofre fechado; `reclaimBossVault()` legitimamente devolvia `null`, mas `botEngine.executeDrawStock()` encerrava ali, sem concluir a compra.

A estratégia agora exige `quote.state === 'open'`. O motor continua rejeitando resgate fechado. Como defesa adicional, uma tentativa sem evento não encerra silenciosamente a compra: o fluxo prossegue para a compra canônica do Monte, somente se o action gate comum permitir. Resgate confirmado conserva seu commit e retorno próprios.

A reprodução com semente120001 usa `BossBuracoBot`, o motor, baralho físico e métodos reais de `app.js` através do harness headless existente. A batalha termina sem compra forçada, turno pulado ou resultado censurado. O teste direto também confirma que Cofre fechado não é opção do BOT e continua inválido para o motor. Isso é regressão de um bug, não estimativa de dificuldade humana.

#### Regras anteriores preservadas

- Matriarca: dez Flores, Renascimento300/uma vez/consumo de Flor, Casulo180, ameaças e tetos de cura.
- Nemesis: três zumbis diferentes possíveis em qualquer fase; Agarrador180, Infectado190, Devorador200; entrada natural por Invasão, quotas/lifecycle de reanimação, mutação, passivas e Infecção. Reanimação90/95/100.
- Lady: HP2000, PROT.1500, filhas500, piso recuperável130, petrificações80/110/100/160/160, Explosivo100+15 permanente sem stack, Adaga80%, regen20/Anti10, Frasco global temporário, Relíquia+20%, itens15, Sede e Fúria do pacote12/10.
- Especial: carga25/50/100 incremental, custo100, exatamente cinco do topo do Lixo, beneficiário, bloqueios e reações. Sem alteração em imagens, áudio, animações, fontes, chips ou espaçamento.

#### Testes executados

Node do runtime local; comandos abaixo podem usar `node` quando disponível no PATH.

##### Focados: 377 aprovados, zero falhas

```powershell
node --test tests/cooperative-balance-oct13.test.mjs tests/boss-engine.test.mjs tests/boss-final-balance.test.mjs tests/boss-integration.test.mjs tests/boss-rework-october.test.mjs tests/nemesis-boss.test.mjs tests/nemesis-final-balance.test.mjs tests/nehelenia-boss.test.mjs tests/dominatrix-balance.test.mjs
```

Inclui31 testes novos: seis HPs; dano incremental/cartas; deduplicação; limite de HP; saves antigos; cobranças anunciadas; reload/undo; quatro nerfs da Nehelenia no motor/HUD/ajuda; contratos das três fases; Auditoria; Etiqueta/obediência; Cofre/BOT. O erro do reflexo falso também foi conferido na regressão da Nehelenia.

##### Preservação e arquivos históricos: 102 aprovados, zero falhas, quatro ignorados

```powershell
node --test tests/boss-special.test.mjs tests/matriarch-ten-flowers.test.mjs tests/dimitrescu-castle.test.mjs tests/cooperative-special-presentation.test.mjs tests/cooperative-special-audio.test.mjs tests/canastra-hp-experiment.test.mjs
```

Quatro testes de batalhas/replay da análise12/10 são condicionados aos hashes originais do motor. O pacote13/10 mudou esses inputs: os testes históricos são explicitamente ignorados, em vez de comparar partidas novas a resultados antigos e reescrever evidências. Validação das métricas arquivadas e testes unitários do resumo continuam passando. Os arquivos históricos de métricas e seus resultados não foram alterados.

##### Regressão ampliada: 1276 executados, 1253 aprovados, 23 falhas preexistentes

Foram selecionados os `.test.mjs` com prefixos `boss-`, `nemesis-`, `nehelenia-`, `dominatrix-`, `matriarch-`, `dimitrescu-`, `cooperative-balance-`, `canastra-hp-`, excluindo nomes com `experiment`/`battle`. **A suíte ampliada não está inteiramente verde.** Os23 casos abaixo também falham contra o código anterior (`967722db47ad3e6ffdefb7753df2f1da3c5bf0c0`), confirmado por loader de diagnóstico que lê fontes do Git sem trocar o workspace:

| Arquivo | Falhas | Diagnóstico do teste |
| --- | ---: | --- |
| `boss-eligibility-audit.test.mjs` | 2 | Ainda espera teto por fase/razão `phase_cap`, removido no pacote anterior |
| `boss-lab-selection-regressions.test.mjs` | 1 | Expectativa antiga de fallback por fase em cenário de Invasão/Reanimação |
| `nemesis-grabber.test.mjs` | 3 | Espera reanimação110/120/130, embora o pacote anterior já use90/95/100 |
| `boss-help-content.test.mjs` | 1 | Espera Marca Carmesim+7 fixa, anterior à curva aprovada de12/10 |
| `boss-objective-resource-rule.test.mjs` | 15 | Expectativas antigas de Tributo/Marca/Fúria, anteriores ao pacote12/10 |
| `boss-september-regressions.test.mjs` | 1 | Harness VM não injeta `selectBossRecoveryDiscardIndex`, já exigido pela recuperação |

Não foi alterada produção fora do escopo para satisfazer essas expectativas antigas, nem declarado que os23 casos passaram. Correção desses testes/harness é manutenção futura separada; não justifica restaurar regras obsoletas. Logs locais: `.cache/balance-oct13-focused-final.log`, `.cache/balance-oct13-preserved.log`, `.cache/balance-oct13-relevant-final.log`, `.cache/balance-oct13-baseline.log`, `.cache/balance-oct13-baseline-lady.log`. `git diff --check` passou.

Homologação desktop/tablet/celular com dois humanos e Firebase, bem como dificuldade aproximada70%, permanece para a rodada posterior de playtest. Não houve teste visual em navegador nesta etapa, pois os ajustes de interface foram apenas conteúdo, não layout.

#### Arquivos alterados neste lote

- Produção: `app.js`; `js/boss/boss-balance.js`; `js/boss/boss-engine.js`; `js/boss/bosses/{banker,dominatrix,matriarch,nehelenia,nemesis}.js`; `js/boss/mechanics/nemesis.js`; `js/boss/presentation/{banker,dominatrix,nehelenia}.js`; `service-worker.js` (cachev309 para servir os módulos atualizados).
- Testes: novo `tests/cooperative-balance-oct13.test.mjs`; expectativas vigentes em `boss-engine`, `boss-final-balance`, `boss-integration`, `boss-rework-october`, `dominatrix-balance`, `nehelenia-boss`, `nemesis-boss`, `nemesis-final-balance`, `nemesis-grabber`; guarda de proveniência em `canastra-hp-experiment`.
- Documentação: este relatório; `DOCUMENTACAO_CHEFE_DA_MESA.md`; `INVENTARIO_HABILIDADES_CHEFES.md`; `CHECKLIST_PLAYTEST_CHEFES_2026-10-10_ATUALIZADO.md`; `HANDOFF_DESENVOLVIMENTO_BURACO.md`; `README.md`.

Alterações/staging anteriores do usuário foram preservados. Não foram reabertos checklists antigos nem recalculados os relatórios históricos.


---

<a id="arquivo-regras-vigentes-seis-chefes-2026-10-13"></a>

## Origem: REGRAS_VIGENTES_SEIS_CHEFES_2026-10-13.md

### Referência única — Chefes da Mesa (13/10/2026)

**Estado:** pacote de balanceamento aplicado para playtest local; não é uma homologação da dificuldade contra humanos. Os relatórios anteriores ficam como histórico, não como regras vigentes.

#### Dano vigente

| Canastra | Bônus além do valor das cartas |
|---|---:|
| Suja | 100 |
| Limpa | 200 |
| Real | 500 |
| Ás-a-Ás | 1.000 |

O valor individual das cartas soma ao bônus: 2 = 10, Ás = 15, Joker = 20, 3–7 = 5, 8–K = 10. Evoluções aplicam **somente a diferença de bônus** (+100 ao virar Limpa; +300 ao virar Real; +500 ao virar Ás-a-Ás), sem cobrar novamente os valores das cartas. O mesmo ID físico não gera dano duplicado.

#### HP e recursos especiais

| Chefe | HP principal | Regra de derrota especial |
|---|---:|---|
| O Banqueiro | 2.650 | 100 de Dívida coletiva |
| A Dominadora | 2.800 | 50 pontos de Dominação em **ambos** os jogadores |
| A Matriarca Esmeralda | 2.300 | 10 Flores |
| Rainha Nehelenia | 2.400 | 100 pontos no Mundo do Espelho (5 espelhos visuais) |
| Nemesis | 2.500 | 100 de Infecção |
| Lady Dimitrescu | 2.000 | 100 de Sede |

#### Nerfs pontuais confirmados (13/10)

- **Nehelenia:** Jogo Espelhado +14, Siga o Reflexo +12, Espelho do Lixo +12, Pesadelo Eterno +20. Outras habilidades sem mudança; conserva três auxiliares e 5 espelhos.
- **Banqueiro:** Juros Fixos integral nas fases 1/2 = 8/10/12; fase 3 = 12/14/15. Garantias e juros de adiamento não mudaram. Auditoria de Naipe falha = +10 (fase 2) / +14 (fase 3). Cofre fechado não pode ser resgatado pelo BOT.
- **Dominadora:** falha na Etiqueta de Ferro = +8/+10/+12 por fase; obedecer continua +2/+2/+3. As outras punições e o limite de 50 por jogador não mudaram.
- **Matriarca:** dez Flores e Renascimento uma vez, +300 HP e consome uma Flor; nenhuma outra mecânica ajustada.
- **Nemesis:** três zumbis persistentes de tipos diferentes podem coexistir em qualquer fase, via Invasão da Horda; Agarrador 180 HP, Infectado 190 HP, Devorador 200 HP. Cada zumbi pode reanimar uma vez com metade do HP e há limite de uma reanimação por fase.
- **Dimitrescu:** Lady 2.000 HP, PROT. 1.500, três filhas com 500 HP; itens, regen e Fúria preservados.

#### Catálogo vigente de habilidades (fonte: definições do código)

##### O Banqueiro — 2.650 HP

| Habilidade | Fases | Peso | Efeito curto |
|---|---|---:|---|
| Juros Fixos | 1/2/3 | 5 | Escolha entre pagar a cobrança integral ou prender uma carta aleatória no Cofre. |
| Tarifa de Manutenção | 1/2/3 | 3 | F1/F2: Todos compram 1 carta financiada junto da compra normal.; F3: Todos compram 2 cartas financiadas junto da compra normal. |
| Bloqueio de Crédito | 1/2/3 | 3 | O lixo ficará bloqueado durante esta rodada. |
| Auditoria de Naipe | 2/3 | 4 | F2: Baixem 3 cartas de naipe marcado nesta rodada.; F3: Baixem 4 cartas de naipe marcado nesta rodada. |
| Penhora | 2/3 | 2 | Um jogo da equipe ficará bloqueado até a próxima cobrança. |
| Juros Compostos | 2/3 | 4 | O total de cartas nas mãos define a faixa da cobrança. |
| Limite de Crédito | 1/2/3 | 4 | Cartas da mão acima da franquia compartilhada geram Dívida. |
| Ágio do Lixo | 2/3 | 3 | A primeira retirada confirmada do lixo nesta rodada cobra um ágio. |

##### A Dominadora — 2.800 HP

| Habilidade | Fases | Peso | Efeito curto |
|---|---|---:|---|
| Coleira | 1/2 | 5 | Prende até 2 cartas úteis do alvo neste turno. |
| Escolha Forçada | 1/2/3 | 5 | F1: Aceite a ordem ou sofra Dominação +6.; F2: Aceite a ordem ou sofra Dominação +7.; F3: Aceite a ordem ou sofra Dominação +8. |
| Exposição | 1/2/3 | 4 | Use a carta exposta neste turno. |
| Troca Forçada | 2/3 | 4 | Troca 1 carta útil entre os cooperadores. |
| Mãos Atadas | 2/3 | 4 | Cada jogador fica preso ao primeiro jogo que tocar. |
| Posse | 2/3 | 3 | O dano do jogo fica suspenso até romper a Posse. |
| Etiqueta de Ferro | 1/2/3 | 4 | Termine o turno descartando o naipe ordenado. |
| Favorita | 2/3 | 4 | Uma é poupada; a menos dominada recebe a punição. |
| Dupla Coleira | 3 | 5 | Prende 1 carta útil de cada jogador. |
| Separação | 3 | 4 | Um jogo alimentado fica exclusivo daquele jogador na rodada. |
| Controle Absoluto | 3 | 4 | O alvo fica Dominado por 1 turno. |
| Quebra de Vontade | 3 | 4 | Escolha entre Dominação ou curar a Dominadora. |
| Ordem Final | 3 | 4 | Aceite a Ordem às cegas ou sofra Dominação. |

##### A Matriarca Esmeralda — 2.300 HP

| Habilidade | Fases | Peso | Efeito curto |
|---|---|---:|---|
| Semente Viva | 1/2/3 | 5 | Use a carta marcada no proximo turno para impedir que a semente floresca. |
| Raiz Faminta | 1/2/3 | 5 | Adicione uma carta legal ao jogo marcado antes do fim da rodada. Se falhar, ela pode gerar uma única nova Raiz na rodada seguinte; uma Raiz já propagada não se propaga novamente. |
| Orvalho Restaurador | 1/2/3 | 3 | A cura prevista cai por faixas conforme cartas novas entram legalmente na mesa e zera com 6 cartas. |
| Trepadeiras Gemeas | 2/3 | 4 | 2 jogo(s) precisam receber uma carta legal nesta rodada. Uma ou duas falhas: +1 Flor no total. |
| Enxerto | 2/3 | 3 | Alimente os dois jogos ligados nesta rodada: dois evitam tudo; apenas um cura até 50 HP, sem Flor; nenhum gera +1 Flor e pode propagar uma Raiz. |
| Polen do Lixo | 2/3 | 3 | Se o topo contaminado for pego, ganho +1 Flor e curo ate 30 HP. |
| Colheita | 2/3 | 2 | A quantidade de cartas na mao do alvo sera avaliada no fim do turno. |
| Florescimento Real | 3 | 4 | Cumpra os 0 objetivos marcados. Falhar em um ou mais dá apenas 1 Flor à Matriarca. |
| Casulo Esmeralda | 3 | 3 | Um casulo de 180 pontos absorvera o dano ate ser rompido. |
| Coroa da Primavera | 3 | 3 | A Coroa reforça uma ameaça. Se esse objetivo falhar, nasce uma Raiz Fortalecida na próxima rodada. Essa nova Raiz não cria outras. |
| Renascimento | 3 | Passiva | Na fase final, se morrer e tiver pelo menos uma Flor, a Matriarca consome 1 Flor e volta com 300 HP. Só pode renascer uma vez por batalha. |

##### Rainha Nehelenia — 2.400 HP

| Habilidade | Fases | Peso | Efeito curto |
|---|---|---:|---|
| Jogo Espelhado | 1/2/3 | 5 | Nehelenia cria dois reflexos. Escolher o falso envia a carta ao fundo, deixa o jogador Desorientado e avança +14 no Mundo do Espelho. |
| Siga o Reflexo | 1/2/3 | 5 | O segundo cooperador precisa igualar a quantidade baixada pelo primeiro; falhar avança +12 no Mundo do Espelho. |
| Espelho do Lixo | 2/3 | 4 | O topo do lixo aparece em dois reflexos idênticos. Errar sela o lixo e avança +12 no Mundo do Espelho. |
| Prisão no Espelho | 1/2/3 | 2 | Nehelenia aprisiona quem está mais pressionado pelo Mundo do Espelho. O parceiro precisa alimentar um jogo válido; sucesso liberta sem penalidade, falha avança +8. |
| Pesadelo Eterno | 3 | 5 | A original e dois reflexos se misturam. Errar avança +20 no Mundo do Espelho. |
| Laço do Tigre | 1/2/3 | 4 | Tiger's Eye liga dois jogos. Ignorar qualquer lado avança +12 no Mundo do Espelho e deixa as garras persistentes. |
| Presa Marcada | 1/2/3 | 3 | Tiger's Eye marca uma Presa que o alvo consegue alimentar. Enquanto ela não for alimentada, esse jogador não pode alimentar nenhum outro jogo existente; a marca persiste até ser resolvida. |
| Olho do Falcão | 1/2/3 | 3 | Hawk's Eye exige que o alvo encerre o turno descartando naipe marcado. Se ele descartar outro naipe, Hawk vigia essa carta e ninguém pode recolher o lixo enquanto ela permanecer no topo. |
| Vigilância | 2/3 | 3 | Hawk's Eye fecha a rota para um jogo durante o turno do alvo. O jogo marcado não pode ser alimentado por esse jogador naquele turno. |
| Mão no Espelho | 1/2/3 | 3 | Fish Eye marca uma carta do alvo que pode ser usada com segurança. Ela precisa sair da mão — em jogo ou no descarte — antes do fim do turno; se falhar, vira um Reflexo Morto que não pode mais entrar em jogo e só sai pelo descarte. |
| Reflexo Invertido | 2/3 | 3 | Fish Eye impede o alvo de abrir um jogo novo até que ele alimente um jogo já existente. Se não resolver no turno atual, o efeito permanece nos próximos turnos até ser rompido. |

##### Nemesis — 2.500 HP

| Habilidade | Fases | Peso | Efeito curto |
|---|---|---:|---|
| Invasão da Horda | 1/2/3 | 4 | Alimente jogos existentes com 3 cartas nesta rodada. Sucesso repele; falha deixa o Devorador persistente, sem Infecção extra. |
| Caçada S.T.A.R.S. | 1/2/3 | 5 | F1: O alvo S.T.A.R.S. deve causar dano direto ao Nemesis neste turno. Zumbis não contam. Falha: +8 Infecção, mais modificadores.; F2: O alvo S.T.A.R.S. deve causar dano direto ao Nemesis neste turno. Zumbis não contam. Falha: +10 Infecção, mais modificadores.; F3: O alvo S.T.A.R.S. deve causar dano direto ao Nemesis neste turno. Zumbis não contam. Falha: +12 Infecção, mais modificadores. |
| Tentáculo Infeccioso | 1/2/3 | 5 | F1: Jogue 1 das 2 marcadas para evitar a punição. Só descartar: +4; nenhuma: +8 Infecção, mais modificadores.; F2: Jogue 1 das 2 marcadas para evitar a punição. Só descartar: +5; nenhuma: +10 Infecção, mais modificadores.; F3: Jogue 1 das 2 marcadas para evitar a punição. Só descartar: +6; nenhuma: +12 Infecção, mais modificadores. |
| Zona Contaminada | 1/2/3 | 3 | O alvo pode pegar o lixo neste turno, mas cada retirada custa +6 Infecção. Agarrador continua ativo. |
| Comando da Horda | 1/2/3 | 3 | Reforça 1 zumbi até o fim da próxima rodada: Agarrador +1 carta; Infectado +2 por falha; Devorador +15 HP de cura. |
| Lança-Foguetes | 2/3 | 4 | F2: Alimentar a Zona de Impacto é permitido e custa +10 Infecção por carta nova nesta rodada.; F3: Alimentar a Zona de Impacto é permitido e custa +12 Infecção por carta nova nesta rodada. |
| Regeneração Parasita | 2/3 | 2 | Cura 100 HP do zumbi vivo com menor percentual de HP, sem superar seu máximo. |
| Reanimação Viral | 2/3 | 2 | Um zumbi derrotado volta com metade da vida; na fase final, volta Mutado. Cada zumbi só pode reviver uma vez na batalha, e só há uma Reanimação por fase. |
| Barragem de Tentáculos | 3 | 4 | Faça 2 das 3 cartas marcadas sair legalmente da mão neste turno. Falha: +16 Infecção, mais modificadores. |
| Extermínio S.T.A.R.S. | 3 | 4 | Nesta rodada, S.T.A.R.S. deve atacar o Nemesis e o parceiro deve alimentar o jogo escolhido. Cumprir ambos evita a punição; cumprir só um custa 8 Infecção; nenhum custa 16. Efeitos ativos podem aumentar esses custos. |
| Surto Ômega | 3 | 3 | Até o fim da próxima rodada, as falhas causam Infecção extra: 2 abaixo de 50, 4 entre 50 e 74, ou 6 a partir de 75. Anunciar o Surto não aumenta a barra. |

##### Lady Dimitrescu — 2.000 HP

| Habilidade | Fases | Peso | Efeito curto |
|---|---|---:|---|
| Tributo de Sangue | 1/2/3 | 4 | No fim da rodada, cada mão com 8–10 cartas soma 2 Sede; com 11+ soma 4. Fúria acrescenta 0/4/8/10 uma única vez ao total cobrado. |
| Vinho Carmesim | 1/2/3 | 2 | F1: Se estiver ferida e tiver ao menos 20 de Sede, Lady Dimitrescu consome 15 de Sede para se curar 140 HP.; F2: Se estiver ferida e tiver ao menos 20 de Sede, Lady Dimitrescu consome 15 de Sede para se curar 200 HP.; F3: Se estiver ferida e tiver ao menos 20 de Sede, Lady Dimitrescu consome 15 de Sede para se curar 260 HP. |
| Marca Carmesim | 1/2/3 | 4 | Lady marca uma carta de cada cooperador. Use-as em jogos para evitar a punição. A Sede por falha cresce com a Fúria, sem ultrapassar a cobrança máxima anterior. |
| Banquete dos Mortos | 2/3 | 3 | F2: Lady profana o próximo Morto. Quando ele for tomado, ganha 10 de Sede e cura 90 HP, com bônus de Fúria; uma Canastra Real ou Ás-a-Ás reduz a profanação a +4 de Sede base e anula a cura.; F3: Lady profana o próximo Morto. Quando ele for tomado, ganha 14 de Sede e cura 130 HP, com bônus de Fúria; uma Canastra Real ou Ás-a-Ás reduz a profanação a +4 de Sede base e anula a cura. |
| Coágulo Carmesim | 2/3 | 3 | F2: Lady solidifica a própria Sede em uma barreira de 180 de proteção. Se a equipe romper o Coágulo, evita a cura; se ele sobreviver até o fim da rodada, metade da proteção restante vira cura.; F3: Lady solidifica a própria Sede em uma barreira de 260 de proteção. Se a equipe romper o Coágulo, evita a cura; se ele sobreviver até o fim da rodada, metade da proteção restante vira cura. |
| Portas do Castelo | 3 | 3 | O lixo fica bloqueado durante toda a rodada. Os cooperadores precisam sobreviver usando o monte. |
| As Três Filhas | 2/3 | 3 | Nesta rodada, todas as filhas vivas usam suas passivas. Cada falha ou reação custa +3 Sede. |
| Sangue Impuro | 1/2/3 | 3 | Nesta rodada, o primeiro Joker ou 2 usado como coringa por cada cooperador causa +3 Sede. 2 natural não conta. Máximo +6. |

#### Fontes de verdade e manutenção

- **Implementação:** `js/boss/bosses/*.js`, `js/boss/boss-balance.js`, motor e adaptadores por chefe.
- **Ajuda do jogador:** `js/boss/presentation/*.js` e UI, deve refletir o mesmo valor da regra.
- **Validação:** `tests/cooperative-balance-oct13.test.mjs` e demais testes de regressão.
- **Relatórios de simulação:** históricos, não devem ser reescritos com as regras novas.
- **Economia documental:** manter este arquivo como resumo canônico; conservar relatórios anteriores apenas como histórico datado e evitar copiar listas inteiras para README, handoff e checklist.

**Limites:** não foi executado novo balanceamento BOT×BOT ou teste com duas pessoas em Firebase nesta revisão.


---

<a id="arquivo-checklist-original-e-adendos-antes-consolidacao"></a>

## Origem: CHECKLIST_ORIGINAL_E_ADENDOS_ANTES_CONSOLIDACAO.md

### CHECKLIST-MESTRE — Playtest dos chefes (10/10/2026)

**Adendo implementado em 13/10/2026:** novo dano incremental 100/200/500/1000 e HPs2650/2800/2300/2400/2500/2000 (Banqueiro/Dominadora/Matriarca/Nehelenia/Nemesis/Lady), nerfs pontuais aprovados e compra do BOT sem tentativa de resgate do Cofre fechado. [Valores, testes e compatibilidade](#arquivo-balanceamento-seis-chefes-2026-10-13). Não reabre os P0/P1 já concluídos. Homologação humana do novo pacote permanece pendente; meta ~70% de vitórias dos chefes não foi aferida. Os valores de itens de 10/10 abaixo são históricos: o pacote vigente de12/10 mantém Explosivo100+15 e petrificações80/110/100/160/160, preservados neste lote.

**Ajuste final de 10/10/2026:** Explosivo/Granada causa **100 HP imediatos + 20 HP por rodada até a morte**, sem acumular sangramentos; petrificação −50 HP máximo, regen20/10 e Adaga80% preservados. Referências a impacto60 em experimentos abaixo são históricas, não valores atuais. Resultados anteriores não foram recalculados.

#### Resumo executivo do checklist — estado em 10/10/2026

Este é o único backlog de acompanhamento do playtest; handoff e relatórios apontam para ele. **Conclusão técnica e homologação humana são status separados.** Caixa P0 aberta não autoriza refazer a correção já entregue. Preserve os registros detalhados abaixo como rastreabilidade do checklist original e suas decisões posteriores.

##### Concluído tecnicamente

| Itens | Entrega | Evidência |
| --- | --- | --- |
| P0-01–P0-11 | Correções implementadas e testadas: handlers/itens, Frasco, Lixo, HUD, nomes, retrato Nehelenia, chips Fish Eye, Daniela, timer dos seis chefes, chip de item e nome visual | [Etapa 1](#arquivo-etapa-1-playtest-p0-2026-10-10); exceção: string anômala P0-07 não reproduzida |
| P1-02–P1-05 e P1-08 | Pacote B aplicado; impacto do Explosivo posteriormente aumentado a100; demais valores preservados | [Etapa 2](#arquivo-etapa-2-dimitrescu-2026-10-10), última suíte1.384/1.384 |
| P1-06/P1-07 — parte experimental | Comparação A/B, sensibilidade450 HP/Adaga60–100 e petrificação já analisadas em1.344 batalhas | Relatório e JSON da Etapa 2; não reaplicar450 ou repetir estudo como pendência automática |
| P2-01–P2-03 | Auditoria de variedade e dois designs da Lady entregues; designs não implementados | [Balanceamento](#arquivo-balanceamento-seis-chefes-2026-10-10) e [propostas](#arquivo-propostas-dimitrescu-2026-10-10) |
| P2-06–P2-14 | Especial comum aos seis chefes, cinco do Lixo, mínimo cinco,25/50/100 incremental, custo100 reutilizável, bloqueios/reações/undo/reload e comparação pareada | [Pacote consolidado](#arquivo-pacote-consolidado-chefes-2026-10-10) |
| P3-04 | Documentação local, inventário e relatórios atualizados; não inclui escrita no Google Doc remoto | [Guia dos documentos](../README.md) |
| Refinamentos posteriores | Espaçamento original da mão restaurado; textos em linhas; destaque focal de cartas; Espelho com folga temporária; gotas orgânicas; chip Adaga compacto | Etapas 1/2 e adendo do pacote consolidado |

##### Pendências reais de decisão/evidência/trabalho futuro

- **P0-07:** string “jarcado” não localizada. Precisa de captura/log/estado exato para identificar; ajuda e separação atual/persistente já foram corrigidas. Não inventar uma nova causa.
- **P2-02:** aprovar ou revisar Bifurcação Carmesim e Salão das Duas Sombras antes de qualquer implementação. A entrega dos designs está concluída.
- **P3-01:** revisão final de consistência/acessibilidade dos chips de todos os chefes, sem refazer refinamentos entregues ou aumentar a interface inteira automaticamente.
- **P3-02:** experimentos de habilidades futuras só depois de aprovação; não repetir auditoria de variedade já concluída nem inferir dificuldade humana pelo BOT.
- **P3-06:** aprovar apresentação final da barra e seis animações temáticas; depois implementar apenas o aprovado. Visual funcional/animatic provisório já existe. Este item deve ser lembrado antes do encerramento do projeto.
- Google Doc remoto histórico não sincronizado: trabalho documental externo separado, não bug de gameplay nem tarefa autorizada automaticamente por este resumo.

##### Depende apenas de homologação/playtest humano na implementação atual

- **P0-01–P0-11 / P3-05:** dois clientes Firebase autenticados, latência/reconexão, tablet físico, toque nos itens, cartas próximas, help, HUD, timeout ausente, undo/reload e morte. P0-07 tem também a pendência de evidência descrita acima.
- **P1-01 e aceite final P1-06/P1-07:** dificuldade pósB/impacto100, primeira/última filha, regen/sangramento, dano transmitido à Lady e Vínculo restante. Não aplicar outro nerf antes de novo pedido.
- **P2-04/P2-05/P3-03:** validar estagnação, acesso à carga100 e benefício do Especial após Mortos e Monte30–20. Métricas/traços e144 batalhas já existem; cobertura parcial de tempo humano, bloqueios e taxa humana não deve ser chamada de ausente nem de concluída. Coletar em partidas reais; se faltarem campos, especificar a lacuna antes de autorizar instrumentação adicional.
- Aceite visual/performance do Especial em hardware real e efeitos/bloqueios; não há homologação Firebase/tablet físico comprovada pelos fixtures.

**Última verificação registrada:**1.384 testes aprovados após Explosivo100; browser Lady1920/1376/390; `git diff --check` sem erros. As quatro resoluções da Etapa 1/pacote consolidado são evidência anterior, não uma nova rodada pós100. Resumo documental não executou novamente gameplay.

#### Decisão vigente — pacote consolidado e correção posterior do usuário

O Especial foi autorizado para implementação nos seis chefes. A correção feita durante a execução **substitui a origem Monte do pacote inicial**: retirar exatamente **5 cartas físicas do topo do Lixo**. Com 0–4 cartas, não ativar nem gastar pontos. Respeitar bloqueios do Lixo e disparar Daniela, Pólen, Ágio e Espelho. Compra normal separada; acumulador compartilhado25/50/100, gasto100, reutilização e excedente preservado, sem cooldown ou exigência de Mortos/fase/Monte baixo. BOT não gasta automaticamente; humano pode escolhê-lo como beneficiário.

O pacote B da Lady continua500 HP por filha, regen20/10, Adaga80%, impacto100 + hemorragia20 permanente sem stack. As propostas novas não foram implementadas. Relatórios atuais: `PACOTE_CONSOLIDADO_CHEFES_2026-10-10.md`, `BALANCEAMENTO_SEIS_CHEFES_2026-10-10.md` e `PROPOSTAS_DIMITRESCU_2026-10-10.md`. Registros das etapas anteriores abaixo são históricos: “não implementar Especial neste lote” vale para a etapa1, não para este pacote.

**Estado atual:** implementação e testes locais concluídos conforme o resumo; homologação humana separada. Base original: relatos de três partidas de dois humanos em tablet, quatro capturas e vídeo da Dimitrescu. Não confundir observado, verificado no código, simulado e homologado.

**Objetivo:** impedir perda de requisitos entre prompts enviados ao Codex. Corrigir primeiro bugs que impedem jogar, medir depois, e só então aplicar buffs, mecânicas novas e balanceamento global. Não fazer commit, push ou deploy automaticamente.

#### LEGENDA
- **[ ] P0 / AGORA — Correção funcional/UX confirmada ou prioritária.**
- **[ ] P1 / TESTAR — Balanceamento candidato ou redesign aprovado conceitualmente, números sujeitos a comparação.**
- **[ ] P2 / PROJETAR — Precisa fechar especificação antes de implementar.**
- **[ ] P3 / POSTERIOR — Polimento e expansão depois do núcleo validado.**
- Caixa marcada significa entrega técnica indicada no item; aceite humano precisa de evidência própria. P0 mantém suas caixas de aceite final abertas, mas suas correções técnicas não devem ser reabertas por isso.

#### I. P0 — BUGS E CORREÇÕES PARA AGORA

- [ ] **P0-01: Granada/Explosivo não responde ao toque/click no ícone em determinada carta da mão; Relíquia ao lado abre menu normalmente.** Evidência: vídeo anexado `Buraco – Firebase - Google Chrome 2026-10-10 09-54-04.mp4`, 15,15 s; Relíquia tem menu de filhas funcional por volta de 9 s. O vídeo apoia o contraste visual, mas não identifica sozinho a causa da Granada. Investigar sobreposição de camada/área clicável, `castleItemUseButton`, `createBossCombatHelp`, evento de seleção da carta e re-render, item metadata/`consumed`, `canUseCastleItem` e guarda `pickedDiscardCardId`, mão após compra, descartes legais, outros bloqueios, evento delegado, z-index, tanto mouse quanto toque. Reproduzir com item Explosivo em várias posições da mão e com Relíquia ao lado; examinar hits no DOM; reportar motivo quando inabilitado, nunca silêncio. Sem regressão de selecionar/baixar carta e aplicar item. Não presumir que efeito explosivo em si é inválido.
- [ ] **P0-02: Frasco de Frio em partida humana cooperativa às vezes deixa de ser utilizável.** Diferenciar restrição legítima (sem compra concluída, cartão comprado do Lixo, último descarte, bloqueios, estado do turno) de falha. Reproduzir com segundo jogador em outro turno, Frasco anterior em Cassandra, seleção/estado sincronizado, recarga e undo. Não obrigar descarte para destravar interação.
- [ ] **P0-03: Item descartado no Lixo perde símbolo/informação antes do consumo real.** Ícone e metadata devem permanecer na carta não consumida ao mudar mão→Lixo→mão de parceiro; só perder ao ser efetivamente usado em filha e, depois que a filha morre, retornar ao fundo do Lixo como carta consumida sem item utilizável. Conferir saves/undo/multiplayer e 108 IDs físicos.
- [ ] **P0-04: Layout da Dimitrescu em tablet.** Lady/HUD invade as filhas (especialmente Bela); itens comprimem barra PRÓXIMA FASE; corrigir geometria e hierarquia de blocos sem esconder informação. Screenshots de 1376×1032, variando fase e itens; também 1024×768, 390, 1920. Checar conteúdo real, zoom, landscape/portrait e overlays.
- [ ] **P0-05: Nome comprido do BOT/jogador no Nemesis invade o HUD.** Limitar largura nos pontos de S.T.A.R.S./chips lateral/HUD e truncar com nome completo disponível em ajuda, sem cortar cliques. Testar nomes longos 12/24/40 caracteres; 1024×768 e outros viewports.
- [ ] **P0-06: Nehelenia — remover rachaduras/espelho quebrado sobre o retrato principal.** O usuário nunca pediu overlay ali. Manter o indicador mecânico apenas na área dos espelhos. Auditar CSS `boss-nehelenia-dream-stolen` e pseudo-elementos; não mudar a habilidade.
- [ ] **P0-07: Fish Eye/Nehelenia — duas habilidades visíveis, texto estranho ('jarcado'/similar) e chips não clicáveis.** Investigar coexistência de `fish_marked_card`, `fish_inverted`, `nehelenia_fish_dead_card`, `nehelenia_inverted_reflection`, nomes, state transitions, reload; separar habilidade atual e efeito persistente; chips explicativos devem abrir popover por toque/teclado. Coexistência PODE ser legítima, rótulo quebrado e silêncio não. Encontrar string exata em logs/reprodução, não inventar.
- [ ] **P0-08: Daniela — Lixo não informa a passiva `LIXO +3`.** A passiva efetiva existe; conferir critério de overlay/destaque versus `danielaPassiveActive`; mostrar antecipadamente quando compra legal do Lixo disparará +3 Sede, retirar destaque após reação, inibir em morte/supressão. Não confundir com habilidades especiais nem aplicar sangue duas vezes. Preservar o funcionamento e as marcações corretas da Bela e da Cassandra; não causar regressão nessas duas passivas.
- [ ] **P0-09: Desativar tempo individual de turno e autoplay por timeout SOMENTE no modo Chefe (todos os seis).** Preservar duração total da partida e limites dos modos não-Chefe. Verificar servidor/local, timer ao relogar, pausa, turnos humanos/BOT e sincronização. Não só ocultar contador; desativar punição/autoação por vencimento. Manter recuperação de BOT travado distinta do cronômetro.
- [ ] **P0-10: HUD/chip informativo NO ITEM DA MÃO sem impedir o uso normal da carta.** Preservar rank, naipe, ilustração e área principal clicável da carta: tocar na carta continua selecionando/baixando/descartando normalmente; tocar no ícone/chip do item abre sua explicação e o fluxo de uso/sacrifício, com área de toque própria e sem propagação indevida. O rótulo compacto, preferencialmente retangular, deve mostrar de imediato o efeito e, se couber sem poluir, o valor de dano/petrificação (exemplos `−100 DANO · SANGRA`, `−100 HP MÁX · FRIO`, `−75 HP MÁX · REGEN ↓`, `VÍNCULO 80%`, `SILENCIA`). Não colocar chip por cima do número/naipe ou bloquear a superfície para clicar na carta. Se o espaço for insuficiente, resumir no chip e detalhar no popover acessível: HP máximo removido, dano imediato, buff/debuff, duração, alvo, condição de uso e se está consumido. Testar cartas com itens lado a lado, sobreposição de mãos no tablet, tap/click longo, zoom, dois humanos e uso/descarte normal.
- [ ] **P0-11: Renomear visualmente `Frasco de Frio` para `Frasco Congelante`.** Conservar ID `cold_flask`, PNG interno e compatibilidade de saves. Atualizar tooltip/chips/ajuda/documentação.

**Testes de aceite P0:** navegador real com viewport 1024×768, 1376×1032, 1920×1080 e 390; sessão com dois jogadores humanos, cartas com vários tipos de item em posições intercaladas, clicks/toques, alvos mortos/vivos, relogin/undo, mão/Lixo/Morto; screenshot antes/depois; suíte ampla. Registrar causa para cada falha; não marcar [x] apenas porque teste unitário passou.

##### Registro da execução da etapa 1 — 10/10/2026

Referência: [relatório técnico, testes e evidências](#arquivo-etapa-1-playtest-p0-2026-10-10).

| Item | Resultado técnico deste lote | Pendência para fechar a caixa |
| --- | --- | --- |
| P0-01 | Reproduzido em HEAD e corrigido: atualização da face removia o handler do item. Mouse/toque e várias posições cobertos. | Homologação humana no Firebase. |
| P0-02 | Reaplicação pelo parceiro passa; impedimentos legítimos têm explicação. Não há trava nova do Frasco. | Confirmar o caso original na partida humana. |
| P0-03 | Ícone no Lixo corrigido; metadata/108 IDs, consumo e retorno após morte verificados. | Homologação humana. |
| P0-04 | HUD e próxima fase contidos; filhas sem sobreposição, quatro resoluções e fases diferentes. | Homologação no tablet real. |
| P0-05 | Nomes de 12/24/40 caracteres contidos; nome completo na ajuda. | Homologação humana. |
| P0-06 | Overlay removido do retrato; indicadores mecânicos preservados. | Revisão visual do usuário. |
| P0-07 | Atual e persistentes separados; chips abrem ajuda por toque/teclado. | Texto “jarcado” não localizado/reproduzido; falta evidência exata. Homologação humana. |
| P0-08 | LIXO +3 ligado à passiva real; sai após reação/morte/supressão. Cobrança única testada. | Homologação humana. |
| P0-09 | Sem timeout humano nos seis chefes; duração total, outros modos e watchdog de BOT preservados. | Homologação após relogar em dois clientes Firebase. |
| P0-10 | Efeito curto no item, clique independente da carta; toque/naipe/ordenação e itens próximos verificados. | Homologação no tablet real. |
| P0-11 | Nome visual Frasco Congelante; `cold_flask` e asset preservados. | Revisão do usuário. |

As caixas P0 continuam abertas conforme a legenda: testes automatizados e dois clientes com snapshots simulados **não substituem** revisão do usuário nem uma sessão Firebase real. Nenhum item parcial foi marcado como concluído.

**Especial na etapa1 histórica:** P2-07/P2-08 registravam somente a decisão, ainda sem implementação naquele lote. O pacote consolidado posterior autoriza a implementação especificada acima. P3-06 continua pendente de aprovação do visual definitivo e das animações heroicas.

#### II. P1 — REDESIGN/BALANCEAMENTO DA LADY (APÓS BUGS CRÍTICOS)

##### Relato do playtest
- [ ] **P1-01: Resistência da Lady e filhas excessiva no jogo humano.** Usuários tiveram dificuldade em matar a última filha Daniela; Lady quase intacta (menos de ~40 dano relatado), Vínculo/escudo praticamente não rompido. Problema sistêmico: 3 filhas × 500 HP, até 50 regeneração por rodada, pouca vantagem duradoura dos itens, mais dificuldade de montar canastras quando os Mortos acabam. Medir tempo/dano total por rota.
- [x] **P1-02: Explosivo/Granada permanente aplicado após aprovação.** 100 dano imediato + 20 HP de hemorragia por rodada até a morte. Um único sangramento; reaplicação causa outro impacto, sem somar ticks ou disparar tick extra na mesma rodada. Testes cobrem oito rodadas, replay, morte e interação com regen20/10/Frio.
- [x] **P1-03: Regeneração final aplicada — pacote B.** 50→20 HP por rodada; Anticoagulante 25→10 permanente, sem reduzir além disso por duplicatas. Filhas não selecionadas continuam regenerando. HP500 e petrificação preservados.
- [x] **P1-04: Adaga final aplicada — 80%.** Transmite 80% do dano efetivo de ataques à filha diretamente ao HP da Lady, sem consumir PROT./Coágulo. Não soma percentual por duplicatas, transmite overkill, itens ou hemorragia. Cobertura humano/BOT/Ataque Final, morte da Lady e replay.
- [x] **P1-05: Frasco Congelante/Relíquia preservados e testados com B.** Frasco bloqueia até duas regenerações efetivas, guardando carga na vida cheia; esgotadas as cargas, regen volta a20/10. Relíquia suspende uma oportunidade válida atual/próxima, sem silenciamento eterno.
- [x] **P1-06: Análise de petrificação e HP máximo concluída tecnicamente.** Sensibilidade500/450 e piso analisados na Etapa 2; mantidos500 HP e perdas25/50/75/100/100. Aceite da dificuldade depende de humanos; **não implementar450 automaticamente**.
- [x] **P1-07: Experimento A/B e sensibilidades entregues.**1.344 batalhas,64 sementes,7 configurações e3 rotas; métricas e limitações na Etapa 2. Impacto60 desse lote é histórico, anterior ao buff100. Não confundir simulação com win rate humano; não repetir o estudo como tarefa ainda não executada.
- [x] **P1-08: Pacote B aprovado pelo usuário e aplicado localmente.** 500 HP; regen20/10; Adaga80%; impacto100 + sangramento20 permanente, sem stack. Saves v2 atualizados uma vez; legado v1 preservado. Documentação, ajuda/chips, animações e regressões atualizadas. Sem commit/push/deploy. P1-01 continua pendente de novo playtest humano: implementação aprovada não prova dificuldade final.

##### Registro da etapa 2 — comparação histórica e aplicação aprovada

Referência: [relatório comparativo e polimento solicitado](#arquivo-etapa-2-dimitrescu-2026-10-10) e [dados agregados](../experiments/dimitrescu-stage2-2026-10-10.json).

Executadas 1.344 batalhas com 64 sementes pareadas, sete configurações e três rotas. Baseline50/25/Adaga30/sangramento50×2; A25/10/Adaga80/sangramento20 permanente experimental; B20/10/Adaga80/sangramento20 permanente experimental; HP450 e Adaga60/100 medidos separadamente. Petrificação preservada e diferenças percentuais de HP450 documentadas. Reaplicação proposta: uma hemorragia20, sem stack e sem tick adicional na mesma rodada.

As políticas automáticas facilitaram a primeira morte, mas não demonstraram vitória consistente; **não são win rate humano nem resultado do BOT de produção**. Após esse relatório, o usuário aprovou explicitamente a aplicação de B: configuração final implementada nos números acima. Novo playtest humano continua necessário para avaliar a dificuldade, sem impedir o patch autorizado. P0 preservado, com remoção expressamente solicitada do espaçamento extra entre cartas; ajustes de espelho, texto em linhas e contraste registrados no relatório. O Especial ainda não existia nessa etapa2; o pacote posterior é descrito no topo.

#### III. P2 — VARIEDADE DOS CHEFES

- [x] **P2-01: Auditoria técnica de distribuição/elegibilidade por fase:** catálogos Dominadora13, Nemesis11, Nehelenia11, Matriarca10, Banqueiro8, Lady8; 144 batalhas,17.280 sorteios condicionais e4.320 sequenciais no relatório `BALANCEAMENTO_SEIS_CHEFES_2026-10-10.md`. Não representa frequência humana.
- [x] **P2-02: Duas propostas completas para Lady:** `Bifurcação Carmesim` e `Salão das Duas Sombras`, em `PROPOSTAS_DIMITRESCU_2026-10-10.md`. Tema, fases/pesos candidatos, elegibilidade, sucesso/parcial/falha, interações, HUD/help, animação e testes especificados. **Aprovação e implementação ainda pendentes**, não adicionadas à rotação.
- [x] **P2-03: Avaliação técnica de variedade dos demais chefes:** relatório por fase e habilidade; Banqueiro não foi artificialmente elevado a13. Nenhum peso/elegibilidade mudou. Validar incômodo com repetição em playtest humano antes de expansão.

#### IV. P2 — ESTAGNAÇÃO DE FINAL DE PARTIDA, TODOS OS CHEFES

##### Evidência humana
- [ ] **P2-04: Investigar “partida trava”** por volta de 30–20 cartas no Monte, especialmente depois de ambos os Mortos serem retirados: mãos pequenas, extensões impossíveis, Lixo protegido e turnos de comprar/descartar sem dano. Relatado em ~3 partidas cooperativas; precisa de logs medidos, não pressupor percentuais.
- [ ] **P2-05: Instrumentar métricas**: número de turnos sem baixar carta, sem dano, média/tamanho de mão, Monte e Lixo por rodada, Mortos consumidos, fontes dos descartes, quantas vezes pickup integral do Lixo foi ilegal, restrições ativas, causas de derrota, tempo, WinRate por chefe e por política, eventos de canastra/dano.
- [x] **P2-06: Decisão universal fechada pelo usuário:** Especial reutilizável de5 cartas do topo do Lixo, não outras regras de recuperação. Não dividir automaticamente Lixo entre jogadores nem alterar a compra normal.

#### V. P2 — ESPECIAL COOPERATIVO UNIVERSAL — especificação vigente

**Intenção confirmada e implementada localmente:** recuperação voluntária de5 cartas do Lixo nos seis chefes. Arte heroica final permanece em proposta; não há imagens externas novas.

- [x] **P2-07:** acumulador compartilhado, beneficiário escolhido entre os cooperadores, inclusive BOT por escolha humana.
- [x] **P2-08:**25/50/100 por ID canônico, diferença25/50/75 nas evoluções, sem teto de saldo;200 permite duas ativações.
- [x] **P2-09:** sem janela de fase, Mortos, Monte baixo ou mão pequena. Respeitar pausa, ação em andamento e bloqueios do Lixo.
- [x] **P2-10:** exatamente5 do topo do Lixo;0–4 não ativa. Não mexer no Monte. Itens e IDs preservados. Efeitos de retirada existentes continuam. O Especial não exige encaixar imediatamente o topo como uma compra normal; a regra normal de Lixo protegido permanece intacta fora dessa recuperação especial.
- [x] **P2-11:** reutilizável,100 por uso, excedente preservado; transação com revisão, deduplicação, reload e undo. Uma solicitação concorrente da mesma revisão vence; a outra não gasta. Homologação Firebase real ainda pendente.
- [x] **P2-12:** visual funcional ao lado do X nos controles do jogador, fora do HUD do chefe,100px (92 no celular),16px visuais e28px de toque, ajuda curta e escolha. Aprovação visual definitiva no P3-06.
- [x] **P2-13:** comparação pareada concluída:144 batalhas (12 pares/chefe), traços completos, janela30–20 e limites da cobertura registrados. Browser nas quatro dimensões;20 ciclos de animatic/viewport, até5 nós, zero resíduos. **Não demonstra resolver o travamento humano**; homologação física/Firebase continua pendente.
- [x] **P2-14:** uma implementação comum aos seis chefes, sem automatizar gasto pelo BOT de produção.

#### VI. P3 — POSTERIORES / NÃO ESQUECER
- [ ] **P3-01:** Refinar visual de chips, hit targets e tooltips de todos os chefes conforme padrão consistente e suporte a toque/teclado (não só Dimitrescu e Fish Eye).
- [ ] **P3-02:** A/B de habilidades futuras em pelo menos 100–200 seeds por chefe/política, separando BOT e humanos; não declarar win rate humano por simulador guloso.
- [ ] **P3-03:** Playtest longo com dois humanos em tablet, registrar vídeo/log da rodada após os Mortos e validar se o especial reduz estagnação sem tornar desafios triviais.
- [x] **P3-04:** inventário oficial, documentação funcional, checklist de regressão e relatório local de balanceamento dos seis chefes atualizados para a implementação real. Cachev299 foi usado no pacote original; cache local atualv301; histórico de migração e lotes anteriores preservado. O ponteiro `.gdoc` não foi editado remotamente.
- [ ] **P3-05:** Inspeção final desktop/tablet/celular e sessão multiplayer real (Firebase) para cada bug P0.
- [ ] **P3-06 — ÚLTIMO ITEM DO CHECKLIST / LEMBRAR AO ENCERRAR:** após corrigir bugs, homologar balanceamento e implementar/testar o Especial Cooperativo, voltar para aprovar **a apresentação final da barrinha de poder** (pequena e discreta; botão/ícone integrado, arte/animação definitiva a decidir; posição ao lado do X já aprovada e aplicada) e **a animação temática de ativação para cada um dos seis chefes**. Não criar barra grande nem deixar a animação atrapalhar a partida. Incluir avaliação de acessibilidade, reduced motion, tablets e performance. **Trazer este item explicitamente à conversa antes de considerar o projeto encerrado.**

#### VII. REGISTRO DAS DECISÕES
**Fechadas conceitualmente:** remover limite por turno (modo Chefe); renomear Frasco Congelante; preservar ícone de item descartado; eliminar overlay quebrado do retrato da Nehelenia; tornar chips Fish Eye interativos; corrigir Daniela Lixo; preservar a informação dos itens; buscar Explosivo permanente com hemorragia menor; investigar/implementar ferramenta de recuperação GLOBAL (se especificação aprovada); não mudar automaticamente o balanceamento dos seis chefes.

**Balanceamento fechado/aplicado:** HP500, regen20/10, Adaga80%, Explosivo100 + hemorragia20 permanente sem stack. **Especial fechado:**5 do topo do Lixo, mínimo5, bloqueios/reações respeitados,25/50/100 compartilhados, usos reutilizáveis a100. **Aguardando aprovação:** duas habilidades novas e apresentação heroica definitiva, não os números atuais do Especial.

#### VIII. ORDEM PRÁTICA DE EXECUÇÃO
1. Homologar as correções já entregues em dois clientes Firebase/tablets; não repetir implementação P0.
2. Coletar evidência exata da string anômala Fish Eye se reaparecer.
3. Playtest humano da Lady pós100 e do ritmo/acesso ao Especial; sem novo balanceamento automático.
4. Aprovar designs futuros/P3-06; implementar somente mediante novo pedido. Não repetir A/B ou auditoria de variedade concluídos.

**Arquivos auditados:** `app.js` (`castleItemUseButton`), `js/boss/boss-engine.js` (`canUseCastleItem`), `js/boss/dimitrescu-castle.js` (`CASTLE_BALANCE`, `regenerateDaughters`, `sacrificeCastleItem`), `js/boss/bosses/dimitrescu.js`, `styles/boss/dimitrescu.css`. Reprodução do vídeo por si só não prova a causa da Granada. **Nota histórica da elaboração inicial:** naquele momento ainda não havia implementação. As entregas posteriores estão registradas no resumo e nos relatórios; não usar esta nota para reabrir P0.


#### ADENDO DE DECISÃO — 10/10/2026 — ESPECIAL COOPERATIVO

**CONFIRMADO PELO USUÁRIO:** opção B (conquista progressiva), barra **COMPARTILHADA** para os seis chefes e pontuação por canastra: **Limpa +25, Real +50, Ás-a-Ás +100**. Uma Ás-a-Ás enche a barra imediatamente; também vale qualquer combinação que some 100. Mesmo jogo pontua somente a diferença ao evoluir, nunca duas vezes o valor total. Contar IDs físicos e tiers creditados, persistir e deduplicar em saves/undo/sync. Sem relação com a pontuação comum da partida.

**PROPOSTA HISTÓRICA SUPERADA:** desbloqueio pós-Mortos/Monte≤30 e um uso por partida foram rejeitados pelo pacote consolidado. A origem Monte desse pacote também foi corrigida pelo usuário: vale Lixo, mínimo5 e reações respeitadas, conforme seção vigente acima.

**PRIMEIRO LOTE AO CODEX — registro histórico, já executado:** somente bugs P0 com testes de interação em dois jogadores/tablet, inclusive Granada que não responde, Frasco Congelante, ícone do item no Lixo, chip informativo sem bloquear uso da carta, HUDs, Daniela/Fish Eye/Nehelenia e timer individual em modo Chefe. Não mudar HP/regen/adaga/sangramento, novas habilidades ou implementar Especial neste lote. O Especial fica especificado/documentado para fase posterior.


**LEMBRETE DE FECHAMENTO (adicionado em 10/10/2026):** a barra de carga aprovada é de 100 pontos (Limpa 25, Real 50, Ás-a-Ás 100), mas o visual final será escolhido apenas depois do Especial funcionar. O resultado deve ser compacto, integrado ao HUD, sem bloquear nem competir visualmente. Ao finalizar os trabalhos, revisar o P3-06 para fechar botão, orientação, posição e animações por chefe.


---

<a id="arquivo-handoff-antes-consolidacao"></a>

## Origem: HANDOFF_ANTES_CONSOLIDACAO.md

### Handoff de desenvolvimento — Buraco

Atualizado em 13/10/2026, após o pacote aprovado dos seis chefes. Contexto de retomada, não especificação paralela nem autorização para iniciar tarefas.

**Estado vigente:** bônus100/200/500/1000; HP Banqueiro2650, Dominadora2800, Matriarca2300, Nehelenia2400, Nemesis2500, Lady2000. Nerfs pontuais e Cofre/BOT aplicados; ledger de saves migra sem dano retroativo e cobranças já anunciadas são conservadas. [Relatório, testes e limitações](#arquivo-balanceamento-seis-chefes-2026-10-13). Sem nova calibração massiva ou medida de70% contra humanos. Não reabrir P0/P1 nem alterar Especial ou mídia. Pacote de itens12/10 permanece vigente.

#### Fonte de verdade e leitura

O workspace local `D:/Sistemas DEV/Buraco` é a fonte executável. Não substituir arquivos pelo Drive/GitHub nem assumir que cópias remotas estão sincronizadas. Preservar alterações/staging do usuário; sem commit, push ou deploy automático.

Este handoff substitui, para retomada atual, os blocos de estado/prioridades do arquivo enviado `HANDOFF_BURACO_ATUALIZADO_2026-10-10.md`. O original de Downloads foi preservado: seus capítulos antigos são memória histórica, não backlog ativo. Não retomar automaticamente bugs, refactors ou números antigos só porque aparecem nele.

| Pergunta | Documento responsável |
| --- | --- |
| Como o modo deve funcionar? | [Documentação funcional](../DOCUMENTACAO_CHEFE_DA_MESA.md) |
| Quais habilidades existem hoje? | [Inventário](../INVENTARIO_HABILIDADES_CHEFES.md) |
| O que terminou e o que falta? | [Resumo e checklist-mestre](../CHECKLIST_PLAYTEST_CHEFES_2026-10-10_ATUALIZADO.md#resumo-executivo-do-checklist--estado-em-10102026) |
| Qual foi a causa de cada P0? | [Etapa 1](#arquivo-etapa-1-playtest-p0-2026-10-10) |
| Qual pacote da Lady foi aplicado e quais comparações foram feitas? | [Etapa 2](#arquivo-etapa-2-dimitrescu-2026-10-10) |
| Como foi integrado o Especial? | [Pacote consolidado](#arquivo-pacote-consolidado-chefes-2026-10-10) |
| Quais são os dados e limites das simulações? | [Balanceamento dos seis chefes](#arquivo-balanceamento-seis-chefes-2026-10-10) |
| Quais designs ainda precisam de aprovação? | [Propostas da Lady](#arquivo-propostas-dimitrescu-2026-10-10) e P3-06 do checklist |
| O que não pode regredir? | [Checklist permanente](../CHECKLIST_REGRESSOES_E_ATUALIZACOES.md) |

#### Decisões encerradas — não perguntar nem implementar novamente

- Explosivo/Granada: **100 de impacto +15 de sangramento por rodada até morrer**, sem acumular. Petrificações aditivas: Adaga80, Explosivo110, Anticoagulante100, Frasco160 e Relíquia160. Frasco congela globalmente as três por duas oportunidades dos cooperadores, incluindo a atual; reaplicar renova para duas. Relíquia dá+20% de dano recebido de ataques diretos, permanente/sem stack; não silencia nem amplia itens/hemorragia. Ordem Relíquia→clamp→Adaga80%. [Pacote vigente de12/10](#arquivo-pacote-cooperativo-e-bot-itens-2026-10-12).
- Lady2000 HP; filhas500 cada, piso recuperável130; regen20/Anti10; Adaga80% do dano efetivo de ataques à filha diretamente na vida da Lady. Não aplicar450 HP ou Adaga100% por conta própria.
- Vínculo consumível:500 PROT. sustentados por filha viva,1500 iniciais; Coágulo→PROT.→HP. Morte remove até500 da proteção restante. Adaga conserva sua exceção de atravessar proteção. Sede/Fúria e outros itens não mudaram no último patch.
- Saves v2 recebem `castleItemEffectsVersion:1`: convertem hemorragia ativa para15, Relíquias anexadas em bônus20% e Frio ainda ativo em duas oportunidades globais. Sem replay de impacto/petrificação/cura/tick; HP, consumo, anexos e PROT. preservados. Compatibilidade v1 permanece distinta.
- Especial dos seis chefes: **exatamente cinco cartas do topo do Lixo**, mínimo cinco, bloqueios e reações respeitados. Lixo versus Monte já foi decidido explicitamente pelo usuário; não há divergência aberta.
- Carga compartilhada25/50/100 por canastra; somente diferença ao evoluir o mesmo jogo físico; custo100 por uso, excedente e reutilização preservados. Compra normal separada. Humano escolhe beneficiário, inclusive BOT; BOT não gasta automaticamente.
- Posição do Especial aprovada e aplicada: ao lado do X, na área de ações do jogador, não no HUD do chefe. Mantida barra compacta100 px/92 no celular e ajuda. P3-06 ainda trata da arte/animação temática definitiva, não de escolher novamente essa posição.
- Chips compactos: enfatizar somente valor+naipe quando houver carta; não ampliar caixa, espaçamento da mão ou PNG do Espelho. Chip da Adaga corrigido com `top:auto`, cerca de75×14 px nos três viewports testados; ajuda preservada.
- Devorador: três cartas novas baixadas pela equipe consomem três créditos e curam20/35/35/50 conforme normal/Mutado/Horda/ambos. Sem limite por turno, jogada ou cooldown; restos persistem entre jogadores/turnos. Não tocar no BOT dos modos normais por trabalhos do modo Chefe.

#### Evidências disponíveis, sem extrapolar

- Última suíte do lote final de itens: **1.401 testes aprovados, zero falhas**; `.cache/dimitrescu-final-unit.log`, incluindo17 testes novos de congelamento/Relíquia/combos/persistência.
- Browser da Lady:1920/1376/390 px, gelo, ajuda100+15 e DANO+20%, mouse/toque/teclado/movimento reduzido; `.cache/dimitrescu-final-browser.log`. Fixture de dois clientes cobre1024×768,1376×1032,1920×1080 e390 px; valida rótulos/controles e gelo global. Ver relatório do lote para logs/evidências. Não representa tablet físico ou Firebase autenticado.
- Pacote anterior: 1.380 testes e browser em 1024×768, 1376×1032, 1920×1080 e 390 px, dois clientes simulados/CAS. Esse resultado histórico é distinto da nova repetição dos quatro tamanhos no lote final; consultar o relatório novo para evidência da versão atual.
- Etapa 2:1.344 batalhas históricas,64 sementes×7 configurações×3 rotas. Pacote consolidado:144 batalhas pareadas e auditoria de variedade. Esses dados são anteriores ao impacto100; não estimam win rate humano da versão final.
- No estudo do Especial houve12 ativações/60 cartas, ganho pequeno de ritmo e nenhuma melhora agregada de vitórias. Implementação concluída não comprova resolver a estagnação humana.
- `.cache` contém evidências locais ignoradas pelo Git. Relatórios e JSON preservam rastreabilidade, não devem ser editados para simular uma nova medição.

#### Retomada permitida somente conforme novo pedido

Consultar o checklist para o status detalhado. As próximas frentes reais são homologação de dois humanos/Firebase/tablets e dificuldade/ritmo pós100; evidência exata da string anômala do Fish Eye; aprovação das duas propostas da Lady; aprovação e implementação futura do visual/animações finais P3-06. Instrumentação histórica já existe; só complementar lacunas se autorizado, sem repetir auditorias concluídas.

O Google Doc remoto de balanceamento não foi atualizado nesta revisão local. O `.gdoc` é ponteiro, não documento editável local. Não tratar sua cópia histórica como regra atual nem fazer escrita remota automaticamente.

#### Revisão documental desta sessão

Somente Markdown local foi organizado. Nenhum código, mecânica, layout, teste, staging ou estado remoto alterado. Não houve novos testes de gameplay nesta revisão; os números acima vêm dos logs anteriores conferidos. Sem commit/push/deploy.


---

<a id="arquivo-contexto-documentacao-antes-consolidacao"></a>

## Origem: CONTEXTO_DOCUMENTACAO_ANTES_CONSOLIDACAO.md

### DOCUMENTAÇÃO — CHEFE DA MESA

Regras vigentes neste documento; status, pendências e homologação no [checklist-mestre](../CHECKLIST_PLAYTEST_CHEFES_2026-10-10_ATUALIZADO.md#resumo-executivo-do-checklist--estado-em-10102026); contexto no [handoff](../HANDOFF_DESENVOLVIMENTO_BURACO.md). Origem Lixo do Especial e impacto100 do Explosivo já estão aplicados, sem decisão pendente.

**Balanceamento vigente — 13/10/2026:** canastras Suja100/Limpa200/Real500/Ás-a-Ás1000; HP Banqueiro2650, Dominadora2800, Matriarca2300, Lady2000, Nehelenia2400, Nemesis2500. Penalidades pontuais de Nehelenia/Banqueiro/Dominadora atualizadas abaixo. [Relatório de aplicação e compatibilidade](#arquivo-balanceamento-seis-chefes-2026-10-13). A meta futura de aproximadamente 70% de vitórias dos chefes contra dupla humana competente não é resultado medido. Notas datadas de pacotes anteriores são históricas.

#### Itens da Dimitrescu — registro histórico do lote de 10/10/2026

As petrificações deste registro foram substituídas pelo pacote de12/10: Adaga80, Explosivo110, Anticoagulante100, Frasco160, Relíquia160 e piso130. A seção7 e o [pacote vigente](#arquivo-pacote-cooperativo-e-bot-itens-2026-10-12) têm precedência. O lote13/10 não mudou esses itens.

Explosivo: 100 HP imediatos + 15 HP de sangramento por rodada até morrer, sem acumular; petrificação −50 HP máximo. Relíquia: petrifica100 e aumenta em20% somente ataques diretos, até a filha morrer. Frasco: petrifica100 somente no alvo e congela as três filhas por duas oportunidades consecutivas dos cooperadores, contando a atual. Reaplicar renova para duas, sem somar durações. Regen20/Anti10, Adaga80%, Lady/PROT./Sede/Fúria e demais itens preservados. Contrato detalhado na seção7 e [relatório deste lote](#arquivo-lote-final-itens-dimitrescu-2026-10-10).

#### Especial cooperativo vigente — 10/10/2026

Implementação local compartilhada pelos seis chefes. A correção posterior do usuário substitui a origem “Monte” do brief consolidado: **exatamente cinco cartas físicas do topo do Lixo**. Com zero a quatro cartas, não ativa nem gasta pontos. O Monte não é usado.

A equipe ganha 25 por Limpa, 50 por Real e 100 por Ás-a-Ás. Um jogo físico pontua somente a categoria máxima que alcançou; evolução acrescenta apenas a diferença de 25/50/75. O saldo não tem teto: cada ativação gasta 100, guarda excedente e permite recarregar e usar novamente. Não exige fase, Mortos, Monte baixo ou mão pequena.

Um humano escolhe qual cooperador recebe as cartas, inclusive o BOT. O BOT não gasta automaticamente. A compra normal continua separada. O Especial não cria obrigação nova de jogar imediatamente o topo; objetivos e restrições já existentes continuam valendo. A cotação/uso obrigatório da compra normal e o Lixo protegido não foram alterados fora do Especial.

**Bloqueios e reações:** validar o usuário e o beneficiário contra os bloqueios canônicos de retirada. Daniela cobra sua primeira retirada efetiva uma única vez; Pólen reage se a carta contaminada estiver entre as cinco, mesmo enterrada; Ágio cobra a primeira retirada da rodada; Espelho acompanha as cartas físicas e suas consequências existentes. Itens permanecem nas cartas até seu uso real. Não consome financiamento nem dispara Agarrador como se fosse a compra normal; esses continuam ligados à compra normal do turno.

**Persistência:** ledger por ID canônico do jogo, migration de categorias já conquistadas uma vez em saves antigos, IDs de ação resolvida e revisão autoritativa. Especial e commits comuns do modo Chefe comparam a revisão: dois pedidos da mesma revisão não podem gastar a mesma carga, e um escritor atrasado não pode apagar cartas recebidas. Rejeição não gasta nada. Undo restaura cartas, saldo e efeitos juntos; a gravação da restauração usa a revisão vigente, não volta a revisão para trás. Se uma reação encerrar a partida, resultado e histórico são gravados na mesma transação.

**Apresentação:** barra funcional compacta ao lado do X, nos controles do jogador, fora do HUD/retrato do chefe; ajuda e escolha de destinatário, toque/teclado e movimento reduzido. Animatic provisório de cinco silhuetas do Lixo à mão, sem bloquear jogadas enquanto o navegador o anima. Arte heroica definitiva depende de aprovação no P3-06. Testes transacionais usam um substituto de armazenamento; **Firebase real e tablets físicos ainda precisam de homologação**.

Relatórios: [pacote consolidado](#arquivo-pacote-consolidado-chefes-2026-10-10), [comparação e variedade](#arquivo-balanceamento-seis-chefes-2026-10-10). As notas anteriores permanecem como histórico dos respectivos lotes.

**Etapa 1 do playtest — 10/10/2026:** nos seis chefes, jogadores humanos não têm limite individual de turno, autoplay ou punição por timeout. O tempo total da partida continua contando. A recuperação de BOT travado usa um watchdog separado, somente no cliente anfitrião, respeitando pausa, escolhas pendentes e sessão atual; os cronômetros dos demais modos permanecem. Itens da mão conservam seus cliques após atualização da carta, explicam impedimentos de uso e mantêm símbolo no Lixo até o consumo real. Relatório e limites da validação: `ETAPA_1_PLAYTEST_P0_2026-10-10.md`. Balanceamento e Especial Cooperativo não foram implementados neste lote.

**Auditoria de elegibilidade — 09/10/2026:** uma habilidade pode aparecer mesmo sem solução na mão dos jogadores. Falha mantém a consequência existente. Nemesis remove provas completas de Caçada/Extermínio/Invasão e provas conjuntas de Barragem; cartas marcadas continuam exigindo saída individual legal. Prisão/Laço da Nehelenia preservam jogos reais extensíveis, não solução antecipada. Bloqueios, fases, recursos e lifecycle continuam protegidos. Sorteio evita a última habilidade somente havendo outra elegível. Nenhum peso, HP, valor de recurso ou política estratégica do BOT mudou. Relatório: `AUDITORIA_ELEGIBILIDADE_CHEFES_2026-10-09.md`.

**Polimento visual de 08/10/2026:** Enxerto mostra jogos alimentados numa barra0–2 com as três faixas de consequência, sem lista textual compactada. As cinco Flores usam a PNG `matriarch-lotus.png`, fosca quando apagada e com cor original quando ativa. PASSIVA e ADAGA permanecem consultáveis e refletem os valores da partida. Esse polimento não alterou balanceamento; os números foram posteriormente atualizados pelo pacote B abaixo.

**Pacote B aplicado e atualizado pelo lote final de itens:** filhas500, regen20/Anti10, Adaga80%; Explosivo100+15 permanente; Relíquia+20% de ataque; Frasco global por dois turnos dos cooperadores. Lady/PROT., Sede, Fúria e petrificação preservados. Referências de carta nos chips mantêm ênfase apenas no valor+naipe. Implementação local, sem publicação. As medições anteriores na `ETAPA_2_DIMITRESCU_2026-10-10.md` são históricas; este lote não recalculou taxa de vitória.


#### Status da documentação


**Revisada contra o workspace local atual — 08/10/2026, incluindo itens v2/filhas 500/piso 300 da Dimitrescu e preservando objetivos distintos do Nemesis, Enxerto parcial e ajuda/regeneração visual anteriores. Calibração de 65%–75% ainda não validada; comparações e limitações em `REWORK_ITENS_DIMITRESCU_2026-10-08.md` e `REWORK_NEMESIS_MATRIARCA_E_UX_DIMITRESCU_2026-10-08.md`.**

##### Compatibilidade de estados — 07/10/2026

- Nehelenia: REFLEXO MORTO impede jogar, mas permite descartar. A seleção de illusion lock exclui essas cartas; saves sobrepostos removem somente esse lock conflitante. Espelho do Lixo usa o bloqueio canônico; objetivo legado incompatível é encerrado sem punição e sem escolha pendente.
- Matriarca: Pólen acompanha o `discardCardId` real. No topo, marca a carta; enterrado, mostra apenas “PÓLEN NA PILHA”. Retirar só um topo normal não ativa a punição; adquirir a carta contaminada continua ativando a regra existente.
- Nemesis (atualizado em 09/10/2026): `devourerFeed` v2 guarda IDs únicos e progresso parcial da equipe. Não existe limite por turno: cada grupo de 3 cartas novas cura 20/35 HP, Reforçado +15, limitado apenas à vida máxima. 12 cartas dão 4 curas imediatas; só 0–2 créditos atravessam turnos. `devourerHealSequence` garante eventos distintos persistidos, sem duplicação por reload/sync. Fim de turno não gera cura. Morte/reanimação zeram progresso; feed v1 mantém resto módulo 3 e IDs, descarta grupos completos antigos sem curar no load. Sem feed, registra a mesa antiga e começa em zero. Undo restaura contador/IDs/sequência juntos. A entrada da Invasão continua sendo outra regra.

**Regra permanente de objetivos:** cumprir uma habilidade nunca reduz Dívida, Dominação, Flores, Sede, Mundo do Espelho ou Infecção. O sucesso evita sua punição; a falha mantém a punição aprovada. Sucessos parciais não descontam falhas de outros objetivos. Canastras continuam concedendo todo o alívio aprovado. Gastos do próprio chefe por cura/renascimento são outra categoria e permanecem. Custos positivos de escolhas/obediência não foram rebalanceados nesta revisão. Auditoria detalhada: `REVISAO_OBJETIVOS_CHEFES.md`.


Esta documentação reúne o funcionamento geral do modo **Chefe da Mesa** e as regras aprovadas de:


- **O Banqueiro**;
- **A Dominadora**;
- **A Matriarca Esmeralda**;
- **Lady Dimitrescu**;
- **Rainha Nehelenia**;
- **Nemesis**.


Ela substitui as versões anteriores em que a Matriarca aparecia como planejada e em que as habilidades antigas da Dominadora e do Banqueiro ainda estavam descritas.


##### Fonte de verdade atual


A rotação que vale no jogo é a registrada em:


- `js/boss/bosses/banker.js`;
- `js/boss/bosses/dominatrix.js`;
- `js/boss/bosses/matriarch.js`;
- `js/boss/bosses/dimitrescu.js`;
- `js/boss/bosses/nehelenia.js`;
- `js/boss/bosses/nemesis.js` e seus adapters em `mechanics/`, `presentation/` e `ui/`;
- validações e resolução em `js/boss/boss-engine.js`.


O resumo enxuto e atualizado das habilidades ativas está em `docs/INVENTARIO_HABILIDADES_CHEFES.md`. O HUD da partida usa a mesma lista de definições do registro de chefes para exibir **Habilidades do chefe**, evitando manter uma segunda lista manual de nomes/fases na interface.


##### Estado técnico da base revisada


A documentação não fixa mais uma contagem histórica de testes, porque a suíte evolui junto com o projeto. Alterações no modo Chefe devem ser validadas principalmente pelos testes `boss-*.test.mjs`, pelos testes de integração e por uma partida manual em dois clientes quando houver mudança de sincronização ou apresentação.


A auditoria funcional identificou comportamentos que também fazem parte da regra final descrita neste documento:


- Dívida máxima por Limite de Crédito encerra a partida imediatamente;
- Limite de Crédito conta apenas cartas originadas da mão;
- contribuições novas em jogo possuído causam dano individual normalmente;
- bot deve avaliar custo e benefício, não apenas evitar resultados letais.


Uma partida manual simultânea em dois dispositivos reais continua recomendada para validar Firebase, animações e experiência em tablet.


---


---

<a id="arquivo-contexto-inventario-antes-consolidacao"></a>

## Origem: CONTEXTO_INVENTARIO_ANTES_CONSOLIDACAO.md

### Inventário atual de habilidades dos chefes

**Pacote vigente de 13/10/2026:** bônus de dano Suja100/Limpa200/Real500/Ás-a-Ás1000; HP Banqueiro2650, Dominadora2800, Matriarca2300, Lady2000, Nehelenia2400, Nemesis2500. Nerfs pontuais e compatibilidade em [balanceamento aplicado](#arquivo-balanceamento-seis-chefes-2026-10-13). A meta futura de ~70% de vitórias dos chefes contra humanos competentes não foi medida.

Catálogo vigente, não backlog. [Status do playtest](../CHECKLIST_PLAYTEST_CHEFES_2026-10-10_ATUALIZADO.md#resumo-executivo-do-checklist--estado-em-10102026) e [contexto de retomada](../HANDOFF_DESENVOLVIMENTO_BURACO.md) ficam separados. Designs não aprovados não são habilidades implementadas.

**Auditoria atual — 10/10/2026:** Dominadora 13, Nemesis 11, Nehelenia 11, Matriarca 10, Banqueiro 8 e Dimitrescu 8 habilidades oficiais. Elegibilidade e seleções reais por fase, cenários dirigidos e limitações estão em [BALANCEAMENTO_SEIS_CHEFES_2026-10-10.md](#arquivo-balanceamento-seis-chefes-2026-10-10). Não foram adicionadas habilidades ou alterados pesos. As duas [propostas da Lady](#arquivo-propostas-dimitrescu-2026-10-10) aguardam aprovação.

**Especial universal não é habilidade sorteada do chefe:** saldo compartilhado por canastra 25/50/100, diferenças por evolução, custo 100 e usos repetidos. Exatamente cinco do topo do Lixo, mínimo cinco, bloqueios e reações preservados; o humano escolhe beneficiário. Não pontua novamente por render/reload. Não aumenta a contagem dos catálogos.

**Números locais de 12/10/2026:** filhas500/piso130; petrificação fixa Adaga80, Explosivo110, Anti100, Frasco160, Relíquia160; regen20/Anti10; Adaga80%; Explosivo100+15 permanente; Relíquia+20%; Frasco global por duas oportunidades. Lady2000, PROT.1500, Sede100. Tributo coletivo8/12/16/18 na Fúria0/1/2/3 com duas mãos11+. BOT usa/preserva itens pelo registro canônico, inclusive na recuperação. Ver [pacote atual](#arquivo-pacote-cooperativo-e-bot-itens-2026-10-12).

**Elegibilidade revisada em 09/10/2026:** desafios podem ser impossíveis de cumprir com a mão atual. Preservam-se fase, recursos, alvos reais, saída legal das marcas e segurança dos bloqueios. A última habilidade só sai do sorteio se houver outra realmente elegível. Pesos e consequências não mudaram. Classificação individual dos seis chefes e comparação reproduzível: `AUDITORIA_ELEGIBILIDADE_CHEFES_2026-10-09.md`.


**Registro histórico de 08/10/2026, anterior ao pacote de 12/10: itens v2 da Dimitrescu e filhas 500 HP/piso 300 em partidas novas. Pesos, Sede/Fúria e os reworks anteriores de Nemesis/Enxerto permanecem. Meta de 65%–75% ainda depende de playtest competente. Relatórios: `REWORK_ITENS_DIMITRESCU_2026-10-08.md` e `REWORK_NEMESIS_MATRIARCA_E_UX_DIMITRESCU_2026-10-08.md`.**


Este arquivo lista apenas habilidades que realmente participam da rotação atual. O peso é o peso-base usado no sorteio quando a habilidade está elegível; elegibilidade e alvos ainda são validados pelo motor.

**Pacote de 07/10/2026:** batida fixa de 100 pelo pipeline oficial; Devorador persistente usa contador coletivo (detalhes abaixo). Espelho do Lixo respeita bloqueios canônicos, incluindo Hawk. REFLEXO MORTO não recebe illusion lock; sobreposições legadas preservam o descarte. Imagem Falsa/Espelho Estilhaçado continuam fora da rotação; apenas seus caminhos legados foram protegidos. Pólen enterrado sinaliza a pilha, não o topo normal. HPs, pesos, Infecção e demais valores de cura/punição permanecem.

**Regra permanente:** cumprir objetivos não reduz a condição especial do chefe; evita a punição. Sucessos não descontam falhas de outros objetivos. Alívio por canastra e gastos próprios do chefe por vantagem permanecem. Correções auditadas em `REVISAO_OBJETIVOS_CHEFES.md`. Na revisão experimental posterior, foram alterados os HPs do Nemesis e dos zumbis e a passiva do Agarrador, conforme `BALANCEAMENTO_NEMESIS.md`; pesos, punições, Infecção, fases e demais chefes não foram alterados nessa revisão.


##### Regra de apresentação no HUD

Ajuda oficial abre junto ao próprio `?`, com ponteiro e ajuste ao viewport. Textos usam blocos curtos sem eliminar prazos/exceções. Marcações de jogos envolvem só as cartas, nunca Canastra/Limpa. No Nemesis, Horda/Ômega e duração ficam no painel amarelo; alvo/retorno ↩ ficam na arte principal, sem faixas soltas em volta dos zumbis.

O painel principal mostra somente objetivo, progresso e consequência curta. A explicação completa, termos ambíguos e exceções ficam no botão **?**. Referências de carta como `6♥` e `Q♣` recebem destaque maior e cor por naipe. Essa regra vale para **todos os chefes**, não apenas para a Nehelenia.

