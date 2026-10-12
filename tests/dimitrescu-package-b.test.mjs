import test from 'node:test';
import assert from 'node:assert/strict';
import { createBossState, normalizeBossState, useCastleItem } from '../js/boss/boss-engine.js';
import { CASTLE_BALANCE, castleRules, regenerateDaughters } from '../js/boss/dimitrescu-castle.js';
import { createUndoTransaction, restoreUndoTransaction } from '../js/game/undo-transaction.js';

const card=id=>({id,rank:'K',suit:'♥'});
function game(){return {mode:'boss_dimitrescu',boss:{...createBossState('dimitrescu',712),bossFlow:{stage:'players'}},
  currentPlayer:0,hasDrawnThisTurn:true,turnNumber:1,stock:[],discard:[card('top')],teams:[{id:0,melds:[]}],
  players:[{id:0,teamId:0,hand:[card('reserve'),card('last')]},{id:1,teamId:0,hand:[card('other')]}]};}
const daughter=s=>s.boss.combatEntities[0];
const close=s=>regenerateDaughters(s,()=>{},e=>s.boss.eventLog.push(e));
function item(s,type,id=type){s.boss.castleItems||={};s.boss.castleItems[id]={type,consumed:false};s.players[0].hand.push(card(id));assert.ok(useCastleItem(s,0,id,'bela'));}

test('pacote atual: números finais e proteção/HP preservados, petrificação 80/110/100/160/160',()=>{
  const s=game(),r=castleRules(s.boss);
  assert.deepEqual([r.daughterHp,r.regeneration,r.anticoagulantRegeneration,r.daggerTransfer,r.explosiveDamage,r.bleedAmount,r.bleedPermanent,r.coldMaxCharges],
    [500,20,10,.8,100,15,true,2]);
  assert.deepEqual([s.boss.hp,s.boss.bloodLinkProtection,r.daughterHpFloor,r.linkPerDaughter,r.passiveBlood,r.furyBloodStep],[2000,1500,130,500,3,2]);
  assert.deepEqual(r.maxHpLossByItem,{dagger:80,explosive:110,anticoagulant:100,cold_flask:160,relic:160});
  assert.deepEqual(castleRules(JSON.parse(JSON.stringify(s.boss))),CASTLE_BALANCE);
});

for(const anti of [false,true])test(`sangramento persiste por 8 rodadas; anti=${anti}, sem ticks repetidos`,()=>{
  const s=game();item(s,'explosive');if(anti)item(s,'anticoagulant');const start=daughter(s).hp;
  for(let round=1;round<=8;round++){
    s.boss.roundNumber=round;close(s);assert.equal(daughter(s).hp,start+round*(anti?-5:5));
    assert.deepEqual([daughter(s).hemorrhage.amount,daughter(s).hemorrhage.permanent,daughter(s).hemorrhage.remaining],[15,true,null]);
    const saved=JSON.stringify(s);normalizeBossState(s);close(s);assert.equal(JSON.stringify(s),saved);
  }
  assert.equal(s.boss.eventLog.filter(e=>e.type==='daughterBleed').length,8);
});

test('Frasco global temporário não bloqueia sangramento',()=>{
  const s=game();item(s,'explosive');item(s,'cold_flask','cold1');item(s,'cold_flask','cold2');
  const start=daughter(s).hp;close(s);assert.equal(daughter(s).hp,start-15);assert.equal(s.boss.castleFreeze.remainingTurns,2);
  s.boss.castleFreeze.remainingTurns=0;
  s.boss.roundNumber++;close(s);assert.equal(daughter(s).hp,start-10);
  assert.equal(daughter(s).hemorrhage.permanent,true);
});

