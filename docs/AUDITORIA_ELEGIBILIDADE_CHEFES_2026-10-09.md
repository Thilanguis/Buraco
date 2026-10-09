# Auditoria de elegibilidade e variedade — seis chefes — 09/10/2026

## Escopo e conclusão

Fonte: workspace local. Baseline isolada: `675106b3e1dfc15b80603886e3c8683dad7cc3a8`, com toda a árvore JS anterior materializada pelo loader existente; não mistura imports antigos com estratégia atual. Workspace inicialmente limpo. Sem commit, push, deploy ou consulta remota.

Problemas comprovados:

1. Nemesis exigia plano de dano da Caçada, plano conjunto ordenado de Extermínio, duas contribuições para Infectado e planos de jogo para todas as marcas. Barragem ainda exigia duas cartas jogadas no plano. Isso retirava desafios legítimos de mãos fracas da rotação.
2. Devorador exigia uma contribuição legal já disponível na mão, embora o desafio pudesse falhar normalmente. Impacto também exigia carta/plano imediato, não apenas jogo válido.
3. Prisão da Nehelenia exigia carta de resgate na mão do parceiro; Laço exigia duas alimentações conjuntamente possíveis, com cartas distintas e descarte restante. São desafios com consequência por falha, não bloqueios que precisem garantir sucesso.
4. O seletor compartilhado retirava a última habilidade antes de validar as alternativas. Mesmo havendo uma opção válida para repetir, podia resultar em lista vazia. Reproduzido também na Matriarca com apenas Orvalho elegível.
5. Não foi comprovado favorecimento especial do Devorador no sorteio. Com os três elegíveis, o sorteio é uniforme entre candidatos; filtros diferentes e estados da mesa alteram o conjunto disponível. Não há pesos individuais para os zumbis.

Corrigidos os filtros excessivos e a exclusão prematura da última habilidade. Mantidos pesos, fase-intro, recursos, HP, dano, cura, Lixo, objetivos/consequências, BOT estratégico e regras clássicas. Uma habilidade sem solução pode ser anunciada, falhar e aplicar a consequência existente. Não se elimina alvo obrigatório nem se remedia a dificuldade cancelando o objetivo.

## Critério A/B/C e auditoria individual

A: dependência obrigatória/segurança de ações. B: prova antecipada excessiva de sucesso. C: alvo real necessário, solução antecipada desnecessária. As condições abaixo identificam os filtros que causam exclusão; fase continua obrigatória para todas. `payload:<id>` no JSON identifica a validação de alvo do construtor/validador daquela habilidade; `prerequisite:<id>` identifica o pré-filtro compartilhado. Não é uma nova regra de interface.

### Nemesis — 11 habilidades

| Habilidade | Classe/decisão | Exclusão preservada ou removida |
|---|---|---|
| Caçada S.T.A.R.S. | B removida; A alvo | Mantém cooperador S.T.A.R.S. e turno restante; retira prova de dano imediato. Sem S.T.A.R.S., escolhe cooperador válido; nunca troca um S.T.A.R.S. sem ataque por parceiro com mão melhor. |
| Tentáculo Infeccioso | B removida; A marcas | Precisa de duas cartas com saída individual legal por jogo ou descarte. Não exige plano de jogo completo; jogar continua sucesso, apenas descartar continua parcial. |
| Barragem de Tentáculos | B removida; A marcas | Precisa de três marcas reais com saída individual legal, não prova de duas saídas conjuntas nem duas cartas jogadas. Exigência de duas saídas e falha +16 permanecem. |
| Extermínio S.T.A.R.S. | B removida; C destino | Mantém dois papéis, turnos restantes e um jogo existente extensível, congelado por ID. Não prova planos conjuntos nem sucesso na ordem atual. |
| Invasão da Horda | B/C revisadas; A lifecycle | Teto da fase, ausente/repelido e jogador com turno restante. Agarrador precisa de marca com saída legal, não contribuição pronta. Infectado não precisa provar duas cartas. Devorador precisa de jogo estruturalmente extensível, não carta na mão. |
| Lança-Foguetes | C revisada | Mantém jogo legal extensível; não exige plano imediato para alimentá-lo. Jogo inexistente/Ás-a-Ás completo é inválido. |
| Zona Contaminada | A preservada | Topo real, recursos de compra, Lixo desbloqueado e retirada legal pela cotação canônica do destino real. Não cria alvo de cobrança sem retirada possível. |
| Comando da Horda | A preservada | Persistente vivo; entering/repelled/corpse não são alvos de reforço. |
| Regeneração Parasita | A preservada | Persistente vivo ferido, menor percentual de HP. Sem alvo ferido não participa. |
| Reanimação Viral | A preservada | Cadáver com `revivals < 1`, espaço no teto e quota da fase não consumida. Não revive repelido nem revive o mesmo zumbi pela segunda vez na batalha. |
| Surto Ômega | A fase | Apenas fase final; nenhum plano da mão é exigido. |

