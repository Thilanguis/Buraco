# Inventário atual de habilidades dos chefes


**Atualizado em 01/10/2026 a partir da rotação ativa em `js/boss/bosses/*.js`, do motor `js/boss/boss-engine.js` e do catálogo do Laboratório de Chefes.**


Este arquivo lista apenas habilidades que realmente participam da rotação atual. O peso é o peso-base usado no sorteio quando a habilidade está elegível; elegibilidade e alvos ainda são validados pelo motor.


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
| Favorita | 2 e 3 | 4 | Prioriza punir o cooperador menos dominado. F2: favorita -2 e outro +8; F3: favorita poupada e outro +8. |
| Dupla Coleira | 3 | 5 | Prende uma carta útil/jogável de cada cooperador durante a rodada. |
| Separação | 3 | 4 | Depois que um jogador alimenta um jogo, o parceiro não pode tocar naquele mesmo jogo na rodada. |
| Controle Absoluto | 3 | 4 | Trata o alvo como Dominado por 1 turno e aplica Dominação +5. |
| Quebra de Vontade | 3 | 4 | Mira um jogador já pressionado: Dominação +8 ou cura de até 180 HP para a Dominadora; só aparece com cura relevante disponível. |
| Ordem Final | 3 | 4 | Decisão às cegas. Recusar = +7; aceitar = +2 e só então 2 cartas jogáveis aleatórias são sorteadas. Cada carta sorteada não usada em jogo = +6. |


**Dominação:** cada jogador usa 0–50 pontos por baixo de 4 Chicotes visuais. Cada Chicote equivale a 12,5; 37,5 = **Sob Controle** e 50 = **Dominado**. A equipe perde quando os dois chegam a 50.


**Transbordamento:** se um jogador já estiver em **50/50 de Dominação** e receber mais pressão, o excesso resvala para o parceiro em qualquer fase. Se ambos estiverem em 50, a derrota especial é confirmada.


**Resistência:** Limpa reduz 4 pontos de Dominação, Real 8 no total e Ás-a-Ás 12 no total. Evoluções sucessivas acrescentam 4 por novo tier; o mesmo tier do mesmo jogo só conta uma vez.


**Fora da rotação:** `Interdito` continua apenas como compatibilidade interna e não deve aparecer como habilidade ativa para o jogador.


## A Matriarca Esmeralda


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
| Caçada de Bela | 1, 2 e 3 | 5 | Bela marca uma carta exata. Usá-la legalmente reduz 3 de Sede; falhar adiciona 14 nas Fases 1–2 ou 16 na Fase 3. |
| Tributo de Sangue | 1, 2 e 3 | 4 | Avalia as duas mãos no fim da rodada. 8–10 cartas adicionam 4 de Sede por jogador (6 na Fase 3); 11+ adicionam 8 (10 na Fase 3). |
| Vinho Carmesim | 1, 2 e 3 | 2 | Com ferimentos e Sede suficiente, consome 15 de Sede para curar até 140/200/260 HP conforme a fase. |
| Marca Carmesim | 1, 2 e 3 | 4 | Marca uma carta jogável de cada cooperador. Cada sucesso remove 2 de Sede; cada falha adiciona 7 nas Fases 1–2 ou 9 na Fase 3. |
| Banquete de Cassandra | 2 e 3 | 5 | Marca um jogo. Alimentá-lo reduz 4 de Sede; falhar adiciona 16 na Fase 2 ou 18 na Fase 3. |
| Banquete dos Mortos | 2 e 3 | 3 | Profana o próximo Morto. Tomá-lo adiciona 12/16 de Sede e cura 90/130 HP. Uma Canastra Real ou Ás-a-Ás purifica: +4 de Sede e nenhuma cura. |
| Enxame de Daniela | 2 e 3 | 4 | Contamina uma carta do lixo. Evitá-la reduz 3 de Sede; recolhê-la adiciona 12 na Fase 2 ou 15 na Fase 3. |
| Coágulo Carmesim | 2 e 3 | 3 | Cria 180/260 de proteção. Romper reduz 6 de Sede; se sobreviver à rodada, metade da proteção restante vira cura. |
| Portas do Castelo | 3 | 3 | Bloqueia o lixo durante toda a rodada. |
| As Três Filhas | 3 | 5 | Cria objetivos independentes de Bela, Cassandra e Daniela; cada sucesso reduz 2 de Sede e cada falha adiciona 8. O HUD mostra os três objetivos separadamente. |


**Transformação por fase:** o retrato principal acompanha a forma da Dimitrescu: Fase 1 usa `boss-dimitrescu.png`, Fase 2 usa `boss-dimitrescu-fase2.png` (semi-transformação) e Fase 3 usa `boss-dimitrescu-fase3.png` (forma dragão). Ao entrar nas Fases 2 e 3, a troca toca `transformacao-dimitrescu-fase2.mp3` ou `transformacao-dimitrescu-fase3.mp3`, respectivamente, e a fala de fase aparece no HUD.


**Condição especial de derrota:** a equipe perde imediatamente quando a Sede chega a 100.


**Redução por canastra:** Limpa -4, Real -8 e Ás-a-Ás -12 de Sede ao alcançar um tier novo.


