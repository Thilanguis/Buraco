# Revisão dos textos dos chefes — 09/10/2026

Revisão editorial do guia de habilidades, painel laranja e ajudas. Sem mudanças de regras, números, pesos, BOT ou balanceamento. Alterações anteriores no staging foram preservadas.

## Cobertura

Foram conferidas as 62 habilidades do catálogo local, incluindo Renascimento. O teste `boss-player-language.test.mjs` percorre as 136 combinações de habilidade e fase disponíveis, exige ajuda e instrução, procura abreviações técnicas e verifica que consultar a apresentação não altera o estado.

| Chefe | Habilidades conferidas |
| --- | --- |
| Banqueiro | Juros Fixos; Tarifa de Manutenção; Bloqueio de Crédito; Auditoria de Naipe; Penhora; Juros Compostos; Limite de Crédito; Ágio do Lixo |
| Dominadora | Coleira; Escolha Forçada; Exposição; Troca Forçada; Mãos Atadas; Posse; Etiqueta de Ferro; Favorita; Dupla Coleira; Separação; Controle Absoluto; Quebra de Vontade; Ordem Final |
| Matriarca | Semente Viva; Raiz Faminta; Orvalho Restaurador; Trepadeiras Gêmeas; Enxerto; Pólen do Lixo; Colheita; Florescimento Real; Casulo Esmeralda; Coroa da Primavera; Renascimento |
| Dimitrescu | Tributo de Sangue; Vinho Carmesim; Marca Carmesim; Banquete dos Mortos; Coágulo Carmesim; Portas do Castelo; As Três Filhas; Sangue Impuro |
| Nehelenia | Jogo Espelhado; Siga o Reflexo; Espelho do Lixo; Prisão no Espelho; Pesadelo Eterno; Laço do Tigre; Presa Marcada; Olho do Falcão; Vigilância; Mão no Espelho; Reflexo Invertido |
| Nemesis | Invasão da Horda; Caçada S.T.A.R.S.; Tentáculo Infeccioso; Zona Contaminada; Comando da Horda; Lança-Foguetes; Regeneração Parasita; Reanimação Viral; Barragem de Tentáculos; Extermínio S.T.A.R.S.; Surto Ômega |

Textos já claros foram mantidos. Foram revisadas também as ajudas de itens/debuffs das filhas, passivas dos zumbis, progressão de fase e mensagens antigas ainda apresentáveis.

## Correções principais

- Renascimento ganhou instrução e ajuda próprias. Uma descrição técnica salva anteriormente não reaparece como instrução no painel. O teste de HUD deixou de excluir essa habilidade.
- O guia de Enxerto deixou de afirmar incorretamente que a falha parcial sempre dá uma Flor. A ajuda continua respeitando a regra de partidas antigas já anunciadas.
- Removidas expressões de implementação, como `tier`, `créditos excedentes`, condições comprimidas e explicações de seleção interna, nas ajudas revisadas.
- Custos, prazos e exceções relevantes foram preservados, mas descritos como ações e consequências para o jogador.

## Validação visual

O teste de navegador usa o renderer e popover reais extraídos da aplicação, em uma página de teste local. Verifica desktop (1920 px), tablet (1376 px) e celular (390 px), com exemplos dos seis chefes e Renascimento, toque, fechamento por Escape, limites do popover e ausência de erro de JavaScript. Não representa uma partida completa manual em cada dispositivo.