As marcas usam helpers canônicos de sequência/descartes/bloqueios/condição de saída. Carta recém-retirada que não possa sair não vira marca; último descarte ilegal sem Morto/canastra boa continua rejeitado. Prioridade determinística: jogáveis, depois apenas descartáveis; não se exige sucesso simultâneo. Nenhuma marca nova bloqueia descarte.

Invasão mantém IDs dos jogos iniciais/IDs de cartas para Devorador, contadores coletivos, expulsão imediata ao atingir três, persistência/Mutação e **zero Infecção adicional por falha**. `inspectBossAbilityEligibility().details` explica cada candidato: teto, lifecycle, ausência de turno, ausência de jogo extensível ou ausência de saída legal da marca. Não marca cadáver como invasor.

O planner não foi removido do jogo: continua na execução do BOT, na proteção pós-compra do Agarrador e nos cenários de sucesso do Laboratório. Este último calcula plano quando solicitado, em vez de exigir/persistir uma solução no anúncio. Saves já anunciados preservam payload/versão/IDs, inclusive campos `solution` antigos; não são sorteados novamente após reload.

### Rainha Nehelenia — 11 habilidades

| Habilidade | Classe/decisão | Filtro |
|---|---|---|
| Jogo Espelhado | A preservada | Par alvo/jogo com carta realmente utilizável e descarte seguro; rejeita locks persistentes incompatíveis e respeita Presa. A ilusão física exige essa ação legal. |
| Siga o Reflexo | A preservada | Dois cooperadores distintos. Não prova igualdade do total de cartas dos dois turnos. |
| Espelho do Lixo | A preservada | Topo existente, jogador e Lixo desbloqueado pelo helper canônico. Sem prova de compra completa da pilha. |
| Prisão no Espelho | C revisada | Jogador com pressão, parceiro distinto, jogo existente extensível. Retira prova de alimentação na mão do resgatador. Mantém prioridade do mais pressionado e falha por fase. |
| Pesadelo Eterno | A preservada | Carta verdadeira existente e escolha válida; identidade/sorteio persistidos. Não prova acerto do jogador. |
| Laço do Tigre | B/C revisadas | Dois jogos distintos estruturalmente extensíveis, sem plano conjunto/cartas distintas na mão/descarte conjunto. Falha/garras continuam; elas não proíbem descartar ou jogar em outro destino. |
| Presa Marcada | A preservada | Rota real e segura para alimentar o jogo; bloqueia outros jogos existentes até cumprir, logo retirar esse filtro criaria controle sem saída. |
| Olho do Falcão | A preservada | Naipe com descartes legais e alternativa; preserva conflitos de marca/topo recém-retirado e preferência de combo. |
| Vigilância | A preservada | Alvo com dois jogos realmente alimentáveis; bloquear um deixa outro disponível. Não relaxada como Laço. |
| Mão no Espelho | A preservada | Carta com saída por jogo ou descarte, excluindo conflitos reais. REFLEXO MORTO continua descartável. |
| Reflexo Invertido | A preservada | Rota segura em jogo existente para romper restrição persistente de criar jogo novo. |

Payloads de Laço conservam `eligiblePlayerIds` como informação atual para UI/BOT, possivelmente vazia. Essa informação não é requisito para anunciar o desafio nem uma reserva de jogador; os jogos permanecem congelados por ID. Imagem Falsa, Roubo dos Sonhos e Espelho Estilhaçado continuam compatíveis com saves legados, fora da rotação atual. Não são reintroduzidos para aumentar variedade.

