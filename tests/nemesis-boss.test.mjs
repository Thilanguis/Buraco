import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { nemesisDefinition, NEMESIS_RELIEF } from '../js/boss/bosses/nemesis.js';
import { nemesisBossMechanics, changeNemesisInfection, chooseNemesisDamageTarget } from '../js/boss/mechanics/nemesis.js';
import { nemesisBossUi } from '../js/boss/ui/nemesis-ui.js';
import { nemesisBossPresentation } from '../js/boss/presentation/nemesis.js';
import { BossBuracoBot } from '../boss-bot.js';
import { createUndoTransaction, restoreUndoTransaction } from '../js/game/undo-transaction.js';
import { buildBossActionPresentation, buildBossRuleSummary } from '../js/boss/boss-presentation.js';
import { createBossState, normalizeBossState, selectNextBossIntent, inspectBossAbilityEligibility, beginBossTurn, advanceBossTurn,
  applyBossMeldTransition, completeBossPlayerTurn, notifyBossDiscardTaken, notifyBossCardDiscarded, isBossCardBlocked, isValidBossSequence,
  setBossDamageTarget, getBossCombatPriorities, shouldBossBotTakeDiscard, applyBossFinalStrike, applyBossResourceDefeat, isBossDiscardBlocked,
  queueDebugBossAbility, notifyBossPurchaseCompleted,
} from '../js/boss/boss-engine.js';
import { buildBossDebugScenario, executeBossDebugScenarioVariant, simulateBossDebugReload, createBossDebugSnapshot, restoreBossDebugSnapshot, validateBossDebugScenario, getBossDebugCatalog, getBossDebugResourceState } from '../js/boss/boss-debug-scenarios.js';

// Existing combat coverage explicitly prepares persistent combatants. Creation
// and invasion tests below use untouched new state instead.
const game = (ability = 'stars_hunt', phase = 1, variant = 'interactive', target = 'auto') => {
  const state = buildBossDebugScenario(null, { bossId: 'nemesis', abilityId: ability, phase, variant, target }).state;
  if (!['horde_invasion', 'viral_reanimation'].includes(ability) && variant !== 'no_target') for (const entry of state.boss.combatEntities) if (entry.status === 'absent') entry.status = 'persistent';
  return state;
};
function activate(state) {
  beginBossTurn(state, { first: true, now: 1000, debug: true });
  for (let i = 0; i < 15 && state.boss.bossFlow.stage !== 'players'; i++) advanceBossTurn(state, state.boss.bossFlow.endsAt + 1);
  assert.equal(state.boss.bossFlow.stage, 'players');
  return state.boss.currentIntent;
}
function hit(state, { playerId = 0, targetId = 'boss', kind = 'simple', oldKind = 'simple', cards = [], meldIndex = 0 } = {}) {
  state.currentPlayer = state.players.findIndex((player) => player.id === playerId);
  state.boss.bossFlow = null;
  assert.ok(setBossDamageTarget(state, playerId, targetId));
  return applyBossMeldTransition(state, { teamId: 0, playerId, meldIndex, oldKind, newKind: kind, cardsAdded: cards });
}
const entity = (state, id) => state.boss.combatEntities.find((entry) => entry.id === id);
const dead = (state, id) => { entity(state, id).hp = 0; entity(state, id).status = 'corpse'; };

test('infection audio uses actual applied delta, not result/reduction/render events', () => {
  for (const type of ['infection', 'nemesisObjective']) {
    assert.equal(nemesisBossPresentation.resourceSoundEvent({ type, amount: 6 }), true);
    for (const amount of [0, -6, undefined]) assert.equal(nemesisBossPresentation.resourceSoundEvent({ type, amount }), false);
  }
  assert.equal(nemesisBossPresentation.resourceSoundEvent({ type: 'bossAbility', infectionApplied: 6 }), false);
  const audio = fs.readFileSync(new URL('../js/audio.js', import.meta.url), 'utf8');
  assert.match(audio, /resource: createBossSfx\('assets\/sfx\/ganho-infeccao-nemesis.mp3'\)/);
});

test('real sound synchronizer deduplicates Firebase/rerender/undo and suppresses initial reload', () => {
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const classify = app.slice(app.indexOf('function bossEventAddsResource('), app.indexOf('\nfunction bossEventHealsMatriarch('));
  const sync = app.slice(app.indexOf('function syncBossResourceSounds('), app.indexOf('\nfunction playBossIntroSoundOnce('));
  const sounds = [];
  const synchronize = new Function('getBossPresentationAdapter', 'playSfxClone', `
    let seenBossResourceSoundEventIds = null, bossResourceSoundScope = null;
    const gameId = 'audio-test', audioUnlocked = true, audioCtx = null;
    const BOSS_SFX = { nemesis: { resource: 'infection-sound' } };
    const bossEventIsDimitrescuPhaseChange = () => false, bossEventHealsMatriarch = () => false;
    const matriarchNatureSoundPairKey = () => '';
    ${classify}\n${sync}\nreturn syncBossResourceSounds;
  `)(() => nemesisBossPresentation, (sound) => sounds.push(sound));
  const boss = { id: 'nemesis', seed: 123, eventLog: [{ type: 'infection', amount: 8, actionId: 'old' }] };
  synchronize(boss); assert.equal(sounds.length, 0);
  boss.eventLog.push({ type: 'infection', amount: 6, actionId: 'trash' });
  boss.eventLog.push({ type: 'infection', amount: 6, actionId: 'trash' });
  synchronize(boss); synchronize(JSON.parse(JSON.stringify(boss))); assert.equal(sounds.length, 1);
  boss.eventLog.push({ type: 'nemesisObjective', amount: 20, actionId: 'objective' });
  boss.eventLog.push({ type: 'bossAbility', infectionApplied: 20, actionId: 'result' });
  synchronize(boss); assert.equal(sounds.length, 2);
  boss.eventLog.push({ type: 'infection', amount: 0, actionId: 'zero' }, { type: 'infection', amount: -4, actionId: 'relief' });
  synchronize(boss); assert.equal(sounds.length, 2);
  const snapshot = JSON.parse(JSON.stringify(boss)); boss.eventLog = [];
  synchronize(boss); synchronize(snapshot); assert.equal(sounds.length, 2);
  boss.eventLog.push({ type: 'infection', amount: 1, actionId: 'new' });
  synchronize(boss); assert.equal(sounds.length, 3);
});

test('objective modifiers emit one sound event with final clamped delta and no extra result sound', () => {
  const state = game('stars_hunt', 3, 'failure');
  state.boss.omegaBuff = { expiresRound: 99 };
  state.boss.hordeBuff = { entityId: 'infected', expiresRound: 99 };
  state.boss.danger = 99;
  executeBossDebugScenarioVariant(state);
  const events = state.boss.eventLog.filter(nemesisBossPresentation.resourceSoundEvent);
  assert.equal(events.length, 1); assert.equal(events[0].amount, 1);
  completeBossPlayerTurn(state, 0);
  assert.equal(state.boss.eventLog.filter(nemesisBossPresentation.resourceSoundEvent).length, 1);
});

