# Nemesis — implementação e validação

## Medidores de objetivos

Lança-Foguetes cobra por **carta nova** adicionada à Zona de Impacto: +10 Infecção na fase 2 e +12 na fase 3. Três cartas juntas custam +30/+36, igual a três jogadas separadas. Cartas já contabilizadas/reorganizadas não cobram novamente. O teto de Infecção e a derrota imediata permanecem; a cobrança de uma jogada é um único evento/SFX.

Zona Contaminada marca o Lixo com contorno laranja, selo CONTAMINADO e custo +6 Infecção por retirada durante o turno do alvo. O destaque é removido fora desse turno ou ao encerrar a partida. Zona de Impacto é independente: marca somente o jogo do lança-foguetes enquanto o efeito ainda não expirou.

O painel reutiliza o medidor de faixas dos outros chefes somente no Extermínio S.T.A.R.S.: 0/1/2 exigências cumpridas projetam +16/+8/+0 Infecção base. Uma única barra mostra as três faixas; indicadores compactos identificam contribuição e saída da segunda carta separadamente. Infectado/Ômega podem acrescentar bônus às falhas. Invasão, Caçada e Tentáculos mantêm contadores/estado do objetivo, sem barras binárias desnecessárias. Nenhuma regra ou punição foi alterada.

## Medidores de objetivos

O painel da habilidade reutiliza a barra compartilhada dos chefes, preenchida pelo progresso real salvo no estado: Invasão da Horda conta 1 saída legal (Agarrador), 2 cartas contribuídas pela equipe (Infectado) ou 2 jogos diferentes alimentados (Devorador). Caçada S.T.A.R.S. conta 1 contribuição; Tentáculo Infeccioso e Rajada de Tentáculos contam respectivamente 1 e 2 saídas legais. Extermínio S.T.A.R.S. mostra duas barras independentes: contribuição e saída da segunda carta marcada. Efeitos imediatos, passivas e custos não são objetivos de preenchimento. Nenhuma regra ou punição foi alterada.

Revisão de 05/10/2026 sobre a implementação já existente. A base local foi comparada com os arquivos oficiais do Google Drive antes dos patches. Não foi reconstruída a batalha a partir do prompt antigo. O nome exibido, o relatório e o retrato usam somente **Nemesis**, sem sufixos de versão.

## 1. Arquivos desta revisão

- `js/boss/boss-combat.js`: lifecycle opcional na primitiva genérica.
- `js/boss/bosses/nemesis.js`: Invasão, metadata do Laboratório, retrato e títulos por causa.
- `js/boss/mechanics/nemesis.js`: entrada, planos legais/cooperativos, passivas, quotas, BOT e fixtures.
- `js/boss/presentation/nemesis.js`: objetivo, progresso e ajuda da Invasão.
- `js/boss/ui/nemesis-ui.js`: cards contextuais, ajuda e alvos integrados.
- `js/boss/boss-engine.js`: hook genérico de anúncio, duração por payload, alvo válido e títulos por motivo.
- `js/boss/boss-debug-scenarios.js`: variantes/targets por metadata, solução cooperativa pelo motor real, fallback e rótulo do recurso.
- `app.js`: renderer genérico dos cards, seleção, ajuda e animação por evento.
- `styles/boss/nemesis.css`: estados dos cards, retirada, reforço e redução de movimento.
- `index.html`: opção Nemesis sem sufixo.
- `service-worker.js`: caminho do retrato renomeado; cache `buraco-v272` preservado.
- `assets/images/boss-nemesis.png`: renomeação do retrato existente, bytes preservados.
- `tests/nemesis-boss.test.mjs`: adaptação dos 45 testes anteriores e regressões adicionais.
- `tests/nemesis-ui.browser.mjs`: renderer real, lifecycle, alvo no card e ajuda em cinco telas.
- `tests/boss-control-balance-v2.test.mjs`: somente expectativa obsoleta da Prisão no Espelho atualizada.
- `docs/DOCUMENTACAO_CHEFE_DA_MESA.md`, `docs/INVENTARIO_HABILIDADES_CHEFES.md` e este relatório `docs/NEMESIS_IMPLEMENTACAO.md`.

