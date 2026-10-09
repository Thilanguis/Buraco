import assert from 'node:assert/strict';
import test from 'node:test';
import {BossBuracoBot} from '../boss-bot.js';
import {bossObservableState,plannerFingerprint,observeBossPublicAction} from '../js/game/bot-planner.js';
import {rankBossMoves,rankBossDiscards,rankBossDiscardPickups,cooperativeBossPriorities,cooperativeDiscardAdjustment,simulateBossMove} from '../js/boss/boss-bot-strategy.js';
import {card,scenario,fixtureEngine} from './boss-cooperative-fixture.mjs';
import {classifyBossMeldKind,quoteBossDiscardPickup} from '../js/boss/boss-engine.js';
import {buildBossDebugScenario} from '../js/boss/boss-debug-scenarios.js';
import {beginBossTurn,advanceBossTurn} from '../js/boss/boss-engine.js';
const run=(prefix,ranks,suit='♣')=>ranks.map(r=>card(`${prefix}:${r}`,r,suit));
const ctx={isDuo:true,tookMorto:true,isVip:false,isDesperate:false};
for(const partnerBot of [false,true]) for(const stock of [30,15,8,0]) for(const size of [20,50]) {
  test(`Useful full Lixo ${size}, Monte ${stock}, partner ${partnerBot?'BOT':'human'}`,()=>{
    const s=scenario({stock,partnerBot});s.players[0].hand=[...run('hand',['3','4']),card('keep')];
    s.discard=[...Array.from({length:size-1},(_,i)=>card(`pile:${i}`,String(3+i%8),'♥')),card('top','5','♣')];
    const engine=fixtureEngine(s),before=JSON.stringify(s),choices=rankBossDiscardPickups(s,0);
    assert.equal(JSON.stringify(s),before);assert.ok(choices[0].score>5);assert.equal(choices[0].quote.count,size);
    const intent=BossBuracoBot.evaluateDiscard(s,s.players[0].hand,s.teams[0],engine,ctx);
    assert.equal(intent.action,'new');assert.equal(quoteBossDiscardPickup(s,0,{handCardIds:intent.handIndexes.map(i=>s.players[0].hand[i].id)}).count,size);
  });
}
test('Bad large pickup loses to stock; protected natural top is separate',()=>{
  const s=scenario({stock:8});s.players[0].hand=[...run('hand',['3','4']),card('keep')];
  s.discard=[...Array.from({length:49},(_,i)=>card(`bad:${i}`,'K','♦')),card('top','5','♣')];
  assert.equal(BossBuracoBot.evaluateDiscard(s,s.players[0].hand,s.teams[0],fixtureEngine(s),ctx),false);
  s.teams[0].melds=[run('table',['3','4'],'♣')];
  const choice=rankBossDiscardPickups(s,0).find(c=>c.intent.action==='extend');assert.equal(choice.quote.count,1);
});
test('Connected cards preserved; isolated discard helps visible partner suit conservatively',()=>{
  const s=scenario();s.players[0].hand=[...run('own',['3','4','5']),card('isolated','9','♥'),card('isolated2','J','♦')];
  s.discard=run('pile',['3','4','5','6','7','8','9','10'],'♠');
  s.lastAction={type:'meldExtend',playerId:1,cards:[card('public','8','♥')]};
  assert.equal(rankBossDiscards(s,0)[0].cardId,'isolated');
  assert.equal(cooperativeDiscardAdjustment(s,0,s.players[0].hand[3]),-6);
  assert.equal(cooperativeDiscardAdjustment(s,0,s.players[0].hand[0]),0);
});
test('Long clean run wins over early joker without fragmentation',async()=>{
  const s=scenario();s.deadPiles=[run('dead',['3','4','5'],'♥')];
  s.players[0].hand=[...run('hand',['3','4','5','6','7','8','9']),{id:'wild',joker:true,rank:'JOKER'},card('keep')];
  const engine=fixtureEngine(s);await BossBuracoBot.processMelds(0,{},engine);
  assert.ok(s.teams[0].melds.some(m=>classifyBossMeldKind(m)==='limpa'));
  assert.ok(s.players[0].hand.some(c=>c.id==='wild'));assert.equal(engine.metrics.wasted,0);
});
test('Hidden human/BOT hands and future draw identities never affect decisions',()=>{
  const s=scenario();s.players[0].hand=[...run('own',['3','4','5']),card('isolated')];
  const before=JSON.stringify(s),a=rankBossDiscards(s,0),priorities=cooperativeBossPriorities(s,0);
  const t=structuredClone(s);t.players[1].hand=[card('secret','A','♣')];t.players[1].isBot=true;
  t.stock=t.stock.map((c,i)=>card(`secret:${i}`,'4','♣'));
  assert.deepEqual(bossObservableState(s,0),bossObservableState(t,0));
  assert.deepEqual(rankBossDiscards(t,0),a);assert.deepEqual(cooperativeBossPriorities(t,0),priorities);
  assert.equal(JSON.stringify(s),before);
});
test('Accepts cheap objective failure to preserve clean canastra; lethal failure reverses choice',()=>{
  const s=buildBossDebugScenario(null,{bossId:'nemesis',abilityId:'stars_hunt',phase:1,variant:'bot',target:'bot'}).state;
  beginBossTurn(s,{first:true,now:1000,debug:true});for(let i=0;i<20&&s.boss.bossFlow.stage!=='players';i++)advanceBossTurn(s,s.boss.bossFlow.endsAt+1);
  s.currentPlayer=1;const move=cooperativeBossPriorities(s,1).combat.plan.moves[0];
  assert.ok(rankBossMoves(s,1,[move])[0].score<0);s.boss.danger=99;assert.ok(rankBossMoves(s,1,[move])[0].score>0);
});
test('Sync, reload/undo and changed boss restrictions invalidate planning',()=>{
  const s=scenario(),a=plannerFingerprint(s,0);s.boss.danger++;assert.notEqual(plannerFingerprint(s,0),a);
  const b=plannerFingerprint(s,0);s.lastAction={id:'reload:2'};assert.notEqual(plannerFingerprint(s,0),b);
  const c=plannerFingerprint(s,0);s.deadPiles.push([card('dead')]);assert.notEqual(plannerFingerprint(s,0),c);
});
test('Cancellation during yielded planning executes no stale move',async()=>{
  const s=scenario();s.players[0].hand=Array.from({length:16},(_,i)=>card(`h:${i}`,String(3+i%8),'♣'));s.teams[0].melds=[run('m',['3','4','5'],'♥')];
  const engine=fixtureEngine(s),controller=new AbortController();let actions=0;
  engine.executeMeldNew=async()=>{actions++;return true;};engine.executeMeldExtend=engine.executeMeldNew;
  setTimeout(()=>controller.abort(),0);
  await assert.rejects(BossBuracoBot.processMelds(0,{},engine,controller.signal),e=>e.name==='AbortError');assert.equal(actions,0);
});
test('Unsafe final depletion forbidden even under legacy panic context',()=>{
  const s=scenario({stock:0});s.players[0].hand=[card('last','7','♣'),card('discard')];s.teams[0].melds=[run('m',['3','4','5','6'],'♣')];
  assert.equal(BossBuracoBot.canMeldSafely(s.players[0],s.teams[0],1,fixtureEngine(s),s.teams[0].melds[0],{isPanicDump:true}),false);
});

