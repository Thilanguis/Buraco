# CHECKLIST DE REGRESSÕES E ATUALIZAÇÕES — BURACO

### Elegibilidade e variedade dos seis chefes — 09/10/2026

- [x] Classificar cada habilidade como A (alvo/segurança obrigatórios), B (prova excessiva) ou C (alvo real sem garantia de sucesso). Relatório `AUDITORIA_ELEGIBILIDADE_CHEFES_2026-10-09.md` substitui exigências históricas de solução pronta no anúncio do Nemesis.
- [x] Caçada/Extermínio impossíveis podem falhar; Tentáculo/Barragem mantêm 2/3 marcas com saída individual legal, não prova de saídas conjuntas. S.T.A.R.S./papéis/jogo congelados. Agarrador continua protegendo soluções existentes após compra; não vira filtro para anunciar desafios.
- [x] Invasão: Infectado não exige plano de duas contribuições; Devorador precisa de jogo estruturalmente extensível, não carta na mão; Agarrador pode marcar carta descartável. Falha persiste/Mutado na F3, sem Infecção adicional. Teto, cadáver, uma reanimação por zumbi e quota por fase preservados.
- [x] Prisão/Laço preservam parceiros/pressão/jogos extensíveis, sem solução antecipada. Presa/Reflexo Invertido/Vigilância/ilusões, Coleiras/Exposição/ordens, sementes e descarte por naipe preservam validações de bloqueio e alvo realmente executável.
- [x] Excluir a última habilidade somente depois de validar alternativas; repetir a única válida é permitido. Pesos, entradas de fase e debug-only intactos, sem rotação fixa.
- [x] A/B local isolado do commit 675106b, mesmas sementes/estados, seis chefes e três fases. Registrar catálogo, elegíveis/exclusões por cenário, frequências, repetições, vazios e candidatos/zumbis. Não interpretar sorteio condicional como vitória, telemetria ou combate completo.
- [x] Sucesso/parcial/falha, objetivos sem solução, cartas/bloqueios/Morto/batida, F3/lifecycle, BOT cooperativo, snapshot/reload/undo, objetivos salvos v1/v2, ajuda e interface cobertos. Baseline ampla1228/1228; resultados finais no relatório. Nenhuma mudança estratégica do BOT, HP, dano, cura, recurso ou balanceamento.
- [ ] Validar batalhas completas, aparelhos físicos e dois clientes Firebase reais antes de calibrar pesos ou afirmar variedade/win rate em produção. Sem commit/push/deploy nesta revisão.

### Segunda revisão cooperativa do BOT Chefe — 09/10/2026

- [x] Starvation do Lixo comprovada antes da correção: 32 extensões podem esconder retirada completa em jogo novo. Cotação canônica, 32 incumbentes e espaço por categoria até 64 simulações; testar Lixo20/50, muitos destinos, permutações e orçamento0/1. Sem mudar Lixo Fechado nem confundir shortlist com busca exaustiva.
- [x] Potencial indexado/marginais equivalentes à política anterior; previews somente na iteração atual. Pausas no scan de trincas via scheduler/MessageChannel/timer, com fingerprint e cancelamento após pausa; Worker real e token obsoleto. Sem cache de planos em Firebase/snapshot nem alteração do BOT clássico.
- [x] Projeção resolve somente as consequências da rodada atual: `deferNextBossTurn:true` apenas em cópias, padrão false no jogo real. Não gerar a próxima habilidade com mão oculta em todo candidato; pico do Nemesis reproduzido no perfil. Vitória canônica letal não recebe punição futura. Seis chefes preservam fechamento/fluxo padrão.
- [x] Auditoria de coringas distingue 2 natural, alternativa natural legal dominadora, benefício observado e não comprovado. Testar desperdício dirigido e coringa útil, sem proibição universal; rejeitada penalidade mais forte que reduziu progresso. Cooperação continua pública, sem sacrificar sequência própria por pista fraca.
- [x] A/B isolado de toda a árvore JS da primeira revisão f0d4551, 64 execuções/8 sementes. Adaptador espelha vitória imediata da aplicação; completa/protegida segue cotação, inclusive Lixo unitário. Resultados de jogo iguais na amostra, zero vitórias em ambas; nenhum ganho de vitória/preservação comprovado. Não comparar com o encerramento incompleto do experimento histórico.
- [x] Focados174/174, ampla1228/1228. Edge1920/1376/390px CPU1×/4×/6×, 324 medições e fallback real: mão50 móvel1196→774ms média, mas muitos destinos ficaram mais lentos e P95 desktop piorou. Média/P95/pior, desperdício limitado e derrotas registrados em `BOT_COOPERATIVO_CHEFE_2026-10-09.md`; não ocultar regressões nem declarar UI sem bloqueio.
- [ ] Esgotamento continua na amostra; validar humano competente, aparelhos físicos, partidas completas dos demais chefes e dois clientes Firebase reais. Não transformar zero dominados em prova de eficiência nem usar o parceiro roteirizado como win rate humano. Sem commit/push/deploy automático.

### Inteligência cooperativa do BOT Chefe — 09/10/2026

- [x] Planejador único com informação pública: mão do parceiro e cartas futuras ocultas inclusive BOT+BOT; histórico público curto, reserva de cartas e oportunidade cooperativa conservadora. Lixo usa cotação canônica por destino real, sem veto automático por pilha grande.
- [x] Compara consequências canônicas em cópias com custo de coringas/limpas; preserva descarte/Mortos e verifica Ataque Final após contribuição. Guarda assíncrona inclui chefe/restrições/recursos/ações e token do Worker. Mecânicas, balanceamento e BOT clássico intactos.
- [x] Suíte ampla 1204/1204; cenários determinísticos Lixo20/50, Monte30/15/8/0, informação oculta/cancelamento e regressões. Edge com Worker real em 1920/1376/390px e CPU1×/4×/6×; stress de 50 cartas chega a1163ms mobile emulado.
- [x] Comparação antiga/nova com mesmas sementes e 108IDs, incluindo ganhos e regressões: mais dano/limpas no agregado, mas gasto de Joker maior e uma derrota extra por esgotamento na Matriarca. Método, métricas e comandos em `BOT_COOPERATIVO_CHEFE_2026-10-09.md`.
- [ ] Playtest humano competente, aparelhos físicos, outros chefes em batalhas completas e dois clientes Firebase reais. Não declarar win rate nem superioridade uniforme com base no parceiro roteirizado/amostra pequena.

### Polimento HUD — Enxerto, Flores e PASSIVA — 08/10/2026

- [x] Enxerto usa o medidor de faixas compartilhado: jogos alimentados0/1/2, preenchimento0/50/100%, consequência atual e legendas separadas. Sem sequência textual de regras no HUD; save legado respeita sua consequência salva. Nenhuma mudança de resolução.
- [x] PASSIVA mostra +50HP normal, +25 com Anticoagulante e +0 com Frio; seta de debuff e status separados. Destaque de turno intacto; regeneração continua no fim da rodada para todas as vivas. Chip ADAGA30% na Lady dura enquanto houver filha viva vinculada, ajuda oficial sem alterar alvo.
- [x] Cinco Flores usam `assets/images/matriarch-lotus.png`, PNG original enviada: foscas apagadas e cor original ativas, sem alterar bloom/limite/canastras. Asset/helper no precache; reduced motion preservado. Validar browser desktop/tablet/mobile e suíte ampla.

### Itens v2 da Dimitrescu — 08/10/2026

- [x] Partidas novas: filhas 500, regen50/Anti25, piso300; perdas originais aditivas Adaga25/Explosivo50/Frio100/Anti75/Relíquia100. Não curar nem duplicar dano ao limitar o máximo. Efeitos continuam no piso.
- [x] Adaga30% somente em ataque efetivo à filha, inclusive humano/BOT/Ataque Final; ignora PROT./Coágulo sem consumir. Overkill limitado, duplicatas não somam porcentagem, item/hemorragia não transmitem. Morte da Lady encerra a batalha; morte da filha encerra vínculo e retira PROT. canonicamente.
- [x] Explosivo60 + hemorragia50/2 fechamentos; antes da regen, limitada à vida, letal via morte/Fúria/PROT. Novo Explosivo renova sem empilhar. IDs/último tick/round salvo impedem replay.
- [x] Frio guarda carga na vida cheia, bloqueia apenas cura efetiva, teto2. Anticoagulante permanente25 sem stack. Relíquia espera oportunidade válida, não consome sem candidato/não selecionada e não acumula supressões em duplicatas; As Três Filhas continua funcionando.
- [x] Ajuda atual/legacy usa a regra da partida; vínculo/hemorragia separados de PASSIVA. HP original, máximo recuperável/petrificação; transferência vermelha até retrato da Lady e número no HP real; sangramento vermelho antes de regen verde na filha. Toque/teclado/Escape/clique fora/reduced motion e replay verificados em 1920/1376/390px.
- [x] BOT escolhe item/alvo investido e golpe letal direto, preservando coringas/cartas obrigatórias/descarte. Laboratório usa versão nova e conserva 108 IDs/15 itens. `castleItemRulesVersion:2`/configuração e versão filhas3 persistem; saves sem versão continuam v1/450/piso200 sem reinterpretar consumidos.
- [x] Execução inicial1112/1112; regressões focadas/ampla, compatibilidade de saves e experimento canônico reproduzível. Comparações completas em `REWORK_ITENS_DIMITRESCU_2026-10-08.md`.
- [ ] Meta70% (65–75%) contra dupla competente ainda não validada: política gulosa não é evidência suficiente. Playtest humano e dois clientes Firebase reais permanecem necessários. Não inventar percentual atual.

