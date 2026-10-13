# CHECKLIST-MESTRE — Playtest dos chefes (10/10/2026)

**Adendo implementado em 13/10/2026:** novo dano incremental 100/200/500/1000 e HPs2650/2800/2300/2400/2500/2000 (Banqueiro/Dominadora/Matriarca/Nehelenia/Nemesis/Lady), nerfs pontuais aprovados e compra do BOT sem tentativa de resgate do Cofre fechado. [Valores, testes e compatibilidade](BALANCEAMENTO_SEIS_CHEFES_2026-10-13.md). Não reabre os P0/P1 já concluídos. Homologação humana do novo pacote permanece pendente; meta ~70% de vitórias dos chefes não foi aferida. Os valores de itens de 10/10 abaixo são históricos: o pacote vigente de12/10 mantém Explosivo100+15 e petrificações80/110/100/160/160, preservados neste lote.

**Ajuste final de 10/10/2026:** Explosivo/Granada causa **100 HP imediatos + 20 HP por rodada até a morte**, sem acumular sangramentos; petrificação −50 HP máximo, regen20/10 e Adaga80% preservados. Referências a impacto60 em experimentos abaixo são históricas, não valores atuais. Resultados anteriores não foram recalculados.

## Resumo executivo do checklist — estado em 10/10/2026

Este é o único backlog de acompanhamento do playtest; handoff e relatórios apontam para ele. **Conclusão técnica e homologação humana são status separados.** Caixa P0 aberta não autoriza refazer a correção já entregue. Preserve os registros detalhados abaixo como rastreabilidade do checklist original e suas decisões posteriores.

### Concluído tecnicamente

| Itens | Entrega | Evidência |
| --- | --- | --- |
| P0-01–P0-11 | Correções implementadas e testadas: handlers/itens, Frasco, Lixo, HUD, nomes, retrato Nehelenia, chips Fish Eye, Daniela, timer dos seis chefes, chip de item e nome visual | [Etapa 1](ETAPA_1_PLAYTEST_P0_2026-10-10.md); exceção: string anômala P0-07 não reproduzida |
| P1-02–P1-05 e P1-08 | Pacote B aplicado; impacto do Explosivo posteriormente aumentado a100; demais valores preservados | [Etapa 2](ETAPA_2_DIMITRESCU_2026-10-10.md), última suíte1.384/1.384 |
| P1-06/P1-07 — parte experimental | Comparação A/B, sensibilidade450 HP/Adaga60–100 e petrificação já analisadas em1.344 batalhas | Relatório e JSON da Etapa 2; não reaplicar450 ou repetir estudo como pendência automática |
| P2-01–P2-03 | Auditoria de variedade e dois designs da Lady entregues; designs não implementados | [Balanceamento](BALANCEAMENTO_SEIS_CHEFES_2026-10-10.md) e [propostas](PROPOSTAS_DIMITRESCU_2026-10-10.md) |
| P2-06–P2-14 | Especial comum aos seis chefes, cinco do Lixo, mínimo cinco,25/50/100 incremental, custo100 reutilizável, bloqueios/reações/undo/reload e comparação pareada | [Pacote consolidado](PACOTE_CONSOLIDADO_CHEFES_2026-10-10.md) |
| P3-04 | Documentação local, inventário e relatórios atualizados; não inclui escrita no Google Doc remoto | [Guia dos documentos](README.md) |
| Refinamentos posteriores | Espaçamento original da mão restaurado; textos em linhas; destaque focal de cartas; Espelho com folga temporária; gotas orgânicas; chip Adaga compacto | Etapas 1/2 e adendo do pacote consolidado |

### Pendências reais de decisão/evidência/trabalho futuro

