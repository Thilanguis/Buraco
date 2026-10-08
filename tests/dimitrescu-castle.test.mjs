import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createDeck, dealInitialDeck } from '../js/deck.js';
import { createBossState, distributeCastleItems, normalizeBossState, startDimitrescuRound, completeBossPlayerTurn,
  applyBossMeldTransition, applyBossFinalStrike, notifyBossDiscardTaken, canUseCastleItem, useCastleItem,
  getCastleBotItem, getBossDimitrescuPriorities, selectNextBossIntent, applyBossDeadTaken } from '../js/boss/boss-engine.js';
import { buildBossDebugScenario } from '../js/boss/boss-debug-scenarios.js';
import { bloodLinkRemaining, furyLevel, furyBlood, furyHealing, damageDaughter, regenerateDaughters, ITEM_DEFINITIONS } from '../js/boss/dimitrescu-castle.js';
import { dimitrescuDefinition } from '../js/boss/bosses/dimitrescu.js';
import { cardFrontHTML } from '../js/game/card-face.js';
import { createUndoTransaction, restoreUndoTransaction } from '../js/game/undo-transaction.js';
import { daughterPassiveChips, daughterPassiveHelp, castleItemInventory, castleItemHelp } from '../js/boss/ui/dimitrescu-castle-view.js';

test('ajuda dos cinco itens prioriza efeito e petrificação, sem burocracia de uso',()=>{
  const effects={dagger:/50 de dano imediato/,explosive:/100 de dano imediato/,cold_flask:/próxima regeneração/,
    anticoagulant:/50 para 25.*Não acumula/,relic:/Cancela uma passiva.*a próxima vez que ela agir/};
  for(const [type,effect] of Object.entries(effects)) {
    const help=castleItemHelp(type);assert.match(help,effect);assert.match(help,/petrifica 100 HP/);
    assert.match(help,/mínimo de 200 HP/);assert.ok(help.length<240);
    assert.doesNotMatch(help,/já foi usado|janela|reutilizável/);
  }
});
const c = (id, rank = 'K', suit = '♥') => ({id, rank, suit, joker:false});
function game() {
  const s = { mode:'boss_dimitrescu', variant:'fechado', currentPlayer:0, turnNumber:1, hasDrawnThisTurn:true,
    stock:Array.from({length:50}, (_, i) => c(`stock${i}`)), discard:[c('top')], deadPiles:[[c('dead')]], deadChunksTaken:[0,0], deadChunksMax:[2,0],
    players:[{id:0, teamId:0, name:'Biel', hand:[c('six','6','♠'), c('nine','9','♠'), c('ten','10','♠'), c('jack','J','♠'), c('spare')]},
      {id:1, teamId:0, name:'Cooperador', hand:[c('q'),c('k'),c('a','A')]}],
    teams:[{id:0, melds:[['3','4','5'].map(r => c(`m${r}`,r,'♠'))]}, {id:1,melds:[]}], boss:createBossState('dimitrescu',1234) };
  s.boss.bossFlow = {stage:'players'}; return s;
}
const daughter = (s,id='bela') => s.boss.combatEntities.find(d=>d.id===id);

test('filhas 450/50; Lady 2000 e proteção 500 por filha intactas',()=>{
  const s=game();
  assert.deepEqual(s.boss.combatEntities.map(d=>[d.hp,d.maxHp,d.regeneration]),[[450,450,50],[450,450,50],[450,450,50]]);
  assert.equal(s.boss.hp,2000);assert.equal(bloodLinkRemaining(s.boss),1500);
});