### Lady Dimitrescu — 8 habilidades

| Habilidade | Classe preservada | Filtro |
|---|---|---|
| Tributo de Sangue | A fase | Não exige prova de redução da mão. |
| Vinho Carmesim | A | Lady ferida e Sede ≥20. Não anuncia cura sem vida perdida/recurso. |
| Marca Carmesim | A | Marca específica realmente jogável por cooperador; não é uma prova conjunta da rodada. |
| Banquete dos Mortos | A | Morto existente e profanação ainda não ativa. |
| Coágulo Carmesim | A | Sede ≥30 e Coágulo ainda não ativo. |
| Portas do Castelo | A fase | Somente fase final; não prova previamente sobrevivência da equipe. |
| As Três Filhas | A | Ao menos uma filha viva e modelo de passivas atual. Não exige cumprir as três. |
| Sangue Impuro | A | Cooperador existente; não exige um coringa utilizável na mão. |

Passivas individuais mantidas: Bela só marca carta realmente jogável; Cassandra só escolhe jogo com contribuição legal; Daniela só reage à retirada real. Sem alvo válido continuam sem punição. Itens, Vínculo, Fúria, regen e HP não foram alterados.

### Matriarca Esmeralda — 10 habilidades de rotação

| Habilidade | Classe preservada | Filtro |
|---|---|---|
| Semente Viva | A | Slot de ameaça e carta jogável sem lock contraditório; a marca restringe descarte. |
| Raiz Faminta | C já correta | Slot e jogo estruturalmente extensível ainda não ameaçado; não exige carta na mão. |
| Orvalho Restaurador | A | Slot de ameaça; não exige provar seis contribuições. |
| Trepadeiras Gêmeas | C já correta | Slot/jogos extensíveis; pode escolher só um quando permitido pelo estado. |
| Enxerto | C já correta | Slot e dois jogos reais extensíveis distintos; não prova cumprir ambos. |
| Pólen do Lixo | A | Slot, topo real e estado apropriado do Lixo. |
| Colheita | A | Slot e jogador alvo; não prova reduzir a mão. |
| Florescimento Real | A/C já corretas | Slots e objetivos individuais válidos de semente/raiz/pólen, até o limite; sem prova conjunta. |
| Casulo Esmeralda | A | Sem Casulo ativo. |
| Coroa da Primavera | A | Ameaça ativa existente para reforçar. |

Renascimento continua passiva/debug-only, peso zero, fora da seleção normal. Recursos, cancelamento por perda real do alvo, propagação/limites e cura não mudaram. A correção compartilhada permite repetir Orvalho quando for a única habilidade elegível, em vez de ficar sem anúncio.

### Dominadora — 13 habilidades

| Habilidade | Classe preservada | Filtro |
|---|---|---|
| Coleira | A | Cartas úteis/seguras, até duas, sem eliminar descarte legal. |
| Escolha Forçada | A/C | Jogador e ordem real: alimentação/evolução legal, descarte por naipe com alternativa ou mão com tamanho necessário. Ordens específicas restringem ações; não remover sua rota legal. Não exige provar cumprir redução da mão. |
| Exposição | A | Carta específica jogável e lock de descarte seguro. |
| Troca Forçada | A | Dois jogadores com carta real para a troca. |
| Mãos Atadas | A | Dois jogadores; vínculo ao primeiro jogo não exige solução completa. |
| Posse | A | Jogo extensível não possuído e menos de duas Posses. |
| Etiqueta de Ferro | A | Descarte do naipe exigido e alternativa legais; não contradiz locks. |
| Favorita | A | Dois cooperadores; prioriza menos dominado, sem prova de solução. |
| Dupla Coleira | A | Carta por cooperador, com descarte legal remanescente. |
| Separação | A | Dois cooperadores; nenhum plano conjunto exigido. |
| Controle Absoluto | A | Jogador alvo existente. |
| Quebra de Vontade | A | Alvo com pressão mínima e ≥120 HP perdidos para opção de cura significativa. |
| Ordem Final | A | Dois jogadores com duas cartas individualmente jogáveis cada para o sorteio às cegas após aceitação. Não prova jogar ambas conjuntamente; retirá-lo faria a própria escolha cancelar sem cobrança por falta de cartas para marcar. |

