# Rework Nemesis/Matriarca e correções visuais Dimitrescu — 08/10/2026

## Status e escopo

Implementação experimental baseada exclusivamente no workspace local. Referência anterior: commit local `b1658cc8c2b3acda87db65afed4dbe43c3e37f12`. Workspace inicialmente limpo; suíte inicial nova: **1066/1066**. Sem consulta à branch remota, commit, push ou deploy.

**Meta 70% (faixa 65%–75%) NÃO validada contra dupla competente.** Os experimentos abaixo são partidas completas de uma política gulosa, não telemetria humana nem previsão confiável de vitória real. Mantidos HP, pesos e punições completas; novos custos parciais conservadores devem passar por playtest antes de outra calibração.

## Nemesis

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

## Matriarca — Enxerto

Antes: dois lados neutralizavam; um lado e zero lados geravam +1 Flor, com propagação somente no zero. Isso repetia a obrigação de alimentar ambos de Trepadeiras.

Agora:

- Dois lados: sem efeito.
- Um lado: cura **até 50 HP**, sem Flor nem propagação comum do Enxerto.
- Zero lados: **+1 Flor** e propagação posterior conforme os guards existentes.

Peso **3 → 3**, fases 2/3 e dois jogos existentes preservados. Coroa mantém sua reação própria a uma ameaça parcialmente falhada; não foi redesenhada.

50 HP são **2,5% de 2000**: custo secundário limitado, recuperável por dano, em vez de avançar automaticamente a condição de cinco Flores. Representam no máximo um terço do teto de cura F2 (150) e um quarto do F3 (200). A cura efetiva é limitada pelo espaço até o HP máximo e pela quota restante da rodada. Testados headroom de 5 HP, quota restante de 10 HP e quota esgotada.

Com P0/P1/P2 para zero/um/dois lados, o Enxerto comum gera em média P0 Flor em vez de P0+P1; a cura adicional média é `P1 × min(50, espaço de HP, quota restante)`. Esses são custos condicionais, não uma estimativa de win rate. As variantes 40/50/60 abaixo não discriminam dificuldade humana; 50 fica como referência intermediária conservadora, não como ótimo estatístico.

Preservados: **2000 HP**, derrota em **5 Flores**, no máximo **+1 Flor por ativação normal**, canastra não reabre quota, propagação independente, tetos de cura, Renascimento (1x, 1 Flor/300 HP), Orvalho, Casulo e demais habilidades. Save com Enxerto já anunciado sem `partialHeal` mantém a regra anterior, inclusive na ajuda, até resolver; novos anúncios congelam 50 no payload.

## Experimentos reproduzíveis

Não havia simulador completo pronto. `scripts/boss-battle-experiment.mjs` usa embaralhamento seeded de 108 cartas físicas, duas mãos, dois Mortos, Monte/Lixo, sequência canônica, cotação compartilhada do Lixo protegido, contribuições/dano/canastras, fases, habilidades elegíveis, restrições, zumbis/regen/reanimação, Flores/propagação/Casulo/cura/Renascimento e condições finais do motor. Teste de conservação exige exatamente 108 IDs únicos. Limite de 180 turnos é reportado como `policy_turn_limit`, nunca como vitória; não ocorreu nos lotes registrados.

Política: busca gulosa até 96 planos por ação, objetivos do planner priorizados, sem planejamento longo de canastra/dupla. `autoTarget=true` usa a decisão real de dano do BOT com o dano real do motor, incluindo matar zumbis e escolher Nemesis para perseguição. Isso NÃO executa toda a inteligência/worker do BOT de produção: compras/descarte/organização de longo prazo continuam simplificados. A comprovação de Morto/batida da política é um modelo local, não o dispatcher integral da mesa.

### Comparação antes/depois, mesma política e seeds 5000–5079

O motor anterior foi extraído com `git archive` do HEAD local para `.cache/rework-baseline-engine`; único ajuste instrumental: exportar o classificador já existente, sem alterar regra. Driver atual copiado para essa pasta, imports apontando ao motor anterior.