test('migração das filhas preserva itens, ferimentos, morte e proteção; reload/undo são idempotentes',()=>{
  for(const [oldMax,hp,newMax,newHp] of [[500,500,450,450],[400,280,350,280],[300,290,250,250],[200,0,200,0]]) {
    const s=game(),d=daughter(s);delete s.boss.castleDaughterBalanceVersion;
    s.boss.combatEntities.forEach(x=>{x.maxHp=500;x.hp=420;x.regeneration=60;});
    Object.assign(d,{maxHp:oldMax,hp,regeneration:30,cold:true,relicRound:4,sacrificedCards:[c('attached')]});
    s.boss.hp=1700;s.boss.bloodLinkProtection=0;s.boss.danger=23;
    normalizeBossState(s);
    assert.equal(d.maxHp,newMax);assert.equal(d.hp,newHp);assert.equal(d.regeneration,25);
    assert.equal(d.cold,true);assert.equal(d.relicRound,4);assert.equal(d.sacrificedCards[0].id,'attached');
    assert.equal(d.status,hp?'alive':'dead');assert.equal(daughter(s,'cassandra').regeneration,50);
    assert.equal(s.boss.hp,1700);assert.equal(s.boss.danger,23);assert.equal(bloodLinkRemaining(s.boss),0);
    const transaction=createUndoTransaction(s),snapshot=JSON.stringify(s);
    normalizeBossState(s);assert.equal(JSON.stringify(s),snapshot);
    const reload=JSON.parse(snapshot);normalizeBossState(reload);
    assert.equal(daughter(reload).maxHp,newMax);assert.equal(daughter(reload).hp,newHp);
    assert.equal(bloodLinkRemaining(reload.boss),0);
    const undo=restoreUndoTransaction(transaction).state;normalizeBossState(undo);
    assert.equal(daughter(undo).maxHp,newMax);assert.equal(daughter(undo).hp,newHp);
  }
});
test('inventário visual distingue disponível, usado e anexado sem revelar localização', () => {
  const s=game();s.boss.castleItems={a:{type:'relic',consumed:false},b:{type:'relic',consumed:true},c:{type:'relic',consumed:true}};
  daughter(s).sacrificedCards=[{castleItem:{type:'relic',consumed:true}}];
  const before=JSON.stringify(s);
  assert.deepEqual(castleItemInventory(s.boss,'relic'),{total:3,available:1,used:2,attached:1});
  assert.deepEqual(castleItemInventory(s.boss,'dagger'),{total:0,available:0,used:0,attached:0});
  assert.equal(JSON.stringify(s),before);
  assert.deepEqual(castleItemInventory(JSON.parse(before).boss,'relic'),{total:3,available:1,used:2,attached:1});
});
test('chips compactos das filhas preservam obrigação e ajuda completa', () => {
  const s=game(), bela=daughter(s), cassandra=daughter(s,'cassandra'), daniela=daughter(s,'daniela');
  bela.passive={status:'active',targetPlayerId:0,cardId:'six'};
  assert.deepEqual(daughterPassiveChips(bela,s),['CAÇADA · 6♠']);
  assert.match(daughterPassiveHelp(bela,s),/Biel: jogue 6♠ até o fim do seu turno/);
  cassandra.passive={status:'active',meldIndex:0};
  assert.deepEqual(daughterPassiveChips(cassandra,s),['BANQUETE · JOGO 1']);
  daniela.passive={status:'active'};
  assert.deepEqual(daughterPassiveChips(daniela,s),['LIXO +3']);
  bela.passive.status='suppressed';assert.deepEqual(daughterPassiveChips(bela,s),['CAÇADA']);
  bela.passive.status='success';assert.deepEqual(daughterPassiveChips(bela,s),['CAÇADA']);
  bela.status='dead';assert.deepEqual(daughterPassiveChips(bela,s),[]);
});
for (const [id,label,rule] of [['bela','CAÇADA',/carta que o alvo pode jogar legalmente/],['cassandra','BANQUETE',/contribuição legal.*fim da rodada/],['daniela','LIXO +3',/retirada efetiva.*uma única vez.*Monte não ativa/]]) {
  test(`${label}: identidade sempre visível, ajuda completa e nenhuma mutação de estado`,()=>{
    const s=game(),d=daughter(s,id),before=JSON.stringify(s);
    assert.deepEqual(daughterPassiveChips(d,s),[label]);
    const help=daughterPassiveHelp(d,s);
    assert.match(help,rule);assert.match(help,/\+3 Sede/);assert.match(help,/Não foi escolhida/);
    if(id!=='daniela')assert.match(help,/Sem .*válid[oa], não pune/);
    assert.equal(JSON.stringify(s),before);
    for(const status of ['success','failed','triggered','suppressed','idle']) {
      d.passive={status};const snapshot=JSON.stringify(s);
      assert.deepEqual(daughterPassiveChips(d,s),[label]);assert.match(daughterPassiveHelp(d,s),rule);
      assert.equal(JSON.stringify(s),snapshot);
    }
    d.status='dead';assert.deepEqual(daughterPassiveChips(d,s),[]);
  });
}
function item(s, type, id=`item${type}${s.players[0].hand.length}`) {
  s.boss.castleItems ||= {}; s.boss.castleItems[id] = {type,consumed:false}; s.players[0].hand.push(c(id)); return id;
}
function kill(s,id) { damageDaughter(s,daughter(s,id),1000,`kill${id}`,e=>s.boss.eventLog.push(e)); }
function startAll(s) { s.boss.phase=2; selectNextBossIntent(s,{debug:true,forcedAbilityId:'three_daughters'}); }

