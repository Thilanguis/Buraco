# Importação do histórico legado — 2026-09-26

Associação autorizada pelo usuário: Gabriel e Biel pertencem ao perfil Gabriel; Luana pertence ao perfil Luana. Correspondência exata de nome, sem atribuir bots às contas humanas.

## Resultado confirmado no Firebase

- 281 documentos de salas consultados; 144 com estado; 49 finalizados.
- 45 partidas importadas: 38 no histórico de Gabriel, 36 no de Luana (74 documentos privados, pois partidas compartilhadas aparecem em ambos).
- Quatro finalizadas apenas com bots não foram importadas. Salas sem estado e partidas incompletas não entraram.
- Categorias recuperadas: 28 entre jogadores, 15 com bots, duas contra chefes.
- As 45 salas originais permaneceram inalteradas, conferindo `updateTime` antes e depois.
- Escrita administrativa atômica, com precondição `exists: false` em cada destino: nenhum histórico existente sobrescrito.

## Limitações e rastreabilidade

Placar reconstruído pelas funções de pontuação atuais do jogo, sem Pix/e-mail no resumo. Quem bateu permanece separado de quem venceu por pontos. IDs usam o início real quando disponível; caso contrário, `legacy_<sala>`.

40 partidas não possuíam horários explícitos de início/fim: a data utiliza o último registro disponível, identificada como aproximada, e a duração permanece nula. Não inferimos início pela criação da sala, pois ela pode ter sido reutilizada.

As partidas importadas não tinham marcador explícito de teste. Essa ausência não garante que eram partidas reais; os detalhes exibem a limitação. Testes identificados pelo marcador continuam excluídos das estatísticas pelo módulo comum.

Plano e recibo administrativos locais, ignorados pelo Git: `.cache/legacy-import-plan.json` e `.cache/legacy-import-receipt.json`. O recibo lista os 74 destinos verificados. Nenhum estado de jogo ou regra de segurança foi modificado pela importação.

A interface inclui indicação de recuperação, data aproximada e duração indisponível. Cache atualizado para v201; publicação do frontend não realizada nesta tarefa.
