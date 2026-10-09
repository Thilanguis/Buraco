import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBossDebugScenario, createBossDebugSnapshot, restoreBossDebugSnapshot } from '../js/boss/boss-debug-scenarios.js';
import { beginBossTurn, advanceBossTurn, applyBossMeldTransition, completeBossPlayerTurn,
  inspectBossAbilityEligibility, getBossCombatPriorities, notifyBossCardDiscarded,
  notifyBossPurchaseCompleted, classifyBossMeldKind, normalizeBossState, getBossNatureThreats,
  getBossMeldContribution, applyBossFinalStrike, isValidBossSequence, quoteBossPlanDamage } from '../js/boss/boss-engine.js';
import { getNemesisObjectiveOutcome } from '../js/boss/mechanics/nemesis.js';
import { nemesisBossPresentation } from '../js/boss/presentation/nemesis.js';
import { matriarchBossPresentation } from '../js/boss/presentation/matriarch.js';
import { daughterRegenerationHelp } from '../js/boss/ui/dimitrescu-castle-view.js';
import { regenerateDaughters } from '../js/boss/dimitrescu-castle.js';
import { resourceFeedbackSteps } from '../js/boss/ui/resource-feedback.js';

const fixture = (id,ability,phase=1) => buildBossDebugScenario(null,{bossId:id,abilityId:ability,phase,variant:'interactive',target:'auto'}).state;
function activate(s) {
  beginBossTurn(s,{first:true,now:1000,debug:true});
  for(let i=0;i<20&&s.boss.bossFlow.stage!=='players';i++)advanceBossTurn(s,s.boss.bossFlow.endsAt+1);
  return s.boss.currentIntent;
}
function play(s,playerId,move,target='boss') {
  const player=s.players.find(p=>p.id===playerId),cards=player.hand.filter(c=>move.cardIds.includes(c.id));
  const index=move.meldIndex??s.teams[0].melds.length, before=s.teams[0].melds[index]||[];
  const oldKind=classifyBossMeldKind(before),next=[...before,...cards];assert.ok(isValidBossSequence(next));
  player.hand=player.hand.filter(c=>!move.cardIds.includes(c.id));s.teams[0].melds[index]=next;
  if(s.boss.combatTargetsByPlayer)s.boss.combatTargetsByPlayer[playerId]=target;
  return applyBossMeldTransition(s,{teamId:0,playerId,meldIndex:index,oldKind,newKind:classifyBossMeldKind(next),cardsAdded:cards,isNewMeld:move.meldIndex==null});
}
function end(s,id){completeBossPlayerTurn(s,id);s.turnNumber++;}

test('Caçada: dano em zumbi não conta; ataque efetivo e alvo congelado sobrevivem snapshot/undo',()=>{
  const s=fixture('nemesis','stars_hunt'),intent=activate(s),p=intent.payload;
  const before=restoreBossDebugSnapshot(createBossDebugSnapshot(s));
  const zombie=s.boss.combatEntities[0];zombie.status='persistent';
  const plan=getBossCombatPriorities(s,p.targetPlayerId).plan;
  play(s,p.targetPlayerId,plan.moves[0],zombie.id);assert.equal(p.directDamage,0);
  s.boss.starsPlayerId=1-p.targetPlayerId;assert.equal(intent.payload.targetPlayerId,p.targetPlayerId);
  const restored=restoreBossDebugSnapshot(createBossDebugSnapshot(before));normalizeBossState(restored);
  const amount=quoteBossPlanDamage(restored,restored.players[p.targetPlayerId],plan);
  const event=play(restored,p.targetPlayerId,plan.moves[0]);
  assert.equal(event.appliedDamage,amount);assert.equal(restored.boss.currentIntent.payload.directDamage,amount);
  applyBossMeldTransition(restored,{teamId:0,playerId:p.targetPlayerId,meldIndex:plan.moves[0].meldIndex,cardsAdded:[]});
  assert.equal(restored.boss.currentIntent.payload.directDamage,amount,'no effective repeated damage');
  end(restored,p.targetPlayerId);assert.equal(restored.boss.danger,0);
});

