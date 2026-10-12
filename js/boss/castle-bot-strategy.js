// Policy only: eligibility and the actual sacrifice are always canonical.
import { bossObservableState,cooperativeHandValue } from '../game/bot-planner.js';
import { canUseCastleItem,useCastleItem,isValidBossSequence,classifyBossMeldKind,completeBossPlayerTurn } from './boss-engine.js';
import { dangerCost } from './boss-bot-strategy.js';
import { BOSS_DAMAGE_BY_KIND } from './bosses/banker.js';
import { castleRules,castleFrozen,bloodLinkRemaining,livingDaughters } from './dimitrescu-castle.js';
function deadlineRisk(state,index) {
  const clone=JSON.parse(JSON.stringify(state)),round=clone.boss.roundNumber;
  completeBossPlayerTurn(clone,clone.players[index].id,{deferNextBossTurn:true});
  for(const p of clone.players)if(clone.boss.roundNumber===round
    && !clone.boss.playersActedThisRound.includes(p.id))completeBossPlayerTurn(clone,p.id,{deferNextBossTurn:true});
  return dangerCost(clone);
}
export function rankCastleBotItems(state,playerId) {
  const index=state.players.findIndex(p=>p.id===playerId);
  if(index<0||state.boss?.id!=='dimitrescu')return [];
  const s=bossObservableState(state,index),player=s.players[index],boss=s.boss,board=s.teams[player.teamId].melds;
  const handValue=cooperativeHandValue(player.hand,board),ranked=[],baselineRisk=deadlineRisk(s,index);
  for(const card of player.hand) {
    const metadata=boss.castleItems?.[card.id];if(!metadata||metadata.consumed)continue;
    const costHand=Math.max(0,handValue-cooperativeHandValue(player.hand.filter(c=>c.id!==card.id),board))*8;
    let opportunity=costHand+(card.joker||String(card.rank)==='2'?200:0);
    for(const meld of board) {
      const after=[...meld,card];if(!isValidBossSequence(after))continue;
      const gain=Math.max(0,BOSS_DAMAGE_BY_KIND[classifyBossMeldKind(after)]-BOSS_DAMAGE_BY_KIND[classifyBossMeldKind(meld)]);
      opportunity=Math.max(opportunity,costHand+gain+(gain?75:15));
    }
    for(const target of livingDaughters(boss)) {
      if(!canUseCastleItem(s,playerId,card.id,target.id))continue;
      // A fresh global freeze is worth preserving for the next opportunity.
      if(metadata.type==='cold_flask'&&castleFrozen(boss))continue;
      const probe=JSON.parse(JSON.stringify(s));
      const event=useCastleItem(probe,playerId,card.id,target.id);if(!event)continue;
      const after=probe.boss.combatEntities.find(d=>d.id===target.id),rules=castleRules(boss);
      const immediate=(boss.hp-probe.boss.hp)+(bloodLinkRemaining(boss)-bloodLinkRemaining(probe.boss))
        +Math.max(0,target.hp-after.hp);
      const petrification=Math.max(0,target.maxHp-after.maxHp)*.4;
      // Finite horizon is evaluation, not a new duration or stacking rule.
      let future=0;
      if(after.hp>0) {
        if(!target.daggerLink&&after.daggerLink)future=Math.min(boss.hp,after.hp*rules.daggerTransfer)*.5;
        if(!target.hemorrhage&&after.hemorrhage)future=after.hemorrhage.amount*3;
        if(target.regeneration>after.regeneration)future+=(target.regeneration-after.regeneration)*3;
        if(!target.relicAttackBonus&&after.relicAttackBonus)future+=after.hp*rules.relicAttackBonus;
        if(!castleFrozen(boss)&&castleFrozen(probe.boss))future+=livingDaughters(boss).reduce((sum,d)=>sum+d.regeneration,0)*2;
        if(!target.cold&&after.cold)future+=target.regeneration;
        if(target.relicRound==null&&after.relicRound!=null)future+=40;
      }
      const victory=probe.boss.result?.victory===true;
      const riskDelta=victory?0:deadlineRisk(probe,index)-baselineRisk;
      const score=(victory?100000:immediate+petrification+future-riskDelta)-opportunity;
      if(score>0)ranked.push({cardId:card.id,daughterId:target.id,score,
        diagnostics:{immediate,petrification,future,riskDelta,opportunity,victory}});
    }
  }
  return ranked.sort((a,b)=>b.score-a.score||a.cardId.localeCompare(b.cardId)||a.daughterId.localeCompare(b.daughterId));
}
