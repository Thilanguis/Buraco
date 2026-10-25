# Guia da documentação do Buraco

## O que ler hoje

| Documento | Papel |
| --- | --- |
| [Regras do modo Chefe](DOCUMENTACAO_CHEFE_DA_MESA.md) | Especificação funcional vigente: combate, chefes, itens, Especial, BOT, apresentação e saves |
| [Inventário](INVENTARIO_HABILIDADES_CHEFES.md) | Catálogo curto de habilidades/fases/pesos; não outro relatório de sessão |
| [Checklist do playtest](CHECKLIST_PLAYTEST_CHEFES_2026-10-10_ATUALIZADO.md) | Único status: concluído técnico, pendente e homologação humana |
| [Checklist permanente](CHECKLIST_REGRESSOES_E_ATUALIZACOES.md) | Prevenção de regressões antes de mudanças |
| [Handoff](HANDOFF_DESENVOLVIMENTO_BURACO.md) | Contexto curto para retomar; não autorização nem especificação duplicada |
| [Histórico consolidado](ARQUIVO_HISTORICO/HISTORICO_CHEFES_2026-10.md) | Etapas1/2, relatórios datados, métricas explicadas, decisões antigas e propostas, com índice por nome original |

## O que foi reunido

Os 21 documentos datados antes soltos na raiz, incluindo o catálogo paralelo [REGRAS_VIGENTES_SEIS_CHEFES_2026-10-13.md](ARQUIVO_HISTORICO/HISTORICO_CHEFES_2026-10.md#arquivo-regras-vigentes-seis-chefes-2026-10-13), e seis relatos da antiga pasta histórica estão integralmente no mesmo arquivo. O checklist original e os contextos anteriores também foram preservados lá. Relatos antigos podem dizer “final”, “atual”, “pendente” ou trazer números superados: valem para sua data, não para a implementação vigente.

Métricas, traços comprimidos e JSON de experimentos **não foram movidos**: `docs/metrics/` e `docs/experiments/` continuam nos caminhos usados pelos testes/scripts. Originais dos documentos são recuperáveis no Git até005ff9d.

Alguns geradores históricos, como `scripts/boss-consolidated-report.mjs`, ainda escrevem nomes datados antigos. Não os executar só para “atualizar docs”: isso pode recriar relatórios fora do arquivo e misturar medições de versões diferentes. Nova execução exige escopo/versão próprios; não alterar esses scripts nesta revisão documental.

O.gdoc é ponteiro remoto histórico. Nenhum Google Doc/Drive foi atualizado. Logs em.cache são evidências locais ignoradas pelo Git, não resultados de outra rodada.

## Demais áreas do projeto

- [Login/Firebase](login-firebase.md): autenticação, perfis, persistência, regras e publicação.
- [Acesso ao DevTools](devtools-firebase.md): trava de interface e suas limitações de segurança; prioridade dos comandos está na documentação funcional.
- [Histórico/perfil](historico-perfil.md) e [confrontos](confrontos-perfil.md): comportamento atual dessas telas.
- [Importação do histórico legado](importacao-historico-legado.md) e [correção em tempo real](correcao-historico-tempo-real.md): registros técnicos específicos, não regras dos chefes.

Esses documentos de infraestrutura/perfil foram mantidos separados porque tratam de assuntos diferentes, não das etapas repetidas do modo Chefe.

## Regra de manutenção

Código/testes são a fonte executável. Alteração de regra estável atualiza especificação e inventário quando pertinente; status muda somente no checklist. Resultado datado vai ao histórico, sem reescrever medições antigas. Handoff aponta para esses arquivos e registra só contexto/limites.

Não declarar homologação humana por testes de BOT, fixtures ou duas telas simuladas. Não reabrir tarefa concluída por encontrar um checkbox antigo no arquivo histórico. Documentação não autoriza commit, push, deploy, escrita remota ou implementação de propostas.

Antes de substituir/remover feature, consultar o checklist permanente e auditar dependências: som, animação, HUD, acessibilidade, eventos/saves, BOT/timers, Firebase/revisão, Service Worker/assets e testes. Preserve comportamentos acoplados; sem destino claro, pedir decisão em vez de removê-los.