Interdito segue legado fora da rotação. Não se afrouxam locks que podem impedir descarte. As exigências de cartas individuais são diferentes da prova conjunta removida da Barragem.

### Banqueiro — 8 habilidades

| Habilidade | Classe preservada | Filtro |
|---|---|---|
| Juros Fixos | A fase | Contrato/tributo definidos pelo motor; sem prova de pagar. |
| Taxa de Manutenção | A | Quota da mesma rodada na fase final. |
| Bloqueio de Crédito | A fase | Sem prova de escapar da cobrança. |
| Limite de Crédito | A fase | Limite/contador real; sem prova de cumprir. |
| Juros Compostos | A fase | Pressão calculada pelo estado; sem solução antecipada. |
| Auditoria de Naipe | A fase | Naipe/contrato escolhidos pelo modelo existente; não exige plano coletivo. |
| Penhora | C já correta | Jogo existente estruturalmente extensível; não exige contribuição na mão. |
| Sobretaxa do Lixo | A fase | Aguarda retirada real; não cria prova antecipada de toda a compra. |

Nenhum filtro desses quatro chefes foi removido apenas para forçar distribuição uniforme. Inspeção de fase, capacidade, recursos, bloqueios, escolhas pendentes, resultado/derrota e payloads permanece.

## Sorteio e diagnóstico

O seletor monta e valida candidatos antes de evitar o último. Havendo duas ou mais opções elegíveis, a última sai. Havendo apenas uma, pode repetir. Introduções de fase conservam seus subconjuntos prioritários e caem na seleção normal se faltarem alvos; debug-only e seleção forçada continuam separados. Sem candidato real continua `null`, sem inventar habilidade/penalidade.

O peso só atua entre candidatos elegíveis: não representa frequência fixa na batalha. Fase-intro e lifecycle dos zumbis também mudam a distribuição. `reasonCode` identifica pré-filtro/payload; `details` detalha os candidatos da Invasão. O diagnóstico não altera consequências nem escreve eventos de jogo.

## Método estatístico e limites

Comando: `node scripts/boss-eligibility-audit.mjs` na raiz. Pode receber outro commit local como primeiro argumento. Saída detalhada: `.cache/boss-eligibility-audit.json` (regenerável; não versionada). O script verifica que IDs/fases/pesos/HP/limites das definições são iguais à baseline.

64 sementes × 15 cenários × 3 fases = **2.880 sorteios por chefe por versão**, 34.560 no A/B. Também 720 sorteios sequenciais condicionais por chefe/versão, mais 1.024 sorteios de Invasão por versão com os três candidatos elegíveis. Total **45.248 chamadas de seleção/inspeção de distribuição**, além dos probes de elegibilidade.

Cenários: mão pronta/fraca/unitária, mesa vazia/Ás-a-Ás completo, Monte/Mortos esgotados, recurso disponível/limite, pressão com mão fraca, múltiplos alvos, ameaça ativa, zumbis presentes/cadáveres/ressurreições já gastas e estado adversarial sem jogadores. 25% das sementes testam última habilidade, e nas fases 2/3 outros 25% testam introdução de fase. Sequências mantêm combate/mesa congelados, mudando só rodada e histórico de seleção; **não são partidas completas**.

O cenário `repeat_only` sem jogadores é adversarial, não uma mesa normal. `full_resource` pode produzir estado terminal da Matriarca. Vazios legítimos desses cenários não devem ser eliminados à força. Nenhum número abaixo é taxa de vitória, telemetria de partidas, benchmark de aparelho físico ou garantia de balanceamento.

### Catálogo e média de elegíveis por fase

Média sobre os mesmos 15 cenários, inclusive adversariais. Catálogo exclui Renascimento/debug-only.

| Chefe | Catálogo F1/F2/F3 | Elegíveis F1 antes→depois | F2 | F3 |
|---|---|---|---|---|
| Banqueiro | 4/8/8 | 4,00→4,00 | 7,80→7,80 | 7,80→7,80 |
| Dominadora | 4/8/12 | 3,20→3,20 | 6,80→6,80 | 9,40→9,40 |
| Matriarca | 3/7/10 | 2,20→2,20 | 5,73→5,73 | 7,73→7,73 |
| Dimitrescu | 4/7/8 | 2,73→2,73 | 4,73→4,73 | 5,73→5,73 |
| Nehelenia | 7/10/11 | 4,60→4,87 | 6,13→6,40 | 7,07→7,33 |
| Nemesis | 5/8/11 | 2,13→3,07 | 2,87→4,00 | 5,07→6,67 |

