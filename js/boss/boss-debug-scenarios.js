import { createDeck } from '../deck.js';
import { advanceBossTurn, applyBossMeldTransition, beginBossTurn, completeBossPlayerTurn, createBossState, inspectBossAbilityEligibility, isValidBossSequence, normalizeBossState, queueDebugBossAbility, selectNextBossIntent } from './boss-engine.js';
import { getBossDefinition, listBossDefinitions } from './boss-registry.js';

const SUITS = Object.freeze(['\u2660', '\u2666', '\u2663', '\u2665']);
const RANKS = Object.freeze(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);
const DEBUG_SEED = 41721;

const VARIANTS = Object.freeze({
  interactive: { id: 'interactive', label: 'Interativo padrao' },
  success: { id: 'success', label: 'Preparado para sucesso' },
  failure: { id: 'failure', label: 'Preparado para falha' },
  external_cancel: { id: 'external_cancel', label: 'Cancelamento por mudanca externa' },
  no_target: { id: 'no_target', label: 'Sem alvo valido / fallback' },
  reload: { id: 'reload', label: 'Reload com efeito pendente' },
  undo: { id: 'undo', label: 'Voltar apos a acao' },
  bot: { id: 'bot', label: 'Bot como responsavel' },
});

const OBJECTIVE_ABILITIES = new Set([
  'suit_audit',
  'pledge',
  'collar',
  'exposure',
  'iron_etiquette',
  'living_seed',
  'hungry_root',
  'restorative_dew',
  'twin_vines',
  'graft',
  'discard_pollen',
  'royal_bloom',
  'emerald_cocoon',
  'spring_crown',
]);
const TARGETED_PLAYER_ABILITIES = new Set(['collar', 'forced_choice', 'exposure', 'favorite', 'absolute_control', 'break_will', 'harvest', 'living_seed']);
const TARGETED_MELD_ABILITIES = new Set(['pledge', 'possession', 'hungry_root', 'twin_vines', 'graft', 'royal_bloom']);
const NO_TARGET_ABILITIES = new Set(['pledge', 'collar', 'exposure', 'iron_etiquette', 'possession', 'living_seed', 'hungry_root', 'twin_vines', 'graft', 'discard_pollen', 'royal_bloom']);

const SPECIAL_VARIANTS = Object.freeze({
  fixed_interest: ['interactive', 'success', 'failure', 'reload', 'undo'],
  maintenance_fee: ['interactive', 'success', 'failure', 'reload', 'undo', 'bot'],
  credit_block: ['interactive', 'success', 'failure', 'reload'],
  forced_swap: ['interactive', 'success', 'reload', 'undo', 'bot'],
  forced_choice: ['interactive', 'success', 'failure', 'reload', 'undo', 'bot'],
  emerald_cocoon: ['interactive', 'success', 'failure', 'external_cancel', 'reload'],
  restorative_dew: ['interactive', 'success', 'failure', 'reload', 'undo'],
});

function variantsForAbility(abilityId) {
  const explicit = SPECIAL_VARIANTS[abilityId];
  const ids = explicit || ['interactive', 'success', 'failure', ...(OBJECTIVE_ABILITIES.has(abilityId) ? ['external_cancel'] : []), 'reload', 'undo', 'bot'];
  const withFallback = NO_TARGET_ABILITIES.has(abilityId) && !ids.includes('no_target') ? [...ids, 'no_target'] : ids;
  return withFallback.map((id) => VARIANTS[id]).filter(Boolean);
}

function targetsForAbility(abilityId) {
  const targets = [{ id: 'auto', label: 'Automatico' }];
  if (TARGETED_PLAYER_ABILITIES.has(abilityId)) {
    targets.push({ id: 'human', label: 'Jogador humano' }, { id: 'bot', label: 'Bot' });
  }
  if (TARGETED_MELD_ABILITIES.has(abilityId)) {
    targets.push({ id: 'meld_1', label: 'Jogo 1' }, { id: 'meld_2', label: 'Jogo 2' });
  }
  if (!TARGETED_PLAYER_ABILITIES.has(abilityId) && !TARGETED_MELD_ABILITIES.has(abilityId)) {
    targets.push({ id: 'team', label: 'Equipe' });
  }
  return targets;
}