### Rework Nemesis/Enxerto e regeneração visual — 08/10/2026

- [x] Caçada: dano direto efetivo positivo, não dano em zumbi; S.T.A.R.S. congelado, sem fallback silencioso para parceiro impossível. BOT prioriza Nemesis só enquanto precisa cumprir o objetivo. Cartas já creditadas sem evolução não provam dano.
- [x] Tentáculo: jogar marcada = completo; só descartar = parcial +4/+5/+6; nenhuma = +8/+10/+12. Duas marcas realmente jogáveis. HUD/resolução compartilham bônus Infectado/Mutado/Reforçado/Ômega uma vez, inclusive parcial; sucesso não reduz Infecção.
- [x] Extermínio: rodada cooperativa, S.T.A.R.S. dano direto e parceiro contribuição legal ao jogo existente congelado; ordem real e solução conjunta com descarte/Morto/batida. Ambos/um/nenhum = +0/+8/+16; Agarrador preserva solução sem reserva fixa. Snapshot/undo/reload não duplicam; anúncio v1 salvo conclui pela regra antiga.
- [x] Enxerto novo: dois lados sem efeito; um lado cura até 50 HP, sem Flor nem propagação comum; zero lados +1 Flor e propagação posterior. Cura limitada por rodada/HP máximo, Coroa mantém reação própria. Save antigo sem `partialHeal` conclui pela regra salva; canastra não reabre quota de Flores.
- [x] PASSIVA das três filhas explica regeneração 50/25/Frio/máximo/morte/vida cheia, não CAÇADA/BANQUETE/LIXO. Evento real `daughterRegen` gera +50/+25/+20 sobre cada retrato, sem novo cálculo de HP/Sede. Deduplicação, baseline de reload/reconexão, undo, três simultâneas, texto acessível e reduced motion verificados.
- [x] Suítes focadas e ampla; browser local desktop/tablet/mobile e cinco tamanhos Nemesis. Calibração reproduzível de partidas completas e sensibilidades documentadas sem confundir política gulosa com dupla competente.
- [ ] Playtest humano competente e dois clientes Firebase reais; medir 65%–75% antes de declarar balanceamento validado. Relatório: `REWORK_NEMESIS_MATRIARCA_E_UX_DIMITRESCU_2026-10-08.md`.

### Cura do Devorador e passivas das filhas no DevTools — 08/10/2026

- [x] Cura efetiva do Devorador registra origem e HP anterior. Fluxo verde sai do retrato, chega à borda do HP anterior e só então preenche a vida/número; não mexe na Infecção nem duplica o número antigo de cura. Mesmo presenter de Sede/Infecção, com fila, deduplicação, cancelamento em undo/reload e reduced motion sem voo. Aplica-se a jogo real e teste manual, respeitando máximo e valores existentes.
- [x] Dimitrescu mostra Preparar passiva e Executar para Bela/Cassandra/Daniela. Preparar usa candidatos canônicos e destaca só a filha escolhida; Bela respeita o jogador selecionado. Executar resolve Bela/Cassandra pendentes (+3 somente por falha) ou simula a primeira retirada efetiva de Daniela (+3), sem mover cartas/turnos nem alterar HP/PROT./Fúria. Cumprida, sem candidato ou suspensa não pune; preparar novamente permite novo teste explícito, com evento único. Itens/Relíquia continuam respeitados.
- [x] Cobertura focada: HP anterior/cura limitada, três filhas, Sede real/origem/limite, repetir só após preparar, sucesso/Relíquia/sem alvo, snapshot e undo. Browser desktop/tablet/mobile verifica chegada à borda do HP antes de subir, controle da Daniela e regressões de Infecção.

### Ações dos zumbis no DevTools — 08/10/2026

- [x] No DevTools de uma partida Nemesis, escolher zumbi preenche Estado com Na mesa. O botão da passiva aplica a configuração e dispara em um clique, mesmo sem cenário preparado e com zumbi inicialmente ausente: Agarrar cartas, enviar Infecção ou curar Nemesis. Valores seguem Mutado/Reforçado; jogador selecionável. Outros chefes não mostram estes botões. Estado derrotado/fora da mesa escolhido explicitamente não executa passiva.
- [x] Infectado também oferece resolver o objetivo atual para seu alvo: resultado/progresso/base/bônus usam a resolução real, sem inventar falha em objetivo cumprido nem repetir um objetivo resolvido. Não avança turno/rodada; pode executar os efeitos de fim de turno do Nemesis associados à resolução. Preferir o botão simples de Infecção para testar só a transferência.
- [x] Ações são manuais de laboratório: não compram/baixam cartas, cura respeita máximo e não consome créditos reais do Devorador; Agarrador usa planner/guards e suas travas acabam no turno real. Devorador oferece Preparar ferimento para testar cura, marcado por padrão: somente com Nemesis em HP máximo cria espaço do tamanho da cura atual antes do efeito real, no mesmo undo. Desmarcado, vida cheia não inventa cura/animação. Cliques têm eventos distintos; baseline do HUD reserva somente eventos anteriores, sem engolir a primeira animação. Undo/reload não reaplicam efeitos; gate e validação em cópia preservados.
- [x] Testes dos quatro conjuntos Normal/Mutado/Reforçado/ambos, limites e rejeições; browser 1920/1376/390 com mouse/toque/teclado, transferência real pelo botão do Infectado e undo. Nenhuma alteração de balanceamento ou acionamento automático em partidas normais.

### Durabilidade das filhas — 08/10/2026

- [x] Histórico v1, preservado em saves antigos: filhas450/regen50, Anticoagulante25, perdas uniformes100/piso200. Partidas novas usam o contrato v2 acima. PROT.500/passivas+3/Lady/Sede/Fúria permanecem.
- [x] Testes focados, suíte ampla e browser desktop/tablet/mobile (1920/1376/390), incluindo ajuda, petrificação, estados de vida e reduced motion. Estimativa de durabilidade registrada no rework, sem inventar win rate.

### Origem de Sede/Infecção e auxiliares no laboratório — 07/10/2026

- [ ] Ganhos das filhas partem do retrato correto em vermelho; bônus do Infectado parte dele em verde. Base/filha/zumbi/Ômega entram em sequência, sem números simultâneos ou reaplicação no render/reload. Usar valores efetivamente aplicados na resolução, inclusive perto de 100; não recalcular buffs no HUD. Animação não muta o estado e não bloqueia toque/clique.
- [ ] Reduced motion mantém feedback breve sem voo/pulso. Desfazer, sair da mesa ou trocar chefe cancela a fila e seus elementos; nenhuma animação antiga sobrescreve a barra restaurada. Cura/HP e absorção continuam com seu feedback próprio.
- [ ] DevTools mostra controles de auxiliares somente para Nemesis/Dimitrescu, mesmo preparando outra habilidade: selecionar auxiliar, vida e presença/derrota; Mutado/Reforçado só para zumbis. Apenas fixtures manuais podem exceder o teto de invasão. Rejeitar HP/alvo inválido, preservar cartas e canastras, devolver anexos de filhas mortas, liberar Agarradas ao retirar Agarrador, suportar snapshot/reload/undo sem sorteio extra.

### Rework Dimitrescu — 07/10/2026 (contrato permanente)

- [ ] Ajudas da Dimitrescu focam ação/efeito/prazo, sem linguagem de implementação. Itens na mão/inventário/anexos compartilham descrição curta do efeito especial e petrificação; anexo mantém carta e nota de devolução ao fundo do Lixo. Contadores ao lado dos ícones, sem sobrepor moldura PNG da Sede nem aumentar HUD; validar desktop/tablet/mobile e teclado/toque.

