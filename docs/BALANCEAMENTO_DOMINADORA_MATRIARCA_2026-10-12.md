# Dominadora: decisões do BOT; Matriarca: dez Flores — 12/10/2026

## Escopo entregue

Somente este lote. Nenhum checklist antigo foi reaberto. Não houve alteração
de áudio, PNG, animação/regra do Especial, HP ou habilidade de outro chefe.
Não houve commit, push ou deploy.

## 1. Causas das decisões do BOT

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

## 2. Correções da estratégia

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

## 3. Demonstrações antes/depois

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

### Batalhas pareadas de BOTs

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

## 4. Matriarca — dez Flores

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

## 5. Testes e evidências

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

## 6. Arquivos alterados

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
