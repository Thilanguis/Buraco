# Lote final — itens da Lady Dimitrescu

Implementação local iniciada em 10/10/2026 e validada em 11/10/2026, somente o lote solicitado. Nenhum checklist antigo foi reaberto; outros chefes e animações do Especial não foram alterados. Sem commit, push ou deploy.

## Regras aplicadas

| Item | Petrificação do alvo | Efeito vigente | Rótulo na mão |
| --- | ---: | --- | --- |
| Frasco Congelante | −100 HP máximo | Congela todas as filhas vivas por duas oportunidades consecutivas dos cooperadores, incluindo a atual | CONGELA AS 3 |
| Relíquia | −100 HP máximo | +20% de dano recebido de ataques diretos até morrer; não acumula | DANO +20% |
| Explosivo/Granada | −50 HP máximo | 100 de impacto e 15 por rodada até morrer; sem empilhar hemorragia | 100 DANO · SANGRA 15 |
| Adaga | −25 HP máximo, preservado | Transmite 80% do dano efetivo de ataques à vida da Lady | VÍNCULO 80% |
| Anticoagulante | −75 HP máximo, preservado | Regeneração 20→10 permanente | REGEN 20→10 |

Lady com 2000 HP, filhas com 500 HP, piso recuperável de 300, regeneração 20/10, PROT. de 500 por filha, Sede e Fúria preservados. O workspace estava em hemorragia de 20; foi alterada para 15. Sem alterar a associação dos 15 itens às cartas.

Frasco impede regeneração e passivas de Bela, Cassandra e Daniela; cancela objetivos individuais pendentes sem punição. As Três Filhas respeita o bloqueio. Hemorragia, ataques, habilidades próprias da Lady e outros itens continuam funcionando. Só o alvo perde 100 de máximo; as outras filhas não são petrificadas.

Relíquia não silencia mais. Ordem: dano-base → bônus de 20% → limite de HP disponível → Adaga transmite 80% do efetivo. Base 100 causa 120 na filha e 96 na Lady; filha com 40 recebe 40 e transmite 32. Bônus e transmissão arredondam para baixo. Granada, hemorragia e outras fontes indiretas não recebem bônus nem transmitem pela Adaga.

## Decisões de duração, duplicatas e saves

- Reaplicar Frasco **renova para duas oportunidades a partir do uso mais recente**, não soma durações. Conta a oportunidade atual mesmo com HP completo. Morte da filha-alvo não descongela as demais.
- Expiração ocorre depois das consequências do segundo turno, inclusive regen ao fechar a rodada. Primeiro jogador: resto do próprio turno+parceiro; segundo: resto do próprio turno+primeiro da rodada seguinte. Não usa somente `roundNumber`.
- Objetivo cancelado não é recriado no meio da rodada nem punido após o descongelamento. Novas passivas surgem na próxima seleção normal. Regen e efeitos próprios da Lady retomam seus fluxos normais.
- Relíquia duplicada mantém 20%, mas anexa/consome carta e petrifica respeitando o piso. Explosivo reaplicado mantém um único sangramento de 15 e preserva o controle do último tick; novo impacto de 100 é permitido.
- Saves v2 anteriores migram uma única vez (`castleItemEffectsVersion:1`, regras `itemEffectsVersion:2`): Relíquias anexadas a filhas vivas passam ao bônus de 20%; Frio antigo ainda ativo vira duas oportunidades globais a partir da retomada; hemorragia ainda ativa passa a 15. Sem repetir petrificação, impacto, cura ou tick; preserva feridas, consumo, anexos, PROT. e último tick. Sangramento expirado não volta.
- Saves v1 continuam no contrato legado já existente. Experimentos históricos pinam `itemEffectsVersion:1`; dados e resultados anteriores não foram recalculados.
- Snapshot/undo/reload guardam efeito global, turnos já consumidos e bônus da Relíquia. Eventos/turnos duplicados não gastam duração outra vez.

## Interface

