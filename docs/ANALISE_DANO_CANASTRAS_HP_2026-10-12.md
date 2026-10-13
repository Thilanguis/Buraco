# Canastras: pontuação como dano e HP dos seis chefes

Análise executada em 12/10/2026. Referência de produção:
`967722db47ad3e6ffdefb7753df2f1da3c5bf0c0`.

## Resultado principal

Foram executadas **2.240 tentativas oficiais**, das quais **2.084 terminaram pelo
motor** e **156 foram interrompidas por uma limitação do BOT no Cofre do Banqueiro**.
As interrupções não foram transformadas em derrotas nem completadas artificialmente.

A comparação principal contém as mesmas **100 sementes completas por chefe** em
três condições: sistema atual, dano proposto com HP atual e dano proposto com HP
candidato. São **600 + 600 + 600 batalhas completas pareadas**. As outras 284
batalhas completas são suplementos e sensibilidades; continuam disponíveis.

O aumento observado é muito menor que presumir várias Ás-a-Ás em toda partida.
O BOT terminou entre 80 e 96 das 100 partidas de referência de cada chefe sem
concluir nenhuma Ás-a-Ás. Entretanto, o ganho muda decisões, fases, duração e
curas: não basta somar o bônus extra à partida antiga.

**Recomendação: testar os HPs abaixo, sem tratá-los como um pacote homologado.**
Eles amortecem o ganho, mas não reproduzem exatamente a dificuldade anterior do
BOT. Não existe estimativa validada de taxa de vitória de jogadores humanos.

## 1. O que foi executado

- `BossBuracoBot` atual, para ambos os cooperadores.
- Métodos reais de `botEngine` extraídos do `app.js`: compra do Monte/Lixo,
  extensão/abertura de jogos, validação de Crédito e Interdito, escolha de ilusões,
  Cofre, uso estratégico dos itens e descarte/recuperação.
- Funções reais de normalização, classificação visual, pontuação, ordenação,
  Mortos, reciclagem e encerramento do `app.js`.
- Baralho real de 108 cartas criado por `js/deck.js`, distribuição alternada de
  11 cartas por jogador, dois Mortos de 11 e uma carta inicial no Lixo.
- Sorteio reproduzível Fisher–Yates; mesma ordem física e mesmo sorteio inicial
  de itens em cada comparação. Primeiro cooperador alterna pela paridade da semente.
- Habilidades, probabilidades, bloqueios, escolhas, fases e condições de derrota
  verdadeiros. Não foram preparados jogos ou canastras artificialmente.
- Nemesis com Agarrador 180, Infectado 190, Devorador 200, três persistentes
  possíveis desde a primeira fase; a amostra chegou a três simultâneos.
- Matriarca com dez Flores; Dimitrescu com os 15 itens e valores atuais, incluindo
  impacto 100, hemorragia 15, transferência 80%, regeneração 20/10 e petrificação.

Somente DOM, áudio, animações, espera entre ações e gravação Firebase foram
substituídos por execução local sem apresentação. O algoritmo de decisão não foi
trocado por uma política simplificada. O planner usa seu fallback local existente,
sem Web Worker, e sem pausas cosméticas. Não são partidas de navegador/Firebase.

O Especial permanece no motor, acumula normalmente e não foi alterado. O BOT
atual não possui ativação automática do Especial da equipe; não foi inventada
uma estratégia de ativação para melhorar seus resultados.

### Sistemas comparados

| Categoria | Atual | Proposto |
| --- | ---: | ---: |
| Suja | 100 | 100 |
| Limpa | 180 | 200 |
| Real | 300 | 500 |
| Ás-a-Ás | 450 | 1.000 |

Dano individual preservado: 2 = 10, Ás = 15, Joker = 20; demais valores iguais
à produção. Evolução incremental preservada: Limpa → Real concede somente
300 adicionais no proposto, e Real → Ás-a-Ás somente 500 adicionais.

Os valores experimentais são carregados por hooks de módulos **apenas dentro dos
workers do experimento**. Nenhuma tabela, HP ou regra de produção foi editada.

