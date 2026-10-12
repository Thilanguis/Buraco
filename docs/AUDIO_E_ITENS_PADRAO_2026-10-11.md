# Áudio e padrão dos itens — 11/10/2026

## Entrega

- Medidos os 66 MP3s em assets e o WAV de abertura: todos decodificaram.
- Não houve edição, normalização destrutiva ou recompressão dos masters.
- Ganhos por arquivo em `js/audio-balance.js`; hashes SHA-256 dos originais no inventário.
- Música de fundo: alvo de energia 6 dB abaixo dos efeitos principais.
- Cartas e coração têm categoria mais discreta; não são equiparados às falas.
- Itens ativos mantêm emblema contrastado na mão, mesa, Lixo e voo visível.
- Cartas consumidas não recuperam emblema; versos ocultos não expõem item/face.
- Sem alteração de custo/regras de itens, HP, regen, Sede ou Especial.
- Sem commit, push ou deploy executado pelo agente. Branch atual conferida: main.

## Causas

Os masters têm amplitudes muito diferentes. Ada e Matriarca do Especial diferiam
cerca de 18 dB na energia RMS com o mesmo volume 0,8. Transformaçao F3 e alguns
masters Resident têm picos muito maiores que os demais. Música também não era
uniforme: aplicar 10–35% a arquivos diferentes não garante som percebido equivalente.

A face compartilhada já tinha emblema, mas a mão usava medalhão escuro de 64%
e a mesa/Lixo usavam uma versão menor, sem a mesma base de contraste. Além disso,
`packCard` descartava `castleItem`: a apresentação remota podia perder o símbolo
durante o voo, mesmo quando o estado definitivo ainda conservava o item.

## Política de volume

Medição de PCM decodificado em 48 kHz: energia média por blocos de 400 ms;
descarta silêncio abaixo de −60 dBFS e blocos 15 dB abaixo da média dos blocos
audíveis. É RMS com gate, não LUFS nem uma afirmação de loudness perceptual exato.

Alvos: efeitos/falas −22 dBFS RMS; música/aberturas −28; movimento de cartas −30;
coração −32. Ganho máximo 4× (cerca de +12 dB). O ganho de cada arquivo também
é limitado para manter seu pico amostrado a −3 dBFS. Não há compressor,
recorte do original, mudança de duração, loop novo ou nova ordem de reprodução.
Esse limite é por arquivo, não uma garantia sobre a soma de efeitos simultâneos.

Os efeitos clonados aplicam um único ganho no Web Audio quando disponível,
sem multiplicar por antigos volumes ajustados manualmente ou pelo boost
antigo da Matriarca. Sem Web Audio, usa volume nativo seguro de até 1; os
masters muito baixos podem ficar mais discretos nesse fallback. Música
continua com seus fades, ducking e prioridades; usa o ganho medido do arquivo,
não apenas uma porcentagem fixa. O antigo teto 0,35 permanece como fallback
para faixas sem medição. Mute geral e modo só efeitos foram preservados.

Arquivos com transientes grandes podem ficar abaixo do alvo para preservar o
pico. Ex.: Jill fica em torno de −24,31, em vez de forçar −22 e saturar os picos.
O som de procura também tem crest factor alto e continua discreto. A percepção
final depende de frequência, alto-falantes e volume do dispositivo.

## Verificação

- 1.457 testes automatizados: `.cache/audio-items-all.log`.
- 12 focados: integridade dos 67 masters, inventário completo, perfil/limites,
  ganho Web Audio real do código, fade da música, mute/cancelamento, metadados e faces ocultas.
  `.cache/audio-items-focused.log`.
- Cinco itens × quatro viewports: mão, mesa, Lixo e voo, imagem carregada,
  valor/naipe, base de contraste, metadados transmitidos, consumo e verso oculto.
  `.cache/card-item-face-browser.log`; capturas em `.cache/card-item-face/`.
  Essa fixture usa a face compartilhada e os containers/CSS do index real;
  não simula uma transação de aplicação de item.
- Regressão P0 nas quatro resoluções: 1024×768, 1376×1032, 1920×1080 e 390×844.
  Handlers reais, dois clientes/CAS simulados, seis chefes, itens e 136 combinações
  de habilidade/fase por resolução. `.cache/audio-items-p0-{largura}.log`.
