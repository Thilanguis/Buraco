# Rework experimental — Lady Dimitrescu — 07/10/2026

Fonte: briefs principal/adendo do usuário e implementação local. Não há win rate medido desta versão; 65–75% (alvo ~70%) é apenas a meta de calibração.

## Contrato de combate

Atualização de balanceamento — 08/10/2026: filhas 450 HP, regeneração 50 por rodada e 25 com Anticoagulante. Permanecem 500 PROT. sustentados por filha, piso de 200 HP, redução de máximo de 100 por item e passivas +3 Sede. Lady, Sede e Fúria não mudaram neste passe.

Durabilidade nominal, sem cura, itens, excesso de dano ou Fúria: matar as três filhas e depois Lady custa 1350 + 2000 = 3350 de dano, contra 3500 pela rota direta da proteção. Vantagem de 150 (4,3% do total direto), antes inexistente. HP conjunto das filhas cai 10%; regeneração cai 16,7% (máximo conjunto de 180 para 150 por rodada com três vivas e feridas). Uma regeneração de 50 por filha já consome sua vantagem nominal; cura/Sede da Fúria continuam sendo custos da rota. É uma estimativa de durabilidade, não win rate medido nem garantia de que essa rota seja sempre melhor.

Migração de saves do rework: `castleDaughterBalanceVersion: 2` aplica uma vez a redução de 50 ao máximo anterior, respeitando piso 200 e perdas por itens. HP restante só é limitado ao novo máximo, sem cura ou ressurreição. Regen antiga 60/30 passa a 50/25. Itens, anexos, Frio/Relíquia, Sede e proteção consumida são preservados; reload/snapshot/undo não repetem a redução.

- Lady 2000 HP; Bela/Cassandra/Daniela permanentes 450/450, sem revive. Valores em `js/boss/dimitrescu-castle.js` (`CASTLE_BALANCE`). Não existe resistência percentual nem bônus de HP por filha.
- Vínculo consumível: Lady começa com 2000 HP e 1500 PROT. adicionais. Cada filha viva sustenta capacidade de 500 PROT. Dano à Lady passa por Coágulo → PROT. → vida, com excedente, inclusive Ataque Final de 100. Morte de filha retira até 500 da proteção restante, sem dano automático à vida. Proteção esgotada não volta com cura/regen/rodada: a vida fica exposta mesmo com filhas vivas.
- Alvo por jogador: Lady ou filha viva; uma fonte, um alvo, sem overflow. Seleção inválida após morte volta para Lady. Passivas/regen das filhas são independentes do lifecycle de invasão/reanimação do Nemesis.
- Fim de rodada: resolver obrigações/Sede, converter Coágulo quando aplicável, regenerar filhas vivas, avançar rodada. Regen própria até 50; não cura Lady. Frio bloqueia uma regen; Anticoagulante fixa 25 permanentemente, sem stack.
- Bela: marca carta legal no começo da rodada, prazo fim do turno do alvo; falha +3. Cassandra: jogo com contribuição concreta, prazo fim da rodada; falha +3. Sem candidato legal não há obrigação/punição. Os validadores consideram descarte e Morto/batida. Daniela: primeira retirada efetiva do Lixo pela equipe +3, uma vez por rodada, protegida ou completa. Sem compra não pune.
- Cadência atual: exatamente uma filha viva é escolhida por rodada normal com o RNG canônico. Evita a última escolha normal quando há outra viva; com uma viva, sempre ela. `castleSelectedDaughterIds`/`castleLastDaughterId` e os objetivos persistem no snapshot/undo, sem sorteio no render. Entidades continuam apenas `alive`/`dead`; as outras permanecem atacáveis, regeneram, protegem a Lady e aceitam itens. Sem candidata legal, a filha escolhida não inventa objetivo.
- Sucesso apenas evita punição. Canastras continuam Limpa -4, Real -8, Ás-a-Ás -12, descontando a diferença entre tiers. Gastos internos do Vinho continuam permitidos.

## Troca de poder e Fúria

