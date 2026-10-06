# Lixo protegido e UX do Nemesis — 06/10/2026

Fonte de verdade: workspace local atual. Nenhuma operação no Google Drive, commit ou deploy. Alterações de artes Resident Evil surgidas paralelamente no workspace foram preservadas e não fazem parte deste patch.

## Regra final do Lixo

Somente modo Chefe, para todos os seis chefes. Outros modos permanecem inalterados.

| Topo / destino real escolhido | Quantidade retirada |
|---|---|
| Natural / jogo existente | 1 |
| Natural / jogo novo pela mão | Lixo inteiro |
| Joker / qualquer jogo | 1 |
| 2 natural ou coringa / jogo existente | 1 |
| 2 coringa / jogo novo pela mão | 1 |
| 2 natural / jogo novo pela mão | Lixo inteiro |

A escolha oficial do Fechado foi preservada. Um encaixe público alternativo não restringe um jogo novo escolhido pelo jogador. Feedback antes de consumir: `Retirada protegida · 1 carta` / `Retirada completa · X cartas`.

Validação reutilizada: `isValidBossSequence()`, incluindo seus flags oficiais `forceNatural`/`forceWild`. `isBossCardNaturalInSequence()` consulta esse mesmo validador com o topo na função natural; não implementa uma segunda regra de sequência nem usa posição visual. A consulta não altera cartas/flags. 2–3–4 e 3–4–2 são equivalentes.

`quoteBossDiscardPickup()` é compartilhada pelo humano, BOT e planejamento de Zona Contaminada. Validação de seleção, limites, mão restante e condições de Morto/batida consideram a quantidade realmente adquirida. O BOT não passa pelo atalho de compra aberta sem destino no modo Chefe. Tentativa inválida não move cartas; aquisição não duplica após snapshot/reload. O clique normal no Lixo após comprar continua sendo o comando de descarte, como antes.

## Nemesis

- INVADINDO: chip/ajuda de expulsão, sem HP de combate nem seleção. Lifecycle, HP e resolução preservados.
- Retrato principal clicável e acessível por teclado seleciona `boss` quando permitido. Chips/ajuda não selecionam nem persistem mudança de alvo.
- Chips mostram o efeito final calculado pelo mesmo helper usado na passiva: AGARRA 1/2/3, INFECÇÃO +2/+4/+6 e CURA 40/70/100. Normal + Reforçado: 2/4/70.
- MUTADO e REFORÇADO explicam mudanças separadas; reforço informa a rodada final inclusiva. Comando continua apenas persistent vivo, até `roundNumber + 1`, sem mudança de duração.
- Chips reutilizam o popover oficial. Quebram linha sem sobrepor HP/ajuda; cards estreitos têm altura mínima de 120 px, mantendo a faixa externa ao HUD e arte full-bleed.
- MARCADA / AGARRADA / CONTAMINADA na carta exata, com identidade verde compartilhada. Zona de Impacto continua laranja, somente em `.meld-line-cards`.
- AGARRADA pulsa uma vez por evento novo. O pulso pausa durante o voo de compra e continua quando a carta aparece; não reinicia. Rerender/reload/snapshot/undo não repetem; marca permanece até expirar e redução de movimento deixa apenas a marca estática.
- Agarrador/Tentáculo/Barragem/Extermínio escolhem marcas com rota real de jogo por `findNemesisLegalPlan()`. Barragem comprova duas saídas utilizáveis em conjunto; Extermínio comprova contribuição e segunda carta utilizável. Descarte continua contando depois da marcação. Sem plano viável: inelegibilidade/fallback normal.

Nenhuma mudança aos números de HP, Infecção, punições, pesos, fases, cura, alívio por canastra, S.T.A.R.S., overflow, mutação ou reanimação. Nenhuma regra aprovada dos outros chefes foi revertida.

## Arquivos de produção alterados

- `app.js`: retirada humano/BOT, quantidade real, retrato/chips oficiais, pulso durante voo e conexão da apresentação da mão.
- `boss-bot.js`: avaliação usa a quantidade cotada; modo Chefe não tenta compra aberta.
- `js/boss/boss-engine.js`: consulta compartilhada de retirada e papel natural do 2 via validador canônico.
- `js/boss/mechanics/nemesis.js`: objetivos utilizáveis, planejamento da retirada real, evento de Agarrada e cálculo compartilhado das passivas.
- `js/boss/ui/nemesis-ui.js`: chips/ajudas, selos e pulso deduplicado.
- `js/boss/presentation/nemesis.js`: explicações de entrada/alvo.
- `styles/boss/nemesis.css`: chips responsivos, retrato selecionável e identidade verde de contaminação.

