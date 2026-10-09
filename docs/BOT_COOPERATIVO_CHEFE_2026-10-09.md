# BOT cooperativo no modo Chefe — 09/10/2026

As seções iniciais registram a primeira revisão. A segunda revisão, suas
medições e as correções do experimento estão registradas ao final.
Inclui também a revisão de preservação de coringas, após a auditoria de
elegibilidade dos seis chefes; as comparações anteriores permanecem históricas.

## Escopo e problemas encontrados

Revisão estratégica do `BossBuracoBot`, sem modificar regras, HP, pesos, baralho,
Mortos, dano, canastras ou vitória. `boss-engine.js` e os adaptadores mecânicos
permanecem intactos. Os BOTs dos modos clássicos não foram alterados.

A política anterior rejeitava pilhas grandes do Lixo por tamanho/Monte baixo;
priorizava algumas obrigações com bônus fixos enormes; fazia extensões naturais
incondicionais depois do planejamento; e permitia esvaziamento inseguro no modo
de pânico. Seu fingerprint não incluía mudanças nas restrições do chefe.

## Implementação

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

## Comparação reproduzível

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

## Testes e desempenho

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

## Limitações e validação pendente

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

## Segunda revisão — problemas comprovados

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

## Segunda revisão — implementação e decisões descartadas

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

## Segunda revisão — método de comparação

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

### Métrica de coringas

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

## Segunda revisão — resultados finais das batalhas

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

### Tempo das decisões nas batalhas

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

## Segunda revisão — browser e responsividade

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

## Segunda revisão — regressões e limites permanentes

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

### Arquivos desta segunda revisão

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

## Preservação de coringas — terceira revisão, 09/10/2026

### Causa comprovada e limites da reprodução

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

### Política entregue

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

### Diagnóstico sem poluir o jogo

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

### Comparação dirigida antes/depois

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

### Batalhas com as mesmas sementes

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

### Regressões e reprodução

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
