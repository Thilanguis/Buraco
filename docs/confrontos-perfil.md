# Confrontos no perfil

A aba Confrontos compara somente resumos privados já carregados do histórico da conta conectada. Não consulta perfis de terceiros nem exige mudanças no Firebase.

- Identidade por UID; o nome mais recente disponível nas partidas é usado no seletor.
- Adversários: pessoas em times diferentes. Jogamos juntos: pessoas no mesmo time.
- Filtro por modalidade; testes e partidas com bots ficam fora.
- Vitórias, derrotas, empates, sequência mais recente (empate interrompe vitórias), maior placar e média dos times.
- Pontos negativos são preservados. Partidas duplicadas são contadas uma vez.
- Detalhes das partidas disponíveis no próprio painel; informações de migração antiga preservadas.
- Paginação compartilhada com Histórico, com aviso de amostra parcial e tratamento de erro. Não é um ranking global.
- Nome/Pix e retorno animado ao menu continuam disponíveis.

## Opções da Dominação

Os detalhes compartilhados pelo histórico e pelos confrontos exibem Plus Dominação, Procurar carta, Visão do Dominador e Amiga do Dominador (com capacidade quando registrada). Booleanos explícitos são preservados no resumo; campos ausentes aparecem como “Não registrado”, sem aplicar defaults atuais a partidas antigas. O indicador descreve a configuração, não o uso do recurso. Humilhação não recebe opções exclusivas da Dominação.

Em 2026-09-26, quatro partidas antigas importadas tinham configuração explícita disponível. Foram enriquecidas as oito cópias dos históricos de Gabriel e Luana, com atualização limitada ao campo `dominationOptions`, precondição de versão e verificação integral dos resumos. Placares e salas preservados. Recibo local ignorado: `.cache/history-options-receipt.json`. Interface e gravação das novas partidas: cache v204, sem publicação nesta tarefa.

Validação: testes unitários em `tests/history-comparison.test.mjs`; navegador offline em 390, 844 e 1280 pixels em `tests/account-page.browser.mjs`; integração do lobby em `tests/account-lobby.browser.mjs`. Nenhuma conta ou partida real criada. Cache v203; publicação não realizada.
