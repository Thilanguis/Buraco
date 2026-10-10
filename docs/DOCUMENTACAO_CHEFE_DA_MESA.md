# DOCUMENTAÇÃO — CHEFE DA MESA

**Auditoria de elegibilidade — 09/10/2026:** uma habilidade pode aparecer mesmo sem solução na mão dos jogadores. Falha mantém a consequência existente. Nemesis remove provas completas de Caçada/Extermínio/Invasão e provas conjuntas de Barragem; cartas marcadas continuam exigindo saída individual legal. Prisão/Laço da Nehelenia preservam jogos reais extensíveis, não solução antecipada. Bloqueios, fases, recursos e lifecycle continuam protegidos. Sorteio evita a última habilidade somente havendo outra elegível. Nenhum peso, HP, valor de recurso ou política estratégica do BOT mudou. Relatório: `AUDITORIA_ELEGIBILIDADE_CHEFES_2026-10-09.md`.

**Polimento visual de 08/10/2026:** Enxerto mostra jogos alimentados numa barra0–2 com as três faixas de consequência, sem lista textual compactada. As cinco Flores usam a PNG `matriarch-lotus.png`, fosca quando apagada e com cor original quando ativa. PASSIVA das filhas mostra +50HP, +25 com Anticoagulante e +0 com Frio, mantendo o destaque de turno e debuffs separados; ADAGA30% permanece no retrato da Lady enquanto houver filha viva vinculada. Nenhuma alteração de resolução, cura, duração ou balanceamento neste polimento.


## Status da documentação


**Revisada contra o workspace local atual — 08/10/2026, incluindo itens v2/filhas 500/piso 300 da Dimitrescu e preservando objetivos distintos do Nemesis, Enxerto parcial e ajuda/regeneração visual anteriores. Calibração de 65%–75% ainda não validada; comparações e limitações em `REWORK_ITENS_DIMITRESCU_2026-10-08.md` e `REWORK_NEMESIS_MATRIARCA_E_UX_DIMITRESCU_2026-10-08.md`.**

### Compatibilidade de estados — 07/10/2026

- Nehelenia: REFLEXO MORTO impede jogar, mas permite descartar. A seleção de illusion lock exclui essas cartas; saves sobrepostos removem somente esse lock conflitante. Espelho do Lixo usa o bloqueio canônico; objetivo legado incompatível é encerrado sem punição e sem escolha pendente.
- Matriarca: Pólen acompanha o `discardCardId` real. No topo, marca a carta; enterrado, mostra apenas “PÓLEN NA PILHA”. Retirar só um topo normal não ativa a punição; adquirir a carta contaminada continua ativando a regra existente.
- Nemesis (atualizado em 09/10/2026): `devourerFeed` v2 guarda IDs únicos e progresso parcial da equipe. Não existe limite por turno: cada grupo de 3 cartas novas cura 20/35 HP, Reforçado +15, limitado apenas à vida máxima. 12 cartas dão 4 curas imediatas; só 0–2 créditos atravessam turnos. `devourerHealSequence` garante eventos distintos persistidos, sem duplicação por reload/sync. Fim de turno não gera cura. Morte/reanimação zeram progresso; feed v1 mantém resto módulo 3 e IDs, descarta grupos completos antigos sem curar no load. Sem feed, registra a mesa antiga e começa em zero. Undo restaura contador/IDs/sequência juntos. A entrada da Invasão continua sendo outra regra.

**Regra permanente de objetivos:** cumprir uma habilidade nunca reduz Dívida, Dominação, Flores, Sede, Mundo do Espelho ou Infecção. O sucesso evita sua punição; a falha mantém a punição aprovada. Sucessos parciais não descontam falhas de outros objetivos. Canastras continuam concedendo todo o alívio aprovado. Gastos do próprio chefe por cura/renascimento são outra categoria e permanecem. Custos positivos de escolhas/obediência não foram rebalanceados nesta revisão. Auditoria detalhada: `REVISAO_OBJETIVOS_CHEFES.md`.


Esta documentação reúne o funcionamento geral do modo **Chefe da Mesa** e as regras aprovadas de:


- **O Banqueiro**;
- **A Dominadora**;
- **A Matriarca Esmeralda**;
- **Lady Dimitrescu**;
- **Rainha Nehelenia**;
- **Nemesis**.


Ela substitui as versões anteriores em que a Matriarca aparecia como planejada e em que as habilidades antigas da Dominadora e do Banqueiro ainda estavam descritas.


### Fonte de verdade atual


A rotação que vale no jogo é a registrada em:


- `js/boss/bosses/banker.js`;
- `js/boss/bosses/dominatrix.js`;
- `js/boss/bosses/matriarch.js`;
- `js/boss/bosses/dimitrescu.js`;
- `js/boss/bosses/nehelenia.js`;
- `js/boss/bosses/nemesis.js` e seus adapters em `mechanics/`, `presentation/` e `ui/`;
- validações e resolução em `js/boss/boss-engine.js`.


O resumo enxuto e atualizado das habilidades ativas está em `docs/INVENTARIO_HABILIDADES_CHEFES.md`. O HUD da partida usa a mesma lista de definições do registro de chefes para exibir **Habilidades do chefe**, evitando manter uma segunda lista manual de nomes/fases na interface.


### Estado técnico da base revisada


A documentação não fixa mais uma contagem histórica de testes, porque a suíte evolui junto com o projeto. Alterações no modo Chefe devem ser validadas principalmente pelos testes `boss-*.test.mjs`, pelos testes de integração e por uma partida manual em dois clientes quando houver mudança de sincronização ou apresentação.


A auditoria funcional identificou comportamentos que também fazem parte da regra final descrita neste documento:


- Dívida máxima por Limite de Crédito encerra a partida imediatamente;
- Limite de Crédito conta apenas cartas originadas da mão;
- contribuições novas em jogo possuído causam dano individual normalmente;
- bot deve avaliar custo e benefício, não apenas evitar resultados letais.


Uma partida manual simultânea em dois dispositivos reais continua recomendada para validar Firebase, animações e experiência em tablet.


---


# 1. Estrutura geral


## 1.1 Partida


- Dois jogadores cooperam contra um chefe.
- Humanos e bots podem ocupar as vagas.
- Apostas ficam desativadas.
- A equipe utiliza dois mortos.
- Toda partida contra chefe usa **Buraco Fechado**.
- O chefe possui HP, três fases, habilidades e uma condição especial de derrota.


## 1.2 Vitória e derrota


A equipe vence ao reduzir o HP do chefe a zero, salvo uma passiva válida que evite a derrota, como o Renascimento da Matriarca.


O chefe vence quando:


- sua condição especial é atingida;
- sobrevive ao ataque final;
- os recursos da partida terminam e ele permanece vivo.


A condição especial deve ser verificada imediatamente depois de qualquer alteração que possa atingi-la.


## 1.3 Turno formal do chefe


Toda rodada começa pelo chefe, inclusive a primeira.


Fluxo:


1. resultado anterior aparece como aviso curto, quando existir;
2. mudança de fase é anunciada, quando existir;
3. o chefe provoca a equipe;
4. a habilidade atual aparece em balão de quadrinho;
5. efeitos imediatos e escolhas obrigatórias são aplicados;
6. os jogadores recebem o turno.


Durante a apresentação:


- controles, bot e cronômetro ficam bloqueados;
- somente o cliente responsável altera o estado;
- observadores não executam o motor;
- snapshots não duplicam efeitos;
- recarregamento recupera ou conclui o fluxo sem soft lock.


## 1.4 Diálogos e feedback


O balão de quadrinho é um **overlay flutuante ancorado ao retrato do chefe**. Ele nunca participa do grid nem aumenta a altura do HUD; abrir/fechar o diálogo não pode deslocar o cartão da habilidade, a mesa ou as pilhas.


O balão é reservado para:


- primeira habilidade;
- habilidade atual;
- mudança de fase;
- provocação;
- fala final;
- apresentação especial, como Renascimento.


Resultados concluídos usam toast, indicador ou histórico.


Exemplos:


```text
Auditoria concluída: sem cobrança
Biel recuperou 4 pontos de Dominação
Raiz Faminta falhou: +1 Flor
Orvalho Restaurador: +60 HP
```


Feedback de bloqueio deve sempre identificar o efeito correto. Uma Semente da Matriarca não pode mostrar mensagem temática da Dominadora.

### Regra editorial do HUD de habilidades

A caixa principal da habilidade é para leitura rápida durante a jogada. Ela deve mostrar apenas **o que fazer**, **o progresso** e **a consequência imediata**. Explicações longas, exceções e definições de termos ficam no botão **?** da habilidade.

- não copiar a descrição completa da habilidade para o objetivo da rodada;
- termos potencialmente ambíguos, como **Desorientado**, **Reflexo Morto**, **Cofre**, **FINANCIADA**, **Posse** e efeitos persistentes, precisam ser explicados no `?`;
- o `?` deve preservar os números importantes da regra e explicar exceções relevantes;
- referências concretas de carta no HUD, como `6♥`, `Q♦`, `8♣` ou `A♠`, recebem destaque maior e cor por naipe para leitura rápida;
- o texto compacto não deve repetir no mesmo painel uma consequência que já está detalhada no `?`, salvo o número ou estado necessário para decidir a jogada.

A suíte `boss-hud-copy-v1.test.mjs` protege esse orçamento de texto para todos os chefes ativos.


## 1.5 Evolução híbrida das fases

**HUD (06/10/2026):** fase atual, barra de avanço por HP e próximo marco ficam visíveis; os limites e a explicação de que basta um gatilho ficam no `?` oficial junto de “Próxima fase”. HP atual e rodada continuam visíveis; Monte/Morto foram retirados da régua, sem remover os contadores da mesa nem os gatilhos da ajuda. Régua e rodada ficam no fluxo da coluna de medidores, evitando sobreposição com os cinco espelhos da Nehelenia, distribuídos pela largura disponível. Nenhum cálculo de transição foi alterado.

**Leitura do HP:** acima de 50% usa vinho/vermelho; de mais de 25% até 50%, vermelho/laranja com brilho leve; em 25% ou menos, vermelho vivo com pulso lento. Revisão visual de 07/10/2026: hemácias com volume, distribuídas pela altura do vaso, usando uma pequena textura vetorial inline em uma camada deslocada por CSS. Fluxo restrito ao preenchimento, mais lento em touch e sem animações/transições com movimento reduzido; sem partículas, canvas ou filtros animados. HP zerado não pulsa. Não modifica dano, cura ou condições especiais.


A fase avança ao cumprir **qualquer** condição.


| Fase   | Condições                                                    |
| ------ | ------------------------------------------------------------ |
| Fase 1 | início                                                       |
| Fase 2 | primeiro morto, monte com 40 ou menos, ou HP em 70% ou menos |
| Fase 3 | segundo morto, monte com 18 ou menos, ou HP em 35% ou menos  |


Regras:


- a fase nunca regride;
- cada transição acontece uma única vez;
- a primeira habilidade da nova fase prioriza habilidades introduzidas nela;
- sem alvo válido, tenta outra habilidade introdutória;
- persistindo a ausência de alvo, usa fallback seguro do sorteio normal.


## 1.6 Buraco Fechado


- `variant = fechado` é forçado e persistido.
- Revanche, reinício e recarregamento preservam a variante.
- Carta bloqueada não pode justificar a compra do lixo.
- Tentativa inválida não altera mão, lixo, monte ou jogos.
- O bot utiliza a lógica oficial do Buraco Fechado.
- Confirmações de custo, Pólen ou Ágio acontecem antes de consumir a retirada.

### Retirada protegida — somente modo Chefe (06/10/2026)

Vale para todos os chefes; Buraco normal e Dominação permanecem inalterados. A justificativa realmente escolhida no fluxo do Fechado decide, mesmo quando existe outro encaixe público:

| Topo e destino escolhido | Retirada |
|---|---|
| Carta natural em jogo já existente na mesa | Somente topo |
| Carta natural em jogo novo formado pela mão | Lixo inteiro |
| Joker, em qualquer destino | Somente Joker |
| 2 em jogo existente, natural ou coringa | Somente 2 |
| 2 coringa em jogo novo pela mão | Somente 2 |
| 2 natural em jogo novo pela mão, como 2–3–4 | Lixo inteiro |

`quoteBossDiscardPickup()` é a consulta compartilhada pelo jogador, BOT e planejamento de Zona Contaminada. Reutiliza `isValidBossSequence()`; o papel natural do 2 é consultado com `forceNatural` no validador oficial, nunca pela ordem visual do array. 2–3–4 e 3–4–2 têm a mesma classificação. Não existe um detector paralelo de sequência.

Somente o pequeno `?` junto ao Lixo explica a regra; não exibir aviso extra durante seleção, escolha do destino, confirmação ou compra. Custos, limites e cálculo de mão final consideram somente as cartas efetivamente adquiridas. Tentativa inválida não move cartas; snapshot/reload não permite retirar novamente no mesmo turno. O BOT não utiliza a compra aberta sem destino no modo Chefe.

Consulta opcional: um `?` pequeno junto ao contador do Lixo aparece somente no modo Chefe e abre o popover oficial **Lixo — Modo Chefe**, resumindo as seis regras acima. Não acrescenta avisos à seleção/destino/confirmação nem tutorial permanente. Mouse, toque e teclado funcionam sem disparar a retirada; a ajuda continua consultável quando a compra está bloqueada e é removida ao sair do modo Chefe. O popover respeita viewport/scroll/resize, inclusive antes de existir habilidade ativa.


