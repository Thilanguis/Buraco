# Revisão de objetivos dos chefes — 05/10/2026

Fonte: workspace local atual. Sem Google Drive, publicação, alteração de HP, fases, frequência, pesos ou valores de falha.

## Regra permanente

Sucesso de objetivo não reduz a condição especial. Evita sua punição. Canastras mantêm todo o alívio aprovado. Gastos do próprio chefe por vantagem permanecem.

## Correções funcionais

| Chefe / habilidade | Alívio removido | Falha mantida |
| --- | --- | --- |
| Dimitrescu — Caçada de Bela | -3 Sede por sucesso | +14 / +16 |
| Dimitrescu — Marca Carmesim | -2 Sede por marca cumprida | +7 / +9 por marca falhada |
| Dimitrescu — Banquete de Cassandra | -4 Sede por sucesso | +16 / +18 |
| Dimitrescu — Enxame de Daniela | -3 Sede por evitar o Lixo | +12 / +15 na retirada, sem cobrança duplicada na resolução |
| Dimitrescu — Coágulo Carmesim | -6 Sede ao romper por dano | Sobreviver à rodada cura metade da proteção restante |
| Dimitrescu — As Três Filhas | -2 Sede por objetivo cumprido | +8 por objetivo falhado |

Auditoria do Banqueiro já usava sucesso +0, mas agora ignora `successDelta` negativo em snapshots antigos. O evento registra sucesso explicitamente; o HUD não exige mais delta negativo para mostrar “Objetivo concluído”, mantendo compatibilidade com eventos antigos. Não houve mudança de falha.

Banqueiro, Dominadora, Matriarca, Nehelenia e Nemesis não tinham outras recompensas negativas por sucesso nos fluxos atuais auditados. Preservados: Vinho Carmesim (consumo de Sede para cura), Renascimento (consumo de Flor), Favorita (escolha automática do chefe, sem objetivo), custos positivos de escolha/obediência e purificação do Morto por canastra.

BOT e Laboratório usam as resoluções reais; não existia expectativa numérica negativa específica a substituir nos cenários. Definições, mensagens compactas, ajuda e feedback de rompimento do Coágulo foram corrigidos.

## Nemesis visual

Cards em faixa própria abaixo do HUD, reutilizando arte full-bleed, chip e ajuda oficiais. INVADINDO indica entrada; ATIVO indica persistência. MUTADO, REFORÇADO e CADÁVER continuam compactos. A ajuda das passivas e das habilidades afetadas foi enxugada sem remover prazos, regras ou punições. Lifecycle e mecânicas preservados.

## Validação

- Regressões novas: **30/30** passaram, cobrindo os seis chefes, sucessos parciais, reload, Coágulo e exceções preservadas.
- Chefes / alívio / HUD / ajuda / apresentação / mecânicas / arquitetura: **193/193** passaram.
- Browser real do Nemesis: **1920×1080, 1024×768, 844×390, 390×844 e 3840×2160** passaram, incluindo altura independente do HUD e chips/arte/ajuda contidos. Fixture local, sem sessão Firebase autenticada.
- Suíte ampla: **561 testes, 510 passaram, 51 falharam**. Comparação dos nomes das falhas com `.cache/nemesis-lifecycle-wide.log` (528 testes, 477 passaram, 51 falharam): nenhuma falha adicional. A baseline iniciada nesta rodada também mostrou falhas antigas antes de ficar presa.
- O teste antigo `boss-debug-scenarios.test.mjs` já travava na baseline; foi interrompido antes das alterações. Suíte ampla executada separadamente sem esse arquivo, mantendo a limitação explícita. Não se declara suíte inteira verde.
- `git status` / `git diff` conferidos antes e depois; mudanças anteriores preservadas. Sem stage, commit, deploy, cache bump ou Drive.
