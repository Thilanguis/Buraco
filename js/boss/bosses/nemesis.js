export const NEMESIS_ZOMBIES = Object.freeze([
  Object.freeze({ id: 'grabber', name: 'Agarrador', maxHp: 220, passive: 'grab', portrait: 'assets/images/nemesis-agarrador.png' }),
  Object.freeze({ id: 'infected', name: 'Infectado', maxHp: 240, passive: 'failure', portrait: 'assets/images/nemesis-infectado.png' }),
  Object.freeze({ id: 'devourer', name: 'Devorador', maxHp: 260, passive: 'heal', portrait: 'assets/images/nemesis-devorador.png' }),
]);
export const NEMESIS_RELIEF = Object.freeze({ simple: 0, suja: 0, limpa: 4, real: 8, asas: 12 });
export const NEMESIS_OBJECTIVE_BALANCE = Object.freeze({
  directDamage: 1, failure: Object.freeze({ 1: 8, 2: 10, 3: 12 }),
  tentaclePartial: Object.freeze({ 1: 4, 2: 5, 3: 6 }), exterminationPartial: 8, exterminationFailure: 16,
});
const ability = (id, name, weight, phases, duration, describe) => ({
  id,
  name,
  weight,
  phases,
  duration,
  describe,
  debug: id === 'horde_invasion' ? { noTarget: true, targetPlayer: true, variants: ['interactive', 'success', 'failure', 'reload', 'undo', 'bot', 'no_target', 'reentry', 'avoid_repeat', 'phase_cap', 'persistent_corpse'], fixedTargetsByVariant: { reentry: 'zombie_grabber', avoid_repeat: 'auto', phase_cap: 'auto', persistent_corpse: 'auto' }, targets: NEMESIS_ZOMBIES.map((entity) => ({ id: `zombie_${entity.id}`, label: entity.name })) } : { noTarget: !['omega_outbreak'].includes(id), targetPlayer: ['stars_hunt', 'infectious_tentacle', 'tentacle_barrage', 'stars_extermination', 'contaminated_zone'].includes(id) },
});
export const nemesisDefinition = Object.freeze({
  id: 'nemesis',
  mode: 'boss_nemesis',
  name: 'Nemesis',
  portrait: 'assets/images/boss-nemesis.png',
  tableTheme: 'resident',
  deckTheme: 'resident',
  accent: '#bd563c',
  maxHp: 2200,
  dangerType: 'infection',
  dangerLabel: 'INFECÇÃO',
  maxDanger: 100,
  defeatTitles: { max_infection: 'Infecção Total', insufficient_final_strike: 'Nemesis sobreviveu', resources_exhausted: 'Recursos esgotados' },
  phaseNames: { 1: 'Perseguição', 2: 'Contágio', 3: 'Mutação' },
  phaseTaunts: { 1: 'S.T.A.R.S.', 2: 'A horda se aproxima.', 3: 'A mutação começou.' },
  damageReactions: [],
  finalSpeeches: { victory: 'A ameaça foi neutralizada.', defeat: 'A ameaça dominou a mesa.' },
  phaseIntroAbilities: { 2: ['rocket_launcher'], 3: ['tentacle_barrage', 'stars_extermination'] },
  abilities: [
    ability('horde_invasion', 'Invasão da Horda', 4, [1, 2, 3], 'full_round', ({ entryKind, targetPlayerName = 'Alvo' }) => entryKind === 'grabber' ? `${targetPlayerName}: faça a carta marcada sair por jogo ou descarte neste turno. Sucesso repele; falha deixa o Agarrador persistente, sem Infecção extra.` : entryKind === 'infected' ? 'Equipe: contribua 2 cartas válidas para jogos nesta rodada. Sucesso repele; falha deixa o Infectado persistente, sem Infecção extra.' : 'Alimente jogos existentes com 3 cartas nesta rodada. Sucesso repele; falha deixa o Devorador persistente, sem Infecção extra.'),
    ability('stars_hunt', 'Caçada S.T.A.R.S.', 5, [1, 2, 3], 'target_turn', ({ phase }) => `O alvo S.T.A.R.S. deve causar dano direto ao Nemesis neste turno. Zumbis não contam. Falha: +${NEMESIS_OBJECTIVE_BALANCE.failure[phase]} Infecção, mais modificadores.`),
    ability('infectious_tentacle', 'Tentáculo Infeccioso', 5, [1, 2, 3], 'target_turn', ({ phase }) => `Jogue 1 das 2 marcadas para evitar a punição. Só descartar: +${NEMESIS_OBJECTIVE_BALANCE.tentaclePartial[phase]}; nenhuma: +${NEMESIS_OBJECTIVE_BALANCE.failure[phase]} Infecção, mais modificadores.`),
    ability('contaminated_zone', 'Zona Contaminada', 3, [1, 2, 3], 'target_turn', () => 'O alvo pode pegar o lixo neste turno, mas cada retirada custa +6 Infecção. Agarrador continua ativo.'),
    ability('horde_command', 'Comando da Horda', 3, [1, 2, 3], 'full_round', () => 'Reforça 1 zumbi até o fim da próxima rodada: Agarrador +1 carta; Infectado +2 por falha; Devorador +15 HP de cura.'),
    ability('rocket_launcher', 'Lança-Foguetes', 4, [2, 3], 'full_round', ({ phase }) => `Alimentar a Zona de Impacto é permitido e custa +${phase === 3 ? 12 : 10} Infecção por carta nova nesta rodada.`),
    ability('parasite_regeneration', 'Regeneração Parasita', 2, [2, 3], 'immediate', () => 'Cura 100 HP do zumbi vivo com menor percentual de HP, sem superar seu máximo.'),
    ability('viral_reanimation', 'Reanimação Viral', 2, [2, 3], 'immediate', () => 'Um zumbi derrotado volta com metade da vida; na fase final, volta Mutado. Cada zumbi só pode reviver uma vez na batalha, e só há uma Reanimação por fase.'),
    ability('tentacle_barrage', 'Barragem de Tentáculos', 4, [3], 'target_turn', () => 'Faça 2 das 3 cartas marcadas sair legalmente da mão neste turno. Falha: +16 Infecção, mais modificadores.'),
    ability('stars_extermination', 'Extermínio S.T.A.R.S.', 4, [3], 'full_round', () => 'Nesta rodada, S.T.A.R.S. deve atacar o Nemesis e o parceiro deve alimentar o jogo escolhido. Cumprir ambos evita a punição; cumprir só um custa 8 Infecção; nenhum custa 16. Efeitos ativos podem aumentar esses custos.'),
    ability('omega_outbreak', 'Surto Ômega', 3, [3], 'full_round', () => 'Até o fim da próxima rodada, as falhas causam Infecção extra: 2 abaixo de 50, 4 entre 50 e 74, ou 6 a partir de 75. Anunciar o Surto não aumenta a barra.'),
  ],
});
