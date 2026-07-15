export const BOSS_DAMAGE_BY_KIND = Object.freeze({
  simple: 0,
  suja: 100,
  limpa: 180,
  real: 300,
  asas: 450,
});

export const DEBT_REDUCTION_BY_KIND = Object.freeze({
  simple: 0,
  suja: 0,
  limpa: 4,
  real: 8,
  asas: 12,
});

const ability = (id, name, weight, phases, describe) => ({ id, name, weight, phases, describe });

export const bankerDefinition = Object.freeze({
  id: 'banker',
  mode: 'boss_banker',
  name: 'O Banqueiro',
  portrait: 'assets/images/boss-banqueiro.png',
  tableTheme: 'findom',
  deckTheme: 'cassino',
  accent: '#22c55e',
  maxHp: 2500,
  dangerType: 'debt',
  maxDanger: 100,
  phaseNames: Object.freeze({ 1: 'Crédito Fácil', 2: 'Auditoria', 3: 'Cobrança Final' }),
  phaseTaunts: Object.freeze({
    2: 'Agora cada erro de vocês será devidamente registrado.',
    3: 'Agora até o ar desta mesa tem juros.',
  }),
  damageReactions: Object.freeze([
    'Um bom golpe. Um péssimo investimento.',
    'Isso ainda vai render juros.',
    'Vocês acabaram de encarecer o contrato.',
  ]),
  finalSpeeches: Object.freeze({
    victory: 'Isto não estava previsto nos meus cálculos.',
    defeat: 'A dívida venceu antes de vocês entenderem o contrato.',
  }),
  phaseIntroAbilities: Object.freeze({
    2: Object.freeze(['suit_audit', 'pledge', 'compound_interest']),
    3: Object.freeze(['compound_interest', 'suit_audit', 'maintenance_fee']),
  }),
  abilities: Object.freeze([
    ability('fixed_interest', 'Juros Fixos', 5, [1, 2, 3], ({ phase }) => `A Dívida aumentará em ${phase === 3 ? 8 : 6} pontos.`),
    ability('maintenance_fee', 'Tarifa de Manutenção', 3, [1, 2, 3], ({ phase }) => `Cada jogador comprará ${phase === 3 ? 'até 2 cartas extras' : '1 carta extra'} no próximo turno.`),
    ability('credit_block', 'Bloqueio de Crédito', 3, [1, 2, 3], () => 'O lixo ficará bloqueado durante esta rodada.'),
    ability('suit_audit', 'Auditoria de Naipe', 4, [2, 3], ({ phase, suitLabel }) => `Baixem ${phase === 3 ? 4 : 3} cartas de ${suitLabel} nesta rodada.`),
    ability('pledge', 'Penhora', 2, [2, 3], () => 'Um jogo da equipe ficará bloqueado até a próxima cobrança.'),
    ability('compound_interest', 'Juros Compostos', 4, [2, 3], () => 'A Dívida aumentará conforme as cartas restantes nas mãos.'),
  ]),
});