test('creation, registry, menu and infection resource are integrated without active zombies', () => {
  const boss = createBossState('nemesis', 19);
  assert.equal(boss.hp, 2200); assert.equal(boss.danger, 0); assert.equal(boss.dangerType, 'infection');
  assert.deepEqual(boss.combatEntities.map((entry) => [entry.id, entry.hp, entry.status, entry.mutated]), [['grabber', 220, 'absent', false], ['infected', 240, 'absent', false], ['devourer', 260, 'absent', false]]);
  assert.equal(getBossDebugCatalog().find((entry) => entry.id === 'nemesis').abilities.length, 11);
  const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(index, /option value="nemesis"/); assert.match(index, /boss_nemesis/);
  assert.equal(nemesisDefinition.abilities.reduce((sum, ability) => sum + ability.weight, 0), 39);
  assert.deepEqual(NEMESIS_RELIEF, { simple: 0, suja: 0, limpa: 4, real: 8, asas: 12 });
});

test('real engine math routes damage, never overflows and does not change S.T.A.R.S. on minion hits', () => {
  const state = game(); state.boss.danger = 30;
  entity(state, 'grabber').hp = 50;
  const event = hit(state, { targetId: 'grabber', kind: 'real' });
  assert.equal(event.damage, 300); assert.equal(event.appliedDamage, 50); assert.equal(event.targetId, 'grabber');
  assert.equal(state.boss.hp, 2200); assert.equal(state.boss.danger, 22); assert.equal(state.boss.starsPlayerId, 0);
  assert.equal(entity(state, 'grabber').status, 'corpse'); assert.equal(entity(state, 'grabber').diedAt != null, true);
  assert.equal(setBossDamageTarget(state, 0, 'grabber'), false);
});

test('direct attacks assign and switch S.T.A.R.S.; target persists across reload', () => {
  const state = game(); state.players[1].name = 'Luana'; state.boss.starsPlayerId = null;
  hit(state, { cards: [{ id: 'a', rank: '3' }] }); assert.equal(state.boss.starsPlayerId, 0);
  hit(state, { playerId: 1, cards: [{ id: 'b', rank: '3' }] }); assert.equal(state.boss.starsPlayerId, 1);
  hit(state, { targetId: 'infected', cards: [{ id: 'c', rank: '3' }] }); assert.equal(state.boss.starsPlayerId, 1);
  assert.equal(simulateBossDebugReload(state).boss.starsPlayerId, 1);
});

test('incremental Limpa → Real → Asas relief is target-independent and idempotent', () => {
  const state = game(); state.boss.danger = 60;
  hit(state, { kind: 'limpa', targetId: 'devourer' }); assert.equal(state.boss.danger, 56);
  hit(state, { kind: 'real', targetId: 'devourer', oldKind: 'limpa' }); assert.equal(state.boss.danger, 52);
  hit(state, { kind: 'asas', targetId: 'boss', oldKind: 'real' }); assert.equal(state.boss.danger, 48);
  hit(state, { kind: 'asas', oldKind: 'asas' }); assert.equal(state.boss.danger, 48);
  const restored = simulateBossDebugReload(state); hit(restored, { kind: 'asas', oldKind: 'asas' }); assert.equal(restored.boss.danger, 48);
});

test('Suja and killing a zombie give no infection relief', () => {
  const state = game(); state.boss.danger = 40; entity(state, 'infected').hp = 10;
  hit(state, { kind: 'suja', targetId: 'infected' }); assert.equal(state.boss.danger, 40);
});

test('infection clamps, deduplicates real failures and defeats immediately at 100', () => {
  const state = game(); const boss = state.boss;
  assert.equal(changeNemesisInfection(boss, 8, 'fail1', { failure: true }), 10);
  assert.equal(changeNemesisInfection(boss, 8, 'fail1', { failure: true }), 0);
  dead(state, 'infected'); assert.equal(changeNemesisInfection(boss, 8, 'fail2', { failure: true }), 8);
  changeNemesisInfection(boss, -999, 'relief'); assert.equal(boss.danger, 0);
  changeNemesisInfection(boss, 101, 'lethal'); assert.equal(boss.danger, 100); assert.equal(boss.result.reason, 'max_infection');
});

test('Agarrador blocks playable hand cards after purchase, not discard; expires on owner turn end', () => {
  const state = game(); state.hasDrawnThisTurn = true;
  notifyBossPurchaseCompleted(state, 0);
  const id = state.boss.grabbedByPlayer[0].cardIds[0]; assert.ok(id);
  assert.equal(isBossCardBlocked(state, 0, id, 'play'), true);
  assert.equal(isBossCardBlocked(state, 0, id, 'discard'), false);
  assert.equal(isBossCardBlocked(state, 1, id, 'play'), false);
  completeBossPlayerTurn(state, 0); assert.equal(isBossCardBlocked(state, 0, id, 'play'), false);
});

test('closed pickup waits until purchase is complete; never grabs the mandatory top outside hand', () => {
  const state = game(); const pile = state.stock.splice(0, 3);
  notifyBossDiscardTaken(state, 0, pile);
  assert.equal(state.boss.grabbedByPlayer[0], undefined);
  state.players[0].hand.push(...pile.slice(0, -1));
  state.hasDrawnThisTurn = true; notifyBossPurchaseCompleted(state, 0);
  assert.equal(state.boss.grabbedByPlayer[0].cardIds.length, 1);
  assert.equal(isBossCardBlocked(state, 0, pile.at(-1).id), false);
});

test('death immediately removes grab passive even with outstanding serialized lock', () => {
  const state = game(); state.hasDrawnThisTurn = true; notifyBossPurchaseCompleted(state, 0);
  const id = state.boss.grabbedByPlayer[0].cardIds[0]; assert.equal(isBossCardBlocked(state, 0, id), true);
  dead(state, 'grabber'); assert.equal(isBossCardBlocked(state, 0, id), false);
});

test('F3 mutates living zombies; each zombie revives only once per match, in addition to phase quota', () => {
  const state = game('viral_reanimation', 2); activate(state);
  assert.equal(entity(state, 'grabber').hp, 110); assert.equal(entity(state, 'grabber').revivals, 1);
  dead(state, 'grabber'); assert.equal(inspectBossAbilityEligibility(state, 'viral_reanimation').eligible, false);
  state.boss.phase = 3; normalizeBossState(state);
  assert.equal(entity(state, 'devourer').mutated, true);
  assert.equal(entity(state, 'grabber').status, 'corpse');
  // F3 doesn't reset the lifetime limit. A different zombie remains eligible.
  assert.equal(inspectBossAbilityEligibility(state, 'viral_reanimation').eligible, false);
  dead(state, 'infected');
  state.boss.currentIntent = null; state.boss.bossFlow = null;
  selectNextBossIntent(state, { debug: true, forcedAbilityId: 'viral_reanimation' });
  const intent = state.boss.currentIntent;
  assert.equal(intent.payload.entityId, 'infected');
  nemesisBossMechanics.resolveIntent({ boss: state.boss, gameState: state, intent });
  assert.equal(entity(state, 'infected').mutated, true); assert.equal(entity(state, 'infected').hp, 120);
  assert.equal(entity(state, 'infected').revivals, 1);
  assert.equal(entity(state, 'grabber').status, 'corpse');
  dead(state, 'infected');
  assert.equal(inspectBossAbilityEligibility(state, 'viral_reanimation').eligible, false);
  // Even a stale announced F3 intent can't resurrect the same corpse twice.
  state.boss.reanimationsByPhase[3] = undefined;
  nemesisBossMechanics.resolveIntent({ boss: state.boss, gameState: state,
    intent: { id: 'stale-second', name: 'Reanimação Viral', announcedPhase: 3, abilityId: 'viral_reanimation', payload: { entityId: 'grabber' } } });
  assert.equal(entity(state, 'grabber').status, 'corpse');
  assert.equal(entity(state, 'grabber').revivals, 1);
  assert.equal(state.boss.reanimationsByPhase[3], undefined);
  normalizeBossState(state);
  assert.equal(entity(state, 'infected').revivals, 1);
  assert.equal(inspectBossAbilityEligibility(state, 'viral_reanimation').eligible, false);
});

