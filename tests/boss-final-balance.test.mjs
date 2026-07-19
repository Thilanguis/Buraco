import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyBossMeldTransition,
  advanceBossTurn,
  canBossCreateMeld,
  completeBossPlayerTurn,
  consumeBossDiscardSurcharge,
  createBossState,
  getBossChains,
  getBossCreditLimitQuote,
  getBossDiscardSurcharge,
  getBossInterdictAttempt,
  getBossMeldContribution,
  getBossNatureThreats,
  normalizeBossState,
  notifyBossCardDiscarded,
  resolveBossChoice,
  resolveBossDebugSpringCrownThreat,
  resolveBossInterdictAttempt,
  selectNextBossIntent,
} from '../js/boss/boss-engine.js';
import { dominatrixDefinition } from '../js/boss/bosses/dominatrix.js';
import {
  createUndoTransaction,
  restoreUndoTransaction,
} from '../js/game/undo-transaction.js';

const cards = (prefix, ranks, suit = '♣') => ranks.map((rank, index) => ({
  id: `${prefix}-${index}-${rank}`,
  rank,
  suit,
}));

function bossGame(id = 'dominadora', seed = 4321) {
  const mode = id === 'banker' ? 'boss_banker' : id === 'matriarca_esmeralda' ? 'boss_matriarca' : 'boss_dominadora';
  return {
    mode,
    variant: 'fechado',
    currentPlayer: 1,
    turnNumber: 1,
    stock: cards('stock', Array.from({ length: 63 }, (_, index) => String((index % 10) + 3)), '♠'),
    discard: [{ id: 'discard-4c', rank: '4', suit: '♣' }],
    players: [
      { id: 0, name: 'Biel', teamId: 0, hand: cards('p0', ['3', '4', '5', '6', '7', '8'], '♣') },
      { id: 1, name: 'BOT Luana', teamId: 0, hand: cards('p1', ['3', '4', '5', '6', '7', '8'], '♥') },
    ],
    teams: [
      {
        id: 0,
        playerIndexes: [0, 1],
        melds: [
          cards('meld-a', ['3', '4', '5', '6', '7', '8'], '♦'),
          cards('meld-b', ['7', '8', '9', '10', 'J', 'Q'], '♣'),
        ],
      },
      { id: 1, playerIndexes: [], melds: [] },
    ],
    deadChunksTaken: [0, 0],
    deadPiles: [[], []],
    boss: createBossState(id, seed),
  };
}

function applyAbility(state, abilityId, payload, phase = state.boss.phase) {
  state.boss.phase = phase;
  state.boss.phaseTransitions = Array.from({ length: phase }, (_, index) => index + 1);
  state.boss.currentIntent = {
    id: `test-${abilityId}-${state.boss.actionSequence}`,
    abilityId,
    name: abilityId,
    description: abilityId,
    duration: 'full_round',
    announcedPhase: phase,
    payload,
  };
  state.boss.bossFlow = {
    id: `flow-${abilityId}-${state.boss.actionSequence}`,
    stage: 'ability',
    queue: [],
    startedAt: 0,
    endsAt: 0,
    eventActionId: null,
    phase,
  };
  advanceBossTurn(state, Date.now());
  assert.equal(state.boss.bossFlow.stage, state.boss.pendingChoices.length ? 'choice' : 'players');
  return state.boss.lastEvent;
}

function establishMeldId(state, meldIndex = 0) {
  applyBossMeldTransition(state, { teamId: 0, meldIndex, cardsAdded: [] });
  return getBossMeldContribution(state, 0, meldIndex).meldId;
}

