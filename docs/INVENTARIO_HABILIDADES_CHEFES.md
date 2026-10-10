# Inventário atual de habilidades dos chefes

**Elegibilidade revisada em 09/10/2026:** desafios podem ser impossíveis de cumprir com a mão atual. Preservam-se fase, recursos, alvos reais, saída legal das marcas e segurança dos bloqueios. A última habilidade só sai do sorteio se houver outra realmente elegível. Pesos e consequências não mudaram. Classificação individual dos seis chefes e comparação reproduzível: `AUDITORIA_ELEGIBILIDADE_CHEFES_2026-10-09.md`.


**Atualizado em 08/10/2026 a partir do workspace local: itens v2 da Dimitrescu e filhas 500 HP/piso 300 em partidas novas. Pesos, Sede/Fúria e os reworks anteriores de Nemesis/Enxerto permanecem. Meta de 65%–75% ainda depende de playtest competente. Relatórios: `REWORK_ITENS_DIMITRESCU_2026-10-08.md` e `REWORK_NEMESIS_MATRIARCA_E_UX_DIMITRESCU_2026-10-08.md`.**


Este arquivo lista apenas habilidades que realmente participam da rotação atual. O peso é o peso-base usado no sorteio quando a habilidade está elegível; elegibilidade e alvos ainda são validados pelo motor.

**Pacote de 07/10/2026:** batida fixa de 100 pelo pipeline oficial; Devorador persistente usa contador coletivo (detalhes abaixo). Espelho do Lixo respeita bloqueios canônicos, incluindo Hawk. REFLEXO MORTO não recebe illusion lock; sobreposições legadas preservam o descarte. Imagem Falsa/Espelho Estilhaçado continuam fora da rotação; apenas seus caminhos legados foram protegidos. Pólen enterrado sinaliza a pilha, não o topo normal. HPs, pesos, Infecção e demais valores de cura/punição permanecem.

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

**Teto de burst:** uma ativação aplica no máximo +1 Flor, mesmo com falhas múltiplas. Trepadeiras: uma/duas falhas = +1; Enxerto: um lado = cura até 50 HP sem Flor/propagação comum, zero lados = +1 Flor e propagação; Florescimento Real: qualquer número de falhas = +1. Propagações independentes existentes permanecem. HP 2000, derrota em 5 Flores, alívio incremental por canastras, limites de cura e Renascimento F3 (1 Flor, 300 HP, 1x) preservados. Orvalho e Casulo não mudam.


**HP:** 2000. **Limite total de cura por rodada:** F1 100 / F2 150 / F3 200.


| Habilidade | Fases | Peso | Funcionamento atual |
|---|---:|---:|---|
| Semente Viva | 1, 2 e 3 | 5 | Marca uma carta que precisa ser usada legalmente no próximo turno para impedir o florescimento da ameaça. |
| Raiz Faminta | 1, 2 e 3 | 5 | Marca um jogo que precisa receber uma carta legal antes do prazo. Se falhar, pode gerar uma única nova Raiz na rodada seguinte; a Raiz propagada não se propaga novamente. |
| Orvalho Restaurador | 1, 2 e 3 | 3 | Cura por faixas: F1 = 100/65/30/0; F2 = 120/80/40/0; F3 = 150/100/50/0 para 0–1 / 2–3 / 4–5 / 6+ cartas novas. |
| Trepadeiras Gêmeas | 2 e 3 | 4 | Marca mais de um jogo; cada objetivo precisa receber uma carta legal na rodada. |
| Enxerto | 2 e 3 | 3 | Dois jogos ligados: alimentar ambos neutraliza; um custa cura de até 50 HP; nenhum dá +1 Flor e propagação. |
| Pólen do Lixo | 2 e 3 | 3 | Contamina o topo do lixo. Se ele for retirado, a Matriarca recebe +1 Flor e cura até 30 HP. |
| Colheita | 2 e 3 | 2 | Avalia a mão do alvo no fim do turno: 0–7 sem efeito; 8–10 cura 50 HP; 11+ gera +1 Flor e cura 80 HP. |
| Florescimento Real | 3 | 4 | Combina objetivos naturais independentes; cada um precisa ser cumprido separadamente. |
| Casulo Esmeralda | 3 | 3 | Cria um escudo de 180 pontos que absorve dano até ser rompido. |
| Coroa da Primavera | 3 | 3 | Marca uma ameaça natural; se ela falhar, prepara uma Raiz Fortalecida que exige cooperação. |