function makeRegistry() {
  const registry = {};
  listBossDefinitions().forEach((definition) => {
    definition.abilities.forEach((ability) => {
      const key = `${definition.id}:${ability.id}`;
      registry[key] = Object.freeze({
        bossId: definition.id,
        abilityId: ability.id,
        variants: Object.freeze(variantsForAbility(ability.id)),
        targets: Object.freeze(targetsForAbility(ability.id)),
        build: (state, options) => buildStandardScenario(state, definition, ability, options),
      });
    });
  });
  return Object.freeze(registry);
}

export const bossDebugScenarioRegistry = makeRegistry();

function clone(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function deterministicDeck() {
  return createDeck([...SUITS], [...RANKS])
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id));
}

function takeCard(pool, rank, suit) {
  const index = pool.findIndex((card) => (rank === 'JOKER' ? card.joker === true : !card.joker && String(card.rank) === String(rank) && card.suit === suit));
  if (index < 0) throw new Error(`Carta oficial indisponivel para o cenario: ${rank} ${suit || ''}.`);
  return pool.splice(index, 1)[0];
}

function takeSequence(pool, suit, ranks) {
  return ranks.map((rank) => takeCard(pool, rank, suit));
}

function buildDeterministicZones() {
  const pool = deterministicDeck();
  const melds = [takeSequence(pool, '\u2663', ['3', '4', '5', '6', '7', '8', '9']), takeSequence(pool, '\u2665', ['3', '4', '5', '6', '7', '8', '9'])];
  const hands = [
    takeSequence(pool, '\u2663', ['2', '10', 'J', 'Q', 'K', 'A']).concat(takeSequence(pool, '\u2666', ['3', '4', '5', '6', '7'])),
    takeSequence(pool, '\u2665', ['2', '10', 'J', 'Q', 'K', 'A']).concat(takeSequence(pool, '\u2660', ['3', '4', '5', '6', '7'])),
  ];
  const discard = [takeCard(pool, '8', '\u2666')];
  const deadPiles = [pool.splice(0, 11), pool.splice(0, 11)];
  return { stock: pool, discard, deadPiles, hands, melds };
}

function baseScenarioState(definition) {
  const zones = buildDeterministicZones();
  return {
    mode: definition.mode,
    variant: 'fechado',
    deckTheme: definition.deckTheme,
    tableTheme: definition.tableTheme,
    currentPlayer: 0,
    turnNumber: 2,
    stock: zones.stock,
    discard: zones.discard,
    deadPiles: zones.deadPiles,
    deadChunksTaken: [0, 0],
    deadChunksMax: [2, 0],
    hasDrawnThisTurn: false,
    finished: false,
    winnerTeamId: null,
    requiredDiscardCard: null,
    pickedDiscardCardId: null,
    players: [
      { id: 0, name: 'Biel', teamId: 0, hand: zones.hands[0] },
      { id: 1, name: 'BOT Luana', teamId: 0, hand: zones.hands[1] },
    ],
    teams: [
      { id: 0, name: 'Cooperadores', playerIndexes: [0, 1], melds: zones.melds },
      { id: 1, name: definition.name, playerIndexes: [], melds: [] },
    ],
    boss: createBossState(definition.id, DEBUG_SEED),
  };
}

function replaceHandCardFromAvailableZone(state, playerId, rank, suit, replaceSuit) {
  const player = state.players.find((entry) => entry.id === playerId);

  if (!player) {
    throw new Error(`Jogador ${playerId} não encontrado no cenário debug.`);
  }

  // O jogador já possui uma carta adequada para contribuir.
  if (player.hand.some((card) => !card.joker && String(card.rank) === String(rank) && card.suit === suit)) {
    return;
  }

  const sourceZones = [
    { cards: state.stock, label: 'monte' },
    { cards: state.discard, label: 'lixo' },
    ...(state.deadPiles || []).map((cards, index) => ({ cards, label: `morto ${index + 1}` })),
    ...(state.players || [])
      .filter((entry) => entry.id !== playerId)
      .map((entry) => ({ cards: entry.hand, label: `mão de ${entry.name}` })),
  ];

  let source = null;

  for (const zone of sourceZones) {
    const index = (zone.cards || []).findIndex(
      (card) => !card.joker && String(card.rank) === String(rank) && card.suit === suit,
    );

    if (index >= 0) {
      source = { ...zone, index };
      break;
    }
  }

  if (!source) {
    throw new Error(`Não foi encontrada ${rank}${suit} em nenhuma zona segura para preparar a Posse.`);
  }

  const replaceIndex = player.hand.findIndex((card) => card.suit === replaceSuit);

  if (replaceIndex < 0) {
    throw new Error(`Não foi encontrada carta substituível na mão de ${player.name}.`);
  }

  const requiredCard = source.cards[source.index];
  const replacedCard = player.hand[replaceIndex];

  // Faz uma troca direta entre as zonas. Assim o cenário continua com
  // exatamente 108 cartas e nenhuma carta é duplicada ou perdida.
  source.cards[source.index] = replacedCard;
  player.hand[replaceIndex] = requiredCard;
}