test('Regeneration selects lowest percentage, caps HP, and excludes corpses/full health', () => {
  const state = game('parasite_regeneration', 2);
  entity(state, 'grabber').hp = 210; entity(state, 'infected').hp = 10;
  const payload = inspectBossAbilityEligibility(state, 'parasite_regeneration').payload;
  assert.equal(payload.entityId, 'infected');
  selectNextBossIntent(state, { debug: true, forcedAbilityId: 'parasite_regeneration' });
  nemesisBossMechanics.resolveIntent({ boss: state.boss, intent: state.boss.currentIntent });
  assert.equal(entity(state, 'infected').hp, 110);
  for (const item of state.boss.combatEntities) item.hp = item.maxHp;
  assert.equal(inspectBossAbilityEligibility(state, 'parasite_regeneration').eligible, false);
});

test('Devorador heals once per turn, caps boss HP, mutation/buff stack, death removes passive', () => {
  const state = game(); state.boss.hp = 2000;
  const cards = [1, 2, 3].map((id) => ({ id: `dev-${id}`, rank: '3' }));
  hit(state, { cards, targetId: 'grabber' }); assert.equal(state.boss.hp, 2040);
  hit(state, { cards: cards.map((card) => ({ ...card, id: `${card.id}-2` })), targetId: 'grabber' }); assert.equal(state.boss.hp, 2040);
  state.turnNumber++; state.boss.phase = 3; normalizeBossState(state);
  state.boss.hordeBuff = { entityId: 'devourer', expiresRound: 9 };
  hit(state, { cards: cards.map((card) => ({ ...card, id: `${card.id}-3` })), targetId: 'infected' }); assert.equal(state.boss.hp, 2140);
  dead(state, 'devourer'); state.turnNumber++;
  hit(state, { cards: cards.map((card) => ({ ...card, id: `${card.id}-4` })), targetId: 'infected' }); assert.equal(state.boss.hp, 2140);
  assert.equal(state.boss.devourerHealingTotal, 140);
});

test('Horde buffs normal/mutated passives and expires after the next round, through reload', () => {
  const state = game('horde_command', 3); const intent = activate(state);
  assert.equal(state.boss.hordeBuff.expiresRound, intent.activatedRound + 1);
  state.boss.roundNumber = state.boss.hordeBuff.expiresRound;
  nemesisBossMechanics.afterRoundAdvance({ boss: state.boss });
  assert.ok(state.boss.hordeBuff, 'command remains active through the final round, inclusive');
  state.boss.hordeBuff.entityId = 'grabber';
  state.hasDrawnThisTurn = true; notifyBossPurchaseCompleted(state, 0);
  assert.equal(state.boss.grabbedByPlayer[0].cardIds.length, 3);
  const restored = simulateBossDebugReload(state); assert.deepEqual(restored.boss.hordeBuff, state.boss.hordeBuff);
  state.boss.hordeBuff.entityId = 'infected';
  assert.equal(changeNemesisInfection(state.boss, 8, 'horde-fail', { failure: true }), 14);
  state.boss.roundNumber = intent.activatedRound + 2; nemesisBossMechanics.afterRoundAdvance({ boss: state.boss });
  assert.equal(state.boss.hordeBuff, null);
});

test('Comando da Horda rejects absent, entering, repelled and corpse; it never establishes an enemy', () => {
  for (const status of ['absent', 'entering', 'repelled', 'corpse']) {
    const state = fresh();
    state.boss.combatEntities.forEach(zombie => { zombie.status = status; zombie.hp = status === 'corpse' ? 0 : zombie.maxHp; });
    const before = state.boss.combatEntities.map(zombie => ({ ...zombie }));
    assert.equal(inspectBossAbilityEligibility(state, 'horde_command').eligible, false, status);
    assert.deepEqual(state.boss.combatEntities, before);
    assert.equal(state.boss.hordeBuff, null);
  }
});

test('Contaminated Zone costs 6, coexists with Grabber, is not a failure and does not block trash', () => {
  const state = game('contaminated_zone'); activate(state);
  const target = state.boss.currentIntent.payload.targetPlayerId;
  const events = notifyBossDiscardTaken(state, target, state.players[target].hand.slice(0, 3));
  state.currentPlayer = target; state.hasDrawnThisTurn = true; notifyBossPurchaseCompleted(state, target);
  assert.equal(state.boss.danger, 6); assert.equal(state.boss.grabbedByPlayer[target].cardIds.length, 1);
  assert.equal(events.length, 1); assert.equal(isBossDiscardBlocked(state, target), false);
  notifyBossDiscardTaken(state, target, state.players[target].hand.slice(0, 3)); assert.equal(state.boss.danger, 6);
});

test('Impact Zone uses stable meld ID after reordering, charges per new card without replay', () => {
  const state = game('rocket_launcher', 2); activate(state);
  const zone = state.boss.impactZone;
  const meld = state.teams[0].melds[zone.meldIndex];
  const card = state.players[0].hand.find((entry) => entry.rank === '10' && entry.suit === '♣');
  state.teams[0].melds.reverse(); const index = state.teams[0].melds.indexOf(meld);
  state.players[0].hand = state.players[0].hand.filter((entry) => entry.id !== card.id); meld.push(card);
  hit(state, { cards: [card], meldIndex: index }); assert.equal(state.boss.danger, 10);
  hit(state, { cards: [card], meldIndex: index }); assert.equal(state.boss.danger, 10);
  assert.ok(nemesisBossUi.meld({ boss: state.boss, meldId: zone.meldId }).divClasses.includes('nemesis-impact-zone'));
});

for (const [phase, cost] of [[2, 10], [3, 12]]) {
  test(`Impact Zone F${phase}: three together cost the same as three separate cards`, () => {
    const run = (together) => {
      const state = game('rocket_launcher', phase); activate(state);
      const zone = state.boss.impactZone;
      const meld = state.teams[0].melds[zone.meldIndex];
      const cards = ['10', 'J', 'Q'].map((rank, index) => ({ id: `impact-test-${index}`, rank, suit: meld[0].suit }));
      if (together) { meld.push(...cards); hit(state, { cards, meldIndex: zone.meldIndex }); }
      else for (const card of cards) { meld.push(card); hit(state, { cards: [card], meldIndex: zone.meldIndex }); }
      assert.equal(state.boss.danger, cost * 3);
      hit(state, { cards, meldIndex: zone.meldIndex });
      assert.equal(state.boss.danger, cost * 3, 'existing cards/replay are not charged again');
      return state.boss.danger;
    };
    assert.equal(run(true), run(false));
  });
}