## 2. Amostra e censura

Sementes iniciais: `120000` a `120099`, nos seis chefes. Banqueiro também teve
`120100` a `120179`, nos três cenários, para repor tentativas interrompidas.

| Grupo oficial | Tentativas | Completas | Interrompidas |
| --- | ---: | ---: | ---: |
| Atual, seis chefes + suplemento Banqueiro | 680 | 628 | 52 |
| Proposto/HP atual + suplemento Banqueiro | 680 | 628 | 52 |
| HPs candidatos e sensibilidades | 880 | 828 | 52 |
| Total | 2.240 | 2.084 | 156 |

Cada coorte principal usa as primeiras 100 sementes, em ordem crescente, que
terminaram nas três condições comparadas. Banqueiro vai de 120000 a 120140,
com as sementes interrompidas excluídas; os demais usam 120000–120099.
Os IDs exatos estão em `metrics/canastra-hp-2026-10-12/cohort.json`.

Essa exclusão é uma limitação: jogos que acionam o problema do Cofre podem ter
um perfil diferente. Os 52 casos por condição continuam nos arquivos brutos e
no CSV geral; seus números parciais não entram como partidas completas.

### Limitação comprovada do Cofre

Na semente 120001, turno 35, o BOT estava sem compra concluída, sem escolha
pendente e no estágio normal dos jogadores. `shouldBossBotReclaimVault()` pode
considerar a utilidade da carta mesmo com o Cofre fechado. `executeDrawStock()`
tenta o resgate; `reclaimBossVault()` rejeita legitimamente o Cofre fechado;
a rotina retorna sem comprar. O descarte e a recuperação permanecem bloqueados.

O mesmo padrão ocorreu em 52 das 180 sementes do Banqueiro, nas três condições.
Não foi corrigido nem contornado neste lote: seria uma alteração de produção
fora da análise solicitada.

## 3. Canastras realmente concluídas

Uma canastra física conta **uma vez, pela maior categoria que realmente atingiu**.
Limpa → Real → Ás-a-Ás conta uma Ás-a-Ás nesta tabela, não três canastras.
Também estão registrados separadamente a categoria ao terminar a partida,
todas as categorias visitadas e cada evolução com seu bônus incremental.

### Médias por partida, sistema atual, 100 partidas completas por chefe

| Chefe | Sujas | Limpas | Reais | Ás-a-Ás |
| --- | ---: | ---: | ---: | ---: |
| Banqueiro | 1,26 | 2,02 | 0,12 | 0,06 |
| Dominadora | 3,97 | 2,29 | 0,33 | 0,19 |
| Matriarca | 3,28 | 1,60 | 0,11 | 0,06 |
| Nehelenia | 0,65 | 0,75 | 0,03 | 0,06 |
| Nemesis | 4,26 | 3,05 | 0,44 | 0,23 |
| Dimitrescu | 3,69 | 2,66 | 0,21 | 0,15 |

### Mediana e máximo por partida

Cada célula mostra **mediana / máximo**; não é intervalo de confiança.

| Chefe | Sujas | Limpas | Reais | Ás-a-Ás |
| --- | ---: | ---: | ---: | ---: |
| Banqueiro | 1 / 5 | 2 / 6 | 0 / 2 | 0 / 1 |
| Dominadora | 4 / 7 | 2 / 5 | 0 / 3 | 0 / 2 |
| Matriarca | 3 / 7 | 1 / 5 | 0 / 2 | 0 / 2 |
| Nehelenia | 0 / 4 | 0 / 5 | 0 / 1 | 0 / 3 |
| Nemesis | 4 / 7 | 3 / 8 | 0 / 3 | 0 / 2 |
| Dimitrescu | 4 / 8 | 3 / 6 | 0 / 2 | 0 / 2 |

### Distribuição de partidas por quantidade de Ás-a-Ás