test('Caçada: cartas já creditadas sem evolução não provam dano; BOT escolhe Nemesis antes dos zumbis',()=>{
  const s=fixture('nemesis','stars_hunt');s.boss.damagedCardIds=s.players.flatMap(p=>p.hand.map(c=>c.id));
  // Only simple extensions and new triples, with every card already credited.
  s.players.forEach(p=>p.hand=p.hand.slice(0,3));
  assert.equal(inspectBossAbilityEligibility(s,'stars_hunt').eligible,false);
  const bot=fixture('nemesis','stars_hunt');bot.boss.starsPlayerId=1;bot.currentPlayer=1;
  const p=activate(bot).payload;for(const z of bot.boss.combatEntities)z.status='persistent';
  const event=play(bot,1,getBossCombatPriorities(bot,1).plan.moves[0]);
  assert.equal(event.targetId,'boss');assert.ok(p.directDamage>0);
});

for(const phase of [1,2,3])for(const outcome of ['play','discard','none'])test(`Tentáculo F${phase}: ${outcome}, custo real/HUD/bônus uma vez`,()=>{
  const s=fixture('nemesis','infectious_tentacle',phase),intent=activate(s),p=intent.payload;
  const infected=s.boss.combatEntities.find(z=>z.id==='infected');infected.status='persistent';infected.mutated=true;
  s.boss.hordeBuff={entityId:'infected',expiresRound:99};s.boss.omegaBuff={expiresRound:99};s.boss.danger=50;
  if(outcome==='play')play(s,p.targetPlayerId,getBossCombatPriorities(s,p.targetPlayerId).plan.moves[0]);
  if(outcome==='discard'){
    const player=s.players[p.targetPlayerId],card=player.hand.find(c=>p.cardIds.includes(c.id));
    player.hand=player.hand.filter(c=>c.id!==card.id);s.discard.push(card);notifyBossCardDiscarded(s,player.id,card);
  }
  const base=outcome==='play'?0:(outcome==='discard'?3+phase:6+phase*2),expected=base?base+10:0;
  const snapshot=restoreBossDebugSnapshot(createBossDebugSnapshot(s));normalizeBossState(snapshot);
  assert.equal(getNemesisObjectiveOutcome(snapshot.boss,snapshot.boss.currentIntent).applied,expected);
  assert.match(nemesisBossPresentation.compactAction({gameState:snapshot,intent:snapshot.boss.currentIntent}).consequence,new RegExp(`\\+${expected} Infecção`));
  const meter=nemesisBossPresentation.rangeMeters({gameState:snapshot,intent:snapshot.boss.currentIntent})[0];
  assert.equal(meter.value,outcome==='play'?2:outcome==='discard'?1:0);
  end(snapshot,p.targetPlayerId);assert.equal(snapshot.boss.danger,50+expected);
  const events=snapshot.boss.eventLog.filter(e=>e.type==='nemesisObjective');assert.equal(events.length,1);
  completeBossPlayerTurn(snapshot,p.targetPlayerId);assert.equal(snapshot.boss.danger,50+expected);
});

for(const first of [0,1])for(const stars of [0,1])for(const count of [0,1,2])test(`Extermínio: primeiro ${first}, S.T.A.R.S. ${stars}, ${count} objetivos`,()=>{
  const s=fixture('nemesis','stars_extermination',3);s.currentPlayer=first;s.boss.roundFirstPlayerId=first;s.boss.starsPlayerId=stars;
  const intent=activate(s),p=intent.payload;assert.equal(intent.duration,'full_round');assert.equal(p.targetPlayerId,stars);
  const plans=p.solution.teamPlans;
  for(const id of [first,1-first]) {
    s.currentPlayer=id;
    if(count===2||count===1&&id===stars) {
      const plan=getBossCombatPriorities(s,id).plan || plans.find(plan=>plan.playerId===id);
      assert.ok(plan);for(const move of plan.moves)play(s,id,move);
    }
    end(s,id);
    if(id===first)assert.equal(s.boss.danger,0,'does not resolve before partner turn');
  }
  assert.equal(s.boss.danger,count===2?0:count===1?8:16);
  assert.equal(s.boss.eventLog.filter(e=>e.type==='nemesisObjective').length,1);
});

