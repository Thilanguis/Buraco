import test from 'node:test';
import assert from 'node:assert/strict';
import { createBossState, normalizeBossState, useCastleItem, canUseCastleItem, applyBossMeldTransition,
  applyBossFinalStrike, startDimitrescuRound, selectNextBossIntent, getCastleBotItem } from '../js/boss/boss-engine.js';
import { CASTLE_BALANCE, castleRules, damageDaughter, regenerateDaughters, furyLevel, furyBlood,
  bloodLinkRemaining, chooseCastleDamageTarget } from '../js/boss/dimitrescu-castle.js';
import { castleItemHelp, daughterRegenerationHelp } from '../js/boss/ui/dimitrescu-castle-view.js';
import { resourceFeedbackSteps } from '../js/boss/ui/resource-feedback.js';
import { createUndoTransaction, restoreUndoTransaction } from '../js/game/undo-transaction.js';
import { buildBossDebugScenario } from '../js/boss/boss-debug-scenarios.js';

const c=(id,rank='K',suit='♥')=>({id,rank,suit});
function game() {
  const boss=createBossState('dimitrescu',834);boss.bossFlow={stage:'players'};
  return {boss,mode:'boss_dimitrescu',currentPlayer:0,turnNumber:1,hasDrawnThisTurn:true,
    stock:Array.from({length:50},(_,i)=>c(`stock${i}`)),discard:[c('top')],deadPiles:[[c('dead')]],
    deadChunksTaken:[0,0],deadChunksMax:[2,0],teams:[{id:0,melds:[['3','4','5'].map(r=>c(`m${r}`,r,'♠'))]},{id:1,melds:[]}],
    players:[{id:0,teamId:0,name:'Humano',hand:[c('six','6','♠'),c('reserve'),c('last')]},
      {id:1,teamId:0,name:'BOT',isBot:true,hand:[c('other'),c('discard')]}]};
}
const d=(s,id='bela')=>s.boss.combatEntities.find(d=>d.id===id);
function sacrifice(s,type,id=`${type}-${s.players[0].hand.length}`,target='bela') {
  s.boss.castleItems ||= {};s.boss.castleItems[id]={type,consumed:false};s.players[0].hand.push(c(id));
  return useCastleItem(s,0,id,target);
}
const record=s=>e=>(s.boss.eventLog.push(e),e);
const close=s=>regenerateDaughters(s,()=>{},record(s));
const attack=(s,amount,id='hit',target='bela')=>damageDaughter(s,d(s,target),amount,id,record(s),{source:'attack',playerId:0});

