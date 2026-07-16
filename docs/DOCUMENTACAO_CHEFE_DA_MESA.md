# Documentação — Chefe da Mesa

## Status

**Banqueiro e Dominadora verificados no pacote `Buraco(14)` em 15/07/2026.**

- 110 testes executados;
- 110 testes aprovados;
- sintaxe válida;
- Buraco Fechado obrigatório nos modos de chefe;
- A Matriarca Esmeralda está documentada como **especificação planejada**, ainda não implementada.

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


# 5. A Matriarca Esmeralda — planejada

> **Status:** especificação de design e implementação. Ainda não faz parte dos 110 testes verificados.

## 5.1 Identidade

Chefe de ocupação da mesa, regeneração e objetivos persistentes.

- **ID sugerido:** `matriarca_esmeralda`
- **Modo sugerido:** `boss_matriarca`
- **HP:** 2.000
- **Perigo:** Florescimento, de 0 a 5
- **Tema de mesa:** verde claro/esmeralda já existente
- **Retrato sugerido:** `assets/bosses/matriarca-esmeralda.png`

### Frase mecânica

> Ela transforma cartas, jogos e o lixo em um jardim vivo. Objetivos ignorados florescem, curam a chefe e aproximam a derrota.

## 5.2 Condição especial de derrota

Cada ameaça não resolvida pode gerar uma Flor.

- `0–4 Florescimentos`: a partida continua;
- `5 Florescimentos`: a floresta domina a mesa e a equipe perde imediatamente;
- Florescimentos surgem mesmo se o HP da chefe já estiver cheio;
- a cura nunca ultrapassa o HP máximo.

## 5.3 Remoção de Florescimentos

A equipe poda o Jardim por evolução real de canastra:

| Evolução | Florescimentos removidos |
|---|---:|
| Canastra limpa | 1 |
| Canastra real | +1 adicional |
| Ás-a-Ás | +1 adicional |

Uma canastra que evolui de limpa até Ás-a-Ás pode remover até 3 no total, uma vez por nível atingido.

Dano individual das cartas não remove Florescimento.

## 5.4 Limite de cura por rodada

| Fase | Cura máxima por rodada |
|---|---:|
| Fase 1 | 150 HP |
| Fase 2 | 220 HP |
| Fase 3 | 300 HP |

O Florescimento ainda aumenta mesmo quando o limite de cura já foi atingido.

## 5.5 Ameaças persistentes

Sementes, Raízes, Enxertos e Pólen são estados persistentes independentes da intenção atual.

Limite simultâneo:

| Fase | Ameaças ativas |
|---|---:|
| Fase 1 | 1 |
| Fase 2 | 2 |
| Fase 3 | 3 |

Se o limite estiver cheio, habilidades que criam novas ameaças ficam inelegíveis.

Cada ameaça precisa guardar:

- ID próprio;
- tipo;
- alvo;
- rodada e prazo;
- condição de sucesso;
- cura prevista;
- valor de Florescimento;
- status `active`, `completed`, `failed` ou `cancelled`;
- evento de resolução para impedir duplicação.

---

## 5.6 Fase 1 — Germinação

### Semente Viva

Marca uma carta da mão que tenha pelo menos uma jogada legal no turno do alvo.

- a carta pode ser jogada;
- não pode ser descartada;
- se for usada no turno, a Semente é destruída;
- se permanecer na mão no fim do turno:
  - `+1 Florescimento`;
  - cura `50 HP`.

Se a carta deixar de ter qualquer jogada legal antes do turno, cancelar sem cura e sem Flor.

### Raiz Faminta

Marca um jogo que aceite ao menos uma continuação legal.

- adicionar `1 carta legal` durante a rodada corta a Raiz;
- se ninguém alimentar o jogo:
  - `+1 Florescimento`;
  - cura `60 HP`.

O jogo permanece utilizável e a camada visual nunca cobre as cartas.

### Orvalho Restaurador

Prepara uma cura de `100 HP` para o fim da rodada.

