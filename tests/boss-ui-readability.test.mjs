import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBossDebugScenario } from '../js/boss/boss-debug-scenarios.js';
import { selectNextBossIntent } from '../js/boss/boss-engine.js';
import { buildBossAbilityHelp, buildBossActionPresentation } from '../js/boss/boss-presentation.js';

for (const abilityId of ['horde_command', 'parasite_regeneration', 'viral_reanimation', 'rocket_launcher', 'omega_outbreak']) {
  test(`${abilityId}: ajuda específica sem parágrafo genérico irrelevante`, () => {
    const { state } = buildBossDebugScenario(null, { bossId: 'nemesis', abilityId, phase: 'auto' });
    selectNextBossIntent(state, { debug: true });
    const help = buildBossAbilityHelp(state);
    assert.ok(help?.text);
    assert.ok(help.text.length < 350, help.text);
    assert.doesNotMatch(help.text, /Descarte legal conta como saída|Somam uma vez apenas em falhas|undefined/);
    assert.doesNotMatch(buildBossActionPresentation(state).consequence, /modificadores por falha/);
  });
}
test('ajudas extensas dos chefes têm blocos de leitura sem perder exceções', () => {
  const { state } = buildBossDebugScenario(null, { bossId: 'banker', abilityId: 'fixed_interest', phase: 2 });
  selectNextBossIntent(state, { debug: true });
  const text = buildBossAbilityHelp(state).text;
  assert.ok(text.includes('\n')); assert.ok(text.length < 260);
  assert.match(text, /prende 1 carta/); assert.match(text, /substitui a compra normal/); assert.match(text, /obrigatório/);
});
