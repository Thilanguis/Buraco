# Nemesis — implementação e validação

## Durabilidade e Agarrador — revisão de 06/10/2026

Estado atual: Nemesis **2200 HP**; Agarrador **220**, Infectado **240**, Devorador **260**. Após concluir a compra do Monte ou do Lixo, Agarrador prende exatamente **1 normal / 2 Mutado / 2 Reforçado / 3 ambos**, quando houver cartas seguras suficientes. A seleção seeded prioriza cartas com uso legal real (`findNemesisLegalPlan()`) e completa com outras cartas seguras da mão, mesmo sem jogada imediata. Testa combinações determinísticas da quota completa no estado resultante com o planner canônico, incluindo objetivo cooperativo e todos os descartes legais (AGARRADA bloqueia somente jogo). Só tenta uma quota menor após esgotar as combinações do tamanho anterior; não reserva cegamente cartas do primeiro plano. Quantidade menor somente por falta física de cartas ou proteção necessária contra estado impossível. Sem descarte legal, preserva a rota de Morto/batida validada pelo planner.

`notifyBossPurchaseCompleted()` é chamado após a compra efetiva e, no Lixo Fechado, após sua jogada obrigatória. A restrição só impede jogo, nunca descarte; termina no turno do dono ou na morte do Agarrador. `grabbedTurnIds` e o evento estável `nemesisGrab:<turno>:<jogador>` evitam reaplicação por reload/snapshot; a apresentação existente também deduplica undo/reaplicação. O BOT recalcula a partir da mão atual e consulta o bloqueio canônico nas rotas genéricas e de objetivo, sem nova heurística de combate.

Registro da primeira correção de quantidade de 06/10/2026 (anterior à busca de combinações): 143 testes focados passaram; suíte ampla `tests/*.test.mjs`: 879/879, sem falhas, skips ou todo. Browser do Nemesis passou nos cinco viewports existentes. Regressões cobrem prioridade jogável + complemento seguro, quantidades físicas insuficientes, solução única/alternativas, Invasão cooperativa, descarte, Morto/batida, morte/fim do turno e deduplicação de reload/snapshot/undo. Testes e fixture local, não uma partida Firebase ao vivo. Nenhum HP, bônus, peso, outra passiva ou BOT foi rebalanceado.

Correção posterior de 06/10/2026: o planner considera todos os descartes legais, não só o primeiro. A seleção do Agarrador valida combinações da quota completa no estado resultante antes de tentar quantidades menores. Barragem com 3 MARCADAS mantém 2 saídas legais com AGARRA 2 (Mutado ou Reforçado); a regressão também executa AGARRA 3 com ambos. A mesma carta pode ser MARCADA e AGARRADA: dois status legíveis em um único selo, com um único overlay verde, sem brilho duplicado. Os estados expiram independentemente; descarte permanece permitido. Validação: 147 testes focados, 883/883 na suíte ampla, nenhum skip/todo; browser nos cinco viewports, incluindo carta pequena 65×95 e NOVA. Nenhum rebalanceamento adicional.

Reanimações usam os máximos atuais: **110/120/130 HP**. Infecção, cura, pesos, lifecycle, regras do Lixo e demais chefes não foram rebalanceados. Decisão e limites das estimativas históricas: [BALANCEAMENTO_NEMESIS.md](BALANCEAMENTO_NEMESIS.md).

Validação desta rodada de durabilidade: **132/132 focados**, **855/855 na suíte ampla**, zero falhas/skip/todo; browser local nos cinco viewports passou. Resultados, arquivos e limitações estão no documento de balanceamento acima; números de validação das rodadas anteriores abaixo permanecem históricos.

## Medidores de objetivos

Comando da Horda é um reforço temporário em um único zumbi, sem objetivo cumulativo/faixas: não usa barra de progresso. O HUD identifica o zumbi e o prazo, seguido apenas da passiva reforçada total (Agarrador: cartas presas para jogo; Infectado: Infecção extra por falha; Devorador: cura ao contribuir 3+ cartas no mesmo jogo). A ajuda explica o gatilho real, sem listar como ativos os bônus dos outros dois zumbis. Mudar o alvo de dano não muda quem recebeu o comando.

