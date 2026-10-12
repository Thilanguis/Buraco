import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createUndoTransaction,restoreUndoTransaction } from '../js/game/undo-transaction.js';
import { BossBuracoBot } from '../boss-bot.js';
import { getCastleBotItem,useCastleItem,normalizeBossState,isBossCardBlocked } from '../js/boss/boss-engine.js';
import { rankBossDiscards,selectBossRecoveryDiscardIndex } from '../js/boss/boss-bot-strategy.js';
import { rankCastleBotItems } from '../js/boss/castle-bot-strategy.js';
import { castleScenario,appItemEngine,runWatchdog } from './castle-bot-fixture.mjs';
import { fixtureEngine,card } from './boss-cooperative-fixture.mjs';
for(const type of ['explosive','dagger','relic','cold_flask','anticoagulant'])test(`${type}: registry-only item is used canonically, or protected from ordinary discard`,async()=>{
  const s=castleScenario(type),choice=getCastleBotItem(s,0);assert.ok(choice);assert.equal(choice.cardId,'item');
  const {engine,metrics}=appItemEngine(s);await engine.executeCastleItems(0);
  assert.equal(s.boss.castleItems.item.consumed,true);assert.equal(metrics.commits,1);
  await engine.executeCastleItems(0);assert.equal(metrics.commits,1);
  assert.equal(s.boss.eventLog.filter(e=>e.type==='castleItem'&&e.cardId==='item').length,1);
  const held=castleScenario(type);held.partialDraw=true;
  assert.equal(getCastleBotItem(held,0),null);assert.notEqual(rankBossDiscards(held,0)[0].cardId,'item');
});
test('after buying, production BOT calls the app item transaction before melds and again before discard',async()=>{
  const s=castleScenario(),fixture=fixtureEngine(s),{engine:itemEngine,metrics}=appItemEngine(s);
  const order=[],engine={...fixture,executeCastleItems:async id=>{order.push('items');await itemEngine.executeCastleItems(id);}};
  class Fast extends BossBuracoBot {
    static async sleep(){};
    static async processMelds(){order.push('melds');}
    static async playImmediateNaturalExtensions(){};
  }
  await Fast.playTurn(s,0,engine);
  assert.deepEqual(order,['items','melds','items']);assert.equal(metrics.commits,1);
  assert.equal(s.boss.castleItems.item.consumed,true);
  assert.notEqual(s.discard.at(-1).id,'item');assert.equal(s.currentPlayer,1);
});
test('Joker, valuable 2 and sole canastra completion are not automatically sacrificed',()=>{
  for(const special of ['JOKER','2','9']) {
    const s=castleScenario();s.players[0].hand[0]={...s.players[0].hand[0],rank:special,joker:special==='JOKER',suit:'♣'};
    if(special==='9')s.teams[0].melds=[['3','4','5','6','7','8'].map(r=>card(`m:${r}`,r,'♣'))];
    assert.equal(getCastleBotItem(s,0),null);
    assert.notEqual(rankBossDiscards(s,0)[0].cardId,'item');
  }
});
test('dead targets, all-dead castle, duplicate effects at floor and fresh global freeze spend nothing',async()=>{
  const dead=castleScenario();Object.assign(dead.boss.combatEntities[0],{hp:0,status:'dead',deathRecorded:true});
  assert.notEqual(getCastleBotItem(dead,0)?.daughterId,'bela');
  dead.boss.combatEntities.forEach(d=>Object.assign(d,{hp:0,status:'dead',deathRecorded:true}));
  assert.equal(getCastleBotItem(dead,0),null);assert.notEqual(rankBossDiscards(dead,0)[0].cardId,'item');
  for(const type of ['dagger','relic','anticoagulant','cold_flask']) {
    const s=castleScenario(type);
    s.boss.combatEntities.forEach(d=>Object.assign(d,{hp:130,maxHp:130,daggerLink:true,relicAttackBonus:true,regeneration:10}));
    if(type==='cold_flask')s.boss.castleFreeze={remainingTurns:2,resolvedTurnIds:[]};
    const {engine,metrics}=appItemEngine(s);await engine.executeCastleItems(0);assert.equal(metrics.commits,0);
    assert.notEqual(rankBossDiscards(s,0)[0].cardId,'item');
  }
});
test('all canonical restrictions prevent item execution, without consuming or committing',async()=>{
  for(const restriction of ['draw','partial','pending','boss','picked','last','turn']) {
    const s=castleScenario();
    if(restriction==='draw')s.hasDrawnThisTurn=false;
    if(restriction==='partial')s.partialDraw=true;
    if(restriction==='pending')s.boss.pendingChoices=[{type:'test'}];
    if(restriction==='boss')s.boss.bossFlow={stage:'ability'};
    if(restriction==='picked')s.pickedDiscardCardId='item';
    if(restriction==='last')s.players[0].hand=s.players[0].hand.slice(0,1);
    if(restriction==='turn')s.currentPlayer=1;
    assert.equal(getCastleBotItem(s,0),null,restriction);
    const {engine,metrics}=appItemEngine(s);await engine.executeCastleItems(0);
    assert.equal(s.boss.castleItems.item.consumed,false,restriction);assert.equal(metrics.commits,0,restriction);
  }
});
test('all-item hand remains discardable; blocked ordinary alternative is not counted as legal',()=>{
  const s=castleScenario('cold_flask');s.boss.castleFreeze={remainingTurns:2,resolvedTurnIds:[]};
  s.boss.castleItems.ordinary={type:'dagger',consumed:false};s.boss.castleItems.reserve={type:'relic',consumed:false};
  assert.ok(selectBossRecoveryDiscardIndex(s,0)>=0);
  delete s.boss.castleItems.ordinary;delete s.boss.castleItems.reserve;
  const index=selectBossRecoveryDiscardIndex(s,0,(_id,id)=>id!=='item');assert.equal(s.players[0].hand[index].id,'item');
});
test('canonical item eligibility rejects the play-block predicate; no new Dimitrescu lock rule is invented',()=>{
  const source=fs.readFileSync(new URL('../js/boss/boss-engine.js',import.meta.url),'utf8');
  const start=source.indexOf('export function getCastleItemUseStatus(');
  const body=source.slice(start,source.indexOf('\nexport function canUseCastleItem',start)).replace('export ','');
  const status=new Function('isBossTurnActive','isCardBlockedByBossState','hasLegalDiscard','isCombatEntityAlive',
    body+';return getCastleItemUseStatus;')(()=>false,()=>true,()=>true,()=>true);
  assert.equal(status(castleScenario(),0,'item','bela').code,'blocked');
});
test('actual app recovery and watchdog never discard a held Frasco when common legal cards remain',async()=>{
  for(const watchdog of [false,true]) {
    const s=castleScenario('cold_flask');s.boss.castleFreeze={remainingTurns:2,resolvedTurnIds:[]};
    const {engine,metrics,context}=appItemEngine(s);
    if(watchdog)await runWatchdog(s,engine,context);else assert.equal(await engine.recoverBotTurn(0),true);
    assert.notEqual(s.discard.at(-1).id,'item');assert.equal(s.boss.castleItems.item.consumed,false);
    assert.equal(metrics.commits,1);
  }
});
test('fatal BOT fallback retains item, without stalling',async()=>{
  const s=castleScenario('cold_flask');s.boss.castleFreeze={remainingTurns:2,resolvedTurnIds:[]};
  class Broken extends BossBuracoBot {
    static async sleep(){};static async processMelds(){};static async playImmediateNaturalExtensions(){};
    static async processDiscard(){throw Error('simulated discard fault');}
  }
  const fixture=fixtureEngine(s);await Broken.playTurn(s,0,fixture);
  assert.notEqual(s.discard.at(-1).id,'item');assert.equal(s.currentPlayer,1);
});
test('undo restores item and physical card; stale session stops item loop after accepted commit',async()=>{
  const s=castleScenario(),undo=createUndoTransaction(s),{engine}=appItemEngine(s);
  await engine.executeCastleItems(0);
  const restored=restoreUndoTransaction(undo).state;normalizeBossState(restored);
  assert.equal(restored.boss.castleItems.item.consumed,false);assert.ok(restored.players[0].hand.some(c=>c.id==='item'));
  const active=castleScenario();active.players[0].hand.push(card('another','8','♦'));
  active.boss.castleItems.another={type:'anticoagulant',consumed:false};
  const run=appItemEngine(active);let committed=0;
  run.engine.commitState=async()=>{committed++;run.engine.getState=()=>null;};
  await run.engine.executeCastleItems(0);assert.equal(committed,1);
  assert.equal(Object.values(active.boss.castleItems).filter(x=>x.consumed).length,1);
});
test('reload/snapshot and physical IDs survive retries: consumed item never replays',async()=>{
  const s=castleScenario(),ids=s.players[0].hand.map(c=>c.id);
  const {engine,metrics}=appItemEngine(s);await engine.executeCastleItems(0);
  const restored=JSON.parse(JSON.stringify(s));normalizeBossState(restored);
  const second=appItemEngine(restored);await second.engine.executeCastleItems(0);
  assert.equal(second.metrics.commits,0);assert.equal(metrics.commits,1);
  const physical=[...restored.players[0].hand,...restored.boss.combatEntities.flatMap(d=>d.sacrificedCards)];
  assert.deepEqual(physical.map(c=>c.id).sort(),ids.sort());assert.equal(new Set(physical.map(c=>c.id)).size,3);
  const before=JSON.stringify(restored);rankCastleBotItems(restored,0);assert.equal(JSON.stringify(restored),before);
});
