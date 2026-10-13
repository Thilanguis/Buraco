# Referência única — Chefes da Mesa (13/10/2026)

**Estado:** pacote de balanceamento aplicado para playtest local; não é uma homologação da dificuldade contra humanos. Os relatórios anteriores ficam como histórico, não como regras vigentes.

## Dano vigente

| Canastra | Bônus além do valor das cartas |
|---|---:|
| Suja | 100 |
| Limpa | 200 |
| Real | 500 |
| Ás-a-Ás | 1.000 |

O valor individual das cartas soma ao bônus: 2 = 10, Ás = 15, Joker = 20, 3–7 = 5, 8–K = 10. Evoluções aplicam **somente a diferença de bônus** (+100 ao virar Limpa; +300 ao virar Real; +500 ao virar Ás-a-Ás), sem cobrar novamente os valores das cartas. O mesmo ID físico não gera dano duplicado.

## HP e recursos especiais

| Chefe | HP principal | Regra de derrota especial |
|---|---:|---|
| O Banqueiro | 2.650 | 100 de Dívida coletiva |
| A Dominadora | 2.800 | 50 pontos de Dominação em **ambos** os jogadores |
| A Matriarca Esmeralda | 2.300 | 10 Flores |
| Rainha Nehelenia | 2.400 | 100 pontos no Mundo do Espelho (5 espelhos visuais) |
| Nemesis | 2.500 | 100 de Infecção |
| Lady Dimitrescu | 2.000 | 100 de Sede |

## Nerfs pontuais confirmados (13/10)

- **Nehelenia:** Jogo Espelhado +14, Siga o Reflexo +12, Espelho do Lixo +12, Pesadelo Eterno +20. Outras habilidades sem mudança; conserva três auxiliares e 5 espelhos.
- **Banqueiro:** Juros Fixos integral nas fases 1/2 = 8/10/12; fase 3 = 12/14/15. Garantias e juros de adiamento não mudaram. Auditoria de Naipe falha = +10 (fase 2) / +14 (fase 3). Cofre fechado não pode ser resgatado pelo BOT.
- **Dominadora:** falha na Etiqueta de Ferro = +8/+10/+12 por fase; obedecer continua +2/+2/+3. As outras punições e o limite de 50 por jogador não mudaram.
- **Matriarca:** dez Flores e Renascimento uma vez, +300 HP e consome uma Flor; nenhuma outra mecânica ajustada.
- **Nemesis:** três zumbis persistentes de tipos diferentes podem coexistir em qualquer fase, via Invasão da Horda; Agarrador 180 HP, Infectado 190 HP, Devorador 200 HP. Cada zumbi pode reanimar uma vez com metade do HP e há limite de uma reanimação por fase.
- **Dimitrescu:** Lady 2.000 HP, PROT. 1.500, três filhas com 500 HP; itens, regen e Fúria preservados.

## Catálogo vigente de habilidades (fonte: definições do código)

### O Banqueiro — 2.650 HP

| Habilidade | Fases | Peso | Efeito curto |
|---|---|---:|---|
| Juros Fixos | 1/2/3 | 5 | Escolha entre pagar a cobrança integral ou prender uma carta aleatória no Cofre. |
| Tarifa de Manutenção | 1/2/3 | 3 | F1/F2: Todos compram 1 carta financiada junto da compra normal.; F3: Todos compram 2 cartas financiadas junto da compra normal. |
| Bloqueio de Crédito | 1/2/3 | 3 | O lixo ficará bloqueado durante esta rodada. |
| Auditoria de Naipe | 2/3 | 4 | F2: Baixem 3 cartas de naipe marcado nesta rodada.; F3: Baixem 4 cartas de naipe marcado nesta rodada. |
| Penhora | 2/3 | 2 | Um jogo da equipe ficará bloqueado até a próxima cobrança. |
| Juros Compostos | 2/3 | 4 | O total de cartas nas mãos define a faixa da cobrança. |
| Limite de Crédito | 1/2/3 | 4 | Cartas da mão acima da franquia compartilhada geram Dívida. |
| Ágio do Lixo | 2/3 | 3 | A primeira retirada confirmada do lixo nesta rodada cobra um ágio. |

### A Dominadora — 2.800 HP

