// Strategy only. All legality, damage and deadline outcomes stay in the engine.
import { bossObservableState, cooperativeHandValue, cooperativeHandMarginals, planPairIndexesWithTop } from '../game/bot-planner.js';
import { applyBossMeldTransition, classifyBossMeldKind, isValidBossSequence,
  isBossCardNaturalInSequence, completeBossPlayerTurn, notifyBossCardDiscarded,
  quoteBossDiscardPickup, notifyBossDiscardTaken, notifyBossPurchaseCompleted,
  isBossCardBlocked, canBossUseMeld, canBossCreateMeld, isBossMeldLocked,
  getBossNeheleniaPriorities, getBossCombatPriorities, getBossNaturePriorities,
  getBossDimitrescuPriorities, getBossDominatrixPriorities, normalizeBossState, applyBossFinalStrike,
  validateBossMeldPlay } from './boss-engine.js';

const copy = s => JSON.parse(JSON.stringify(s));
const wild = (c, meld) => c.joker || c.forceWild || (String(c.rank) === '2' && !isBossCardNaturalInSequence(meld, c.id));
export function cooperativeBossPriorities(state,botIndex) {
  const s=bossObservableState(state,botIndex),id=s.players[botIndex].id;
  return {combat:getBossCombatPriorities(s,id), other:[getBossNaturePriorities(s,id),
    getBossDimitrescuPriorities(s,id),getBossDominatrixPriorities(s,id),getBossNeheleniaPriorities(s,id)].filter(Boolean)};
}
export const prepareBossStrategyState = state => normalizeBossState(state);
export function canFinishBossAfterMeld(state,botIndex,pendingMeld) {
  const s=bossObservableState(state,botIndex),p=s.players[botIndex],team=s.teams[p.teamId];
  const ids=new Set((pendingMeld || []).map(c=>c.id));
  const index=team.melds.findIndex(m=>m.length && m.every(c=>ids.has(c.id)));
  const move={meldIndex:index<0?null:index,cardIds:p.hand.filter(c=>ids.has(c.id)).map(c=>c.id)};
  const next=simulateBossMove(s,botIndex,move);if(!next)return false;
  applyBossFinalStrike(next,0,p.id);
  return next.boss.result?.victory===true;
}
export function teamFutureValue(melds) {
  return (melds || []).reduce((sum, m) => {
    const kind = classifyBossMeldKind(m);
    return sum + ({simple:0, suja:12, limpa:75, real:160, asas:220}[kind] || 0)
      + (m.some(c => wild(c, m)) ? m.length : m.length * 4);
  }, 0);
}
function health(s) {
  return Number(s.boss?.hp || 0) + Number(s.boss?.bloodLinkProtection || 0)
    + (s.boss?.combatEntities || []).filter(e=>['alive','persistent'].includes(e.status))
      .reduce((n, e) => n + Number(e.hp || 0) * .5, 0);
}
function dangerCost(s) {
  if (s.boss?.result?.victory === false) return 100000;
  const value = Number(s.boss?.id==='matriarca_esmeralda' ? s.boss.bloom : s.boss?.danger || 0);
  const max = Number(s.boss?.maxDanger || 100);
  return 300 * (value / max) + 800 * (value / max) ** 4;
}
function reserveWeight(s) {
  // Continuous scarcity, not a last-minute panic toggle; Mortos add runway.
  const dead = (s.deadPiles || []).reduce((n, p) => n + p.length, 0);
  return .25 + .75 * Math.min(1, (s.stock.length + dead * .5) / 30);
}
export function strategyValue(s, botIndex) {
  if (s.boss?.result?.victory === true || (s.boss?.defeated&&!s.boss?.result)) return 100000;
  const p = s.players[botIndex], melds = s.teams[p.teamId].melds;
  return -health(s) * .65 - dangerCost(s) + teamFutureValue(melds)
    + cooperativeHandValue(p.hand, melds) * reserveWeight(s);
}
export function simulateBossMove(state, botIndex, move) {
  const s = copy(state), p = s.players[botIndex], team = s.teams[p.teamId];
  const cards = move.cardIds.map(id => p.hand.find(c => c.id === id));
  if (cards.some(c => !c) || new Set(move.cardIds).size !== cards.length) return null;
  if (!validateBossMeldPlay(s,p.id,cards).allowed) return null;
  if (cards.some(c => isBossCardBlocked(s,p.id,c.id,'play'))) return null;
  if (move.meldIndex == null ? !canBossCreateMeld(s,p.id) :
    isBossMeldLocked(s,team.id,move.meldIndex) || !canBossUseMeld(s,p.id,move.meldIndex)) return null;
  const index = move.meldIndex ?? team.melds.length, before = team.melds[index] || [];
  const next = [...before,...cards].map(c => ({...c}));
  if (!isValidBossSequence(next)) return null;
  p.hand = p.hand.filter(c => !move.cardIds.includes(c.id));
  if (p.hand.length && !p.hand.some(c => c.id !== s.pickedDiscardCardId
    && !isBossCardBlocked(s,p.id,c.id,'discard'))) return null;
  team.melds[index] = next;
  applyBossMeldTransition(s,{teamId:team.id,playerId:p.id,meldIndex:index,
    oldKind:classifyBossMeldKind(before),newKind:classifyBossMeldKind(next),cardsAdded:cards,isNewMeld:move.meldIndex==null});
  return s;
}
function deadlineValue(s, botIndex) {
  // app.js ends immediately on this canonical flag. Do not invent a later
  // punishment/heal after a contribution has already won the match.
  if(s.boss?.defeated&&!s.boss?.result)return strategyValue(s,botIndex);
  const probe = copy(s);
  const round=probe.boss.roundNumber;
  completeBossPlayerTurn(probe,probe.players[botIndex].id,{deferNextBossTurn:true});
  // Evaluate announced collective obligations conservatively: teammates may
  // still help, but we cannot assume unseen hands solve the remaining work.
  for (const p of probe.players) if (probe.boss.roundNumber===round
    && !(probe.boss.playersActedThisRound || []).includes(p.id)) completeBossPlayerTurn(probe,p.id,{deferNextBossTurn:true});
  return strategyValue(probe,botIndex);
}

