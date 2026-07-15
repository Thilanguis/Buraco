# Documentação — Chefe da Mesa

## Status do documento

Esta é a **especificação oficial aprovada** do modo Chefe da Mesa após o pacote de balanceamento solicitado ao Codex.

Ela descreve como o sistema deve ficar. O ZIP final ainda precisa ser revisado para confirmar:

- se todas as regras foram implementadas exatamente como descritas;
- nomes reais dos campos e estados persistidos;
- total final de testes;
- comportamento em recarregamento e entre dois clientes;
- eventuais diferenças técnicas introduzidas pelo Codex.

---

# 1. Estrutura geral

## 1.1 Partida

- Dois jogadores cooperam contra um chefe.
- Humanos e bots podem ocupar as vagas.
- Apostas ficam desativadas.
- A equipe utiliza dois mortos.
- Toda partida contra chefe usa obrigatoriamente **Buraco Fechado**.
- O chefe possui HP, fases, habilidades e uma condição especial de derrota.

## 1.2 Objetivo

A equipe vence ao reduzir o HP do chefe a zero.

O chefe vence quando ocorre uma destas condições:

- sua condição especial de derrota é atingida;
- ele sobrevive ao ataque final;
- os recursos da partida acabam e ele permanece vivo.

## 1.3 Turno do chefe

Toda rodada começa com o chefe agindo antes dos cooperadores, inclusive na Rodada 1.

Fluxo:

1. resultado anterior aparece como aviso pequeno, quando existir;
2. mudança de fase é anunciada, quando existir;
3. o chefe faz uma provocação da nova fase;
4. a nova habilidade é anunciada em balão de quadrinho;
5. efeitos imediatos ou escolhas obrigatórias são aplicados;
6. somente depois os jogadores recebem o turno.

Durante o turno do chefe:

- controles ficam bloqueados;
- bot e cronômetro ficam pausados;
- apenas o cliente responsável altera o estado;
- os demais clientes reproduzem a apresentação sem duplicar efeitos.

## 1.4 Diálogos

O balão de quadrinho é usado para:

- primeira habilidade da partida;
- nova habilidade;
- anúncio de fase;
- provocação de fase;
- fala final de vitória ou derrota.

Resultados já encerrados usam apenas toast ou histórico, por exemplo:

- `Auditoria concluída: Dívida -5`;
- `Bloqueio de Crédito encerrado`;
- `Biel perdeu 1 Corrente`.

O balão nunca deve misturar a habilidade anterior com a atual.

## 1.5 Fases

As fases dependem dos mortos e da quantidade de cartas no monte, não do HP.

| Fase | Entrada |
|---|---|
| Fase 1 | início da partida |
| Fase 2 | primeiro morto retirado ou monte com 40 cartas ou menos |
| Fase 3 | segundo morto retirado ou monte com 18 cartas ou menos |

A fase nunca regride.

A primeira habilidade de uma nova fase prioriza habilidades introduzidas naquela fase. Se nenhuma estiver elegível, o motor usa um fallback seguro.

## 1.6 Buraco Fechado

Nos modos de chefe:

- `variant = fechado` é forçado no início e salvo no estado;
- reinício, revanche e recarregamento preservam a variante;
- cartas bloqueadas não podem justificar a retirada do lixo;
- uma tentativa inválida não altera mão, lixo ou jogos;
- bots usam a lógica de compra do Buraco Fechado.

---

# 2. Dano contra os chefes

## 2.1 Dano de canastras

| Tipo | Dano total reconhecido |
|---|---:|
| Jogo simples | 0 |
| Canastra suja | 100 |
| Canastra limpa | 180 |
| Canastra real | 300 |
| Ás-a-Ás | 450 |

O dano é incremental e idempotente.

Exemplo: uma canastra que já causou 100 como suja causa somente mais 80 ao virar limpa.

## 2.2 Ataque final

```text
500 + piso(25% da pontuação projetada da equipe)
```

Se o ataque final zerar o HP, a equipe vence. Caso contrário, perde.

Um jogador Dominado pela Dominadora causa apenas 65% do ataque final, conforme a regra atual.

## 2.3 Reações ao dano

O chefe pode reagir com uma fala curta ao receber dano relevante.

