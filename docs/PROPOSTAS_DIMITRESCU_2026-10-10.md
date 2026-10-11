# Duas propostas para a Lady — aguardando aprovação

Não implementadas, não adicionadas ao catálogo nem ao sorteio. Números abaixo são **candidatos de teste**, não mudanças de produção. O pacote B e as oito habilidades atuais permanecem.

## 1. Bifurcação Carmesim — escolha estratégica

**Tema:** escolher enfrentar a matriarca no salão principal ou avançar pela ala das filhas. Fases 2–3; peso-base candidato 3. Anúncio antes dos dois turnos da equipe, escolha compartilhada única e persistida.

**Elegibilidade:** Lady viva, ao menos uma filha viva e PROT. restante positiva. As duas rotas precisam ter alvo real; nenhuma carta específica é marcada. Não exigir uma jogada pronta na mão para anunciar. Não anunciar no meio de uma rodada, quando um dos jogadores já perdeu sua oportunidade de contribuir.

**Escolha e objetivo, até o fim da rodada:**

| Rota | Objetivo candidato | Sucesso | Parcial | Falha |
| --- | --- | --- | --- | --- |
| Salão principal | Causar 80 de dano direto efetivo à Lady, incluindo dano consumido pela PROT./Coágulo | 80 ou mais: sem punição | 40–79: +3 Sede na fase 2, +4 na 3 | 0–39: +6/+8 Sede |
| Ala das filhas | Causar 120 de dano efetivo às filhas | 120 ou mais: sem punição | 60–119: +3/+4 Sede | 0–59: +6/+8 Sede |

Contar ataques legais e o impacto imediato de itens. Não contar cura revertida, ticks passivos de hemorragia, remoção de PROT. por morte ou dano retransmitido pela Adaga uma segunda vez. O teto do alvo limita dano efetivo. A morte de todas as filhas após escolher a ala encerra o objetivo com sucesso, mesmo quando tinham menos de 120 HP disponíveis: não exigir dano em um alvo morto.

**Interações:** pipeline atual Coágulo → PROT. → HP; matar filha mantém remoção de PROT. e Fúria atuais. Adaga continua funcionando, mas não duplica o progresso. Sede da falha é uma fonte própria, sem substituir Tributo, Fúria ou passivas. Frio, Anti, Relíquia e hemorragia não são alterados. Especial continua voluntário, com as regras compartilhadas.

**HUD:** `Bifurcação Carmesim`, linha `Rota: Ala das filhas`, barra `Dano 60/120`, linha `Prazo: fim da rodada`, consequência em outra linha. Ajuda: “Escolham atacar a Lady ou as filhas. Os dois podem ajudar. Cumprir o dano escolhido evita a Sede extra.” Mostrar os dois objetivos e consequências no diálogo de escolha; não ocultar o custo antes da decisão. Nome distinto da habilidade existente `Portas do Castelo`, que bloqueia o Lixo.

**Áudio/animação:** reutilizar destaque curto da área de alvo; nenhuma arte externa, fala nova ou efeito pesado obrigatório.

**Testes previstos:** escolha concorrente atômica; dois jogadores no mesmo progresso; ataque à PROT., Coágulo e HP; dano limitado ao HP restante; impacto/tick distintos; Adaga sem crédito duplicado; mortes; undo/reload; prazo; sucesso/parcial/falha; nenhuma cobrança duplicada; tela pequena e teclado.

**Impacto previsto:** cria tensão entre remover uma filha e atravessar a proteção, sem premiar dano gratuito ou repetir uma carta marcada. Pode favorecer ataques preparados: comparar sementes e manter a habilidade fora da rotação até medir Sede por rodada e tempo de morte da última filha. Peso 3 não está aprovado.

## 2. Salão das Duas Sombras — cooperação

**Tema:** a Lady tenta separar a equipe; a resposta exige que os dois participem da mesa. Fases 2–3; peso-base candidato 2.

**Elegibilidade:** dois cooperadores com pelo menos uma carta não bloqueada para jogar, ambos ainda com um turno completo nesta rodada e mesa que permita criar ou ampliar jogos. Validar alvos e bloqueios reais, sem exigir prova de uma combinação pronta. Sem jogador disponível, não anunciar nem punir artificialmente.

**Objetivo:** cada jogador deve contribuir ao menos uma carta da própria mão em uma jogada legal, até o fim da rodada. Pode ser criação ou extensão, no mesmo jogo ou em jogos diferentes. Não contar apenas comprar, descartar, sacrificar um item, trocar uma carta de controle, reorganizar ou o topo obrigatório vindo do Lixo. Contribuições adicionais da mão na retirada do Lixo contam normalmente.

- Sucesso: os dois contribuíram — sem Sede extra.
- Parcial: somente um contribuiu — +3 Sede na fase 2 / +4 na fase 3.
- Falha: nenhum contribuiu — +6 / +8 Sede.

Não reduzir Sede acumulada por outros efeitos; não adicionar recompensa de dano, cura ou PROT. A contribuição é por ID físico e autor, não por render ou tamanho final do jogo. BOT pode cumprir o objetivo pelas jogadas normais, mas não recebe permissão para gastar o Especial automaticamente.

**Interações:** filhas mantêm suas passivas e podem criar pressão paralela; Relíquia não silencia esta habilidade da Lady. Itens, Fúria e Vínculo permanecem; dano da Adaga não substitui a contribuição do segundo jogador. Cartas recebidas pelo Especial são da mão, livres para contribuir depois, sem obrigação de jogar imediatamente.

**HUD:** `Salão das Duas Sombras`; uma linha por jogador: `Biel: falta contribuir` / `Luana: contribuiu`; prazo e consequência em linhas próprias. Ajuda: “Cada um precisa jogar uma carta em um jogo válido. Comprar ou descartar não conta. Os dois têm até o fim da rodada.” Sem rótulo ATUAL ou frase única dividida por pontos.

**Áudio/animação:** breve confirmação no nome de cada jogador, reutilizando feedback de contribuição; movimento reduzido mostra só o estado atualizado.

**Testes previstos:** novo jogo/extensão; autores diferentes; IDs duplicados; carta do Especial; origem mão versus topo do Lixo; sacrifício de item não conta; bloqueios; BOT/humano; final antecipado; escolha/prazo/undo/sync; nome longo; dois turnos completos garantidos.

**Impacto previsto:** pode aumentar Sede quando uma mão fica sem combinação mesmo com um parceiro forte. Deve substituir parte da frequência de pressão existente, não apenas adicionar mais punição por rodada. Primeiro testar peso 2 e consequências candidatas; não aprovar automaticamente pela temática.

## Aprovação necessária

Escolher aceitar, ajustar ou rejeitar cada proposta e seus números. Após aprovação: implementação, testes dirigidos e A/B ampliado. Nenhuma dessas propostas está “pronta em produção”.