### Casos sem seleção e repetição

| Chefe | Sem seleção em 2.880 antes→depois | Repetiu último em 2.880 | Vazios sequenciais em 720 | Repetições sequenciais | Maior sequência nova |
|---|---|---|---|---|---|
| Banqueiro | 0→0 | 0→0 | 0→0 | 0→0 | 1 |
| Dominadora | 256→256 | 0→0 | 64→64 | 0→0 | 1 |
| Matriarca | 81→64 | 0→17 | 48→16 | 0→60 | 16 |
| Dimitrescu | 0→0 | 0→0 | 0→0 | 0→0 | 1 |
| Nehelenia | 192→192 | 0→0 | 48→48 | 0→0 | 1 |
| Nemesis | 822→128 | 0→49 | 240→32 | 0→15 | 16 |

Repetições novas são da **única opção válida** nos estados congelados/adversariais, não uma regressão da proteção contra repetir com alternativas. Nemesis restante sem seleção: cenário sem jogadores nas fases 1/2 (64 sementes cada). Nehelenia: mesmo cenário nas três fases. Matriarca: estado terminal/sem candidatos na fase final. Dominadora também conserva casos com mão unitária sem alvo/ordem válida. Não alterar pesos para esconder esses estados.

### Exemplo de exclusões corrigidas

| Cenário/chefe | Fase | Elegíveis antes→depois | Causa |
|---|---|---|---|
| Mão fraca, Nemesis | 1 | 0→3 | Provas de ataque/jogo/repulsão retiravam Caçada, Tentáculo e Invasão. |
| Mão fraca, Nemesis | 2 | 0→4 | Idem; Impacto agora aceita jogo extensível sem carta imediata. |
| Mão fraca, Nemesis | 3 | 1→7 | Ômega era quase o único; entram Caçada, Tentáculo, Barragem, Extermínio, Invasão e Impacto. |
| Mesa vazia/fechada, Nemesis | 3 | 1→5 | Devorador, Impacto e Extermínio continuam sem destino válido; demais desafios não exigem mesa. |
| Pressão e mão fraca, Nehelenia | 1/2/3 | 3/4/5→5/6/7 | Laço e Prisão deixam de exigir cartas de solução. |
| Mesa vazia, Matriarca | 1 | 1→1 | Elegibilidade não muda, mas 5/64 sorteios vazios viram repetição válida de Orvalho. |
| Sem jogadores, Nemesis | 3 | 1→1 | 49/64 vazios artificiais viram Ômega; nenhum alvo fictício criado. |

JSON registra exclusões por habilidade/cenário/fase e soma por filtro, permitindo distinguir falta de alvo obrigatório de prova removida. Para o baseline, que não tinha `reasonCode`, usa identificador `payload/prerequisite:<id>` e as condições antigas descritas acima.

## Frequência de cada habilidade

Ocorrências em 2.880 sorteios condicionais por versão/chefe. Contagem zero/vazio não é redistribuída. Pesos intactos.

