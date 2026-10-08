import { CASTLE_BALANCE, ladyBloodBalance } from '../dimitrescu-castle.js';
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
  phasePortraits: Object.freeze({
    1: 'assets/images/boss-dimitrescu.png',
    2: 'assets/images/boss-dimitrescu-fase2.png',
    3: 'assets/images/boss-dimitrescu-fase3.png',
  }),
  tableTheme: 'dimitrescu',
  deckTheme: 'resident',
  accent: '#b91c1c',
  maxHp: CASTLE_BALANCE.ladyHp,
  dangerType: 'blood',
  maxDanger: 100,
  daughters: Object.freeze({
    bela: Object.freeze({ id: 'bela', name: 'Bela', portrait: 'assets/images/boss-dimitrescu-bela.png' }),
    cassandra: Object.freeze({ id: 'cassandra', name: 'Cassandra', portrait: 'assets/images/boss-dimitrescu-cassandra.png' }),
    daniela: Object.freeze({ id: 'daniela', name: 'Daniela', portrait: 'assets/images/boss-dimitrescu-daniela.png' }),
  }),
  abilityDaughters: Object.freeze({
  }),
  phaseNames: Object.freeze({
    1: 'A Caçada',
    2: 'As Filhas',
    3: 'Banquete Carmesim',
  }),
  phaseTaunts: Object.freeze({
    1: 'Vocês entraram no meu castelo por vontade própria.',
    2: 'Vocês queriam conhecer a dona do castelo? Então olhem bem.',
    3: 'Chega de elegância. Agora verão a verdadeira dona deste castelo.',
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
    2: Object.freeze(['cassandra_dead_feast', 'crimson_clot', 'three_daughters', 'impure_blood']),
    3: Object.freeze(['castle_lockdown', 'red_wine', 'crimson_clot', 'three_daughters', 'impure_blood']),
  }),
  abilities: Object.freeze([
    ability('blood_tithe', 'Tributo de Sangue', 4, [1, 2, 3], ({ phase = 1 }) =>
      `No fim da rodada, mãos grandes alimentam a Sede: 8–10 cartas +${ladyBloodBalance(phase).mediumTithe}; 11+ cartas +${ladyBloodBalance(phase).heavyTithe}, por jogador.`),
    ability('red_wine', 'Vinho Carmesim', 2, [1, 2, 3], ({ phase = 1 }) =>
      `Se estiver ferida e tiver ao menos 20 de Sede, Lady Dimitrescu consome 15 de Sede para se curar ${phase === 1 ? 140 : phase === 2 ? 200 : 260} HP.`),
    ability('crimson_brand', 'Marca Carmesim', 4, [1, 2, 3], ({ phase = 1 }) =>
      `Lady marca uma carta de cada cooperador. Cada carta marcada usada legalmente evita a punição; cada marca que sobreviver à rodada aumenta a Sede em ${ladyBloodBalance(phase).crimsonBrand}.`),
    ability('cassandra_dead_feast', 'Banquete dos Mortos', 3, [2, 3], ({ phase = 2 }) =>
      `Lady profana o próximo Morto. Quando ele for tomado, ganha ${ladyBloodBalance(phase).deadFeast} de Sede e cura ${phase === 3 ? 130 : 90} HP, com bônus de Fúria; uma Canastra Real ou Ás-a-Ás reduz a profanação a +4 de Sede base e anula a cura.`),
    ability('crimson_clot', 'Coágulo Carmesim', 3, [2, 3], ({ phase = 2 }) =>
      `Lady solidifica a própria Sede em uma barreira de ${phase === 3 ? 260 : 180} de proteção. Se a equipe romper o Coágulo, evita a cura; se ele sobreviver até o fim da rodada, metade da proteção restante vira cura.`),
    ability('castle_lockdown', 'Portas do Castelo', 3, [3], () =>
      'O lixo fica bloqueado durante toda a rodada. Os cooperadores precisam sobreviver usando o monte.'),
    ability('three_daughters', 'As Três Filhas', 3, [2, 3], () =>
      'Nesta rodada, todas as filhas vivas usam suas passivas. Cada falha ou reação custa +3 Sede.'),
    ability('impure_blood', 'Sangue Impuro', 3, [1, 2, 3], () =>
      'Nesta rodada, o primeiro Joker ou 2 usado como coringa por cada cooperador causa +3 Sede. 2 natural não conta. Máximo +6.'),
  ]),
});
