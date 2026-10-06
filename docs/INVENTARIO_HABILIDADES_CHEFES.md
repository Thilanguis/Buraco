# Inventário atual de habilidades dos chefes


**Atualizado em 06/10/2026 a partir da rotação ativa em `js/boss/bosses/*.js`, do motor `js/boss/boss-engine.js` e do catálogo do Laboratório de Chefes, incluindo a revisão experimental de durabilidade do Nemesis.**


Este arquivo lista apenas habilidades que realmente participam da rotação atual. O peso é o peso-base usado no sorteio quando a habilidade está elegível; elegibilidade e alvos ainda são validados pelo motor.

**Regra permanente:** cumprir objetivos não reduz a condição especial do chefe; evita a punição. Sucessos não descontam falhas de outros objetivos. Alívio por canastra e gastos próprios do chefe por vantagem permanecem. Correções auditadas em `REVISAO_OBJETIVOS_CHEFES.md`. Na revisão experimental posterior, foram alterados os HPs do Nemesis e dos zumbis e a passiva do Agarrador, conforme `BALANCEAMENTO_NEMESIS.md`; pesos, punições, Infecção, fases e demais chefes não foram alterados nessa revisão.


### Regra de apresentação no HUD

Ajuda oficial abre junto ao próprio `?`, com ponteiro e ajuste ao viewport. Textos usam blocos curtos sem eliminar prazos/exceções. Marcações de jogos envolvem só as cartas, nunca Canastra/Limpa. No Nemesis, Horda/Ômega e duração ficam no painel amarelo; alvo/retorno ↩ ficam na arte principal, sem faixas soltas em volta dos zumbis.

O painel principal mostra somente objetivo, progresso e consequência curta. A explicação completa, termos ambíguos e exceções ficam no botão **?**. Referências de carta como `6♥` e `Q♣` recebem destaque maior e cor por naipe. Essa regra vale para **todos os chefes**, não apenas para a Nehelenia.


## O Banqueiro


**HP:** 2650.


| Habilidade | Fases | Peso | Funcionamento atual |
|---|---:|---:|---|
| Juros Fixos | 1, 2 e 3 | 5 | Sorteia um contrato 25/50/25. Fases 1–2 cobram 10/12/14 integral ou Cofre iniciando em 4/5/6; Fase 3 cobra 14/16/17 ou Cofre 6/7/8. Adiar o resgate acrescenta +2 por turno nas Fases 1–2 e +3 na Fase 3, até o valor integral. |
| Tarifa de Manutenção | 1, 2 e 3 | 3 | Cada cooperador recebe +1 Carta Financiada nas Fases 1–2 e +2 na Fase 3. A carta fica marcada como FINANCIADA e só quita a Tarifa se entrar em um jogo; descartá-la ou terminar o turno com ela na mão gera +5 ou +7 de Dívida, respectivamente. |
| Bloqueio de Crédito | 1, 2 e 3 | 3 | Bloqueia a retirada do lixo durante a rodada. |
| Auditoria de Naipe | 2 e 3 | 4 | Sorteia um naipe. A equipe precisa baixar 3 cartas dele na Fase 2 ou 4 na Fase 3. Sucesso evita a cobrança; falha adiciona +12 ou +16 de Dívida. |
| Penhora | 2 e 3 | 2 | Bloqueia temporariamente um jogo elegível da equipe até a próxima cobrança. |
| Juros Compostos | 2 e 3 | 4 | No fechamento, usa faixas pelo total das mãos: Fase 2 = +6/+10/+14; Fase 3 = +8/+12/+16 para 0–7 / 8–13 / 14+ cartas. |
| Limite de Crédito | 1, 2 e 3 | 4 | Define franquia compartilhada de cartas vindas da mão. Fases 1/2/3: franquia 3/2/1, custo por excedente +3/+4/+5 e teto +9/+12/+15. |
| Ágio do Lixo | 2 e 3 | 3 | A primeira retirada confirmada do lixo na rodada cobra Dívida: +7 na Fase 2 e +10 na Fase 3. |


**Condição especial de derrota:** a equipe perde imediatamente se a Dívida coletiva chegar a 100.