Lança-Foguetes cobra por **carta nova** adicionada à Zona de Impacto: +10 Infecção na fase 2 e +12 na fase 3. Três cartas juntas custam +30/+36, igual a três jogadas separadas. Cartas já contabilizadas/reorganizadas não cobram novamente. O teto de Infecção e a derrota imediata permanecem; a cobrança de uma jogada é um único evento/SFX.

Zona Contaminada aplica à carta exata do topo a infecção verde compartilhada, com selo CONTAMINADA e custo +6 Infecção por retirada durante o turno do alvo. O destaque é removido fora desse turno ou ao encerrar a partida. Zona de Impacto permanece laranja e independente: marca somente as cartas do jogo do lança-foguetes enquanto o efeito ainda não expirou.

O painel reutiliza o medidor de faixas dos outros chefes somente no Extermínio S.T.A.R.S.: 0/1/2 exigências cumpridas têm base +16/+8/+0. HUD e faixas exibem o total projetado atual, somando Infectado (normal/Mutado), Reforçado e Ômega somente se houver falha, respeitando o limite 100. Caçada e Tentáculos também mostram esse total; o `?` apresenta a composição curta. `getNemesisObjectiveOutcome()` e `projectNemesisInfection()` são compartilhados com a resolução real, sem conta paralela no HUD. Invasão, Caçada e Tentáculos mantêm contadores/estado do objetivo, sem barras binárias desnecessárias. Nenhuma regra ou punição foi alterada.

Seleção de alvo usa o gate local de ações durante o salvamento, assim como compra/descarte: snapshots aguardam sua conclusão. Clique no alvo já escolhido não repete a gravação. Regressão de browser simula salvamento atrasado, clique concorrente e snapshots antigo/novo; não substitui teste ao vivo em dois clientes Firebase.

## Marcação das cartas — correção de 05/10/2026

Objetivos de carta usam selo MARCADA; cartas presas pelo Agarrador usam AGARRADA; topo do Lixo sob Zona Contaminada usa CONTAMINADA. Todos compartilham borda verde e manchas de infecção, sem asset novo, sem cobrir número/naipe nem interceptar cliques. Ao entrar a restrição do Agarrador, a carta exata pulsa uma vez pelo evento de aquisição; depois mantém a marca estática. Rerender/reload/snapshot/undo não repetem o pulso. O selo NOVA permanece separado. Redução de movimento desativa o pulso. Marcação visual não cria cobrança de Infecção nem muda permissões.

O adapter `nemesisBossUi.decorateCard()` é aplicado depois da face da carta. Antes disso, `innerHTML` apagava o selo inserido antecipadamente na mão. A decoração é idempotente e removida quando não há efeito; a lógica de escolha/saída das cartas permanece intacta.

Padronização de 06/10/2026: removidos contorno e brilho extras do contêiner/face do Lixo, que se somavam ao overlay da carta e engrossavam a marca. MARCADA, AGARRADA e CONTAMINADA usam exatamente o mesmo overlay original. O pulso de aquisição varia somente a opacidade, sem ampliar o brilho. Nenhuma mecânica alterada.

Validação desta correção: 80 testes específicos (`nemesis-boss`, `nemesis-discard-ui`, `nemesis-progress-meters`) passaram; `nemesis-ui.browser.mjs` passou nos cinco viewports já adotados e sua captura foi revisada. Cobertura inclui carta real do Agarrador, parceiro, limpeza, repetição, NOVA e redução de movimento. Não foi uma partida completa com Firebase ao vivo nem uma nova execução da suíte ampla; os resultados históricos abaixo pertencem às rodadas indicadas. Checklist permanente: seção 23 de `CHECKLIST_REGRESSOES_E_ATUALIZACOES.md`.

Revisão de 05/10/2026 sobre a implementação já existente. A base local foi comparada com os arquivos oficiais do Google Drive antes dos patches. Não foi reconstruída a batalha a partir do prompt antigo. O nome exibido, o relatório e o retrato usam somente **Nemesis**, sem sufixos de versão.

## 1. Arquivos desta revisão

