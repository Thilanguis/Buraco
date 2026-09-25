// Isolated checks: no live match, network access or Firebase writes.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { applyPauseVote, pauseBlocksPlay, stockIsExhausted, createActionGate } from '../js/game/match-control.js';
const makeState = (names = ['Ana', 'Bia', 'BOT C', 'BOT D']) => ({
  players: names.map((name, id) => ({ id, name, hand: [], teamId: id % 2 })),
  stock: [], deadPiles: [[], []], discard: [], currentPlayer: 0, turnNumber: 4, hasDrawnThisTurn: true,
});
const s = makeState();
assert.equal(applyPauseVote(s, -1, 'request'), false);
assert.equal(applyPauseVote(s, 0, 'request', 100), true);
assert.equal(pauseBlocksPlay(s), true);
assert.deepEqual(s.pause.votes, { 0: true, 2: true, 3: true });
applyPauseVote(s, 1, 'yes', 200);
assert.equal(s.pause.paused, true);
applyPauseVote(s, 1, 'request', 300);
applyPauseVote(s, 0, 'no', 400);
assert.equal(s.pause.paused, true);
applyPauseVote(s, 0, 'request', 500);
applyPauseVote(s, 1, 'yes', 600);
assert.equal(pauseBlocksPlay(s), false);
assert.equal(s.turnNumber, 4);
assert.equal(s.hasDrawnThisTurn, true);
const solo = makeState(['Ana', 'BOT B']);
applyPauseVote(solo, 0, 'request');
assert.equal(solo.pause.paused, true);
applyPauseVote(solo, 0, 'request');
assert.equal(pauseBlocksPlay(solo), false);
const rejected = makeState();
applyPauseVote(rejected, 0, 'request');
applyPauseVote(rejected, 1, 'no');
assert.equal(pauseBlocksPlay(rejected), false);
rejected.finished = true;
assert.equal(applyPauseVote(rejected, 0, 'request'), false);
for (const mode of ['1x1', '2x2', '1x2', '1x1_duploMorto', '1x1_dominacao']) {
  const exhausted = { ...makeState(), mode };
  assert.equal(stockIsExhausted(exhausted), true);
  exhausted.deadPiles[1].push({ id: 'dead' });
  assert.equal(stockIsExhausted(exhausted), false);
}
const gate = createActionGate();
let release, calls = 0;
const first = gate.run(async () => { calls++; await new Promise(resolve => { release = resolve; }); });
await gate.run(() => { calls++; });
assert.equal(calls, 1);
release(); await first;
await assert.rejects(gate.run(() => { throw new Error('network'); }));
await gate.run(() => { calls++; });
assert.equal(calls, 2);
const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const discardCode = app.slice(app.indexOf('async function discardSelectedCard()'), app.indexOf('\nfunction computeTeamMeldScore'));
for (const exhausted of [true, false]) {
  const state = makeState(['Ana', 'BOT B']);
  const card = { id: 'c1', rank: '3', suit: '♠' };
  state.players[0].hand = [card, { id: 'c2' }];
  if (!exhausted) state.deadPiles[0] = [{ id: 'd1' }];
  let turns = 0, finishes = 0, releaseFlight;
  const context = {
    state, localActionGate: createActionGate(), stockIsExhausted,
    ensureMyTurn: () => state.currentPlayer === 0 && !state.finished,
    currentPlayer: () => state.players[state.currentPlayer], selectedHandIndexes: new Set([0]), selectedMeldTarget: null,
    myPlayerIndex: 0, ignoreOwnActionId: null,
    ensureCardId() {}, getBossCardBlockFeedback: () => null, saveStateForUndo() {}, notifyBossCardDiscarded: () => [],
    cardElById: () => ({ style: {} }), document: { querySelector: () => ({}) }, getRect: () => ({}),
    flyRectToRect: () => new Promise(resolve => { releaseFlight = resolve; }),
    canTeamTakeDeadNow: () => false, teamHasGoodCanastra: () => true, isCurrentBossMode: () => false,
    passTurn: () => { turns++; state.currentPlayer = 1; },
    finishGame: async winner => { assert.equal(winner, null); finishes++; state.finished = true; },
    packCard: c => c, newActionId: () => 'a1', renderAll() {}, commitState: async () => {}, showMessage() {},
  };
  vm.createContext(context);
  vm.runInContext(discardCode, context);
  const operation = context.discardSelectedCard();
  await context.discardSelectedCard();
  releaseFlight(); await operation;
  assert.equal(state.discard.length, 1);
  assert.equal(state.players[0].hand.length, 1);
  assert.equal(turns, exhausted ? 0 : 1);
  assert.equal(finishes, exhausted ? 1 : 0);
}
const drawState = makeState(['Ana', 'BOT B']);
drawState.hasDrawnThisTurn = false;
let releaseRecycle, recycleCalls = 0;
const drawContext = {
  pendingStockCardIds: new Set(), cardElById: () => null,
  state: drawState, localActionGate: createActionGate(), ensureMyTurn: () => true,
  isBossVaultDrawRequired: () => false, document: { querySelector: () => null },
  saveStateForUndo() {}, consumeBossExtraDraw: () => 0,
  recycleDeadToStockIfPossible: async () => { recycleCalls++; await new Promise(resolve => { releaseRecycle = resolve; }); drawState.stock = [{ id: 'one' }, { id: 'two' }]; return 0; },
  ensureCardId() {}, currentPlayer: () => drawState.players[0], registerBossFinancedCards: () => null,
  deferBossVault: () => null, sortHand() {}, window: {}, renderAll() {}, showMessage() {},
  newActionId: () => 'draw', packCard: c => c, ignoreOwnActionId: null, resetTurnTimer() {}, commitState: async () => {},
};
vm.createContext(drawContext);
vm.runInContext(app.slice(app.indexOf('async function drawFromStock()'), app.indexOf('\nfunction canUseDiscardInClosed')), drawContext);
const drawing = drawContext.drawFromStock();
await drawContext.drawFromStock();
releaseRecycle(); await drawing;
assert.equal(recycleCalls, 1);
assert.equal(drawState.players[0].hand.length, 1);
assert.equal(drawState.stock.length, 1);

