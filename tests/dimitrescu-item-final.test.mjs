import test from 'node:test';
import assert from 'node:assert/strict';
import { createBossState, normalizeBossState, useCastleItem, completeBossPlayerTurn,
  startDimitrescuRound, selectNextBossIntent, notifyBossDiscardTaken, applyBossMeldTransition,
  applyBossFinalStrike } from '../js/boss/boss-engine.js';
import { castleFrozen, damageDaughter, regenerateDaughters, completeCastleFreezeTurn } from '../js/boss/dimitrescu-castle.js';
import { castleItemChip, castleItemHelp, danielaDiscardActive } from '../js/boss/ui/dimitrescu-castle-view.js';
import { createUndoTransaction, restoreUndoTransaction } from '../js/game/undo-transaction.js';

const card=(id,rank='K',suit='♥')=>({id,rank,suit});
function game() {
  return {mode:'boss_dimitrescu',boss:{...createBossState('dimitrescu',410),bossFlow:{stage:'players'}},
    turnNumber:1,currentPlayer:0,hasDrawnThisTurn:true,stock:Array.from({length:60},(_,i)=>card(`s${i}`)),
    discard:[card('top')],deadPiles:[],teams:[{id:0,melds:[['3','4','5'].map(r=>card(`m${r}`,r,'♠'))]}],
    players:[0,1].map(id=>({id,teamId:0,name:`Humano ${id}`,hand:[card(`six${id}`,'6','♠'),card(`reserve${id}`),card(`last${id}`)]}))};
}
const daughter=(s,id='bela')=>s.boss.combatEntities.find(d=>d.id===id);
const record=s=>e=>(s.boss.eventLog.push(e),e);
function use(s,type,target='bela',id=`${type}-${s.turnNumber}-${s.players[s.currentPlayer].hand.length}`) {
  s.boss.castleItems||={};s.boss.castleItems[id]={type,consumed:false};
  s.players[s.currentPlayer].hand.push(card(id));
  assert.ok(useCastleItem(s,s.currentPlayer,id,target));return id;
}
function finish(s) {
  s.boss.bossFlow={stage:'players'};s.boss.awaitingBossTurn=false;
  completeBossPlayerTurn(s,s.currentPlayer,{deferNextBossTurn:true});
  s.currentPlayer=1-s.currentPlayer;s.turnNumber++;
  s.boss.bossFlow={stage:'players'};s.boss.awaitingBossTurn=false;
}
const attack=(s,amount,id='hit',source='attack')=>damageDaughter(s,daughter(s),amount,id,record(s),{source,playerId:s.currentPlayer});

for(const position of [0,1])test(`Frasco no cooperador ${position+1}: duas oportunidades canônicas, sem depender da rodada`,()=>{
  const s=game();if(position===1)finish(s);
  s.boss.combatEntities.forEach(d=>d.hp=250);
  use(s,'cold_flask');assert.equal(castleFrozen(s.boss),true);
  const round=s.boss.roundNumber;
  finish(s);assert.equal(s.boss.castleFreeze.remainingTurns,1);
  assert.equal(s.boss.roundNumber,round+(position===1?1:0));
  const saved=JSON.parse(JSON.stringify(s));normalizeBossState(saved);
  assert.equal(saved.boss.castleFreeze.remainingTurns,1);
  startDimitrescuRound(s,{selectedDaughterId:'daniela'});
  assert.equal(daughter(s,'daniela').passive.status,'suppressed');
  notifyBossDiscardTaken(s,s.currentPlayer,[s.discard.at(-1)]);assert.equal(s.boss.danger,0);
  finish(s);assert.equal(castleFrozen(s.boss),false);
  assert.deepEqual(s.boss.combatEntities.map(d=>d.hp),[250,250,250]);
  const events=s.boss.eventLog.filter(e=>e.type==='daughterRegen');
  assert.ok(events.length>=3);assert.ok(events.every(e=>e.blocked&&e.amount===0));
  // Restore only the saved first opportunity, not an elapsed freeze on reload.
  assert.equal(saved.boss.castleFreeze.remainingTurns,1);
  const danger=s.boss.danger;
  if(s.boss.playersActedThisRound.length)finish(s); // end of this round after expiry
  else {finish(s);finish(s);}
  assert.deepEqual(s.boss.combatEntities.map(d=>d.hp),[270,270,270]);
  assert.equal(s.boss.danger,danger,'cancelled daughter obligations are not resurrected');
});

