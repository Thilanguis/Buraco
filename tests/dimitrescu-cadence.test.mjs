import test from 'node:test';
import assert from 'node:assert/strict';
import { createBossState, normalizeBossState, startDimitrescuRound, selectNextBossIntent, completeBossPlayerTurn,
  applyBossMeldTransition, notifyBossDiscardTaken, getBossDimitrescuPriorities, useCastleItem } from '../js/boss/boss-engine.js';
import { damageDaughter, regenerateDaughters } from '../js/boss/dimitrescu-castle.js';
import { daughterPassiveChips } from '../js/boss/ui/dimitrescu-castle-view.js';
import { createUndoTransaction, restoreUndoTransaction } from '../js/game/undo-transaction.js';
import { dimitrescuDefinition } from '../js/boss/bosses/dimitrescu.js';
const card=(id,rank='K',suit='♥',extra={})=>({id,rank,suit,joker:false,...extra});
function game(seed=1234) {
  return {mode:'boss_dimitrescu',currentPlayer:0,hasDrawnThisTurn:true,turnNumber:1,stock:Array.from({length:60},(_,i)=>card(`stock${i}`)),
    discard:[card('top')],deadPiles:[[card('dead')]],deadChunksTaken:[0,0],deadChunksMax:[2,0],
    players:[{id:0,name:'Humano',teamId:0,hand:[card('six','6','♠'),card('spare')]},
      {id:1,name:'BOT Luana',isBot:true,teamId:0,hand:[card('seven','7','♠'),card('other')]}],
    teams:[{id:0,melds:[['3','4','5'].map(r=>card(`m${r}`,r,'♠'))]}],boss:{...createBossState('dimitrescu',seed),bossFlow:{stage:'players'}}};
}
const daughter=(s,id)=>s.boss.combatEntities.find(d=>d.id===id);
const kill=(s,id)=>damageDaughter(s,daughter(s,id),1000,`kill-${id}`,e=>s.boss.eventLog.push(e));
const force=(s,id)=>selectNextBossIntent(s,{debug:true,forcedAbilityId:id});
test('cadência normal escolhe exatamente uma viva, sem repetir imediatamente, seed determinístico',()=>{
  const a=game(),b=game(),seen=new Set();let previous=null;
  for(let round=1;round<=18;round++) {
    for(const s of [a,b]) {s.boss.roundNumber=round;startDimitrescuRound(s);}
    assert.deepEqual(a.boss.castleSelectedDaughterIds,b.boss.castleSelectedDaughterIds);
    assert.equal(a.boss.castleSelectedDaughterIds.length,1);
    const id=a.boss.castleSelectedDaughterIds[0];assert.notEqual(id,previous);previous=id;seen.add(id);
    assert.equal(a.boss.combatEntities.filter(d=>d.passive).length,1);
    assert.ok(a.boss.combatEntities.every(d=>d.status==='alive'&&d.regeneration===50));
    for(const d of a.boss.combatEntities.filter(d=>d.id!==id)) assert.deepEqual(daughterPassiveChips(d,a),[{bela:'CAÇADA',cassandra:'BANQUETE',daniela:'LIXO +3'}[d.id]]);
  }
  assert.equal(seen.size,3);
});
test('com uma ou duas vivas nunca escolhe morta; uma viva sempre participa',()=>{
  for(const dead of [1,2,3]) {
    const s=game();['bela','cassandra','daniela'].slice(0,dead).forEach(id=>kill(s,id));
    for(let round=1;round<6;round++) {s.boss.roundNumber=round;startDimitrescuRound(s);
      assert.equal(s.boss.castleSelectedDaughterIds.length,dead===3?0:1);
      assert.ok(s.boss.castleSelectedDaughterIds.every(id=>daughter(s,id).status==='alive'));
      if(dead===2)assert.deepEqual(s.boss.castleSelectedDaughterIds,['daniela']);
    }
  }
});
test('reload, leitura e undo não rerrolam seleção/objetivo nem seed',()=>{
  const s=game();normalizeBossState(s);startDimitrescuRound(s);const snapshot=createUndoTransaction(s),before=JSON.stringify(s.boss);
  for(let i=0;i<5;i++) {normalizeBossState(s);startDimitrescuRound(s);getBossDimitrescuPriorities(s,0);s.boss.combatEntities.forEach(d=>daughterPassiveChips(d,s));}
  assert.equal(JSON.stringify(s.boss),before);
  const reload=JSON.parse(JSON.stringify(s));normalizeBossState(reload);startDimitrescuRound(reload);assert.equal(JSON.stringify(reload.boss),before);
  s.boss.roundNumber++;startDimitrescuRound(s);
  const restored=restoreUndoTransaction(snapshot).state;normalizeBossState(restored);startDimitrescuRound(restored);assert.equal(JSON.stringify(restored.boss),before);
});
test('regeneração e itens continuam nas filhas não selecionadas; Relíquia espera oportunidade real',()=>{
  const s=game();startDimitrescuRound(s);
  const other=s.boss.combatEntities.find(d=>!d.passive);other.hp=300;
  s.boss.castleItems={relic:{type:'relic',consumed:false}};s.players[0].hand.push(card('relic'));
  useCastleItem(s,0,'relic',other.id);assert.equal(other.relicRound,2);
  regenerateDaughters(s,()=>{},()=>{});assert.equal(other.hp,350);
  // Make the other live daughter the previous pick, so relic recipient is the only alternative.
  for(const d of s.boss.combatEntities)if(d.id!==other.id&&d.id!==s.boss.castleLastDaughterId)kill(s,d.id);
  s.boss.roundNumber=2;startDimitrescuRound(s);assert.equal(other.passive.status,'suppressed');
  regenerateDaughters(s,()=>{},()=>{});assert.equal(other.relicRound,null);
});
test('As Três Filhas ativa apenas vivas e resolve passivas padrão +3 sem cobrança/duplicação extra',()=>{
  const s=game();s.boss.phase=2;force(s,'three_daughters');
  assert.deepEqual(s.boss.castleSelectedDaughterIds,['bela','cassandra','daniela']);
  assert.equal(s.boss.combatEntities.filter(d=>d.passive.status==='active').length,3);
  const ids=JSON.stringify(s.boss.combatEntities.map(d=>d.passive));startDimitrescuRound(s);normalizeBossState(s);assert.equal(JSON.stringify(s.boss.combatEntities.map(d=>d.passive)),ids);
  notifyBossDiscardTaken(s,0,[card('taken')]);assert.equal(s.boss.danger,3);notifyBossDiscardTaken(s,1,[card('taken2')]);assert.equal(s.boss.danger,3);
  completeBossPlayerTurn(s,0);completeBossPlayerTurn(s,1);assert.equal(s.boss.danger,9);
  const t=game();kill(t,'bela');t.boss.phase=3;force(t,'three_daughters');assert.deepEqual(t.boss.castleSelectedDaughterIds,['cassandra','daniela']);
  assert.equal(daughter(t,'bela').passive,null);
  completeBossPlayerTurn(t,0);completeBossPlayerTurn(t,1);assert.equal(t.boss.danger,3,'only Cassandra fails; Fury never scales daughters');
});
test('As Três Filhas sem candidato não inventa obrigações; só Daniela participa',()=>{
  const s=game();s.players.forEach(p=>p.hand=[card(`only${p.id}`)]);s.teams[0].melds=[];s.boss.phase=2;force(s,'three_daughters');
  assert.equal(daughter(s,'bela').passive.status,'idle');assert.equal(daughter(s,'cassandra').passive.status,'idle');
  assert.deepEqual(daughterPassiveChips(daughter(s,'bela'),s),['CAÇADA']);assert.deepEqual(daughterPassiveChips(daughter(s,'cassandra'),s),['BANQUETE']);
  completeBossPlayerTurn(s,0);completeBossPlayerTurn(s,1);assert.equal(s.boss.danger,0);
});
function play(s,playerId,cards) {
  s.teams[0].melds.push(cards);const index=s.teams[0].melds.length-1;
  return applyBossMeldTransition(s,{teamId:0,playerId,meldIndex:index,cardsAdded:cards,isNewMeld:true});
}
for(const [label,wild] of [['Joker',card('wild','JOKER','', {joker:true})],['2 coringa',card('wild','2','♥',{forceWild:true})],['2 natural',card('wild','2','♠',{forceNatural:true})]]) {
  test(`Sangue Impuro: ${label}, humano/BOT, uso canônico e limite por jogador`,()=>{
    const s=game();force(s,'impure_blood');const expected=wild.forceNatural?0:3;
    for(const playerId of [0,1])for(let n=0;n<2;n++) {
      const w={...wild,id:`wild-${playerId}-${n}`};
      play(s,playerId,[w,card(`a-${playerId}-${n}`,'3','♠'),card(`b-${playerId}-${n}`,'4','♠')]);
      assert.equal(s.boss.danger,expected*(playerId+1));
    }
    assert.equal(s.boss.currentIntent.payload.triggeredPlayerIds.length,expected?2:0);
    const reload=JSON.parse(JSON.stringify(s));normalizeBossState(reload);
    play(reload,0,[{...wild,id:'again'},card('x','3','♠'),card('y','4','♠')]);assert.equal(reload.boss.danger,s.boss.danger);
  });
}
test('Sangue Impuro respeita papel real do 2 sem flags, não posição visual, e não cobra no fim',()=>{
  const s=game();force(s,'impure_blood');
  play(s,0,[card('a','4','♠'),card('natural','2','♠'),card('b','3','♠')]);assert.equal(s.boss.danger,0);
  play(s,1,[card('gap','2','♠'),card('low','5','♠'),card('high','7','♠')]);assert.equal(s.boss.danger,3);
  completeBossPlayerTurn(s,0);completeBossPlayerTurn(s,1);assert.equal(s.boss.danger,3);
});
test('Sangue Impuro não ativa por descarte/item, sequência inválida ou reorganização sem cartas novas',()=>{
  const s=game();force(s,'impure_blood');notifyBossDiscardTaken(s,0,[card('w','JOKER','',{joker:true})]);assert.equal(s.boss.currentIntent.payload.triggeredPlayerIds.length,0);
  play(s,0,[card('bad','2','♥'),card('x','3','♠'),card('y','8','♣')]);assert.equal(s.boss.currentIntent.payload.triggeredPlayerIds.length,0);
  applyBossMeldTransition(s,{teamId:0,playerId:0,meldIndex:0,cardsAdded:[]});assert.equal(s.boss.currentIntent.payload.triggeredPlayerIds.length,0);
});
test('Sangue Impuro máximo +6 inclusive com Fúria; pool novo sem restaurar habilidades antigas',()=>{
  const s=game();s.boss.hp=1500;['bela','cassandra','daniela'].forEach(id=>kill(s,id));s.boss.phase=3;force(s,'impure_blood');
  for(const id of [0,1])play(s,id,[card(`w${id}`,'JOKER','',{joker:true}),card(`x${id}`,'3','♠'),card(`y${id}`,'4','♠')]);
  assert.equal(s.boss.danger,6);assert.equal(s.boss.maxHp,2000);
  for(const id of ['impure_blood','three_daughters'])assert.equal(dimitrescuDefinition.abilities.find(a=>a.id===id).weight,3);
  for(const id of ['bela_hunt','cassandra_feast','daniela_swarm'])assert.equal(dimitrescuDefinition.abilities.some(a=>a.id===id),false);
});
