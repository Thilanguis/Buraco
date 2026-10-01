# DOCUMENTAÇÃO — CHEFE DA MESA

## Status da documentação

**Versão revisada contra o código atual — 29/09/2026.**

Esta documentação reúne o funcionamento geral do modo **Chefe da Mesa** e as regras aprovadas de:

- **O Banqueiro**;
- **A Dominadora**;
- **A Matriarca Esmeralda**;
- **Lady Dimitrescu**;
- **Rainha Nehelenia**.

Ela substitui as versões anteriores em que a Matriarca aparecia como planejada e em que as habilidades antigas da Dominadora e do Banqueiro ainda estavam descritas.

### Fonte de verdade atual

A rotação que vale no jogo é a registrada em:

- `js/boss/bosses/banker.js`;
- `js/boss/bosses/dominatrix.js`;
- `js/boss/bosses/matriarch.js`;
- `js/boss/bosses/dimitrescu.js`;
- `js/boss/bosses/nehelenia.js`;
- validações e resolução em `js/boss/boss-engine.js`.

O resumo enxuto e atualizado das habilidades ativas está em `docs/INVENTARIO_HABILIDADES_CHEFES.md`. O HUD da partida usa a mesma lista de definições do registro de chefes para exibir **Habilidades do chefe**, evitando manter uma segunda lista manual de nomes/fases na interface.

### Estado técnico da base revisada

A documentação não fixa mais uma contagem histórica de testes, porque a suíte evolui junto com o projeto. Alterações no modo Chefe devem ser validadas principalmente pelos testes `boss-*.test.mjs`, pelos testes de integração e por uma partida manual em dois clientes quando houver mudança de sincronização ou apresentação.

A auditoria funcional identificou comportamentos que também fazem parte da regra final descrita neste documento:

- Dívida máxima por Limite de Crédito encerra a partida imediatamente;
- Limite de Crédito conta apenas cartas originadas da mão;
- contribuições novas em jogo possuído causam dano individual normalmente;
- ordens de evolução e Interdito exigem evolução realmente possível;
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

O balão de quadrinho é reservado para:

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
Biel perdeu 1 Chicote
Raiz Faminta falhou: +1 Flor
Orvalho Restaurador: +60 HP
```

Feedback de bloqueio deve sempre identificar o efeito correto. Uma Semente da Matriarca não pode mostrar mensagem temática da Dominadora.

## 1.5 Evolução híbrida das fases

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
- Chicote;
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
500 + piso(25% da pontuação projetada da equipe)
```

