import test from 'node:test';
import assert from 'node:assert/strict';
import { resourceFeedbackSteps } from '../js/boss/ui/resource-feedback.js';
import { nemesisBossMechanics } from '../js/boss/mechanics/nemesis.js';
import { buildBossDebugScenario, getBossDebugCombatState, setBossDebugCombatEntity, createBossDebugSnapshot, restoreBossDebugSnapshot } from '../js/boss/boss-debug-scenarios.js';
import { normalizeBossState, notifyBossDiscardTaken, triggerBossDebugCombatEffect } from '../js/boss/boss-engine.js';
import { triggerBossDebugZombie } from '../js/boss/boss-debug-scenarios.js';

const fixture=id=>buildBossDebugScenario(null,{bossId:id,abilityId:id==='nemesis'?'stars_hunt':'blood_tithe',phase:1,variant:'interactive',target:'auto'}).state;

for(const [mutated,reinforced,infection,healing,grabs] of [[false,false,2,40,1],[true,false,4,70,2],[false,true,4,70,2],[true,true,6,100,3]]) {
  test(`laboratório dispara passivas reais; Mutado ${mutated}, Reforçado ${reinforced}`,()=>{
    const s=fixture('nemesis'),b=s.boss,turn=s.turnNumber,round=b.roundNumber,cards=JSON.stringify(s.players);
    for(const id of ['infected','devourer','grabber'])setBossDebugCombatEntity(s,{entityId:id,status:'persistent',hp:50,mutated,reinforced});
    // One Horda buff at a time, exactly as in real games.
    const buff=id=>{b.hordeBuff=reinforced?{entityId:id,expiresRound:round+1}:null;};
    buff('infected');b.danger=19;
    const [event]=triggerBossDebugZombie(s,{entityId:'infected',playerId:0});
    assert.equal(b.danger,19+infection);assert.equal(event.sourceEntityId,'infected');
    assert.equal(resourceFeedbackSteps(b,event)[0].before,19);assert.equal(resourceFeedbackSteps(b,event)[0].amount,infection);
    buff('devourer');b.hp=b.maxHp-150;b.devourerFeed.credits=2;
    const [heal]=triggerBossDebugZombie(s,{entityId:'devourer',playerId:0});assert.equal(heal.type,'bossHeal');assert.equal(heal.amount,healing);
    assert.equal(b.devourerFeed.credits,2);
    triggerBossDebugZombie(s,{entityId:'devourer',playerId:0});assert.equal(b.hp,b.maxHp-150+Math.min(150,healing*2));
    assert.equal(b.devourerTurnIds.includes(`${turn}:0`),false);
    buff('grabber');b.currentIntent=null;
    const [grab]=triggerBossDebugZombie(s,{entityId:'grabber',playerId:0});assert.equal(grab.type,'nemesisGrab');assert.equal(grab.cardIds.length,grabs);
    assert.equal(b.grabbedTurnIds.includes(`${turn}:0`),false);
    assert.equal(s.turnNumber,turn);assert.equal(b.roundNumber,round);assert.equal(JSON.stringify(s.players),cards);
    const restored=restoreBossDebugSnapshot(createBossDebugSnapshot(s));normalizeBossState(restored);
    assert.deepEqual(restored.boss.grabbedByPlayer,b.grabbedByPlayer);assert.equal(restored.boss.danger,b.danger);
  });
}

