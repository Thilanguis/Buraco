import assert from 'node:assert/strict';
import test from 'node:test';
import { createBossState, selectNextBossIntent } from '../js/boss/boss-engine.js';
import { assignStableCardIds, createDeck, dealInitialDeck } from '../js/deck.js';

const SUITS = ['♠', '♦', '♣', '♥'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createInitialBossGame(seed, rawDeck = createDeck(SUITS, RANKS)) {
  const deck = assignStableCardIds(rawDeck, 'initial');
  const deal = dealInitialDeck(deck, 2, 11, 11);
  const state = {
    mode: 'boss_dominadora',
    turnNumber: 0,
    stock: deal.stock,
    discard: deal.discard,
    deadPiles: deal.deadPiles,
    deadChunksTaken: [0, 0],
    players: [
      { id: 0, name: 'Biel', teamId: 0, hand: deal.hands[0] },
      { id: 1, name: 'BOT Luana', teamId: 0, hand: deal.hands[1] },
    ],
    teams: [
      { id: 0, playerIndexes: [0, 1], melds: [] },
      { id: 1, playerIndexes: [], melds: [] },
    ],
    boss: createBossState('dominadora', seed),
  };
  return state;
}

function allCardZones(state) {
  return [state.stock, state.discard, ...state.deadPiles, ...state.players.map((player) => player.hand)];
}

test('criacao e distribuicao iniciais identificam todas as cartas antes da primeira intencao', () => {
  const rawDeck = createDeck(SUITS, RANKS).map(({ id, ...card }) => card);
  assert.ok(rawDeck.every((card) => card.id == null));
  const state = createInitialBossGame(1, rawDeck);
  assert.ok(allCardZones(state).every((zone) => zone.every((card) => typeof card.id === 'string' && card.id.length > 0)));
  const ids = allCardZones(state).flat().map((card) => card.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('inicio real produz Coleira e Exposicao apenas com jogador e carta validos', () => {
  const found = new Map();
  for (let seed = 1; seed <= 500 && found.size < 2; seed++) {
    const state = createInitialBossGame(seed);
    const intent = selectNextBossIntent(state);
    if (!['collar', 'exposure'].includes(intent?.abilityId) || found.has(intent.abilityId)) continue;
    const target = state.players.find((player) => player.id === intent.payload.targetPlayerId);
    assert.ok(target);
    assert.ok(intent.payload.cardId);
    assert.ok(target.hand.some((card) => card.id === intent.payload.cardId));
    found.set(intent.abilityId, intent);
  }
  assert.ok(found.has('collar'), 'a simulacao deve alcancar uma primeira Coleira');
  assert.ok(found.has('exposure'), 'a simulacao deve alcancar uma primeira Exposicao');
});

test('habilidade dependente de carta sem alvo identificado sai do sorteio', () => {
  for (let seed = 1; seed <= 80; seed++) {
    const state = createInitialBossGame(seed);
    state.players.forEach((player) => player.hand.forEach((card) => delete card.id));
    const intent = selectNextBossIntent(state);
    assert.ok(!['collar', 'exposure', 'double_collar', 'forced_swap'].includes(intent?.abilityId));
  }
});
