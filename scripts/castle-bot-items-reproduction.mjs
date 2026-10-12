// Ten deterministic decisions, not a balance experiment or win-rate estimate.
import { execFileSync } from 'node:child_process';
import { dirname,resolve } from 'node:path';
import { pathToFileURL,fileURLToPath } from 'node:url';
import { BossBuracoBot } from '../boss-bot.js';
import { castleScenario,appItemEngine } from '../tests/castle-bot-fixture.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const revision=execFileSync('git',['rev-parse','--verify',`${process.argv[2]||'HEAD'}^{commit}`],{cwd:root,encoding:'utf8'}).trim();
function moduleUrl(file,override={}) {
  const source=execFileSync('git',['show',`${revision}:${file}`],{cwd:root,encoding:'utf8'});
  const text=source.replace(/from\s+(['"])(\.[^'"]+)\1/g,(_,q,path)=>`from ${q}${override[path]||pathToFileURL(resolve(root,dirname(file),path)).href}${q}`);
  return 'data:text/javascript;base64,'+Buffer.from(text).toString('base64');
}
const strategy=moduleUrl('js/boss/boss-bot-strategy.js');
const {BossBuracoBot:Old}=await import(moduleUrl('boss-bot.js',{'./js/boss/boss-bot-strategy.js':strategy}));
console.log(JSON.stringify({revision,scope:'processDiscard with real app item/discard methods and current canonical rules'}));
for(const type of ['explosive','dagger','relic','cold_flask','anticoagulant'])for(const [version,Bot] of [['before',Old],['after',BossBuracoBot]]) {
  const s=castleScenario(type),{engine,metrics}=appItemEngine(s);
  await Bot.processDiscard(0,1,engine);
  console.log(JSON.stringify({type,version,discarded:s.discard.at(-1).id,consumed:s.boss.castleItems.item.consumed,
    itemEvents:s.boss.eventLog.filter(e=>e.type==='castleItem').length,commits:metrics.commits,
    attached:s.boss.combatEntities.flatMap(d=>d.sacrificedCards.map(c=>c.id))}));
}
