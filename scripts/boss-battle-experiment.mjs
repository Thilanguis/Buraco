// Reproducible, headless sensitivity experiment. This is NOT a competent-human
// win-rate model: bounded greedy search has no long-term canastra optimisation.
import { pathToFileURL } from 'node:url';
import { createBossState, beginBossTurn, advanceBossTurn, completeBossPlayerTurn,
  applyBossMeldTransition, applyBossDeadTaken, applyBossFinalStrike, applyBossResourceDefeat,
  isValidBossSequence, classifyBossMeldKind, isBossCardBlocked, notifyBossPurchaseCompleted,
  notifyBossCardDiscarded, notifyBossDiscardTaken, quoteBossDiscardPickup, getBossNaturePriorities,
  getBossCombatPriorities, normalizeBossState, inspectBossAbilityEligibility,
  queueDebugBossAbility } from '../js/boss/boss-engine.js';
import { getBossDefinition } from '../js/boss/boss-registry.js';
import { findNemesisLegalPlan } from '../js/boss/mechanics/nemesis.js';

export function random(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function deal(id, seed) {
  const rng = random(seed), deck = [];
  for (let copy = 0; copy < 2; copy++) {
    for (const suit of ['♠','♥','♦','♣']) for (const rank of ['A','2','3','4','5','6','7','8','9','10','J','Q','K'])
      deck.push({id:`${copy}:${suit}:${rank}`,rank,suit});
    for (let j = 0; j < 2; j++) deck.push({id:`joker:${copy}:${j}`,rank:'JOKER',joker:true});
  }
  for (let i = deck.length - 1; i; i--) { const j = Math.floor(rng() * (i + 1)); [deck[i],deck[j]] = [deck[j],deck[i]]; }
  const state = {mode:id === 'nemesis'?'boss_nemesis':'boss_matriarca',currentPlayer:0,turnNumber:1,
    players:[0,1].map(i=>({id:i,name:`Policy ${i}`,teamId:0,hand:deck.splice(0,11)})),
    teams:[{id:0,melds:[]},{id:1,melds:[]}],deadPiles:[deck.splice(0,11),deck.splice(0,11)],
    deadChunksTaken:[0,0],deadChunksMax:[2,0],discard:deck.splice(0,1),stock:deck,
    boss:createBossState(id,seed),hasDrawnThisTurn:false};
  return state;
}
function helpers(state) {
  return {validSequence:isValidBossSequence,blocked:(id,card,action)=>isBossCardBlocked(state,id,card,action),
    canLeaveHand:(player,moves)=> {
      if (player.hand.length - new Set(moves.flatMap(m=>m.cardIds)).size > 1) return true;
      if (state.deadChunksTaken[0] < 2 && state.deadPiles.some(p=>p.length)) return true;
      if (state.teams[0].melds.some(m=>['limpa','real','asas'].includes(classifyBossMeldKind(m)))) return true;
      return moves.some(m=>['limpa','real','asas'].includes(classifyBossMeldKind([
        ...(m.meldIndex == null?[]:state.teams[0].melds[m.meldIndex]),...player.hand.filter(c=>m.cardIds.includes(c.id))])));
    }};
}
function greedyPlan(state, player) {
  const nature = getBossNaturePriorities(state,player.id);
  let best = null, score = -Infinity, checked = 0;
  findNemesisLegalPlan(state,player,helpers(state),plan=> {
    const value = plan.playedCardIds.length * 10 + plan.moves.reduce((sum,m)=>sum + (m.meldIndex != null
      ? state.teams[0].melds[m.meldIndex].length * 3 + (nature?.meldIndexes.includes(m.meldIndex)?70:0):0),0)
      + plan.playedCardIds.filter(id=>nature?.markedCardIds.includes(id)).length * 80;
    if (value > score) {score = value; best = plan;}
    return ++checked >= 96;
  });
  return getBossCombatPriorities(state,player.id)?.plan || best;
}
function play(state, player, move) {
  const cards = player.hand.filter(c=>move.cardIds.includes(c.id));
  if (cards.length !== move.cardIds.length) throw new Error('Invalid policy hand');
  const index = move.meldIndex ?? state.teams[0].melds.length;
  const previous = state.teams[0].melds[index] || [], oldKind = classifyBossMeldKind(previous);
  const next = [...previous,...cards];
  if (!isValidBossSequence(next)) throw new Error('Invalid policy sequence');
  player.hand = player.hand.filter(c=>!move.cardIds.includes(c.id));
  state.teams[0].melds[index] = next;
  applyBossMeldTransition(state,{teamId:0,playerId:player.id,meldIndex:index,oldKind,newKind:classifyBossMeldKind(next),cardsAdded:cards,isNewMeld:move.meldIndex==null});
}
function flow(state, options, rng, counts) {
  for (let i = 0; i < 20 && state.boss.bossFlow?.stage !== 'players' && !state.boss.result; i++) {
    const boss = state.boss;
    // Experimental allocator only. Keep real eligibility, phase introductions,
    // no-repeat policy and the canonical announcement/resolution pipeline.
    if (options.experimentalAllocator && boss.bossFlow.queue[0]?.kind === 'ability'
      && boss.phaseIntroPending !== boss.phase) {
      const objectives = ['stars_hunt', 'infectious_tentacle', 'stars_extermination', 'graft'];
      const entries = getBossDefinition(boss.id).abilities.filter(e => !e.debugOnly && e.phases.includes(boss.phase));
      const pool = entries.filter(e => (entries.length < 2 || e.id !== boss.lastAbilityId)
        && inspectBossAbilityEligibility(state, e.id).eligible);
      const weight = e => e.weight * (objectives.includes(e.id) ? options.objectiveWeightFactor : 1);
      let cursor = rng() * pool.reduce((sum, e) => sum + weight(e), 0);
      const selected = pool.find(e => (cursor -= weight(e)) <= 0);
      if (selected) { queueDebugBossAbility(state, selected.id); boss.bossFlow.debugSelection = true; }
    }
    advanceBossTurn(state,state.boss.bossFlow.endsAt + 1);
    if (boss.currentIntent) counts[boss.currentIntent.id] = { abilityId: boss.currentIntent.abilityId, phase: boss.currentIntent.announcedPhase };
  }
}
export function battle(id, seed, {graftHeal, partialScale=1, objectiveFollow=1, objectiveWeightFactor=1,
  autoTarget=false, experimentalAllocator=objectiveWeightFactor!==1}={}) {
  const state=deal(id,seed),counts={}, outcomes={}, rng=random(seed ^ 123456);
  if (autoTarget && id === 'nemesis') for (const player of state.players) player.isBot = true;
  const options = { objectiveWeightFactor, experimentalAllocator };
  beginBossTurn(state,{first:true,now:1000}); flow(state, options, rng, counts);
  const configured = new Set();
  let turns=0, pickups=0, recycled=0, maxPhase=1;
  while (!state.boss.result && turns < 180) {
    const b=state.boss,player=state.players[state.currentPlayer]; maxPhase=Math.max(maxPhase,b.phase);
    const intent=b.currentIntent;
    if (intent && !configured.has(intent.id)) {
      configured.add(intent.id);
      if (partialScale !== 1 && intent.payload.partialFailure != null) intent.payload.partialFailure=Math.round(intent.payload.partialFailure * partialScale);
      if (graftHeal != null) for(const t of b.natureThreats.filter(t=>t.type==='graft'&&t.status==='active')) t.partialHeal=graftHeal;
    }
    state.hasDrawnThisTurn=false;state.pickedDiscardCardId=null;
    // Take only a quoted legal destination; lower pile cards never justify it.
    const top=state.discard.at(-1);let pickup=null;
    if(top) {
      const preview={...state,players:state.players.map(p=>p.id===player.id?{...p,hand:[...p.hand,top]}:p)};
      findNemesisLegalPlan(preview,preview.players[state.currentPlayer],helpers(preview),p=> {
        const destination=p.moves.find(m=>m.cardIds.includes(top.id));
        if(!destination)return false;
        const quote=quoteBossDiscardPickup(state,player.id,{meldIndex:destination.meldIndex,handCardIds:destination.cardIds.filter(id=>id!==top.id)});
        if(!quote.allowed)return false;
        pickup={destination,quote};return true;
      });
    }
    const canPickup=pickup && !(getBossNaturePriorities(state,player.id)?.pollenOnDiscard)
      && !(b.currentIntent?.abilityId==='contaminated_zone'&&b.danger>=80);
    if(canPickup) {
      const taken=state.discard.splice(-pickup.quote.count);player.hand.push(...taken);pickups++;
      state.pickedDiscardCardId=top.id;notifyBossDiscardTaken(state,player.id,taken);
      play(state,player,pickup.destination);
      if(!player.hand.length) {
        const pile=state.deadPiles.find(p=>p.length);
        if(pile&&state.deadChunksTaken[0]<2){player.hand.push(...pile.splice(0));state.deadChunksTaken[0]++;applyBossDeadTaken(state);}
        else {applyBossFinalStrike(state,0,player.id);break;}
      }
    } else {
      if(!state.stock.length) {const index=state.deadPiles.findIndex(p=>p.length);if(index>=0){state.stock.push(...state.deadPiles[index].splice(0));recycled++;}}
      if(!state.stock.length){applyBossResourceDefeat(state);break;}
      player.hand.push(state.stock.pop());
    }
    state.hasDrawnThisTurn=true;notifyBossPurchaseCompleted(state,player.id);
    // Sensitivity to objective-following, NOT an empirical skill parameter.
    for(let n=0;n<12 && !b.result;n++) {
      let plan=greedyPlan(state,player);
      if(objectiveFollow < 1 && rng()>objectiveFollow) plan=findNemesisLegalPlan(state,player,helpers(state));
      if(!plan)break;
      for(const move of plan.moves){if(b.result)break;play(state,player,move);}
      if(!player.hand.length){
        const pile=state.deadPiles.find(p=>p.length);
        if(pile&&state.deadChunksTaken[0]<2){player.hand.push(...pile.splice(0));state.deadChunksTaken[0]++;applyBossDeadTaken(state);}
        else {applyBossFinalStrike(state,0,player.id);break;}
      }
    }
    if(b.result)break;
    const marked=getBossCombatPriorities(state,player.id)?.preferredDiscardCardIds || getBossNaturePriorities(state,player.id)?.markedCardIds || [];
    const legal=player.hand.filter(c=>c.id!==state.pickedDiscardCardId&&!isBossCardBlocked(state,player.id,c.id,'discard'));
    const discard=legal.find(c=>marked.includes(c.id)) || legal.find(c=>c.rank!=='2'&&!c.joker) || legal[0];
    if(!discard)throw new Error('Policy left no legal discard');
    player.hand=player.hand.filter(c=>c.id!==discard.id);state.discard.push(discard);notifyBossCardDiscarded(state,player.id,discard);
    if(!player.hand.length){const pile=state.deadPiles.find(p=>p.length);
      if(pile&&state.deadChunksTaken[0]<2){player.hand.push(...pile.splice(0));state.deadChunksTaken[0]++;applyBossDeadTaken(state);}
      else if(state.teams[0].melds.some(m=>['limpa','real','asas'].includes(classifyBossMeldKind(m))))applyBossFinalStrike(state,0,player.id);
    }
    if(b.result)break;
    completeBossPlayerTurn(state,player.id);turns++;state.turnNumber++;state.currentPlayer=1-state.currentPlayer;flow(state, options, rng, counts);
    for(const e of b.eventLog.filter(e=>e.type==='nemesisObjective'||e.type==='natureResult'))outcomes[e.actionId]=e;
    normalizeBossState(state);
  }
  const cards = [...state.players.flatMap(p=>p.hand),...state.teams.flatMap(t=>t.melds.flat()),
    ...state.deadPiles.flat(),...state.stock,...state.discard];
  if (cards.length !== 108 || new Set(cards.map(c=>c.id)).size !== 108) throw new Error('Policy violated physical deck conservation');
  return {bossWins:state.boss.result?.victory===false,reason:state.boss.result?.reason||'policy_turn_limit',
    rounds:state.boss.roundNumber,hp:state.boss.hp,danger:state.boss.danger,maxPhase,pickups,recycled,
    abilities:Object.values(counts).reduce((a,e)=>(a[e.abilityId]=(a[e.abilityId]||0)+1,a),{}),
    phaseAbilities:Object.values(counts).reduce((a,e)=>{const key=`F${e.phase}:${e.abilityId}`;a[key]=(a[key]||0)+1;return a;},{}),
    outcomes:Object.values(outcomes).length};
}
export function experiment(id,start,count,options={}) {
  const results=Array.from({length:count},(_,i)=>battle(id,start+i,options)), wins=results.filter(r=>r.bossWins).length;
  const reasons={},abilities={},phaseAbilities={};for(const r of results){reasons[r.reason]=(reasons[r.reason]||0)+1;for(const [k,v]of Object.entries(r.abilities))abilities[k]=(abilities[k]||0)+v;for(const[k,v]of Object.entries(r.phaseAbilities))phaseAbilities[k]=(phaseAbilities[k]||0)+v;}
  return {id,start,count,options,bossWins:wins,bossWinPercent:100*wins/count,
    meanRounds:results.reduce((s,r)=>s+r.rounds,0)/count,meanPickups:results.reduce((s,r)=>s+r.pickups,0)/count,reasons,abilities,phaseAbilities,
    warning:'Bounded greedy policy, not validated against competent players. No telemetry or claimed real win rate.'};
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const [start='1000',count='60',graftHeal='',partialScale='1',objectiveFollow='1',objectiveWeightFactor='1',autoTarget='false',allocator='']=process.argv.slice(2);
  for(const id of ['nemesis','matriarca_esmeralda'])console.log(JSON.stringify(experiment(id,+start,+count,{...(graftHeal?{graftHeal:+graftHeal}:{}),partialScale:+partialScale,objectiveFollow:+objectiveFollow,objectiveWeightFactor:+objectiveWeightFactor,autoTarget:autoTarget==='true',experimentalAllocator:allocator==='experimental'||+objectiveWeightFactor!==1})));
}
