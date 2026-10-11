import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeck } from '../js/deck.js';
import { createBossState, distributeCastleItems, getCastleItemUseStatus, canUseCastleItem, useCastleItem,
  normalizeBossState, notifyBossDiscardTaken } from '../js/boss/boss-engine.js';
import { damageDaughter, ITEM_DEFINITIONS, CASTLE_BALANCE } from '../js/boss/dimitrescu-castle.js';
import { cardFrontHTML } from '../js/game/card-face.js';
import { danielaDiscardActive, castleItemChip, castleItemHelp } from '../js/boss/ui/dimitrescu-castle-view.js';

function game() {
  const deck=createDeck(['♠','♥','♦','♣'],['A','2','3','4','5','6','7','8','9','10','J','Q','K']);
  const boss=createBossState('dimitrescu',834);distributeCastleItems(boss,deck);boss.bossFlow={stage:'players'};
  const chosen=Object.keys(ITEM_DEFINITIONS).flatMap(type=>deck.filter(c=>c.castleItem?.type===type).slice(0,2));
  const s={mode:'boss_dimitrescu',variant:'fechado',currentPlayer:0,turnNumber:1,hasDrawnThisTurn:true,finished:false,boss,
    players:[{id:0,name:'Biel',teamId:0,hand:chosen.filter((c,i)=>i%2===0)},
      {id:1,name:'Luana',teamId:0,hand:chosen.filter((c,i)=>i%2===1)}],
    teams:[{id:0,melds:[]},{id:1,melds:[]}],stock:deck.filter(c=>!chosen.includes(c)),discard:[],deadPiles:[],deadChunksTaken:[0,0]};
  normalizeBossState(s);return s;
}
const item=(s,p=0,type='cold_flask')=>s.players[p].hand.find(c=>c.castleItem?.type===type);
const daughter=(s,id='cassandra')=>s.boss.combatEntities.find(d=>d.id===id);
const reload=s=>{const r=JSON.parse(JSON.stringify(s));normalizeBossState(r);return r;};
function physical(s) {return [...s.stock,...s.discard,...s.deadPiles.flat(),...s.players.flatMap(p=>p.hand),
  ...s.teams.flatMap(t=>t.melds.flat()),...s.boss.combatEntities.flatMap(d=>d.sacrificedCards)];}

for(const [code,mutate] of [
  ['finished',s=>s.finished=true],['turn',s=>s.currentPlayer=1],
  ['boss_turn',s=>s.boss.bossFlow={stage:'ability'}],['choice',s=>s.boss.pendingChoices=[{id:'choice'}]],
  ['draw',s=>s.hasDrawnThisTurn=false],['draw',s=>s.partialDraw={remaining:1}],
  ['hand',(s,c)=>s.players[0].hand=s.players[0].hand.filter(x=>x!==c)],
  ['consumed',(s,c)=>s.boss.castleItems[c.id].consumed=true],
  ['last_card',(s,c)=>s.players[0].hand=[c]],['discard_pickup',(s,c)=>s.pickedDiscardCardId=c.id],
  ['target',s=>{daughter(s).hp=0;daughter(s).status='dead';}],
]) test(`uso impedido (${code}) informa motivo sem consumir item`,()=>{
  const s=game(),c=item(s);mutate(s,c);normalizeBossState(s);
  const before=JSON.stringify(s),status=getCastleItemUseStatus(s,0,c.id,'cassandra');
  assert.equal(status.allowed,false);assert.equal(status.code,code);assert.ok(status.reason.length>15);
  assert.equal(canUseCastleItem(s,0,c.id,'cassandra'),false);assert.equal(useCastleItem(s,0,c.id,'cassandra'),null);
  assert.equal(JSON.stringify(s),before);
});

