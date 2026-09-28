const ability = (id, name, weight, phases, describe) => ({ id, name, weight, phases, describe });

export const DIMITRESCU_BLOOD_RELIEF_BY_KIND = Object.freeze({
  simple: 0,
  suja: 0,
  limpa: 4,
  real: 8,
  asas: 12,
});

export const dimitrescuDefinition = Object.freeze({
  id: 'dimitrescu',
  mode: 'boss_dimitrescu',
  name: 'Lady Dimitrescu',
  portrait: 'assets/images/boss-dimitrescu.png',
  tableTheme: 'resident',
  deckTheme: 'resident',
  accent: '#b91c1c',
  maxHp: 2300,
  dangerType: 'blood',
  maxDanger: 100,
  daughters: Object.freeze({
    bela: Object.freeze({ id: 'bela', name: 'Bela', portrait: 'assets/images/boss-dimitrescu-bela.png' }),
    cassandra: Object.freeze({ id: 'cassandra', name: 'Cassandra', portrait: 'assets/images/boss-dimitrescu-cassandra.png' }),
    daniela: Object.freeze({ id: 'daniela', name: 'Daniela', portrait: 'assets/images/boss-dimitrescu-daniela.png' }),
  }),
  abilityDaughters: Object.freeze({
    bela_hunt: Object.freeze(['bela']),
    cassandra_feast: Object.freeze(['cassandra']),
    cassandra_dead_feast: Object.freeze(['cassandra']),
    daniela_swarm: Object.freeze(['daniela']),
    three_daughters: Object.freeze(['bela', 'cassandra', 'daniela']),
  }),
  phaseNames: Object.freeze({
    1: 'A Caçada',
    2: 'As Filhas',
    3: 'Banquete Carmesim',
  }),
  phaseTaunts: Object.freeze({
    1: 'Vocês entraram no meu castelo por vontade própria.',
    2: 'Minhas filhas estavam famintas por companhia.',
    3: 'Chega de brincar. O banquete começa agora.',
  }),
  damageReactions: Object.freeze([
    'Que falta de educação atacar a anfitriã.',
    'Minhas filhas vão gostar de vocês.',
    'Continuem. O sangue fica melhor quando há esperança.',
  ]),
  finalSpeeches: Object.freeze({
    victory: 'Impressionante. Pouquíssimos convidados saem do castelo.',
    defeat: 'O castelo sempre cobra de quem entra.',
  }),
  phaseIntroAbilities: Object.freeze({
    2: Object.freeze(['cassandra_dead_feast', 'cassandra_feast', 'daniela_swarm', 'crimson_clot']),
    3: Object.freeze(['three_daughters', 'castle_lockdown', 'red_wine', 'crimson_clot']),
  }),
  abilities: Object.freeze([
    ability('bela_hunt', 'Caçada de Bela', 5, [1, 2, 3], ({ phase = 1 }) =>
      `Bela marca uma carta jogável. Use-a até o fim do turno do alvo ou a Sede aumenta ${phase === 3 ? 16 : 14}. Cumprir reduz a Sede em 3.`),
    ability('blood_tithe', 'Tributo de Sangue', 4, [1, 2, 3], ({ phase = 1 }) =>
      `No fim da rodada, mãos grandes alimentam a Sede: 8–10 cartas +${phase === 3 ? 6 : 4}; 11+ cartas +${phase === 3 ? 10 : 8}, por jogador.`),
    ability('red_wine', 'Vinho Carmesim', 2, [1, 2, 3], ({ phase = 1 }) =>
      `Se estiver ferida e tiver ao menos 20 de Sede, Lady Dimitrescu consome 15 de Sede para se curar ${phase === 1 ? 140 : phase === 2 ? 200 : 260} HP.`),
    ability('crimson_brand', 'Marca Carmesim', 4, [1, 2, 3], ({ phase = 1 }) =>
      `Lady marca uma carta de cada cooperador. Cada carta marcada usada legalmente reduz a Sede em 2; cada marca que sobreviver à rodada aumenta a Sede em ${phase === 3 ? 9 : 7}.`),
    ability('cassandra_feast', 'Banquete de Cassandra', 5, [2, 3], ({ phase = 2 }) =>
      `Cassandra marca um jogo. Alimente esse jogo nesta rodada ou a Sede aumenta ${phase === 3 ? 18 : 16}. Cumprir reduz a Sede em 4.`),
    ability('cassandra_dead_feast', 'Banquete dos Mortos', 3, [2, 3], ({ phase = 2 }) =>
      `Cassandra profana o próximo Morto. Quando ele for tomado, Lady ganha ${phase === 3 ? 16 : 12} de Sede e cura ${phase === 3 ? 130 : 90} HP; uma Canastra Real ou Ás-a-Ás reduz a profanação a apenas +4 de Sede e anula a cura.`),
    ability('daniela_swarm', 'Enxame de Daniela', 4, [2, 3], ({ phase = 2 }) =>
      `Daniela contamina o lixo. Pegá-lo nesta rodada aumenta a Sede em ${phase === 3 ? 15 : 12}; evitar o lixo reduz a Sede em 3.`),
    ability('crimson_clot', 'Coágulo Carmesim', 3, [2, 3], ({ phase = 2 }) =>
      `Lady solidifica a própria Sede em uma barreira de ${phase === 3 ? 260 : 180} de proteção. Se a equipe romper o Coágulo, a Sede cai 6; se ele sobreviver até o fim da rodada, metade da proteção restante vira cura.`),
    ability('castle_lockdown', 'Portas do Castelo', 3, [3], () =>
      'O lixo fica bloqueado durante toda a rodada. Os cooperadores precisam sobreviver usando o monte.'),
    ability('three_daughters', 'As Três Filhas', 5, [3], () =>
      'Bela, Cassandra e Daniela atacam juntas. Cada objetivo falho aumenta a Sede em 8; cada objetivo cumprido reduz a Sede em 2.'),
  ]),
});