Os registros e a integração anterior do BOT permanecem. O ajuste final acrescenta somente apresentação/ajuda e SFX de ganho real de Infecção; nenhuma alteração de geometria de cartas, publicação ou regra funcional de outro chefe. As exclusões de assets legados e do áudio da Thayanne presentes na árvore de trabalho não pertencem a esta revisão.

## 2. Lifecycle final

Partida nova: Nemesis 2600 HP, Infecção 0/100, S.T.A.R.S. e três entidades **absent**, sem passiva nem espaço permanente no HUD.

- `absent`: ainda fora da mesa.
- `entering`: objetivo de entrada ativo; sem passiva e não atacável.
- `repelled`: objetivo cumprido; ameaça sai, pode tentar novamente, não é cadáver.
- `persistent`: objetivo falhou; HP máximo e passiva imediatamente ativos; atacável.
- `corpse`: persistente morto por dano; passiva desligada, possível alvo de Reanimação.

Somente persistentes vivos aplicam debuff. A falha da entrada não aumenta Infecção, inclusive sem bônus retroativo do Infectado. Não há alívio pela morte nem transbordamento de dano. Dano direto efetivo em Nemesis altera S.T.A.R.S.; dano em zumbi não.

Teto por fase: **1 / 2 / 3** persistentes vivos. Invasão e Reanimação respeitam o mesmo teto.

## 3. Migração dos saves antigos

A normalização opcional de lifecycle mantém entidades antigas vivas como `persistent` e antigas mortas como `corpse`, preservando HP, seleção, S.T.A.R.S., bônus, cargas e estado da batalha. Novos estados não são remigrados. O marcador numérico de schema é interno, não nome de chefe/versão pública.

Saves antigos com mais vivos que o teto da fase não perdem entidades silenciosamente: novas entradas/reanimações são bloqueadas até haver espaço. Reload, snapshot e undo transportam os campos no objeto `boss` existente.

## 4. Invasão da Horda

`horde_invasion`: fases 1/2/3, peso **4**; onze habilidades e soma dos pesos **39**. A seleção seeded usa apenas ausentes/repelidos com plano legal. Evita o último repelido imediatamente quando outro candidato real existe.

- **Agarrador:** marca carta com saída legal por jogo ou descarte no turno do alvo. Não marca descarte final proibido por falta de Morto/canastra. Falha: 350 HP.
- **Infectado:** equipe contribui duas cartas válidas para jogos durante a rodada. O plano pode ser individual ou cooperativo. Falha: 300 HP.
- **Devorador:** equipe alimenta dois jogos existentes diferentes na rodada. Plano conjunto, sem usar a mesma carta duas vezes nem contar jogo novo. Falha: 400 HP.

O planejamento considera jogadores que ainda podem agir e a ordem real da rodada. Não escolhe objetivo que só funcionaria invertendo turnos. Sucesso repele; falha só estabelece o zumbi. Em F3, novas persistências já entram Mutadas.

## 5. Comando, passivas e recuperação

Comando da Horda continua separado da Invasão: não traz zumbis, exige persistente vivo e reforça sua passiva até o fim da rodada seguinte.

| Zumbi | Normal | Mutado | Reforço |
|---|---|---|---|
| Agarrador | Prende 1 carta do Lixo para jogo, não descarte | 2 cartas | +1 carta |
| Infectado | +2 Infecção em falha positiva real | +4 | +2 |
| Devorador | Cura Nemesis 40 HP na primeira contribuição de 3+ cartas no mesmo jogo por turno | 70 HP | +30 HP |

Os valores completos normais/Mutados/reforçados aparecem na ajuda. Regeneração só cura persistente ferido. Reanimação só revive cadáver com 50% HP, uma vez por fase e com espaço no teto; em F3 retorna Mutado. A entrada da F3 muta todos os persistentes vivos.

BOT executa planos legais para impedir entradas, respeita guard de batida segura e seleciona apenas persistentes vivos; mantém avaliação de Infecção/letalidade/cura, sem simplificação para menor HP.

## 6. Artes conectadas