Sem novos assets/dependências. Service Worker/cache preservados; não houve publicação.

## Testes e documentação

Testes adicionados/atualizados: `boss-discard-rule.test.mjs` (matriz de oito casos nos seis chefes), `discard-pickup.test.mjs` (handlers reais humano/BOT, destino, bloqueio, mão final, snapshot e voo), `nemesis-boss.test.mjs` (marcas realmente jogáveis, descarte e chips), `nemesis-ui.browser.mjs` (renderer real, teclado, permissões, pulso, ajuda e geometria), `boss-integration.test.mjs` e `domination-balance.test.mjs` (expectativa da quantidade real/dependência importada na VM).

- Suítes focadas: **197/197**, zero falhas, zero skip/todo. Arquivos executados: regra do Lixo, retirada, Nemesis, integração, seleção do laboratório, Dominação, descarte UI do Nemesis, medidores, legibilidade de chefes e BOT.
- Suíte ampla: **819/819**, zero falhas, zero skip/todo.
- Browser: passou em **1920×1080, 1024×768, 844×390, 390×844 e 3840×2160**. Inclui quatro chips sem sobrepor HP, entrada sem barra/alvo, oito famílias de molduras excluindo metadados, ajuda ancorada, marcas/limpeza/reload, pulso único e redução de movimento. Capturas desktop/mobile revisadas.
- Sintaxe: 12 JS/MJS alterados passaram em `node --check`; `git diff --check` sem erros.

A primeira execução ampla deste patch revelou uma expectativa antiga que exigia validar o lixo inteiro. Ela foi atualizada para o conjunto realmente retirado, preservando validação antes da mutação. O teste de proximidade do popover também passou a medir distância entre bordas: medir a partir do centro de um chip largo incluía incorretamente metade da largura do botão. A tolerância não aumentou.

Documentos atualizados: `DOCUMENTACAO_CHEFE_DA_MESA.md`, `NEMESIS_IMPLEMENTACAO.md`, `INVENTARIO_HABILIDADES_CHEFES.md` e `CHECKLIST_REGRESSOES_E_ATUALIZACOES.md` (regra permanente, seção 25).

Limites da validação: browser usa fixture local com renderer/handlers reais, não uma partida completa em dois clientes Firebase autenticados. Avaliação de balanceamento e desempenho de partida inteira continua sendo uma etapa de teste de jogo; não foi simulada por estes resultados.

## Complemento: ajuda opcional do Lixo

Adicionado `?` pequeno junto ao contador, exclusivamente no modo Chefe. Reutiliza botão/popover/âncora oficiais; texto curto contém jogo existente/novo, Joker e as três situações do 2. Sem avisos novos na seleção, escolha ou confirmação; nenhum ajuste às mecânicas. Clique/toque não propagam para a compra, teclado funciona e a ajuda permanece acessível com compra bloqueada. Remover o modo remove também o controle e fecha sua ajuda.

Arquivos deste complemento: `app.js`, `styles/boss-mode.css`, `tests/nemesis-ui.browser.mjs` e os três documentos atualizados. A infraestrutura oficial de ajuda agora inicializa seus controles mesmo sem objetivo ativo. A fixture de browser passou a extrair o HUD externo completo (havia uma seção aninhada oculta que interrompia a extração) e usa o markup real do Lixo.

Validação do complemento: **819/819** na suíte ampla, sem falhas/skip/todo. Browser passou nos mesmos cinco viewports, com mouse/Enter/Escape, consulta com retirada bloqueada, saída do modo, ausência de duplicação e página adicional com toque real em 390×844. Captura mobile revisada. Sem commit/deploy/cache novo.

## Correção do excesso de destaque nas cartas

Removidos os contornos/glows extras aplicados simultaneamente à pilha e à face do Lixo. Eles se acumulavam com a marca compartilhada da carta. Mantidos os detalhes e a espessura originais do overlay MARCADA/AGARRADA/CONTAMINADA; o pulso de aquisição agora varia apenas a opacidade, sem expandir o brilho. Nenhuma mudança de regras, seleção ou balanceamento.

Regressão visual compara borda, sombra e inset dos três estados e da face real do Lixo, além de exigir que os wrappers preservem suas sombras normais. Checklist atualizado para impedir camadas extras. Validação: 96/96 focados, 819/819 na suíte ampla (zero falhas/skip/todo), browser nos cinco viewports e toque; captura mobile revisada. Log: `.cache/nemesis-marking-full.tap`.
