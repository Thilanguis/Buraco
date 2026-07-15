# Documentação — Chefe da Mesa

## Status

**Implementação verificada no pacote `Buraco(14)` em 15/07/2026.**

- 110 testes executados;
- 110 testes aprovados;
- sintaxe válida;
- Buraco Fechado obrigatório nos modos de chefe;
- documentação alinhada ao comportamento atual do motor.

A validação automatizada não substitui uma partida multicliente completa em tablet/celular.

---

# 1. Estrutura geral

## 1.1 Partida

- Dois jogadores cooperam contra um chefe.
- Humanos e bots podem ocupar as vagas.
- Apostas ficam desativadas.
- A equipe utiliza dois mortos.
- Toda partida contra chefe usa **Buraco Fechado**.
- O chefe possui HP, três fases, habilidades e condição especial de derrota.

## 1.2 Vitória e derrota

A equipe vence ao reduzir o HP do chefe a zero.

O chefe vence quando:

- sua condição especial é atingida;
- sobrevive ao ataque final;
- os recursos da partida terminam e ele permanece vivo.

## 1.3 Turno formal do chefe

Toda rodada começa pelo chefe, inclusive a primeira.

Fluxo:

1. resultado anterior aparece como aviso pequeno, quando existir;
2. mudança de fase é anunciada, quando existir;
3. o chefe provoca a equipe;
4. a nova habilidade é apresentada em balão de quadrinho;
5. efeitos imediatos ou escolhas obrigatórias são aplicados;
6. somente depois os jogadores recebem o turno.

Durante essa apresentação:

- controles, bot e cronômetro ficam bloqueados;
- somente o cliente responsável altera o estado;
- snapshots não podem duplicar efeitos;
- recarregamento deve recuperar ou concluir o fluxo sem soft lock.

## 1.4 Diálogos

O balão de quadrinho é reservado para:

- primeira habilidade;
- nova habilidade;
- mudança de fase;
- provocação;
- fala final.

Resultados encerrados usam toast ou histórico:

- `Auditoria concluída: Dívida -5`;
- `Bloqueio de Crédito encerrado`;
- `Biel perdeu 1 Corrente`.

O diálogo atual nunca usa o resultado anterior.

## 1.5 Evolução híbrida das fases

A fase avança ao cumprir **qualquer** condição.

| Fase | Condições |
|---|---|
| Fase 1 | início |
| Fase 2 | primeiro morto, monte com 40 ou menos, ou HP em 70% ou menos |
| Fase 3 | segundo morto, monte com 18 ou menos, ou HP em 35% ou menos |

A fase nunca regride e cada transição ocorre uma única vez.

A primeira habilidade da nova fase prioriza habilidades introduzidas nela. Sem alvo válido, usa fallback seguro.

## 1.6 Buraco Fechado

- `variant = fechado` é forçado e persistido.
- Revanche, reinício e recarregamento preservam a variante.
- Carta bloqueada não pode justificar a compra do lixo.
- Tentativa inválida não altera mão, lixo ou jogos.
- O bot usa a lógica de compra do Buraco Fechado.

---

# 2. Dano contra os chefes

## 2.1 Dano individual das cartas

Cada carta causa dano apenas na primeira vez em que entra legalmente na mesa:

| Carta | Dano |
|---|---:|
| 3 a 7 | 5 |
| 8 a K | 10 |
| Ás e 2 | 15 |
| Curinga | 20 |

Os IDs já contabilizados ficam persistidos para impedir dano duplicado por reorganização, movimentação ou snapshot.

Dano individual de carta **não remove Corrente**.

## 2.2 Bônus de canastra

| Tipo | Dano total reconhecido |
|---|---:|
| Jogo simples | 0 |
| Canastra suja | 100 |
| Canastra limpa | 180 |
| Canastra real | 300 |
| Ás-a-Ás | 450 |

O dano é incremental.

Exemplo: ao evoluir de suja para limpa, causa somente `80` adicionais.

## 2.3 Ataque final

```text
500 + piso(25% da pontuação projetada da equipe)
```

Jogador Dominado causa apenas 65% da própria parcela do ataque final, conforme a regra atual.

## 2.4 Reações ao dano