**Condição especial de derrota:** a equipe perde quando o Florescimento chega a 5 Flores.


**Renascimento (passiva):** na Fase 3, se a Matriarca cair a 0 HP com pelo menos **1 Flor** e ainda não tiver usado o efeito, ela consome **1 Flor** e retorna com **300 HP** uma vez. Não entra no sorteio normal; aparece no DevTools com peso 0 para teste manual.
## Lady Dimitrescu

**Itens v2 — 08/10/2026 (partidas novas):** Lady **2000 HP**, três filhas permanentes **500/500**, regen própria **50** no fim da rodada. Sede 0–100; derrota especial 100. Vínculo adiciona **1500 PROT. consumíveis** inicialmente, capacidade de 500 por filha viva. Coágulo absorve primeiro, depois PROT.; excedente atinge HP. Morte retira até 500 restantes, sem dano automático à vida. Não recarrega; zero expõe Lady mesmo com filhas vivas. Exceção nova: Adaga transmite dano direto à vida real, sem consumir as proteções. Saves v1 mantêm 450/piso 200 e efeitos antigos.

| Habilidade da Lady | Fases | Peso | Funcionamento base |
|---|---:|---:|---|
| Tributo de Sangue | 1, 2 e 3 | 4 | Por jogador: 8–10 cartas +3/+4/+6 (F1/F2/F3); 11+ +6/+8/+10. Sucesso não reduz Sede. |
| Vinho Carmesim | 1, 2 e 3 | 2 | Ferida e Sede 20+: consome 15 para cura 140/200/260, multiplicada pela Fúria. |
| Marca Carmesim | 1, 2 e 3 | 4 | Uma carta jogável por cooperador. Cada sucesso evita punição; falha +5/+7/+9. |
| Banquete dos Mortos | 2 e 3 | 3 | Da Lady, independente de Cassandra. Morto profanado: +10/+14 Sede e cura 90/130. Real/Ás-a-Ás: base +4 e sem cura. |
| Coágulo Carmesim | 2 e 3 | 3 | Proteção 180/260 antes do Vínculo. Romper evita cura; metade restante vira cura da Lady com Fúria. |
| Portas do Castelo | 3 | 3 | Lixo fechado durante a rodada. |
| As Três Filhas (versão 2) | 2 e 3 | 3 | Todas as filhas vivas usam a passiva padrão +3, sem objetivo duplicado ou cobrança extra. |
| Sangue Impuro | 1, 2 e 3 | 3 | Primeiro Joker/2 como coringa de cada jogador +3; máximo +6 inclusive com Fúria; 2 natural não ativa. |

**Passivas por rodada:** exatamente uma filha viva escolhida por RNG determinístico, sem repetir a última escolha normal quando há alternativa; snapshot/undo preservam a escolha. As outras continuam atacáveis/regenerando/protegendo, sem objetivo. As Três Filhas substitui a escolha única por todas as vivas. Bela exige usar carta jogável até o fim do turno do alvo; Cassandra exige alimentar jogo concretamente alimentável até o fim da rodada; cada falha +3. Sem candidato legal não punem. Daniela aplica +3 na primeira retirada efetiva do Lixo, protegida ou completa, uma vez; sem retirada não pune.

**Fúria:** 0/1/2/3 filhas mortas = NORMAL/I/II/FINAL. Cura da Lady ×1/1,10/1,20/1,30 (arredondada para baixo), Sede ofensiva própria +0/2/4/6 por evento positivo. Não altera passivas +3, Sangue Impuro (máximo +6), regen das filhas, custo do Vinho nem HP máximo.