function wildcardCost(s,botIndex,move,cards,after) {
  const base=s.teams[s.players[botIndex].teamId].melds[move.meldIndex] || [];
  const wildSpent=cards.filter(c=>wild(c,after)).length;
  const dirtying=base.length && !base.some(c=>wild(c,base)) && after.some(c=>wild(c,after));
  const noClean=s.teams[s.players[botIndex].teamId].melds.every(m=>!['limpa','real','asas'].includes(classifyBossMeldKind(m)));
  const sacrifice=dirtying&&base.length>=4?(noClean?180:100)*reserveWeight(s):0;
  // Preserve the first review's calibrated cost. A stronger universal reserve
  // made fewer wild spends but also fewer clean canastras in the expanded A/B.
  // Canonical natural twos pay none; lethal objectives can outweigh this cost.
  const reserve=move.meldIndex==null&&after.length<7?wildSpent*100*Math.max(.65,reserveWeight(s)):0;
  return sacrifice+reserve;
}

// Rank a bounded shortlist by actual engine outcomes. Checking deadline cost on
// clones replaces stale hand-written punishment tables, including partials.
export function rankBossMoves(state, botIndex, moves, {limit=20}={}) {
  const publicState = bossObservableState(state,botIndex);
  const baseline = deadlineValue(publicState,botIndex);
  const rough = moves.map(move => {
    const p = publicState.players[botIndex], base = publicState.teams[p.teamId].melds[move.meldIndex] || [];
    const cards = p.hand.filter(c => move.cardIds.includes(c.id));
    return {move, rough: teamFutureValue([[...base,...cards]]) - teamFutureValue([base]) + cards.length * 4};
  }).sort((a,b) => b.rough-a.rough
    || a.move.cardIds.join().localeCompare(b.move.cardIds.join()));
  const shortlist=[...rough.slice(0,Math.ceil(limit*.6)),...rough.filter(p=>p.move.objective).slice(0,Math.floor(limit*.4))];
  const unique=[...new Map(shortlist.map(p=>[String(p.move.meldIndex)+p.move.cardIds.join(),p])).values()];
  return unique.map(({move}) => {
    let next = simulateBossMove(publicState,botIndex,move);
    if (!next) return {move,score:-Infinity};
    for (const follow of move.followups || []) {
      const step=simulateBossMove(next,botIndex,follow);
      if (!step) break;
      next=step;
    }
    const played=move.cardIds.map(id=>publicState.players[botIndex].hand.find(c=>c.id===id)).filter(Boolean);
    const base=publicState.teams[publicState.players[botIndex].teamId].melds[move.meldIndex] || [];
    const after=[...base,...played];
    const score = deadlineValue(next,botIndex)-baseline + played.filter(c=>!c.joker&&String(c.rank)!=='2').length*12
      - wildcardCost(publicState,botIndex,move,played,after);
    return {move,score,next};
  }).sort((a,b)=>b.score-a.score || a.move.cardIds.join().localeCompare(b.move.cardIds.join()));
}