- `js/boss/boss-combat.js`: lifecycle opcional na primitiva genérica.
- `js/boss/bosses/nemesis.js`: Invasão, metadata do Laboratório, retrato e títulos por causa.
- `js/boss/mechanics/nemesis.js`: entrada, planos legais/cooperativos, passivas, quotas, BOT e fixtures.
- `js/boss/presentation/nemesis.js`: objetivo, progresso e ajuda da Invasão.
- `js/boss/ui/nemesis-ui.js`: cards contextuais, ajuda e alvos integrados.
- `js/boss/boss-engine.js`: hook genérico de anúncio, duração por payload, alvo válido e títulos por motivo.
- `js/boss/boss-debug-scenarios.js`: variantes/targets por metadata, solução cooperativa pelo motor real, fallback e rótulo do recurso.
- `app.js`: renderer genérico dos cards, seleção, ajuda e animação por evento.
- `styles/boss/nemesis.css`: estados dos cards, retirada, reforço e redução de movimento.
- `index.html`: opção Nemesis sem sufixo.
- `service-worker.js`: caminho do retrato renomeado; cache `buraco-v272` preservado.
- `assets/images/boss-nemesis.png`: renomeação do retrato existente, bytes preservados.
- `tests/nemesis-boss.test.mjs`: adaptação dos 45 testes anteriores e regressões adicionais.
- `tests/nemesis-ui.browser.mjs`: renderer real, lifecycle, alvo no card e ajuda em cinco telas.
- `tests/boss-control-balance-v2.test.mjs`: somente expectativa obsoleta da Prisão no Espelho atualizada.
- `docs/DOCUMENTACAO_CHEFE_DA_MESA.md`, `docs/INVENTARIO_HABILIDADES_CHEFES.md` e este relatório `docs/NEMESIS_IMPLEMENTACAO.md`.

Os registros e a integração anterior do BOT permanecem. O ajuste final acrescenta somente apresentação/ajuda e SFX de ganho real de Infecção; nenhuma alteração de geometria de cartas, publicação ou regra funcional de outro chefe. As exclusões de assets legados e do áudio da Thayanne presentes na árvore de trabalho não pertencem a esta revisão.

## 2. Lifecycle final

Partida nova: Nemesis 2200 HP, Infecção 0/100, S.T.A.R.S. e três entidades **absent**, sem passiva nem espaço permanente no HUD.

- `absent`: ainda fora da mesa.
- `entering`: objetivo de entrada ativo; sem passiva e não atacável.
- `repelled`: objetivo cumprido; ameaça sai, pode tentar novamente, não é cadáver.
- `persistent`: objetivo falhou; HP máximo e passiva imediatamente ativos; atacável.
- `corpse`: persistente morto por dano; passiva desligada, possível alvo de Reanimação.

Somente persistentes vivos aplicam debuff. A falha da entrada não aumenta Infecção, inclusive sem bônus retroativo do Infectado. Não há alívio pela morte nem transbordamento de dano. Dano direto efetivo em Nemesis altera S.T.A.R.S.; dano em zumbi não.

Teto por fase: **1 / 2 / 3** persistentes vivos. Invasão e Reanimação respeitam o mesmo teto.

## 3. Migração dos saves antigos

A normalização opcional de lifecycle mantém entidades antigas vivas como `persistent` e antigas mortas como `corpse`, preservando HP, seleção, S.T.A.R.S., bônus, cargas e estado da batalha. Novos estados não são remigrados. O marcador numérico de schema é interno, não nome de chefe/versão pública.

Na revisão de durabilidade, o HP restante é mantido quando abaixo do novo máximo, ou limitado ao novo máximo quando acima; não há reset/cura proporcional. Travas antigas válidas continuam até o fim do turno, sem sortear novamente ou emitir pulso novo. Travas de outro turno são removidas. A quota de Reanimação e o estado cadáver/repelido são preservados.

Saves antigos com mais vivos que o teto da fase não perdem entidades silenciosamente: novas entradas/reanimações são bloqueadas até haver espaço. Reload, snapshot e undo transportam os campos no objeto `boss` existente.

## 4. Invasão da Horda

`horde_invasion`: fases 1/2/3, peso **4**; onze habilidades e soma dos pesos **39**. A seleção seeded usa apenas ausentes/repelidos elegíveis. Agarrador/Infectado preservam a prova do objetivo; Devorador exige apenas uma contribuição legal possível em jogo existente. Evita o último repelido imediatamente quando outro candidato real existe.

