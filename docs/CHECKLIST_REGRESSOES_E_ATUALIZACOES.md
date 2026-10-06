# CHECKLIST DE REGRESSÕES E ATUALIZAÇÕES — BURACO

**Status:** documento permanente de prevenção de regressões  
**Criado em:** 05/10/2026  
**Objetivo:** ser lido **antes de qualquer alteração** em regra, UI, animação, BOT, sincronização, reinício, Service Worker ou asset do jogo.

> Este documento não substitui o código atual. A fonte de verdade executável é sempre o estado atual do Google Drive. Ele existe para lembrar erros reais que já aconteceram e impedir que sejam repetidos.

---

## 1. Regra zero — não editar a partir de uma cópia velha

Antes de qualquer patch:

1. buscar o arquivo atual no Google Drive;
2. conferir `modified_time` e tamanho;
3. preparar o patch em cima dessa cópia;
4. **antes de gravar**, conferir de novo se o arquivo oficial não mudou;
5. se mudou, refazer o patch sobre a versão mais nova;
6. depois de subir, baixar novamente o arquivo oficial e validar essa cópia.

Não usar como fonte de verdade:

- cópia local de outra rodada;
- arquivo de staging antigo;
- GitHub sem comparar com Drive;
- lembrança de como o código “deveria estar”.

### Erro real já ocorrido

Durante uma alteração, `service-worker.js` mudou no Drive enquanto o patch estava sendo preparado. A gravação foi interrompida e refeita em cima da versão atual. Esse comportamento deve continuar sendo obrigatório.

Também houve uma diferença grande de tamanho no `app.js` causada por **CRLF → LF**, não por perda de código. Tamanho de arquivo sozinho não prova corrupção. Quando houver dúvida, comparar conteúdo/diff.

---

## 2. Auditoria obrigatória de dependências antes de substituir/remover uma feature

Toda alteração que substitua, remova, renomeie ou mude o gatilho de uma feature deve auditar, no mínimo:

- sons/SFX e música;
- animações, overlays, foco, vibração e feedback háptico;
- botões, HUD, mensagens e acessibilidade;
- estados persistidos, `lastAction`, saves antigos e migrações;
- BOT/IA e comportamento em todos os papéis;
- timers, janelas de reação e estados `pending`;
- DEVTOOLS e testes;
- Service Worker/cache/assets;
- documentação;
- imports e código/arquivos que podem ficar órfãos.

Se o destino de uma dependência não estiver claro, **não decidir sozinho**. Perguntar se Biel quer **preservar, reaproveitar ou remover**.

### Erro real que motivou esta regra

Ao substituir `Procurar carta` pelo Decreto/Monte Obrigatório, o efeito sonoro/apresentação antiga ficaram sem destino explícito de início. A mudança mecânica não autorizava apagar silenciosamente as dependências da apresentação.

---

## 3. Alerta não é a mesma coisa que execução

Antes de mudar um efeito, classificar cada feedback como:

- **alerta**: avisa que uma ação está disponível;
- **execução**: confirma que a ação realmente aconteceu;
- **estado persistente**: mostra que a regra continua ativa.

Não mover som/animação entre essas fases sem pedido.

### Exemplo aprovado — Decreto

**Alerta:**
- foco/flash mostra o botão;
- não bloqueia ainda;
- não toca o som da bota.

**Execução após clique confirmado:**
- aplica bloqueio;
- toca o som;
- executa animação;
- coloca a moldura no Lixo.

**Estado persistente:**
- moldura permanece até o turno do Escravo acabar completamente.

### Erro real

O som foi ligado ao alerta quando Biel queria o som apenas no clique. Não repetir.

---

## 4. Antes de culpar o elemento visual, auditar os ancestrais

Quando algo parecer:

- fosco;
- transparente;
- escuro;
- borrado;
- cortado;
- deslocado;
- menor do que deveria;

verificar primeiro:

- `opacity` de pais/ancestrais;
- `filter`;
- `transform`;
- `overflow`;
- `display`/`visibility`;
- pseudo-elementos;
- regras `!important`;
- media queries;
- CSS específico do modo/tema.

### Erro real

No Decreto, alterar `brightness(.94)` não resolvia o “fosco”. A causa era `#drawDiscardBtn` com `opacity: 0.5`, afetando carta e PNG juntas.

**Lição:** não insistir no primeiro diagnóstico visual quando ele não muda o resultado.

---

## 5. Uma animação e seu estado final devem compartilhar a mesma geometria

Se um elemento:

1. nasce em A;
2. voa para B;
3. vira um estado persistente em B;

então o voo e o estado persistente devem usar:

- o mesmo alvo real;
- a mesma escala final;
- a mesma referência de alinhamento;
- a mesma rotação esperada.

Evitar constantes duplicadas.

### Erro real

A moldura do Decreto voava para a carta em `1.24x`, mas o estado final estava em `1.6x`. Resultado: chegava pequena e crescia depois.

**Regra:** tamanho final deve ter uma única fonte de verdade.

---