- não bloqueia os controles;
- não substitui a habilidade ativa;
- ocorre no máximo uma vez por rodada;
- usa a personalidade do chefe.

---

# 3. O Banqueiro

## 3.1 Identidade

Chefe de desgaste econômico e controle de recursos.

Pressiona por meio de:

- Dívida coletiva;
- compras adicionais;
- bloqueio do lixo;
- Penhora;
- mãos grandes;
- perda de eficiência de compra.

## 3.2 Vida e condição especial

- **HP:** 2.200
- **Dívida coletiva:** 0 a 100
- A equipe perde imediatamente se a Dívida chegar a 100.

## 3.3 Redução de Dívida

| Conquista | Redução |
|---|---:|
| Canastra limpa | 4 |
| Canastra real | 8 |
| Ás-a-Ás | 12 |
| Morto retirado | 5 |

Cada alteração deve informar sua origem.

Exemplos:

- `Morto conquistado: Dívida -5`;
- `Canastra limpa: Dívida -4`;
- `Auditoria concluída: Dívida -5`.

## 3.4 Fase 1 — Crédito Fácil

### Juros Fixos

Valores:

- Fases 1 e 2: `Dívida +6`;
- Fase 3: `Dívida +8`.

A cobrança cria uma escolha obrigatória imediata para a equipe.

#### Aceitar a cobrança

- recebe o valor completo.

#### Dar uma Garantia

- a equipe escolhe um jogador elegível como fiador;
- o fiador escolhe uma carta válida da própria mão;
- a carta vai para o **Cofre do Banqueiro**;
- Fases 1 e 2: a cobrança cai para `Dívida +3`;
- Fase 3: a cobrança cai para `Dívida +5`.

A carta não vai para o monte nem para o lixo e não pode ser usada enquanto estiver no Cofre.

### Cofre do Banqueiro

Cada jogador pode ter no máximo uma carta no Cofre.

- se Biel já possui uma, somente Luana pode ser fiadora;
- se os dois já possuem carta presa, Garantia fica indisponível;
- nesse caso, os Juros completos são obrigatórios;
- após resgatar, o jogador volta a ser elegível.

#### Compra obrigatória do Cofre

No próximo turno do dono:

- monte e lixo ficam bloqueados;
- a única compra permitida é resgatar a carta do Cofre;
- clicar no Cofre devolve a carta à mão;
- o resgate substitui integralmente a compra normal;
- a compra do turno é marcada como concluída;
- não existe segunda compra naquele turno;
- depois do resgate, o restante do turno funciona normalmente.

O bot resgata automaticamente antes de qualquer outra ação.

#### Interface

- slot persistente chamado **COFRE DO BANQUEIRO**;
- fica junto à área do jogador afetado;
- não fica dentro de “Detalhes da batalha”;
- fica escondido quando vazio;
- usa identidade dourada/verde e cadeado;
- o dono vê a carta real;
- o outro cliente não recebe informação secreta indevida;
- texto: `Compra obrigatória no próximo turno`.

Ao tentar comprar no monte ou lixo:

> Você deve resgatar o Cofre.

### Tarifa de Manutenção

- Fases 1 e 2: cada jogador compra 1 carta extra no próximo turno;
- Fase 3: cada jogador compra 2 cartas extras;
- o efeito permanece até cada jogador consumir sua compra adicional.

### Bloqueio de Crédito

- bloqueia completamente o lixo durante a rodada;
- encerra após os dois cooperadores agirem.

## 3.5 Fase 2 — Auditoria

### Auditoria de Naipe

O Banqueiro escolhe um naipe.

| Fase | Exigência | Sucesso | Falha |
|---|---:|---:|---:|
| Fase 2 | 3 cartas | Dívida -5 | Dívida +10 |
| Fase 3 | 4 cartas | Dívida -5 | Dívida +12 |

- somente cartas reais do naipe contam;
- curingas não contam;
- a mesma carta não conta duas vezes;
- valores ficam congelados no anúncio;
- a redução ocorre apenas uma vez, ao resolver a Auditoria.

### Penhora

- escolhe um jogo elegível;
- o jogo fica temporariamente bloqueado conforme a regra atual da habilidade;
- não pode escolher Ás-a-Ás completo;
- não pode escolher jogo que não aceite mais cartas legalmente;
- não pode escolher alvo sem utilidade real para a cobrança;
- se não houver alvo, Penhora sai daquele sorteio.