- cada carta nova colocada legalmente na mesa reduz a cura em `20`;
- mínimo de zero;
- o HUD mostra a cura prevista em tempo real;
- não cria Florescimento.

Exemplo:

```text
ORVALHO RESTAURADOR
Cura prevista: 40 HP
Cada carta baixada reduz 20 HP.
```

---

## 5.7 Fase 2 — Jardim Voraz

A primeira habilidade da fase deve priorizar uma habilidade nova desta seção.

### Trepadeiras Gêmeas

Cria duas Raízes em jogos diferentes.

Para cada jogo:

- adicionar `1 carta legal` corta sua Raiz;
- falhar gera:
  - `+1 Florescimento`;
  - cura `70 HP`.

Cada Raiz é resolvida separadamente.

### Enxerto

Liga dois jogos elegíveis.

Durante a rodada, a equipe precisa adicionar pelo menos uma carta em cada um.

- dois lados alimentados: sucesso;
- apenas um lado alimentado:
  - `+1 Florescimento`;
  - cura `50 HP`;
- nenhum lado alimentado:
  - `+2 Florescimentos`;
  - cura `100 HP`.

Os jogos continuam aceitando cartas normalmente.

### Pólen do Lixo

Contamina a carta atual do topo do lixo.

- se o lixo for pego, a carta contaminada precisa ser usada naquele turno;
- se for usada: Pólen limpo;
- se continuar na mão ao fim do turno:
  - `+1 Florescimento`;
  - cura `60 HP`;
- se o topo mudar sem a carta entrar na mão de alguém, cancelar o Pólen sem punição;
- não revelar informação secreta indevida ao outro jogador.

### Colheita

Marca um jogador e avalia sua mão no fim do turno.

| Cartas restantes | Efeito |
|---:|---|
| 0–7 | nenhum |
| 8–10 | cura 40 HP |
| 11 ou mais | cura 80 HP e +1 Florescimento |

Colheita não bloqueia cartas e não impede descarte.

---

## 5.8 Fase 3 — Primavera Eterna

A primeira habilidade da fase deve priorizar uma habilidade nova desta seção.

### Florescimento Real

Cria até três objetivos simultâneos em alvos de tipos diferentes:

- uma carta;
- um jogo;
- o topo do lixo.

Cada objetivo válido e não cumprido gera separadamente:

- `+1 Florescimento`;
- cura `80 HP`.

Não criar um objetivo sem alvo legal apenas para completar três.

### Casulo Esmeralda

Cria um escudo de `180 pontos`.

- o dano recebido reduz primeiro o Casulo;
- dano absorvido não reduz o HP;
- completar uma canastra limpa ou superior rompe imediatamente o Casulo;
- ao romper, o dano restante do evento atual atinge a chefe;
- se a rodada terminar com Casulo ativo, metade do valor restante vira cura;
- depois da cura, o Casulo termina;
- não absorver cura nem alterar Florescimento.

### Coroa da Primavera

Fortalece as ameaças já existentes durante uma rodada.

- a primeira ameaça que falhar gera sua consequência normal;
- cada ameaça adicional que falhar na mesma rodada cura `+30 HP`;
- não aumenta o Florescimento além do valor normal de cada ameaça;
- se não houver ameaça ativa, a habilidade fica inelegível.

### Renascimento — passiva única

Uma vez por partida, na Fase 3:

- se o HP chegar a zero e houver pelo menos `3 Florescimentos`;
- consumir exatamente `3`;
- retornar com `300 HP`;
- cancelar ameaças pendentes já resolvidas, preservando apenas estados ainda válidos;
- mostrar uma apresentação exclusiva;
- sem 3 Florescimentos, a chefe é derrotada normalmente.

Também pode ocorrer durante o ataque final.

---

## 5.9 Habilidades e pesos sugeridos

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

Habilidades introdutórias sugeridas:

```text
Fase 2: Trepadeiras Gêmeas, Enxerto, Pólen do Lixo ou Colheita
Fase 3: Florescimento Real, Casulo Esmeralda ou Coroa da Primavera
```