---


# 2. Dano contra os chefes


## 2.1 Dano individual das cartas


Cada carta causa dano somente na primeira vez em que entra legalmente na mesa.


| Carta   | Dano |
| ------- | ---: |
| 3 a 7   |    5 |
| 8 a K   |   10 |
| Ás e 2  |   15 |
| Coringa |   20 |


IDs contabilizados ficam persistidos.


Não duplicar dano por:


- reorganização;
- movimentação;
- reposicionamento de Coringa;
- snapshot;
- reload;
- animação;
- libertação de Posse.


Dano individual não remove:


- Dívida;
- Dominação;
- Florescimento.


## 2.2 Bônus de canastra


| Tipo           | Dano total reconhecido |
| -------------- | ---------------------: |
| Jogo simples   |                      0 |
| Canastra suja  |                    100 |
| Canastra limpa |                    180 |
| Canastra real  |                    300 |
| Ás-a-Ás        |                    450 |


O dano é incremental.


Exemplo:


```text
Suja → Limpa
180 − 100 = 80 de dano novo
```


## 2.3 Ataque final


```text
Batida = 100 HP de dano fixo
```


A batida não escala com pontuação e não recebe a antiga redução percentual da Dominadora. Usa o pipeline oficial de dano, preservando absorções, alvo do Nemesis, eventos, estatísticas e Renascimento. Se o chefe sobreviver, a equipe perde; o BOT só encerra se a simulação desse mesmo pipeline confirmar vitória.


O Renascimento da Matriarca pode ocorrer durante o ataque final.


## 2.4 Reações ao dano e cura


Reação de dano:


- somente para canastra limpa ou superior;
- no máximo uma vez por rodada;
- curta;
- não bloqueia controles.


Reação de cura da Matriarca:


- no máximo uma fala temática por rodada;
- indicador numérico aparece em toda cura real;
- fala não bloqueia controles.


---


# 3. Marcadores por jogo


Cada jogo no modo Chefe da Mesa mostra contribuição acumulada.


## 3.1 Dano universal


```text
💥 180
```


Inclui:


- dano individual realmente aplicado;
- bônus de canastra realmente aplicado.


Não inclui dano potencial futuro.


## 3.2 Banqueiro


```text
💥 180   🪙 -4
```


Mostra a redução real de Dívida produzida pelo jogo.


## 3.3 Dominadora


```text
💥 180   ⛓️ -4
```


Mostra pontos de Dominação realmente removidos por Resistência através daquele jogo (4/8/12 no total dos tiers).


## 3.4 Matriarca


```text
💥 180   🌸 -1
```


Mostra Florescimentos realmente removidos pelas evoluções daquele jogo.


Estrutura persistente sugerida:


```js
boss.meldContributions[meldId] = {
  damageDone,
  bankerDebtRelief,
  dominatrixChainsBroken,
  matriarchBloomRemoved,
};
```


Regras:


- persistir por `meldId`;
- atualizar apenas por evento confirmado;
- não duplicar em reload;
- pop curto somente quando o valor aumenta;
- sem animação contínua;
- decoração de ameaça não cobre os chips.


---


# 4. O Banqueiro


## 4.1 Identidade


Chefe de desgaste econômico, Dívida coletiva, precificação de jogadas e controle de recursos.


> O Banqueiro não precisa proibir. Ele informa o preço e obriga a equipe a decidir se vale pagar.


## 4.2 Vida e derrota especial


```text
HP: 2650
Dívida: 0..100
```


Dívida 100 causa derrota imediata.


Isso inclui Dívida aplicada por:


- Juros Fixos;
- Tarifa;
- Auditoria;
- Juros Compostos;
- Limite de Crédito;
- Ágio do Lixo;
- qualquer outra fonte existente.


A alteração é limitada a 100 e a derrota é confirmada uma única vez no mesmo evento.


## 4.3 Redução de Dívida


| Conquista      | Redução |
| -------------- | ------: |
| Canastra limpa |       4 |
| Canastra real  |       8 |
| Ás-a-Ás        |      12 |


Cada tier contribui somente uma vez.


Pegar o Morto não reduz a Dívida coletiva; a progressão por Morto continua valendo apenas para mudança de fase e demais mecânicas do chefe.


## 4.4 Juros Fixos


```text
id: fixed_interest
peso: 5
fases: 1, 2 e 3
```


Ao selecionar a habilidade, o motor sorteia um contrato fechado.


### Fases 1 e 2


| Contrato | Sem Garantia | Com Garantia | Chance |
| -------- | -----------: | -----------: | -----: |
| Leve     |          +10 |           +4 |    25% |
| Padrão   |          +12 |           +5 |    50% |
| Severo   |          +14 |           +6 |    25% |


### Fase 3


| Contrato | Sem Garantia | Com Garantia | Chance |
| -------- | -----------: | -----------: | -----: |
| Leve     |          +14 |           +6 |    25% |
| Padrão   |          +16 |           +7 |    50% |
| Severo   |          +17 |           +8 |    25% |


Regras:


- os dois valores são sorteados como um pacote;
- o jogador conhece ambos antes de escolher;
- usar sorteio determinístico;
- contrato persiste em snapshot e reload;
- Voltar não sorteia novamente;
- humano, bot e observador veem o mesmo contrato.


Persistência:


```js
currentIntent.payload.contractTier;
currentIntent.payload.fullDebt;
currentIntent.payload.guaranteedDebt;
currentIntent.payload.rollEventId;
```


### Garantia e Cofre


- o titular é sorteado entre os jogadores elegíveis, com chance uniforme;
- ao aceitar a Garantia, o Banqueiro apreende uma carta aleatória da mão do titular;
- a Dívida menor do contrato vira o preço-base do resgate;
- a Dívida maior do contrato vira o limite máximo do resgate;
- cada jogador possui no máximo uma carta no Cofre;
- com os dois Cofres ocupados, Garantia fica indisponível;
- a carta não vai ao monte nem ao lixo.


No turno do dono:


- pode resgatar a carta no lugar da compra e receber a Dívida acumulada;
- pode comprar normalmente e deixar a carta no Cofre;
- nas Fases 1–2, cada compra normal feita sem resgatar acrescenta +2 ao preço do Cofre;
- na Fase 3, cada compra normal feita sem resgatar acrescenta +3;
- o custo nunca ultrapassa o valor integral do contrato;
- ao alcançar o valor integral do contrato, o resgate do próximo turno é obrigatório;
- depois do resgate, o turno continua normalmente após a compra substituída;
- o bot decide entre resgatar e adiar conforme o valor da carta e o custo acumulado.


O bot avalia:


- diferença de Dívida;
- valor da carta penhorada;
- utilidade em canastra;
- ameaça urgente;
- risco de derrota.


Ele não escolhe automaticamente a primeira carta válida.


## 4.5 Tarifa de Manutenção


```text
id: maintenance_fee
peso: 3
fases: 1, 2 e 3
```


- Fases 1 e 2: próxima compra recebe 1 Carta Financiada;
- Fase 3: recebe 2;
- ao pegar lixo, extras continuam vindo do monte.


Cada Carta Financiada:


- fica identificada diretamente na mão com o marcador **FINANCIADA**; a compra normal continua usando apenas **NOVA**;
- para quitar a Tarifa, precisa terminar o turno dentro de um jogo da equipe;
- descartar a carta **não** quita a Tarifa: o descarte continua permitido como saída de segurança, mas gera a mesma cobrança;
- se terminar na mão ou for descartada sem entrar em jogo:
  - Fases 1 e 2: Dívida +5;
  - Fase 3: Dívida +7;
- perde a marca depois da resolução do turno;
- nunca é cobrada duas vezes;
- o bot prioriza usar a Carta Financiada em um jogo e evita descartá-la enquanto houver alternativa.


## 4.6 Bloqueio de Crédito


```text
id: credit_block
peso: 3
fases: 1, 2 e 3
```


- lixo bloqueado durante a rodada;
- encerra após os dois cooperadores agirem.


## 4.7 Limite de Crédito


```text
id: credit_limit
peso: 4
fases: 1, 2 e 3
```


A equipe possui uma franquia compartilhada de cartas colocadas na mesa.


| Fase | Franquia | Dívida por excedente | Cobrança máxima |
| ---- | -------: | -------------------: | --------------: |
| 1    |        3 |                   +3 |              +9 |
| 2    |        2 |                   +4 |             +12 |
| 3    |        1 |                   +5 |             +15 |


### Cartas que contam


Conta somente carta que:


- estava na mão do jogador;
- saiu da mão;
- entrou legalmente;
- permaneceu na mesa;
- ainda não foi contabilizada naquela rodada.


Não conta:


- carta do topo do lixo;
- demais cartas trazidas pelo lixo;
- carta já existente na mesa;
- reorganização;
- reposicionamento de Coringa;
- tentativa cancelada;
- ação desfeita;
- snapshot.


A origem precisa ser transportada explicitamente pela transação, por exemplo:


```js
creditEligibleCardIds;
cardOriginsById;
```


Não inferir apenas comparando jogo anterior e final.


### Cobrança


Em jogada com várias cartas:


- calcular o excesso antes da confirmação;
- mostrar o custo total;
- aplicar a cobrança uma única vez;
- limitar à cobrança máxima da fase;
- verificar derrota por Dívida imediatamente.


HUD:


```text
CRÉDITO 2/3
Próxima excedente: +3 Dívida
Cobrança: 0/9
```


Voltar restaura:


- IDs contados;
- contador;
- Dívida;
- evento.


O bot compara custo com:


- dano;
- evolução;
- redução de Dívida;
- urgência do monte;
- risco de derrota.


## 4.8 Ágio do Lixo


```text
id: discard_surcharge
peso: 3
fases: 2 e 3
```


Valores:


```text
Fase 2: +7 Dívida
Fase 3: +10 Dívida
```


A primeira retirada válida do lixo na rodada paga o Ágio.


Fluxo:


1. mostrar custo;
2. permitir confirmar ou desistir;
3. somente ao confirmar, retirar o lixo e cobrar;
4. consumir o efeito.


Não cobrar:


- tentativa cancelada;
- jogada inválida;
- retirada bloqueada pelo Fechado;
- ação desfeita;
- segunda retirada após consumo.


Se ninguém pegar o lixo, expira sem punição.


O bot inclui o valor do Ágio na avaliação:


```text
valor esperado do lixo
versus
Dívida e risco de derrota
```


## 4.9 Auditoria de Naipe


```text
id: suit_audit
peso: 4
fases: 2 e 3
```


| Fase | Exigência | Sucesso |      Falha |
| ---- | --------: | ------: | ---------: |
| 2    |  3 cartas | sem cobrança | Dívida +12 |
| 3    |  4 cartas | sem cobrança | Dívida +16 |


- somente cartas reais do naipe;
- Coringas não contam;
- ID não conta duas vezes;
- valores ficam congelados no anúncio;
- resolve uma única vez.


## 4.10 Penhora


```text
id: pledge
peso: 2
fases: 2 e 3
```


- escolhe jogo elegível;
- não escolhe Ás-a-Ás;
- não escolhe jogo sem progressão legal;
- sem alvo, sai do sorteio.


## 4.11 Juros Compostos


```text
id: compound_interest
peso: 4
fases: 2 e 3
```


A cobrança usa faixas rápidas conforme o total de cartas nas duas mãos.


### Fase 2


| Cartas nas mãos | Dívida |
| --- | ---: |
| 0–7 | +6 |
| 8–13 | +10 |
| 14+ | +14 |


### Fase 3


| Cartas nas mãos | Dívida |
| --- | ---: |
| 0–7 | +8 |
| 8–13 | +12 |
| 14+ | +16 |


A faixa é congelada pelos valores anunciados da habilidade e o HUD destaca a faixa atual.


## 4.12 Habilidades e pesos


| Habilidade           | Peso | Fases    |
| -------------------- | ---: | -------- |
| Juros Fixos          |    5 | 1, 2 e 3 |
| Tarifa de Manutenção |    3 | 1, 2 e 3 |
| Bloqueio de Crédito  |    3 | 1, 2 e 3 |
| Limite de Crédito    |    4 | 1, 2 e 3 |
| Auditoria de Naipe   |    4 | 2 e 3    |
| Penhora              |    2 | 2 e 3    |
| Juros Compostos      |    4 | 2 e 3    |
| Ágio do Lixo         |    3 | 2 e 3    |


---


# 5. A Dominadora


## 5.1 Identidade


Chefe de controle direto, ordens, Dominação individual e perda de eficiência.


> Obedecer reduz a eficiência. Desobedecer aumenta a Dominação.


## 5.2 Vida e Dominação


```text
HP: 2600
Dominação por jogador: 0..50
Barra visual: 4 segmentos de 12,5 pontos por jogador
```


Cada segmento da barra representa **12,5 pontos** e pode ficar parcialmente preenchido. O campo interno `chainsByPlayer` mantém a escala legada 0–4, aceitando frações; a regra e a interface usam Dominação 0–50.

| Dominação | Estado       |
| --------: | ------------ |
| 0–<37,5   | Normal       |
| 37,5–<50  | Sob Controle |
| 50        | Dominado     |


Os dois jogadores em 50/50 causam derrota imediata.