const resultStart = app.indexOf('  if (state.finished) {\n    if (!resultPresented');
const resultBlock = app.slice(resultStart, app.indexOf('\n  syncCanastraSfxFromState();', resultStart));
let scoreOpens = 0;
const resultContext = { state: { finished: true }, resultPresented: false, isCurrentBossMode: () => false,
  computeScores: () => [], renderScores: () => { scoreOpens++; }, document: { getElementById: () => ({ style: {} }) } };
vm.createContext(resultContext);
vm.runInContext(resultBlock, resultContext);
vm.runInContext(resultBlock, resultContext);
assert.equal(scoreOpens, 1);
resultContext.state.finished = false;
vm.runInContext(resultBlock, resultContext);
resultContext.state.finished = true;
vm.runInContext(resultBlock, resultContext);
assert.equal(scoreOpens, 2);
let persisted = { ...makeState(), finished: true, matchStartedAt: 123 };
let deleted = 0, restarted = 0;
const votingContext = {
  state: structuredClone(persisted), myPlayerIndex: 0, rematchVotePending: false, exitVotePending: false,
  localActionGate: createActionGate(), db: {}, gameRef: {}, console, showMessage() {},
  document: { getElementById: () => ({}) }, window: { debugRestartGame: async () => { restarted++; } },
  runTransaction: async (_, operation) => operation({
    get: async () => ({ exists: () => true, data: () => ({ stateJson: JSON.stringify(persisted) }) }),
    update: (_, data) => { persisted = JSON.parse(data.stateJson); },
    delete: () => { deleted++; },
  }),
};
vm.createContext(votingContext);
vm.runInContext(app.slice(app.indexOf('async function voteExit('), app.indexOf('function renderSurrender()')), votingContext);
vm.runInContext(app.slice(app.indexOf('window.voteRematch = async')), votingContext);
await votingContext.window.voteRematch();
assert.equal(restarted, 0);
votingContext.myPlayerIndex = 1;
await votingContext.window.voteRematch();
assert.equal(restarted, 1);
await votingContext.window.voteRematch();
assert.equal(restarted, 1);
persisted.rematch = null;
votingContext.myPlayerIndex = 0;
await votingContext.voteExit('request');
assert.equal(deleted, 0);
votingContext.myPlayerIndex = 1;
await votingContext.voteExit('yes');
assert.equal(deleted, 1);
console.log('PASS: pause/resume, bots, rejection, spectator, exhaustion, real discard rapid-click regression, result panel and transaction voting handlers.');
