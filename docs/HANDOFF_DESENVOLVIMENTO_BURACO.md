# Handoff de desenvolvimento — Buraco

Atualizado em 13/10/2026 após consolidação documental. É contexto de retomada, não especificação paralela nem autorização para começar tarefas.

## Leia somente o necessário

| Pergunta | Referência |
| --- | --- |
| Como funciona hoje? | [Documentação funcional](DOCUMENTACAO_CHEFE_DA_MESA.md) |
| Quais habilidades/fases/pesos existem? | [Inventário](INVENTARIO_HABILIDADES_CHEFES.md) |
| O que terminou e o que falta? | [Checklist de playtest](CHECKLIST_PLAYTEST_CHEFES_2026-10-10_ATUALIZADO.md) |
| O que não pode regredir? | [Checklist permanente](CHECKLIST_REGRESSOES_E_ATUALIZACOES.md) |
| Como chegaram a essas decisões? | [Histórico único de etapas, relatórios e propostas](ARQUIVO_HISTORICO/HISTORICO_CHEFES_2026-10.md) |

Código local em `D:/Sistemas DEV/Buraco` é a fonte executável. Preservar alterações/staging do usuário. Não substituir por cópias remotas nem fazer commit/push/deploy ou escrita externa sem novo pedido.

## Estado de retomada

Pacote dos seis chefes de 13/10 aplicado; saves sem replay/curas retroativas e cobranças anunciadas preservadas. Itens/BOT da Lady, dez Flores, três zumbis em qualquer fase e Especial dos cinco resgates do Lixo permanecem vigentes. Números e regras ficam na documentação, não são repetidos aqui.

As seis PNGs e MP3s, voo das cinco cartas e barra ao lado do X já estão implementados. Não retomar P3-06 como “criar animação”; falta aceite em hardware/playtest humano. Seleção direta dos itens, prioridade do DevTools e calibração de áudio também foram entregues.

Última suíte conferida:1293 testes,1292 aprovados,1 falha de laboratório em `nemesis/horde_invasion/1/phase_cap` (esperado Invasão, observado Caçada). Log `.cache/commit-suite-chefes.log`. Não repetir o estado histórico de 23 falhas como atual; o checklist concentra a pendência e as condições de homologação.

Meta 70% contra humanos não medida. Testes de armazenamento/duas telas simuladas não homologam Firebase autenticado ou tablets físicos. Duas propostas da Lady continuam apenas propostas. Google Doc remoto não foi sincronizado; o.gdoc é ponteiro histórico.

## Organização atual

Relatórios datados/Etapas1 e2/experimentos/propostas estão juntos em `docs/ARQUIVO_HISTORICO/HISTORICO_CHEFES_2026-10.md`, com índice por nome original e evidências preservadas. JSON/CSV/traços em `docs/metrics` e `docs/experiments` não mudaram de caminho. Catálogo paralelo de regras foi arquivado: consultar especificação e inventário.

Os três commits existentes permanecem: `6fd9a02` (testes/métricas), `d01b4d7` (implementação), `005ff9d` (documentos anteriores). Esta consolidação não fez novo commit nem novo teste de gameplay.
