# BOT cooperativo no modo Chefe — 09/10/2026

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