function configureAbilityState(state, abilityId) {
  if (abilityId === 'possession') {
    // Biel já possui cartas de Paus, mas precisa conseguir
    // contribuir também caso o jogo de Copas seja possuído.
    replaceHandCardFromAvailableZone(state, 0, '10', '♥', '♦');

    // Luana já possui cartas de Copas, mas precisa conseguir
    // contribuir também caso o jogo de Paus seja possuído.
    replaceHandCardFromAvailableZone(state, 1, '10', '♣', '♠');
  }
  const boss = state.boss;
  if (abilityId === 'break_will') boss.chainsByPlayer = { 0: 2, 1: 2 };
  if (abilityId === 'spring_crown') {
    boss.meldIdsByPosition = { '0:0': 'debug_meld_1', '0:1': 'debug_meld_2' };
    boss.meldIdsByCardId = {};
    state.teams[0].melds.forEach((meld, index) =>
      meld.forEach((card) => {
        boss.meldIdsByCardId[card.id] = `debug_meld_${index + 1}`;
      }),
    );
    boss.natureThreats = [
      {
        id: 'debug_root_active',
        type: 'root',
        status: 'active',
        meldIndex: 0,
        meldId: 'debug_meld_1',
        sourceIntentId: 'debug_previous_intent',
        activatedRound: Math.max(1, boss.roundNumber - 1),
      },
    ];
  }
  if (abilityId === 'emerald_cocoon') boss.emeraldCocoon = null;
  if (abilityId === 'forced_choice') boss.chainsByPlayer = { 0: 0, 1: 0 };
}

function moveCardsToStock(state, cards = []) {
  state.stock.push(...cards.filter(Boolean));
}

function configureNoTargetState(state, abilityId) {
  if (TARGETED_MELD_ABILITIES.has(abilityId) || ['collar', 'exposure', 'living_seed', 'twin_vines', 'graft', 'royal_bloom'].includes(abilityId)) {
    state.teams[0].melds.forEach((meld) => moveCardsToStock(state, meld));
    state.teams[0].melds = [];
  }
  if (['collar', 'exposure', 'living_seed', 'royal_bloom'].includes(abilityId)) {
    state.players.forEach((player) => {
      const kept = player.hand.slice(0, 1);
      moveCardsToStock(state, player.hand.slice(1));
      player.hand = kept;
    });
  }
  if (abilityId === 'iron_etiquette') {
    state.players.forEach((player) => {
      moveCardsToStock(state, player.hand);
      player.hand = [];
    });
  }
  if (['discard_pollen', 'royal_bloom'].includes(abilityId)) {
    moveCardsToStock(state, state.discard);
    state.discard = [];
  }
  if (['royal_bloom'].includes(abilityId)) {
    state.boss.natureThreats = [];
  }
}

function configureVariantState(state, abilityId, variant) {
  if (variant === 'bot') {
    state.currentPlayer = 1;
    state.turnNumber = Math.max(2, state.turnNumber + 1);
  }
  if (variant === 'success') state.hasDrawnThisTurn = true;
  if (variant === 'failure') {
    state.boss.playersActedThisRound = [1];
    state.currentPlayer = 0;
  }
  if (variant === 'no_target') configureNoTargetState(state, abilityId);
}

function scenarioExpected(state, abilityId, variant) {
  const expected = {
    totalCards: 108,
    duplicateCardCount: 0,
    turnAdvanced: ['failure', 'bot'].includes(variant),
  };
  if (variant === 'failure') expected.threatStatus = 'failed';
  if (variant === 'external_cancel') expected.threatStatus = 'cancelled';
  if (variant === 'no_target') {
    expected.forcedAbilityRejected = abilityId;
    expected.fallbackSelected = true;
  }
  return expected;
}