- **P0-07:** string “jarcado” não localizada. Precisa de captura/log/estado exato para identificar; ajuda e separação atual/persistente já foram corrigidas. Não inventar uma nova causa.
- **P2-02:** aprovar ou revisar Bifurcação Carmesim e Salão das Duas Sombras antes de qualquer implementação. A entrega dos designs está concluída.
- **P3-01:** revisão final de consistência/acessibilidade dos chips de todos os chefes, sem refazer refinamentos entregues ou aumentar a interface inteira automaticamente.
- **P3-02:** experimentos de habilidades futuras só depois de aprovação; não repetir auditoria de variedade já concluída nem inferir dificuldade humana pelo BOT.
- **P3-06:** aprovar apresentação final da barra e seis animações temáticas; depois implementar apenas o aprovado. Visual funcional/animatic provisório já existe. Este item deve ser lembrado antes do encerramento do projeto.
- Google Doc remoto histórico não sincronizado: trabalho documental externo separado, não bug de gameplay nem tarefa autorizada automaticamente por este resumo.

### Depende apenas de homologação/playtest humano na implementação atual

- **P0-01–P0-11 / P3-05:** dois clientes Firebase autenticados, latência/reconexão, tablet físico, toque nos itens, cartas próximas, help, HUD, timeout ausente, undo/reload e morte. P0-07 tem também a pendência de evidência descrita acima.
- **P1-01 e aceite final P1-06/P1-07:** dificuldade pósB/impacto100, primeira/última filha, regen/sangramento, dano transmitido à Lady e Vínculo restante. Não aplicar outro nerf antes de novo pedido.
- **P2-04/P2-05/P3-03:** validar estagnação, acesso à carga100 e benefício do Especial após Mortos e Monte30–20. Métricas/traços e144 batalhas já existem; cobertura parcial de tempo humano, bloqueios e taxa humana não deve ser chamada de ausente nem de concluída. Coletar em partidas reais; se faltarem campos, especificar a lacuna antes de autorizar instrumentação adicional.
- Aceite visual/performance do Especial em hardware real e efeitos/bloqueios; não há homologação Firebase/tablet físico comprovada pelos fixtures.

**Última verificação registrada:**1.384 testes aprovados após Explosivo100; browser Lady1920/1376/390; `git diff --check` sem erros. As quatro resoluções da Etapa 1/pacote consolidado são evidência anterior, não uma nova rodada pós100. Resumo documental não executou novamente gameplay.

## Decisão vigente — pacote consolidado e correção posterior do usuário

O Especial foi autorizado para implementação nos seis chefes. A correção feita durante a execução **substitui a origem Monte do pacote inicial**: retirar exatamente **5 cartas físicas do topo do Lixo**. Com 0–4 cartas, não ativar nem gastar pontos. Respeitar bloqueios do Lixo e disparar Daniela, Pólen, Ágio e Espelho. Compra normal separada; acumulador compartilhado25/50/100, gasto100, reutilização e excedente preservado, sem cooldown ou exigência de Mortos/fase/Monte baixo. BOT não gasta automaticamente; humano pode escolhê-lo como beneficiário.

O pacote B da Lady continua500 HP por filha, regen20/10, Adaga80%, impacto100 + hemorragia20 permanente sem stack. As propostas novas não foram implementadas. Relatórios atuais: `PACOTE_CONSOLIDADO_CHEFES_2026-10-10.md`, `BALANCEAMENTO_SEIS_CHEFES_2026-10-10.md` e `PROPOSTAS_DIMITRESCU_2026-10-10.md`. Registros das etapas anteriores abaixo são históricos: “não implementar Especial neste lote” vale para a etapa1, não para este pacote.

**Estado atual:** implementação e testes locais concluídos conforme o resumo; homologação humana separada. Base original: relatos de três partidas de dois humanos em tablet, quatro capturas e vídeo da Dimitrescu. Não confundir observado, verificado no código, simulado e homologado.

**Objetivo:** impedir perda de requisitos entre prompts enviados ao Codex. Corrigir primeiro bugs que impedem jogar, medir depois, e só então aplicar buffs, mecânicas novas e balanceamento global. Não fazer commit, push ou deploy automaticamente.

