# Etapa 1 — correções do playtest cooperativo de 10/10/2026

**Relatório histórico de causas e evidências.** Status atual no [resumo do checklist](CHECKLIST_PLAYTEST_CHEFES_2026-10-10_ATUALIZADO.md#resumo-executivo-do-checklist--estado-em-10102026). Correções técnicas entregues não devem ser refeitas para obter homologação humana. O espaçamento próprio para cartas com item mencionado na execução inicial foi posteriormente removido a pedido do usuário; vale o espaçamento original da mão, conforme Etapa 2/pacote consolidado. Contagens de testes/cache abaixo descrevem este lote, não a última versão.

Referência principal: `CHECKLIST_PLAYTEST_CHEFES_2026-10-10_ATUALIZADO.md`, P0-01 a P0-11. Checklist atualizado e vídeo anexados pelo usuário foram lidos/examinados; as cópias inicialmente indicadas em `docs/` e `.cache/playtest/` não existiam. O checklist foi acrescentado a `docs/`; o vídeo foi lido diretamente do anexo em `C:/Users/gabri/Videos/Captures/`.

## Causas e correções

| Item | Causa encontrada / resultado |
| --- | --- |
| P0-01 — Granada | `renderHand` preservava o nó físico da carta, mas copiava a nova face com `innerHTML`. Essa serialização perdia o `onclick` do botão filho. Uma marca NOVA/compra/efeito que mudasse a face deixava o item sem resposta; o item vizinho sem mudança continuava funcionando. Agora os filhos vivos são movidos com `replaceChildren`, mantendo handlers. Também foi conferida a sobreposição entre contextos de empilhamento das cartas: somente cartas com item recebem espaço próprio, sem modificar a regra de seleção. |
| P0-02 — Frasco | O motor permite reaplicar Frasco em filha já congelada; o teste de dois humanos confirma uma carga e depois duas, incluindo undo/snapshot/reload. O problema de handler pode afetar qualquer item, não só Granada. A interface agora informa a razão quando a regra realmente impede uso: vez, compra incompleta, carta comprada do Lixo, último descarte, bloqueio, escolha pendente ou alvo morto. Sem o estado original do Frasco, não é possível afirmar qual desses casos ocorreu no playtest. |
| P0-03 — item no Lixo | Metadata já era preservada, mas o CSS posicionava o símbolo somente dentro de `.carta`, não em `.discard-face`. O ícone do Lixo agora usa o mesmo posicionamento. O teste percorre mão→Lixo→mão do parceiro→sacrifício→morte→fundo do Lixo, mantendo 108 IDs únicos; só o consumo efetivo remove o item. |
| P0-04 — HUD | A mesa real é uma coluna flex de altura restrita. O HUD encolhia abaixo do conteúdo da grade, que então invadia filhas/próxima fase. Fixtures antigas de bloco livre não reproduziam isso. HUD, faixas e filhos dos vitais agora não encolhem dessa forma. Geometria testada com mesa restrita, itens e fases 1/2/3. |
| P0-05 — nomes | O chip de alvo não tinha limite adequado e a ajuda podia encolher no flex do S.T.A.R.S. Chips agora têm limite/reticências, ajuda permanece acessível e mostra o nome inteiro, inclusive no alvo do Agarrador. |
| P0-06 — retrato | A classe `boss-nehelenia-dream-stolen` acionava pseudo-elementos sobre o retrato. Ela não é mais aplicada e os pseudo-elementos não geram conteúdo. Espelhos/recursos/efeitos mecânicos não foram removidos. |
| P0-07 — Fish Eye | Habilidade atual pode coexistir legitimamente com Reflexo Morto e Reflexo Invertido anteriores. O renderer fragmentava textos em `small` não interativos e o contexto desativava pointer events. Agora há botões de ajuda: a habilidade atual fica dourada, os efeitos persistentes ficam discretos. Conforme revisão do usuário, não há prefixos ATUAL/PERSISTENTE nos chips; ficam somente jogador e efeito. Carta afetada e obrigação são explicadas na ajuda. **A string “jarcado” não foi encontrada nem reproduzida**, portanto essa parte continua pendente. |
| P0-08 — Daniela | Dois caminhos de renderização do Lixo consultavam principalmente a marca de habilidades legadas, em vez da passiva permanente real. Ambos usam o mesmo helper de apresentação, considerando rodada/status/vida. O topo mostra LIXO +3 antes da reação e deixa de destacar depois. O motor de cobrança não mudou; teste confirma apenas +3 na primeira retirada efetiva, sem duplicar e sem modificar Bela/Cassandra. |
| P0-09 — relógio | O intervalo genérico de 60 s também atendia humanos nos chefes. Agora não inicia nesses modos e callbacks já pendentes são barrados. O tempo total continua contando. BOTs mantêm a recuperação existente com watchdog separado de 60 s, somente no anfitrião, ligado à sessão/turno e respeitando pausa/escolhas. Os modos normais mantêm timeout/autoplay. |
| P0-10 — chip na mão | Botão do item ganhou efeito curto e área própria. Mouse/toque no item abre ajuda/alvos, sem selecionar carta; tocar número/naipe seleciona a carta. Testes intercalam e reordenam cartas comuns e os cinco tipos de item. Textos extensos e motivos de impedimento ficam na ajuda. |
| P0-11 — nome | Somente o rótulo de `cold_flask` mudou para Frasco Congelante. ID, PNG interno e compatibilidade de saves permanecem. |

O vídeo confirma o contraste: Relíquia abre seleção aproximadamente em 9 s; Granada é levantada/selecionada, mas não abre o item aproximadamente em 12 s. Ele não prova sozinho a causa interna. A perda do handler foi reproduzida separadamente contra HEAD, antes da correção, e deixou de ocorrer depois dela.

## Verificação

- `node --test tests/*.test.mjs`: **1.337 aprovados, zero falhas**. Inclui todos os seis chefes, cooperação, escolhas, dano, saves, undo, BOTs e os 15 casos novos de `playtest-p0.test.mjs`.
- `node tests/playtest-p0.browser.mjs`: Edge/Chromium real, 1024×768, 1376×1032, 1920×1080 e 390×844. Mouse e toque; dois clientes humanos simulados trocando snapshots serializados; uso dos cinco itens; compra/segundo Frasco; atualização de face; seleção independente; ordenação; undo/reload; botões desabilitados; Daniela; Fish Eye por toque/Enter; nomes longos; relógio acelerado dos seis chefes; duração total; timeout antigo pendente; watchdog anfitrião/pausa/não anfitrião; timeout normal preservado.
- Regressões aprovadas: `tests/dimitrescu-castle.browser.mjs`, `tests/nemesis-ui.browser.mjs`, `tests/boss-hud-ux.browser.mjs`, `tests/matriarch-hud-polish.browser.mjs`, `tests/boss-resource-feedback.browser.mjs`, `tests/boss-vault-layout.browser.mjs`.
- `P0_BASELINE=1 node tests/playtest-p0.browser.mjs`: reprodução anterior por resolução; handler perdido e item sem abrir. Essa modalidade lê app/CSS de HEAD, sem reverter arquivos.
- `git diff --check`: sem erros de whitespace. Sem commit, staging, push ou deploy.

Os scripts de navegador usam funções reais extraídas de `app.js`, módulos reais e o HTML/CSS da mesa restrita; serviços externos, áudio e operações não relacionadas são substituídos. Os dois clientes **não são uma sessão Firebase real**, e o reload do estado é simulado por serialização. As regras Firestore e o módulo Firebase local não contêm um cronômetro de turno no servidor; nenhuma configuração remota foi alterada ou verificada. Autenticação/relogin, latência e corrida transacional reais continuam exigindo homologação humana em dois dispositivos. Esses limites impedem declarar encerrados todos os P0.

## Evidências locais

Capturas de cenário controlado, comparáveis entre HEAD e patch; não são screenshots de uma partida Firebase publicada.

- [Antes 1024×768](../.cache/playtest-p0/before-1024.png) / [depois](../.cache/playtest-p0/after-1024.png).
- [Antes 1376×1032](../.cache/playtest-p0/before-1376.png) / [depois](../.cache/playtest-p0/after-1376.png).
- [Antes 1920×1080](../.cache/playtest-p0/before-1920.png) / [depois](../.cache/playtest-p0/after-1920.png).
- [Antes 390×844](../.cache/playtest-p0/before-390.png) / [depois](../.cache/playtest-p0/after-390.png).
- [Fish Eye tablet](../.cache/playtest-p0/fish-1024.png), [celular](../.cache/playtest-p0/fish-390.png).
- [Nemesis tablet](../.cache/playtest-p0/nemesis-1024.png), [celular](../.cache/playtest-p0/nemesis-390.png).
- [Vídeo: Relíquia em 9 s](../.cache/playtest-p0/video-9.png), [Granada em 12 s](../.cache/playtest-p0/video-12.png).
- Logs locais: `.cache/playtest-p0-unit.log`, `.cache/playtest-p0-before.log`, `.cache/playtest-p0-regression.log` e `.cache/*-regression.log` dos seis scripts citados.

Os arquivos de `.cache` são evidências locais ignoradas pelo Git. Os testes permitem regenerá-las.

## Arquivos modificados

- `app.js`: preservação de handlers, explicação de uso, chips/indicadores, nomes e relógios.
- `js/boss/boss-engine.js`: diagnóstico de elegibilidade usando as mesmas regras existentes.
- `js/boss/dimitrescu-castle.js`: rótulo visual.
- `js/boss/ui/dimitrescu-castle-view.js`, `js/boss/ui/nemesis-ui.js`: captions/helper visual e ajuda de nome completo.
- `styles/cards.css`, `styles/boss-mode.css`, `styles/boss/{dimitrescu,nemesis,nehelenia}.css`: ícone no Lixo, limites/layout e interação.
- `service-worker.js`: cache v295 para entregar os arquivos atualizados após publicação manual, sem deploy automático.
- `tests/playtest-p0.{test,browser}.mjs`, `tests/boss-integration.test.mjs`, `tests/dimitrescu-castle.browser.mjs`, `tests/nemesis-ui.browser.mjs`: cobertura nova e compatibilidade das fixtures existentes.
- Este relatório, checklist atualizado, `DOCUMENTACAO_CHEFE_DA_MESA.md` e `REWORK_ITENS_DIMITRESCU_2026-10-08.md`.

## Escopo preservado e fechamento

### Refinamento visual solicitado após a etapa 1

Nehelenia: chips sem prefixos ATUAL/PERSISTENTE, mantendo jogador/efeito e ajuda; dourado identifica a habilidade atual, azul-cinza discreto identifica efeitos anteriores. Ao trocar de habilidade, o destaque acompanha o novo objetivo sem remover efeitos persistentes.

Dimitrescu: somente marcas nas cartas da mão receberam escorrimentos arredondados em vez de tiles retangulares. Posições/tamanhos variam por carta, tipo e nova marcação, permanecendo estáveis no rerender; o renderer reaplica as variáveis de sangue também nos nós físicos reutilizados. O Banquete da mesa foi preservado, inclusive seu seed. Sem partículas, canvas, novas imagens ou tarefas aleatórias por frame. Evidências: `.cache/playtest-p0/blood-rounded-{1024,1376,1920,390}.png`. Teste adicional de variação/estabilidade em `tests/dimitrescu-blood-visual.test.mjs`; suíte passa agora 1.338 casos.

Nenhum número de HP/PROT., regeneração, Sede, Fúria, Adaga, sangramento ou demais itens foi rebalanceado. Lixo protegido, Mortos e Devorador sem teto de curas permanecem. Não foram criadas habilidades novas.

Especial Cooperativo **apenas registrado**: barra compartilhada 0–100 nos seis chefes; Limpa +25, Real +50, Ás-a-Ás +100; evolução do mesmo jogo físico credita só a diferença. Não existe implementação nova neste patch. Ativação/retirada do Lixo ainda precisam de especificação.

Checklist: caixas P0 ficam abertas até revisão do usuário e homologação Firebase. P0-07 é parcial pela string não reproduzida. **P3-06 permanece para depois**: antes de encerrar o projeto, aprovar a apresentação compacta da barra e a animação temática dos seis chefes, com acessibilidade/reduced motion/performance.
