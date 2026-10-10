// Both strategy AND canonical rules are isolated. Headless BOT+BOT evidence,
// not a human win-rate estimate. Focused cohort starts with a living Devorador.
import {writeFile,appendFile} from 'node:fs/promises';
import {loadBossBaseline} from './boss-baseline-loader.mjs';
import {BossBuracoBot} from '../boss-bot.js';
import * as fixture from '../tests/boss-cooperative-fixture.mjs';
import * as rules from '../js/boss/boss-engine.js';
const ref=process.argv[2]||'72d2472',count=Number(process.argv[3]||8),start=Number(process.argv[4]||7300);
const output=process.argv[5]||'.cache/nemesis-final-battles.jsonl';
const baseline=await loadBossBaseline(ref,{includeFixtures:true});
async function battle(Bot,f,r,seed,focused) {
  const s=f.deal('nemesis',seed),engine=f.fixtureEngine(s);
  const Fast=class extends Bot {
    static getPlannerWorker(){return null;}
    static async sleep(_ms,engine,signal){this.assertActive(engine,signal);}
    static async paceBetweenActions(engine,signal){this.assertActive(engine,signal);}
  };
  if(focused){const e=s.boss.combatEntities.find(e=>e.id==='devourer');e.status='persistent';e.hp=e.maxHp;r.normalizeBossState(s);}
  let turns=0,reason='turn_limit',heals=0,healEventIds=new Set();
  for(;turns<100&&!s.boss.result;turns++) {
    f.advance(s);if(s.boss.pendingChoices.length){reason='unsupported_choice';break;}
    if(!s.stock.length&&!s.deadPiles.some(p=>p.length)){r.applyBossResourceDefeat(s);break;}
    const turn=s.turnNumber;
    try{await Fast.playTurn(s,s.currentPlayer,engine);}catch(error){if(!s.boss.result)throw error;}
    for(const e of s.boss.eventLog)if(e.type==='bossHeal'&&e.sourceEntityId==='devourer')healEventIds.add(e.actionId);
    if(turn===s.turnNumber&&!s.boss.result){reason='adapter_stalled';break;}
    const cards=[...s.players.flatMap(p=>p.hand),...s.teams.flatMap(t=>t.melds.flat()),...s.stock,...s.discard,...s.deadPiles.flat()];
    if(cards.length!==108||new Set(cards.map(c=>c.id)).size!==108)throw Error('Physical card conservation failed');
  }
  heals=healEventIds.size;
  return {seed,cohort:focused?'living-devourer':'natural',turns,heals,healing:s.boss.devourerHealingTotal||0,
    bossHp:s.boss.hp,victory:s.boss.result?.victory??null,reason:s.boss.result?.reason||reason,...engine.metrics};
}
try {
  await writeFile(output,'');
  for(const focused of [false,true])for(let i=0;i<count;i++)for(const [version,Bot,f,r] of [
    ['old',baseline.BossBuracoBot,baseline.fixture,baseline.rules],['new',BossBuracoBot,fixture,rules]]) {
    const result={version,baseline:baseline.revision,...await battle(Bot,f,r,start+i,focused)};
    await appendFile(output,JSON.stringify(result)+'\n');console.log(JSON.stringify(result));
  }
} finally {await baseline.dispose();}