| Motor | Chefe | Vitórias do chefe / 80 | Rodadas médias | Motivo das derrotas da política |
|---|---|---:|---:|---|
| Antes | Nemesis | 80/80 (100%) | 30,55 | 51 recursos; 29 Ataque Final insuficiente |
| Depois | Nemesis | 80/80 (100%) | 30,59 | 52 recursos; 27 final; 1 Infecção |
| Antes | Matriarca | 80/80 (100%) | 11,21 | 80 Flores |
| Depois | Matriarca | 80/80 (100%) | 11,38 | 80 Flores |

Ocorrências efetivas, não probabilidades fixas dos pesos: Nemesis Caçada **79 → 31**, Tentáculo **48 → 54**, Extermínio **46 → 17**. No motor novo, Caçada F1/F2/F3: **28/1/2**; Tentáculo **36/7/11**; Extermínio F3 **17**. Regeneração Parasita **51 → 64**, Reanimação **13 → 18**: a política efetivamente feriu/matou zumbis, não os ignorou como na primeira exploração. Enxerto **25 → 25**, F2/F3 **22/3**. A queda de perseguições reflete elegibilidade mais específica e escolhas desta política; não justifica automaticamente elevar os pesos.

### Sensibilidade conjunta de custos e pesos

Lotes independentes de comparação: seeds **7000–7059**, depois **9000–9059**, 60 por chefe/configuração. Todas as três variantes desta tabela usam o mesmo alocador experimental seeded: pool legal real, introdução de fase e não repetição preservados; pesos relativos dos objetivos multiplicados fora do catálogo de produção. Resultados não são comparações de uma variável isolada.

| Variante | Cura parcial Enxerto | Bases parciais Nemesis | Multiplicador dos pesos Caçada/Tentáculo/Extermínio/Enxerto | Nemesis 7000 / 9000 | Matriarca 7000 / 9000 |
|---|---:|---|---:|---|---|
| Baixa | 40 | Tentáculo 3/4/5; Extermínio 6 | 0,75 | 58/60 / 60/60 | 60/60 / 60/60 |
| Central | 50 | Tentáculo 4/5/6; Extermínio 8 | 1,00 | 58/60 / 60/60 | 60/60 / 60/60 |
| Alta | 60 | Tentáculo 5/6/8; Extermínio 10 | 1,25 | 58/60 / 60/60 | 60/60 / 60/60 |

Bases de sensibilidade arredondadas; bônus/custos completos/HP não mudam. Nas seeds 7000, rodadas Nemesis baixa/central/alta: **28,52/28,53/28,53**; Matriarca: **11,82/11,82/11,95**. Nas seeds 9000: Nemesis **29,35/29,35/29,37**; Matriarca **11,25/11,27/11,25**. Enxerto ocorreu 19/19/20 vezes no lote 7000 e 21/22/25 no 9000. Nenhuma configuração se aproximou da faixa desejada neste modelo.

Verificação independente do catálogo/seleção OFICIAL, seeds **9000–9079**: Nemesis **80/80**, 29,68 rodadas; Matriarca **80/80**, 11,43 rodadas. Houve também exploração preliminar de 120 seeds 1000–1119 antes/depois, sem seleção de alvos dos zumbis: ambos 100%; descartada como evidência de competência. Seus números não foram usados para ajustar HP.

### Reprodução

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

## Lady Dimitrescu — somente apresentação

Causa 1: PASSIVA e CAÇADA/BANQUETE/LIXO usavam o mesmo `daughterPassiveHelp()`. Agora PASSIVA chama ajuda própria de regeneração: 50, Anticoagulante 25, Frio na próxima cura, máximo recuperável, vida cheia, morte e valor efetivo no estado real. Objetivos ofensivos, seleção/cadência e debuffs permanecem.

Causa 2: `regenerateDaughters()` já emitia `daughterRegen`, mas o presenter ignorava esse tipo. Agora usa `targetId`, `amount` e `hp` reais para número verde no retrato individual, sem mudar HP de novo. As três curas são independentes e simultâneas, fora da fila da Lady/Sede. O gate existente de `app.js` já encaminhava eventos ao presenter, então não foi necessário alterar o aplicativo principal.