## A Dominadora


**HP:** 2600.


| Habilidade | Fases | Peso | Funcionamento atual |
|---|---:|---:|---|
| Coleira | 1 e 2 | 5 | Prende até duas cartas úteis/jogáveis do alvo durante o turno. |
| Escolha Forçada | 1, 2 e 3 | 5 | O alvo aceita uma ordem viável ou recebe Dominação direta. F1: +6 ou ordem +2/falha +12; F2: +7 ou +3/+14; F3: +8 ou +3/+16. |
| Exposição | 1, 2 e 3 | 4 | Marca uma carta jogável. Usá-la custa +1 de Dominação; falhar custa +9/+11/+13 conforme a fase. |
| Troca Forçada | 2 e 3 | 4 | Troca uma carta útil/jogável entre os cooperadores; a carta recebida fica presa no próximo turno quando aplicável. |
| Mãos Atadas | 2 e 3 | 4 | Cada jogador fica vinculado ao primeiro jogo que tocar na rodada; a equipe ainda compartilha no máximo 1 criação de jogo novo. |
| Posse | 2 e 3 | 3 | Suspende o dano antigo de um jogo até os dois contribuírem ou ele evoluir; cartas novas ainda causam dano individual normal. |
| Etiqueta de Ferro | 1, 2 e 3 | 4 | Ordena um naipe legal e escasso para o descarte. Cumprir custa +2/+2/+3; falhar custa +10/+12/+14. |
| Favorita | 2 e 3 | 4 | Pune o cooperador menos dominado com +8. F2/F3: protegida inalterada (0), sem recuperação. |
| Dupla Coleira | 3 | 5 | Prende uma carta útil/jogável de cada cooperador durante a rodada. |
| Separação | 3 | 4 | Depois que um jogador alimenta um jogo, o parceiro não pode tocar naquele mesmo jogo na rodada. |
| Controle Absoluto | 3 | 4 | Trata o alvo como Dominado por 1 turno e aplica Dominação +5. |
| Quebra de Vontade | 3 | 4 | Mira um jogador já pressionado: Dominação +8 ou cura de até 180 HP para a Dominadora; só aparece com cura relevante disponível. |
| Ordem Final | 3 | 4 | Decisão às cegas. Recusar = +7; aceitar = +2 e só então 2 cartas jogáveis aleatórias são sorteadas. Cada carta sorteada não usada em jogo = +6. |


**Dominação:** cada jogador usa 0–50 pontos por baixo de 4 Chicotes visuais. Cada Chicote equivale a 12,5; 37,5 = **Sob Controle** e 50 = **Dominado**. A equipe perde quando os dois chegam a 50.


**Transbordamento:** se um jogador já estiver em **50/50 de Dominação** e receber mais pressão, o excesso resvala para o parceiro em qualquer fase. Se ambos estiverem em 50, a derrota especial é confirmada.


**Resistência:** Limpa reduz 4 pontos de Dominação, Real 8 no total e Ás-a-Ás 12 no total. Evoluções sucessivas acrescentam 4 por novo tier; o mesmo tier do mesmo jogo só conta uma vez. O alívio começa no jogador responsável e, se ele não tiver Dominação suficiente, o restante transborda para o parceiro.


**Fora da rotação:** `Interdito` continua apenas como compatibilidade interna e não deve aparecer como habilidade ativa para o jogador.


## A Matriarca Esmeralda

**Teto de burst:** uma ativação aplica no máximo +1 Flor, mesmo com falhas múltiplas. Trepadeiras: uma/duas falhas = +1; Enxerto: parcial/total = +1; Florescimento Real: qualquer número de falhas = +1. Propagações existentes permanecem. HP 2000, derrota em 5 Flores, alívio incremental por canastras e Renascimento F3 (1 Flor, 300 HP, 1x) preservados. Orvalho, Casulo e cura não foram alterados neste patch.


**HP:** 2000. **Limite total de cura por rodada:** F1 100 / F2 150 / F3 200.