test('Lady 2000; três filhas 450; PROT. 500 por filha e Fúria por morte, sem dano automático/overflow', () => {
  const s=game(); assert.equal(s.boss.maxHp,2000);
  for (const [deadCount,id] of [[0,'bela'],[1,'cassandra'],[2,'daniela']]) {
    assert.equal(bloodLinkRemaining(s.boss),1500-deadCount*500); assert.equal(furyLevel(s.boss),deadCount);
    const hp=s.boss.hp; kill(s,id); assert.equal(s.boss.hp,hp);
  }
  assert.equal(bloodLinkRemaining(s.boss),0); assert.equal(furyLevel(s.boss),3);
  assert.equal(s.boss.eventLog.filter(e=>e.sound==='howDareYou').length,3);
  kill(s,'bela'); assert.equal(s.boss.eventLog.filter(e=>e.type==='daughterDeath').length,3);
});
for (const deadCount of [0,1,2,3]) test(`Ataque Final canônico consome PROT. com ${3-deadCount} filhas`,()=>{
  const s=game(); ['bela','cassandra','daniela'].slice(0,deadCount).forEach(id=>kill(s,id));
  s.boss.hp=50; const protection=bloodLinkRemaining(s.boss), e=applyBossFinalStrike(s,99999,0);
  assert.equal(e.damage,100); assert.equal(s.boss.hp,deadCount===3?0:50);
  assert.equal(bloodLinkRemaining(s.boss),Math.max(0,protection-100));
  assert.equal(s.boss.result.victory,deadCount===3);
});
for(const isBot of [false,true]) for(const protection of [180,40,0]) test(`Ataque Final ${isBot?'BOT':'humano'}: Coágulo, PROT. ${protection} e excesso`,()=>{
  const s=game();s.players[0].isBot=isBot;s.boss.combatTargetsByPlayer[0]='boss';
  s.boss.hp=50;s.boss.bloodLinkProtection=protection;s.boss.crimsonClot={status:'active',max:20,remaining:20};
  const e=applyBossFinalStrike(s,99999,0);
  assert.equal(e.bloodClotAbsorbed,20);assert.equal(e.bloodLinkAbsorbed,Math.min(80,protection));
  assert.equal(s.boss.hp,Math.max(0,50-Math.max(0,80-protection)));
  assert.equal(s.boss.result.victory,protection===0);assert.equal(s.boss.bloodLinkProtection,Math.max(0,protection-80));
});
test('repetição de meld/snapshot não reaplica dano ao Vínculo',()=>{
  const s=game(),transition={teamId:0,playerId:0,meldIndex:0,oldKind:'simple',newKind:'suja',cardsAdded:[]};
  applyBossMeldTransition(s,transition);const remaining=s.boss.bloodLinkProtection;
  const loaded=JSON.parse(JSON.stringify(s));normalizeBossState(loaded);
  applyBossMeldTransition(loaded,transition);assert.equal(loaded.boss.bloodLinkProtection,remaining);
});
test('Coágulo absorve antes do Vínculo; dano à filha não toca Coágulo/Lady',()=>{
  const s=game(); s.boss.hp=1550; s.boss.crimsonClot={status:'active',remaining:60,max:60};
  const e=applyBossMeldTransition(s,{teamId:0, playerId:0, meldIndex:0,oldKind:'simple',newKind:'limpa',cardsAdded:[]});
  assert.equal(s.boss.hp,1550); assert.equal(e.bloodClotAbsorbed,60);
  assert.equal(s.boss.bloodLinkProtection,1500-e.bloodLinkAbsorbed);assert.ok(e.bloodLinkAbsorbed>0);
  const t=game(); t.boss.combatTargetsByPlayer[0]='bela'; t.boss.crimsonClot={status:'active',remaining:180,max:180};
  const d=applyBossMeldTransition(t,{teamId:0,playerId:0,meldIndex:0,oldKind:'simple',newKind:'suja',cardsAdded:[]});
  assert.equal(d.targetId,'bela'); assert.equal(t.boss.hp,2000); assert.equal(t.boss.crimsonClot.remaining,180);
});
test('15 IDs físicos, três por item, Joker incluível, uma associação persistente e independente da ordem',()=>{
  const deck=createDeck(['♠','♥','♦','♣'],['A','2','3','4','5','6','7','8','9','10','J','Q','K']);
  const a=createBossState('dimitrescu',81), b=createBossState('dimitrescu',81);
  assert.equal(distributeCastleItems(a,deck),true); distributeCastleItems(b,[...deck].reverse());
  assert.deepEqual(a.castleItems,b.castleItems); assert.equal(Object.keys(a.castleItems).length,15);
  for(const type of Object.keys(ITEM_DEFINITIONS)) assert.equal(Object.values(a.castleItems).filter(i=>i.type===type).length,3);
  const before=JSON.stringify(a.castleItems); assert.equal(distributeCastleItems(a,deck),false); assert.equal(JSON.stringify(a.castleItems),before);
  const chosen=new Set(); let jokerChosen=false;
  for(let seed=1;seed<=50;seed++) { const boss=createBossState('dimitrescu',seed); distributeCastleItems(boss,deck); for(const id of Object.keys(boss.castleItems)) chosen.add(id); jokerChosen ||= deck.some(c=>c.joker&&boss.castleItems[c.id]); }
  assert.ok(jokerChosen); assert.ok(chosen.size>90,'no initial-hand/rank/deck restriction');
  for(const def of Object.values(ITEM_DEFINITIONS)) assert.ok(fs.existsSync(new URL(`../${def.image}`,import.meta.url)));
});
test('save/reload/reconnect/undo preservam IDs, consumo, carta real e estados sem reaplicar',()=>{
  const s=game(), id=item(s,'dagger'); const snapshot=createUndoTransaction(s);
  assert.ok(useCastleItem(s,0,id,'bela')); const serialized=JSON.stringify(s);
  const reload=JSON.parse(serialized); normalizeBossState(reload); normalizeBossState(reload);
  assert.equal(daughter(reload).hp,300); assert.equal(useCastleItem(reload,0,id,'bela'),null);
  assert.equal(daughter(reload).sacrificedCards.length,1);
  const undo=restoreUndoTransaction(snapshot).state; normalizeBossState(undo);
  assert.equal(undo.boss.castleItems[id].consumed,false); assert.ok(undo.players[0].hand.some(c=>c.id===id));
  assert.equal(daughter(undo).hp,450); assert.ok(useCastleItem(undo,0,id,'bela'));
});

