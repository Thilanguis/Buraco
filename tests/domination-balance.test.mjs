import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
function fn(name) {
  const start = app.indexOf(`function ${name}(`);
  return app.slice(start, app.indexOf('\n}', start) + 2);
}
function method(name) {
  const start = app.indexOf(`  async ${name}(`);
  return app.slice(start, app.indexOf('\n  },', start) + 5);
}
const card = (id, rank = '6') => ({ id, rank, suit: '♣' });
function fixture(mode, variant) {
  return { mode, variant, currentPlayer: 1, players: [{ id: 0, teamId: 0, hand: [] }, { id: 1, teamId: 1, hand: [card('hand', 'Q')] }],
    teams: [{ id: 0, melds: [] }, { id: 1, melds: [[card('a', '3'), card('b', '4'), card('c', '5')]] }],
    discard: [card('top')], stock: [card('stock')], hasDrawnThisTurn: false, partialDraw: false };
}
function sandbox(state) {
  const noop = () => {};
  const allowed = () => ({ allowed: true });
  const live = vm.createContext({ state, window: {}, document: { querySelector: () => null },
    selectedHandIndexes: new Set(), selectedMeldTarget: null, ignoreOwnActionId: null,
    currentPlayer: () => state.players[1], currentTeam: () => state.teams[1], ensureMyTurn: () => true,
    isBossVaultDrawRequired: () => false, isBossDiscardBlocked: () => false, hasPendingBossChoices: () => false,
    hasAnyDeadToRecycle: () => true, validateBossClosedDiscardSelection: allowed,
    isBossMeldLocked: () => false, canBossUseMeld: () => true, isValidSequenceMeld: () => true,
    validateBossMeldPlay: allowed, canTeamTakeDeadNow: () => true, isCurrentBossMode: () => false,
    confirmBossDiscardPickup: allowed, classifyMeldForUi: () => ({ kind: 'simple' }), classifyMeldPreview: () => 'simple',
    prepareBossMeldMutation: async () => ({ allowed: true, undoSaved: true }),
    drawBossTurnExtras: async () => [], deferBossVault: () => null,
    processDominationReward: async () => null, processBossMeldChange: async () => null, checkPostMeldStatus: async () => null,
    packCard: c => ({ ...c }), newActionId: () => 'pickup', commitState: async () => {},
    getBossVault: () => null, consumeBossExtraDraw: () => 0, registerBossFinancedCards: () => null,
    getBossNaturePriorities: () => null,
    ...Object.fromEntries(['showMessage', 'ensureCardId', 'saveStateForUndo', 'notifyBossDiscardTaken', 'optimizeMeld',
      'normalizeMeldOrder', 'autoSwapWildWhenFillingGap', 'sortHand', 'renderAll', 'renderHand', 'resetTurnTimer'].map(name => [name, noop])),
  });
  return live;
}

test('jogador e bot: lixo encerra compra nos dois modos e variantes sem tocar o monte', async () => {
  for (const mode of ['1x1_dominacao', '1x1_duploMorto']) for (const variant of ['aberto', 'fechado']) {
    for (const bot of [false, true]) {
      const state = fixture(mode, variant);
      const live = sandbox(state);
      if (bot) {
        vm.runInContext(`this.engine = { ${method('executeDrawDiscard')} ${method('executeDrawDiscardFechado')} ${method('executeDrawStock')} };`, live);
        Object.assign(live.engine, { getState: () => state, commitState: async () => {},
          acceptBossDiscardSurcharge: () => ({ allowed: true }), evaluateBossMeldMutation: async () => true,
          normalizeMeld() {}, _checkBotMortoOrWin: async () => null,
        });
        if (variant === 'aberto') await live.engine.executeDrawDiscard(1);
        else await live.engine.executeDrawDiscardFechado(1, { action: 'extend', meldIndex: 0 });
        assert.equal(await live.engine.executeDrawStock(1), false, 'nem chamada direta compra extra');
        assert.equal(await live.engine.executeDrawDiscard(1), false, 'nem segunda retirada');
      } else {
        vm.runInContext(`async ${fn('drawFromDiscard')}\nasync ${fn('drawFromStock')}`, live);
        await live.drawFromDiscard();
        await live.drawFromStock();
      }
      assert.equal(state.stock.length, 1, `${mode}/${variant}/${bot}: monte intacto`);
      assert.equal(state.discard.length, 0);
      assert.equal(state.hasDrawnThisTurn, true);
      assert.equal(state.partialDraw, false);
      assert.equal(state.players[1].hand.some(c => c.id === 'stock'), false);
      assert.equal(variant === 'fechado' ? state.teams[1].melds[0].at(-1).id : state.players[1].hand.at(-1).id, 'top');
    }
  }
});

test('reload encerra compra parcial antiga do lixo sem afetar roubo da Visao', () => {
  const live = vm.createContext({});
  vm.runInContext(fn('normalizeLegacyDiscardPurchase'), live);
  for (const mode of ['1x1_dominacao', '1x1_duploMorto']) for (const type of ['drawDiscard', 'drawDiscardFechado', 'stealCard']) {
    const state = { mode, currentPlayer: 1, partialDraw: true, hasDrawnThisTurn: false, lastAction: { type, playerId: 1 } };
    live.normalizeLegacyDiscardPurchase(state);
    assert.equal(state.partialDraw, type === 'stealCard');
    assert.equal(state.hasDrawnThisTurn, type !== 'stealCard');
  }
});
