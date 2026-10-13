# Handoff de desenvolvimento — Buraco

Atualizado em 13/10/2026, após o pacote aprovado dos seis chefes. Contexto de retomada, não especificação paralela nem autorização para iniciar tarefas.

**Estado vigente:** bônus100/200/500/1000; HP Banqueiro2650, Dominadora2800, Matriarca2300, Nehelenia2400, Nemesis2500, Lady2000. Nerfs pontuais e Cofre/BOT aplicados; ledger de saves migra sem dano retroativo e cobranças já anunciadas são conservadas. [Relatório, testes e limitações](BALANCEAMENTO_SEIS_CHEFES_2026-10-13.md). Sem nova calibração massiva ou medida de70% contra humanos. Não reabrir P0/P1 nem alterar Especial ou mídia. Pacote de itens12/10 permanece vigente.

## Fonte de verdade e leitura

O workspace local `D:/Sistemas DEV/Buraco` é a fonte executável. Não substituir arquivos pelo Drive/GitHub nem assumir que cópias remotas estão sincronizadas. Preservar alterações/staging do usuário; sem commit, push ou deploy automático.

Este handoff substitui, para retomada atual, os blocos de estado/prioridades do arquivo enviado `HANDOFF_BURACO_ATUALIZADO_2026-10-10.md`. O original de Downloads foi preservado: seus capítulos antigos são memória histórica, não backlog ativo. Não retomar automaticamente bugs, refactors ou números antigos só porque aparecem nele.