## LEGENDA
- **[ ] P0 / AGORA — Correção funcional/UX confirmada ou prioritária.**
- **[ ] P1 / TESTAR — Balanceamento candidato ou redesign aprovado conceitualmente, números sujeitos a comparação.**
- **[ ] P2 / PROJETAR — Precisa fechar especificação antes de implementar.**
- **[ ] P3 / POSTERIOR — Polimento e expansão depois do núcleo validado.**
- Caixa marcada significa entrega técnica indicada no item; aceite humano precisa de evidência própria. P0 mantém suas caixas de aceite final abertas, mas suas correções técnicas não devem ser reabertas por isso.

## I. P0 — BUGS E CORREÇÕES PARA AGORA

- [ ] **P0-01: Granada/Explosivo não responde ao toque/click no ícone em determinada carta da mão; Relíquia ao lado abre menu normalmente.** Evidência: vídeo anexado `Buraco – Firebase - Google Chrome 2026-10-10 09-54-04.mp4`, 15,15 s; Relíquia tem menu de filhas funcional por volta de 9 s. O vídeo apoia o contraste visual, mas não identifica sozinho a causa da Granada. Investigar sobreposição de camada/área clicável, `castleItemUseButton`, `createBossCombatHelp`, evento de seleção da carta e re-render, item metadata/`consumed`, `canUseCastleItem` e guarda `pickedDiscardCardId`, mão após compra, descartes legais, outros bloqueios, evento delegado, z-index, tanto mouse quanto toque. Reproduzir com item Explosivo em várias posições da mão e com Relíquia ao lado; examinar hits no DOM; reportar motivo quando inabilitado, nunca silêncio. Sem regressão de selecionar/baixar carta e aplicar item. Não presumir que efeito explosivo em si é inválido.
- [ ] **P0-02: Frasco de Frio em partida humana cooperativa às vezes deixa de ser utilizável.** Diferenciar restrição legítima (sem compra concluída, cartão comprado do Lixo, último descarte, bloqueios, estado do turno) de falha. Reproduzir com segundo jogador em outro turno, Frasco anterior em Cassandra, seleção/estado sincronizado, recarga e undo. Não obrigar descarte para destravar interação.
- [ ] **P0-03: Item descartado no Lixo perde símbolo/informação antes do consumo real.** Ícone e metadata devem permanecer na carta não consumida ao mudar mão→Lixo→mão de parceiro; só perder ao ser efetivamente usado em filha e, depois que a filha morre, retornar ao fundo do Lixo como carta consumida sem item utilizável. Conferir saves/undo/multiplayer e 108 IDs físicos.
- [ ] **P0-04: Layout da Dimitrescu em tablet.** Lady/HUD invade as filhas (especialmente Bela); itens comprimem barra PRÓXIMA FASE; corrigir geometria e hierarquia de blocos sem esconder informação. Screenshots de 1376×1032, variando fase e itens; também 1024×768, 390, 1920. Checar conteúdo real, zoom, landscape/portrait e overlays.
- [ ] **P0-05: Nome comprido do BOT/jogador no Nemesis invade o HUD.** Limitar largura nos pontos de S.T.A.R.S./chips lateral/HUD e truncar com nome completo disponível em ajuda, sem cortar cliques. Testar nomes longos 12/24/40 caracteres; 1024×768 e outros viewports.
- [ ] **P0-06: Nehelenia — remover rachaduras/espelho quebrado sobre o retrato principal.** O usuário nunca pediu overlay ali. Manter o indicador mecânico apenas na área dos espelhos. Auditar CSS `boss-nehelenia-dream-stolen` e pseudo-elementos; não mudar a habilidade.
- [ ] **P0-07: Fish Eye/Nehelenia — duas habilidades visíveis, texto estranho ('jarcado'/similar) e chips não clicáveis.** Investigar coexistência de `fish_marked_card`, `fish_inverted`, `nehelenia_fish_dead_card`, `nehelenia_inverted_reflection`, nomes, state transitions, reload; separar habilidade atual e efeito persistente; chips explicativos devem abrir popover por toque/teclado. Coexistência PODE ser legítima, rótulo quebrado e silêncio não. Encontrar string exata em logs/reprodução, não inventar.
- [ ] **P0-08: Daniela — Lixo não informa a passiva `LIXO +3`.** A passiva efetiva existe; conferir critério de overlay/destaque versus `danielaPassiveActive`; mostrar antecipadamente quando compra legal do Lixo disparará +3 Sede, retirar destaque após reação, inibir em morte/supressão. Não confundir com habilidades especiais nem aplicar sangue duas vezes. Preservar o funcionamento e as marcações corretas da Bela e da Cassandra; não causar regressão nessas duas passivas.
- [ ] **P0-09: Desativar tempo individual de turno e autoplay por timeout SOMENTE no modo Chefe (todos os seis).** Preservar duração total da partida e limites dos modos não-Chefe. Verificar servidor/local, timer ao relogar, pausa, turnos humanos/BOT e sincronização. Não só ocultar contador; desativar punição/autoação por vencimento. Manter recuperação de BOT travado distinta do cronômetro.
- [ ] **P0-10: HUD/chip informativo NO ITEM DA MÃO sem impedir o uso normal da carta.** Preservar rank, naipe, ilustração e área principal clicável da carta: tocar na carta continua selecionando/baixando/descartando normalmente; tocar no ícone/chip do item abre sua explicação e o fluxo de uso/sacrifício, com área de toque própria e sem propagação indevida. O rótulo compacto, preferencialmente retangular, deve mostrar de imediato o efeito e, se couber sem poluir, o valor de dano/petrificação (exemplos `−100 DANO · SANGRA`, `−100 HP MÁX · FRIO`, `−75 HP MÁX · REGEN ↓`, `VÍNCULO 80%`, `SILENCIA`). Não colocar chip por cima do número/naipe ou bloquear a superfície para clicar na carta. Se o espaço for insuficiente, resumir no chip e detalhar no popover acessível: HP máximo removido, dano imediato, buff/debuff, duração, alvo, condição de uso e se está consumido. Testar cartas com itens lado a lado, sobreposição de mãos no tablet, tap/click longo, zoom, dois humanos e uso/descarte normal.
- [ ] **P0-11: Renomear visualmente `Frasco de Frio` para `Frasco Congelante`.** Conservar ID `cold_flask`, PNG interno e compatibilidade de saves. Atualizar tooltip/chips/ajuda/documentação.