Encontrados/usados:
- `assets/images/boss-nemesis.png`: retrato existente, apenas renomeado.
- `assets/images/nemesis-infection-meter-frame.png`: moldura de Infecção existente, preservada.

As três artes foram enviadas pelo usuário e conectadas às respectivas entidades:
- `assets/images/nemesis-agarrador.png`;
- `assets/images/nemesis-infectado.png`;
- `assets/images/nemesis-devorador.png`.

Os arquivos foram copiados sem alterar seus bytes. Os cards reutilizam `boss-daughter-card` e `boss-daughter-state` dos ajudantes aprovados, com arte panorâmica 8:3 full-bleed (`object-fit: cover`), nome integrado e sem áreas vazias. Em telas estreitas o recorte natural protege a altura mínima dos controles, sem distorcer o arquivo. Todos os retratos estão no precache. Nenhuma imagem foi fabricada ou substituída.

## 7. HUD e Laboratório

Cards entram apenas quando relevantes, em faixa própria abaixo do HUD principal, como Filhas/Capangas, sem aumentar sua altura. `entering` mostra o chip INVADINDO; o objetivo continua no painel de Invasão da Horda. Persistente mostra nome, HP/barra e chips compactos ATIVO, MUTADO e REFORÇADO; cadáver mostra CADÁVER. O próprio card seleciona alvo e mantém destaque. O alvo atual e o botão ↩ para voltar ao Nemesis ficam na própria arte principal, sem linha abaixo dos zumbis. O `?` de 17px fica dentro do card e abre o popover oficial compartilhado junto ao botão clicado, com ponteiro, explicando passiva normal, Mutado e Comando da Horda em blocos curtos.

S.T.A.R.S. aparece como overlay discreto à direita da arte principal, sem linha estrutural extra. Sua ajuda usa o mesmo popover oficial e explica prioridade ofensiva, troca após dano direto ao Nemesis e ausência de troca por dano aos zumbis. Sua lógica não foi alterada.

Horda/Ômega e duração ficam no painel amarelo, sem faixa de texto acima dos zumbis. Zona de Impacto usa moldura compartilhada apenas em `.meld-line-cards`; Canastra/Limpa e contribuição ficam fora, como nos demais efeitos de chefes. Nenhuma regra de alvo, dano, prazo ou lifecycle mudou.

SFX: `assets/sfx/ganho-infeccao-nemesis.mp3`, original fornecido preservado e incluído no precache/registro central `BOSS_SFX`. O adaptador de apresentação identifica eventos `infection` e `nemesisObjective` apenas com `amount > 0` efetivamente aplicado. Objetivos registram o delta já calculado; resultados posteriores não repetem o som. O sincronizador existente deduplica `actionId` inclusive no mesmo lote, marca eventos iniciais/reload sem tocar e não repete Firebase/rerender/undo. Infectado/Horda/Ômega continuam no único cálculo central, sem reprodução na função de estado. Redução e +0 ficam silenciosos.

Repelido tem retirada breve e desaparece. Cadáver é discreto, identificado e sem barra/debuff ativo. Animações pontuais por evento não repetem em reload/rerender; respeitam `prefers-reduced-motion` e telas touch. Sem cinematografia ou efeito contínuo pesado.

Laboratório usa o motor real: três entradas, sucesso/falha, reentrada, proteção contra repetição, teto da fase selecionada, persistente/cadáver, BOT, reload/undo, Comando sem alvo, buff real, Reanimação e Regeneração. Cenários especiais fixam seu alvo apropriado por metadata, evitando combinações incompatíveis com um zumbi escolhido antes. Recurso do Nemesis mostra Infecção, não Dívida.

## 8. Auditoria e testes

- Títulos por causa: `max_infection` → **Infecção Total**; ataque final insuficiente → **Nemesis sobreviveu**; exaustão → **Recursos esgotados**.
- Zona Contaminada exige plano real de retirada do Lixo Fechado, validador oficial, bloqueios e condições de Morto/batida; lixo não vazio sozinho não basta.
- Só o teste obsoleto da Nehelenia mudou: Prisão no Espelho permanece peso 2/fases 1/2/3, elegível com resgate real, sucesso sem penalidade e falha +8/+10/+12. Sua regra não foi alterada.