| Pergunta | Documento responsável |
| --- | --- |
| Como o modo deve funcionar? | [Documentação funcional](DOCUMENTACAO_CHEFE_DA_MESA.md) |
| Quais habilidades existem hoje? | [Inventário](INVENTARIO_HABILIDADES_CHEFES.md) |
| O que terminou e o que falta? | [Resumo e checklist-mestre](CHECKLIST_PLAYTEST_CHEFES_2026-10-10_ATUALIZADO.md#resumo-executivo-do-checklist--estado-em-10102026) |
| Qual foi a causa de cada P0? | [Etapa 1](ETAPA_1_PLAYTEST_P0_2026-10-10.md) |
| Qual pacote da Lady foi aplicado e quais comparações foram feitas? | [Etapa 2](ETAPA_2_DIMITRESCU_2026-10-10.md) |
| Como foi integrado o Especial? | [Pacote consolidado](PACOTE_CONSOLIDADO_CHEFES_2026-10-10.md) |
| Quais são os dados e limites das simulações? | [Balanceamento dos seis chefes](BALANCEAMENTO_SEIS_CHEFES_2026-10-10.md) |
| Quais designs ainda precisam de aprovação? | [Propostas da Lady](PROPOSTAS_DIMITRESCU_2026-10-10.md) e P3-06 do checklist |
| O que não pode regredir? | [Checklist permanente](CHECKLIST_REGRESSOES_E_ATUALIZACOES.md) |

## Decisões encerradas — não perguntar nem implementar novamente

- Explosivo/Granada: **100 de impacto +15 de sangramento por rodada até morrer**, sem acumular. Petrificações aditivas: Adaga80, Explosivo110, Anticoagulante100, Frasco160 e Relíquia160. Frasco congela globalmente as três por duas oportunidades dos cooperadores, incluindo a atual; reaplicar renova para duas. Relíquia dá+20% de dano recebido de ataques diretos, permanente/sem stack; não silencia nem amplia itens/hemorragia. Ordem Relíquia→clamp→Adaga80%. [Pacote vigente de12/10](PACOTE_COOPERATIVO_E_BOT_ITENS_2026-10-12.md).
- Lady2000 HP; filhas500 cada, piso recuperável130; regen20/Anti10; Adaga80% do dano efetivo de ataques à filha diretamente na vida da Lady. Não aplicar450 HP ou Adaga100% por conta própria.
- Vínculo consumível:500 PROT. sustentados por filha viva,1500 iniciais; Coágulo→PROT.→HP. Morte remove até500 da proteção restante. Adaga conserva sua exceção de atravessar proteção. Sede/Fúria e outros itens não mudaram no último patch.
- Saves v2 recebem `castleItemEffectsVersion:1`: convertem hemorragia ativa para15, Relíquias anexadas em bônus20% e Frio ainda ativo em duas oportunidades globais. Sem replay de impacto/petrificação/cura/tick; HP, consumo, anexos e PROT. preservados. Compatibilidade v1 permanece distinta.
- Especial dos seis chefes: **exatamente cinco cartas do topo do Lixo**, mínimo cinco, bloqueios e reações respeitados. Lixo versus Monte já foi decidido explicitamente pelo usuário; não há divergência aberta.
- Carga compartilhada25/50/100 por canastra; somente diferença ao evoluir o mesmo jogo físico; custo100 por uso, excedente e reutilização preservados. Compra normal separada. Humano escolhe beneficiário, inclusive BOT; BOT não gasta automaticamente.
- Posição do Especial aprovada e aplicada: ao lado do X, na área de ações do jogador, não no HUD do chefe. Mantida barra compacta100 px/92 no celular e ajuda. P3-06 ainda trata da arte/animação temática definitiva, não de escolher novamente essa posição.
- Chips compactos: enfatizar somente valor+naipe quando houver carta; não ampliar caixa, espaçamento da mão ou PNG do Espelho. Chip da Adaga corrigido com `top:auto`, cerca de75×14 px nos três viewports testados; ajuda preservada.
- Devorador: três cartas novas baixadas pela equipe consomem três créditos e curam20/35/35/50 conforme normal/Mutado/Horda/ambos. Sem limite por turno, jogada ou cooldown; restos persistem entre jogadores/turnos. Não tocar no BOT dos modos normais por trabalhos do modo Chefe.

## Evidências disponíveis, sem extrapolar

- Última suíte do lote final de itens: **1.401 testes aprovados, zero falhas**; `.cache/dimitrescu-final-unit.log`, incluindo17 testes novos de congelamento/Relíquia/combos/persistência.
- Browser da Lady:1920/1376/390 px, gelo, ajuda100+15 e DANO+20%, mouse/toque/teclado/movimento reduzido; `.cache/dimitrescu-final-browser.log`. Fixture de dois clientes cobre1024×768,1376×1032,1920×1080 e390 px; valida rótulos/controles e gelo global. Ver relatório do lote para logs/evidências. Não representa tablet físico ou Firebase autenticado.
- Pacote anterior: 1.380 testes e browser em 1024×768, 1376×1032, 1920×1080 e 390 px, dois clientes simulados/CAS. Esse resultado histórico é distinto da nova repetição dos quatro tamanhos no lote final; consultar o relatório novo para evidência da versão atual.
- Etapa 2:1.344 batalhas históricas,64 sementes×7 configurações×3 rotas. Pacote consolidado:144 batalhas pareadas e auditoria de variedade. Esses dados são anteriores ao impacto100; não estimam win rate humano da versão final.
- No estudo do Especial houve12 ativações/60 cartas, ganho pequeno de ritmo e nenhuma melhora agregada de vitórias. Implementação concluída não comprova resolver a estagnação humana.
- `.cache` contém evidências locais ignoradas pelo Git. Relatórios e JSON preservam rastreabilidade, não devem ser editados para simular uma nova medição.

## Retomada permitida somente conforme novo pedido

Consultar o checklist para o status detalhado. As próximas frentes reais são homologação de dois humanos/Firebase/tablets e dificuldade/ritmo pós100; evidência exata da string anômala do Fish Eye; aprovação das duas propostas da Lady; aprovação e implementação futura do visual/animações finais P3-06. Instrumentação histórica já existe; só complementar lacunas se autorizado, sem repetir auditorias concluídas.

O Google Doc remoto de balanceamento não foi atualizado nesta revisão local. O `.gdoc` é ponteiro, não documento editável local. Não tratar sua cópia histórica como regra atual nem fazer escrita remota automaticamente.

## Revisão documental desta sessão

Somente Markdown local foi organizado. Nenhum código, mecânica, layout, teste, staging ou estado remoto alterado. Não houve novos testes de gameplay nesta revisão; os números acima vêm dos logs anteriores conferidos. Sem commit/push/deploy.
