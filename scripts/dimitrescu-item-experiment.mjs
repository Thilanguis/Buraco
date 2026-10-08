// Full physical-deck experiment through the canonical boss engine, NOT a
// validated competent-duo model. Bounded greedy meld search has no look-ahead.
import { pathToFileURL } from 'node:url';
import { createDeck, dealInitialDeck } from '../js/deck.js';
import { random } from './boss-battle-experiment.mjs';
import { createBossState, distributeCastleItems, normalizeBossState, beginBossTurn, advanceBossTurn,
  completeBossPlayerTurn, applyBossMeldTransition, applyBossDeadTaken, applyBossFinalStrike,
  applyBossResourceDefeat, quoteBossDiscardPickup, isValidBossSequence, classifyBossMeldKind,
  isBossCardBlocked, notifyBossPurchaseCompleted, notifyBossDiscardTaken, notifyBossCardDiscarded,
  getBossDimitrescuPriorities, quoteBossPlanDamage, canUseCastleItem, useCastleItem, getCastleBotItem } from '../js/boss/boss-engine.js';
import { findNemesisLegalPlan } from '../js/boss/mechanics/nemesis.js';
import { CASTLE_BALANCE, LEGACY_CASTLE_BALANCE, livingDaughters, furyLevel, chooseCastleDamageTarget, regenerateDaughters } from '../js/boss/dimitrescu-castle.js';