| Chefe | Habilidade | Antes | Depois |
|---|---|---:|---:|
| Banqueiro | Juros Fixos | 677 | 677 |
| Banqueiro | Taxa de Manutenção | 394 | 394 |
| Banqueiro | Bloqueio de Crédito | 196 | 196 |
| Banqueiro | Limite de Crédito | 516 | 516 |
| Banqueiro | Juros Compostos | 356 | 356 |
| Banqueiro | Auditoria de Naipe | 417 | 417 |
| Banqueiro | Penhora | 108 | 108 |
| Banqueiro | Sobretaxa do Lixo | 216 | 216 |
| Dominadora | Coleira | 446 | 446 |
| Dominadora | Escolha Forçada | 362 | 362 |
| Dominadora | Exposição | 178 | 178 |
| Dominadora | Troca Forçada | 242 | 242 |
| Dominadora | Mãos Atadas | 199 | 199 |
| Dominadora | Posse | 126 | 126 |
| Dominadora | Etiqueta de Ferro | 357 | 357 |
| Dominadora | Favorita | 196 | 196 |
| Dominadora | Dupla Coleira | 179 | 179 |
| Dominadora | Separação | 171 | 171 |
| Dominadora | Controle Absoluto | 92 | 92 |
| Dominadora | Quebra de Vontade | 14 | 14 |
| Dominadora | Ordem Final | 62 | 62 |
| Matriarca | Semente Viva | 392 | 392 |
| Matriarca | Raiz Faminta | 506 | 506 |
| Matriarca | Orvalho Restaurador | 644 | 661 |
| Matriarca | Trepadeiras Gêmeas | 235 | 235 |
| Matriarca | Enxerto | 161 | 161 |
| Matriarca | Pólen do Lixo | 223 | 223 |
| Matriarca | Colheita | 180 | 180 |
| Matriarca | Florescimento Real | 267 | 267 |
| Matriarca | Casulo Esmeralda | 183 | 183 |
| Matriarca | Coroa da Primavera | 8 | 8 |
| Dimitrescu | Tributo de Sangue | 828 | 828 |
| Dimitrescu | Vinho Carmesim | 42 | 42 |
| Dimitrescu | Marca Carmesim | 414 | 414 |
| Dimitrescu | Banquete dos Mortos | 251 | 251 |
| Dimitrescu | Coágulo Carmesim | 41 | 41 |
| Dimitrescu | Portas do Castelo | 171 | 171 |
| Dimitrescu | As Três Filhas | 482 | 482 |
| Dimitrescu | Sangue Impuro | 651 | 651 |
| Nehelenia | Jogo Espelhado | 411 | 411 |
| Nehelenia | Siga o Reflexo | 678 | 629 |
| Nehelenia | Espelho do Lixo | 256 | 242 |
| Nehelenia | Prisão no Espelho | 13 | 28 |
| Nehelenia | Pesadelo Eterno | 233 | 223 |
| Nehelenia | Laço do Tigre | 169 | 275 |
| Nehelenia | Presa Marcada | 135 | 135 |
| Nehelenia | Olho do Falcão | 338 | 321 |
| Nehelenia | Vigilância | 10 | 10 |
| Nehelenia | Mão no Espelho | 365 | 334 |
| Nehelenia | Reflexo Invertido | 80 | 80 |
| Nemesis | Invasão da Horda | 236 | 502 |
| Nemesis | Caçada S.T.A.R.S. | 363 | 577 |
| Nemesis | Tentáculo Infeccioso | 327 | 527 |
| Nemesis | Zona Contaminada | 176 | 176 |
| Nemesis | Comando da Horda | 26 | 26 |
| Nemesis | Lança-Foguetes | 258 | 355 |
| Nemesis | Regeneração Parasita | 6 | 6 |
| Nemesis | Reanimação Viral | 8 | 8 |
| Nemesis | Barragem de Tentáculos | 186 | 284 |
| Nemesis | Extermínio S.T.A.R.S. | 90 | 137 |
| Nemesis | Surto Ômega | 382 | 154 |

Ômega cai porque deixa de monopolizar estados em que os demais desafios eram artificialmente inelegíveis. Prisão/Laço sobem por ampliação legítima de alvos. Banqueiro/Dominadora/Dimitrescu têm distribuição idêntica na amostra; Matriarca só ganha seleções antes vazias.

### Zumbis

| Zumbi | Escolhido na rotação antes→depois | Elegível em 45 probes isolados | Sorteado entre os três elegíveis (1.024) antes/depois |
|---|---|---|---|
| Agarrador | 88→196 | 18→33 | 364/364 (35,55%) |
| Infectado | 86→203 | 18→33 | 322/322 (31,45%) |
| Devorador | 62→103 | 18→27 | 338/338 (33,01%) |

No A/B com os três disponíveis, o mesmo índice seeded produz exatamente a mesma distribuição. A amostra finita não exige 33,33% exatos. Fora desse conjunto, Devorador tem menos estados elegíveis por mesa inexistente/fechada. Agarrador tem dependência de carta com saída; Infectado precisa de turno restante, não de mão já resolvida. Todos respeitam lifecycle/teto. Evitar o último repelido ocorre só depois de construir candidatos e somente havendo alternativa; esse trecho já estava correto.