function payloadMatchesTarget(payload, target) {
  if (!target || target === 'auto' || target === 'team') return true;
  if (target === 'human' || target === 'bot') {
    const expectedId = target === 'human' ? 0 : 1;
    const ids = [payload?.targetPlayerId, payload?.protectedPlayerId, payload?.punishedPlayerId, ...(payload?.lockedCards || []).map((entry) => entry.playerId)].filter((id) => id != null);
    return ids.includes(expectedId);
  }
  const expectedIndex = target === 'meld_1' ? 0 : target === 'meld_2' ? 1 : null;
  if (expectedIndex == null) return true;
  const indexes = [payload?.meldIndex, ...(payload?.targets || []).map((entry) => entry?.meldIndex)].filter(Number.isInteger);
  return indexes.includes(expectedIndex);
}

function findSeedForTarget(state, abilityId, target) {
  if (!target || target === 'auto' || target === 'team') {
    // No Laboratório, Interdito precisa ser testável pelo jogador humano.
    // O cenário base possui um jogo de Paus evoluível por Biel e um jogo de
    // Copas evoluível pelo bot. Sem esta preferência, o sorteio podia marcar
    // o jogo do bot e deixar o usuário sem qualquer forma de disparar a escolha.
    if (abilityId === 'interdict') {
      for (let seed = DEBUG_SEED; seed < DEBUG_SEED + 256; seed += 1) {
        state.boss.seed = seed;
        const eligibility = inspectBossAbilityEligibility(state, abilityId);
        if (eligibility.eligible && eligibility.payload?.eligiblePlayerIds?.includes(0)) {
          return eligibility;
        }
      }
    }

    return inspectBossAbilityEligibility(state, abilityId);
  }

  for (let seed = DEBUG_SEED; seed < DEBUG_SEED + 256; seed += 1) {
    state.boss.seed = seed;
    const eligibility = inspectBossAbilityEligibility(state, abilityId);
    if (eligibility.eligible && payloadMatchesTarget(eligibility.payload, target)) return eligibility;
  }
  return { eligible: false, reason: `Nenhum alvo legal corresponde a ${target} neste cenario.`, entry: null, payload: null };
}

function scenarioInstructions(ability, variant, eligibility, state) {
  if (ability.id === 'final_order') {
    return [
      'HABILIDADE: Ordem Final',
      `FASE: ${state.boss.phase}`,
      'ALVO: os dois cooperadores',
      '',
      'COMO TESTAR:',
      '1. Clique em Executar sucesso para encerrar a rodada preparada e criar as duas escolhas.',
      '2. Biel escolhe entre Comprar 2 cartas presas ou Receber 1 Chicote.',
      '3. Depois, use Executar acao do bot para a Luana resolver a escolha dela.',
      '',
      'ESPERADO:',
      'A partida permanece bloqueada ate as duas escolhas terminarem. Se a opcao Prender 1 carta for escolhida, o HUD, a mao e o historico devem identificar exatamente qual carta ficou presa.',
    ].join('\n');
  }
  const playerId = eligibility.payload?.targetPlayerId;
  const target = state.players.find((player) => player.id === playerId)?.name || 'definido pelo motor';
  const variantHint =
    {
      success: 'Cumpra a exigencia usando a menor jogada legal indicada pelo HUD.',
      failure: 'Encerre o prazo da habilidade sem cumprir a exigencia.',
      external_cancel: 'Altere legalmente o alvo antes do prazo e deixe a normalizacao cancelar apenas o efeito impossivel.',
      reload: 'Mantenha o efeito pendente e use Simular reload antes de agir.',
      undo: 'Execute uma acao legal e use Voltar para restaurar o snapshot transacional.',
      bot: 'O bot e o responsavel pelo alvo ou pela proxima acao automatizavel.',
      no_target: 'A habilidade solicitada nao possui alvo; execute para confirmar a rejeicao e o fallback legal.',
    }[variant] || 'Siga o HUD e interaja normalmente com a habilidade pelo motor real.';
  return [`HABILIDADE: ${ability.name}`, `FASE: ${state.boss.phase}`, `ALVO: ${target}`, '', 'COMO TESTAR:', variantHint, '', 'ESPERADO:', ability.describe({ phase: state.boss.phase, ...(eligibility.payload || {}) })].join('\n');
}