Jogador Dominado causa apenas 65% da própria parcela do ataque final, conforme a regra da Dominadora.

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
💥 180   ⛓️ -1
```

Mostra Chicotes realmente removidos por Resistência através daquele jogo.

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
HP: 2500
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

Chefe de controle direto, ordens, Chicotes individuais e perda de eficiência.

> Obedecer reduz a eficiência. Desobedecer adiciona Chicote.

## 5.2 Vida e Chicotes

```text
HP: 2500
Chicotes por jogador: 0..4
```

| Chicotes | Estado       |
| -------: | ------------ |
|      0–2 | Normal       |
|        3 | Sob Controle |
|        4 | Dominado     |

Os dois jogadores com 4 causam derrota imediata.

## 5.3 Sob Controle

Com 3 Chicotes:

- não cria jogo novo;
- compra normalmente, salvo outro efeito;
- alimenta jogos;
- pode evoluir canastra e recuperar controle.

## 5.4 Dominado

Com 4 Chicotes:

- não pega lixo;
- não cria jogo novo;
- pode comprar do monte;
- alimenta jogos existentes;
- sofre redução no ataque final;
- permanece Dominado até remover Chicote.

## 5.5 Resistência

Somente produção de qualidade remove Chicote.

| Evolução              | Efeito                           |
| --------------------- | -------------------------------- |
| Canastra suja         | não remove                       |
| Canastra limpa        | qualifica remoção                |
| Evolução para real    | qualifica nova remoção histórica |
| Evolução para Ás-a-Ás | qualifica nova remoção histórica |

Regras:

- remove apenas do jogador responsável;
- no máximo um Chicote por jogador por rodada;
- se vários tiers forem alcançados na mesma rodada, registrar todos, mas remover apenas uma;
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
- se permanecer: +1 Chicote;
- se ficar impossível por mudança externa: cancelar.

## 5.8 Escolha Forçada

```text
id: forced_choice
peso: 5
fases: 1, 2 e 3
```

A versão antiga de comprar duas cartas foi removida.

Escolha imediata:

1. receber +1 Chicote; ou
2. aceitar uma ordem válida para o próximo turno.

Tipos permitidos:

```text
feed_specific_meld
no_new_meld
evolve_specific_meld
reduce_hand
discard_suit
```

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

- cancelar sem Chicote.

Se o jogador usar ou desperdiçar voluntariamente os recursos necessários:

- considerar desobediência.

Ao desobedecer:

- permitir a ação;
- aplicar +1 Chicote;
- encerrar a ordem.

## 5.9 Etiqueta de Ferro

```text
id: iron_etiquette
peso: 4
fases: 1, 2 e 3
```

A Dominadora ordena o naipe do descarte no próximo turno.

Elegibilidade:

- pelo menos duas cartas descartáveis do naipe;
- ao menos uma alternativa fora do naipe;
- cumprimento legal no Buraco Fechado;
- sem ordem incompatível.

Usar somente naipe.

Se cumprir:

- sucesso;
- nenhum Chicote.

Se descartar outro naipe possuindo opção válida:

- permitir;
- +1 Chicote.

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

- troca uma carta válida entre jogadores;
- destaca as duas antes da troca;
- anima movimentos simultâneos;
- atualiza mãos depois;
- marca e identifica a carta recebida;
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

Durante a rodada, a equipe inteira cria no máximo um jogo novo.

- o primeiro jogo consome a disponibilidade;
- ambos alimentam jogos existentes;
- HUD indica disponibilidade e quem consumiu;
- Voltar restaura o consumo;
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

- nas Fases 1–2, a protegida perde 1 Chicote e a punida recebe 1;
- na Fase 3, a favorita não perde Chicote e somente a outra recebe +1;
- respeita limites;
- aplica uma vez.

## 5.15 Transbordamento na Fase 3

Somente na Fase 3:

- alvo em 4 receberia Chicote;
- o Chicote vai ao parceiro;
- não ultrapassa 4;
- preserva origem;
- feedback identifica o transbordamento;
- snapshot não duplica.

## 5.16 Habilidades da Fase 3

### Dupla Coleira

Uma carta de cada jogador fica presa.

### Separação

O parceiro não alimenta jogo já alimentado pelo outro na rodada.

### Controle Absoluto

Alvo é tratado como Dominado no próximo turno.

### Quebra de Vontade

Jogador com pelo menos 2 Chicotes escolhe entre Chicote ou retirar carta válida de canastra.

### Ordem Final

Na Fase 3, a Dominadora marca **2 cartas da própria mão de cada cooperador**. As duas escolhas são simétricas e a partida permanece bloqueada até ambos responderem.

Cada jogador vê exatamente quais são suas duas cartas marcadas e escolhe individualmente entre:

- **receber 1 Chicote imediatamente** e recusar a ordem; ou
- **aceitar a Ordem Final** e tentar colocar as 2 cartas marcadas em jogos no próximo turno.

Se aceitar:

- 2/2 cartas usadas em jogos: **0 Chicotes**;
- 1/2 carta usada: **+1 Chicote**;
- 0/2 cartas usadas: **+2 Chicotes**.

Descartar uma carta marcada não cumpre a ordem. As cartas ficam identificadas visualmente como **ORDEM FINAL** enquanto a decisão estiver pendente e, após aceitar, até o prazo do turno.

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
| 1    |               150 |
| 2    |               220 |
| 3    |               300 |

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

### Fases 1 e 2

| Cartas novas colocadas legalmente | Cura prevista |
| --------------------------------: | ------------: |
| 0–1                               |        150 HP |
| 2–3                               |        100 HP |
| 4–5                               |         50 HP |
| 6+                                |          0 HP |

### Fase 3

| Cartas novas colocadas legalmente | Cura prevista |
| --------------------------------: | ------------: |
| 0–1                               |        180 HP |
| 2–3                               |        120 HP |
| 4–5                               |         60 HP |
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
- falhou: +1 Flor, sem cura.

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
1 lado: +1 Flor
0 lados: +2 Flores e propagação
```

Não cura.

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
cura 40 HP
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
|                   8–10 | cura 60            |
|                    11+ | cura 100 e +1 Flor |

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

Cada objetivo falho:

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

Uma vez por partida:

- Fase 3;
- HP chega a zero;
- pelo menos 3 Flores;
- consome 3;
- HP vira 300;
- marca `rebirthUsed`;
- continua a partida.

Sem 3 Flores, derrota normal.

Funciona no ataque final.

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

## 7.1 Identidade

Chefe vampírica de pressão progressiva. A **Sede de Sangue** não funciona apenas como uma barra de derrota: ela também é combustível para cura e proteção, o que diferencia a Dimitrescu do Banqueiro. Usa a mesa e o baralho `resident`.