## 6. Toda animação sincronizada deve ser testada local e remotamente

Não assumir que uma animação visível para quem executa aparecerá para o outro jogador.

Testar:

- quem iniciou a ação;
- quem recebeu o estado via sincronização;
- reload durante o estado persistente;
- reconexão quando relevante.

### Erro real

A animação da moldura do Decreto acontecia apenas na tela do Dominador. Na tela do Escravo, a apresentação remota era disparada antes de o novo estado estar aplicado e abortava.

**Lição:** a ordem entre `state recebido` e `apresentação remota` é parte da feature.

---

## 7. Campos nullable não podem ser comparados por coerção numérica sem guard

Evitar padrões do tipo:

```js
Number(nullableValue) === Number(turnNumber)
```

sem antes validar que o valor existe.

### Erro real crítico

```js
Number(null) === Number(0) // true
```

Isso fez uma partida nova em `turnNumber = 0` nascer com o Decreto visualmente ativo.

### Regra

Para estados opcionais de turno:

```js
value != null && Number(value) === Number(turnNumber)
```

E sempre criar teste explícito para **partida nova no turno 0**.

---

## 8. Não parar na primeira causa plausível

Quando o primeiro patch melhora o sintoma mas o bug volta:

1. reabrir o código atual;
2. reproduzir o caso exato;
3. diferenciar **estado lógico** de **estado visual**;
4. criar um teste específico para o cenário que falhou;
5. corrigir a raiz, não empilhar workaround.

### Erro real

O bloqueio aparecendo após Reiniciar Partida parecia inicialmente “estado visual antigo”. Houve um ajuste de render/reset, mas o bug continuou. A causa raiz real era `Number(null) === 0`.

---

## 9. DOM visual deve acompanhar a transição de estado, não esperar a animação seguinte

Quando uma carta sai da mão e outra animação vai começar depois, o DOM deve mostrar imediatamente o estado intermediário correto.

### Exemplo aprovado — Morto

```text
última carta sai
→ mão visual fica vazia
→ Morto anima
→ 11 cartas aparecem
```

### Erro real

A última carta descartada reaparecia/ficava na mão enquanto a animação do Morto aguardava, apesar de já ter saído do estado lógico.

Testar local e remoto.

---

## 10. Elemento central não pode participar do empurra-empurra lateral

Se um botão/controle precisa ficar no centro da mesa, ele não deve depender da largura dos irmãos num `flex` comum.

### Requisito aprovado

O botão **X** deve ficar no eixo central independentemente de:

- quantidade de botões;
- modo;
- BOT/humano;
- `CHAMAR AMIGAS`;
- `BLOQUEAR LIXO`;
- desktop/tablet/landscape.

### Erro real

O X “dançava” porque a quantidade/tamanho dos botões laterais alterava o centro do grupo.

**Lição:** centro visual importante precisa de zona/âncora própria, não de centro do conjunto inteiro.

---

## 11. Timers reativos e estados `pending` devem ser sincronizados com o BOT

Qualquer habilidade com janela de reação precisa definir claramente:

- quando a janela começa;
- quando a ação é confirmada;
- quando a animação termina;
- quando o BOT pode retomar o turno.

### Erro real — Decreto contra BOT

O Decreto podia ser clicado perto do fim dos 3 s. O BOT então:

1. via o Lixo bloqueado;
2. comprava do Monte;
3. tentava descartar;
4. o descarte era recusado porque `friendOperationPending` ainda estava ativo;
5. a recuperação também era recusada;
6. surgia:

```text
O bot terminou as jogadas sem encontrar um descarte legal.
```

### Regra permanente

Depois de uma ação reativa confirmada, o BOT deve **esperar a operação pendente terminar** antes de continuar o turno.

Não resolver apenas escondendo o erro do console.

---

## 12. Ensinar o BOT em todos os papéis da mecânica

Para qualquer habilidade assimétrica, responder duas perguntas separadas:

1. o BOT sabe **reagir contra** essa habilidade?;
2. o BOT sabe **usar** essa habilidade quando ocupa o papel que a possui?

### Exemplo — Decreto

**BOT Escravo:**
- tenta pegar Lixo;
- dá janela ao Dominador;
- se bloqueado, cai para Monte;
- espera a operação terminar e continua.

**BOT Dominador:**
- avalia mão + mesa do Escravo;
- não gasta habilidade 1x/partida em ameaça fraca;
- usa em ameaça relevante;
- intenção real de pegar Lixo aumenta urgência;
- contra humano usa pequeno atraso de reação para não parecer leitura instantânea.

### Erro real

O BOT tinha aprendido a sobreviver ao Decreto, mas não a usá-lo como Dominador. A antiga Busca tinha uso automático e essa inteligência não havia sido migrada.

---

## 13. Corrigir semântica sem redesenhar apresentação não solicitada

Mudança interna e mudança visual são escopos diferentes.

### Erro real — tela de atualização

Ao corrigir ativação do Service Worker, a apresentação aprovada foi trocada de:

```text
Sincronizando Módulos...
Compilando pacotes (1/N)...
Mesa pronta!
```