test('Frasco suprime Caçada/Banquete/Lixo pendentes, sem impedir habilidades da Lady',()=>{
  const s=game();s.boss.phase=2;
  selectNextBossIntent(s,{debug:true,forcedAbilityId:'three_daughters'});
  assert.deepEqual(s.boss.combatEntities.map(d=>d.passive.status),['active','active','active']);
  use(s,'cold_flask','cassandra');
  assert.deepEqual(s.boss.combatEntities.map(d=>[d.passive.status,d.passive.suppressedBy]),Array(3).fill(['suppressed','freeze']));
  assert.equal(danielaDiscardActive(s),false);
  notifyBossDiscardTaken(s,0,[s.discard[0]]);finish(s);finish(s);assert.equal(s.boss.danger,0);
  const t=game();use(t,'cold_flask');selectNextBossIntent(t,{debug:true,forcedAbilityId:'crimson_brand'});
  assert.equal(t.boss.currentIntent.abilityId,'crimson_brand');
  assert.ok(t.boss.currentIntent.payload.marks.some(m=>m.status==='active'));
});

test('As Três Filhas não ativa novas ações durante o congelamento',()=>{
  const s=game();use(s,'cold_flask');s.boss.phase=2;
  selectNextBossIntent(s,{debug:true,forcedAbilityId:'three_daughters'});
  assert.equal(s.boss.currentIntent.abilityId,'three_daughters');
  assert.deepEqual(s.boss.combatEntities.map(d=>d.passive.status),Array(3).fill('suppressed'));
});

test('reaplicação renova para duas oportunidades, não quatro; evento/turno duplicado não consome novamente',()=>{
  const s=game();const id=use(s,'cold_flask');finish(s);assert.equal(s.boss.castleFreeze.remainingTurns,1);
  use(s,'cold_flask','daniela');assert.equal(s.boss.castleFreeze.remainingTurns,2);
  completeCastleFreezeTurn(s,s.currentPlayer,record(s));assert.equal(s.boss.castleFreeze.remainingTurns,1);
  const snap=JSON.stringify(s);completeCastleFreezeTurn(s,s.currentPlayer,record(s));assert.equal(JSON.stringify(s),snap);
  assert.equal(useCastleItem(s,0,id,'bela'),null);
  s.turnNumber++;completeCastleFreezeTurn(s,0,record(s));assert.equal(castleFrozen(s.boss),false);
});

test('congelamento não bloqueia hemorragia, Anti, ataques, morte ou retorno dos anexos',()=>{
  const s=game();use(s,'anticoagulant');use(s,'explosive');use(s,'cold_flask','cassandra');
  assert.equal(daughter(s).regeneration,10);const hp=daughter(s).hp;attack(s,30);
  regenerateDaughters(s,()=>assert.fail('daughter punishment while frozen'),record(s));
  assert.equal(daughter(s).hp,hp-30-15);assert.equal(daughter(s).hemorrhage.amount,15);
  s.boss.castleFreeze.remainingTurns=0;s.boss.roundNumber++;
  regenerateDaughters(s,()=>{},record(s));assert.equal(daughter(s).hp,hp-30-20);
  use(s,'cold_flask');daughter(s).hp=10;s.boss.roundNumber++;
  regenerateDaughters(s,()=>{},record(s));assert.equal(daughter(s).status,'dead');
  assert.equal(daughter(s).relicAttackBonus,false);assert.equal(s.boss.bloodLinkProtection,1000);
  assert.equal(s.discard.at(-1).id,'top');assert.ok(s.discard.slice(0,-1).every(c=>c.castleItem.consumed));
  assert.equal(castleFrozen(s.boss),true,'death of target does not release the other daughters');
});

for(const hp of [300,40])test(`Relíquia+Adaga: base100 → efetivo${hp===40?40:120} → Lady${hp===40?32:96}`,()=>{
  const s=game();use(s,'relic');use(s,'dagger');daughter(s).hp=hp;
  s.boss.crimsonClot={status:'active',remaining:120};
  assert.equal(attack(s,100),hp===40?40:120);
  assert.equal(s.boss.hp,2000-(hp===40?32:96));assert.equal(s.boss.crimsonClot.remaining,120);
  assert.equal(s.boss.bloodLinkProtection,hp===40?1000:1500);
  const snap=JSON.stringify(s);attack(s,100);assert.equal(JSON.stringify(s),snap);
});