```text
HP: 2300
Sede de Sangue: 0..100
```

A equipe perde imediatamente se a Sede chegar a **100**. Se os recursos da partida acabarem e Lady Dimitrescu ainda estiver viva, ela também vence.

## 7.2 Redução de Sede

Evoluções de canastra removem Sede apenas quando o jogo alcança um tier novo:

| Evolução | Sede removida |
|---|---:|
| Simples / Suja | 0 |
| Limpa | 4 |
| Real | 8 |
| Ás-a-Ás | 12 |

A Sede também pode cair ao cumprir objetivos das filhas, romper a Marca Carmesim ou destruir o Coágulo Carmesim.

## 7.3 Fases

| Fase | Nome | Identidade |
|---:|---|---|
| 1 | A Caçada | Bela caça cartas; Lady cobra sangue, marca vítimas e pode gastar Sede para se curar |
| 2 | As Filhas | Cassandra passa a atacar jogos e o Morto; Daniela contamina o lixo; o Coágulo cria proteção |
| 3 | Banquete Carmesim | as três filhas podem agir juntas e Lady combina bloqueio, cura e defesa vampírica |

## 7.4 Caçada de Bela

```text
id: bela_hunt
peso: 5
fases: 1, 2 e 3
```

Bela marca **uma carta exata** de um cooperador; somente essa carta recebe a mancha de sangue da Caçada.

- usar a carta legalmente até o fim do turno: **Sede -3**;
- falhar nas Fases 1–2: **Sede +14**;
- falhar na Fase 3: **Sede +16**.

## 7.5 Tributo de Sangue

```text
id: blood_tithe
peso: 4
fases: 1, 2 e 3
```

No fechamento da rodada, cada mão é avaliada separadamente:

| Cartas na mão | Fases 1–2 | Fase 3 |
|---:|---:|---:|
| 0–7 | +0 | +0 |
| 8–10 | +4 | +6 |
| 11+ | +8 | +10 |

## 7.6 Vinho Carmesim

```text
id: red_wine
peso: 2
fases: 1, 2 e 3
```

Elegível quando Lady está ferida e possui Sede suficiente. Ela **consome 15 de Sede** para se regenerar:

- Fase 1: até **140 HP**;
- Fase 2: até **200 HP**;
- Fase 3: até **260 HP**.

A cura deixa de ser gratuita: o jogador pode ver a Sede cair, mas em troca a luta é prolongada.

## 7.7 Marca Carmesim

```text
id: crimson_brand
peso: 4
fases: 1, 2 e 3
```

Lady marca uma carta jogável de **cada cooperador**. O HUD usa o mesmo padrão amarelo de objetivos múltiplos já adotado pelos outros chefes e mostra cada marca separadamente.

- cada carta marcada usada legalmente: **Sede -2**;
- cada marca que sobreviver à rodada: **Sede +7** nas Fases 1–2 ou **+9** na Fase 3.

A Marca Carmesim usa uma mancha de sangue diferente da Caçada de Bela para que as duas mecânicas sejam reconhecíveis visualmente.

## 7.8 Banquete de Cassandra

```text
id: cassandra_feast
peso: 5
fases: 2 e 3
```

Cassandra marca um jogo existente e ele recebe uma moldura/mancha própria de sangue.

- alimentar o jogo na rodada: **Sede -4**;
- falhar na Fase 2: **Sede +16**;
- falhar na Fase 3: **Sede +18**.

## 7.9 Banquete dos Mortos

```text
id: cassandra_dead_feast
peso: 3
fases: 2 e 3
```

Cassandra profana o próximo Morto disponível. A maldição permanece visível no próprio monte do Morto até ele ser tomado.

Quando o Morto profanado é conquistado:

- Fase 2: **Sede +12** e Lady cura até **90 HP**;
- Fase 3: **Sede +16** e Lady cura até **130 HP**;
- se a equipe já possui Canastra **Real ou Ás-a-Ás**, o Morto é purificado: apenas **Sede +4** e a cura é anulada.

## 7.10 Enxame de Daniela

```text
id: daniela_swarm
peso: 4
fases: 2 e 3
```

Daniela contamina **uma carta real do lixo**. A pilha e a própria carta-alvo recebem sangue visual quando ela está no topo.

- evitar o lixo durante a rodada: **Sede -3**;
- retirar o lixo na Fase 2: **Sede +12**;
- retirar o lixo na Fase 3: **Sede +15**.

## 7.11 Coágulo Carmesim

```text
id: crimson_clot
peso: 3
fases: 2 e 3
```

Lady solidifica o sangue em uma proteção própria, distinta do Casulo da Matriarca:

