# Nemesis — ajuste final de 09/10/2026

## Resultado

Agarrador alterna um jogador por rodada completa. Devorador cura a cada três cartas novas, **sem limite por turno/jogada, cooldown ou trava compensatória**. Normal 20, Mutado 35, Reforçado 35, ambos 50 HP por cura. HP dos combatentes, duração das travas, Infecção, ressurreição, demais chefes e estratégia dos Coringas não foram rebalanceados. Sem stage, commit, push ou deploy.

## Causa e implementação

Antes, o Agarrador extraía cartas do primeiro plano legal encontrado, separava jogáveis das demais e rodava cada lista por um único deslocamento seeded. Isso priorizava cartas úteis e mantinha o viés de ordem da mão/planner. Tentáculo/Barragem e marca inicial da Invasão escolhiam os primeiros IDs de uma lista que também priorizava jogo.

Agora IDs únicos são ordenados canonicamente e embaralhados com Fisher–Yates e RNG determinístico por evento. Seed, rodada, turno/jogador e identificador da marca distinguem os sorteios; rank, naipe, Joker/2 e utilidade não entram no score. Resultados anunciados/locks salvos não são reconstruídos no reload.

`grabberPursuit.playerIds` persiste a ordem dos jogadores, cujo primeiro é sorteado por seed. O índice `(roundNumber−1) % 2` determina o perseguido. É a rodada canônica, não o contador de compras/render. Mudar fase, morrer, retornar à mesa ou ser reanimado não reinicia essa ordem. Só compra efetiva do perseguido aciona a trava. Monte e Lixo usam o mesmo hook; no Lixo Fechado, o topo já jogado não é candidato. Normal/Mutado/Reforçado/ambos continuam agarrando 1/2/2/3 cartas.

As proteções anteriores das combinações de travas permanecem: saída legal de descarte/Morto/batida e solução de objetivo já existente, inclusive cooperativa. Isso pode condicionar os candidatos em estados sobrepostos; não é uma promessa de distribuição uniforme em mãos com restrições diferentes. Não foi adicionada prova antecipada de sucesso à elegibilidade dos anúncios: desafios sem solução continuam permitidos. O sorteio sem restrições especiais foi medido separadamente abaixo.

Antes, `devourerTurnIds` permitia só uma cura por turno e o fim de turno drenava créditos acumulados sem nova contribuição. Agora um loop consome **todos** os grupos completos em `onMeldTransition`, e o fim de turno não cura. Cada ID novo conta uma vez, em abertura/extensão, por qualquer cooperador. Somente 0–2 créditos continuam entre jogadores/turnos. HP cheio ainda consome os grupos, mas não emite cura zero/animação falsa. Não cura com HP zero, derrotado, resultado terminal ou partida encerrada.

Cada grupo incrementa a sequência persistida `devourerHealSequence`; eventos efetivos usam `devourer:v2:N`, distinguindo curas da mesma ação. A sequência não zera com a morte do Devorador. O apresentador existente enfileira cada evento e ignora repetição do ID, sem novo sistema visual paralelo. Laboratório dispara uma cura isolada de teste sem consumir o progresso real; não impõe limite à partida.

## Saves, undo e sincronização

Feed v1 migra para v2 conservando `credits % 3` e os IDs já contados. Grupos completos pendentes são descartados e registrados em `discardedLegacyCredits`, sem cura retroativa no load. Exemplo: 8 créditos viram 2, descartando 6. Sem feed, registra a mesa existente e começa do zero. Normalização repetida não cura nem emite eventos. Morte/reanimação zeram progresso; cartas da mesa anterior não são creditadas novamente. Snapshot, undo e cópias de sincronização preservam progresso, ordem de perseguição, locks e sequência.

## Distribuição estatística reproduzível

`tests/nemesis-final-balance.test.mjs`, seeds 0–2999, mão com cinco candidatos igualmente elegíveis. Inverter a mão não mudou os resultados. Primeiro alvo: jogador 0 **1490 (49,67%)**, jogador 1 **1510 (50,33%)**.