| Chefe | Zero | Uma | Duas | Mais de duas |
| --- | ---: | ---: | ---: | ---: |
| Banqueiro | 94 | 6 | 0 | 0 |
| Dominadora | 82 | 17 | 1 | 0 |
| Matriarca | 95 | 4 | 1 | 0 |
| Nehelenia | 96 | 3 | 0 | 1 |
| Nemesis | 80 | 17 | 3 | 0 |
| Dimitrescu | 88 | 9 | 3 | 0 |

Todos os histogramas, inclusive Sujas/Limpas/Reais, estão em `cohort.json`,
em `cohorts.<chefe>.current.highestCounts.<categoria>.histogram`.

## 4. Dano adicional: projeção aritmética versus novas batalhas

“Extra nominal” reaplica os novos bônus às canastras da trajetória antiga:
`20 × Limpas + 200 × Reais + 550 × Ás-a-Ás`, sem repetir evoluções.
Não inclui multiplicadores, proteções, cura ou alteração de escolhas.

As duas últimas colunas são diferenças entre **novas partidas reais pareadas**,
com HP atual. “Dano na vida principal” inclui a transmissão da Adaga, mas não
subtrai cura; não é redução líquida de HP. As médias podem divergir porque a
nova partida não termina com os mesmos jogos, ataques, fases ou turnos.

| Chefe | Extra nominal na trajetória antiga | Extra observado nos bônus | Extra observado na vida principal |
| --- | ---: | ---: | ---: |
| Banqueiro | 97,40 | 95,40 | 90,95 |
| Dominadora | 216,30 | 196,30 | 174,70 |
| Matriarca | 87,00 | 101,00 | 85,72 |
| Nehelenia | 54,00 | 31,00 | 27,35 |
| Nemesis | 275,50 | 250,50 | 236,25 |
| Dimitrescu | 177,70 | 177,70 | 147,26 |

### Dano e recuperação médios na referência atual

| Chefe | Cartas | Bônus | Absorvido | Excesso perdido | Cura/restauração do chefe |
| --- | ---: | ---: | ---: | ---: | ---: |
| Banqueiro | 457,30 | 552,60 | 0 | 0,35 | 0 |
| Dominadora | 725,15 | 990,70 | 0 | 0 | 360,00 |
| Matriarca | 587,55 | 676,00 | 12,05 | 0,60 | 296,26 |
| Nehelenia | 298,80 | 236,00 | 0 | 0,80 | 0 |
| Nemesis | 848,00 | 1.210,50 | 0 | 160,90 | 116,10 |
| Dimitrescu | 754,55 | 978,30 | 110,90 | 106,02 | 751,31 |

- Dominadora: 185,85 dos 360 representam dano restaurado pela Posse; essa
  restauração não é regeneração. Reaplicação após romper a Posse é outra métrica.
- Matriarca: Renascimento separado, média 6 HP por partida (duas ativações de 300).
- Nemesis: 458,80 de ataques efetivos aos zumbis e 46,85 de cura dos auxiliares,
  além dos 116,10 recuperados pelo chefe. Ataque no zumbi não transborda para Nemesis.
- Dimitrescu: ataques nas filhas 664,92; transferência à Lady 282,70; impacto de
  itens 157,15; hemorragia 168,46; regeneração das filhas 314,72. Média 7,51 itens
  usados. Petrificação e redução de proteção não foram rotuladas como dano de cartas.
- Excesso perdido é dano calculado além do que o alvo podia receber, após
  proteções/multiplicadores. Dano corretamente absorvido não é contado novamente
  como excesso. Cartas nunca baixadas não são inventadas como dano desperdiçado.

## 5. Resultado e duração das batalhas

Duração expressa em turnos individuais e rodadas do motor, não em minutos de
playtest humano. `wallMs` nos arquivos mede o tempo computacional de execução,
com espera cosmética removida e workers concorrentes.

