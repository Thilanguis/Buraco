# Itens v2 da Lady Dimitrescu — 08/10/2026

## Resultado e limite da calibração

Implementado no workspace local, preservando as alterações anteriores de Nemesis/Matriarca e da apresentação das filhas. Suíte inicial nova: **1112/1112**. Suíte final: **1163/1163**, zero falhas, cancelados, skips e todos. Sem commit, push ou deploy.

**A meta de 70% de vitória da Lady contra uma dupla competente NÃO está validada.** O experimento reproduzível abaixo exercita batalhas inteiras pelo motor, mas sua política gulosa não é uma dupla competente. Não há win rate humano atual, inicial ou final. Nenhum percentual histórico foi reutilizado. Os valores propostos ficaram como configuração experimental conservadora, não como ótimo estatístico nem balanceamento concluído.

## 1. Contrato anterior e configuração final experimental

| Parâmetro | Anterior, itens v1 | Partidas novas, itens v2 |
|---|---|---|
| Lady | 2000 HP | 2000 HP, inalterado |
| Vínculo de Sangue | 1500 PROT. consumível, 500/filha | Inalterado; Coágulo → PROT. → HP |
| Filha, HP inicial | 450 | 500 |
| Regeneração / Anticoagulante | 50 / 25 | 50 / 25, inalterado |
| Piso do máximo recuperável | 200 | 300 |
| Adaga | Máximo −100; impacto 50 | Máximo −5% do original = 25; vínculo permanente de 30%, sem impacto |
| Explosivo | Máximo −100; impacto 100 | Máximo −10% = 50; impacto 60; hemorragia 10% = 50 por 2 fechamentos |
| Frasco de Frio | Máximo −100; bloqueio consumido no próximo fechamento | Máximo −20% = 100; bloqueia a próxima cura efetiva, guarda carga em vida cheia, teto 2 |
| Anticoagulante | Máximo −100; regen 25 permanente | Máximo −15% = 75; regen 25 permanente, sem stack |
| Relíquia | Máximo −100; suprimia a janela selecionada, inclusive sem candidato | Máximo −20% = 100; suprime uma oportunidade válida, atual pendente ou próxima |

Perdas de máximo são **aditivas sobre os 500 HP originais**, não percentuais compostos do máximo reduzido. O HP atual só é limitado ao novo máximo quando necessário: uma filha já abaixo dele não sofre outro dano pela petrificação. O piso limita o máximo recuperável, não a vida atual: a filha pode ser ferida abaixo de 300 e morrer normalmente.

Lady, capacidade/consumo de PROT., Coágulo, Sede, Fúria, passivas ofensivas +3, seleção/cadência, pesos, regeneração e distribuição dos 15 itens não foram rebalanceados neste patch. Não há ressurreição de filhas nem nova exigência de matar duas.

### Justificativa dos percentuais e duplicatas

- **Adaga 5%:** perda menor porque acrescenta uma fonte permanente de dano ao HP real da Lady. 30% é o ponto intermediário entre 25% e 35%, não uma taxa escolhida para fabricar 70%.
- **Explosivo 10%:** acrescenta impacto e desgaste; perda menor evita juntar petrificação máxima, burst e dois ticks no mesmo item.
- **Frio/Relíquia 20%:** ferramentas de janela/controle, sem dano direto próprio. Ganham petrificação maior para permanecer escolhas diferentes e úteis.
- **Anticoagulante 15%:** efeito permanente de regen inferior recebe uma perda intermediária; cada duplicata mantém sua perda própria, mas nunca reduz regen abaixo de 25.
- **Adagas repetidas:** mantêm um único vínculo de 30%, sem multiplicar percentual, impactos ou criar outro canal. Cada cópia petrifica mais 25 até o piso. Como o vínculo já é permanente, não foi inventada uma capacidade finita adicional. Uma primeira Adaga ainda ativa o vínculo no piso; outra em uma filha já vinculada e no piso é redundante e o BOT a evita.
- **Explosivos repetidos:** cada cópia mantém o impacto próprio de 60 e renova os dois fechamentos; não soma amplitudes nem ticks. Mesmo no piso continua causando impacto/hemorragia.
- **Frio:** no máximo duas curas efetivas bloqueadas de cada vez; uma terceira aplicação não cria uma terceira carga. O bloqueio não se perde em vida cheia.
- **Relíquias:** não empilham uma fila ilimitada de supressões. Nova aplicação após o efeito anterior ser consumido pode preparar outra oportunidade; pendente/sem candidato/não selecionada não gasta a reserva.

