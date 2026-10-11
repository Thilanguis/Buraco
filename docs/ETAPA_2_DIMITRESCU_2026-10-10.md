# Etapa 2 — Dimitrescu: comparação de balanceamento e ajustes de leitura

**Ajuste final de 10/10/2026:** Explosivo/Granada causa **100 HP imediatos + 20 HP por rodada até a morte**, sem acumular sangramentos; petrificação −50 HP máximo, regen20/10 e Adaga80% preservados. Referências a impacto60 em experimentos abaixo são históricas, não valores atuais. Resultados anteriores não foram recalculados.

**Adendo do pacote consolidado:** o Especial compartilhado foi posteriormente implementado com cinco cartas do topo do Lixo, mínimo cinco e bloqueios/reações preservados. Não altera os números B abaixo. A nova comparação dos seis chefes está em [BALANCEAMENTO_SEIS_CHEFES_2026-10-10.md](BALANCEAMENTO_SEIS_CHEFES_2026-10-10.md); as1.344 batalhas históricas deste relatório não foram substituídas nem reinterpretadas como teste humano.

## Pacote B aprovado e aplicado — atualização anterior ao lote final de itens

**Este pacote e suas medições são históricos.** O [lote final de itens](LOTE_FINAL_ITENS_DIMITRESCU_2026-10-10.md) substituiu hemorragia20 por15 e os efeitos de Frasco/Relíquia. Os números atuais constam na documentação funcional; os resultados experimentais abaixo não foram recalculados.