## 5.10 Falas

### Início

> “Toda mesa pode virar um jardim. A de vocês já começou a criar raízes.”

### Fase 2

> “Vocês cortaram um galho. Eu trouxe a floresta inteira.”

### Fase 3

> “Agora cada carta de vocês alimenta a minha primavera.”

### Ao curar

> “A floresta sempre recupera o que lhe pertence.”

### Ao receber dano

> “Podem cortar as folhas. As raízes continuam.”

### Vitória

> “Não restou mesa. Apenas o meu jardim.”

### Derrota

> “Até a primavera... pode terminar.”

## 5.11 HUD da Matriarca

Mostrar no HUD compacto:

- HP;
- fase;
- Florescimento `0/5`;
- número de ameaças ativas;
- habilidade atual;
- objetivo mais urgente;
- cura prevista, quando houver.

Medidor:

- cinco flores individuais;
- uma flor abre ao ganhar Florescimento;
- uma flor murcha ao remover;
- texto alternativo e número continuam visíveis sem animação.

Exemplo:

```text
FLORESCIMENTO 3/5
RAIZ FAMINTA — Jogo 2
Adicione 1 carta nesta rodada.
Falha: +1 Flor e cura 60 HP.
```

## 5.12 Linguagem visual e animações

### Retrato e tema

- usar o fundo verde claro/esmeralda já existente;
- retrato com moldura dourada e folhas;
- não adicionar animação contínua ao fundo;
- preservar a desativação de `#gameSection::before` e `::after` em touch/tablet.

### Semente Viva

- pequena flor esmeralda sobre a carta;
- borda verde e dourada própria;
- etiqueta `SEMENTE`;
- não reutilizar destaque de carta nova, selecionada, presa ou financiada;
- número e naipe permanecem legíveis;
- clique e desseleção seguem o comportamento normal.

### Raiz Faminta e Trepadeiras

- vinhas ao redor do contêiner do jogo;
- decoração atrás das cartas;
- `pointer-events: none`;
- última carta fica sempre acima da camada;
- selo curto: `RAIZ — adicione 1 carta`;
- duas Raízes não podem invadir uma à outra.

### Enxerto

- linha vegetal ligando os dois jogos;
- recalcular ao redimensionar a tela;
- nunca cobrir cartas ou bloquear cliques;
- em telas estreitas, substituir a linha por selos pareados `ENXERTO A` e `ENXERTO B`.

### Pólen do Lixo

- contorno esmeralda no topo do lixo;
- partículas curtas apenas ao aplicar;
- etiqueta `PÓLEN`;
- sem brilho ou pulso contínuo.

### Cura

- número verde `+60 HP` próximo à barra;
- origem visível: `Raiz Faminta: +60 HP`;
- barra sobe suavemente;
- não piscar a tela;
- um evento visual por cura real.

### Florescimento

- animação curta de flor abrindo;
- indicador flutuante `+1 Flor`;
- ao remover: pétalas murcham e aparece `−1 Flor`;
- não repetir por snapshot.

### Casulo

- camada esmeralda ao redor do retrato e da barra, não sobre a mesa;
- mostrar `Casulo 180/180`;
- rachaduras conforme perde valor;
- animação curta ao romper.

### Renascimento

Sequência máxima aproximada de 2,5 segundos:

1. HP chega a zero;
2. três flores são consumidas;
3. flor grande se abre atrás do retrato;
4. `RENASCIMENTO — 300 HP`;
5. a partida continua.

Sem estroboscópio, flash branco ou animação contínua.

### Redução de movimento

Com `prefers-reduced-motion`, touch ou tablet:

- substituir movimentos por fades curtos;
- remover partículas contínuas;
- manter estado, rótulos e números;
- nenhuma animação deve causar flash.

## 5.13 Regras de segurança