**Apresentação:** sangue visual aparece no alvo real (carta, jogo, lixo ou Morto). As filhas aparecem em posições fixas sob o HUD e exibem estado ativo/concluído/falhou. `ganho-sangue-dimitresco.mp3` toca quando a Sede aumenta.






## Rainha Nehelenia


**HP:** 2400. **Espelhos dos Sonhos:** Nehelenia pode tomar até **5 Espelhos**. Cada falha relevante adiciona 1; chegar a **5/5** causa derrota imediata pelo **Mundo do Espelho**. Uma Canastra Limpa ou superior recupera 1 Espelho ao atingir um novo tier válido.


| Habilidade | Fases | Peso | Funcionamento atual |
|---|---:|---:|---|
| Jogo Espelhado | 1, 2 e 3 | 5 | Um jogo real é clonado fisicamente na mesa em dois reflexos completos e idênticos. O alvo escolhe um deles com exatamente 1 carta legal. Acerto joga normalmente; erro manda a carta ao fundo do monte e deixa o jogador **Desorientado**, sem novas baixadas naquele turno. Se houver **Presa Marcada** antiga em outro jogo, Jogo Espelhado tem precedência temporária; a Presa continua ativa depois. |
| Siga o Reflexo | 1, 2 e 3 | 5 | A ordem é travada pela **sequência real da rodada**: o 1º jogador que vai agir define o padrão pelo turno inteiro; o 2º jogador que vai agir precisa terminar com exatamente a mesma quantidade, inclusive `0`. A habilidade permanece ativa entre os dois turnos e Nehelenia não sorteia outra habilidade no meio. Qualquer diferença adiciona +1 Espelho. |
| Espelho do Lixo | 2 e 3 | 4 | O topo do lixo aparece em **dois reflexos idênticos**. Não há pista de verdadeiro/falso: a escolha é 50/50. Errar sela o lixo durante a rodada. |
| Prisão no Espelho | 2 e 3 | 3 | Com pelo menos 1 Espelho tomado, o parceiro pode alimentar o jogo refletido para recuperar 1 Espelho. |
| Pesadelo Eterno | 3 | 5 | Uma carta ORIGINAL é mostrada, gera dois reflexos idênticos e os três são embaralhados visualmente. O alvo precisa acompanhar a original; errar adiciona +1 Espelho. |
| Laço do Tigre | 1, 2 e 3 | 4 | Liga dois jogos; cada lado precisa ser alimentado. O lado ignorado mantém garras até ser rompido. |
| Presa Marcada | 1, 2 e 3 | 3 | Marca um jogo; até resolvê-lo, o alvo não pode alimentar outro jogo existente. |


**Leitura dos capangas no HUD:** quando Tiger, Hawk ou Fish estiverem ativos, o card mostra o **alvo** e o vínculo da habilidade. Efeitos que continuam após o turno recebem a marca **PERSISTENTE**, para que dois capangas simultâneos não pareçam estar afetando o mesmo jogador.
| Olho do Falcão | 1, 2 e 3 | 3 | Exige descarte do naipe marcado; errar pode vigiar o topo e bloquear o lixo. |
| Vigilância | 2 e 3 | 3 | O alvo não pode alimentar o jogo marcado naquele turno. |
| Mão no Espelho | 1, 2 e 3 | 3 | Marca uma carta que precisa sair da mão; falhar cria Reflexo Morto, descartável mas não jogável. |
| Reflexo Invertido | 2 e 3 | 3 | Impede abrir jogo novo até alimentar jogo existente; persiste até ser resolvido. |


**Fases:** 1 = Espelhos dos Sonhos; 2 = Circo da Lua Morta; 3 = Pesadelo Eterno.


**Apresentação:** o feedback textual continua no painel amarelo padrão (`☐ / ☑ / ✕`). As ilusões acontecem fisicamente na mesa: clonagem de jogos, espelhos centrais e embaralhamento visual. Nenhum reflexo falso recebe `X`, rótulo ou pista automática.




**Auditoria de consistência:** todas as habilidades da rotação atual aparecem no jogo e no DevTools. `Renascimento` é passiva fora do sorteio normal, mas aparece no DevTools. `Interdito` é o único item mantido apenas como legado técnico documentado e permanece fora do jogo e do DevTools.




---


## Revisão experimental de pressão — 2026-10-03


### A Dominadora
- forced_choice: Dominação +6 direto; aceitar ordem +2; falha acrescenta +14.
- exposure: falha +8.
- iron_etiquette: sucesso +2; falha +10.
- favorite: F2 -2 na favorita/+8 no parceiro; F3 +8 no parceiro.
- absolute_control: +4 e mantém o controle temporário.
- break_will: +8 ou cura de até 180 HP; não remove carta de canastra.
- final_order: recusar +6; aceitar = +6 por carta marcada não usada.
- controles puros continuam sem progresso especial direto.


### Rainha Nehelenia
- mirrored_meld: erro/ignorar = Mundo do Espelho +18.
- follow_reflection: falha = +16.
- discard_mirror: erro = +16 e sela o lixo.
- tiger_link: falha = +12.
- eternal_nightmare: erro = +24.
- mirror_prison: peso 0/fases vazias no pool ofensivo; resgate reduz 8 quando acionado.
- demais capangas/efeitos continuam prioritariamente como controle.


### Resistência por canastra
Régua comum do experimento: Limpa -4, Real -8 total, Ás-a-Ás -12 total.