for (const [id, phase, amount] of [['stars_hunt', 1, 10], ['infectious_tentacle', 2, 12], ['tentacle_barrage', 3, 20], ['stars_extermination', 3, 20]]) {
  test(`${id}: real success has no infection; real failure applies correct modifier once`, () => {
    const success = game(id, phase, 'success'); const result = executeBossDebugScenarioVariant(success);
    assert.equal(result.executed, true); assert.equal(success.boss.danger, 0);
    assert.ok(success.boss.eventLog.some((event) => event.type === 'nemesisObjective' && /sucesso/.test(event.outcome)));
    const failure = game(id, phase, 'failure'); executeBossDebugScenarioVariant(failure); assert.equal(failure.boss.danger, amount);
    completeBossPlayerTurn(failure, 0); assert.equal(failure.boss.danger, amount);
  });
}

test('Extermination gives 8 base for only one of two independent requirements', () => {
  const state = game('stars_extermination', 3); const intent = activate(state);
  const target = intent.payload.targetPlayerId;
  hit(state, { playerId: target, cards: [{id:'direct-test',rank:'3',suit:'♠'}] });
  completeBossPlayerTurn(state, target);
  assert.equal(state.boss.danger, 0, 'partner still has the rest of the round');
  completeBossPlayerTurn(state, intent.payload.partnerPlayerId);
  assert.equal(state.boss.danger, 12);
});

for (const [infection, bonus] of [[49, 2], [50, 4], [74, 4], [75, 6], [99, 6]]) {
  test(`Omega at infection ${infection}: activation is free and future failure uses +${bonus}`, () => {
    const state = game('omega_outbreak', 3); state.boss.danger = infection; activate(state);
    assert.equal(state.boss.danger, infection); assert.equal(state.boss.result, null);
    dead(state, 'infected');
    assert.equal(changeNemesisInfection(state.boss, 1, 'omega-fail', { failure: true }), Math.min(100 - infection, 1 + bonus));
  });
}

test('Hunt freezes S.T.A.R.S. even when that player cannot attack now', () => {
  const state = game(); state.boss.starsPlayerId = 1;
  assert.equal(inspectBossAbilityEligibility(state, 'stars_hunt').payload.targetPlayerId, 1);
  state.players[1].hand = [{ id: 'impossible', rank: 'K', suit: '♦' }];
  assert.equal(inspectBossAbilityEligibility(state, 'stars_hunt').eligible, true);
});

for (const id of ['stars_hunt', 'infectious_tentacle', 'tentacle_barrage', 'stars_extermination']) {
  test(`${id}: missing physical marks are rejected, impossible damage challenges remain eligible`, () => {
    const phase = id.includes('barrage') || id.includes('extermination') ? 3 : 1;
    const state = game(id, phase); state.players.forEach((player) => { player.hand = [{ id: `alone-${player.id}`, rank: 'K', suit: '♦' }]; });
    const needsMarks = ['infectious_tentacle', 'tentacle_barrage'].includes(id);
    assert.equal(inspectBossAbilityEligibility(state, id).eligible, !needsMarks);
    if (needsMarks) {
      assert.throws(() => selectNextBossIntent(state, { debug: true, forcedAbilityId: id }), /alvo legal/);
      assert.equal(state.boss.currentIntent, null);
    } else assert.equal(selectNextBossIntent(state, { debug: true, forcedAbilityId: id }).abilityId, id);
  });
}

test('Barrage cannot count two alternative plays of the same unique card as two exits', () => {
  const state = game('tentacle_barrage', 3);
  state.teams[0].melds = [[{ id: 'm1', rank: '3', suit: '♣' }, { id: 'm2', rank: '4', suit: '♣' }, { id: 'm3', rank: '5', suit: '♣' }]];
  state.players.forEach((player) => { player.hand = [{ id: `blocked-${player.id}`, rank: 'K', suit: '♦' }]; });
  assert.equal(inspectBossAbilityEligibility(state, 'tentacle_barrage').eligible, false);
});

test('all abilities/phases/variants preserve 108 cards and real laboratory success/failure/no-target', () => {
  const catalog = getBossDebugCatalog().find((entry) => entry.id === 'nemesis');
  for (const ability of catalog.abilities) for (const phase of ability.phases) for (const variant of ability.variants) {
    const state = game(ability.id, phase, variant.id);
    assert.equal(validateBossDebugScenario(state, { variant: variant.id }).valid, true, `${ability.id}/${phase}/${variant.id}`);
    if (['success', 'failure', 'no_target'].includes(variant.id)) {
      const result = executeBossDebugScenarioVariant(state);
      assert.equal(result.executed, true, `${ability.id}/${phase}/${variant.id}: ${result.reason}`);
      assert.equal(validateBossDebugScenario(state, { variant: variant.id }).totalCards, 108);
    }
  }
});

test('bot target heuristic values lethal boss, infection pressure and expensive healing, not only lowest HP', () => {
  const state = game(); state.boss.hp = 25;
  assert.equal(chooseNemesisDamageTarget(state, 300), 'boss');
  state.boss.hp = 2200; state.boss.danger = 90;
  assert.equal(chooseNemesisDamageTarget(state, 300), 'infected');
  state.boss.danger = 0; state.boss.devourerHealingTotal = 180;
  assert.equal(chooseNemesisDamageTarget(state, 400), 'devourer');
});

test('BOT chooses its actual damage target through the real engine and avoids lethal contaminated pickup', () => {
  const state = game('contaminated_zone', 3, 'bot', 'bot'); activate(state); state.boss.danger = 95;
  assert.equal(shouldBossBotTakeDiscard(state, 1, { intent: { wants: true } }), false);
  state.boss.bossFlow = null;
  const event = hit(state, { playerId: 1, kind: 'real' }); assert.equal(event.targetId, 'infected');
  assert.equal(entity(state, 'infected').status, 'corpse'); assert.equal(state.boss.hp, 2200);
});

test('BOT uses a legal marked Tentacle exit when full failure would be lethal', async () => {
  const state = game('infectious_tentacle', 1, 'bot', 'bot'); activate(state);
  state.boss.danger = 91;
  const priorities = getBossCombatPriorities(state, 1); assert.equal(priorities.active, true);
  let discarded;
  const engine = { getState: () => state, isActive: () => true, isCardBlocked: (player, id, action) => isBossCardBlocked(state, player, id, action),
    isValidSequenceMeld: () => false, getCombatPriorities: (id) => getBossCombatPriorities(state, id),
    executeDiscard: async (_index, handIndex) => { discarded = state.players[1].hand.splice(handIndex, 1)[0]; state.discard.push(discarded); notifyBossCardDiscarded(state, 1, discarded); completeBossPlayerTurn(state, 1); state.currentPlayer = 0; return true; } };
  await BossBuracoBot.processDiscard(1, 1, engine);
  assert.ok(priorities.markedCardIds.includes(discarded.id)); assert.equal(state.boss.danger, 97, 'discard-only partial: base 4 + Infectado 2; full failure would reach 100');
});

test('reload, snapshot and actual undo preserve all combat fields and duplicate-event guards', () => {
  const state = game('rocket_launcher', 3); activate(state);
  state.boss.combatTargetsByPlayer[0] = 'devourer'; state.boss.starsPlayerId = 1;
  state.boss.hordeBuff = { entityId: 'grabber', expiresRound: 6 }; state.boss.omegaBuff = { expiresRound: 6 };
  state.boss.reanimationsByPhase[2] = 'used'; state.hasDrawnThisTurn = true; notifyBossPurchaseCompleted(state, 0);
  changeNemesisInfection(state.boss, 8, 'saved-failure', { failure: true });
  const undo = createUndoTransaction(state, {}, { actorPlayerId: 0 });
  for (const restored of [simulateBossDebugReload(state), restoreBossDebugSnapshot(createBossDebugSnapshot(state)), restoreUndoTransaction(undo).state]) {
    assert.deepEqual(restored.boss, state.boss);
    assert.equal(changeNemesisInfection(restored.boss, 8, 'saved-failure', { failure: true }), 0);
    assert.equal(isBossCardBlocked(restored, 0, restored.boss.grabbedByPlayer[0].cardIds[0]), true);
  }
});

