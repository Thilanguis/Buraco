# Balanceamento aplicado — seis chefes — 13/10/2026

Pacote aprovado implementado no workspace local. Sem commit, push ou deploy. Não houve nova bateria de calibração de dificuldade. A referência futura de aproximadamente 70% de vitórias dos chefes contra uma dupla humana competente **não foi medida** nem inferida pelo BOT.

## Valores vigentes

| Canastra | Bônus de dano |
| --- | ---: |
| Suja | 100 |
| Limpa | 200 |
| Real | 500 |
| Ás-a-Ás | 1000 |

O bônus é adicional ao dano individual das cartas, contabilizado por ID físico apenas uma vez. Carta2 permanece10, Ás15, Joker20. Suja→Limpa acrescenta100; Limpa→Real300; Real→Ás-a-Ás500. Repetir render/snapshot/transição do mesmo tier não causa novo dano. O teste canônico com2/Ás/Joker e Limpa causa245, depois300 e500 nas evoluções, sem repetir os45 das cartas. HP nunca fica negativo.

| Chefe | HP |
| --- | ---: |
| Banqueiro | 2650 |
| Dominadora | 2800 |
| Matriarca Esmeralda | 2300 |
| Nehelenia | 2400 |
| Nemesis | 2500 |
| Lady Dimitrescu | 2000 |

### Penalidades pontuais

| Nehelenia — Mundo do Espelho | Novo valor |
| --- | ---: |
| Jogo Espelhado, erro ou ignorar | +14 |
| Siga o Reflexo, quantidades diferentes | +12 |
| Espelho do Lixo, erro | +12 |
| Pesadelo Eterno, erro | +20 |

O motor conserva a escala interna0–5 (cada unidade equivale a20 no HUD); os valores apresentados continuam em0–100. Os cinco Espelhos, os três auxiliares, ilusões, bloqueios, demais penalidades e limite100 permanecem.

| Banqueiro — Juros Fixos | Leve | Padrão | Severo |
| --- | ---: | ---: | ---: |
| Integral F1/F2 | 8 | 10 | 12 |
| Integral F3 | 12 | 14 | 15 |
| Garantia F1/F2, preservada | 4 | 5 | 6 |
| Garantia F3, preservada | 6 | 7 | 8 |

Pesos25%/50%/25%, juros por adiamento2/3 e teto100 preservados. Auditoria de Naipe cobra10 na F2 e14 na F3 por falha. Demais habilidades e Cofre intactos.

| Dominadora — Etiqueta de Ferro | F1 | F2 | F3 |
| --- | ---: | ---: | ---: |
| Naipe errado | 8 | 10 | 12 |
| Obediência, preservada | 2 | 2 | 3 |

Dominação continua limitada a50 por jogador. Transbordamento, demais habilidades e estratégia recente do BOT não foram alterados.

## Compatibilidade e idempotência

`cooperativeBalanceVersion:2` registra a normalização única do pacote.

- Nos saves antigos, créditos de bônus180/300/450 passam a200/500/1000 **somente no ledger**, sem causar dano retroativo. Mantêm-se IDs já danificados, contribuições, alívios de recursos, estatísticas e eventos. Uma Limpa antiga que já causou180 não recebe mais20 ao abrir o save; se evoluir para Real, acrescenta300.
- Habilidades já anunciadas conservam sua cobrança original. Juros/Auditoria preservam o payload; ordens antigas da Etiqueta e ilusões pendentes recebem o valor antigo explícito quando necessário. Novas ativações usam os valores deste pacote. Ajuda/HUD leem o valor persistido, não um número divergente do cálculo.
- Partidas antigas em andamento dos três chefes cujo HP mudou recebem o novo máximo, preservando o HP absoluto restante e limitando-o ao máximo. Não há cura ao carregar. Partidas encerradas não são reabertas nem têm seu HP máximo histórico reescrito.
- Serialização, reload, normalização repetida e Voltar foram cobertos. Não foram alterados schema/regras do Firebase; não foi realizado teste com clientes Firebase autenticados nesta etapa.

## Cofre fechado — causa e correção

`shouldBossBotReclaimVault()` avaliava utilidade da carta sem exigir que a cotação estivesse aberta. O BOT podia escolher o resgate de um Cofre fechado; `reclaimBossVault()` legitimamente devolvia `null`, mas `botEngine.executeDrawStock()` encerrava ali, sem concluir a compra.

A estratégia agora exige `quote.state === 'open'`. O motor continua rejeitando resgate fechado. Como defesa adicional, uma tentativa sem evento não encerra silenciosamente a compra: o fluxo prossegue para a compra canônica do Monte, somente se o action gate comum permitir. Resgate confirmado conserva seu commit e retorno próprios.

A reprodução com semente120001 usa `BossBuracoBot`, o motor, baralho físico e métodos reais de `app.js` através do harness headless existente. A batalha termina sem compra forçada, turno pulado ou resultado censurado. O teste direto também confirma que Cofre fechado não é opção do BOT e continua inválido para o motor. Isso é regressão de um bug, não estimativa de dificuldade humana.

## Regras anteriores preservadas

- Matriarca: dez Flores, Renascimento300/uma vez/consumo de Flor, Casulo180, ameaças e tetos de cura.
- Nemesis: três zumbis diferentes possíveis em qualquer fase; Agarrador180, Infectado190, Devorador200; entrada natural por Invasão, quotas/lifecycle de reanimação, mutação, passivas e Infecção. Reanimação90/95/100.
- Lady: HP2000, PROT.1500, filhas500, piso recuperável130, petrificações80/110/100/160/160, Explosivo100+15 permanente sem stack, Adaga80%, regen20/Anti10, Frasco global temporário, Relíquia+20%, itens15, Sede e Fúria do pacote12/10.
- Especial: carga25/50/100 incremental, custo100, exatamente cinco do topo do Lixo, beneficiário, bloqueios e reações. Sem alteração em imagens, áudio, animações, fontes, chips ou espaçamento.

