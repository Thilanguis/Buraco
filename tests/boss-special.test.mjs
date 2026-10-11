import test from 'node:test';
import assert from 'node:assert/strict';
import { createBossState, applyBossMeldTransition, activateBossSpecial, normalizeBossState,
  distributeCastleItems, notifyBossPurchaseCompleted, isBossCardBlocked, applyBossFinalStrike, getBossSpecialUseStatus } from '../js/boss/boss-engine.js';
import { listBossDefinitions } from '../js/boss/boss-registry.js';
import { creditBossSpecial, normalizeBossSpecial, bossSpecialView } from '../js/boss/boss-special.js';
import { saveBossSpecialTransaction, sameBossRevision, bossStateRevision } from '../js/game/boss-state-transaction.js';
import { createUndoTransaction, restoreUndoTransaction } from '../js/game/undo-transaction.js';
import { createDeck } from '../js/deck.js';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { presentCooperativeSpecial } from '../js/boss/ui/cooperative-special-ui.js';

function game(id='nemesis', count=21) {
  const def = listBossDefinitions().find(d => d.id === id), deck = createDeck(['♠','♥','♦','♣'], ['A','2','3','4','5','6','7','8','9','10','J','Q','K']);
  return { mode: def.mode, matchStartedAt: 12, currentPlayer: 0, turnNumber: 1, hasDrawnThisTurn: false,
    boss: createBossState(id, 9), players: [0,1].map(i => ({ id: i, name: `Humano ${i}`, teamId: 0, isBot: false, hand: deck.splice(0,11) })),
    teams: [{id:0,melds:[]},{id:1,melds:[]}], deadPiles:[deck.splice(0,11),deck.splice(0,11)],
    deadChunksTaken:[0,0], deadChunksMax:[2,0], discard:deck.splice(0,count), stock:deck, reserve:[] };
}
const request=(recipientId=0,actionId='special:1',actorId=0)=>({recipientId,actionId,actorId});
const allCards=s=>[...s.players.flatMap(p=>p.hand),...s.teams.flatMap(t=>t.melds.flat()),...s.stock,...s.discard,...s.deadPiles.flat(),...s.reserve];

test('25/50/100 por jogo físico; evoluções, render, reorder, reload e downgrade não duplicam',()=>{
  const s=game(); const b=s.boss;
  for(const [id,kind,n] of [['a','limpa',25],['b','real',50],['c','asas',100]]) {
    assert.equal(creditBossSpecial(b,id,kind),n);
    assert.equal(creditBossSpecial(b,id,kind),0);
  }
  assert.equal(b.cooperativeSpecial.points,175);
  assert.equal(creditBossSpecial(b,'a','real'),25);
  assert.equal(creditBossSpecial(b,'a','asas'),50);
  assert.equal(creditBossSpecial(b,'a','limpa'),0);
  assert.equal(creditBossSpecial(b,'b','asas'),50);
  assert.equal(b.cooperativeSpecial.points,300);
  const loaded=JSON.parse(JSON.stringify(s)); normalizeBossState(loaded); normalizeBossState(loaded);
  assert.deepEqual(loaded.boss.cooperativeSpecial,b.cooperativeSpecial);
});

test('transição real compartilhada usa ID canônico mesmo depois de reorganizar os jogos',()=>{
  const s=game('banker');
  const meld=Array.from({length:7},(_,i)=>({id:`meld:${i}`,rank:String(i+3),suit:'♣'}));
  s.teams[0].melds=[meld];
  applyBossMeldTransition(s,{teamId:0,playerId:0,meldIndex:0,oldKind:'simple',newKind:'limpa',cardsAdded:meld,isNewMeld:true});
  const points=s.boss.cooperativeSpecial.points;
  s.teams[0].melds.unshift([{id:'other',rank:'A',suit:'♥'}]);
  applyBossMeldTransition(s,{teamId:0,playerId:1,meldIndex:1,oldKind:'limpa',newKind:'real',cardsAdded:[]});
  assert.equal(s.boss.cooperativeSpecial.points,points+25);
  applyBossMeldTransition(s,{teamId:0,playerId:0,meldIndex:1,oldKind:'real',newKind:'real',cardsAdded:[]});
  assert.equal(s.boss.cooperativeSpecial.points,50);
  assert.equal(Object.keys(s.boss.cooperativeSpecial.ledger).length,1);
});