test('Resistencia ignora suja, persiste tiers e limita uma remocao por jogador e rodada', () => {
  const state = bossGame();
  state.boss.chainsByPlayer[0] = 4;

  applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'suja' });
  assert.equal(getBossChains(state, 0), 4);

  applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'suja', newKind: 'limpa' });
  assert.equal(getBossChains(state, 0), 3);
  applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'limpa', newKind: 'real' });
  assert.equal(getBossChains(state, 0), 3);
  assert.equal(getBossMeldContribution(state, 0, 0).dominatrixResistanceTier, 2);

  state.boss.roundNumber += 1;
  applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'real', newKind: 'asas' });
  assert.equal(getBossChains(state, 0), 2);
  const restored = JSON.parse(JSON.stringify(state));
  applyBossMeldTransition(restored, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'real', newKind: 'asas' });
  assert.equal(getBossChains(restored, 0), 2);
});

test('Mãos Atadas usa uma criacao compartilhada e Voltar restaura o consumo', () => {
  const state = bossGame();
  state.boss.currentIntent = {
    id: 'hands-team',
    abilityId: 'hands_tied',
    duration: 'full_round',
    payload: { teamMeldAvailable: true, consumedByPlayerId: null, consumedMeldId: null },
  };
  const transaction = createUndoTransaction(state, {}, { actorPlayerId: 0, actionType: 'meldNew' });
  assert.equal(canBossCreateMeld(state, 0), true);
  applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 2, isNewMeld: true, cardsAdded: [] });
  assert.equal(canBossCreateMeld(state, 0), false);
  assert.equal(canBossCreateMeld(state, 1), false);
  const restored = restoreUndoTransaction(transaction).state;
  assert.equal(canBossCreateMeld(restored, 0), true);
  assert.equal(canBossCreateMeld(restored, 1), true);
});

test('Posse exige coordenacao, pode ser libertada por tier e so entao ativa Resistencia', () => {
  const state = bossGame();
  const meldId = establishMeldId(state, 0);
  state.boss.chainsByPlayer[0] = 2;
  state.boss.possessions = [{
    id: 'possession-final',
    teamId: 0,
    meldIndex: 0,
    meldId,
    contributorPlayerIds: [],
    progressCardIds: [],
    required: 2,
    createdTier: 0,
    suppressedDamage: 0,
  }];

  applyBossMeldTransition(state, {
    teamId: 0,
    playerId: 0,
    meldIndex: 0,
    oldKind: 'simple',
    newKind: 'simple',
    cardsAdded: [{ id: 'possession-feed-a', rank: '9', suit: '♦' }],
  });
  assert.equal(state.boss.possessions[0].contributorPlayerIds.length, 1);
  assert.equal(getBossChains(state, 0), 2);

  const released = applyBossMeldTransition(state, {
    teamId: 0,
    playerId: 0,
    meldIndex: 0,
    oldKind: 'simple',
    newKind: 'limpa',
    cardsAdded: [{ id: 'possession-tier-card', rank: '10', suit: '♦' }],
  });
  assert.equal(released.possessionReleased, true);
  assert.equal(state.boss.possessions.length, 0);
  assert.equal(getBossChains(state, 0), 1);
});

test('Corrente excedente transborda somente na Fase 3', () => {
  const late = bossGame();
  late.boss.phase = 3;
  late.boss.phaseTransitions = [1, 2, 3];
  late.boss.chainsByPlayer = { 0: 4, 1: 2 };
  late.boss.pendingChoices = [{ id: 'late-chain', playerId: 0, type: 'forced_choice', options: ['chain'] }];
  resolveBossChoice(late, 0, 'chain');
  assert.equal(getBossChains(late, 0), 4);
  assert.equal(getBossChains(late, 1), 3);
  assert.ok(late.boss.eventLog.some((entry) => entry.type === 'chainOverflow'));

  const early = bossGame();
  early.boss.phase = 2;
  early.boss.phaseTransitions = [1, 2];
  early.boss.chainsByPlayer = { 0: 4, 1: 2 };
  early.boss.pendingChoices = [{ id: 'early-chain', playerId: 0, type: 'forced_choice', options: ['chain'] }];
  resolveBossChoice(early, 0, 'chain');
  assert.deepEqual(early.boss.chainsByPlayer, { 0: 4, 1: 2 });
  assert.equal(early.boss.eventLog.some((entry) => entry.type === 'chainOverflow'), false);
});