Saíram de pools/introduções/catálogo: `bela_hunt`, `cassandra_feast`, `daniela_swarm`. A versão antiga de `three_daughters` (+8 por objetivo) também foi aposentada; snapshots com esse payload são cancelados sem punição. Banquete dos Mortos (`cassandra_dead_feast`) é da Lady e funciona mesmo com Cassandra morta. Demais pesos-base/números-base e regras dos outros chefes foram preservados.

Passe de cadência de 07/10: `three_daughters` versão 2 retorna nas F2/F3, peso 3: substitui a escolha única por todas as filhas vivas, usando as passivas padrão +3 e seus próprios prazos; sem quarta passiva, duplicação ou cobrança adicional no fim. `impure_blood` (Sangue Impuro), F1/F2/F3, peso 3: primeiro Joker/2 usado como coringa por cada cooperador +3, máximo +6 por rodada inclusive com Fúria; 2 natural não ativa. Consulta sequência e flags canônicas da contribuição real, não posição visual. IDs de jogadores já acionados persistem no payload; não há cobrança extra na resolução. Introduções F2/F3 incluem ambas para ampliar variedade.

Modelo de projeto: 45% pressão especial, 25% durabilidade/cura/barreira/auxiliares, 20% controle/produtividade, 10% burst/snowball. A cadência reduz principalmente a pressão especial. A estimativa histórica ~75% antecede o rework e mudanças globais; não é telemetria nem percentual atual. Não foi localizado harness probabilístico da Dimitrescu; os testes de balanceamento do workspace são regressões de regras, não simulador de win rate. HP, Vínculo, itens, regeneração e Fúria não foram nerfados neste passe; calibração depende de playtest.

0/1/2/3 mortes = NORMAL/FÚRIA I/FÚRIA II/FÚRIA FINAL. Cura da Lady ×1/1,10/1,20/1,30, arredondada para baixo e limitada ao HP máximo; inclui Vinho, Banquete e Coágulo. Sede ofensiva própria +0/2/4/6 **por evento positivo**, não por marca/faixa individual dentro da mesma resolução. Não aumenta +3 das filhas, Sangue Impuro (máximo +6), regen, custo do Vinho ou HP máximo. Fotos/áudios de fase são independentes da Fúria.

### Revisão de Sede — 07/10/2026

Tributo por jogador: 0–7 cartas não cobra; 8–10 cobra +3/+4/+6 nas F1/F2/F3; 11+ cobra +6/+8/+10. Marca Carmesim: +5/+7/+9 por marca que falhar. Banquete dos Mortos: +10/+14 nas F2/F3, mantendo cura 90/130 e purificação base +4 sem cura. Fúria acrescenta +2 por filha morta ao evento positivo da Lady, uma única vez por resolução. Passivas +3, Sangue Impuro +3 por jogador/máximo +6, barra 100, HP, Vínculo, regeneração, itens e cura da Fúria não mudaram. Os passes anteriores que preservaram os números-base são históricos, anteriores a esta revisão.

## Associação física dos itens

- 108 cartas físicas, sem criar cartas extras; exatamente 15 IDs distintos, 3 de cada tipo. Todas as cartas são candidatas, incluindo Jokers e ambos os baralhos.
- Associação determinística pela seed, uma vez antes de embaralhar/distribuir. Não favorece posição/mão/Morto/Lixo; não garante item inicial nem rerrola resultados ruins.
- `boss.castleItems[cardId] = { type, consumed }` é a fonte persistente; `card.castleItem` acompanha a face real. Normalizar apenas reidrata metadata, sem sorteio/consumo.
- Associação acompanha Monte, mão, Morto, Lixo, jogo, reload/reconexão e undo. Itens consumidos nunca voltam utilizáveis ao retornar ao Lixo.
- Laboratório distribui 15 itens nos mesmos 108 IDs do cenário, uma vez, sem fabricar mãos favorecidas.

## Sacrifício

Somente carta da própria mão após compra, no turno autorizado e com filha viva. Não é meld/descarte, não fecha turno nem autoriza batida. Preserva uma carta de descarte legal, topo obrigatório do Lixo e gates de ação existentes. A carta real sai da mão e fica anexada à filha.