test('save anterior recebe categorias históricas uma vez, sem duplicar aliases',()=>{
  const b=createBossState('banker');delete b.cooperativeSpecial;
  b.meldProgress={ '0:0':{highestKind:'real'}, meld_0_1:{highestKind:'real'} };
  b.meldIdsByPosition={'0:0':'meld_0_1'};
  assert.equal(normalizeBossSpecial(b).points,50);
  assert.equal(normalizeBossSpecial(b).points,50);
  assert.equal(creditBossSpecial(b,'meld_0_1','asas'),50);
});

for(const def of listBossDefinitions()) test(`${def.id}: 125/200+, várias ativações, dois destinatários e conservação dos 108 IDs`,()=>{
  const s=game(def.id);s.boss.cooperativeSpecial.points=325;
  const before=allCards(s).map(c=>c.id).sort(),stock=s.stock.map(c=>c.id),top=[...s.discard].reverse().slice(0,5).map(c=>c.id);
  const snapshot=createUndoTransaction(s);
  const a=activateBossSpecial(s,request(1));
  assert.equal(a.count,5);assert.deepEqual(a.cards.map(c=>c.id),top);
  assert.equal(s.hasDrawnThisTurn,false);assert.deepEqual(s.deadChunksTaken,[0,0]);
  assert.equal(s.boss.cooperativeSpecial.points,225);
  assert.equal(activateBossSpecial(s,request(1)),null);
  assert.equal(activateBossSpecial(s,request(0,'special:2',1)).count,5);
  assert.equal(s.boss.cooperativeSpecial.points,125);
  assert.equal(activateBossSpecial(s,request(1,'special:3')).count,5);
  assert.deepEqual(bossSpecialView(s.boss),{points:25,charges:0,progress:25});
  assert.equal(s.boss.cooperativeSpecial.activations,3);
  assert.deepEqual(allCards(s).map(c=>c.id).sort(),before);
  const undo=restoreUndoTransaction(snapshot).state;
  assert.equal(undo.boss.cooperativeSpecial.points,325);assert.deepEqual(undo.stock.map(c=>c.id),stock);
  assert.deepEqual(s.stock.map(c=>c.id),stock);assert.equal(s.discard.length,6);
  assert.deepEqual(allCards(undo).map(c=>c.id).sort(),before);
  const loaded=JSON.parse(JSON.stringify(s));normalizeBossState(loaded);
  assert.deepEqual(loaded.boss.cooperativeSpecial,s.boss.cooperativeSpecial);
  const finalBefore=structuredClone(s);applyBossFinalStrike(s);applyBossFinalStrike(finalBefore);
  assert.deepEqual(s.boss.result,finalBefore.boss.result);
});

for(const count of [4,1,0]) test(`Lixo com ${count}: não ativa, não consome carga nem toca no Monte/Mortos`,()=>{
  const s=game('dimitrescu',count);s.boss.cooperativeSpecial.points=100;
  const before=JSON.stringify(s.deadPiles),a=activateBossSpecial(s,request());
  assert.equal(a,null);assert.equal(s.boss.cooperativeSpecial.points,100);
  assert.equal(JSON.stringify(s.deadPiles),before);assert.equal(s.discard.length,count);assert.equal(s.stock.length,64-count);
});

test('BOT não pode gastar, humano pode beneficiar BOT, compras normais e bloqueios continuam separados',()=>{
  const s=game();s.boss.cooperativeSpecial.points=200;s.players[1].isBot=true;
  assert.equal(activateBossSpecial(s,request(0,'bot',1)),null);
  const z=s.boss.combatEntities.find(e=>e.id==='grabber');z.status='persistent';z.hp=z.maxHp;
  assert.equal(activateBossSpecial(s,request(1)).count,5);
  assert.deepEqual(s.boss.grabbedTurnIds,[]);
  s.hasDrawnThisTurn=true;notifyBossPurchaseCompleted(s,0);
  const grabbed=structuredClone(s.boss.grabbedByPlayer),turnIds=[...s.boss.grabbedTurnIds];
  assert.equal(activateBossSpecial(s,request(0,'after-normal')).count,5);
  assert.deepEqual(s.boss.grabbedByPlayer,grabbed);assert.deepEqual(s.boss.grabbedTurnIds,turnIds);
  for(const c of grabbed[0]?.cardIds || [])assert.equal(isBossCardBlocked(s,0,c,'play'),true);
});

