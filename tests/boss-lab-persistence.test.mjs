import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import * as lab from '../js/boss/boss-debug-scenarios.js';
import * as bossEngine from '../js/boss/boss-engine.js';
import { getBossDefinitionForMode } from '../js/boss/boss-registry.js';
import { BuracoBot } from '../bot.js';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const slice = (start, end) => app.slice(app.indexOf(start), app.indexOf(end, app.indexOf(start)));

// Run the real UI handlers and commit transaction against an in-memory database.
// No live match, Firebase connection, or network request is made.
function harness(bossId, abilityId) {
  const config = { bossId, abilityId, phase: 'auto', variant: 'interactive', target: 'auto' };
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { value: '', style: {}, textContent: '', disabled: false });
    return elements.get(id);
  };
  const writes = [];
  let persisted = null;
  const ctx = {
    ...bossEngine, console, Date, JSON, URL, structuredClone, AbortController,
    document: { getElementById: element },
    window: { location: 'http://localhost/?debug=1', history: { replaceState() {} }, updateMenuDynamic() {}, toggleDebugPanel() {}, gameSessionId: 0 },
    localStorage: { setItem() {} }, gameId: 'offline-test', gameRef: {}, db: {}, myPlayerIndex: 0,
    COOPERATIVE_MENU_MODE: 'cooperative', getBossDefinitionForMode,
    normalizeVariantForMode: (_mode, variant) => variant,
    startGame: () => assert.fail('Preparing a lab must not start a random match'),
    state: null, committing: false, pendingCommit: false, localUndoStack: [],
    selectedHandIndexes: new Set(), selectedMeldTarget: null, movingWild: null,
    renderedBossFeedbackCount: null, renderedBossFeedbackEventIds: null,
    bossDebugLabBaseSnapshot: null, bossDebugLabObservedBaseline: null, bossDebugLabLastConfig: null,
    bossDebugLabCatalog: lab.getBossDebugCatalog(), botTurnController: new AbortController(),
    loadBossDebugLabModule: async () => lab,
    bossLabElement: element, currentBossLabConfig: overrides => ({ ...config, ...overrides }),
    selectedBossLabAbility: () => lab.getBossDebugCatalog().find(b => b.id === config.bossId).abilities.find(a => a.id === config.abilityId),
    validateBossLabSelection: () => true,
    setBossLabError: message => { element('error').textContent = message; },
    showMessage: message => { element('message').textContent = message; },
    activateGameSession: () => { ctx.window.gameSessionId++; ctx.botTurnController = new AbortController(); },
    stopBossLabReportTimer() {}, stopTurnTimer() {}, startTurnTimerIfNeeded() {},
    startBossLabReportTimer() {}, refreshBossLabObserved: async () => {}, renderAll() {},
    newActionId: (() => { let id = 0; return () => `test-${++id}`; })(),
    pauseBlocksPlay: () => false, BuracoBot,
    setDoc: async (_ref, data) => { persisted = JSON.parse(data.stateJson); writes.push(structuredClone(persisted)); },
    runTransaction: async (_db, action) => action({
      get: async () => ({ exists: () => !!persisted, data: () => ({ stateJson: JSON.stringify(persisted) }) }),
      update: (_ref, data) => { persisted = JSON.parse(data.stateJson); writes.push(structuredClone(persisted)); },
    }),
  };
  ctx.createBotEngineForSession = () => ({
    getState: () => ctx.state, isActive: () => true, botDelayScale: 0.0001,
    computeTeamMeldScore: () => ({ total: 0 }), teamHasGoodCanastra: () => true,
    showMessage: ctx.showMessage, shouldForceStockDraw: () => true,
    // This adapter isolates persistence/turn progression, not bot strategy scoring.
    isValidSequenceMeld: () => false, isCardBlocked: () => false,
    hasPendingBossChoice: () => bossEngine.hasPendingBossChoices(ctx.state),
    resolvePendingBossChoice: async playerId => {
      const choice = bossEngine.getBossPendingChoice(ctx.state, playerId);
      if (!choice) return null;
      const event = bossEngine.resolveBossChoice(ctx.state, playerId, choice.options[0]);
      await ctx.commitState();
      return event;
    },
    executeDrawStock: async index => {
      ctx.state.players[index].hand.push(ctx.state.stock.pop());
      ctx.state.hasDrawnThisTurn = true;
      await ctx.commitState();
    },
    executeDiscard: async (index, cardIndex) => {
      ctx.state.discard.push(...ctx.state.players[index].hand.splice(cardIndex, 1));
      bossEngine.completeBossPlayerTurn(ctx.state, index);
      ctx.state.currentPlayer = 0;
      ctx.state.turnNumber++;
      ctx.state.hasDrawnThisTurn = false;
      await ctx.commitState();
      return true;
    },
  });
  vm.createContext(ctx);
  vm.runInContext([
    slice('  window.debugInstantStart = async', '  let bossDebugLabModulePromise'),
    slice('async function commitState()', 'function passTurn('),
    slice('  async function activatePreparedBossLabState(', '  async function resetBossLabScenario()'),
  ].join('\n'), ctx);
  return { ctx, config, writes, elements, persisted: () => persisted };
}