test('combat HUD hides dead targets and all choices when only Nemesis lives', () => {
  const state = game(); dead(state, 'grabber');
  let model = nemesisBossUi.combatHud({ gameState: state, playerId: 0 });
  assert.equal(model.choices.some((item) => item.id === 'grabber'), false); assert.equal(model.entities.length, 3);
  dead(state, 'infected'); dead(state, 'devourer'); model = nemesisBossUi.combatHud({ gameState: state, playerId: 0 }); assert.equal(model.choices.length, 0);
});

test('presentation explains infection and marked objectives, not unrelated debt mechanics', () => {
  const state = game('stars_extermination', 3); activate(state);
  const view = buildBossActionPresentation(state);
  assert.match(view.instruction, /ataque Nemesis.*Jogo/); assert.match(buildBossRuleSummary(state), /Infecção/);
  assert.doesNotMatch(view.instruction, /Dívida|Sede/);
});

test('final strike also honors explicit target and cannot spill damage', () => {
  const state = game(); state.boss.starsPlayerId = null;
  setBossDamageTarget(state, 0, 'grabber');
  const event = applyBossFinalStrike(state, 1000, 0);
  assert.equal(event.damage, 100); assert.equal(event.appliedDamage, 100); assert.equal(entity(state, 'grabber').hp, 120); assert.equal(state.boss.hp, 2200);
  assert.equal(state.boss.result.victory, false); assert.equal(state.boss.starsPlayerId, null);
  assert.match(nemesisBossUi.finalStrikeWarning({ gameState: game(), playerId: 0 }) || '', /^$/);
  const selected = game(); selected.boss.combatTargetsByPlayer[0] = 'infected';
  assert.match(nemesisBossUi.finalStrikeWarning({ gameState: selected, playerId: 0 }), /Infectado, não ao Nemesis/);
});

test('impact reaching 100 is immediately fatal even if the same action evolves a clean canastra', () => {
  const state = game('rocket_launcher', 2); activate(state); state.boss.danger = 95;
  const hpBefore = state.boss.hp;
  const zone = state.boss.impactZone;
  const card = state.players[0].hand.find((entry) => entry.rank === '10' && entry.suit === '♣');
  hit(state, { kind: 'real', cards: [card], meldIndex: zone.meldIndex });
  assert.equal(state.boss.result.reason, 'max_infection');
  assert.equal(state.boss.result.victory, false);
  assert.equal(state.boss.danger, 100); assert.equal(state.boss.hp, hpBefore);
});

test('Barrage permits a discard-only hand to fail or make partial progress', () => {
  const state = game('tentacle_barrage', 3);
  state.players.forEach((player) => { player.hand = [
    { id: `a-${player.id}`, rank: '4', suit: '♦' },
    { id: `b-${player.id}`, rank: '8', suit: '♥' },
    { id: `c-${player.id}`, rank: 'K', suit: '♠' },
  ]; });
  state.teams[0].melds = [];
  assert.equal(inspectBossAbilityEligibility(state, 'tentacle_barrage').eligible, true);
});

test('Omega and impact expire by round, and no live zombie makes Horde ineligible', () => {
  const state = game('omega_outbreak', 3); activate(state);
  const expires = state.boss.omegaBuff.expiresRound;
  state.boss.impactZone = { meldId: 'old', expiresRound: expires - 1 };
  state.boss.roundNumber = expires;
  nemesisBossMechanics.afterRoundAdvance({ boss: state.boss });
  assert.ok(state.boss.omegaBuff); assert.equal(state.boss.impactZone, null);
  state.boss.roundNumber++;
  nemesisBossMechanics.afterRoundAdvance({ boss: state.boss });
  assert.equal(state.boss.omegaBuff, null);
  state.boss.combatEntities.forEach((entry) => dead(state, entry.id));
  assert.equal(inspectBossAbilityEligibility(state, 'horde_command').eligible, false);
});

test('BOT executes a real contribution then legal discard to solve S.T.A.R.S. Hunt', async () => {
  const state = game('stars_hunt', 1, 'bot', 'bot'); activate(state);
  const bot = state.players[1];
  let contributions = 0;
  const engine = { getState: () => state, isActive: () => true, getCombatPriorities: (id) => getBossCombatPriorities(state, id),
    canTeamTakeDeadNow: () => true, teamHasGoodCanastra: () => false, canCreateMeld: () => false,
    isCardBlocked: (id, cardId, action) => isBossCardBlocked(state, id, cardId, action), isValidSequenceMeld: isValidBossSequence,
    paceBetweenActions: async () => {},
    executeMeldExtend: async (_index, meldIndex, indexes) => {
      const cards = indexes.map((index) => bot.hand[index]);
      bot.hand = bot.hand.filter((card) => !cards.includes(card)); state.teams[0].melds[meldIndex].push(...cards);
      applyBossMeldTransition(state, { teamId: 0, playerId: 1, meldIndex, oldKind: 'simple', newKind: 'simple', cardsAdded: cards });
      contributions++; return true;
    },
    executeMeldNew: async () => { throw new Error('The valid debug plan must extend its existing meld.'); },
    executeDiscard: async (_index, handIndex) => {
      const card = bot.hand.splice(handIndex, 1)[0]; state.discard.push(card);
      notifyBossCardDiscarded(state, 1, card); completeBossPlayerTurn(state, 1); state.currentPlayer = 0; return true;
    },
  };
  await BossBuracoBot.processMelds(1, {}, engine);
  assert.ok(contributions > 0); assert.equal(state.boss.currentIntent.payload.contributed, true);
  await BossBuracoBot.processDiscard(1, 1, engine);
  assert.equal(state.boss.danger, 0);
});

test('BOT objective plan cannot bypass safe-finish guard', async () => {
  const state = game('stars_hunt', 1, 'bot', 'bot'); activate(state);
  const bot = state.players[1]; bot.hand = bot.hand.slice(0, 2);
  const engine = { getState: () => state, isActive: () => true,
    getCombatPriorities: () => ({ plan: { moves: [{ meldIndex: 0, cardIds: [bot.hand[0].id] }] } }),
    canTeamTakeDeadNow: () => false, teamHasGoodCanastra: () => false, canSafelyFinishBoss: () => false,
    canCreateMeld: () => false, isValidSequenceMeld: () => false,
    executeMeldExtend: async () => { throw new Error('Unsafe finishing must not execute.'); },
  };
  await BossBuracoBot.processMelds(1, {}, engine);
  assert.equal(bot.hand.length, 2);
});

test('new rules remain isolated in adapters and all required assets are cached', () => {
  const engine = fs.readFileSync(new URL('../js/boss/boss-engine.js', import.meta.url), 'utf8');
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(engine, /boss\.id === 'nemesis'/); assert.doesNotMatch(app, /boss\.id === 'nemesis'/);
  const sw = fs.readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
  for (const path of ['js/boss/boss-combat.js', 'js/boss/bosses/nemesis.js', 'js/boss/mechanics/nemesis.js', 'js/boss/presentation/nemesis.js', 'js/boss/ui/nemesis-ui.js', 'styles/boss/nemesis.css', 'assets/images/nemesis-agarrador.png', 'assets/images/nemesis-infectado.png', 'assets/images/nemesis-devorador.png', 'assets/sfx/ganho-infeccao-nemesis.mp3']) assert.ok(sw.includes(path));
});

