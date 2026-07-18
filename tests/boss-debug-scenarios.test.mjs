import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  bossDebugScenarioRegistry,
  buildBossDebugScenario,
  compareBossDebugExpectations,
  createBossDebugSnapshot,
  executeBossDebugScenarioVariant,
  getBossDebugCatalog,
  restoreBossDebugSnapshot,
  runBossDebugSweep,
  simulateBossDebugReload,
  validateBossDebugScenario,
} from '../js/boss/boss-debug-scenarios.js';
import { advanceBossTurn, beginBossTurn, selectNextBossIntent } from '../js/boss/boss-engine.js';
import { listBossDefinitions } from '../js/boss/boss-registry.js';

const [appSource, htmlSource] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
]);

function build(bossId = 'banker', abilityId = 'fixed_interest', overrides = {}) {
  return buildBossDebugScenario(null, {
    bossId,
    abilityId,
    phase: 'auto',
    variant: 'interactive',
    target: 'auto',
    ...overrides,
  });
}

test('catalogo do laboratorio nasce do registro oficial e cobre as 31 habilidades ativas', () => {
  const definitions = listBossDefinitions();
  const catalog = getBossDebugCatalog();
  assert.deepEqual(catalog.map((boss) => boss.id), definitions.map((boss) => boss.id));
  assert.equal(catalog.reduce((total, boss) => total + boss.abilities.length, 0), 31);
  assert.equal(Object.keys(bossDebugScenarioRegistry).length, 31);
  for (const definition of definitions) {
    for (const ability of definition.abilities) {
      const scenario = bossDebugScenarioRegistry[`${definition.id}:${ability.id}`];
      assert.ok(scenario, `${definition.id}:${ability.id} sem cenario`);
      assert.ok(scenario.variants.some((variant) => variant.id === 'interactive'));
      assert.equal(typeof scenario.build, 'function');
    }
  }
  assert.ok(catalog.every((boss) => boss.abilities.every((ability) => ability.id !== 'hierarchy' && ability.name !== 'Hierarquia')));
});

test('painel existe no DevTools atual e o modulo so e importado dentro do modo debug', () => {
  for (const id of ['debugBossLab', 'debugBossLabBoss', 'debugBossLabPhase', 'debugBossLabAbility', 'debugBossLabVariant', 'debugBossLabTarget', 'debugBossLabPrepare', 'debugBossLabBotRun']) {
    assert.match(htmlSource, new RegExp(`id="${id}"`));
  }
  const debugBlock = appSource.slice(appSource.indexOf('if (isDebugMode) {'), appSource.indexOf('window.debugDraw5'));
  assert.match(debugBlock, /import\('\.\/js\/boss\/boss-debug-scenarios\.js'\)/);
  assert.match(appSource, /pauseAutomation/);
  assert.match(appSource, /isBossLabAutomationPaused/);
});

test('Ordem Final pode criar as duas escolhas pelo Laboratorio', () => {
  const prepared = build('dominadora', 'final_order', { variant: 'success' });
  beginBossTurn(prepared.state, { first: true, now: 1000, debug: true });
  while (prepared.state.boss.bossFlow?.stage !== 'players') {
    const flow = prepared.state.boss.bossFlow;
    advanceBossTurn(prepared.state, Math.max(1001, Number(flow?.endsAt || 0) + 1));
  }

  const result = executeBossDebugScenarioVariant(prepared.state);

  assert.equal(result.executed, true);
  assert.deepEqual(result.choiceTypes, ['final_order_draw', 'final_order_lock']);
  assert.deepEqual(prepared.state.boss.pendingChoices.map((choice) => choice.playerId), [0, 1]);
});

test('fase automatica usa a primeira fase elegivel e fase incompativel e rejeitada', () => {
  assert.equal(build('banker', 'suit_audit').phase, 2);
  assert.equal(build('dominadora', 'double_collar').phase, 3);
  assert.throws(
    () => build('banker', 'suit_audit', { phase: 1 }),
    /nao e elegivel na Fase 1/,
  );
});

