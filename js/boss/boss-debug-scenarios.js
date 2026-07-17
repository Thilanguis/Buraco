import { createDeck } from '../deck.js';
import {
  createBossState,
  inspectBossAbilityEligibility,
  isValidBossSequence,
  normalizeBossState,
  queueDebugBossAbility,
  selectNextBossIntent,
} from './boss-engine.js';
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
  'suit_audit', 'pledge', 'collar', 'exposure', 'iron_etiquette', 'interdict',
  'living_seed', 'hungry_root', 'restorative_dew', 'twin_vines', 'graft',
  'discard_pollen', 'royal_bloom', 'emerald_cocoon', 'spring_crown',
]);
const TARGETED_PLAYER_ABILITIES = new Set([
  'collar', 'forced_choice', 'exposure', 'favorite', 'absolute_control',
  'break_will', 'harvest', 'living_seed',
]);
const TARGETED_MELD_ABILITIES = new Set([
  'pledge', 'possession', 'interdict', 'hungry_root', 'twin_vines', 'graft', 'royal_bloom',
]);

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
  const ids = explicit || [
    'interactive', 'success', 'failure',
    ...(OBJECTIVE_ABILITIES.has(abilityId) ? ['external_cancel'] : []),
    'reload', 'undo', 'bot',
  ];
  return ids.map((id) => VARIANTS[id]).filter(Boolean);
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
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function deterministicDeck() {
  return createDeck([...SUITS], [...RANKS]).slice().sort((left, right) => left.id.localeCompare(right.id));
}

function takeCard(pool, rank, suit) {
  const index = pool.findIndex((card) => (
    rank === 'JOKER'
      ? card.joker === true
      : !card.joker && String(card.rank) === String(rank) && card.suit === suit
  ));
  if (index < 0) throw new Error(`Carta oficial indisponivel para o cenario: ${rank} ${suit || ''}.`);
  return pool.splice(index, 1)[0];
}

function takeSequence(pool, suit, ranks) {
  return ranks.map((rank) => takeCard(pool, rank, suit));
}