| Habilidade | Fases | Peso | Efeito curto |
|---|---|---:|---|
| Coleira | 1/2 | 5 | Prende até 2 cartas úteis do alvo neste turno. |
| Escolha Forçada | 1/2/3 | 5 | F1: Aceite a ordem ou sofra Dominação +6.; F2: Aceite a ordem ou sofra Dominação +7.; F3: Aceite a ordem ou sofra Dominação +8. |
| Exposição | 1/2/3 | 4 | Use a carta exposta neste turno. |
| Troca Forçada | 2/3 | 4 | Troca 1 carta útil entre os cooperadores. |
| Mãos Atadas | 2/3 | 4 | Cada jogador fica preso ao primeiro jogo que tocar. |
| Posse | 2/3 | 3 | O dano do jogo fica suspenso até romper a Posse. |
| Etiqueta de Ferro | 1/2/3 | 4 | Termine o turno descartando o naipe ordenado. |
| Favorita | 2/3 | 4 | Uma é poupada; a menos dominada recebe a punição. |
| Dupla Coleira | 3 | 5 | Prende 1 carta útil de cada jogador. |
| Separação | 3 | 4 | Um jogo alimentado fica exclusivo daquele jogador na rodada. |
| Controle Absoluto | 3 | 4 | O alvo fica Dominado por 1 turno. |
| Quebra de Vontade | 3 | 4 | Escolha entre Dominação ou curar a Dominadora. |
| Ordem Final | 3 | 4 | Aceite a Ordem às cegas ou sofra Dominação. |

### A Matriarca Esmeralda — 2.300 HP

| Habilidade | Fases | Peso | Efeito curto |
|---|---|---:|---|
| Semente Viva | 1/2/3 | 5 | Use a carta marcada no proximo turno para impedir que a semente floresca. |
| Raiz Faminta | 1/2/3 | 5 | Adicione uma carta legal ao jogo marcado antes do fim da rodada. Se falhar, ela pode gerar uma única nova Raiz na rodada seguinte; uma Raiz já propagada não se propaga novamente. |
| Orvalho Restaurador | 1/2/3 | 3 | A cura prevista cai por faixas conforme cartas novas entram legalmente na mesa e zera com 6 cartas. |
| Trepadeiras Gemeas | 2/3 | 4 | 2 jogo(s) precisam receber uma carta legal nesta rodada. Uma ou duas falhas: +1 Flor no total. |
| Enxerto | 2/3 | 3 | Alimente os dois jogos ligados nesta rodada: dois evitam tudo; apenas um cura até 50 HP, sem Flor; nenhum gera +1 Flor e pode propagar uma Raiz. |
| Polen do Lixo | 2/3 | 3 | Se o topo contaminado for pego, ganho +1 Flor e curo ate 30 HP. |
| Colheita | 2/3 | 2 | A quantidade de cartas na mao do alvo sera avaliada no fim do turno. |
| Florescimento Real | 3 | 4 | Cumpra os 0 objetivos marcados. Falhar em um ou mais dá apenas 1 Flor à Matriarca. |
| Casulo Esmeralda | 3 | 3 | Um casulo de 180 pontos absorvera o dano ate ser rompido. |
| Coroa da Primavera | 3 | 3 | A Coroa reforça uma ameaça. Se esse objetivo falhar, nasce uma Raiz Fortalecida na próxima rodada. Essa nova Raiz não cria outras. |
| Renascimento | 3 | Passiva | Na fase final, se morrer e tiver pelo menos uma Flor, a Matriarca consome 1 Flor e volta com 300 HP. Só pode renascer uma vez por batalha. |

### Rainha Nehelenia — 2.400 HP

