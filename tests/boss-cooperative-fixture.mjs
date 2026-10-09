import * as rules from '../js/boss/boss-engine.js';
import {auditWildcardMove} from './boss-wildcard-audit.mjs';
function random(seed) {
  return () => {seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);
    t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
}
export const card=(id,rank='K',suit='♦')=>({id,rank,suit});
export function scenario({bossId='nemesis',stock=30,partnerBot=false}={}) {
  const s={mode:bossId==='matriarca_esmeralda'?'boss_matriarca':`boss_${bossId}`,variant:'fechado',
    currentPlayer:0,turnNumber:1,hasDrawnThisTurn:true,
    players:[{id:0,name:'BOT',isBot:true,teamId:0,hand:[]},{id:1,name:'Parceiro',isBot:partnerBot,teamId:0,hand:[card('hidden')]}],
    teams:[{id:0,melds:[]},{id:1,melds:[]}],stock:Array.from({length:stock},(_,i)=>card(`stock:${i}`)),
    discard:[],deadPiles:[[],[]],deadChunksTaken:[0,0],deadChunksMax:[2,0],boss:rules.createBossState(bossId,73)};
  s.boss.bossFlow=null;return s;
}
export function deal(bossId,seed) {
  const s=scenario({bossId,partnerBot:true}),rng=random(seed),deck=[];
  for(let copy=0;copy<2;copy++) {
    for(const suit of ['♠','♥','♦','♣']) for(const rank of ['A','2','3','4','5','6','7','8','9','10','J','Q','K'])
      deck.push(card(`${copy}:${suit}:${rank}`,rank,suit));
    for(let j=0;j<2;j++)deck.push({id:`joker:${copy}:${j}`,rank:'JOKER',joker:true});
  }
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  for(const p of s.players)p.hand=deck.splice(0,11);
  s.deadPiles=[deck.splice(0,11),deck.splice(0,11)];s.discard=deck.splice(0,1);s.stock=deck;
  s.hasDrawnThisTurn=false;s.boss=rules.createBossState(bossId,seed);
  rules.beginBossTurn(s,{first:true,now:1000});advance(s);return s;
}
export function advance(s) {
  for(let i=0;i<30 && s.boss.bossFlow?.stage!=='players' && !s.boss.result;i++) {
    if(s.boss.pendingChoices.length) break;
    rules.advanceBossTurn(s,(s.boss.bossFlow?.endsAt || 0)+1);
  }
}
export function fixtureEngine(s,{auditWildcards=false}={}) {
  const metrics={clean:0,damage:0,bossDamage:0,minionDamage:0,fullPickups:0,partialPickups:0,wasted:0,moves:0,stockDraws:0,
    wildcardSpent:0,wildcardDominated:0,wildcardUseful:0,wildcardUnproved:0,twosWild:0,naturalTwos:0,auditMs:0};
  const recordDamage=event=>{const applied=Number(event?.appliedDamage || 0);metrics.damage+=applied;
    metrics[event?.targetId==='boss'?'bossDamage':'minionDamage']+=applied;};
  const canDead=()=>s.deadChunksTaken[0]<s.deadChunksMax[0] && s.deadPiles.some(p=>p.length);
  const good=id=>s.teams[id].melds.some(m=>['limpa','real','asas'].includes(rules.classifyBossMeldKind(m)));
  const takeDead=p=>{const pile=s.deadPiles.findIndex(a=>a.length);if(pile<0||!canDead())return false;
    p.hand.push(...s.deadPiles[pile].splice(0));s.deadChunksTaken[0]++;rules.applyBossDeadTaken(s);return true;};
  const normalize=cards=>{for(const c of cards)if(String(c.rank)==='2') {c.forceNatural=false;c.forceWild=false;}
    for(const c of cards)if(String(c.rank)==='2')c.forceNatural=rules.isBossCardNaturalInSequence(cards,c.id);};
  const safeFinish=()=>{const probe=structuredClone(s);rules.applyBossFinalStrike(probe);return probe.boss.result?.victory===true;};
  const engine={metrics,getState:()=>s,isActive:()=>!s.finished,showMessage:()=>{},commitState:async()=>{},
    paceBetweenActions:async()=>{},normalizeMeld:normalize,canTeamTakeDeadNow:canDead,teamHasGoodCanastra:good,
    canSafelyFinishBoss:safeFinish,isValidSequenceMeld:rules.isValidBossSequence,
    computeTeamMeldScore:t=>({total:t.melds.reduce((n,m)=>n+m.length*10,0)}),
    canCreateMeld:id=>rules.canBossCreateMeld(s,id),hasPendingBossChoice:()=>rules.hasPendingBossChoices(s),
    isMeldLocked:(team,m)=>rules.isBossMeldLocked(s,team,m)||!rules.canBossUseMeld(s,s.players[s.currentPlayer].id,m),
    isCardBlocked:(id,c,a)=>rules.isBossCardBlocked(s,id,c,a),isDiscardBlocked:()=>rules.isBossDiscardBlocked(s),
    quoteDiscardPickup:(id,d)=>rules.quoteBossDiscardPickup(s,id,d),
    getNaturePriorities:id=>rules.getBossNaturePriorities(s,id),getCombatPriorities:id=>rules.getBossCombatPriorities(s,id),
    getDimitrescuPriorities:id=>rules.getBossDimitrescuPriorities(s,id),getNeheleniaPriorities:id=>rules.getBossNeheleniaPriorities(s,id),
    getDominatrixPriorities:id=>rules.getBossDominatrixPriorities(s,id),
    shouldTakeBossDiscard:(id,intent,naturePlan)=>rules.shouldBossBotTakeDiscard(s,id,{intent,naturePlan}),
    executeMeldNew:async(i,indexes)=>play(i,null,indexes),executeMeldExtend:async(i,m,indexes)=>play(i,m,indexes),
    executeDrawStock:async i=>{const p=s.players[i];if(!s.stock.length){const pile=s.deadPiles.find(a=>a.length);if(pile)s.stock.push(...pile.splice(0));}
      p.hand.push(...s.stock.splice(-Math.min(2,s.stock.length)));s.hasDrawnThisTurn=true;metrics.stockDraws++;rules.notifyBossPurchaseCompleted(s,p.id);return true;},
    executeDrawDiscardFechado:async(i,intent)=>{
      const p=s.players[i],ids=(intent.handIndexes||[]).map(j=>p.hand[j]?.id),m=intent.action==='extend'?intent.meldIndex:null;
      const quote=rules.quoteBossDiscardPickup(s,p.id,{meldIndex:m,handCardIds:ids});if(!quote.allowed)return false;
      const top=s.discard.at(-1),taken=s.discard.splice(-quote.count);p.hand.push(...taken);
      rules.notifyBossDiscardTaken(s,p.id,taken);s.hasDrawnThisTurn=true;
      if(quote.protected)metrics.partialPickups++;else metrics.fullPickups++;
      const ok=play(i,m,[...ids,top.id].map(id=>p.hand.findIndex(c=>c.id===id)));
      rules.notifyBossPurchaseCompleted(s,p.id);return ok;},
    executeDiscard:async(i,index)=>{
      const p=s.players[i],c=p.hand[index];if(!c || c.id===s.pickedDiscardCardId||rules.isBossCardBlocked(s,p.id,c.id,'discard'))return false;
      if(p.hand.length===1 && !canDead() && !good(0))return false;
      p.hand.splice(index,1);s.discard.push(c);rules.notifyBossCardDiscarded(s,p.id,c);
      if(!p.hand.length&&!takeDead(p)){recordDamage(rules.applyBossFinalStrike(s,0,p.id));s.finished=!!s.boss.result;}
      rules.completeBossPlayerTurn(s,p.id);s.currentPlayer=(i+1)%2;s.turnNumber++;s.hasDrawnThisTurn=false;s.pickedDiscardCardId=null;
      return true;},
  };
  function play(i,m,indexes) {
    const p=s.players[i],team=s.teams[p.teamId],cards=indexes.map(j=>p.hand[j]);
    if(cards.some(c=>!c||rules.isBossCardBlocked(s,p.id,c.id,'play'))||new Set(indexes).size!==indexes.length)return false;
    if(m==null?!rules.canBossCreateMeld(s,p.id):engine.isMeldLocked(team.id,m))return false;
    const auditState=auditWildcards?structuredClone(s):null;
    const before=m==null?[]:team.melds[m],after=[...before,...cards];normalize(after);
    if(!rules.isValidBossSequence(after))return false;
    const left=p.hand.length-cards.length;
    if(left<=1&&!canDead()&&!(good(0)||['limpa','real','asas'].includes(rules.classifyBossMeldKind(after))))return false;
    if(auditState) {
      const start=performance.now(),a=auditWildcardMove(auditState,i,{meldIndex:m,cardIds:cards.map(c=>c.id)});
      metrics.wildcardSpent+=a.spent;metrics.wildcardDominated+=a.dominated;metrics.wildcardUseful+=a.useful;
      metrics.wildcardUnproved+=a.unproved;metrics.twosWild+=a.twosWild;metrics.naturalTwos+=a.naturalTwos;
      metrics.auditMs+=performance.now()-start;
    }
    const oldKind=rules.classifyBossMeldKind(before),newKind=rules.classifyBossMeldKind(after);
    p.hand=p.hand.filter(c=>!cards.includes(c));const index=m??team.melds.length;team.melds[index]=after;
    const event=rules.applyBossMeldTransition(s,{teamId:team.id,playerId:p.id,meldIndex:index,oldKind,newKind,cardsAdded:cards,isNewMeld:m==null});
    metrics.moves++;recordDamage(event);
    if(oldKind==='simple'&&['limpa','real','asas'].includes(newKind))metrics.clean++;
    metrics.wasted+=cards.filter(c=>c.joker&&after.length<7).length;
    s.lastAction={id:`test:${metrics.moves}`,type:m==null?'meldNew':'meldExtend',playerId:p.id,meldIndex:index,cards};
    // Mirror app.js/applyBossMeldTransitionAndFinish: a lethal contribution
    // ends the match immediately, not only after a later final strike.
    if(s.boss.defeated&&!s.boss.result)s.boss.result={victory:true,reason:'boss_defeated',title:'Chefe derrotado',detail:'Contribuição letal.'};
    if(s.boss.result){s.finished=true;return true;}
    if(!p.hand.length&&!takeDead(p)){recordDamage(rules.applyBossFinalStrike(s,0,p.id));s.finished=!!s.boss.result;}
    return true;
  }
  return engine;
}