**Itens:** 15 cartas físicas aleatórias (incluindo Joker), três de cada PNG real. Perdas aditivas sobre os 500 HP originais: Adaga 5%/25; Explosivo 10%/50; Frio 20%/100; Anticoagulante 15%/75; Relíquia 20%/100; piso 300, sem dano extra quando a vida já está abaixo do novo máximo. Adaga transmite 30% do dano efetivo dos ataques à Lady, ignorando PROT./Coágulo, sem somar porcentagem em duplicatas. Explosivo causa 60 e hemorragia de 50 antes da regen por 2 fechamentos; renovar não empilha ticks. Frio bloqueia cura efetiva (até 2 cargas), sem gastar na vida cheia. Anticoagulante mantém regen 25. Relíquia cancela uma oportunidade realmente válida, esperando por ela quando necessário. Sacrifício não encerra turno; cartas anexadas retornam ao fundo do Lixo na morte, sem item reutilizável. Relatório: [REWORK_ITENS_DIMITRESCU_2026-10-08.md](REWORK_ITENS_DIMITRESCU_2026-10-08.md).

**Retiradas da rotação:** Caçada de Bela, Banquete de Cassandra e Enxame de Daniela; identidade absorvida pelas passivas. As Três Filhas retorna reformulada, sem a antiga cobrança +8; payload antigo é cancelado com segurança. Demais pesos-base mantidos.

**Apresentação:** retrato da Lady seleciona o alvo como no Nemesis, sem botão abaixo das filhas. HP numérico nas filhas; regen na ajuda, sem chip REGEN +50. Cada filha viva tem um chip clicável de passiva: CAÇADA, BANQUETE ou LIXO +3. Não escolhida: neutro; escolhida: destacado, com carta/jogo no mesmo chip. Sem chip separado de falha ou resultado: explicação completa no popover. Debuffs de item à parte. PNG do item é clicável na mão, sem botão textual; Bela usa borda/identificador periférico. Fotos da Lady continuam por fase; chip/aura de Fúria independente. Áudio individual de morte: `what-have-you-done-to-my-daughter.mp3`. Painel compacto dos cinco itens com ajuda oficial por clique/toque.

**Canastras:** Limpa -4, Real -8, Ás-a-Ás -12, apenas diferença do novo tier; nenhum sucesso de objetivo concede redução. Contrato completo: [REWORK_DIMITRESCU_2026-10-07.md](REWORK_DIMITRESCU_2026-10-07.md). Números experimentais, sem win rate medido.






## Rainha Nehelenia


**HP:** 2400. **Mundo do Espelho:** 0–100. O HUD mantém **5 espelhos ornamentados**, cada um representando 20 pontos e aceitando preenchimento parcial. Chegar a **100/100** causa derrota imediata.


| Habilidade | Fases | Peso | Funcionamento atual |
|---|---:|---:|---|
| Jogo Espelhado | 1, 2 e 3 | 5 | Duplica fisicamente um jogo em dois reflexos idênticos. O alvo usa exatamente 1 carta legal em um reflexo. Errar ou ignorar envia a carta ao fundo do Monte, deixa o jogador **Desorientado** e acrescenta **+18** ao Mundo do Espelho. |
| Siga o Reflexo | 1, 2 e 3 | 5 | O primeiro cooperador define, pelo turno inteiro, quantas cartas baixou; o segundo precisa terminar com a mesma quantidade, inclusive 0. Diferença acrescenta **+16**. |
| Espelho do Lixo | 2 e 3 | 4 | Mostra dois reflexos idênticos do topo do Lixo, sem pista escondida. Errar acrescenta **+16** e sela o Lixo durante a rodada. |
| Prisão no Espelho | 1, 2 e 3 | 2 | Precisa de um cooperador já pressionado, outro para resgatá-lo e um jogo existente que aceite extensão. Não exige que o parceiro já tenha a carta necessária. Prioriza o mais pressionado. Sucesso liberta; falha acrescenta **+8/+10/+12** conforme a fase. |
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