function buildStandardScenario(_sourceState, definition, ability, options = {}) {
  const variant = options.variant || 'interactive';
  let phase = resolveBossDebugPhase(definition.id, ability.id, options.phase);
  if (variant === 'no_target' && options.phase === 'auto' && definition.id === 'dominadora' && ability.phases.includes(2)) phase = 2;
  const target = options.target || (variant === 'bot' ? 'bot' : 'auto');
  if (!variantsForAbility(ability.id).some((entry) => entry.id === variant)) {
    throw new Error(`${ability.name} nao oferece a variante ${variant}.`);
  }
  if (!targetsForAbility(ability.id).some((entry) => entry.id === target)) {
    throw new Error(`${ability.name} nao oferece o alvo ${target}.`);
  }

  const state = baseScenarioState(definition);
  state.boss.phase = phase;
  state.boss.phaseTransitions = Array.from({ length: phase }, (_, index) => index + 1);
  state.boss.roundNumber = phase === 1 ? 1 : phase === 2 ? 3 : 5;
  state.boss.playersActedThisRound = [];
  state.boss.phaseIntroPending = null;
  state.boss.currentIntent = null;
  state.boss.pendingChoices = [];
  state.boss.effects = [];
  state.boss.bossFlow = null;
  configureAbilityState(state, ability.id);
  configureVariantState(state, ability.id, variant);

  const eligibility = findSeedForTarget(state, ability.id, target);
  if (variant !== 'no_target' && !eligibility.eligible) throw new Error(eligibility.reason);
  if (variant === 'no_target' && eligibility.eligible) throw new Error(`${ability.name} ainda encontrou um alvo no cenario sem alvo.`);
  queueDebugBossAbility(state, ability.id);
  if (variant === 'no_target') state.boss.debugFallbackOnIneligible = true;
  state.debugScenario = {
    version: 1,
    active: true,
    bossId: definition.id,
    phase,
    abilityId: ability.id,
    variant,
    target,
    seed: state.boss.seed,
    pauseAutomation: true,
    executionCount: 0,
    expected: scenarioExpected(state, ability.id, variant),
    preparedAt: 0,
  };

  const validation = validateBossDebugScenario(state, { bossId: definition.id, abilityId: ability.id, phase, variant });
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  return {
    state,
    phase,
    targetPlayerId: eligibility.payload?.targetPlayerId ?? null,
    expectedIntent: variant === 'no_target' ? null : { abilityId: ability.id, payload: clone(eligibility.payload) },
    expected: clone(state.debugScenario.expected),
    instructions: scenarioInstructions(ability, variant, eligibility, state),
    invariants: validation,
  };
}

export function getBossDebugCatalog() {
  return listBossDefinitions().map((definition) => ({
    id: definition.id,
    mode: definition.mode,
    name: definition.name,
    phases: [1, 2, 3],
    abilities: definition.abilities.map((ability) => ({
      id: ability.id,
      name: ability.name,
      phases: [...ability.phases],
      weight: ability.weight,
      variants: variantsForAbility(ability.id),
      targets: targetsForAbility(ability.id),
    })),
  }));
}

export function listBossDebugScenarios({ bossId, abilityId }) {
  return [...(bossDebugScenarioRegistry[`${bossId}:${abilityId}`]?.variants || [])];
}

export function listBossDebugTargets({ bossId, abilityId }) {
  return [...(bossDebugScenarioRegistry[`${bossId}:${abilityId}`]?.targets || [])];
}

export function resolveBossDebugPhase(bossId, abilityId, requestedPhase = 'auto') {
  const definition = getBossDefinition(bossId);
  const ability = definition?.abilities?.find((entry) => entry.id === abilityId);
  if (!definition || !ability) throw new Error(`Cenario desconhecido: ${bossId}:${abilityId}.`);
  if (requestedPhase === 'auto' || requestedPhase == null || requestedPhase === '') return Math.min(...ability.phases);
  const phase = Number(requestedPhase);
  if (!ability.phases.includes(phase)) throw new Error(`${ability.name} nao e elegivel na Fase ${phase}.`);
  return phase;
}

export function buildBossDebugScenario(sourceState, options = {}) {
  const definition = getBossDefinition(options.bossId);
  const ability = definition?.abilities?.find((entry) => entry.id === options.abilityId);
  const scenario = bossDebugScenarioRegistry[`${options.bossId}:${options.abilityId}`];
  if (!definition || !ability || !scenario) throw new Error(`Cenario nao registrado: ${options.bossId}:${options.abilityId}.`);
  return scenario.build(sourceState, options);
}

function collectCardsWithZones(state) {
  const entries = [];
  const add = (cards, zone) => (cards || []).forEach((card) => entries.push({ card, zone }));
  add(state.stock, 'stock');
  add(state.discard, 'discard');
  (state.deadPiles || []).forEach((pile, index) => add(pile, `dead:${index}`));
  (state.players || []).forEach((player) => add(player.hand, `hand:${player.id}`));
  (state.teams || []).forEach((team) => (team.melds || []).forEach((meld, index) => add(meld, `meld:${team.id}:${index}`)));
  return entries;
}