| Habilidade | Fases | Peso | Funcionamento atual |
|---|---:|---:|---|
| Semente Viva | 1, 2 e 3 | 5 | Marca uma carta que precisa ser usada legalmente no próximo turno para impedir o florescimento da ameaça. |
| Raiz Faminta | 1, 2 e 3 | 5 | Marca um jogo que precisa receber uma carta legal antes do prazo. Se falhar, pode gerar uma única nova Raiz na rodada seguinte; a Raiz propagada não se propaga novamente. |
| Orvalho Restaurador | 1, 2 e 3 | 3 | Cura por faixas: F1 = 100/65/30/0; F2 = 120/80/40/0; F3 = 150/100/50/0 para 0–1 / 2–3 / 4–5 / 6+ cartas novas. |
| Trepadeiras Gêmeas | 2 e 3 | 4 | Marca mais de um jogo; cada objetivo precisa receber uma carta legal na rodada. |
| Enxerto | 2 e 3 | 3 | Liga dois jogos e exige que ambos recebam uma carta legal na rodada. |
| Pólen do Lixo | 2 e 3 | 3 | Contamina o topo do lixo. Se ele for retirado, a Matriarca recebe +1 Flor e cura até 30 HP. |
| Colheita | 2 e 3 | 2 | Avalia a mão do alvo no fim do turno: 0–7 sem efeito; 8–10 cura 50 HP; 11+ gera +1 Flor e cura 80 HP. |
| Florescimento Real | 3 | 4 | Combina objetivos naturais independentes; cada um precisa ser cumprido separadamente. |
| Casulo Esmeralda | 3 | 3 | Cria um escudo de 180 pontos que absorve dano até ser rompido. |
| Coroa da Primavera | 3 | 3 | Marca uma ameaça natural; se ela falhar, prepara uma Raiz Fortalecida que exige cooperação. |


**Condição especial de derrota:** a equipe perde quando o Florescimento chega a 5 Flores.


**Renascimento (passiva):** na Fase 3, se a Matriarca cair a 0 HP com pelo menos **1 Flor** e ainda não tiver usado o efeito, ela consome **1 Flor** e retorna com **300 HP** uma vez. Não entra no sorteio normal; aparece no DevTools com peso 0 para teste manual.
## Lady Dimitrescu


**HP:** 2300. **Sede de Sangue:** 0–100. A Sede é tanto condição de derrota quanto recurso vampírico: algumas habilidades a acumulam e outras a consomem para sustentar Lady.


| Habilidade | Fases | Peso | Funcionamento atual |
|---|---:|---:|---|
| Caçada de Bela | 1, 2 e 3 | 5 | Bela marca uma carta exata. Usá-la legalmente evita a punição; falhar adiciona 14 nas Fases 1–2 ou 16 na Fase 3. |
| Tributo de Sangue | 1, 2 e 3 | 4 | Avalia as duas mãos no fim da rodada. 8–10 cartas adicionam 4 de Sede por jogador (6 na Fase 3); 11+ adicionam 8 (10 na Fase 3). |
| Vinho Carmesim | 1, 2 e 3 | 2 | Com ferimentos e Sede suficiente, consome 15 de Sede para curar até 140/200/260 HP conforme a fase. |
| Marca Carmesim | 1, 2 e 3 | 4 | Marca uma carta jogável de cada cooperador. Cada sucesso evita sua punição; cada falha adiciona 7 nas Fases 1–2 ou 9 na Fase 3. |
| Banquete de Cassandra | 2 e 3 | 5 | Marca um jogo. Alimentá-lo evita a punição; falhar adiciona 16 na Fase 2 ou 18 na Fase 3. |
| Banquete dos Mortos | 2 e 3 | 3 | Profana o próximo Morto. Tomá-lo adiciona 12/16 de Sede e cura 90/130 HP. Uma Canastra Real ou Ás-a-Ás purifica: +4 de Sede e nenhuma cura. |
| Enxame de Daniela | 2 e 3 | 4 | Contamina uma carta do lixo. Evitá-la não altera a Sede; recolhê-la adiciona 12 na Fase 2 ou 15 na Fase 3. |
| Coágulo Carmesim | 2 e 3 | 3 | Cria 180/260 de proteção. Romper evita a cura, sem alterar a Sede; se sobreviver à rodada, metade da proteção restante vira cura. |
| Portas do Castelo | 3 | 3 | Bloqueia o lixo durante toda a rodada. |
| As Três Filhas | 3 | 5 | Cria objetivos independentes de Bela, Cassandra e Daniela; cada sucesso evita sua punição e cada falha adiciona 8. O HUD mostra os três objetivos separadamente. |


