import test from 'node:test';
import assert from 'node:assert/strict';
import * as rules from '../js/boss/boss-engine.js';
import { BOSS_DAMAGE_BY_KIND } from '../js/boss/bosses/banker.js';
import { getBossDefinition } from '../js/boss/boss-registry.js';
import { NEHELENIA_FAILURE_POINTS } from '../js/boss/boss-balance.js';
import { buildBossDebugScenario } from '../js/boss/boss-debug-scenarios.js';
import { buildBossActionPresentation, buildBossAbilityHelp } from '../js/boss/boss-presentation.js';
import { createUndoTransaction, restoreUndoTransaction } from '../js/game/undo-transaction.js';
import { scenario, card } from './boss-cooperative-fixture.mjs';
import { battle } from '../scripts/canastra-hp-battle.mjs';

function game(id='banker') {
  const s=scenario({bossId:id});s.boss.bossFlow={stage:'players',queue:[]};
  s.players.forEach((p,i)=>p.hand=[card(`${i}:3`,'3','♣'),card(`${i}:4`,'4','♣'),card(`${i}:5`,'5','♣'),card(`${i}:keep`,'K','♥')]);
  return s;
}
const hit=(s,oldKind,newKind,cardsAdded=[])=>rules.applyBossMeldTransition(s,{teamId:0,playerId:0,meldIndex:0,oldKind,newKind,cardsAdded});
for(const [id,hp]of Object.entries({banker:2650,dominadora:2800,matriarca_esmeralda:2300,nehelenia:2400,nemesis:2500,dimitrescu:2000}))
  test(`New boss HP ${id}: ${hp}, including serialized normalization`,()=>{
    const s=game(id);assert.equal(s.boss.hp,hp);assert.equal(getBossDefinition(id).maxHp,hp);
    const reload=JSON.parse(JSON.stringify(s));rules.normalizeBossState(reload);assert.equal(reload.boss.hp,hp);
  });
