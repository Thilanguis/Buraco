# DOCUMENTAÇÃO — CHEFE DA MESA

## Status da documentação

**Versão consolidada de regras funcionais — 17/07/2026.**

Esta documentação reúne o funcionamento geral do modo **Chefe da Mesa** e as regras aprovadas de:

- **O Banqueiro**;
- **A Dominadora**;
- **A Matriarca Esmeralda**.

Ela substitui as versões anteriores em que a Matriarca aparecia como planejada e em que as habilidades antigas da Dominadora e do Banqueiro ainda estavam descritas.

### Estado técnico da base revisada

No pacote `Buraco(17)`:

```text
152 testes executados
152 testes aprovados
9 arquivos JavaScript validados por sintaxe
```

A auditoria posterior identificou comportamentos que também fazem parte da regra final descrita neste documento:

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
Auditoria concluída: Dívida -5
Biel perdeu 1 Chicote
Raiz Faminta falhou: +1 Flor
Orvalho Restaurador: +60 HP
```

Feedback de bloqueio deve sempre identificar o efeito correto. Uma Semente da Matriarca não pode mostrar mensagem temática da Dominadora.

## 1.5 Evolução híbrida das fases

A fase avança ao cumprir **qualquer** condição.

| Fase | Condições |
|---|---|
| Fase 1 | início |
| Fase 2 | primeiro morto, monte com 40 ou menos, ou HP em 70% ou menos |
| Fase 3 | segundo morto, monte com 18 ou menos, ou HP em 35% ou menos |

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

| Carta | Dano |
|---|---:|
| 3 a 7 | 5 |
| 8 a K | 10 |
| Ás e 2 | 15 |
| Coringa | 20 |

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

| Tipo | Dano total reconhecido |
|---|---:|
| Jogo simples | 0 |
| Canastra suja | 100 |
| Canastra limpa | 180 |
| Canastra real | 300 |
| Ás-a-Ás | 450 |

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
  matriarchBloomRemoved
}
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

| Conquista | Redução |
|---|---:|
| Canastra limpa | 4 |
| Canastra real | 8 |
| Ás-a-Ás | 12 |
| Morto retirado | 5 |

Cada tier contribui somente uma vez.

## 4.4 Juros Fixos

```text
id: fixed_interest
peso: 5
fases: 1, 2 e 3
```

Ao selecionar a habilidade, o motor sorteia um contrato fechado.

### Fases 1 e 2

| Contrato | Sem Garantia | Com Garantia | Chance |
|---|---:|---:|---:|
| Brando | +5 | +2 | 25% |
| Padrão | +6 | +3 | 50% |
| Severo | +7 | +4 | 25% |

### Fase 3

| Contrato | Sem Garantia | Com Garantia | Chance |
|---|---:|---:|---:|
| Brando | +7 | +4 | 25% |
| Padrão | +8 | +5 | 50% |
| Severo | +9 | +6 | 25% |

Regras:

- os dois valores são sorteados como um pacote;
- o jogador conhece ambos antes de escolher;
- usar sorteio determinístico;
- contrato persiste em snapshot e reload;
- Voltar não sorteia novamente;
- humano, bot e observador veem o mesmo contrato.

Persistência:

```js
currentIntent.payload.contractTier
currentIntent.payload.fullDebt
currentIntent.payload.guaranteedDebt
currentIntent.payload.rollEventId
```

### Garantia e Cofre

- escolhe um fiador elegível;
- envia uma carta válida ao Cofre;
- cada jogador possui no máximo uma carta no Cofre;
- com os dois Cofres ocupados, Garantia fica indisponível;
- a carta não vai ao monte nem ao lixo.

No próximo turno do dono:

- compra do monte e lixo ficam bloqueadas;
- a compra obrigatória é resgatar o Cofre;
- o resgate substitui a compra normal;
- depois do resgate, o turno continua;
- o bot resgata automaticamente.

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

- pode ser jogada ou descartada;
- permanece marcada durante o turno;
- se continuar na mão:
  - Fases 1 e 2: Dívida +3;
  - Fase 3: Dívida +4;
- perde a marca ao usar, descartar ou cobrar;
- nunca é cobrada duas vezes.

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
|---|---:|---:|---:|
| 1 | 7 | +1 | +4 |
| 2 | 6 | +1 | +5 |
| 3 | 5 | +1 | +6 |

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
creditEligibleCardIds
cardOriginsById
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
CRÉDITO 5/7
Próxima excedente: +1 Dívida
Cobrança: 2/4
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
Fase 2: +4 Dívida
Fase 3: +6 Dívida
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

| Fase | Exigência | Sucesso | Falha |
|---|---:|---:|---:|
| 2 | 3 cartas | Dívida -5 | Dívida +10 |
| 3 | 4 cartas | Dívida -5 | Dívida +12 |

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

Fórmula atual:

```text
mínimo de 12, calculado por 4 + piso(total das mãos / 4)
```

A habilidade já varia naturalmente pelo tamanho das mãos e não recebe randomização adicional.

## 4.12 Habilidades e pesos

| Habilidade | Peso | Fases |
|---|---:|---|
| Juros Fixos | 5 | 1, 2 e 3 |
| Tarifa de Manutenção | 3 | 1, 2 e 3 |
| Bloqueio de Crédito | 3 | 1, 2 e 3 |
| Limite de Crédito | 4 | 1, 2 e 3 |
| Auditoria de Naipe | 4 | 2 e 3 |
| Penhora | 2 | 2 e 3 |
| Juros Compostos | 4 | 2 e 3 |
| Ágio do Lixo | 3 | 2 e 3 |

---

# 5. A Dominadora

## 5.1 Identidade

Chefe de controle direto, ordens, Chicotes individuais e perda de eficiência.

> Obedecer reduz a eficiência. Desobedecer adiciona Chicote.

## 5.2 Vida e Chicotes

```text
HP: 2100
Chicotes por jogador: 0..4
```

| Chicotes | Estado |
|---:|---|
| 0–2 | Normal |
| 3 | Sob Controle |
| 4 | Dominado |

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

| Evolução | Efeito |
|---|---|
| Canastra suja | não remove |
| Canastra limpa | qualifica remoção |
| Evolução para real | qualifica nova remoção histórica |
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
peso: 3
fases: 1 e 2
```