Ao receber dano relevante, o chefe pode fazer uma reação curta:

- somente para canastra limpa ou superior;
- no máximo uma vez por rodada;
- cerca de 2,5 segundos;
- não bloqueia controles;
- não substitui a habilidade ativa.

---

# 3. O Banqueiro

## 3.1 Identidade

Chefe de desgaste econômico, Dívida coletiva e controle de recursos.

## 3.2 Vida e derrota especial

- **HP:** 2.500
- **Dívida coletiva:** 0 a 100
- Dívida 100 causa derrota imediata.

## 3.3 Redução de Dívida

| Conquista | Redução |
|---|---:|
| Canastra limpa | 4 |
| Canastra real | 8 |
| Ás-a-Ás | 12 |
| Morto retirado | 5 |

Toda mudança informa a origem.

## 3.4 Juros Fixos

- Fases 1 e 2: `Dívida +6`;
- Fase 3: `Dívida +8`.

A equipe escolhe imediatamente:

### Aceitar

Recebe a cobrança completa.

### Dar Garantia

- escolhe um fiador elegível;
- o fiador envia uma carta válida ao Cofre;
- Fases 1 e 2: cobrança reduzida para `+3`;
- Fase 3: cobrança reduzida para `+5`.

### Cofre do Banqueiro

- cada jogador pode ter no máximo uma carta;
- se um jogador já possui carta, somente o outro pode ser fiador;
- com os dois Cofres ocupados, Garantia fica indisponível;
- a carta não vai para monte nem lixo.

No próximo turno do dono:

- monte e lixo ficam bloqueados;
- a única compra permitida é resgatar o Cofre;
- o resgate substitui a compra normal;
- não existe segunda compra;
- depois do resgate, o turno segue normalmente;
- o bot resgata automaticamente.

Interface:

- slot junto ao jogador afetado;
- oculto quando vazio;
- fora de “Detalhes da batalha”;
- identidade dourada/verde;
- respeita o segredo da mão para o outro cliente.

## 3.5 Tarifa de Manutenção

A Tarifa prepara a próxima compra de cada jogador:

- Fases 1 e 2: `+1 Carta Financiada`;
- Fase 3: `+2 Cartas Financiadas`;
- ao pegar o lixo, as extras continuam vindo do monte.

Cada Carta Financiada:

- pode ser jogada ou descartada;
- fica destacada durante aquele turno;
- se permanecer na mão no final:
  - Fases 1 e 2: `Dívida +3`;
  - Fase 3: `Dívida +4`;
- após usar, descartar ou cobrar, perde a marca;
- nunca é cobrada duas vezes.

Feedback esperado:

- carta extra animada separadamente;
- mensagem `Tarifa de Manutenção: +1/+2 carta(s) financiada(s)`;
- aviso: `Use ou descarte neste turno. Cada carta restante gera Dívida.`

## 3.6 Bloqueio de Crédito

- lixo bloqueado durante a rodada;
- encerra depois que os dois cooperadores agem.

## 3.7 Auditoria de Naipe

| Fase | Exigência | Sucesso | Falha |
|---|---:|---:|---:|
| Fase 2 | 3 cartas | Dívida -5 | Dívida +10 |
| Fase 3 | 4 cartas | Dívida -5 | Dívida +12 |

- somente cartas reais do naipe;
- curingas não contam;
- ID não conta duas vezes;
- valores ficam congelados no anúncio;
- a redução ocorre uma única vez ao resolver.

## 3.8 Penhora

- escolhe um jogo elegível;
- não escolhe Ás-a-Ás completo;
- não escolhe jogo sem progressão legal;
- sem alvo válido, sai do sorteio.

## 3.9 Juros Compostos

```text
mínimo de 12, calculado por 4 + piso(total das mãos / 4)
```

| Total nas mãos | Dívida |
|---:|---:|
| 8 | 6 |
| 16 | 8 |
| 24 | 10 |
| 32 ou mais | 12 |

## 3.10 Habilidades e pesos

| Habilidade | Peso | Fases |
|---|---:|---|
| Juros Fixos | 5 | 1, 2 e 3 |
| Tarifa de Manutenção | 3 | 1, 2 e 3 |
| Bloqueio de Crédito | 3 | 1, 2 e 3 |
| Auditoria de Naipe | 4 | 2 e 3 |
| Penhora | 2 | 2 e 3 |
| Juros Compostos | 4 | 2 e 3 |

