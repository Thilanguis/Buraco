import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  bossDebugScenarioRegistry,
  buildBossDebugScenario,
  createBossDebugSnapshot,
  getBossDebugCatalog,
  restoreBossDebugSnapshot,
  runBossDebugSweep,
  simulateBossDebugReload,
  validateBossDebugScenario,
} from '../js/boss/boss-debug-scenarios.js';
import { selectNextBossIntent } from '../js/boss/boss-engine.js';
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

test('catalogo do laboratorio nasce do registro oficial e cobre as 32 habilidades', () => {
  const definitions = listBossDefinitions();
  const catalog = getBossDebugCatalog();
  assert.deepEqual(catalog.map((boss) => boss.id), definitions.map((boss) => boss.id));
  assert.equal(catalog.reduce((total, boss) => total + boss.abilities.length, 0), 32);
  assert.equal(Object.keys(bossDebugScenarioRegistry).length, 32);
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
  for (const id of ['debugBossLab', 'debugBossLabBoss', 'debugBossLabPhase', 'debugBossLabAbility', 'debugBossLabVariant', 'debugBossLabTarget', 'debugBossLabPrepare']) {
    assert.match(htmlSource, new RegExp(`id="${id}"`));
  }
  const debugBlock = appSource.slice(appSource.indexOf('if (isDebugMode) {'), appSource.indexOf('window.debugDraw5'));
  assert.match(debugBlock, /import\('\.\/js\/boss\/boss-debug-scenarios\.js'\)/);
  assert.match(appSource, /pauseAutomation/);
  assert.match(appSource, /isBossLabAutomationPaused/);
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
  assert.equal(report.total, 32);
  assert.equal(report.passed, 32);
  assert.deepEqual(report.failed, []);
  assert.equal(report.results.every((entry) => entry.ok), true);
});
