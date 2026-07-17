import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyBossMeldTransition,
  chooseBossFixedInterestBotOption,
  createBossState,
  getBossMeldEvolutionOptions,
  normalizeBossState,
  shouldBossBotAcceptCreditPlay,
  shouldBossBotTakeDiscard,
} from '../js/boss/boss-engine.js';
import { createUndoTransaction, restoreUndoTransaction } from '../js/game/undo-transaction.js';

const cards = (prefix, ranks, suit = '♣') => ranks.map((rank, index) => ({
  id: `${prefix}-${index}-${rank}`,
  rank,
  suit,
}));

function game(bossId = 'banker') {
  const mode = bossId === 'dominadora' ? 'boss_dominadora' : 'boss_banker';
  return {
    mode,
    variant: 'fechado',
    currentPlayer: 0,
    turnNumber: 1,
    stock: cards('stock', Array.from({ length: 50 }, (_, index) => String((index % 10) + 3)), '♠'),
    discard: [{ id: 'discard-top', rank: '4', suit: '♣' }],
    players: [
      { id: 0, name: 'Biel', teamId: 0, hand: cards('p0', ['3', '4', '5', '6', '7', '8'], '♣') },
      { id: 1, name: 'BOT Luana', teamId: 0, hand: cards('p1', ['3', '4', '5', '6', '7', '8'], '♥') },
    ],
    teams: [{ id: 0, playerIndexes: [0, 1], melds: [] }, { id: 1, playerIndexes: [], melds: [] }],
    deadChunksTaken: [0, 0],
    deadPiles: [[], []],
    boss: createBossState(bossId, 9191),
  };
}

function activateCredit(state, danger = 0, overrides = {}) {
  state.boss.danger = danger;
  state.boss.creditLimit = {
    round: state.boss.roundNumber,
    allowance: 0,
    debtPerCard: 1,
    countedCardIds: [],
    chargedDebt: 0,
    maxCharge: 10,
    eventIds: [],
    status: 'active',
    sourceIntentId: 'credit-audit',
    ...overrides,
  };
}

function putMeld(state, meld) {
  state.teams[0].melds = [meld];
  return meld;
}

test('Limite de Credito encerra imediatamente no teto, limita excesso e nao repete em snapshot', () => {
  const below = game();
  activateCredit(below, 98);
  const one = putMeld(below, cards('below', ['3']));
  applyBossMeldTransition(below, { teamId: 0, playerId: 0, meldIndex: 0, cardsAdded: one });
  assert.equal(below.boss.danger, 99);
  assert.equal(below.boss.result, null);

  const exact = game();
  activateCredit(exact, 98);
  const two = putMeld(exact, cards('exact', ['3', '4']));
  const exactEvent = applyBossMeldTransition(exact, { teamId: 0, playerId: 0, meldIndex: 0, cardsAdded: two });
  assert.equal(exact.boss.danger, exact.boss.maxDanger);
  assert.equal(exact.boss.result?.reason, 'max_debt');
  assert.equal(exactEvent.defeatEvent?.type, 'bossDefeat');

  const excess = game();
  activateCredit(excess, 99);
  const excessCards = putMeld(excess, cards('excess', ['3', '4', '5']));
  applyBossMeldTransition(excess, { teamId: 0, playerId: 0, meldIndex: 0, cardsAdded: excessCards });
  assert.equal(excess.boss.danger, excess.boss.maxDanger);
  const before = excess.boss.eventLog.filter((event) => event.type === 'bossDefeat').length;
  const snapshot = JSON.parse(JSON.stringify(excess));
  assert.equal(applyBossMeldTransition(snapshot, { teamId: 0, playerId: 0, meldIndex: 0, cardsAdded: excessCards }), null);
  assert.equal(snapshot.boss.eventLog.filter((event) => event.type === 'bossDefeat').length, before);
});

