// Offline rules overrides only. Never imported by the app or changing defaults.
import { pathToFileURL } from 'node:url';
import { castleBattle } from './dimitrescu-item-experiment.mjs';
export const CONFIGS={
  baseline:{},
  A:{regeneration:25,anticoagulantRegeneration:10,daggerTransfer:.8,bleedPercent:.04,bleedRounds:1000},
  B:{regeneration:20,anticoagulantRegeneration:10,daggerTransfer:.8,bleedPercent:.04,bleedRounds:1000},
  baseline_hp450:{daughterHp:450,bleedPercent:50/450},
  A_hp450:{daughterHp:450,regeneration:25,anticoagulantRegeneration:10,daggerTransfer:.8,bleedPercent:20/450,bleedRounds:1000},
  A_dagger60:{regeneration:25,anticoagulantRegeneration:10,daggerTransfer:.6,bleedPercent:.04,bleedRounds:1000},
  A_dagger100:{regeneration:25,anticoagulantRegeneration:10,daggerTransfer:1,bleedPercent:.04,bleedRounds:1000},
};
export const ROUTES=['direct','kill_three','hybrid'];
export function measuredBattle(seed,route,config){
  const seen=new Set(),deaths=[],milestones={},totals={regen:0,bleed:0,transmitted:0,attacksToDaughters:0};
  const daughterEffort=Object.fromEntries(['bela','cassandra','daniela'].map(id=>[id,{attacks:0,regen:0,bleed:0,itemDamage:0}]));
  let last;
  const result=castleBattle(seed,route,{...CONFIGS[config],fixedItemPolicy:true,observe:s=>{
    last=s;
    for(const e of s.boss.eventLog){
      if(!e.actionId||seen.has(e.actionId))continue;seen.add(e.actionId);
      if(e.type==='daughterRegen')totals.regen+=e.amount;
      if(e.type==='daughterBleed')totals.bleed+=e.amount;
      if(e.type==='daggerTransfer')totals.transmitted+=e.amount;
      if(e.type==='bossDamage'&&e.targetId!=='boss')totals.attacksToDaughters+=e.appliedDamage;
      const effort=daughterEffort[e.targetId];
      if(effort){
        if(e.type==='daughterRegen')effort.regen+=e.amount;
        if(e.type==='daughterBleed')effort.bleed+=e.amount;
        if(e.type==='bossDamage')effort.attacks+=e.appliedDamage;
        if(e.type==='castleItem')effort.itemDamage+=e.appliedDamage;
      }
      if(e.type==='daughterDeath')deaths.push({id:e.targetId,turn:s.turnNumber,round:s.boss.roundNumber,attacks:totals.attacksToDaughters,regen:totals.regen,bleed:totals.bleed,protection:e.bloodLinkProtection});
    }
    const snapshot=()=>({turn:s.turnNumber,round:s.boss.roundNumber,stock:s.stock.length,hands:s.players.map(p=>p.hand.length),hp:s.boss.hp,protection:s.boss.bloodLinkProtection,danger:s.boss.danger,deaths:s.boss.combatEntities.filter(d=>d.hp===0).length,daughterHp:s.boss.combatEntities.map(d=>d.hp),totals:{...totals}});
    if(s.deadChunksTaken[0]===2&&!milestones.bothDeadTaken)milestones.bothDeadTaken=snapshot();
    for(const limit of [30,20])if(s.stock.length<=limit&&!milestones['stock'+limit])milestones['stock'+limit]=snapshot();
  }});
  // The engine records daughterDeath before the killing bossDamage/bleed event.
  // A dead daughter cannot receive later damage/healing: her final counters include
  // the killing event exactly, unlike the event-order snapshot above.
  for(const death of deaths)death.daughterEffort={...daughterEffort[death.id]};
  return {config,route,pair:'scripted+scripted (not human or production BOT)',...result,turns:last.turnNumber,
    totals,daughterEffort,deaths,milestones,daughterHp:last.boss.combatEntities.map(d=>d.hp),
    deadTaken:last.deadChunksTaken[0],stock:last.stock.length};
}
export function summary(rows){
  const mean=read=>{const values=rows.map(read).filter(v=>v!=null);return values.length?values.reduce((s,v)=>s+v,0)/values.length:null;};
  return {n:rows.length,wins:rows.filter(r=>r.playerWins).length,losses:rows.filter(r=>r.bossWins).length,
    censored:rows.filter(r=>!r.playerWins&&!r.bossWins).length,
    turns:mean(r=>r.turns),kills:mean(r=>r.daughtersKilled),ladyHp:mean(r=>r.hp),protection:mean(r=>r.protection),
    regen:mean(r=>r.totals.regen),bleed:mean(r=>r.totals.bleed),dagger:mean(r=>r.totals.transmitted),items:mean(r=>r.usedItems),
    firstDeathN:rows.filter(r=>r.deaths.length).length,firstDeathTurn:mean(r=>r.deaths[0]?.turn),firstDeathAttack:mean(r=>r.deaths[0]?.daughterEffort?.attacks),
    lastDeathN:rows.filter(r=>r.deaths.length===3).length,lastDeathTurn:mean(r=>r.deaths.length===3?r.deaths[2].turn:null),lastDeathAttack:mean(r=>r.deaths.length===3?r.totals.attacksToDaughters:null),
    bothDeadN:rows.filter(r=>r.milestones.bothDeadTaken).length,stock30N:rows.filter(r=>r.milestones.stock30).length,stock20N:rows.filter(r=>r.milestones.stock20).length,
    reasons:rows.reduce((a,r)=>(a[r.reason]=(a[r.reason]||0)+1,a),{})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const n=Number(process.argv[2]||24),start=Number(process.argv[3]||10100);
  for(const config of Object.keys(CONFIGS))for(const route of ROUTES){
    const rows=[];for(let i=0;i<n;i++){const r=measuredBattle(start+i,route,config);rows.push(r);console.log(JSON.stringify({kind:'battle',...r}));}
    console.log(JSON.stringify({kind:'summary',config,route,start,...summary(rows)}));
  }
}