const invasion = (kind, phase = 1, variant = 'interactive') => buildBossDebugScenario(null, { bossId: 'nemesis', abilityId: 'horde_invasion', phase, variant, target: `zombie_${kind}` }).state;
const fresh = () => { const state = game(); state.boss = createBossState('nemesis', 41721); return state; };

for (const kind of ['grabber', 'infected', 'devourer']) {
  test(`Invasion ${kind}: announce, repel and actual failure without extra infection`, () => {
    const success = invasion(kind, 3, 'success');
    activate(success);
    assert.equal(entity(success, kind).status, 'entering');
    assert.equal(entity(success, kind).mutated, false);
    assert.equal(setBossDamageTarget(success, 0, kind), false);
    const result = executeBossDebugScenarioVariant(success);
    assert.equal(result.executed, true); assert.equal(entity(success, kind).status, 'repelled');
    assert.equal(entity(success, kind).hp, entity(success, kind).maxHp);
    assert.equal(success.boss.danger, 0); assert.equal(success.boss.lastRepelledZombieId, kind);
    const failure = invasion(kind, 3, 'failure'); activate(failure);
    assert.equal(executeBossDebugScenarioVariant(failure).executed, true);
    assert.equal(entity(failure, kind).status, 'persistent');
    assert.equal(entity(failure, kind).hp, entity(failure, kind).maxHp);
    assert.equal(entity(failure, kind).mutated, true); assert.equal(failure.boss.danger, 0);
  });
  test(`Invasion ${kind}: reload, snapshot and undo preserve entering objective`, () => {
    const state = invasion(kind); activate(state);
    const snapshot = createBossDebugSnapshot(state);
    const undo = createUndoTransaction(state, {}, { actorPlayerId: 0 });
    for (const restored of [simulateBossDebugReload(state), restoreBossDebugSnapshot(snapshot), restoreUndoTransaction(undo).state]) {
      assert.deepEqual(restored.boss, state.boss);
      assert.equal(entity(restored, kind).status, 'entering');
      assert.equal(inspectBossAbilityEligibility(restored, 'viral_reanimation', { debug: true }).eligible, false);
    }
  });
}

test('old living/dead snapshots migrate without resetting HP, selection, quota or buffs', () => {
  const state = fresh(); delete state.boss.combatLifecycleVersion;
  entity(state, 'grabber').status = 'alive'; entity(state, 'grabber').hp = 91;
  entity(state, 'infected').status = 'dead'; entity(state, 'infected').hp = 0;
  entity(state, 'devourer').status = 'alive'; entity(state, 'devourer').hp = 230;
  state.boss.starsPlayerId = 1; state.boss.combatTargetsByPlayer[0] = 'grabber';
  state.boss.reanimationsByPhase[2] = 'kept'; state.boss.hordeBuff = { entityId: 'grabber', expiresRound: 6 };
  normalizeBossState(state);
  assert.deepEqual(state.boss.combatEntities.map((entry) => [entry.status, entry.hp]), [['persistent', 91], ['corpse', 0], ['persistent', 230]]);
  assert.equal(state.boss.starsPlayerId, 1); assert.equal(state.boss.combatTargetsByPlayer[0], 'grabber');
  assert.equal(state.boss.reanimationsByPhase[2], 'kept'); assert.equal(state.boss.hordeBuff.expiresRound, 6);
  const once = JSON.stringify(state.boss); normalizeBossState(state); assert.equal(JSON.stringify(state.boss), once);
});

test('absent, entering, repelled and corpse never apply passives or allow damage selection', () => {
  for (const status of ['absent', 'entering', 'repelled', 'corpse']) {
    const state = fresh(); state.boss.bossFlow = null;
    for (const entry of state.boss.combatEntities) { entry.status = status; if (status === 'corpse') entry.hp = 0; }
    assert.equal(changeNemesisInfection(state.boss, 8, `failure-${status}`, { failure: true }), 8);
    notifyBossDiscardTaken(state, 0, state.players[0].hand.slice(0, 3));
    assert.equal(state.boss.grabbedByPlayer[0], undefined);
    state.boss.hp = 2000;
    hit(state, { cards: [1, 2, 3].map((id) => ({ id: `nonpersistent-${id}`, rank: '3' })) });
    assert.equal(state.boss.hp, 1985);
    for (const entry of state.boss.combatEntities) assert.equal(setBossDamageTarget(state, 0, entry.id), false);
    assert.equal(chooseNemesisDamageTarget(state, 300), 'boss');
  }
});

test('repelled can reenter but is neither corpse nor regenerative/reanimation target', () => {
  const state = fresh(); state.boss.phase = 2;
  entity(state, 'grabber').status = 'repelled'; entity(state, 'grabber').hp = 12;
  assert.equal(inspectBossAbilityEligibility(state, 'viral_reanimation').eligible, false);
  assert.equal(inspectBossAbilityEligibility(state, 'parasite_regeneration').eligible, false);
  for (const id of ['infected', 'devourer']) dead(state, id);
  assert.equal(inspectBossAbilityEligibility(state, 'horde_invasion').payload.entityId, 'grabber');
  const intent = selectNextBossIntent(state, { debug: true, forcedAbilityId: 'horde_invasion' });
  nemesisBossMechanics.resolveIntent({ boss: state.boss, intent });
  assert.equal(entity(state, 'grabber').status, 'persistent'); assert.equal(entity(state, 'grabber').hp, 220);
});

test('last repelled is not selected immediately while another legal entrant exists', () => {
  const state = fresh(); entity(state, 'grabber').status = 'repelled'; state.boss.lastRepelledZombieId = 'grabber';
  for (let seed = 0; seed < 20; seed++) { state.boss.seed = seed; assert.notEqual(inspectBossAbilityEligibility(state, 'horde_invasion').payload.entityId, 'grabber'); }
  dead(state, 'infected'); dead(state, 'devourer');
  assert.equal(inspectBossAbilityEligibility(state, 'horde_invasion').payload.entityId, 'grabber');
});

for (const phase of [1, 2, 3]) test(`phase ${phase}: persistent ceiling prevents invasion and revival`, () => {
  const state = fresh(); state.boss.phase = phase;
  for (const entry of state.boss.combatEntities.slice(0, phase)) entry.status = 'persistent';
  assert.equal(inspectBossAbilityEligibility(state, 'horde_invasion').eligible, false);
  if (phase < 3) dead(state, state.boss.combatEntities[phase].id);
  assert.equal(inspectBossAbilityEligibility(state, 'viral_reanimation', { debug: true }).eligible, false);
  dead(state, 'grabber');
  if (phase >= 2) assert.equal(inspectBossAbilityEligibility(state, 'viral_reanimation').eligible, true);
});

test('Infectado entry remains possible without contributions or existing games', () => {
  const state = fresh(); state.teams[0].melds = [];
  state.players.forEach((player) => player.hand = [{ id: `single-${player.id}`, rank: 'K', suit: '♦' }]);
  assert.equal(inspectBossAbilityEligibility(state, 'horde_invasion').eligible, true);
  entity(state, 'grabber').status = 'corpse'; entity(state, 'grabber').hp = 0;
  assert.equal(inspectBossAbilityEligibility(state, 'horde_invasion').eligible, true);
});