- Fase 2: **180** de proteção;
- Fase 3: **260** de proteção;
- o dano atinge primeiro o Coágulo;
- romper o Coágulo: **Sede -6**;
- se ele sobreviver até o fim da rodada, **50% da proteção restante vira cura**.

O HUD reutiliza a área de proteção, mas com identidade visual de sangue/coágulo e estados de integridade próprios.

## 7.12 Portas do Castelo

```text
id: castle_lockdown
peso: 3
fase: 3
```

Bloqueia o lixo durante toda a rodada. Os cooperadores precisam comprar do monte até o efeito terminar.

## 7.13 As Três Filhas

```text
id: three_daughters
peso: 5
fase: 3
```

Cria até três objetivos válidos, um por filha:

- **Bela:** usar a carta marcada;
- **Cassandra:** alimentar o jogo marcado;
- **Daniela:** evitar a carta contaminada do lixo.

O HUD lista cada objetivo numa linha separada com o padrão de feedback amarelo (`☐`, `☑`, `✕`). Os retratos de Bela, Cassandra e Daniela aparecem simultaneamente e mudam de estado conforme cada objetivo é concluído ou falha.

No fechamento:

- cada objetivo cumprido: **Sede -2**;
- cada objetivo falho: **Sede +8**.

## 7.14 Filhas, marcas de sangue e áudio

Lady permanece no retrato principal. Bela, Cassandra e Daniela aparecem em uma faixa independente sob o HUD, em três posições fixas de 1/3 da largura. Cada filha aparece somente quando participa da habilidade ativa ou de um efeito persistente ligado a ela.

Os retratos preservam proporção com `object-fit: cover`: **184×116** no desktop, **134×86** em tablet e **112×76** no mobile. Estados: ativa em amarelo, concluída em verde e falha em vermelho.

A linguagem visual de sangue é aplicada ao **alvo real**, não à zona inteira: carta de Bela, carta da Marca Carmesim, jogo de Cassandra, carta contaminada de Daniela e Morto profanado. A barra de Sede usa bordô/vinho escuro com textura e gotas em CSS; animações pesadas ficam desativadas em touch e `prefers-reduced-motion`.

O áudio `ganho-sangue-dimitresco.mp3` toca sempre que a Sede aumenta. A risada eventual da Dimitrescu continua reservada para uma implementação futura.

## 7.15 Habilidades e pesos

| Habilidade | Peso | Fases |
|---|---:|---|
| Caçada de Bela | 5 | 1, 2 e 3 |
| Tributo de Sangue | 4 | 1, 2 e 3 |
| Vinho Carmesim | 2 | 1, 2 e 3 |
| Marca Carmesim | 4 | 1, 2 e 3 |
| Banquete de Cassandra | 5 | 2 e 3 |
| Banquete dos Mortos | 3 | 2 e 3 |
| Enxame de Daniela | 4 | 2 e 3 |
| Coágulo Carmesim | 3 | 2 e 3 |
| Portas do Castelo | 3 | 3 |
| As Três Filhas | 5 | 3 |

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
- Chicotes em 3/3, 4/2, 4/3 e 4/4;
- Etiqueta;
- Interdito;
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

- carta exata marcada pela Caçada de Bela;
- as duas cartas da Marca Carmesim;
- jogo marcado por Cassandra;
- risco do Morto profanado;
- evitar o lixo durante Daniela;
- objetivos correspondentes em `As Três Filhas`;
- urgência maior quando a Sede chega a 75 ou mais e quando o Coágulo está ativo.

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

- Chicotes de cada jogador;
- estado Normal, Sob Controle ou Dominado;
- ordem ativa;
- Etiqueta;
- Interdito;
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
- marca de Cassandra no jogo e no Morto profanado;
- contaminação de Daniela na carta real do lixo;
- Coágulo Carmesim e proteção restante;
- faixa contextual das filhas sob o HUD, com estado por objetivo;
- barra de Sede visualmente distinta da barra de HP.

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
- Interdito;
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
- estado contextual da faixa das filhas;
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
- Chicote;
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