| Habilidade | Fases | Peso | Efeito curto |
|---|---|---:|---|
| Jogo Espelhado | 1/2/3 | 5 | Nehelenia cria dois reflexos. Escolher o falso envia a carta ao fundo, deixa o jogador Desorientado e avança +14 no Mundo do Espelho. |
| Siga o Reflexo | 1/2/3 | 5 | O segundo cooperador precisa igualar a quantidade baixada pelo primeiro; falhar avança +12 no Mundo do Espelho. |
| Espelho do Lixo | 2/3 | 4 | O topo do lixo aparece em dois reflexos idênticos. Errar sela o lixo e avança +12 no Mundo do Espelho. |
| Prisão no Espelho | 1/2/3 | 2 | Nehelenia aprisiona quem está mais pressionado pelo Mundo do Espelho. O parceiro precisa alimentar um jogo válido; sucesso liberta sem penalidade, falha avança +8. |
| Pesadelo Eterno | 3 | 5 | A original e dois reflexos se misturam. Errar avança +20 no Mundo do Espelho. |
| Laço do Tigre | 1/2/3 | 4 | Tiger's Eye liga dois jogos. Ignorar qualquer lado avança +12 no Mundo do Espelho e deixa as garras persistentes. |
| Presa Marcada | 1/2/3 | 3 | Tiger's Eye marca uma Presa que o alvo consegue alimentar. Enquanto ela não for alimentada, esse jogador não pode alimentar nenhum outro jogo existente; a marca persiste até ser resolvida. |
| Olho do Falcão | 1/2/3 | 3 | Hawk's Eye exige que o alvo encerre o turno descartando naipe marcado. Se ele descartar outro naipe, Hawk vigia essa carta e ninguém pode recolher o lixo enquanto ela permanecer no topo. |
| Vigilância | 2/3 | 3 | Hawk's Eye fecha a rota para um jogo durante o turno do alvo. O jogo marcado não pode ser alimentado por esse jogador naquele turno. |
| Mão no Espelho | 1/2/3 | 3 | Fish Eye marca uma carta do alvo que pode ser usada com segurança. Ela precisa sair da mão — em jogo ou no descarte — antes do fim do turno; se falhar, vira um Reflexo Morto que não pode mais entrar em jogo e só sai pelo descarte. |
| Reflexo Invertido | 2/3 | 3 | Fish Eye impede o alvo de abrir um jogo novo até que ele alimente um jogo já existente. Se não resolver no turno atual, o efeito permanece nos próximos turnos até ser rompido. |

### Nemesis — 2.500 HP

| Habilidade | Fases | Peso | Efeito curto |
|---|---|---:|---|
| Invasão da Horda | 1/2/3 | 4 | Alimente jogos existentes com 3 cartas nesta rodada. Sucesso repele; falha deixa o Devorador persistente, sem Infecção extra. |
| Caçada S.T.A.R.S. | 1/2/3 | 5 | F1: O alvo S.T.A.R.S. deve causar dano direto ao Nemesis neste turno. Zumbis não contam. Falha: +8 Infecção, mais modificadores.; F2: O alvo S.T.A.R.S. deve causar dano direto ao Nemesis neste turno. Zumbis não contam. Falha: +10 Infecção, mais modificadores.; F3: O alvo S.T.A.R.S. deve causar dano direto ao Nemesis neste turno. Zumbis não contam. Falha: +12 Infecção, mais modificadores. |
| Tentáculo Infeccioso | 1/2/3 | 5 | F1: Jogue 1 das 2 marcadas para evitar a punição. Só descartar: +4; nenhuma: +8 Infecção, mais modificadores.; F2: Jogue 1 das 2 marcadas para evitar a punição. Só descartar: +5; nenhuma: +10 Infecção, mais modificadores.; F3: Jogue 1 das 2 marcadas para evitar a punição. Só descartar: +6; nenhuma: +12 Infecção, mais modificadores. |
| Zona Contaminada | 1/2/3 | 3 | O alvo pode pegar o lixo neste turno, mas cada retirada custa +6 Infecção. Agarrador continua ativo. |
| Comando da Horda | 1/2/3 | 3 | Reforça 1 zumbi até o fim da próxima rodada: Agarrador +1 carta; Infectado +2 por falha; Devorador +15 HP de cura. |
| Lança-Foguetes | 2/3 | 4 | F2: Alimentar a Zona de Impacto é permitido e custa +10 Infecção por carta nova nesta rodada.; F3: Alimentar a Zona de Impacto é permitido e custa +12 Infecção por carta nova nesta rodada. |
| Regeneração Parasita | 2/3 | 2 | Cura 100 HP do zumbi vivo com menor percentual de HP, sem superar seu máximo. |
| Reanimação Viral | 2/3 | 2 | Um zumbi derrotado volta com metade da vida; na fase final, volta Mutado. Cada zumbi só pode reviver uma vez na batalha, e só há uma Reanimação por fase. |
| Barragem de Tentáculos | 3 | 4 | Faça 2 das 3 cartas marcadas sair legalmente da mão neste turno. Falha: +16 Infecção, mais modificadores. |
| Extermínio S.T.A.R.S. | 3 | 4 | Nesta rodada, S.T.A.R.S. deve atacar o Nemesis e o parceiro deve alimentar o jogo escolhido. Cumprir ambos evita a punição; cumprir só um custa 8 Infecção; nenhum custa 16. Efeitos ativos podem aumentar esses custos. |
| Surto Ômega | 3 | 3 | Até o fim da próxima rodada, as falhas causam Infecção extra: 2 abaixo de 50, 4 entre 50 e 74, ou 6 a partir de 75. Anunciar o Surto não aumenta a barra. |