- [ ] Clicar repetidamente nos retratos só troca o alvo: não desloca Monte/Lixo nem ativa texto legado de Enxame/Pólen. Classes visuais recebem booleanos explícitos. Lady selecionável pelo próprio retrato como Nemesis, sem botão abaixo das filhas; ajuda não troca alvo. Regen +50 só na ajuda, sem chip permanente; objetivos/debuffs à direita, HP embaixo.
- [ ] Rodada normal seleciona exatamente uma filha viva com seed, sem repetição imediata se houver alternativa. Entidades continuam alive/dead; cada viva sempre mostra um único chip CAÇADA/BANQUETE/LIXO +3, neutro sem ação e destacado com contexto quando escolhida. Popover completo no chip por mouse/toque/teclado, sem troca de alvo; sem chips extras de falha/resultado ou ATIVA/AGUARDANDO. Debuffs separados. Reload/render/undo preservam escolha e objetivos. As Três Filhas F2/F3 peso 3 destaca os três chips e ativa todas as vivas, passivas +3 sem duplicação ou +8 antigo. Sem candidato não pune.
- [ ] Sangue Impuro F1/F2/F3 peso 3: Joker/2 realmente coringa +3 uma vez por cooperador, máximo +6 inclusive com Fúria; 2 natural não ativa. Flags/validador canônicos, humano/BOT e reload sem duplicar. Relíquia pendente só consome a janela quando a filha é escolhida. Item PNG clicável/focável e marca periférica de Bela coexistem, sem botão textual sobre o item.
- [ ] Chips dos capangas/filhas de Nemesis, Nehelenia e Dimitrescu compartilham o padrão Nemesis: 8px desktop/7px mobile, altura mínima 16px, padding 2px 5px (mobile 4px), cantos 3px, estados ativos dourados. Contexto da Nehelenia não usa fonte inline de 5px nem cápsula divergente. Preservar estados sucesso/falha/inativo e debuffs azuis consultáveis exclusivos da Dimitrescu; validar wraps/arte/toque/teclado em desktop/tablet/celular.
- [ ] Não confundir padronização de chips com barras de vida: filhas e zumbis usam meter de 9px e o mesmo desenho interno nativo, sem forçar uma faixa interna mais grossa só na Dimitrescu. Medir também preenchimento renderizado por pixels (rasterização fracionária pode variar 1px); petrificação centralizada com a mesma espessura fina, não um segundo trilho acima.

- [x] Lady2000, filhas novas500/500 (v1 histórico450), sem revive. Vínculo1500PROT.,500/filha; Coágulo→PROT.→HP, batida100/excedente. Exceção v2: ataques à filha com Adaga também atingem HP real da Lady. Morte retira até500PROT., sem dano automático à vida.
- [ ] Bela: carta concretamente jogável, prazo do alvo; Cassandra: contribuição concreta ao jogo; sem candidatos não pune. Validar descarte/Morto/batida. Daniela: primeira retirada EFETIVA protegida/completa +3 uma vez na rodada, nunca na tentativa/Monte/render. Sucesso não reduz Sede.
- [ ] Obrigações/Sede, hemorragia e então regen própria das filhas 50; Frio v2 guarda até2 cargas, cada uma bloqueia uma cura efetiva (vida cheia não consome); Anticoagulante25 permanente sem stack. Relíquia espera uma oportunidade válida da própria filha, sem gastar em rodada não selecionada/sem candidato. Morte cancela obrigação, não regenera/volta. Saves v1 mantêm efeitos históricos.
- [ ] Exatamente 15 IDs físicos, 3/tipo entre todas as 108 cartas, inclusive Joker. Nenhuma garantia de mão inicial/posição/zoneamento. Associação uma vez, salva por ID/consumo; reload/undo/reconexão/Morto/Lixo/jogo não rerrolam nem duplicam. Laboratório conserva 108 IDs e 15 itens.
- [x] Sacrifício apenas mão/turno após compra, filha viva, gates/descarte/topo obrigatório. Não é meld/descarte/batida/fim de turno. Perdas diferentes/piso300 v2; -100/piso200 somente no histórico v1. Carta real anexada; morte devolve ao fundo do Lixo sem alterar topo nem restaurar item.
- [ ] Conferir PNG REAL em faces visíveis; sem vazar ocultas. Mão: overlay 64%/máximo 55%, ação focável sobre o PNG sem texto grande, cantos intactos; imagem com pointer-events none; outras zonas 46%/40%. Marca de Bela periférica, sem cobrir o item. Cinco artes distribuídas e ampliadas entre Sede e Próxima Fase sem aumentar o HUD. Ajuda oficial por toque/teclado/Escape/clique fora.
- [x] Filhas em três colunas, arte integral, HP/passivas sobrepostos e sacrifícios laterais sem painel quadrado. Vida/500 (450 histórico v1), máximo recuperável explícito; barra verde/amarelo/vermelho com fundo escuro igual Nemesis e petrificação cinza. Hitbox dentro do próprio card. 1920/1376/390px verificados.
- [ ] Uma barra da Lady com HP + PROT. consumível anexada à direita, sem sobreposição: 3500/3500 inicial, 2000 HP reais; restante/preenchimento/`i` legíveis com 3/2/1 filhas vivas e após gasto. Fúria clicável explica +10% cura/+2 Sede própria por morte, sem aumentar passivas das filhas.
- [x] Revisão Sede 07/10: Tributo F1/F2/F3 +3/+6, +4/+8, +6/+10; Marca +5/+7/+9; Banquete +10/+14; Fúria +0/+2/+4/+6 por evento. Cobertura do motor/HUD, sucesso sem recuperação, passivas +3 e Sangue Impuro máximo +6 preservados. O Vínculo em piso deste passe foi substituído pela revisão consumível abaixo.
- [x] Vínculo consumível: Coágulo → PROT. → HP, humano/BOT/Ataque Final; excedente, zero com filhas vivas, alvo explícito, morte −500 restantes uma vez, teto por filhas, migração única e snapshot/reload/undo sem recarga/duplicação. Sede/Fúria/HP das filhas/regen/itens inalterados.
- [ ] Ícones do castelo sem moldura; disponíveis/total 3/3 por tipo, usados/anexados na ajuda sem revelar localização. Contagem correta após uso/morte/reload. Contraste de itens na mão sem esconder cantos. Debuffs ↓ só efeito ativo; testar toque/teclado/Escape/clique fora/viewport e reduced motion.
- [ ] Fúria por morte 0/1/2/3: cura da Lady ×1/1,1/1,2/1,3 (floor, máximo HP); ofensiva própria +0/1/2/3 por evento positivo. Vinho/Coágulo/Banquete e HUD projetado coerentes. Passivas +3/regen/custo Vinho/máximos não escalam. Banquete funciona com Cassandra morta.
- [ ] Cada morte individual gera um flash/áudio (`what-have-you-done-to-my-daughter.mp3`), três mortes = três eventos; sem replay por reload/render. Quatro habilidades antigas fora de catálogo/pools/intro; cancelar intent legado sem punição/duplicação. Não inventar itens retroativos em saves pré-rework.
- [ ] BOT considera Vínculo, regen, itens/custo da carta e Fúria futura, sem desperdício de dano bloqueado; mesmo guard/pipeline do humano. Preservar matemática/alívio por canastra e demais chefes.
- [ ] Rodar `dimitrescu-castle.test.mjs`, chefes/integração focados, `dimitrescu-castle.browser.mjs` e ampla; conferir assets precacheados, git diff/check e alteração manual do Nemesis preservada. Calibração experimental, nunca inventar win rate. Contrato: `REWORK_DIMITRESCU_2026-10-07.md`.

**Status:** documento permanente de prevenção de regressões  
**Criado em:** 05/10/2026  
**Objetivo:** ser lido **antes de qualquer alteração** em regra, UI, animação, BOT, sincronização, reinício, Service Worker ou asset do jogo.

### HUD de fases e HP — UX de 06/10/2026

- [ ] Próxima fase compacta (até 22px no fixture desktop/tablet); limites/gatilhos apenas no `?` oficial, ancorado, com toque, Enter, Escape e clique fora. Não repetir Monte/Morto na régua; preservar contadores da mesa. Régua e rodada no fluxo abaixo dos medidores: espelhos da Nehelenia ocupam a largura disponível sem sobreposição. Conferir alinhamento vertical dos botões `?`, inclusive junto ao Lixo.
- [ ] Barra mantém `getBossPhaseProgress().hpProgress`; apresentação nunca recalcula regras, números ou transição.
- [ ] HP normal >50%, tensão >25% até 50%, perigo ≤25%; fluxo interno leve, pulso lento só em perigo e nunca com HP zero. Revisão visual de 07/10: hemácias biconcavas em alturas/profundidades variadas, não uma fileira central de pontos claros. Textura vetorial inline pequena, uma camada animada por transform; sem partículas DOM, blur animado ou canvas. Touch mantém fluxo mais lento (20s, desktop 14s). Movimento reduzido desliga fluxo, pulso e transições.
- [ ] Rodar `tests/boss-hud-ux.browser.mjs` (1920×1080, 1376×1032, 1024×768 e 390×844) e testes de HUD/integração. Fixture local, sem Firebase; visualizar os recortes `vessel-*.png`, verificar largura, legibilidade e ausência de sobreposição.

> Este documento não substitui o código atual. A fonte de verdade executável é sempre o estado atual do Google Drive. Ele existe para lembrar erros reais que já aconteceram e impedir que sejam repetidos.

---

## 1. Regra zero — não editar a partir de uma cópia velha

Antes de qualquer patch:

1. buscar o arquivo atual no Google Drive;
2. conferir `modified_time` e tamanho;
3. preparar o patch em cima dessa cópia;
4. **antes de gravar**, conferir de novo se o arquivo oficial não mudou;
5. se mudou, refazer o patch sobre a versão mais nova;
6. depois de subir, baixar novamente o arquivo oficial e validar essa cópia.

Não usar como fonte de verdade:

- cópia local de outra rodada;
- arquivo de staging antigo;
- GitHub sem comparar com Drive;
- lembrança de como o código “deveria estar”.

### Erro real já ocorrido