test('Actual tier increment, card damage and duplicate/reload/undo accounting',()=>{
  assert.deepEqual(BOSS_DAMAGE_BY_KIND,{simple:0,suja:100,limpa:200,real:500,asas:1000});
  const s=game(),cards=[card('two','2'),card('ace','A'),{id:'joker',rank:'JOKER',joker:true}];
  assert.equal(hit(s,'simple','limpa',cards).damage,245);
  const undo=createUndoTransaction(s,{}, {actionType:'test',actorPlayerId:0});
  assert.equal(hit(s,'limpa','real',cards).damage,300);
  assert.equal(hit(s,'real','asas',cards).damage,500);
  assert.equal(hit(s,'asas','asas',cards),null);
  const reload=JSON.parse(JSON.stringify(s));rules.normalizeBossState(reload);assert.equal(hit(reload,'asas','asas',cards),null);
  const restored=restoreUndoTransaction(undo).state;
  assert.equal(hit(restored,'limpa','real',cards).damage,300);
});
for(const [oldValue,newValue,kind]of [[180,200,'limpa'],[300,500,'real'],[450,1000,'asas']])
test(`Legacy ledger ${oldValue} -> ${newValue}, no retroactive damage`,()=>{
  const s=game();delete s.boss.cooperativeBalanceVersion;s.boss.hp=1000;
  s.boss.meldProgress={'0:0':{damageValue:oldValue,debtValue:{limpa:4,real:8,asas:12}[kind],highestKind:kind}};
  s.boss.damagedCardIds=['old-card'];const stats=structuredClone(s.boss.stats);
  rules.normalizeBossState(s);assert.equal(s.boss.hp,1000);assert.deepEqual(s.boss.stats,stats);
  assert.equal(s.boss.meldProgress['0:0'].damageValue,newValue);
  assert.equal(hit(s,kind,kind,[card('old-card')]),null);
  const before=JSON.stringify(s);rules.normalizeBossState(s);assert.equal(JSON.stringify(s),before);
  if(kind==='limpa')assert.equal(hit(s,kind,'real').canastraDamage,300);
});
for(const id of ['dominadora','matriarca_esmeralda','nemesis'])test(`Old ${id} HP migrates without healing or reviving a finished save`,()=>{
  const s=game(id);delete s.boss.cooperativeBalanceVersion;s.boss.maxHp=2000;s.boss.hp=1234;
  rules.normalizeBossState(s);assert.equal(s.boss.maxHp,getBossDefinition(id).maxHp);assert.equal(s.boss.hp,1234);
  const ended=game(id);delete ended.boss.cooperativeBalanceVersion;ended.boss.maxHp=2000;ended.boss.hp=0;
  ended.finished=true;ended.boss.result={victory:true,reason:'boss_defeated'};
  rules.normalizeBossState(ended);assert.equal(ended.boss.maxHp,2000);assert.equal(ended.boss.hp,0);
});
for(const [ability,points]of Object.entries(NEHELENIA_FAILURE_POINTS))test(`Nehelenia ${ability}: ${points}, help and real failure`,()=>{
  const built=buildBossDebugScenario(null,{bossId:'nehelenia',abilityId:ability,phase:ability==='eternal_nightmare'?3:2,variant:'interactive',target:'auto'});
  const s=built.state,intent=rules.selectNextBossIntent(s,{debug:true});
  assert.equal(intent.payload.failureMirrorPoints,points);
  const ui=buildBossActionPresentation(s);assert.match(ui.consequence,new RegExp(`Mundo \\+${points}\\b`));
  assert.match(buildBossAbilityHelp(s).text,new RegExp(`${points} ao Mundo do Espelho`));
  const before=s.boss.danger;
  if(['discard_mirror','eternal_nightmare'].includes(ability)) {
    s.boss.bossFlow={stage:'players'};
    rules.completeBossPlayerTurn(s,0);rules.completeBossPlayerTurn(s,1);
    const choice=s.boss.pendingChoices.find(c=>c.type===ability);assert.ok(choice);
    const wrong=choice.options.find(o=>o!==choice.correctOption);
    rules.resolveBossChoice(s,choice.playerId,wrong);
  } else {
    if(ability==='follow_reflection') {intent.payload.patternCount=1;intent.payload.patternLocked=true;intent.payload.secondPlayedCount=0;}
    s.boss.bossFlow={stage:'players'};
    rules.completeBossPlayerTurn(s,0);rules.completeBossPlayerTurn(s,1);
  }
  assert.ok(Math.abs((s.boss.danger-before)*20-points)<1e-8);
});
test('Nehelenia pending old choice retains its original 16; resolution is once only',()=>{
  const s=game('nehelenia');delete s.boss.cooperativeBalanceVersion;
  s.boss.pendingChoices=[{id:'old',type:'discard_mirror',playerId:0,options:['right','wrong'],correctOption:'right'}];
  rules.normalizeBossState(s);assert.equal(s.boss.pendingChoices[0].failureMirrorPoints,16);
  rules.resolveBossChoice(s,0,'wrong');assert.ok(Math.abs(s.boss.danger-.8)<1e-8);
  assert.equal(rules.resolveBossChoice(s,0,'wrong'),null);
});
for(const phase of [1,2,3])test(`Banker fixed interest F${phase}: new total, unchanged collateral`,()=>{
  const seen=new Map();
  for(let seed=1;seed<100&&seen.size<3;seed++) {
    const s=game();s.boss.phase=phase;s.boss.seed=seed;
    const intent=rules.selectNextBossIntent(s,{debug:true,forcedAbilityId:'fixed_interest'});
    seen.set(intent.payload.contractTier,[intent.payload.fullDebt,intent.payload.guaranteedDebt]);
  }
  assert.deepEqual([...seen.values()].sort((a,b)=>a[0]-b[0]),phase===3?[[12,6],[14,7],[15,8]]:[[8,4],[10,5],[12,6]]);
});
for(const phase of [2,3])test(`Banker audit F${phase}: actual failure ${phase===3?14:10}`,()=>{
  const s=game();s.boss.phase=phase;
  const i=rules.selectNextBossIntent(s,{debug:true,forcedAbilityId:'suit_audit'});
  assert.equal(i.payload.failureDelta,phase===3?14:10);
  rules.completeBossPlayerTurn(s,0);rules.completeBossPlayerTurn(s,1);
  assert.equal(s.boss.danger,phase===3?14:10);
});
for(const phase of [1,2,3])test(`Dominadora etiquette F${phase}: failure ${[0,8,10,12][phase]}, unchanged obey`,()=>{
  for(const obey of [false,true]) {
    const s=game('dominadora');s.boss.phase=phase;
    const i=rules.selectNextBossIntent(s,{debug:true,forcedAbilityId:'iron_etiquette'});
    const target=i.payload.targetPlayerId;
    s.boss.activeOrders=[{id:'order',sourceAbilityId:'iron_etiquette',type:'discard_suit',announcedPhase:phase,
      suit:i.payload.suit,targetPlayerId:target,status:'active',eligibleCardIds:i.payload.eligibleCardIds}];
    const c=obey?s.players[target].hand.find(c=>c.suit===i.payload.suit):s.players[target].hand.find(c=>c.suit!==i.payload.suit);
    rules.notifyBossCardDiscarded(s,target,c);rules.completeBossPlayerTurn(s,target);
    assert.ok(Math.abs(s.boss.chainsByPlayer[target]*12.5-(obey?(phase===3?3:2):[0,8,10,12][phase]))<1e-8);
  }
});
test('Legacy etiquette order remains 14 after normalization',()=>{
  const s=game('dominadora');delete s.boss.cooperativeBalanceVersion;s.boss.phase=3;
  s.boss.activeOrders=[{id:'old',sourceAbilityId:'iron_etiquette',type:'discard_suit',announcedPhase:3,suit:'♣',targetPlayerId:0,status:'active',eligibleCardIds:['0:3']}];
  rules.notifyBossCardDiscarded(s,0,s.players[0].hand.at(-1));rules.completeBossPlayerTurn(s,0);
  assert.equal(s.boss.activeOrders[0].failureDominationPoints,14);
  assert.ok(Math.abs(s.boss.chainsByPlayer[0]*12.5-14)<1e-8);
});

