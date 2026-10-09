// Conditional selection audit: identical states/seeds, not simulated win rates.
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import * as current from '../js/boss/boss-engine.js';
import {listBossDefinitions} from '../js/boss/boss-registry.js';
import {loadBossBaseline} from './boss-baseline-loader.mjs';
import {eligibilityFixture,eligibilityCases} from '../tests/boss-eligibility-fixture.mjs';
const baseline=await loadBossBaseline(process.argv[2] || '675106b3e1dfc15b80603886e3c8683dad7cc3a8');
try {
  const previous=await import(pathToFileURL(join(baseline.directory,'js/boss/boss-engine.js')).href);
  const previousRegistry=await import(pathToFileURL(join(baseline.directory,'js/boss/boss-registry.js')).href);
  const fingerprint=definitions=>definitions.map(d=>({id:d.id,maxHp:d.maxHp,maxDanger:d.maxDanger,abilities:d.abilities.map(a=>({id:a.id,phases:a.phases,weight:a.weight,debugOnly:!!a.debugOnly}))}));
  assert.deepEqual(fingerprint(listBossDefinitions()),fingerprint(previousRegistry.listBossDefinitions()),'catalog, HP, limits, phases and weights must not change');
  const report={baseline:baseline.revision,seeds:64,cases:eligibilityCases,method:'Conditional weighted selection, including avoid-last and phase-intro probes; no gameplay/win-rate estimate',bosses:{}};
  for(const definition of listBossDefinitions()) {
    const versions={};report.bosses[definition.id]=versions;
    for(const [version,engine] of [['before',previous],['after',current]]) {
      const data={phases:{},selection:{},invasions:{},invasionProbes:{},excluded:{},samples:0,noSelection:0,repeats:0,phaseIntro:0,sequences:{draws:0,noSelection:0,repeated:0,maxRun:0}};versions[version]=data;
      for(const phase of [1,2,3]) {
        const entries=definition.abilities.filter(a=>!a.debugOnly&&a.phases.includes(phase));
        const phaseData={registered:entries.length,eligible:0,probes:0,cases:{}};data.phases[phase]=phaseData;
        for(const kind of eligibilityCases) {
          const row={eligible:0,excluded:{},selection:{},noSelection:0};phaseData.cases[kind]=row;
          const probe=eligibilityFixture(engine,definition,phase,kind);
          for(const entry of entries) {
            const inspected=engine.inspectBossAbilityEligibility(structuredClone(probe),entry.id);
            if(inspected.eligible) row.eligible++;
            else {const reason=inspected.reasonCode||`payload/prerequisite:${entry.id}`;row.excluded[entry.id]=reason;data.excluded[`${entry.id}:${reason}`]=(data.excluded[`${entry.id}:${reason}`]||0)+1;}
          }
          phaseData.eligible+=row.eligible;phaseData.probes++;
          if(definition.id==='nemesis') for(const entity of probe.boss.combatEntities) {
            const solo=structuredClone(probe);
            for(const other of solo.boss.combatEntities)if(other.id!==entity.id&&['absent','repelled'].includes(other.status)){other.status='corpse';other.hp=0;}
            const eligible=engine.inspectBossAbilityEligibility(solo,'horde_invasion').eligible;
            (data.invasionProbes[entity.id] ||= {eligible:0,excluded:0})[eligible?'eligible':'excluded']++;
          }
          for(let seed=1;seed<=report.seeds;seed++) {
            const state=eligibilityFixture(engine,definition,phase,kind,seed);
            // Equal strata with/without last ability and phase introduction.
            if(seed%4===1) state.boss.lastAbilityId=entries[seed%entries.length]?.id;
            if(seed%4===2&&phase>1) state.boss.phaseIntroPending=phase;
            const last=state.boss.lastAbilityId;
            const intent=engine.selectNextBossIntent(state);
            data.samples++;
            if(!intent){data.noSelection++;row.noSelection++;continue;}
            data.selection[intent.abilityId]=(data.selection[intent.abilityId]||0)+1;
            row.selection[intent.abilityId]=(row.selection[intent.abilityId]||0)+1;
            if(intent.abilityId===last)data.repeats++;
            if(intent.selectionSource==='phase_intro')data.phaseIntro++;
            if(intent.abilityId==='horde_invasion'){const id=intent.payload.entityId;data.invasions[id]=(data.invasions[id]||0)+1;}
          }
          // Frozen combat/table, advancing the selection history only. This
          // separates avoid-last behavior from gameplay/lifecycle consequences.
          let last=null,run=0;
          for(let draw=0;draw<16;draw++) {
            const state=eligibilityFixture(engine,definition,phase,kind,37);
            state.boss.roundNumber+=draw;state.boss.lastAbilityId=last;
            const intent=engine.selectNextBossIntent(state);data.sequences.draws++;
            if(!intent){data.sequences.noSelection++;last=null;run=0;continue;}
            if(last===intent.abilityId){run++;data.sequences.repeated++;}else run=1;
            data.sequences.maxRun=Math.max(data.sequences.maxRun,run);last=intent.abilityId;
          }
        }
      }
      if(definition.id==='nemesis') {
        data.invasionFullPool={samples:1024,counts:{}};
        for(let seed=1;seed<=1024;seed++) {
          const state=eligibilityFixture(engine,definition,3,'ready',seed);
          const inspected=engine.inspectBossAbilityEligibility(state,'horde_invasion');
          assert.equal(inspected.eligible,true);
          const id=inspected.payload.entityId;
          data.invasionFullPool.counts[id]=(data.invasionFullPool.counts[id]||0)+1;
        }
      }
    }
    console.log(definition.id,JSON.stringify(Object.fromEntries(Object.entries(versions).map(([key,value])=>[key,{samples:value.samples,noSelection:value.noSelection,selection:value.selection,invasions:value.invasions}]))));
  }
  await mkdir('.cache',{recursive:true});await writeFile('.cache/boss-eligibility-audit.json',JSON.stringify(report,null,2));
} finally {await baseline.dispose();}
