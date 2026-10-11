# Balanceamento e ritmo dos seis chefes — 10/10/2026

**Estado atual de 10/10/2026:** Explosivo100+15 permanente, Relíquia+20% de ataque direto até morrer, Frasco global por duas oportunidades dos cooperadores. Regen20/10, Adaga80% e petrificação preservados. Ver [lote final](LOTE_FINAL_ITENS_DIMITRESCU_2026-10-10.md). Este documento preserva experimentos anteriores, sem recálculo ou estimativa de taxa humana atual.

## Método e limites

**Lote histórico anterior ao impacto100.** Dados/JSON preservados sem recálculo. O buff100 está confirmado no último patch, mas não existe aqui um novo experimento da versão pósbuff. Pendências de teste humano e decisões estão somente no [checklist-mestre](CHECKLIST_PLAYTEST_CHEFES_2026-10-10_ATUALIZADO.md#resumo-executivo-do-checklist--estado-em-10102026).

144 batalhas completas: 12 seeds (101001–101012) por chefe, pareadas com/sem Especial. Todos os braços usam o mesmo baralho físico inicial, motor canônico e política de baixar cartas BossBuracoBot. O controlador experimental escolhe usar o Especial assim que puder, para o jogador da vez. Não é uma política nova do BOT de produção.

O experimento aplica o mesmo seletor canônico de itens nos dois braços da Lady, depois da compra normal. Não equivale a um humano competente nem à automação completa do aplicativo. Compra normal de uma carta, financiamento real, escolhas canônicas, reciclagem Fisher–Yates com seed por Morto e derrota por recursos antes das passivas de fim de turno. Limite de segurança: 180 turnos.

O Especial retira exatamente cinco cartas do topo do Lixo; respeita bloqueios/reações e não consome cartas do Monte. Não altera a compra normal. Tempo abaixo é execução CPU sem pausas/animações, não duração de uma partida humana. Rodar outros processos altera essa medida.

O contador `damage` vem de `boss.stats.totalDamage`: contribuições creditadas ao HP dos alvos e Ataque Final contabilizado pelo motor. Não mede dano absorvido pela PROT./Coágulo nem transferência da Adaga/ticks como uma nova contribuição. Portanto “sem dano” abaixo significa sem aumento desse contador, não ausência de qualquer progresso de combate. Os arquivos preservam o traço de cada turno; não presumir benefício humano a partir da taxa de vitória deste controlador.

## Comparação pareada

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

## Janela crítica: dois Mortos retirados, Monte de 20–30 cartas

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

## Cargas, itens e causas de encerramento

### O Banqueiro

- Sem: causas max_debt=11, resources_exhausted=1; primeiro turno observado com saldo conquistado de pelo menos 100: 40; ativações nos turnos nenhuma; itens usados: 0.
- Com: causas max_debt=12; primeiro turno observado com saldo conquistado de pelo menos 100: 40; ativações nos turnos 41; itens usados: 0.

### A Dominadora

- Sem: causas both_players_dominated=12; primeiro turno observado com saldo conquistado de pelo menos 100: nenhum; ativações nos turnos nenhuma; itens usados: 0.
- Com: causas both_players_dominated=12; primeiro turno observado com saldo conquistado de pelo menos 100: nenhum; ativações nos turnos nenhuma; itens usados: 0.

### A Matriarca Esmeralda

- Sem: causas max_bloom=12; primeiro turno observado com saldo conquistado de pelo menos 100: nenhum; ativações nos turnos nenhuma; itens usados: 0.
- Com: causas max_bloom=12; primeiro turno observado com saldo conquistado de pelo menos 100: nenhum; ativações nos turnos nenhuma; itens usados: 0.

### Lady Dimitrescu

- Sem: causas resources_exhausted=7, max_blood=5; primeiro turno observado com saldo conquistado de pelo menos 100: 44; ativações nos turnos nenhuma; itens usados: 69.
- Com: causas resources_exhausted=7, max_blood=5; primeiro turno observado com saldo conquistado de pelo menos 100: 44; ativações nos turnos 45, 61, 69; itens usados: 68.

### Rainha Nehelenia

- Sem: causas five_dream_mirrors=12; primeiro turno observado com saldo conquistado de pelo menos 100: nenhum; ativações nos turnos nenhuma; itens usados: 0.
- Com: causas five_dream_mirrors=12; primeiro turno observado com saldo conquistado de pelo menos 100: nenhum; ativações nos turnos nenhuma; itens usados: 0.

### Nemesis

- Sem: causas resources_exhausted=9, max_infection=2, boss_defeated=1; primeiro turno observado com saldo conquistado de pelo menos 100: 38; ativações nos turnos nenhuma; itens usados: 0.
- Com: causas resources_exhausted=9, max_infection=2, boss_defeated=1; primeiro turno observado com saldo conquistado de pelo menos 100: 38; ativações nos turnos 42, 53, 54, 56, 61, 66, 67, 69; itens usados: 0.

## Interpretação

A retirada do Lixo não acelera diretamente o esgotamento do Monte: a ativação deixa seu tamanho intacto. Pode mudar indiretamente quantos turnos a batalha dura e quantas compras normais serão necessárias. Compare essas trajetórias, não apenas o Monte final.

Cargas conquistadas tarde, Lixo abaixo de cinco ou bloqueios podem impedir uso justamente no trecho ocioso. Os totais acima mostram a cobertura efetiva; este controlador gasta cedo e não reserva cargas para a janela crítica. Não autoriza concluir que o Especial resolveu o travamento humano. Recomendação: manter as regras aprovadas, coletar logs de humanos e comparar uso imediato versus reserva estratégica em uma próxima validação, sem criar outra recuperação ou mudar números agora.

Dados integrais: [144 batalhas e traços](experiments/chefe-especial-pareado-2026-10-10.json). Reprodução: `node scripts/boss-special-experiment.mjs 12 101001`, depois `node scripts/boss-consolidated-report.mjs`.

## Variedade: catálogo atual, elegibilidade e frequência observada

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

### O Banqueiro

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

### A Dominadora

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

### A Matriarca Esmeralda

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

### Lady Dimitrescu

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

### Rainha Nehelenia

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

### Nemesis

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

### Recomendação de variedade

Não igualar catálogos a 13 por obrigação. O Banqueiro dispõe de quatro habilidades na fase 1 e oito nas fases seguintes; Juros Fixos tem peso maior, e Garantia exige condições reais. Frequência baixa de uma habilidade condicional não justifica removê-las nem forçar alvos inválidos. A proteção contra repetição só se aplica quando há outra elegível. Nenhum peso ou regra de elegibilidade foi alterado neste pacote.

Para a Lady, duas propostas temáticas completas estão em [PROPOSTAS_DIMITRESCU_2026-10-10.md](PROPOSTAS_DIMITRESCU_2026-10-10.md). Continuam fora da rotação, aguardando aprovação. Os demais chefes precisam de validação humana do incômodo com repetição antes de expandir o catálogo.

Dados condicionais: [variedade atual](experiments/chefe-variedade-atual-2026-10-10.json).