## 5.3 Sob Controle


Com pelo menos 37,5 e menos de 50 pontos de Dominação:


- não cria jogo novo;
- compra normalmente, salvo outro efeito;
- alimenta jogos;
- pode evoluir canastra e recuperar controle.


## 5.4 Dominado


Com 50 pontos de Dominação:


- não pega lixo;
- não cria jogo novo;
- pode comprar do monte;
- alimenta jogos existentes;
- batida continua causando 100 de dano fixo, sem redução por Dominação;
- permanece Dominado até a Dominação ficar abaixo de 50.


## 5.5 Resistência


Somente produção de qualidade reduz Dominação.


| Evolução              | Alívio total |
| --------------------- | -----------: |
| Canastra suja         | 0            |
| Canastra limpa        | -4           |
| Canastra real         | -8           |
| Canastra Ás-a-Ás      | -12          |


Regras:


- reduz primeiro do jogador responsável; se o alívio exceder a Dominação dele, o restante transborda para o parceiro;
- evoluções sucessivas acrescentam **-4** por novo tier;
- uma canastra que nasce diretamente Real recebe -8; Ás-a-Ás recebe -12;
- cada tier conta uma única vez por `meldId`;
- dano individual não ativa Resistência;
- jogo possuído não ativa Resistência até ser libertado;
- ao libertar por evolução, libertar antes de avaliar Resistência.


## 5.6 Coleira


```text
id: collar
peso: 5
fases: 1 e 2
```


- bloqueia até duas cartas;
- não podem ser jogadas nem descartadas;
- não justificam lixo;
- encerra após o turno do alvo;
- não deixa a mão inteira sem descarte.


## 5.7 Exposição


```text
id: exposure
peso: 4
fases: 1, 2 e 3
```


- marca carta com jogada legal;
- pode ser jogada;
- não pode ser descartada;
- usar a carta ainda aplica Dominação +1;
- falhar aplica +9 na F1, +11 na F2 e +13 na F3;
- se ficar impossível por mudança externa: cancelar.


## 5.8 Escolha Forçada


```text
id: forced_choice
peso: 5
fases: 1, 2 e 3
```


A escolha compara um custo seguro com uma ordem viável.


| Fase | Recusar ordem | Aceitar agora | Falhar depois |
| ---: | ---: | ---: | ---: |
| 1 | +6 | +2 | +12 adicional |
| 2 | +7 | +3 | +14 adicional |
| 3 | +8 | +3 | +16 adicional |


Tipos permitidos:


```text
feed_specific_meld
evolve_specific_meld
reduce_hand
discard_suit
```


`no_new_meld` foi removida do sorteio por ser uma ordem trivial/redundante.


### Elegibilidade das ordens


Uma ordem só existe se puder ser cumprida com o estado atual.


Para `evolve_specific_meld`:


- enumerar jogadas legais reais da mão;
- exigir combinação que eleve o tier;
- respeitar Coringas;
- respeitar cartas bloqueadas;
- preservar descarte legal;
- não depender de compra futura desconhecida.


Se uma mudança externa eliminar todas as formas de cumprir:


- cancelar sem ganhar Dominação.


Se o jogador usar ou desperdiçar voluntariamente os recursos necessários:


- considerar desobediência.


Ao desobedecer:


- permitir a ação;
- aplicar a punição de Dominação da fase;
- encerrar a ordem.


## 5.9 Etiqueta de Ferro


```text
id: iron_etiquette
peso: 4
fases: 1, 2 e 3
```


A Dominadora ordena o naipe do descarte no próximo turno.


Elegibilidade:


- pelo menos uma carta descartável do naipe;
- ao menos uma alternativa fora do naipe;
- cumprimento legal no Buraco Fechado;
- sem ordem incompatível;
- entre os naipes válidos, prioriza o que tem menos opções.


Usar somente naipe.


Se cumprir:


- Dominação +2 na F1/F2;
- Dominação +3 na F3.


Se descartar outro naipe possuindo opção válida:


- permitir;
- Dominação +10 na F1;
- +12 na F2;
- +14 na F3.


Se mudança externa eliminar as opções:


- cancelar.


Se o próprio jogador gastar todas as opções:


- desobediência.


Somente o alvo vê destaque das cartas aptas.


## 5.10 Troca Forçada


```text
id: forced_swap
peso: 4
fases: 2 e 3
```


- prioriza uma carta útil/jogável de cada cooperador;
- troca as duas entre as mãos;
- a carta recebida fica presa durante o próximo turno quando houver descarte legal restante;
- anima movimentos simultâneos;
- atualiza mãos depois;
- usa `eventId`;
- não repete em snapshot;
- não cria, remove ou duplica cartas.


Mensagem:


```text
Você recebeu [carta] de [jogador].
```


## 5.11 Mãos Atadas


```text
id: hands_tied
peso: 4
fases: 2 e 3
```


Durante a rodada, cada cooperador fica vinculado ao **primeiro jogo que tocar**.


- depois de alimentar ou criar um jogo, aquele jogador só pode continuar naquele jogo durante a rodada;
- a equipe inteira ainda compartilha no máximo **1 jogo novo**;
- o primeiro jogo novo consome a disponibilidade;
- HUD indica vínculos e consumo;
- Voltar restaura o estado;
- Sob Controle e Dominado continuam sem criar.


## 5.12 Posse


```text
id: possession
peso: 3
fases: 2 e 3
```


Ao aplicar:


- calcula dano antigo do jogo;
- restaura esse dano ao HP, limitado ao máximo;
- guarda somente o valor efetivamente restaurado;
- marca o jogo.


Enquanto possuído:


- jogo permanece utilizável;
- o dano antigo restaurado fica suspenso;
- cartas novas causam dano individual normal no momento em que entram;
- essas cartas não causam dano novamente na libertação;
- Resistência fica desativada.


Libertação ocorre por:


### Coordenação


Uma contribuição legal de cada jogador.


### Evolução


O jogo sobe de tier.


Ao libertar:


- reaplica somente o dano antigo ainda suspenso;
- não reaplica dano das contribuições;
- não duplica bônus;
- avalia Resistência depois da libertação.


Persistência:


```js
boss.possessions[meldId].contributorPlayerIds;
boss.possessions[meldId].createdTier;
boss.possessions[meldId].releasedEventId;
```


## 5.13 Interdito — DESATIVADO


> Esta habilidade não faz parte da rotação ativa nem aparece no Laboratório. O código interno foi preservado temporariamente apenas para compatibilidade e possível redesenho futuro.

As regras e os termos “Chicote” abaixo são históricos, não regras ativas da barra atual de Dominação 0–50.


```text
id: interdict
peso: 4
fases: 2 e 3
```


Marca jogo com possibilidade real de evolução naquela rodada.


Elegibilidade exige:


- jogo existente;
- não Ás-a-Ás;
- combinação legal conhecida capaz de elevar tier;
- validação oficial;
- regras de Coringa;
- descarte legal restante;
- jogador que poderá agir.


Não basta aceitar alguma carta.


Na primeira tentativa válida de evolução:


### Obedecer


- cancelar somente a tentativa;
- restaurar estado anterior;
- sem dano, tier ou Chicote;
- consumir Interdito.


### Desobedecer


- concluir evolução;
- aplicar dano;
- +1 Chicote líquido;
- a mesma evolução não remove Chicote por Resistência;
- consumir Interdito.


Jogador em 4 Chicotes deve obedecer.


Sem tentativa, expira no fim da rodada.


Se perder a possibilidade por mudança externa, cancela.


## 5.14 Favorita


```text
id: favorite
peso: 4
fases: 2 e 3
```


- só existe nas Fases 2–3;
- prioriza como punida quem está **menos dominado**, ajudando a aproximar os dois jogadores da condição 50/50;
- F2 e F3: a favorita fica inalterada (0); a punida recebe +8;
- poupada significa sem punição, nunca recuperação de Dominação;
- respeita limites;
- aplica uma vez.


## 5.15 Transbordamento de Dominação


Em qualquer fase:


- se um alvo já está em **50/50 de Dominação** e receberia mais pressão, o excesso transborda para o parceiro;
- o parceiro recebe somente o excesso que ainda couber;
- o total retornado pelo motor corresponde somente à pressão realmente aplicada nas duas barras, não à pressão solicitada;
- nenhum jogador ultrapassa 50;
- preserva a origem da punição (Exposição, ordem, Etiqueta, Ordem Final etc.);
- feedback identifica o transbordamento;
- snapshot não duplica;
- se os dois já estiverem em 50, vale a derrota especial da Dominadora.


## 5.16 Habilidades da Fase 3


### Dupla Coleira


Uma carta de cada jogador fica presa.


### Separação


O parceiro não alimenta jogo já alimentado pelo outro na rodada.


### Controle Absoluto


Alvo é tratado como Dominado no próximo turno e recebe **Dominação +5**.


### Quebra de Vontade


Só aparece quando há alvo suficientemente pressionado e a Dominadora pode recuperar ao menos 120 HP. O alvo escolhe:


- **Dominação +8**; ou
- permitir que a Dominadora recupere **até 180 HP**.


### Ordem Final


Na Fase 3, cada cooperador decide **às cegas**. Nenhuma carta é escolhida, marcada ou revelada antes da decisão.


Cada jogador escolhe individualmente entre:


- **recusar** e receber **Dominação +7**; ou
- **aceitar** e receber **Dominação +2**.


Somente depois de aceitar, o jogo sorteia **2 cartas aleatórias entre as cartas atualmente jogáveis** daquele cooperador e revela/marca as duas.


No próximo turno:


- 2/2 cartas usadas em jogos: sem pressão adicional;
- 1/2 carta usada: **Dominação +6**;
- 0/2 cartas usadas: **Dominação +12**.


Descartar uma carta marcada não cumpre a ordem. As cartas recebem a marca **ORDEM FINAL** somente após o aceite.


Depois das duas decisões, a partida continua normalmente.


**Hierarquia não faz parte do jogo e não deve ser registrada.**


## 5.17 Habilidades e pesos


| Habilidade             | Peso | Fases |
| ---------------------- | ---: | ----- |
| Coleira                |    5 | 1 e 2    |
| Escolha Forçada        |    5 | 1, 2 e 3 |
| Exposição              |    4 | 1, 2 e 3 |
| Etiqueta de Ferro      |    4 | 1, 2 e 3 |
| Troca Forçada          |    4 | 2 e 3    |
| Mãos Atadas            |    4 | 2 e 3    |
| Posse                  |    3 | 2 e 3    |
| Interdito (desativado) |    — | —        |
| Favorita               |    4 | 2 e 3    |
| Dupla Coleira          |    5 | 3        |
| Separação              |    4 | 3        |
| Controle Absoluto      |    4 | 3        |
| Quebra de Vontade      |    4 | 3        |
| Ordem Final            |    4 | 3        |


---


# 6. A Matriarca Esmeralda


## 6.1 Identidade


Chefe de plantio, ocupação da mesa, propagação e Florescimento.


```text
id: matriarca_esmeralda
mode: boss_matriarca
HP: 2000
Florescimento: 0..5
```


> A Matriarca planta ameaças, espalha Raízes e amadurece o Jardim. A cura fica concentrada em habilidades específicas.


## 6.2 Condição especial


- 0–4 Flores: partida continua;
- quinta Flor: derrota imediata;
- Flores aumentam mesmo com HP cheio;
- Flores não ultrapassam 5;
- derrota confirma uma vez;
- Renascimento não ocorre depois de derrota por quinta Flor.


## 6.3 Remoção de Florescimento


| Evolução              | Remoção |
| --------------------- | ------: |
| Canastra limpa        |       1 |
| Evolução para real    |      +1 |
| Evolução para Ás-a-Ás |      +1 |


- cada tier remove uma vez por `meldId`;
- dano individual não remove;
- marcador 🌸 acumula apenas remoção real;
- reload não duplica.


## 6.4 Limites de cura


| Fase | Máximo por rodada |
| ---- | ----------------: |
| 1    |               100 |
| 2    |               150 |
| 3    |               200 |


O contador zera na virada efetiva da rodada.


Florescimento não é limitado pela cura.


## 6.5 Ameaças persistentes


Limites:


| Fase | Ameaças |
| ---- | ------: |
| 1    |       1 |
| 2    |       2 |
| 3    |       3 |


Estado mínimo:


```js
{
  (id, type, targetPlayerId, cardId, meldId, secondMeldId, discardCardId, createdRound, deadlineRound, deadlinePlayerId, healAmount, bloomAmount, status, resolvedEventId);
}
```


Prazos são funcionais:


- ameaça de turno resolve somente quando o turno-alvo vence;
- ameaça de rodada resolve somente quando `deadlineRound` vence;
- prazo futuro não falha antecipadamente.


Se alvo desaparecer ou ficar impossível por mudança externa:


- cancelar somente a ameaça;
- sem Flor;
- sem cura;
- sem propagação.


## 6.6 Propagação


Propagação cria somente **Raiz Faminta**.


- máximo de uma por rodada;
- respeita limite da fase;
- nasce com prazo futuro;
- não falha no evento de criação;
- sem alvo válido, não acontece;
- ameaça cancelada não propaga;
- `eventId` impede duplicação;
- origem aparece no HUD;
- uma Raiz criada por propagação **não pode iniciar outra propagação**. A cadeia termina nessa segunda Raiz.


## 6.7 Semente Viva