para outra interface sem pedido.

A semântica correta é:

- versão só é marcada como aplicada depois de `controllerchange`;
- checagem usa `cache: 'no-store'`;
- retry sem reload prematuro.

Mas a UI antiga aprovada deve permanecer.

**Regra:** consertar mecanismo não autoriza redesenhar feedback.

---

## 14. Service Worker — quando tocar e quando não tocar

Não incrementar cache por hábito.

Pode tocar no Service Worker quando houver motivo real, por exemplo:

- novo asset que precisa entrar no cache;
- mudança real de estratégia de cache;
- necessidade explícita de publicação/ativação do pacote atual;
- correção específica do fluxo de atualização.

Antes de gravar:

- buscar o SW atual do Drive;
- não aplicar bump sobre cópia velha;
- preservar a UI aprovada de atualização;
- validar `skipWaiting`, `controllerchange` e assets.

**Versão de referência em 05/10/2026:** `buraco-v269`.

---

## 15. Matriz mínima de regressão — Dominação / Decreto

Ao tocar em Decreto, Dominação, alerta, animação, BOT ou Lixo, testar os casos relevantes abaixo:

| Cenário | O que observar |
|---|---|
| Dominador humano × Escravo humano | alerta, clique, som, bloqueio, moldura |
| Dominador humano × Escravo BOT | janela 3 s, fallback para Monte, sem erro de descarte |
| Dominador BOT × Escravo humano | uso inteligente, sem gasto aleatório, atraso de reação |
| Dominador BOT × Escravo BOT | intenção real de Lixo aumenta urgência |
| partida nova | `turnNumber = 0` não nasce bloqueado |
| Reiniciar Partida | nenhum estado/PNG da partida anterior |
| tela remota | mesma animação/estado do local |
| clique perto do fim dos 3 s | BOT espera `pending` terminar |
| após compra do Monte | moldura continua até fim completo do turno |
| fim do turno | moldura desaparece |
| reload durante bloqueio | estado persistente reconstrói corretamente |
| Lixo desabilitado | carta/PNG não ficam foscas por opacidade do pai |

---

## 16. Matriz mínima de regressão — UI central / Morto

Ao tocar em ações da mesa ou transições de mão:

- X continua central com 1, 2, 3, 4+ botões;
- X continua central com `BLOQUEAR LIXO` aparecendo/desaparecendo;
- testar desktop largo;
- testar tablet landscape;
- testar viewport pequeno;
- última carta some antes do Morto;
- tela adversária também mostra mão vazia antes da entrada do Morto.

---

## 17. Auditoria histórica confirmada pelo Git — regressões reais que já voltaram atrás

Esta seção vem de uma varredura do histórico do repositório `Thilanguis/Buraco` e dos testes de regressão atuais. Ela registra **casos confirmados por commits**, não inferências da conversa.

### 17.1 Tentativa visual não pode deslocar geometria que já funciona

**Commit:** `de07b5b` — *fix: estabiliza o fluxo do bot e faz rollback das tentativas visuais de animação*.

O próprio commit registra rollback de:
- carta extra embaixo do Monte;
- alterações na renderização original do Monte;
- alinhamento do Morto;
- mudanças visuais que quebravam posição das cartas e texto Monte/Lixo.

**Regra preventiva:** para adicionar moldura, animação, brilho ou tema, **não reposicionar Monte/Lixo/Morto para o efeito caber**. O efeito deve se adaptar à geometria aprovada. Se uma tentativa visual exigir alterar a base, comparar antes/depois em desktop e tablet e ter rollback simples.

### 17.2 Overlay não pode entrar no layout e empurrar a mesa

**Commit:** `7dde451` — diálogo do chefe voltou a ser overlay absoluto porque participar do grid quebrava o layout mobile. O mesmo commit explicitou que Monte/Lixo usam geometria única e não devem ser reposicionados no boss-mode.

**Regra preventiva:** diálogos, avisos, apresentações e efeitos temporários devem ser **overlay quando não são conteúdo estrutural**. Antes de usar `position: relative`, `grid-column`, flex item ou aumentar altura do HUD, verificar se isso deslocará mesa/pilhas.

### 17.3 Função existente não pode desaparecer em refactor grande

**Commit:** `ba75aea` — `finishGame` precisou ser restaurada depois de ter sido apagada; o mesmo commit removeu bloqueio residual do Lixo e tratou race de autoplay/duplo descarte.

**Regra preventiva:** em arquivo grande, antes/depois do patch procurar funções/eventos críticos por nome e comparar quantidade de ocorrências. Não fazer broad replace sem conferir o que sumiu. Para fluxos centrais, manter uma lista de símbolos que não podem desaparecer.

### 17.4 Estado de seleção temporário precisa morrer em reset, snapshot e desmarcação

**Commit:** `403ca97` — `selectedMeldTarget` ficou fantasma, apontou para jogo inexistente e podia causar `undefined is not iterable` na compra do Lixo.