test('ordem aceita persiste, desobediencia cobra Corrente e impossibilidade externa cancela', () => {
  const disobeyed = bossGame();
  disobeyed.boss.activeOrders = [{
    id: 'no-new-order',
    sourceAbilityId: 'forced_choice',
    type: 'no_new_meld',
    targetPlayerId: 0,
    status: 'active',
  }];
  applyBossMeldTransition(disobeyed, { teamId: 0, playerId: 0, meldIndex: 2, isNewMeld: true, cardsAdded: [] });
  assert.equal(getBossChains(disobeyed, 0), 1);
  assert.equal(disobeyed.boss.activeOrders[0].status, 'disobeyed');

  const cancelled = bossGame();
  cancelled.boss.activeOrders = [{
    id: 'missing-meld-order',
    sourceAbilityId: 'forced_choice',
    type: 'feed_specific_meld',
    targetPlayerId: 0,
    meldId: 'meld-that-no-longer-exists',
    meldIndex: 8,
    status: 'active',
  }];
  normalizeBossState(cancelled);
  assert.equal(cancelled.boss.activeOrders[0].status, 'cancelled');
  assert.equal(getBossChains(cancelled, 0), 0);
});

test('Etiqueta de Ferro ativa antes do turno dos jogadores e pune descarte de outro naipe', () => {
  const state = bossGame();
  state.currentPlayer = 0;
  state.players[0].hand = [
    { id: 'etiquette-heart-a', rank: '3', suit: '♥' },
    { id: 'etiquette-heart-b', rank: '4', suit: '♥' },
    { id: 'etiquette-club-a', rank: '5', suit: '♣' },
  ];

  applyAbility(state, 'iron_etiquette', {
    targetPlayerId: 0,
    suit: '♥',
    suitLabel: 'Copas',
  });

  const order = state.boss.activeOrders.find((entry) => entry.sourceAbilityId === 'iron_etiquette');
  assert.ok(order, 'a ordem precisa estar ativa antes do descarte do alvo');
  assert.equal(order.status, 'active');

  const events = notifyBossCardDiscarded(state, 0, state.players[0].hand[2]);
  assert.equal(events.at(-1)?.status, 'disobeyed');
  assert.equal(getBossChains(state, 0), 1);
});

test('Etiqueta de Ferro usa naipe e diferencia obediencia, desobediencia e cancelamento externo', () => {
  const ability = dominatrixDefinition.abilities.find((entry) => entry.id === 'iron_etiquette');
  assert.ok(ability);
  assert.doesNotMatch(ability.describe({}), /alta|baixa|coringa/i);

  const makeOrderState = () => {
    const state = bossGame();
    state.players[0].hand = [
      { id: 'heart-a', rank: '3', suit: '♥' },
      { id: 'heart-b', rank: '4', suit: '♥' },
      { id: 'club-a', rank: '5', suit: '♣' },
    ];
    state.boss.activeOrders = [{
      id: 'etiquette-test',
      sourceAbilityId: 'iron_etiquette',
      type: 'discard_suit',
      targetPlayerId: 0,
      suit: '♥',
      suitLabel: 'Copas',
      eligibleCardIds: ['heart-a', 'heart-b'],
      ownOptionsConsumed: false,
      status: 'active',
    }];
    return state;
  };

  const obeyed = makeOrderState();
  notifyBossCardDiscarded(obeyed, 0, obeyed.players[0].hand[0]);
  assert.equal(obeyed.boss.activeOrders[0].status, 'obeyed');
  assert.equal(getBossChains(obeyed, 0), 0);

  const disobeyed = makeOrderState();
  notifyBossCardDiscarded(disobeyed, 0, disobeyed.players[0].hand[2]);
  assert.equal(disobeyed.boss.activeOrders[0].status, 'disobeyed');
  assert.equal(getBossChains(disobeyed, 0), 1);

  const cancelled = makeOrderState();
  cancelled.players[0].hand = cancelled.players[0].hand.filter((card) => card.suit !== '♥');
  normalizeBossState(cancelled);
  assert.equal(cancelled.boss.activeOrders[0].status, 'cancelled');
  assert.equal(getBossChains(cancelled, 0), 0);
});