```text
id: living_seed
peso: 5
fases: 1, 2 e 3
```


- escolhe carta com jogada legal oficial;
- pode ser jogada;
- não pode ser descartada;
- não escolhe carta presa, incompatível ou que deixe a mão sem descarte;
- prazo: fim do próximo turno do alvo.


Sucesso:


- carta sai da mão por jogada legal.


Falha:


```text
+1 Flor
sem cura
```


Se perder todas as jogadas legais por mudança externa:


- cancelar.


## 6.8 Raiz Faminta


```text
id: hungry_root
peso: 5
fases: 1, 2 e 3
```


- escolhe jogo que aceite continuação legal;
- adicionar uma carta corta;
- prazo: fim da rodada.


Falha:


```text
+1 Flor
sem cura
solicita propagação
```


Se jogo deixar de aceitar cartas ou desaparecer:


- cancelar.


## 6.9 Orvalho Restaurador


```text
id: restorative_dew
peso: 3
fases: 1, 2 e 3
```


A cura atual funciona por **faixas de progresso**, não por redução linear de 15 HP por carta.


### Fase 1


| Cartas novas colocadas legalmente | Cura prevista |
| --------------------------------: | ------------: |
| 0–1                               |        100 HP |
| 2–3                               |         65 HP |
| 4–5                               |         30 HP |
| 6+                                |          0 HP |


### Fase 2


| Cartas novas colocadas legalmente | Cura prevista |
| --------------------------------: | ------------: |
| 0–1                               |        120 HP |
| 2–3                               |         80 HP |
| 4–5                               |         40 HP |
| 6+                                |          0 HP |


### Fase 3


| Cartas novas colocadas legalmente | Cura prevista |
| --------------------------------: | ------------: |
| 0–1                               |        150 HP |
| 2–3                               |        100 HP |
| 4–5                               |         50 HP |
| 6+                                |          0 HP |


Regras:


- cada carta conta uma única vez pelo ID;
- reorganização não conta;
- Coringa apenas reposicionado não conta como carta nova;
- o HUD mostra a cura prevista da faixa atual;
- a cura ainda respeita o limite total de cura da rodada;
- Orvalho não gera Flor.


## 6.10 Trepadeiras Gêmeas


```text
id: twin_vines
peso: 4
fases: 2 e 3
```


Cria até duas Raízes independentes.


Cada lado:


- alimentado: sucesso;
- falhou: a ativação recebe +1 Flor no total, mesmo se os dois lados falharem; sem cura.


Se os dois lados falharem:


- solicita uma propagação.


Com apenas um alvo, não existe bônus de falha dupla.


## 6.11 Enxerto


```text
id: graft
peso: 3
fases: 2 e 3
```


Dois jogos devem receber carta.


```text
2 lados: sem punição
1 lado: cura até 50 HP, sem Flor
0 lados: +1 Flor e propagação
```


O custo intermediário não propaga o Enxerto comum: permite aceitar uma cura moderada em vez de gastar a segunda contribuição. Respeita o HP máximo e o teto de cura por rodada. Se Coroa estiver ligada à ameaça, sua reação própria à resolução parcial continua funcionando. A falha total continua limitada a +1 Flor nesta ativação; a propagação posterior independente é preservada.

Enxertos já anunciados em saves anteriores, sem `partialHeal`, concluem pela regra salva (um lado = +1 Flor, sem cura); novos Enxertos usam o custo de 50 HP. Reload não converte nem resolve a ameaça.


Se um lado ficar inválido por mudança externa:


- cancelar o Enxerto inteiro.


## 6.12 Pólen do Lixo


```text
id: discard_pollen
peso: 3
fases: 2 e 3
```


- guarda o ID da carta no topo do lixo;
- se essa carta for retirada, a consequência é aplicada imediatamente;
- a carta não recebe uma trava artificial na mão, pois no Buraco Fechado ela já entra na jogada que justificou a retirada;
- se o topo mudar sem ser retirado, cancelar a ameaça.


Ao retirar a carta contaminada:


```text
+1 Flor
cura 30 HP
```


Se topo mudar sem entrar em mão:


- cancelar.


No subtipo Pólen de Florescimento Real:


- não cura.


O bot considera o valor do lixo e evita a retirada quando a Flor aplicada causaria a derrota imediata.


## 6.13 Colheita


```text
id: harvest
peso: 2
fases: 2 e 3
```


| Cartas ao fim do turno | Efeito             |
| ---------------------: | ------------------ |
|                    0–7 | nada               |
|                   8–10 | cura 50            |
|                    11+ | cura 80 e +1 Flor  |


Não bloqueia ações.


## 6.14 Florescimento Real


```text
id: royal_bloom
peso: 4
fase: 3
```


Cria até três objetivos válidos, preferencialmente:


- carta;
- jogo;
- lixo.


Uma ou mais falhas na mesma ativação (teto compartilhado, inclusive entre turnos/reload):


```text
+1 Flor
sem cura
```


- resolve separadamente;
- sem alvo nulo;
- Raiz pode solicitar propagação;
- Pólen não cura.


## 6.15 Casulo Esmeralda


```text
id: emerald_cocoon
peso: 3
fase: 3
remaining: 180
```


- dano reduz Casulo primeiro;
- excesso atinge HP;
- limpa ou superior rompe;
- no evento da ruptura, excesso continua;
- fim da rodada cura metade do restante;
- encerra depois;
- não absorve cura;
- não altera Florescimento;
- evento de ruptura é único.


## 6.16 Coroa da Primavera


```text
id: spring_crown
peso: 3
fase: 3
```


A Coroa não aumenta cura.


Durante a rodada:


- primeira falha pode gerar propagação normal;
- se houver segunda falha e uma Raiz propagada válida, ela nasce Fortalecida;
- terceira falha não dá bônus.


### Raiz Fortalecida


Exige duas contribuições:


```text
uma de cada jogador
```


- podem ocorrer em turnos diferentes;
- cada jogador conta uma vez;
- mesma carta não conta duas vezes;
- se um jogador ficar impossibilitado por mudança externa, cancelar;
- falha normal gera +1 Flor;
- não cria propagação extra automática;
- máximo de uma Fortalecida por rodada.


Não existem nesta versão:


- Semente Fortalecida;
- Pólen Fortalecido.


## 6.17 Renascimento


Passiva, uma vez por partida:


- somente na Fase 3;
- o HP precisa chegar a zero;
- basta possuir pelo menos **1 Flor**;
- consome **1 Flor**;
- retorna com **300 HP**;
- marca `rebirthUsed`;
- continua a partida.


Sem nenhuma Flor, a derrota ocorre normalmente.


Funciona também durante o ataque final.


No **Laboratório de Chefes / DevTools**, `Renascimento` aparece como passiva de teste (`peso 0`, somente Fase 3). Ele não entra no sorteio normal das habilidades; o cenário prepara **1 Flor** e HP baixo para permitir testar o disparo por dano fatal.


## 6.18 Habilidades e pesos


| Habilidade          | Peso | Fases    |
| ------------------- | ---: | -------- |
| Semente Viva        |    5 | 1, 2 e 3 |
| Raiz Faminta        |    5 | 1, 2 e 3 |
| Orvalho Restaurador |    3 | 1, 2 e 3 |
| Trepadeiras Gêmeas  |    4 | 2 e 3    |
| Enxerto             |    3 | 2 e 3    |
| Pólen do Lixo       |    3 | 2 e 3    |
| Colheita            |    2 | 2 e 3    |
| Florescimento Real  |    4 | 3        |
| Casulo Esmeralda    |    3 | 3        |
| Coroa da Primavera  |    3 | 3        |


## 6.19 Falas


Início:


> “Toda mesa pode virar um jardim. A de vocês já começou a criar raízes.”


Fase 2:


> “Vocês cortaram um galho. Eu trouxe a floresta inteira.”


Fase 3:


> “Agora cada carta de vocês alimenta a minha primavera.”


Cura:


> “A floresta sempre recupera o que lhe pertence.”


Dano:


> “Podem cortar as folhas. As raízes continuam.”


Vitória da equipe:


> “Até a primavera... pode terminar.”


Vitória da Matriarca:


> “Não restou mesa. Apenas o meu jardim.”


---


# 7. Lady Dimitrescu

Rework de itens v2 de 08/10/2026 para partidas novas. Contrato, comparações e validação: [REWORK_ITENS_DIMITRESCU_2026-10-08.md](REWORK_ITENS_DIMITRESCU_2026-10-08.md). Registro histórico v1: [REWORK_DIMITRESCU_2026-10-07.md](ARQUIVO_HISTORICO/REWORK_DIMITRESCU_2026-10-07.md).

## 7.1 Identidade e Vínculo de Sangue

Lady tem **2000 HP** e Sede 0–100. Sede 100 ou fim dos recursos com Lady viva derrota a equipe. Bela, Cassandra e Daniela estão presentes desde o início, com **500/500 HP cada**; nunca revivem. Saves v1 preservam 450 HP e os itens antigos.

Lady começa com 2000 HP e **1500 PROT. adicionais consumíveis**. Cada filha viva sustenta capacidade de 500 PROT. Todo dano direcionado à Lady, humano/BOT/Ataque Final de 100, passa primeiro pelo Coágulo, depois pela PROT.; o excedente atinge a vida. Morte de filha retira até 500 da PROT. restante e limita ao novo teto de `500 × filhas vivas`, sem dano automático à vida. PROT. consumida não recarrega: zerá-la expõe os 2000 HP mesmo com filhas vivas. Não existe mais piso de HP. `boss.bloodLinkProtection` persiste em snapshot/reload/undo; saves sem o campo inicializam uma vez pelo número de filhas vivas, preservando HP e os demais recursos.

O jogador escolhe Lady ou uma filha viva como alvo do próximo dano. Overkill da filha não transborda. Uma filha com Adaga transmite separadamente 30% do dano efetivo de ataques à vida real da Lady, ignorando Coágulo/PROT.; itens/hemorragia não transmitem. Filhas têm lifecycle próprio, sem invasão/reanimação do Nemesis.

## 7.2 Sede e canastras

| Tier novo | Sede removida |
|---|---:|
| Simples / Suja | 0 |
| Limpa | 4 |
| Real | 8 |
| Ás-a-Ás | 12 |

Evoluções descontam apenas a diferença entre tiers. Cumprir habilidade/passiva nunca reduz Sede: apenas evita a punição. Vinho Carmesim continua sendo gasto interno da Lady por cura.

## 7.3 Fases e Fúria

As fases continuam A Caçada / As Filhas / Banquete Carmesim. As imagens e os áudios de transformação continuam determinados pelas fases:

- F1: `boss-dimitrescu.png`;
- F2: `boss-dimitrescu-fase2.png` e `transformacao-dimitrescu-fase2.mp3`;
- F3: `boss-dimitrescu-fase3.png` e `transformacao-dimitrescu-fase3.mp3`.

Fúria é independente da fase e aparece como chip/aura.

| Filhas mortas | Estado | Cura da Lady | Sede ofensiva da Lady |
|---:|---|---:|---:|
| 0 | NORMAL | ×1,00 | +0 por evento positivo |
| 1 | FÚRIA I | ×1,10 | +2 por evento positivo |
| 2 | FÚRIA II | ×1,20 | +4 por evento positivo |
| 3 | FÚRIA FINAL | ×1,30 | +6 por evento positivo |

Cura arredondada para baixo, limitada ao HP máximo. Fúria aplica-se a Vinho, Banquete dos Mortos e conversão do Coágulo. Não altera passivas +3 das filhas, regeneração das filhas, custo do Vinho, máximos de HP nem sucesso de objetivo.

## 7.4 Passivas permanentes

Rodada normal escolhe exatamente uma filha viva com RNG/seed canônico, evitando a última escolha normal quando existe alternativa. Com uma viva, sempre ela; com nenhuma, nenhuma passiva. As outras ficam vivas/atacáveis, regeneram, sustentam Vínculo e aceitam itens, mas sem objetivo. As Três Filhas (F2/F3) substitui essa escolha por todas as vivas. Escolha e objetivo persistem no snapshot/reload/undo; render não sorteia. Entidade continua apenas `alive`/`dead`, sem lifecycle artificial. A filha escolhida executa:

- **Bela — mão:** marca uma carta realmente jogável de um cooperador. Colocá-la legalmente em jogo até o fim do turno desse alvo evita a punição; falha +3 Sede. Sem candidato legal, não marca nem pune.
- **Cassandra — mesa:** marca jogo existente com contribuição legal concreta disponível à equipe. Qualquer cooperador pode alimentá-lo até o fim da rodada; falha +3 Sede. Sem candidato, não marca nem pune.
- **Daniela — Lixo:** primeira retirada efetiva da equipe na rodada, protegida ou completa, +3 Sede uma vez. Monte ou ausência de retirada não punem.

No fim da rodada, obrigações pendentes resolvem, depois hemorragia e, se sobreviver, regeneração. Cada filha viva recupera até **50 HP próprios**, nunca HP da Lady. Frio bloqueia a próxima regeneração que recuperaria HP, guardando a carga na vida cheia (até 2 cargas); Anticoagulante reduz permanentemente para 25, sem acumular.

