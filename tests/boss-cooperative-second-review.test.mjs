import assert from 'node:assert/strict';
import test from 'node:test';
import {cooperativeHandValue,cooperativeHandMarginals} from '../js/game/bot-planner.js';
import {rankBossMoves,rankBossDiscardPickups,cooperativeDiscardAdjustment} from '../js/boss/boss-bot-strategy.js';
import {BossBuracoBot} from '../boss-bot.js';
import {card,scenario,fixtureEngine} from './boss-cooperative-fixture.mjs';
import {auditWildcardMove} from './boss-wildcard-audit.mjs';
import {quoteBossDiscardPickup,completeBossPlayerTurn} from '../js/boss/boss-engine.js';
// Frozen reference from f0d4551, so permanent unit tests do not need Git history.
function previousHandValue(hand,melds) {
  const low=['A','2','3','4','5','6','7','8','9','10','J','Q','K'],high=[...low.slice(1),'A'];
  const adjacent=(a,b)=>[low,high].some(order=>Math.abs(order.indexOf(String(a.rank))-order.indexOf(String(b.rank)))===1);
  let value=0;
  for(const c of hand) {
    if(c.joker||c.forceWild||(String(c.rank)==='2'&&!c.forceNatural)){value+=28;continue;}
    value+=Math.min(2,hand.filter(n=>n.id!==c.id&&!n.joker&&n.suit===c.suit&&adjacent(n,c)).length)*7;
    for(const m of melds)if(m.length<14&&!m.some(n=>n.joker||n.forceWild)&&m.some(n=>n.suit===c.suit&&adjacent(n,c))){value+=m.length>=5?18:8;break;}
  }
  return value;
}
const run=(prefix,ranks,suit='♣')=>ranks.map(r=>card(`${prefix}:${r}`,r,suit));
const joker={id:'wild',rank:'JOKER',joker:true};
for(const size of [20,50])test(`Many existing destinations cannot starve full/new Lixo ${size}`,()=>{
  const s=scenario({stock:8});s.players[0].hand=[...run('own',['4','5','7']),card('keep')];
  s.teams[0].melds=Array.from({length:20},(_,i)=>run(`table:${i}`,['3','4','5']));
  s.discard=[...Array.from({length:size-1},(_,i)=>card(`pile:${i}`,String(3+i%8),'♥')),card('top','6','♣')];
  const before=JSON.stringify(s),rank=rankBossDiscardPickups(s,0);
  // The original extension-first budget is exhausted before new destinations.
  const old=s.teams[0].melds.flatMap((m,meldIndex)=>[[],...s.players[0].hand.map(c=>[c.id])]
    .map(handCardIds=>quoteBossDiscardPickup(s,0,{meldIndex,handCardIds}))).filter(q=>q.allowed).slice(0,32);
  assert.equal(old.length,32);assert.equal(old.filter(q=>q.count===size).length,0);
  assert.ok(rank.length<=64);assert.ok(rank.some(c=>c.intent.action==='new'&&c.quote.count===size));
  assert.ok(rank.some(c=>c.intent.action==='extend'&&c.quote.count===1));
  assert.equal(rank[0].quote.count,size);assert.equal(JSON.stringify(s),before);
  const t=structuredClone(s);t.players[0].hand.reverse();t.teams[0].melds.reverse();
  assert.equal(rankBossDiscardPickups(t,0)[0].quote.count,size);
});
test('Indexed value and every removal marginal equal the previous policy on varied hands',()=>{
  let seed=913;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  const ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  for(let sample=0;sample<120;sample++) {
    const hand=Array.from({length:3+rng()%48},(_,i)=>({...card(`h:${i}`,ranks[rng()%13],['♣','♥','♠','♦'][rng()%4]),
      ...(i%17===0?{joker:true}:{}),...(i%11===0?{forceWild:true}:{}),...(i%7===0?{forceNatural:true}:{})}));
    const melds=[run('short',['A','2','3']),run('long',['8','9','10','J','Q'],'♥')];
    if(sample%2)melds.reverse();
    const expected=previousHandValue(hand,melds),marginals=cooperativeHandMarginals(hand,melds);
    assert.equal(cooperativeHandValue(hand,melds),expected);
    for(const c of hand)assert.equal(marginals.get(c.id),expected-previousHandValue(hand.filter(n=>n.id!==c.id),melds));
  }
});
test('Caller candidate limits are respected even below the number of pickup groups',()=>{
  const s=scenario({stock:8});s.players[0].hand=[...run('own',['4','5','7']),card('keep')];
  s.teams[0].melds=[run('table',['3','4','5'])];s.discard=[card('under','8','♥'),card('top','6','♣')];
  assert.equal(rankBossDiscardPickups(s,0,{maxCandidates:0}).length,0);
  assert.ok(rankBossDiscardPickups(s,0,{maxCandidates:1}).length<=1);
});