Todo item reduz máximo em 100, piso 200, e limita HP atual. Depois executa o especial, mesmo no piso:

| Tipo | Especial |
|---|---|
| Adaga | 50 de dano |
| Frasco de Frio | Bloqueia exatamente a próxima regen |
| Anticoagulante | Regen 50→25 permanente; não acumula |
| Explosivo | 100 de dano |
| Relíquia | Suprime uma janela da passiva da filha: atual se pendente, próxima se já resolvida |

Morte cancela obrigação/regen, impede alvo/item e devolve cartas reais ao **fundo** do Lixo sem mexer no topo. Marca `deathRecorded`, atualiza Vínculo/Fúria e emite evento individual. Rerender/reload não repete morte, devolução ou áudio.

## Apresentação e áudio

- `ITEM_DEFINITIONS` centraliza labels/paths dos cinco PNGs reais em `assets/images/items/`: `adaga.png`, `frasco-frio.png`, `anticoagulante.png`, `explosivo.png`, `reliquia.png`. Artes do usuário copiadas com transparência preservada; nenhuma substituição por emoji.
- Face original mantida; overlay central 46%/máximo 40% nas demais zonas; na mão ampliado a 64%/máximo 55%, com contraste escuro, sem cobrir cantos. O PNG é a área clicável/focável da ação de item, com aria-label e popover; sem botão textual grande. Marca de Bela fica na borda/glow e identificador periférico, nunca no centro do item. `object-fit: contain`, PNG com `pointer-events: none`; faces ocultas continuam ocultas.
- Miniaturas reais anexadas em fan compacto. Faixa “ITENS DO CASTELO” entre Sede e Próxima Fase, cinco artes clicáveis e `i`, usando popover oficial por mouse/toque/teclado, Escape/clique fora e viewport.
- Filhas em três colunas alinhadas. Arte integral, HP/passivas sobrepostos, cartas sacrificadas laterais sem painel de fundo. Barra na escala visual de 450: verde/amarelo/vermelho e fundo escuro como os zumbis do Nemesis; área cinza petrificada destaca o máximo perdido por itens, sem hachura. Texto vida/450; chip ↓ MÁX e ajuda informam o máximo recuperável real. Não altera HP, dano ou regeneração.
- Uma única barra da Lady: vida vermelha à esquerda e proteção dourada anexada à direita, sem sobreposição. Total soma HP atual + PROT. restante (3500/3500 inicialmente); máximo visual = 2000 + capacidade das filhas vivas. Segmento PROT. mostra o restante e preenchimento consumível, mantendo espaço escuro para o que foi gasto. `i` explica ordem de absorção, excedente e perda na morte da filha. Não existe mais piso de HP da Lady.
- Fúria clicável (+10% cura e +2 Sede ofensiva própria por morte). Ícones do castelo maiores, distribuídos pela largura sem aumentar a altura padrão do HUD, sem molduras, com disponíveis/total (3/3). Ajuda mostra usados/anexados; disponíveis significa não usados em qualquer zona, sem revelar localização oculta. Contraste e tamanho ampliados nos itens da mão, preservando rank/naipe.
- Sem chip permanente REGEN +50: regeneração permanece na ajuda da filha. Cada filha viva tem um único chip de identidade consultável à direita: CAÇADA, BANQUETE ou LIXO +3. Neutro quando não age; destacado quando selecionada, com carta/jogo concreto no mesmo chip (CAÇADA · 8♥ / BANQUETE · JOGO 2). As Três Filhas destaca os três, sem chips extras de falha. Consequência e resultado ficam no help completo do próprio chip, não em CUMPRIDA/APLICADO permanentes. Mesmas classes, dimensões e popover do Nemesis; sem ATIVA/AGUARDANDO/INATIVA. Debuffs Frio/Anticoagulante/Relíquia/↓ MÁX continuam separados. Relíquia pendente espera a próxima oportunidade de passiva, não expira em rodada não selecionada. Esta revisão de chips é exclusivamente de UX, sem alterar cadência ou números.
- Alvo selecionado pelo retrato da Lady ou das filhas, borda/aria-pressed e teclado como Nemesis. Removido o botão separado abaixo das filhas. Ajuda/Fúria/itens não mudam alvo. Monte/Lixo não se deslocam ao trocar alvo.
- Cada morte individual toca o arquivo fornecido `assets/sfx/what-have-you-done-to-my-daughter.mp3` e flash na Lady; inicialização/reload não toca eventos históricos. Reprodução respeita desbloqueio de áudio do navegador. Reduced motion remove o flash/voo; não remove informações.
- Novos módulos/artes/áudio precacheados; cache do service worker atualizado sem reduzir versão anterior.