- nenhuma ameaça pode nascer com alvo nulo;
- não marcar carta sem jogada legal;
- não marcar jogo sem continuação legal;
- alvo que deixa de existir cancela apenas sua ameaça;
- falha só é aplicada uma vez;
- cura e Florescimento são idempotentes;
- recarregar preserva ameaças e prazos;
- bot reconhece objetivos e tenta cumpri-los;
- não deixar o jogador sem compra ou descarte legal;
- ameaça inválida usa fallback seguro;
- nenhuma animação reaparece apenas porque chegou um snapshot.

---

# 6. HUD e feedback

## 6.1 HUD compacto

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

## 6.2 Indicadores flutuantes

### Banqueiro

- `Dívida +6`;
- `Dívida -5`;
- identidade dourada/verde.

### Dominadora

- `+1 Corrente`;
- `-1 Corrente`;
- identidade rosa/roxa.

### Matriarca Esmeralda

- `+1 Flor`;
- `−1 Flor`;
- `+60 HP`;
- identidade esmeralda/dourada.

Aparecem uma vez por alteração real e não bloqueiam controles.

## 6.3 Tela final

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


## 6.4 Marcadores por jogo (boss mode)

No modo Chefe da Mesa, cada jogo/canastra da equipe deve mostrar **marcadores de contribuição** próximos ao rótulo do jogo, na mesma linha dos chips como `Suja`, `Limpa`, `Real` e `Ás-a-Ás`.

### Objetivo

Dar leitura imediata de:

- quanto **dano total** aquele jogo já causou ao chefe;
- quanto aquele jogo já contribuiu para enfraquecer a mecânica principal do chefe atual.

### Posição

- mostrar os marcadores na parte inferior do bloco do jogo, ao lado ou logo abaixo do rótulo do tipo de canastra;
- manter alinhamento consistente entre jogos;
- em telas estreitas, permitir quebra para uma segunda linha curta;
- nunca cobrir cartas;
- nunca usar tooltip como única fonte de informação.

### Marcador universal — dano

Todo jogo mostra um marcador universal de dano com ícone de explosão.

Exemplo visual:

```text
💥 180
```

Regras:

- valor acumulado de dano que aquele jogo já causou;
- inclui dano individual das cartas já contabilizado;
- inclui bônus de canastra já aplicados;
- usa o dano **realmente aplicado**, não potencial futuro;
- ao evoluir o jogo, o valor atualiza incrementalmente;
- não duplicar por reorganização, snapshot ou recarregamento.

### Marcador específico do chefe

Além do dano, o jogo mostra um segundo marcador contextual, com ícone próprio do chefe.

#### Banqueiro

Mostrar quanto de **Dívida reduzida** aquele jogo já gerou.

Exemplo:

```text
💥 180   🪙 -4
```

Regras:
- somente reduções realmente aplicadas;
- cada jogo acumula sua própria contribuição;
- exemplo típico:
  - limpa: `🪙 -4`
  - real: `🪙 -8`
  - Ás-a-Ás: `🪙 -12`
- se a redução for incremental por evolução, o marcador exibe o total daquele jogo.

#### Dominadora

Mostrar quantas **Correntes foram removidas** por ações de Resistência acionadas a partir daquele jogo.

Exemplo:

```text
💥 180   ⛓️ -1
```

Regras:
- contar apenas remoções reais de Corrente;
- cada jogo exibe o total que ajudou a remover;
- usar o jogo que causou a evolução/impacto correspondente;
- não contar dano individual das cartas.

#### Matriarca Esmeralda

Quando implementada, mostrar quantos **Florescimentos foram removidos** por aquele jogo.

Exemplo:

```text
💥 180   🌸 -1
```

Regras:
- contar somente remoções reais de Florescimento;
- limpar, real e Ás-a-Ás atualizam o total do próprio jogo conforme a regra da chefe.

### Atualização e animação

Quando um marcador subir:

