import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const start = app.indexOf('async function discardSelectedCard(');
const discardCode = app.slice(start, app.indexOf('\n}', start) + 2);

function fixture({ dead = false, blocked = false } = {}) {
  const hand = Array.from({ length: dead ? 1 : 3 }, (_, i) => ({ id: `card-${i}`, rank: '5', suit: '♣' }));
  const selection = new Set([dead ? 0 : 1]);
  const state = { hasDrawnThisTurn: true, variant: 'aberto', players: [{ id: 0, teamId: 0, hand }], discard: [] };
  const renders = [];
  let releaseCommit;
  const server = new Promise(resolve => { releaseCommit = resolve; });
  const checkCleared = () => {
    assert.equal(selection.size, 0, 'selection must be cleared before rendering or awaiting dead animations');
    assert.equal(context.selectedMeldTarget, null);
  };
  const context = vm.createContext({
    state, selectedHandIndexes: selection, selectedMeldTarget: '0:0', myPlayerIndex: 0,
    ensureMyTurn: () => true, currentPlayer: () => state.players[0], ensureCardId() {},
    getBossCardBlockFeedback: () => blocked ? { message: 'blocked' } : null,
    resetDeniedCardSelection() {}, showMessage() {}, saveStateForUndo() {},
    canTeamTakeDeadNow: () => dead, teamHasGoodCanastra: () => true,
    notifyBossCardDiscarded: () => [], cardElById: () => ({ style: {} }),
    document: { querySelector: () => ({}) }, getRect: () => ({}),
    flyRectToRect: async () => { assert.equal(selection.size, 1, 'keep selection while original card flies'); },
    takeDeadIfAvailableForPlayer(player) {
      checkCleared();
      player.hand.push({ id: 'dead-card', rank: 'K', suit: '♣' });
      return { deadIndex: 0 };
    },
    animateDeadToHandLocal: async () => checkCleared(),
    finishGame: async () => checkCleared(),
    passTurn() { state.currentPlayer = 1; }, newActionId: () => 'discard-test', packCard: card => card,
    renderAll() { checkCleared(); renders.push([...selection]); },
    commitState: () => server,
  });
  vm.runInContext(discardCode, context);
  return { context, state, selection, renders, releaseCommit };
}

test('descarte nao transfere selecao para carta seguinte enquanto aguarda servidor', async () => {
  const f = fixture();
  const pending = f.context.discardSelectedCard();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.state.players[0].hand[1].id, 'card-2');
  assert.equal(f.state.discard[0].id, 'card-1');
  assert.equal(f.renders.length, 1, 'test observes local render before server response');
  assert.equal(f.selection.size, 0);
  f.releaseCommit();
  await pending;
});

test('descarte limpa selecao antes da animacao do morto', async () => {
  const f = fixture({ dead: true });
  f.releaseCommit();
  await f.context.discardSelectedCard();
  assert.equal(f.state.players[0].hand[0].id, 'dead-card');
  assert.equal(f.selection.size, 0);
});

test('descarte rejeitado nao remove carta nem passa turno', async () => {
  const f = fixture({ blocked: true });
  await f.context.discardSelectedCard();
  assert.equal(f.state.players[0].hand.length, 3);
  assert.equal(f.state.discard.length, 0);
  assert.equal(f.renders.length, 0);
});