**Transformação por fase:** o retrato principal acompanha a forma da Dimitrescu: Fase 1 usa `boss-dimitrescu.png`, Fase 2 usa `boss-dimitrescu-fase2.png` (semi-transformação) e Fase 3 usa `boss-dimitrescu-fase3.png` (forma dragão). Ao entrar nas Fases 2 e 3, a troca toca `transformacao-dimitrescu-fase2.mp3` ou `transformacao-dimitrescu-fase3.mp3`, respectivamente, e a fala de fase aparece no HUD.


**Condição especial de derrota:** a equipe perde imediatamente quando a Sede chega a 100.


**Redução por canastra:** Limpa -4, Real -8 e Ás-a-Ás -12 de Sede ao alcançar um tier novo.


**Apresentação:** sangue visual aparece no alvo real (carta, jogo, lixo ou Morto). As filhas aparecem em posições fixas sob o HUD e exibem estado ativo/concluído/falhou. `ganho-sangue-dimitresco.mp3` toca quando a Sede aumenta.






## Rainha Nehelenia


**HP:** 2400. **Mundo do Espelho:** 0–100. O HUD mantém **5 espelhos ornamentados**, cada um representando 20 pontos e aceitando preenchimento parcial. Chegar a **100/100** causa derrota imediata.


| Habilidade | Fases | Peso | Funcionamento atual |
|---|---:|---:|---|
| Jogo Espelhado | 1, 2 e 3 | 5 | Duplica fisicamente um jogo em dois reflexos idênticos. O alvo usa exatamente 1 carta legal em um reflexo. Errar ou ignorar envia a carta ao fundo do Monte, deixa o jogador **Desorientado** e acrescenta **+18** ao Mundo do Espelho. |
| Siga o Reflexo | 1, 2 e 3 | 5 | O primeiro cooperador define, pelo turno inteiro, quantas cartas baixou; o segundo precisa terminar com a mesma quantidade, inclusive 0. Diferença acrescenta **+16**. |
| Espelho do Lixo | 2 e 3 | 4 | Mostra dois reflexos idênticos do topo do Lixo, sem pista escondida. Errar acrescenta **+16** e sela o Lixo durante a rodada. |
| Prisão no Espelho | 1, 2 e 3 | 2 | Só entra quando já existe pressão no Mundo do Espelho e o parceiro possui uma alimentação legal. Nehelenia prioriza prender o cooperador mais pressionado; o parceiro precisa alimentar o jogo indicado. Sucesso liberta sem alterar o recurso; falha acrescenta **+8/+10/+12** conforme a fase. |
| Pesadelo Eterno | 3 | 5 | Mostra a ORIGINAL, cria dois reflexos e embaralha os três. Errar acrescenta **+24**. |
| Laço do Tigre | 1, 2 e 3 | 4 | Liga dois jogos; cada lado precisa receber carta. Falhar acrescenta **+12** e deixa garras persistentes no lado ignorado. |
| Presa Marcada | 1, 2 e 3 | 3 | Marca um jogo; até resolvê-lo, o alvo não pode alimentar outro jogo existente. É controle puro, sem avanço direto do recurso. |
| Olho do Falcão | 1, 2 e 3 | 3 | Exige descarte do naipe marcado; errar faz Hawk vigiar o topo e bloqueia o Lixo enquanto aquela carta permanecer no topo. |
| Vigilância | 2 e 3 | 3 | O alvo não pode alimentar o jogo marcado naquele turno; parceiro e outros jogos continuam livres. |
| Mão no Espelho | 1, 2 e 3 | 3 | Marca uma carta que precisa sair da mão por jogo ou descarte; falhar cria **Reflexo Morto**, descartável mas não jogável. |
| Reflexo Invertido | 2 e 3 | 3 | Impede abrir jogo novo até o alvo alimentar um jogo existente; persiste até ser resolvido. |


