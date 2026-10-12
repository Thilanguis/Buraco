# Especial Cooperativo — apresentação visual (11/10/2026)

## Escopo

Somente apresentação cosmética após uma transação aceita. Custo, pontuação,
beneficiário, retirada das cinco cartas do Lixo e todas as reações dos chefes
permanecem inalterados. Inclui agora as seis PNGs e os seis MP3s fornecidos.
Sem commit, push ou deploy.

## Sequência e ajuste solicitado durante a validação

Configuração central: `js/boss/ui/cooperative-special-presentation.js`, constante
`SPECIAL_PRESENTATION`. Duração final: **3.000 ms**, aumentada após o feedback de
que a imagem estava pequena e a entrada/saída rápidas.

- Entrada pela direita: 750 ms, com fade discreto.
- Personagem parado: 1.500 ms. O easing é aplicado por trecho, não ao relógio
  inteiro, para preservar essa pausa.
- Cinco versos começam a voar aos 900 ms, do Lixo à mão local/remota.
  Cada voo dura 900 ms, com 75 ms entre cartas. A última chega aos 2.100 ms.
- Feedback discreto de chegada, sem mostrar faces ocultas.
- Saída para a direita: últimos 750 ms.

Os elementos têm posição fixa e `pointer-events: none`. Não deslocam cartas,
HUD ou controles. As seis imagens usam o mesmo quadro de referência da Jill
(proporção 1200:1800), com `object-fit: contain` para preservar cada original.
A posição e o tamanho não dependem mais dos chips/auxiliares de cada chefe.
A faixa da apresentação mantém a mão, o Lixo, o Monte e os botões livres;
retratos e auxiliares podem ser sobrepostos brevemente pelo efeito cosmético. A entrada
e saída pela direita são recortadas à área segura; a PNG aparece inteira durante
a pausa, sem atravessar visualmente os textos e controles no percurso.
Em telas pequenas a personagem permanece menor que no desktop. Sem espaço
seguro, utiliza somente o voo das cartas.

## Assets originais

Mapeamento central: `js/boss/ui/cooperative-special-assets.js`, export
`SPECIAL_CHARACTER_ASSETS` (reexportado pelo módulo de apresentação).
Os arquivos fornecidos
foram copiados sem recorte, reprocessamento, compressão ou alteração de pixels;
SHA-256 foi comparado com os originais.

| Chefe | Personagem | Caminho no projeto | Resolução original |
| --- | --- | --- | --- |
| Dimitrescu | Ada Wong | `assets/images/special/ada-wong.png` | 1024 × 1536 |
| Nemesis | Jill Valentine | `assets/images/special/jill-valentine.png` | 1200 × 1800 |
| Nehelenia | Sailor Moon | `assets/images/special/sailor-moon.png` | 941 × 1672 |
| Banqueiro | PNG “17_29_15-1” | `assets/images/special/banker.png` | 1024 × 1536 |
| Dominadora | PNG “17_29_17-2” | `assets/images/special/dominadora.png` | 1024 × 1536 |
| Matriarca Esmeralda | PNG “17_29_19-3” | `assets/images/special/matriarca-esmeralda.png` | 1024 × 1536 |

Todos os seis chefes têm asset configurado. Imagem ausente, inválida,
carregamento acima de 400 ms ou falta de espaço seguro usam o voo das cinco
cartas como fallback, sem inventar outra imagem. As três PNGs novas são RGBA;
transparência, proporção, resolução e pixels foram preservados byte a byte.

## Sincronização e limpeza

- Ambos os clientes usam o ID confirmado em `resolvedActionIds`; abrir ajuda ou
  uma transação rejeitada não dispara apresentação.
- Histórico cosmético por partida/cliente, persistido em `sessionStorage` quando
  disponível. Snapshot inicial/reload é baseline, não reprodução de eventos.
- Snapshots repetidos, undo, reconexão e revisões antigas não repetem a ação.
- O cliente remoto aplica e renderiza o snapshot antes de iniciar o efeito.
  O autor também inicia sem aguardar imagem/slide. A liberação do action gate
  e a atualização real da mão não aguardam a animação.
- Undo, troca/saída de partida, substituição por outro evento, aba ocultada e
  resize cancelam nós/animações/timers. Respostas de imagens atrasadas não
  ressuscitam um efeito cancelado. Existe limpeza de segurança por prazo.
- `prefers-reduced-motion` dispensa movimentos, sem cancelar o Especial real.
- `onCue('entry')` inicia um único SFX no mesmo relógio da entrada do personagem;
  se a PNG falhar, inicia junto ao voo fallback. Chegada não toca outro MP3.
- Som por cliente/evento confirmado: ambos os cooperadores ouvem uma vez
  localmente; não há comando extra de áudio gravado/enviado pelo Firebase.