export function validateBossDebugScenario(state, { bossId, abilityId, phase, variant } = {}) {
  const errors = [];
  const entries = collectCardsWithZones(state);
  const ids = entries.map(({ card }) => card?.id).filter(Boolean);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (entries.some(({ card }) => !card?.id)) errors.push('Existem cartas sem ID estavel.');
  if (duplicates.length) errors.push(`Cartas duplicadas: ${[...new Set(duplicates)].join(', ')}.`);
  if (entries.length !== 108) errors.push(`Total inconsistente de cartas: ${entries.length}/108.`);
  (state.teams?.[0]?.melds || []).forEach((meld, index) => {
    if (!isValidBossSequence(meld)) errors.push(`Jogo ${index + 1} e invalido.`);
  });
  if (variant !== 'no_target' && !state.discard?.length) errors.push('O lixo esta vazio.');
  if (variant !== 'no_target' && (state.players || []).some((player) => !player.hand?.length)) errors.push('Um jogador ficou sem mao para testar.');
  if (bossId && state.boss?.id !== bossId) errors.push(`Chefe incorreto: ${state.boss?.id || 'ausente'}.`);
  if (phase && state.boss?.phase !== Number(phase)) errors.push(`Fase incorreta: ${state.boss?.phase}.`);
  let eligibility = null;
  if (abilityId && !errors.length) {
    eligibility = inspectBossAbilityEligibility(state, abilityId);
    if (variant === 'no_target' && eligibility.eligible) errors.push(`${abilityId} encontrou alvo quando deveria usar fallback.`);
    if (variant !== 'no_target' && !eligibility.eligible) errors.push(eligibility.reason);
  }
  return {
    valid: errors.length === 0,
    errors,
    totalCards: entries.length,
    uniqueCardIds: new Set(ids).size,
    duplicates: [...new Set(duplicates)],
    eligibility,
  };
}

export function simulateBossDebugReload(state) {
  const restored = JSON.parse(JSON.stringify(state));
  normalizeBossState(restored);
  return restored;
}

export function createBossDebugSnapshot(state) {
  return JSON.stringify(state);
}

export function restoreBossDebugSnapshot(snapshot) {
  const restored = JSON.parse(snapshot);
  normalizeBossState(restored);
  return restored;
}

function driveBossPresentationToPlayers(state) {
  if (!state.boss?.bossFlow) {
    beginBossTurn(state, {
      first: state.boss?.roundNumber === 1,
      now: Date.now(),
      debug: true,
    });
  }
  let guard = 0;
  while (state.boss?.bossFlow && state.boss.bossFlow.stage !== 'players' && guard < 12) {
    advanceBossTurn(state, Math.max(Date.now(), Number(state.boss.bossFlow.endsAt) || 0) + 1);
    guard += 1;
  }
}

function addCardToLegalMeld(state, playerId, preferredCardId = null, preferredMeldIndex = null) {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) return null;
  const cards = preferredCardId ? player.hand.filter((card) => card.id === preferredCardId) : [...player.hand];
  const indexes = Number.isInteger(preferredMeldIndex) ? [preferredMeldIndex] : state.teams[0].melds.map((_, index) => index);
  for (const card of cards) {
    for (const meldIndex of indexes) {
      const meld = state.teams[0].melds[meldIndex];
      if (!meld || !isValidBossSequence([...meld, card])) continue;
      player.hand = player.hand.filter((entry) => entry.id !== card.id);
      meld.push(card);
      applyBossMeldTransition(state, {
        teamId: 0,
        playerId,
        meldIndex,
        oldKind: 'simple',
        newKind: 'simple',
        cardsAdded: [card],
      });
      return { playerId, meldIndex, cardIds: [card.id] };
    }
  }
  return null;
}