As cinco legendas usam um helper único para qualquer cópia. Ajuda informa efeito completo e petrificação. Rótulos mais longos ocupam somente a parte exposta da carta, sem alterar espaçamento da mão, tamanho da carta ou tamanho da fonte. No celular, o espaçamento entre letras da legenda foi reduzido em 0,5 px para caber sem diminuir a fonte. A legenda também recebe toque no mesmo controle do item. Carta e item continuam controles separados.

As três filhas congeladas recebem borda azul, frost leve nas extremidades e chip CONGELADA com duração restante. HP, status e anexos permanecem visíveis e clicáveis. `prefers-reduced-motion` elimina a pulsação, mantendo o estado estático. Não há partículas/loops JS nem animação nova no Especial.

## Arquivos deste lote

- Motor: `js/boss/dimitrescu-castle.js`, `js/boss/mechanics/dimitrescu.js`, guarda da reação de Daniela em `js/boss/boss-engine.js`.
- UI/cache: `js/boss/ui/dimitrescu-castle-view.js`, `styles/boss/dimitrescu.css`, `service-worker.js` (v303, sem publicação).
- Reprodutibilidade histórica: `scripts/dimitrescu-item-experiment.mjs` (fixa contrato antigo, sem recalcular resultados).
- Testes: novo `tests/dimitrescu-item-final.test.mjs`; expectativas em `tests/dimitrescu-items-v2.test.mjs`, `tests/dimitrescu-package-b.test.mjs`, `tests/dimitrescu-cadence.test.mjs`, `tests/boss-resource-feedback.test.mjs`, `tests/dimitrescu-item-experiment.test.mjs`, `tests/playtest-p0.test.mjs`; navegador em `tests/dimitrescu-castle.browser.mjs` e `tests/playtest-p0.browser.mjs`.
- Documentação: `docs/DOCUMENTACAO_CHEFE_DA_MESA.md`, `docs/INVENTARIO_HABILIDADES_CHEFES.md`, `docs/HANDOFF_DESENVOLVIMENTO_BURACO.md`, `docs/ETAPA_2_DIMITRESCU_2026-10-10.md`, `docs/PACOTE_CONSOLIDADO_CHEFES_2026-10-10.md`, `docs/REWORK_ITENS_DIMITRESCU_2026-10-08.md`, `docs/BALANCEAMENTO_SEIS_CHEFES_2026-10-10.md` e este relatório. Relatórios anteriores receberam indicação de supersessão, sem alterar tabelas históricas. Checklist antigo intacto.

## Validação

- Suíte ampla: **1.401 aprovados, zero falhas/skips** — `.cache/dimitrescu-final-unit.log`.
- 17 testes novos: dois posicionamentos do Frasco, travessia de rodada, objetivos pendentes, As Três Filhas, reaplicação, eventos duplicados, bleed/Anti/ataques/morte, combo Relíquia/Adaga, humano/BOT/Final, migração e undo/reload/snapshot.
- Browser dedicado da Lady: 1920/1376/390 px; mouse/toque/teclado, gelo e ajuda, Relíquia, hemorragia de 15, HP/anexos, ausência de overflow e movimento reduzido — `.cache/dimitrescu-final-browser.log`.
- Fixture real de UI com dois clientes serializados: 1024×768, 1376×1032, 1920×1080 e 390 px, zoom 1; rótulos, toque separado, redraw/reordenação/compra/undo/reload, gelo nas três e popovers acessíveis. Log final: `.cache/dimitrescu-final-verified-browser.log`. Capturas: `.cache/playtest-p0/freeze-{largura}.png`; `.cache/dimitrescu-ux/freeze-reduced-{largura}.png`.
- `git diff --check` sem erros. Staging existente preservado.

## Aprovações e limites

Nenhuma aprovação funcional adicional necessária para este lote: as regras foram autorizadas. Restam homologação em tablet/celular físicos e partida autenticada de dois humanos no Firebase. Browser emulado e suíte automatizada não equivalem a esses testes nem comprovam taxa de vitória humana. Nenhuma frente antiga foi reiniciada.
