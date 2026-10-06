import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { BuracoBot } from '../bot.js';
import { applyDominationDecree, isDominationDiscardDecreeActive } from '../js/game/domination-decree.js';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const start = app.indexOf('const recoverIncompleteTurn = async');
const continuation = app.slice(start, app.indexOf('\n          }, botDelay);', start));

class TestBot extends BuracoBot {
  static async sleep() {}
  static evaluateDiscard() { return { wants: true }; }
  static async processMelds() { throw this.createStalePlanError(); }
}
function setup({ duringReaction = false, abort = false, changeTurn = false, pending = false } = {}) {
  const state = { mode: '1x1_dominacao', variant: 'fechado', currentPlayer: 0, turnNumber: 10,
    players: [{ id: 0, name: 'BOT', teamId: 0, hand: [{ id: 'h', rank: '4', suit: '♣' }] }, { id: 1, name: 'Gabriel', teamId: 1, hand: [] }],
    teams: [{ id: 0, melds: [] }, { id: 1, melds: [] }], stock: [{ id: 's' }], discard: [{ id: 'd' }], deadChunksTaken: [0, 0] };
  if (!duringReaction) assert.equal(applyDominationDecree(state, 1), true);
  const calls = [], signal = { aborted: false };
  const engine = {
    getState: () => state, isActive: () => !signal.aborted, showMessage() {}, computeTeamMeldScore: () => ({ total: 0 }), teamHasGoodCanastra: () => false,
    isDiscardBlocked: () => isDominationDiscardDecreeActive(state, 0),
    async executeDrawDiscardFechado() { calls.push('attempt-discard'); applyDominationDecree(state, 1); return false; },
    async executeDrawStock() { calls.push('stock'); state.players[0].hand.push(state.stock.pop()); state.hasDrawnThisTurn = true; },
    async recoverBotTurn() { calls.push('recover'); state.players[0].hand.pop(); state.currentPlayer = 1; state.turnNumber++; return true; },
  };
  const context = vm.createContext({ state, window: { lastBotTurnPlayed: 10 }, console: { warn() {}, error() {} },
    scheduledTurn: 10, scheduledBotIndex: 0, scheduledSessionId: 'session', scheduledSignal: signal,
    sessionEngine: engine, BotController: TestBot, activeBotTurn: {}, friendOperationPending: pending,
    isGameSessionActive: () => !signal.aborted, canPerformCommonGameAction: () => !context.friendOperationPending,
    isBossTurnActive: () => false, hasPendingBossChoices: () => false,
    setTimeout(resolve) { calls.push('wait'); context.friendOperationPending = false; if (abort) signal.aborted = true; if (changeTurn) state.turnNumber++; resolve(); },
  });
  context.window.activeBotTurn = context.activeBotTurn;
  return { state, calls, context, signal };
}

for (const duringReaction of [false, true]) {
  test(`Decree ${duringReaction ? 'during reaction' : 'already active'}: real BOT buys stock and resumes after stale plan`, async () => {
    const { state, calls, context } = setup({ duringReaction, pending: true });
    vm.runInContext(continuation, context);
    await context.activeBotTurn.promise;
    assert.deepEqual(calls, duringReaction ? ['attempt-discard', 'stock', 'wait', 'recover'] : ['stock', 'wait', 'recover']);
    assert.equal(state.discard.length, 1, 'blocked discard is untouched');
    assert.equal(state.currentPlayer, 1);
    assert.equal(context.window.lastBotTurnPlayed, null);
    assert.equal(TestBot._turnLocks.size, 0);
  });
}
for (const reason of ['abort', 'changeTurn']) {
  test(`Stale-plan recovery does not act after ${reason}`, async () => {
    const { calls, context } = setup({ pending: true, [reason]: true });
    vm.runInContext(continuation, context);
    await context.activeBotTurn.promise;
    assert.deepEqual(calls, ['stock', 'wait']);
  });
}

test('Stale cancellation before purchase resumes with one stock draw, never blocked discard', async () => {
  const { calls, context, state } = setup();
  context.BotController = { playTurn: async () => { throw BuracoBot.createStalePlanError(); }, isCancellationError: BuracoBot.isCancellationError };
  vm.runInContext(continuation, context); await context.activeBotTurn.promise;
  assert.deepEqual(calls, ['stock', 'recover']);
  assert.equal(state.discard.length, 1);
});

test('A real session cancellation never resumes or buys cards', async () => {
  const { calls, context } = setup();
  context.BotController = { playTurn: async () => { throw BuracoBot.createPlannerAbortError(); }, isCancellationError: BuracoBot.isCancellationError };
  vm.runInContext(continuation, context); await context.activeBotTurn.promise;
  assert.deepEqual(calls, []);
});