**Alívio por canastra:** Limpa reduz 4 pontos; Real reduz 8 no total; Ás-a-Ás reduz 12 no total. Evoluções sucessivas acrescentam 4 por novo tier válido. O HUD mostra o valor real em 0–100 e o preenchimento parcial dos cinco espelhos.


**Pressão visual:** a partir de 60/100 o HUD entra no estado visual de Mundo do Espelho, sem criar uma regra de derrota antecipada. A derrota especial acontece somente em 100/100.


**Apresentação:** o painel principal deve mostrar apenas objetivo, progresso e consequência curta. Termos e regras extensas — como **Desorientado**, precedência da Presa Marcada, Reflexo Morto e o shell game do Pesadelo — ficam no botão `?`. As ilusões continuam acontecendo fisicamente na mesa, sem marcar automaticamente verdadeiro/falso.


## Nemesis

**Marcação visual:** carta-alvo recebe infecção verde e selo MARCADA; restrição do Agarrador usa AGARRADA; topo do Lixo contaminado usa CONTAMINADA. Compartilham o mesmo overlay, aplicado após a arte, sem cobrir número/naipe/NOVA. Agarrada pulsa uma vez ao entrar, sem replay de render/reload/snapshot/undo; marca estática até expirar. Zona de Impacto continua laranja e envolve somente as cartas. O efeito visual não altera cobrança ou regras.

**Revisão de 06/10/2026:** objetivos de jogo/descarte escolhem marcas com rota real de jogo via `findNemesisLegalPlan`; Barragem comprova uso conjunto de duas e Extermínio contribuição + segunda carta jogável. Descarte continua válido depois da marcação; objetivo impossível é inelegível. INVADINDO sem HP/alvo; retrato principal seleciona Nemesis; ajuda/chips não mudam o alvo. Chips mostram totais 1/2/3, +2/+4/+6 e 40/70/100, com explicação específica de Mutado/Reforçado e duração inclusiva até o fim da rodada seguinte. Lixo protegido segue a regra geral do modo Chefe descrita na seção 1.6 da documentação, sem mudanças aos outros modos ou números das habilidades.

**HP:** 2200. **Infecção:** 0–100; derrota imediata em 100. Usa a progressão compartilhada de fases. Partida nova sem zumbis ativos; teto de persistentes vivos F1/F2/F3: **1/2/3**. Aparecer como ameaça ≠ persistir ≠ cadáver.

| Habilidade (`id`) | Fases | Peso | Funcionamento atual |
|---|---|---:|---|
| Invasão da Horda (`horde_invasion`) | 1/2/3 | 4 | Ausente/repelido tenta entrar com objetivo solucionável. Agarrador: carta sai no turno por jogo/descarte. Infectado: equipe contribui 2 cartas na rodada. Devorador: alimenta 2 jogos existentes distintos na rodada. Sucesso repele; falha deixa persistente com HP cheio e sem Infecção extra. Respeita teto e evita repetição imediata havendo alternativa. |
| Caçada S.T.A.R.S. (`stars_hunt`) | 1/2/3 | 5 | Contribuir com 1+ carta para jogo no turno; falha base +8/+10/+12 Infecção. |
| Tentáculo Infeccioso (`infectious_tentacle`) | 1/2/3 | 5 | 1 das 2 marcadas sai por jogo/descarte legal; falha base +8/+10/+12. |
| Zona Contaminada (`contaminated_zone`) | 1/2/3 | 3 | Exige retirada legal comprovada do Lixo Fechado e sem bloqueio. +6 por retirada no turno; coexiste com Agarrador persistente. |
| Comando da Horda (`horde_command`) | 1/2/3 | 3 | Só reforça persistente vivo, não traz zumbis: até fim da próxima rodada, Agarrador +1 carta presa; Infectado +2/falha; Devorador +30 cura. |
| Lança-Foguetes (`rocket_launcher`) | 2/3 | 4 | Cada carta nova no jogo marcado por ID custa +10/+12 nesta rodada; cartas juntas somam o custo, sem proibir a jogada. |
| Regeneração Parasita (`parasite_regeneration`) | 2/3 | 2 | Cura até 100 HP no persistente vivo ferido com menor HP percentual. |
| Reanimação Viral (`viral_reanimation`) | 2/3 | 2 | Somente cadáver: 50% HP, 1x/fase, respeitando teto. Na F3 volta Mutado. Repelido não é morto. |
| Barragem de Tentáculos (`tentacle_barrage`) | 3 | 4 | 2 das 3 marcadas saem legalmente no turno; falha base +16. |
| Extermínio S.T.A.R.S. (`stars_extermination`) | 3 | 4 | Contribuição + saída de segunda carta indicada; duas/uma/nenhuma cumpridas: base +0/+8/+16. |
| Surto Ômega (`omega_outbreak`) | 3 | 3 | Até fim da próxima rodada: somente falhas recebem +2/+4/+6 conforme Infecção <50/50–74/75–99. |

