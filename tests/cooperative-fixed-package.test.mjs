import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { scenario,card } from './boss-cooperative-fixture.mjs';
import { castleScenario } from './castle-bot-fixture.mjs';
import { CASTLE_BALANCE,castleRules,castleItemHpLoss,damageDaughter,killDaughter,furyLevel,ladyTitheBlood,ladyCrimsonBrandBase } from '../js/boss/dimitrescu-castle.js';
import { quoteBossPlanDamage,applyBossMeldTransition,normalizeBossState,useCastleItem,completeBossPlayerTurn,
  selectNextBossIntent,inspectBossAbilityEligibility,beginBossTurn,advanceBossTurn } from '../js/boss/boss-engine.js';
import { buildBossDebugScenario,executeBossDebugScenarioVariant } from '../js/boss/boss-debug-scenarios.js';
import { buildBossActionPresentation,buildBossAbilityHelp } from '../js/boss/boss-presentation.js';
import { BOSS_DAMAGE_BY_KIND } from '../js/boss/bosses/banker.js';
import { castleItemHelp } from '../js/boss/ui/dimitrescu-castle-view.js';

for(const [rank,joker,expected,natural] of [['2',false,10,true],['2',false,10,false],['A',false,15,false],['JOKER',true,20,false],['7',false,5,false],['K',false,10,false]])
test(`rank ${rank} ${natural?'natural':'wild/ordinary'} damage ${expected}, quote and actual incremental combat agree`,()=>{
  const s=scenario({bossId:'banker'}),c={...card('added',rank,'♣'),joker,forceNatural:natural};
  s.players[0].hand=[c,card('reserve')];s.teams[0].melds=[[card('m3','3','♣'),card('m4','4','♣'),card('m5','5','♣')]];
  assert.equal(quoteBossPlanDamage(s,s.players[0],{moves:[{meldIndex:0,cardIds:[c.id]}]}),expected);
  const event=applyBossMeldTransition(s,{teamId:0,playerId:0,meldIndex:0,oldKind:'simple',newKind:'simple',cardsAdded:[c]});
  assert.equal(event.appliedDamage,expected);
  assert.equal(applyBossMeldTransition(s,{teamId:0,playerId:0,meldIndex:0,oldKind:'simple',newKind:'simple',cardsAdded:[c]}),null);
});
test('Buraco points and canastra damage tiers remain unchanged',()=>{
  const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),start=source.indexOf('function cardBasePoints(');
  const points=new Function(source.slice(start,source.indexOf('\nfunction ',start+1))+'; return cardBasePoints;')();
  assert.equal(points(card('two','2')),10);
  assert.deepEqual(BOSS_DAMAGE_BY_KIND,{simple:0,suja:100,limpa:180,real:300,asas:450});
});
for(const [type,loss] of Object.entries(CASTLE_BALANCE.maxHpLossByItem))test(`${type} flat ${loss}, floor 130, effect and HUD agree`,()=>{
  const s=castleScenario(type),d=s.boss.combatEntities[0];assert.equal(castleItemHpLoss(s.boss,type),loss);
  const event=useCastleItem(s,0,'item','bela');assert.ok(event);assert.equal(d.maxHp,500-loss);
  assert.equal(d.hp,500-loss-(type==='explosive'?100:0));
  assert.match(castleItemHelp(type,s.boss),new RegExp(`Petrifica ${loss} HP`));assert.match(castleItemHelp(type,s.boss),/mínimo de 130/);
  const atFloor=castleScenario(type),floor=atFloor.boss.combatEntities[0];floor.hp=floor.maxHp=130;
  assert.ok(useCastleItem(atFloor,0,'item','bela'));assert.equal(floor.maxHp,130);
  if(type==='dagger')assert.equal(floor.daggerLink,true);
  if(type==='explosive'){assert.equal(floor.hp,30);assert.equal(floor.hemorrhage.amount,15);assert.equal(floor.hemorrhage.permanent,true);}
  if(type==='anticoagulant')assert.equal(floor.regeneration,10);
  if(type==='cold_flask')assert.equal(atFloor.boss.castleFreeze.remainingTurns,2);
  if(type==='relic')assert.equal(floor.relicAttackBonus,true);
});
test('additive 500→340→180→130; old saves retain wounds and never replay old sacrifices',()=>{
  const s=castleScenario('cold_flask'),d=s.boss.combatEntities[0];
  assert.ok(useCastleItem(s,0,'item','bela'));assert.equal(d.maxHp,340);
  for(const [id,type,expected] of [['relic','relic',180],['dagger','dagger',130]]) {
    s.players[0].hand.push(card(id));s.boss.castleItems[id]={type,consumed:false};
    assert.ok(useCastleItem(s,0,id,'bela'));assert.equal(d.maxHp,expected);assert.equal(d.hp,expected);
  }
  const old=castleScenario();delete old.boss.castlePetrificationBalanceVersion;
  old.boss.castleItemRules={...old.boss.castleItemRules,daughterHpFloor:300};delete old.boss.castleItemRules.maxHpLossByItem;
  old.boss.combatEntities[0].hp=170;old.boss.combatEntities[0].maxHp=300;
  normalizeBossState(old);assert.equal(old.boss.combatEntities[0].hp,170);assert.equal(old.boss.combatEntities[0].maxHp,300);
  assert.equal(castleRules(old.boss).daughterHpFloor,130);assert.equal(castleItemHpLoss(old.boss,'dagger'),80);
  const json=JSON.stringify(old);normalizeBossState(old);assert.equal(JSON.stringify(old),json);
});
for(const phase of [1,2,3])for(const [rage,expected] of [[0,8],[1,12],[2,16],[3,18]])test(`Tributo phase ${phase} fury ${rage}: collective ${expected}, engine/HUD/help agree`,()=>{
  const s=castleScenario();s.boss.phase=phase;
  s.players.forEach((p,i)=>p.hand=Array.from({length:11},(_,n)=>card(`${i}:${n}`)));
  s.boss.combatEntities.slice(0,rage).forEach(d=>killDaughter(s,d,'test',()=>{}));
  s.boss.currentIntent={id:'tithe',abilityId:'blood_tithe',name:'Tributo de Sangue',announcedPhase:phase,
    duration:'full_round',payload:{bloodPressureVersion:2}};
  assert.equal(furyLevel(s.boss),rage);assert.equal(ladyTitheBlood(s.boss,8,s.boss.currentIntent),expected);
  const shown=buildBossActionPresentation(s);assert.match(shown.consequence,new RegExp(`\\+${expected} Sede`));
  assert.match(buildBossAbilityHelp(s).text,new RegExp(`\\+${expected}`));
  completeBossPlayerTurn(s,0,{deferNextBossTurn:true});completeBossPlayerTurn(s,1,{deferNextBossTurn:true});
  assert.equal(s.boss.danger,expected);
  const json=JSON.stringify(s);normalizeBossState(s);normalizeBossState(s);assert.equal(JSON.stringify(s),json);
});
test('Marca grows with Fury, never exceeds prior max in any phase; legacy announcement keeps its quote',()=>{
  for(const phase of [1,2,3]) {
    let previous=0;
    for(const rage of [0,1,2,3]) {
      const s=castleScenario();s.boss.phase=phase;s.boss.combatEntities.slice(0,rage).forEach(d=>killDaughter(s,d,'test',()=>{}));
      const base=ladyCrimsonBrandBase(s.boss,phase),amount=base*2+rage*2;
      assert.ok(amount>=previous);assert.ok(amount<=({1:5,2:7,3:9}[phase]*2+6));previous=amount;
      s.boss.currentIntent={id:'marks',abilityId:'crimson_brand',announcedPhase:phase,duration:'full_round',
        payload:{bloodPressureVersion:2,marks:s.players.map(p=>({playerId:p.id,cardId:p.hand[0].id,status:'active'}))}};
      completeBossPlayerTurn(s,0,{deferNextBossTurn:true});completeBossPlayerTurn(s,1,{deferNextBossTurn:true});assert.equal(s.boss.danger,amount);
    }
  }
  const old=castleScenario();delete old.boss.castleBloodPressureVersion;
  old.boss.currentIntent={id:'old-tithe',abilityId:'blood_tithe',announcedPhase:2,payload:{},duration:'full_round'};
  old.players.forEach((p,i)=>p.hand=Array.from({length:11},(_,n)=>card(`${i}:${n}`)));
  normalizeBossState(old);assert.equal(old.boss.currentIntent.payload.bloodPressureVersion,1);
  completeBossPlayerTurn(old,0,{deferNextBossTurn:true});completeBossPlayerTurn(old,1,{deferNextBossTurn:true});assert.equal(old.boss.danger,16);
});
test('Nemesis HP and migration preserve damage, corpses, mutation and revival count',()=>{
  const s=scenario({bossId:'nemesis'});assert.deepEqual(s.boss.combatEntities.map(e=>e.maxHp),[180,190,200]);
  Object.assign(s.boss.combatEntities[0],{status:'persistent',hp:170,maxHp:220,mutated:true,revivals:1});
  Object.assign(s.boss.combatEntities[1],{status:'corpse',hp:0,maxHp:240,revivals:1});
  normalizeBossState(s);assert.equal(s.boss.combatEntities[0].hp,170);assert.equal(s.boss.combatEntities[0].mutated,true);
  assert.equal(s.boss.combatEntities[1].hp,0);assert.equal(s.boss.combatEntities[1].status,'corpse');assert.equal(s.boss.combatEntities[1].revivals,1);
});
for(const phase of [1,2,3])test(`Nemesis phase ${phase}: two persistent allow the third invasion, without spawning it`,()=>{
  const s=buildBossDebugScenario(null,{bossId:'nemesis',abilityId:'horde_invasion',phase,target:'zombie_grabber',variant:'failure'}).state;
  s.boss.combatEntities.filter(e=>e.id!=='grabber').forEach(e=>{e.status='persistent';e.hp=e.maxHp;});
  assert.equal(s.boss.combatEntities.find(e=>e.id==='grabber').status,'absent');
  assert.equal(inspectBossAbilityEligibility(s,'horde_invasion',{debug:true}).eligible,true);
  beginBossTurn(s,{first:true,now:1000,debug:true});
  for(let i=0;i<20&&s.boss.bossFlow.stage!=='players';i++)advanceBossTurn(s,s.boss.bossFlow.endsAt+1);
  assert.equal(executeBossDebugScenarioVariant(s).executed,true);
  assert.equal(s.boss.combatEntities.filter(e=>e.status==='persistent').length,3);
  assert.equal(inspectBossAbilityEligibility(s,'horde_invasion',{debug:true}).eligible,false);
});
test('Reanimation in phase 2 is eligible with two other persistent zombies, obeying once-per-zombie lifecycle',()=>{
  const s=buildBossDebugScenario(null,{bossId:'nemesis',abilityId:'viral_reanimation',phase:2}).state;
  s.boss.combatEntities.filter(e=>e.status!=='corpse').forEach(e=>{e.status='persistent';e.hp=e.maxHp;});
  assert.equal(inspectBossAbilityEligibility(s,'viral_reanimation',{debug:true}).eligible,true);
  beginBossTurn(s,{first:true,now:1000,debug:true});
  for(let i=0;i<20&&s.boss.bossFlow.stage!=='players';i++)advanceBossTurn(s,s.boss.bossFlow.endsAt+1);
  const revived=s.boss.combatEntities.find(e=>e.revivals===1);assert.ok(revived);assert.equal(revived.hp,Math.ceil(revived.maxHp/2));
});
