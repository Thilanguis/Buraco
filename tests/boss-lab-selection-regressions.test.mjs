import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { getBossDebugCatalog, buildBossDebugScenario, canContinueBossDebugScenario, completeBossDebugBotOutcome } from '../js/boss/boss-debug-scenarios.js';
import { beginBossTurn, advanceBossTurn } from '../js/boss/boss-engine.js';
import { buildBossActionPresentation } from '../js/boss/boss-presentation.js';

const catalog = getBossDebugCatalog();
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

test('all bosses preserve selected ability across phases and variants; fallback is explicit', () => {
  let count = 0;
  for (const boss of catalog) for (const ability of boss.abilities) {
    for (const phase of ability.phases) for (const variant of ability.variants) {
      const { state } = buildBossDebugScenario(null, { bossId: boss.id, abilityId: ability.id, phase, variant: variant.id, target: 'auto' });
      beginBossTurn(state, { first: true, now: 1000, debug: true });
      const selected = state.boss.currentIntent?.abilityId;
      if (variant.id === 'no_target') assert.notEqual(selected, ability.id);
      else {
        assert.equal(selected, ability.id, `${boss.id}/${ability.id}/${phase}/${variant.id}`);
        assert.equal(buildBossActionPresentation(state).name, ability.name);
      }
      count++;
    }
  }
  assert.equal(count, 398);
});

test('all bosses reject stale scenario configuration', () => {
  for (const boss of catalog) for (const ability of boss.abilities) {
    const config = { bossId: boss.id, abilityId: ability.id, phase: 'auto', variant: 'interactive', target: 'auto' };
    const { state } = buildBossDebugScenario(null, config);
    assert.equal(canContinueBossDebugScenario(state, config), true);
    for (const change of [{ phase: 3 }, { variant: 'failure' }, { target: 'bot' }]) {
      assert.equal(canContinueBossDebugScenario(state, { ...config, ...change }), false);
    }
  }
});

test('Dominadora held results retain their own names even with persistent Posse', () => {
  for (const id of ['collar', 'forced_swap', 'hands_tied', 'iron_etiquette', 'favorite', 'double_collar', 'separation', 'absolute_control']) {
    const ability = catalog.find(b => b.id === 'dominadora').abilities.find(a => a.id === id);
    const { state } = buildBossDebugScenario(null, { bossId: 'dominadora', abilityId: id, phase: 'auto', variant: 'interactive' });
    beginBossTurn(state, { first: true, now: 1000, debug: true });
    for (let i = 0; i < 12 && state.boss.bossFlow?.stage !== 'players' && !state.boss.pendingChoices?.length; i++) {
      advanceBossTurn(state, Number(state.boss.bossFlow?.endsAt || 0) + 1);
    }
    assert.equal(completeBossDebugBotOutcome(state, 'failure', 1).executed, true);
    assert.equal(buildBossActionPresentation(state).name, ability.name);
    state.boss.possessions = [{ meldIndex: 0, required: 2, contributorPlayerIds: [] }];
    assert.equal(buildBossActionPresentation(state).name, ability.name);
  }
});

test('held lab result cancels presentation timer without scheduling an overflowing timeout', () => {
  const source = app.slice(app.indexOf('function scheduleBossTurnAdvance()'), app.indexOf('async function reclaimLocalBossVault()'));
  let cleared = false;
  vm.runInNewContext(`${source}\nscheduleBossTurnAdvance();`, {
    state: { debugScenario: { active: true, heldResultActionId: 'result' }, boss: { bossFlow: { stage: 'result', endsAt: Number.MAX_SAFE_INTEGER } } },
    bossPresentationTimer: 1, bossPresentationKey: 'old',
    clearTimeout: () => { cleared = true; },
    setTimeout: () => assert.fail('held results must not schedule timers'),
  });
  assert.equal(cleared, true);
});

test('ability changes reset special variants and preparation preserves errors', () => {
  assert.match(app, /setBossLabOptions\(bossLabElement\('debugBossLabVariant'\), ability.variants, 'interactive'\)/);
  assert.match(app, /finally\s*\{\s*validateBossLabSelection\(\{ preserveError: true \}\)/);
});