test('Interdito consome a primeira evolucao, força obediencia com quatro Correntes e expira', () => {
  const obeyed = bossGame();
  obeyed.players[0].hand = cards('obey-evolution', ['9', 'K'], '♦');
  const meldId = establishMeldId(obeyed, 0);
  obeyed.boss.interdicts = [{ id: 'interdict-obey', meldIndex: 0, meldId, status: 'active', createdRound: 1 }];
  assert.equal(getBossInterdictAttempt(obeyed, 0, 0, 'simple', 'limpa').id, 'interdict-obey');
  const obeyEvent = resolveBossInterdictAttempt(obeyed, 0, 'interdict-obey', 'obey');
  assert.equal(obeyEvent.allowEvolution, false);
  assert.equal(getBossInterdictAttempt(obeyed, 0, 0, 'simple', 'limpa'), null);

  const disobeyed = bossGame();
  disobeyed.players[0].hand = cards('pay-evolution', ['9', 'K'], '♦');
  const disobeyedMeldId = establishMeldId(disobeyed, 0);
  disobeyed.boss.interdicts = [{ id: 'interdict-pay', meldIndex: 0, meldId: disobeyedMeldId, status: 'active', createdRound: 1 }];
  const payEvent = resolveBossInterdictAttempt(disobeyed, 0, 'interdict-pay', 'disobey');
  assert.equal(payEvent.allowEvolution, true);
  assert.equal(getBossChains(disobeyed, 0), 1);

  const dominated = bossGame();
  dominated.players[0].hand = cards('forced-evolution', ['9', 'K'], '♦');
  const dominatedMeldId = establishMeldId(dominated, 0);
  dominated.boss.chainsByPlayer[0] = 4;
  dominated.boss.interdicts = [{ id: 'interdict-four', meldIndex: 0, meldId: dominatedMeldId, status: 'active', createdRound: 1 }];
  const forced = resolveBossInterdictAttempt(dominated, 0, 'interdict-four', 'disobey');
  assert.equal(forced.decision, 'obey');
  assert.equal(forced.allowEvolution, false);

  const expired = bossGame();
  expired.players[0].hand = cards('expire-evolution', ['9', 'K'], '♦');
  const expiredMeldId = establishMeldId(expired, 0);
  expired.boss.interdicts = [{ id: 'interdict-expire', meldIndex: 0, meldId: expiredMeldId, status: 'active', createdRound: 1 }];
  completeBossPlayerTurn(expired, 0);
  completeBossPlayerTurn(expired, 1);
  assert.equal(expired.boss.interdicts[0].status, 'expired');
});

test('Interdito desobedecido aplica Chicote liquido e anula Resistencia da mesma evolucao', () => {
  const state = bossGame();
  state.boss.phase = 2;
  state.boss.chainsByPlayer[0] = 1;
  state.players[0].hand = [
    ...cards('interdict-evolve', ['2', '9', '10', 'J', 'Q', 'K', 'A'], '♦'),
    { id: 'interdict-discard', rank: '7', suit: '♥' },
  ];
  const meldId = establishMeldId(state, 0);
  const contribution = getBossMeldContribution(state, 0, 0);
  contribution.dominatrixResistanceTier = 1;
  state.boss.interdicts = [{ id: 'interdict-net-cost', meldIndex: 0, meldId, status: 'active', createdRound: 1 }];

  const decision = resolveBossInterdictAttempt(state, 0, 'interdict-net-cost', 'disobey');
  assert.equal(getBossChains(state, 0), 2);

  const evolution = applyBossMeldTransition(state, {
    teamId: 0,
    playerId: 0,
    meldIndex: 0,
    oldKind: 'limpa',
    newKind: 'real',
    cardsAdded: [],
    suppressDominatrixResistance: decision.decision === 'disobey',
  });

  assert.equal(evolution.chainsRemoved, 0);
  assert.equal(evolution.resistanceSuppressedByInterdict, true);
  assert.equal(getBossChains(state, 0), 2);
  assert.equal(getBossMeldContribution(state, 0, 0).dominatrixResistanceTier, 2);
});

