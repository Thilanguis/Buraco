import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const start = app.indexOf('async function drawFromStock()');
const source = app.slice(start, app.indexOf('\n}', start) + 2);

function fixture({ partial = false, origin = true, cancel = false } = {}) {
  const state = { mode: '1x1_dominacao', currentPlayer: 1, partialDraw: partial,
    stock: [{ id: 'second' }, { id: 'first' }], players: [{}, { hand: [] }] };
  const pendingStockCardIds = new Set(), elements = new Map(), flights = [];
  let commits = 0;
  // Use the actual visibility rule from renderHand on every DOM rebuild.
  const visibilityRule = app.match(/if \(pendingStockCardIds\.has\(card\.id\)\) div\.style\.visibility = 'hidden';/)[0];
  const applyVisibility = new Function('pendingStockCardIds', 'card', 'div', visibilityRule);
  const renderAll = () => {
    elements.clear();
    for (const card of state.players[1].hand) {
      const div = { style: { visibility: '' } };
      applyVisibility(pendingStockCardIds, card, div);
      elements.set(card.id, div);
    }
  };
  const context = vm.createContext({ state, pendingStockCardIds, window: {},
    ensureMyTurn: () => true, isBossVaultDrawRequired: () => false,
    document: { querySelector: () => origin ? {} : null }, getRect: () => ({}),
    saveStateForUndo() {}, consumeBossExtraDraw: () => 0, ensureCardId() {},
    currentPlayer: () => state.players[1], registerBossFinancedCards: () => null,
    deferBossVault: () => null, sortHand() {}, renderAll,
    cardElById: id => elements.get(id),
    flyRectToRect: async card => {
      renderAll(); // A redraw must not expose cards still in flight.
      flights.push([...elements].map(([id, el]) => [id, el.style.visibility]));
      assert.equal(elements.get(card.id).style.visibility, 'hidden');
      if (cancel) throw new Error('cancelled');
    }, showMessage() {}, newActionId: () => 'action', packCard: c => c,
    resetTurnTimer() {}, commitState: async () => { commits++; },
  });
  vm.runInContext(source, context);
  return { context, state, pendingStockCardIds, elements, flights, commits: () => commits };
}

test('compra dupla revela cada carta somente depois do seu voo, mesmo com rerender', async () => {
  const f = fixture();
  await f.context.drawFromStock();
  assert.deepEqual(f.flights, [
    [['first', 'hidden'], ['second', 'hidden']],
    [['first', ''], ['second', 'hidden']],
  ]);
  assert.equal(f.pendingStockCardIds.size, 0);
  assert.ok([...f.elements.values()].every(el => el.style.visibility === ''));
  assert.equal(f.state.stock.length, 0);
  assert.equal(f.state.lastAction.count, 2);
  assert.equal(f.commits(), 1);
});

test('compra parcial e compra sem origem visual preservam quantidade e visibilidade', async () => {
  for (const options of [{ partial: true }, { origin: false }]) {
    const f = fixture(options);
    await f.context.drawFromStock();
    assert.equal(f.state.lastAction.count, options.partial ? 1 : 2);
    assert.equal(f.flights.length, options.partial ? 1 : 0);
    assert.equal(f.pendingStockCardIds.size, 0);
    assert.ok([...f.elements.values()].every(el => el.style.visibility === ''));
  }
});

test('cancelamento do voo nao deixa cartas invisiveis', async () => {
  const f = fixture({ cancel: true });
  await assert.rejects(f.context.drawFromStock(), /cancelled/);
  assert.equal(f.pendingStockCardIds.size, 0);
  assert.ok([...f.elements.values()].every(el => el.style.visibility === ''));
});