- O som é um clone do SFX, sem loop. O volume fixo 0,8 foi substituído pela calibração por arquivo em `js/audio-balance.js`; ver [áudio e padrão dos itens](AUDIO_E_ITENS_PADRAO_2026-10-11.md). A ordem de reprodução e as regras do Especial permanecem iguais.
  Mute geral silencia/interrompe; “música desligada” ainda permite esse SFX.
  O primeiro clique de desbloqueio de áudio não toca os clipes do Especial.
- PNG/voo mantêm os 3 segundos. Clipes maiores terminam naturalmente, mantendo
  somente um som cancelável depois da remoção do overlay, nunca bloqueando o jogo.
  Undo/saída/resize/aba oculta/novo evento também param esse trecho final.
- Falha de arquivo, decoder ou autoplay segue silenciosamente, sem retries de
  reprodução, erro de gameplay ou repetição posterior. Há prazo máximo de limpeza.
- Movimento reduzido mantém a política anterior: sem apresentação cosmética,
  inclusive sem áudio de entrada; as cinco cartas são concedidas normalmente.

## Arquivos de implementação

- `app.js`: disparo confirmado local/remoto e cancelamento de apresentação.
- `js/boss/ui/cooperative-special-assets.js`: pares PNG/MP3 dos seis chefes.
- `js/boss/ui/cooperative-special-audio.js`: cue único e vida útil do som.
- `js/audio.js`: fontes dos seis SFX; mute, clones canceláveis e limpeza.
- `js/boss/ui/cooperative-special-presentation.js`: tempos, geometria,
  sequência e deduplicação.
- `js/boss/ui/cooperative-special-ui.js`: mantém renderer e reexport compatível.
- `styles/boss-mode.css`: estilos exclusivos dos nós cosméticos.
- `service-worker.js`: cache local v309; não publicado.
- Três PNGs novas em `assets/images/special/` e seis MP3s em `assets/sfx/special/`.

## MP3s originais — integração final

| Chefe | Arquivo fornecido | Arquivo no projeto | Duração decodificada |
| --- | --- | --- | ---: |
| Dimitrescu/Ada | `poder ada wong.mp3` | `assets/sfx/special/ada-wong.mp3` | 1,985 s |
| Nemesis/Jill | `poder kill valentine.mp3` | `assets/sfx/special/jill-valentine.mp3` | 3,474 s |
| Nehelenia/Sailor | `poder sailor moon.mp3` | `assets/sfx/special/sailor-moon.mp3` | 2,509 s |
| Banqueiro | `poder contra banqueiro.mp3` | `assets/sfx/special/banker.mp3` | 3,056 s |
| Dominadora | `poder contra dominadora.mp3` | `assets/sfx/special/dominadora.mp3` | 3,918 s |
| Matriarca Esmeralda | `poder contra matriarca.mp3` | `assets/sfx/special/matriarca-esmeralda.mp3` | 3,814 s |

Os MP3s também foram copiados sem edição/recompressão. Os nove arquivos novos
passaram pela comparação SHA-256 original × destino. O teste de integridade
mantém esses hashes e verifica formato RGBA/resolução das PNGs novas.

## Verificação histórica — antes da integração dos MP3s

- Suíte automatizada: **1.409 testes aprovados**, incluindo regressões dos seis
  chefes. Log local: `.cache/special-character-full-unit.log`.
- Novos testes: `tests/cooperative-special-presentation.test.mjs` e
  `tests/cooperative-special-presentation.browser-cases.mjs`.
- Fixtures existentes atualizadas: `tests/playtest-p0.browser.mjs`,
  `tests/match-history.test.mjs`, `tests/boss-lab-persistence.test.mjs`.
- Chromium em 1024×768, 1376×1032, 1920×1080 e 390×844, sem zoom; dois clientes
  sincronizados por transporte CAS simulado, destinatário local, parceiro e BOT.
  Testa contagem, deduplicação, pausa visual, geometria, cleanup, undo, reload,
  mudança de partida, imagem ausente/lenta e movimento reduzido.
- Matriz visual final aprovada: **36 apresentações em dois clientes** (três
  personagens × três destinatários × quatro resoluções), além dos casos de
  cancelamento/fallback. Log: `.cache/special-character-visual-final.log`.
- Regressão ampla de navegador aprovada nas quatro resoluções: seis chefes,
  136 combinações de habilidade/fase por resolução, mouse/toque, transações,
  itens, undo/reload, cronômetros e recuperação de BOT. Log:
  `.cache/special-character-browser-complete.log`.
- `node --check app.js`, sintaxe do módulo novo e `git diff --check`: aprovados.
- Capturas: `.cache/playtest-p0/hero-{dimitrescu,nemesis,nehelenia}-{largura}.png`.

