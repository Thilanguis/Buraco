import test from 'node:test';
import assert from 'node:assert/strict';
import { nemesisBossMechanics } from '../js/boss/mechanics/nemesis.js';

function setup() {
  const boss = { ...nemesisBossMechanics.createState(), id: 'nemesis', hp: 2000, maxHp: 2200, danger: 0, phase: 2, roundNumber: 1 };
  const gameState = { boss, teams: [{ melds: [] }], players: [] };
  for (const zombie of boss.combatEntities) {
    zombie.status = 'corpse'; zombie.hp = 0;
  }
  return { boss, gameState };
}
function candidate(gameState) {
  return nemesisBossMechanics.buildPayload({ gameState, helpers: {} }, 'viral_reanimation');
}
function revive(boss, gameState, entityId, announcedPhase=boss.phase) {
  return nemesisBossMechanics.resolveIntent({ boss, gameState,
    intent: { id: `revive-${entityId}-${announcedPhase}`, name:'Reanimação Viral', abilityId:'viral_reanimation', announcedPhase,
      payload: { entityId } } });
}
function entity(boss,id) { return boss.combatEntities.find(z => z.id===id); }
function kill(boss,id) { entity(boss,id).hp=0; entity(boss,id).status='corpse'; }

test('one resurrection per zombie across phases, but another zombie may revive',()=>{
  const {boss,gameState} = setup();
  assert.equal(candidate(gameState)?.entityId, 'grabber');
  revive(boss,gameState,'grabber');
  assert.equal(entity(boss,'grabber').revivals,1);
  assert.equal(entity(boss,'grabber').hp,110);
  assert.equal(candidate(gameState),null,'only one reanimation allowed during phase 2');
  kill(boss,'grabber');
  boss.phase=3;
  assert.equal(candidate(gameState)?.entityId, 'infected','skip dead zombie already revived once');
  revive(boss,gameState,'infected');
  assert.equal(entity(boss,'infected').revivals,1);
  assert.equal(entity(boss,'infected').hp,120);
  assert.equal(candidate(gameState),null,'phase 3 also limited to one reanimation');
});

test('stale intent cannot revive same zombie twice and cannot consume phase quota',()=>{
  const {boss,gameState}=setup();
  revive(boss,gameState,'grabber');
  kill(boss,'grabber');
  boss.phase=3;
  revive(boss,gameState,'grabber');
  assert.equal(entity(boss,'grabber').status,'corpse');
  assert.equal(entity(boss,'grabber').revivals,1);
  assert.equal(boss.reanimationsByPhase[3],undefined);
  assert.equal(candidate(gameState)?.entityId,'infected');
});

test('saved snapshot keeps lifetime resurrection counter',()=>{
  const {boss,gameState}=setup();
  revive(boss,gameState,'grabber');
  kill(boss,'grabber');
  const restored=JSON.parse(JSON.stringify(gameState));
  restored.boss.phase=3;
  nemesisBossMechanics.normalize({boss:restored.boss,gameState:restored});
  assert.equal(entity(restored.boss,'grabber').revivals,1);
  assert.equal(candidate(restored)?.entityId,'infected');
});