## 2. Dano, ordenação e persistência

Adaga transmite `floor(dano efetivamente sofrido × 0,30)`, limitado à vida restante da Lady. Ataques humanos, BOT, cartas/canastras e Ataque Final usam a mesma resolução. Overkill não aumenta transmissão. A transmissão subtrai o **HP real** da Lady, ignorando PROT. e Coágulo sem gastá-los; pode encerrar a batalha com ambos intactos. Itens, hemorragia e outras fontes não acionam o vínculo nem geram ciclos.

Fechamento: obrigações/Sede existentes → hemorragia → morte canônica, se letal → regeneração das sobreviventes. Frio bloqueia somente cura que recuperaria HP. Hemorragia é limitada à vida restante, não transmite Adaga, gera Fúria/morte/remoção de até 500 PROT. restantes normalmente. A cura da Lady por Fúria e seus números de Sede permanecem os atuais.

`castleItemRulesVersion: 2` e configuração são salvos na criação; `castleDaughterBalanceVersion: 3` identifica as novas filhas. Original de HP, anexos/consumo, cargas de Frio, vínculo, hemorragia/rodadas/último tick e IDs de ataque persistem. Guards por rodada e evento impedem duplicação. Undo restaura a versão inteira, não reaplica efeitos.

**Compatibilidade:** save sem versão de itens continua v1: filhas 450, piso 200, perdas uniformes 100, Adaga 50 e Explosivo 100 imediatos, efeitos históricos. Itens já consumidos não ganham vínculo ou hemorragia retroativos. A migração anterior 500/60 → 450/50 permanece só no caminho legado, idempotente e sem curar. Saves pré-castelo não recebem associação nova de itens. A ajuda usa a versão da partida, não os defaults de uma partida nova.

## 3. Experimento de batalha reproduzível

Arquivo: `scripts/dimitrescu-item-experiment.mjs`. Executado:

```bash
node scripts/dimitrescu-item-experiment.mjs 2000 60 40
```

Saída local: `.cache/dimit-items-experiment.jsonl`. Seeds **2000–2059**, 60 por política/versão: 8 × 2 × 60 = **960 batalhas**. Sensibilidades nas mesmas seeds **2000–2039**, 40 por candidato: 14 × 40 = **560 batalhas**. Total **1520 execuções de batalha**, com seeds reutilizadas deliberadamente para comparação; não são 1520 amostras independentes de humanos. Coortes são subconjuntos das 60 híbridas, não partidas adicionais.

Inclui deck físico de 108 IDs, distribuição 3/tipo antes do embaralhamento, duas mãos/Monte/Lixo/dois Mortos, cotação canônica do Lixo escolhido, validação de sequência, sacrifício de carta real antes de planejar, dano incremental/canastras/alívio, fases e seleção oficial das habilidades, PROT./Coágulo, filhas/regen/itens/Fúria/Sede/cura e condições finais. Confere conservação das 108 cartas, inclusive anexos e devoluções. Limite de 180 turnos é inconclusivo, não vitória; não ocorreu no lote.

**Limitações:** busca gulosa até 128 planos, pontuação local, sem look-ahead de canastra ou coordenação de longo prazo, compras/descarte e Morto/batida aproximados. Não executa todo o worker/dispatcher do BOT nem duas pessoas competentes. As políticas de combo escolhem entre itens efetivamente encontrados; não garantem pares, não criam cartas nem dão itens grátis. Muitos finais prematuros e exaustão indicam que esta política é inadequada para estimar a dificuldade humana.

### Estratégias antes/depois — todas 60 seeds por coluna

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

