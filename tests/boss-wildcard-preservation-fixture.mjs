import {card,scenario} from './boss-cooperative-fixture.mjs';
import {selectNextBossIntent} from '../js/boss/boss-engine.js';

export function wildcardFixture({kind='joker',stock=61,danger=0,obligation=false,rich=false,lethal=false,natural=false}={}) {
  const s=scenario({stock});s.boss.danger=danger;s.hasDrawnThisTurn=false;
  const ranks=kind==='joker'?['A','JOKER','3']:['10','J','2','K'];
  s.players[0].hand=ranks.map((rank,i)=>({...card(`own:${i}`,rank,rank==='2'?'♥':'♠'),
    ...(rank==='JOKER'?{joker:true}:{})})).concat([card('keep','8','♦'),card('spare','5','♥')]);
  if(natural)s.players[0].hand=[card('own:0','A','♠'),card('own:1','2','♠'),card('own:2','3','♠'),card('keep','8','♦'),card('spare','5','♥')];
  const move={meldIndex:null,cardIds:s.players[0].hand.slice(0,-2).map(c=>c.id)};
  if(obligation) {s.boss.starsPlayerId=0;selectNextBossIntent(s,{debug:true,forcedAbilityId:'stars_hunt'});}
  if(lethal)s.boss.hp=1;
  const pickup=structuredClone(s);
  // A or J as top; the short new game requires the Joker/2 in our own hand.
  const top=pickup.players[0].hand.splice(kind==='joker'||natural?0:1,1)[0];
  pickup.discard=rich?[...Array.from({length:20},(_,i)=>card(`pile:${i}`,String(3+i%8),'♣')),top]:[top];
  return {state:s,pickup,move};
}