**Lifecycle:** `absent → entering → repelled` no sucesso; `absent/repelled → entering → persistent → corpse` após falha e morte real. Repelido pode tentar entrar novamente. Somente persistente vivo tem passiva/seleção de dano. Saves antigos vivos/mortos migram sem reset de HP ou da batalha.

**Zumbis persistentes:** Agarrador 220 HP, após compra do Monte ou Lixo prende até 1/2 cartas jogáveis da mão (normal/Mutado) para jogo, não descarte, até fim do turno do dono; Horda soma +1 (totais 1/2/3). Preserva uma rota legal completa de objetivo ativo, inclusive apoios; sem candidato seguro, não prende. Infectado 240 HP, +2/+4 por falha positiva; Devorador 260 HP, cura 40/70 uma vez por turno ao contribuir 3+ cartas ao mesmo jogo. Horda soma seus bônus. Morte remove a passiva imediatamente, mantém cadáver e não alivia Infecção. F3 muta persistentes vivos, novas persistências e reanimados; não é habilidade sorteável. A falha de entrada do Infectado não recebe seu bônus retroativamente. Reanimação: 110/120/130 HP, preservando quota e teto. Decisão: `BALANCEAMENTO_NEMESIS.md`.

**Dano e alívio:** alvo escolhido antes da jogada entre Nemesis e zumbis vivos, inclusive no ataque final; não há transbordamento. Limpa/Real/Ás-a-Ás aliviam −4/−8/−12 no total incremental por jogo, mesmo atacando zumbi. Dano direto ao Nemesis troca S.T.A.R.S.; dano em zumbi não.

**Elegibilidade:** objetivos têm solução legal conjunta antes de anunciar; S.T.A.R.S. possui fallback para o parceiro. Horda exige persistente vivo, Regeneração exige persistente ferido, Reanimação exige cadáver/carga/espaço, Impacto exige jogo alimentável. Onze habilidades, soma de pesos 39, no catálogo real do Laboratório.

**HUD:** em faixa separada abaixo do HUD principal, cards full-bleed reutilizam o padrão de filhas/capangas, com nome integrado e chips INVADINDO, ATIVO, MUTADO, REFORÇADO e CADÁVER quando aplicáveis. Entrada mostra INVADINDO; objetivo fica no painel de Invasão, sem texto redundante. Seleção pelo próprio card; `?` interno abre o popover oficial com os números das passivas. Repelido some; ausente sem espaço permanente. Retratos fornecidos em `nemesis-agarrador.png`, `nemesis-infectado.png` e `nemesis-devorador.png`, originais preservados, cobrem o card sem distorção. S.T.A.R.S. fica sobre a arte principal com ajuda oficial. SFX canônico `ganho-infeccao-nemesis.mp3` toca só por delta positivo real, uma vez por evento; não por reload/redução/+0. Animações breves respeitam redução de movimento.

**Derrota por causa:** Infecção Total só com `max_infection`; ataque final insuficiente: Nemesis sobreviveu; exaustão: Recursos esgotados.

**Auditoria de consistência:** todas as habilidades da rotação atual aparecem no jogo e no DevTools. `Renascimento` é passiva fora do sorteio normal, mas aparece no DevTools. `Interdito` é o único item mantido apenas como legado técnico documentado e permanece fora do jogo e do DevTools.




---