test('segundo humano pode aplicar Frasco Congelante após parceiro; reload/undo e dois snapshots preservam 108 IDs',()=>{
  let a=game(),b=reload(a);const saved=JSON.stringify(a),c=item(a);
  assert.ok(useCastleItem(a,0,c.id,'cassandra'));b=reload(a);
  assert.equal(b.boss.castleFreeze.remainingTurns,2);assert.equal(daughter(b).maxHp,400);
  b.currentPlayer=1;b.turnNumber++;b.hasDrawnThisTurn=true;
  a=reload(b);const next=item(a,1);
  assert.equal(getCastleItemUseStatus(a,1,next.id,'cassandra').allowed,true);
  assert.ok(useCastleItem(a,1,next.id,'cassandra'));assert.equal(useCastleItem(a,1,next.id,'cassandra'),null);
  b=reload(a);assert.equal(b.boss.castleFreeze.remainingTurns,2);assert.equal(daughter(b).maxHp,300);
  for(const s of [a,b,reload(JSON.parse(saved))]) {
    assert.equal(physical(s).length,108);assert.equal(new Set(physical(s).map(c=>c.id)).size,108);
  }
  assert.equal(daughter(reload(JSON.parse(saved))).maxHp,500);
});

test('descarte conserva item e ícone; parceiro recebe carta; uso+morte devolvem carta consumida ao fundo',()=>{
  let s=game();const c=item(s,0,'explosive');
  s.players[0].hand.splice(s.players[0].hand.indexOf(c),1);s.discard.push(c);s=reload(s);
  assert.match(cardFrontHTML(s.discard.at(-1)),/castle-item-overlay/);
  const pickup=s.discard.pop();s.players[1].hand.push(pickup);s.currentPlayer=1;s.turnNumber++;
  s.pickedDiscardCardId=pickup.id;assert.equal(getCastleItemUseStatus(s,1,pickup.id,'bela').code,'discard_pickup');
  delete s.pickedDiscardCardId;assert.ok(useCastleItem(s,1,pickup.id,'bela'));
  s.discard.push(s.stock.pop());const top=s.discard.at(-1).id;
  damageDaughter(s,daughter(s,'bela'),1000,'test-death',e=>s.boss.eventLog.push(e));s=reload(s);
  assert.equal(s.discard[0].id,pickup.id);assert.equal(s.discard.at(-1).id,top);
  assert.equal(s.discard[0].castleItem.consumed,true);assert.doesNotMatch(cardFrontHTML(s.discard[0]),/castle-item-overlay/);
  assert.equal(physical(s).length,108);assert.equal(new Set(physical(s).map(c=>c.id)).size,108);
});

test('Daniela antecipa reação real e remove destaque após uma cobrança; Bela e Cassandra preservadas',()=>{
  const s=game(),d=daughter(s,'daniela');d.passive={status:'active',round:s.boss.roundNumber};
  const others=JSON.stringify(s.boss.combatEntities.slice(0,2));assert.equal(danielaDiscardActive(s),true);
  notifyBossDiscardTaken(s,0,[]);assert.equal(danielaDiscardActive(s),true);assert.equal(s.boss.danger,0);
  notifyBossDiscardTaken(s,0,[s.stock[0]]);notifyBossDiscardTaken(s,1,[s.stock[0]]);
  assert.equal(s.boss.danger,3);assert.equal(danielaDiscardActive(s),false);
  assert.equal(JSON.stringify(s.boss.combatEntities.slice(0,2)),others);
  for(const status of ['idle','suppressed','triggered','failed']) {d.passive.status=status;assert.equal(danielaDiscardActive(s),false);}
  d.passive.status='active';d.status='dead';d.hp=0;assert.equal(danielaDiscardActive(s),false);
});

test('rótulos refletem pacote B e nome novo, preservando ID, asset e HP',()=>{
  const s=game();assert.equal(ITEM_DEFINITIONS.cold_flask.label,'Frasco Congelante');
  assert.match(ITEM_DEFINITIONS.cold_flask.image,/frio/);
  assert.match(castleItemChip('dagger',s.boss),/80%/);assert.match(castleItemChip('explosive',s.boss),/100.*SANGRA/);
  assert.match(castleItemHelp('explosive',s.boss),/100.*dano.*15 HP.*morrer/s);
  assert.equal(s.boss.hp,2000);assert.equal(CASTLE_BALANCE.regeneration,20);
  assert.deepEqual(s.boss.combatEntities.map(d=>[d.hp,d.maxHp,d.regeneration]),[[500,500,20],[500,500,20],[500,500,20]]);
});