export function rankBossDiscardPickups(state,botIndex,{maxCandidates=64}={}) {
  const s = bossObservableState(state,botIndex), p=s.players[botIndex], team=s.teams[p.teamId], top=s.discard.at(-1);
  if (!top) return [];
  const destinations = [];
  // Existing destinations include real bridges; never borrow legality from a
  // different game. The quote decides top-only versus full pickup.
  for (let m=0;m<team.melds.length;m++) {
    destinations.push({meldIndex:m,handCardIds:[]});
    for (const c of p.hand) destinations.push({meldIndex:m,handCardIds:[c.id]});
  }
  for (const [a,b] of planPairIndexesWithTop(p.hand,top)) destinations.push({meldIndex:null,handCardIds:[p.hand[a].id,p.hand[b].id]});
  const baseline = deadlineValue(s,botIndex);
  const results = [], candidates=[];
  for (const destination of destinations) {
    const quote = quoteBossDiscardPickup(s,p.id,destination);
    if (!quote.allowed) continue;
    const cards=[...destination.handCardIds.map(id=>p.hand.find(c=>c.id===id)),top];
    const base=team.melds[destination.meldIndex] || [],after=[...base,...cards];
    const held=[...p.hand.filter(c=>!destination.handCardIds.includes(c.id)),...s.discard.slice(-quote.count,-1)];
    const rough=teamFutureValue([after])-teamFutureValue([base])+cooperativeHandValue(held,[...team.melds,after])
      - wildcardCost(s,botIndex,{meldIndex:destination.meldIndex},cards,after);
    candidates.push({destination,quote,rough,key:JSON.stringify(destination),group:`${quote.protected?'top':'full'}:${destination.meldIndex==null?'new':'extend'}`});
  }
  const budget=Math.max(0,Math.floor(maxCandidates));
  // Keep the old 32 incumbents as a conservative control; otherwise a cheap
  // rough score can crowd out an objective whose deadline only the engine sees.
  const selected=new Set(candidates.slice(0,Math.floor(budget/2)));
  candidates.sort((a,b)=>b.rough-a.rough||a.group.localeCompare(b.group)
    || a.key.localeCompare(b.key));
  // Separate opportunity budgets for new/existing and full/protected pickups.
  // Quality ranks each group; generation order cannot consume the whole budget.
  const groups=[...new Set(candidates.map(c=>c.group))];
  const reserved=Math.floor((budget-selected.size)/Math.max(1,groups.length));
  for(const group of groups) for(const c of candidates.filter(c=>c.group===group).slice(0,reserved)) selected.add(c);
  for(const c of candidates) {if(selected.size>=budget)break;selected.add(c);}
  for (const {destination,quote} of selected) {
    const next=copy(s), held=next.players[botIndex];
    const taken=next.discard.splice(next.discard.length-quote.count,quote.count);
    held.hand.push(...taken); next.hasDrawnThisTurn=true;
    notifyBossDiscardTaken(next,p.id,taken);
    const move={meldIndex:destination.meldIndex,cardIds:[...destination.handCardIds,top.id]};
    const played=simulateBossMove(next,botIndex,move);
    if (!played) continue;
    notifyBossPurchaseCompleted(played,p.id);
    const after=played.players[botIndex], board=played.teams[p.teamId].melds;
    const marginals=cooperativeHandMarginals(after.hand,board);
    const useful=after.hand.filter(c=>c.joker || marginals.get(c.id)>0).length;
    const isolated=Math.max(0,after.hand.length-useful);
    const score=deadlineValue(played,botIndex)-baseline-isolated*(s.stock.length<=15?2:1)
      + move.cardIds.map(id=>next.players[botIndex].hand.find(c=>c.id===id)).filter(c=>c && !c.joker&&String(c.rank)!=='2').length*12;
    results.push({intent:destination.meldIndex==null?{wants:true,action:'new',handIndexes:destination.handCardIds.map(id=>p.hand.findIndex(c=>c.id===id))}
      :{wants:true,action:'extend',meldIndex:destination.meldIndex,handIndexes:destination.handCardIds.map(id=>p.hand.findIndex(c=>c.id===id))},
      quote,score, useful, isolated});
  }
  return results.sort((a,b)=>b.score-a.score);
}

