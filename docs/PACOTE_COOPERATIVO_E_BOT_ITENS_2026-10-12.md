# Pacote Cooperativo e correção do BOT com itens — 12/10/2026

## Escopo

Os dois pedidos foram entregues como lotes independentes: correção do BOT da
Lady e os valores decididos de combate. Não foi iniciada nova pesquisa de
balanceamento, benchmark ou bateria de batalhas. Não houve commit/push/deploy.
Imagens, áudio, animações, Especial, a inteligência da Dominadora e as dez Flores
da Matriarca não foram modificados.

## A. Desperdício de itens: causa comprovada

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

### Política e execução corrigidas

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

## B. Valores finais

### Cartas e canastras

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

### Nemesis

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

### Filhas e petrificação

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

### Tributo e Marca

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

## Compatibilidade

Saves modernos migram perdas futuras e piso uma vez, sem reaplicar perdas em
cartas já anexadas nem modificar ferimentos, proteção consumida ou ticks. Saves
v1 mantêm o contrato histórico dos itens. Um Tributo/Marca já anunciado por um
save anterior mantém a cotação antiga até resolver; novos anúncios usam a nova
curva. Snapshots/undo preservam versões, consumo e IDs de eventos.

As tabelas históricas do simulador de petrificação foram explicitamente fixadas
nos valores antigos para não herdar silenciosamente o pacote atual. Esse
experimento não foi executado nem recalibrado.

## Validação

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

## Arquivos

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