test('Pickup metrics distinguish a full one-card pile from a protected top',async()=>{
  const full=scenario();full.players[0].hand=[...run('own',['3','4']),card('keep'),card('spare','Q','♥')];
  full.discard=[card('top','5','♣')];full.hasDrawnThisTurn=false;
  const fullEngine=fixtureEngine(full);
  assert.equal(await fullEngine.executeDrawDiscardFechado(0,{action:'new',handIndexes:[0,1]}),true);
  assert.equal(fullEngine.metrics.fullPickups,1);assert.equal(fullEngine.metrics.partialPickups,0);
  const top=scenario();top.teams[0].melds=[run('table',['3','4','5'])];
  top.players[0].hand=[card('keep'),card('spare','Q','♥')];
  top.discard=[card('top','6','♣')];top.hasDrawnThisTurn=false;
  const topEngine=fixtureEngine(top);
  assert.equal(await topEngine.executeDrawDiscardFechado(0,{action:'extend',meldIndex:0,handIndexes:[]}),true);
  assert.equal(topEngine.metrics.fullPickups,0);assert.equal(topEngine.metrics.partialPickups,1);
});
test('A superior natural alternative beats an unnecessary wildcard and preserves a clean run',()=>{
  const s=scenario();s.players[0].hand=[...run('own',['3','4','5','6','7','8','9']),joker,card('keep')];
  const ids=['own:3','own:4','own:5','own:6','own:7','own:8'];
  const moves=[{meldIndex:null,cardIds:[...ids,'wild']},{meldIndex:null,cardIds:[...ids,'own:9']}];
  assert.deepEqual(rankBossMoves(s,0,moves)[0].move,moves[1]);
  assert.equal(auditWildcardMove(s,0,moves[0]).dominated,1);
});
test('Wildcard can complete a valuable dirty canastra with scarce resources; no absolute ban',()=>{
  const s=scenario({stock:0});s.teams[0].melds=[run('table',['3','4','5','6','7','8']),run('clean',['3','4','5','6','7','8','9'],'♥')];
  s.players[0].hand=[joker,card('keep'),card('spare','Q','♥')];
  const move={meldIndex:0,cardIds:['wild']},rank=rankBossMoves(s,0,[move]);
  assert.ok(Number.isFinite(rank[0].score));assert.ok(rank[0].score>0);
  const a=auditWildcardMove(s,0,move);assert.equal(a.spent,1);assert.equal(a.dominated,0);assert.equal(a.useful,1);
});
test('Canonical natural 2 is not charged or counted as a wildcard',()=>{
  const s=scenario();s.players[0].hand=[...run('own',['A','2','3']),card('keep')];
  const move={meldIndex:null,cardIds:['own:A','own:2','own:3']};
  assert.ok(rankBossMoves(s,0,[move])[0].score>0);
  assert.deepEqual(auditWildcardMove(s,0,move),{spent:0,dominated:0,useful:0,unproved:0,naturalTwos:1,twosWild:0});
});
test('Counterfactual audit accepts a canonical natural 2 as a superior Joker replacement',()=>{
  const s=scenario();s.players[0].hand=[...run('own',['A','2','3','4','5','6','7']),joker,card('keep')];
  assert.equal(auditWildcardMove(s,0,{meldIndex:null,cardIds:['own:A','own:3','own:4','own:5','own:6','own:7','wild']}).dominated,1);
});
test('Weak public partner clue cannot sacrifice a connected own sequence',()=>{
  for(const isBot of [false,true]) {
    const s=scenario({partnerBot:isBot});s.players[0].hand=[...run('own',['7','8','9'],'♥'),card('spare')];
    s.lastAction={type:'meldExtend',playerId:1,cards:[card('public','8','♥')]};
    s.discard=Array.from({length:20},(_,i)=>card(`pile:${i}`));
    assert.equal(cooperativeDiscardAdjustment(s,0,s.players[0].hand[1]),0);
  }
});
test('New-triple yield rejects a changed synchronized state before executing',async()=>{
  const s=scenario();s.players[0].hand=[...run('c',['3','4','5','6','7','8','9','10','J','Q','K','A']),
    ...run('h',['3','4','5','6','7','8','9','10','J','Q','K','A'],'♥'),card('keep')];
  s.deadPiles=[[card('dead')]];const engine=fixtureEngine(s);let actions=0;
  engine.executeMeldNew=async()=>{actions++;return true;};engine.executeMeldExtend=engine.executeMeldNew;
  class SyncBot extends BossBuracoBot {
    static getPlannerWorker(){return null;}
    static async cooperativeYield(e,signal){s.boss.danger++;return super.cooperativeYield(e,signal);}
  }
  await assert.rejects(SyncBot.processMelds(0,{},engine),e=>e.code==='BOT_PLAN_STALE');assert.equal(actions,0);
});
test('Worker response with the wrong request token is rejected',async()=>{
  const s=scenario();s.players[0].hand=Array.from({length:16},(_,i)=>card(`w:${i}`,String(3+i%8),'♣'));
  const original=globalThis.Worker;
  class WrongTokenWorker {
    handlers={};addEventListener(name,callback){this.handlers[name]=callback;}
    postMessage(message){queueMicrotask(()=>this.handlers.message({data:{...message,token:'obsolete-token',ok:true,result:[[0,1,2]]}}));}
    terminate(){}
  }
  globalThis.Worker=WrongTokenWorker;BossBuracoBot._plannerWorkerDisabled=false;
  try{await assert.rejects(BossBuracoBot.planTriples(s,0,fixtureEngine(s)),e=>e.code==='BOT_PLAN_STALE');}
  finally{BossBuracoBot.destroyPlannerWorker();globalThis.Worker=original;}
});
test('Native scheduling keeps the same cancellation check as the timer fallback',async()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'scheduler');let yielded=0;
  Object.defineProperty(globalThis,'scheduler',{configurable:true,value:{yield:async()=>{yielded++;}}});
  try {
    await assert.rejects(BossBuracoBot.cooperativeYield({isActive:()=>false}),e=>e.name==='AbortError');
    assert.equal(yielded,1);
  } finally {if(descriptor)Object.defineProperty(globalThis,'scheduler',descriptor);else delete globalThis.scheduler;}
});
test('Headless adapter ends immediately on the same lethal-contribution flag used by the app',async()=>{
  const s=scenario();s.boss.hp=1;s.players[0].hand=[...run('own',['3','4','5']),card('keep'),card('spare','Q','♥')];
  const engine=fixtureEngine(s);assert.equal(await engine.executeMeldNew(0,[0,1,2]),true);
  assert.equal(s.boss.result?.victory,true);assert.equal(s.boss.result.reason,'boss_defeated');assert.equal(engine.isActive(),false);
  assert.equal(s.boss.hp,0);assert.equal(engine.metrics.moves,1);
});
test('Canonical lethal contribution wins before a future deadline; ranking stays read-only',()=>{
  const s=scenario();s.boss.hp=1;s.teams[0].melds=[run('table',['3','4','5','6','7','8'])];
  s.players[0].hand=[joker,card('keep'),card('spare','Q','♥')];const before=JSON.stringify(s);
  assert.ok(rankBossMoves(s,0,[{meldIndex:0,cardIds:['wild']}])[0].score>99000);
  assert.equal(JSON.stringify(s),before);
});
for(const bossId of ['banker','dominadora','dimitrescu','nehelenia','nemesis','matriarca_esmeralda'])test(`Deferred projection resolves ${bossId} without generating a future ability`,()=>{
  const s=scenario({bossId});s.players[0].hand=[...run('own',['3','4','5']),card('keep')];
  const defaultFlow=structuredClone(s),explicitDefault=structuredClone(s),probe=structuredClone(s);
  for(const id of [0,1]) {
    completeBossPlayerTurn(defaultFlow,id);completeBossPlayerTurn(explicitDefault,id,{deferNextBossTurn:false});
    completeBossPlayerTurn(probe,id,{deferNextBossTurn:true});
  }
  const mechanics=t=>[t.boss.hp,t.boss.danger,t.boss.bloom,t.boss.roundNumber,t.boss.playersActedThisRound,t.boss.result];
  assert.deepEqual(mechanics(defaultFlow),mechanics(explicitDefault));
  assert.deepEqual(mechanics(probe),mechanics(defaultFlow));
  assert.ok(probe.boss.awaitingBossTurn);assert.equal(probe.boss.roundNumber,s.boss.roundNumber+1);
  assert.equal(probe.boss.currentIntent,null);
  assert.equal(defaultFlow.boss.bossFlow.stage,explicitDefault.boss.bossFlow.stage);
});