| Carta/candidato | Agarrada (1 por seed) | Tentáculo (2 marcas) | Barragem (3 marcas) | Invasão (1 marca) |
|---|---:|---:|---:|---:|
| Jogável/extensão | 610 | 1166 | 1805 | 571 |
| Não jogável Q | 609 | 1189 | 1793 | 627 |
| Joker | 562 | 1237 | 1798 | 622 |
| Descarte K | 639 | 1276 | 1841 | 589 |
| 2 | 580 | 1132 | 1763 | 591 |

Esperado por candidato: 600/1200/1800/600. A maior diferença no Agarrador foi 39 sorteios (1,3 ponto percentual). Este teste não mede todas as distribuições possíveis nem elimina condicionamentos legítimos de proteção canônica.

## Curas imediatas — exemplos reproduzíveis

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

## Batalhas com as mesmas seeds

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

## Interface e evidências

AGARRA e ALVO são chips separados; nome real e help de alternância. Alvo não aparece em cadáver/repelido/entrada/ausente. ATIVO/MUTADO/REFORÇADO preservados. CURA20/35/50 mantém três segmentos verdes e nenhuma contagem x/3 no rótulo. Progresso numérico e explicação completos ficam no help, sem cooldown antigo.

Browser com renderer/CSS reais: 1920×1080, 3840, 1024, 844 e 390 pixels de largura; cliques/teclado, ajuda ancorada, encaixe, ausência de overflow e estabilidade do HUD. Capturas inspecionadas visualmente:

- [Desktop](../.cache/nemesis-ui/final-chips-1920.png)
- [Tablet](../.cache/nemesis-ui/final-chips-1024.png)
- [Celular](../.cache/nemesis-ui/final-chips-390.png)

Browser de feedback passou em 1920/1376/390: 12 cartas geram quatro transferências reais de +20, HP final 2080 a partir de 2000, progresso zero. Enfileirar cada evento duas vezes e reapresentar cópia serializada não repete animação. Borda anterior do HP é o destino; só após chegada a barra cresce. Reduced motion e cancelamento mantidos.

## Testes e arquivos

Validação final: **309/309 testes focados e 1322/1322 na suíte ampla** dos seis chefes e BOT/coringas, sem falhas, cancelamentos, skips ou todos. Asserções antigas de prioridade jogável/cura única foram atualizadas para a regra nova, sem esconder falhas ou reduzir cobertura. Novo teste cobre sorteios, 1/2/3/4/6/7/9/12 cartas, múltiplas curas mesma ação/turno, ambos cooperadores, duplicação por ID, teto de HP, migração, morte/reanimação, terminal e snapshot/undo/sync; cobertura adicional para mão grande.

Arquivos do ajuste: `js/boss/mechanics/nemesis.js`, `js/boss/bosses/nemesis.js`, `js/boss/presentation/nemesis.js`, `js/boss/ui/nemesis-ui.js`, `service-worker.js` (v294), `scripts/boss-baseline-loader.mjs`, `scripts/nemesis-final-experiment.mjs`; testes `nemesis-final-balance`, `nemesis-devourer-chip`, `nemesis-boss`, `nemesis-grabber`, `nemesis-progress-meters`, `nemesis-ui.browser`, `boss-october-package`, `boss-resource-feedback.test/browser`, `boss-rework-october`, `discard-pickup` e `stock-draw-animation`; documentação oficial, inventário, checklist e este relatório. Mudanças prévias do chip em `app.js`/`styles/boss-mode.css` foram preservadas, sem novo painel ou glow.

Limites: testes de sync são snapshots serializados/cópias, não uma partida Firebase remota com dois clientes reais. Browser usa fixture do renderer real, não autenticação/partida publicada. Nenhum multiplayer remoto, deploy, commit ou push foi feito. Balanceamento humano continua por validar.

`git diff --check` passou; Git apenas avisou da conversão habitual LF/CRLF. `git diff --stat`: **21 arquivos rastreados, 251 inserções e 123 exclusões**, incluindo alterações prévias preservadas. Esse comando não inclui os quatro arquivos ainda não rastreados: este relatório, o script de comparação, `tests/nemesis-devourer-chip.test.mjs` (já existia como mudança local) e `tests/nemesis-final-balance.test.mjs`. O índice/staged permaneceu vazio.