test('Extermínio: parceiro precisa do destino congelado; novo jogo/descarte/dano do parceiro não cumprem',()=>{
  const s=fixture('nemesis','stars_extermination',3),p=activate(s).payload,partner=s.players[p.partnerPlayerId];
  assert.ok(p.partnerMeldIds.length===1);
  s.boss.starsPlayerId=p.partnerPlayerId;
  const invalidCards=[{id:'new3',rank:'3',suit:'♦'},{id:'new4',rank:'4',suit:'♦'},{id:'new5',rank:'5',suit:'♦'}];
  partner.hand.push(...invalidCards);play(s,partner.id,{meldIndex:null,cardIds:invalidCards.map(c=>c.id)});
  assert.equal(p.partnerContributed,false);assert.equal(p.directDamage,0);
  notifyBossCardDiscarded(s,partner.id,partner.hand[0]);assert.equal(p.partnerContributed,false);
  assert.equal(p.targetPlayerId,1-partner.id);
});

test('Extermínio/Agarrador: preservar solução conjunta, sem reservar cegamente o primeiro plano',()=>{
  const s=fixture('nemesis','stars_extermination',3);const p=activate(s).payload;
  const grabber=s.boss.combatEntities.find(z=>z.id==='grabber');grabber.status='persistent';grabber.mutated=true;
  for(const id of [s.currentPlayer,1-s.currentPlayer]) {
    s.currentPlayer=id;s.hasDrawnThisTurn=true;notifyBossPurchaseCompleted(s,id);
    assert.equal(s.boss.grabbedByPlayer[id].cardIds.length,2);
    const plan=getBossCombatPriorities(s,id).plan;assert.ok(plan);
    for(const move of plan.moves)play(s,id,move);
    end(s,id);
  }
  assert.ok(p.partnerContributed);assert.ok(p.directDamage>0);assert.equal(s.boss.danger,0);
});

test('Extermínio: parceiro primeiro cria a ponte legal do ataque S.T.A.R.S.; ordem inversa é inelegível',()=>{
  const s=fixture('nemesis','stars_extermination',3);
  const card=(rank,suit='♠')=>({id:`bridge:${rank}${suit}`,rank,suit});
  s.teams[0].melds=[[card('3'),card('4'),card('5')]];
  s.players[0].hand=[card('6'),card('K','♥'),card('9','♦')];
  s.players[1].hand=[card('7'),card('Q','♥'),card('10','♦')];
  s.currentPlayer=0;s.boss.roundFirstPlayerId=0;s.boss.starsPlayerId=1;
  const quote=inspectBossAbilityEligibility(s,'stars_extermination');assert.equal(quote.eligible,true);
  assert.deepEqual(quote.payload.solution.teamPlans.map(p=>p.playerId),[0,1]);
  s.currentPlayer=1;s.boss.roundFirstPlayerId=1;
  assert.equal(inspectBossAbilityEligibility(s,'stars_extermination').eligible,false);
});

test('Extermínio: só o parceiro cumpre, base parcial +8 e bônus aplicados uma vez',()=>{
  const s=fixture('nemesis','stars_extermination',3),p=activate(s).payload;
  const infected=s.boss.combatEntities.find(e=>e.id==='infected');infected.status='persistent';infected.mutated=true;
  s.boss.hordeBuff={entityId:'infected',expiresRound:99};s.boss.omegaBuff={expiresRound:99};
  for (const id of [s.currentPlayer,1-s.currentPlayer]) {
    s.currentPlayer=id;
    if (id===p.partnerPlayerId) for (const move of getBossCombatPriorities(s,id).plan.moves) play(s,id,move);
    end(s,id);
  }
  assert.equal(p.directDamage,0);assert.equal(p.partnerContributed,true);
  assert.equal(s.boss.danger,16,'8 base +4 Mutado +2 Reforçado +2 Ômega');
  assert.equal(s.boss.eventLog.filter(e=>e.type==='nemesisObjective').length,1);
});