Durante uma alteração, `service-worker.js` mudou no Drive enquanto o patch estava sendo preparado. A gravação foi interrompida e refeita em cima da versão atual. Esse comportamento deve continuar sendo obrigatório.

Também houve uma diferença grande de tamanho no `app.js` causada por **CRLF → LF**, não por perda de código. Tamanho de arquivo sozinho não prova corrupção. Quando houver dúvida, comparar conteúdo/diff.

---

## 2. Auditoria obrigatória de dependências antes de substituir/remover uma feature

Toda alteração que substitua, remova, renomeie ou mude o gatilho de uma feature deve auditar, no mínimo:

- sons/SFX e música;
- animações, overlays, foco, vibração e feedback háptico;
- botões, HUD, mensagens e acessibilidade;
- estados persistidos, `lastAction`, saves antigos e migrações;
- BOT/IA e comportamento em todos os papéis;
- timers, janelas de reação e estados `pending`;
- DEVTOOLS e testes;
- Service Worker/cache/assets;
- documentação;
- imports e código/arquivos que podem ficar órfãos.

Se o destino de uma dependência não estiver claro, **não decidir sozinho**. Perguntar se Biel quer **preservar, reaproveitar ou remover**.

### Erro real que motivou esta regra

Ao substituir `Procurar carta` pelo Decreto/Monte Obrigatório, o efeito sonoro/apresentação antiga ficaram sem destino explícito de início. A mudança mecânica não autorizava apagar silenciosamente as dependências da apresentação.

---

## 3. Alerta não é a mesma coisa que execução

Antes de mudar um efeito, classificar cada feedback como:

- **alerta**: avisa que uma ação está disponível;
- **execução**: confirma que a ação realmente aconteceu;
- **estado persistente**: mostra que a regra continua ativa.

Não mover som/animação entre essas fases sem pedido.

### Exemplo aprovado — Decreto

**Alerta:**
- foco/flash mostra o botão;
- não bloqueia ainda;
- não toca o som da bota.

**Execução após clique confirmado:**
- aplica bloqueio;
- toca o som;
- executa animação;
- coloca a moldura no Lixo.

**Estado persistente:**
- moldura permanece até o turno do Escravo acabar completamente.

### Erro real

O som foi ligado ao alerta quando Biel queria o som apenas no clique. Não repetir.

---

## 4. Antes de culpar o elemento visual, auditar os ancestrais

Quando algo parecer:

- fosco;
- transparente;
- escuro;
- borrado;
- cortado;
- deslocado;
- menor do que deveria;

verificar primeiro:

- `opacity` de pais/ancestrais;
- `filter`;
- `transform`;
- `overflow`;
- `display`/`visibility`;
- pseudo-elementos;
- regras `!important`;
- media queries;
- CSS específico do modo/tema.

### Erro real

No Decreto, alterar `brightness(.94)` não resolvia o “fosco”. A causa era `#drawDiscardBtn` com `opacity: 0.5`, afetando carta e PNG juntas.

**Lição:** não insistir no primeiro diagnóstico visual quando ele não muda o resultado.

---

## 5. Uma animação e seu estado final devem compartilhar a mesma geometria

Se um elemento:

1. nasce em A;
2. voa para B;
3. vira um estado persistente em B;

então o voo e o estado persistente devem usar:

- o mesmo alvo real;
- a mesma escala final;
- a mesma referência de alinhamento;
- a mesma rotação esperada.

Evitar constantes duplicadas.

### Erro real

A moldura do Decreto voava para a carta em `1.24x`, mas o estado final estava em `1.6x`. Resultado: chegava pequena e crescia depois.

**Regra:** tamanho final deve ter uma única fonte de verdade.

---

## 6. Toda animação sincronizada deve ser testada local e remotamente

Não assumir que uma animação visível para quem executa aparecerá para o outro jogador.

Testar:

- quem iniciou a ação;
- quem recebeu o estado via sincronização;
- reload durante o estado persistente;
- reconexão quando relevante.

### Erro real

A animação da moldura do Decreto acontecia apenas na tela do Dominador. Na tela do Escravo, a apresentação remota era disparada antes de o novo estado estar aplicado e abortava.

**Lição:** a ordem entre `state recebido` e `apresentação remota` é parte da feature.

---

## 7. Campos nullable não podem ser comparados por coerção numérica sem guard

Evitar padrões do tipo:

```js
Number(nullableValue) === Number(turnNumber)
```

sem antes validar que o valor existe.

### Erro real crítico

```js
Number(null) === Number(0) // true
```

Isso fez uma partida nova em `turnNumber = 0` nascer com o Decreto visualmente ativo.

### Regra

Para estados opcionais de turno:

```js
value != null && Number(value) === Number(turnNumber)
```

E sempre criar teste explícito para **partida nova no turno 0**.

---

## 8. Não parar na primeira causa plausível

Quando o primeiro patch melhora o sintoma mas o bug volta:

1. reabrir o código atual;
2. reproduzir o caso exato;
3. diferenciar **estado lógico** de **estado visual**;
4. criar um teste específico para o cenário que falhou;
5. corrigir a raiz, não empilhar workaround.

### Erro real

O bloqueio aparecendo após Reiniciar Partida parecia inicialmente “estado visual antigo”. Houve um ajuste de render/reset, mas o bug continuou. A causa raiz real era `Number(null) === 0`.

---

## 9. DOM visual deve acompanhar a transição de estado, não esperar a animação seguinte

Quando uma carta sai da mão e outra animação vai começar depois, o DOM deve mostrar imediatamente o estado intermediário correto.

### Exemplo aprovado — Morto

```text
última carta sai
→ mão visual fica vazia
→ Morto anima
→ 11 cartas aparecem
```

### Erro real

A última carta descartada reaparecia/ficava na mão enquanto a animação do Morto aguardava, apesar de já ter saído do estado lógico.

Testar local e remoto.

---

## 10. Elemento central não pode participar do empurra-empurra lateral

Se um botão/controle precisa ficar no centro da mesa, ele não deve depender da largura dos irmãos num `flex` comum.

### Requisito aprovado

O botão **X** deve ficar no eixo central independentemente de:

- quantidade de botões;
- modo;
- BOT/humano;
- `CHAMAR AMIGAS`;
- `BLOQUEAR LIXO`;
- desktop/tablet/landscape.

### Erro real

O X “dançava” porque a quantidade/tamanho dos botões laterais alterava o centro do grupo.

**Lição:** centro visual importante precisa de zona/âncora própria, não de centro do conjunto inteiro.

---

## 11. Timers reativos e estados `pending` devem ser sincronizados com o BOT

Qualquer habilidade com janela de reação precisa definir claramente:

- quando a janela começa;
- quando a ação é confirmada;
- quando a animação termina;
- quando o BOT pode retomar o turno.

### Erro real — Decreto contra BOT

O Decreto podia ser clicado perto do fim dos 3 s. O BOT então:

1. via o Lixo bloqueado;
2. comprava do Monte;
3. tentava descartar;
4. o descarte era recusado porque `friendOperationPending` ainda estava ativo;
5. a recuperação também era recusada;
6. surgia:

```text
O bot terminou as jogadas sem encontrar um descarte legal.
```

### Regra permanente

Depois de uma ação reativa confirmada, o BOT deve **esperar a operação pendente terminar** antes de continuar o turno.

Não resolver apenas escondendo o erro do console.

---

## 12. Ensinar o BOT em todos os papéis da mecânica

Para qualquer habilidade assimétrica, responder duas perguntas separadas:

1. o BOT sabe **reagir contra** essa habilidade?;
2. o BOT sabe **usar** essa habilidade quando ocupa o papel que a possui?

### Exemplo — Decreto

**BOT Escravo:**
- tenta pegar Lixo;
- dá janela ao Dominador;
- se bloqueado, cai para Monte;
- espera a operação terminar e continua.

**BOT Dominador:**
- avalia mão + mesa do Escravo;
- não gasta habilidade 1x/partida em ameaça fraca;
- usa em ameaça relevante;
- intenção real de pegar Lixo aumenta urgência;
- contra humano usa pequeno atraso de reação para não parecer leitura instantânea.

### Erro real

O BOT tinha aprendido a sobreviver ao Decreto, mas não a usá-lo como Dominador. A antiga Busca tinha uso automático e essa inteligência não havia sido migrada.

---

## 13. Corrigir semântica sem redesenhar apresentação não solicitada

Mudança interna e mudança visual são escopos diferentes.

### Erro real — tela de atualização

Ao corrigir ativação do Service Worker, a apresentação aprovada foi trocada de:

```text
Sincronizando Módulos...
Compilando pacotes (1/N)...
Mesa pronta!
```

para outra interface sem pedido.

A semântica correta é:

- versão só é marcada como aplicada depois de `controllerchange`;
- checagem usa `cache: 'no-store'`;
- retry sem reload prematuro.

Mas a UI antiga aprovada deve permanecer.

**Regra:** consertar mecanismo não autoriza redesenhar feedback.

---

## 14. Service Worker — quando tocar e quando não tocar

Não incrementar cache por hábito.

Pode tocar no Service Worker quando houver motivo real, por exemplo:

- novo asset que precisa entrar no cache;
- mudança real de estratégia de cache;
- necessidade explícita de publicação/ativação do pacote atual;
- correção específica do fluxo de atualização.

Antes de gravar:

- buscar o SW atual do Drive;
- não aplicar bump sobre cópia velha;
- preservar a UI aprovada de atualização;
- validar `skipWaiting`, `controllerchange` e assets.

**Versão de referência em 05/10/2026:** `buraco-v269`.

---

## 15. Matriz mínima de regressão — Dominação / Decreto

Ao tocar em Decreto, Dominação, alerta, animação, BOT ou Lixo, testar os casos relevantes abaixo:

| Cenário | O que observar |
|---|---|
| Dominador humano × Escravo humano | alerta, clique, som, bloqueio, moldura |
| Dominador humano × Escravo BOT | janela 3 s, fallback para Monte, sem erro de descarte |
| Dominador BOT × Escravo humano | uso inteligente, sem gasto aleatório, atraso de reação |
| Dominador BOT × Escravo BOT | intenção real de Lixo aumenta urgência |
| partida nova | `turnNumber = 0` não nasce bloqueado |
| Reiniciar Partida | nenhum estado/PNG da partida anterior |
| tela remota | mesma animação/estado do local |
| clique perto do fim dos 3 s | BOT espera `pending` terminar |
| após compra do Monte | moldura continua até fim completo do turno |
| fim do turno | moldura desaparece |
| reload durante bloqueio | estado persistente reconstrói corretamente |
| Lixo desabilitado | carta/PNG não ficam foscas por opacidade do pai |

---

## 16. Matriz mínima de regressão — UI central / Morto

Ao tocar em ações da mesa ou transições de mão:

- X continua central com 1, 2, 3, 4+ botões;
- X continua central com `BLOQUEAR LIXO` aparecendo/desaparecendo;
- testar desktop largo;
- testar tablet landscape;
- testar viewport pequeno;
- última carta some antes do Morto;
- tela adversária também mostra mão vazia antes da entrada do Morto.

---

## 17. Auditoria histórica confirmada pelo Git — regressões reais que já voltaram atrás

Esta seção vem de uma varredura do histórico do repositório `Thilanguis/Buraco` e dos testes de regressão atuais. Ela registra **casos confirmados por commits**, não inferências da conversa.

### 17.1 Tentativa visual não pode deslocar geometria que já funciona

**Commit:** `de07b5b` — *fix: estabiliza o fluxo do bot e faz rollback das tentativas visuais de animação*.

O próprio commit registra rollback de:
- carta extra embaixo do Monte;
- alterações na renderização original do Monte;
- alinhamento do Morto;
- mudanças visuais que quebravam posição das cartas e texto Monte/Lixo.

**Regra preventiva:** para adicionar moldura, animação, brilho ou tema, **não reposicionar Monte/Lixo/Morto para o efeito caber**. O efeito deve se adaptar à geometria aprovada. Se uma tentativa visual exigir alterar a base, comparar antes/depois em desktop e tablet e ter rollback simples.

### 17.2 Overlay não pode entrar no layout e empurrar a mesa

**Commit:** `7dde451` — diálogo do chefe voltou a ser overlay absoluto porque participar do grid quebrava o layout mobile. O mesmo commit explicitou que Monte/Lixo usam geometria única e não devem ser reposicionados no boss-mode.

**Regra preventiva:** diálogos, avisos, apresentações e efeitos temporários devem ser **overlay quando não são conteúdo estrutural**. Antes de usar `position: relative`, `grid-column`, flex item ou aumentar altura do HUD, verificar se isso deslocará mesa/pilhas.

### 17.3 Função existente não pode desaparecer em refactor grande

**Commit:** `ba75aea` — `finishGame` precisou ser restaurada depois de ter sido apagada; o mesmo commit removeu bloqueio residual do Lixo e tratou race de autoplay/duplo descarte.

**Regra preventiva:** em arquivo grande, antes/depois do patch procurar funções/eventos críticos por nome e comparar quantidade de ocorrências. Não fazer broad replace sem conferir o que sumiu. Para fluxos centrais, manter uma lista de símbolos que não podem desaparecer.

### 17.4 Estado de seleção temporário precisa morrer em reset, snapshot e desmarcação

**Commit:** `403ca97` — `selectedMeldTarget` ficou fantasma, apontou para jogo inexistente e podia causar `undefined is not iterable` na compra do Lixo.

**Regra preventiva:** toda seleção local (`selected*`, `moving*`, alvo visual, índice de jogo) deve ter ciclo de vida explícito:
- limpar ao desmarcar;
- limpar em reinício;
- limpar em snapshot que troca partida;
- validar o alvo novamente antes de usar.

### 17.5 Declaração duplicada / patch textual pode impedir o app inteiro de abrir

**Commits:** `7d428bd` e `e720cf1` — corrigiram `SyntaxError` por declaração duplicada de `movingWild`; `2dba11c` corrigiu outro erro sintático que travava a mesa do espectador.

**Regra preventiva:** depois de editar JS grande, `node --check` é obrigatório. Se houve merge/substituição textual, procurar declaração duplicada dos identificadores alterados antes de publicar.

### 17.6 Não reativar timers/BOT ao voltar de background sem validar a sessão

**Commits:** `de07b5b`, `7d428bd`, `2318e1b`. O histórico registra bot duplicado, gatilho agressivo em `visibilitychange`, timeouts antigos, snapshots/animações reabrindo partida encerrada e necessidade de cancelamento por sessão.

**Regra preventiva:** qualquer timer assíncrono deve validar:
- sessão/partida ainda é a mesma;
- turno ainda é o mesmo;
- app não está fechando;
- estado não foi substituído por snapshot mais novo.

Nunca usar `visibilitychange` para simplesmente “recomeçar” um turno.

### 17.7 Áudio/vídeo com Range não deve ser tratado como recurso comum do Cache API

**Commit:** `2318e1b` — requisições parciais 206 de MP3/MP4 acabavam em 503 pelo Service Worker.

**Regra preventiva:** preservar a exceção atual para `Range`, `audio` e `video`. Ao mudar SW/cache, testar pelo menos uma música de mesa, um SFX e um vídeo. Não “simplificar” o fetch handler removendo essa exceção.

### 17.8 Corrigir um áudio específico não pode esquecer os outros temas

**Commit:** `ee30929` — prioridade de áudio estava especial-cased apenas para Lunar e precisou ser generalizada para **todos** os `TABLE_ASAS_SFX`.

**Regra preventiva:** quando um recurso é temático, pesquisar coleção/mapa completo de temas antes de corrigir um único caso. Não criar `if (theme === X)` se a regra é do tipo de evento, não do tema.

### 17.9 Animação assíncrona precisa ser aguardada quando sua ordem visual importa

**Commit:** `f7d7c95` — foram adicionados `await`s para evitar “teletransporte” visual; também foi corrigido seletor que havia perdido a animação de roubo e removido `scale/text-shadow` herdado que borrava carta.

**Regra preventiva:** se o passo B depende de o usuário ver A terminar, B deve aguardar A. Não usar timeout solto como substituto de uma Promise de animação quando a sequência for funcional. Depois de trocar classes/seletor, testar se o nó real ainda é encontrado.

### 17.10 Resolver Morto localmente antes de publicar estado quando a ordem evita deadlock

**Commit:** `e13d7f8` — o Morto precisava ser anexado ao estado/`lastAction` antes do `commitState()` para evitar race e mão corrompida.

**Regra preventiva:** ao mexer em batida direta/Morto, não mudar a ordem `resolver estado local necessário -> construir ação -> commit` sem teste específico. Testar mão zerando por descarte, criação e extensão de jogo.

### 17.11 Estado visual de mão/pilha deve seguir estado lógico sem reaparecer

**Commit:** `9086892` — a última carta saía para pegar o Morto e voltava visualmente para a mão por alguns segundos.

**Regra preventiva:** toda transição de carta deve ter um estado intermediário explícito. A animação seguinte não pode renderizar snapshot anterior da mão. Testar a mesma transição na tela local e remota.

### 17.12 Regra que depende do “meu time” não pode usar jogador/time fixo

**Commit:** `5328813` — HUD de metas precisava ser vinculado ao time local para contagem correta de Mortos/progresso.

**Regra preventiva:** em HUD/estatística, derivar sempre o time do observador/jogador atual; não assumir `team[0]`, host, Dominador ou cadeira fixa quando a UI é relativa ao usuário.

### 17.13 Efeitos persistentes podem entrar em conflito e criar soft-lock

**Commit:** `4544a8b` — Jogo Espelhado e Presa Persistente precisaram de prioridade explícita para não bloquear uma obrigação ativa.

**Regra preventiva:** ao adicionar restrição nova, montar matriz com outras restrições persistentes. Definir precedência explícita e garantir pelo menos uma ação legal. Não empilhar dois `canX === false` independentes sem analisar a interseção.

### 17.14 Habilidade não pode criar objetivo impossível

**Commit:** `dc6397b` — Jogo Espelhado podia pedir encaixe sem o usuário possuir uma carta legal.

