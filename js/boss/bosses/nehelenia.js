const ability = (id, name, weight, phases, describe) => ({ id, name, weight, phases, describe });

export const neheleniaDefinition = Object.freeze({
  id: 'nehelenia',
  mode: 'boss_nehelenia',
  name: 'Rainha Nehelenia',
  portrait: 'assets/images/boss-nehelenia.png',
  tableTheme: 'lunar',
  deckTheme: 'lunar',
  accent: '#a78bfa',
  maxHp: 2400,
  dangerType: 'dream_mirror',
  maxDanger: 5,
  attendants: Object.freeze({
    tiger: Object.freeze({ id: 'tiger', name: "Tiger's Eye", portrait: 'assets/images/nehelenia-tigers-eye.png' }),
    hawk: Object.freeze({ id: 'hawk', name: "Hawk's Eye", portrait: 'assets/images/nehelenia-hawks-eye.png' }),
    fish: Object.freeze({ id: 'fish', name: 'Fish Eye', portrait: 'assets/images/nehelenia-fish-eye.png' }),
  }),
  abilityAttendants: Object.freeze({
    tiger_link: Object.freeze(['tiger']),
    tiger_prey: Object.freeze(['tiger']),
    hawk_suit: Object.freeze(['hawk']),
    hawk_watch: Object.freeze(['hawk']),
    fish_marked_card: Object.freeze(['fish']),
    fish_inverted: Object.freeze(['fish']),
  }),
  phaseNames: Object.freeze({
    1: 'Espelhos dos Sonhos',
    2: 'Circo da Lua Morta',
    3: 'Pesadelo Eterno',
  }),
  phaseTaunts: Object.freeze({
    2: 'Vocês ainda confiam demais no que os olhos mostram.',
    3: 'Agora a mesa inteira pode mentir para vocês.',
  }),
  damageReactions: Object.freeze([
    'Tem certeza de que foi a mim que acertaram?',
    'O reflexo sentiu mais do que eu.',
    'Continuem olhando. É assim que o espelho vence.',
  ]),
  finalSpeeches: Object.freeze({
    victory: 'Até uma mentira perfeita se desfaz quando ninguém mais acredita nela.',
    defeat: 'Olhem outra vez. O pesadelo já escolheu vocês.',
  }),
  phaseIntroAbilities: Object.freeze({
    2: Object.freeze(['discard_mirror', 'mirror_prison', 'mirrored_meld']),
    3: Object.freeze(['eternal_nightmare', 'mirrored_meld', 'follow_reflection']),
  }),
  abilities: Object.freeze([
    ability('mirrored_meld', 'Jogo Espelhado', 5, [1, 2, 3], () =>
      'Nehelenia clona um jogo real em dois reflexos idênticos na própria mesa. Escolher o falso envia a carta usada ao fundo do monte e deixa o jogador Desorientado.'),
    ability('follow_reflection', 'Siga o Reflexo', 5, [1, 2, 3], () =>
      'Tudo o que o primeiro cooperador baixar durante o turno vira o padrão exato. O segundo pode jogar livremente, mas no fim precisa ter baixado exatamente a mesma quantidade, inclusive zero.'),
    ability('discard_mirror', 'Espelho do Lixo', 4, [2, 3], () =>
      'O topo do lixo aparece em dois reflexos idênticos. Não existe pista: é uma escolha 50/50. Errar sela o lixo naquela rodada.'),
    ability('mirror_prison', 'Prisão no Espelho', 3, [2, 3], () =>
      'Se Nehelenia já tomou ao menos um Espelho dos Sonhos, o parceiro pode alimentar um jogo refletido para recuperar 1 Espelho.'),
    ability('eternal_nightmare', 'Pesadelo Eterno', 5, [3], () =>
      'Uma carta original gera dois reflexos. A original é mostrada antes do embaralhamento; depois, os três espelhos se misturam e o alvo precisa seguir a carta verdadeira.'),
    ability('tiger_link', 'Laço do Tigre', 4, [1, 2, 3], () =>
      "Tiger's Eye liga dois jogos da equipe. Cada lado precisa receber ao menos 1 carta. Se um lado for ignorado, as garras permanecem nele: a próxima alimentação rompe o efeito, mas as cartas usadas para quebrá-lo não causam dano individual."),
    ability('tiger_prey', 'Presa Marcada', 3, [1, 2, 3], () =>
      "Tiger's Eye marca uma Presa que o alvo consegue alimentar. Enquanto ela não for alimentada, esse jogador não pode alimentar nenhum outro jogo existente; a marca persiste até ser resolvida."),
    ability('hawk_suit', 'Olho do Falcão', 3, [1, 2, 3], ({ suitLabel = 'o naipe marcado' }) =>
      `Hawk's Eye exige que o alvo encerre o turno descartando ${suitLabel}. Se ele descartar outro naipe, Hawk vigia essa carta e ninguém pode recolher o lixo enquanto ela permanecer no topo.`),
    ability('hawk_watch', 'Vigilância', 3, [2, 3], () =>
      "Hawk's Eye fecha a rota para um jogo durante o turno do alvo. O jogo marcado não pode ser alimentado por esse jogador naquele turno."),
    ability('fish_marked_card', 'Mão no Espelho', 3, [1, 2, 3], () =>
      'Fish Eye marca uma carta do alvo que pode ser usada com segurança. Ela precisa sair da mão — em jogo ou no descarte — antes do fim do turno; se falhar, vira um Reflexo Morto que não pode mais entrar em jogo e só sai pelo descarte.'),
    ability('fish_inverted', 'Reflexo Invertido', 3, [2, 3], () =>
      'Fish Eye impede o alvo de abrir um jogo novo até que ele alimente um jogo já existente. Se não resolver no turno atual, o efeito permanece nos próximos turnos até ser rompido.'),
  ]),
});
