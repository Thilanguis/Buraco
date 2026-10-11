# Pacote consolidado do modo Chefe — 10/10/2026

## Resultado e regra vigente

Status de trabalho centralizado no [resumo do checklist-mestre](CHECKLIST_PLAYTEST_CHEFES_2026-10-10_ATUALIZADO.md#resumo-executivo-do-checklist--estado-em-10102026); contexto de retomada no [handoff vigente](HANDOFF_DESENVOLVIMENTO_BURACO.md). Não reabrir entregas por caixas de homologação ainda abertas.

### Lote posterior — somente itens da Lady

Estado vigente: Explosivo100+15 permanente, Relíquia+20% de ataque direto e Frasco global por duas oportunidades de turno. Regras e validação estão no [relatório do lote final](LOTE_FINAL_ITENS_DIMITRESCU_2026-10-10.md). Especial e outros chefes não foram alterados neste lote. As evidências e medições abaixo descrevem os lotes anteriores, não a dificuldade humana da versão atual.

### Adendo anterior — Explosivo100 e chip Adaga

Explosivo/Granada100 **aplicado e testado**, não apenas solicitado. Preservados sangramento20 permanente sem stack, petrificação−50, regen20/10 e Adaga80%. Novos usos em saves v2 atualizados por `castleExplosiveBalanceVersion: 1`, sem dano retroativo. Chip Adaga corrigido de faixa vertical para cerca de75×14 px, com ajuda preservada; sem alteração mecânica.

Últimos logs conferidos: `.cache/explosive100-unit.log` (**1.384 aprovados**) e `.cache/explosive100-browser.log` (Lady1920/1376/390, ajuda100+20 e regressões). A suíte1.380 e browser nas quatro dimensões descritos abaixo pertencem ao lote anterior. Os144 pares experimentais e1.344 batalhas da Etapa 2 também antecedem o impacto100; não foram recalculados nem usados para estimar taxa humana pós100. Cache local atualv301; não houve deploy.

Esta revisão só organizou Markdown. Nenhum novo teste de gameplay, mudança de código, staging ou escrita remota foi feito.

Especial funcional nos seis chefes: **cinco cartas físicas do topo do Lixo**, não do Monte. Com menos de cinco, não ativa nem gasta. Respeita bloqueios do usuário/beneficiário e os efeitos de retirada. Esta regra substitui a seção B3 do brief inicial conforme as duas correções explícitas posteriores do usuário.

P0, legibilidade, espaçamento da mão e pacote B da Lady preservados. Nenhuma das duas habilidades propostas foi implementada. Sem commit, push ou deploy. Não declarar homologação humana/Firebase a partir dos testes locais.

## A — O que já existia e foi conferido

Referências: [Etapa 1](ETAPA_1_PLAYTEST_P0_2026-10-10.md) e [Etapa 2](ETAPA_2_DIMITRESCU_2026-10-10.md). Os lotes e dados históricos não foram refeitos nem apresentados como novos.

| Requisito | Evidência técnica atual | Limite |
| --- | --- | --- |
| Granada e outros itens clicáveis | Handlers reais da mão, hits em cartas intercaladas/sobrepostas, mouse/toque e bloqueios com ajuda | Confirmar partida humana autenticada |
| Item no Lixo, consumo só na filha | Metadata e IDs preservados, descarte/undo/reload/morte testados | Saves humanos reais continuam úteis |
| Carta versus chip | Áreas independentes; chip não propaga seleção indevida | Não aumentou espaçamento da mão |
| Cronômetro | Seis chefes sem timeout individual/autoplay; duração total/BOT watchdog e outros modos preservados | Não equivale a teste de rede prolongado |
| HUDs, nomes e filhas | Testes geométricos nas quatro dimensões; regressões específicas Nemesis/Dimitrescu | Tablets físicos pendentes |
| Nehelenia/Fish Eye | Retrato sem overlay quebrado; Espelho com espaço temporário; ajuda interativa e persistência dos auxiliares | String anômala do Fish Eye não reproduzida |
| Daniela | Marca o Lixo e reage uma vez por rodada | Especial reutiliza o mesmo hook |
| Leitura | Textos separados em linhas; referência valor+naipe com escala visual 1,5, caixa/fonte restante preservadas | Inspeção em tamanho normal, sem zoom; não afirma acessibilidade universal |
| Sangue | Gotas arredondadas, distribuição orgânica determinística por marca | Não muda mecânica nem PNG |
| Pacote B | 500 HP, regeneração 20/Anti 10, Adaga 80%, Explosivo 100 + hemorragia 20 permanente sem stack | Sede/Fúria/PROT./Frasco e demais regras intactas |

As causas exatas P0 estão no relatório da Etapa 1. A causa do item era a atualização da face removendo seu handler; não foi “consertada” escondendo a Granada. Este pacote não refez aquela correção.

## B — Implementação nova

### Poder da equipe e compra especial

- Limpa 25, Real 50, Ás-a-Ás 100; ledger da categoria máxima por ID canônico do jogo físico. Evoluções acrescentam só 25/50/75.
- Saldo compartilhado ilimitado. Cada ativação gasta 100; 125 deixa 25, 200 permite dois usos. Nenhum cooldown ou requisito adicional de fase, mão, Monte ou Mortos.
- Humano escolhe o cooperador beneficiado, inclusive BOT. BOT de produção não gasta automaticamente.
- Cinco `pop()` do Lixo para a mão escolhida, sem fabricação, duplicação, perda de item ou uso do Monte. Zero a quatro não ativam. Monte vazio não impede o benefício se o Lixo tiver cinco e as demais condições forem válidas.
- A compra normal permanece disponível e separada. Não exige jogar imediatamente o topo recuperado; a obrigação de encaixe da compra normal fechada não foi alterada fora desta ação. Objetivos já existentes não são anulados pelo Especial.

### Reações e limites

| Sistema | Regra do Especial |
| --- | --- |
| Bloqueios | Checar usuário e beneficiário: castelo fechado, crédito, Cofre obrigatório, selo/lock/guarda Hawk e bloqueios canônicos |
| Daniela | Primeira retirada efetiva: +3 Sede uma vez; uma segunda ativação não cobra de novo |
| Pólen | Reage se a carta contaminada estiver entre as cinco, inclusive enterrada |
| Ágio | Cobra a primeira retirada, uma única vez na rodada |
| Espelho | Registra os cinco IDs e beneficiário; escolhas, bloqueios e consequências existentes continuam |
| Agarrador / financiamento | Não transforma o benefício em compra normal; seus gatilhos de compra normal continuam separados |
| Itens | Continuam nas cartas recuperadas; consumo somente por uso real |
| Derrota por reação | Resultado, horário e histórico na mesma transação do benefício |

### Atomicidade

Transação lê o snapshot autoritativo, valida sessão/revisão/pausa/estado, executa retirada e reações, grava revisão incrementada e ID de ação. Dois clientes com a mesma revisão: só o primeiro pedido válido grava, inclusive com 200 pontos; o segundo precisa receber a nova revisão antes de outro uso. Um commit comum atrasado do modo Chefe também é rejeitado, para não apagar cartas/carga recebidas.

Undo/snapshot/reload restauram saldo, ledger, cartas e efeitos juntos. Restauração conserva a revisão atual antes de gravar. Saves antigos recebem as categorias já conquistadas uma vez, com aliases posicionais mapeados aos IDs físicos. Re-render não pontua.

### Bugs encontrados ao validar a integração

1. O footer herdava `pointer-events: none` no desktop. O controle novo tem área própria clicável, comprovada por hit test e toque/teclado.
2. Writer comum atrasado poderia sobrescrever o benefício; revisão compartilhada e teste com retry transacional impedem isso.
3. A animação podia segurar a action gate enquanto a aba de fundo era throttled. Agora é cosmética, não aguardada pela ação confirmada nem pelo recebimento remoto.
4. A regra inicial do brief era Monte/parcial. Foi substituída por Lixo/exatamente cinco, incluindo testes, comparação, ajuda e documentação — não apenas rótulo visual.

## C — Ritmo e comparação

[Relatório quantitativo](BALANCEAMENTO_SEIS_CHEFES_2026-10-10.md) com 144 batalhas (12 pares por chefe), mesmas seeds/baralho/política em cada braço, traços completos e conservação dos 108 IDs. Inclui turnos sem baixar/sem dano creditado, mãos, Monte, canastras, cargas/usos/cartas, causas, CPU e janela de dois Mortos retirados com Monte 20–30.

Não usar vitórias desse controlador como win rate humano. A retirada não consome Monte, mas altera indiretamente duração e compras posteriores. A política experimental usa cedo, não reserva para a janela crítica. Contador de dano tem limites descritos no relatório. Não implementar outras recuperações a partir destes resultados. Homologação humana do travamento ainda necessária.

Neste lote, só houve 12 ativações (60 cartas) nas 72 batalhas com Especial: Banqueiro1, Lady3, Nemesis8; os três outros chefes não chegaram a usá-lo. Vitórias permaneceram iguais em todos os pares agregados. Na janela crítica da Lady, turnos sem baixar ficaram39→38 de67 observados, sem mudança na pior sequência11. O ganho medido foi pequeno; não seria correto afirmar que esta regra sozinha resolveu o ritmo.

## D — Variedade e propostas

Catálogos confirmados: Dominadora 13; Nemesis/Nehelenia 11; Matriarca 10; Banqueiro/Dimitrescu 8. Especial não é habilidade sorteada. Frequências/eligibilidade por fase das batalhas e 17.280 sorteios condicionais + 4.320 sequenciais estão no relatório de balanceamento. Não igualar contagens por obrigação; não mudar pesos para compensar condições que não apareceram na amostra.

Designs completos, **fora da rotação**, em [PROPOSTAS_DIMITRESCU_2026-10-10.md](PROPOSTAS_DIMITRESCU_2026-10-10.md):

- **Bifurcação Carmesim:** escolha entre pressão direta na Lady e avanço pela ala das filhas; progresso de dano efetivo compartilhado. Não confundir com `Portas do Castelo`, já existente.
- **Salão das Duas Sombras:** contribuição legal dos dois jogadores, sem marcar outra carta específica.

Fases, pesos candidatos, elegibilidade, parcial/falha, interações, help e testes estão descritos. Exigem aprovação antes de codificação.

## E — Browser, desempenho e limites de homologação

1.380 testes automatizados aprovados. Browser real Chromium: 1024×768, 1376×1032, 1920×1080 e 390 px; mouse/toque/Enter/Escape; dois humanos simulados, retry simultâneo, Lixo insuficiente, undo/reload, cartas próximas, nomes longos, P0 e os 136 pares habilidade/fase de HUD/help. Regressões específicas da Lady em três viewports e Nemesis em cinco também passaram.

O teste de dois clientes usa handlers extraídos do aplicativo e armazenamento CAS substituto; não faz login nem usa Firebase real. O fixture mantém cenário de mesa fixo para medir layout, portanto imagens de outros chefes nesse teste não validam automaticamente o fundo de mesa escolhido no menu. Não confundir isso com uma partida autenticada completa.

Animatic: 20 ciclos em cada viewport, máximo cinco nós temporários, zero resíduos e mesma quantidade de nós antes/depois. Em foreground, duração máxima observada 605–608 ms. Heap amostrado ficou abaixo do inicial nos quatro runs; isso não prova ausência universal de vazamento. Reduced motion não cria voos. Em aba de fundo houve throttling de cerca de 2–3 s no primeiro ensaio; a ação não espera a animação. Não há benchmark em tablet físico.

Evidências locais (zoom 1, screenshots do fixture): [mobile Lady](../.cache/playtest-p0/special-dimitrescu-390.png), [tablet Lady](../.cache/playtest-p0/special-dimitrescu-1376.png), [desktop Nemesis](../.cache/playtest-p0/special-nemesis-1920.png), [P0 depois](../.cache/playtest-p0/after-1024.png). Logs: `.cache/consolidado-special-browser.log`, `consolidado-dimitrescu-browser.log`, `consolidado-nemesis-browser.log`, `consolidado-full-final.log`.

Sem erros em `git diff --check`, staged diff check e sintaxe dos módulos principais. Nenhuma PNG foi alterada. Não houve stage/commit/push/deploy nesta execução.

### Pendências de homologação/design — resumo, não um segundo backlog

- Dois clientes Firebase autenticados, reconexão real e tablets físicos; inventário de sessões de browser disponível não forneceu sessão autenticada utilizável. Não acessar contas nem fazer escrita remota para contornar isso.
- Nova validação humana do ritmo e pacote B; amostras experimentais não encerram esse aceite.
- String anômala do Fish Eye não reproduzida: manter pendente, não marcar como resolvida.
- Aprovação das duas habilidades da Lady.
- **P3-06: aprovar barrinha funcional e animação heroica final.** Proposta abaixo, sem arte externa implementada.

O checklist-mestre é o responsável por atualizar esses status. Origem Lixo e impacto100 não são decisões pendentes.

### Proposta visual P3-06 — para aprovação

Posição aprovada e aplicada posteriormente: ao lado do X nos controles do jogador, fora do HUD do chefe. Barra horizontal de100 px (92 no celular),16 px visuais/28 px de toque, ícone de energia, saldo/cargas e popover curto preservados. Não reabrir a decisão de posição; arte/animação heroica final ainda depende de aprovação.

| Universo | Direção candidata | Asset / aprovação |
| --- | --- | --- |
| Nemesis | Silhueta heroica de resgate, verde discreto; cartas do Lixo à mão | Confirmar personagem/asset autorizado antes de usar |
| Dimitrescu | Resgate contra o castelo, fio carmesim e brilho metálico curto | Reutilizar somente assets locais autorizados; personagem depende de aprovação |
| Nehelenia | Heroína/luz lunar, reflexo violeta que libera cinco cartas | Não alterar a PNG do Espelho nem baixar imagem externa |
| Matriarca | Energia esmeralda e pétalas em volta das cartas | Lótus local disponível; uso específico no Especial depende de aprovação |
| Dominadora | Ruptura visual de correntes, lilás, retorno do controle à equipe | Sem nova habilidade ou redução de Dominação |
| Banqueiro | Recuperação do cofre/recibo dourado, cinco cartas em leque | Sem quitar Dívida automaticamente |

Até aprovação: cinco silhuetas pequenas com a cor do universo, em cerca de 600 ms, sem personagem externa. Esta proposta não declara direitos sobre arte nova. A escolha final de personagens, assets e aparência continua com o usuário.

## Arquivos principais

Motor: `js/boss/boss-special.js`, `js/boss/boss-engine.js`. Persistência: `js/game/boss-state-transaction.js`, integração `app.js`. UI: `js/boss/ui/cooperative-special-ui.js`, slot `index.html`, `styles/boss-mode.css`, cache `service-worker.js`. Cobertura: `tests/boss-special.test.mjs`, `tests/playtest-p0.browser.mjs` e fixtures de regressão. Experimentos/report: `scripts/boss-special-experiment.mjs`, `scripts/boss-variety-current.mjs`, `scripts/boss-consolidated-report.mjs`.

Documentação oficial, inventário e checklists atualizados. O `.gdoc` de balanceamento é um ponteiro externo; não foi alterado remotamente. O relatório Markdown local registra os dados novos.