**Objetivos atuais — 09/10/2026:** Caçada exige dano direto, mas não uma jogada pronta para entrar no sorteio. Extermínio congela S.T.A.R.S., parceiro e jogo existente extensível, sem provar os dois planos. Tentáculo/Barragem marcam cartas com saída individual legal por jogo ou descarte, sem garantir sucesso completo ou conjunto. Devorador exige jogo extensível, não a carta na mão; Infectado não exige duas contribuições prontas; Agarrador aceita marca descartável. INVADINDO sem HP/alvo; retrato seleciona Nemesis; ajuda/chips não mudam o alvo. Saves anunciados preservam o objetivo e IDs salvos.

**HP:** 2200. **Infecção:** 0–100; derrota imediata em 100. Usa a progressão compartilhada de fases. Partida nova sem zumbis ativos; teto de persistentes vivos F1/F2/F3: **1/2/3**. Aparecer como ameaça ≠ persistir ≠ cadáver.

| Habilidade (`id`) | Fases | Peso | Funcionamento atual |
|---|---|---:|---|
| Invasão da Horda (`horde_invasion`) | 1/2/3 | 4 | Ausente/repelido tenta entrar. Agarrador: carta sai no turno por jogo/descarte. Infectado: equipe contribui 2 cartas na rodada. Devorador: elegível com um jogo existente alimentável, sem prova completa da expulsão; equipe acumula 3 cartas novas nos jogos registrados no início da invasão, no mesmo jogo ou em vários, por um ou ambos os jogadores. Reorganização, duplicatas e jogos novos não contam. Aos 3 repele; falha deixa persistente com HP cheio e sem Infecção extra. Respeita teto e evita repetição imediata havendo alternativa. |
| Caçada S.T.A.R.S. (`stars_hunt`) | 1/2/3 | 5 | S.T.A.R.S. causa dano direto efetivo positivo ao Nemesis no turno; zumbis não contam. Falha base +8/+10/+12 Infecção. |
| Tentáculo Infeccioso (`infectious_tentacle`) | 1/2/3 | 5 | Jogar 1 das 2 marcadas: zero; só descartar: base +4/+5/+6; nenhuma: +8/+10/+12. |
| Zona Contaminada (`contaminated_zone`) | 1/2/3 | 3 | Exige retirada legal comprovada do Lixo Fechado e sem bloqueio. +6 por retirada no turno; coexiste com Agarrador persistente. |
| Comando da Horda (`horde_command`) | 1/2/3 | 3 | Só reforça persistente vivo, não traz zumbis: até fim da próxima rodada, Agarrador +1 carta presa; Infectado +2/falha; Devorador +15 cura. |
| Lança-Foguetes (`rocket_launcher`) | 2/3 | 4 | Cada carta nova no jogo marcado por ID custa +10/+12 nesta rodada; cartas juntas somam o custo, sem proibir a jogada. |
| Regeneração Parasita (`parasite_regeneration`) | 2/3 | 2 | Cura até 100 HP no persistente vivo ferido com menor HP percentual. |
| Reanimação Viral (`viral_reanimation`) | 2/3 | 2 | Somente cadáver: 50% HP, **1x por zumbi em toda a partida**, 1x/fase, respeitando teto. Na F3 volta Mutado. Repelido não é morto. |
| Barragem de Tentáculos (`tentacle_barrage`) | 3 | 4 | 2 das 3 marcadas saem legalmente no turno; falha base +16. |
| Extermínio S.T.A.R.S. (`stars_extermination`) | 3 | 4 | Na rodada, S.T.A.R.S. ataca Nemesis e parceiro alimenta jogo existente escolhido. Ambos/um/nenhum: base +0/+8/+16. |
| Surto Ômega (`omega_outbreak`) | 3 | 3 | Até fim da próxima rodada: somente falhas recebem +2/+4/+6 conforme Infecção <50/50–74/75–99. |

**Lifecycle:** `absent → entering → repelled` no sucesso; `absent/repelled → entering → persistent → corpse` após falha e morte real. Repelido pode tentar entrar novamente. Somente persistente vivo tem passiva/seleção de dano. Saves antigos vivos/mortos migram sem reset de HP ou da batalha.