**Regra preventiva:** antes de criar objetivo/ameaça, validar que existe solução real no estado atual. Em habilidade gerada por IA/RNG, a elegibilidade deve ser verificada **antes** de persistir a intenção.

### 17.15 Nulls/cartas fantasma vindos de sincronização devem ser tratados na borda

**Commit:** `4dfb66b` — UI e BOT precisaram de blindagem contra cartas `null` geradas por dessincronização.

**Regra preventiva:** entradas vindas de Firebase/snapshot devem ser validadas antes de render/IA. Porém, `optional chaining` é defesa de borda, não desculpa para manter estado corrompido; procurar também a origem.

### 17.16 Atualização visual não pode regredir escala em telas grandes

**Commit:** `fe4d432` — houve “carta gigante em 4K”, corrigida travando transição/escala e padronizando o alvo do Lixo para `.pile-card`.

**Regra preventiva:** qualquer mudança em `transform`, `scale`, `transition`, `vw/vh`, `clamp()` ou container de carta deve ser validada também em viewport muito largo/4K, não só mobile/tablet.

### 17.17 Roubo/efeito especial não pode acionar regra paralela de Morto sem intenção

**Commit:** `07fd6bc` — roubo de carta precisou ser separado do ganho de Morto e sincronizado remotamente.

**Regra preventiva:** ações especiais que movem cartas devem declarar quais gatilhos normais **não** devem rodar (Morto, compra padrão, descarte, recompensa, etc.). Não reutilizar handler genérico se ele carrega efeitos colaterais extras.

### 17.18 BOT: proteger contra duplicidade sem mascarar estado inválido

O código atual possui `_turnLocks` e commits como `de07b5b`/`2318e1b` reforçaram cancelamento e sessão.

**Regra preventiva:** trava de duplicidade é última linha de defesa. Se ela dispara com frequência, investigar quem agenda o mesmo turno duas vezes. Não “resolver” apenas adicionando mais locks.

### 17.19 DEVTOOLS deve usar o mesmo motor real, não uma versão paralela simplificada

O histórico recente contém vários commits de correção de DEVTOOLS e laboratório (`8b165f2`, `6334760`, `6e69be7`).

**Regra preventiva:** cenário de laboratório deve montar estado e chamar a lógica oficial. Se um bug aparece só no DEVTOOLS, verificar primeiro se o laboratório divergiu do fluxo real antes de alterar a regra do jogo.

### 17.20 Trocar mecânica exige migrar também inteligência, apresentação e testes

**Commits recentes:** `e718daa`, `35f6b10`, `d833a9b`. A troca de `Procurar carta` por Decreto mostrou que substituir a regra sem migrar todos os anexos gera regressões em som, alerta, BOT, animação, atualização e estados antigos.

**Regra preventiva:** qualquer substituição de feature precisa de uma tabela explícita:

| Parte antiga | Destino novo |
|---|---|
| regra | preservar/substituir/remover |
| som | preservar/reusar/remover |
| animação | preservar/reusar/remover |
| alerta | preservar/reusar/remover |
| BOT usando | migrar estratégia |
| BOT enfrentando | migrar reação |
| save antigo | migrar estado |
| DevTools/testes | atualizar cenários |
| SW/assets | atualizar somente se necessário |

### 17.21 Testes de regressão existentes são documentação executável

O repositório atual já tem testes explicitamente voltados a regressões, incluindo:
- `tests/domination-layout.browser.mjs`;
- `tests/match-control.test.mjs` com regressão de clique rápido/descarte;
- `tests/discard-pickup.test.mjs` cobrindo cancelamento de animação;
- `tests/boss-integration.test.mjs` cobrindo restauração visual de ação negada;
- testes de boss/DEVTOOLS/reload/undo.

**Regra preventiva:** antes de mudar uma área, procurar testes existentes com o nome da feature e palavras `regression`, `reload`, `undo`, `remote`, `bot`, `layout`. Se o bug já existiu, fortalecer o teste antigo em vez de criar proteção paralela.

---

## 18. Checklist operacional antes de aplicar qualquer patch

### Antes

- [ ] Entendi exatamente o pedido e o que **não** foi pedido.
- [ ] Abri o arquivo atual do Drive.
- [ ] Auditei dependências da feature.
- [ ] Procurei implementação existente semelhante antes de criar uma nova.
- [ ] Conferi CSS global + responsivo + específico do modo/tema.
- [ ] Conferi comportamento local + remoto se houver sincronização.
- [ ] Conferi humano + BOT em todos os papéis relevantes.
- [ ] Identifiquei states nullable/timers/pending envolvidos.
- [ ] Não vou alterar UI/texto/som fora do escopo.

### Antes de gravar

- [ ] Reconfirmei `modified_time` do Drive.
- [ ] O arquivo não mudou desde que comecei.
- [ ] Patch é mínimo e não reformatou arquivo gigante sem necessidade.
- [ ] `node --check` passou nos JS alterados.
- [ ] Testes específicos do fluxo passaram.

### Depois de gravar

- [ ] Baixei de volta os arquivos oficiais do Drive.
- [ ] Rodei os testes usando essa cópia oficial.
- [ ] Verifiquei Service Worker/assets se aplicável.
- [ ] Atualizei documentação permanente quando a regra mudou.
- [ ] Atualizei handoff se existe contexto temporário importante.
- [ ] Listei exatamente quais arquivos foram alterados.
- [ ] Se é visual e Biel ainda não confirmou, digo **“aplicado”**, não “resolvido”.

---

## 19. Erros que não devem voltar — resumo rápido

1. mudar coisa não pedida;
2. remover efeito acoplado sem auditar;
3. confundir alerta com execução;
4. diagnosticar visual sem olhar ancestrais;
5. usar escalas diferentes no mesmo voo/estado final;
6. animar local e esquecer remoto;
7. deixar `null` virar `0` em regra de turno;
8. aceitar primeira hipótese sem reproduzir cenário;
9. manter DOM velho durante transição do Morto;
10. deixar elemento central depender de flex lateral;
11. devolver controle ao BOT enquanto ação reativa está `pending`;
12. ensinar só um papel do BOT;
13. corrigir mecanismo mudando UI aprovada;
14. sobrescrever arquivo do Drive que mudou;
15. confiar em tamanho do arquivo sem diff;
16. declarar “resolvido” sem validação visual real;
17. reposicionar geometria aprovada para acomodar efeito visual;
18. deixar overlay temporário entrar no grid/fluxo;
19. apagar função/evento existente durante refactor amplo;
20. carregar seleção local fantasma entre snapshots/reinícios;
21. publicar JS sem checar duplicação/sintaxe;
22. reativar BOT/timers antigos ao voltar de background;
23. remover exceção de Range de áudio/vídeo no Service Worker;
24. corrigir áudio só para um tema quando a regra é global;
25. iniciar etapa B antes de a animação A realmente terminar;
26. mudar ordem de commit do Morto sem teste de deadlock;
27. assumir time/cadeira fixa em HUD relativo ao usuário;
28. combinar restrições persistentes sem matriz de compatibilidade;
29. gerar objetivo de habilidade sem solução legal;
30. alterar transform/scale sem testar viewport largo/4K;
31. reutilizar ação especial em handler genérico que dispara efeitos colaterais;
32. usar lock de BOT para esconder agendamento duplicado em vez de achar a origem;
33. validar carta-alvo na lógica, mas não conferir se a marcação sobrevive à renderização da arte.

---

## 20. Relação com outros documentos

- `docs/README.md`: explica hierarquia de documentação e fonte de verdade.
- `docs/DOCUMENTACAO_CHEFE_DA_MESA.md`: regra funcional permanente dos chefes.
- `docs/INVENTARIO_HABILIDADES_CHEFES.md`: inventário compacto de habilidades.
- `HANDOFF_...md`: contexto recente, pendências e decisões ainda em transição.

Este checklist deve ser tratado como **documentação permanente de manutenção**, não como histórico de conversa.

## 21. Regra permanente: objetivo cumprido não alivia a condição do chefe

- Vale para Dívida, Dominação, Flores, Sede, Mundo do Espelho e Infecção.
- Cumprir objetivo evita sua punição; nunca concede delta negativo na condição especial.
- Objetivos independentes: sucesso em um não desconta a punição da falha de outro.
- Preservar alívio por canastras (Limpa / Real / Ás-a-Ás), incluindo Flores.
- Não confundir com gasto do próprio chefe por vantagem: Vinho Carmesim e Renascimento continuam funcionando. Favorita não é exceção: F2/F3 mantém protegida inalterada (0) e pune o cooperador menos dominado com +8.
- Não alterar custos positivos de escolha/obediência já aprovados nem valores de falha ao corrigir recompensas negativas.
- Auditar engine, adapters, BOT, Laboratório, snapshots legados, HUD/ajuda, definições e documentos; não basta trocar o texto.
- Rodar `tests/boss-objective-resource-rule.test.mjs`, testes de alívio, chefes e suíte ampla. Comparar falhas com baseline e registrar testes bloqueados.
- Helpers do Nemesis ficam em faixa externa abaixo do HUD, como Filhas/Capangas. Validar altura do HUD, chips INVADINDO/ATIVO e ajuda contida nos cinco viewports.