test('cenarios usam 108 cartas oficiais com IDs unicos e jogos validos', () => {
  for (const definition of listBossDefinitions()) {
    const ability = definition.abilities[0];
    const prepared = build(definition.id, ability.id);
    const validation = validateBossDebugScenario(prepared.state, {
      bossId: definition.id,
      abilityId: ability.id,
      phase: prepared.phase,
    });
    assert.equal(validation.valid, true, validation.errors.join(' '));
    assert.equal(validation.totalCards, 108);
    assert.equal(validation.uniqueCardIds, 108);
    assert.deepEqual(validation.duplicates, []);
    assert.equal(prepared.state.variant, 'fechado');
  }
});

test('mesmo cenario produz alvo e payload deterministas', () => {
  const first = build('dominadora', 'collar', { target: 'human' });
  const second = build('dominadora', 'collar', { target: 'human' });
  assert.equal(first.state.boss.seed, second.state.boss.seed);
  assert.deepEqual(first.expectedIntent, second.expectedIntent);
});

test('habilidade debug forçada passa pela elegibilidade e e consumida uma unica vez', () => {
  const prepared = build('banker', 'maintenance_fee', { phase: 3 });
  const first = selectNextBossIntent(prepared.state, { debug: true });
  assert.equal(first.abilityId, 'maintenance_fee');
  assert.equal(first.selectionSource, 'debug_forced');
  assert.equal(prepared.state.boss.debugForcedAbilityId, undefined);

  prepared.state.boss.currentIntent = null;
  const second = selectNextBossIntent(prepared.state, { debug: true });
  assert.ok(second);
  assert.notEqual(second.selectionSource, 'debug_forced');
});

test('modo normal ignora a fila debug e habilidade inelegivel falha claramente', () => {
  const normal = build('banker', 'fixed_interest');
  const normalIntent = selectNextBossIntent(normal.state);
  assert.ok(normalIntent);
  assert.notEqual(normalIntent.selectionSource, 'debug_forced');

  const invalid = build('dominadora', 'collar');
  invalid.state.players.forEach((player) => { player.hand = []; });
  assert.throws(() => selectNextBossIntent(invalid.state, { debug: true }), /nao encontrou um alvo legal/);
  assert.equal(invalid.state.boss.debugForcedAbilityId, undefined);
});

test('reload preserva cenario, intencao e IDs sem duplicacao', () => {
  const prepared = build('matriarca_esmeralda', 'living_seed');
  const intent = selectNextBossIntent(prepared.state, { debug: true });
  const restored = simulateBossDebugReload(prepared.state);
  assert.equal(restored.boss.currentIntent.abilityId, intent.abilityId);
  assert.deepEqual(restored.boss.currentIntent.payload, intent.payload);
  const validation = validateBossDebugScenario(restored);
  assert.equal(validation.totalCards, 108);
  assert.equal(validation.uniqueCardIds, 108);
  assert.deepEqual(validation.duplicates, []);
});

test('snapshot de reset e ciclo de Voltar preservam o estado sem timers ou cartas extras', () => {
  const prepared = build('dominadora', 'forced_swap');
  const snapshot = createBossDebugSnapshot(prepared.state);
  prepared.state.stock.pop();
  prepared.state.boss.danger = 3;
  const restored = restoreBossDebugSnapshot(snapshot);
  const validation = validateBossDebugScenario(restored, { bossId: 'dominadora', abilityId: 'forced_swap', phase: 2 });
  assert.equal(validation.valid, true, validation.errors.join(' '));
  assert.equal(restored.debugScenario.pauseAutomation, true);
  assert.equal('timerId' in restored.debugScenario, false);
  assert.equal(restored.boss.danger, 0);
});

