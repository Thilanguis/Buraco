// Same physical deck/seeds, actual old/new BossBuracoBot decisions. No human win
// rate claim: headless adapter is not Firebase/browser orchestration or a human.
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {BossBuracoBot} from '../boss-bot.js';
import {deal,fixtureEngine,advance} from '../tests/boss-cooperative-fixture.mjs';
import {applyBossResourceDefeat} from '../js/boss/boss-engine.js';
const baselineRef=process.argv[2] || 'HEAD';
let oldSource=execFileSync('git',['show',`${baselineRef}:boss-bot.js`],{encoding:'utf8'});
oldSource=oldSource.replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${new URL('../'+p.slice(2),import.meta.url).href}'`);
const Old=(await import('data:text/javascript;base64,'+Buffer.from(oldSource).toString('base64'))).BossBuracoBot;
function fast(Bot) {return class extends Bot {
  static getPlannerWorker(){return null;}
  static async sleep(_ms,engine,signal){this.assertActive(engine,signal);}
  static async paceBetweenActions(engine,signal){this.assertActive(engine,signal);}
};}
export async function compareBattle(Bot,bossId,seed,{mixed=false,maxTurns=100}={}) {
  const s=deal(bossId,seed),engine=fixtureEngine(s),Fast=fast(Bot),Partner=fast(Old),times=[];
  if(mixed)s.players[1].isBot=false;
  let idle=0,reason='turn_limit',turns=0;
  for(;turns<maxTurns&&!s.boss.result;turns++) {
    advance(s);if(s.boss.pendingChoices.length){reason='unsupported_choice';break;}
    if(!s.stock.length&&!s.deadPiles.some(p=>p.length)){applyBossResourceDefeat(s);reason=s.boss.result?.reason||'resources';break;}
    const before=engine.metrics.moves+engine.metrics.damage,turn=s.turnNumber,index=s.currentPlayer;
    const start=performance.now();
    try {await (mixed&&index===1?Partner:Fast).playTurn(s,index,engine);}
    catch(error){if(!s.boss.result)throw new Error(`${error.name}: ${error.message}`);}
    times.push(performance.now()-start);
    if(engine.metrics.moves+engine.metrics.damage===before)idle++;
    if(turn===s.turnNumber&&!s.boss.result){reason='adapter_stalled';break;}
    const cards=[...s.players.flatMap(p=>p.hand),...s.teams.flatMap(t=>t.melds.flat()),...s.stock,...s.discard,...s.deadPiles.flat()];
    if(cards.length!==108||new Set(cards.map(c=>c.id)).size!==108)throw Error('Physical card conservation failed');
  }
  const sorted=times.slice().sort((a,b)=>a-b);
  return {bossId,seed,pair:mixed?'scripted-human+BOT':'BOT+BOT',...engine.metrics,idle,turns,
    reason:s.boss.result?.reason||reason,victory:s.boss.result?.victory??null,
    decisionMeanMs:times.reduce((a,b)=>a+b,0)/(times.length||1),decisionP95Ms:sorted[Math.floor(sorted.length*.95)]||0};
}
const count=Number(process.argv[3]||3),start=Number(process.argv[4]||7300);
for(const bossId of ['nemesis','matriarca_esmeralda'])for(const mixed of [false,true])for(let i=0;i<count;i++) {
  for(const [version,Bot] of [['old',Old],['new',BossBuracoBot]]) {
    const result=await compareBattle(Bot,bossId,start+i,{mixed});console.log(JSON.stringify({version,baselineRef,...result}));
  }
}