| Chefe | HP restante médio, atual | Turnos médios | Rodadas médias | Fase final: F1 / F2 / F3 |
| --- | ---: | ---: | ---: | --- |
| Banqueiro | 1.636,45 | 44,52 | 22,95 | 0 / 55 / 45 |
| Dominadora | 1.157,50 | 69,02 | 35,01 | 0 / 3 / 97 |
| Matriarca | 1.051,36 | 51,41 | 26,62 | 0 / 38 / 62 |
| Nehelenia | 1.866,00 | 41,89 | 21,82 | 3 / 73 / 24 |
| Nemesis | 875,30 | 72,09 | 36,32 | 0 / 0 / 100 |
| Dimitrescu | 1.559,71 | 67,64 | 34,16 | 0 / 3 / 97 |

Motivos na referência:

- Banqueiro: 94 Dívida máxima, 3 ataque final insuficiente, 2 recursos esgotados,
  1 chefe derrotado; casos de Cofre não entram nestes 100.
- Dominadora: 46 ambos dominados, 53 recursos esgotados, 1 chefe derrotada.
- Matriarca: 96 dez Flores, 4 recursos esgotados.
- Nehelenia: 98 cinco Espelhos dos Sonhos, 2 chefe derrotada.
- Nemesis: 87 recursos esgotados, 8 Infecção máxima, 5 chefe derrotado.
- Dimitrescu: 83 recursos esgotados, 14 Sede máxima, 2 ataque final insuficiente,
  1 chefe derrotada.

Motivos, HP, turnos, fases e marcos de ambos os Mortos e Monte ≤30/≤20 estão
armazenados também para cada condição nova e para cada partida individual.

## 6. HPs recomendados para teste, não para produção

Faixas são hipóteses de ajuste fino, **não intervalos estatísticos nem todos os
valores já simulados**. O valor central de cada linha foi efetivamente simulado
em 100 partidas completas com o dano proposto.

| Chefe | HP atual | Média S / L / R / AA | Extra nominal | HP para testar | Faixa plausível |
| --- | ---: | --- | ---: | ---: | --- |
| Banqueiro | 2.650 | 1,26 / 2,02 / 0,12 / 0,06 | 97,40 | **2.750** | 2.650–2.900 |
| Dominadora | 2.600 | 3,97 / 2,29 / 0,33 / 0,19 | 216,30 | **2.900** | 2.800–3.100 |
| Matriarca | 2.000 | 3,28 / 1,60 / 0,11 / 0,06 | 87,00 | **2.400** | 2.200–2.400 |
| Nehelenia | 2.400 | 0,65 / 0,75 / 0,03 / 0,06 | 54,00 | **2.500** | 2.400–2.600 |
| Nemesis | 2.200 | 4,26 / 3,05 / 0,44 / 0,23 | 275,50 | **2.600** | 2.400–2.700 |
| Dimitrescu | 2.000 | 3,69 / 2,66 / 0,21 / 0,15 | 177,70 | **2.200** | 2.000–2.400 |

### Vitórias do BOT em 100 partidas completas pareadas

| Chefe | Atual | Proposto, HP atual | Proposto, HP recomendado |
| --- | ---: | ---: | ---: |
| Banqueiro | 1 | 7 | 4 |
| Dominadora | 1 | 17 | 7 |
| Matriarca | 0 | 5 | 1 |
| Nehelenia | 2 | 3 | 3 |
| Nemesis | 5 | 28 | 10 |
| Dimitrescu | 1 | 11 | 9 |

Sensibilidades adicionais: Nemesis 2.500 teve 13 vitórias/100; Matriarca 2.300
teve 2/100. Esses cenários estão no resumo geral, fora da seleção recomendada.

Justificativas:

- **Banqueiro:** ganho efetivo médio de cerca de 91 HP; 2.750 compensou quase
  todo esse ganho na média. A Dívida, não a vida, encerrou a maior parte das lutas.
  Os casos interrompidos e a censura reduzem a confiança na recomendação.
- **Dominadora:** 2.900 reduziu o salto de 17 para 7 vitórias; ordens, Posse,
  Interdito e Dominação continuam importantes. Ainda está acima da referência
  de 1 vitória: 2.900 não prova dificuldade idêntica. Extremo superior da faixa
  deve ser considerado somente após observar humanos, não para forçar 1% de vitórias.