## Testes executados

Node do runtime local; comandos abaixo podem usar `node` quando disponível no PATH.

### Focados: 377 aprovados, zero falhas

```powershell
node --test tests/cooperative-balance-oct13.test.mjs tests/boss-engine.test.mjs tests/boss-final-balance.test.mjs tests/boss-integration.test.mjs tests/boss-rework-october.test.mjs tests/nemesis-boss.test.mjs tests/nemesis-final-balance.test.mjs tests/nehelenia-boss.test.mjs tests/dominatrix-balance.test.mjs
```

Inclui31 testes novos: seis HPs; dano incremental/cartas; deduplicação; limite de HP; saves antigos; cobranças anunciadas; reload/undo; quatro nerfs da Nehelenia no motor/HUD/ajuda; contratos das três fases; Auditoria; Etiqueta/obediência; Cofre/BOT. O erro do reflexo falso também foi conferido na regressão da Nehelenia.

### Preservação e arquivos históricos: 102 aprovados, zero falhas, quatro ignorados

```powershell
node --test tests/boss-special.test.mjs tests/matriarch-ten-flowers.test.mjs tests/dimitrescu-castle.test.mjs tests/cooperative-special-presentation.test.mjs tests/cooperative-special-audio.test.mjs tests/canastra-hp-experiment.test.mjs
```

Quatro testes de batalhas/replay da análise12/10 são condicionados aos hashes originais do motor. O pacote13/10 mudou esses inputs: os testes históricos são explicitamente ignorados, em vez de comparar partidas novas a resultados antigos e reescrever evidências. Validação das métricas arquivadas e testes unitários do resumo continuam passando. Os arquivos históricos de métricas e seus resultados não foram alterados.

### Regressão ampliada: 1276 executados, 1253 aprovados, 23 falhas preexistentes

Foram selecionados os `.test.mjs` com prefixos `boss-`, `nemesis-`, `nehelenia-`, `dominatrix-`, `matriarch-`, `dimitrescu-`, `cooperative-balance-`, `canastra-hp-`, excluindo nomes com `experiment`/`battle`. **A suíte ampliada não está inteiramente verde.** Os23 casos abaixo também falham contra o código anterior (`967722db47ad3e6ffdefb7753df2f1da3c5bf0c0`), confirmado por loader de diagnóstico que lê fontes do Git sem trocar o workspace:

| Arquivo | Falhas | Diagnóstico do teste |
| --- | ---: | --- |
| `boss-eligibility-audit.test.mjs` | 2 | Ainda espera teto por fase/razão `phase_cap`, removido no pacote anterior |
| `boss-lab-selection-regressions.test.mjs` | 1 | Expectativa antiga de fallback por fase em cenário de Invasão/Reanimação |
| `nemesis-grabber.test.mjs` | 3 | Espera reanimação110/120/130, embora o pacote anterior já use90/95/100 |
| `boss-help-content.test.mjs` | 1 | Espera Marca Carmesim+7 fixa, anterior à curva aprovada de12/10 |
| `boss-objective-resource-rule.test.mjs` | 15 | Expectativas antigas de Tributo/Marca/Fúria, anteriores ao pacote12/10 |
| `boss-september-regressions.test.mjs` | 1 | Harness VM não injeta `selectBossRecoveryDiscardIndex`, já exigido pela recuperação |

Não foi alterada produção fora do escopo para satisfazer essas expectativas antigas, nem declarado que os23 casos passaram. Correção desses testes/harness é manutenção futura separada; não justifica restaurar regras obsoletas. Logs locais: `.cache/balance-oct13-focused-final.log`, `.cache/balance-oct13-preserved.log`, `.cache/balance-oct13-relevant-final.log`, `.cache/balance-oct13-baseline.log`, `.cache/balance-oct13-baseline-lady.log`. `git diff --check` passou.

Homologação desktop/tablet/celular com dois humanos e Firebase, bem como dificuldade aproximada70%, permanece para a rodada posterior de playtest. Não houve teste visual em navegador nesta etapa, pois os ajustes de interface foram apenas conteúdo, não layout.

## Arquivos alterados neste lote

- Produção: `app.js`; `js/boss/boss-balance.js`; `js/boss/boss-engine.js`; `js/boss/bosses/{banker,dominatrix,matriarch,nehelenia,nemesis}.js`; `js/boss/mechanics/nemesis.js`; `js/boss/presentation/{banker,dominatrix,nehelenia}.js`; `service-worker.js` (cachev309 para servir os módulos atualizados).
- Testes: novo `tests/cooperative-balance-oct13.test.mjs`; expectativas vigentes em `boss-engine`, `boss-final-balance`, `boss-integration`, `boss-rework-october`, `dominatrix-balance`, `nehelenia-boss`, `nemesis-boss`, `nemesis-final-balance`, `nemesis-grabber`; guarda de proveniência em `canastra-hp-experiment`.
- Documentação: este relatório; `DOCUMENTACAO_CHEFE_DA_MESA.md`; `INVENTARIO_HABILIDADES_CHEFES.md`; `CHECKLIST_PLAYTEST_CHEFES_2026-10-10_ATUALIZADO.md`; `HANDOFF_DESENVOLVIMENTO_BURACO.md`; `README.md`.

Alterações/staging anteriores do usuário foram preservados. Não foram reabertos checklists antigos nem recalculados os relatórios históricos.
