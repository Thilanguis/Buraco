import assert from 'node:assert/strict';
import test from 'node:test';
import { BuracoBot } from '../bot.js';

test('bot descarta depois da compra adicional financiada e libera o humano', async () => {
  const state = {
    currentPlayer: 1,
    pickedDiscardCardId: null,
    players: [
      { id: 0, teamId: 0, hand: [{ id: 'human-card', rank: '3', suit: 'S' }] },
      {
        id: 1,
        teamId: 0,
        hand: [
          { id: 'bot-regular', rank: '5', suit: 'H' },
          { id: 'bot-financed', rank: '9', suit: 'C', bossFinanced: true },
        ],
      },
    ],
    teams: [
      { id: 0, melds: [] },
      { id: 1, melds: [] },
    ],
  };
  let discardedCardId = null;
  const engine = {
    getState: () => state,
    isActive: () => true,
    isCardBlocked: () => false,
    isValidSequenceMeld: () => false,
    getDominatrixPriorities: () => null,
    executeDiscard: async (_playerIndex, handIndex) => {
      discardedCardId = state.players[1].hand[handIndex].id;
      state.players[1].hand.splice(handIndex, 1);
      state.currentPlayer = 0;
      return true;
    },
  };

  const completed = await BuracoBot.processDiscard(1, 1, engine);

  assert.equal(completed, true);
  assert.ok(discardedCardId);
  assert.equal(state.currentPlayer, 0);
  assert.equal(state.players[1].hand.length, 1);
});