function oldModernSave(){
  const s=game();delete s.boss.castleRebalanceVersion;
  Object.assign(s.boss.castleItemRules,{regeneration:50,anticoagulantRegeneration:25,daggerTransfer:.3,bleedAmount:null,bleedPercent:.1,bleedRounds:2,bleedPermanent:false});
  s.boss.combatEntities.forEach(d=>{d.hp=210;d.regeneration=50;});
  Object.assign(daughter(s),{maxHp:350,regeneration:25,daggerLink:true,cold:true,coldCharges:2,relicRound:3,
    hemorrhage:{amount:50,remaining:1,lastTickRound:2},castleDamageActionIds:['already-hit']});
  s.boss.combatEntities[1].hemorrhage={amount:50,remaining:0,lastTickRound:2};
  s.boss.bloodLinkProtection=420;s.boss.hp=1210;s.boss.danger=37;s.boss.roundNumber=2;s.boss.castleRegeneratedRound=2;
  s.boss.combatTargetsByPlayer={0:'bela',1:'cassandra'};
  return s;
}
for(const missingRules of [false,true])test(`migração v2 aplica B uma vez sem curar/repetir ticks; regras ausentes=${missingRules}`,()=>{
  const s=oldModernSave();if(missingRules)delete s.boss.castleItemRules;
  const undo=createUndoTransaction(s);normalizeBossState(s);
  assert.equal(s.boss.castleRebalanceVersion,1);
  assert.deepEqual(s.boss.combatEntities.map(d=>d.regeneration),[10,20,20]);
  assert.deepEqual([daughter(s).hp,daughter(s).maxHp,daughter(s).coldCharges,daughter(s).relicRound,daughter(s).daggerLink],[210,350,2,3,true]);
  assert.deepEqual(daughter(s).hemorrhage,{amount:15,remaining:null,lastTickRound:2,permanent:true});
  assert.equal(s.boss.combatEntities[1].hemorrhage.remaining,0,'expired bleeding is not resurrected');
  assert.deepEqual([s.boss.hp,s.boss.bloodLinkProtection,s.boss.danger,s.boss.castleRegeneratedRound],[1210,420,37,2]);
  assert.deepEqual(s.boss.combatTargetsByPlayer,{0:'bela',1:'cassandra'});
  assert.deepEqual(daughter(s).castleDamageActionIds,['already-hit']);
  assert.equal(castleRules(s.boss).daggerTransfer,.8);
  const saved=JSON.stringify(s);normalizeBossState(s);close(s);assert.equal(JSON.stringify(s),saved);
  const restored=restoreUndoTransaction(undo).state;normalizeBossState(restored);assert.equal(JSON.stringify(restored),saved);
});

test('morte por sangramento limpa efeito permanente e devolve cartas sem item uma vez',()=>{
  const s=game();item(s,'explosive');daughter(s).hp=15;close(s);
  assert.equal(daughter(s).status,'dead');assert.equal(daughter(s).hemorrhage,null);
  assert.equal(s.boss.bloodLinkProtection,1000);
  const returned=s.discard.find(c=>c.id==='explosive');assert.ok(returned);assert.equal(returned.castleItem.consumed,true);
  s.boss.roundNumber++;close(s);
  assert.equal(s.discard.filter(c=>c.id==='explosive').length,1);
  assert.equal(s.boss.eventLog.filter(e=>e.type==='daughterDeath').length,1);
});

for(const hp of [500,100,40])test(`Explosivo 100: dano efetivo, limite e morte com HP ${hp}`,()=>{
  const s=game();daughter(s).hp=hp;item(s,'explosive');
  const expected=Math.max(0,Math.min(hp,390)-100);
  assert.equal(daughter(s).hp,expected);assert.equal(daughter(s).maxHp,390);
  const e=s.boss.eventLog.find(e=>e.type==='castleItem');assert.equal(e.appliedDamage,Math.min(100,hp));
  assert.equal(daughter(s).status,expected?'alive':'dead');
  assert.equal(s.boss.bloodLinkProtection,expected?1500:1000);
  if(!expected){assert.equal(s.discard.filter(c=>c.id==='explosive').length,1);assert.equal(daughter(s).hemorrhage,null);}
  const saved=JSON.stringify(s);normalizeBossState(s);assert.equal(JSON.stringify(s),saved);
});

test('save pacote B com impacto60 migra só impactos futuros para100, sem dano retroativo',()=>{
  const s=game();item(s,'explosive');delete s.boss.castleExplosiveBalanceVersion;
  s.boss.castleItemRules.explosiveDamage=60;const hp=daughter(s).hp,log=JSON.stringify(s.boss.eventLog);
  const undo=createUndoTransaction(s);normalizeBossState(s);
  assert.equal(castleRules(s.boss).explosiveDamage,100);assert.equal(daughter(s).hp,hp);
  assert.equal(JSON.stringify(s.boss.eventLog),log);assert.equal(daughter(s).hemorrhage.amount,15);
  const saved=JSON.stringify(s);normalizeBossState(s);assert.equal(JSON.stringify(s),saved);
  const restored=restoreUndoTransaction(undo).state;normalizeBossState(restored);assert.equal(JSON.stringify(restored),saved);
  item(s,'explosive','second');assert.equal(s.boss.eventLog.at(-1).appliedDamage,100);
  assert.equal(daughter(s).hemorrhage.amount,15);
});

test('save v1 mantém contrato legado 450/50/25, sem adquirir Adaga ou sangramento',()=>{
  const s=game();s.boss.castleItemRulesVersion=1;delete s.boss.castleItemRules;
  for(const d of s.boss.combatEntities){d.hp=d.maxHp=d.originalMaxHp=450;d.regeneration=50;}
  normalizeBossState(s);item(s,'anticoagulant');assert.equal(daughter(s).regeneration,25);
  item(s,'explosive');assert.equal(daughter(s).hemorrhage,null);assert.equal(castleRules(s.boss).daggerTransfer,undefined);
});