for (const ability of ['stars_hunt','infectious_tentacle','stars_extermination']) test(`Save Nemesis v1 já anunciado: ${ability} mantém o objetivo anterior`,()=>{
  const s=fixture('nemesis',ability,ability==='stars_extermination'?3:1),intent=activate(s),p=intent.payload;
  delete p.objectiveVersion;
  if (ability==='infectious_tentacle') {p.exitedCardIds=[p.cardIds[0]];p.playedMarkedCardIds=[];}
  else {p.contributed=true;p.secondExited=true;}
  if (ability==='stars_extermination') intent.duration='target_turn';
  const snapshot=restoreBossDebugSnapshot(createBossDebugSnapshot(s));normalizeBossState(snapshot);
  assert.equal(getNemesisObjectiveOutcome(snapshot.boss,snapshot.boss.currentIntent).applied,0);
  end(snapshot,p.targetPlayerId);assert.equal(snapshot.boss.danger,0);
});

test('Caçada: Ataque Final usa dano canônico, limitado ao HP real e não conta zumbi',()=>{
  for(const target of ['boss','grabber']) {
    const s=fixture('nemesis','stars_hunt'),p=activate(s).payload;
    s.boss.bossFlow=null;s.boss.hp=50;s.boss.combatEntities[0].status='persistent';s.boss.combatTargetsByPlayer[p.targetPlayerId]=target;
    const event=applyBossFinalStrike(s,9999,p.targetPlayerId);
    assert.equal(p.directDamage,target==='boss'?50:0);assert.equal(event.damage,100);
  }
});

for(const phase of [2,3])for(const fed of [0,1,2])test(`Enxerto F${phase}, ${fed} lados: cura parcial distinta de Flor`,()=>{
  const s=fixture('matriarca_esmeralda','graft',phase);s.boss.hp=1700;activate(s);
  const threat=getBossNatureThreats(s).find(t=>t.type==='graft');assert.equal(threat.partialHeal,50);
  for(const index of threat.meldIndexes.slice(0,fed)) {
    const candidate=s.players.flatMap(player=>player.hand.map(card=>({player,card}))).find(({card})=>isValidBossSequence([...s.teams[0].melds[index],card]));
    assert.ok(candidate);play(s,candidate.player.id,{meldIndex:index,cardIds:[candidate.card.id]});
  }
  const hp=s.boss.hp;
  const restored=restoreBossDebugSnapshot(createBossDebugSnapshot(s));normalizeBossState(restored);
  end(restored,0);end(restored,1);
  const result=restored.boss.natureThreats.find(t=>t.id===threat.id);
  assert.equal(result.bloomApplied||0,fed===0?1:0);assert.equal(result.healApplied||0,fed===1?50:0);
  assert.equal(restored.boss.hp,hp+(fed===1?50:0));
  assert.equal(!!restored.boss.pendingRootPropagation||restored.boss.natureThreats.some(t=>t.propagated),fed===0);
  completeBossPlayerTurn(restored,1);assert.equal(restored.boss.hp,hp+(fed===1?50:0));
});

test('Enxerto parcial respeita teto de cura/HP e preserva saves antigos já anunciados',()=>{
  for(const [used,hp,heal] of [[140,1700,10],[0,1995,5],[150,1700,0]]) {
    const s=fixture('matriarca_esmeralda','graft',2);activate(s);s.boss.hp=hp;s.boss.natureHealingThisRound=used;s.boss.natureHealingRound=s.boss.roundNumber;
    const t=s.boss.natureThreats.find(t=>t.type==='graft');t.fedMeldIds=[t.meldIds[0]];
    end(s,0);end(s,1);assert.equal(t.healApplied||0,heal);assert.equal(t.bloomApplied||0,0);
  }
  const s=fixture('matriarca_esmeralda','graft',2);activate(s);
  const t=s.boss.natureThreats.find(t=>t.type==='graft');delete t.partialHeal;t.fedMeldIds=[t.meldIds[0]];
  assert.match(matriarchBossPresentation.help({gameState:s,intent:s.boss.currentIntent}),/Se alimentar só um: \+1 Flor, sem cura/);
  normalizeBossState(s);end(s,0);end(s,1);assert.equal(t.bloomApplied,1,'saved v1 objective resolves once under its announced rule');
});

