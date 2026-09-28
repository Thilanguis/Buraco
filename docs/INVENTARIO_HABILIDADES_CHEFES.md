# Inventário atual de habilidades dos chefes

**Atualizado em 28/09/2026 a partir da rotação ativa em `js/boss/bosses/*.js` e do motor `js/boss/boss-engine.js`.**

Este arquivo lista apenas habilidades que realmente participam da rotação atual. O peso é o peso-base usado no sorteio quando a habilidade está elegível; elegibilidade e alvos ainda são validados pelo motor.

## O Banqueiro

| Habilidade | Fases | Peso | Funcionamento atual |
|---|---:|---:|---|
| Juros Fixos | 1, 2 e 3 | 5 | Sorteia um contrato. O titular escolhe receber a cobrança integral de Dívida ou colocar uma carta aleatória como garantia no Cofre. O resgate posterior cobra custo base e juros acumulados. |
| Tarifa de Manutenção | 1, 2 e 3 | 3 | Cada cooperador recebe cartas extras junto da compra normal: +1 nas Fases 1–2 e +2 na Fase 3. Cartas financiadas que permanecerem na mão ao fim do turno geram Dívida. |
| Bloqueio de Crédito | 1, 2 e 3 | 3 | Bloqueia a retirada do lixo durante a rodada. |
| Auditoria de Naipe | 2 e 3 | 4 | Sorteia um naipe. A equipe precisa baixar 3 cartas dele na Fase 2 ou 4 na Fase 3. Sucesso reduz 5 de Dívida; falha adiciona 10 ou 12. |
| Penhora | 2 e 3 | 2 | Bloqueia temporariamente um jogo elegível da equipe até a próxima cobrança. |
| Juros Compostos | 2 e 3 | 4 | No fechamento, adiciona Dívida conforme o total de cartas restantes nas mãos, limitado a 12. |
| Limite de Crédito | 1, 2 e 3 | 4 | Define franquia compartilhada de cartas vindas da mão. Excedentes geram Dívida, com franquia menor e teto maior conforme a fase avança. |
| Ágio do Lixo | 2 e 3 | 3 | A primeira retirada confirmada do lixo na rodada cobra Dívida: +4 na Fase 2 e +6 na Fase 3. |

**Condição especial de derrota:** a equipe perde imediatamente se a Dívida coletiva chegar a 100.

## A Dominadora

| Habilidade | Fases | Peso | Funcionamento atual |
|---|---:|---:|---|
| Coleira | 1 e 2 | 5 | Prende até duas cartas do jogador marcado durante o turno dele. |
| Escolha Forçada | 1, 2 e 3 | 5 | O alvo escolhe entre receber 1 Chicote ou aceitar uma ordem válida para o próximo turno. |
| Exposição | 1, 2 e 3 | 4 | Marca uma carta que precisa ser usada antes do fim do turno; falhar adiciona 1 Chicote. |
| Troca Forçada | 2 e 3 | 4 | Troca uma carta entre as mãos dos dois cooperadores. |
| Mãos Atadas | 2 e 3 | 4 | A equipe inteira pode criar apenas 1 novo jogo naquela rodada. |
| Posse | 2 e 3 | 3 | Suspende o dano acumulado de um jogo até a condição de libertação; novas contribuições continuam causando o dano individual correspondente. |
| Etiqueta de Ferro | 1, 2 e 3 | 4 | Obriga o alvo a encerrar o próximo turno descartando o naipe ordenado. |
| Favorita | 2 e 3 | 4 | Na Fase 2 remove 1 Chicote da favorita e aplica +1 no outro jogador; na Fase 3 não remove Chicote da favorita e aplica apenas +1 no punido. |
| Dupla Coleira | 3 | 5 | Prende uma carta de cada cooperador durante a rodada. |
| Separação | 3 | 4 | Impede que os dois cooperadores alimentem o mesmo jogo naquela rodada. |
| Controle Absoluto | 3 | 4 | Mantém um jogador Dominado durante o próximo turno. |
| Quebra de Vontade | 3 | 4 | Um jogador com pelo menos 2 Chicotes recebe uma escolha pessoal entre punições. |
| Ordem Final | 3 | 4 | Cada cooperador recebe uma escolha de punição diferente na mesma habilidade. |

**Chicotes:** com 3 o jogador fica **Sob Controle**; com 4 fica **Dominado**. A equipe perde se os dois cooperadores chegarem a 4 ao mesmo tempo.

**Fora da rotação:** `Interdito` continua apenas como compatibilidade interna e não deve aparecer como habilidade ativa para o jogador.

## A Matriarca Esmeralda

| Habilidade | Fases | Peso | Funcionamento atual |
|---|---:|---:|---|
| Semente Viva | 1, 2 e 3 | 5 | Marca uma carta que precisa ser usada legalmente no próximo turno para impedir o florescimento da ameaça. |
| Raiz Faminta | 1, 2 e 3 | 5 | Marca um jogo que precisa receber uma carta legal antes do prazo. Se falhar, pode gerar uma única nova Raiz na rodada seguinte; a Raiz propagada não se propaga novamente. |
| Orvalho Restaurador | 1, 2 e 3 | 3 | Prepara cura por faixas. Cartas novas baixadas legalmente reduzem a cura e progresso suficiente a zera. |
| Trepadeiras Gêmeas | 2 e 3 | 4 | Marca mais de um jogo; cada objetivo precisa receber uma carta legal na rodada. |
| Enxerto | 2 e 3 | 3 | Liga dois jogos e exige que ambos recebam uma carta legal na rodada. |
| Pólen do Lixo | 2 e 3 | 3 | Contamina o topo do lixo. Se ele for retirado, a Matriarca recebe +1 Flor e cura até 40 HP. |
| Colheita | 2 e 3 | 2 | Avalia a mão do alvo no fim do turno: 0–7 sem efeito; 8–10 cura 60 HP; 11+ gera +1 Flor e cura 100 HP. |
| Florescimento Real | 3 | 4 | Combina objetivos naturais independentes; cada um precisa ser cumprido separadamente. |
| Casulo Esmeralda | 3 | 3 | Cria um escudo de 180 pontos que absorve dano até ser rompido. |
| Coroa da Primavera | 3 | 3 | Marca uma ameaça natural; se ela falhar, prepara uma Raiz Fortalecida que exige cooperação. |

**Condição especial de derrota:** a equipe perde quando o Florescimento chega a 5 Flores.

**Renascimento:** na Fase 3, se a Matriarca cair a 0 HP com pelo menos 3 Flores e ainda não tiver usado o efeito, ela consome 3 Flores e retorna uma vez.
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

**Condição especial de derrota:** a equipe perde imediatamente quando a Sede chega a 100.

**Redução por canastra:** Limpa -4, Real -8 e Ás-a-Ás -12 de Sede ao alcançar um tier novo.

**Apresentação:** sangue visual aparece no alvo real (carta, jogo, lixo ou Morto). As filhas aparecem em posições fixas sob o HUD e exibem estado ativo/concluído/falhou. `ganho-sangue-dimitresco.mp3` toca quando a Sede aumenta.

