// Generated measurements only; never imported by the game.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { CONFIGS, ROUTES, summary } from './dimitrescu-stage2-experiment.mjs';
const input=process.argv[2]||'.cache/dimitrescu-stage2.jsonl';
const output=process.argv[3]||'docs/experiments/dimitrescu-stage2-2026-10-10.json';
const raw=await readFile(input),rows=raw.toString('utf8').trim().split(/\r?\n/).map(JSON.parse).filter(r=>r.kind==='battle');
for(const row of rows)for(const death of row.deaths)death.daughterEffort={...row.daughterEffort[death.id]};
const mean=(rows,read)=>{const values=rows.map(read).filter(v=>v!=null);return values.length?values.reduce((a,v)=>a+v,0)/values.length:null;};
const groups=[];
for(const config of Object.keys(CONFIGS))for(const route of ROUTES){
  const group=rows.filter(r=>r.config===config&&r.route===route);
  if(group.length!==64||group.some((r,i)=>r.seed!==10100+i))throw Error('Expected all paired seeds 10100–10163');
  groups.push({config,route,...summary(group),milestones:Object.fromEntries(['bothDeadTaken','stock30','stock20'].map(key=>{
    const present=group.filter(r=>r.milestones[key]);return [key,{n:present.length,hp:mean(present,r=>r.milestones[key].hp),protection:mean(present,r=>r.milestones[key].protection),turn:mean(present,r=>r.milestones[key].turn),daughterHp: [0,1,2].map(i=>mean(present,r=>r.milestones[key].daughterHp[i]))}];
  })),threeDaughterDeaths:group.filter(r=>r.deaths.length===3).map(r=>({seed:r.seed,deaths:r.deaths,reason:r.reason,hp:r.hp,protection:r.protection})),
  firstDeathRegen:mean(group,r=>r.deaths[0]?.daughterEffort?.regen),firstDeathBleed:mean(group,r=>r.deaths[0]?.daughterEffort?.bleed),firstDeathItemDamage:mean(group,r=>r.deaths[0]?.daughterEffort?.itemDamage)});
}
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify({format:1,source:input,sha256:createHash('sha256').update(raw).digest('hex'),seeds:[10100,10163],n:rows.length,
  controller:'scripted greedy search; NOT production BOT or human win rate',defaultsApplied:false,
  permanentBleedModel:'one existing hemorrhage slot, 1000 rounds > maximum battle horizon',configs:CONFIGS,groups},null,2)+'\n');
console.log(`${rows.length} paired battles, ${groups.length} groups -> ${output}`);