export const STRATEGIES = ['direct','kill_one','kill_two','kill_three','dagger','explosive_anti','cold_bleed','hybrid'];
export const CANDIDATES = {
  baseline: {}, hp450:{daughterHp:450}, floor250:{daughterHpFloor:250}, dagger25:{daggerTransfer:.25}, dagger35:{daggerTransfer:.35},
  bleed8:{bleedPercent:.08}, bleed12:{bleedPercent:.12}, bleed3rounds:{bleedRounds:3},
  impact40:{explosiveDamage:40}, impact80:{explosiveDamage:80}, cold1:{coldMaxCharges:1},
  less_petrification:{maxHpLossPercent:{dagger:.05,explosive:.08,cold_flask:.15,anticoagulant:.10,relic:.15}},
  more_petrification:{maxHpLossPercent:{dagger:.10,explosive:.15,cold_flask:.25,anticoagulant:.20,relic:.25}},
  combo_hot:{bleedPercent:.12,bleedRounds:3,explosiveDamage:80,daughterHpFloor:250},
};
export function castleDeal(seed,{legacy=false,...overrides}={}) {
  const rng=random(seed),deck=createDeck(['♠','♥','♦','♣'],['A','2','3','4','5','6','7','8','9','10','J','Q','K']);
  const boss=createBossState('dimitrescu',seed),rules={...CASTLE_BALANCE,...overrides};
  rules.maxHpLossPercent={...CASTLE_BALANCE.maxHpLossPercent,...overrides.maxHpLossPercent};
  if(legacy){boss.castleItemRulesVersion=1;delete boss.castleItemRules;boss.castleDaughterBalanceVersion=2;}
  else boss.castleItemRules=rules;
  const hp=legacy?LEGACY_CASTLE_BALANCE.daughterHp:rules.daughterHp;
  for(const d of boss.combatEntities)d.hp=d.maxHp=d.originalMaxHp=hp;
  distributeCastleItems(boss,deck); // Association independent of shuffled location or strategy.
  for(let i=deck.length-1;i;i--){const j=Math.floor(rng()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  const deal=dealInitialDeck(deck,2,11,11);
  return {mode:'boss_dimitrescu',variant:'fechado',currentPlayer:0,turnNumber:1,hasDrawnThisTurn:false,
    players:deal.hands.map((hand,id)=>({id,name:`Greedy ${id}`,teamId:0,isBot:true,hand})),teams:[{id:0,melds:[]},{id:1,melds:[]}],
    stock:deal.stock,discard:deal.discard,deadPiles:deal.deadPiles,deadChunksTaken:[0,0],deadChunksMax:[2,0],boss};
}
// Controlled effect comparison, deliberately NOT a win-rate experiment. Relocate
// real item cards into the hand only here, keeping all 108 IDs conserved.
export function castleComboProbe(types,options={}) {
  const state=castleDeal(2000,options),player=state.players[0];
  state.boss.bossFlow={stage:'players'};state.hasDrawnThisTurn=true;
  for(const type of types){
    const id=Object.entries(state.boss.castleItems).find(([,x])=>x.type===type&&!x.consumed)[0];
    const zones=[state.stock,state.discard,...state.deadPiles,...state.players.map(p=>p.hand),...state.teams.flatMap(t=>t.melds)];
    let card;for(const zone of zones){const i=zone.findIndex(c=>c.id===id);if(i>=0){card=zone.splice(i,1)[0];break;}}
    player.hand.push(card);if(!useCastleItem(state,0,id,'bela'))throw Error('Invalid controlled item');
  }
  const daughter=state.boss.combatEntities[0],afterItems=daughter.hp;
  for(let i=0;i<2;i++){regenerateDaughters(state,()=>{},e=>state.boss.eventLog.push(e));state.boss.roundNumber++;}
  return {afterItems,afterTwoRounds:daughter.hp,maxHp:daughter.maxHp,ladyHp:state.boss.hp};
}
function helpers(state){return {validSequence:isValidBossSequence,blocked:(p,c,a)=>isBossCardBlocked(state,p,c,a),
  canLeaveHand:(player,moves)=>{
    // Reorganisation/new triples can reset a dirty canastra's classification;
    // evaluate the resulting entire table, not each single extension separately.
    const remaining=player.hand.length-new Set(moves.flatMap(m=>m.cardIds)).size;
    if(remaining>1)return true;
    if(state.deadChunksTaken[0]<2&&state.deadPiles.some(p=>p.length))return true;
    const table=state.teams[0].melds.map(m=>[...m]);
    for(const move of moves){const index=move.meldIndex??table.length;table[index]=[...(table[index]||[]),...player.hand.filter(c=>move.cardIds.includes(c.id))];}
    return table.some(m=>['limpa','real','asas'].includes(classifyBossMeldKind(m)));
  }};}
function plan(state,player){
  const priorities=getBossDimitrescuPriorities(state,player.id);let best=null,value=-Infinity,checked=0;
  findNemesisLegalPlan(state,player,helpers(state),candidate=>{
    const score=quoteBossPlanDamage(state,player,candidate)+candidate.playedCardIds.length*12
      + candidate.playedCardIds.filter(id=>priorities.markedCardIds.includes(id)).length*80
      + candidate.moves.filter(m=>priorities.meldIndexes.includes(m.meldIndex)).length*80
      + candidate.moves.reduce((n,m)=>n+(m.meldIndex==null?0:state.teams[0].melds[m.meldIndex].length*3),0);
    if(score>value){best=candidate;value=score;}return ++checked>=128;
  });return best;
}
function chooseTarget(state,strategy,damage){
  const ds=livingDaughters(state.boss),deaths=furyLevel(state.boss),quota={direct:0,kill_one:1,kill_two:2,kill_three:3}[strategy];
  if(quota!=null)return deaths>=quota?'boss':[...ds].sort((a,b)=>a.hp-b.hp||a.id.localeCompare(b.id))[0]?.id||'boss';
  const linked=ds.filter(d=>d.daggerLink),bleeding=ds.filter(d=>d.hemorrhage?.remaining);
  const selected=strategy==='dagger'?linked:strategy==='explosive_anti'||strategy==='cold_bleed'?bleeding:[];
  return selected.sort((a,b)=>a.hp-b.hp||a.id.localeCompare(b.id))[0]?.id||chooseCastleDamageTarget(state,damage);
}
function itemChoice(state,player,strategy){
  if(strategy==='direct'||player.hand.length<=2)return null;
  if(strategy==='hybrid')return getCastleBotItem(state,player.id);
  const quota={kill_one:1,kill_two:2,kill_three:3}[strategy];if(quota!=null&&furyLevel(state.boss)>=quota)return null;
  const order=strategy==='dagger'?['dagger','anticoagulant','cold_flask','explosive','relic']
    :strategy==='explosive_anti'?['anticoagulant','explosive','cold_flask','relic','dagger']
      :strategy==='cold_bleed'?['explosive','cold_flask','anticoagulant','dagger','relic']:Object.keys(CASTLE_BALANCE.maxHpLossPercent);
  const p=getBossDimitrescuPriorities(state,player.id);
  // Approximate opportunity cost: preserve wildcards, obligations and contiguous runs.
  const cards=player.hand.filter(c=>!c.joker&&c.rank!=='2'&&!p.markedCardIds.includes(c.id)&&state.boss.castleItems[c.id]&&!state.boss.castleItems[c.id].consumed)
    .filter(c=>player.hand.filter(other=>other.id!==c.id&&other.suit===c.suit).length<2)
    .sort((a,b)=>order.indexOf(state.boss.castleItems[a.id].type)-order.indexOf(state.boss.castleItems[b.id].type)||a.id.localeCompare(b.id));
  const ds=[...livingDaughters(state.boss)].sort((a,b)=>a.hp-b.hp||a.id.localeCompare(b.id));
  for(const card of cards)for(const d of ds)if(canUseCastleItem(state,player.id,card.id,d.id))return {cardId:card.id,daughterId:d.id};
  return null;
}
function play(state,player,move,strategy){
  const cards=player.hand.filter(c=>move.cardIds.includes(c.id)),index=move.meldIndex??state.teams[0].melds.length;
  const old=state.teams[0].melds[index]||[],next=[...old,...cards];if(cards.length!==move.cardIds.length||!isValidBossSequence(next))throw Error('Illegal simulated meld');
  state.boss.combatTargetsByPlayer[player.id]=chooseTarget(state,strategy,quoteBossPlanDamage(state,player,{moves:[move]}));
  player.hand=player.hand.filter(c=>!move.cardIds.includes(c.id));state.teams[0].melds[index]=next;
  applyBossMeldTransition(state,{teamId:0,playerId:player.id,meldIndex:index,oldKind:classifyBossMeldKind(old),newKind:classifyBossMeldKind(next),cardsAdded:cards,isNewMeld:move.meldIndex==null});
}
function emptyHand(state,player){
  if(player.hand.length||state.boss.result)return;
  const pile=state.deadPiles.find(p=>p.length);
  if(pile&&state.deadChunksTaken[0]<2){player.hand.push(...pile.splice(0));state.deadChunksTaken[0]++;applyBossDeadTaken(state);}
  else if(state.teams[0].melds.some(m=>['limpa','real','asas'].includes(classifyBossMeldKind(m)))){
    state.boss.combatTargetsByPlayer[player.id]='boss';applyBossFinalStrike(state,0,player.id);
  }else throw Error('Policy attempted illegal finish');
}
const flow=state=>{for(let i=0;i<20&&state.boss.bossFlow?.stage!=='players'&&!state.boss.result;i++)advanceBossTurn(state,state.boss.bossFlow.endsAt+1);};
export function castleBattle(seed,strategy='hybrid',options={}){
  if(!STRATEGIES.includes(strategy))throw Error('Unknown strategy');
  const state=castleDeal(seed,options),seen=new Set(),used=[],events=new Map();
  const observe=()=>{for(const p of state.players)for(const c of p.hand)if(state.boss.castleItems[c.id])seen.add(c.id);
    for(const e of state.boss.eventLog)if(e.actionId)events.set(e.actionId,e);};
  observe();const initialItems=seen.size;let earlyItems=initialItems,turns=0,pickups=0;
  beginBossTurn(state,{first:true,now:1000});flow(state);
  while(!state.boss.result&&turns<180){
    const player=state.players[state.currentPlayer];state.hasDrawnThisTurn=false;state.pickedDiscardCardId=null;
    let pickup=null;const top=state.discard.at(-1),p=getBossDimitrescuPriorities(state,player.id);
    if(top&&!p.avoidDiscard){
      const preview={...state,players:state.players.map(x=>x.id===player.id?{...x,hand:[...x.hand,top]}:x)};
      findNemesisLegalPlan(preview,preview.players[state.currentPlayer],helpers(preview),candidate=>{
        const destination=candidate.moves.find(m=>m.cardIds.includes(top.id));if(!destination)return false;
        const quote=quoteBossDiscardPickup(state,player.id,{meldIndex:destination.meldIndex,handCardIds:destination.cardIds.filter(id=>id!==top.id)});
        if(!quote.allowed)return false;pickup={quote,destination};return true;
      });
    }
    if(pickup){const cards=state.discard.splice(-pickup.quote.count);player.hand.push(...cards);state.pickedDiscardCardId=top.id;observe();
      notifyBossDiscardTaken(state,player.id,cards);pickups++;play(state,player,pickup.destination,strategy);emptyHand(state,player);
    }else{
      if(!state.stock.length){const pile=state.deadPiles.find(p=>p.length);if(pile)state.stock.push(...pile.splice(0));}
      if(!state.stock.length){applyBossResourceDefeat(state);break;}
      player.hand.push(state.stock.pop());
    }
    if(state.boss.result)break;
    state.hasDrawnThisTurn=true;notifyBossPurchaseCompleted(state,player.id);observe();
    // Item cost is a real hand card removed before planning, never free damage.
    for(let i=0;i<5;i++){const choice=itemChoice(state,player,strategy);if(!choice)break;
      const event=useCastleItem(state,player.id,choice.cardId,choice.daughterId);if(!event)throw Error('Invalid item');used.push(event.itemType);}
    for(let i=0;i<12&&!state.boss.result;i++){const chosen=plan(state,player);if(!chosen)break;
      for(const move of chosen.moves){if(state.boss.result)break;play(state,player,move,strategy);}emptyHand(state,player);observe();}
    if(state.boss.result)break;
    const priorities=getBossDimitrescuPriorities(state,player.id),legal=player.hand.filter(c=>c.id!==state.pickedDiscardCardId&&!isBossCardBlocked(state,player.id,c.id,'discard'));
    const discard=[...legal].sort((a,b)=>{
      // Prefer keeping potential sequences, items and objectives; no foresight into stock.
      const keep=c=>(c.joker||c.rank==='2'?100:0)+(priorities.markedCardIds.includes(c.id)?100:0)
        +(state.boss.castleItems[c.id]&&!state.boss.castleItems[c.id].consumed?30:0)+player.hand.filter(x=>x.id!==c.id&&x.suit===c.suit).length*5;
      return keep(a)-keep(b)||a.id.localeCompare(b.id);
    })[0];
    if(!discard)throw Error('Policy left no legal discard');player.hand=player.hand.filter(c=>c.id!==discard.id);state.discard.push(discard);notifyBossCardDiscarded(state,player.id,discard);emptyHand(state,player);
    if(state.boss.result)break;
    completeBossPlayerTurn(state,player.id);turns++;state.turnNumber++;state.currentPlayer=1-state.currentPlayer;flow(state);observe();
    if(turns===4)earlyItems=seen.size;normalizeBossState(state);
  }
  observe();const physical=[...state.players.flatMap(p=>p.hand),...state.teams.flatMap(t=>t.melds.flat()),...state.deadPiles.flat(),...state.stock,...state.discard,...state.boss.combatEntities.flatMap(d=>d.sacrificedCards)];
  if(physical.length!==108||new Set(physical.map(c=>c.id)).size!==108)throw Error('Physical deck not conserved');
  return {seed,strategy,bossWins:state.boss.result?.victory===false,playerWins:state.boss.result?.victory===true,
    reason:state.boss.result?.reason||'policy_turn_limit',rounds:state.boss.roundNumber,hp:state.boss.hp,protection:state.boss.bloodLinkProtection,danger:state.boss.danger,
    daughtersKilled:furyLevel(state.boss),initialItems,earlyItems,encounteredItems:seen.size,usedItems:used.length,usedTypes:used,pickups,
    transmittedDamage:[...events.values()].filter(e=>e.type==='daggerTransfer').reduce((sum,e)=>sum+e.amount,0),
    bleedDamage:[...events.values()].filter(e=>e.type==='daughterBleed').reduce((sum,e)=>sum+e.amount,0)};
}
export function summarize(rows){
  const n=rows.length,wins=rows.filter(r=>r.bossWins).length,p=n?wins/n:0,z=1.96,den=1+z*z/(n||1);
  const center=(p+z*z/(2*(n||1)))/den,half=z*Math.sqrt(p*(1-p)/(n||1)+z*z/(4*(n||1)**2))/den;
  const mean=key=>n?rows.reduce((s,r)=>s+r[key],0)/n:null;
  return {n,policyBossWins:wins,policyPlayerWins:rows.filter(r=>r.playerWins).length,policyUnresolved:rows.filter(r=>!r.bossWins&&!r.playerWins).length,
    policyBossPercent:n?100*p:null,policyWilson95:n?[100*(center-half),100*(center+half)]:null,
    rounds:mean('rounds'),daughtersKilled:mean('daughtersKilled'),hp:mean('hp'),danger:mean('danger'),encounteredItems:mean('encounteredItems'),usedItems:mean('usedItems'),transmittedDamage:mean('transmittedDamage'),bleedDamage:mean('bleedDamage'),
    reasons:rows.reduce((a,r)=>(a[r.reason]=(a[r.reason]||0)+1,a),{}),
    warning:'Policy-only experiment: greedy 128-plan search, approximate hand/finish policy; NOT competent-duo or real win rate.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const start=Number(process.argv[2]||2000),n=Number(process.argv[3]||40),sensitivity=Number(process.argv[4]||20);
  for(const legacy of [true,false]){
    let hybrid=[];
    for(const strategy of STRATEGIES){const rows=Array.from({length:n},(_,i)=>castleBattle(start+i,strategy,{legacy}));
      if(strategy==='hybrid')hybrid=rows;console.log(JSON.stringify({kind:'strategy',legacy,strategy,start,...summarize(rows)}));}
    for(const [strategy,predicate]of [['hybrid_few_items',r=>r.encounteredItems<=8],['hybrid_early_items',r=>r.earlyItems>=4],['hybrid_many_items',r=>r.encounteredItems>=13]])
      console.log(JSON.stringify({kind:'observed_cohort',legacy,strategy,start,...summarize(hybrid.filter(predicate))}));
  }
  for(const [candidate,options]of Object.entries(CANDIDATES)){
    const rows=Array.from({length:sensitivity},(_,i)=>castleBattle(start+i,'hybrid',options));
    console.log(JSON.stringify({kind:'sensitivity',candidate,options,start,...summarize(rows)}));
  }
}