| Característica | Banqueiro | Dominadora | Matriarca | Lady Dimitrescu | Rainha Nehelenia |
|---|---|---|---|---|---|
| HP | 2500 | 2500 | 2000 | 2300 | 2400 |
| Perigo | Dívida coletiva | Chicotes individuais | Florescimento | Sede de Sangue | Espelho Negro |
| Derrota especial | Dívida 100 | ambos com 4 Chicotes | 5 Flores | Sede 100 | 6 Fragmentos |
| Pressão | preços e recursos | ordens e eficiência | ameaças e propagação | sangue como recurso, filhas, cura e proteção | reflexos, simetria e dano aprisionado |
| Recuperação da equipe | redução de Dívida | Resistência | poda por evolução | redução de Sede por canastra | Limpa/Real/Ás-a-Ás quebram Fragmentos |
| Compra/lixo | Cofre, Tarifa, Bloqueio, Ágio | Chicotes e controle | Pólen | Daniela, Morto profanado e Portas do Castelo | Espelho do Lixo |
| Jogos | Penhora e Limite | Posse e Mãos Atadas | Raiz, Enxerto, Casulo | Banquete de Cassandra, Coágulo e Marca Carmesim | Labirinto, Reflexo Invertido e Eclipse |

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

## 15.2 Vida e os 5 Espelhos dos Sonhos

```text
HP: 2400
Espelhos tomados: ◇ ◇ ◇ ◇ ◇
```

Cada punição relevante pode entregar **1 Espelho dos Sonhos** a Nehelenia.

- `0/5` a `4/5`: a batalha continua;
- `3/5` ou mais: o HUD entra em pressão visual de **Mundo do Espelho**;
- `5/5`: derrota imediata — Nehelenia fecha a equipe dentro do Mundo do Espelho.

O recurso é coletivo, mas o motor registra qual jogador originou cada ganho para feedback e compatibilidade.

Uma evolução que alcance **Canastra Limpa ou superior** recupera 1 Espelho, se existir algum tomado. A redução continua incremental por novo tier de canastra.

## 15.3 Fases

- Fase 1 — **Espelhos dos Sonhos**;
- Fase 2 — **Circo da Lua Morta**;
- Fase 3 — **Pesadelo Eterno**.

## 15.4 Rotação ativa V6

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

Ignorar a ilusão até o fim do turno entrega +1 Espelho a Nehelenia.

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

- contam todas as cartas colocadas legalmente na mesa pelo primeiro jogador;
- o padrão é fechado somente quando o turno dele termina;
- o segundo jogador **não é bloqueado** por tentar passar do número;
- ao fim do segundo turno, compara-se o total;
- `segundo == padrão` = sucesso;
- qualquer diferença, para mais ou para menos, = **+1 Espelho**.

### Espelho do Lixo

O topo real do lixo é duplicado em **dois reflexos visualmente idênticos**.

- ambos mostram a mesma carta;
- não existe `X`, rachadura seletiva, brilho diferente ou qualquer pista;
- a resposta é deliberadamente **50/50**;
- acerto mantém o lixo disponível;
- erro sela o lixo durante a rodada.

O bot também não recebe a resposta secreta: escolhe um dos dois reflexos de forma determinística, mas sem consultar `correctOption`.

### Prisão no Espelho

Só é elegível quando Nehelenia já tomou ao menos 1 Espelho e o parceiro possui uma jogada legal para um jogo existente.

- alimentar o jogo refletido recupera 1 Espelho;
- falhar mantém o Espelho com Nehelenia.

### Pesadelo Eterno

A habilidade usa um **shell game visual**:

1. uma carta aparece sozinha como **ORIGINAL**;
2. dois reflexos idênticos nascem da original;
3. o rótulo `ORIGINAL` desaparece;
4. os três espelhos cruzam várias vezes;
5. somente depois do embaralhamento os três ficam clicáveis.

Todos mostram a mesma carta e nenhum recebe `X` ou pista falsa automática. O desafio é acompanhar a posição da carta original durante a animação.

- acerto: a ilusão quebra;
- erro: +1 Espelho;
- se isso alcançar `5/5`, o Mundo do Espelho encerra a batalha.

## 15.5 Feedback visual

- cinco pequenos espelhos ornamentados ficam visíveis no HUD;
- espelhos tomados ficam rachados/avermelhados;
- em `3/5` ou `4/5`, o retrato entra em pressão de Mundo do Espelho;
- o Jogo Espelhado usa duas instâncias de tamanho normal dentro do `meld-container`;
- a cópia nasce com clarão e os dois jogos cruzam antes de parar;
- o Espelho do Lixo usa dois espelhos centrais idênticos;
- o Pesadelo Eterno usa um palco central com ORIGINAL → dois reflexos → embaralhamento;
- clones visuais nunca entram no estado real da canastra, não causam dano e não mudam a estrutura global dos jogos;
- animações respeitam `prefers-reduced-motion`.

## 15.6 Direção de design

Novas habilidades da Nehelenia devem priorizar **enganação visual, memória, leitura da mesa e distorção da interface física do jogo**. Evitar cura, escudo, absorção de dano ou objetivos que sejam apenas versões renomeadas de outros chefes.