O chip **PASSIVA** explica somente essa regeneração permanente, inclusive quando a filha não foi selecionada; CAÇADA/BANQUETE/LIXO continuam com sua própria ajuda. O evento real `daughterRegen` mostra um número verde sobre o retrato correto (+50, +25 ou cura efetiva menor, como +20). Frio, vida cheia, morte e cura zero não animam. As três curas podem aparecer juntas, sem viajar para HP/Sede da Lady; `actionId` e baseline do HUD impedem replay em render/reload/reconexão/undo. Movimento reduzido mantém texto acessível sem deslocamento.

Morte cancela obrigação, encerra regeneração, impede alvo/item e atualiza Vínculo/Fúria imediatamente. Cada morte individual gera flash na Lady e toca `what-have-you-done-to-my-daughter.mp3`, sem repetição em reload.

## 7.5 Cartas-item

Exatamente **15 IDs físicos distintos**, **3 de cada tipo**, associados uma única vez antes do embaralhamento/distribuição. Qualquer carta, inclusive Joker, pode receber item. Não há garantia de mão inicial, favoritismo de zona ou rerrolagem.

Usar carta normalmente ou sacrificar a partir da mão, após comprar, em filha viva. Sacrifício não é jogo/descarte, não encerra turno nem permite batida; preserva descarte legal e topo obrigatório. Carta real fica anexada à filha. Na morte, retorna ao fundo do Lixo com item permanentemente consumido.

Cada item reduz o máximo por um percentual dos **500 HP originais**, aditivamente e com piso **300**. HP atual só é limitado ao novo máximo: não recebe dano adicional se já estiver abaixo. Efeitos especiais continuam funcionando no piso.

| Item | Petrificação | Efeito adicional |
|---|---|---|
| Adaga | 5% / 25 HP | Vínculo permanente enquanto viva: 30% do dano efetivo de ataques também fere o HP real da Lady, sem consumir PROT./Coágulo. Duplicatas petrificam mais 25, sem somar porcentagem. |
| Frasco de Frio | 20% / 100 HP | Bloqueia uma cura efetiva; vida cheia não gasta; duplicatas até 2 cargas. |
| Anticoagulante | 15% / 75 HP | Regen 50→25 permanente, sem acumular. Duplicatas ainda petrificam. |
| Explosivo | 10% / 50 HP | Impacto 60; hemorragia 50 por 2 fechamentos, antes da regen. Reaplicar causa novo impacto e renova duração, sem empilhar sangramento. Não aciona Adaga. |
| Relíquia | 20% / 100 HP | Suprime uma oportunidade individual válida: atual se pendente, senão espera a próxima. Sem candidato ou não escolhida não consome; duplicatas não empilham supressões. Não bloqueia regen. |

Hemorragia mata pelo mesmo caminho de morte/Fúria/remoção de PROT., limitada ao HP restante. Adaga usa dano efetivo, arredonda a transmissão para baixo, não transmite overkill nem gera ciclos. A morte da Lady por transmissão encerra a batalha mesmo com PROT. restante. HUD mostra efeitos ativos, rodadas de sangramento, HP original/máximo recuperável/petrificação; feedback vermelho de Adaga chega ao retrato da Lady, hemorragia aparece na filha e regen vem depois.

PNGs reais centralizados em `ITEM_DEFINITIONS`, sobrepostos à face sem ocultar cantos nem interceptar clique. HUD oferece “ITENS DO CASTELO”, cinco artes e ajuda opcional oficial. Filhas mostram HP/máximo, barra, regen, efeitos, obrigação e cartas sacrificadas reais.

## 7.6 Habilidades ativas da Lady

Valores abaixo são **bases**; Fúria soma ao evento ofensivo positivo e multiplica curas. Exceção: Sangue Impuro mantém +3 por cooperador e teto +6 na rodada, sem acréscimo de Fúria.

| Habilidade | Peso | Fases | Regra base |
|---|---:|---|---|
| Tributo de Sangue | 4 | 1/2/3 | Mão 0–7: 0; 8–10: +3/+4/+6; 11+: +6/+8/+10 por jogador; resolução coletiva |
| Vinho Carmesim | 2 | 1/2/3 | Lady ferida com Sede 20+: consome 15 e cura até 140/200/260 |
| Marca Carmesim | 4 | 1/2/3 | Uma carta jogável por cooperador; falha +5/+7/+9 por marca |
| Banquete dos Mortos | 3 | 2/3 | Habilidade da Lady mesmo com Cassandra morta; tomar Morto profanado: +10/+14 e cura 90/130; Real/Ás-a-Ás: base +4, sem cura |
| Coágulo Carmesim | 3 | 2/3 | Proteção 180/260; absorve antes do Vínculo; metade restante vira cura ao fim da rodada; romper evita cura, sem alívio de Sede |
| Portas do Castelo | 3 | 3 | Lixo fechado durante a rodada |
| As Três Filhas (versão 2) | 3 | 2/3 | Todas as vivas usam a passiva padrão; +3 por falha/reação, sem duplicação ou cobrança extra; mortas não participam |
| Sangue Impuro | 3 | 1/2/3 | Primeiro Joker ou 2 como coringa de cada cooperador +3; máximo +6, inclusive com Fúria. 2 natural não conta; nenhum coringa = 0. Uso legal e flags/validador canônicos, não posição visual. Gatilho por jogador salvo no payload |

`bela_hunt`, `cassandra_feast` e `daniela_swarm` permanecem fora do sorteio/catálogo/introduções. `three_daughters` retorna versão 2, substituindo o payload antigo +8; snapshots da versão antiga cancelam com segurança, sem punição retroativa. Introduções F2: Banquete dos Mortos/Coágulo/Três Filhas/Sangue Impuro; F3: Portas/Vinho/Coágulo/Três Filhas/Sangue Impuro. Demais pesos/números antigos preservados.

## 7.7 Persistência e calibração

IDs de item, consumo, anexos, HP/regen, passivas, cargas de Frio/Relíquia, vínculo de Adaga, hemorragia/último tick, alvo e eventos persistem em snapshot/reload/undo. Partidas novas salvam `castleItemRulesVersion: 2`, configuração e `castleDaughterBalanceVersion: 3`. Ausência de versão de itens significa v1: preserva 450 HP, piso 200, redução uniforme 100, Adaga 50 imediatos e Explosivo 100 imediatos; itens consumidos não adquirem novos efeitos. A migração anterior de 500/60 para 450/50 continua somente no caminho legado. Normalização não sorteia, cura ou reaplica; undo restaura a versão completa. Saves pré-castelo não recebem itens retroativos. Laboratório novo usa v2.

Números centralizados em `js/boss/dimitrescu-castle.js`. Este é um experimento de troca de poder, não win rate comprovado. Meta geral 65–75% (aproximadamente 70%) permanece apenas alvo de calibração.

---


# 8. Bot


## 8.1 Regras gerais


O bot:


- utiliza apenas informação permitida;
- não conhece mão secreta humana;
- usa validação oficial;
- possui fallback legal;
- não cria soft lock;
- considera condição especial e fim do monte.


## 8.2 Banqueiro


Avalia:


- contrato de Juros Fixos;
- valor da Garantia;
- risco de Dívida;
- custo do Limite de Crédito;
- valor do Ágio;
- dano e evolução;
- urgência.


Não rejeita custo apenas quando letal; compara utilidade real.


## 8.3 Dominadora


Avalia:


- custo de obedecer;
- Dominação dos dois cooperadores e proximidade dos limiares de 37,5 e 50;
- Etiqueta;
- Posse coordenada;
- Mãos Atadas compartilhada.


## 8.4 Matriarca


Prioriza:


- quinta Flor;
- Semente jogável;
- Raiz;
- dois lados de Enxerto;
- uma contribuição de cada jogador na Raiz Fortalecida;
- redução de Orvalho;
- redução da mão na Colheita;
- ruptura do Casulo;
- Pólen conforme risco real.


## 8.5 Dimitrescu


Prioriza:


- carta exata marcada pela passiva de Bela;
- as duas cartas da Marca Carmesim;
- jogo marcado por Cassandra;
- risco do Morto profanado;
- evitar a primeira retirada do Lixo durante a passiva de Daniela;
- Vínculo: consumir PROT. diretamente ou priorizar golpe letal na filha; Lady exposta continua atacável mesmo com filhas vivas;
- itens da mão: preservar cartas de alto valor e marcas, evitar efeitos redundantes e usar apenas sacrifício legal;
- urgência maior quando a Sede chega a 75 ou mais e quando o Coágulo está ativo.


## 8.6 Nehelenia


O bot usa somente a informação disponível ao humano e não consulta respostas secretas dos espelhos. Prioriza Jogo Espelhado, Siga o Reflexo, Prisão no Espelho, Presa Marcada, Olho do Falcão, Vigilância, Mão no Espelho e Reflexo Invertido conforme cada objetivo ativo.


---


# 9. HUD e identidade visual


## 9.1 HUD compacto


Mostrar:


- retrato;
- nome;
- HP;
- fase;
- perigo;
- ação atual;
- objetivo urgente;
- escolhas;
- progresso.


O painel recolhível do HUD mostra **Habilidades do chefe**: condição especial, habilidades da rotação, fases em que cada uma pode aparecer e destaque da habilidade ativa. O registro técnico da batalha continua no estado para sincronização e diagnóstico, mas não ocupa mais esse painel.


A leitura da **ação atual** segue uma hierarquia fixa:


- o texto principal mostra somente o que o jogador precisa fazer **agora**;
- a linha de progresso mostra alvo, contagem ou estado atual;
- a consequência mostra de forma curta o sucesso/falha ou a punição relevante;
- regras de escopo, duração, persistência, exceções e termos próprios do chefe ficam em um pequeno botão **`?`** ao fim da instrução;
- o `?` abre um popover flutuante e nunca participa do layout do card;
- habilidades autoexplicativas não recebem `?` apenas para repetir a descrição oficial;
- o texto da ajuda é editorial e específico para a dúvida provável do jogador, não uma cópia integral de `intent.description`.


Exemplos: **Marca Carmesim** já expõe as duas marcas e `Sucesso/Falha`, portanto não precisa de ajuda redundante; **Vigilância** recebe `?` porque é importante explicar que o bloqueio vale somente para o alvo, somente naquele jogo e naquele turno, mantendo parceiro e outros jogos livres.


Na Nehelenia, capangas simultâneos usam a mesma faixa fixa de três posições da Dimitrescu e permanecem na **mesma linha** (Tiger, Hawk, Fish), mesmo quando efeitos persistentes fazem dois ou três aparecerem juntos.
Cada card de capanga ativo também expõe contexto curto sem alterar a arte: **ALVO**, vínculo relevante (por exemplo `JOGO 3` ou `DESCARTE: PAUS`) e, quando o efeito sobrevive ao turno original, a marca **PERSISTENTE**. Isso permite distinguir simultaneamente, por exemplo, uma Presa Marcada antiga de Tiger sobre um jogador e uma nova ordem de Hawk sobre o parceiro.


## 9.2 Banqueiro


Mostrar:


- Dívida;
- contrato;
- Cofres;
- Cartas Financiadas;
- Limite de Crédito;
- Ágio.


## 9.3 Dominadora


Mostrar:


- barra de Dominação 0–50 de cada jogador, dividida em quatro segmentos de 12,5;
- estado Normal, Sob Controle ou Dominado;
- ordem ativa;
- Etiqueta;
- disponibilidade de Mãos Atadas;
- contribuições de Posse.


## 9.4 Matriarca


Mostrar:


- Florescimento 0/5;
- cinco flores;
- ameaças;
- prazos;
- consequência;
- cura prevista;
- Casulo;
- Raiz Fortalecida e contribuições.


## 9.5 Dimitrescu


Mostrar:


- Sede de Sangue 0/100;
- objetivo ativo e consequência;
- marca de Bela somente na carta-alvo;
- Marca Carmesim individual por cooperador;
- marca de Cassandra no jogo e maldição da Lady no Morto profanado;
- passiva de Daniela no chip da filha quando selecionada (não exige carta específica e não ativa a marcação legada de Enxame no Lixo);
- Coágulo Carmesim e proteção restante;
- três filhas permanentes sob o HUD, com HP/máximo, regen, efeitos e cartas reais anexadas;
- Vínculo consumível anexado à direita na mesma barra de vida, com restante/preenchimento e `i` interno: total HP + PROT. restante (3500/3500 inicialmente), máximo 2000 + capacidade das filhas vivas. Não há piso de HP; Fúria clicável explica +10% cura/+2 Sede própria por filha morta;
- filhas em três cards: arte integral, vida/500 visual (450 nos saves v1), máximo recuperável explícito, barra verde/amarelo/vermelho com fundo escuro como Nemesis e parte petrificada por itens; ↓ MÁX/ajuda esclarecem máximo recuperável real. Sacrifícios laterais sem painel; ícones do castelo ampliados na largura sem aumentar HUD; itens maiores na mão com contraste e cantos preservados;
- barra de Sede visualmente distinta da barra de HP.
- Retrato da Lady selecionável por clique/toque/teclado como Nemesis, sem botão abaixo das filhas. Sem REGEN +50 permanente: regeneração na ajuda. Um chip de passiva por filha viva à direita: CAÇADA / BANQUETE / LIXO +3, neutro quando não age e destacado com carta/jogo concreto quando selecionada. As Três Filhas destaca os três. O próprio chip abre a regra completa, consequência e contexto da rodada; sem chips adicionais de falha, CUMPRIDA ou APLICADO. Debuffs de item permanecem separados. PNG do item clicável/focável na mão; marca de Bela somente periférica, sem cobrir o centro nem a ação.