function executeMinimalSuccess(state) {
  const intent = state.boss?.currentIntent;
  if (!intent) return { executed: false, reason: 'A habilidade nao gerou uma intencao ativa.' };
  if (intent.abilityId === 'final_order') {
    finishCurrentDebugRound(state);
    const choices = state.boss?.pendingChoices || [];
    return {
      executed: choices.length === 2,
      action: 'final_order_choices_created',
      choiceTypes: choices.map((choice) => choice.type),
    };
  }
  const payload = intent.payload || {};
  if (payload.cardId && payload.targetPlayerId != null) {
    const moved = addCardToLegalMeld(state, payload.targetPlayerId, payload.cardId);
    if (moved) return { executed: true, action: 'marked_card_played', ...moved };
  }
  const targets = payload.targets || [];
  const targetIndexes = [payload.meldIndex, ...targets.map((entry) => entry?.meldIndex)].filter(Number.isInteger);
  for (const meldIndex of targetIndexes) {
    for (const player of state.players) {
      const moved = addCardToLegalMeld(state, player.id, null, meldIndex);
      if (moved) return { executed: true, action: 'target_meld_fed', ...moved };
    }
  }
  if (intent.abilityId === 'restorative_dew') {
    const moves = [];
    for (let count = 0; count < 6; count += 1) {
      const moved = state.players.map((player) => addCardToLegalMeld(state, player.id)).find(Boolean);
      if (!moved) break;
      moves.push(moved);
    }
    return { executed: moves.length > 0, action: 'dew_cards_played', moves };
  }
  return { executed: false, reason: 'Este objetivo permanece disponivel para teste manual no estado preparado.' };
}

function invalidateCurrentTarget(state) {
  const payload = state.boss?.currentIntent?.payload || {};
  if (payload.discardCardId && state.discard.at(-1)?.id === payload.discardCardId) {
    const replacement = state.stock.pop();
    if (replacement) state.discard.push(replacement);
    normalizeBossState(state);
    return { executed: true, action: 'discard_top_changed' };
  }
  if (payload.cardId && payload.targetPlayerId != null) {
    const player = state.players.find((entry) => entry.id === payload.targetPlayerId);
    const index = player?.hand?.findIndex((card) => card.id === payload.cardId) ?? -1;
    if (index >= 0) state.stock.push(...player.hand.splice(index, 1));
    normalizeBossState(state);
    return { executed: index >= 0, action: 'target_card_removed' };
  }
  const meldIndex = Number.isInteger(payload.meldIndex) ? payload.meldIndex : payload.targets?.[0]?.meldIndex;
  if (Number.isInteger(meldIndex) && state.teams[0].melds[meldIndex]) {
    state.stock.push(...state.teams[0].melds.splice(meldIndex, 1)[0]);
    normalizeBossState(state);
    return { executed: true, action: 'target_meld_removed' };
  }
  normalizeBossState(state);
  return { executed: false, reason: 'O alvo desta habilidade nao admite cancelamento externo automatico.' };
}

function finishCurrentDebugRound(state) {
  for (const player of state.players || []) {
    if (!state.boss?.playersActedThisRound?.includes(player.id)) completeBossPlayerTurn(state, player.id);
  }
}

export function executeBossDebugScenarioVariant(state) {
  if (!state?.debugScenario?.active) throw new Error('Nenhum cenario do Laboratorio esta ativo.');
  const scenario = state.debugScenario;
  driveBossPresentationToPlayers(state);
  let result = { executed: true, action: 'presentation_completed' };
  if (scenario.variant === 'success') {
    result = executeMinimalSuccess(state);
    if (result.executed && state.boss?.currentIntent && !['living_seed', 'discard_pollen', 'exposure'].includes(scenario.abilityId)) {
      finishCurrentDebugRound(state);
    }
  } else if (scenario.variant === 'failure') {
    finishCurrentDebugRound(state);
    result = { executed: true, action: 'deadline_advanced' };
  } else if (scenario.variant === 'external_cancel') {
    result = invalidateCurrentTarget(state);
  } else if (scenario.variant === 'no_target') {
    const requestedAbilityId = scenario.abilityId;
    const selectedAbilityId = state.boss?.currentIntent?.abilityId || state.boss?.lastAbilityId || null;
    result = {
      executed: !!selectedAbilityId && selectedAbilityId !== requestedAbilityId,
      action: 'fallback_selected',
      requestedAbilityId,
      selectedAbilityId,
    };
  }
  scenario.executionCount = (scenario.executionCount || 0) + 1;
  scenario.lastExecution = { ...result, at: Date.now() };
  return result;
}