test('all 31 preparations publish only the requested skill and retain the match identity on commit', async () => {
  for (const boss of lab.getBossDebugCatalog()) for (const ability of boss.abilities) {
    const h = harness(boss.id, ability.id);
    assert.equal(await h.ctx.prepareBossLab(), true, h.elements.get('error')?.textContent);
    assert.equal(h.writes.length, 2);
    for (const saved of h.writes) {
      assert.equal(saved.boss.currentIntent.abilityId, ability.id);
      assert.equal(saved.debugScenario.abilityId, ability.id);
      assert.ok(saved.matchStartedAt);
      assert.equal(saved.matchStartedAt, h.ctx.state.matchStartedAt);
    }
    assert.equal(h.ctx.state.debugScenario.active, true);
  }
});

test('changing skills repeatedly never resurrects the previous saved match', async () => {
  const h = harness('banker', 'maintenance_fee');
  for (const [bossId, abilityId] of [['banker', 'maintenance_fee'], ['banker', 'fixed_interest'], ['dominadora', 'collar'], ['matriarca_esmeralda', 'living_seed'], ['banker', 'fixed_interest']]) {
    Object.assign(h.config, { bossId, abilityId });
    assert.equal(await h.ctx.prepareBossLab(), true);
    await h.ctx.commitState();
    assert.equal(h.persisted().boss.currentIntent.abilityId, abilityId);
    assert.equal(h.ctx.state.boss.currentIntent.abilityId, abilityId);
  }
});

test('prepare Juros Fixos then both bot buttons complete and save the selected result', async () => {
  for (const outcome of ['success', 'failure']) {
    const h = harness('banker', 'fixed_interest');
    assert.equal(await h.ctx.prepareBossLab(), true);
    const identity = h.ctx.state.matchStartedAt;
    await h.ctx.executeBossLabBotAction(outcome);
    assert.equal(h.ctx.state.debugScenario.executionCount, 1);
    assert.equal(h.ctx.state.debugScenario.heldOutcome, outcome);
    assert.equal(h.ctx.state.matchStartedAt, identity);
    assert.equal(h.persisted().debugScenario.heldOutcome, outcome);
    assert.ok(h.ctx.state.boss.eventLog.some(e => e.type === 'playerTurn' && e.playerId === 1));
    assert.equal(h.elements.get('debugBossLabBotSuccess').disabled, false);
    assert.equal(h.elements.get('debugBossLabBotFailure').disabled, false);
  }
});

test('bot handlers for every boss either persist a result or explicitly await a human choice', async () => {
  for (const boss of lab.getBossDebugCatalog()) for (const ability of boss.abilities) {
    for (const outcome of ['success', 'failure']) {
      const h = harness(boss.id, ability.id);
      assert.equal(await h.ctx.prepareBossLab(), true);
      await h.ctx.executeBossLabBotAction(outcome);
      const saved = h.persisted();
      assert.equal(saved.debugScenario.abilityId, ability.id);
      if (!saved.debugScenario.heldResultActionId) {
        assert.ok(saved.boss.pendingChoices.some(c => c.playerId === 0), `${ability.id}/${outcome}`);
        assert.match(h.elements.get('message').textContent, /Aguardando/);
      }
      assert.equal(h.elements.get('debugBossLabBotSuccess').disabled, false);
      assert.equal(h.elements.get('debugBossLabBotFailure').disabled, false);
    }
  }
});