Chips dos capangas/filhas de Nemesis, Nehelenia e Dimitrescu seguem o mesmo contrato visual baseado no Nemesis: fonte 8px (7px em celular), altura mínima 16px, cantos 3px e padding consistente. Status/contexto ativo usa dourado; estados de sucesso/falha/inativo continuam distintos. Debuffs azuis com seta e ajuda do efeito continuam exclusivos da Dimitrescu. A padronização não altera regras nem posições de cartas/objetivos.


## 9.6 Animações


Toda animação depende de evento, não de render.


Não repetir em:


- snapshot;
- reload;
- reorganização;
- render completo.


Sem animação contínua.


Touch, tablet e `prefers-reduced-motion` usam fades curtos.


---


# 10. Persistência, sincronização e Voltar


Persistir:


- fase;
- intenção;
- diálogo;
- escolhas;
- perigo;
- HP;
- contratos;
- Cofres;
- financiadas;
- ordens;
- Etiqueta;
- Mãos Atadas;
- Posse e contribuições;
- transbordamento;
- Florescimento;
- ameaças;
- prazos;
- propagação;
- Orvalho;
- Casulo;
- Renascimento;
- IDs de dano;
- marcadores por jogo;
- Sede de Sangue e objetivos das filhas;
- estado persistente das filhas, passivas, regen, anexos, associação/consumo de itens e alvo;
- IDs de eventos.


## 10.1 Autoridade


- um cliente aplica efeitos;
- observador não executa;
- todos veem o mesmo estado público;
- mãos secretas permanecem secretas.


## 10.2 Idempotência


Snapshot não duplica:


- dano;
- cura;
- Dívida;
- Dominação;
- Flor;
- Sede de Sangue;
- propagação;
- contribuições;
- sorteio;
- animação.


## 10.3 Voltar


Voltar é transacional e restaura:


- mão;
- jogos;
- lixo;
- monte;
- turno;
- seleção;
- HP;
- perigo;
- dano;
- intenção;
- escolha;
- contadores;
- eventos.


Voltar não:


- sorteia novamente;
- duplica carta;
- perde carta;
- deixa escolha órfã;
- reaplica chefe.


Quando uma ação é irreversível pelas regras, o botão fica claramente indisponível.


---


# 11. Segurança e soft lock


O sistema deve impedir ou cancelar com segurança:


- mão sem descarte legal;
- carta bloqueada justificando lixo;
- ameaça sem alvo;
- ordem impossível;
- Interdito irrelevante;
- Cofre inválido;
- Posse fantasma;
- ameaça da Matriarca impossível;
- objetivo da Dimitrescu sem alvo legal;
- prazo resolvido antecipadamente;
- escolha perdida em reload;
- evento duplicado;
- observador aplicando efeito;
- bot sem fallback.


Mudança externa cancela somente o efeito afetado, sem punição indevida.


---


# 12. Tablet, desempenho e acessibilidade


Em touch, tablet e `prefers-reduced-motion`:


- `#gameSection::before` e `::after` permanecem desativados quando aplicável;
- fundo temático fica estático;
- sem brilho pulsante;
- sem flash branco;
- sem estroboscópio;
- partículas são removidas ou reduzidas;
- números e rótulos continuam completos;
- controles continuam acessíveis;
- os três retratos das filhas mantêm as dimensões equivalentes ao retrato principal por breakpoint;
- a animação da barra de sangue fica desativada em touch e `prefers-reduced-motion`.


---


# 13. Comparação dos chefes


| Característica | Banqueiro | Dominadora | Matriarca | Lady Dimitrescu | Rainha Nehelenia | Nemesis |
|---|---|---|---|---|---|---|
| HP | 2650 | 2600 | 2000 | 2000 | 2400 | 2200 |
| Perigo | Dívida coletiva | Dominação individual | Florescimento | Sede de Sangue | Mundo do Espelho (0–100) | Infecção (0–100) |
| Derrota especial | Dívida 100 | ambos em 50/50 de Dominação | 5 Flores | Sede 100 | 5 Espelhos | Infecção 100 |
| Pressão | preços e recursos | ordens e eficiência | ameaças e propagação | sangue como recurso, filhas, cura e proteção | reflexos, memória, simetria e capangas | Infecção, zumbis persistentes e redirecionamento de dano |
| Recuperação da equipe | redução de Dívida | Dominação -4/-8/-12 | poda por evolução | redução de Sede por canastra | Mundo do Espelho -4/-8/-12 | Infecção -4/-8/-12 por canastra |
| Compra/lixo | Cofre, Tarifa, Bloqueio, Ágio | Dominação e controle | Pólen | Daniela, Morto profanado e Portas do Castelo | Espelho do Lixo | Zona Contaminada e Agarrador após compra |
| Jogos | Penhora e Limite | Posse e Mãos Atadas | Raiz, Enxerto, Casulo | Passiva de Cassandra, Coágulo e Marca Carmesim | Jogo Espelhado, Laço do Tigre, Presa Marcada e Vigilância | Caçada, Tentáculos, Lança-Foguetes e Devorador |


---


# 14. Testes e validação


A suíte deve cobrir comportamento, não apenas presença de strings.


Áreas obrigatórias:


- dano incremental;
- fases;
- condições especiais;
- sorteios determinísticos;
- origem de cartas;
- Voltar;
- prazos;
- idempotência;
- bot;
- Buraco Fechado;
- HUD;
- reduced motion;
- cliente observador;
- reload;
- ataques finais;
- marcadores;
- Sede de Sangue;
- objetivos de Bela, Cassandra e Daniela;
- layout responsivo da faixa das filhas.


Comandos:


```bash
node --test tests/*.test.mjs
node --check <arquivos JavaScript modificados>
```


Validação manual recomendada:


- dois clientes via Firebase;
- humano + bot;
- humano + humano;
- desktop;
- tablet;
- reload durante escolha;
- reload durante animação;
- Voltar após ação de chefe;
- ataque final com Renascimento.




---


# 15. Rainha Nehelenia


## 15.1 Identidade


Nehelenia é uma chefe de **engano, reflexos e manipulação da própria mesa**. Ela não deve copiar a linguagem mecânica de cura, escudo ou dano armazenado dos outros chefes. O objetivo é fazer o jogador duvidar do que está vendo e obrigar a equipe a adaptar o próprio turno.


O HUD textual permanece padronizado em amarelo, com `☐ / ☑ / ✕`. O espetáculo acontece na mesa.


## 15.2 Vida e Mundo do Espelho


```text
HP: 2400
Mundo do Espelho: 0..100
Visual: 5 espelhos de 20 pontos cada, com preenchimento parcial
```


O recurso é **coletivo**, mas o motor mantém a parcela atribuída a cada jogador para feedback e persistência. Os cinco espelhos do HUD são apenas a representação visual dessa régua contínua: cada um equivale a 20 pontos e pode aparecer parcialmente preenchido.


- `0–<60`: estado normal;
- `60–<100`: o HUD entra em pressão visual de **Mundo do Espelho**;
- `100/100`: derrota imediata — Nehelenia fecha a equipe dentro do reflexo.


As punições não entregam mais um Espelho inteiro por falha. Cada habilidade aplica sua própria pressão: Jogo Espelhado +18, Siga o Reflexo +16, Espelho do Lixo +16, Laço do Tigre +12 e Pesadelo Eterno +24.


A recuperação por canastra segue a régua comum:

- Canastra Limpa: `-4`;
- Canastra Real: `-8` no total;
- Ás-a-Ás: `-12` no total;
- evoluções sucessivas acrescentam `-4` por novo tier válido.


A Prisão no Espelho participa da rotação com peso `2` nas três fases. Precisa de um jogador já pressionado, um parceiro para resgatá-lo e um jogo existente estruturalmente extensível. Não exige que o parceiro já tenha a carta necessária: ele pode falhar e sofrer a consequência prevista.


## 15.3 Fases


- Fase 1 — **Espelhos dos Sonhos**;
- Fase 2 — **Circo da Lua Morta**;
- Fase 3 — **Pesadelo Eterno**.


## 15.4 Rotação ativa


### Jogo Espelhado


Nehelenia escolhe um jogo que o alvo consegue alimentar legalmente.


Depois do anúncio:


1. o jogo original recebe um clarão de espelho;
2. o layout abre espaço;
3. uma cópia completa nasce do jogo;
4. os dois jogos cruzam/embaralham visualmente;
5. ficam lado a lado, do mesmo tamanho dos jogos normais, marcados apenas como **REFLEXO I** e **REFLEXO II**.


Nenhum lado recebe classe visual de verdadeiro/falso.


O alvo seleciona exatamente 1 carta legal e toca em um dos reflexos:


- **verdadeiro:** a carta entra normalmente no jogo real;
- **falso:** o reflexo quebra, a carta vai para o **fundo do monte** e o jogador fica **Desorientado**;
- **Desorientado:** não pode fazer novas baixadas naquele turno; ainda pode descartar e encerrar.


Ignorar a ilusão até o fim do turno acrescenta **+18** ao Mundo do Espelho, assim como escolher o reflexo falso.


Se o alvo já estiver sob **Presa Marcada** de Tiger em outro jogo, o **Jogo Espelhado** tem precedência temporária por ser a obrigação ativa do turno: o jogador pode alimentar somente o jogo espelhado até resolver a escolha. A Presa não é removida e volta a restringir os demais jogos imediatamente depois.


### Siga o Reflexo


O primeiro cooperador define o padrão pelo **turno inteiro**, não pela primeira jogada.


Exemplos:


```text
Biel baixa 3 cartas durante o turno.
Padrão = 3.
Luana precisa terminar o próprio turno tendo baixado exatamente 3.


Biel baixa 0.
Padrão = 0.
Luana pode baixar cartas normalmente, mas se baixar qualquer quantidade acima de 0 falha.
```


Regras:


- a ordem é travada pela sequência real da rodada: **1º jogador que vai agir = define**, **2º jogador que vai agir = copia**;
- a habilidade permanece sendo a intenção atual durante os dois turnos; Nehelenia **não sorteia outra habilidade no meio**;
- contam todas as cartas colocadas legalmente na mesa pelo primeiro jogador;
- o padrão é fechado somente quando o turno dele termina;
- o segundo jogador **não é bloqueado** por tentar passar do número;
- ao fim do segundo turno, compara-se o total;
- `segundo == padrão` = sucesso;
- qualquer diferença, para mais ou para menos, = **+16 no Mundo do Espelho**.


### Espelho do Lixo


O topo real do lixo é duplicado em **dois reflexos visualmente idênticos**.


- ambos mostram a mesma carta;
- não existe `X`, rachadura seletiva, brilho diferente ou qualquer pista;
- a resposta é deliberadamente **50/50**;
- acerto mantém o lixo disponível;
- erro sela o lixo durante a rodada e acrescenta **+16 no Mundo do Espelho**.


O bot também não recebe a resposta secreta: escolhe um dos dois reflexos de forma determinística, mas sem consultar `correctOption`.


### Prisão no Espelho

Participa da rotação normal com **peso 2** nas Fases 1, 2 e 3. É uma habilidade rara e condicional: se não existir pressão no Mundo do Espelho ou se o parceiro não tiver uma alimentação legal em jogo existente, ela fica inelegível e não pode ser sorteada.

Nehelenia prioriza aprisionar o cooperador que estiver com **maior pressão acumulada de Espelho**. Em empate, a escolha continua determinística pela seed da partida. O outro cooperador vira o resgatador e recebe um jogo que ele realmente consegue alimentar.

- se o parceiro alimentar o jogo indicado, o jogador é libertado e **nenhum ponto é removido nem acrescentado** ao Mundo do Espelho;
- se o parceiro falhar até a resolução da habilidade, Nehelenia avança o Mundo do Espelho em **+8 na Fase 1, +10 na Fase 2 e +12 na Fase 3**;
- a penalidade de falha é persistida no payload da ativação, portanto uma mudança de fase durante a rodada não altera o valor anunciado.


### Pesadelo Eterno


A habilidade usa um **shell game visual**:


1. uma carta aparece sozinha como **ORIGINAL**;
2. dois reflexos idênticos nascem da original;
3. o rótulo `ORIGINAL` desaparece;
4. os três espelhos cruzam várias vezes;
5. somente depois do embaralhamento os três ficam clicáveis.


Todos mostram a mesma carta e nenhum recebe `X` ou pista falsa automática. O desafio é acompanhar a posição da carta original durante a animação.


- acerto: a ilusão quebra;
- erro: **+24 no Mundo do Espelho**;
- se isso alcançar `100/100`, o Mundo do Espelho encerra a batalha.


### Laço do Tigre


Tiger's Eye liga dois jogos. Cada lado precisa receber pelo menos 1 carta; se algum lado for ignorado, o Mundo do Espelho avança **+12**, as garras persistem e a próxima alimentação rompe o efeito sem dano individual das cartas usadas para romper.


### Presa Marcada


Tiger's Eye marca um jogo que o alvo consegue alimentar. Até resolver a Presa, esse jogador não pode alimentar outro jogo existente.


### Olho do Falcão


Hawk's Eye exige descarte do naipe marcado. Errar faz Hawk vigiar a carta do topo e bloqueia a retirada do lixo enquanto ela permanecer ali.


### Vigilância