function buildDeterministicZones() {
  const pool = deterministicDeck();
  const melds = [
    takeSequence(pool, '\u2663', ['3', '4', '5', '6', '7', '8', '9']),
    takeSequence(pool, '\u2665', ['3', '4', '5', '6', '7', '8', '9']),
  ];
  const hands = [
    takeSequence(pool, '\u2663', ['2', '10', 'J', 'Q', 'K', 'A'])
      .concat(takeSequence(pool, '\u2666', ['3', '4', '5', '6', '7'])),
    takeSequence(pool, '\u2665', ['2', '10', 'J', 'Q', 'K', 'A'])
      .concat(takeSequence(pool, '\u2660', ['3', '4', '5', '6', '7'])),
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

function configureAbilityState(state, abilityId) {
  const boss = state.boss;
  if (abilityId === 'break_will') boss.chainsByPlayer = { 0: 2, 1: 2 };
  if (abilityId === 'spring_crown') {
    boss.meldIdsByPosition = { '0:0': 'debug_meld_1', '0:1': 'debug_meld_2' };
    boss.meldIdsByCardId = {};
    state.teams[0].melds.forEach((meld, index) => meld.forEach((card) => {
      boss.meldIdsByCardId[card.id] = `debug_meld_${index + 1}`;
    }));
    boss.natureThreats = [{
      id: 'debug_root_active',
      type: 'root',
      status: 'active',
      meldIndex: 0,
      meldId: 'debug_meld_1',
      sourceIntentId: 'debug_previous_intent',
      activatedRound: Math.max(1, boss.roundNumber - 1),
    }];
  }
  if (abilityId === 'emerald_cocoon') boss.emeraldCocoon = null;
  if (abilityId === 'forced_choice') boss.chainsByPlayer = { 0: 0, 1: 0 };
}

function payloadMatchesTarget(payload, target) {
  if (!target || target === 'auto' || target === 'team') return true;
  if (target === 'human' || target === 'bot') {
    const expectedId = target === 'human' ? 0 : 1;
    const ids = [
      payload?.targetPlayerId,
      payload?.protectedPlayerId,
      payload?.punishedPlayerId,
      ...(payload?.lockedCards || []).map((entry) => entry.playerId),
    ].filter((id) => id != null);
    return ids.includes(expectedId);
  }
  const expectedIndex = target === 'meld_1' ? 0 : target === 'meld_2' ? 1 : null;
  if (expectedIndex == null) return true;
  const indexes = [payload?.meldIndex, ...(payload?.targets || []).map((entry) => entry?.meldIndex)].filter(Number.isInteger);
  return indexes.includes(expectedIndex);
}

function findSeedForTarget(state, abilityId, target) {
  if (!target || target === 'auto' || target === 'team') return inspectBossAbilityEligibility(state, abilityId);
  for (let seed = DEBUG_SEED; seed < DEBUG_SEED + 256; seed += 1) {
    state.boss.seed = seed;
    const eligibility = inspectBossAbilityEligibility(state, abilityId);
    if (eligibility.eligible && payloadMatchesTarget(eligibility.payload, target)) return eligibility;
  }
  return { eligible: false, reason: `Nenhum alvo legal corresponde a ${target} neste cenario.`, entry: null, payload: null };
}

function scenarioInstructions(ability, variant, eligibility, state) {
  const playerId = eligibility.payload?.targetPlayerId;
  const target = state.players.find((player) => player.id === playerId)?.name || 'definido pelo motor';
  const variantHint = {
    success: 'Cumpra a exigencia usando a menor jogada legal indicada pelo HUD.',
    failure: 'Encerre o prazo da habilidade sem cumprir a exigencia.',
    external_cancel: 'Altere legalmente o alvo antes do prazo e deixe a normalizacao cancelar apenas o efeito impossivel.',
    reload: 'Mantenha o efeito pendente e use Simular reload antes de agir.',
    undo: 'Execute uma acao legal e use Voltar para restaurar o snapshot transacional.',
    bot: 'O bot e o responsavel pelo alvo ou pela proxima acao automatizavel.',
  }[variant] || 'Siga o HUD e interaja normalmente com a habilidade pelo motor real.';
  return [
    `HABILIDADE: ${ability.name}`,
    `FASE: ${state.boss.phase}`,
    `ALVO: ${target}`,
    '',
    'COMO TESTAR:',
    variantHint,
    '',
    'ESPERADO:',
    ability.describe({ phase: state.boss.phase, ...(eligibility.payload || {}) }),
  ].join('\n');
}

function buildStandardScenario(_sourceState, definition, ability, options = {}) {
  const phase = resolveBossDebugPhase(definition.id, ability.id, options.phase);
  const variant = options.variant || 'interactive';
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

  const eligibility = findSeedForTarget(state, ability.id, target);
  if (!eligibility.eligible) throw new Error(eligibility.reason);
  queueDebugBossAbility(state, ability.id);
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
    preparedAt: 0,
  };

  const validation = validateBossDebugScenario(state, { bossId: definition.id, abilityId: ability.id, phase });
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  return {
    state,
    phase,
    targetPlayerId: eligibility.payload?.targetPlayerId ?? null,
    expectedIntent: { abilityId: ability.id, payload: clone(eligibility.payload) },
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

export function validateBossDebugScenario(state, { bossId, abilityId, phase } = {}) {
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
  if (!state.discard?.length) errors.push('O lixo esta vazio.');
  if ((state.players || []).some((player) => !player.hand?.length)) errors.push('Um jogador ficou sem mao para testar.');
  if (bossId && state.boss?.id !== bossId) errors.push(`Chefe incorreto: ${state.boss?.id || 'ausente'}.`);
  if (phase && state.boss?.phase !== Number(phase)) errors.push(`Fase incorreta: ${state.boss?.phase}.`);
  let eligibility = null;
  if (abilityId && !errors.length) {
    eligibility = inspectBossAbilityEligibility(state, abilityId);
    if (!eligibility.eligible) errors.push(eligibility.reason);
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

export function summarizeBossDebugResult(beforeState, afterState) {
  const before = beforeState?.boss || {};
  const after = afterState?.boss || {};
  const validation = validateBossDebugScenario(afterState);
  return [
    'RESULTADO OBSERVADO',
    `HP: ${before.hp ?? '-'} -> ${after.hp ?? '-'}`,
    `Perigo: ${before.danger ?? before.bloom ?? 0} -> ${after.danger ?? after.bloom ?? 0}`,
    `Intencao: ${before.currentIntent?.abilityId || '-'} -> ${after.currentIntent?.abilityId || '-'}`,
    `Evento: ${after.lastEvent?.actionId || after.lastEvent?.type || '-'}`,
    `Cartas totais: ${validation.totalCards}`,
    `Duplicacoes: ${validation.duplicates.length ? validation.duplicates.join(', ') : 'nenhuma'}`,
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