test('Hierarquia nao existe no registro da Dominadora', () => {
  assert.equal(dominatrixDefinition.abilities.some((entry) => entry.id === 'hierarchy'), false);
});

test('Juros Fixos usa somente tres contratos na proporcao 25/50/25 e media aprovada', () => {
  const counts = { mild: 0, standard: 0, severe: 0 };
  let selectedContracts = 0;
  for (let seed = 1; seed <= 10000; seed += 1) {
    const state = bossGame('banker', seed);
    state.teams[0].melds = [];
    const intent = selectNextBossIntent(state);
    if (intent?.abilityId !== 'fixed_interest') continue;
    selectedContracts += 1;
    counts[intent.payload.contractTier] += 1;
    assert.ok([
      'mild:5:2',
      'standard:6:3',
      'severe:7:4',
    ].includes(`${intent.payload.contractTier}:${intent.payload.fullDebt}:${intent.payload.guaranteedDebt}`));
  }
  const average = (counts.mild * 5 + counts.standard * 6 + counts.severe * 7) / selectedContracts;
  assert.ok(selectedContracts > 3000);
  assert.ok(Math.abs(counts.mild / selectedContracts - 0.25) < 0.02);
  assert.ok(Math.abs(counts.standard / selectedContracts - 0.5) < 0.02);
  assert.ok(Math.abs(counts.severe / selectedContracts - 0.25) < 0.02);
  assert.equal(average, 6);
});

test('contrato sorteado sobrevive a reload e Voltar sem novo sorteio', () => {
  let state = null;
  for (let seed = 1; seed < 100 && !state; seed += 1) {
    const candidate = bossGame('banker', seed);
    candidate.teams[0].melds = [];
    if (selectNextBossIntent(candidate)?.abilityId === 'fixed_interest') state = candidate;
  }
  assert.ok(state);
  const payload = structuredClone(state.boss.currentIntent.payload);
  const reloaded = JSON.parse(JSON.stringify(state));
  normalizeBossState(reloaded);
  assert.deepEqual(reloaded.boss.currentIntent.payload, payload);

  const transaction = createUndoTransaction(state, {}, { actorPlayerId: 0, actionType: 'bossChoice' });
  state.boss.currentIntent.payload.fullDebt = 99;
  const restored = restoreUndoTransaction(transaction).state;
  assert.deepEqual(restored.boss.currentIntent.payload, payload);
});

test('Limite de Credito conta IDs unicos, antecipa jogada multipla e respeita teto', () => {
  const state = bossGame('banker');
  state.boss.creditLimit = {
    round: 1,
    allowance: 2,
    debtPerCard: 1,
    countedCardIds: [],
    chargedDebt: 0,
    maxCharge: 4,
    eventIds: [],
    status: 'active',
  };
  const firstCards = cards('credit-first', ['3', '4', '5', '6'], '♣');
  const quote = getBossCreditLimitQuote(state, firstCards);
  assert.equal(quote.debt, 2);
  assert.equal(quote.newCardIds.length, 4);
  applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, cardsAdded: firstCards });
  assert.equal(state.boss.danger, 2);
  assert.equal(state.boss.creditLimit.countedCardIds.length, 4);

  applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, cardsAdded: firstCards });
  assert.equal(state.boss.danger, 2);
  const extraCards = cards('credit-extra', ['7', '8', '9'], '♣');
  assert.equal(getBossCreditLimitQuote(state, extraCards).debt, 2);
  applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, cardsAdded: extraCards });
  assert.equal(state.boss.danger, 4);
  assert.equal(getBossCreditLimitQuote(state, [{ id: 'credit-over', rank: '10', suit: '♣' }]).debt, 0);
});