---

# 4. A Dominadora

## 4.1 Identidade

Chefe de controle direto, Correntes individuais e restrições persistentes.

## 4.2 Vida e Correntes

- **HP:** 2.100
- Cada jogador acumula de 0 a 4 Correntes.

| Correntes | Estado |
|---:|---|
| 0 a 2 | Normal |
| 3 | Sob Controle |
| 4 | Dominado |

Os dois jogadores com 4 ao mesmo tempo causam derrota imediata.

## 4.3 Sob Controle — 3 Correntes

- não pode criar jogo novo;
- pode comprar, salvo outro efeito;
- pode alimentar jogos existentes;
- pode completar canastra e se recuperar.

## 4.4 Dominado — 4 Correntes

- não pode pegar o lixo;
- não pode criar jogo novo;
- pode comprar do monte, salvo outra restrição;
- pode alimentar e completar jogos existentes;
- sofre penalidade no ataque final;
- permanece Dominado até remover Corrente.

Correntes não diminuem automaticamente no fim do turno.

## 4.5 Resistência

Ao causar **dano novo de formação ou evolução de canastra**:

- o jogador responsável perde 1 Corrente própria;
- o parceiro não perde;
- limite de uma Corrente removida por jogador por rodada;
- dano individual das cartas não ativa Resistência.

## 4.6 Coleira

- escolhe jogador com alvo válido;
- bloqueia até duas cartas distintas;
- não podem ser jogadas, descartadas nem justificar o lixo;
- encerra após o turno do alvo;
- nunca pode deixar a mão inteira sem descarte legal.

## 4.7 Exposição

- marca uma carta com jogada legal naquele momento;
- pode ser jogada;
- não pode ser descartada;
- se continuar na mão ao fim do turno: `+1 Corrente`;
- se ficar impossível antes do turno do alvo, é cancelada sem Corrente.

## 4.8 Escolha Forçada

A decisão ocorre imediatamente antes dos jogadores:

1. comprar duas cartas; ou
2. receber 1 Corrente.

### Fases 1 e 2

As duas cartas ficam presas durante o próximo turno completo:

- não podem ser jogadas;
- não podem ser descartadas;
- persistem após recarregar;
- são liberadas no fim do turno correto.

### Fase 3

As duas cartas ficam **Expostas**:

- podem ser jogadas;
- não podem ser descartadas;
- cada carta que permanecer na mão no fim do próximo turno gera `+1 Corrente`;
- cada carta é avaliada separadamente.

## 4.9 Troca Forçada

- troca uma carta válida entre os jogadores;
- destaca as duas cartas;
- anima os dois movimentos;
- identifica e destaca a carta recebida;
- não cria, remove nem duplica cartas.

## 4.10 Mãos Atadas

- cada jogador pode criar no máximo um jogo novo na rodada;
- Sob Controle ou Dominado continua sem poder criar nenhum.

## 4.11 Posse

A Posse pode atingir qualquer jogo ou canastra que ainda aceite uma carta legal, exceto Ás-a-Ás completa.

Ao aplicar:

- calcula o dano individual já contabilizado das cartas do jogo;
- soma o bônus de canastra já reconhecido;
- restaura temporariamente esse total ao HP da Dominadora, sem ultrapassar o máximo;
- guarda o valor efetivamente restaurado;
- marca o jogo como possuído.

Enquanto possuído:

- o jogo permanece utilizável;
- pode receber cartas;
- fica visualmente marcado.

Libertação:

- basta adicionar **1 carta legal**;
- a Posse termina imediatamente;
- reaplica exatamente o dano que havia sido restaurado;
- aplica também o dano normal da nova carta;
- não duplica dano por snapshot ou reorganização.

Limites:

- no máximo duas Posses simultâneas;
- jogo já possuído não é alvo;
- Ás-a-Ás completa não é alvo;
- jogo sem continuação legal não é alvo;
- Posse fantasma é removida com fallback seguro.

## 4.12 Favorita

