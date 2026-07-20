import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBossState,
  deferBossVault,
  getBossVault,
  getBossVaultQuote,
  isBossVaultDrawRequired,
  normalizeBossState,
  prepareBossVaultTurn,
  reclaimBossVault,
  resolveBossChoice,
} from '../js/boss/boss-engine.js';

function stateWithChoice({ full = 6, guarantee = 3, playerId = 0 } = {}) {
  const state = {
    mode: 'boss_banker',
    currentPlayer: playerId,
    turnNumber: 1,
    hasDrawnThisTurn: false,
    partialDraw: false,
    players: [
      {
        id: 0,
        name: 'Biel',
        teamId: 0,
        hand: [
          { id: 'biel-3', rank: '3', suit: 'clubs' },
          { id: 'biel-A', rank: 'A', suit: 'spades' },
        ],
      },
      {
        id: 1,
        name: 'BOT Luana',
        teamId: 0,
        hand: [
          { id: 'luana-4', rank: '4', suit: 'diamonds' },
          { id: 'luana-K', rank: 'K', suit: 'hearts' },
        ],
      },
    ],
    teams: [{ id: 0, playerIndexes: [0, 1], melds: [] }],
    stock: [],
    discard: [],
    boss: createBossState('banker', 2026),
  };
  state.boss.pendingChoices = [{
    id: 'fixed-choice',
    type: 'fixed_interest_payment',
    playerId,
    options: ['full', 'guarantee'],
    amount: full,
    collateralAmount: guarantee,
  }];
  return state;
}

function lockVault(state, playerId = 0) {
  const beforeIds = state.players.find((player) => player.id === playerId).hand.map((card) => card.id);
  const event = resolveBossChoice(state, playerId, 'guarantee');
  const vault = getBossVault(state, playerId);
  assert.ok(event);
  assert.ok(vault);
  assert.ok(beforeIds.includes(vault.card.id));
  state.boss.bossFlow = { id: 'players', stage: 'players', queue: [] };
  return { event, vault };
}

function enterNextOwnerTurn(state, playerId = 0) {
  state.turnNumber += 1;
  state.currentPlayer = playerId;
  state.hasDrawnThisTurn = false;
  return prepareBossVaultTurn(state, playerId);
}

test('Prender a garantia cria Cofre fechado no valor-base e emite fechamento uma vez', () => {
  const state = stateWithChoice();
  const { event, vault } = lockVault(state);
  const quote = getBossVaultQuote(state, 0);

  assert.equal(event.dangerDelta, 0);
  assert.equal(event.vaultSound, 'close');
  assert.match(event.actionId, /^choice_/);
  assert.equal(state.boss.danger, 0);
  assert.equal(state.players[0].hand.some((card) => card.id === vault.card.id), false);
  assert.equal(state.boss.pendingChoices.length, 0);
  assert.equal(vault.state, 'locked');
  assert.deepEqual(quote, {
    state: 'locked',
    baseDebt: 3,
    interestDebt: 0,
    currentDebt: 3,
    totalDebt: 3,
    maxDebt: 6,
    deferredTurns: 0,
    ownerTurnsStarted: 1,
    forced: false,
    canDefer: false,
  });
  assert.equal(reclaimBossVault(state, 0), null);
});

test('Primeiro turno do titular preserva a carencia sem resgate nem juros', () => {
  const state = stateWithChoice();
  lockVault(state);

  state.hasDrawnThisTurn = true;
  assert.equal(deferBossVault(state, 0), null);
  assert.equal(reclaimBossVault(state, 0), null);
  assert.equal(getBossVaultQuote(state, 0).currentDebt, 3);
  assert.equal(getBossVaultQuote(state, 0).state, 'locked');
});

test('Segundo turno do titular abre o Cofre no valor-base e emite abertura uma vez', () => {
  const state = stateWithChoice();
  lockVault(state);

  const opened = enterNextOwnerTurn(state);
  assert.ok(opened);
  assert.equal(opened.type, 'vaultOpened');
  assert.equal(opened.vaultSound, 'open');
  assert.match(opened.actionId, /^vault_open_/);
  assert.equal(getBossVaultQuote(state, 0).state, 'open');
  assert.equal(getBossVaultQuote(state, 0).currentDebt, 3);
  assert.equal(prepareBossVaultTurn(state, 0), null);

  const reclaimed = reclaimBossVault(state, 0);
  assert.ok(reclaimed);
  assert.equal(reclaimed.dangerDelta, 3);
  assert.equal(state.hasDrawnThisTurn, true);
});

test('Primeiro turno aberto sem resgate soma um unico ponto de juros', () => {
  const state = stateWithChoice();
  lockVault(state);
  enterNextOwnerTurn(state);
  state.hasDrawnThisTurn = true;

  const interest = deferBossVault(state, 0);
  assert.ok(interest);
  assert.equal(getBossVaultQuote(state, 0).currentDebt, 4);
  assert.equal(getBossVaultQuote(state, 0).interestDebt, 1);
  assert.equal(deferBossVault(state, 0), null);
  assert.equal(getBossVaultQuote(state, 0).currentDebt, 4);
});

test('Juros param no valor integral e tornam o proximo resgate obrigatorio', () => {
  const state = stateWithChoice();
  lockVault(state);
  enterNextOwnerTurn(state);

  for (let expected = 4; expected <= 6; expected += 1) {
    state.hasDrawnThisTurn = true;
    const event = deferBossVault(state, 0);
    assert.ok(event);
    assert.equal(getBossVaultQuote(state, 0).currentDebt, expected);
    state.turnNumber += 1;
    state.hasDrawnThisTurn = false;
  }

  assert.equal(isBossVaultDrawRequired(state, 0), true);
  assert.equal(deferBossVault(state, 0), null);
  const reclaimed = reclaimBossVault(state, 0);
  assert.ok(reclaimed);
  assert.equal(reclaimed.dangerDelta, 6);
  assert.equal(state.hasDrawnThisTurn, true);
});

test('Preco-base e limite acompanham a variante do contrato', () => {
  for (const values of [
    { full: 5, guarantee: 2 },
    { full: 9, guarantee: 6 },
  ]) {
    const state = stateWithChoice(values);
    lockVault(state);
    const quote = getBossVaultQuote(state, 0);
    assert.equal(quote.baseDebt, values.guarantee);
    assert.equal(quote.currentDebt, values.guarantee);
    assert.equal(quote.maxDebt, values.full);
  }
});

test('Titular sorteado pode ser qualquer um dos dois jogadores elegiveis', () => {
  const holders = new Set();
  for (let seed = 1; seed <= 12; seed += 1) {
    const state = stateWithChoice();
    state.boss = createBossState('banker', seed);
    state.boss.currentIntent = {
      id: `fixed-${seed}`,
      abilityId: 'fixed_interest',
      name: 'Juros Fixos',
      payload: { holderPlayerId: null },
    };
    normalizeBossState(state);
    holders.add(state.boss.currentIntent.payload.holderPlayerId);
  }
  assert.deepEqual([...holders].sort(), [0, 1]);
});