test('v2: 500/50, piso 300, Lady/PROT/Fúria inalterados e regras congeladas no snapshot',()=>{
  const s=game();assert.equal(s.boss.castleItemRulesVersion,2);assert.equal(s.boss.castleDaughterBalanceVersion,3);
  assert.deepEqual(s.boss.combatEntities.map(d=>[d.hp,d.maxHp,d.originalMaxHp,d.regeneration]),Array(3).fill([500,500,500,50]));
  assert.equal(s.boss.hp,2000);assert.equal(bloodLinkRemaining(s.boss),1500);assert.equal(furyBlood(s.boss,3),3);
  assert.deepEqual(castleRules(JSON.parse(JSON.stringify(s.boss))),CASTLE_BALANCE);
});
for(const [type,loss,hp] of [['dagger',25,475],['explosive',50,390],['cold_flask',100,400],['anticoagulant',75,425],['relic',100,400]]) {
  test(`${type}: perda aditiva do HP original, efeito distinto e descarte preservado`,()=>{
    const s=game(),turn=s.turnNumber;const e=sacrifice(s,type);
    assert.equal(d(s).maxHp,500-loss);assert.equal(d(s).hp,hp);assert.equal(e.itemType,type);
    assert.equal(s.boss.hp,2000);assert.equal(s.boss.danger,0);assert.equal(s.turnNumber,turn);assert.equal(s.hasDrawnThisTurn,true);
    assert.equal(d(s).sacrificedCards.length,1);assert.ok(s.players[0].hand.length>=1);
    assert.match(castleItemHelp(type,s.boss),new RegExp(`Petrifica ${loss} HP`));
    assert.match(castleItemHelp(type,s.boss),/mínimo de 300/);
  });
  test(`${type}: não causa dano pela redução de máximo quando já ferida`,()=>{
    const s=game();d(s).hp=180;sacrifice(s,type);
    assert.equal(d(s).hp,type==='explosive'?120:180);
  });
  test(`${type}: efeito especial funciona também no piso`,()=>{
    const s=game();d(s).maxHp=300;d(s).hp=250;sacrifice(s,type);
    assert.equal(d(s).maxHp,300);
    if(type==='dagger')assert.equal(d(s).daggerLink,true);
    if(type==='explosive')assert.deepEqual([d(s).hp,d(s).hemorrhage.amount,d(s).hemorrhage.remaining],[190,50,2]);
    if(type==='cold_flask')assert.equal(d(s).coldCharges,1);
    if(type==='anticoagulant')assert.equal(d(s).regeneration,25);
    if(type==='relic')assert.equal(d(s).relicRound,2);
  });
}
test('Frio + Relíquia: piso exatamente 300, nunca cura ao aplicar nem ao reload',()=>{
  const s=game();sacrifice(s,'cold_flask');sacrifice(s,'relic');assert.equal(d(s).maxHp,300);
  const old=d(s).hp;normalizeBossState(s);assert.equal(d(s).maxHp,300);assert.equal(d(s).hp,old);
});
for(const protection of [1500,0])test(`Adaga atravessa PROT ${protection} e Coágulo sem consumir nenhum`,()=>{
  const s=game();s.boss.bloodLinkProtection=protection;s.boss.crimsonClot={status:'active',remaining:180};
  sacrifice(s,'dagger');assert.equal(attack(s,200),200);
  assert.equal(s.boss.hp,1940);assert.equal(d(s).hp,275);assert.equal(s.boss.bloodLinkProtection,protection);assert.equal(s.boss.crimsonClot.remaining,180);
  const e=s.boss.eventLog.find(e=>e.type==='daggerTransfer');assert.deepEqual([e.amount,e.daughterDamage,e.targetId,e.sourceEntityId],[60,200,'boss','bela']);
  assert.equal(resourceFeedbackSteps(s.boss,e)[0].metric,'ladyHp');
});
test('Adaga: overkill transmite apenas dano efetivo, morte remove vínculo e até 500 PROT',()=>{
  const s=game();sacrifice(s,'dagger');d(s).hp=20;assert.equal(attack(s,999),20);
  assert.equal(s.boss.hp,1994);assert.equal(s.boss.bloodLinkProtection,1000);assert.equal(d(s).daggerLink,false);assert.equal(furyLevel(s.boss),1);
  assert.equal(s.boss.eventLog.filter(e=>e.type==='daughterDeath').length,1);assert.equal(s.discard.at(-1).id,'top');
});
test('Adagas duplicadas: máximo 450/425, mas transmissão nunca 60%/90%',()=>{
  const s=game();for(let i=0;i<3;i++)sacrifice(s,'dagger',`dag${i}`);
  assert.equal(d(s).maxHp,425);attack(s,100);assert.equal(s.boss.hp,1970);
});
test('Adaga não transmite Explosivo, hemorragia nem outras fontes; sem ciclos',()=>{
  const s=game();sacrifice(s,'dagger');sacrifice(s,'explosive');close(s);
  damageDaughter(s,d(s),10,'other',record(s));assert.equal(s.boss.hp,2000);
  assert.equal(s.boss.eventLog.filter(e=>e.type==='daggerTransfer').length,0);
});
for(const isBot of [false,true])test(`pipeline ${isBot?'BOT':'humano'}: ataque/canastra e transferência`,()=>{
  const s=game();s.players[0].isBot=isBot;s.boss.combatTargetsByPlayer[0]='bela';sacrifice(s,'dagger');
  const e=applyBossMeldTransition(s,{teamId:0,playerId:0,meldIndex:0,oldKind:'simple',newKind:'suja',cardsAdded:[]});
  assert.equal(e.targetId,'bela');assert.ok(e.appliedDamage>0);assert.equal(s.boss.hp,2000-Math.floor(e.appliedDamage*.3));
  const hp=s.boss.hp;applyBossMeldTransition(s,{teamId:0,playerId:0,meldIndex:0,oldKind:'simple',newKind:'suja',cardsAdded:[]});assert.equal(s.boss.hp,hp);
});
test('morte da Lady via Adaga encerra a batalha, inclusive Ataque Final na filha',()=>{
  for(const final of [false,true]) {
    const s=game();sacrifice(s,'dagger');s.boss.hp=10;s.boss.combatTargetsByPlayer[0]='bela';
    if(final)applyBossFinalStrike(s,0,0);else attack(s,100);
    assert.equal(s.boss.hp,0);assert.equal(s.boss.result.victory,true);assert.equal(s.boss.defeated,true);assert.equal(s.boss.bloodLinkProtection,1500);
  }
});
for(const anti of [false,true])for(const cold of [false,true])test(`hemorragia antes de regen; Anti ${anti}, Frio ${cold}`,()=>{
  const s=game();sacrifice(s,'explosive');if(anti)sacrifice(s,'anticoagulant');if(cold)sacrifice(s,'cold_flask');
  const before=d(s).hp;close(s);
  assert.equal(d(s).hp,before-50+(cold?0:anti?25:50));
  const events=s.boss.eventLog;assert.ok(events.findIndex(e=>e.type==='daughterBleed')<events.findIndex(e=>e.type==='daughterRegen'));
  const bleed=events.find(e=>e.type==='daughterBleed');assert.equal(resourceFeedbackSteps(s.boss,bleed)[0].amount,-50);
  assert.equal(d(s).hemorrhage.remaining,1);const snapshot=JSON.stringify(s);close(s);assert.equal(JSON.stringify(s),snapshot);
  s.boss.roundNumber++;close(s);assert.equal(d(s).hemorrhage,null);
});
test('Explosivo reaplica impacto, renova 2 rodadas e não empilha ticks',()=>{
  const s=game();sacrifice(s,'explosive','one');close(s);sacrifice(s,'explosive','two');
  assert.equal(d(s).hemorrhage.remaining,2);const hp=d(s).hp;close(s);assert.equal(d(s).hp,hp);
  s.boss.roundNumber++;close(s);assert.equal(s.boss.eventLog.filter(e=>e.type==='daughterBleed').length,2);
});
test('hemorragia letal: clampa dano, dispara morte/Fúria, sem regen/Adaga',()=>{
  const s=game();sacrifice(s,'dagger');sacrifice(s,'explosive');d(s).hp=12;close(s);
  assert.equal(d(s).status,'dead');assert.equal(s.boss.eventLog.find(e=>e.type==='daughterBleed').amount,12);
  assert.equal(s.boss.eventLog.filter(e=>e.type==='daughterDeath').length,1);assert.equal(s.boss.hp,2000);
  assert.equal(s.boss.bloodLinkProtection,1000);assert.equal(furyBlood(s.boss,5),7);
  assert.ok(!s.boss.eventLog.some(e=>e.type==='daughterRegen'&&e.targetId==='bela'));
});
test('Frio não é desperdiçado na vida cheia, bloqueia somente cura real e tem teto 2',()=>{
  const s=game();for(let i=0;i<3;i++)sacrifice(s,'cold_flask',`cold${i}`);
  assert.equal(d(s).coldCharges,2);assert.equal(d(s).maxHp,300);close(s);assert.equal(d(s).coldCharges,2);
  for(let i=1;i<=3;i++) {s.boss.roundNumber++;d(s).hp=200;close(s);assert.equal(d(s).hp,i<=2?200:250);}
  assert.equal(d(s).cold,false);assert.equal(d(s).coldCharges,0);
});
test('Anticoagulante permanente/duplicado, sem reduzir abaixo de 25; cura no máximo recuperável',()=>{
  const s=game();for(let i=0;i<3;i++)sacrifice(s,'anticoagulant',`anti${i}`);
  assert.equal(d(s).maxHp,300);assert.equal(d(s).regeneration,25);d(s).hp=290;close(s);assert.equal(d(s).hp,300);
  assert.match(daughterRegenerationHelp(d(s)),/Vida completa/);
});
test('Relíquia espera oportunidade válida; não some em round não selecionado ou sem candidato',()=>{
  const s=game();sacrifice(s,'relic');s.boss.roundNumber++;
  startDimitrescuRound(s,{selectedDaughterId:'daniela'});close(s);assert.equal(d(s).relicRound,2);
  s.boss.roundNumber++;s.players[0].hand=[c('none')];
  startDimitrescuRound(s,{selectedDaughterId:'bela'});assert.equal(d(s).passive.status,'idle');close(s);assert.equal(d(s).relicRound,2);
  s.boss.roundNumber++;s.players[0].hand.push(c('legal6','6','♠'),c('spare'));
  startDimitrescuRound(s,{selectedDaughterId:'bela'});assert.equal(d(s).passive.status,'suppressed');close(s);assert.equal(d(s).relicRound,null);
  assert.equal(d(s).regeneration,50);
});
test('Relíquia cancela obrigação pendente; As Três Filhas preserva as outras e regen',()=>{
  const s=game();s.boss.phase=2;selectNextBossIntent(s,{debug:true,forcedAbilityId:'three_daughters'});
  assert.equal(d(s).passive.status,'active');sacrifice(s,'relic');assert.equal(d(s).passive.status,'suppressed');
  assert.equal(d(s,'cassandra').passive.status,'active');assert.equal(d(s,'daniela').passive.status,'active');
  d(s).hp=300;close(s);assert.equal(d(s).hp,350);assert.equal(d(s).relicRound,null);
});
test('Relíquias duplicadas não acumulam supressão infinita',()=>{
  const s=game();sacrifice(s,'relic','r1');sacrifice(s,'relic','r2');assert.equal(d(s).relicRound,2);
  s.boss.roundNumber=2;startDimitrescuRound(s,{selectedDaughterId:'bela'});close(s);assert.equal(d(s).relicRound,null);
  s.boss.roundNumber++;startDimitrescuRound(s,{selectedDaughterId:'bela'});assert.equal(d(s).passive.status,'active');
});
for(const type of ['dagger','explosive','cold_flask','anticoagulant','relic'])test(`${type}: undo/reload/reconexão não reaplicam nem duplicam dano, tick ou carga`,()=>{
  const s=game(),id=`item-${type}`;s.boss.castleItems={[id]:{type,consumed:false}};s.players[0].hand.push(c(id));
  const undo=createUndoTransaction(s);useCastleItem(s,0,id,'bela');if(type==='dagger')attack(s,30,'replay');close(s);
  const reload=JSON.parse(JSON.stringify(s));normalizeBossState(reload);const before=JSON.stringify(reload);
  normalizeBossState(reload);assert.equal(JSON.stringify(reload),before);assert.equal(useCastleItem(reload,0,id,'bela'),null);close(reload);
  if(type==='dagger')attack(reload,30,'replay');assert.equal(JSON.stringify(reload),before);
  const restored=restoreUndoTransaction(undo).state;normalizeBossState(restored);assert.equal(d(restored).maxHp,500);
  assert.ok(useCastleItem(restored,0,id,'bela'));assert.equal(d(restored).sacrificedCards.length,1);
});
test('save v1 sem versão preserva perdas antigas/itens usados, 450/piso200 e efeitos antigos',()=>{
  const s=game();delete s.boss.castleItemRulesVersion;delete s.boss.castleItemRules;s.boss.castleDaughterBalanceVersion=2;
  for(const x of s.boss.combatEntities)x.maxHp=x.hp=x.originalMaxHp=450;
  d(s).maxHp=200;d(s).hp=120;d(s).sacrificedCards=[{...c('old'),castleItem:{type:'dagger',consumed:true}}];
  s.boss.castleItems={old:{type:'dagger',consumed:true}};normalizeBossState(s);
  assert.equal(d(s).maxHp,200);assert.equal(d(s).hp,120);assert.equal(d(s).daggerLink,false);
  sacrifice(s,'dagger','new');assert.equal(d(s).hp,70);assert.equal(d(s).daggerLink,false);
  const snapshot=JSON.stringify(s);normalizeBossState(s);assert.equal(JSON.stringify(s),snapshot);
  assert.match(castleItemHelp('dagger',s.boss),/50 de dano imediato/);assert.match(castleItemHelp('relic',s.boss),/mínimo de 200/);
});
test('BOT valoriza Adaga/combo, usa alvo investido mesmo com PROT zerada e respeita descarte obrigatório',()=>{
  const s=game();s.boss.castleItems={dag:{type:'dagger',consumed:false},anti:{type:'anticoagulant',consumed:false}};
  s.players[0].hand.push(c('dag','Q','♦'),c('anti','8','♣'));assert.equal(getCastleBotItem(s,0).cardId,'dag');
  useCastleItem(s,0,'dag','bela');s.boss.bloodLinkProtection=0;assert.equal(chooseCastleDamageTarget(s,30),'bela');
  s.pickedDiscardCardId='anti';assert.equal(canUseCastleItem(s,0,'anti','bela'),false);
  s.boss.hp=20;assert.equal(chooseCastleDamageTarget(s,30),'boss','prefer a direct lethal hit when HP is exposed');
  s.players[0].hand=[c('anti','8','♣')];assert.equal(getCastleBotItem(s,0),null);
});
test('Laboratório cria versão nova com 108 cartas/15 itens; replay preserva associação',()=>{
  const s=buildBossDebugScenario(null,{bossId:'dimitrescu',abilityId:'crimson_brand',phase:'1',variant:'interactive',target:'auto'}).state;
  assert.equal(s.boss.castleItemRulesVersion,2);assert.equal(d(s).maxHp,500);assert.equal(Object.keys(s.boss.castleItems).length,15);
  const before=JSON.stringify(s.boss.castleItems);normalizeBossState(s);assert.equal(JSON.stringify(s.boss.castleItems),before);
});
