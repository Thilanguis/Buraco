import test from 'node:test';
import assert from 'node:assert/strict';
import { castleDeal, castleBattle, castleComboProbe, STRATEGIES, summarize } from '../scripts/dimitrescu-item-experiment.mjs';
import { CASTLE_BALANCE } from '../js/boss/dimitrescu-castle.js';

test('experimento: deck físico108, itens15/3tipo e deal aleatório independente da configuração',()=>{
  const a=castleDeal(2000),b=castleDeal(2000,{daughterHp:450,daggerTransfer:.35});
  assert.deepEqual(a.players,b.players);assert.deepEqual(a.stock,b.stock);assert.deepEqual(a.boss.castleItems,b.boss.castleItems);
  const cards=[...a.stock,...a.discard,...a.deadPiles.flat(),...a.players.flatMap(p=>p.hand)];
  assert.equal(cards.length,108);assert.equal(new Set(cards.map(c=>c.id)).size,108);
  for(const type of Object.keys(CASTLE_BALANCE.maxHpLossPercent))assert.equal(Object.values(a.boss.castleItems).filter(x=>x.type===type).length,3);
  assert.notDeepEqual(a.players,castleDeal(2001).players);
});
test('experimento: dez comparações usam oito políticas e coortes observadas, sem forçar chegada de itens',()=>{
  assert.equal(STRATEGIES.length,8);const a=castleBattle(2000),b=castleBattle(2000);assert.deepEqual(a,b);
  assert.ok(a.encounteredItems<=15);assert.ok(a.usedItems<=15);assert.ok(a.usedItems<=a.encounteredItems);
  assert.ok(a.rounds>1);assert.equal(summarize([a]).n,1);assert.match(summarize([a]).warning,/NOT competent-duo/);
  assert.equal(summarize([]).policyBossPercent,null);assert.equal(summarize([]).policyWilson95,null);
});
test('experimento: comparação legacy conserva regras450/piso200; candidatos não mudam defaults',()=>{
  const old=castleDeal(2000,{legacy:true});assert.equal(old.boss.castleItemRulesVersion,1);assert.equal(old.boss.combatEntities[0].maxHp,450);
  const candidate=castleDeal(2000,{daughterHp:450,daughterHpFloor:250,bleedPercent:.12});
  assert.equal(candidate.boss.castleItemRules.daughterHpFloor,250);assert.equal(candidate.boss.combatEntities[0].maxHp,450);
  assert.equal(castleDeal(2000).boss.combatEntities[0].maxHp,500);assert.equal(CASTLE_BALANCE.bleedPercent,.1);
});
for(const [bleedPercent,alone,anti,cold] of [[.08,410,285,260],[.10,390,265,240],[.12,370,245,220]]) {
  test(`combos controlados de hemorragia ${bleedPercent*100}% confirmam regen/Frio/Anti canônicos`,()=>{
    assert.equal(castleComboProbe(['explosive'],{bleedPercent}).afterTwoRounds,alone);
    assert.equal(castleComboProbe(['anticoagulant','explosive'],{bleedPercent}).afterTwoRounds,anti);
    assert.equal(castleComboProbe(['cold_flask','explosive'],{bleedPercent}).afterTwoRounds,cold);
  });
}
test('combo completo controlado: piso300 permanece, mas vida pode cair abaixo; itens não transmitem',()=>{
  const result=castleComboProbe(['anticoagulant','cold_flask','explosive']);
  assert.deepEqual(result,{afterItems:240,afterTwoRounds:165,maxHp:300,ladyHp:2000});
});
