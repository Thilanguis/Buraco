# Checklist de playtest dos chefes — status vigente

Atualizado em 13/10/2026. Mantém os IDs do checklist original de 10/10 para rastreabilidade, mas não repete prompts e números superados. **Conclusão técnica não significa homologação humana.** A versão integral original e seus adendos estão no [histórico](ARQUIVO_HISTORICO/HISTORICO_CHEFES_2026-10.md#arquivo-checklist-original-e-adendos-antes-consolidacao).

<a id="resumo-executivo-do-checklist--estado-em-10102026"></a>

## Resumo executivo

Regras atuais: [documentação funcional](DOCUMENTACAO_CHEFE_DA_MESA.md). Catálogo: [inventário](INVENTARIO_HABILIDADES_CHEFES.md). Relatórios antigos são evidências datadas, não autorização para refazer tarefas.

### Concluído tecnicamente

| IDs/frente | Entrega confirmada | Evidência |
| --- | --- | --- |
| P0-01/02/03/04/05/06/08/09/10/11 | Itens e Frasco utilizáveis com validações, símbolos persistidos no Lixo, HUDs, nomes longos, retrato Nehelenia, Daniela, timer humano desativado nos seis chefes, ajuda/chips e nome Frasco Congelante | [Etapa1](ARQUIVO_HISTORICO/HISTORICO_CHEFES_2026-10.md#arquivo-etapa-1-playtest-p0-2026-10-10) |
| P0-07, parte funcional | Ajuda clicável e separação de habilidade atual/efeito persistente; texto anômalo não reproduzido | [Etapa1](ARQUIVO_HISTORICO/HISTORICO_CHEFES_2026-10.md#arquivo-etapa-1-playtest-p0-2026-10-10) |
| P1-02/03/04/05/06/08 | Pacote aprovado da Lady aplicado e posteriormente atualizado: Explosivo 100+15 permanente; regen 20/10; Adaga 80%; Frasco global temporário; Relíquia+20%; filhas 500/piso 130 e petrificações 80/110/100/160/160 | [Itens12/10](ARQUIVO_HISTORICO/HISTORICO_CHEFES_2026-10.md#arquivo-pacote-cooperativo-e-bot-itens-2026-10-12) |
| P1-07 e parte experimental P1-06 | Comparação A/B e sensibilidades450HP/Adaga 60–100 já entregues; não repetir automaticamente | [Etapa2, histórico](ARQUIVO_HISTORICO/HISTORICO_CHEFES_2026-10.md#arquivo-etapa-2-dimitrescu-2026-10-10) |
| P2-01/02/03, parte de análise/design | Auditoria de variedade e duas propostas da Lady entregues; propostas ainda fora da rotação | [Auditoria](ARQUIVO_HISTORICO/HISTORICO_CHEFES_2026-10.md#arquivo-balanceamento-seis-chefes-2026-10-10), [propostas](ARQUIVO_HISTORICO/HISTORICO_CHEFES_2026-10.md#arquivo-propostas-dimitrescu-2026-10-10) |
| P2-06–P2-14 | Especial universal:25/50/100 compartilhados,100 por uso, beneficiário escolhido, cinco do Lixo/mínimo cinco, bloqueios/reações, revisão, undo/reload e comparação histórica pareada | [Pacote consolidado](ARQUIVO_HISTORICO/HISTORICO_CHEFES_2026-10.md#arquivo-pacote-consolidado-chefes-2026-10-10) |
| P3-06, implementação | Barra ao lado do X, seis PNGs e seis MP3s, quadro padronizado pela Jill, voo das cinco cartas, duração 3s, fallback, reduced motion e deduplicação implementados | [Apresentação](ARQUIVO_HISTORICO/HISTORICO_CHEFES_2026-10.md#arquivo-especial-cooperativo-animacao-2026-10-11) |
| Refinamentos11/10 | Aplicação direta de item na filha/ajuda separada; rótulos em duas linhas; DevTools independente do turno, sem pausa manual indevida; calibração de áudio e emblema mão/mesa/Lixo/voo | [Seleção](ARQUIVO_HISTORICO/HISTORICO_CHEFES_2026-10.md#arquivo-dimitrescu-itens-selecao-direta-2026-10-11), [DevTools](ARQUIVO_HISTORICO/HISTORICO_CHEFES_2026-10.md#arquivo-especial-e-devtools-refinamento-2026-10-11), [áudio](ARQUIVO_HISTORICO/HISTORICO_CHEFES_2026-10.md#arquivo-audio-e-itens-padrao-2026-10-11) |
| Pacotes12/10 | BOT preserva/usa itens da Lady; carta2=10; zumbis180/190/200 e três em qualquer fase; dez Flores; estratégia recente da Dominadora | [Itens/BOT](ARQUIVO_HISTORICO/HISTORICO_CHEFES_2026-10.md#arquivo-pacote-cooperativo-e-bot-itens-2026-10-12), [Dominadora/Matriarca](ARQUIVO_HISTORICO/HISTORICO_CHEFES_2026-10.md#arquivo-balanceamento-dominadora-matriarca-2026-10-12) |
| Pacote13/10 | Canastras 100/200/500/1000; HPs aprovados; nerfs pontuais; Cofre fechado não trava compra do BOT; migração sem replay | [Balanceamento aplicado](ARQUIVO_HISTORICO/HISTORICO_CHEFES_2026-10.md#arquivo-balanceamento-seis-chefes-2026-10-13) |
| P3-04 | Documentação local consolidada, regras/inventário/checklist/handoff e histórico separados; Google Doc remoto não sincronizado | [Guia](README.md) |

Não marcar novamente P0 como “a implementar”. Não restaurar20 de hemorragia, silêncio da Relíquia, carga de Frio guardada na vida cheia, piso 300 ou outros valores históricos.

### Pendências reais

- **P0-07 — evidência:** se a string “jarcado”/similar reaparecer, obter captura/log/estado exato. Não inventar causa nem refazer as correções funcionais já entregues.
- **P2-02 — decisão:** aprovar/revisar Bifurcação Carmesim e Salão das Duas Sombras antes de codificar. Designs concluídos não significam autorização.
- **P3-01 — aceite final:** revisão de consistência/acessibilidade dos chips de todos os chefes, sem desfazer refinamentos entregues ou ampliar a interface inteira.
- **P3-02 — futuro:** experimentos de habilidades novas somente após aprovação; não repetir auditorias concluídas.
- **Regressão de laboratório — teste ainda falhando:** `boss-lab-selection-regressions.test.mjs:12`, caso `nemesis/horde_invasion/1/phase_cap`: esperava Invasão, selecionou Caçada. Identificar se a expectativa do fixture deve ser ajustada; não restaurar limite por fase no motor para satisfazer esse teste.
- Google Doc remoto: atualização externa separada, somente por pedido explícito. O arquivo.gdoc local é ponteiro, não a especificação vigente.

### Depende de homologação/playtest humano

- **P0-01–P0-11 / P3-05:** dois clientes Firebase autenticados, latência/reconexão/reload, tablet físico e toque/teclado, cliques entre cartas próximas, morte, consumo, retorno ao Lixo e undo. Fixtures não comprovam Firebase real.
- **P1-01 e aceite P1-06/07:** primeira/última filha, tempo, dano, regen/hemorragia efetivas, Adaga e PROT. restante, agora com o pacote vigente. Implementação aprovada não prova dificuldade justa.
- **P2-04/05 / P3-03:** ritmo após os dois Mortos e Monte30–20; turnos sem dano/baixadas, tamanho de mão, bloqueios e acesso/benefício do Especial. Há instrumentação, métricas e simulações históricas; só complementar lacunas demonstradas, sem declarar dados existentes ausentes.
- **P3-06 — aceite final, não nova implementação:** posição/tamanho das seis PNGs, voo, som/volume, legibilidade, performance e reduced motion em hardware real. Aprovação de apresentação após partidas reais ainda é distinta de código entregue.
- Dificuldade dos seis chefes contra dupla humana competente: referência futura de aproximadamente 70% de vitórias dos chefes. Não usar win rate do BOT como estimativa direta de humanos.

## Última evidência verificada

`scripts/verificar_suite_chefes.mjs` selecionou58 arquivos: **1293 testes,1292 aprovados,1 falha,0 ignorados**. Log: `.cache/commit-suite-chefes.log`, conferido nesta consolidação; nenhuma nova execução de gameplay foi feita. Os 23 erros mencionados no relatório anterior são uma execução histórica anterior às correções dos testes, não o estado atual.

Os 377 focados,102 de preservação e resultados de browser/simulações anteriores continuam documentados no histórico com suas datas e limitações. Não somar suítes sobrepostas nem reescrever resultados antigos como medição nova.

## Próxima rodada, somente conforme novo pedido

1. Resolver a falha identificada do teste de laboratório sem alterar regra legítima para contorná-la.
2. Homologar dois humanos/Firebase/tablets e colher evidência do Fish Eye se necessário.
3. Medir dificuldade/ritmo do pacote vigente; só depois decidir outro balanceamento.
4. Avaliar aceite final P3-06 antes de declarar o projeto encerrado; novas habilidades exigem aprovação separada.

Nesta revisão documental: sem mudanças de código, novos experimentos, commit, push, deploy ou escrita remota.