## BOT

Mesmo pipeline de dano e guard de sacrifício do humano. Respeita alvo explicitamente selecionado; sem seleção, prioriza Lady exposta ou golpe letal na filha, caso contrário consome PROT. com ataques diretos. Preserva Jokers/2, cartas em grupos óbvios por naipe e marcas obrigatórias; usa cartas isoladas com item, evitando Frio/Anticoagulante/Relíquia redundantes. Heurística mínima, não otimizador perfeito nem simulação de win rate.

### Persistência do Vínculo consumível — 07/10/2026

`boss.bloodLinkProtection` guarda a proteção restante, limitada a `500 × filhas vivas`. Saves anteriores sem esse campo recebem uma vez a capacidade das filhas vivas, sem mudar HP, itens ou Sede. Zero é preservado; normalizar/renderizar não recarrega. Snapshot/undo transportam proteção junto às filhas. Morte retira 500 restantes (mínimo zero), uma vez por filha, e limita ao novo teto. Esta revisão substitui o piso descrito nos registros históricos anteriores; não altera Sede, Fúria, cura, HP das filhas, regen ou itens.

## Compatibilidade

Snapshots com `bela_hunt`, `cassandra_feast`, `daniela_swarm` ou payload antigo de `three_daughters` são cancelados sem punição retroativa. A nova `three_daughters` com `passiveVersion: 2` permanece válida. Saves pré-rework recebem filhas e clamp do máximo da Lady, mas **não sorteiam 15 itens retroativamente** em reload, para não inventar uma distribuição após o deal. Para testar o contrato completo, começar uma partida/scenário novo. Saves versão 1 preservam consumo, anexos, estados e RNG sem reaplicação; undo restaura todos juntos.

## Regressões e validação

### Passe de UX dos chips — 07/10/2026

Um chip principal por filha viva, com identidade persistente e neutra fora da ação; contexto e destaque no mesmo chip quando age. Debuffs continuam separados, consequência/resultado no help, sem chips de log. Renderer e CSS da Dimitrescu somente; nenhum motor, BOT ou número alterado neste passe. Testes atualizados: `dimitrescu-castle.test.mjs`, `dimitrescu-cadence.test.mjs`, `dimitrescu-castle.browser.mjs`. Resultado: 129/129 focados e 998/998 ampla, sem falhas, skip ou todo; browser Dimitrescu 1920/1376/390 e Nemesis em cinco viewports. Mouse/toque/Enter, help completo sem mutação de estado/target, geometria compartilhada, neutro/destacado, resultados sem chips extras e debuffs preservados. Screenshots locais inspecionadas; fixture com módulos/CSS reais, não partida Firebase. `git diff --check` limpo; sem commit/push.

Fundo da mesa: `dimitrescu` selecionável nos menus normal/debug e padrão da Lady, com `assets/resident/dimitrescu-table.webp` (1774×887, cerca de 459 KB). `resident` continua compatível com saves e associado ao Nemesis, agora rotulado Resident Evil 3 — R.P.D. Baralho e sons Resident Evil preservados; cache v284 inclui a nova arte. Regressões em `dimitrescu-table-theme.test.mjs`, `resident-theme.browser.mjs` e `table-background.browser.mjs`.