- marca carta com jogada legal;
- pode ser jogada;
- não pode ser descartada;
- se permanecer: +1 Chicote;
- se ficar impossível por mudança externa: cancelar.

## 5.8 Escolha Forçada

```text
id: forced_choice
peso: 4
fases: 1 e 2
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
fases: 1 e 2
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
boss.possessions[meldId].contributorPlayerIds
boss.possessions[meldId].createdTier
boss.possessions[meldId].releasedEventId
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
peso: 3
fases: 2 e 3
```

- protegida perde 1 Chicote;
- punida recebe 1;
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

Ao fim da rodada, cada cooperador recebe uma decisão diferente e a partida permanece bloqueada até as duas respostas:

- um cooperador escolhe entre comprar 2 cartas extras, que ficam presas durante o próximo turno completo, ou receber 1 Chicote;
- o outro escolhe entre deixar 1 carta aleatória da própria mão presa durante o próximo turno completo ou receber 1 Chicote.

A carta presa deve ser identificada no HUD, na mão e no histórico. Depois das duas decisões, a partida continua normalmente.

**Hierarquia não faz parte do jogo e não deve ser registrada.**

## 5.17 Habilidades e pesos

| Habilidade | Peso | Fases |
|---|---:|---|
| Coleira | 5 | 1 e 2 |
| Escolha Forçada | 4 | 1 e 2 |
| Exposição | 3 | 1 e 2 |
| Etiqueta de Ferro | 4 | 1 e 2 |
| Troca Forçada | 4 | 2 e 3 |
| Mãos Atadas | 4 | 2 e 3 |
| Posse | 3 | 2 e 3 |
| Interdito (desativado) | — | — |
| Favorita | 3 | 2 e 3 |
| Dupla Coleira | 5 | 3 |
| Separação | 4 | 3 |
| Controle Absoluto | 3 | 3 |
| Quebra de Vontade | 3 | 3 |
| Ordem Final | 2 | 3 |

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

| Evolução | Remoção |
|---|---:|
| Canastra limpa | 1 |
| Evolução para real | +1 |
| Evolução para Ás-a-Ás | +1 |

- cada tier remove uma vez por `meldId`;
- dano individual não remove;
- marcador 🌸 acumula apenas remoção real;
- reload não duplica.

## 6.4 Limites de cura

| Fase | Máximo por rodada |
|---|---:|
| 1 | 150 |
| 2 | 220 |
| 3 | 300 |

O contador zera na virada efetiva da rodada.

Florescimento não é limitado pela cura.

## 6.5 Ameaças persistentes

Limites:

| Fase | Ameaças |
|---|---:|
| 1 | 1 |
| 2 | 2 |
| 3 | 3 |

Estado mínimo:

```js
{
  id,
  type,
  targetPlayerId,
  cardId,
  meldId,
  secondMeldId,
  discardCardId,
  createdRound,
  deadlineRound,
  deadlinePlayerId,
  healAmount,
  bloomAmount,
  status,
  resolvedEventId
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
- origem aparece no HUD.

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

| Fase | Cura base |
|---|---:|
| 1 | 150 |
| 2 | 180 |
| 3 | 220 |

Cada carta nova da mão colocada legalmente reduz 15.

- cada ID uma vez;
- mínimo zero;
- reorganização não conta;
- Coringa reposicionado não conta;
- HUD mostra cura prevista;
- não gera Flor.

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

- guarda ID do topo;
- se o lixo for pego, a carta deve ser usada no turno;
- não pode ser descartada;
- se ficar impossível por mudança externa, cancelar.

Falha normal:

```text
+1 Flor
cura 40 HP
```

Se topo mudar sem entrar em mão:

- cancelar.

No subtipo Pólen de Florescimento Real:

- não cura.

O bot não evita automaticamente. Avalia:

- uso legal imediato;
- valor do lixo;
- Florescimento atual;
- alternativa do monte.

## 6.13 Colheita

```text
id: harvest
peso: 2
fases: 2 e 3
```

| Cartas ao fim do turno | Efeito |
|---:|---|
| 0–7 | nada |
| 8–10 | cura 60 |
| 11+ | cura 100 e +1 Flor |

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

| Habilidade | Peso | Fases |
|---|---:|---|
| Semente Viva | 5 | 1, 2 e 3 |
| Raiz Faminta | 5 | 1, 2 e 3 |
| Orvalho Restaurador | 3 | 1, 2 e 3 |
| Trepadeiras Gêmeas | 4 | 2 e 3 |
| Enxerto | 3 | 2 e 3 |
| Pólen do Lixo | 3 | 2 e 3 |
| Colheita | 2 | 2 e 3 |
| Florescimento Real | 4 | 3 |
| Casulo Esmeralda | 3 | 3 |
| Coroa da Primavera | 3 | 3 |

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

# 7. Bot

## 7.1 Regras gerais

O bot:

- utiliza apenas informação permitida;
- não conhece mão secreta humana;
- usa validação oficial;
- possui fallback legal;
- não cria soft lock;
- considera condição especial e fim do monte.

## 7.2 Banqueiro

Avalia:

- contrato de Juros Fixos;
- valor da Garantia;
- risco de Dívida;
- custo do Limite de Crédito;
- valor do Ágio;
- dano e evolução;
- urgência.

Não rejeita custo apenas quando letal; compara utilidade real.

## 7.3 Dominadora

Avalia:

- custo de obedecer;
- Chicotes em 3/3, 4/2, 4/3 e 4/4;
- Etiqueta;
- Interdito;
- Posse coordenada;
- Mãos Atadas compartilhada.

## 7.4 Matriarca

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

---

# 8. HUD e identidade visual

## 8.1 HUD compacto

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

Detalhes extensos ficam recolhidos.

## 8.2 Banqueiro

Mostrar:

- Dívida;
- contrato;
- Cofres;
- Cartas Financiadas;
- Limite de Crédito;
- Ágio.

## 8.3 Dominadora

Mostrar:

- Chicotes de cada jogador;
- estado Normal, Sob Controle ou Dominado;
- ordem ativa;
- Etiqueta;
- Interdito;
- disponibilidade de Mãos Atadas;
- contribuições de Posse.

## 8.4 Matriarca

Mostrar:

- Florescimento 0/5;
- cinco flores;
- ameaças;
- prazos;
- consequência;
- cura prevista;
- Casulo;
- Raiz Fortalecida e contribuições.

## 8.5 Animações

Toda animação depende de evento, não de render.

Não repetir em:

- snapshot;
- reload;
- reorganização;
- render completo.

Sem animação contínua.

Touch, tablet e `prefers-reduced-motion` usam fades curtos.

---

# 9. Persistência, sincronização e Voltar

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
- IDs de eventos.

## 9.1 Autoridade

- um cliente aplica efeitos;
- observador não executa;
- todos veem o mesmo estado público;
- mãos secretas permanecem secretas.

## 9.2 Idempotência

Snapshot não duplica:

- dano;
- cura;
- Dívida;
- Chicote;
- Flor;
- propagação;
- contribuições;
- sorteio;
- animação.

## 9.3 Voltar

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

# 10. Segurança e soft lock

O sistema deve impedir ou cancelar com segurança:

- mão sem descarte legal;
- carta bloqueada justificando lixo;
- ameaça sem alvo;
- ordem impossível;
- Interdito irrelevante;
- Cofre inválido;
- Posse fantasma;
- ameaça da Matriarca impossível;
- prazo resolvido antecipadamente;
- escolha perdida em reload;
- evento duplicado;
- observador aplicando efeito;
- bot sem fallback.

Mudança externa cancela somente o efeito afetado, sem punição indevida.

---

# 11. Tablet, desempenho e acessibilidade

Em touch, tablet e `prefers-reduced-motion`:

- `#gameSection::before` e `::after` permanecem desativados quando aplicável;
- fundo temático fica estático;
- sem brilho pulsante;
- sem flash branco;
- sem estroboscópio;
- partículas são removidas ou reduzidas;
- números e rótulos continuam completos;
- controles continuam acessíveis.

---

# 12. Comparação dos chefes

| Característica | Banqueiro | Dominadora | Matriarca |
|---|---|---|---|
| HP | 2500 | 2100 | 2000 |
| Perigo | Dívida coletiva | Chicotes individuais | Florescimento |
| Derrota | Dívida 100 | ambos com 4 | 5 Flores |
| Pressão | preços e recursos | ordens e eficiência | ameaças e propagação |
| Recuperação da equipe | redução de Dívida | Resistência | poda por evolução |
| Compra/lixo | Cofre, Tarifa, Bloqueio, Ágio | Chicotes e controle | Pólen |
| Jogos | Penhora e Limite | Posse, Mãos Atadas, Interdito | Raiz, Enxerto, Casulo |

---

# 13. Testes e validação

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
- marcadores.

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