test('cartas do castelo continuam com item físico e saldo de mortos não muda',()=>{
  const s=game('dimitrescu');distributeCastleItems(s.boss,allCards(s));
  const item=allCards(s).find(c=>c.castleItem);const at=s.stock.findIndex(c=>c.id===item.id);
  if(at>=0)s.stock.splice(at,1);else {for(const p of s.players)p.hand=p.hand.filter(c=>c.id!==item.id);s.reserve=s.reserve.filter(c=>c.id!==item.id);for(const pile of s.deadPiles){const i=pile.indexOf(item);if(i>=0)pile.splice(i,1);}s.discard=s.discard.filter(c=>c.id!==item.id);}
  s.discard.push(item);s.boss.cooperativeSpecial.points=100;
  const a=activateBossSpecial(s,request());assert.deepEqual(a.cards[0].castleItem,item.castleItem);
  assert.equal(allCards(s).length,108);assert.equal(new Set(allCards(s).map(c=>c.id)).size,108);
});

test('normal Buraco, pausa, fim e fase de ação do chefe não permitem Especial',()=>{
  for(const change of [s=>s.mode='1x1',s=>s.finished=true,s=>s.pause={paused:true},s=>s.surrender={active:true},s=>s.boss.pendingChoices=[{playerId:0}],s=>s.boss.bossFlow={stage:'ability',endsAt:999}]) {
    const s=game();s.boss.cooperativeSpecial.points=100;change(s);
    assert.equal(activateBossSpecial(s,request()),null);assert.equal(s.stock.length,43);
  }
});

// Optimistic transaction retry double, not a claim of Firebase homologation.
function store(initial) {
  let json=JSON.stringify(initial),revision=0;
  return { read:()=>JSON.parse(json), async runTransaction(_db,callback) {
    for(let attempt=0;attempt<10;attempt++) {
      const readRevision=revision,readJson=json;let write;
      const tx={get:async()=>({exists:()=>true,data:()=>({stateJson:readJson})}),update:(_ref,value)=>{write=value.stateJson;}};
      const result=await callback(tx);
      if(readRevision!==revision)continue;
      if(write){json=write;revision++;}return result;
    }throw Error('retry exhausted');
  }};
}
test('duas solicitações simultâneas com 200: só uma é aceita; retry/dedup e writer antigo não duplicam',async()=>{
  const s=game();s.boss.cooperativeSpecial.points=200;const database=store(s);
  const save=r=>saveBossSpecialTransaction({runTransaction:database.runTransaction,db:null,gameRef:null,expectedState:s,request:r,activate:activateBossSpecial});
  const results=await Promise.all([save(request(0,'a')),save(request(1,'b',1))]);
  assert.equal(results.filter(r=>r.accepted).length,1);
  const latest=database.read();assert.equal(latest.boss.cooperativeSpecial.points,100);assert.equal(latest.discard.length,16);assert.equal(latest.stock.length,43);
  assert.equal(sameBossRevision(latest,s),false);assert.equal((await save(request(0,'a'))).accepted,false);
  const next=await saveBossSpecialTransaction({runTransaction:database.runTransaction,expectedState:latest,request:request(1,'next'),activate:activateBossSpecial});
  assert.equal(next.accepted,true);assert.equal(database.read().boss.cooperativeSpecial.points,0);
  const restored=structuredClone(s);restored.bossStateRevision=bossStateRevision(database.read());
  assert.equal(sameBossRevision(database.read(),restored),true);
  restored.bossStateRevision++;assert.equal(sameBossRevision(restored,latest),false);
});