### Juros Compostos

Resolve usando o total de cartas nas mãos:

```text
mínimo de 12, calculado por 4 + piso(total das mãos / 4)
```

| Total nas mãos | Dívida |
|---:|---:|
| 8 | 6 |
| 16 | 8 |
| 24 | 10 |
| 32 ou mais | 12 |

## 3.6 Fase 3 — Cobrança Final

Fortalece:

- Juros Fixos: +8 ou +5 com Garantia;
- Tarifa: +2 cartas por jogador;
- Auditoria: 4 cartas;
- falha da Auditoria: +12.

## 3.7 Pesos

| Habilidade | Peso | Fases |
|---|---:|---|
| Juros Fixos | 5 | 1, 2 e 3 |
| Tarifa de Manutenção | 3 | 1, 2 e 3 |
| Bloqueio de Crédito | 3 | 1, 2 e 3 |
| Auditoria de Naipe | 4 | 2 e 3 |
| Penhora | 2 | 2 e 3 |
| Juros Compostos | 4 | 2 e 3 |

## 3.8 Provocações

**Fase 2 — Auditoria**

> Agora cada erro de vocês será devidamente registrado.

**Fase 3 — Cobrança Final**

> Agora até o ar desta mesa tem juros.

---

# 4. A Dominadora

## 4.1 Identidade

Chefe de controle direto dos jogadores e da cooperação.

Pressiona por meio de:

- Correntes individuais;
- cartas presas;
- obrigações de uso;
- escolhas forçadas;
- controle persistente de jogos;
- separação da dupla.

## 4.2 Vida e escala de Correntes

- **HP:** 1.800
- Cada jogador acumula de 0 a 4 Correntes.

| Correntes | Estado |
|---:|---|
| 0 a 2 | Normal |
| 3 | Sob Controle |
| 4 | Dominado |

A equipe perde imediatamente se os dois jogadores chegarem a 4 Correntes ao mesmo tempo.

## 4.3 Sob Controle — 3 Correntes

O jogador:

- não pode criar jogo novo;
- pode comprar normalmente, salvo outro efeito;
- pode alimentar jogos existentes;
- pode completar canastras e se recuperar.

## 4.4 Dominado — 4 Correntes

O jogador:

- não pode pegar o lixo;
- não pode criar jogo novo;
- pode comprar do monte, salvo outro efeito;
- pode alimentar e completar jogos existentes;
- sofre a penalidade atual de 65% no ataque final;
- permanece Dominado até remover uma Corrente.

Não existe redução automática no fim do turno.

## 4.5 Remoção de Correntes

Quando um jogador realiza uma jogada que causa dano novo à Dominadora:

- ele remove 1 Corrente própria;
- o parceiro não perde Corrente junto;
- cada jogador pode remover no máximo 1 Corrente por rodada.

Exemplo:

- Biel e Luana possuem 2 Correntes;
- Biel completa uma canastra e causa dano;
- Biel passa de 2 para 1;
- Luana permanece com 2.

A cooperação ocorre indiretamente: o parceiro pode preparar um jogo para o jogador pressionado completar.

Com 4 Correntes, o jogador ainda pode voltar para 3 enquanto a derrota dupla não tiver ocorrido.

## 4.6 Fase 1 — Marcação

### Coleira

- escolhe um jogador com cartas válidas;
- bloqueia até duas cartas distintas;
- se existir apenas uma, bloqueia somente uma;
- cartas presas não podem ser jogadas nem descartadas;
- também não podem justificar a retirada do lixo;
- termina após o turno do alvo.

### Exposição

- marca uma única carta;
- a carta pode ser jogada;
- não pode ser descartada;
- precisa ser usada antes do fim do turno;
- se continuar na mão, o jogador recebe 1 Corrente.

A carta só pode ser marcada se já possuir pelo menos uma jogada legal naquele momento:

- criar um jogo válido; ou
- entrar legalmente em um jogo existente.

Se nenhuma carta válida existir, Exposição sai daquele sorteio.

Diferença:

- **Coleira:** remove opções ao bloquear totalmente as cartas;
- **Exposição:** cria uma obrigação possível de cumprir.

