import test from 'node:test';
import assert from 'node:assert/strict';
import {BossBuracoBot} from '../boss-bot.js';
import {rankBossMoves,rankBossDiscardPickups,inspectBossBotDecision} from '../js/boss/boss-bot-strategy.js';
import {classifyBossMeldKind} from '../js/boss/boss-engine.js';
import {wildcardFixture} from './boss-wildcard-preservation-fixture.mjs';
import {fixtureEngine,card,scenario} from './boss-cooperative-fixture.mjs';
const decide=s=>BossBuracoBot.evaluateDiscard(s,s.players[0].hand,s.teams[0],fixtureEngine(s),{});
for(const kind of ['joker','two'])for(const danger of [0,8])for(const stock of [59,61,80]) {
  test(`Early ${kind}, Infection ${danger}, Monte ${stock}: hold/stock beat a short dirty opening`,async()=>{
    const {state:s,pickup,move}=wildcardFixture({kind,danger,stock});
    const rank=rankBossMoves(s,0,[move])[0],choice=rankBossDiscardPickups(pickup,0)[0];
    assert.ok(rank.score<0);assert.ok(choice.diagnostics.wildcardPenalty>=100);
    assert.equal(decide(pickup),false);
    const e=fixtureEngine(s);await BossBuracoBot.processMelds(0,{},e);
    assert.equal(e.metrics.moves,0);assert.ok(s.players[0].hand.some(c=>c.joker||c.rank==='2'));
  });
}
for(const kind of ['joker','two'])test(`${kind}: final pickup score includes the same reserve, not only rough sorting`,()=>{
  const {pickup}=wildcardFixture({kind});
  const choice=rankBossDiscardPickups(pickup,0)[0],d=choice.diagnostics;
  assert.equal(choice.score,d.deadlineDelta-d.isolationPenalty+d.naturalBonus-d.wildcardPenalty);
  assert.equal(d.wildSpent,1);assert.equal(d.reserve,100);assert.ok(d.cleanOpportunity>0);
  assert.equal(d.acquiredCount,1);assert.equal(choice.quote.protected,false);
});
for(const kind of ['joker','two'])for(const danger of [0,99])test(`${kind}: cheap hunt failure preserves, lethal hunt failure spends (danger ${danger})`,()=>{
  const {state,pickup,move}=wildcardFixture({kind,danger,obligation:true});
  const result=rankBossMoves(state,0,[move])[0];
  assert.equal(result.score>0,danger===99);
  assert.equal(result.diagnostics.objective.abilityId,'stars_hunt');
  assert.equal(result.diagnostics.objective.lossWithoutAction,danger===99);
  assert.equal(result.diagnostics.objective.lossAfterAction,false);
  assert.equal(!!decide(pickup),danger===99);
});
for(const kind of ['joker','two'])test(`${kind}: a useful full Lixo can outweigh preservation even early`,()=>{
  const {pickup}=wildcardFixture({kind,rich:true});
  const rank=rankBossDiscardPickups(pickup,0)[0];assert.equal(rank.quote.count,21);
  assert.ok(rank.diagnostics.acquiredHandValue>100);assert.ok(decide(pickup));
});
for(const kind of ['joker','two'])test(`${kind}: immediate victory still outweighs wildcard preservation`,()=>{
  const {state,pickup,move}=wildcardFixture({kind,lethal:true});
  assert.ok(rankBossMoves(state,0,[move])[0].score>99000);assert.ok(decide(pickup));
});
test('Natural 2 gets natural reward and no wildcard penalty in hand OR final pickup',()=>{
  const {state,pickup,move}=wildcardFixture({natural:true});
  for(const result of [rankBossMoves(state,0,[move])[0],rankBossDiscardPickups(pickup,0)[0]]) {
    assert.equal(result.diagnostics.wildSpent,0);assert.equal(result.diagnostics.wildcardPenalty,0);
    assert.equal(result.diagnostics.naturalBonus,36);assert.ok(result.score>0);
  }
  assert.ok(decide(pickup));
});
test('Scarce resources lower the reserve; completing a canastra remains valuable',()=>{
  const {state:early,move}=wildcardFixture(),{state:late}=wildcardFixture({stock:0});
  assert.ok(rankBossMoves(early,0,[move])[0].diagnostics.wildcardPenalty>rankBossMoves(late,0,[move])[0].diagnostics.wildcardPenalty);
  const s=scenario({stock:0});s.teams[0].melds=[['3','4','5','6','7','8'].map(r=>card(`m:${r}`,r,'♠'))];
  s.players[0].hand=[{id:'wild',rank:'JOKER',joker:true},card('keep'),card('spare','8','♥')];
  assert.ok(rankBossMoves(s,0,[{meldIndex:0,cardIds:['wild']}])[0].score>0);
});
test('Legal wildcard in followup is charged too, not hidden behind a natural first contribution',()=>{
  const {state}=wildcardFixture();state.players[0].hand.push(...['4','5','6'].map(r=>card(`natural:${r}`,r,'♣')));
  const result=rankBossMoves(state,0,[{meldIndex:null,cardIds:['natural:4','natural:5','natural:6'],
    followups:[{meldIndex:null,cardIds:['own:0','own:1','own:2']}]}])[0];
  assert.ok(result.diagnostics.followupWildcardPenalty>=100);
});
test('Diagnostic is read-only and invariant under hidden partner/Monte/Morto identities and reload',()=>{
  const {pickup,move}=wildcardFixture({rich:true});pickup.deadPiles=[[card('unknown:dead')],[]];
  const before=JSON.stringify(pickup);
  const a=inspectBossBotDecision(pickup,0,[{...move,cardIds:pickup.players[0].hand.slice(0,3).map(c=>c.id)}]);
  const b=structuredClone(pickup);b.players[1].hand=[card('SECRET_HUMAN','2','♠')];
  b.stock=b.stock.map(c=>({...c,id:'SECRET_STOCK',rank:'2',suit:'♠'}));
  b.deadPiles=[[card('SECRET_MORTO','2','♠')],[]];
  assert.deepEqual(inspectBossBotDecision(b,0,[{...move,cardIds:pickup.players[0].hand.slice(0,3).map(c=>c.id)}]),a);
  assert.equal(JSON.stringify(pickup),before);assert.ok(!JSON.stringify(a).includes('SECRET'));
  assert.deepEqual(inspectBossBotDecision(JSON.parse(before),0),inspectBossBotDecision(pickup,0));
});
test('Clean opportunity uses public remaining copies, not a promise of drawing the missing rank',()=>{
  const {state,move}=wildcardFixture();
  assert.ok(rankBossMoves(state,0,[move])[0].diagnostics.cleanOpportunity>0);
  state.discard=[card('seen:1','2','♠'),card('seen:2','2','♠')];
  assert.equal(rankBossMoves(state,0,[move])[0].diagnostics.cleanOpportunity,0);
});
test('An available natural bridge beats the dirty alternative and produces a clean game',()=>{
  const {state,move}=wildcardFixture({kind:'two'});state.players[0].hand.push(card('bridge','Q','♠'));
  const natural={meldIndex:null,cardIds:['own:0','own:1','bridge','own:3']};
  const ranks=rankBossMoves(state,0,[move,natural]);assert.deepEqual(ranks[0].move,natural);
  assert.equal(classifyBossMeldKind(ranks[0].next.teams[0].melds[0]),'simple');
  assert.ok(!ranks[0].next.teams[0].melds[0].some(c=>c.rank==='2'));
});
