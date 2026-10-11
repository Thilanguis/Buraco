// Current catalogs and conditional probes complement observations in full battles.
import { mkdir, writeFile } from 'node:fs/promises';
import * as engine from '../js/boss/boss-engine.js';
import { listBossDefinitions } from '../js/boss/boss-registry.js';
import { eligibilityFixture, eligibilityCases } from '../tests/boss-eligibility-fixture.mjs';
const report={seeds:64,cases:eligibilityCases,method:'Conditional frozen-state probes; not battle frequencies or human win rates.',bosses:{}};
for(const def of listBossDefinitions()) {
  const official=def.abilities.filter(a=>!a.debugOnly),data={count:official.length,phases:{}};
  report.bosses[def.id]=data;
  for(const phase of [1,2,3]) {
    const entries=official.filter(a=>a.phases.includes(phase)),row={registered:entries.length,eligible:{},selected:{},probes:0,sequenceDraws:0,repeats:0,maxRun:0,noSelection:0};
    data.phases[phase]=row;
    for(const kind of eligibilityCases) {
      const probe=eligibilityFixture(engine,def,phase,kind);
      for(const a of entries) row.eligible[a.id]=(row.eligible[a.id]||0)+(engine.inspectBossAbilityEligibility(structuredClone(probe),a.id).eligible?1:0);
      row.probes++;
      for(let seed=1;seed<=64;seed++) {
        const s=eligibilityFixture(engine,def,phase,kind,seed),intent=engine.selectNextBossIntent(s);
        if(intent)row.selected[intent.abilityId]=(row.selected[intent.abilityId]||0)+1;else row.noSelection++;
      }
      let last=null,run=0;
      for(let n=0;n<16;n++) {
        const s=eligibilityFixture(engine,def,phase,kind,37);s.boss.roundNumber+=n;s.boss.lastAbilityId=last;
        const intent=engine.selectNextBossIntent(s);row.sequenceDraws++;
        if(!intent){last=null;run=0;continue;}
        if(intent.abilityId===last){row.repeats++;run++;}else run=1;
        row.maxRun=Math.max(row.maxRun,run);last=intent.abilityId;
      }
    }
  }
}
await mkdir('docs/experiments',{recursive:true});
await writeFile('docs/experiments/chefe-variedade-atual-2026-10-10.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report.bosses,null,2));