test('Enxerto antigo anunciado antes da aplicação conserva regra e ajuda após snapshot',()=>{
  const s=fixture('matriarca_esmeralda','graft',2);
  beginBossTurn(s,{first:true,now:1000,debug:true});
  for(let i=0;i<20&&s.boss.bossFlow.stage!=='ability';i++)advanceBossTurn(s,s.boss.bossFlow.endsAt+1);
  assert.equal(s.boss.currentIntent.payload.partialHeal,50);
  delete s.boss.currentIntent.payload.partialHeal;
  const restored=restoreBossDebugSnapshot(createBossDebugSnapshot(s));
  assert.match(matriarchBossPresentation.help({gameState:restored,intent:restored.boss.currentIntent}),/Se alimentar só um: \+1 Flor, sem cura/);
  for(let i=0;i<20&&restored.boss.bossFlow.stage!=='players';i++)advanceBossTurn(restored,restored.boss.bossFlow.endsAt+1);
  const t=restored.boss.natureThreats.find(t=>t.type==='graft');assert.equal(t.partialHeal,undefined);
  t.fedMeldIds=[t.meldIds[0]];end(restored,0);end(restored,1);assert.equal(t.bloomApplied,1);
});

test('Dimitrescu: PASSIVA descreve regeneração real, nunca a habilidade ofensiva',()=>{
  const s=fixture('dimitrescu','blood_tithe');
  for(const d of s.boss.combatEntities) {
    d.hp=d.maxHp-20;const help=daughterRegenerationHelp(d);assert.match(help,/recupera 20 HP/);
    assert.match(help,/mesmo sem ser escolhida/);assert.doesNotMatch(help,/CAÇADA|BANQUETE|LIXO|Sede/);
    d.regeneration=25;d.hp=300;assert.match(daughterRegenerationHelp(d),/recupera 25 HP/);
    d.cold=true;assert.match(daughterRegenerationHelp(d),/bloqueada/);
    d.status='dead';assert.equal(daughterRegenerationHelp(d),'Derrotada: não regenera.');
  }
});

for(const scenario of ['three','cold','full','dead'])test(`daughterRegen ${scenario}: números efetivos individuais, uma vez, sem Lady/Sede`,()=>{
  const s=fixture('dimitrescu','blood_tithe'),[b,c,d]=s.boss.combatEntities;
  b.hp=350;c.hp=c.maxHp-20;d.hp=350;d.regeneration=25;
  for(const daughter of [b,c,d])daughter.passive=null;
  if(scenario==='cold')b.cold=true;
  if(scenario==='full')b.hp=b.maxHp;
  if(scenario==='dead'){b.hp=0;b.status='dead';}
  const hp=s.boss.hp,danger=s.boss.danger,events=[];
  regenerateDaughters(s,()=>assert.fail('offensive passives must not run in this fixture'),e=>events.push(e));
  const steps=events.flatMap(e=>resourceFeedbackSteps(s.boss,e));
  assert.deepEqual(steps.map(e=>[e.entityId,e.amount]),[...(scenario==='three'?[['bela',50]]:[]),['cassandra',20],['daniela',25]]);
  assert.ok(steps.every(e=>e.metric==='daughterHp'));assert.equal(s.boss.hp,hp);assert.equal(s.boss.danger,danger);
  const previous=events.length;regenerateDaughters(s,()=>{},e=>events.push(e));assert.equal(events.length,previous);
});
