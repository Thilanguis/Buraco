// Read-only A/B: prior ranking + current canonical engine, identical public
// scenarios/decks. Historical code is imported in memory, never checked out.
import { execFileSync } from 'node:child_process';
import { pathToFileURL,fileURLToPath } from 'node:url';
import { resolve,dirname } from 'node:path';
import { BossBuracoBot } from '../boss-bot.js';
import * as current from '../js/boss/boss-bot-strategy.js';
import * as rules from '../js/boss/boss-engine.js';
import { card,deal,fixtureEngine } from '../tests/boss-cooperative-fixture.mjs';
import { orderedScenario,run } from '../tests/dominatrix-balance-fixture.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const ref=process.argv[2] || 'HEAD';
const revision=execFileSync('git',['rev-parse','--verify',`${ref}^{commit}`],{cwd:root,encoding:'utf8'}).trim();
function oldModule(file,override={}) {
  const source=execFileSync('git',['show',`${revision}:${file}`],{cwd:root,encoding:'utf8'});
  const code=source.replace(/from\s+(['"])(\.[^'"]+)\1/g,(_,q,path)=>
    `from ${q}${override[path] || pathToFileURL(resolve(root,dirname(file),path)).href}${q}`);
  return 'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
}
const strategyUrl=oldModule('js/boss/boss-bot-strategy.js'),old=await import(strategyUrl);
const {BossBuracoBot:Old}=await import(oldModule('boss-bot.js',{'./js/boss/boss-bot-strategy.js':strategyUrl}));
function outcome(s,id) {
  const next=structuredClone(s),p=next.players[next.currentPlayer],c=p.hand.find(c=>c.id===id);
  p.hand=p.hand.filter(c=>c.id!==id);next.discard.push(c);rules.notifyBossCardDiscarded(next,p.id,c);
  rules.completeBossPlayerTurn(next,p.id,{deferNextBossTurn:true});
  return {cardId:id,order:next.boss.activeOrders[0].status,
    points:next.players.map(p=>Math.round(next.boss.chainsByPlayer[p.id]*125)/10),lost:next.boss.result?.victory===false};
}
console.log(JSON.stringify({baseline:revision,scope:'old ranking on unchanged Dominadora canonical engine'}));
for(const points of [[0,0],[25,20],[47,47],[50,40]])for(const index of [0,1]) {
  const s=orderedScenario({points,index});
  console.log(JSON.stringify({kind:'discard',points,index,before:outcome(s,old.rankBossDiscards(s,index)[0].cardId),
    after:outcome(s,current.rankBossDiscards(s,index)[0].cardId)}));
}
for(const points of [[0,0],[50,40]]) {
  const s=orderedScenario({points,melds:[run('table',['3','4','5','6','7','8'])],
    hand:[card('needed','9','♣'),card('spare','3','♦'),card('keep','K','♥')]});
  const moves=[{meldIndex:0,cardIds:['needed']}];
  console.log(JSON.stringify({kind:'sole-suit-canastra',points,
    before:old.rankBossMoves(s,0,moves)[0],after:current.rankBossMoves(s,0,moves)[0]},
    (key,value)=>key==='next'?undefined:value));
}
function fast(Bot){return class extends Bot {
  static getPlannerWorker(){return null;}
  static async sleep(_ms,engine,signal){this.assertActive(engine,signal);}
  static async paceBetweenActions(engine,signal){this.assertActive(engine,signal);}
};}
async function battle(Bot,seed) {
  const s=deal('dominadora',seed),engine=fixtureEngine(s),Policy=fast(Bot);let turns=0,stop='turn_limit';
  engine.resolvePendingBossChoice=async id=>{
    const choice=rules.getBossPendingChoice(s,id);if(!choice)return;
    const option=Policy.chooseDominatrixPendingChoice(s,id,choice)||choice.options[0];
    if(!rules.resolveBossChoice(s,id,option))throw Error('choice unresolved');
  };
  engine.executeDrawStock=async index=>{
    if(s.hasDrawnThisTurn)return false;
    if(!s.stock.length){const pile=s.deadPiles.find(p=>p.length);if(pile)s.stock.push(...pile.splice(0));}
    if(!s.stock.length){rules.applyBossResourceDefeat(s);return false;}
    s.players[index].hand.push(s.stock.pop());s.hasDrawnThisTurn=true;
    rules.notifyBossPurchaseCompleted(s,s.players[index].id);engine.metrics.stockDraws++;return true;
  };
  for(;turns<180&&!s.boss.result;turns++) {
    for(let n=0;n<60&&!s.boss.result;n++) {
      if(s.boss.pendingChoices.length){for(const c of [...s.boss.pendingChoices])await engine.resolvePendingBossChoice(c.playerId);continue;}
      if(!s.boss.bossFlow||s.boss.bossFlow.stage==='players')break;
      rules.advanceBossTurn(s,(s.boss.bossFlow.endsAt||0)+1);
    }
    if(s.boss.result)break;
    if(!s.stock.length&&!s.deadPiles.some(p=>p.length)){rules.applyBossResourceDefeat(s);break;}
    const before=s.turnNumber;
    try{await Policy.playTurn(s,s.currentPlayer,engine);}catch(e){if(!s.boss.result)throw e;}
    const cards=[...s.players.flatMap(p=>p.hand),...s.teams.flatMap(t=>t.melds.flat()),...s.stock,...s.discard,...s.deadPiles.flat()];
    if(cards.length!==108||new Set(cards.map(c=>c.id)).size!==108)throw Error('physical cards lost');
    if(before===s.turnNumber&&!s.boss.result){stop='adapter_stalled';break;}
  }
  return {turns,reason:s.boss.result?.reason||stop,victory:s.boss.result?.victory??null,hp:s.boss.hp,
    points:s.players.map(p=>Math.round(s.boss.chainsByPlayer[p.id]*125)/10),...engine.metrics};
}
for(const seed of [7300,7301,7302])for(const [version,Bot] of [['before',Old],['after',BossBuracoBot]])
  console.log(JSON.stringify({kind:'BOT+BOT battle',seed,version,...await battle(Bot,seed)}));