Limitação: os testes de dois humanos usam handlers reais em fixture de navegador
e estado serializado; não são uma partida autenticada no Firebase nem um teste
em tablet físico. O ajuste de percepção visual final ainda pode ser avaliado no
playtest humano, sem modificar as regras.

## Refinamento solicitado — voo visível e quadro compartilhado

O voo não havia sido removido do motor: os versos tinham somente 22×32 px e
começavam a desaparecer logo após 12% do percurso. Além disso, a cor foi atribuída
como propriedade JavaScript do objeto `style`, em vez de uma variável CSS real,
deixando as bordas sem contraste. Agora a variável usa `style.setProperty`.

- Versos com largura entre 36 e 72 px, relativa ao Lixo; borda colorida e desenho
  discreto de verso, sem faces ou metadados das cartas.
- Movimento em arco, chegada levemente espalhada, opacidade mantida até 90% do
  percurso e fade somente no final. O fallback também ganhou voo de 850 ms.
- Quadro baseado na Jill, em uma faixa comum da mesa: mesma posição e mesmas
  dimensões para Ada, Jill e Sailor em cada viewport. A Sailor naturalmente ocupa
  menos largura dentro desse quadro, pois seu original é mais estreito; não há
  esticamento ou alteração da PNG.
- Os testes de navegador comparam numericamente os quadros das três personagens,
  verificam cinco versos visíveis e suas bordas, destinatários local/remoto/BOT,
  duplicatas, cancelamento, reload, undo e fallback.

Resultados e evidências deste refinamento estão registrados em
`ESPECIAL_E_DEVTOOLS_REFINAMENTO_2026-10-11.md`. A matriz histórica acima pertence
à implementação anterior; não substitui a validação deste ajuste.

## Verificação final — seis personagens e áudio

- **1.451 testes automatizados aprovados**, zero falhas/skips:
  `.cache/special-six-audio-all.log`.
- **15 testes focados** de apresentação/áudio: integridade SHA-256, pares de
  assets, ambos os clientes, beneficiários humano/local/remoto/BOT, IDs
  confirmados, snapshots duplicados/obsoletos, reload/undo, áudio bloqueado,
  mute, pausa, AudioContext atrasado, fim natural e cancelamento do trecho final.
  Log: `.cache/special-six-audio-focused.log`.
- **72 apresentações em dois clientes**: seis chefes × três beneficiários ×
  quatro viewports (1024×768, 1376×1032, 1920×1080, 390×844), sem zoom.
  Cinco versos por cliente, imagem e som corretos, uma reprodução por ação e
  início do áudio junto ao slide; quadro comum com tolerância de até 1 px CSS
  para arredondamentos dos obstáculos/fontes. Proporção do original preservada.
- MP3s decodificados no navegador real; durações registradas na tabela acima.
  Política de autoplay bloqueada e MP3 ausente não interrompem o Especial.
- PNG ausente/lenta e load cancelado mantêm fallback/cleanup. Mute não toca o
  clipe; música desligada ainda permite SFX. Resize/undo/troca de partida param
  áudio. Movimento reduzido não cria PNG, voo ou áudio, mas concede cartas.
- A mesma execução de navegador também passou na regressão P0 completa dos
  seis chefes, nas **136 combinações de habilidade/fase por resolução**,
  transações concorrentes, mouse/toque, itens, cronômetros, undo/reload e BOT.
  Logs: `.cache/special-six-audio-{1024,1376,1920,390}.log`.
- Capturas inspecionadas: `.cache/playtest-p0/hero-{chefe}-{largura}.png`,
  incluindo Banqueiro, Dominadora e Matriarca; sem mudança do layout real.
- Sintaxe de `app.js`, `js/audio.js` e módulos do Especial e `git diff --check`
  aprovados. Sem commit, push ou deploy.

Arquivos alterados neste lote: `app.js`, `js/audio.js`,
`js/boss/ui/cooperative-special-presentation.js`, `service-worker.js`, este
documento, `tests/cooperative-special-presentation.test.mjs`,
`tests/cooperative-special-presentation.browser-cases.mjs`,
`tests/playtest-p0.browser.mjs`. Novos: os módulos de assets e de cue de áudio,
`tests/cooperative-special-audio.test.mjs`, três PNGs e seis MP3s listados acima.
Alterações anteriores do workspace foram preservadas.

Limites: dois clientes e Firebase/CAS são simulados com handlers/engine reais;
não são duas contas autenticadas no servidor ou tablets físicos. Reprodução e
decodificação foram verificadas no navegador, não uma avaliação auditiva em
alto-falantes físicos. O navegador pode recusar som antes da interação do
usuário; nesse caso não há repetição tardia nem bloqueio da partida.