test('Voltar restaura contagem e Divida do Limite de Credito', () => {
  const state = bossGame('banker');
  state.boss.creditLimit = { round: 1, allowance: 0, debtPerCard: 1, countedCardIds: [], chargedDebt: 0, maxCharge: 4, eventIds: [], status: 'active' };
  const transaction = createUndoTransaction(state, {}, { actorPlayerId: 0, actionType: 'meldExtend' });
  applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, cardsAdded: [{ id: 'credit-undo', rank: '9', suit: '♦' }] });
  assert.equal(state.boss.danger, 1);
  const restored = restoreUndoTransaction(transaction).state;
  assert.equal(restored.boss.danger, 0);
  assert.deepEqual(restored.boss.creditLimit.countedCardIds, []);
  assert.equal(restored.boss.creditLimit.chargedDebt, 0);
});

test('Agio do Lixo cobra somente uma retirada confirmada e reload nao duplica', () => {
  const state = bossGame('banker');
  state.boss.phase = 2;
  state.boss.discardSurcharge = { amount: 4, createdRound: 1, status: 'active', consumedByPlayerId: null, resolvedEventId: null };
  const beforeCancel = structuredClone(state.boss.discardSurcharge);
  assert.ok(getBossDiscardSurcharge(state));
  assert.deepEqual(state.boss.discardSurcharge, beforeCancel);

  const event = consumeBossDiscardSurcharge(state, 0);
  assert.equal(event.amount, 4);
  assert.equal(state.boss.danger, 4);
  assert.equal(consumeBossDiscardSurcharge(state, 1), null);
  assert.equal(state.boss.danger, 4);

  const reloaded = JSON.parse(JSON.stringify(state));
  normalizeBossState(reloaded);
  assert.equal(getBossDiscardSurcharge(reloaded), null);
  assert.equal(consumeBossDiscardSurcharge(reloaded, 0), null);
  assert.equal(reloaded.boss.danger, 4);
});

test('Semente e Raiz falham sem cura, e a Raiz propaga somente na rodada seguinte', () => {
  const seedState = bossGame('matriarca_esmeralda');
  seedState.boss.hp = 1800;
  applyAbility(seedState, 'living_seed', { targetPlayerId: 0, cardId: seedState.players[0].hand[0].id });
  completeBossPlayerTurn(seedState, 0);
  assert.equal(seedState.boss.bloom, 1);
  assert.equal(seedState.boss.hp, 1800);

  const rootState = bossGame('matriarca_esmeralda');
  rootState.boss.hp = 1800;
  const meldId = establishMeldId(rootState, 0);
  applyAbility(rootState, 'hungry_root', { meldIndex: 0, meldId });
  completeBossPlayerTurn(rootState, 0);
  assert.equal(getBossNatureThreats(rootState).filter((entry) => entry.propagated).length, 0);
  completeBossPlayerTurn(rootState, 1);
  const propagated = getBossNatureThreats(rootState).filter((entry) => entry.status === 'active' && entry.propagated);
  assert.equal(rootState.boss.bloom, 1);
  assert.equal(rootState.boss.hp, 1800);
  assert.equal(propagated.length, 1);
  assert.equal(propagated[0].type, 'root');
  assert.equal(propagated[0].createdRound, 2);
  assert.equal(propagated[0].deadlineRound, 2);
});