test('associação acompanha deal real, Morto, Lixo e meld sem mudar o sorteio físico',()=>{
  const s=game(), deck=createDeck(['♠','♥','♦','♣'],['A','2','3','4','5','6','7','8','9','10','J','Q','K']);
  distributeCastleItems(s.boss,deck);const before=JSON.stringify(s.boss.castleItems);
  const deal=dealInitialDeck([...deck].reverse(),2,11,11);
  s.stock=deal.stock;s.discard=deal.discard;s.deadPiles=deal.deadPiles;s.players.forEach((p,i)=>p.hand=deal.hands[i]);s.teams[0].melds=[];
  const id=Object.keys(s.boss.castleItems)[0], card=deck.find(c=>c.id===id);
  for(const zone of [s.stock,s.discard,...s.deadPiles,...s.players.map(p=>p.hand)]) {const i=zone.findIndex(c=>c.id===id);if(i>=0)zone.splice(i,1);}
  s.deadPiles[0].push(card);normalizeBossState(s);assert.deepEqual(card.castleItem,s.boss.castleItems[id]);
  s.players[0].hand.push(s.deadPiles[0].pop());s.discard.push(s.players[0].hand.pop());s.teams[0].melds.push([s.discard.pop()]);
  const reload=JSON.parse(JSON.stringify(s));normalizeBossState(reload);
  assert.deepEqual(reload.teams[0].melds[0][0].castleItem,reload.boss.castleItems[id]);assert.equal(JSON.stringify(reload.boss.castleItems),before);
  const physical=[...reload.stock,...reload.discard,...reload.deadPiles.flat(),...reload.players.flatMap(p=>p.hand),...reload.teams[0].melds.flat()];
  assert.equal(physical.length,108);assert.equal(new Set(physical.map(c=>c.id)).size,108);assert.equal(physical.filter(c=>c.castleItem).length,15);
});
test('sacrificar não é jogo/descarte/batida: mantém turno, deixa descarte e protege topo obrigatório',()=>{
  const s=game(), id=item(s,'explosive'), turn=s.turnNumber, draw=s.hasDrawnThisTurn;
  s.pickedDiscardCardId=id; assert.equal(canUseCastleItem(s,0,id,'bela'),false); delete s.pickedDiscardCardId;
  assert.ok(useCastleItem(s,0,id,'bela')); assert.equal(s.turnNumber,turn); assert.equal(s.hasDrawnThisTurn,draw);
  assert.equal(s.boss.playersActedThisRound.length,0); assert.equal(daughter(s).hp,250);
  const last=item(s,'dagger'); s.players[0].hand=s.players[0].hand.filter(c=>c.id===last);
  assert.equal(canUseCastleItem(s,0,last,'bela'),false);
});
test('piso máximo 200; efeito especial continua no piso; morte devolve cartas reais ao FUNDO sem item',()=>{
  const s=game(), ids=[]; for(let i=0;i<4;i++) { const id=item(s,i===3?'explosive':'cold_flask',`sacr${i}`); ids.push(id); assert.ok(useCastleItem(s,0,id,'bela')); assert.equal(daughter(s).maxHp,[350,250,200,200][i]); }
  assert.equal(daughter(s).maxHp,200); assert.equal(daughter(s).hp,100);
  const last=item(s,'explosive'); assert.ok(useCastleItem(s,0,last,'bela'));
  assert.equal(daughter(s).status,'dead'); assert.equal(s.discard.at(-1).id,'top');
  assert.deepEqual(s.discard.slice(0,-1).map(c=>c.id),[...ids,last]);
  for(const c of s.discard.slice(0,-1)) assert.equal(c.castleItem.consumed,true);
  assert.equal(daughter(s).sacrificedCards.length,0); assert.equal(useCastleItem(s,0,item(s,'dagger'),'bela'),null);
});
test('Frio bloqueia uma regen; Anticoagulante 50→25 não acumula; regen de filha não cura Lady',()=>{
  const s=game(); useCastleItem(s,0,item(s,'anticoagulant'),'bela'); useCastleItem(s,0,item(s,'anticoagulant'),'bela');
  assert.equal(daughter(s).regeneration,25); daughter(s).hp=100; s.boss.hp=1600;
  useCastleItem(s,0,item(s,'cold_flask'),'bela');
  regenerateDaughters(s,()=>{},()=>{}); assert.equal(daughter(s).hp,100); assert.equal(daughter(s).cold,false);
  regenerateDaughters(s,()=>{},()=>{}); assert.equal(daughter(s).hp,100);
  s.boss.roundNumber++; regenerateDaughters(s,()=>{},()=>{}); assert.equal(daughter(s).hp,125); assert.equal(s.boss.hp,1600);
});
test('Bela escolhe carta jogável, prazo só do alvo; sucesso evita punição, morte cancela',()=>{
  const s=game(); startAll(s); const p=daughter(s).passive; assert.equal(p.status,'active');
  const other=1-p.targetPlayerId; completeBossPlayerTurn(s,other); assert.equal(p.status,'active'); assert.equal(s.boss.danger,0);
  completeBossPlayerTurn(s,p.targetPlayerId); assert.equal(p.status,'failed'); assert.equal(s.boss.danger,6,'Bela + Cassandra only, no Fury');
  const t=game(); startAll(t); const mark=daughter(t).passive;
  const card=t.players[mark.targetPlayerId].hand.find(c=>c.id===mark.cardId);
  applyBossMeldTransition(t,{teamId:0,playerId:mark.targetPlayerId,meldIndex:0,cardsAdded:[card]});
  assert.equal(mark.status,'success'); completeBossPlayerTurn(t,mark.targetPlayerId); assert.equal(t.boss.danger,0);
  const u=game(); startAll(u); kill(u,'bela'); completeBossPlayerTurn(u,0); assert.equal(u.boss.danger,0);
});
test('Bela/Cassandra sem candidato não criam obrigação nem punem',()=>{
  const s=game(); s.players.forEach(p=>p.hand=[c(`only${p.id}`)]); startAll(s);
  assert.equal(daughter(s).passive.status,'idle'); assert.equal(daughter(s,'cassandra').passive.status,'idle');
  completeBossPlayerTurn(s,0); completeBossPlayerTurn(s,1); assert.equal(s.boss.danger,0);
});
test('Cassandra exige contribuição concreta; qualquer cooperador cumpre; BOT recebe jogo e carta',()=>{
  const s=game(); startAll(s); const p=daughter(s,'cassandra').passive;
  assert.equal(p.status,'active'); assert.ok(getBossDimitrescuPriorities(s,0).meldIndexes.includes(0));
  applyBossMeldTransition(s,{teamId:0,playerId:1,meldIndex:0,cardsAdded:[c('new6','6','♠')]});
  assert.equal(p.status,'success');
  const t=game(); t.teams[0].melds=[['3','4','5'].map(r=>c(`clubs${r}`,r,'♣'))]; startAll(t);
  assert.equal(daughter(t,'cassandra').passive.status,'idle');
});
test('Daniela: primeira retirada efetiva top-only ou completa, uma vez por rodada; sem retirada não pune',()=>{
  for(const cards of [[c('top')],[c('buried'),c('top')]]) {
    const s=game(); startAll(s); notifyBossDiscardTaken(s,0,cards); notifyBossDiscardTaken(s,1,cards);
    assert.equal(s.boss.danger,3); assert.equal(daughter(s,'daniela').passive.status,'triggered');
  }
  const t=game(); startAll(t); notifyBossDiscardTaken(t,0,[]); assert.equal(t.boss.danger,0);
});
for(const resolved of [false,true]) test(`Relíquia ${resolved?'após':'antes'} da resolução suprime exatamente uma janela`,()=>{
  const s=game(); startAll(s); const d=daughter(s,'daniela'); if(resolved) d.passive.status='triggered';
  useCastleItem(s,0,item(s,'relic'),'daniela'); assert.equal(d.relicRound,resolved?2:1);
  notifyBossDiscardTaken(s,0,[c('pickup')]); assert.equal(s.boss.danger,0);
  regenerateDaughters(s,()=>{},()=>{}); s.boss.roundNumber++; startAll(s);
  assert.equal(d.passive.status,resolved?'suppressed':'active'); regenerateDaughters(s,()=>{},()=>{});
  s.boss.roundNumber++; startAll(s); assert.equal(d.passive.status,'active');
});
test('Fúria escala somente cura e Sede ofensiva Lady; passivas +3 e regen invariáveis',()=>{
  const s=game(); for(const [level,id] of [[0,'bela'],[1,'cassandra'],[2,'daniela'],[3,null]]) {
    assert.equal(furyHealing(s.boss,100),100+level*10); assert.equal(furyBlood(s.boss,8),8+level*2); assert.equal(furyBlood(s.boss,0),0);
    for(const d of s.boss.combatEntities) assert.equal(d.regeneration,50); if(id) kill(s,id);
  }
});
test('habilidades removidas fora de pools/intro/laboratório; snapshot antigo cancela sem punir/repetir',()=>{
  for(const id of ['bela_hunt','cassandra_feast','daniela_swarm']) {
    assert.ok(!dimitrescuDefinition.abilities.some(a=>a.id===id)); assert.ok(!Object.values(dimitrescuDefinition.phaseIntroAbilities).flat().includes(id));
    const s=game(); s.boss.currentIntent={id:'old',abilityId:id,payload:{}}; normalizeBossState(s);
    assert.equal(s.boss.currentIntent,null); assert.equal(s.boss.danger,0); normalizeBossState(s); assert.equal(s.boss.danger,0);
  }
  const oldThree=game();oldThree.boss.currentIntent={id:'old',abilityId:'three_daughters',payload:{objectives:[]}};normalizeBossState(oldThree);assert.equal(oldThree.boss.currentIntent,null);
  const legacy=game(); delete legacy.boss.castleVersion; legacy.boss.maxHp=2300; legacy.boss.hp=2200; normalizeBossState(legacy);
  assert.equal(legacy.boss.hp,2000); assert.deepEqual(legacy.boss.castleItems,{});
  const s=game(); s.boss.phase=2; kill(s,'cassandra');
  assert.equal(selectNextBossIntent(s,{debug:true,forcedAbilityId:'cassandra_dead_feast'}).abilityId,'cassandra_dead_feast');
});
test('BOT consome proteção sem piso de HP; sacrifica carta isolada de baixo custo; representação preserva face',()=>{
  const s=game(); s.players[0].name='BOT Luana'; s.boss.hp=1500;
  const e=applyBossMeldTransition(s,{teamId:0,playerId:0,meldIndex:0,oldKind:'simple',newKind:'suja',cardsAdded:[]});
  assert.equal(e.targetId,'boss'); assert.equal(s.boss.hp,1500);assert.ok(s.boss.bloodLinkProtection<1500);
  const t=game(), id=item(t,'dagger'); const decision=getCastleBotItem(t,0); assert.equal(decision.cardId,id);
  const marked={...c(id),castleItem:{type:'dagger',consumed:false}};
  const html=cardFrontHTML(marked); assert.match(html,/castle-item-overlay/); assert.match(html,/card-rank/);
  assert.doesNotMatch(cardFrontHTML({...marked,castleItem:{type:'dagger',consumed:true}}),/castle-item-overlay/);
});