Status/homologação no [checklist-mestre](CHECKLIST_PLAYTEST_CHEFES_2026-10-10_ATUALIZADO.md#resumo-executivo-do-checklist--estado-em-10102026); não reabrir o comparativo já entregue. Impacto100 confirmado em1.384 testes e browser Lady1920/1376/390 no último patch. Saves v2 anteriores atualizam somente impactos futuros com `castleExplosiveBalanceVersion: 1`; feridas, consumo e último tick permanecem. As tabelas experimentais abaixo antecedem esse buff e não medem sua dificuldade final.

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

### Comparação histórica anterior à aprovação

O baseline das tabelas abaixo é a configuração anterior: 500 HP, regen50/25, Adaga30%, Explosivo60 + sangramento50 por duas rodadas. Esses resultados foram preservados, não recalculados como se fossem partidas humanas ou um novo lote de produção. O script congela esse baseline explicitamente para continuar reproduzível após a alteração dos defaults.

Foram executadas **1.344 batalhas completas: 64 sementes pareadas × 7 configurações × 3 rotas**. A e B reduzem o esforço para matar a primeira filha, mas **nenhuma configuração mostrou uma rota consistente de vitória com o controlador utilizado**. A Lady ainda termina com muita vida. Portanto, não é correto declarar a dificuldade resolvida nem extrapolar esses resultados para taxa de vitória humana.

**Recomendação do estudo, agora aprovada para implementação: B com500 HP e Adaga80%.** B resolve diretamente o problema do sangramento ser superado pela regeneração normal. Não acrescentar450 HP ou Adaga100% ao mesmo tempo permite distinguir o efeito desse pacote. A era a alternativa mais conservadora, mas ainda permite que uma filha sangrando recupere até5 HP por rodada.

Referências: checklist atualizado e relatório `ETAPA_1_PLAYTEST_P0_2026-10-10.md`. P0 preservado, exceto o espaçamento extra da mão, cuja remoção foi solicitada expressamente. Especial Cooperativo continua **somente reservado/documentado**: compartilhado 0–100, canastras 25/50/100, crédito incremental por jogo físico. Sem commit, push ou deploy.

## Método e limites

- Sementes 10100–10163, mesmas cartas físicas e posições iniciais em todas as configurações; 108 IDs conservados ao terminar cada batalha. Não foram fabricados itens ou garantidas suas chegadas à mão.
- Motor canônico de combate, passivas, Sede, Fúria, proteção, petrificação, custos dos itens, seleção, Ataque Final, regras de sequência, bloqueios de jogos, Lixo protegido e Mortos. Compra do Monte: **uma carta**, como a aplicação atual.
- Controlador experimental de dois jogadores automáticos: busca gulosa limitada a 128 planos, sem previsão do Monte, com preferência por objetivos, preservação de coringas e descarte aproximado. **Não é o BOT de produção, nem uma simulação validada de dois humanos competentes.** Seus participantes têm `isBot` para execução automática, mas a decisão vem do script experimental.
- Rotas: `direct` não utiliza itens e ataca a Lady; `kill_three` concentra ataques na filha com menos vida até matar as três; `hybrid` usa a seleção híbrida existente. Política de compra, descarte e uso de itens permanece igual entre variantes da mesma rota. Na híbrida, a ordenação de itens é fixa para a duração experimental do sangramento não distorcer o score de uso do BOT.
- Comparamos batalhas inteiras, não dano gratuito isolado. Limite técnico de 180 turnos de jogadores; **nenhuma das 1.344 execuções foi censurada por esse limite**. Todas encerraram por condição do motor.
- Sangramento permanente experimental: um único slot de hemorragia, duração de 1.000 rodadas, maior que todo o horizonte possível da batalha. Isso é equivalente a não expirar neste experimento; **não é implementação definitiva de um estado infinito**.
- Tempo medido em turnos/rodadas, não minutos de uma dupla humana. Sementes pareadas não significam 1.344 observações humanas independentes.

### Correções do instrumento de medição

O script anterior aceitava um override de regeneração nas regras, mas mantinha 50 no estado de cada filha. Agora aplica o valor também às entidades; teste confirma persistência após normalização/reload. A busca também verifica permissões de criar/usar jogos e jogos bloqueados antes de propor uma jogada.

Eventos são contados uma vez por `actionId`. O motor registra a morte antes do evento do golpe/sangramento que a matou: os contadores finais por filha incluem esse último evento. Na tabela de primeira morte, o dano de ataques é **somente o sofrido pela filha morta**, incluindo o golpe final. Na última morte, é o esforço total de ataques contra as três. Dano imediato de item, hemorragia e petrificação não são somados à coluna de ataques.

## Configurações

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

## Batalhas completas — médias por configuração e rota

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

## Primeira e última filha

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

## Depois dos Mortos e com Monte em 30–20

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

## Vitórias, derrotas e causas

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

## Sangramento permanente e reaplicação aprovada

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

## Durabilidade e petrificação

Sem cura/itens, rota direta: Lady2.000 + PROT.1.500 = **3.500**. Matar as três filhas de500 e depois a Lady também exige nominalmente **3.500** de dano, mas enfrenta regen e Fúria; cada morte remove até500 de proteção restante. HP450 reduz essa soma para **3.350**, queda de150 (4,3%). A/B não alteram durabilidade nominal: reduzem o custo recorrente de cura. Capacidade de regen das três feridas: 150 →75 em A ou →60 em B por rodada.

Petrificação **não foi alterada**: percentuais 5%/10%/20%/15%/20%, piso recuperável300 na versão2 atual do workspace (não o antigo piso200 da versão1). Em500: perdas25/50/100/75/100. Em450: 23/45/90/68/90, pelo arredondamento canônico. O piso permanece300, deixando só150 petrificáveis em vez de200. Logo, a sensibilidade HP450 não equivale a simplesmente tirar50 mantendo todas as perdas absolutas. É um motivo adicional para não aplicar450 automaticamente.

Na híbrida do estudo, B reduz regen efetiva total de358,28 para221,17 (−38,3%); A para268,67 (−25,0%). A primeira morte fica cerca de1,54 turno mais cedo em B, e o ataque necessário nela cai485,19→383,23 (−21,0%). Contudo, HP final da Lady fica perto de1.912: apenas cerca de88 líquidos removidos. Essa distância impede afirmar que a dificuldade final esteja calibrada somente com este experimento; não invalida a aprovação posterior do usuário para aplicar B.

## Ajustes de UX implementados

- Espelho do Lixo: espaço temporário calculado a partir da moldura existente, somente enquanto a PNG estiver visível; tamanho/alinhamento da PNG intactos. Contador oculto nesse estado, interrogação visível e clicável; espaço/contador voltam depois.
- HUD: instrução, progresso, resultado e situações por jogador em linhas próprias. Renderer compartilhado transforma separadores `·`/`•` de descrições em quebras de linha; textos das seis famílias de habilidades e popovers passam pelo mesmo caminho. Guia e detalhes também usam o renderer, efeitos persistentes ganham quebras, escolha do Cofre passa a ter frases separadas. Chips compactos de identidade (p.ex. `BANQUETE · JOGO2`) não foram convertidos em parágrafos.
- Ênfase pontual: referências de carta no HUD/ajuda em1,3em e título8% maior, com informações em linhas. No ajuste final solicitado, chips passam de escala1,18 para **1,5 somente no valor+naipe**, preservando fonte do restante, caixa, altura, padding e espaçamento. Copas/Ouros em rosa claro sobre vinho; Espadas/Paus em azul claro sobre fundo escuro, sem neon. Factory compartilhada cobre auxiliares/passivas; renderer de efeitos persistentes também destaca cartas, inclusive nas estruturas de compatibilidade do Banqueiro/Dominadora. Nenhum novo chip é criado onde o chefe não possui referência. Passivas escolhidas continuam seguindo a seleção existente; neutras continuam discretas. Marcações e legendas da mão mantêm os tamanhos originais.
- Removida a margem de 4px específica das cartas com item. Espaçamento original compartilhado da mão restaurado; handlers de itens e seleção da carta preservados.
- Cache preparado em v297, sem publicação.

## Evidências e testes

- Suíte ampla após aplicação de B: **1.356 testes aprovados**, zero falhas/skips/cancelados. Inclui seis chefes, humano/BOT/Ataque Final, itens, snapshots/undo, Devorador e P0. Oito novos casos de B cobrem defaults, sangramento em oito rodadas, Frasco temporário, migração v2 com/sem regras, morte e contrato legado. Testes anteriores foram atualizados para os novos números; fixtures v1 seguem protegendo os antigos50/25.
- Navegador Edge real, fixtures locais usando renderer real, CSS real e snapshots entre dois clientes simulados: 1024×768, 1376×1032, 1920×1080, 390×844, sem zoom. **136 combinações habilidade/fase × quatro resoluções**, ajuda de cada uma, sem separadores no HUD/popover e HUD sem vazamento. Comparação em pixels de chips com/sem referência destacada: mesma caixa e fonte-base, naipe com contraste próprio. Mouse/toque/teclado, ícones próximos sem espaçamento extra, reload/undo e regressões P0.
- Moldura: medição de `::before` contra a borda da área de jogos, folga mínima de 3px, estado temporário removível e ajuda clicável mesmo com contador oculto. Teste usa a PNG existente.
- Browser Dimitrescu: legado + versão2, HP/petrificação, itens, passivas, animações e replay, desktop/tablet/mobile. Browser Nemesis: cinco viewports, seleção, persistência e permissões.
- Imagens em `.cache/playtest-p0/`: `mirror-clearance-{1024,1376,1920,390}.png`, `copy-dimitrescu-crimson_brand-1-{largura}.png`, `copy-nehelenia-fish_marked_card-1-{largura}.png`, além das capturas P0. São evidências locais, não screenshots de uma nova sessão Firebase humana. Revisadas visualmente em tablet, desktop e mobile.
- `git diff --check` sem erros. Nenhum commit/push/deploy; índice de staging não manipulado.
- Regressão final de chips: cinco legendas incluindo10♦ e10♣ no meio do texto, seis temas × quatro viewports, com medição de caixa e contenção do trecho ampliado. Suportes usam a factory real; chips legados de compatibilidade são tornados visíveis somente na fixture, não no jogo. Logs finais em `.cache/package-b-full-final.log`, `.cache/package-b-p0-final.log`, `.cache/package-b-dimi-browser.log` e `.cache/package-b-nemesis-browser.log`; capturas `chip-reference-{chefe}-{largura}.png` em `.cache/playtest-p0/`. Não são novas partidas humanas no Firebase.

## Dados e reprodução

Resultados agregados, marcos, coortes, causas e casos individuais de três mortes: [JSON verificável](experiments/dimitrescu-stage2-2026-10-10.json). Cada execução completa está em `.cache/dimitrescu-stage2.jsonl`; SHA256 desse arquivo está no JSON. Scripts não são importados pela aplicação.

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