- **Agarrador:** escolhe carta com rota real de uso legal em jogo no turno do alvo. Após marcada, sair por jogo ou descarte continua cumprindo o objetivo. Um descarte legal isolado não torna a habilidade elegível. Não marca descarte final proibido por falta de Morto/canastra. Falha: 220 HP.
- **Infectado:** equipe contribui duas cartas válidas para jogos durante a rodada. O plano pode ser individual ou cooperativo. Falha: 240 HP.
- **Devorador:** elegível quando ao menos um jogo existente aceita uma contribuição legal; não exige prova antecipada da expulsão. A equipe acumula 3 cartas novas em jogos que existiam no início da invasão, registrando seus IDs. Pode alimentar o mesmo jogo, em contribuições separadas, por um jogador ou pelos dois. Ao atingir 3, é repelido; menos de 3 no fim da rodada deixa-o persistente com 260 HP (Mutado na F3). IDs de cartas deduplicados; reorganização e jogos novos não contam, inclusive após reload/snapshot/undo. Isso não muda a passiva: contribuição única de 3+ cartas no mesmo jogo cura 40/70 HP, Reforçado +30, no máximo uma vez por turno e sem ultrapassar o HP máximo.

O planejamento considera jogadores que ainda podem agir e a ordem real da rodada. Para Agarrador/Infectado, não escolhe objetivo que só funcionaria invertendo turnos. Para Devorador, não exige que as três cartas já estejam disponíveis na elegibilidade; o BOT tenta contribuições incrementais válidas. Sucesso repele; falha só estabelece o zumbi. Em F3, novas persistências já entram Mutadas.

## 5. Comando, passivas e recuperação

Comando da Horda continua separado da Invasão: não traz zumbis, exige persistente vivo e reforça sua passiva até o fim da rodada seguinte.

| Zumbi | Normal | Mutado | Reforço |
|---|---|---|---|
| Agarrador | Após compra do Monte/Lixo, prende 1 carta da mão para jogo, não descarte, até fim do turno | 2 cartas | +1 carta (2 normal / 3 Mutado) |
| Infectado | +2 Infecção em falha positiva real | +4 | +2 |
| Devorador | Cura Nemesis 40 HP na primeira contribuição de 3+ cartas no mesmo jogo por turno | 70 HP | +30 HP |

Os totais aparecem diretamente em chips clicáveis: AGARRA 1/2/3, INFECÇÃO +2/+4/+6 e CURA 40/70/100. Normal + Reforçado mostra 2/4/70. O mesmo helper calcula a passiva aplicada e o total exibido; MUTADO e REFORÇADO abrem ajuda específica. Comando usa `expiresRound = roundNumber + 1`, válido até essa rodada inclusive; não reforça entering/repelled/corpse. Regeneração só cura persistente ferido. Reanimação só revive cadáver com 50% HP, uma vez por fase e com espaço no teto; em F3 retorna Mutado. A entrada da F3 muta todos os persistentes vivos.

BOT executa planos legais para impedir entradas, respeita guard de batida segura e seleciona apenas persistentes vivos; mantém avaliação de Infecção/letalidade/cura, sem simplificação para menor HP.

## 6. Artes conectadas

Encontrados/usados:
- `assets/images/boss-nemesis.png`: retrato existente, apenas renomeado.
- `assets/images/nemesis-infection-meter-frame.png`: moldura de Infecção existente, preservada.

As três artes foram enviadas pelo usuário e conectadas às respectivas entidades:
- `assets/images/nemesis-agarrador.png`;
- `assets/images/nemesis-infectado.png`;
- `assets/images/nemesis-devorador.png`.

Os arquivos foram copiados sem alterar seus bytes. Os cards reutilizam `boss-daughter-card` e `boss-daughter-state` dos ajudantes aprovados, com arte panorâmica 8:3 full-bleed (`object-fit: cover`), nome integrado e sem áreas vazias. Em telas estreitas o recorte natural protege a altura mínima dos controles, sem distorcer o arquivo. Todos os retratos estão no precache. Nenhuma imagem foi fabricada ou substituída.

## 7. HUD e Laboratório

Cards entram apenas quando relevantes, em faixa própria abaixo do HUD principal, como Filhas/Capangas, sem aumentar sua altura. `entering` mostra o chip INVADINDO; o objetivo continua no painel de Invasão da Horda. Persistente mostra nome, HP/barra e chips compactos ATIVO, MUTADO e REFORÇADO; cadáver mostra CADÁVER. O próprio card seleciona alvo e mantém destaque. O alvo atual e o botão ↩ para voltar ao Nemesis ficam na própria arte principal, sem linha abaixo dos zumbis. O `?` de 17px fica dentro do card e abre o popover oficial compartilhado junto ao botão clicado, com ponteiro, explicando passiva normal, Mutado e Comando da Horda em blocos curtos.