- Em 1024, a matriz do Especial também verifica os seis personagens × três
  destinatários em dois clientes e o coeficiente dos GainNodes reais no navegador,
  com mute, arquivo ausente, cancelamento e reprodução única.
- Limites: não são contas autenticadas no Firebase nem tablets físicos; não foi
  feita avaliação auditiva em alto-falantes físicos. O Web Audio tem fallback
  nativo, com as limitações de volume do navegador/dispositivo.
- Sintaxe e `git diff --check` verificados; nenhum master foi modificado.

## Arquivos deste lote

`app.js`, `js/audio.js`, novo `js/audio-balance.js`,
`js/game/domination-friend-sound.js`, `js/game/card-face.js`,
`styles/boss/dimitrescu.css`, `service-worker.js` (v310),
testes de áudio/itens e fixtures do Especial/P0. Alterações anteriores, inclusive
as já staged, foram preservadas.

## Inventário medido

A coluna “saída” é a energia estimada após ganho no Web Audio; não mede o mixer
com vários sons juntos nem o fallback nativo com ganho máximo 1.

| Arquivo | Categoria | Entrada RMS (dBFS) | Ganho | Saída estimada (dBFS) |
| --- | --- | ---: | ---: | ---: |
| `assets/audio/cofre-abrindo.mp3` | effect | -20.76 | 0.830 | -22.38 |
| `assets/audio/cofre-fechando.mp3` | effect | -18.13 | 0.641 | -22.00 |
| `assets/music/mesa-cassino.mp3` | music | -14.53 | 0.212 | -28.00 |
| `assets/music/mesa-feltro.mp3` | music | -17.92 | 0.313 | -28.00 |
| `assets/music/mesa-findom.mp3` | music | -18.02 | 0.317 | -28.00 |
| `assets/music/mesa-lunar-abertura.mp3` | music | -19.12 | 0.360 | -28.00 |
| `assets/music/mesa-lunar.mp3` | music | -18.20 | 0.324 | -28.00 |
| `assets/music/mesa-masmorra.mp3` | music | -14.45 | 0.210 | -28.00 |
| `assets/music/mesa-ostentacao.mp3` | music | -10.79 | 0.138 | -28.00 |
| `assets/music/mesa-resident.mp3` | music | -25.99 | 0.793 | -28.00 |
| `assets/music/mesa-submissao.mp3` | music | -13.47 | 0.188 | -28.00 |
| `assets/music/mesa-wwe.mp3` | music | -9.18 | 0.115 | -28.00 |
| `assets/sfx/abertura-lunar-curta.wav` | intro | -30.47 | 1.329 | -28.00 |
| `assets/sfx/abertura-lunar.mp3` | intro | -28.16 | 1.019 | -28.00 |
| `assets/sfx/abertura-resident.mp3` | intro | -31.74 | 1.538 | -28.00 |
| `assets/sfx/abertura-wwe.mp3` | intro | -19.42 | 0.372 | -28.00 |
| `assets/sfx/amiga-bruna-turno-extra.mp3` | effect | -18.15 | 0.642 | -22.00 |
| `assets/sfx/amiga-entrada.mp3` | effect | -10.13 | 0.255 | -22.00 |
| `assets/sfx/amiga-nathalia-turno-extra.mp3` | effect | -18.24 | 0.648 | -22.00 |
| `assets/sfx/amiga-saida.mp3` | effect | -15.83 | 0.491 | -22.00 |
| `assets/sfx/amiga-turno-extra.mp3` | effect | -20.79 | 0.870 | -22.00 |
| `assets/sfx/asas-lunar.mp3` | effect | -27.20 | 1.820 | -22.00 |
| `assets/sfx/barulho-cartas.mp3` | cards | -26.31 | 0.654 | -30.00 |
| `assets/sfx/canastra-as-a-as-lunar.mp3` | effect | -18.16 | 0.643 | -22.00 |
| `assets/sfx/canastra-as-a-as-resident.mp3` | effect | -13.12 | 0.360 | -22.00 |
| `assets/sfx/canastra-as-a-as.mp3` | effect | -18.58 | 0.674 | -22.00 |
| `assets/sfx/canastra-limpa-lunar.mp3` | effect | -19.69 | 0.767 | -22.00 |
| `assets/sfx/canastra-limpa-resident.mp3` | effect | -9.27 | 0.231 | -22.00 |
| `assets/sfx/canastra-limpa-wwe.mp3` | effect | -14.05 | 0.400 | -22.00 |
| `assets/sfx/canastra-limpa.mp3` | effect | -21.86 | 0.984 | -22.00 |
| `assets/sfx/canastra-real-lunar.mp3` | effect | -19.44 | 0.745 | -22.00 |
| `assets/sfx/canastra-real-resident.mp3` | effect | -10.62 | 0.270 | -22.00 |
| `assets/sfx/canastra-real-wwe.mp3` | effect | -20.82 | 0.853 | -22.20 |
| `assets/sfx/canastra-real.mp3` | effect | -22.69 | 1.083 | -22.00 |
| `assets/sfx/canastra-suja-lunar.mp3` | effect | -19.66 | 0.764 | -22.00 |
| `assets/sfx/canastra-suja-resident.mp3` | effect | -12.43 | 0.332 | -22.00 |
| `assets/sfx/canastra-suja-wwe.mp3` | effect | -10.56 | 0.268 | -22.00 |
| `assets/sfx/canastra-suja.mp3` | effect | -18.32 | 0.654 | -22.00 |
| `assets/sfx/compra-lunar.mp3` | cards | -27.96 | 0.791 | -30.00 |
| `assets/sfx/compra-resident.mp3` | cards | -7.40 | 0.074 | -30.00 |
| `assets/sfx/compra-wwe.mp3` | cards | -15.02 | 0.178 | -30.00 |
| `assets/sfx/coracao-batendo.mp3` | heartbeat | -10.13 | 0.081 | -32.00 |
| `assets/sfx/cura-matriarca.mp3` | effect | -22.73 | 1.088 | -22.00 |
| `assets/sfx/dominador-luana-turno-extra.mp3` | effect | -17.94 | 0.627 | -22.00 |
| `assets/sfx/fim-de-jogo-banqueiro.mp3` | effect | -21.53 | 0.873 | -22.71 |
| `assets/sfx/fim-de-jogo-dominadora.mp3` | effect | -24.13 | 1.278 | -22.00 |
| `assets/sfx/fim-de-jogo-matriarca.mp3` | effect | -34.53 | 3.332 | -24.08 |
| `assets/sfx/fim-de-jogo.mp3` | effect | -21.91 | 0.990 | -22.00 |
| `assets/sfx/ganho-infeccao-nemesis.mp3` | effect | -14.57 | 0.425 | -22.00 |
| `assets/sfx/ganho-sangue-dimitresco.mp3` | effect | -19.08 | 0.714 | -22.00 |
| `assets/sfx/habilidade-banqueiro.mp3` | effect | -21.53 | 0.873 | -22.71 |
| `assets/sfx/habilidade-dominadora.mp3` | effect | -24.13 | 1.278 | -22.00 |
| `assets/sfx/habilidade-matriarca.mp3` | effect | -34.53 | 3.332 | -24.08 |
| `assets/sfx/procurar-carta.mp3` | effect | -30.16 | 0.708 | -33.16 |
| `assets/sfx/renascimento-matriarca.mp3` | effect | -24.59 | 0.832 | -26.18 |
| `assets/sfx/risada-nehelenia.mp3` | effect | -24.18 | 1.286 | -22.00 |
| `assets/sfx/roubo-mao.mp3` | effect | -24.93 | 1.402 | -22.00 |
| `assets/sfx/seu-turno.mp3` | effect | -18.72 | 0.685 | -22.00 |
| `assets/sfx/special/ada-wong.mp3` | effect | -12.41 | 0.332 | -22.00 |
| `assets/sfx/special/banker.mp3` | effect | -22.52 | 0.878 | -23.65 |
| `assets/sfx/special/dominadora.mp3` | effect | -18.27 | 0.651 | -22.00 |
| `assets/sfx/special/jill-valentine.mp3` | effect | -27.00 | 1.363 | -24.31 |
| `assets/sfx/special/matriarca-esmeralda.mp3` | effect | -30.34 | 2.611 | -22.00 |
| `assets/sfx/special/sailor-moon.mp3` | effect | -23.09 | 1.133 | -22.00 |
| `assets/sfx/transformacao-dimitrescu-fase2.mp3` | effect | -19.61 | 0.760 | -22.00 |
| `assets/sfx/transformacao-dimitrescu-fase3.mp3` | effect | -12.12 | 0.321 | -22.00 |
| `assets/sfx/what-have-you-done-to-my-daughter.mp3` | effect | -19.43 | 0.744 | -22.00 |