### Escolha Forçada

A escolha acontece imediatamente no turno da Dominadora, antes dos jogadores agirem.

O alvo escolhe entre:

1. comprar duas cartas; ou
2. receber 1 Corrente.

Ao escolher a compra:

- as duas cartas entram imediatamente na mão;
- as duas ficam cativas;
- nenhuma pode ser jogada ou descartada durante o próximo turno completo do jogador;
- ambas são liberadas somente ao final desse próximo turno;
- a trava persiste após recarregar;
- a compra normal do turno permanece disponível, salvo outra restrição.

Se não for possível comprar exatamente duas cartas, aplica-se a Corrente conforme a regra de fallback.

## 4.7 Fase 2 — Controle

### Troca Forçada

- escolhe uma carta válida de cada cooperador;
- troca as cartas entre as mãos;
- aplica somente depois do anúncio;
- não cria, remove nem duplica cartas.

### Mãos Atadas

Durante a rodada:

- cada jogador pode criar no máximo um jogo novo;
- quem estiver Sob Controle ou Dominado continua sem poder criar nenhum.

### Posse persistente

A Posse vira um efeito persistente independente da intenção atual da chefe.

- um jogo possuído não causa dano à Dominadora;
- continua aceitando cartas normalmente;
- adicionar duas cartas ao jogo o liberta;
- progresso é cumulativo: `0/2`, `1/2`, `2/2`;
- pode atravessar várias rodadas;
- a Dominadora continua usando outras habilidades enquanto a Posse está ativa;
- podem existir no máximo duas Posses simultâneas;
- com duas ativas, Posse sai do sorteio;
- ao libertar uma, a habilidade volta a ser elegível.

Cada Posse guarda seu próprio jogo e progresso.

Não pode escolher:

- Ás-a-Ás completo;
- jogo que não aceite mais cartas legalmente;
- jogo já possuído.

Ao chegar a `2/2`:

- a Posse termina imediatamente;
- o jogo volta a causar dano normalmente;
- o tratamento de eventual dano acumulado durante a Posse deve ser confirmado no ZIP final para evitar aplicação duplicada ou perda indevida.

### Favorita

- escolhe uma pessoa protegida e outra punida;
- protegida remove 1 Corrente, respeitando zero;
- punida recebe 1 Corrente;
- aplica uma única vez depois do anúncio.

## 4.8 Fase 3 — Dominação Total

### Dupla Coleira

- prende uma carta de cada cooperador;
- dura a rodada completa;
- só entra no sorteio com alvos válidos para ambos.

### Separação

- o primeiro jogador a alimentar um jogo vira seu dono temporário;
- o parceiro não pode alimentar o mesmo jogo naquela rodada.

### Controle Absoluto

- escolhe um jogador;
- o alvo é tratado como Dominado durante o próximo turno;
- o efeito termina ao final do turno correto do alvo.

### Quebra de Vontade

O alvo com pelo menos 2 Correntes escolhe entre:

1. receber 1 Corrente; ou
2. retirar uma carta válida de uma canastra e devolvê-la à mão.

Sem canastra válida, recebe Corrente.

### Ordem Final

Os dois jogadores recebem decisões diferentes e a partida só continua depois de ambas serem resolvidas.

A regra exata das cartas compradas ou presas nessa habilidade deve ser conferida no ZIP final, pois o pacote de balanceamento atual altera explicitamente a Escolha Forçada.

## 4.9 Pesos

| Habilidade | Peso | Fases |
|---|---:|---|
| Coleira | 5 | 1 e 2 |
| Escolha Forçada | 4 | 1 e 2 |
| Exposição | 3 | 1 e 2 |
| Troca Forçada | 4 | 2 e 3 |
| Mãos Atadas | 4 | 2 e 3 |
| Posse | 3 | 2 e 3 |
| Favorita | 3 | 2 e 3 |
| Dupla Coleira | 5 | 3 |
| Separação | 4 | 3 |
| Controle Absoluto | 3 | 3 |
| Quebra de Vontade | 3 | 3 |
| Ordem Final | 2 | 3 |

## 4.10 Provocações

**Fase 2 — Controle**

> Vocês ainda confundem escolha com liberdade.

**Fase 3 — Dominação Total**