test('varredura prepara todas as habilidades e denuncia qualquer lacuna', () => {
  const report = runBossDebugSweep();
  assert.equal(report.total, 31);
  assert.equal(report.passed, 31);
  assert.deepEqual(report.failed, []);
  assert.equal(report.results.every((entry) => entry.ok), true);
});

test('variantes do laboratorio executam estados e consequencias realmente distintas', () => {
  const interactive = build('matriarca_esmeralda', 'living_seed', { variant: 'interactive' });
  const success = build('matriarca_esmeralda', 'living_seed', { variant: 'success' });
  const failure = build('matriarca_esmeralda', 'living_seed', { variant: 'failure' });
  const cancelled = build('matriarca_esmeralda', 'living_seed', { variant: 'external_cancel' });

  assert.equal(interactive.state.hasDrawnThisTurn, false);
  assert.equal(success.state.hasDrawnThisTurn, true);
  assert.deepEqual(failure.state.boss.playersActedThisRound, [1]);

  assert.equal(executeBossDebugScenarioVariant(success.state).action, 'marked_card_played');
  assert.equal(success.state.boss.natureThreats.at(-1)?.status, 'success');
  assert.equal(executeBossDebugScenarioVariant(failure.state).action, 'deadline_advanced');
  assert.equal(failure.state.boss.natureThreats.at(-1)?.status, 'failed');
  assert.equal(executeBossDebugScenarioVariant(cancelled.state).action, 'target_card_removed');
  assert.equal(cancelled.state.boss.natureThreats.at(-1)?.status, 'cancelled');
});

test('variante sem alvo rejeita a habilidade solicitada e escolhe fallback legal', () => {
  const prepared = build('dominadora', 'collar', { variant: 'no_target' });
  selectNextBossIntent(prepared.state, { debug: true });
  const result = executeBossDebugScenarioVariant(prepared.state);
  assert.equal(result.action, 'fallback_selected');
  assert.equal(result.requestedAbilityId, 'collar');
  assert.ok(result.selectedAbilityId);
  assert.notEqual(result.selectedAbilityId, 'collar');
});

test('relatorio do laboratorio acusa consequencia observada incorreta', () => {
  const prepared = build('matriarca_esmeralda', 'living_seed', { variant: 'failure' });
  const before = restoreBossDebugSnapshot(createBossDebugSnapshot(prepared.state));
  executeBossDebugScenarioVariant(prepared.state);
  const comparison = compareBossDebugExpectations(before, prepared.state, {
    bloomDelta: 99,
    threatStatus: 'cancelled',
  });
  assert.equal(comparison.ok, false);
  assert.equal(comparison.checks.find((entry) => entry.label === 'Flores')?.ok, false);
  assert.equal(comparison.checks.find((entry) => entry.label === 'Ameaca')?.ok, false);
});

test('laboratorio usa o bot real e limpa seu unico timer ao fechar ou resetar', () => {
  assert.match(appSource, /async function executeBossLabBotAction[\s\S]*?BuracoBot\.playTurn/);
  assert.match(appSource, /let bossDebugLabReportTimerId = null/);
  assert.match(appSource, /function stopBossLabReportTimer\(\)[\s\S]*?clearInterval\(bossDebugLabReportTimerId\)/);
  assert.match(appSource, /resetBossLabScenario\(\)[\s\S]*?stopBossLabReportTimer\(\)/);
  assert.match(appSource, /debugBossLab[^\n]*addEventListener\('toggle'[\s\S]*?stopBossLabReportTimer\(\)/);
});


test('Interdito permanece desativado no registro e no Laboratorio', () => {
  const dominadora = getBossDebugCatalog().find((boss) => boss.id === 'dominadora');
  assert.ok(dominadora);
  assert.equal(dominadora.abilities.some((ability) => ability.id === 'interdict'), false);
  assert.equal(Boolean(bossDebugScenarioRegistry['dominadora:interdict']), false);
});