**Regra preventiva:** toda seleção local (`selected*`, `moving*`, alvo visual, índice de jogo) deve ter ciclo de vida explícito:
- limpar ao desmarcar;
- limpar em reinício;
- limpar em snapshot que troca partida;
- validar o alvo novamente antes de usar.

### 17.5 Declaração duplicada / patch textual pode impedir o app inteiro de abrir

**Commits:** `7d428bd` e `e720cf1` — corrigiram `SyntaxError` por declaração duplicada de `movingWild`; `2dba11c` corrigiu outro erro sintático que travava a mesa do espectador.

**Regra preventiva:** depois de editar JS grande, `node --check` é obrigatório. Se houve merge/substituição textual, procurar declaração duplicada dos identificadores alterados antes de publicar.

### 17.6 Não reativar timers/BOT ao voltar de background sem validar a sessão

**Commits:** `de07b5b`, `7d428bd`, `2318e1b`. O histórico registra bot duplicado, gatilho agressivo em `visibilitychange`, timeouts antigos, snapshots/animações reabrindo partida encerrada e necessidade de cancelamento por sessão.

**Regra preventiva:** qualquer timer assíncrono deve validar:
- sessão/partida ainda é a mesma;
- turno ainda é o mesmo;
- app não está fechando;
- estado não foi substituído por snapshot mais novo.

Nunca usar `visibilitychange` para simplesmente “recomeçar” um turno.

### 17.7 Áudio/vídeo com Range não deve ser tratado como recurso comum do Cache API

**Commit:** `2318e1b` — requisições parciais 206 de MP3/MP4 acabavam em 503 pelo Service Worker.

**Regra preventiva:** preservar a exceção atual para `Range`, `audio` e `video`. Ao mudar SW/cache, testar pelo menos uma música de mesa, um SFX e um vídeo. Não “simplificar” o fetch handler removendo essa exceção.

### 17.8 Corrigir um áudio específico não pode esquecer os outros temas

**Commit:** `ee30929` — prioridade de áudio estava especial-cased apenas para Lunar e precisou ser generalizada para **todos** os `TABLE_ASAS_SFX`.

**Regra preventiva:** quando um recurso é temático, pesquisar coleção/mapa completo de temas antes de corrigir um único caso. Não criar `if (theme === X)` se a regra é do tipo de evento, não do tema.

### 17.9 Animação assíncrona precisa ser aguardada quando sua ordem visual importa

**Commit:** `f7d7c95` — foram adicionados `await`s para evitar “teletransporte” visual; também foi corrigido seletor que havia perdido a animação de roubo e removido `scale/text-shadow` herdado que borrava carta.

**Regra preventiva:** se o passo B depende de o usuário ver A terminar, B deve aguardar A. Não usar timeout solto como substituto de uma Promise de animação quando a sequência for funcional. Depois de trocar classes/seletor, testar se o nó real ainda é encontrado.

### 17.10 Resolver Morto localmente antes de publicar estado quando a ordem evita deadlock

**Commit:** `e13d7f8` — o Morto precisava ser anexado ao estado/`lastAction` antes do `commitState()` para evitar race e mão corrompida.

**Regra preventiva:** ao mexer em batida direta/Morto, não mudar a ordem `resolver estado local necessário -> construir ação -> commit` sem teste específico. Testar mão zerando por descarte, criação e extensão de jogo.

### 17.11 Estado visual de mão/pilha deve seguir estado lógico sem reaparecer

**Commit:** `9086892` — a última carta saía para pegar o Morto e voltava visualmente para a mão por alguns segundos.

**Regra preventiva:** toda transição de carta deve ter um estado intermediário explícito. A animação seguinte não pode renderizar snapshot anterior da mão. Testar a mesma transição na tela local e remota.

### 17.12 Regra que depende do “meu time” não pode usar jogador/time fixo

**Commit:** `5328813` — HUD de metas precisava ser vinculado ao time local para contagem correta de Mortos/progresso.

**Regra preventiva:** em HUD/estatística, derivar sempre o time do observador/jogador atual; não assumir `team[0]`, host, Dominador ou cadeira fixa quando a UI é relativa ao usuário.

### 17.13 Efeitos persistentes podem entrar em conflito e criar soft-lock

**Commit:** `4544a8b` — Jogo Espelhado e Presa Persistente precisaram de prioridade explícita para não bloquear uma obrigação ativa.

**Regra preventiva:** ao adicionar restrição nova, montar matriz com outras restrições persistentes. Definir precedência explícita e garantir pelo menos uma ação legal. Não empilhar dois `canX === false` independentes sem analisar a interseção.

### 17.14 Habilidade não pode criar objetivo impossível

**Commit:** `dc6397b` — Jogo Espelhado podia pedir encaixe sem o usuário possuir uma carta legal.

**Regra preventiva:** antes de criar objetivo/ameaça, validar que existe solução real no estado atual. Em habilidade gerada por IA/RNG, a elegibilidade deve ser verificada **antes** de persistir a intenção.

### 17.15 Nulls/cartas fantasma vindos de sincronização devem ser tratados na borda