Cobertura adicional: lifecycle completo, entrada sem passiva/dano, success/failure sem Infecção extra, migração idempotente, quotas/caps, reentrada, não repetição, mutação, offboard inativo, planos cooperativos/ordem e cartas não duplicadas, BOT realmente jogando/descartando, persistência, ajuda/seleção no card, títulos e Zona.

## 9. Resultado de validação

- Nemesis: **72/72 passaram**, incluindo ações reais do BOT para as três entradas e três regressões de SFX/delta/deduplicação.
- Ajuste final: apresentação/mecânicas/arquitetura de isolamento relacionados **50/50 passaram**; junto ao Nemesis, **122/122**. A validação anterior de Nehelenia/balanceamento/apresentação/isolamento passou **66/66**.
- Browser: renderer real passou em **1920×1080, 1024×768, 844×390, 390×844 e 3840×2160**; ajuda oficial de zumbis/S.T.A.R.S., alvo no card, permissões, estabilidade de DOM, retirada/redução de movimento e cadáver sem barra. Artes reais carregadas, correspondência por entidade, full-bleed e ajuda completamente dentro do card verificados. Fixture local sem Firebase autenticado.
- Sintaxe: **12 JS/MJS desta revisão** passaram em `node --check`; `git diff --check` passou.
- Suíte ampla possível, excluindo somente o arquivo bloqueado descrito abaixo: **528 testes, 477 passaram, 51 falharam**.
- Baseline imediatamente anterior: **504 testes, 452 passaram, 52 falharam**. Nenhum nome de falha adicional; a única falha removida é o teste obsoleto da Prisão no Espelho atualizado com a regra aprovada.
- Validação anterior do lifecycle no Drive: **18 arquivos** foram relidos pelo conector e seus hashes SHA-256 coincidiram com os locais; a cópia de readback passou **69/69 testes e o browser nos cinco viewports**. As renomeações foram verificadas. Antes do ajuste visual/SFX final, `js/boss/mechanics/nemesis.js` foi novamente relido do link fornecido e coincidiu com a base local, normalizando apenas quebras de linha.

O arquivo antigo `tests/boss-debug-scenarios.test.mjs` foi tentado separadamente e voltou a ficar preso depois do teste da Ordem Final. Foi encerrado após **30 segundos** com processo isolado, sem alterar regras para fazê-lo terminar. O runner principal não o inclui; esta limitação não é omitida.

Comparação anterior à revisão: 504 testes, 452 passaram, 52 falharam. As falhas pré-existentes incluem expectativas antigas de balanceamento/visual, fixtures VM incompletas, importações antigas, amigas da Dominação e SW. A suíte inteira não será declarada verde enquanto permanecerem.

## 10. Teste manual e riscos restantes

- Ajuste visual/SFX final: 72/72 testes do Nemesis e browser nos cinco viewports passaram; cards full-bleed, chips/ajuda oficiais, S.T.A.R.S. integrado e ganho de Infecção deduplicado. Originais de imagem/MP3 preservados, sem mudança de mecânica.
- Partida completa humano/humano em dois clientes reais: transporte Firebase ao vivo, reload no turno do parceiro, morte/reanimação e alvo.
- Partida completa humano/BOT em todas as fases para avaliar balanceamento; ações específicas passaram, não se promete IA perfeita.
- Mesa densa no fim da partida em tablet landscape: teste browser atual valida HUD, não toda a densidade de jogos/cartas.
- Um plano legal no anúncio pode deixar de funcionar se os jogadores consumirem as cartas/alterarem a mesa depois. Não há troca silenciosa de exigência.
- O comprovador de Zona é conservador: pode deixar de escolher a habilidade em extensões muito longas que exigem mais cartas simultâneas que o planejador examina. Nunca é autorizado retirar o Lixo fora das regras oficiais.
- Ataque final direcionado a zumbi pode perder a batalha; mantém aviso, sem overflow.
- Deploy/cache não foram publicados nem alterados nesta rodada.