## 4. Sensibilidade conjunta e configuração retida

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

### Adaga25/30/35

Em 200 de dano efetivo, transmitem **50/60/70**, respectivamente; overkill e dano de item/hemorragia transmitem zero extra. O lote teve transmissão média **92,88/115,40/131,88**, mas não separou vitórias. Retidos **30%** como meio-termo da proposta, sem somar por duplicata. Permanece útil sem PROT.; atacar uma filha vinculada pode ferir Lady mesmo com Coágulo inteiro.

### Hemorragia8/10/12 e combos reais

Ticks são **40/50/60**. Contra regen50, o saldo de um fechamento é +10/0/−10 HP; contra Anti25, é −15/−25/−35. Frio cria um fechamento sem cura. Isso evita que Explosivo sozinho invalide regeneração e torna as combinações importantes.

Probes determinísticos `castleComboProbe()` usam itens reais relocalizados **somente no cenário controlado**, não nas batalhas aleatórias. Nenhum ataque, duas rodadas, filha inicialmente500; ordem explícita porque o clamp do máximo pode mudar o resultado:

| Ordem de uso | HP após 2 fechamentos, 8% | 10% | 12% |
|---|---:|---:|---:|
| Explosivo | 410 | 390 | 370 |
| Anti → Explosivo | 285 | 265 | 245 |
| Frio → Explosivo | 260 | 240 | 220 |

**Anti → Frio → Explosivo**, baseline10%: máximo300, HP240 após itens, HP165 após dois fechamentos; Lady2000 intacta, nenhuma transmissão. Confirma sinergia, não vitória automática. Impacto80/12%/3/piso250 aumenta desgaste acumulado, mas os dados não justificam promover tudo junto: retidos **60/10%/2/piso300**, sem prolongar indefinidamente sangramento.

### 450 vs500 e piso250 vs300

500 aumenta cada filha em50 (**11,1%**), o pool inicial das três de1350 para1500. Piso300 mantém até40% de petrificação máxima, enquanto a configuração histórica450/piso200 permitia55,6%. No candidato450 os percentuais também têm referência450: não é uma comparação de HP isolada com perdas absolutas iguais.

Piso250 diminuiria o máximo totalmente petrificado em50 por filha:100 na rota de duas,150 nas três. Não diminui PROT. nem muda Lady. A política não distinguiu vitórias; manter **500/piso300** preserva filhas fortes e evita buff conjunto sem evidência.

## 5. Rota das filhas: durabilidade teórica, não promessa de vitória

Sem cura/regen, sem itens, sem Coágulo e ignorando custo de cartas/tempo:

- Diretamente na Lady: **1500 PROT. + 2000 HP = 3500** de dano.
- Matar duas filhas500: **1000 + 500 PROT. restante + 2000 = 3500**. Regen e Fúria tornam essa rota mais cara se não houver enfraquecimento; não é rigidamente obrigatória.
- Uma Adaga por cada uma de duas filhas: **950** de dano nas filhas475 e até285 de transmissão; aproximadamente **3165** de dano total em ataques, antes de arredondamento por golpe, cura, regen e sacrifício. Ganho idealizado335 (~9,6%) versus3500; cada arredondamento pode reduzir o ganho.
- Uma Adaga em cada uma das três:1425 nas filhas e até427,5 transmitidos; custo idealizado perto de **2997,5**, maior ao arredondar por golpe. Lady não recebe dano da petrificação em si.
- Duas filhas no piso300:600 nas filhas +500 PROT. restante +2000 Lady = **3100**, antes de impacto/bleed/transmissão/regen/Fúria. O piso reduz durabilidade, não dá dano gratuito à Lady.

A Fúria continua adicionando +2/+4/+6 à Sede própria e +10%/+20%/+30% à cura da Lady. Remover duas filhas elimina duas passivas/regen e1000 de PROT. restante, mas gera FúriaII. A matemática oferece incentivo com itens; **a competitividade dessa rota contra dupla competente ainda requer playtest**. O modelo inclusive matou menos filhas nas políticas de quota v2 do que v1, sinal para acompanhamento, não evidência de objetivo já alcançado.