**Commit:** `4dfb66b` — UI e BOT precisaram de blindagem contra cartas `null` geradas por dessincronização.

**Regra preventiva:** entradas vindas de Firebase/snapshot devem ser validadas antes de render/IA. Porém, `optional chaining` é defesa de borda, não desculpa para manter estado corrompido; procurar também a origem.

### 17.16 Atualização visual não pode regredir escala em telas grandes

**Commit:** `fe4d432` — houve “carta gigante em 4K”, corrigida travando transição/escala e padronizando o alvo do Lixo para `.pile-card`.

**Regra preventiva:** qualquer mudança em `transform`, `scale`, `transition`, `vw/vh`, `clamp()` ou container de carta deve ser validada também em viewport muito largo/4K, não só mobile/tablet.

### 17.17 Roubo/efeito especial não pode acionar regra paralela de Morto sem intenção

**Commit:** `07fd6bc` — roubo de carta precisou ser separado do ganho de Morto e sincronizado remotamente.

**Regra preventiva:** ações especiais que movem cartas devem declarar quais gatilhos normais **não** devem rodar (Morto, compra padrão, descarte, recompensa, etc.). Não reutilizar handler genérico se ele carrega efeitos colaterais extras.

### 17.18 BOT: proteger contra duplicidade sem mascarar estado inválido

O código atual possui `_turnLocks` e commits como `de07b5b`/`2318e1b` reforçaram cancelamento e sessão.

**Regra preventiva:** trava de duplicidade é última linha de defesa. Se ela dispara com frequência, investigar quem agenda o mesmo turno duas vezes. Não “resolver” apenas adicionando mais locks.

### 17.19 DEVTOOLS deve usar o mesmo motor real, não uma versão paralela simplificada

O histórico recente contém vários commits de correção de DEVTOOLS e laboratório (`8b165f2`, `6334760`, `6e69be7`).

**Regra preventiva:** cenário de laboratório deve montar estado e chamar a lógica oficial. Se um bug aparece só no DEVTOOLS, verificar primeiro se o laboratório divergiu do fluxo real antes de alterar a regra do jogo.

### 17.20 Trocar mecânica exige migrar também inteligência, apresentação e testes

**Commits recentes:** `e718daa`, `35f6b10`, `d833a9b`. A troca de `Procurar carta` por Decreto mostrou que substituir a regra sem migrar todos os anexos gera regressões em som, alerta, BOT, animação, atualização e estados antigos.

**Regra preventiva:** qualquer substituição de feature precisa de uma tabela explícita:

| Parte antiga | Destino novo |
|---|---|
| regra | preservar/substituir/remover |
| som | preservar/reusar/remover |
| animação | preservar/reusar/remover |
| alerta | preservar/reusar/remover |
| BOT usando | migrar estratégia |
| BOT enfrentando | migrar reação |
| save antigo | migrar estado |
| DevTools/testes | atualizar cenários |
| SW/assets | atualizar somente se necessário |

### 17.21 Testes de regressão existentes são documentação executável

O repositório atual já tem testes explicitamente voltados a regressões, incluindo:
- `tests/domination-layout.browser.mjs`;
- `tests/match-control.test.mjs` com regressão de clique rápido/descarte;
- `tests/discard-pickup.test.mjs` cobrindo cancelamento de animação;
- `tests/boss-integration.test.mjs` cobrindo restauração visual de ação negada;
- testes de boss/DEVTOOLS/reload/undo.

**Regra preventiva:** antes de mudar uma área, procurar testes existentes com o nome da feature e palavras `regression`, `reload`, `undo`, `remote`, `bot`, `layout`. Se o bug já existiu, fortalecer o teste antigo em vez de criar proteção paralela.

---

## 18. Checklist operacional antes de aplicar qualquer patch

### Antes

- [ ] Entendi exatamente o pedido e o que **não** foi pedido.
- [ ] Abri o arquivo atual do Drive.
- [ ] Auditei dependências da feature.
- [ ] Procurei implementação existente semelhante antes de criar uma nova.
- [ ] Conferi CSS global + responsivo + específico do modo/tema.
- [ ] Conferi comportamento local + remoto se houver sincronização.
- [ ] Conferi humano + BOT em todos os papéis relevantes.
- [ ] Identifiquei states nullable/timers/pending envolvidos.
- [ ] Não vou alterar UI/texto/som fora do escopo.

### Antes de gravar

- [ ] Reconfirmei `modified_time` do Drive.
- [ ] O arquivo não mudou desde que comecei.
- [ ] Patch é mínimo e não reformatou arquivo gigante sem necessidade.
- [ ] `node --check` passou nos JS alterados.
- [ ] Testes específicos do fluxo passaram.

### Depois de gravar

- [ ] Baixei de volta os arquivos oficiais do Drive.
- [ ] Rodei os testes usando essa cópia oficial.
- [ ] Verifiquei Service Worker/assets se aplicável.
- [ ] Atualizei documentação permanente quando a regra mudou.
- [ ] Atualizei handoff se existe contexto temporário importante.
- [ ] Listei exatamente quais arquivos foram alterados.
- [ ] Se é visual e Biel ainda não confirmou, digo **“aplicado”**, não “resolvido”.