for(const source of ['item','bleed','other'])test(`Relíquia não aumenta fonte ${source}`,()=>{
  const s=game();use(s,'relic');assert.equal(attack(s,100,source,source),100);
  assert.equal(daughter(s).hp,240);assert.equal(s.boss.hp,2000);
});

test('Relíquia permanente sem silenciar nem acumular bônus; Explosivo100/15 permanece independente',()=>{
  const s=game();startDimitrescuRound(s,{selectedDaughterId:'bela'});
  use(s,'relic','bela','r1');use(s,'relic','bela','r2');
  assert.equal(daughter(s).passive.status,'active');assert.equal(daughter(s).relicRound,null);
  assert.equal(daughter(s).maxHp,180);assert.equal(attack(s,20),24);
  use(s,'explosive');assert.equal(daughter(s).hp,30);
  regenerateDaughters(s,()=>{},record(s));assert.equal(daughter(s).hp,35);
  assert.equal(daughter(s).relicAttackBonus,true);
  s.boss.roundNumber++;assert.equal(attack(s,10,'later'),12);
});

for(const isBot of [false,true])test(`Relíquia no pipeline real: ${isBot?'BOT':'humano'} e Ataque Final`,()=>{
  const s=game();s.players[0].isBot=isBot;use(s,'relic');use(s,'dagger');s.boss.combatTargetsByPlayer[0]='bela';
  const e=applyBossMeldTransition(s,{teamId:0,playerId:0,meldIndex:0,oldKind:'simple',newKind:'suja',cardsAdded:[]});
  assert.ok(e.appliedDamage>0);assert.equal(s.boss.hp,2000-Math.floor(e.appliedDamage*.8));
  const before=daughter(s).hp;applyBossFinalStrike(s,0,0);assert.equal(before-daughter(s).hp,Math.min(120,before));
});

test('snapshot/reload/undo preservam congelamento compartilhado e Relíquia sem duplicar efeito',()=>{
  const s=game();use(s,'relic');const before=createUndoTransaction(s);
  use(s,'cold_flask','daniela');finish(s);const snap=JSON.parse(JSON.stringify(s));
  normalizeBossState(snap);assert.equal(snap.boss.castleFreeze.remainingTurns,1);
  assert.equal(daughter(snap).relicAttackBonus,true);assert.equal(daughter(snap,'daniela').maxHp,340);
  const json=JSON.stringify(snap);normalizeBossState(snap);assert.equal(JSON.stringify(snap),json);
  const restored=restoreUndoTransaction(before).state;normalizeBossState(restored);
  assert.equal(castleFrozen(restored.boss),false);assert.equal(daughter(restored).relicAttackBonus,true);
  assert.equal(daughter(restored,'daniela').maxHp,500);
});

test('save v2 anterior migra efeitos sem curar, repetir petrificação, impacto ou tick',()=>{
  const s=game();delete s.boss.castleItemEffectsVersion;delete s.boss.castleItemRules.itemEffectsVersion;
  Object.assign(daughter(s),{hp:170,maxHp:300,cold:true,coldCharges:2,relicRound:2,
    sacrificedCards:[{...card('oldrelic'),castleItem:{type:'relic',consumed:true}}],
    hemorrhage:{amount:20,permanent:true,remaining:null,lastTickRound:1}});
  normalizeBossState(s);assert.equal(daughter(s).hp,170);assert.equal(daughter(s).maxHp,300);
  assert.equal(daughter(s).relicAttackBonus,true);assert.equal(daughter(s).relicRound,null);
  assert.equal(s.boss.castleFreeze.remainingTurns,2);assert.equal(daughter(s).hemorrhage.amount,15);
  assert.equal(daughter(s).hemorrhage.lastTickRound,1);assert.equal(s.boss.eventLog.length,0);
  const snap=JSON.stringify(s);normalizeBossState(s);assert.equal(JSON.stringify(s),snap);
});

test('cinco rótulos exatos, ajuda completa e petrificação de cada item',()=>{
  const s=game();const expected={explosive:'100 DANO · SANGRA 15',dagger:'VÍNCULO 80%',
    anticoagulant:'REGEN 20→10',relic:'DANO +20%',cold_flask:'CONGELA AS 3'};
  for(const [type,label] of Object.entries(expected)) {
    assert.equal(castleItemChip(type,s.boss),label);assert.match(castleItemHelp(type,s.boss),/Petrifica/);
  }
  assert.match(castleItemHelp('cold_flask',s.boss),/restante deste turno.*próximo turno/);
  assert.match(castleItemHelp('relic',s.boss),/Não aumenta Explosivo, hemorragia/);
});