`tests/dimitrescu-cadence.test.mjs`: escolha única determinística, não repetição, mortas excluídas, snapshot/undo, Relíquia na próxima oportunidade real, As Três Filhas sem duplicação, Sangue Impuro canônico por jogador e teto +6, inclusive com Fúria. Regressões compartilhadas em `boss-mechanics-isolation.test.mjs` e `boss-objective-resource-rule.test.mjs`.

`tests/dimitrescu-castle.test.mjs`: pisos, dano/Coágulo/final, associação física/seed/Joker, snapshot/undo, sacrifício/descarte, efeitos e duração, morte/retorno, passivas/prazos/candidatos, Fúria, Banquete com Cassandra morta, BOT, migração, Laboratório e áudio três vezes sem replay.

`tests/dimitrescu-castle.browser.mjs`: DOM/estilos oficiais e módulos reais, desktop 1920, tablet 1376, celular 390; PNGs, overlay proporcional, conteúdo não recortado, ajuda/Escape/viewport, seleção de filha e consumo de carta, reduced motion e ausência de erros JavaScript. Fixture local, não sessão Firebase real.

Risco restante: 2000 + três filhas/regen + distribuição aleatória + Fúria exige playtest/telemetria. Não afirmar vitória ~70% como resultado. Nenhum asset pendente.

### Resultado local

Passe atual de cadência/targeting: **798/798 focados**, mais **48/48 focados** após o fundo do castelo; execução ampla final **995/995**, zero falhas, skip ou todo. Browser Dimitrescu em 1920/1376/390: retrato da Lady selecionável, sem botão separado, chips reais, itens/ajuda por mouse/toque/teclado, viewport e reduced motion. Browser Nemesis passou em cinco viewports. Fundos: quatro temas em cinco viewports; CSS/decodificação reais do Castelo e Resident em desktop/tablet, sem alterar dimensões das cartas. Fixtures com módulos/CSS reais; Firebase e win rate não medidos. `git diff --check` limpo; sem commit/push.

Resultados abaixo são históricos das etapas anteriores deste rework, não a execução atual:

- Baseline fresco: 954 testes, 953 passavam; falha preexistente do parser de URLs CSS ao encontrar `url()` dentro de SVG inline. Corrigido o harness, sem remover o SVG/efeito do usuário.
- Rework: 26 regressões novas; focados chefes/integração 714/714; ampla final 972/972, zero falhas, skip ou todo. Contagem ampla também reflete retirada de casos parametrizados das quatro habilidades removidas do catálogo.
- Browser: 1920/1376/390, mouse/toque/Enter, Escape/clique fora, viewport, faces/PNGs, sacrifício e anexos, três estados de HP, filhas mortas/Fúria final e reduced motion. 13 JavaScripts de produção com sintaxe válida; `git diff --check` limpo.
- Sem commit/push. Alteração manual prévia em `tests/nemesis-progress-meters.test.mjs` preservada. Firebase real e win rate não validados.

### Arquivos deste patch

Histórico da correção de interação anterior ao passe de cadência: regeneração e passivas foram reunidas em chips consultáveis no canto superior direito (66/66 focados). O chip REGEN foi depois removido pelo novo brief; a regeneração está na ajuda. Retarget não ativa a marcação legada de Enxame de Daniela; ausência de Pólen não alterna sua classe. Mantida a descrição acessível da passiva de Daniela no Lixo. Browser 1920/1376/390 verifica cliques repetidos sem deslocar Monte/Lixo/mão e ajuda sem troca de alvo.

Histórico da primeira correção visual de 07/10: alinhamento em terços, suporte lateral e debuffs consultáveis (715/715 focados; 973/973 ampla). A régua separada do Vínculo e faixa faltante das filhas dessa iteração foram substituídas pela apresentação acima a pedido do usuário. Nenhuma dessas correções altera motor, BOT ou balanceamento. Fixture usa CSS/renderer/popover reais; não substitui playtest Firebase.

Validação da apresentação final: 716/716 focados e 974/974 ampla, sem skip/todo. Navegador em 1920/1376/390: vida/proteção na mesma barra, nenhuma sobreposição com 3/2/1 filhas, inventário após uso, Fúria/debuffs por toque/teclado, viewport e reduced motion. `git diff --check` limpo; sem commit/push.

