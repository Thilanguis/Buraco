import test from 'node:test';
import assert from 'node:assert/strict';
import {nemesisBossUi} from '../js/boss/ui/nemesis-ui.js';
import {scenario} from './boss-cooperative-fixture.mjs';
function fixture(credits=0,{mutated=false,reinforced=false,used=false}={}) {
  const s=scenario(),entity=s.boss.combatEntities.find(e=>e.id==='devourer');
  entity.status='persistent';entity.hp=entity.maxHp;entity.mutated=mutated;
  s.boss.devourerFeed={version:2,active:true,credits,countedCardIds:[]};
  if(reinforced)s.boss.hordeBuff={entityId:'devourer',expiresRound:s.boss.roundNumber};
  if(used)s.boss.devourerTurnIds=[`${s.turnNumber}:0`];
  return s;
}
const view=s=>nemesisBossUi.combatHud({gameState:s,playerId:0}).entities.find(e=>e.id==='devourer');
for(const credits of [0,1,2])test(`Devorador chip: ${credits}/3 shows remaining cards and cumulative rule`,()=>{
  const s=fixture(credits),before=JSON.stringify(s),v=view(s),chip=v.chips.find(c=>c.label.startsWith('CURA'));
  assert.equal(chip.label,'CURA 20');
  assert.equal(chip.charge,credits);
  assert.ok(chip.text.includes(`${3-credits} carta`));
  assert.match(chip.text,/dois jogadores somam/);assert.match(chip.text,/jogos e turnos diferentes/);
  assert.doesNotMatch(chip.text,/uma vez por turno|cooldown/);assert.match(chip.text,/reorganizar cartas não conta/);
  assert.ok(v.help.includes(chip.text));assert.equal(JSON.stringify(s),before);
});
for(const [mutated,reinforced,hp] of [[true,false,35],[false,true,35],[true,true,50]])test(`Devorador chip reflects actual buffed heal ${hp}`,()=>{
  assert.ok(view(fixture(2,{mutated,reinforced})).chips.some(c=>c.label===`CURA ${hp}`));
});
test('Healing has no quota or cooldown; old turn IDs do not affect help',()=>{
  const s=fixture(2,{used:true}),chip=view(s).chips.find(c=>c.label.startsWith('CURA'));
  assert.equal(chip.label,'CURA 20');assert.equal(chip.charge,2);
  assert.match(chip.text,/Pode curar várias vezes/);
  assert.doesNotMatch(chip.text,/só pode acontecer|uma vez por turno|cooldown/);
});
test('Snapshot/reload preserve progress; dead or invading zombie has no healing chip',()=>{
  const s=fixture(2);assert.deepEqual(view(JSON.parse(JSON.stringify(s))),view(s));
  for(const status of ['corpse','entering']) {
    s.boss.combatEntities.find(e=>e.id==='devourer').status=status;
    assert.ok(!view(s).chips.some(c=>c.label.startsWith('CURA')));
  }
});
