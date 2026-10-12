import test from 'node:test';
import assert from 'node:assert/strict';
import { card, fixtureEngine } from './boss-cooperative-fixture.mjs';
import { orderedScenario, run } from './dominatrix-balance-fixture.mjs';
import { rankBossDiscards,rankBossMoves,rankBossDiscardPickups,strategyValue } from '../js/boss/boss-bot-strategy.js';
import { notifyBossCardDiscarded,completeBossPlayerTurn } from '../js/boss/boss-engine.js';
import { BossBuracoBot } from '../boss-bot.js';

function discard(s,index,id) {
  const next=structuredClone(s),p=next.players[index],c=p.hand.find(c=>c.id===id);
  p.hand=p.hand.filter(c=>c.id!==id);next.discard.push(c);
  notifyBossCardDiscarded(next,p.id,c);completeBossPlayerTurn(next,p.id,{deferNextBossTurn:true});
  return next;
}
for(const index of [0,1])for(const points of [[0,0],[25,20],[47,47],[50,40]])
test(`Dominadora ${points.join('/')} index ${index}: cheap legal compliance executes in production`,async()=>{
  const s=orderedScenario({points,index}),before=JSON.stringify(s),rank=rankBossDiscards(s,index);
  assert.equal(rank[0].cardId,'obey');assert.equal(JSON.stringify(s),before);
  const predicted=discard(s,index,rank[0].cardId),engine=fixtureEngine(s);
  assert.equal(await BossBuracoBot.processDiscard(index,1,engine),true);
  assert.equal(s.discard.at(-1).id,'obey');assert.equal(s.boss.activeOrders[0].status,'obeyed');
  assert.deepEqual(s.boss.chainsByPlayer,predicted.boss.chainsByPlayer);
  assert.notEqual(s.boss.result?.victory,false);
});
test('both public bars affect strategy even with danger fixed at zero; critical spill is fatal',()=>{
  const low=orderedScenario(),medium=orderedScenario({points:[25,25]}),high=orderedScenario({points:[50,40]});
  assert.equal(low.boss.danger,high.boss.danger);
  assert.ok(strategyValue(low,0)>strategyValue(medium,0));assert.ok(strategyValue(medium,0)>strategyValue(high,0));
  const failure=discard(high,0,'spare');assert.equal(failure.boss.result.reason,'both_players_dominated');
  assert.ok(failure.boss.eventLog.some(e=>e.type==='chainOverflow'));
  assert.equal(rankBossDiscards(high,0).find(c=>c.cardId==='spare').diagnostics.objective.lossAfterAction,true);
});
test('several valid cards: preserve the useful extension and discard the cheap clubs card',()=>{
  const s=orderedScenario({points:[45,40],melds:[run('table',['3','4','5','6','7','8'])],
    hand:[card('valuable','9','♣'),card('cheap','K','♣'),card('spare','3','♦')]});
  assert.equal(rankBossDiscards(s,0)[0].cardId,'cheap');
});
test('sole required card is held before a costly deadline, but a low-risk clean canastra may justify spending it',()=>{
  const make=points=>orderedScenario({points,melds:[run('table',['3','4','5','6','7','8'])],
    hand:[card('needed','9','♣'),card('spare','3','♦'),card('keep','K','♥')]});
  const move={meldIndex:0,cardIds:['needed']};
  const critical=rankBossMoves(make([50,40]),0,[move])[0];
  assert.ok(critical.score<0);assert.equal(critical.diagnostics.objective.lossAfterAction,true);
  const low=rankBossMoves(make([0,0]),0,[move])[0];assert.ok(low.score>0);
  assert.equal(low.next.boss.activeOrders[0].ownOptionsConsumed,true);
  assert.ok(low.diagnostics.objective.resourceAfterAction>0);
});
test('shortlist cannot crowd out a legal move preserving the required discard',()=>{
  const s=orderedScenario({points:[40,50],hand:[card('needed','9','♣'),card('heart:6','6','♥'),card('keep','K','♦')],
    melds:[run('table',['3','4','5','6','7','8']),run('heart-table',['3','4','5'],'♥')]});
  const safe={meldIndex:1,cardIds:['heart:6']};
  const bad=Array.from({length:40},(_,i)=>({meldIndex:0,cardIds:['needed'],tag:i}));
  const rank=rankBossMoves(s,0,[...bad,safe]);assert.deepEqual(rank[0].move,safe);
  assert.equal(rank[0].diagnostics.plannedDiscardCardId,'needed');
  assert.equal(rank[0].diagnostics.objective.lossAfterAction,false);
});
for(const index of [0,1])test(`production meld loop keeps sole ordered card until actual discard, index ${index}`,async()=>{
  const points=index===0?[40,50]:[50,40];
  const s=orderedScenario({points,index,
    hand:[card('needed','9','♣'),card('heart:6','6','♥'),card('keep','K','♦')],
    melds:[run('table',['3','4','5','6','7','8']),run('heart-table',['3','4','5'],'♥')]});
  const engine=fixtureEngine(s);
  await BossBuracoBot.processCooperativeBossMelds(index,engine);
  assert.ok(s.players[index].hand.some(c=>c.id==='needed'));
  assert.ok(s.teams[0].melds[1].some(c=>c.id==='heart:6'));
  assert.equal(await BossBuracoBot.processDiscard(index,1,engine),true);
  assert.equal(s.discard.at(-1).id,'needed');assert.notEqual(s.boss.result?.victory,false);
});
test('blocked, picked mandatory top and impossible orders follow canonical cancellation, not invented penalties',()=>{
  for(const block of ['locked','picked','impossible']) {
    const s=orderedScenario({points:[50,40]});
    if(block==='locked')s.boss.effects=[{id:'choice_lock',playerId:0,cardId:'obey',expiresAfterTurn:true}];
    if(block==='picked')s.pickedDiscardCardId='obey';
    if(block==='impossible')s.players[0].hand=s.players[0].hand.filter(c=>c.id!=='obey');
    const rank=rankBossDiscards(s,0);assert.ok(rank.length);assert.notEqual(rank[0].cardId,'obey');
    const end=discard(s,0,rank[0].cardId);assert.equal(end.boss.activeOrders[0].status,'cancelled');
    assert.notEqual(end.boss.result?.victory,false);
  }
});
test('clean-run wildcard sacrifice is unattractive at low Domination but justified to avert terminal order failure',()=>{
  const make=points=>{
    const s=orderedScenario({points,melds:[run('table',['3','4','5','6','7','8'])],
      hand:[{id:'wild',rank:'JOKER',joker:true},card('spare','K','♦'),card('keep','Q','♥')]});
    s.boss.meldIdsByPosition={'0:0':'ordered-meld'};
    s.boss.activeOrders=[{id:'feed',type:'feed_specific_meld',targetPlayerId:0,status:'active',meldIndex:0,meldId:'ordered-meld',
      sourceAbilityId:'forced_choice',announcedPhase:3}];return s;
  };
  const move={meldIndex:0,cardIds:['wild']};
  assert.ok(rankBossMoves(make([0,0]),0,[move])[0].score<0);
  const high=rankBossMoves(make([50,40]),0,[move])[0];assert.ok(high.score>0);
  assert.equal(high.diagnostics.objective.lossWithoutAction,true);
  assert.equal(high.diagnostics.objective.lossAfterAction,false);
});
test('Lixo ranking projects the final discard: gaining clubs avoids defeat without hidden knowledge',()=>{
  const s=orderedScenario({points:[36,50],hand:[card('a','3','♥'),card('b','4','♥'),card('keep','K','♦')]});
  s.boss.activeOrders[0].ownOptionsConsumed=true;s.discard=[card('rescue','K','♣'),card('top','5','♥')];
  s.hasDrawnThisTurn=false;
  const ranked=rankBossDiscardPickups(s,0);assert.ok(ranked.length);
  assert.equal(ranked[0].diagnostics.plannedDiscardCardId,'rescue');assert.ok(ranked[0].score>1000);
  assert.equal(ranked[0].diagnostics.objective.lossWithoutAction,true);
  assert.equal(ranked[0].diagnostics.objective.lossAfterAction,false);
  const hidden=structuredClone(s);hidden.stock=hidden.stock.map((c,i)=>({...c,rank:'A',suit:'♣',id:`other:${i}`}));
  hidden.players[1].hand=[card('secret','A','♣')];
  assert.deepEqual(rankBossDiscardPickups(hidden,0),ranked);
});
test('discard planning must not invent an unresolved partner failure from hidden cards',()=>{
  const s=orderedScenario({points:[40,45]});s.boss.activeOrders.push({id:'partner',type:'reduce_hand',handLimit:0,
    targetPlayerId:1,status:'active',sourceAbilityId:'forced_choice',announcedPhase:3});
  const first=rankBossDiscards(s,0)[0];assert.equal(first.cardId,'obey');
  assert.equal(first.diagnostics.objective.lossAfterAction,false);
});