// Conservative cooperation: a visible partner contribution demonstrates suit
// interest, not possession of an unseen rank. Capped benefit never sacrifices a
// connected own sequence/wildcard. No persistent history is stored in saves.
export function cooperativeDiscardAdjustment(state,botIndex,card) {
  const s=bossObservableState(state,botIndex),p=s.players[botIndex], melds=s.teams[p.teamId].melds;
  const own=cooperativeHandValue(p.hand,melds)-cooperativeHandValue(p.hand.filter(c=>c.id!==card.id),melds);
  if (card.joker || String(card.rank)==='2' || own>=7) return 0;
  const actions=[...(s.publicActions || []),s.lastAction].filter(Boolean);
  const ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const interested=actions.some(a=>['meldNew','meldExtend'].includes(a.type) && a.playerId!==p.id
    && s.players.some(o=>o.id===a.playerId && o.teamId===p.teamId)
    && (a.cards || []).some(c=>c.suit===card.suit && !c.joker
      && Math.abs(ranks.indexOf(String(c.rank))-ranks.indexOf(String(card.rank)))<=2));
  const bonus=interested && s.discard.length>=8 ? 6 : 0;
  return bonus ? -bonus : 0;
}

export function rankBossDiscards(state,botIndex) {
  const s=bossObservableState(state,botIndex),p=s.players[botIndex],base=deadlineValue(s,botIndex);
  return p.hand.filter(c=>c.id!==s.pickedDiscardCardId && !isBossCardBlocked(s,p.id,c.id,'discard')).map(card=>{
    const next=copy(s),player=next.players[botIndex];player.hand=player.hand.filter(c=>c.id!==card.id);next.discard.push(card);
    notifyBossCardDiscarded(next,p.id,card);
    let opportunity=card.joker || String(card.rank)==='2' ? 50*reserveWeight(s) : 0;
    // A playable extension reaching discard may have been deliberately held to
    // avoid an unsafe finish. Never treat that card as an expendable singleton.
    for (const meld of s.teams[p.teamId].melds) {
      const after=[...meld,card];
      if (!isValidBossSequence(after)) continue;
      opportunity=Math.max(opportunity,15+Math.max(0,teamFutureValue([after])-teamFutureValue([meld])));
    }
    return {cardId:card.id,score:deadlineValue(next,botIndex)-base-cooperativeDiscardAdjustment(s,botIndex,card)-opportunity};
  }).sort((a,b)=>b.score-a.score || a.cardId.localeCompare(b.cardId));
}