## 6. Disponibilidade e momento dos itens

São15 itens/108 cartas,3 por tipo, sem garantia de mãos, zona ou momento. Em duas mãos iniciais de11, expectativa combinatória **22×15/108 = 3,06 itens**. Probabilidade de ao menos uma cópia de um tipo específico nessas22: **1−C(105,22)/C(108,22) = 49,87%**. Encontrar Adaga/Anti/Frio simultaneamente não é garantido. Os itens podem estar nos Mortos, Lixo ou cartas que valem mais como jogo; sacrificar remove uma carta real e preserva descarte.

Coortes da híbrida, observadas sem forçar deal:

| Coorte | n v1 → v2 | Rodadas v1 → v2 | HP Lady v1 → v2 | Itens usados v1 → v2 |
|---|---:|---:|---:|---:|
| Poucos, ≤8 encontrados | 3 → 4 | 16,00 → 14,75 | 2000 → 1861 | 3,67 → 4,00 |
| Cedo, ≥4 até4 turnos completos | 33 → 33 | 27,70 → 27,27 | 1996,21 → 1935,52 | 4,94 → 4,82 |
| Muitos, ≥13 encontrados | 46 → 43 | 32,65 → 32,86 | 1997,28 → 1970,74 | 4,33 → 4,23 |

Todas perderam; coortes se sobrepõem e não são novos braços independentes. Poucos itens costuma significar batalha encerrada cedo: menor HP final nessa coorte **não demonstra que encontrar menos é melhor**. Muitos encontrados não é muitos sacrificados: na híbrida v2, médias13,47 encontrados e4,37 usados. O custo de carta, de descarte e o momento impedem assumir os15 efeitos disponíveis desde o início. A amostra pequena de poucos itens não sustenta inferência causal.

## 7. BOT, UI e validação

BOT v2 avalia efeitos distintos e custo local; conserva coringas/marcas/carta obrigatória do topo/descarte. Prefere filha investida ou golpe letal, e escolhe dano direto na Lady quando é letal considerando PROT./Coágulo. Vínculo continua considerado mesmo com PROT.0. É uma heurística local, não prova de planejamento ótimo de duas filhas.

UI mantém artes/áudio/chips PASSIVA anteriores. Ajuda de item/anexo/mão segue versão da partida; vínculo30%, hemorragia/fechamentos, Frio/cargas e Anti25 são consultáveis. Vida original500 permanece no denominador, máximo recuperável fica explícito e a parte petrificada reflete cada perda. No celular, máximo ocupa segunda linha e anexos não a sobrepõem.

Adaga usa um fluxo vermelho discreto até o retrato da Lady e `−N HP · Vínculo`, sem animação de gasto de PROT. Impacto/hemorragia têm número vermelho na filha; hemorragia e regen verde entram sequencialmente no mesmo retrato. Outras filhas podem regenerar em paralelo. Presenter usa eventos resolvidos, dedup/baseline/cancelamento existentes e reduced motion sem voo. Não recalcula dano/HP no HUD.

### Testes executados

- Inicial: `node --test` sobre todos os `tests/*.test.mjs` descobertos: **1112/1112**.
- Relacionados chefes/Dimitrescu/Nemesis: **943/943**; depois inclusão dos quatro probes adicionais, nova execução dos arquivos de itens/experimento: **51/51**. As contagens se sobrepõem, não devem ser somadas.
- Ampla final, todos os arquivos `.test.mjs`: **1163/1163**, **0** falhas/cancelados/skips/todos. Os51 testes adicionais cobrem o novo contrato e experimento.
- `tests/dimitrescu-castle.browser.mjs`: **1920/1376/390px**; legado+v2, popovers, mouse/toque/teclado/Escape/clique fora, barra original/recuperável/petrificada, ausência de overflow/sobreposição de anexos, transmissão, bleed→regen, snapshot/replay e reduced motion. Screenshots inspecionados em desktop e celular.
- `tests/boss-resource-feedback.browser.mjs`: **1920/1376/390px**; transferências de Infecção/Sede/HP, sincronização da borda, fontes, filas, dedup/cancelamento e controles reais do laboratório/undo.
- `tests/nemesis-ui.browser.mjs`: renderer real, seleção, estabilidade e **5 viewports** passaram, sem reabrir suas mecânicas.

