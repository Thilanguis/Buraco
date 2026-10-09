// Test-only bounded counterfactual, not an oracle/global-optimality metric.
import {bossObservableState} from '../js/game/bot-planner.js';
import {simulateBossMove} from '../js/boss/boss-bot-strategy.js';
import {classifyBossMeldKind,isBossCardNaturalInSequence,completeBossPlayerTurn} from '../js/boss/boss-engine.js';
const wild=(c,m)=>c.joker||c.forceWild||(String(c.rank)==='2'&&!isBossCardNaturalInSequence(m,c.id));
const good=m=>['limpa','real','asas'].includes(classifyBossMeldKind(m));
function outcome(s,index) {
  const t=structuredClone(s),round=t.boss.roundNumber;
  if(t.boss.defeated&&!t.boss.result)t.boss.result={victory:true,reason:'boss_defeated'};
  completeBossPlayerTurn(t,t.players[index].id,{deferNextBossTurn:true});
  for(const p of t.players) if(t.boss.roundNumber===round&&!(t.boss.playersActedThisRound||[]).includes(p.id)) completeBossPlayerTurn(t,p.id,{deferNextBossTurn:true});
  return {loss:t.boss.result?.victory===false?1:0,win:t.boss.result?.victory===true?1:0,
    danger:Number(t.boss.id==='matriarca_esmeralda'?t.boss.bloom:t.boss.danger)||0,
    hp:Number(t.boss.hp||0)+Number(t.boss.bloodLinkProtection||0)+(t.boss.combatEntities||[]).reduce((n,e)=>n+(['alive','persistent'].includes(e.status)?Number(e.hp||0):0),0),
    clean:t.teams[t.players[index].teamId].melds.filter(good).length};
}
export function auditWildcardMove(state,index,move) {
  const s=bossObservableState(state,index),next=simulateBossMove(s,index,move);
  if(!next)return {spent:0,dominated:0,useful:0,unproved:0,naturalTwos:0,twosWild:0};
  const p=s.players[index],m=next.teams[p.teamId].melds[move.meldIndex??s.teams[p.teamId].melds.length];
  const cards=p.hand.filter(c=>move.cardIds.includes(c.id)),spent=cards.filter(c=>wild(c,m));
  const result={spent:spent.length,dominated:0,useful:0,unproved:0,
    naturalTwos:cards.filter(c=>String(c.rank)==='2'&&!wild(c,m)).length,
    twosWild:spent.filter(c=>String(c.rank)==='2').length};
  if(!spent.length)return result;
  const actual=outcome(next,index),before=outcome(s,index);
  for(const c of spent) {
    const dominated=p.hand.some(n=>!move.cardIds.includes(n.id)&&!n.joker&&!n.forceWild&&(()=>{
      const alternative=simulateBossMove(s,index,{...move,cardIds:move.cardIds.map(id=>id===c.id?n.id:id)});
      if(!alternative)return false;
      if(wild(n,alternative.teams[p.teamId].melds[move.meldIndex??s.teams[p.teamId].melds.length]))return false;
      const remaining=alternative.players[index].hand.length;
      if(remaining<=1&&!s.deadPiles.some(d=>d.length)&&!alternative.teams[p.teamId].melds.some(good))return false;
      const a=outcome(alternative,index);
      return a.loss<=actual.loss&&a.win>=actual.win&&a.danger<=actual.danger&&a.hp<=actual.hp&&a.clean>=actual.clean;
    })());
    if(dominated)result.dominated++;
    else if(actual.loss<before.loss||actual.danger<before.danger||actual.clean>before.clean||actual.win>before.win||actual.hp<before.hp)result.useful++;
    else result.unproved++;
  }
  return result;
}