S.T.A.R.S. aparece como overlay discreto à direita da arte principal, sem linha estrutural extra. Sua ajuda usa o mesmo popover oficial e explica prioridade ofensiva, troca após dano direto ao Nemesis e ausência de troca por dano aos zumbis. Sua lógica não foi alterada. A arte principal inteira também seleciona Nemesis como alvo, por toque/clique ou teclado, quando permitido; clicar nos chips/ajuda não troca alvo.

### Objetivos viáveis e Lixo protegido (06/10/2026)

`findNemesisLegalPlan()` prepara marcas a partir de possibilidades reais de jogo. Tentáculo exige duas alternativas jogáveis; Barragem exige três marcas jogáveis e uma solução conjunta de duas; Extermínio comprova contribuição e segunda carta utilizável. Descartar a carta marcada continua contando na resolução. Carta inútil apenas descartável não é candidata; ausência de plano implica inelegibilidade/fallback normal.

A regra compartilhada de Lixo do modo Chefe vale também para Nemesis: natural comum em jogo existente → somente topo se entrar sozinho; se depender de cartas da mão como ponte/complemento → Lixo inteiro. Jogo novo pela mão → Lixo inteiro; Joker → topo; 2 existente ou coringa em jogo novo → topo; 2 natural em jogo novo → Lixo inteiro. A consulta usa o validador canônico, não ordem visual, e somente o destino realmente escolhido. Zona Contaminada calcula viabilidade com o tamanho real da retirada e continua cobrando por retirada, não por carta. Após a jogada obrigatória, Agarrador considera a mão inteira restante, incluindo cartas anteriores à compra, nunca cartas já colocadas na mesa.

Resultado da revisão atual: ver `REGRA_LIXO_E_UX_NEMESIS_2026-10-06.md`. Os resultados abaixo são históricos, não o estado atual da suíte.

Horda/Ômega e duração ficam no painel amarelo, sem faixa de texto acima dos zumbis. Zona de Impacto usa moldura compartilhada apenas em `.meld-line-cards`; Canastra/Limpa e contribuição ficam fora, como nos demais efeitos de chefes. Nenhuma regra de alvo, dano, prazo ou lifecycle mudou.

SFX: `assets/sfx/ganho-infeccao-nemesis.mp3`, original fornecido preservado e incluído no precache/registro central `BOSS_SFX`. O adaptador de apresentação identifica eventos `infection` e `nemesisObjective` apenas com `amount > 0` efetivamente aplicado. Objetivos registram o delta já calculado; resultados posteriores não repetem o som. O sincronizador existente deduplica `actionId` inclusive no mesmo lote, marca eventos iniciais/reload sem tocar e não repete Firebase/rerender/undo. Infectado/Horda/Ômega continuam no único cálculo central, sem reprodução na função de estado. Redução e +0 ficam silenciosos.

Repelido tem retirada breve e desaparece. Cadáver é discreto, identificado e sem barra/debuff ativo. Animações pontuais por evento não repetem em reload/rerender; respeitam `prefers-reduced-motion` e telas touch. Sem cinematografia ou efeito contínuo pesado.

Laboratório usa o motor real: três entradas, sucesso/falha, reentrada, proteção contra repetição, teto da fase selecionada, persistente/cadáver, BOT, reload/undo, Comando sem alvo, buff real, Reanimação e Regeneração. Cenários especiais fixam seu alvo apropriado por metadata, evitando combinações incompatíveis com um zumbi escolhido antes. Recurso do Nemesis mostra Infecção, não Dívida.

## 8. Auditoria e testes

- Títulos por causa: `max_infection` → **Infecção Total**; ataque final insuficiente → **Nemesis sobreviveu**; exaustão → **Recursos esgotados**.
- Zona Contaminada exige plano real de retirada do Lixo Fechado, validador oficial, bloqueios e condições de Morto/batida; lixo não vazio sozinho não basta.
- Só o teste obsoleto da Nehelenia mudou: Prisão no Espelho permanece peso 2/fases 1/2/3, elegível com resgate real, sucesso sem penalidade e falha +8/+10/+12. Sua regra não foi alterada.

