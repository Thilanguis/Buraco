import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createActionGate } from '../js/game/match-control.js';
import { notifyBossPurchaseCompleted, createBossState } from '../js/boss/boss-engine.js';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const start = app.indexOf('async function drawFromStock()');
const source = app.slice(start, app.indexOf('\nfunction canUseDiscardInClosed', start));

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
  const context = vm.createContext({ state, pendingStockCardIds, window: {}, localActionGate: createActionGate(),
    ensureMyTurn: () => true, isBossVaultDrawRequired: () => false,
    document: { querySelector: () => origin ? {} : null }, getRect: () => ({}),
    saveStateForUndo() {}, consumeBossExtraDraw: () => 0, ensureCardId() {},
    currentPlayer: () => state.players[1], registerBossFinancedCards: () => null, notifyBossPurchaseCompleted,
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

test('Nemesis: real human and BOT stock handlers apply one Grabber restriction before commit', async () => {
  for (const bot of [false, true]) {
    const f = fixture({ origin: false });
    Object.assign(f.state, { mode: 'boss_nemesis', turnNumber: 9, boss: createBossState('nemesis', 123),
      teams: [{ id: 0, melds: [] }], deadChunksTaken: [0] });
    f.state.boss.combatEntities[0].status = 'persistent'; f.state.boss.grabberPursuit={version:1,playerIds:[1,0]};
    f.state.players[1].id = 1; f.state.players[1].teamId = 0;
    Object.assign(f.state.players[0],{id:0,teamId:0,hand:[]});
    f.state.players[1].hand = ['3','4','5','K'].map(rank => ({ id: 'old-' + rank, rank, suit: '♥' }));
    f.state.stock = [{ id: 'new-card', rank: 'Q', suit: '♠' }];
    if (bot) {
      const start = app.indexOf('  async executeDrawStock(');
      Object.assign(f.context, { getBossVault: () => null });
      vm.runInContext(`this.engine = { ${app.slice(start, app.indexOf('\n  },', start) + 5)} };`, f.context);
      Object.assign(f.context.engine, { getState: () => f.state, commitState: f.context.commitState });
      await f.context.engine.executeDrawStock(1);
    } else await f.context.drawFromStock();
    assert.equal(f.state.hasDrawnThisTurn, true);
    assert.equal(f.state.boss.grabbedByPlayer[1].cardIds.length, 1);
    assert.ok(f.state.players[1].hand.some(c=>c.id===f.state.boss.grabbedByPlayer[1].cardIds[0]),'newly drawn card is equally eligible');
    assert.equal(f.state.boss.eventLog.filter(e => e.type === 'nemesisGrab').length, 1);
    assert.equal(f.commits(), 1);
  }
});

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
