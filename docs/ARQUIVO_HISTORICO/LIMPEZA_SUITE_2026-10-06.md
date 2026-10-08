# Limpeza da suíte local — 06/10/2026

## Fonte e resultados

Fonte de verdade: workspace local atual, com `git status` e `git diff` conferidos antes e depois. Não foi utilizado Google Drive. Nenhum commit, deploy, alteração de versão ou rebalanceamento foi realizado.

A primeira execução completa encontrou um loop síncrono infinito em `boss-debug-scenarios.test.mjs`: o teste esperava `players`, mas Ordem Final estava aguardando escolha humana. Foi necessário interromper essa execução. Para coletar o restante da baseline, foi executada uma rodada diagnóstica dos outros 50 arquivos: **721 testes, 670 passando e 51 falhando**. O arquivo travado não foi escondido: foi corrigido e voltou às execuções completas.

Resultados finais:

- Suítes focadas afetadas e invariantes aprovadas: **507 testes, 507 passando, 0 falhas**.
- Suíte ampla, todos os 51 arquivos `tests/*.test.mjs`: **758 testes, 758 passando, 0 falhas, 0 cancelados, 0 skipped, 0 todo**.
- Browser test do Nemesis: aprovado em 1920×1080, 1024×768, 844×390, 390×844 e 3840×2160. Usa fixture local do renderer real; não é sessão Firebase em dois clientes.
- Checagem sintática dos 21 arquivos JS/MJS modificados: aprovada. `git diff --check`: aprovado.

A diferença entre 721 e 758 não é remoção de casos: 29 testes do arquivo antes travado voltaram a rodar; o módulo de BOT da Dominadora, antes bloqueado por import incorreto e contabilizado como um arquivo falho, passou a executar seus 7 casos (+6); foram adicionadas 2 regressões (+2).

Logs locais em `.cache/suite-cleanup-baseline-rest.tap`, `.cache/suite-cleanup-focused-final.tap` e `.cache/suite-cleanup-final.tap`. Capturas do navegador em `.cache/nemesis-ui/`.

## Classificação e correções

### Regressões reais / defeitos da implementação

- **DevTools de Dominação:** `debugFriendMeld()` concedia o bônus, mas não registrava a proteção usada por `processDominationReward()`. Reprocessar após JSON reload podia comprar outra carta. Agora persiste o mesmo controle de turno; a regressão cobre Limpa, Real e Ás-a-Ás e mantém a igualdade integral do estado após repetição.
- **Laboratório, cenários sem alvo:** algumas fixtures mantinham alvos elegíveis. Pesadelo Eterno precisa de apenas uma carta, portanto preservar uma ainda era incorreto; Laço do Tigre mantinha jogos; Olho do Falcão, Mão no Espelho e Reflexo Invertido mantinham cartas. As fixtures retiram os alvos e devolvem cartas ao monte, conservando o baralho. Nenhuma regra de elegibilidade do jogo foi alterada.
- **HUD compacto do Nemesis:** a consequência de Extermínio S.T.A.R.S. excedia o orçamento existente. Foi encurtada para “Falha: bônus de Infectado/Ômega”. O teste de orçamento foi mantido intacto; mecânica e detalhes não mudaram.
- **Texto da Matriarca:** Pólen anunciava 40 em vez de até 30 HP; o resumo da ameaça Colheita anunciava 60/100 em vez de 50/80. Somente essas strings foram corrigidas, com nova regressão para apresentação, ajuda, faixas e ameaça criada pelo motor real.

### Expectativas antigas, sem mudanças nas regras corretas