**Testes de aceite P0:** navegador real com viewport 1024×768, 1376×1032, 1920×1080 e 390; sessão com dois jogadores humanos, cartas com vários tipos de item em posições intercaladas, clicks/toques, alvos mortos/vivos, relogin/undo, mão/Lixo/Morto; screenshot antes/depois; suíte ampla. Registrar causa para cada falha; não marcar [x] apenas porque teste unitário passou.

### Registro da execução da etapa 1 — 10/10/2026

Referência: [relatório técnico, testes e evidências](ETAPA_1_PLAYTEST_P0_2026-10-10.md).

| Item | Resultado técnico deste lote | Pendência para fechar a caixa |
| --- | --- | --- |
| P0-01 | Reproduzido em HEAD e corrigido: atualização da face removia o handler do item. Mouse/toque e várias posições cobertos. | Homologação humana no Firebase. |
| P0-02 | Reaplicação pelo parceiro passa; impedimentos legítimos têm explicação. Não há trava nova do Frasco. | Confirmar o caso original na partida humana. |
| P0-03 | Ícone no Lixo corrigido; metadata/108 IDs, consumo e retorno após morte verificados. | Homologação humana. |
| P0-04 | HUD e próxima fase contidos; filhas sem sobreposição, quatro resoluções e fases diferentes. | Homologação no tablet real. |
| P0-05 | Nomes de 12/24/40 caracteres contidos; nome completo na ajuda. | Homologação humana. |
| P0-06 | Overlay removido do retrato; indicadores mecânicos preservados. | Revisão visual do usuário. |
| P0-07 | Atual e persistentes separados; chips abrem ajuda por toque/teclado. | Texto “jarcado” não localizado/reproduzido; falta evidência exata. Homologação humana. |
| P0-08 | LIXO +3 ligado à passiva real; sai após reação/morte/supressão. Cobrança única testada. | Homologação humana. |
| P0-09 | Sem timeout humano nos seis chefes; duração total, outros modos e watchdog de BOT preservados. | Homologação após relogar em dois clientes Firebase. |
| P0-10 | Efeito curto no item, clique independente da carta; toque/naipe/ordenação e itens próximos verificados. | Homologação no tablet real. |
| P0-11 | Nome visual Frasco Congelante; `cold_flask` e asset preservados. | Revisão do usuário. |