---

## 19. Erros que não devem voltar — resumo rápido

1. mudar coisa não pedida;
2. remover efeito acoplado sem auditar;
3. confundir alerta com execução;
4. diagnosticar visual sem olhar ancestrais;
5. usar escalas diferentes no mesmo voo/estado final;
6. animar local e esquecer remoto;
7. deixar `null` virar `0` em regra de turno;
8. aceitar primeira hipótese sem reproduzir cenário;
9. manter DOM velho durante transição do Morto;
10. deixar elemento central depender de flex lateral;
11. devolver controle ao BOT enquanto ação reativa está `pending`;
12. ensinar só um papel do BOT;
13. corrigir mecanismo mudando UI aprovada;
14. sobrescrever arquivo do Drive que mudou;
15. confiar em tamanho do arquivo sem diff;
16. declarar “resolvido” sem validação visual real;
17. reposicionar geometria aprovada para acomodar efeito visual;
18. deixar overlay temporário entrar no grid/fluxo;
19. apagar função/evento existente durante refactor amplo;
20. carregar seleção local fantasma entre snapshots/reinícios;
21. publicar JS sem checar duplicação/sintaxe;
22. reativar BOT/timers antigos ao voltar de background;
23. remover exceção de Range de áudio/vídeo no Service Worker;
24. corrigir áudio só para um tema quando a regra é global;
25. iniciar etapa B antes de a animação A realmente terminar;
26. mudar ordem de commit do Morto sem teste de deadlock;
27. assumir time/cadeira fixa em HUD relativo ao usuário;
28. combinar restrições persistentes sem matriz de compatibilidade;
29. gerar objetivo de habilidade sem solução legal;
30. alterar transform/scale sem testar viewport largo/4K;
31. reutilizar ação especial em handler genérico que dispara efeitos colaterais;
32. usar lock de BOT para esconder agendamento duplicado em vez de achar a origem;
33. validar carta-alvo na lógica, mas não conferir se a marcação sobrevive à renderização da arte.

---

## 20. Relação com outros documentos

- `docs/README.md`: explica hierarquia de documentação e fonte de verdade.
- `docs/DOCUMENTACAO_CHEFE_DA_MESA.md`: regra funcional permanente dos chefes.
- `docs/INVENTARIO_HABILIDADES_CHEFES.md`: inventário compacto de habilidades.
- `HANDOFF_...md`: contexto recente, pendências e decisões ainda em transição.

Este checklist deve ser tratado como **documentação permanente de manutenção**, não como histórico de conversa.

## 21. Regra permanente: objetivo cumprido não alivia a condição do chefe

- Vale para Dívida, Dominação, Flores, Sede, Mundo do Espelho e Infecção.
- Cumprir objetivo evita sua punição; nunca concede delta negativo na condição especial.
- Objetivos independentes: sucesso em um não desconta a punição da falha de outro.
- Preservar alívio por canastras (Limpa / Real / Ás-a-Ás), incluindo Flores.
- Não confundir com gasto do próprio chefe por vantagem: Vinho Carmesim e Renascimento continuam funcionando. Favorita não é exceção: F2/F3 mantém protegida inalterada (0) e pune o cooperador menos dominado com +8.
- Não alterar custos positivos de escolha/obediência já aprovados nem valores de falha ao corrigir recompensas negativas.
- Auditar engine, adapters, BOT, Laboratório, snapshots legados, HUD/ajuda, definições e documentos; não basta trocar o texto.
- Rodar `tests/boss-objective-resource-rule.test.mjs`, testes de alívio, chefes e suíte ampla. Comparar falhas com baseline e registrar testes bloqueados.
- Helpers do Nemesis ficam em faixa externa abaixo do HUD, como Filhas/Capangas. Validar altura do HUD, chips INVADINDO/ATIVO e ajuda contida nos cinco viewports.

Revisão de 05/10/2026: fonte de verdade exclusivamente local por instrução expressa; sem operações no Google Drive. Detalhes em `REVISAO_OBJETIVOS_CHEFES.md`.

## 22. Ajudas ancoradas e marcações de jogos

- Todo `?` abre o popover oficial perto do próprio botão, com ponteiro; testar chefe, habilidade, S.T.A.R.S., alvo e zumbis.
- Ajustar posição para viewport, scroll e resize; evitar cortes pelo HUD/card. Escape, fechar e clique fora continuam funcionando.
- Textos em blocos curtos, específicos da habilidade. Não anexar regras genéricas irrelevantes nem remover números, prazos ou exceções essenciais.
- Horda/Ômega e duração ficam no painel amarelo. Alvo do dano integrado à arte, sem faixas soltas acima/abaixo dos zumbis.
- Moldura de chefe envolve somente `.meld-line-cards`. Canastra/Limpa, pontuação e contribuições ficam fora. Padronizar Penhora, Posse, Interdito, Raiz, Enxerto, Banquete, Impacto e Espelho, mantendo os efeitos especiais já restritos às cartas.
- Regressões: `boss-ui-readability.test.mjs` e `nemesis-ui.browser.mjs` (cinco viewports, oito famílias de marcação). Não mudar mecânicas para corrigir apresentação.

