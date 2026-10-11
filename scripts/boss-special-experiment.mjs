// Paired scripted-policy battles, not measured human success rates. The Special
// spending policy lives only in this experiment; production BOTs never invoke it.
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { BossBuracoBot } from '../boss-bot.js';
import { deal, fixtureEngine } from '../tests/boss-cooperative-fixture.mjs';
import * as rules from '../js/boss/boss-engine.js';
import { listBossDefinitions } from '../js/boss/boss-registry.js';

class FastPolicy extends BossBuracoBot {
  static getPlannerWorker() { return null; }
  static async sleep(_ms, engine, signal) { this.assertActive(engine, signal); }
  static async paceBetweenActions(engine, signal) { this.assertActive(engine, signal); }
}
export const physicalCards = s => [...s.players.flatMap(p=>p.hand), ...s.teams.flatMap(t=>t.melds.flat()),
  ...s.stock, ...s.discard, ...s.deadPiles.flat(), ...Object.values(s.boss.vaultsByPlayer || {}).map(v=>v.card).filter(Boolean),
  ...(s.boss.combatEntities || []).flatMap(e=>e.sacrificedCards || [])];

export async function specialBattle(bossId, seed, enabled, {maxTurns=180}={}) {
  const s=deal(bossId,seed), engine=fixtureEngine(s), trace=[], eligibility=[], selections=[];
  s.players.forEach((p,i)=>{p.name=`Política ${i+1}`;});
  if(bossId==='dimitrescu') rules.distributeCastleItems(s.boss,physicalCards(s));
  const usedItems=[];
  const recycle=()=>{
    if(s.stock.length)return;
    const index=s.deadPiles.findIndex(p=>p.length);if(index<0)return;
    const pile=s.deadPiles[index];s.deadPiles[index]=[];
    // Same Fisher–Yates rule as the app, but a seed per physical Morto keeps
    // the comparison reproducible even when the two arms recycle at other turns.
    let value=(seed ^ Math.imul(index+1,0x9e3779b9))>>>0;
    for(let i=pile.length-1;i>0;i--){value=(Math.imul(value,1664525)+1013904223)>>>0;
      const j=Math.floor(value/4294967296*(i+1));[pile[i],pile[j]]=[pile[j],pile[i]];}
    s.stock.push(...pile);
  };
  const items=id=>{
    for(let n=0;n<15;n++) {
      const choice=rules.getCastleBotItem(s,id);if(!choice)break;
      const event=rules.useCastleItem(s,id,choice.cardId,choice.daughterId);if(!event)break;
      usedItems.push({turn:s.turnNumber,...choice,type:event.itemType});
    }
  };
  const resolveChoice = async playerId => {
    const choice=rules.getBossPendingChoice(s,playerId); if(!choice)return;
    let option=FastPolicy.chooseDominatrixPendingChoice(s,playerId,choice) || choice.options[0];
    if(['fixed_interest_payment','banker_collateral_card'].includes(choice.type)) option=rules.chooseBossFixedInterestBotOption(s,choice) || option;
    if(choice.correctOption && choice.type!=='discard_mirror')option=choice.correctOption;
    if(choice.type==='discard_mirror')option=choice.options[(s.turnNumber+playerId)%choice.options.length];
    if(!rules.resolveBossChoice(s,playerId,option))throw Error(`Unresolved choice ${choice.type}`);
  };
  engine.resolvePendingBossChoice=resolveChoice;
  // Correct the historical fixture's two-card simplification: Boss normal draw
  // is ONE card, plus real financed cards. Cofre decisions use canonical hooks.
  engine.executeDrawStock=async index=>{
    if(s.hasDrawnThisTurn)return false;
    const player=s.players[index];
    if(rules.getBossVault(s,index) && (rules.isBossVaultDrawRequired(s,index)||rules.shouldBossBotReclaimVault(s,index))) {
      const event=rules.reclaimBossVault(s,index);if(event)return true;
    }
    const extra=rules.consumeBossExtraDraw(s,index), cards=[];
    for(let n=0;n<1+extra;n++) {
      recycle();
      if(!s.stock.length){if(!n)rules.applyBossResourceDefeat(s);break;}
      const card=s.stock.pop();player.hand.push(card);cards.push(card);
    }
    if(extra)rules.registerBossFinancedCards(s,index,cards.slice(-extra));
    s.hasDrawnThisTurn=true;s.partialDraw=false;rules.deferBossVault(s,index);
    rules.notifyBossPurchaseCompleted(s,index);items(index);engine.metrics.stockDraws++;return true;
  };
  const drawDiscard=engine.executeDrawDiscardFechado;
  engine.executeDrawDiscardFechado=async(index,intent)=>{
    if(rules.isBossVaultDrawRequired(s,index))return false;
    const result=await drawDiscard(index,intent);if(result){rules.deferBossVault(s,index);items(index);}return result;
  };
  engine.executeDiscard=async(index,cardIndex)=>{
    const player=s.players[index],card=player.hand[cardIndex];
    if(!card||card.id===s.pickedDiscardCardId||rules.isBossCardBlocked(s,player.id,card.id,'discard'))return false;
    if(player.hand.length===1&&!engine.canTeamTakeDeadNow()&&!engine.teamHasGoodCanastra(0))return false;
    rules.notifyBossCardDiscarded(s,player.id,card);player.hand.splice(cardIndex,1);s.discard.push(card);
    if(!player.hand.length&&engine.canTeamTakeDeadNow()){
      const pile=s.deadPiles.find(p=>p.length);player.hand.push(...pile.splice(0));s.deadChunksTaken[0]++;rules.applyBossDeadTaken(s);
    }
    if(!player.hand.length){rules.applyBossFinalStrike(s,0,player.id);}
    // App finishes exhausted resources BEFORE end-of-turn passives, not after.
    if(!s.boss.result&&!s.stock.length&&!s.deadPiles.some(p=>p.length))rules.applyBossResourceDefeat(s);
    if(s.boss.result){s.finished=true;return true;}
    rules.completeBossPlayerTurn(s,player.id);s.currentPlayer=(index+1)%2;s.turnNumber++;s.hasDrawnThisTurn=false;s.pickedDiscardCardId=null;
    recycle();return true;
  };
  engine.shouldForceStockDraw=id=>rules.isBossVaultDrawRequired(s,id)||rules.shouldBossBotReclaimVault(s,id);
  const auditDeck=()=>{const cards=physicalCards(s);if(cards.length!==108||new Set(cards.map(c=>c.id)).size!==108)throw Error(`108 IDs failed ${bossId}:${seed}`);};
  const seenSelections=new Set();
  const flow=async()=>{
    for(let n=0;n<60&&!s.boss.result;n++) {
      if(s.boss.pendingChoices.length){for(const choice of [...s.boss.pendingChoices])await resolveChoice(choice.playerId);continue;}
      if(!s.boss.bossFlow || s.boss.bossFlow.stage==='players')break;
      if(s.boss.bossFlow.queue?.[0]?.kind==='ability') {
        const def=listBossDefinitions().find(d=>d.id===bossId);
        eligibility.push({phase:s.boss.phase,round:s.boss.roundNumber,entries:def.abilities.filter(a=>!a.debugOnly&&a.phases.includes(s.boss.phase))
          .map(a=>({id:a.id,eligible:rules.inspectBossAbilityEligibility(structuredClone(s),a.id).eligible}))});
      }
      rules.advanceBossTurn(s,(s.boss.bossFlow.endsAt || 0)+1);
      const intent=s.boss.currentIntent;
      if(intent&&!seenSelections.has(intent.id)){seenSelections.add(intent.id);selections.push({phase:intent.announcedPhase,id:intent.abilityId,round:s.boss.roundNumber});}
    }
    auditDeck();
  };
  // deal() already resolves the first announcement; retain it as a selection,
  // but do not invent a pre-selection eligibility observation for that round.
  if(s.boss.currentIntent){seenSelections.add(s.boss.currentIntent.id);selections.push({phase:s.boss.currentIntent.announcedPhase,id:s.boss.currentIntent.abilityId,round:1});}
  let noPlay=0,noDamage=0,maxNoPlay=0,maxNoDamage=0,reason='turn_limit', turns=0;
  const start=performance.now();
  for(;turns<maxTurns&&!s.boss.result;turns++) {
    await flow();if(s.boss.result)break;
    rules.prepareBossVaultTurn(s,s.currentPlayer);
    const before={moves:engine.metrics.moves,damage:s.boss.stats.totalDamage,
      cards:s.teams[0].melds.flat().length,stock:s.stock.length,earned:s.boss.cooperativeSpecial.earned,
      canastras:s.boss.stats.canastrasFormed,activations:s.boss.cooperativeSpecial.activations};
    const actor=s.players[s.currentPlayer], turn=s.turnNumber;
    // Experimental external controller: spend before normal draw whenever ready.
    // Same current-player recipient and same playing policy in both paired arms.
    if(enabled&&s.boss.cooperativeSpecial.points>=100&&s.discard.length>=5) {
      actor.isBot=false;
      try{rules.activateBossSpecial(s,{actorId:actor.id,recipientId:actor.id,actionId:`experiment:${seed}:${turn}`});}
      finally{actor.isBot=true;}
    }
    try { await FastPolicy.playTurn(s,s.currentPlayer,engine); }
    catch(error) { if(!s.boss.result)throw new Error(`${bossId}:${seed}:${enabled}:${turn}: ${error.message} ${JSON.stringify({turnNow:s.turnNumber,player:s.currentPlayer,allHands:s.players.map(p=>p.hand),drawn:s.hasDrawnThisTurn,dead:s.deadChunksTaken,flow:s.boss.bossFlow,choices:s.boss.pendingChoices})}`,{cause:error}); }
    const played=engine.metrics.moves-before.moves,damage=s.boss.stats.totalDamage-before.damage;
    noPlay=played?0:noPlay+1;noDamage=damage?0:noDamage+1;
    maxNoPlay=Math.max(maxNoPlay,noPlay);maxNoDamage=Math.max(maxNoDamage,noDamage);
    trace.push({turn,round:s.boss.roundNumber,phase:s.boss.phase,playedMoves:played,damage,
      hands:s.players.map(p=>p.hand.length),stockBefore:before.stock,stock:s.stock.length,discard:s.discard.length,
      deadTaken:s.deadChunksTaken[0],deadRemaining:s.deadPiles.map(p=>p.length),
      canastras:s.boss.stats.canastrasFormed-before.canastras,earned:s.boss.cooperativeSpecial.earned,
      gained:s.boss.cooperativeSpecial.earned-before.earned,points:s.boss.cooperativeSpecial.points,
      activations:s.boss.cooperativeSpecial.activations-before.activations,received:s.boss.cooperativeSpecial.cardsReceived,
      noPlay,noDamage});
    auditDeck();
    if(s.turnNumber===turn&&!s.boss.result){reason='adapter_stalled';break;}
  }
  if(s.boss.result)reason=s.boss.result.reason;
  return {bossId,seed,enabled,turns:trace.length,result:s.boss.result?.victory ?? null,reason,
    durationCpuMs:performance.now()-start,maxNoPlay,maxNoDamage,activations:s.boss.cooperativeSpecial.activations,
    received:s.boss.cooperativeSpecial.cardsReceived,earned:s.boss.cooperativeSpecial.earned,
    hands:s.players.map(p=>p.hand.length),stock:s.stock.length,canastras:s.boss.stats.canastrasFormed,
    usedItems,trace,eligibility,selections};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const count=Number(process.argv[2]||24),start=Number(process.argv[3]||101001),rows=[];
  await mkdir('docs/experiments',{recursive:true});
  for(const def of listBossDefinitions()) {
    for(let i=0;i<count;i++)for(const enabled of [false,true])rows.push(await specialBattle(def.id,start+i,enabled));
    console.log(JSON.stringify({bossId:def.id,battles:count*2,finished:rows.filter(r=>r.bossId===def.id&&r.result!==null).length}));
  }
  await writeFile('docs/experiments/chefe-especial-pareado-2026-10-10.json',JSON.stringify({
    method:'Same physical deck, seeds and BossBuracoBot card-play policy, with identical canonical item chooser after normal purchases in both arms. External human-like Special controller uses exactly 5 discard cards when available and unblocked, not stock. Not production BOT automation or human win rate. Normal draw 1 plus financing; seeded Fisher–Yates Morto recycling; resource defeat before end-turn passives; no real-time pacing. CPU duration and turns only.',count,start,rows},null,2));
}