- **Dominadora:** testes antigos tratavam Correntes como punições/alívios inteiros. Atualizados para a representação interna atual de Dominação: 1 ponto = 0,08; Limpa remove 4 pontos = 0,32; punições atuais permanecem. Exposição, Escolha Forçada e Ordem Final seguem os valores atuais, não os antigos. Ordem Final é cega antes do aceite e só então marca duas cartas realmente jogáveis; fixtures agora oferecem uma solução legal.
- **HUD/diálogos/Casulo:** assertions acompanhavam markup anterior ou texto simples; atualizadas para speech separado, nome do chefe, renderer de texto rico e guarda condicional atuais, mantendo as verificações funcionais.
- **Laboratório Nemesis:** `phase_cap` e `persistent_corpse` na F1 são cenários intencionalmente inelegíveis; fallback é esperado somente nesses casos e em `no_target`. Os demais continuam obrigados a apresentar a habilidade solicitada.
- **Domination Friend:** a opção Decreto já está ativa por padrão. Trincas naturais abrem antes da despedida; aberturas sujas aguardam a despedida; reta final usa monte ≤4 sem mortos; segundo jogo preserva reservas do primeiro e usa valores já presentes nele. Essas mudanças preexistiam no histórico local (commits `74da334` e `3ff6729`). Atualizadas as expectativas antigas, sem modificar IA/estratégia. O caso de trinca natural foi preservado em teste explícito separado.
- **Service worker:** expectativa antiga `buraco-v269` substituída por validação da release atual ≥276, mantendo verificações de `skipWaiting` e assets. A versão atual não foi reduzida nem editada.

### Harness / mocks / imports / execução

- `localActionGate is not defined` vinha das VMs que executavam handlers extraídos sem suas novas dependências. Os testes agora usam o gate e pausa reais, os helpers importados e ambas as funções wrapper/`Once`. Não foi colocado um global falso no app.
- Mocks faltantes de animação local, reação de Decreto, cancelamento de BOT, refresh do Laboratório e `renderHand` foram fornecidos onde a fixture isola deliberadamente esses fluxos. Seus módulos específicos continuam cobertos pela suíte ampla.
- Laboratório injeta o BOT específico de chefe; VM do BOT prepara imports e `import.meta` para executar a classe real no contexto isolado.
- Import antigo `boss-engine.js` na raiz corrigido para `js/boss/boss-engine.js`.
- Tests de CSS agora incluem os arquivos específicos para Matriarca/Dominadora, para onde os estilos haviam sido movidos.
- Loop infinito do cenário Ordem Final substituído por avanço limitado com assertion de `choice`; a escolha é resolvida antes de conferir `players`. Não é um skip nem um timeout artificial para aceitar comportamento incorreto.
- Nenhuma falha remanescente foi atribuída genericamente a flake. Não foram introduzidos sleeps para obter teste verde.

## Arquivos de produção alterados

1. `js/boss/boss-debug-scenarios.js` — fixtures sem alvo.
2. `js/game/domination-dev-tools.js` — persistência do controle de bônus.
3. `js/boss/presentation/nemesis.js` — texto compacto.
4. `js/boss/presentation/matriarch.js` — texto de Pólen até 30 HP.
5. `js/boss/boss-engine.js` — somente texto de Colheita 50/80 HP.

## Testes atualizados

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

## Regras e alterações do usuário preservadas

- Favorita F2/F3: protegida 0, punida +8, cooperadora menos dominada continua sendo punida. Nunca restaurado −2.
- Demais valores/controles atuais da Dominadora e recuperação por canastra intactos.
- Sucesso/partial de habilidade não reduz recursos especiais; canastras aprovadas e gastos internos permitidos permanecem. A regressão global continua passando sem flexibilização.
- Matriarca: teto +1 Flor por ativação, canastra não reabre quota, propagação independente permanece; HP 2000, derrota em 5 Flores, Renascimento, Orvalho e Casulo intactos.
- Nemesis: nenhum peso, HP, lifecycle, regra de dano, Infecção ou mecanismo redesenhado/rebalanceado.
- `service-worker.js` e `styles/domination.css` já estavam staged no início e foram preservados sem edição nesta tarefa. Permanecem staged; os arquivos desta revisão não foram staged.
- Inventário e documentação funcional já descreviam Pólen/Colheita corretamente; não receberam alterações de números para acompanhar os textos errados. Documentação técnica e checklist receberam apenas o registro das correções pertinentes.