Cobertura: +50 Bela, +20 Cassandra em 430/450, +25 Daniela com Anticoagulante; filha não selecionada; Frio, vida cheia, morte e zero sem animação. Deduplicação por `actionId`, baseline inicial em reload/reconexão, render repetido, undo/cancelamento; texto acessível e reduced motion sem deslocamento. Lady/filhas **HP, Sede, Fúria, Vínculo, itens, regen e passivas não foram alterados**.

## Validação e arquivos

- Inicial ampla: **1066 aprovados, zero falhas**.
- Final focada: **896 aprovados, zero falhas** dos chefes/Nemesis/Dimitrescu e infraestrutura atingida.
- Final ampla: **1112 aprovados, zero falhas**, sem cancelamentos/skip/todo. Logs: `.cache/rework-focused-final.log` e `.cache/rework-wide-final.log`.
- Novas regressões: objetivos nas fases/ordens/papéis; parcial só do parceiro; bônus únicos; alvos/IDs congelados; ponte cooperativa; Agarrador; dano já creditado/Ataque Final; Enxerto/caps/legado antes e depois da aplicação; regeneração real/ajuda; conservação/determinismo das partidas.
- Browsers locais: `nemesis-ui` (1920/1024/844/390/3840), `dimitrescu-castle` (1920/1376/390), `boss-resource-feedback` (1920/1376/390), `boss-hud-ux` (1920/1376/1024/390), mouse/toque/teclado/Escape, viewport e reduced motion. Capturas dos novos objetivos e números revisadas visualmente. Fixtures usam renderers/CSS reais, sem sessão Firebase ao vivo.

Produção: `js/boss/boss-balance.js`, `boss-engine.js`, `bosses/{nemesis,matriarch}.js`, `mechanics/nemesis.js`, `presentation/{nemesis,matriarch}.js`, `ui/{dimitrescu-castle-view,resource-feedback}.js`. Nenhum CSS, `app.js`, BOT worker ou definição dos demais chefes alterado.

Testes: novos `boss-rework-october.test.mjs`, `boss-battle-experiment.test.mjs`; atualizados `boss-engine.test.mjs`, `boss-final-balance.test.mjs`, `nemesis-boss.test.mjs`, `dimitrescu-castle.browser.mjs`, `nemesis-ui.browser.mjs`. Fixtures manuais de Enxerto explicitam payload novo; os saves antigos são testados separadamente, não mascarados.

Documentação: este relatório, `DOCUMENTACAO_CHEFE_DA_MESA.md`, `INVENTARIO_HABILIDADES_CHEFES.md`, `CHECKLIST_REGRESSOES_E_ATUALIZACOES.md`. Harness: `scripts/boss-battle-experiment.mjs`.

`git diff --stat`: 17 arquivos rastreados, 373 inserções/101 remoções; mais quatro novos ainda fora do índice (relatório, harness e duas suítes), total 21 arquivos. `git diff --check` sem erros. Nada foi colocado em staging automaticamente.

## Pendências reais

- Playtest com dupla competente, registrando habilidade/fase/elegibilidade, sucesso/parcial/falha, dano e alvos, canastras/alívio, zumbis, duração e motivo final. Comparar lotes independentes antes de declarar 65%–75%.
- Verificar se a seleção estrita de S.T.A.R.S. reduz demais Caçada/Extermínio em jogo humano; não aumentar peso com base na política gulosa.
- Medir se aceitar 50 HP de cura oferece decisão útil ou se jogadores sempre alimentam ambos; avaliar custo de oportunidade de cartas/preparação de canastra.
- Sessão real de dois clientes Firebase para transporte/concorrência e playtest visual no aparelho do usuário. Snapshots e guards têm cobertura local; isso não substitui rede real.

Nenhuma mecânica de outro chefe, regra global de recuperação ou teto de Flores foi revertida. Sem commit/push/deploy.