- **Matriarca:** 2.400 reduziu 5 para 1 vitória; preserva dez Flores, curas e
  Renascimento. Também fica acima dos 2.250 de duas Ás-a-Ás naturais completas,
  inclusive dos 2.350 se somado um ataque final de 100. Não é uma afirmação de
  que esse HP seja necessário por causa do ganho médio, que foi pequeno.
- **Nehelenia:** ganho efetivo médio de apenas 27,35; 2.800, sugerido antes sem
  simulação, não é sustentado pela amostra. 2.500 é um ajuste conservador; a
  derrota por Espelhos é o principal limitador do BOT.
- **Nemesis:** 2.600 amortizou 28 para 10 vitórias; 2.500 teve 13. Desvio de dano
  aos zumbis, excesso perdido, Reanimação e cura do Devorador impedem aplicar
  diretamente os 275,50 extras nominais ao HP principal.
- **Dimitrescu:** 2.200 compensa aproximadamente os 147,26 extras na vida
  principal; preserva proteção inicial de 1.500 e filhas de 500. Ainda teve
  9 vitórias contra 1 na referência: é a recomendação menos fechada em termos
  de dificuldade. A melhora das rotas/curas importa mais que um multiplicador de HP.

### Critérios estratégicos que a amostra NÃO homologou

1. **Duas Ás-a-Ás não garantirem vitória:** nas coortes propostas, as poucas
   partidas que chegaram a duas ou mais venceram. Elas também tinham outros
   jogos/cartas; isso não isola o efeito das duas canastras. Não foi demonstrada
   uma taxa de sucesso/fracasso estável nesse subconjunto. Os HPs centrais ficam
   acima do dano bruto de duas Ás-a-Ás, com a exceção da Lady, cuja proteção
   inicial eleva a barreira direta a 3.700. Isso não substitui playtest.
2. **Vitória sem Ás-a-Ás em todos os chefes:** com HP recomendado, houve vitórias
   sem Ás-a-Ás no Banqueiro (1), Nehelenia (1) e Nemesis (2). Não houve na
   Dominadora, Matriarca ou Dimitrescu. Isso não prova impossibilidade para
   humanos, mas também não permite afirmar que o requisito já foi validado.
3. **Preservar dificuldade aproximadamente:** o pacote candidato reduz o salto,
   mas sobretudo Dominadora e Dimitrescu ainda ganharam vitórias no BOT.
   Não declarar equivalência nem selecionar HP para reproduzir artificialmente
   um índice de vitória de um agente limitado.

## 7. Exemplos pareados verificáveis

| Chefe / semente | Atual | Proposto / HP atual | Proposto / HP candidato |
| --- | --- | --- | --- |
| Dominadora / 120004 | Recursos, 73 turnos, 990 HP, 0 AA | Vitória, 57 turnos, 0 HP, 1 AA | HP 2.900: recursos, 73 turnos, 870 HP, 0 AA |
| Nemesis / 120003 | Recursos, 74 turnos, 770 HP, 1 AA | Vitória, 67 turnos, 0 HP, 1 AA | HP 2.600: recursos, 74 turnos, 580 HP, 1 AA |
| Dimitrescu / 120000 | Recursos, 69 turnos, 951 HP, 1 AA | Vitória, 53 turnos, 0 HP, 1 AA | HP 2.200: vitória, 61 turnos, 0 HP, 1 AA |

Na Dimitrescu 120000, a cura da Lady mudou de 735 para 228. Esse exemplo
demonstra por que somar 590 extras à luta antiga não descreve a luta nova:
ela tem duração e oportunidades de cura diferentes.

## 8. Outras limitações do BOT

- Não há planejamento humano de longo prazo de naipes e Ás-a-Ás. A execução
  preservou seus limites e heurísticas atuais; não foi usado um BOT melhorado.
- As mãos ocultas continuam ocultas nas projeções canônicas. O adaptador não
  fornece faces do Monte ou dos Mortos para escolher ações.
- Nas ilusões de memória, o BOT usa a mesma política do app, que modela acompanhar
  a imagem correta. No Espelho do Lixo mantém a escolha deliberada 50/50.
