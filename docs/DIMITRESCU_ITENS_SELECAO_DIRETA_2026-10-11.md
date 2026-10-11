# Dimitrescu — aplicação direta dos itens da mão

## Entrega

O toque principal no item inicia o modo de aplicação. O mesmo item cancela;
outro item troca a seleção. As filhas elegíveis recebem contorno discreto e o
toque no retrato aplica o item imediatamente, sem popover de alvos nem confirmação.
Escape e toque fora cancelam sem consumir a carta. O controle separado “?”
preserva a explicação completa. Selecionar a carta pelo valor/naipe continua
independente de selecionar seu item.

A seleção é exclusivamente local: não entra em Firebase, saves ou undo. É
invalidada por troca de turno/jogador/partida, morte de filha, encerramento,
pausa, undo, retirada/consumo da carta e perda de elegibilidade. Reload começa
sem seleção. Os dois listeners de cancelamento são registrados uma única vez.

O modo usa `getCastleItemUseStatus`, `canUseCastleItem` e `useCastleItem`.
O fluxo anterior de sacrifício, registro de ação, animação, undo e commit foi
mantido. A seleção é retirada antes de entrar no action gate, evitando que
duas tentativas enfileirem dois usos do mesmo item. O alvo normal de dano não
é alterado pelo uso de item.

## Legibilidade e áreas clicáveis

As legendas agora ocupam até duas linhas, com faixa própria abaixo da arte.
As cartas e o espaçamento da mão não foram alterados; a fonte original de 8px
foi preservada. Apenas a arte sobreposta do item foi reposicionada dentro da
carta para reservar essa faixa. Valor, naipe, ilustração e marcadores continuam.

| Item | Texto completo | Forma compacta no celular |
| --- | --- | --- |
| Explosivo | 100 DANO / SANGRA 15 | 100 HP / 15/ROD |
| Adaga | VÍNCULO / 80% | VÍNC. / 80% |
| Frasco | CONGELA / AS 3 | GELA / AS 3 |
| Relíquia | DANO / +20% | DANO / +20% |
| Anticoagulante | REGEN / 20→10 | REGEN / 20→10 |

Os valores são derivados das regras da partida, não hardcoded para partidas
antigas. O texto completo permanece na ajuda e nos nomes acessíveis dos controles.

Durante a validação mobile, a pilha de cartas sacrificadas de Cassandra
interceptou o toque destinado ao retrato. No modo de aplicação, essa pilha não
captura ponteiro; ao cancelar/aplicar, sua ajuda volta a funcionar normalmente.
Os chips de ajuda das filhas continuam independentes do botão do retrato.

## Regras preservadas

- Explosivo: 100 impacto, hemorragia permanente de 15 por rodada, sem empilhar.
- Adaga: transmissão de 80%.
- Frasco Congelante: congelamento global temporário existente.
- Relíquia: +20% de dano direto.
- Anticoagulante: regeneração 20→10.
- Petrificação por tipo, limite de HP, carta física sacrificada, descarte e
  retorno após morte continuam exclusivamente no motor canônico.

Nenhum arquivo do motor de combate, BOT ou Especial foi modificado.

## Arquivos

- `app.js`: seleção, cancelamento, aplicação canônica e ajuda separada na mão.
- `js/boss/ui/dimitrescu-castle-view.js`: elegibilidade e destino do clique das filhas.
- `styles/boss/dimitrescu.css`: estado selecionado, contornos, ajuda e legendas.
- `service-worker.js`: versão de cache v305 para entregar o JS/CSS atualizado.
- `tests/dimitrescu-item-selection.test.mjs`: seis testes do código real da seleção.
- `tests/dimitrescu-item-selection.browser-cases.mjs`: interação e geometria nos dois clientes.
- `tests/playtest-p0.browser.mjs`: integração dos novos casos e substituição das
  expectativas do seletor antigo; opção `P0_UI_ONLY=1` evita apresentações do Especial.
- `tests/dimitrescu-castle.browser.mjs`: fixture legada adaptada ao alvo direto.

## Validação

- Suíte unitária completa: **1.415 aprovados, zero falhas**. Inclui regressões
  dos seis chefes, BOTs, itens modernos/legados, saves e combate.
- Edge/Chromium real headless: **1024×768, 1376×1032, 1920×1080 e 390×844**.
- Dois humanos simulados em páginas separadas com snapshots serializados;
  aplicação por ambos e comparação de resultado com o motor para os cinco itens.
- Mouse, toque e teclado; toggle, troca, Escape, fora dos alvos, filha morta,
  restrições da compra/descarte, dupla tentativa, mudanças de estado, undo/reload,
  conflito com alvo normal de dano e segunda aplicação sobre filha com carta anexada.
- Geometria dos cinco rótulos em escala normal e ampliação CSS de 125%:
  contidos na carta, sem overflow nem sobreposição com arte ou controle de ajuda.
- Regressão da interface: 136 combinações habilidade/fase dos seis chefes por
  resolução, além dos casos P0 e watchdog dos BOTs, usando `P0_UI_ONLY=1`.
- Renderer legado: 1920, 1376 e 390px, com itens v1/v2, toque, teclado,
  petrificação, hemorragia/regeneração e movimento reduzido.
- `git diff --check`: sem erros.

### Evidências locais

- `.cache/playtest-p0/items-direct-1024.png`
- `.cache/playtest-p0/items-direct-1376.png`
- `.cache/playtest-p0/items-direct-1920.png`
- `.cache/playtest-p0/items-direct-390.png`
- `.cache/dimitrescu-item-unit.log`
- `.cache/dimitrescu-items-browser.log`
- `.cache/dimitrescu-items-ui-regression.log`
- `.cache/dimitrescu-item-legacy-browser.log`

### Limites da validação

Não houve partida humana em aparelhos físicos nem escrita em Firebase real.
A sincronização foi simulada com o código/estado real em dois navegadores.
A ampliação adicional é CSS, não o zoom nativo do navegador.

A execução sem filtros parou na asserção visual do Especial
`character holds fully on screen during the flight`; ela não foi corrigida
neste lote, pois a animação está fora do escopo. Log:
`.cache/dimitrescu-items-full-browser.log`. Os testes do Especial na suíte
unitária passaram; não se declara aprovação integral daquele teste visual.

Sem commit, push ou deploy. Nenhum checklist anterior foi reaberto.