test('Orvalho usa faixas por fase, conta IDs unicos e pode ser dissipado', () => {
  for (const [phase, baseHeal] of [[1, 150], [2, 150], [3, 180]]) {
    const state = bossGame('matriarca_esmeralda');
    state.boss.hp = 1000;
    applyAbility(state, 'restorative_dew', { baseHeal, reductionPerCard: 15, countedCardIds: [] }, phase);
    const played = cards(`dew-${phase}`, Array.from({ length: 20 }, () => '6'), '♣');
    applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, cardsAdded: played });
    applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, cardsAdded: played });
    assert.equal(state.boss.currentIntent.payload.countedCardIds.length, 20);
    completeBossPlayerTurn(state, 0);
    completeBossPlayerTurn(state, 1);
    assert.equal(state.boss.hp, 1000 - played.reduce((sum, card) => sum + (['8', '9', '10', 'J', 'Q', 'K'].includes(card.rank) ? 10 : 5), 0));
  }
});

test('Trepadeiras e Enxerto propagam sem cura e respeitam falhas independentes', () => {
  const vines = bossGame('matriarca_esmeralda');
  vines.boss.phase = 2;
  vines.boss.phaseTransitions = [1, 2];
  vines.boss.hp = 1700;
  const targets = [0, 1].map((meldIndex) => ({ meldIndex, meldId: establishMeldId(vines, meldIndex) }));
  applyAbility(vines, 'twin_vines', { targets, targetCount: 2 }, 2);
  completeBossPlayerTurn(vines, 0);
  completeBossPlayerTurn(vines, 1);
  assert.equal(vines.boss.hp, 1700);
  assert.equal(vines.boss.bloom, 2);
  assert.equal(getBossNatureThreats(vines).filter((entry) => entry.status === 'active' && entry.propagated).length, 1);

  const graft = bossGame('matriarca_esmeralda');
  graft.boss.phase = 2;
  graft.boss.phaseTransitions = [1, 2];
  graft.boss.hp = 1700;
  const graftTargets = [0, 1].map((meldIndex) => ({ meldIndex, meldId: establishMeldId(graft, meldIndex) }));
  applyAbility(graft, 'graft', { targets: graftTargets }, 2);
  applyBossMeldTransition(graft, { teamId: 0, playerId: 0, meldIndex: 0, cardsAdded: [{ id: 'graft-one-side', rank: '9', suit: '♦' }] });
  completeBossPlayerTurn(graft, 0);
  completeBossPlayerTurn(graft, 1);
  assert.equal(graft.boss.hp, 1690);
  assert.equal(graft.boss.bloom, 1);
  assert.equal(getBossNatureThreats(graft).filter((entry) => entry.status === 'active' && entry.propagated).length, 0);
});

test('Polen normal cura 40, Polen Real nao cura e Colheita usa as faixas finais', () => {
  const pollen = bossGame('matriarca_esmeralda');
  pollen.boss.hp = 1700;
  pollen.boss.natureThreats = [{ id: 'pollen-normal', type: 'pollen', targetPlayerId: 0, deadlinePlayerId: 0, cardId: pollen.players[0].hand[0].id, status: 'active', bloomAmount: 1, healAmount: 40 }];
  completeBossPlayerTurn(pollen, 0);
  assert.equal(pollen.boss.hp, 1740);
  assert.equal(pollen.boss.bloom, 1);

  const royal = bossGame('matriarca_esmeralda');
  royal.boss.hp = 1700;
  royal.boss.natureThreats = [{ id: 'pollen-royal', type: 'royal_pollen', targetPlayerId: 0, deadlinePlayerId: 0, cardId: royal.players[0].hand[0].id, status: 'active', bloomAmount: 1, healAmount: 0 }];
  completeBossPlayerTurn(royal, 0);
  assert.equal(royal.boss.hp, 1700);
  assert.equal(royal.boss.bloom, 1);

  for (const [handSize, heal, bloom] of [[7, 0, 0], [9, 60, 0], [11, 100, 1]]) {
    const state = bossGame('matriarca_esmeralda');
    state.boss.phase = 2;
    state.boss.phaseTransitions = [1, 2];
    state.boss.hp = 1500;
    state.players[0].hand = cards(`harvest-${handSize}`, Array.from({ length: handSize }, () => 'Q'), '♣');
    applyAbility(state, 'harvest', { targetPlayerId: 0 }, 2);
    completeBossPlayerTurn(state, 0);
    assert.equal(state.boss.hp, 1500 + heal);
    assert.equal(state.boss.bloom, bloom);
  }
});