As caixas P0 continuam abertas conforme a legenda: testes automatizados e dois clientes com snapshots simulados **não substituem** revisão do usuário nem uma sessão Firebase real. Nenhum item parcial foi marcado como concluído.

**Especial na etapa1 histórica:** P2-07/P2-08 registravam somente a decisão, ainda sem implementação naquele lote. O pacote consolidado posterior autoriza a implementação especificada acima. P3-06 continua pendente de aprovação do visual definitivo e das animações heroicas.

## II. P1 — REDESIGN/BALANCEAMENTO DA LADY (APÓS BUGS CRÍTICOS)

### Relato do playtest
- [ ] **P1-01: Resistência da Lady e filhas excessiva no jogo humano.** Usuários tiveram dificuldade em matar a última filha Daniela; Lady quase intacta (menos de ~40 dano relatado), Vínculo/escudo praticamente não rompido. Problema sistêmico: 3 filhas × 500 HP, até 50 regeneração por rodada, pouca vantagem duradoura dos itens, mais dificuldade de montar canastras quando os Mortos acabam. Medir tempo/dano total por rota.
- [x] **P1-02: Explosivo/Granada permanente aplicado após aprovação.** 100 dano imediato + 20 HP de hemorragia por rodada até a morte. Um único sangramento; reaplicação causa outro impacto, sem somar ticks ou disparar tick extra na mesma rodada. Testes cobrem oito rodadas, replay, morte e interação com regen20/10/Frio.
- [x] **P1-03: Regeneração final aplicada — pacote B.** 50→20 HP por rodada; Anticoagulante 25→10 permanente, sem reduzir além disso por duplicatas. Filhas não selecionadas continuam regenerando. HP500 e petrificação preservados.
- [x] **P1-04: Adaga final aplicada — 80%.** Transmite 80% do dano efetivo de ataques à filha diretamente ao HP da Lady, sem consumir PROT./Coágulo. Não soma percentual por duplicatas, transmite overkill, itens ou hemorragia. Cobertura humano/BOT/Ataque Final, morte da Lady e replay.
- [x] **P1-05: Frasco Congelante/Relíquia preservados e testados com B.** Frasco bloqueia até duas regenerações efetivas, guardando carga na vida cheia; esgotadas as cargas, regen volta a20/10. Relíquia suspende uma oportunidade válida atual/próxima, sem silenciamento eterno.
- [x] **P1-06: Análise de petrificação e HP máximo concluída tecnicamente.** Sensibilidade500/450 e piso analisados na Etapa 2; mantidos500 HP e perdas25/50/75/100/100. Aceite da dificuldade depende de humanos; **não implementar450 automaticamente**.
- [x] **P1-07: Experimento A/B e sensibilidades entregues.**1.344 batalhas,64 sementes,7 configurações e3 rotas; métricas e limitações na Etapa 2. Impacto60 desse lote é histórico, anterior ao buff100. Não confundir simulação com win rate humano; não repetir o estudo como tarefa ainda não executada.
- [x] **P1-08: Pacote B aprovado pelo usuário e aplicado localmente.** 500 HP; regen20/10; Adaga80%; impacto100 + sangramento20 permanente, sem stack. Saves v2 atualizados uma vez; legado v1 preservado. Documentação, ajuda/chips, animações e regressões atualizadas. Sem commit/push/deploy. P1-01 continua pendente de novo playtest humano: implementação aprovada não prova dificuldade final.