### Lady Dimitrescu — 2.000 HP

| Habilidade | Fases | Peso | Efeito curto |
|---|---|---:|---|
| Tributo de Sangue | 1/2/3 | 4 | No fim da rodada, cada mão com 8–10 cartas soma 2 Sede; com 11+ soma 4. Fúria acrescenta 0/4/8/10 uma única vez ao total cobrado. |
| Vinho Carmesim | 1/2/3 | 2 | F1: Se estiver ferida e tiver ao menos 20 de Sede, Lady Dimitrescu consome 15 de Sede para se curar 140 HP.; F2: Se estiver ferida e tiver ao menos 20 de Sede, Lady Dimitrescu consome 15 de Sede para se curar 200 HP.; F3: Se estiver ferida e tiver ao menos 20 de Sede, Lady Dimitrescu consome 15 de Sede para se curar 260 HP. |
| Marca Carmesim | 1/2/3 | 4 | Lady marca uma carta de cada cooperador. Use-as em jogos para evitar a punição. A Sede por falha cresce com a Fúria, sem ultrapassar a cobrança máxima anterior. |
| Banquete dos Mortos | 2/3 | 3 | F2: Lady profana o próximo Morto. Quando ele for tomado, ganha 10 de Sede e cura 90 HP, com bônus de Fúria; uma Canastra Real ou Ás-a-Ás reduz a profanação a +4 de Sede base e anula a cura.; F3: Lady profana o próximo Morto. Quando ele for tomado, ganha 14 de Sede e cura 130 HP, com bônus de Fúria; uma Canastra Real ou Ás-a-Ás reduz a profanação a +4 de Sede base e anula a cura. |
| Coágulo Carmesim | 2/3 | 3 | F2: Lady solidifica a própria Sede em uma barreira de 180 de proteção. Se a equipe romper o Coágulo, evita a cura; se ele sobreviver até o fim da rodada, metade da proteção restante vira cura.; F3: Lady solidifica a própria Sede em uma barreira de 260 de proteção. Se a equipe romper o Coágulo, evita a cura; se ele sobreviver até o fim da rodada, metade da proteção restante vira cura. |
| Portas do Castelo | 3 | 3 | O lixo fica bloqueado durante toda a rodada. Os cooperadores precisam sobreviver usando o monte. |
| As Três Filhas | 2/3 | 3 | Nesta rodada, todas as filhas vivas usam suas passivas. Cada falha ou reação custa +3 Sede. |
| Sangue Impuro | 1/2/3 | 3 | Nesta rodada, o primeiro Joker ou 2 usado como coringa por cada cooperador causa +3 Sede. 2 natural não conta. Máximo +6. |

## Fontes de verdade e manutenção

- **Implementação:** `js/boss/bosses/*.js`, `js/boss/boss-balance.js`, motor e adaptadores por chefe.
- **Ajuda do jogador:** `js/boss/presentation/*.js` e UI, deve refletir o mesmo valor da regra.
- **Validação:** `tests/cooperative-balance-oct13.test.mjs` e demais testes de regressão.
- **Relatórios de simulação:** históricos, não devem ser reescritos com as regras novas.
- **Economia documental:** manter este arquivo como resumo canônico; conservar relatórios anteriores apenas como histórico datado e evitar copiar listas inteiras para README, handoff e checklist.

**Limites:** não foi executado novo balanceamento BOT×BOT ou teste com duas pessoas em Firebase nesta revisão.