test('100/125/200, evolução direta Limpa→Ás e Ataque Final preservam o contrato',()=>{
  for(const points of [100,125,200]) {
    const s=game();s.boss.cooperativeSpecial.points=points;
    assert.equal(activateBossSpecial(s,request()).count,5);
    assert.equal(s.boss.cooperativeSpecial.points,points-100);
    applyBossFinalStrike(s);const remaining=s.boss.cooperativeSpecial.points;
    assert.equal(activateBossSpecial(s,request(0,'after-final')),null);
    assert.equal(s.boss.cooperativeSpecial.points,remaining);
  }
  const s=game();creditBossSpecial(s.boss,'physical','limpa');
  assert.equal(creditBossSpecial(s.boss,'physical','asas'),75);
});

test('commitState real rejeita writer antigo mesmo quando SDK repete callback após outro commit',async()=>{
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const code=app.slice(app.indexOf('async function commitState()'),app.indexOf('window.bossSpecialOperationPending = false;'));
  const initial=game();initial.boss.cooperativeSpecial.points=200;
  let persisted=structuredClone(initial),writes=0;
  const ctx={state:structuredClone(initial),window:{gameSessionId:1},Date,JSON,structuredClone,
    pendingCommit:false,committing:false,localUndoStack:[{}],db:null,gameRef:null,
    isBossMode:s=>s.mode.startsWith('boss_'),bossStateRevision,sameBossRevision,
    pauseBlocksPlay:()=>false,recycleDeadToStockIfPossible:async()=>{},renderAll(){},console,
    prepareMatchHistory:async()=>()=>{},runTransaction:async(_db,callback)=>{
      const snapshot=()=>({exists:()=>true,data:()=>({stateJson:JSON.stringify(persisted)})});
      await callback({get:async()=>snapshot(),update:()=>{}}); // SDK discards first write.
      activateBossSpecial(persisted,request());persisted.bossStateRevision=1;
      return callback({get:async()=>snapshot(),update:(_ref,data)=>{writes++;persisted=JSON.parse(data.stateJson);}});
    }};
  vm.createContext(ctx);vm.runInContext(code,ctx);await ctx.commitState();
  assert.equal(writes,0);assert.equal(persisted.discard.length,16);assert.equal(persisted.stock.length,43);
  assert.equal(ctx.state.boss.cooperativeSpecial.points,100);assert.equal(ctx.localUndoStack.length,0);
});

test('animatic limitado a cinco nós; término/cancelamento não deixa nós e reduced motion não cria nada',async()=>{
  const nodes=new Set();let peak=0,created=0,cancel=false;
  const document={body:{append:node=>{nodes.add(node);peak=Math.max(peak,nodes.size);}},createElement:()=>{
    created++;const node={style:{},setAttribute(){},remove(){nodes.delete(node);},animate:()=>({finished:cancel?Promise.reject(Error('cancelled')):Promise.resolve()})};return node;
  }};
  const rect={left:0,top:0,width:30,height:50};
  for(let i=0;i<60;i++){cancel=i%2===0;await presentCooperativeSpecial({document,from:rect,to:rect,count:20,bossId:'nemesis'});assert.equal(nodes.size,0);}
  assert.equal(peak,5);assert.equal(created,300);
  await presentCooperativeSpecial({document,from:rect,to:rect,count:5,reducedMotion:true});assert.equal(created,300);
});

test('Lixo com 5 permite compra mesmo com Monte vazio; topo físico e nenhum uso obrigatório novo',()=>{
  const s=game('nemesis',5);s.reserve.push(...s.stock.splice(0));s.boss.cooperativeSpecial.points=100;
  const top=s.discard.at(-1),a=activateBossSpecial(s,request(1));
  assert.equal(a.count,5);assert.equal(a.cards[0].id,top.id);assert.equal(s.discard.length,0);
  assert.equal(s.stock.length,0);assert.equal(s.hasDrawnThisTurn,false);assert.equal(s.pickedDiscardCardId,undefined);
  assert.equal(allCards(s).length,108);assert.equal(new Set(allCards(s).map(c=>c.id)).size,108);
});

