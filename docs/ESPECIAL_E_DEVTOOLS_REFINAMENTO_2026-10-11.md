# Especial e DevTools — refinamento de 11/10/2026

## Alterações

Somente apresentação do Especial e ferramentas autorizadas de cenário. Sem
mudança nas regras, no custo, nos cinco resgates do Lixo ou no balanceamento.
Sem alteração das PNGs, do espaçamento da mão ou dos controles normais de jogo.
Sem commit, push ou deploy.

### Especial

O voo existente estava pouco visível: versos pequenos, fade durante quase todo
o trajeto e uma variável de cor que não era efetivamente gravada no CSS. Agora
são cinco versos mais legíveis, com bordas, arco e opacidade sustentada até perto
da chegada. A apresentação total continua com 3.000 ms; início do voo em 900 ms,
900 ms de voo por carta, intervalo de 75 ms e última chegada em 2.100 ms.

Ada, Jill e Sailor usam o quadro comum baseado na proporção da Jill e uma faixa
comum da mesa. Não há mais seleção de quadro por proporção da PNG ou por chips
específicos do chefe. `object-fit: contain` mantém a proporção original: quadro
igual não significa esticar a Sailor para a largura da Jill. Cartas/controles
continuam independentes da animação e acessíveis; o overlay pode passar pela arte
dos retratos/auxiliares, sem capturar cliques ou mudar seu layout.

Fallback, movimento reduzido, ID confirmado, deduplicação, proteção de faces,
snapshot, undo/reload e cancelamento permanecem no fluxo existente.

### DevTools

A causa das compras/descarte bloqueados era o uso de `ensureMyTurn`, destinado
aos controles normais do jogador. As ferramentas agora têm validação própria,
limitada ao acesso DEV já existente: localhost ou autorização administrativa.

- `Mão / jogador do cenário` seleciona compras, descarte, canastra e preparações.
  `Minha mão` é o padrão; é possível escolher o jogador do turno ou outro jogador.
- +5, +30, -5 Lixo, canastras, preparação e encerramento não exigem a vez do dono
  do painel. Pause/resume também funciona na vez do BOT.
- Mutações DEV são serializadas entre si para preservar os saves. Interrompem
  imediatamente timers/planejamento, BOT em execução, gesto da mesa, voo e
  operação antiga da amiga. Não aguardam o turno, a promessa do BOT ou a trava
  normal da mesa. Usam um bloqueio temporário antes de salvar o cenário.
  Ao terminar, retomam automaticamente uma partida que estava rodando.
  Se o usuário já havia congelado a partida, preservam essa escolha. Somente o
  botão Congelar/Descongelar mantém ou remove a pausa manual.
  O bloqueio temporário não mostra o overlay nem troca o texto do botão de pausa.
- Snapshots congelados interrompem a automação nos outros clientes também,
  antes de esperar um gesto pendente. Revisões antigas não cancelam a mesa.
  Controles normais, timeout, BOT e avanço automático do chefe ficam bloqueados
  durante esse congelamento; não ganham permissão administrativa.
- Commits DEV podem editar cenário mesmo durante pausa normal, mas continuam
  respeitando identidade da partida, revisão e votação/surrender. Uma revisão
  concorrente não é sobrescrita à força.
- Se outro cliente salvar a jogada do BOT antes do congelamento, a ferramenta
  tenta novamente sobre a revisão recebida, no máximo três vezes. Se não for
  seguro congelar, informa o motivo e não altera as cartas.
- O bloqueio temporário tem ID próprio. A limpeza não remove uma pausa explícita
  recebida de outro cliente nem edita outra partida. A retomada também respeita
  as revisões canônicas e tem no máximo três tentativas.
- Operações/commits antigos têm um identificador de geração local. Após a
  intervenção DEV não podem gravar/adotar resultados atrasados, liberar uma
  trava mais nova nem retomar o BOT interrompido. Transações normais também
  rejeitam escrita sobre um congelamento DEV recebido do servidor.
- O laboratório usa a mesma prioridade: preparar, recursos, auxiliares,
  passivas, objetivos, BOT, Voltar e Resetar. A execução manual do BOT tem
  permissão estrita de teste para agir durante o congelamento; o BOT normal
  não tem essa permissão. Nova ferramenta interrompe o teste manual do BOT.
- Voltar no laboratório restaura o undo do cenário independentemente da vez
  do jogador. Reset preserva a escolha de pausa atual, sem copiar um bloqueio
  temporário obsoleto do snapshot-base. Undo normal do jogador não foi alterado.
- Voos de recompensa/Morto não seguram a conclusão do comando DEV. Reciclagem
  feita por comando DEV não espera os dois segundos da apresentação normal.
- Persistência ainda depende da resposta do Firebase. Não há escrita forçada
  sobre revisão concorrente, operação em outra partida ou acesso não autorizado.
- O resultado permanece marcado como teste (`historyTest`).
- Painel com posição fixa, rolagem e camada própria fora de `gameSection`, acima
  dos overlays da partida. O acesso/autenticação não foi ampliado.

## Arquivos

- `app.js`: enquadramento, alvo das ferramentas, prioridade DEV, congelamento
  local/remoto, cancelamento e proteção contra commits/snapshots obsoletos.