test('Laboratório mantém 108 cartas e distribui os mesmos 15 itens sem rerrolar no reload',()=>{
  const s=buildBossDebugScenario(null,{bossId:'dimitrescu',abilityId:'crimson_brand',phase:'1',variant:'interactive',target:'auto'}).state;
  assert.equal(Object.keys(s.boss.castleItems).length,15);
  const before=JSON.stringify(s.boss.castleItems); normalizeBossState(s); assert.equal(JSON.stringify(s.boss.castleItems),before);
});

test('Bela/Cassandra não exigem jogada que deixaria uma carta sem Morto/canastra para fechar',()=>{
  const s=game(); s.deadPiles=[]; s.players[0].hand=[c('six','6','♠'),c('spare')];s.players[1].hand=[c('other')];
  startAll(s); assert.equal(daughter(s).passive.status,'idle');assert.equal(daughter(s,'cassandra').passive.status,'idle');
});

test('Fúria integra Vinho, Banquete independente de Cassandra e conversão do Coágulo',()=>{
  const wine=game();kill(wine,'cassandra');wine.boss.castleLastDaughterId='daniela';wine.boss.hp=1200;wine.boss.danger=30;
  selectNextBossIntent(wine,{debug:true,forcedAbilityId:'red_wine'});
  completeBossPlayerTurn(wine,0);completeBossPlayerTurn(wine,1);
  assert.equal(wine.boss.hp,1354);assert.equal(wine.boss.danger,18,'30 + Bela 3 - wine cost 15');
  assert.equal(wine.boss.eventLog.find(e=>e.abilityId==='red_wine').bloodCost,15);
  const feast=game();kill(feast,'cassandra');feast.boss.hp=1200;feast.deadChunksTaken[0]=1;
  feast.boss.bloodiedDead={id:'curse',status:'active',deadIndex:0,bloodAmount:10,healAmount:90};
  applyBossDeadTaken(feast);assert.equal(feast.boss.hp,1299);assert.equal(feast.boss.danger,12);
  applyBossDeadTaken(feast);assert.equal(feast.boss.hp,1299,'no duplicate consumption');
  const clot=game();kill(clot,'cassandra');clot.boss.hp=1200;
  clot.boss.crimsonClot={id:'clot',status:'active',max:180,remaining:180,createdRound:1};
  completeBossPlayerTurn(clot,0);completeBossPlayerTurn(clot,1);assert.equal(clot.boss.hp,1299);
});