### Registro da etapa 2 — comparação histórica e aplicação aprovada

Referência: [relatório comparativo e polimento solicitado](ETAPA_2_DIMITRESCU_2026-10-10.md) e [dados agregados](experiments/dimitrescu-stage2-2026-10-10.json).

Executadas 1.344 batalhas com 64 sementes pareadas, sete configurações e três rotas. Baseline50/25/Adaga30/sangramento50×2; A25/10/Adaga80/sangramento20 permanente experimental; B20/10/Adaga80/sangramento20 permanente experimental; HP450 e Adaga60/100 medidos separadamente. Petrificação preservada e diferenças percentuais de HP450 documentadas. Reaplicação proposta: uma hemorragia20, sem stack e sem tick adicional na mesma rodada.

As políticas automáticas facilitaram a primeira morte, mas não demonstraram vitória consistente; **não são win rate humano nem resultado do BOT de produção**. Após esse relatório, o usuário aprovou explicitamente a aplicação de B: configuração final implementada nos números acima. Novo playtest humano continua necessário para avaliar a dificuldade, sem impedir o patch autorizado. P0 preservado, com remoção expressamente solicitada do espaçamento extra entre cartas; ajustes de espelho, texto em linhas e contraste registrados no relatório. O Especial ainda não existia nessa etapa2; o pacote posterior é descrito no topo.

## III. P2 — VARIEDADE DOS CHEFES

- [x] **P2-01: Auditoria técnica de distribuição/elegibilidade por fase:** catálogos Dominadora13, Nemesis11, Nehelenia11, Matriarca10, Banqueiro8, Lady8; 144 batalhas,17.280 sorteios condicionais e4.320 sequenciais no relatório `BALANCEAMENTO_SEIS_CHEFES_2026-10-10.md`. Não representa frequência humana.
- [x] **P2-02: Duas propostas completas para Lady:** `Bifurcação Carmesim` e `Salão das Duas Sombras`, em `PROPOSTAS_DIMITRESCU_2026-10-10.md`. Tema, fases/pesos candidatos, elegibilidade, sucesso/parcial/falha, interações, HUD/help, animação e testes especificados. **Aprovação e implementação ainda pendentes**, não adicionadas à rotação.
- [x] **P2-03: Avaliação técnica de variedade dos demais chefes:** relatório por fase e habilidade; Banqueiro não foi artificialmente elevado a13. Nenhum peso/elegibilidade mudou. Validar incômodo com repetição em playtest humano antes de expansão.

## IV. P2 — ESTAGNAÇÃO DE FINAL DE PARTIDA, TODOS OS CHEFES

### Evidência humana
- [ ] **P2-04: Investigar “partida trava”** por volta de 30–20 cartas no Monte, especialmente depois de ambos os Mortos serem retirados: mãos pequenas, extensões impossíveis, Lixo protegido e turnos de comprar/descartar sem dano. Relatado em ~3 partidas cooperativas; precisa de logs medidos, não pressupor percentuais.
- [ ] **P2-05: Instrumentar métricas**: número de turnos sem baixar carta, sem dano, média/tamanho de mão, Monte e Lixo por rodada, Mortos consumidos, fontes dos descartes, quantas vezes pickup integral do Lixo foi ilegal, restrições ativas, causas de derrota, tempo, WinRate por chefe e por política, eventos de canastra/dano.
- [x] **P2-06: Decisão universal fechada pelo usuário:** Especial reutilizável de5 cartas do topo do Lixo, não outras regras de recuperação. Não dividir automaticamente Lixo entre jogadores nem alterar a compra normal.

