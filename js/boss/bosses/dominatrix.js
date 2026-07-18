const ability = (id, name, weight, phases, describe) => ({ id, name, weight, phases, describe });

export const dominatrixDefinition = Object.freeze({
  id: 'dominadora',
  mode: 'boss_dominadora',
  name: 'A Dominadora',
  portrait: 'assets/images/boss-dominadora.png',
  tableTheme: 'submissao',
  deckTheme: 'mythic',
  accent: '#ec4899',
  maxHp: 2100,
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
    ability('collar', 'Coleira', 5, [1, 2], () => 'Até duas cartas do jogador marcado ficarão presas durante o turno dele.'),
    ability('forced_choice', 'Escolha Forçada', 4, [1, 2], () => 'O jogador marcado escolherá entre receber 1 Chicote ou aceitar uma ordem válida para o próximo turno.'),
    ability('exposure', 'Exposição', 3, [1, 2], () => 'Uma carta deverá ser usada antes do fim do turno ou causará 1 Chicote.'),
    ability('forced_swap', 'Troca Forçada', 4, [2, 3], () => 'Uma carta será trocada entre as mãos dos cooperadores.'),
    ability('hands_tied', 'Mãos Atadas', 4, [2, 3], () => 'A equipe inteira poderá criar somente 1 novo jogo nesta rodada.'),
    ability('possession', 'Posse', 3, [2, 3], () => 'O dano de um jogo fica suspenso até ambos cooperarem ou o jogo evoluir.'),
    ability('iron_etiquette', 'Etiqueta de Ferro', 4, [1, 2], () => 'O alvo deverá encerrar o próximo turno descartando o naipe ordenado.'),
    ability('favorite', 'Favorita', 3, [2, 3], () => 'Uma favorita será protegida e o outro jogador receberá 1 Chicote.'),
    ability('double_collar', 'Dupla Coleira', 5, [3], () => 'Uma carta de cada jogador ficará presa nesta rodada.'),
    ability('separation', 'Separação', 4, [3], () => 'Os jogadores não poderão alimentar o mesmo jogo nesta rodada.'),
    ability('absolute_control', 'Controle Absoluto', 3, [3], () => 'Um jogador ficará Dominado durante o próximo turno.'),
    ability('break_will', 'Quebra de Vontade', 3, [3], () => 'Um jogador com 2 Chicotes enfrentará uma escolha pessoal.'),
    ability('final_order', 'Ordem Final', 2, [3], () => 'Cada cooperador receberá uma punição diferente para escolher.'),
  ]),
});