test('Limite de Credito usa origem explicita e ignora o topo do lixo no Fechado', () => {
  const state = game();
  activateCredit(state, 0);
  const handCards = cards('hand-origin', ['3', '5']);
  const top = { id: 'discard-origin', rank: '4', suit: '♣' };
  const meld = putMeld(state, [...handCards, top]);
  const event = applyBossMeldTransition(state, {
    teamId: 0,
    playerId: 0,
    meldIndex: 0,
    cardsAdded: meld,
    creditEligibleCardIds: handCards.map((card) => card.id),
    cardOriginsById: Object.fromEntries([...handCards.map((card) => [card.id, 'hand']), [top.id, 'discard']]),
  });
  assert.equal(event.creditLimitDebt, 2);
  assert.deepEqual(state.boss.creditLimit.countedCardIds.sort(), handCards.map((card) => card.id).sort());

  const normal = game();
  activateCredit(normal, 0);
  const normalCards = putMeld(normal, cards('normal-hand', ['3', '4', '5']));
  assert.equal(applyBossMeldTransition(normal, { teamId: 0, playerId: 0, meldIndex: 0, cardsAdded: normalCards }).creditLimitDebt, 3);

  const undoState = game();
  activateCredit(undoState, 0);
  const transaction = createUndoTransaction(undoState, {}, { actorPlayerId: 0, actionType: 'meldNew' });
  const undoCards = putMeld(undoState, cards('undo-credit', ['3', '4']));
  applyBossMeldTransition(undoState, { teamId: 0, playerId: 0, meldIndex: 0, cardsAdded: undoCards });
  const restored = restoreUndoTransaction(transaction).state;
  assert.equal(restored.boss.danger, 0);
  assert.deepEqual(restored.boss.creditLimit.countedCardIds, []);
});

test('Posse cobra cada contribuicao agora e reaplica somente o dano antigo ao libertar', () => {
  const state = game('dominadora');
  const originalCards = putMeld(state, cards('possessed-old', ['3', '4', '5', '6', '7', '8', '9'], '♦'));
  const original = applyBossMeldTransition(state, {
    teamId: 0,
    playerId: 0,
    meldIndex: 0,
    oldKind: 'simple',
    newKind: 'limpa',
    cardsAdded: originalCards,
    isNewMeld: true,
  });
  state.boss.hp = state.boss.maxHp;
  state.boss.possessions = [{
    id: 'possession-audit',
    teamId: 0,
    meldIndex: 0,
    meldId: Object.keys(state.boss.meldProgress)[0],
    contributorPlayerIds: [],
    progressCardIds: [],
    required: 2,
    createdTier: 1,
    suppressedDamage: original.damage,
  }];
  const first = { id: 'possession-first', rank: '10', suit: '♦' };
  state.teams[0].melds[0].push(first);
  const firstEvent = applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'limpa', newKind: 'limpa', cardsAdded: [first] });
  assert.equal(firstEvent.cardDamage, 10);
  const snapshot = JSON.parse(JSON.stringify(state));
  const second = { id: 'possession-second', rank: 'J', suit: '♦' };
  snapshot.teams[0].melds[0].push(second);
  const released = applyBossMeldTransition(snapshot, { teamId: 0, playerId: 1, meldIndex: 0, oldKind: 'limpa', newKind: 'limpa', cardsAdded: [second] });
  assert.equal(released.cardDamage, 10);
  assert.equal(released.possessionReappliedDamage, original.damage);
  assert.equal(released.damage, original.damage + 10);
  const hpAfterRelease = snapshot.boss.hp;
  assert.equal(applyBossMeldTransition(snapshot, { teamId: 0, playerId: 1, meldIndex: 0, oldKind: 'limpa', newKind: 'limpa', cardsAdded: [second] }), null);
  assert.equal(snapshot.boss.hp, hpAfterRelease);
});