test('Coroa prepara uma unica Raiz Fortalecida quando a ameaca marcada falha e reload nao duplica', () => {
  const state = bossGame('matriarca_esmeralda');
  state.boss.phase = 3;
  state.boss.phaseTransitions = [1, 2, 3];
  state.boss.hp = 1500;
  const meldIds = [0, 1].map((meldIndex) => establishMeldId(state, meldIndex));
  state.teams[0].melds.push(cards('meld-c', ['3', '4', '5', '6', '7', '8'], '♠'));
  const thirdMeldId = establishMeldId(state, 2);
  state.boss.natureThreats = [...meldIds, thirdMeldId].map((meldId, index) => ({
    id: `crown-failure-${index}`,
    type: 'root',
    meldId,
    meldIndex: index,
    deadlineRound: 1,
    status: 'active',
    bloomAmount: 1,
    healAmount: 0,
    progressCardIds: [],
  }));
  state.boss.springCrown = {
    id: 'crown-final',
    createdRound: 1,
    markedThreatId: 'crown-failure-0',
    markedThreatName: 'Raiz Faminta',
    status: 'active',
  };
  completeBossPlayerTurn(state, 0);
  completeBossPlayerTurn(state, 1);
  const propagated = getBossNatureThreats(state).filter((entry) => entry.status === 'active' && entry.propagated);
  assert.equal(propagated.length, 1);
  assert.equal(propagated[0].strengthened, true);
  assert.equal(propagated[0].requiredContributorCount, 2);
  assert.equal(state.boss.springCrown.status, 'root_active');
  assert.equal(state.boss.bloom, 3);
  assert.equal(state.boss.hp, 1500);

  applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: propagated[0].meldIndex, cardsAdded: [{ id: 'strong-root-a', rank: '9', suit: state.teams[0].melds[propagated[0].meldIndex][0].suit }] });
  assert.equal(state.boss.natureThreats.find((entry) => entry.id === propagated[0].id).status, 'active');
  applyBossMeldTransition(state, { teamId: 0, playerId: 1, meldIndex: propagated[0].meldIndex, cardsAdded: [{ id: 'strong-root-b', rank: '10', suit: state.teams[0].melds[propagated[0].meldIndex][0].suit }] });
  assert.equal(state.boss.natureThreats.find((entry) => entry.id === propagated[0].id).status, 'success');
  assert.equal(state.boss.springCrown.status, 'expired');

  const restored = JSON.parse(JSON.stringify(state));
  const eventCount = restored.boss.eventLog.filter((entry) => entry.type === 'naturePropagation').length;
  normalizeBossState(restored);
  assert.equal(restored.boss.eventLog.filter((entry) => entry.type === 'naturePropagation').length, eventCount);
  assert.equal(restored.boss.natureThreats.filter((entry) => entry.propagated).length, 1);

  const cancelled = bossGame('matriarca_esmeralda');
  cancelled.boss.phase = 3;
  cancelled.boss.phaseTransitions = [1, 2, 3];
  const cancelledMeldId = establishMeldId(cancelled, 0);
  cancelled.boss.natureThreats = [{
    id: 'crown-cancelled-target',
    type: 'root',
    meldId: cancelledMeldId,
    meldIndex: 0,
    status: 'active',
    progressCardIds: [],
  }];
  cancelled.boss.springCrown = {
    id: 'crown-cancelled',
    markedThreatId: 'crown-cancelled-target',
    markedThreatName: 'Raiz Faminta',
    status: 'active',
  };
  resolveBossDebugSpringCrownThreat(cancelled, 'cancelled');
  assert.equal(cancelled.boss.natureThreats[0].status, 'cancelled');
  assert.equal(cancelled.boss.springCrown.status, 'cancelled');
  assert.equal(cancelled.boss.pendingRootPropagation, null);
});