## 23. Carta-alvo precisa estar marcada na tela — regra para novos chefes e habilidades

Regressão de 05/10/2026: Invasão da Horda escolhia corretamente a carta do Agarrador, mas `renderHand()` anexava seu selo antes de substituir a face com `innerHTML`. A arte apagava o selo. Ter `cardIds` correto no estado ou uma classe CSS não comprova que o jogador vê o alvo.

- [ ] Anunciar a habilidade pelo fluxo real/Laboratório e conferir a carta exata do jogador alvo, não uma carta fictícia marcada manualmente.
- [ ] Renderizar a face antes de anexar overlays/selos; verificar que nenhum `innerHTML` posterior apaga a marcação.
- [ ] Conferir alvo correto, parceiro sem marca indevida, múltiplas cartas e decks diferentes. Não ocultar valor, naipe, seleção ou selo NOVA.
- [ ] Conferir aplicar/remover a marca conforme o estado real, término/expiração, rerender, reload/snapshot/undo e cliente remoto. Não deixar overlays duplicados ou persistentes após o efeito terminar.
- [ ] Usar a identidade visual do chefe e o componente oficial de status; distinguir carta marcada, restrição e área de perigo. Nemesis: infecção verde na carta; Zona de Impacto/perigo laranja.
- [ ] Overlay não intercepta cliques, não aumenta a carta e respeita redução de movimento; animação leve, sem timers por carta.
- [ ] Testar no navegador os viewports adotados e revisar captura visual. Registrar separadamente o que foi automatizado e o que ainda depende de partida real/validação do usuário.
- [ ] Atualizar documentação funcional, inventário e relatório específico do chefe. Comparar textos com código atual, removendo descrições antigas conflitantes.

Proteção automatizada atual: `tests/nemesis-ui.browser.mjs` verifica ordem da renderização, alvo real da entrada do Agarrador, parceiro sem marca, selos MARCADA/AGARRADA/CONTAMINADA, efeito verde compartilhado, ausência de duplicação, limpeza do overlay, NOVA sem sobreposição e redução de movimento. O teste de navegador usa fixture local, não uma sessão Firebase ao vivo; os demais itens da matriz continuam obrigatórios em futuras alterações.
# Matriarca — teto de Flores por ativação (05/10/2026)

- Uma mesma ativação gera no máximo +1 Flor, mesmo que vários objetivos falhem em turnos diferentes. Reload/snapshot/undo preservam o histórico das Flores aplicadas; canastra não reabre a quota da ativação.
- Trepadeiras Gêmeas: 1 ou 2 falhas = +1 no total; propagação por falha dupla preservada.
- Enxerto: parcial/total = +1; propagação por falha total preservada.
- Florescimento Real: todas as falhas compartilham +1; sem cura/fortalecimento novos.
- Preservar HP 2000, derrota em 5, Limpa −1 / Real −1 adicional / Ás-a-Ás −1 adicional, Orvalho, Casulo, cura atual e Renascimento F3 (1x, consome 1 Flor, 300 HP).
- Reavaliar a cura somente depois do teste de jogo; este patch não altera seus limites nem outros chefes.
# Regra global de recuperação e Favorita (05/10/2026)

Cumprir uma habilidade nunca reduz a condição especial de vitória do chefe. O sucesso apenas evita a punição. A recuperação concedida aos jogadores ocorre somente através das canastras aprovadas. Sucesso parcial não recupera recurso. A regra também vale para efeitos automáticos, como Favorita, e recursos equivalentes futuros.

- Exceções: gastos internos aprovados, como Vinho Carmesim e Renascimento. Não são recompensas aos jogadores.
- Favorita F2/F3: protegida 0; cooperador menos dominado +8; seleção e aplicação única preservadas. Não alterar os demais valores/chefes.
- Regressão global percorre todas as habilidades ativas registradas e suas fases com recurso inicial positivo; as exceções são identificadas explicitamente. Testes específicos cobrem sucesso, parcial, canastras e snapshot.

## 24. Suíte local e fixtures — revisão de 06/10/2026

