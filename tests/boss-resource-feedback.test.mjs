import test from 'node:test';
import assert from 'node:assert/strict';
import { resourceFeedbackSteps } from '../js/boss/ui/resource-feedback.js';
import { nemesisBossMechanics } from '../js/boss/mechanics/nemesis.js';
import { buildBossDebugScenario, getBossDebugCombatState, setBossDebugCombatEntity, createBossDebugSnapshot, restoreBossDebugSnapshot } from '../js/boss/boss-debug-scenarios.js';
import { normalizeBossState, notifyBossDiscardTaken } from '../js/boss/boss-engine.js';

const fixture=id=>buildBossDebugScenario(null,{bossId:id,abilityId:id==='nemesis'?'stars_hunt':'blood_tithe',phase:1,variant:'interactive',target:'auto'}).state;

test('Daniela tem origem própria e apenas Sede realmente aplicada via motor',()=>{
  const state=fixture('dimitrescu'),boss=state.boss;
  const d=boss.combatEntities.find(d=>d.id==='daniela');d.passive={round:boss.roundNumber,status:'active'};
  boss.danger=99;notifyBossDiscardTaken(state,0,[{id:'test',rank:'K',suit:'♥'}]);
  const event=boss.eventLog.find(e=>e.type==='bloodChange' && e.sourceEntityId==='daniela');
  assert.equal(event.amount,1);assert.equal(event.dangerBefore,99);
  assert.deepEqual(resourceFeedbackSteps(boss,event).map(s=>[s.entityId,s.amount,s.before,s.after]),[['daniela',1,99,100]]);
});

for(const danger of [0,95,99]) test(`Nemesis separa base/Infectado/Ômega sem recalcular buffs: ${danger}`,()=>{
  const state=fixture('nemesis'),boss=state.boss;
  const infected=boss.combatEntities.find(e=>e.id==='infected');infected.status='persistent';infected.mutated=true;
  boss.hordeBuff={entityId:'infected',expiresRound:boss.roundNumber+1};boss.omegaBuff={expiresRound:boss.roundNumber+1};
  boss.danger=danger;boss.currentIntent={id:'test',abilityId:'stars_hunt',name:'Caçada',payload:{targetPlayerId:0,failure:8,contributed:false}};
  const events=[];nemesisBossMechanics.onPlayerTurnEnd({boss,gameState:state,playerId:0,recordBossEvent:e=>events.push(e)});
  const event=events.find(e=>e.type==='nemesisObjective');
  const original=JSON.stringify(state),steps=resourceFeedbackSteps(boss,event);
  assert.equal(steps.reduce((sum,s)=>sum+s.amount,0),boss.danger-danger);
  if(danger===0) assert.deepEqual(steps.map(s=>[s.entityId,s.amount]),[['boss',8],['infected',6],['boss',2]]);
  assert.equal(JSON.stringify(state),original);
  boss.hordeBuff=null;boss.omegaBuff=null;infected.status='corpse';
  assert.deepEqual(resourceFeedbackSteps(boss,event),steps,'snapshot metadata retains bonuses at the time of resolution');
});

test('sucesso/resultado/debug e chefes fora do escopo não criam transferências',()=>{
  const boss={id:'nemesis',danger:20};
  for(const event of [{type:'nemesisObjective',amount:0},{type:'bossAbility',dangerDelta:20},{type:'bossDebugEntity',amount:20}]) assert.deepEqual(resourceFeedbackSteps(boss,event),[]);
  assert.deepEqual(resourceFeedbackSteps({id:'nehelenia'}, {type:'dreamMirror',amount:5}),[]);
});

test('ganho da Lady e recuperação da canastra usam números e direções reais',()=>{
  const boss={id:'dimitrescu',danger:100};
  assert.deepEqual(resourceFeedbackSteps(boss,{type:'bossAbility',dangerBefore:99,danger:100,dangerDelta:16,appliedDangerDelta:1}).map(s=>[s.entityId,s.amount]),[['boss',1]]);
  assert.deepEqual(resourceFeedbackSteps(boss,{type:'bossDamage',dangerBefore:20,danger:12,dangerDelta:-8}).map(s=>[s.before,s.after,s.amount]),[[20,12,-8]]);
});

test('laboratório traz zumbis independente da habilidade/teto, preservando o restante',()=>{
  const state=fixture('nemesis'),boss=state.boss;
  const initial={hp:boss.hp,danger:boss.danger,intent:JSON.stringify(boss.currentIntent),cards:JSON.stringify(state.players)};
  for(const id of ['grabber','infected','devourer']) setBossDebugCombatEntity(state,{bossId:'nemesis',entityId:id,status:'persistent',hp:80,mutated:true,reinforced:id==='infected'});
  assert.ok(boss.combatEntities.every(e=>e.status==='persistent'&&e.hp===80&&e.mutated));
  assert.equal(getBossDebugCombatState(state).entities.find(e=>e.id==='infected').reinforced,true);
  assert.equal(boss.hp,initial.hp);assert.equal(boss.danger,initial.danger);assert.equal(JSON.stringify(boss.currentIntent),initial.intent);assert.equal(JSON.stringify(state.players),initial.cards);
  const reload=restoreBossDebugSnapshot(createBossDebugSnapshot(state));normalizeBossState(reload);
  assert.deepEqual(getBossDebugCombatState(reload),getBossDebugCombatState(state));
  boss.grabbedByPlayer={0:{cardIds:['one']}};
  setBossDebugCombatEntity(state,{entityId:'grabber',status:'absent'});assert.deepEqual(boss.grabbedByPlayer,{});
});

test('laboratório filhas: morte devolve anexos; restauração/undo não sorteia itens',()=>{
  const state=fixture('dimitrescu'),boss=state.boss,d=boss.combatEntities[0];
  const snapshot=createBossDebugSnapshot(state),inventory=JSON.stringify(boss.castleItems);
  d.sacrificedCards=[{id:'attached',rank:'K',suit:'♥',castleItem:{type:'relic',consumed:true}}];
  setBossDebugCombatEntity(state,{entityId:d.id,status:'dead'});
  assert.equal(d.hp,0);assert.equal(state.discard[0].id,'attached');assert.equal(d.sacrificedCards.length,0);
  setBossDebugCombatEntity(state,{entityId:d.id,status:'alive',hp:120});assert.equal(d.deathRecorded,false);
  assert.equal(JSON.stringify(boss.castleItems),inventory);
  const undo=restoreBossDebugSnapshot(snapshot);assert.equal(undo.boss.combatEntities[0].hp,450);
});

test('laboratório rejeita chefe diferente, entidade e vida inválidas sem mutação',()=>{
  const state=fixture('nemesis');
  for(const options of [{bossId:'dimitrescu',entityId:'bela',status:'alive',hp:50},{entityId:'bad',status:'persistent',hp:1},
    {entityId:'grabber',status:'persistent',hp:0},{entityId:'grabber',status:'persistent',hp:999},{entityId:'grabber',status:'persistent',hp:2.5}]) {
    normalizeBossState(state);const before=JSON.stringify(state);assert.throws(()=>setBossDebugCombatEntity(state,options));assert.equal(JSON.stringify(state),before);
  }
});
