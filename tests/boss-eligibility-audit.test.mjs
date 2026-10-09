import assert from 'node:assert/strict';
import test from 'node:test';
import * as rules from '../js/boss/boss-engine.js';
import {getBossDefinition,listBossDefinitions} from '../js/boss/boss-registry.js';
import {eligibilityFixture,eligibilityCases,card} from './boss-eligibility-fixture.mjs';
import {createUndoTransaction,restoreUndoTransaction} from '../js/game/undo-transaction.js';
import {nemesisBossMechanics} from '../js/boss/mechanics/nemesis.js';
import {buildBossActionPresentation} from '../js/boss/boss-presentation.js';
import {BossBuracoBot} from '../boss-bot.js';
import {fixtureEngine} from './boss-cooperative-fixture.mjs';
const fixture=(boss='nemesis',phase=3,kind='poor',seed=11)=>eligibilityFixture(rules,getBossDefinition(boss),phase,kind,seed);
function announce(state,id) {return rules.selectNextBossIntent(state,{debug:true,forcedAbilityId:id});}
function end(state) {rules.completeBossPlayerTurn(state,0);state.currentPlayer=1;state.turnNumber++;rules.completeBossPlayerTurn(state,1);}
for(const id of ['stars_hunt','infectious_tentacle','tentacle_barrage','stars_extermination']) test(`${id}: impossible challenge can fail once, reload/undo preserve the result`,()=>{
  const state=fixture();const intent=announce(state,id);
  const snapshot=createUndoTransaction(state);const payload=structuredClone(intent.payload);
  end(state);
  const danger=state.boss.danger;assert.ok(danger>0,id);
  const eventCount=state.boss.eventLog.length;
  rules.completeBossPlayerTurn(state,1);assert.equal(state.boss.danger,danger);
  const reloaded=JSON.parse(JSON.stringify(state));rules.normalizeBossState(reloaded);rules.completeBossPlayerTurn(reloaded,1);
  assert.equal(reloaded.boss.danger,danger);assert.equal(reloaded.boss.eventLog.length,eventCount);
  const undone=restoreUndoTransaction(snapshot).state;assert.deepEqual(undone.boss.currentIntent.payload,payload);
  end(undone);assert.equal(undone.boss.danger,danger);
});
for(const kind of ['grabber','infected','devourer']) test(`${kind}: failure persists mutated without extra Infection or duplicate resolution`,()=>{
  const state=fixture();for(const entity of state.boss.combatEntities)if(entity.id!==kind){entity.status='corpse';entity.hp=0;}
  const intent=announce(state,'horde_invasion');assert.equal(intent.payload.entityId,kind);
  end(state);const entity=state.boss.combatEntities.find(e=>e.id===kind);
  assert.equal(entity.status,'persistent');assert.equal(entity.mutated,true);assert.equal(state.boss.danger,0);
  const restored=JSON.parse(JSON.stringify(state));rules.normalizeBossState(restored);rules.completeBossPlayerTurn(restored,1);
  assert.equal(restored.boss.danger,0);assert.equal(intent.payload.entrySuccess,false);
  assert.equal(restored.boss.combatEntities.find(e=>e.id===kind).status,'persistent');
});
test('physical marks exclude picked top, illegal last discard and grabbed play-only exits',()=>{
  const state=fixture();for(const entity of state.boss.combatEntities)if(entity.id!=='grabber'){entity.status='corpse';entity.hp=0;}
  state.teams[0].melds=[];state.deadPiles=[];state.deadChunksTaken=[1,1];
  state.players.forEach(p=>p.hand=[card(`last:${p.id}`,'K','♦')]);
  assert.equal(rules.inspectBossAbilityEligibility(state,'horde_invasion').eligible,false);
  state.players[0].hand.push(card('other','8','♠'));state.pickedDiscardCardId=state.players[0].hand[0].id;
  const payload=rules.inspectBossAbilityEligibility(state,'horde_invasion').payload;
  assert.deepEqual(payload.cardIds,['other']);
});
test('Invasion cap, corpse lifetime resurrection, wounded healing and persistent-only command remain mandatory',()=>{
  const cap=fixture('nemesis',1,'active_zombies');assert.equal(rules.inspectBossAbilityEligibility(cap,'horde_invasion').eligible,false);
  const spent=fixture('nemesis',3,'spent_revives');assert.equal(rules.inspectBossAbilityEligibility(spent,'viral_reanimation').eligible,false);
  assert.equal(rules.inspectBossAbilityEligibility(spent,'horde_command').eligible,false);
  assert.equal(rules.inspectBossAbilityEligibility(spent,'parasite_regeneration').eligible,false);
  const corpses=fixture('nemesis',3,'corpses');assert.equal(rules.inspectBossAbilityEligibility(corpses,'viral_reanimation').eligible,true);
  const full=fixture('nemesis',3,'active_zombies');for(const e of full.boss.combatEntities)e.hp=e.maxHp;
  assert.equal(rules.inspectBossAbilityEligibility(full,'parasite_regeneration').eligible,false);
});
test('Devorador and Impact need extendable existing games, not cards already in hand',()=>{
  for(const kind of ['poor','empty_table','closed_table']) {
    const state=fixture('nemesis',3,kind);for(const e of state.boss.combatEntities)if(e.id!=='devourer'){e.status='corpse';e.hp=0;}
    for(const id of ['horde_invasion','rocket_launcher'])assert.equal(rules.inspectBossAbilityEligibility(state,id).eligible,kind==='poor',`${kind}/${id}`);
  }
});
for(const id of ['tiger_link','mirror_prison']) test(`Nehelenia ${id}: real games without hand solution can fail without blocking discards`,()=>{
  const state=fixture('nehelenia',3,'pressure_poor');const intent=announce(state,id);
  assert.ok(intent);assert.equal(intent.payload.solution,undefined);
  for(const player of state.players)assert.ok(player.hand.some(c=>!rules.isBossCardBlocked(state,player.id,c.id,'discard')));
  end(state);assert.equal(state.boss.lastEvent.success,false);
  const before=state.boss.danger;rules.completeBossPlayerTurn(state,1);assert.equal(state.boss.danger,before);
  const missing=fixture('nehelenia',3,'pressure_poor');missing.teams[0].melds=[];
  assert.equal(rules.inspectBossAbilityEligibility(missing,id).eligible,false);
});
test('sole eligible ability repeats instead of producing an artificial empty list',()=>{
  const state=fixture('nemesis',3,'repeat_only');
  assert.deepEqual(getBossDefinition('nemesis').abilities.filter(e=>rules.inspectBossAbilityEligibility(structuredClone(state),e.id).eligible).map(e=>e.id),['omega_outbreak']);
  assert.equal(rules.selectNextBossIntent(state).abilityId,'omega_outbreak');
});
test('avoid-last does not erase a real alternative and phase-intro restrictions remain',()=>{
  for(let seed=1;seed<=32;seed++) {
    const state=fixture('nemesis',3,'poor',seed);state.boss.lastAbilityId='stars_hunt';
    assert.notEqual(rules.selectNextBossIntent(state).abilityId,'stars_hunt');
    const intro=fixture('nemesis',2,'poor',seed);intro.boss.phaseIntroPending=2;
    assert.equal(rules.selectNextBossIntent(intro).abilityId,'rocket_launcher');
    const absent=fixture('nemesis',2,'empty_table',seed);absent.boss.phaseIntroPending=2;
    assert.equal(rules.selectNextBossIntent(absent).selectionSource,'phase_intro_fallback');
  }
});
for(const definition of listBossDefinitions()) test(`${definition.id}: all contexts deterministically select valid payloads and keep a legal discard`,()=>{
  for(const phase of [1,2,3])for(const kind of eligibilityCases) {
    const state=eligibilityFixture(rules,definition,phase,kind,991),clone=structuredClone(state);
    const first=rules.selectNextBossIntent(state),second=rules.selectNextBossIntent(clone);
    assert.deepEqual(first,second,`${phase}/${kind}`);
    if(!first)continue;
    assert.ok(definition.abilities.find(a=>a.id===first.abilityId).phases.includes(phase));
    assert.ok(buildBossActionPresentation(state,first));
    for(const player of state.players)assert.ok(player.hand.some(c=>!rules.isBossCardBlocked(state,player.id,c.id,'discard')) || player.hand.length===0);
  }
});
for(const id of ['stars_hunt','stars_extermination','infectious_tentacle','tentacle_barrage']) test(`cooperative BOT survives an unsolvable ${id} without strategic policy changes`,async()=>{
  const state=fixture();announce(state,id);state.currentPlayer=0;
  const engine=fixtureEngine(state);
  await BossBuracoBot.processMelds(0,{},engine);
  await BossBuracoBot.processDiscard(0,1,engine);
  assert.ok(!state.players[0].hand.some(c=>c.id===state.discard.at(-1)?.id));
  assert.ok(state.discard.length>2,'BOT made a legal discard');
});
for(const id of ['mirror_prison','tiger_link']) test(`Nehelenia BOT cannot solve ${id} but still legally finishes its turn`,async()=>{
  const state=fixture('nehelenia',3,'pressure_poor');announce(state,id);
  const engine=fixtureEngine(state);
  await BossBuracoBot.processMelds(0,{},engine);await BossBuracoBot.processDiscard(0,1,engine);
  assert.ok(state.discard.length>2);
});
test('Invasion diagnostics distinguish physical target, lifecycle and cap, not success proof',()=>{
  const state=fixture('nemesis',3,'empty_table');
  const details=rules.inspectBossAbilityEligibility(state,'horde_invasion').details;
  assert.equal(details.find(d=>d.entityId==='grabber').eligible,true);
  assert.equal(details.find(d=>d.entityId==='infected').eligible,true);
  assert.equal(details.find(d=>d.entityId==='devourer').reason,'no_extendable_existing_game');
  const cap=fixture('nemesis',1,'active_zombies');
  assert.ok(rules.inspectBossAbilityEligibility(cap,'horde_invasion').details.every(d=>d.reason==='phase_cap'));
});