- O planner `classifyBossMeldKind()` pode chamar de Ás-a-Ás uma sequência de 14
  cartas com substituição de coringa, enquanto a classificação real do app
  corretamente chama de Suja. Há divergências finais em 1/3/3/0/5/6 partidas de
  referência, respectivamente Banqueiro/Dominadora/Matriarca/Nehelenia/Nemesis/Lady.
  Essa limitação pode distorcer decisões. Os números deste relatório usam a
  categoria real do app e os eventos efetivamente concedidos, não o palpite do
  planner. Nenhuma correção de produção foi feita.
- O BOT não ativa o Especial da equipe. Humanos têm essa rota adicional de
  cinco cartas do topo do Lixo, sob os bloqueios e efeitos existentes.
- Não são duas contas Firebase ou tablets físicos. Nenhum resultado aqui é
  apresentado como taxa de vitória humana, nem como previsão de minutos de partida.

## 9. Evidências e reprodução

Na pasta `metrics/canastra-hp-2026-10-12/`:

- `cohort.json`: coortes principais, sementes, média/mediana/extremos/histogramas,
  motivos, dano e comparações pareadas.
- `cohort.csv`: tabela central para leitura em planilha.
- `cohort-metrics.jsonl`: métricas das 1.800 partidas das três coortes principais.
- `summary.json`, `summary.csv`, `battles.csv`: todas as condições e tentativas,
  inclusive sensibilidades e interrupções, sem esconder casos desfavoráveis.
- `*.jsonl.gz` e subpastas: logs completos, com ações reais, eventos, ataques,
  evoluções, marcos e erros de cada semente. Compressão sem perdas dos eventos.
- `archives.json`: índice, tamanhos e SHA-256 dos arquivos comprimidos.
- `manifest.json` e `completion.json` de cada lote: comando, versão Node,
  revisão, hashes da produção e verificação de nenhuma alteração de produção.

Reprodução com Node 24, em uma pasta de saída NOVA para não substituir evidências:

```bash
node scripts/canastra-hp-experiment.mjs --count=100 --start=120000 --scenarios=current,proposed --workers=6 --batch=10 --output=.cache/canastra-hp-reproduction
node scripts/canastra-hp-summary.mjs .cache/canastra-hp-reproduction
node --test tests/canastra-hp-experiment.test.mjs
```

Os comandos exatos dos suplementos/HPs estão nos sete manifests. Copiar seus
argumentos de sistema, HP, etiqueta e sementes, trocando apenas o destino da saída.
Para reconstruir a coorte, reunir os lotes em uma pasta raiz com subpastas e usar:

```bash
node scripts/canastra-hp-cohort.mjs CAMINHO_DA_PASTA_RAIZ
node scripts/canastra-hp-pack.mjs CAMINHO_DA_PASTA_RAIZ
```

O empacotador valida o round-trip gzip e substitui somente os seus logs gerados
por versões comprimidas recuperáveis. Ele não toca em assets ou arquivos de produção.

## 10. Validação e arquivos novos

- Oito testes focados aprovados: determinismo, reprodução da trajetória arquivada,
  tabelas incrementais, grafo
  experimental isolado, persistência do HP na normalização, itens reais,
  conservação física, censura e coortes de 100 por chefe/condição.
- Conservação de 108 IDs físicos únicos e legalidade dos jogos verificadas em
  cada commit local e ao finalizar cada turno, inclusive Cofre e cartas sacrificadas.
- As 2.240 tentativas reconciliam: dano na vida principal + Adaga − cura/restauração
  − Renascimento = HP inicial − HP final. Projeções do planner não entram na coleta.
- Hashes dos arquivos de produção permaneceram iguais em todos os lotes.
- `git diff --check` aprovado. Não houve alteração de arquivo rastreado de produção.

Novos: este relatório, pasta de métricas, seis scripts `canastra-hp-*.mjs` e
`tests/canastra-hp-experiment.test.mjs`. Nenhum dano, HP, regra, imagem, áudio ou
layout de produção foi alterado. Sem commit, push ou deploy.
