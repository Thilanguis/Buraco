import test from 'node:test';
import assert from 'node:assert/strict';
import {scenario,card} from './boss-cooperative-fixture.mjs';
import {normalizeBossState,notifyBossPurchaseCompleted,inspectBossAbilityEligibility,applyBossMeldTransition} from '../js/boss/boss-engine.js';
import {nemesisBossMechanics as mechanics,getNemesisGrabberTarget} from '../js/boss/mechanics/nemesis.js';
import {nemesisBossUi} from '../js/boss/ui/nemesis-ui.js';
import {resourceFeedbackSteps} from '../js/boss/ui/resource-feedback.js';
import {createBossDebugSnapshot,restoreBossDebugSnapshot,simulateBossDebugReload} from '../js/boss/boss-debug-scenarios.js';
import {createUndoTransaction,restoreUndoTransaction} from '../js/game/undo-transaction.js';

function fixture(seed=73) {
  const s=scenario();s.boss.seed=seed;s.boss.hp=1000;
  s.players.forEach((p,i)=>{p.isBot=false;p.name=i?'Luana':'Biel';p.hand=[card('wild','JOKER'),card('two','2','♣'),card('useful','7','♣'),card('discard','K','♥'),card('idle','Q','♦')].map(c=>({...c,id:`${i}:${c.id}`}));});
  s.teams[0].melds=[['4','5','6'].map(r=>card(`base:${r}`,r,'♣'))];
  for(const e of s.boss.combatEntities){e.status='persistent';e.hp=e.maxHp;}
  normalizeBossState(s);return s;
}
function contribute(s,n,playerId=0,prefix='fresh') {
  const events=[];
  mechanics.onMeldTransition({boss:s.boss,gameState:s,teamId:0,playerId,meldId:'game',cardsAdded:Array.from({length:n},(_,i)=>card(`${prefix}:${i}`)),
    previousDangerReliefValue:0,nextDangerReliefValue:0,recordBossEvent:e=>{events.push(e);s.boss.eventLog.push(e);return e;}});
  return events;
}
const dev=s=>s.boss.combatEntities.find(e=>e.id==='devourer');
const grab=s=>s.boss.combatEntities.find(e=>e.id==='grabber');
for(const n of [1,2,3,4,6,7,9,12])test(`Devorador: ${n} new cards resolve all groups immediately in one action`,()=>{
  const s=fixture(),events=contribute(s,n);
  assert.equal(s.boss.hp,1000+Math.floor(n/3)*20);
  assert.equal(events.length,Math.floor(n/3));assert.equal(s.boss.devourerFeed.credits,n%3);
  assert.equal(new Set(events.map(e=>e.actionId)).size,events.length);
  assert.deepEqual(events.map(e=>resourceFeedbackSteps(s.boss,e)[0].amount),events.map(()=>20));
  const chip=nemesisBossUi.combatHud({gameState:s,playerId:0}).entities.find(e=>e.id==='devourer').chips.find(c=>c.label.startsWith('CURA'));
  assert.equal(chip.charge,n%3);assert.equal(chip.label,'CURA 20');
  assert.deepEqual(contribute(s,n),[],'same IDs never contribute twice');
  for(const loaded of [simulateBossDebugReload(s),restoreBossDebugSnapshot(createBossDebugSnapshot(s)),restoreUndoTransaction(createUndoTransaction(s,{}, {actorPlayerId:0})).state]) {
    assert.equal(loaded.boss.hp,s.boss.hp);assert.equal(loaded.boss.devourerFeed.credits,n%3);
    assert.deepEqual(contribute(loaded,n),[]);assert.equal(loaded.boss.eventLog.length,s.boss.eventLog.length);
  }
});
for(const [mutated,reinforced,value] of [[false,false,20],[true,false,35],[false,true,35],[true,true,50]])test(`Devorador: four cures of ${value} in the same turn, no compensatory cap`,()=>{
  const s=fixture();dev(s).mutated=mutated;
  if(reinforced)s.boss.hordeBuff={entityId:'devourer',expiresRound:s.boss.roundNumber};
  for(let i=0;i<4;i++)assert.equal(contribute(s,3,0,`action:${i}`)[0].amount,value);
  assert.equal(s.boss.hp,1000+4*value);assert.equal(s.boss.devourerFeed.credits,0);
});
test('Shared partial groups survive players/turns, no turn-end healing, no replay and capped heals consume groups',()=>{
  const s=fixture();contribute(s,2,0,'first');s.turnNumber++;
  mechanics.onPlayerTurnEnd({boss:s.boss,gameState:s,playerId:0,recordBossEvent:()=>assert.fail('no queued heal')});
  const events=contribute(s,5,1,'second');assert.equal(events.length,2);assert.equal(s.boss.devourerFeed.credits,1);
  const clone=JSON.parse(JSON.stringify(s));assert.deepEqual(contribute(s,2,0,'third'),contribute(clone,2,0,'third'));
  s.boss.hp=2195;const cap=contribute(s,12,1,'cap');assert.equal(cap.length,1);assert.equal(cap[0].amount,5);
  assert.equal(s.boss.hp,2200);assert.equal(s.boss.devourerFeed.credits,0);
  s.boss.hp=2000;assert.deepEqual(contribute(s,0),[]);assert.equal(s.boss.hp,2000);
});
test('Death resets progress; revival baselines the table and preserves cure ID sequence',()=>{
  const s=fixture();s.boss.phase=3;contribute(s,5);
  s.boss.combatTargetsByPlayer[0]='devourer';mechanics.applyDamage({boss:s.boss,gameState:s,playerId:0,damage:999,sourceActionId:'death'});
  assert.equal(s.boss.devourerFeed.credits,0);assert.deepEqual(contribute(s,12,1,'dead'),[]);
  mechanics.resolveIntent({boss:s.boss,gameState:s,intent:{id:'revive',abilityId:'viral_reanimation',announcedPhase:3,payload:{entityId:'devourer'}}});
  const next=contribute(s,3,1,'revived');assert.equal(next[0].actionId,'devourer:v2:2');assert.equal(s.boss.devourerFeed.credits,0);
});
for(const credits of [0,2,3,5,6,9,12])test(`Old save migration ${credits} credits: keep remainder, no retroactive cure`,()=>{
  const s=fixture();s.boss.devourerFeed={version:1,active:true,credits,countedCardIds:['old']};s.boss.devourerTurnIds=['1:0'];
  normalizeBossState(s);assert.equal(s.boss.hp,1000);assert.equal(s.boss.devourerFeed.credits,credits%3);
  assert.equal(s.boss.devourerFeed.discardedLegacyCredits,credits-credits%3);assert.deepEqual(s.boss.devourerFeed.countedCardIds,['old']);
  assert.equal(s.boss.devourerTurnIds,undefined);const before=JSON.stringify(s.boss);normalizeBossState(s);assert.equal(JSON.stringify(s.boss),before);
});
for(const terminal of ['result','defeated','zeroHp','finished'])test(`No Devorador healing after ${terminal}`,()=>{
  const s=fixture();if(terminal==='result')s.boss.result={victory:false};else if(terminal==='defeated')s.boss.defeated=true;else if(terminal==='finished')s.finished=true;else s.boss.hp=0;
  const hp=s.boss.hp;assert.deepEqual(contribute(s,12),[]);assert.equal(s.boss.hp,hp);
});
test('Canonical new and existing meld contributions each count once, including both players',()=>{
  const s=fixture();s.boss.currentIntent=null;s.boss.combatTargetsByPlayer={0:'grabber',1:'infected'};
  const cards=['3','4','5'].map(r=>card(`new:${r}`,r,'♥'));s.teams[0].melds.push(cards);
  applyBossMeldTransition(s,{teamId:0,playerId:0,meldIndex:1,oldKind:'simple',newKind:'simple',cardsAdded:cards,isNewMeld:true});
  const extensions=['6','7','8'].map(r=>card(`extend:${r}`,r,'♥'));s.teams[0].melds[1].push(...extensions);
  applyBossMeldTransition(s,{teamId:0,playerId:1,meldIndex:1,oldKind:'simple',newKind:'simple',cardsAdded:extensions});
  assert.equal(s.boss.devourerHealingTotal,40);assert.equal(s.boss.devourerFeed.credits,0);
  applyBossMeldTransition(s,{teamId:0,playerId:1,meldIndex:1,oldKind:'simple',newKind:'simple',cardsAdded:extensions});
  assert.equal(s.boss.devourerHealingTotal,40);
});
test('Grabber alternates canonical rounds only, including phases, death/revival, reload, undo and sync',()=>{
  const s=fixture(),first=getNemesisGrabberTarget(s);
  for(let round=1;round<=8;round++) {
    s.boss.roundNumber=round;s.boss.phase=round>4?3:1;normalizeBossState(s);
    const id=getNemesisGrabberTarget(s);assert.equal(id,round%2?first:1-first);
    for(const p of s.players){s.turnNumber++;s.currentPlayer=p.id;const events=notifyBossPurchaseCompleted(s,p.id);assert.equal(events.length,p.id===id?1:0);}
    const view=nemesisBossUi.combatHud({gameState:s,playerId:0}).entities.find(e=>e.id==='grabber');
    assert.ok(view.chips.some(c=>c.label===`ALVO: ${s.players[id].name}`));
    const snapshot=createBossDebugSnapshot(s),undo=createUndoTransaction(s,{}, {actorPlayerId:id});
    for(const loaded of [simulateBossDebugReload(s),restoreBossDebugSnapshot(snapshot),restoreUndoTransaction(undo).state,JSON.parse(JSON.stringify(s))]) {
      assert.equal(getNemesisGrabberTarget(loaded),id);assert.deepEqual(notifyBossPurchaseCompleted(loaded,id),[]);
    }
  }
  for(const status of ['entering','corpse','repelled','absent']) {
    grab(s).status=status;
    assert.ok(!nemesisBossUi.combatHud({gameState:s,playerId:0}).entities.find(e=>e.id==='grabber')?.chips.some(c=>c.label.startsWith('ALVO:')));
  }
  grab(s).status='corpse';grab(s).hp=0;const before=getNemesisGrabberTarget(s);
  mechanics.resolveIntent({boss:s.boss,gameState:s,intent:{id:'revive',abilityId:'viral_reanimation',announcedPhase:3,payload:{entityId:'grabber'}}});
  assert.equal(getNemesisGrabberTarget(s),before);
});
test('Grab and marking distribution has no hand-order, playable, Joker or natural-2 preference',t=>{
  const totals={targets:[0,0],grab:{},tentacle:{},barrage:{},invasion:{}};
  for(let seed=0;seed<3000;seed++) {
    const s=fixture(seed),id=getNemesisGrabberTarget(s);totals.targets[id]++;s.currentPlayer=id;
    const cloned=JSON.parse(JSON.stringify(s));cloned.players.forEach(p=>p.hand.reverse());
    notifyBossPurchaseCompleted(s,id);notifyBossPurchaseCompleted(cloned,id);
    assert.deepEqual(s.boss.grabbedByPlayer[id].cardIds,cloned.boss.grabbedByPlayer[id].cardIds);
    const picked=s.boss.grabbedByPlayer[id].cardIds[0].split(':')[1];totals.grab[picked]=(totals.grab[picked]||0)+1;
    for(const [ability,bucket] of [['infectious_tentacle','tentacle'],['tentacle_barrage','barrage'],['horde_invasion','invasion']]) {
      const q=fixture(seed);q.boss.phase=3;q.boss.phaseTransitions=[1,2,3];q.boss.starsPlayerId=0;q.boss.grabbedByPlayer={};
      if(bucket==='invasion'){grab(q).status='absent';q.boss.combatEntities.filter(e=>e.id!=='grabber').forEach(e=>{e.status='corpse';e.hp=0;});}
      const inspected=inspectBossAbilityEligibility(q,ability);assert.ok(inspected.eligible,`${ability}: ${JSON.stringify(inspected)}`);
      const payload=inspected.payload;
      for(const raw of payload.cardIds){const key=raw.split(':')[1];totals[bucket][key]=(totals[bucket][key]||0)+1;}
      q.players[0].hand.reverse();assert.deepEqual(inspectBossAbilityEligibility(q,ability).payload.cardIds,payload.cardIds);
    }
  }
  assert.ok(totals.targets.every(n=>n>1350&&n<1650));
  for(const [bucket,count] of [['grab',600],['tentacle',1200],['barrage',1800],['invasion',600]]) {
    assert.equal(Object.keys(totals[bucket]).length,5);
    for(const n of Object.values(totals[bucket]))assert.ok(n>count*.83&&n<count*1.17,JSON.stringify(totals));
  }
  t.diagnostic(JSON.stringify(totals));
});

for(const count of [1,2,3])test(`Grabber on a 108-card hand: ${count} distinct cards, deterministic and order-independent`,()=>{
  const s=fixture(),id=getNemesisGrabberTarget(s);s.currentPlayer=id;
  s.players[id].hand=Array.from({length:108},(_,i)=>card(`physical:${i}`));
  grab(s).mutated=count>1;if(count===3)s.boss.hordeBuff={entityId:'grabber',expiresRound:99};
  const twin=JSON.parse(JSON.stringify(s));twin.players[id].hand.reverse();
  notifyBossPurchaseCompleted(s,id);notifyBossPurchaseCompleted(twin,id);
  const picked=s.boss.grabbedByPlayer[id].cardIds;assert.equal(picked.length,count);assert.equal(new Set(picked).size,count);
  assert.deepEqual(twin.boss.grabbedByPlayer[id].cardIds,picked);
});