Cobertura adicional: lifecycle completo, entrada sem passiva/dano, success/failure sem Infecção extra, migração idempotente, quotas/caps, reentrada, não repetição, mutação, offboard inativo, planos cooperativos/ordem e cartas não duplicadas, BOT realmente jogando/descartando, persistência, ajuda/seleção no card, títulos e Zona.

## 9. Resultado de validação

- Nemesis: **72/72 passaram**, incluindo ações reais do BOT para as três entradas e três regressões de SFX/delta/deduplicação.
- Ajuste final: apresentação/mecânicas/arquitetura de isolamento relacionados **50/50 passaram**; junto ao Nemesis, **122/122**. A validação anterior de Nehelenia/balanceamento/apresentação/isolamento passou **66/66**.
- Browser: renderer real passou em **1920×1080, 1024×768, 844×390, 390×844 e 3840×2160**; ajuda oficial de zumbis/S.T.A.R.S., alvo no card, permissões, estabilidade de DOM, retirada/redução de movimento e cadáver sem barra. Artes reais carregadas, correspondência por entidade, full-bleed e ajuda completamente dentro do card verificados. Fixture local sem Firebase autenticado.
- Sintaxe: **12 JS/MJS desta revisão** passaram em `node --check`; `git diff --check` passou.
- Suíte ampla possível, excluindo somente o arquivo bloqueado descrito abaixo: **528 testes, 477 passaram, 51 falharam**.
- Baseline imediatamente anterior: **504 testes, 452 passaram, 52 falharam**. Nenhum nome de falha adicional; a única falha removida é o teste obsoleto da Prisão no Espelho atualizado com a regra aprovada.
- Validação anterior do lifecycle no Drive: **18 arquivos** foram relidos pelo conector e seus hashes SHA-256 coincidiram com os locais; a cópia de readback passou **69/69 testes e o browser nos cinco viewports**. As renomeações foram verificadas. Antes do ajuste visual/SFX final, `js/boss/mechanics/nemesis.js` foi novamente relido do link fornecido e coincidiu com a base local, normalizando apenas quebras de linha.

O arquivo antigo `tests/boss-debug-scenarios.test.mjs` foi tentado separadamente e voltou a ficar preso depois do teste da Ordem Final. Foi encerrado após **30 segundos** com processo isolado, sem alterar regras para fazê-lo terminar. O runner principal não o inclui; esta limitação não é omitida.

Comparação anterior à revisão: 504 testes, 452 passaram, 52 falharam. As falhas pré-existentes incluem expectativas antigas de balanceamento/visual, fixtures VM incompletas, importações antigas, amigas da Dominação e SW. A suíte inteira não será declarada verde enquanto permanecerem.

## 10. Teste manual e riscos restantes

- Feedback de HP (06/10/2026): dano aparece no card do alvo registrado no evento, inclusive no golpe fatal; o número usa o HP efetivamente perdido, sem overflow. O HUD principal só recebe impacto quando o alvo é Nemesis. Barras dos zumbis: verde acima de 50%, amarelo de 50% até acima de 25%, vermelho em 25% ou menos. No Nemesis, tensão usa âmbar mais evidente e perigo vermelho vivo. Pulsos respeitam reduced motion; nenhuma regra de dano/vida mudou.

- Ajuste visual/SFX final: 72/72 testes do Nemesis e browser nos cinco viewports passaram; cards full-bleed, chips/ajuda oficiais, S.T.A.R.S. integrado e ganho de Infecção deduplicado. Originais de imagem/MP3 preservados, sem mudança de mecânica.
- Partida completa humano/humano em dois clientes reais: transporte Firebase ao vivo, reload no turno do parceiro, morte/reanimação e alvo.
- Partida completa humano/BOT em todas as fases para avaliar balanceamento; ações específicas passaram, não se promete IA perfeita.
- Mesa densa no fim da partida em tablet landscape: teste browser atual valida HUD, não toda a densidade de jogos/cartas.
- Um plano legal no anúncio pode deixar de funcionar se os jogadores consumirem as cartas/alterarem a mesa depois. Não há troca silenciosa de exigência.
- O comprovador de Zona é conservador: pode deixar de escolher a habilidade em extensões muito longas que exigem mais cartas simultâneas que o planejador examina. Nunca é autorizado retirar o Lixo fora das regras oficiais.
- Ataque final direcionado a zumbi pode perder a batalha; mantém aviso, sem overflow.
- Deploy/cache não foram publicados nem alterados nesta rodada.