Revisão de 05/10/2026: fonte de verdade exclusivamente local por instrução expressa; sem operações no Google Drive. Detalhes em `REVISAO_OBJETIVOS_CHEFES.md`.

## 22. Ajudas ancoradas e marcações de jogos

- Todo `?` abre o popover oficial perto do próprio botão, com ponteiro; testar chefe, habilidade, S.T.A.R.S., alvo e zumbis.
- Ajustar posição para viewport, scroll e resize; evitar cortes pelo HUD/card. Escape, fechar e clique fora continuam funcionando.
- Textos em blocos curtos, específicos da habilidade. Não anexar regras genéricas irrelevantes nem remover números, prazos ou exceções essenciais.
- Horda/Ômega e duração ficam no painel amarelo. Alvo do dano integrado à arte, sem faixas soltas acima/abaixo dos zumbis.
- Moldura de chefe envolve somente `.meld-line-cards`. Canastra/Limpa, pontuação e contribuições ficam fora. Padronizar Penhora, Posse, Interdito, Raiz, Enxerto, Banquete, Impacto e Espelho, mantendo os efeitos especiais já restritos às cartas.
- Regressões: `boss-ui-readability.test.mjs` e `nemesis-ui.browser.mjs` (cinco viewports, oito famílias de marcação). Não mudar mecânicas para corrigir apresentação.

## 23. Carta-alvo precisa estar marcada na tela — regra para novos chefes e habilidades

Regressão de 05/10/2026: Invasão da Horda escolhia corretamente a carta do Agarrador, mas `renderHand()` anexava seu selo antes de substituir a face com `innerHTML`. A arte apagava o selo. Ter `cardIds` correto no estado ou uma classe CSS não comprova que o jogador vê o alvo.

- [ ] Anunciar a habilidade pelo fluxo real/Laboratório e conferir a carta exata do jogador alvo, não uma carta fictícia marcada manualmente.
- [ ] Renderizar a face antes de anexar overlays/selos; verificar que nenhum `innerHTML` posterior apaga a marcação.
- [ ] Conferir alvo correto, parceiro sem marca indevida, múltiplas cartas e decks diferentes. Não ocultar valor, naipe, seleção ou selo NOVA.
- [ ] Conferir aplicar/remover a marca conforme o estado real, término/expiração, rerender, reload/snapshot/undo e cliente remoto. Não deixar overlays duplicados ou persistentes após o efeito terminar.
- [ ] Usar a identidade visual do chefe e o componente oficial de status; distinguir carta marcada, restrição e área de perigo. Nemesis: infecção verde na carta; Zona de Impacto/perigo laranja.
- [ ] Overlay não intercepta cliques, não aumenta a carta e respeita redução de movimento; animação leve, sem timers por carta.
- [ ] Testar no navegador os viewports adotados e revisar captura visual. Registrar separadamente o que foi automatizado e o que ainda depende de partida real/validação do usuário.
- [ ] Atualizar documentação funcional, inventário e relatório específico do chefe. Comparar textos com código atual, removendo descrições antigas conflitantes.

Proteção automatizada atual: `tests/nemesis-ui.browser.mjs` verifica ordem da renderização, alvo real da entrada do Agarrador, parceiro sem marca, selos MARCADA/AGARRADA/CONTAMINADA, efeito verde compartilhado, ausência de duplicação, limpeza do overlay, NOVA sem sobreposição e redução de movimento. O teste de navegador usa fixture local, não uma sessão Firebase ao vivo; os demais itens da matriz continuam obrigatórios em futuras alterações.
# Matriarca — teto de Flores por ativação (05/10/2026)

- Uma mesma ativação gera no máximo +1 Flor, mesmo que vários objetivos falhem em turnos diferentes. Reload/snapshot/undo preservam o histórico das Flores aplicadas; canastra não reabre a quota da ativação.
- Trepadeiras Gêmeas: 1 ou 2 falhas = +1 no total; propagação por falha dupla preservada.
- Enxerto: regra histórica de 05/10 parcial/total = +1. Revisão de 08/10: novos anúncios com um lado curam até 50 HP sem Flor; zero lados = +1, propagação por falha total preservada. Teto global continua +1 por ativação.
- Florescimento Real: todas as falhas compartilham +1; sem cura/fortalecimento novos.
- Preservar HP 2000, derrota em 5, Limpa −1 / Real −1 adicional / Ás-a-Ás −1 adicional, Orvalho, Casulo, cura atual e Renascimento F3 (1x, consome 1 Flor, 300 HP).
- Reavaliar a cura somente depois do teste de jogo; este patch não altera seus limites nem outros chefes.
# Regra global de recuperação e Favorita (05/10/2026)

Cumprir uma habilidade nunca reduz a condição especial de vitória do chefe. O sucesso apenas evita a punição. A recuperação concedida aos jogadores ocorre somente através das canastras aprovadas. Sucesso parcial não recupera recurso. A regra também vale para efeitos automáticos, como Favorita, e recursos equivalentes futuros.

- Exceções: gastos internos aprovados, como Vinho Carmesim e Renascimento. Não são recompensas aos jogadores.
- Favorita F2/F3: protegida 0; cooperador menos dominado +8; seleção e aplicação única preservadas. Não alterar os demais valores/chefes.
- Regressão global percorre todas as habilidades ativas registradas e suas fases com recurso inicial positivo; as exceções são identificadas explicitamente. Testes específicos cobrem sucesso, parcial, canastras e snapshot.

## 24. Suíte local e fixtures — revisão de 06/10/2026

- [ ] Executar a suíte atual antes de corrigir. Distinguir regressão de produção, expectativa antiga, harness incompleto e sincronização; não usar skip/todo para esconder falhas.
- [ ] Funções extraídas de `app.js` devem receber as dependências atuais: gate real de ação/pausa, wrappers e implementações `Once`, helpers importados e callbacks isolados. Não adicionar globals artificiais à produção para satisfazer uma VM antiga.
- [ ] Ler módulos e CSS no caminho atual; styles específicos de chefe podem estar separados de `boss-mode.css`. Validar versão atual do cache sem regredir releases para satisfazer literals antigos.
- [ ] Loops de avanço de apresentação devem ter limite e assertion de estágio. Uma escolha humana pendente não avança para `players` sem resolução; não esperar esse estágio indefinidamente.
- [ ] Cenários `no_target` precisam realmente retirar todos os alvos válidos, preservando as 108 cartas. Fallback de teto de fase/cadáver deve ser esperado explicitamente, sem flexibilizar a exigência da habilidade escolhida nos demais cenários.
- [ ] Canastra criada pelo DevTools deve persistir o mesmo controle de bônus do fluxo normal. Reprocessar após reload não pode conceder nova compra no mesmo turno.
- [ ] Manter o orçamento do HUD: se o texto estourar, corrigir a apresentação, não aumentar silenciosamente o limite do teste. Validar nos viewports do browser test.
- [ ] Conferir cura anunciada contra mecânica: Pólen até 30 HP; Colheita 0–7 nada, 8–10 cura 50, 11+ cura 80 e +1 Flor. Corrigir somente texto quando o motor já estiver certo.

Resultado e classificação desta revisão: `docs/LIMPEZA_SUITE_2026-10-06.md`. Nenhuma regra de balanceamento foi revertida.

## 25. Lixo protegido dos chefes e UX do Nemesis — 06/10/2026

### Durabilidade e Agarrador por turno — decisão posterior de 06/10/2026

- [ ] Novas partidas/Laboratório: Nemesis 2200 HP; Agarrador 220, Infectado 240, Devorador 260. Reanimação 110/120/130; manter 1x/fase, teto e Mutado na F3. Corpse nunca elegível para Invasão.
- [ ] Após compra **Monte e Lixo**, testar humano e BOT, cada jogador em seu turno; normal/Mutado/Reforçado/ambos prendem exatamente 1/2/2/3 quando houver cartas seguras suficientes. Priorizar jogáveis e completar com outras cartas da mão, mesmo sem jogada imediata; reduzir só por falta física ou proteção necessária. Não reservar `priorities.plan.playedCardIds`: testar combinações da quota completa no estado resultante, reduzindo só após esgotá-las. Planner testa todos os descartes legais; AGARRADA bloqueia somente jogo. Barragem com 3 MARCADAS + AGARRA 2 precisa manter 2 saídas reais. MARCADA + AGARRADA coexistem com um overlay e dois selos legíveis. Validar solução única/alternativas, descarte final, Morto/batida, snapshot/undo e chip vs. quantidade. Só após concluir compra e jogada obrigatória do Lixo. Cartas permanecem na mão, descarte livre, fim do turno/morte liberam imediatamente. Regressão: `tests/nemesis-grabber.test.mjs`.
- [ ] Preservar solução completa de Caçada, Tentáculo, Barragem, Extermínio e Invasão, incluindo apoio e descarte final; verificar Invasão cooperativa com progresso já feito pelo parceiro. Sem candidato seguro, menos/zero travas, sem punição nova.
- [ ] BOT: plano do objetivo, extensão genérica, tríades/worker e panic dump não usam Agarradas; recalcular após compra, conseguir jogar/descarte sem deadlock. Não mudar heurística de alvo.
- [ ] Compra repetida/reload/snapshot/undo não duplicam restrição/evento/pulso; saves antigos preservam lifecycle, quota/alvo e HP baixo, limitando HP acima dos novos máximos sem reset da partida.
- [ ] Preservar Infecção, pesos, cura/bônus/regen, regra global do Lixo, alívio por canastra e demais cinco chefes. Dano em zumbi sem overflow nem troca de S.T.A.R.S.; Comando continua no zumbi reforçado.
- [ ] Executar Nemesis/compra/BOT focados, browser nos cinco viewports e suíte ampla. Registrar estimativa ~68,9% apenas como histórico anterior à regra global do Lixo e a este patch, nunca percentual atual. Referência: `BALANCEAMENTO_NEMESIS.md`.