> A partida continua apenas porque eu permito.

---

# 5. HUD e feedback visual

## 5.1 HUD compacto

Mantém visível apenas:

- chefe e fase;
- HP;
- Dívida ou Correntes;
- rodada e turno;
- ação atual;
- instrução curta;
- progresso;
- escolha obrigatória.

Tabela de dano, histórico e regras extensas ficam em **Detalhes da batalha**, recolhido por padrão.

## 5.2 Indicadores flutuantes

Reutilizam a animação do dinheiro/dano.

### Banqueiro

- `Dívida +6`;
- `Dívida -5`;
- identidade visual dourada/verde.

### Dominadora

- `+1 Corrente`;
- `-1 Corrente`;
- identidade visual rosa/roxa.

Os indicadores:

- não bloqueiam controles;
- aparecem uma vez por alteração real;
- funcionam para humanos e bots;
- não substituem o diálogo do chefe.

## 5.3 Estado de Correntes

Ao chegar a 3 ou 4, o jogador deve receber explicação visível das restrições reais.

Exemplo:

```text
SOB CONTROLE — 3 CORRENTES
Não pode criar jogo novo. Pode alimentar jogos existentes.
```

```text
DOMINADO — 4 CORRENTES
Não pode pegar o lixo nem criar jogo novo. Complete uma canastra para tentar remover uma Corrente.
```

## 5.4 Tela final

A tela precisa mostrar explicitamente:

- **VITÓRIA** ou **DERROTA**;
- chefe enfrentado;
- motivo do resultado;
- fala final temática;
- HP restante;
- Dívida ou Correntes finais;
- dano total;
- canastras;
- rodadas;
- ataque final;
- jogar novamente;
- voltar à mesa.

---

# 6. Persistência, sincronização e segurança

O estado precisa preservar:

- fase;
- intenção atual;
- escolhas obrigatórias;
- Correntes;
- limite de remoção por rodada;
- cartas presas;
- cartas cativas;
- Cofres dos jogadores;
- obrigação de resgate;
- compras extras;
- Posses e progresso individual;
- jogos penhorados;
- efeitos já aplicados;
- histórico e estatísticas.

Recarregar ou receber snapshot não pode:

- duplicar carta;
- duplicar Corrente ou Dívida;
- repetir Troca Forçada ou Favorita;
- liberar trava antes da hora;
- permitir comprar do monte/lixo com Cofre pendente;
- selecionar habilidade durante escolha obrigatória;
- causar novamente dano já reconhecido.

A IA deve respeitar todas as restrições e resgatar o Cofre automaticamente.

---

# 7. Comparação dos chefes

| Característica | Banqueiro | Dominadora |
|---|---|---|
| HP | 2.200 | 1.800 |
| Perigo | Dívida coletiva | Correntes individuais |
| Derrota especial | Dívida 100 | ambos com 4 Correntes |
| Pressão | econômica e cumulativa | controle pessoal e persistente |
| Counterplay principal | Garantia/Cofre e objetivos | causar dano para remover Corrente |
| Controle de compra | Cofre, Tarifa e lixo | cartas cativas e Dominação |
| Controle de jogos | Penhora | Posse e Separação |
| Controle de cartas | indireto | direto |

---

# 8. Validação após o Codex

Quando o Codex concluir, revisar o ZIP completo e confirmar:

1. Juros Fixos e Garantia funcionam exatamente uma vez.
2. Cofre bloqueia monte e lixo até o resgate.
3. Resgate substitui a compra e não permite segunda compra.
4. Um Cofre por jogador e fallback com os dois ocupados.
5. Penhora ignora jogos inválidos.
6. Correntes usam máximo 4.
7. Estado de 3 e 4 aplica as restrições corretas.
8. Correntes não caem automaticamente no fim do turno.
9. Somente o jogador que causou dano perde Corrente.
10. Limite de uma remoção por jogador por rodada.
11. Exposição sempre possui counterplay legal.
12. Posse persiste, acumula progresso e limita duas simultâneas.
13. As duas cartas da Escolha Forçada ficam cativas.
14. Bots e recarregamento respeitam todos os estados.
15. Todos os testes existentes continuam passando.

Depois da revisão, substituir este status de “especificação aprovada” por “implementação verificada” e registrar o total final de testes.