test('Legacy Banker contract and audit keep announced charges through reload and undo',()=>{
  for(const [ability,payload,key,amount]of [
    ['fixed_interest',{amount:12,holderPlayerId:0},'fullDebt',12],
    ['suit_audit',{suit:'♣',required:3,progress:0},'failureDelta',12],
  ]) {
    const s=game();delete s.boss.cooperativeBalanceVersion;s.boss.phase=2;
    s.boss.currentIntent={id:`legacy-${ability}`,abilityId:ability,announcedPhase:2,payload};
    const undo=createUndoTransaction(s,{}, {actionType:'test',actorPlayerId:0});
    for(const loaded of [JSON.parse(JSON.stringify(s)),restoreUndoTransaction(undo).state]) {
      rules.normalizeBossState(loaded);assert.equal(loaded.boss.currentIntent.payload[key],amount);
      const before=JSON.stringify(loaded);rules.normalizeBossState(loaded);assert.equal(JSON.stringify(loaded),before);
    }
  }
});

test('New canastra bonus respects damage cap and cannot revive or overkill a defeated boss',()=>{
  const s=game();s.boss.hp=30;
  const e=hit(s,'simple','asas',[card('ace-finisher','A')]);
  assert.equal(e.canastraDamage,1000);assert.equal(e.cardDamage,15);assert.equal(s.boss.hp,0);
  assert.equal(hit(s,'asas','asas',[card('ace-finisher','A')]),null);assert.equal(s.boss.hp,0);
});
test('Closed vault is not a BOT reclaim option; canonical rule still rejects it',()=>{
  const s=game();s.hasDrawnThisTurn=false;
  s.boss.vaultsByPlayer[0]={card:card('vault','A','♣'),state:'locked',baseDebt:4,currentDebt:4,maxDebt:10,interestStep:2,ownerTurnsStarted:0};
  assert.equal(rules.shouldBossBotReclaimVault(s,0),false);assert.equal(rules.reclaimBossVault(s,0),null);
  rules.prepareBossVaultTurn(s,0);assert.equal(rules.shouldBossBotReclaimVault(s,0),false);
});
test('Real app/BOT reproduction: banker seed 120001 completes, no forced purchases or skipped turns',async()=>{
  const row=await battle('banker',120001);assert.equal(row.complete,true);
  assert.ok(!row.errors.some(e=>e.level==='censored'));
});