## Testes e interface

- Baseline ampla: **1.228/1.228**.
- Novas regressões: **27**; objetivos impossíveis, punição única, reload/undo, marca/topo/último descarte, cap/cadáver/ressurreição, destino extensível, Prisão/Laço sem solução, última opção, fase-intro, seleção determinística nos seis chefes e BOT terminando legalmente desafios impossíveis.
- Focados finais: **1.062/1.062** (`boss*.test.mjs`, `nemesis*.test.mjs`, `nehelenia*.test.mjs`, `dimitrescu*.test.mjs`).
- Suíte ampla final: **1.255/1.255**, zero falhas/cancelamentos/skip/todo; 27 novas regressões sobre as 1.228 da baseline.
- Edge headless, renderer real: `nemesis-ui.browser.mjs` passou 1920×1080, 1024×768, 844×390, 390×844 e 3840×2160; alvo/ajuda/teclado/toque, snapshot concorrente, lifecycle/cores e descarte. `boss-hud-ux.browser.mjs` passou seis chefes em desktop/tablet 1920/1376/1024 e mobile390, overflow, ajuda e reduced motion.
- Dois testes de browser tinham expectativas textuais anteriores ao polimento já commitado (expulsar/expulsá-lo; texto dos gatilhos de fase e bônus Infectado). Ajustadas apenas assertions para a ajuda atual e mesmos valores; nenhuma mudança de UI para satisfazer strings antigas.

Comandos adicionais: `node --test tests/*.test.mjs`; `git diff --check`. Browser utiliza `PLAYWRIGHT_PATH` configurado no runtime local e Edge instalado. Logs/JSON/screenshots em `.cache/`; não foram adicionados ao Git. Sem prova de dois clientes Firebase reais ou testes em aparelhos físicos.

`git diff --check`: passou, sem erro de whitespace. Git avisa a conversão configurada LF→CRLF, sem erro. `git diff --stat` cobre os 12 arquivos já rastreados; quatro arquivos novos ainda não rastreados são relatório/script/fixture/regressões listados abaixo. Nada foi adicionado ao stage automaticamente.

## Risco e proposta separada de balanceamento

Mais desafios sem solução aumentam pressão e persistências possíveis. Esse é o comportamento solicitado, mas pode mudar a dificuldade real sem alterar nenhum número. Reanimação/Regeneração/Coroa/Vigilância continuam raras nesta matriz por dependências específicas, não por pesos comprovadamente insuficientes. Não subir pesos com base nesses números condicionais.

Próximo passo proposto, não implementado: playtest de batalhas completas dos seis chefes, registrando fase, conjunto elegível, anúncio, sucesso/parcial/falha, zombie/lifecycle e motivo final. Comparar a participação **quando elegível**, separando fase-intro. Só então discutir pesos se variedade continuar insuficiente. Não há evidência aqui para declarar taxa de vitória ou rebalancear automaticamente.

## Arquivos

Produção: `js/boss/boss-engine.js`, `js/boss/mechanics/nemesis.js`. Instrumentação: `scripts/boss-eligibility-audit.mjs`, `tests/boss-eligibility-fixture.mjs`. Regressões: `tests/boss-eligibility-audit.test.mjs`, `tests/nemesis-boss.test.mjs`, `tests/nemesis-devourer-entry.test.mjs`, `tests/boss-rework-october.test.mjs`, `tests/nemesis-ui.browser.mjs`, `tests/boss-hud-ux.browser.mjs`.

Documentação: este relatório, `DOCUMENTACAO_CHEFE_DA_MESA.md`, `INVENTARIO_HABILIDADES_CHEFES.md`, `CHECKLIST_REGRESSOES_E_ATUALIZACOES.md`, `REWORK_NEMESIS_MATRIARCA_E_UX_DIMITRESCU_2026-10-08.md` e nota de atualização em `ARQUIVO_HISTORICO/BALANCEAMENTO_NEMESIS.md`. Nenhum arquivo de estratégia do BOT, definição numérica de chefe, CSS, asset ou Service Worker alterado.
