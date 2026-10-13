import assert from 'node:assert/strict';
import test from 'node:test';
import { bankerDefinition, BOSS_DAMAGE_BY_KIND } from '../js/boss/bosses/banker.js';
import { dominatrixDefinition } from '../js/boss/bosses/dominatrix.js';
import { matriarchDefinition } from '../js/boss/bosses/matriarch.js';
import { neheleniaDefinition } from '../js/boss/bosses/nehelenia.js';
import { nemesisDefinition, NEMESIS_ZOMBIES } from '../js/boss/bosses/nemesis.js';
import { dimitrescuDefinition } from '../js/boss/bosses/dimitrescu.js';
import { MATRIARCH_MAX_FLOWERS, COOPERATIVE_BALANCE_VERSION, NEHELENIA_FAILURE_POINTS } from '../js/boss/boss-balance.js';

// Contratos independentes: refletem a aprovação de 13/10, não a implementação atual.
const hp = [
  [bankerDefinition, 2650], [dominatrixDefinition, 2800],
  [matriarchDefinition, 2300], [neheleniaDefinition, 2400],
  [nemesisDefinition, 2500], [dimitrescuDefinition, 2000],
];
for (const [definition, expected] of hp) test(`HP vigente ${definition.id}`, () => {
  assert.equal(definition.maxHp, expected);
});
for (const [kind, expected] of [['suja',100],['limpa',200],['real',500],['asas',1000]])
  test(`bônus da canastra ${kind}: ${expected}`, () => assert.equal(BOSS_DAMAGE_BY_KIND[kind], expected));
test('evoluções são incrementais', () => {
  assert.equal(BOSS_DAMAGE_BY_KIND.limpa-BOSS_DAMAGE_BY_KIND.suja, 100);
  assert.equal(BOSS_DAMAGE_BY_KIND.real-BOSS_DAMAGE_BY_KIND.limpa, 300);
  assert.equal(BOSS_DAMAGE_BY_KIND.asas-BOSS_DAMAGE_BY_KIND.real, 500);
});
for (const [abilityId, expected] of Object.entries({mirrored_meld:14,follow_reflection:12,discard_mirror:12,eternal_nightmare:20}))
  test(`Nehelenia ${abilityId} = +${expected}`, () => assert.equal(NEHELENIA_FAILURE_POINTS[abilityId], expected));
test('10 Flores e versão 2 do pacote', () => {
  assert.equal(MATRIARCH_MAX_FLOWERS, 10);
  assert.equal(COOPERATIVE_BALANCE_VERSION, 2);
});
test('zumbis: HP individual e invasão nas três fases', () => {
  assert.deepEqual(NEMESIS_ZOMBIES.map(({id,maxHp})=>[id,maxHp]), [['grabber',180],['infected',190],['devourer',200]]);
  assert.deepEqual(nemesisDefinition.abilities.find(a=>a.id==='horde_invasion')?.phases,[1,2,3]);
});