Hawk's Eye impede o alvo de alimentar o jogo marcado naquele turno.


### Mão no Espelho


Fish Eye marca uma carta que precisa sair da mão por jogo ou descarte; se falhar, vira Reflexo Morto e só pode sair pelo descarte.


### Reflexo Invertido


Fish Eye impede abrir jogo novo até alimentar um jogo existente. O efeito persiste até ser resolvido.


## 15.5 Feedback visual


- cinco pequenos espelhos ornamentados ficam visíveis no HUD;
- Tiger's Eye, Hawk's Eye e Fish Eye aparecem em painéis próprios sob o HUD quando participam da luta;
- espelhos tomados ficam rachados/avermelhados;
- em `60/100` ou mais, o retrato entra em pressão de Mundo do Espelho;
- o Jogo Espelhado usa duas instâncias de tamanho normal dentro do `meld-container`;
- a cópia nasce com clarão e os dois jogos cruzam antes de parar;
- o Espelho do Lixo usa dois espelhos centrais idênticos;
- o Pesadelo Eterno usa um palco central com ORIGINAL → dois reflexos → embaralhamento;
- clones visuais nunca entram no estado real da canastra, não causam dano e não mudam a estrutura global dos jogos;
- animações respeitam `prefers-reduced-motion`.


## 15.6 Direção de design


Novas habilidades da Nehelenia devem priorizar **enganação visual, memória, leitura da mesa e distorção da interface física do jogo**. Evitar cura, escudo, absorção de dano ou objetivos que sejam apenas versões renomeadas de outros chefes.




---


## Balanceamento experimental — memória dos chefes

Os registros de Dominação e Mundo do Espelho abaixo começaram em 03/10/2026; as revisões posteriores são identificadas por data.


### Régua comum de pressão
Dominadora e Nehelenia passaram a usar progresso fracionário por baixo dos marcadores visuais. A referência matemática é 0–100, sem substituir a identidade visual de cada chefe.


- Canastra Limpa: alívio total de 4 pontos.
- Canastra Real: alívio total de 8 pontos.
- Canastra Ás-a-Ás: alívio total de 12 pontos.
- Evoluções sucessivas acrescentam 4 pontos de alívio por novo tier; uma canastra que nasce diretamente em Real/Ás-a-Ás recebe o total correspondente.


### Dominadora
O estado interno continua compatível com a escala legada 0–4 em `chainsByPlayer`, aceitando frações. A regra usa Dominação 0–50 por jogador; cada segmento da barra equivale a 12,5 pontos e pode aparecer parcialmente preenchido.


- 37,5/50: Sob Controle.
- 50/50: Dominado.
- os dois jogadores em 50/50: derrota especial.


Pressões atuais de teste: Escolha Forçada F1 +6 ou ordem +2/falha +12, F2 +7 ou +3/+14, F3 +8 ou +3/+16; Exposição sucesso +1 e falha +9/+11/+13; Etiqueta +2/+2/+3 ao cumprir e +10/+12/+14 ao falhar; Favorita F2/F3 0/+8; Controle Absoluto +5; Quebra de Vontade +8 ou cura de até 180 HP; Ordem Final recusar +7, aceitar +2 e +6 por carta sorteada não usada.


### Nehelenia
O estado continua compatível com 5 Espelhos, agora com preenchimento parcial. Cada Espelho equivale a 20 pontos do Mundo do Espelho.


Pressões de teste: Jogo Espelhado erro/ignorar +18; Siga o Reflexo falha +16; Espelho do Lixo erro +16; Prisão no Espelho falha +8/+10/+12; Laço do Tigre falha +12; Pesadelo Eterno erro +24. Na Prisão, libertar o parceiro não altera o Mundo do Espelho.

**Revisão de 04/10/2026:** os valores foram mantidos após comparação com a Dominadora. A Nehelenia alterna habilidades de pressão e de controle, usa uma barra coletiva de 100 pontos e recupera 4/8/12 pelas canastras; a pressão mais forte, +24, fica restrita à Fase 3. Não foi aplicado buff/nerf nesta revisão.


O HUD mostra o preenchimento parcial da Dominação/Espelhos e o progresso numérico para tornar o risco legível.

### Dimitrescu — rework experimental de 07/10/2026

Lady 2000 / filhas 500 cada / regen 50 / 15 itens distintos / piso 300 / Vínculo 1500–0 / Fúria preservada. Saves v1 mantêm configuração histórica 450/piso200. Não há percentual atual contra dupla competente medido; meta 65–75% é só alvo, não resultado. Comparações e limites do simulador: `REWORK_ITENS_DIMITRESCU_2026-10-08.md`; centralização em `js/boss/dimitrescu-castle.js`. Demais chefes não foram rebalanceados neste passe.

### Nemesis — revisão experimental de 06/10/2026

Durabilidade atual para teste: **Nemesis 2200 / Agarrador 220 / Infectado 240 / Devorador 260 HP**. Agarrador sorteia cartas da mão após a compra do jogador perseguido, do Monte ou do Lixo; troca o jogador por rodada. Pesos, punições, Infecção e demais chefes foram mantidos. Revisão atual: [AJUSTE_FINAL_NEMESIS_2026-10-09.md](AJUSTE_FINAL_NEMESIS_2026-10-09.md).

A estimativa de **~68,9%** é histórica, anterior à regra global do Lixo e a este rebalanceamento; não representa win rate atual. Não há novo percentual validado. A recalibração depende de testes de jogo, simulação ou telemetria posteriores.
---

## Correções técnicas — Laboratório da Ordem Final e Amigas da Dominação (04/10/2026)

### Laboratório de Chefes — Ordem Final
O cenário de DevTools da Dominadora foi alinhado à versão atual da Ordem Final:
- o laboratório prepara explicitamente dois cooperadores com pelo menos duas cartas legalmente jogáveis;
- a escolha nasce às cegas, sem `cardIds` revelados antes do aceite;
- as duas cartas só são sorteadas/marcadas depois que o jogador aceita a Ordem Final;
- o cenário de teste não usa mais os tipos antigos `final_order_draw` / `final_order_lock`.

### Amigas da Dominação — monte auxiliar vazio
Esgotar `dominationFriendShared.stock` NÃO muda a estratégia para um modo permissivo. A amiga continua jogando com a mão restante e só usa a política de despedida quando `turnsRemaining === 1` ou no endgame público já previsto.

Foi adicionada uma barreira defensiva imediatamente antes de gravar qualquer jogo da amiga na mesa. O plano calculado é revalidado contra as regras oficiais naquele instante; se uma extensão ou novo jogo não continuar legal, ele é descartado e não é aplicado. Essa proteção não altera os heurísticos aprovados de compra, prioridade, descarte ou formação de canastras.

---

# 16. Nemesis (05/10/2026)

### Marcação visual de cartas

A carta exata de um objetivo do Nemesis deve ficar visível com infecção verde e selo **MARCADA**, inclusive na entrada do Agarrador. Cartas presas pela passiva usam **AGARRADA** e a carta do topo sob Zona Contaminada usa **CONTAMINADA**, reutilizando o mesmo overlay. Zona de Impacto continua laranja. Ao receber a restrição do Agarrador, a carta pulsa uma única vez por evento, sem replay por rerender/reload/snapshot/undo; depois mantém a marca até expirar. Redução de movimento desativa o pulso. Valor, naipe, seleção, NOVA e cliques permanecem acessíveis. Estar marcada não acrescenta Infecção automaticamente nem muda as regras da habilidade.

A decoração é aplicada depois de renderizar a face, para não ser apagada por `innerHTML`, sem duplicar overlays em rerender. Sem efeito ativo, a decoração é removida. Novos chefes/habilidades devem validar o alvo na lógica **e na tela**, seguindo a matriz da seção 23 do checklist permanente; o texto do painel sozinho não substitui a marcação da carta.

## 16.1 Regra funcional

Nemesis começa com **2200 HP** e **Infecção 0/100**. Usa os gatilhos e o fluxo de fases compartilhados do modo Chefe, sem progressão paralela. Chegar a **100 de Infecção encerra a batalha imediatamente**, inclusive por pegar o Lixo ou alimentar uma Zona de Impacto. Uma redução posterior na mesma ação não desfaz uma derrota já confirmada.

A partida começa **sem zumbis ativos**. Os três zumbis só tentam entrar pela **Invasão da Horda**. Aparecer como ameaça não significa persistir: durante a entrada não há passiva nem alvo de dano. A falha deixa o zumbi persistente com HP máximo; sucesso o repele, sem Infecção extra e sem produzir cadáver.

Estados serializados: `absent` (fora da mesa), `entering` (objetivo de entrada), `persistent` (combatente vivo/debuff), `repelled` (expulso, pode voltar) e `corpse` (morto depois de persistir). **Repelido não é cadáver.** Saves antigos `alive`/`dead` migram para `persistent`/`corpse`, preservando HP, seleção, S.T.A.R.S., bônus e cargas. Não se reinicia a luta existente.

Teto de persistentes vivos: **F1 = 1, F2 = 2, F3 = 3**, compartilhado por Invasão e Reanimação. Saves antigos acima do teto não perdem combatentes; novas entradas ficam bloqueadas até haver espaço.

Passivas somente de persistentes vivos:

| Zumbi | HP máximo | Passiva vivo | Mutado na F3 |
|---|---:|---|---|
| Agarrador | 220 | Persegue um jogador por rodada, alternando na seguinte. Após a compra do alvo, sorteia 1 carta da mão: não pode jogar nesse turno, mas pode descartar. | 2 cartas; Reforçado soma +1 (2 normal / 3 Mutado). |
| Infectado | 240 | Cada falha que normalmente gera Infecção recebe +2, uma vez por evento. | +4 por falha. |
| Devorador | 260 | Cada 3 cartas novas da equipe, acumuladas entre jogos/turnos/jogadores, curam até 20 HP imediatamente. Sem limite por jogada/turno: 12 cartas dão 4 curas. | Cura até 35 HP; Reforçado soma +15 (35 normal / 50 Mutado). |

O chip mostra somente `CURA 20/35/50`, conforme o estado, com três segmentos verdes. A contagem numérica fica na ajuda, não no rótulo. Cada grupo de três cartas é consumido imediatamente; depois de 6/9/12 cartas o progresso é zero, depois de 4/7 é um. Só 0–2 créditos parciais atravessam os turnos. Eventos distintos por cura alimentam a fila visual existente, sem duplicar animações por render/reload. Não há cooldown, quota por turno nem compensação oculta.

No Buraco Fechado, a restrição acontece depois da jogada obrigatória da compra: o topo já na mesa não fica Agarrado. `grabberPursuit.playerIds` salva a ordem sorteada por seed; o alvo é o índice `(roundNumber−1) % 2`, sem depender de compra, render, fase ou reanimação. O chip separado `ALVO: nome real` só aparece com Agarrador persistente vivo. As cartas são embaralhadas por evento com Fisher–Yates, partindo de IDs canônicos; não há prioridade por carta jogável, coringa, 2 ou ordem da mão/planner. Tentáculo, Barragem e marca da Invasão usam o mesmo padrão, respeitando saídas legais individuais, sem exigir solução antecipada. A proteção anterior das combinações de travas é mantida: não sacrifica uma solução já existente nem a única saída legal de Morto/batida; pode condicionar o sorteio nesses estados. Aplica 1/2/2/3 quando houver combinação segura, reduzindo só depois de esgotar as maiores. As travas expiram no fim do turno; matar o Agarrador libera imediatamente. Locks salvos atuais não são sorteados novamente. O BOT consulta o bloqueio canônico; descarte segue livre.

O contador do Devorador usa `devourerFeed.version=2` e IDs únicos por carta. `devourerTurnIds` não limita mais a passiva. Cada grupo consome três créditos, inclusive com HP cheio (não cria animação de cura zero), e incrementa `devourerHealSequence`, preservada entre morte/reanimação. IDs de evento `devourer:v2:N` distinguem curas da mesma jogada e persistem em snapshot/undo/sync. Não cura com chefe derrotado, HP zero, resultado terminal ou partida encerrada. Morte/reanimação zeram o progresso e registram a mesa existente sem creditá-la novamente.

Migração: feed v1 conserva `credits % 3` e os IDs já contados, descarta os grupos completos pendentes (`discardedLegacyCredits`) e não cura ao carregar. Exemplo: 8 créditos antigos viram 2; 6 são descartados. Sem feed, inicia em zero e registra a mesa antiga. Normalização repetida não muda HP nem gera eventos. Detalhes, números e evidências no [relatório do ajuste final](AJUSTE_FINAL_NEMESIS_2026-10-09.md).

A migração mantém HP restante abaixo dos novos máximos, limitando apenas valores acima deles, sem reiniciar a batalha ou restaurar HP perdido. Reanimação usa metade dos máximos atuais: Agarrador 110, Infectado 120, Devorador 130; quota, teto e retorno Mutado na F3 permanecem. Decisão de balanceamento: `BALANCEAMENTO_NEMESIS.md`.

Ao morrer, o zumbi perde sua passiva imediatamente, fica como cadáver no estado e deixa de aparecer nas escolhas de ataque. **Não há transbordamento de dano nem alívio de Infecção pela morte**. Cadáveres continuam visíveis; só os que ainda não foram reanimados nesta partida podem ser alvo da Reanimação Viral.

## 16.2 Direcionamento de dano e S.T.A.R.S.

