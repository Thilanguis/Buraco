import test from 'node:test';
import assert from 'node:assert/strict';
import { scenario } from './boss-cooperative-fixture.mjs';
import { run } from './dominatrix-balance-fixture.mjs';
import { normalizeBossState,changeMatriarchBloom,applyBossMeldTransition,applyBossFinalStrike } from '../js/boss/boss-engine.js';
import { matriarchBloomFlowersHTML } from '../js/boss/ui/matriarch-bloom-view.js';
import { buildBossRuleSummary } from '../js/boss/boss-presentation.js';
for(const n of [4,5,8,9,10])test(`Matriarca ${n} flowers: gain, clamp, save/reload, undo and terminal boundary`,()=>{
  const s=scenario({bossId:'matriarca_esmeralda'}),undo=structuredClone(s);
  for(let i=1;i<=n;i++) {
    const event=changeMatriarchBloom(s,1,'punição',`flower:${i}`);assert.equal(event.amount,1);
    assert.equal(s.boss.bloom,i);assert.equal(s.boss.danger,i);
    assert.equal(!!s.boss.result,i===10);
    assert.equal(changeMatriarchBloom(s,1,'duplicado',`flower:${i}`),null);
  }
  const restored=JSON.parse(JSON.stringify(s));normalizeBossState(restored);normalizeBossState(restored);
  assert.equal(restored.boss.bloom,n);assert.equal(restored.boss.maxDanger,10);
  assert.deepEqual(restored.boss.eventLog,s.boss.eventLog);
  assert.equal((matriarchBloomFlowersHTML({bloom:n}).match(/<img /g)||[]).length,10);
  assert.equal((matriarchBloomFlowersHTML({bloom:n}).match(/boss-lotus-flower open/g)||[]).length,n);
  assert.match(buildBossRuleSummary(restored),/10 Flores/);
  if(n<10)assert.equal(changeMatriarchBloom(restored,-1,'alívio',`relief:${n}`).amount,-1);
  else {assert.equal(restored.boss.result.reason,'max_bloom');assert.equal(changeMatriarchBloom(restored,-1),null);}
  normalizeBossState(undo);assert.equal(undo.boss.bloom,0);assert.equal(undo.boss.result,null);
});
test('ongoing old /5 save migrates without events; old ended defeat never reactivates',()=>{
  for(const ended of [false,true]) {
    const s=scenario({bossId:'matriarca_esmeralda'});s.boss.maxDanger=5;s.boss.bloom=s.boss.danger=5;
    if(ended){s.boss.result={victory:false,reason:'max_bloom',detail:'Historical defeat'};s.finished=true;}
    const events=JSON.stringify(s.boss.eventLog),result=structuredClone(s.boss.result);
    normalizeBossState(s);assert.equal(s.boss.maxDanger,10);assert.equal(s.boss.bloom,5);
    assert.deepEqual(s.boss.result,result);assert.equal(JSON.stringify(s.boss.eventLog),events);
    if(ended)assert.equal(s.finished,true);else assert.equal(changeMatriarchBloom(s,1).bloom,6);
  }
});
test('saved danger-only legacy state clamps at 10 and confirms terminal snapshot only once',()=>{
  const s=scenario({bossId:'matriarca_esmeralda'});delete s.boss.bloom;s.boss.danger=12;s.boss.maxDanger=5;
  normalizeBossState(s);assert.equal(s.boss.bloom,10);assert.equal(s.boss.danger,10);
  const result=s.boss.result;normalizeBossState(s);assert.equal(s.boss.result,result);
  assert.equal(result.reason,'max_bloom');
});
test('incremental clean/real/ace-to-ace relief above fifth flower remains 1 per tier, deduplicated',()=>{
  const s=scenario({bossId:'matriarca_esmeralda'});s.boss.bloom=s.boss.danger=9;
  s.teams[0].melds=[run('physical',['3','4','5','6','7','8','9'])];
  for(const [oldKind,newKind,expected] of [['simple','limpa',8],['limpa','real',7],['real','asas',6]]) {
    applyBossMeldTransition(s,{teamId:0,playerId:0,meldIndex:0,meldId:'physical',oldKind,newKind,cardsAdded:[]});
    assert.equal(s.boss.bloom,expected);
    applyBossMeldTransition(s,{teamId:0,playerId:0,meldIndex:0,meldId:'physical',oldKind,newKind,cardsAdded:[]});
    assert.equal(s.boss.bloom,expected);
  }
});
test('rebirth at 9 consumes precisely one flower; defeat at 10 cannot revive',()=>{
  for(const n of [5,8,9,10]) {
    const s=scenario({bossId:'matriarca_esmeralda'});s.boss.phase=3;s.boss.hp=0;s.boss.bloom=s.boss.danger=n;
    normalizeBossState(s);applyBossFinalStrike(s,0,0);
    if(n<10){assert.equal(s.boss.hp,300);assert.equal(s.boss.bloom,n-1);assert.equal(s.boss.rebirthUsed,true);}
    else {assert.equal(s.boss.result.reason,'max_bloom');assert.equal(s.boss.rebirthUsed,false);}
  }
});