function observedDebugValues(beforeState, afterState) {
  const beforeBoss = beforeState?.boss || {};
  const afterBoss = afterState?.boss || {};
  const validation = validateBossDebugScenario(afterState, { variant: afterState?.debugScenario?.variant });
  const latestThreat = [...(afterBoss.natureThreats || [])].reverse().find((entry) => entry.status !== 'active');
  return {
    hpDelta: (afterBoss.hp || 0) - (beforeBoss.hp || 0),
    dangerDelta: (afterBoss.danger || 0) - (beforeBoss.danger || 0),
    bloomDelta: (afterBoss.bloom || 0) - (beforeBoss.bloom || 0),
    threatStatus: latestThreat?.status || null,
    turnAdvanced: (afterState?.turnNumber || 0) > (beforeState?.turnNumber || 0) || (afterBoss.roundNumber || 0) > (beforeBoss.roundNumber || 0),
    activeBlock: !!afterBoss.currentIntent || !!afterBoss.pendingChoices?.length,
    totalCards: validation.totalCards,
    duplicateCardCount: validation.duplicates.length,
    selectedAbilityId: afterBoss.currentIntent?.abilityId || afterBoss.lastAbilityId || null,
  };
}

export function compareBossDebugExpectations(beforeState, afterState, expected = afterState?.debugScenario?.expected || {}) {
  const observed = observedDebugValues(beforeState, afterState);
  const checks = [];
  const add = (label, expectedValue, observedValue, ok = expectedValue === observedValue) => {
    checks.push({ label, expected: expectedValue, observed: observedValue, ok });
  };
  if ('hpDelta' in expected) add('HP', expected.hpDelta, observed.hpDelta);
  if ('dangerDelta' in expected) add('Perigo', expected.dangerDelta, observed.dangerDelta);
  if ('bloomDelta' in expected) add('Flores', expected.bloomDelta, observed.bloomDelta);
  if ('threatStatus' in expected) add('Ameaca', expected.threatStatus, observed.threatStatus);
  if ('turnAdvanced' in expected) add('Turno avancou', expected.turnAdvanced, observed.turnAdvanced);
  if ('activeBlock' in expected) add('Bloqueio ativo', expected.activeBlock, observed.activeBlock);
  if ('totalCards' in expected) add('Cartas totais', expected.totalCards, observed.totalCards);
  if ('duplicateCardCount' in expected) add('Duplicacoes', expected.duplicateCardCount, observed.duplicateCardCount);
  if (expected.fallbackSelected) {
    add('Fallback legal', true, observed.selectedAbilityId, !!observed.selectedAbilityId && observed.selectedAbilityId !== expected.forcedAbilityRejected);
  }
  return { observed, checks, ok: checks.every((entry) => entry.ok) };
}

export function summarizeBossDebugResult(beforeState, afterState) {
  const before = beforeState?.boss || {};
  const after = afterState?.boss || {};
  const validation = validateBossDebugScenario(afterState, { variant: afterState?.debugScenario?.variant });
  const comparison = compareBossDebugExpectations(beforeState, afterState);
  const expectationLines = comparison.checks.map((check) => `${check.ok ? 'OK' : 'ERRO'} ${check.label}: esperado ${check.expected}, observado ${check.observed}`);
  return [
    'RESULTADO OBSERVADO',
    `HP: ${before.hp ?? '-'} -> ${after.hp ?? '-'}`,
    `Perigo: ${before.danger ?? before.bloom ?? 0} -> ${after.danger ?? after.bloom ?? 0}`,
    `Intencao: ${before.currentIntent?.abilityId || '-'} -> ${after.currentIntent?.abilityId || '-'}`,
    `Evento: ${after.lastEvent?.actionId || after.lastEvent?.type || '-'}`,
    `Cartas totais: ${validation.totalCards}`,
    `Duplicacoes: ${validation.duplicates.length ? validation.duplicates.join(', ') : 'nenhuma'}`,
    ...expectationLines,
    validation.valid ? 'OK - estado consistente' : `ATENCAO - ${validation.errors.join(' ')}`,
  ].join('\n');
}

export function runBossDebugSweep() {
  const results = [];
  for (const definition of listBossDefinitions()) {
    for (const ability of definition.abilities) {
      try {
        const built = buildBossDebugScenario(null, {
          bossId: definition.id,
          abilityId: ability.id,
          phase: 'auto',
          variant: 'interactive',
          target: 'auto',
        });
        const intent = selectNextBossIntent(built.state, { debug: true });
        results.push({ bossId: definition.id, abilityId: ability.id, ok: intent?.abilityId === ability.id, reason: intent ? '' : 'A intencao nao foi criada.' });
      } catch (error) {
        results.push({ bossId: definition.id, abilityId: ability.id, ok: false, reason: error.message });
      }
    }
  }
  return {
    results,
    total: results.length,
    passed: results.filter((entry) => entry.ok).length,
    failed: results.filter((entry) => !entry.ok),
  };
}