- fazer um pop curto no chip alterado;
- usar um número flutuante pequeno e rápido;
- duração aproximada entre 400 e 700 ms;
- não bloquear interação;
- respeitar `prefers-reduced-motion`;
- em tablet/touch, usar apenas animação curta, sem brilho pulsante contínuo.

Exemplos:

- dano novo no jogo:
  - chip `💥` dá pop;
  - sobe `+10` ou `+80`;
- redução de Dívida:
  - chip `🪙` dá pop;
  - sobe `-4`;
- remoção de Corrente:
  - chip `⛓️` dá pop;
  - sobe `-1`;
- remoção de Flor:
  - chip `🌸` dá pop;
  - sobe `-1`.

### Identidade visual

- `💥` em vermelho/laranja;
- `🪙` em dourado/verde para o Banqueiro;
- `⛓️` em rosa/roxo para a Dominadora;
- `🌸` ou folha/flor esmeralda para a Matriarca;
- contraste alto;
- números sempre legíveis;
- não reutilizar o visual de cartas novas, presas, financiadas ou expostas.

### Persistência e dados

Cada jogo deve guardar uma estrutura persistente de contribuição, por exemplo:

```text
meldContribution = {
  damageDone: number,
  bankerDebtRelief: number,
  dominatrixChainsBroken: number,
  matriarchBloomRemoved: number
}
```

Regras:

- atualizar somente com eventos reais aplicados;
- persistir no save/snapshot;
- restaurar corretamente após recarregamento;
- nunca recomputar de forma que duplique efeitos já confirmados;
- ao desfazer um estado inválido antigo, preservar apenas os valores efetivamente aplicados.

### Escopo

- aparece somente no modo Chefe da Mesa;
- não aparece nos modos comuns;
- se o chefe atual não usar o segundo marcador, mostrar apenas o `💥`;
- o segundo marcador sempre reflete o chefe atual da partida.

### Testes futuros esperados

Quando essa funcionalidade for implementada, cobrir:

- marcador de dano soma cartas e bônus sem duplicar;
- marcador do Banqueiro soma somente Dívida realmente reduzida;
- marcador da Dominadora soma somente Correntes realmente removidas;
- marcador da Matriarca soma somente Florescimentos realmente removidos;
- chips persistem após recarregar;
- reorganização visual não perde nem duplica os números;
- layout continua legível em desktop e tablet.

# 7. Segurança e soft locks

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

# 8. Tablet, desempenho e acessibilidade

Em dispositivos touch/tablet e para `prefers-reduced-motion`:

- as camadas luminosas contínuas `#gameSection::before` e `::after` ficam desativadas;
- o fundo temático da mesa permanece estático;
- cartas, diálogos e animações necessárias continuam funcionando;
- evita flashes, consumo excessivo de GPU, aquecimento e desconforto visual.

Essa configuração deve ser preservada.

---

# 9. Persistência

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
- eventos e estatísticas;
- quando a Matriarca for implementada: Florescimento, ameaças, prazos, Casulo e Renascimento.

Recarregar não pode duplicar nem apagar efeitos válidos.

---

# 10. Comparação

| Característica | Banqueiro | Dominadora | Matriarca |
|---|---|---|---|
| HP | 2.500 | 2.100 | 2.000 sugerido |
| Perigo | Dívida coletiva | Correntes individuais | Florescimento |
| Derrota especial | Dívida 100 | ambos com 4 | 5 Flores |
| Pressão | econômica | controle direto | ocupação da mesa |
| Counterplay | Garantia, financiadas, Auditoria | Resistência e obrigações | podar Flores e cumprir ameaças |
| Controle de compra | Cofre, Tarifa, lixo | cartas presas/expostas | Pólen do Lixo |
| Controle de jogos | Penhora | Posse e Separação | Raízes, Enxerto e Casulo |

---

# 11. Estado dos testes

No pacote `Buraco(14)`:

```text
110 testes
110 aprovados
0 falhas
```

Os 110 testes cobrem Banqueiro e Dominadora. A Matriarca só deve entrar neste total depois da implementação.

Principais áreas cobertas atualmente:

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