test('marked objectives choose actually playable cards; sacrificing one still resolves the mark', () => {
  for (const abilityId of ['infectious_tentacle', 'tentacle_barrage', 'horde_invasion']) {
    const state = fresh(); state.boss.phase = 3; state.boss.phaseTransitions = [1, 2, 3];
    if (abilityId === 'horde_invasion') { dead(state, 'infected'); dead(state, 'devourer'); }
    state.teams[0].melds = [];
    state.players[0].hand = [
      { id: 'useless-first', rank: 'K', suit: '♠' },
      ...['7', '8', '9'].map(rank => ({ id: `legal-${rank}`, rank, suit: '♥' })),
      { id: 'keep', rank: 'Q', suit: '♦' },
    ];
    state.players[1].hand = [{ id: 'partner-useless', rank: 'K', suit: '♦' }];
    const eligibility = inspectBossAbilityEligibility(state, abilityId);
    assert.equal(eligibility.eligible, true, abilityId);
    const payload = eligibility.payload;
    const marked = payload.cardIds || [payload.secondCardId];
    assert.ok(marked.every(id => id.startsWith('legal-')), `${abilityId}: useless discard is not a mark`);
    assert.equal(payload.solution, undefined, 'eligibility does not persist a precomputed success plan');
    queueDebugBossAbility(state, abilityId);
    const intent = activate(state);
    assert.equal(intent.abilityId, abilityId);
    const markedCard = state.players[0].hand.find(card => card.id === marked[0]);
    notifyBossCardDiscarded(state, 0, markedCard);
    assert.ok(intent.payload.exitedCardIds?.includes(markedCard.id) || intent.payload.secondExited);
  }
});

test('marks accept legal discards; Extermination still requires a real existing game', () => {
  for (const id of ['infectious_tentacle', 'tentacle_barrage', 'stars_extermination']) {
    const state = fresh(); state.boss.phase = 3; state.boss.phaseTransitions = [1, 2, 3]; state.teams[0].melds = [];
    state.players.forEach((player) => { player.hand = ['4', '8', 'K'].map((rank, index) => ({ id: `${player.id}:${rank}`, rank, suit: ['♠', '♥', '♦'][index] })); });
    const eligible = id !== 'stars_extermination';
    assert.equal(inspectBossAbilityEligibility(state, id).eligible, eligible);
    if (eligible) assert.equal(selectNextBossIntent(state, { debug:true, forcedAbilityId:id }).abilityId, id);
    else assert.throws(() => selectNextBossIntent(state, { debug:true, forcedAbilityId:id }), /alvo legal/);
  }
});

test('Barrage and Extermination do not require joint success routes', () => {
  for (const id of ['tentacle_barrage', 'stars_extermination']) {
    const state = fresh(); state.boss.phase = 3;
    state.teams[0].melds = [[{ id: 'm3', rank: '3', suit: '♥' }, { id: 'm4', rank: '4', suit: '♥' }, { id: 'm5', rank: '5', suit: '♥' }]];
    state.players.forEach(player => { player.hand = [{ id: `${player.id}:6`, rank: '6', suit: '♥' }, { id: `${player.id}:Q`, rank: 'Q', suit: '♠' }, { id: `${player.id}:K`, rank: 'K', suit: '♦' }]; });
    assert.equal(inspectBossAbilityEligibility(state, id).eligible, true);
  }
});

test('zombie chips show final passive amounts and specific mutation/command duration help', () => {
  const state = fresh(); state.boss.roundNumber = 4;
  for (const [id, labels] of [['grabber', ['AGARRA 1', 'AGARRA 2', 'AGARRA 3']], ['infected', ['INFECÇÃO +2', 'INFECÇÃO +4', 'INFECÇÃO +6']], ['devourer', ['CURA 40', 'CURA 70', 'CURA 100']]]) {
    const zombie = entity(state, id); zombie.status = 'persistent';
    for (let stage = 0; stage < 3; stage++) {
      zombie.mutated = stage >= 1;
      state.boss.hordeBuff = stage === 2 ? { entityId: id, expiresRound: 5 } : null;
      const model = nemesisBossUi.combatHud({ gameState: state, playerId: 0 }).entities.find(entry => entry.id === id);
      assert.equal(model.chips.at(-1).label, labels[stage]);
      if (stage === 2) assert.match(model.chips.find(chip => chip.label === 'REFORÇADO').text, /fim da rodada 5, inclusive/);
    }
    state.boss.roundNumber = 6;
    assert.equal(nemesisBossUi.combatHud({ gameState: state, playerId: 0 }).entities.find(entry => entry.id === id).chips.at(-1).label, labels[1]);
    state.boss.roundNumber = 4;
    zombie.mutated = false;
    assert.equal(nemesisBossUi.combatHud({ gameState: state, playerId: 0 }).entities.find(entry => entry.id === id).chips.at(-1).label, labels[1], 'normal + reforço has the same total as mutation alone');
  }
});

test('Devorador eligibility requires one legal contribution, not a complete expulsion plan', () => {
  const state = fresh(); dead(state, 'grabber'); dead(state, 'infected');
  state.teams[0].melds = [0, 1].map((meld) => ['4', '5', '6'].map((rank) => ({ id: `${meld}-${rank}`, rank, suit: '♦' })));
  state.players[0].hand = [{ id: 'shared-seven', rank: '7', suit: '♦' }, { id: 'keep', rank: 'K', suit: '♠' }];
  state.players[1].hand = [{ id: 'partner-keep', rank: 'K', suit: '♥' }];
  assert.equal(inspectBossAbilityEligibility(state, 'horde_invasion').eligible, true);
});

test('Agarrador never marks an illegal last-card discard without Morto or good canastra', () => {
  const state = fresh(); state.deadPiles = []; state.deadChunksTaken = [1]; state.deadChunksMax = [1];
  dead(state, 'infected'); dead(state, 'devourer');
  state.teams[0].melds = [];
  state.players.forEach((player) => player.hand = [{ id: `last-${player.id}`, rank: 'K', suit: '♠' }]);
  assert.equal(inspectBossAbilityEligibility(state, 'horde_invasion').eligible, false);
});

test('Infectado accepts two actual cooperative contributions from different players', () => {
  const state = fresh(); dead(state, 'grabber'); dead(state, 'devourer');
  state.teams[0].melds = [['4', '5', '6'].map((rank) => ({ id: `base-${rank}`, rank, suit: '♦' }))];
  state.players[0].hand = [{ id: 'p0-seven', rank: '7', suit: '♦' }, { id: 'p0-keep', rank: 'K', suit: '♠' }];
  state.players[1].hand = [{ id: 'p1-eight', rank: '8', suit: '♦' }, { id: 'p1-keep', rank: 'K', suit: '♥' }];
  const eligibility = inspectBossAbilityEligibility(state, 'horde_invasion');
  assert.equal(eligibility.eligible, true);
  assert.equal(eligibility.payload.solution, undefined);
  state.boss.roundFirstPlayerId = 1;
  // Eight cannot be played before seven; this is difficulty, not an invalid target.
  assert.equal(inspectBossAbilityEligibility(state, 'horde_invasion').eligible, true);
});