- `js/game/match-control.js`: cancelamento da trava sem liberar uma ação nova.
- `boss-bot.js`: somente o BOT de teste autorizado ignora o congelamento DEV.
- `js/boss/ui/cooperative-special-presentation.js`: quadro/tempo, versos e cor.
- `styles/boss-mode.css`, `index.html`: somente overlay/painel e seletor DEV.
- `service-worker.js`: versão local v308.
- Testes de apresentação, DevTools, fixtures P0 e regressões de Dominação/menu.

## Evidências e limites

Os testes usam handlers reais com estados serializados/transportes simulados.
Não são duas contas autenticadas no Firebase nem dispositivos físicos.

- Primeira execução: 1.433 unitários aprovados em `.cache/special-devtools-full-unit.log`.
  Após a correção da pausa automática, 1.436 testes aprovados em
  `.cache/devtools-pause-fix-unit.log`.
- Especial: 36 apresentações (três personagens, três destinatários e quatro
  viewports), com cinco versos, quadro comum e verificações de deduplicação,
  cancelamento, fallback e movimento reduzido.
- Regressão ampla de navegador: `.cache/special-devtools-complete-browser.log`
  registra os três viewports maiores aprovados e as apresentações nos quatro.
  A medição antiga de chip em 390 px incluiu o zoom de foco existente (6%);
  o teste agora mede o chip em repouso, sem alterar o CSS dos chips.
  `.cache/special-devtools-final-mobile.log` registra a execução completa de
  390 px aprovada, incluindo as 136 combinações de habilidade/fase e P0.
- DevTools: 48 cenários (12 modos × quatro viewports), mouse/toque e vez do BOT,
  inicialmente em `.cache/devtools-pause-fix-browser.log`. A revisão de prioridade
  amplia para todos os comandos gerais visíveis, incluindo quatro canastras,
  preparações, fim/reinício, temas, amigas e Visão; BOT/trava sem resolução são
  injetados para comprovar que a ferramenta não os espera.
  Resultado: `.cache/devtools-priority-browser.log`.
- Laboratório: seis chefes × quatro viewports; recursos −/+/quase cheio/zerar,
  preparar/resetar, BOT sucesso/falha, todos os zumbis e filhas, aplicação/undo
  de auxiliar e resolver objetivo do Infectado. BOT manual também testado durante
  pausa explícita, preservando-a. Handlers, engine do cenário, BOT, descarte e avanço de turno reais;
  transporte/saves simulados. Mesma evidência de navegador acima.
- 29 testes focados em `.cache/devtools-priority-focused.log`: acesso, todos os
  bindings mutáveis, takeover, preservação de pausa, fila DEV, commits obsoletos,
  snapshot remoto prioritário, CAS e execução manual do BOT sob congelamento.
- Suíte final: 1.445 testes aprovados, sem falhas ou skips, em
  `.cache/devtools-priority-all.log`.
- Regressão da seleção normal de alvo/turno do Nemesis, DOM e ajuda por toque:
  cinco viewports aprovados em `.cache/devtools-priority-nemesis-browser.log`.
- Capturas: `.cache/playtest-p0/hero-{dimitrescu,nemesis,nehelenia}-{largura}.png`
  e `.cache/devtools-free-control/panel-{largura}.png`.
- Viewports: 1024×768, 1376×1032, 1920×1080 e 390×844, sem zoom.

Nenhum checklist antigo foi reaberto.

## Auditoria dos controles DEV

| Grupo | Controles e tratamento |
| --- | --- |
| Mão/cenário | +5, +30, −5 Lixo, quatro canastras, Prep: Morto e Prep: Bater usam o jogador escolhido, sem exigir seu turno. |
| Dominação | Amigas e Visão usam a prioridade DEV; não esperam uma operação antiga. Pré-requisitos do recurso continuam necessários. |
| Partida | Congelar/Descongelar, Terminar, Reiniciar; somente Congelar mantém pausa manual. Reinício cria outra sessão e invalida operações antigas. |
| Aparência | Fundo e baralho passam pela fila DEV; abrir/minimizar o painel e alterar seletores não pausam nem editam a partida. |
| Laboratório | Todos os botões mutáveis usam a fila DEV. Recurso, vida/estado/modificadores, passiva, objetivo e preparação não dependem da vez do jogador. |
| Diagnóstico | Varredura continua somente leitura. Campos/seletores atualizam a UI; sem botão de mutação não consomem cartas nem avançam turnos. |

Botões sem cenário, alvo/entidade ou fase compatível continuam desabilitados ou
explicam o motivo. Isso é validação de entrada, não espera por turno. Cenários
encerrados podem ser reiniciados/preparados/resetados; comandos de carta não
ressuscitam uma partida encerrada. Não houve mudança de balanceamento/regras.

Quadros medidos em pixels CSS (iguais para Ada, Jill e Sailor em cada viewport):

| Viewport | Esquerda | Topo | Largura | Altura |
| --- | ---: | ---: | ---: | ---: |
| 1024×768 | 674,316 | 226,880 | 249,684 | 374,526 |
| 1376×1032 | 900,476 | 302,120 | 375,524 | 563,286 |
| 1920×1080 | 1424,000 | 317,603 | 396,000 | 594,000 |
| 390×844 | 268,800 | 548,600 | 109,200 | 163,800 |