- [ ] Decreto contra Escravo BOT: testar bloqueio antes da compra e durante a janela de reação. BOT compra do Monte, sem coletar o Lixo. `BOT_PLAN_STALE` em sessão/turno ainda válidos retoma a recuperação após concluir a operação do Decreto; cancelamento real, troca de turno ou saída da sessão não podem comprar/descartar. Não deixar `lastBotTurnPlayed` travar um turno com plano invalidado. Cobertura: `domination-decree-bot-resume.test.mjs`.

- [ ] Regra limitada a TODOS os modos Chefe, sem alterar Buraco normal/Dominação. Natural comum no jogo existente escolhido: topo legal sozinho → topo; depende de cartas da mão como ponte/complemento → inteiro. Validar com `isValidBossSequence()`, sem consultar outro destino. Jogo novo pela mão → inteiro; Joker → topo; 2 existente → topo; 2 coringa novo → topo; 2 natural novo → inteiro. Testar ponte/complemento, Lixo com várias cartas, humano/BOT/Nemesis/Zona Contaminada e tentativa inválida sem mutação.
- [ ] Papel do 2 usa o validador canônico; 2–3–4 e 3–4–2 equivalentes. Não criar detector paralelo ou decidir pela posição visual.
- [ ] Somente o `?` explica a retirada; não adicionar feedback contextual durante seleção/compra. Humano/BOT usam a mesma consulta e quantidade real para mão final, Morto/batida e limites. Bloqueio/erro não move cartas; rerender/snapshot/reload não duplica retirada.
- [ ] Ajuda opcional `?` junto ao contador do Lixo somente no modo Chefe: não disparar retirada, não duplicar controle nem criar avisos adicionais. Validar mouse/toque/Enter/Escape, compra bloqueada, saída do modo e popover dentro dos cinco viewports. O componente oficial precisa inicializar fechar/teclado mesmo sem habilidade ativa. Fixture do HUD deve incluir a seção externa inteira, não encerrar na seção aninhada oculta do registro.
- [ ] Nemesis INVADINDO: explica expulsão, sem HP de combate nem alvo. Arte principal seleciona boss; chip/help não seleciona. Testar teclado e permissões de turno/observador.
- [ ] Chip final calculado com a passiva real: Agarrador 1/2/3, Infectado 2/4/6, Devorador 40/70/100; incluir Normal + Reforçado 2/4/70. Ajuda específica de Mutado e reforço, prazo inclusivo (`roundNumber + 1`). Comando apenas persistent vivo.
- [ ] MARCADA / AGARRADA / CONTAMINADA na carta exata; mesma identidade verde. Pulso de Agarrada só em evento novo, sem replay, depois marca estática; limpar no término/morte, respeitar redução de movimento.
- [ ] Comparar contorno, espessura e brilho reais da mão/Invasão com o Lixo: um único overlay compartilhado, sem somar bordas/glows no contêiner e na face. Pulso altera apenas opacidade, sem engrossar ou ampliar a marca. A fixture deve decorar a face real do Lixo, não apenas ativar a classe do contêiner.
- [ ] Comparar contorno, espessura e brilho reais da mão/Invasão com o Lixo: um único overlay compartilhado, sem somar bordas/glows no contêiner e na face. Pulso altera apenas opacidade, sem engrossar ou ampliar a marca. A fixture deve decorar a face real do Lixo, não apenas ativar a classe do contêiner.
- [ ] Zona de Impacto somente em `.meld-line-cards`, excluindo metadados/cabeçalho.
- [ ] Objetivos comprovam rota real no planner: Tentáculo distingue jogo completo/descarte parcial; Barragem prova duas saídas conjuntas; Caçada dano direto, Extermínio dano do S.T.A.R.S. + contribuição do parceiro, congelados e conjuntamente legais. Sem plano → inelegível/fallback. Saves v1 preservam objetivo já anunciado.
- [ ] Rodar regra do Lixo, handlers humano/BOT, Nemesis, laboratório, integração e suíte ampla; browser nos cinco viewports. Medir proximidade do popover entre bordas, não a partir do centro de um chip largo.

Relatório e limitações: `REGRA_LIXO_E_UX_NEMESIS_2026-10-06.md`. Sem novo balanceamento, commit, deploy ou Google Drive.

### Feedback de dano por alvo — Nemesis (06/10/2026)

- [ ] Golpes em cada zumbi mostram impacto/número no próprio card, inclusive ao virar cadáver, nunca no HUD do Nemesis. Usar `targetId` do evento e HP efetivamente perdido; zero não cria número. Manter deduplicação por evento no render/reload.
- [ ] Validar HP dos zumbis verde (>50%), amarelo (25–50%) e vermelho (≤25%); Nemesis com âmbar/vermelho claramente distintos, números legíveis e reduced motion sem pulso.

### Entrada do Devorador — Nemesis (06/10/2026)

- [ ] Elegibilidade exige só um jogo existente alimentável, sem exigir plano completo de expulsão. Objetivo: 3 cartas novas acumuladas na rodada nos IDs dos jogos do início, no mesmo jogo ou em vários, por um ou dois jogadores.
- [ ] Reorganização, jogos novos, cartas repetidas e replay/reload/snapshot/undo não duplicam progresso. Aos 3 repele imediatamente; menos de 3 ao fim da rodada persiste, Mutado na F3. BOT e Laboratório usam planos incrementais dos jogos válidos.
- [ ] Entrada é distinta da passiva persistente: a passiva soma cartas novas em qualquer jogo da equipe, inclusive jogo novo, entre jogadores e turnos. A cada 3 créditos cura 40/70 HP, Reforçado +30; máximo 1x/turno sem perder créditos excedentes. Morte/reanimação zeram créditos.

### Pacote de compatibilidade e batida — 07/10/2026 (regressões permanentes)

- [ ] REFLEXO MORTO bloqueia jogo, não descarte; seletores legados de Imagem Falsa/Espelho Estilhaçado excluem a carta. Normalização remove só illusion lock sobreposto, mantendo outros locks. Não reintroduzir habilidades fora da rotação.
- [ ] Espelho do Lixo inelegível com Hawk/bloqueio canônico; volta após desbloqueio. Snapshot incompatível cancela objetivo sem punição, remove escolha e ajusta HUD/ajuda.
- [ ] Pólen no topo marca a carta exata; enterrado indica só a pilha. Cotação protegida não dispara punição ao adquirir topo normal; retirada completa com a carta contaminada dispara uma vez. Render/reload preservam identidade. Browser desktop/tablet/mobile.
- [ ] Batida = 100 em qualquer pontuação e mesmo com Dominação. Preservar absorção, Renascimento, alvo Nemesis, eventos/estatísticas e derrota por chefe sobrevivente; BOT simula o mesmo pipeline em clone, sem mutar partida real. Fora de Chefe não muda.
- [ ] Devorador: 3 juntas e 1+1+1 equivalentes; contador da equipe atravessa jogadores/turnos/jogos, inclusive novos. Mesma carta/reorganização/replay não soma. 6 cartas geram uma cura e 3 créditos pendentes, consumidos em turno posterior. Morte/reanimação zeram; entering/repelled/corpse não somam. 40/70/+30 pelo helper, HP máximo respeitado.
- [ ] Save antigo inicia contador zero sem contar mesa antiga; reload/render não cura; undo restaura contador/IDs/quota. Humano e BOT usam o mesmo hook sem exigir jogada artificial de 3 cartas.

Regressões: `tests/boss-october-package.test.mjs`; fixture visual real do Lixo: `tests/nemesis-ui.browser.mjs`. Rodar suítes focadas e ampla, sem skip/todo para esconder falhas. Preservar HEADER e alterações manuais fora do pacote.

Validação local em 07/10/2026: baseline 919/919; 35 regressões novas; focados 774/774; ampla 954/954, zero falhas/skip/todo. Browser Nemesis passou nos cinco viewports e Pólen no render real em quatro tamanhos; HUD UX passou em desktop/tablet com seis chefes, ajuda e reduced motion. Checagem extra `lunar-theme.browser.mjs` falha na expectativa de cores dos painéis (#35f08a/#ff4b5f vs. tema atual #eed39b/#c4a0ed); todos os seus arquivos de entrada são idênticos ao HEAD anterior ao pacote. Falha preexistente mantida visível, sem alterar tema/HEADER ou teste fora do escopo. Partida Firebase real não foi validada.