test('laboratório: limites reais, objetivo com base/bônus e sem repetir resolução',()=>{
  const s=fixture('nemesis'),b=s.boss;
  setBossDebugCombatEntity(s,{entityId:'infected',status:'persistent',hp:60});
  b.danger=99;const [clamped]=triggerBossDebugZombie(s,{entityId:'infected',playerId:0});assert.equal(clamped.amount,1);assert.equal(b.danger,100);
  b.result=null;b.danger=0;
  b.currentIntent={id:'debugObjective',abilityId:'stars_hunt',name:'Caçada',payload:{targetPlayerId:0,failure:8,contributed:false}};
  const events=triggerBossDebugZombie(s,{entityId:'infected',playerId:0,action:'objective'});
  const objective=events.find(e=>e.type==='nemesisObjective');assert.equal(objective.amount,10);
  assert.deepEqual(resourceFeedbackSteps(b,objective).map(e=>[e.entityId,e.amount]),[['boss',8],['infected',2]]);
  const snapshot=JSON.stringify(s);assert.throws(()=>triggerBossDebugZombie(s,{entityId:'infected',playerId:0,action:'objective'}));assert.equal(JSON.stringify(s),snapshot);
});

test('laboratório: passiva exige cenário Nemesis, zumbi vivo e jogador válido',()=>{
  for(const id of ['nemesis','dimitrescu']) {
    const s=fixture(id);normalizeBossState(s);const before=JSON.stringify(s);
    assert.throws(()=>triggerBossDebugZombie(s,{entityId:'infected',playerId:0}));assert.equal(JSON.stringify(s),before);
  }
  const s=fixture('nemesis');setBossDebugCombatEntity(s,{entityId:'devourer',status:'persistent',hp:60});
  assert.deepEqual(triggerBossDebugZombie(s,{entityId:'devourer',playerId:0}),[],'full HP does not fake a heal animation');
  for(const config of [{entityId:'devourer',playerId:99},{entityId:'devourer',playerId:0,action:'bad'}]) {
    const before=JSON.stringify(s);assert.throws(()=>triggerBossDebugZombie(s,config));assert.equal(JSON.stringify(s),before);
  }
  delete s.debugScenario;assert.throws(()=>triggerBossDebugCombatEffect(s,'devourer',0));
  const [manualHeal]=triggerBossDebugZombie(s,{entityId:'devourer',playerId:0,prepareHeal:true});
  assert.equal(manualHeal.amount,40,'explicit DevTools action works in an existing local battle');
});

test('clique direto prepara zumbi ausente e gera evento real; cura prepara ferimento só quando solicitado',()=>{
  const s=fixture('nemesis');
  const original=createBossDebugSnapshot(s);
  const [infection]=triggerBossDebugZombie(s,{entityId:'infected',playerId:0,setup:{status:'persistent',hp:100,mutated:true,reinforced:true}});
  assert.equal(infection.amount,6);assert.equal(infection.sourceEntityId,'infected');
  assert.equal(s.boss.combatEntities.find(e=>e.id==='infected').status,'persistent');
  const [heal]=triggerBossDebugZombie(s,{entityId:'devourer',playerId:0,setup:{status:'persistent',hp:100},prepareHeal:true});
  assert.equal(heal.type,'bossHeal');assert.equal(heal.amount,40);assert.equal(s.boss.hp,s.boss.maxHp);
  assert.equal(restoreBossDebugSnapshot(original).boss.combatEntities.find(e=>e.id==='infected').status,'absent');
  const snapshot=JSON.stringify(s);
  assert.throws(()=>triggerBossDebugZombie(s,{entityId:'devourer',playerId:99,setup:{status:'persistent',hp:100},prepareHeal:true}));
  assert.equal(JSON.stringify(s),snapshot);
  assert.deepEqual(triggerBossDebugZombie(s,{entityId:'devourer',playerId:0,prepareHeal:false}),[]);
});

test('Daniela tem origem própria e apenas Sede realmente aplicada via motor',()=>{
  const state=fixture('dimitrescu'),boss=state.boss;
  const d=boss.combatEntities.find(d=>d.id==='daniela');d.passive={round:boss.roundNumber,status:'active'};
  boss.danger=99;notifyBossDiscardTaken(state,0,[{id:'test',rank:'K',suit:'♥'}]);
  const event=boss.eventLog.find(e=>e.type==='bloodChange' && e.sourceEntityId==='daniela');
  assert.equal(event.amount,1);assert.equal(event.dangerBefore,99);
  assert.deepEqual(resourceFeedbackSteps(boss,event).map(s=>[s.entityId,s.amount,s.before,s.after]),[['daniela',1,99,100]]);
});