Cobertura específica: cinco sacrifícios; referência inicial/baixo HP/piso; Adaga humana/BOT/canastra/Final, PROT.0/1500+Coágulo, overkill, duplicatas, fontes não elegíveis e morte Lady; hemorragia+Anti/Frio/regen/morte/Fúria/PROT., reaplicação/último tick; Frio cheio/teto; Relíquia pendente/idle/não selecionada/As Três Filhas; legacy/snapshot/undo/reconexão sem efeitos repetidos; laboratório novo108 IDs/15 itens. Testes antigos v1 preservados com fixture explicitamente legado; expectativas de partidas novas passaram a500.

**Regressões conhecidas restantes: nenhuma encontrada na suíte executada.** Browser é fixture local com módulos/handlers reais, não sessão Firebase com dois clientes. Áudio/arte existentes não foram modificados; reprodução de som real entre dois clientes e um playtest competente não foram feitos. Não existe teste ocultado com skip/todo.

## 8. Arquivos deste patch e diffs

Produção/apresentação: `app.js` (ajuda usa boss atual), `js/boss/dimitrescu-castle.js`, `js/boss/mechanics/dimitrescu.js`, `js/boss/ui/dimitrescu-castle-view.js`, `js/boss/ui/resource-feedback.js`, `styles/boss/dimitrescu.css`.

Testes existentes atualizados: `tests/dimitrescu-castle.test.mjs`, `tests/dimitrescu-castle.browser.mjs`, `tests/boss-objective-resource-rule.test.mjs`, `tests/boss-resource-feedback.test.mjs`, `tests/boss-rework-october.test.mjs` (fixture de HP/regen do trabalho anterior). Novos: `tests/dimitrescu-items-v2.test.mjs`, `tests/dimitrescu-item-experiment.test.mjs`.

Experimento novo: `scripts/dimitrescu-item-experiment.mjs`. Documentação: este relatório, `docs/DOCUMENTACAO_CHEFE_DA_MESA.md`, `docs/INVENTARIO_HABILIDADES_CHEFES.md`, `docs/CHECKLIST_REGRESSOES_E_ATUALIZACOES.md`.

`git diff --stat` do workspace: **24 files changed, 638 insertions(+), 166 deletions(-)**. Inclui mudanças anteriores ainda não commitadas, especialmente Nemesis/Matriarca. Esses arquivos não foram alterados neste patch. Arquivos novos não aparecem no stat comum até serem adicionados; este patch acrescenta quatro (relatório, experimento e dois testes), além dos untracked anteriores. Não foi feito staging.

`git diff --check`: **sem saída, exit0**. Arquivos novos também verificados quanto a espaços finais. Diff não foi limpo por reversão de alterações anteriores.

## 9. Próxima medição necessária

Playtest pareado por seed com duplas competentes, estratégias livres incluindo dano direto/duas filhas/combos, registrando fase/turnos, encontros e usos de cada item, dano PROT./HP/transmitido, regen/bleed, mortes/Fúria/Sede, motivo final. Não fornecer combos iniciais artificiais. Comparar configurações com mesmas seeds e jogadores; separar aprendizagem/ordem e intervalos de confiança. Por exemplo,200 batalhas a70% teriam intervalo aproximado de±6,4 pontos (ainda largo para65–75), sem incluir viés de seleção de jogadores. Só então escolher/revisar configuração para a meta.

Riscos a observar: novas filhas mais duráveis sem itens; custo/cadência para matar duas antes de regen/Fúria; Adaga com canastras fortes; Frio+Anti+Explosivo; timing de Relíquia; duplicatas redundantes no piso. Não baixar dificuldade global nem promover o combo alto para compensar uma política de simulação fraca.