test('Canonical Nehelenia disorientation prevents a simulated meld without changing live state',()=>{
  const s=scenario({bossId:'nehelenia'});s.players[0].hand=[...run('own',['3','4','5']),card('keep')];
  s.boss.effects.push({id:'nehelenia_disoriented',playerId:0});const before=JSON.stringify(s);
  assert.equal(simulateBossMove(s,0,{meldIndex:null,cardIds:['own:3','own:4','own:5']}),null);
  assert.equal(JSON.stringify(s),before);
});

test('A held clean-completing extension is not discarded instead of an isolated spare',()=>{
  const s=scenario({stock:8});s.teams[0].melds=[run('m',['3','4','5','6','7','8'],'♣')];
  s.players[0].hand=[card('extend','9','♣'),card('spare','K','♦')];
  assert.equal(rankBossDiscards(s,0)[0].cardId,'spare');
});
test('Visible partner contribution remembered after own action, reset on reload',()=>{
  const s=scenario();s.players[0].hand=[card('gift','9','♥'),card('keep')];s.discard=Array.from({length:20},(_,i)=>card(`pile:${i}`));
  s.lastAction={id:'partner',type:'meldExtend',playerId:1,cards:[card('seen','8','♥')]};observeBossPublicAction(s);
  s.lastAction={id:'own',type:'meldNew',playerId:0,cards:[card('own','3','♣')]};observeBossPublicAction(s);
  assert.equal(cooperativeDiscardAdjustment(s,0,s.players[0].hand[0]),-6);
  assert.equal(cooperativeDiscardAdjustment(structuredClone(s),0,s.players[0].hand[0]),0);
});
test('Contribution plus final strike may safely finish; evaluates the post-move HP',()=>{
  const s=scenario({stock:8});s.boss.hp=110;s.deadChunksTaken[0]=2;
  s.teams[0].melds=[run('m',['3','4','5','6','7','8','9'],'♣')];s.players[0].hand=[card('play','10','♣'),card('discard')];
  assert.equal(BossBuracoBot.canMeldSafely(s.players[0],s.teams[0],1,fixtureEngine(s),[...s.teams[0].melds[0],s.players[0].hand[0]],{}),true);
});
for(const bossId of ['banker','dominadora','dimitrescu','nehelenia','nemesis','matriarca_esmeralda']) {
  test(`Shared strategy legal and read-only for ${bossId}`,()=>{
    const s=scenario({bossId});s.teams[0].melds=[run('m',['3','4','5','6'],'♣')];s.players[0].hand=[card('play','7','♣'),card('keep'),card('spare','Q','♥')];
    const before=JSON.stringify(s),rank=rankBossMoves(s,0,[{meldIndex:0,cardIds:['play']}]);
    assert.ok(Number.isFinite(rank[0].score));assert.equal(JSON.stringify(s),before);
    const t=structuredClone(s);t.players[1].hand=[card('secret','A','♠')];
    assert.equal(rankBossMoves(t,0,[{meldIndex:0,cardIds:['play']}])[0].score,rank[0].score);
  });
}
test('Worker reply is rejected when a synchronized boss state changed mid-plan',async()=>{
  const s=scenario();s.players[0].hand=Array.from({length:16},(_,i)=>card(`w:${i}`,String(3+i%8),'♣'));
  const original=globalThis.Worker;
  class TestWorker {
    handlers={};addEventListener(name,callback){this.handlers[name]=callback;}
    postMessage(message){queueMicrotask(()=>{s.boss.danger++;this.handlers.message({data:{...message,ok:true,result:[[0,1,2]]}});});}
    terminate(){}
  }
  globalThis.Worker=TestWorker;BossBuracoBot._plannerWorkerDisabled=false;
  try{await assert.rejects(BossBuracoBot.planTriples(s,0,fixtureEngine(s)),e=>e.code==='BOT_PLAN_STALE');}
  finally{BossBuracoBot.destroyPlannerWorker();globalThis.Worker=original;}
});