## V. P2 — ESPECIAL COOPERATIVO UNIVERSAL — especificação vigente

**Intenção confirmada e implementada localmente:** recuperação voluntária de5 cartas do Lixo nos seis chefes. Arte heroica final permanece em proposta; não há imagens externas novas.

- [x] **P2-07:** acumulador compartilhado, beneficiário escolhido entre os cooperadores, inclusive BOT por escolha humana.
- [x] **P2-08:**25/50/100 por ID canônico, diferença25/50/75 nas evoluções, sem teto de saldo;200 permite duas ativações.
- [x] **P2-09:** sem janela de fase, Mortos, Monte baixo ou mão pequena. Respeitar pausa, ação em andamento e bloqueios do Lixo.
- [x] **P2-10:** exatamente5 do topo do Lixo;0–4 não ativa. Não mexer no Monte. Itens e IDs preservados. Efeitos de retirada existentes continuam. O Especial não exige encaixar imediatamente o topo como uma compra normal; a regra normal de Lixo protegido permanece intacta fora dessa recuperação especial.
- [x] **P2-11:** reutilizável,100 por uso, excedente preservado; transação com revisão, deduplicação, reload e undo. Uma solicitação concorrente da mesma revisão vence; a outra não gasta. Homologação Firebase real ainda pendente.
- [x] **P2-12:** visual funcional ao lado do X nos controles do jogador, fora do HUD do chefe,100px (92 no celular),16px visuais e28px de toque, ajuda curta e escolha. Aprovação visual definitiva no P3-06.
- [x] **P2-13:** comparação pareada concluída:144 batalhas (12 pares/chefe), traços completos, janela30–20 e limites da cobertura registrados. Browser nas quatro dimensões;20 ciclos de animatic/viewport, até5 nós, zero resíduos. **Não demonstra resolver o travamento humano**; homologação física/Firebase continua pendente.
- [x] **P2-14:** uma implementação comum aos seis chefes, sem automatizar gasto pelo BOT de produção.

## VI. P3 — POSTERIORES / NÃO ESQUECER
- [ ] **P3-01:** Refinar visual de chips, hit targets e tooltips de todos os chefes conforme padrão consistente e suporte a toque/teclado (não só Dimitrescu e Fish Eye).
- [ ] **P3-02:** A/B de habilidades futuras em pelo menos 100–200 seeds por chefe/política, separando BOT e humanos; não declarar win rate humano por simulador guloso.
- [ ] **P3-03:** Playtest longo com dois humanos em tablet, registrar vídeo/log da rodada após os Mortos e validar se o especial reduz estagnação sem tornar desafios triviais.
- [x] **P3-04:** inventário oficial, documentação funcional, checklist de regressão e relatório local de balanceamento dos seis chefes atualizados para a implementação real. Cachev299 foi usado no pacote original; cache local atualv301; histórico de migração e lotes anteriores preservado. O ponteiro `.gdoc` não foi editado remotamente.
- [ ] **P3-05:** Inspeção final desktop/tablet/celular e sessão multiplayer real (Firebase) para cada bug P0.
- [ ] **P3-06 — ÚLTIMO ITEM DO CHECKLIST / LEMBRAR AO ENCERRAR:** após corrigir bugs, homologar balanceamento e implementar/testar o Especial Cooperativo, voltar para aprovar **a apresentação final da barrinha de poder** (pequena e discreta; botão/ícone integrado, arte/animação definitiva a decidir; posição ao lado do X já aprovada e aplicada) e **a animação temática de ativação para cada um dos seis chefes**. Não criar barra grande nem deixar a animação atrapalhar a partida. Incluir avaliação de acessibilidade, reduced motion, tablets e performance. **Trazer este item explicitamente à conversa antes de considerar o projeto encerrado.**