O painel permite selecionar **antes da jogada** Nemesis ou qualquer zumbi persistente vivo. O próprio card do zumbi seleciona o alvo e destaca a seleção; na arte principal, ALVO mostra o destino atual e o botão ↩ retorna ao Nemesis. Sem linha complementar abaixo dos zumbis. Entrando, repelido, ausente e cadáver não aceitam ataques. A seleção permanece até ser alterada; se o alvo morreu, a próxima ação usa Nemesis. Quando não há persistente vivo, não existe escolha adicional.

Todos os ataques reutilizam os valores do motor atual, inclusive dano individual, evolução de canastra e ataque final. O excesso de um ataque em zumbi é perdido. O ataque final também respeita o alvo selecionado; uma confirmação específica alerta que atacar um zumbi pode deixar Nemesis vivo e causar derrota.

A redução de Infecção é independente do alvo: **Limpa −4, Real −8 e Ás-a-Ás −12 no total por jogo**. Evoluir entre tiers acrescenta apenas a diferença; repetir snapshot/ação não reaplica o alívio. Simples e Suja não aliviam.

Quem causa dano efetivo diretamente ao Nemesis vira **ALVO S.T.A.R.S.**. O marcador persiste entre turnos, rodadas e reload. Dano em zumbi não altera o marcador. Caçada e Extermínio congelam esse alvo no anúncio, mesmo sem ataque disponível: a equipe pode falhar. Não trocam silenciosamente pelo parceiro. Antes de existir um S.T.A.R.S., escolhem um cooperador válido com turno restante. Extermínio também exige parceiro e jogo existente extensível, não prova conjunta.

Na entrada da F3, todos os persistentes vivos ficam Mutados. Quem persistir por falha na entrada ou for reanimado na F3 já entra Mutado. Ausentes/repelidos não guardam mutação ativa. Mutação é consequência da fase, não habilidade sorteável.

## 16.3 Habilidades e números

Pesos são relativos às habilidades elegíveis da fase, não percentuais fixos. Soma dos onze pesos-base: **39**. Valores sujeitos a balanceamento após partidas reais.

| Habilidade (`id`) | Fases | Peso | Funcionamento |
|---|---|---:|---|
| Invasão da Horda (`horde_invasion`) | 1/2/3 | 4 | Escolhe ausente/repelido com espaço no teto. Agarrador: carta marcada sai por jogo/descarte no turno do alvo. Infectado: equipe contribui 2 cartas na rodada. Devorador: basta um jogo existente alimentável para entrar; equipe acumula 3 cartas novas na rodada nos jogos registrados no início, no mesmo jogo ou em vários, por um ou ambos os jogadores. Não exige prova antecipada da expulsão; reorganização/duplicatas/jogos novos não contam. Aos 3 repele; falha deixa persistente com HP cheio, sem penalidade extra. Evita o último repelido se houver outra entrada válida. |
| Caçada S.T.A.R.S. (`stars_hunt`) | 1/2/3 | 5 | S.T.A.R.S. congelado causa dano direto efetivo positivo ao Nemesis no próprio turno. Dano em zumbi não conta. Falha base +8/+10/+12. |
| Tentáculo Infeccioso (`infectious_tentacle`) | 1/2/3 | 5 | Duas marcas com rota real de jogo: jogar uma neutraliza; só descartar uma custa base +4/+5/+6; nenhuma resolvida custa +8/+10/+12. |
| Zona Contaminada (`contaminated_zone`) | 1/2/3 | 3 | Só entra com retirada legal comprovada do Lixo Fechado, respeitando bloqueios e condições de Morto/batida. Pegar custa +6; Agarrador persistente também age. Não é falha e não recebe seus bônus. |
| Comando da Horda (`horde_command`) | 1/2/3 | 3 | Reforça apenas persistente vivo: Agarrador prende +1; Infectado cobra +2 por falha; Devorador cura +15. Soma à versão normal/Mutada. Não coloca zumbis na mesa. Dura até o fim da rodada seguinte, inclusive (`expiresRound = rodada atual + 1`). |
| Lança-Foguetes (`rocket_launcher`) | 2/3 | 4 | Marca por ID estável um jogo válido e alimentável. Cada carta nova nele custa +10/+12 durante a rodada; três cartas juntas custam +30/+36. Cartas já contabilizadas não cobram novamente. A ação não é proibida. |
| Regeneração Parasita (`parasite_regeneration`) | 2/3 | 2 | Cura até 100 HP do persistente vivo e ferido com menor percentual de HP. Não cura outras etapas do lifecycle. |
| Reanimação Viral (`viral_reanimation`) | 2/3 | 2 | Revive somente cadáver com 50% do HP máximo. **Cada zumbi revive no máximo uma vez na partida**, além da quota de uma utilização por fase e do teto 1/2/3. Repelido ou cadáver já reanimado nunca é alvo. |
| Barragem de Tentáculos (`tentacle_barrage`) | 3 | 4 | Marca 3 cartas; 2 precisam sair legalmente no mesmo turno. Falha base +16. |
| Extermínio S.T.A.R.S. (`stars_extermination`) | 3 | 4 | Na rodada, S.T.A.R.S. causa dano direto positivo ao Nemesis e parceiro contribui legalmente ao jogo existente congelado no anúncio. Ambos/um/nenhum: base +0/+8/+16. |
| Surto Ômega (`omega_outbreak`) | 3 | 3 | Só falhas reais recebem +2 abaixo de 50, +4 entre 50–74 ou +6 entre 75–99, usando a Infecção no instante da falha. Ativar não gera Infecção. |

**Prazos:** Caçada, Tentáculo, Barragem e Zona Contaminada valem até o fim do turno do alvo; Extermínio e Impacto até o fim da rodada atual; Regeneração/Reanimação são imediatas antes dos jogadores. Horda e Ômega valem **até o fim da rodada seguinte à ativação**, para poderem afetar uma habilidade futura. O HUD informa a rodada de expiração. Os bônus de Infectado, Horda e Ômega somam apenas em falhas com penalidade positiva, inclusive parciais, uma vez por evento; HUD e resolução usam o mesmo cálculo.

## 16.4 Elegibilidade, BOT e persistência

O adapter distingue alvo válido de solução do desafio. Caçada pode falhar sem ataque pronto; Extermínio exige papéis e jogo existentes, sem provar os dois planos. Tentáculo e Barragem exigem cartas com saída individual legal por jogo ou descarte, respeitando bloqueios, topo recém-retirado e Morto/batida. Não garantem que duas saídas sejam realizáveis no mesmo turno. Falhar não cancela o objetivo nem elimina sua punição.

Caçada continua exigindo dano novo efetivo para sucesso (cartas já creditadas sem evolução não bastam). Extermínio preserva destino e papéis congelados. O Agarrador continua validando o estado após as travas com o planner: protege soluções que realmente existam, tentando a quota completa antes de reduzir, mas não impede anunciar desafios sem solução. Saves com objetivos já anunciados antes do rework (`objectiveVersion` ausente) concluem sob a regra anterior; anúncios novos usam versão 2. Progresso e IDs seguem snapshot/undo/reload sem duplicação; elegibilidade nova não reconstrói objetivos salvos.

O BOT usa esses planos por papel: prioriza Nemesis para cumprir seu dano direto pendente, o jogo congelado quando é parceiro e jogar a marcada para sucesso completo do Tentáculo. Fora dessas obrigações, mantém a heurística atual dos zumbis. Respeita Agarradas e batida segura; evita retirada contaminada letal e Impacto que leve a 100.

`boss-combat.js` é uma abstração pequena para criar, normalizar, ferir, curar e reviver entidades serializáveis. Regras específicas permanecem no adapter do Nemesis. Estado novo fica dentro de `boss`, seguindo o save, snapshot, undo e sincronização existentes: HP/status/mutação/revives, seleção de ataque por jogador, S.T.A.R.S., cartas Agarradas, bônus com expiração, Zona de Impacto, quota por fase e guards de eventos. Não há timer exclusivo do Nemesis.

O Laboratório deriva suas onze habilidades da definição e usa o motor real. A Invasão permite escolher cada zumbi, sucesso/falha, BOT, reload/undo, reentrada, proteção contra repetição, teto da fase e persistente/cadáver. Comando sem persistente, Regeneração e Reanimação também possuem fixtures de elegibilidade/fallback.

HUD: cards em faixa própria abaixo do HUD principal, sem aumentar sua altura; ausentes não ocupam espaço; entrando mostra arte/nome, com objetivo apenas no painel de Invasão da Horda. Cards reutilizam o padrão full-bleed das filhas/capangas e chips oficiais INVADINDO, ATIVO, MUTADO, REFORÇADO e CADÁVER quando aplicáveis. Persistentes têm HP/barra e seleção pelo card. O `?` pequeno, completamente interno, abre o popover oficial compartilhado e explica valores normais/Mutados/reforçados. S.T.A.R.S. aparece sobre a região direita da arte principal, sem linha extra, e sua ajuda explica prioridade e troca por dano direto ao Nemesis (nunca aos zumbis). Repelidos têm retirada breve e somem; cadáveres ficam sem barra. Animações são pontuais por evento, sem replay em reload e com `prefers-reduced-motion`. Os retratos fornecidos foram conectados por entidade em `nemesis-agarrador.png`, `nemesis-infectado.png` e `nemesis-devorador.png`; seus arquivos originais são preservados, com apresentação 8:3 e `cover` natural sem distorção. Usa-se o retrato existente do Nemesis em `assets/images/boss-nemesis.png` e a moldura de Infecção existente, sem alterar sua barra.

Som de ganho: `assets/sfx/ganho-infeccao-nemesis.mp3`, registrado na infraestrutura central de áudio e no precache. Toca somente quando `changeNemesisInfection()` produz delta aplicado positivo, pelo evento de apresentação correspondente, sem reprodução dentro da função de estado. Bônus do Infectado/Horda/Ômega fazem parte do mesmo delta e não têm sons separados. Deduplicação por `actionId` impede replay de render/snapshot/Firebase/undo; eventos iniciais de reload, redução e +0 ficam silenciosos. Eventos lógicos distintos podem tocar separadamente.

INVADINDO não mostra HP de combate nem permite seleção. A arte principal do Nemesis seleciona `boss` com as mesmas permissões dos cards; chips e ajuda não trocam o alvo. Chips clicáveis mostram o efeito final: AGARRA 1/2/3, ALVO separado, INFECÇÃO +2/+4/+6 e CURA 20/35/50. Normal + Reforçado também é exibido corretamente (2/4/35). MUTADO explica a mudança base; REFORÇADO informa bônus e rodada final inclusiva no popover oficial.

Objetivos não precisam de plano viável para ser anunciados. O planner continua no BOT, no Laboratório ao executar sucesso e na proteção das travas do Agarrador, não como prova obrigatória da rotação. Tentáculo distingue jogo/descarte/falha; Barragem mantém três marcas e exigência de duas saídas; Extermínio mantém dano direto e contribuição do parceiro. Sem alvo obrigatório, a habilidade é inelegível; sem solução, pode ser sorteada e falhar. Pesos e consequências completas/parciais permanecem.

Derrota: somente `max_infection` mostra **Infecção Total**; falha do ataque final mostra **Nemesis sobreviveu**, exaustão mostra **Recursos esgotados**. Registro histórico da revisão de UX anterior: HP 2600, Infecção 0–100, S.T.A.R.S., redução 4/8/12 e regras dos demais chefes foram preservados naquela rodada; somente a expectativa obsoleta da Prisão no Espelho foi ajustada. A revisão posterior de durabilidade desta seção passa o HP do Nemesis a 2200, sem alterar as demais regras.

Teste manual simultâneo em dois clientes reais ainda é necessário para confirmar o transporte Firebase, o layout completo da mesa e o balanceamento. A matriz automatizada e os resultados estão em `docs/NEMESIS_IMPLEMENTACAO.md`.
# Regra global de recuperação da condição especial

Cumprir uma habilidade nunca reduz a condição especial de vitória do chefe. O sucesso apenas evita a punição. A recuperação concedida aos jogadores ocorre somente através das canastras aprovadas. Sucesso parcial evita apenas a punição correspondente. Vale para Dívida, Dominação, Flores, Sede, Mundo do Espelho, Infecção e recursos futuros, incluindo efeitos automáticos de habilidades. Somente gastos internos explicitamente aprovados do chefe são exceções, como Vinho Carmesim e Renascimento.

## Verificação técnica da suíte local — 06/10/2026

Os cenários sem alvo de Pesadelo Eterno, Laço do Tigre, Olho do Falcão, Mão no Espelho e Reflexo Invertido agora removem efetivamente seus alvos elegíveis, devolvendo as cartas ao monte sem alterar elegibilidade ou regras da partida. A canastra criada pelo DevTools de Dominação registra também `dominationTurnTracking`, como o fluxo normal, para impedir compra bônus duplicada ao reprocessar o mesmo turno após reload.

Os textos de Pólen do Lixo e do resumo de ameaça da Colheita foram alinhados aos valores já documentados nas seções 6.12/6.13: 30 / 50 / 80 HP. A mecânica não mudou. Extermínio S.T.A.R.S. teve somente sua consequência compacta encurtada para respeitar o orçamento existente do HUD; detalhes e punições permanecem intactos.

Execução, arquivos e classificação dos achados: `docs/LIMPEZA_SUITE_2026-10-06.md`.
