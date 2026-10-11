import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIGS, ROUTES, measuredBattle, summary } from '../scripts/dimitrescu-stage2-experiment.mjs';
import { castleDeal } from '../scripts/dimitrescu-item-experiment.mjs';
import { CASTLE_BALANCE, regenerateDaughters } from '../js/boss/dimitrescu-castle.js';
import { normalizeBossState, useCastleItem } from '../js/boss/boss-engine.js';

test('etapa 2: overrides isolados, mesmos 108 IDs/deal; regen realmente aplicada', () => {
  const defaults=JSON.stringify(CASTLE_BALANCE),base=castleDeal(10100);
  for(const [name,options] of Object.entries(CONFIGS)) {
    const s=castleDeal(10100,options);assert.deepEqual(s.players,base.players,name);assert.deepEqual(s.stock,base.stock,name);
    normalizeBossState(s);const r=JSON.parse(JSON.stringify(s));normalizeBossState(r);
    for(const d of r.boss.combatEntities){assert.equal(d.regeneration,options.regeneration??50,name);assert.equal(d.maxHp,options.daughterHp??500,name);}
    assert.equal(r.boss.bloodLinkProtection,1500,name);assert.equal(r.boss.hp,2000,name);
  }
  assert.equal(JSON.stringify(CASTLE_BALANCE),defaults);assert.equal(CASTLE_BALANCE.daggerTransfer,.8);assert.equal(CASTLE_BALANCE.bleedPermanent,true);
});

for(const [config,anti,net] of [['A',false,5],['B',false,0],['A',true,-10],['B',true,-10]]) {
  test(`${config}: sangramento20 versus regen ${anti?'10':'normal'} = ${net} HP líquido; um tick por rodada`,()=>{
    const s=castleDeal(10100,CONFIGS[config]),d=s.boss.combatEntities[0];
    d.hp=200;d.regeneration=anti?10:CONFIGS[config].regeneration;d.hemorrhage={amount:20,remaining:1000,lastTickRound:null};
    const events=[];for(let i=0;i<4;i++){
      regenerateDaughters(s,()=>{},e=>events.push(e));const hp=d.hp;
      regenerateDaughters(s,()=>{},e=>events.push(e));assert.equal(d.hp,hp);s.boss.roundNumber++;
    }
    assert.equal(d.hp,200+4*net);assert.equal(events.filter(e=>e.type==='daughterBleed').length,4);
  });
}

test('Explosivo experimental reaplicado mantém um sangramento, dano60 por item e guarda de tick',()=>{
  const s=castleDeal(10100,CONFIGS.A),d=s.boss.combatEntities[0];s.boss.bossFlow={stage:'players'};s.hasDrawnThisTurn=true;
  const ids=Object.entries(s.boss.castleItems).filter(([,m])=>m.type==='explosive').slice(0,2).map(([id])=>id);
  for(const id of ids){
    for(const zone of [s.stock,s.discard,...s.deadPiles,...s.players.map(p=>p.hand)]){
      const index=zone.findIndex(c=>c.id===id);if(index>=0){s.players[0].hand.push(...zone.splice(index,1));break;}
    }
  }
  assert.equal(useCastleItem(s,0,ids[0],'bela').appliedDamage,60);
  regenerateDaughters(s,()=>{},()=>{});const round=s.boss.roundNumber;
  assert.equal(useCastleItem(s,0,ids[1],'bela').appliedDamage,60);assert.equal(d.hemorrhage.amount,20);assert.equal(d.hemorrhage.lastTickRound,round);
  const hp=d.hp;regenerateDaughters(s,()=>{},()=>{});assert.equal(d.hp,hp);
  s.boss.roundNumber++;regenerateDaughters(s,()=>{},()=>{});assert.equal(d.hp,hp+5);
  d.hp=10;s.boss.roundNumber++;regenerateDaughters(s,()=>{},()=>{});assert.equal(d.hp,0);assert.equal(d.hemorrhage,null);assert.equal(s.boss.bloodLinkProtection,1000);
});

test('batalhas completas determinísticas, cobertura de rotas e telemetria sem alterar defaults',()=>{
  assert.equal(ROUTES.length,3);assert.equal(Object.keys(CONFIGS).length,7);
  for(const route of ROUTES){const a=measuredBattle(10100,route,'A');assert.deepEqual(a,measuredBattle(10100,route,'A'));assert.match(a.pair,/not human or production BOT/);
    assert.equal(summary([a]).n,1);assert.ok(a.usedItems<=15);assert.ok(a.milestones.stock30);assert.equal(a.totals.transmitted,a.transmittedDamage);assert.equal(a.totals.bleed,a.bleedDamage);
  }
  assert.equal(castleDeal(10100).boss.combatEntities[0].regeneration,50);
});