for (const [phase, blood, healing] of [[2,10,90],[3,14,130]]) {
  for (const deaths of [0,1,2,3]) test(`Banquete F${phase}, ${deaths} mortes: nova base, Fúria +2 e cura preservada`,()=>{
    const s=game();s.boss.phase=phase;s.boss.hp=1600;
    ['bela','cassandra','daniela'].slice(0,deaths).forEach(id=>kill(s,id));
    const intent=selectNextBossIntent(s,{debug:true,forcedAbilityId:'cassandra_dead_feast'});
    assert.equal(intent.payload.bloodAmount,blood);assert.equal(intent.payload.healAmount,healing);
    completeBossPlayerTurn(s,0);completeBossPlayerTurn(s,1);
    s.boss.hp=1600;s.boss.danger=0;s.deadChunksTaken[0]=1;
    applyBossDeadTaken(s);
    assert.equal(s.boss.danger,blood+deaths*2);
    assert.equal(s.boss.hp,1600+Math.floor(healing*(1+deaths*.1)));
    const snapshot=JSON.parse(JSON.stringify(s));normalizeBossState(snapshot);
    applyBossDeadTaken(snapshot);assert.equal(snapshot.boss.danger,s.boss.danger);
    assert.equal(snapshot.boss.hp,s.boss.hp,'reload não duplica consumo/cura');
  });
}