test('evolucao exige combinacao real, cartas livres e cancela ordem ou Interdito impossivel', () => {
  const state = game('dominadora');
  putMeld(state, cards('clean-seven', ['3', '4', '5', '6', '7', '8', '9'], '♣'));
  state.players[0].hand = cards('cannot-evolve', ['10', 'K'], '♣');
  assert.deepEqual(getBossMeldEvolutionOptions(state, 0, 0), []);

  state.players[0].hand = [
    ...cards('can-evolve', ['2', '10', 'J', 'Q', 'K', 'A'], '♣'),
    { id: 'free-discard', rank: '3', suit: '♥' },
  ];
  const options = getBossMeldEvolutionOptions(state, 0, 0);
  assert.ok(options.some((option) => option.newKind === 'real' && option.cardIds.length === 6));

  const meldId = options.length ? Object.keys(state.boss.meldIdsByPosition).length && state.boss.meldIdsByPosition['0:0'] : null;
  applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, cardsAdded: [] });
  const stableMeldId = meldId || state.boss.meldIdsByPosition['0:0'];
  state.boss.activeOrders = [{ id: 'external-order', sourceAbilityId: 'forced_choice', type: 'evolve_specific_meld', targetPlayerId: 0, meldIndex: 0, meldId: stableMeldId, status: 'active' }];
  state.boss.interdicts = [{ id: 'external-interdict', meldIndex: 0, meldId: stableMeldId, status: 'active', createdRound: 1 }];
  state.players[0].hand = cards('lost-options', ['10', 'K'], '♣');
  state.currentPlayer = 1;
  normalizeBossState(state);
  assert.equal(state.boss.activeOrders[0].status, 'cancelled');
  assert.equal(state.boss.interdicts[0].status, 'cancelled');
});

test('bot compara Garantia, Limite, Agio e Polen por valor e risco', () => {
  const collateral = game();
  collateral.players[0].hand = [{ id: 'cheap-card', rank: '3', suit: '♣' }];
  const paymentChoice = { type: 'fixed_interest_payment', playerId: 1, amount: 6, collateralAmount: 3, options: ['full', 'guarantee:0'] };
  assert.equal(chooseBossFixedInterestBotOption(collateral, paymentChoice), 'guarantee:0');
  collateral.players[0].hand = [{ id: 'valuable-joker', rank: 'JOKER', suit: 'JOKER', joker: true }];
  assert.equal(chooseBossFixedInterestBotOption(collateral, paymentChoice), 'full');

  const credit = game();
  activateCredit(credit, 20);
  const trivial = [{ id: 'trivial-credit', rank: '3', suit: '♣' }];
  assert.equal(shouldBossBotAcceptCreditPlay(credit, 0, { cards: trivial, oldKind: 'simple', newKind: 'simple' }), false);
  const decisive = cards('decisive-credit', ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'], '♣');
  assert.equal(shouldBossBotAcceptCreditPlay(credit, 0, { cards: decisive, oldKind: 'simple', newKind: 'real' }), true);

  const surcharge = game();
  surcharge.boss.discardSurcharge = { amount: 6, createdRound: 1, status: 'active' };
  surcharge.discard = [{ id: 'weak-pile', rank: '3', suit: '♣' }];
  assert.equal(shouldBossBotTakeDiscard(surcharge, 0, { intent: { wants: true, action: 'extend' } }), false);
  surcharge.discard = cards('strong-pile', ['A', '2', '8', '9', '10', 'K'], '♠');
  assert.equal(shouldBossBotTakeDiscard(surcharge, 0, { intent: { wants: true, action: 'new', decisive: true } }), true);

  const pollen = game('dominadora');
  assert.equal(shouldBossBotTakeDiscard(pollen, 0, {
    intent: { wants: true, action: 'new' },
    naturePlan: { pollenOnDiscard: true, bloom: 4 },
  }), true);
  assert.equal(shouldBossBotTakeDiscard(pollen, 0, {
    intent: { wants: true, action: 'new', usesTopImmediately: false },
    naturePlan: { pollenOnDiscard: true, bloom: 5 },
  }), false);
});