Refinamento visual posterior no mesmo dia: itens ampliados horizontalmente com altura do HUD comparada à versão anterior (inalterada); mão 64%/55%; barra das filhas na escala original 500 com petrificação de máximo por itens e paleta/fundo Nemesis; removido painel atrás dos sacrifícios. Browser 1920/1376/390 passou, incluindo três estados de vida e faixa petrificada de 20% após item; suíte ampla 974/974. Mecânica de máximo recuperável continua intacta.

- Integração: `app.js`, `bot.js`, `js/audio.js`, `service-worker.js`, `js/game/card-face.js`.
- Motor: `js/boss/boss-engine.js`, `js/boss/boss-debug-scenarios.js`, `js/boss/bosses/dimitrescu.js`, `js/boss/mechanics/dimitrescu.js`; novo `js/boss/dimitrescu-castle.js`.
- UI: `js/boss/presentation/dimitrescu.js`, `js/boss/ui/dimitrescu-ui.js`; novo `js/boss/ui/dimitrescu-castle-view.js`; `styles/boss/dimitrescu.css`, `styles/cards.css`.
- Testes atualizados: `boss-debug-scenarios.test.mjs`, `boss-hud-copy-v1.test.mjs`, `boss-isolation-architecture.test.mjs`, `boss-mechanics-isolation.test.mjs`, `boss-october-package.test.mjs`, todos em `tests/`. Novos: `dimitrescu-castle.test.mjs`, `dimitrescu-castle.browser.mjs`. Teste manual do Nemesis não foi editado pelo rework.
- Docs: este contrato, `INVENTARIO_HABILIDADES_CHEFES.md`, `DOCUMENTACAO_CHEFE_DA_MESA.md`, `CHECKLIST_REGRESSOES_E_ATUALIZACOES.md`, todos em `docs/`.
- Assets novos: cinco PNGs em `assets/images/items/` listados acima e `assets/sfx/what-have-you-done-to-my-daughter.mp3`.

### Polimento das ajudas e inventário — 07/10/2026

As ajudas da Lady, habilidades, filhas, Vínculo, Fúria e itens priorizam ação, efeito e prazo em blocos curtos. A carta anexada mantém sua imagem e explica o efeito especial + petrificação de 100 HP; a devolução ao fundo do Lixo fica em uma nota breve. Não repetir avisos de item já usado. A mesma descrição de item atende à mão, ao inventário e à carta anexada.

Contadores disponíveis/total ficam ao lado dos ícones. Imagens limitadas ao espaço do inventário, sem escala que invada a moldura PNG da Sede; altura do HUD preservada. Chips e seleção/cadência das passivas não mudaram.

Validação deste polimento: 56/56 focados; 1000/1000 ampla, sem skip/todo; navegador 1920/1376/390 com mouse/toque/teclado, Escape/clique fora, viewport e reduced motion. Geometria confirma contador lateral e separação da moldura real da Sede. Nenhuma mecânica, número, balanceamento ou BOT alterado; sem commit/push.

### Ganhos de Sede por origem e laboratório — 07/10/2026

A Sede causada por Bela/Cassandra/Daniela tem um traço vermelho do retrato à barra; a chegada atualiza o preenchimento e mostra seu número. Ganhos da Lady e das filhas são apresentados um por vez. Trata-se apenas da apresentação: a resolução continua imediata, com os mesmos valores. Eventos registram origem e valor aplicado; render/reload não reproduzem histórico. Undo cancela a fila. Reduced motion mantém número breve, sem voo/pulso.

DevTools → Laboratório → Auxiliares permite selecionar uma filha e ajustar vida/restaurar/derrotar, sem depender da habilidade preparada. Derrota devolve anexos ao fundo do Lixo pelo helper real; restauração manual é exclusiva do laboratório, não uma nova regra de combate. Item/piso de HP, Vínculo, Fúria e seleção de passivas do jogo normal não mudaram.