test('Fúria não escala a Sede das filhas e regeneração ocorre após as obrigações',()=>{
  const s=game();kill(s,'cassandra');s.boss.castleLastDaughterId='daniela';startDimitrescuRound(s);daughter(s).hp=400;
  completeBossPlayerTurn(s,0);completeBossPlayerTurn(s,1);
  assert.equal(s.boss.danger,3);assert.equal(daughter(s).hp,450);
  const blood=s.boss.eventLog.findIndex(e=>e.type==='bloodChange'); const regen=s.boss.eventLog.findIndex(e=>e.type==='daughterRegen');
  assert.ok(blood>=0&&regen>blood);
});

test('How dare you toca uma vez por cada morte, nunca em rerender/reload',()=>{
  const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const fn=source.slice(source.indexOf('function syncBossResourceSounds('),source.indexOf('\nfunction playBossIntroSoundOnce('));
  const played=[], flashes=[];
  const context=vm.createContext({seenBossResourceSoundEventIds:null,bossResourceSoundScope:null,gameId:'test',audioUnlocked:true,audioCtx:null,
    document:{getElementById:()=>({animate:()=>flashes.push(1)})},window:{matchMedia:()=>({matches:false})},
    BOSS_SFX:{dimitrescu:{daughterDeath:'clip'}},playSfxClone:clip=>played.push(clip),bossEventIsDimitrescuPhaseChange:()=>false,
    bossEventHealsMatriarch:()=>false,bossEventAddsResource:()=>false,matriarchNatureSoundPairKey:()=>null});
  vm.runInContext(fn,context);const s=game();context.syncBossResourceSounds(s.boss);
  for(const id of ['bela','cassandra','daniela']) {kill(s,id);context.syncBossResourceSounds(s.boss);context.syncBossResourceSounds(s.boss);}
  assert.deepEqual(played,['clip','clip','clip']);assert.equal(flashes.length,3);
  context.seenBossResourceSoundEventIds=null;context.syncBossResourceSounds(JSON.parse(JSON.stringify(s.boss)));assert.equal(played.length,3);
});
