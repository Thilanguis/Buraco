const ability = (id, name, weight, phases, describe) => ({ id, name, weight, phases, describe });

export const dominatrixDefinition = Object.freeze({
  id: 'dominadora',
  mode: 'boss_dominadora',
  name: 'A Dominadora',
  portrait: 'assets/images/boss-dominadora.png',
  tableTheme: 'submissao',
  deckTheme: 'mythic',
  accent: '#ec4899',
  maxHp: 2600,
  dangerType: 'chains',
  maxDanger: 4,
  phaseNames: Object.freeze({ 1: 'Marcação', 2: 'Controle', 3: 'Dominação Total' }),
  phaseTaunts: Object.freeze({
    2: 'Vocês ainda confundem escolha com liberdade.',
    3: 'A partida continua apenas porque eu permito.',
  }),
  damageReactions: Object.freeze([
    'Bonito. Ainda não é liberdade.',
    'Vocês confundem resistência com vitória.',
    'Aproveitem esse instante de coragem.',
  ]),
  finalSpeeches: Object.freeze({
    victory: 'Aproveitem essa ilusão de liberdade enquanto ela dura.',
    defeat: 'No fim, vocês fizeram exatamente o que eu mandei.',
  }),
  phaseIntroAbilities: Object.freeze({
    2: Object.freeze(['forced_swap', 'hands_tied', 'possession', 'favorite']),
    3: Object.freeze(['double_collar', 'separation', 'absolute_control', 'break_will', 'final_order']),
  }),
  abilities: Object.freeze([
    ability('collar', 'Coleira', 5, [1, 2], () => 'Prende até 2 cartas úteis do alvo neste turno.'),
    ability('forced_choice', 'Escolha Forçada', 5, [1, 2, 3], ({ phase = 1 }) => {
      const cfg = phase === 3 ? { direct: 8, obey: 3, fail: 16 } : phase === 2 ? { direct: 7, obey: 3, fail: 14 } : { direct: 6, obey: 2, fail: 12 };
      return `Aceite a ordem ou sofra Dominação +${cfg.direct}.`;
    }),
    ability('exposure', 'Exposição', 4, [1, 2, 3], () => 'Use a carta exposta neste turno.'),
    ability('forced_swap', 'Troca Forçada', 4, [2, 3], () => 'Troca 1 carta útil entre os cooperadores.'),
    ability('hands_tied', 'Mãos Atadas', 4, [2, 3], () => 'Cada jogador fica preso ao primeiro jogo que tocar.'),
    ability('possession', 'Posse', 3, [2, 3], () => 'O dano do jogo fica suspenso até romper a Posse.'),
    ability('iron_etiquette', 'Etiqueta de Ferro', 4, [1, 2, 3], () => 'Termine o turno descartando o naipe ordenado.'),
    ability('favorite', 'Favorita', 4, [2, 3], () => 'Uma é poupada; a menos dominada recebe a punição.'),
    ability('double_collar', 'Dupla Coleira', 5, [3], () => 'Prende 1 carta útil de cada jogador.'),
    ability('separation', 'Separação', 4, [3], () => 'Um jogo alimentado fica exclusivo daquele jogador na rodada.'),
    ability('absolute_control', 'Controle Absoluto', 4, [3], () => 'O alvo fica Dominado por 1 turno.'),
    ability('break_will', 'Quebra de Vontade', 4, [3], () => 'Escolha entre Dominação ou curar a Dominadora.'),
    ability('final_order', 'Ordem Final', 4, [3], () => 'Aceite a Ordem às cegas ou sofra Dominação.'),
  ]),
});