for (const kind of ['grabber', 'infected', 'devourer']) test(`BOT plays real legal actions to repel entering ${kind}`, async () => {
  const state = invasion(kind, 2); state.boss.starsPlayerId = 1;
  // The queued real selector reads S.T.A.R.S. at announcement time.
  activate(state);
  const intent = state.boss.currentIntent;
  assert.equal(intent.payload.entityId, kind);
  let plays = 0;
  const engine = {
    getState: () => state, isActive: () => true, getCombatPriorities: (id) => getBossCombatPriorities(state, id),
    canTeamTakeDeadNow: () => true, teamHasGoodCanastra: () => false, canCreateMeld: () => false,
    isCardBlocked: (id, cardId, action) => isBossCardBlocked(state, id, cardId, action), isValidSequenceMeld: isValidBossSequence,
    paceBetweenActions: async () => {},
    executeMeldExtend: async (playerIndex, meldIndex, indexes) => {
      const player = state.players[playerIndex]; const cards = indexes.map((index) => player.hand[index]);
      assert.equal(isValidBossSequence([...state.teams[0].melds[meldIndex], ...cards]), true);
      player.hand = player.hand.filter((card) => !cards.includes(card)); state.teams[0].melds[meldIndex].push(...cards);
      applyBossMeldTransition(state, { teamId: 0, playerId: player.id, meldIndex, oldKind: 'simple', newKind: 'simple', cardsAdded: cards });
      plays++; return true;
    },
    executeMeldNew: async (playerIndex, indexes) => {
      const player = state.players[playerIndex]; const cards = indexes.map((index) => player.hand[index]);
      assert.equal(isValidBossSequence(cards), true);
      player.hand = player.hand.filter((card) => !cards.includes(card)); const meldIndex = state.teams[0].melds.push(cards) - 1;
      applyBossMeldTransition(state, { teamId: 0, playerId: player.id, meldIndex, oldKind: 'simple', newKind: 'simple', cardsAdded: cards, isNewMeld: true });
      plays++; return true;
    },
    executeDiscard: async (playerIndex, handIndex) => {
      const player = state.players[playerIndex]; const card = player.hand.splice(handIndex, 1)[0];
      assert.equal(isBossCardBlocked(state, player.id, card.id, 'discard'), false);
      state.discard.push(card); notifyBossCardDiscarded(state, player.id, card); completeBossPlayerTurn(state, player.id); return true;
    },
  };
  // Drive actual BOT actions for each cooperador, including its legal discard.
  for (const index of [1, 0]) {
    state.currentPlayer = index;
    await BossBuracoBot.processMelds(index, {}, engine);
    await BossBuracoBot.processDiscard(index, 1, engine);
  }
  nemesisBossMechanics.resolveIntent({ boss: state.boss, intent });
  assert.equal(entity(state, kind).status, 'repelled');
  if (kind !== 'grabber') assert.ok(plays >= 1);
  assert.equal(state.boss.danger, 0);
});

test('Laboratory caps, mixed states and anti-repeat variants prepare consistent real scenarios', () => {
  for (const phase of [1, 2, 3]) for (const target of ['auto', 'zombie_grabber', 'zombie_infected', 'zombie_devourer']) {
    const scenario = buildBossDebugScenario(null, { bossId: 'nemesis', abilityId: 'horde_invasion', phase, variant: 'phase_cap', target });
    assert.equal(scenario.state.boss.combatEntities.filter((entry) => entry.status === 'persistent' && entry.hp > 0).length, phase);
    assert.equal(scenario.expectedIntent, null); assert.equal(executeBossDebugScenarioVariant(scenario.state).executed, true);
  }
  for (const variant of ['reentry', 'avoid_repeat', 'persistent_corpse']) {
    const scenario = buildBossDebugScenario(null, { bossId: 'nemesis', abilityId: 'horde_invasion', phase: 2, variant, target: 'zombie_grabber' });
    assert.equal(validateBossDebugScenario(scenario.state).valid, true);
    if (variant === 'avoid_repeat') assert.notEqual(scenario.expectedIntent.payload.entityId, 'grabber');
    const reload = simulateBossDebugReload(scenario.state); assert.deepEqual(reload.boss, scenario.state.boss);
  }
  assert.match(getBossDebugResourceState(fresh()).label, /INFECÇÃO/);
});

test('new combat HUD is empty, entering is contextual, help contains exact passive and reinforced values', () => {
  const state = fresh(); assert.equal(nemesisBossUi.combatHud({ gameState: state, playerId: 0 }).entities.length, 0);
  entity(state, 'grabber').status = 'entering';
  let model = nemesisBossUi.combatHud({ gameState: state, playerId: 0 });
  assert.equal(model.entities[0].stateLabel, 'INVADINDO'); assert.equal(model.entities[0].selectable, false);
  entity(state, 'grabber').status = 'persistent'; state.boss.hordeBuff = { entityId: 'grabber', expiresRound: 9, sourceIntentId: 'buff' };
  model = nemesisBossUi.combatHud({ gameState: state, playerId: 0 });
  assert.equal(model.entities[0].stateLabel, 'DEBUFF REFORÇADO');
  assert.match(model.entities[0].help, /Prende 1 carta; Mutado ou Reforçado prende 2; com ambos, 3/);
  assert.match(model.entities[0].help, /Prefere cartas jogáveis e completa com outras da mão/);
  assert.match(model.entities[0].help, /Só prende menos se faltarem cartas ou para manter um objetivo possível/);
  assert.deepEqual(model.choices.map((entry) => entry.id), ['boss']);
  dead(state, 'grabber'); model = nemesisBossUi.combatHud({ gameState: state, playerId: 0 });
  assert.equal(model.entities[0].stateLabel, 'CADÁVER'); assert.equal(model.entities[0].selectable, false);
});

test('defeat title follows the actual cause, not infection when bar is below 100', () => {
  const final = fresh(); applyBossFinalStrike(final, 0, 0);
  assert.equal(final.boss.result.reason, 'insufficient_final_strike'); assert.equal(final.boss.result.title, 'Nemesis sobreviveu');
  const empty = fresh(); applyBossResourceDefeat(empty);
  assert.equal(empty.boss.result.title, 'Recursos esgotados');
  const infected = fresh(); changeNemesisInfection(infected.boss, 100, 'total');
  assert.equal(infected.boss.result.title, 'Infecção Total');
});

test('Zona requires a legal closed pickup, rejects blocked and unrelated hands', () => {
  const state = fresh(); state.players.forEach((player) => player.hand = [{ id: `unrelated-${player.id}`, rank: 'K', suit: '♠' }]);
  state.teams[0].melds = []; state.discard = [{ id: 'trash', rank: '4', suit: '♦' }];
  assert.equal(inspectBossAbilityEligibility(state, 'contaminated_zone').eligible, false);
  state.players[0].hand = [{ id: 'five', rank: '5', suit: '♦' }, { id: 'six', rank: '6', suit: '♦' }, { id: 'keep', rank: 'K', suit: '♠' }];
  assert.equal(inspectBossAbilityEligibility(state, 'contaminated_zone').eligible, true);
  entity(state, 'grabber').status = 'persistent'; state.boss.grabbedByPlayer[0] = { cardIds: ['five'] };
  assert.equal(inspectBossAbilityEligibility(state, 'contaminated_zone').eligible, false);
  state.boss.grabbedByPlayer = {}; state.boss.chainsByPlayer = { 0: 4, 1: 4 };
  assert.equal(inspectBossAbilityEligibility(state, 'contaminated_zone').eligible, false);
});