test('Devorador usa HP anterior e cura efetiva para transferência; não usa Infecção',()=>{
  const s=fixture('nemesis');setBossDebugCombatEntity(s,{entityId:'devourer',status:'persistent',hp:80});
  s.boss.hp=s.boss.maxHp-10;s.boss.danger=19;
  const [event]=triggerBossDebugZombie(s,{entityId:'devourer',playerId:0});
  assert.equal(event.hpBefore,s.boss.maxHp-10);assert.equal(event.amount,10);
  assert.deepEqual(resourceFeedbackSteps(s.boss,event),[{entityId:'devourer',metric:'hp',amount:10,before:s.boss.maxHp-10,after:s.boss.maxHp,color:'#9cde4d',label:'HP'}]);
  assert.equal(s.boss.danger,19);
});

for(const id of ['bela','cassandra','daniela']) test(`DevTools ${id}: preparar, executar +3, sem repetir e sem mudar turno/cartas/HP`,()=>{
  const s=fixture('dimitrescu'),b=s.boss,cards=JSON.stringify(s.players),hp=b.hp,turn=s.turnNumber,round=b.roundNumber;
  const playerId=id==='bela'?(b.combatEntities.find(e=>e.id==='bela').passive?.targetPlayerId??0):0;
  triggerBossDebugZombie(s,{entityId:id,playerId,action:'prepare'});
  const daughter=b.combatEntities.find(d=>d.id===id);assert.equal(daughter.passive.status,'active');
  const [event]=triggerBossDebugZombie(s,{entityId:id,playerId});
  assert.equal(event.amount,3);assert.equal(event.sourceEntityId,id);assert.equal(b.danger,3);
  assert.equal(resourceFeedbackSteps(b,event)[0].entityId,id);
  assert.deepEqual(triggerBossDebugZombie(s,{entityId:id,playerId}),[]);
  assert.equal(b.danger,3);assert.equal(b.hp,hp);assert.equal(s.turnNumber,turn);assert.equal(b.roundNumber,round);assert.equal(JSON.stringify(s.players),cards);
  const restored=restoreBossDebugSnapshot(createBossDebugSnapshot(s));normalizeBossState(restored);assert.equal(restored.boss.danger,3);
  triggerBossDebugZombie(s,{entityId:id,playerId,action:'prepare'});
  const [repeat]=triggerBossDebugZombie(s,{entityId:id,playerId});assert.notEqual(repeat.actionId,event.actionId);
});

test('DevTools filhas: sucesso, Relíquia e ausência de candidato não inventam punição',()=>{
  const s=fixture('dimitrescu');
  triggerBossDebugZombie(s,{entityId:'bela',playerId:0,action:'prepare'});
  const d=s.boss.combatEntities.find(e=>e.id==='bela');d.passive.status='success';
  assert.deepEqual(triggerBossDebugZombie(s,{entityId:'bela',playerId:0}),[]);
  d.relicRound=s.boss.roundNumber;triggerBossDebugZombie(s,{entityId:'bela',playerId:0,action:'prepare'});
  assert.equal(d.passive.status,'suppressed');assert.deepEqual(triggerBossDebugZombie(s,{entityId:'bela',playerId:0}),[]);
  d.relicRound=null;s.players.forEach(p=>p.hand=[]);s.teams[0].melds=[];
  for(const id of ['bela','cassandra']) {triggerBossDebugZombie(s,{entityId:id,playerId:0,action:'prepare'});assert.deepEqual(triggerBossDebugZombie(s,{entityId:id,playerId:0}),[]);}
  assert.equal(s.boss.danger,0);
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
