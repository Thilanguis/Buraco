import { scenario, card } from './boss-cooperative-fixture.mjs';
export const run = (prefix,ranks,suit='♣') => ranks.map(rank=>card(`${prefix}:${rank}`,rank,suit));
export function orderedScenario({points=[0,0],index=0,phase=3,hand=null,melds=[]}={}) {
  const s=scenario({bossId:'dominadora'});
  s.currentPlayer=index;s.players[index].isBot=true;s.players[1-index].isBot=false;
  s.players[index].hand=hand || [card('obey','K','♣'),card('spare','3','♦'),card('keep','Q','♥')];
  s.teams[0].melds=melds;s.boss.phase=phase;s.boss.phaseTransitions=[1,2,3].slice(0,phase);
  s.boss.roundFirstPlayerId=0;s.boss.playersActedThisRound=index===1?[0]:[];
  s.boss.chainsByPlayer={0:points[0]/12.5,1:points[1]/12.5};
  s.boss.activeOrders=[{id:'ordered-clubs',type:'discard_suit',status:'active',targetPlayerId:index,
    sourceAbilityId:'iron_etiquette',announcedPhase:phase,suit:'♣',suitLabel:'Paus',
    eligibleCardIds:s.players[index].hand.filter(c=>!c.joker&&c.suit==='♣').map(c=>c.id)}];
  return s;
}