## VII. REGISTRO DAS DECISÕES
**Fechadas conceitualmente:** remover limite por turno (modo Chefe); renomear Frasco Congelante; preservar ícone de item descartado; eliminar overlay quebrado do retrato da Nehelenia; tornar chips Fish Eye interativos; corrigir Daniela Lixo; preservar a informação dos itens; buscar Explosivo permanente com hemorragia menor; investigar/implementar ferramenta de recuperação GLOBAL (se especificação aprovada); não mudar automaticamente o balanceamento dos seis chefes.

**Balanceamento fechado/aplicado:** HP500, regen20/10, Adaga80%, Explosivo100 + hemorragia20 permanente sem stack. **Especial fechado:**5 do topo do Lixo, mínimo5, bloqueios/reações respeitados,25/50/100 compartilhados, usos reutilizáveis a100. **Aguardando aprovação:** duas habilidades novas e apresentação heroica definitiva, não os números atuais do Especial.

## VIII. ORDEM PRÁTICA DE EXECUÇÃO
1. Homologar as correções já entregues em dois clientes Firebase/tablets; não repetir implementação P0.
2. Coletar evidência exata da string anômala Fish Eye se reaparecer.
3. Playtest humano da Lady pós100 e do ritmo/acesso ao Especial; sem novo balanceamento automático.
4. Aprovar designs futuros/P3-06; implementar somente mediante novo pedido. Não repetir A/B ou auditoria de variedade concluídos.

**Arquivos auditados:** `app.js` (`castleItemUseButton`), `js/boss/boss-engine.js` (`canUseCastleItem`), `js/boss/dimitrescu-castle.js` (`CASTLE_BALANCE`, `regenerateDaughters`, `sacrificeCastleItem`), `js/boss/bosses/dimitrescu.js`, `styles/boss/dimitrescu.css`. Reprodução do vídeo por si só não prova a causa da Granada. **Nota histórica da elaboração inicial:** naquele momento ainda não havia implementação. As entregas posteriores estão registradas no resumo e nos relatórios; não usar esta nota para reabrir P0.


## ADENDO DE DECISÃO — 10/10/2026 — ESPECIAL COOPERATIVO

**CONFIRMADO PELO USUÁRIO:** opção B (conquista progressiva), barra **COMPARTILHADA** para os seis chefes e pontuação por canastra: **Limpa +25, Real +50, Ás-a-Ás +100**. Uma Ás-a-Ás enche a barra imediatamente; também vale qualquer combinação que some 100. Mesmo jogo pontua somente a diferença ao evoluir, nunca duas vezes o valor total. Contar IDs físicos e tiers creditados, persistir e deduplicar em saves/undo/sync. Sem relação com a pontuação comum da partida.

**PROPOSTA HISTÓRICA SUPERADA:** desbloqueio pós-Mortos/Monte≤30 e um uso por partida foram rejeitados pelo pacote consolidado. A origem Monte desse pacote também foi corrigida pelo usuário: vale Lixo, mínimo5 e reações respeitadas, conforme seção vigente acima.

**PRIMEIRO LOTE AO CODEX — registro histórico, já executado:** somente bugs P0 com testes de interação em dois jogadores/tablet, inclusive Granada que não responde, Frasco Congelante, ícone do item no Lixo, chip informativo sem bloquear uso da carta, HUDs, Daniela/Fish Eye/Nehelenia e timer individual em modo Chefe. Não mudar HP/regen/adaga/sangramento, novas habilidades ou implementar Especial neste lote. O Especial fica especificado/documentado para fase posterior.


**LEMBRETE DE FECHAMENTO (adicionado em 10/10/2026):** a barra de carga aprovada é de 100 pontos (Limpa 25, Real 50, Ás-a-Ás 100), mas o visual final será escolhido apenas depois do Especial funcionar. O resultado deve ser compacto, integrado ao HUD, sem bloquear nem competir visualmente. Ao finalizar os trabalhos, revisar o P3-06 para fechar botão, orientação, posição e animações por chefe.