test('bloqueios da Lady, Banqueiro, Hawk e jogadores dominados impedem resgate sem gasto',()=>{
  for(const id of ['dimitrescu','banker','nehelenia','dominadora']) {
    const s=game(id);s.boss.cooperativeSpecial.points=100;
    if(id==='dimitrescu')s.boss.currentIntent={abilityId:'castle_lockdown',payload:{}};
    if(id==='banker')s.boss.currentIntent={abilityId:'credit_block',payload:{}};
    if(id==='nehelenia')s.boss.effects.push({id:'nehelenia_hawk_guarded_discard',cardId:s.discard.at(-1).id});
    if(id==='dominadora')s.boss.chainsByPlayer[1]=4;
    assert.equal(getBossSpecialUseStatus(s,request(1)).allowed,false,id);
    const before=JSON.stringify(s.discard);assert.equal(activateBossSpecial(s,request(1)),null,id);
    assert.equal(s.boss.cooperativeSpecial.points,100);assert.equal(JSON.stringify(s.discard),before);
  }
});

test('Daniela reage uma vez ao Especial; destinatário, efeitos, undo e retry mantêm a identidade',()=>{
  const s=game('dimitrescu');s.boss.cooperativeSpecial.points=200;
  const daughter=s.boss.combatEntities.find(d=>d.id==='daniela');
  daughter.passive={round:s.boss.roundNumber,status:'active'};
  const before=s.boss.danger,undo=createUndoTransaction(s);
  const a=activateBossSpecial(s,request(1));assert.equal(s.boss.danger,before+3);
  assert.equal(a.bossEvents.length,1);assert.equal(activateBossSpecial(s,request(1)),null);
  activateBossSpecial(s,request(0,'next'));assert.equal(s.boss.danger,before+3);
  const restored=restoreUndoTransaction(undo).state;assert.equal(restored.boss.danger,before);
  assert.equal(restored.boss.combatEntities.find(d=>d.id==='daniela').passive.status,'active');
});

test('Pólen enterrado nas cinco cartas reage; Espelho registra as cartas e Ágio só cobra uma vez',()=>{
  const nature=game('matriarca_esmeralda');nature.boss.cooperativeSpecial.points=100;
  const contaminated=nature.discard.at(-3).id;
  nature.boss.natureThreats=[{id:'pollen-special',type:'pollen',status:'active',discardCardId:contaminated,bloomAmount:1,createdRound:nature.boss.roundNumber}];
  const a=activateBossSpecial(nature,request(1));assert.equal(a.count,5);
  assert.equal(nature.boss.natureThreats.find(t=>t.id==='pollen-special').triggeredByPlayerId,1);
  assert.equal(a.bossEvents.length,1);
  const mirror=game('nehelenia');mirror.boss.cooperativeSpecial.points=100;
  mirror.boss.currentIntent={id:'mirror',abilityId:'discard_mirror',payload:{triggered:false}};
  const b=activateBossSpecial(mirror,request(1));assert.equal(mirror.boss.currentIntent.payload.triggered,true);
  assert.deepEqual(mirror.boss.currentIntent.payload.takenCardIds,b.cards.map(c=>c.id));
  const banker=game('banker');banker.boss.cooperativeSpecial.points=200;
  banker.boss.discardSurcharge={status:'active',createdRound:banker.boss.roundNumber,amount:7};
  const danger=banker.boss.danger;activateBossSpecial(banker,request(1));activateBossSpecial(banker,request(0,'next'));
  assert.equal(banker.boss.danger,danger+7);assert.equal(banker.boss.discardSurcharge.consumedByPlayerId,1);
});

test('derrota causada por reação do Lixo fecha partida e histórico na mesma transação',async()=>{
  const s=game('banker');s.boss.cooperativeSpecial.points=100;s.boss.danger=94;
  s.boss.discardSurcharge={status:'active',createdRound:s.boss.roundNumber,amount:7};
  const database=store(s);let history=0;
  const result=await saveBossSpecialTransaction({runTransaction:database.runTransaction,expectedState:s,request:request(),activate:activateBossSpecial,
    prepareHistory:async(_tx,latest)=>{assert.equal(latest.finished,true);return()=>history++;}});
  assert.equal(result.accepted,true);assert.equal(result.state.finished,true);assert.equal(history,1);
  assert.equal(database.read().winnerTeamId,1);assert.equal(database.read().discard.length,16);
});