- [ ] Executar a suíte atual antes de corrigir. Distinguir regressão de produção, expectativa antiga, harness incompleto e sincronização; não usar skip/todo para esconder falhas.
- [ ] Funções extraídas de `app.js` devem receber as dependências atuais: gate real de ação/pausa, wrappers e implementações `Once`, helpers importados e callbacks isolados. Não adicionar globals artificiais à produção para satisfazer uma VM antiga.
- [ ] Ler módulos e CSS no caminho atual; styles específicos de chefe podem estar separados de `boss-mode.css`. Validar versão atual do cache sem regredir releases para satisfazer literals antigos.
- [ ] Loops de avanço de apresentação devem ter limite e assertion de estágio. Uma escolha humana pendente não avança para `players` sem resolução; não esperar esse estágio indefinidamente.
- [ ] Cenários `no_target` precisam realmente retirar todos os alvos válidos, preservando as 108 cartas. Fallback de teto de fase/cadáver deve ser esperado explicitamente, sem flexibilizar a exigência da habilidade escolhida nos demais cenários.
- [ ] Canastra criada pelo DevTools deve persistir o mesmo controle de bônus do fluxo normal. Reprocessar após reload não pode conceder nova compra no mesmo turno.
- [ ] Manter o orçamento do HUD: se o texto estourar, corrigir a apresentação, não aumentar silenciosamente o limite do teste. Validar nos viewports do browser test.
- [ ] Conferir cura anunciada contra mecânica: Pólen até 30 HP; Colheita 0–7 nada, 8–10 cura 50, 11+ cura 80 e +1 Flor. Corrigir somente texto quando o motor já estiver certo.

Resultado e classificação desta revisão: `docs/LIMPEZA_SUITE_2026-10-06.md`. Nenhuma regra de balanceamento foi revertida.

## 25. Lixo protegido dos chefes e UX do Nemesis — 06/10/2026

- [ ] Decreto contra Escravo BOT: testar bloqueio antes da compra e durante a janela de reação. BOT compra do Monte, sem coletar o Lixo. `BOT_PLAN_STALE` em sessão/turno ainda válidos retoma a recuperação após concluir a operação do Decreto; cancelamento real, troca de turno ou saída da sessão não podem comprar/descartar. Não deixar `lastBotTurnPlayed` travar um turno com plano invalidado. Cobertura: `domination-decree-bot-resume.test.mjs`.

- [ ] Regra limitada a TODOS os modos Chefe, sem alterar Buraco normal/Dominação. Destino realmente escolhido: jogo existente → topo; jogo novo pela mão → inteiro; Joker → topo; 2 existente → topo; 2 coringa novo → topo; 2 natural novo → inteiro.
- [ ] Papel do 2 usa o validador canônico; 2–3–4 e 3–4–2 equivalentes. Não criar detector paralelo ou decidir pela posição visual.
- [ ] Mostrar feedback curto antes de consumir. Humano/BOT usam a mesma consulta e quantidade real para mão final, Morto/batida e limites. Bloqueio/erro não move cartas; rerender/snapshot/reload não duplica retirada.
- [ ] Ajuda opcional `?` junto ao contador do Lixo somente no modo Chefe: não disparar retirada, não duplicar controle nem criar avisos adicionais. Validar mouse/toque/Enter/Escape, compra bloqueada, saída do modo e popover dentro dos cinco viewports. O componente oficial precisa inicializar fechar/teclado mesmo sem habilidade ativa. Fixture do HUD deve incluir a seção externa inteira, não encerrar na seção aninhada oculta do registro.
- [ ] Nemesis INVADINDO: explica expulsão, sem HP de combate nem alvo. Arte principal seleciona boss; chip/help não seleciona. Testar teclado e permissões de turno/observador.
- [ ] Chip final calculado com a passiva real: Agarrador 1/2/3, Infectado 2/4/6, Devorador 40/70/100; incluir Normal + Reforçado 2/4/70. Ajuda específica de Mutado e reforço, prazo inclusivo (`roundNumber + 1`). Comando apenas persistent vivo.
- [ ] MARCADA / AGARRADA / CONTAMINADA na carta exata; mesma identidade verde. Pulso de Agarrada só em evento novo, sem replay, depois marca estática; limpar no término/morte, respeitar redução de movimento.
- [ ] Comparar contorno, espessura e brilho reais da mão/Invasão com o Lixo: um único overlay compartilhado, sem somar bordas/glows no contêiner e na face. Pulso altera apenas opacidade, sem engrossar ou ampliar a marca. A fixture deve decorar a face real do Lixo, não apenas ativar a classe do contêiner.
- [ ] Comparar contorno, espessura e brilho reais da mão/Invasão com o Lixo: um único overlay compartilhado, sem somar bordas/glows no contêiner e na face. Pulso altera apenas opacidade, sem engrossar ou ampliar a marca. A fixture deve decorar a face real do Lixo, não apenas ativar a classe do contêiner.
- [ ] Zona de Impacto somente em `.meld-line-cards`, excluindo metadados/cabeçalho.
- [ ] Objetivos usar/descarte comprovam rota real de jogo no planejador existente; descarte continua resolvendo depois. Barragem prova duas saídas jogáveis conjuntas; Extermínio contribuição + segunda carta. Sem plano → inelegível/fallback.
- [ ] Rodar regra do Lixo, handlers humano/BOT, Nemesis, laboratório, integração e suíte ampla; browser nos cinco viewports. Medir proximidade do popover entre bordas, não a partir do centro de um chip largo.

Relatório e limitações: `REGRA_LIXO_E_UX_NEMESIS_2026-10-06.md`. Sem novo balanceamento, commit, deploy ou Google Drive.