**Zumbis persistentes:** Agarrador 220 HP: persegue um jogador por rodada e alterna na seguinte; primeiro alvo sorteado por seed e ordem persistida. Só após a compra do perseguido sorteia 1/2 cartas (normal/Mutado), +1 com Horda. Não prioriza jogáveis/coringas/2/ordem da mão. Trava apenas jogo até o fim do turno; descarte livre. Mantém proteção canônica de soluções existentes/saída legal, sem exigir sucesso antecipado para anunciar objetivos. Chip separado `ALVO: nome real`. Infectado 240 HP: +2/+4 por falha positiva, Horda +2; sem bônus retroativo da invasão. Devorador 260 HP: cada três IDs novos da equipe na mesa cura 20/35 HP, Horda +15 (35/50 finais). Sem limite por turno/jogada, cooldown ou teto de ativações: 12 cartas dão quatro curas. Jogos novos/extensões e ambos jogadores contam; só créditos parciais 0–2 permanecem. HP máximo limita apenas a cura efetiva; grupos completos são consumidos inclusive com vida cheia. Cada cura tem ID persistido distinto. Morte/reanimação zeram progresso, não sequência de eventos. Feed v1 migra conservando resto módulo 3 e IDs, descartando grupos antigos sem cura retroativa. F3 muta vivos/novas persistências/reanimados. Reanimação: 110/120/130 HP, mantendo quota e teto anteriores. HUD: `CURA 20/35/50`, três segmentos verdes e contador numérico só no help. [Relatório e evidências](AJUSTE_FINAL_NEMESIS_2026-10-09.md).

**Dano e alívio:** alvo escolhido antes da jogada entre Nemesis e zumbis vivos, inclusive no ataque final; não há transbordamento. Limpa/Real/Ás-a-Ás aliviam −4/−8/−12 no total incremental por jogo, mesmo atacando zumbi. Dano direto ao Nemesis troca S.T.A.R.S.; dano em zumbi não.

**Elegibilidade:** desafio não exige solução antecipada. S.T.A.R.S. existente permanece congelado, sem troca por um parceiro com mão melhor. Antes de existir marcador, escolhe cooperador válido. Marcas têm saída individual legal; desafios coletivos não exigem saídas conjuntas. Horda exige persistente vivo, Regeneração exige persistente ferido, Reanimação exige cadáver/carga/espaço, Impacto exige jogo estruturalmente extensível. Onze habilidades, soma de pesos 39. O BOT continua buscando planos legais durante o turno; isso é diferente da elegibilidade do sorteio.

**HUD:** em faixa separada abaixo do HUD principal, cards full-bleed reutilizam o padrão de filhas/capangas, com nome integrado e chips INVADINDO, ATIVO, MUTADO, REFORÇADO e CADÁVER quando aplicáveis. Entrada mostra INVADINDO; objetivo fica no painel de Invasão, sem texto redundante. Seleção pelo próprio card; `?` interno abre o popover oficial com os números das passivas. Repelido some; ausente sem espaço permanente. Retratos fornecidos em `nemesis-agarrador.png`, `nemesis-infectado.png` e `nemesis-devorador.png`, originais preservados, cobrem o card sem distorção. S.T.A.R.S. fica sobre a arte principal com ajuda oficial. SFX canônico `ganho-infeccao-nemesis.mp3` toca só por delta positivo real, uma vez por evento; não por reload/redução/+0. Animações breves respeitam redução de movimento.

**Derrota por causa:** Infecção Total só com `max_infection`; ataque final insuficiente: Nemesis sobreviveu; exaustão: Recursos esgotados.

**Auditoria de consistência:** todas as habilidades da rotação atual aparecem no jogo e no DevTools. `Renascimento` é passiva fora do sorteio normal, mas aparece no DevTools. `Interdito` é o único item mantido apenas como legado técnico documentado e permanece fora do jogo e do DevTools.




---
