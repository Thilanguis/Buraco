import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readRows, summarize, distribution } from './canastra-hp-summary.mjs';

const root=resolve(process.argv[2]||'docs/metrics/canastra-hp-2026-10-12');
const directories=[root,...readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>resolve(root,d.name))];
const all=directories.flatMap(readRows), recommendation={banker:'candidate',dominadora:'candidate',
  matriarca_esmeralda:'refined',nehelenia:'candidate',nemesis:'refined',dimitrescu:'refined'};
const cohorts={},compact=[];
for(const [bossId,candidate] of Object.entries(recommendation)) {
  const groups=Object.fromEntries(['current','proposed',candidate].map(scenario=>[scenario,
    new Map(all.filter(r=>r.bossId===bossId&&r.scenario===scenario).map(r=>[r.seed,r]))]));
  const seeds=[...groups.current.keys()].filter(seed=>Object.values(groups).every(map=>map.get(seed)?.complete))
    .sort((a,b)=>a-b).slice(0,100);
  if(seeds.length!==100)throw Error(`${bossId}: only ${seeds.length} complete matched seeds`);
  const rows=Object.fromEntries(Object.entries(groups).map(([k,map])=>[k,seeds.map(seed=>map.get(seed))]));
  const first=rows.current;
  const paired=scenario=>({n:seeds.length,baselineWins:first.filter(r=>r.victory).length,
    wins:rows[scenario].filter(r=>r.victory).length,
    extraActualBonus:distribution(rows[scenario].map((r,i)=>r.damage.bonuses-first[i].damage.bonuses)),
    extraActualMainDamage:distribution(rows[scenario].map((r,i)=>r.damage.mainAttack+r.damage.dagger-first[i].damage.mainAttack-first[i].damage.dagger)),
    hpDifference:distribution(rows[scenario].map((r,i)=>r.hp-first[i].hp)),
    turnDifference:distribution(rows[scenario].map((r,i)=>r.turns-first[i].turns)),
    lossToWin:rows[scenario].filter((r,i)=>r.victory&&!first[i].victory).map(r=>r.seed),
    winToLoss:rows[scenario].filter((r,i)=>!r.victory&&first[i].victory).map(r=>r.seed)});
  cohorts[bossId]={seeds,candidate,
    attemptedByScenario:Object.fromEntries(Object.entries(groups).map(([k,map])=>[k,{attempted:map.size,
      completed:[...map.values()].filter(r=>r.complete).length,censored:[...map.values()].filter(r=>!r.complete).length}])),
    current:summarize(first),proposed:summarize(rows.proposed),recommended:summarize(rows[candidate]),
    pairedProposed:paired('proposed'),pairedRecommended:paired(candidate)};
  for(const [scenario,entries]of Object.entries(rows))for(const r of entries) {
    const {events,hits,actions,...metrics}=r; compact.push({...metrics,cohortScenario:scenario===candidate?'recommended':scenario});
  }
}
const reconciled=all.filter(r=>Math.abs(r.damage.mainAttack+r.damage.dagger-r.damage.bossHealing-r.damage.rebirth-(r.initialHp-r.hp))>.001);
if(reconciled.length)throw Error(`HP accounting mismatch: ${reconciled.length}`);
const manifests=directories.map(d=>JSON.parse(readFileSync(resolve(d,'manifest.json'),'utf8')));
const completion=directories.map(d=>JSON.parse(readFileSync(resolve(d,'completion.json'),'utf8')));
if(completion.some(c=>c.productionFilesChanged.length||c.failed))throw Error('An experiment changed production or failed');
const result={totals:{attempts:all.length,complete:all.filter(r=>r.complete).length,censored:all.filter(r=>!r.complete).length,
  primaryBaseline:600,primaryProposed:600,primaryRecommended:600,healthReconciled:all.length},
  revisions:[...new Set(manifests.map(m=>m.revision))],cohorts};
writeFileSync(resolve(root,'cohort.json'),JSON.stringify(result,null,2));
writeFileSync(resolve(root,'cohort-metrics.jsonl'),compact.map(r=>JSON.stringify(r)).join('\n')+'\n');
const lines=['boss,hp_current,hp_recommended,suja,limpa,real,asas,nominal_extra,actual_extra_bonus,actual_extra_main_damage,wins_current,wins_proposed,wins_recommended,zero_asas,one_asas,two_asas,more_asas'];
for(const [id,c]of Object.entries(cohorts))lines.push([id,c.current.initialHp,c.recommended.initialHp,
  ...['suja','limpa','real','asas'].map(k=>c.current.highestCounts[k].mean.toFixed(2)),c.current.nominalBonusExtra.mean.toFixed(2),
  c.pairedProposed.extraActualBonus.mean.toFixed(2),c.pairedProposed.extraActualMainDamage.mean.toFixed(2),
  c.current.wins,c.proposed.wins,c.recommended.wins,c.current.asas.zero,c.current.asas.one,c.current.asas.two,c.current.asas.moreThanTwo].join(','));
writeFileSync(resolve(root,'cohort.csv'),lines.join('\n')+'\n');
console.log(JSON.stringify(result.totals));console.log(lines.join('\n'));
