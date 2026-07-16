const ability = (id, name, weight, phases, describe) => ({ id, name, weight, phases, describe });

export const matriarchDefinition = Object.freeze({
  id: 'matriarca_esmeralda',
  mode: 'boss_matriarca',
  name: 'A Matriarca Esmeralda',
  portrait: 'assets/images/boss-elfa.png',
  tableTheme: 'feltro',
  deckTheme: 'classico',
  accent: '#34d399',
  maxHp: 2000,
  dangerType: 'bloom',
  maxDanger: 5,
  phaseNames: Object.freeze({ 1: 'Germinacao', 2: 'Jardim Voraz', 3: 'Primavera Eterna' }),
  phaseTaunts: Object.freeze({
    1: 'Toda mesa pode virar um jardim. A de voces ja comecou a criar raizes.',
    2: 'Voces cortaram um galho. Eu trouxe a floresta inteira.',
    3: 'Agora cada carta de voces alimenta a minha primavera.',
  }),
  healReactions: Object.freeze(['A floresta sempre recupera o que lhe pertence.']),
  damageReactions: Object.freeze(['Podem cortar as folhas. As raizes continuam.']),
  finalSpeeches: Object.freeze({
    victory: 'Ate a primavera... pode terminar.',
    defeat: 'Nao restou mesa. Apenas o meu jardim.',
  }),
  phaseIntroAbilities: Object.freeze({
    2: Object.freeze(['twin_vines', 'graft', 'discard_pollen', 'harvest']),
    3: Object.freeze(['royal_bloom', 'emerald_cocoon', 'spring_crown']),
  }),
  abilities: Object.freeze([
    ability('living_seed', 'Semente Viva', 5, [1, 2, 3], () => 'Use a carta marcada no proximo turno para impedir que a semente floresca.'),
    ability('hungry_root', 'Raiz Faminta', 5, [1, 2, 3], () => 'Adicione uma carta legal ao jogo marcado antes do fim da rodada.'),
    ability('restorative_dew', 'Orvalho Restaurador', 3, [1, 2, 3], () => 'A cura prevista diminui a cada carta nova colocada legalmente na mesa.'),
    ability('twin_vines', 'Trepadeiras Gemeas', 4, [2, 3], ({ targetCount = 2 }) => `${targetCount} jogo(s) precisam receber uma carta legal nesta rodada.`),
    ability('graft', 'Enxerto', 3, [2, 3], () => 'Os dois jogos ligados precisam receber uma carta legal nesta rodada.'),
    ability('discard_pollen', 'Polen do Lixo', 3, [2, 3], () => 'Se o lixo for pego, a carta contaminada precisa ser usada no mesmo turno.'),
    ability('harvest', 'Colheita', 2, [2, 3], () => 'A quantidade de cartas na mao do alvo sera avaliada no fim do turno.'),
    ability('royal_bloom', 'Florescimento Real', 4, [3], ({ targetCount = 0 }) => `${targetCount} objetivo(s) naturais precisam ser cumpridos separadamente.`),
    ability('emerald_cocoon', 'Casulo Esmeralda', 3, [3], () => 'Um casulo de 180 pontos absorvera o dano ate ser rompido.'),
    ability('spring_crown', 'Coroa da Primavera', 3, [3], () => 'Falhas adicionais de ameacas curam mais a Matriarca nesta rodada.'),
  ]),
});
