# Especial Cooperativo — apresentação visual (11/10/2026)

## Escopo

Somente apresentação cosmética após uma transação aceita. Custo, pontuação,
beneficiário, retirada das cinco cartas do Lixo e todas as reações dos chefes
permanecem inalterados. Sem áudio, commit, push ou deploy.

## Sequência e ajuste solicitado durante a validação

Configuração central: `js/boss/ui/cooperative-special-presentation.js`, constante
`SPECIAL_PRESENTATION`. Duração final: **3.000 ms**, aumentada após o feedback de
que a imagem estava pequena e a entrada/saída rápidas.

- Entrada pela direita: 750 ms, com fade discreto.
- Personagem parado: 1.500 ms. O easing é aplicado por trecho, não ao relógio
  inteiro, para preservar essa pausa.
- Cinco silhuetas começam a voar aos 1.080 ms, do Lixo à mão local/remota.
  Cada voo dura 720 ms, com 60 ms entre cartas. A última chega aos 2.040 ms.
- Feedback discreto de chegada, sem mostrar faces ocultas.
- Saída para a direita: últimos 750 ms.

Os elementos têm posição fixa e `pointer-events: none`. Não deslocam cartas,
HUD ou controles. O tamanho procura o maior espaço disponível, preservando a
proporção original; áreas vazias e arte dos retratos podem ser sobrepostas
brevemente, mas as regiões de informações e controles são protegidas. A entrada
e saída pela direita são recortadas à área segura; a PNG aparece inteira durante
a pausa, sem atravessar visualmente os textos e controles no percurso.
Em telas pequenas a personagem permanece menor que no desktop. Sem espaço
seguro, utiliza somente o voo das cartas.

## Assets originais

Mapeamento central: `SPECIAL_CHARACTER_ASSETS`. Os três arquivos fornecidos
foram copiados sem recorte, reprocessamento, compressão ou alteração de pixels;
SHA-256 foi comparado com os originais.

| Chefe | Personagem | Caminho no projeto | Resolução original |
| --- | --- | --- | --- |
| Dimitrescu | Ada Wong | `assets/images/special/ada-wong.png` | 1024 × 1536 |
| Nemesis | Jill Valentine | `assets/images/special/jill-valentine.png` | 1200 × 1800 |
| Nehelenia | Sailor Moon | `assets/images/special/sailor-moon.png` | 941 × 1672 |

Banqueiro, Matriarca e Dominadora continuam sem asset configurado e usam o voo
provisório. Imagem ausente, inválida ou carregamento acima de 400 ms também usam
esse fallback. Não há referência a arquivos de personagens ainda não fornecidos.

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
- `onCue` disponibiliza fases de entrada/chegada para futura integração opcional
  de áudio; não carrega MP3, não toca som e não modifica música existente.

## Arquivos de implementação

- `app.js`: disparo confirmado local/remoto e cancelamento de apresentação.
- `js/boss/ui/cooperative-special-presentation.js`: assets, tempos, geometria,
  sequência e deduplicação.
- `js/boss/ui/cooperative-special-ui.js`: mantém renderer e reexport compatível.
- `styles/boss-mode.css`: estilos exclusivos dos nós cosméticos.
- `service-worker.js`: cache local v304, novo módulo e PNGs; não publicado.
- Três PNGs em `assets/images/special/`.

## Verificação

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