- escolhe uma protegida e uma punida;
- protegida perde 1 Corrente, respeitando zero;
- punida recebe 1;
- aplica uma única vez.

## 4.13 Fase 3

### Dupla Coleira
Uma carta de cada jogador fica presa durante a rodada.

### Separação
O parceiro não pode alimentar um jogo já alimentado pelo outro naquela rodada.

### Controle Absoluto
O alvo é tratado como Dominado durante o próximo turno dele.

### Quebra de Vontade
Jogador com pelo menos 2 Correntes escolhe entre receber uma Corrente ou retirar carta válida de uma canastra.

### Ordem Final
Cada cooperador recebe uma decisão diferente; o jogo só continua após ambas.

## 4.14 Habilidades e pesos

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

---

# 5. HUD e feedback

## 5.1 HUD compacto

Visível:

- retrato e nome;
- fase;
- HP;
- Dívida ou Correntes;
- rodada e turno;
- ação atual;
- instrução, progresso e consequência;
- escolha obrigatória.

Histórico, tabela de dano e regras extensas ficam em **Detalhes da batalha**, fechado por padrão.

## 5.2 Indicadores flutuantes

### Banqueiro

- `Dívida +6`;
- `Dívida -5`;
- identidade dourada/verde.

### Dominadora

- `+1 Corrente`;
- `-1 Corrente`;
- identidade rosa/roxa.

Aparecem uma vez por alteração real e não bloqueiam controles.

## 5.3 Tela final

Mostra claramente:

- **VITÓRIA** ou **DERROTA**;
- chefe;
- motivo;
- fala final;
- HP restante;
- Dívida ou Correntes;
- dano total;
- canastras;
- rodadas;
- ataque final;
- jogar novamente;
- voltar à mesa.

---

# 6. Segurança e soft locks

O sistema protege contra:

- mão restante composta apenas de cartas sem descarte;
- Coleira bloqueando a mão inteira;
- carta bloqueada justificando lixo no Fechado;
- Cofre cuja carta deixou de existir;
- Posse cujo jogo deixou de existir;
- Exposição que se tornou impossível;
- escolha obrigatória perdida após reload;
- estágio de diálogo obsoleto mantendo controles bloqueados;
- dano, Corrente ou Dívida duplicados por snapshot;
- bot sem ação legal de fallback.

Quando necessário, cancela somente o efeito temporário inválido.

---

# 7. Tablet, desempenho e acessibilidade

Em dispositivos touch/tablet e para `prefers-reduced-motion`:

- as camadas luminosas contínuas `#gameSection::before` e `::after` ficam desativadas;
- o fundo temático da mesa permanece estático;
- cartas, diálogos e animações necessárias continuam funcionando;
- evita flashes, consumo excessivo de GPU, aquecimento e desconforto visual.

Essa configuração deve ser preservada.

---

# 8. Persistência

O estado preserva:

- fase;
- intenção e fluxo do chefe;
- escolhas;
- Correntes e limite de Resistência;
- cartas presas/expostas;
- Cofres;
- Cartas Financiadas;
- Posses e dano suprimido;
- jogos penhorados;
- IDs que já causaram dano;
- eventos e estatísticas.

Recarregar não pode duplicar nem apagar efeitos válidos.

---

# 9. Comparação

| Característica | Banqueiro | Dominadora |
|---|---|---|
| HP | 2.500 | 2.100 |
| Perigo | Dívida coletiva | Correntes individuais |
| Derrota especial | Dívida 100 | ambos com 4 |
| Pressão | econômica | controle direto |
| Counterplay | Garantia, uso das financiadas, Auditoria | Resistência e cumprimento de obrigações |
| Controle de compra | Cofre, Tarifa, lixo | cartas presas/expostas |
| Controle de jogos | Penhora | Posse e Separação |

---

# 10. Estado dos testes

No pacote `Buraco(14)`:

```text
110 testes
110 aprovados
0 falhas
```

Principais áreas cobertas:

- dano incremental e individual;
- fases por mortos, monte e HP;
- Cofre;
- Cartas Financiadas;
- Correntes até 4;
- Resistência;
- Posse;
- Troca Forçada;
- Escolha Forçada;
- soft locks;
- HUD, diálogo e tela final;
- recarregamento e idempotência.
