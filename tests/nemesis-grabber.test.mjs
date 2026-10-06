import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBossDebugScenario, createBossDebugSnapshot, restoreBossDebugSnapshot, simulateBossDebugReload } from '../js/boss/boss-debug-scenarios.js';
import { notifyBossPurchaseCompleted, notifyBossDiscardTaken, isBossCardBlocked, completeBossPlayerTurn, getBossCombatPriorities,
  normalizeBossState, beginBossTurn, advanceBossTurn, applyBossMeldTransition, notifyBossCardDiscarded, isValidBossSequence } from '../js/boss/boss-engine.js';
import { createUndoTransaction, restoreUndoTransaction } from '../js/game/undo-transaction.js';
import { nemesisBossMechanics, getNemesisZombieEffect } from '../js/boss/mechanics/nemesis.js';
import { BossBuracoBot } from '../boss-bot.js';

const fixture = () => {
  const state = buildBossDebugScenario(null, { bossId: 'nemesis', abilityId: 'horde_command', phase: 1 }).state;
  state.boss.currentIntent = null; state.boss.bossFlow = null; state.currentPlayer = 0;
  return state;
};
const grabber = s => s.boss.combatEntities.find(e => e.id === 'grabber');
function buy(s, playerId, source = 'stock') {
  s.currentPlayer = s.players.findIndex(p => p.id === playerId);
  if (source === 'discard') {
    const acquired = s.discard.splice(0); s.players[s.currentPlayer].hand.push(...acquired);
    notifyBossDiscardTaken(s, playerId, acquired);
  } else s.players[s.currentPlayer].hand.push(s.stock.pop());
  s.hasDrawnThisTurn = true; s.partialDraw = false;
  return notifyBossPurchaseCompleted(s, playerId);
}

for (const [mutated, reinforced, count] of [[false,false,1],[true,false,2],[false,true,2],[true,true,3]]) {
  for (const source of ['stock', 'discard']) test(`Grabber ${mutated}/${reinforced}: ${count} playable hand cards after ${source}`, () => {
    const s = fixture(); grabber(s).mutated = mutated;
    if (reinforced) s.boss.hordeBuff = { entityId: 'grabber', expiresRound: s.boss.roundNumber + 1 };
    const events = buy(s, 0, source);
    assert.equal(events.length, 1); assert.equal(events[0].type, 'nemesisGrab');
    assert.equal(getNemesisZombieEffect(s.boss, grabber(s)).value, count);
    const ids = s.boss.grabbedByPlayer[0].cardIds;
    assert.equal(ids.length, count);
    for (const id of ids) {
      assert.ok(s.players[0].hand.some(c => c.id === id));
      assert.equal(isBossCardBlocked(s, 0, id, 'play'), true);
      assert.equal(isBossCardBlocked(s, 0, id, 'discard'), false);
      assert.equal(isBossCardBlocked(s, 1, id, 'play'), false);
    }
    const eventCount = s.boss.eventLog.length;
    for (const restored of [s, simulateBossDebugReload(s), restoreBossDebugSnapshot(createBossDebugSnapshot(s)), restoreUndoTransaction(createUndoTransaction(s, {}, { actorPlayerId: 0 })).state]) {
      assert.deepEqual(notifyBossPurchaseCompleted(restored, 0), []);
      assert.equal(restored.boss.eventLog.length, eventCount);
      assert.deepEqual(restored.boss.grabbedByPlayer[0].cardIds, ids);
    }
    completeBossPlayerTurn(s, 0);
    ids.forEach(id => assert.equal(isBossCardBlocked(s, 0, id), false));
    s.turnNumber++; s.hasDrawnThisTurn = false;
    buy(s, 1, source); assert.equal(s.boss.grabbedByPlayer[1].cardIds.length, count);
    assert.equal(s.boss.grabbedByPlayer[0], undefined);
  });
}

test('No usable safe card: no punishment, movement or empty pulse event; partial purchase does not trigger', () => {
  const s = fixture(); s.players[0].hand = [{ id: 'x', rank: '4', suit: '♠' }]; s.teams[0].melds = [];
  s.hasDrawnThisTurn = true; s.partialDraw = true;
  assert.deepEqual(notifyBossPurchaseCompleted(s, 0), []); assert.equal(s.boss.grabbedTurnIds.length, 0);
  s.partialDraw = false;
  const before = JSON.stringify([s.players, s.stock, s.discard, s.boss.hp, s.boss.danger]);
  assert.deepEqual(notifyBossPurchaseCompleted(s, 0), []);
  assert.deepEqual(s.boss.grabbedByPlayer[0].cardIds, []);
  assert.equal(JSON.stringify([s.players, s.stock, s.discard, s.boss.hp, s.boss.danger]), before);
  assert.equal(s.boss.eventLog.filter(e => e.type === 'nemesisGrab').length, 0);
});

for (const abilityId of ['stars_hunt','infectious_tentacle','tentacle_barrage','stars_extermination']) test(`Grabber preserves an actual solution to ${abilityId}`, () => {
  const s = buildBossDebugScenario(null, { bossId: 'nemesis', abilityId, phase: 3, variant: 'interactive' }).state;
  grabber(s).status = 'persistent'; s.boss.hordeBuff = { entityId: 'grabber', expiresRound: 9 };
  beginBossTurn(s, { first: true, now: 1000, debug: true });
  for (let i = 0; i < 15 && s.boss.bossFlow.stage !== 'players'; i++) advanceBossTurn(s, s.boss.bossFlow.endsAt + 1);
  const id = s.boss.currentIntent.payload.targetPlayerId; s.currentPlayer = id;
  const before = getBossCombatPriorities(s, id); assert.ok(before.plan, 'canonical route exists before restriction');
  buy(s, id);
  assert.ok(getBossCombatPriorities(s, id).plan, 'a complete legal route still exists after restriction');
  for (const cardId of [...before.plan.playedCardIds, before.plan.discardCardId].filter(Boolean)) assert.equal(isBossCardBlocked(s, id, cardId), false);
});

for (const kind of ['infected','devourer']) test(`Grabber preserves cooperative Invasion ${kind} across both players`, () => {
  const s = buildBossDebugScenario(null, { bossId: 'nemesis', abilityId: 'horde_invasion', phase: 2, target: `zombie_${kind}` }).state;
  grabber(s).status = 'persistent'; grabber(s).hp = grabber(s).maxHp;
  beginBossTurn(s, { first: true, now: 1000, debug: true });
  for (let i = 0; i < 15 && s.boss.bossFlow.stage !== 'players'; i++) advanceBossTurn(s, s.boss.bossFlow.endsAt + 1);
  assert.equal(s.boss.currentIntent.payload.entryKind, kind);
  for (const player of s.players) {
    s.currentPlayer = player.id; const plan = getBossCombatPriorities(s, player.id).plan;
    assert.ok(plan); buy(s, player.id);
    assert.ok(getBossCombatPriorities(s, player.id).plan);
  }
});

for (const kind of ['infected','devourer']) test(`Grabber preserves remaining cooperative ${kind} requirement after the partner actually contributes`, () => {
  const s = buildBossDebugScenario(null, { bossId: 'nemesis', abilityId: 'horde_invasion', phase: 2, target: `zombie_${kind}` }).state;
  grabber(s).status = 'persistent'; grabber(s).hp = grabber(s).maxHp;
  s.teams[0].melds = (kind === 'infected' ? ['♦'] : ['♦','♥']).map((suit, i) => ['4','5','6'].map(rank => ({ id: `base-${i}-${rank}`, rank, suit })));
  s.players.forEach((p, i) => p.hand = [{ id: `play-${i}`, rank: kind === 'infected' && i === 1 ? '8' : '7', suit: kind === 'infected' || i === 0 ? '♦' : '♥' },
    { id: `keep-${i}`, rank: 'K', suit: '♠' }, { id: `keep2-${i}`, rank: 'Q', suit: '♣' }]);
  beginBossTurn(s, { first: true, now: 1000, debug: true });
  for (let i = 0; i < 15 && s.boss.bossFlow.stage !== 'players'; i++) advanceBossTurn(s, s.boss.bossFlow.endsAt + 1);
  assert.equal(s.boss.currentIntent.payload.entryKind, kind);
  const objectivePayload = s.boss.currentIntent.payload;
  for (const p of s.players) {
    buy(s, p.id);
    assert.ok(grabber(s).hp > 0); assert.ok(s.boss.grabbedTurnIds.includes(`${s.turnNumber}:${p.id}`));
    const plan = getBossCombatPriorities(s, p.id).plan;
    assert.ok(plan, 'remaining objective is legal after restriction and partner progress');
    for (const move of plan.moves) {
      const cards = p.hand.filter(c => move.cardIds.includes(c.id));
      cards.forEach(c => assert.equal(isBossCardBlocked(s, p.id, c.id), false));
      const meldIndex = move.meldIndex ?? s.teams[0].melds.length;
      const before = move.meldIndex == null ? [] : s.teams[0].melds[meldIndex];
      assert.equal(isValidBossSequence([...before, ...cards]), true);
      p.hand = p.hand.filter(c => !cards.includes(c));
      if (move.meldIndex == null) s.teams[0].melds.push(cards); else before.push(...cards);
      applyBossMeldTransition(s, { teamId: 0, playerId: p.id, meldIndex, oldKind: 'simple', newKind: 'simple', cardsAdded: cards, isNewMeld: move.meldIndex == null });
    }
    const discard = p.hand.find(c => c.id === plan.discardCardId);
    assert.ok(discard); p.hand = p.hand.filter(c => c !== discard); s.discard.push(discard);
    notifyBossCardDiscarded(s, p.id, discard); completeBossPlayerTurn(s, p.id); s.turnNumber++;
  }
  assert.ok(kind === 'infected' ? objectivePayload.contributionCardIds.length >= 2 : objectivePayload.fedMeldIds.length >= 2);
  assert.equal(s.boss.combatEntities.find(e => e.id === kind).status, 'repelled');
});

test('Cooperative protection only counts the Devorador games present at announcement, not a later new game', () => {
  const s = buildBossDebugScenario(null, { bossId: 'nemesis', abilityId: 'horde_invasion', phase: 2, target: 'zombie_devourer' }).state;
  grabber(s).status = 'persistent'; grabber(s).hp = grabber(s).maxHp;
  s.teams[0].melds = ['♦','♥'].map((suit, i) => ['4','5','6'].map(rank => ({ id: `base-${i}-${rank}`, rank, suit })));
  s.players[0].hand = [{ id: 'needed', rank: '7', suit: '♦' }, { id: 'keep', rank: 'K', suit: '♠' }, { id: 'unrelated', rank: '7', suit: '♣' }];
  s.players[1].hand = [{ id: 'partner-needed', rank: '7', suit: '♥' }, { id: 'keep1', rank: 'K', suit: '♣' }, { id: 'keep2', rank: 'Q', suit: '♠' }];
  beginBossTurn(s, { first: true, now: 1000, debug: true });
  for (let i = 0; i < 15 && s.boss.bossFlow.stage !== 'players'; i++) advanceBossTurn(s, s.boss.bossFlow.endsAt + 1);
  assert.equal(s.boss.currentIntent.payload.entryMeldIds.length, 2);
  s.teams[0].melds.push(['4','5','6'].map(rank => ({ id: `new-${rank}`, rank, suit: '♣' })));
  s.stock = [{ id: 'draw', rank: 'Q', suit: '♠' }]; buy(s, 0);
  assert.deepEqual(s.boss.grabbedByPlayer[0].cardIds, ['unrelated']);
  assert.equal(isBossCardBlocked(s, 0, 'needed'), false);
});

test('Legacy current-turn lock survives without a new event, and stale locks cannot cross a turn', () => {
  const s = fixture(); delete s.boss.grabbedTurnIds;
  const id = s.players[0].hand[0].id;
  s.hasDrawnThisTurn = true; s.boss.grabbedByPlayer[0] = { cardIds: [id], turnId: `${s.turnNumber}:0` };
  normalizeBossState(s); const events = s.boss.eventLog.length;
  assert.deepEqual(notifyBossPurchaseCompleted(s, 0), []);
  assert.equal(isBossCardBlocked(s, 0, id), true); assert.equal(s.boss.eventLog.length, events);
  s.turnNumber++; normalizeBossState(s);
  assert.equal(s.boss.grabbedByPlayer[0], undefined); assert.equal(isBossCardBlocked(s, 0, id), false);
});

for (const [id, half] of [['grabber',110],['infected',120],['devourer',130]]) test(`Revival uses new ${id} maximum and still consumes the phase quota`, () => {
  const s = fixture(); s.boss.phase = 3;
  for (const e of s.boss.combatEntities) { e.status = 'absent'; e.hp = e.maxHp; }
  const e = s.boss.combatEntities.find(e => e.id === id); e.status = 'corpse'; e.hp = 0;
  const intent = { id: 'revive', abilityId: 'viral_reanimation', announcedPhase: 3, payload: { entityId: id } };
  nemesisBossMechanics.resolveIntent({ boss: s.boss, intent });
  assert.equal(e.hp, half); assert.equal(e.status, 'persistent'); assert.equal(e.mutated, true);
  e.status = 'corpse'; e.hp = 0; nemesisBossMechanics.resolveIntent({ boss: s.boss, intent });
  assert.equal(e.hp, 0);
});

test('Legacy maxima clamp without resetting combat lifecycle, low remaining HP, target, quota or grab events', () => {
  const s = fixture(); s.boss.maxHp = 2600; s.boss.hp = 2400;
  grabber(s).maxHp = 350; grabber(s).hp = 91; grabber(s).status = 'alive';
  const infected = s.boss.combatEntities[1]; infected.status = 'dead'; infected.hp = 0;
  s.boss.starsPlayerId = 1; s.boss.combatTargetsByPlayer[0] = 'grabber'; s.boss.reanimationsByPhase[2] = 'used';
  normalizeBossState(s);
  assert.equal(s.boss.hp, 2200); assert.equal(s.boss.maxHp, 2200);
  assert.equal(grabber(s).hp, 91); assert.equal(grabber(s).status, 'persistent'); assert.equal(s.boss.combatEntities[1].status, 'corpse');
  assert.equal(s.boss.combatTargetsByPlayer[0], 'grabber'); assert.equal(s.boss.starsPlayerId, 1); assert.equal(s.boss.reanimationsByPhase[2], 'used');
  assert.equal(s.boss.eventLog.length, 0);
});

test('Real BOT excludes grabbed cards from its legal plan and can discard one without deadlock', async () => {
  const s = fixture(); s.boss.phase = 3; s.boss.hordeBuff = { entityId: 'grabber', expiresRound: 9 }; buy(s, 1);
  const blocked = new Set(s.boss.grabbedByPlayer[1].cardIds); assert.equal(blocked.size, 3);
  let played = 0;
  const engine = { getState: () => s, isActive: () => true, getCombatPriorities: id => getBossCombatPriorities(s, id),
    isCardBlocked: (id, cardId, action) => isBossCardBlocked(s, id, cardId, action), isValidSequenceMeld: isValidBossSequence,
    canCreateMeld: () => true, canTeamTakeDeadNow: () => true, teamHasGoodCanastra: () => true, paceBetweenActions: async () => {},
    executeMeldExtend: async (index, meldIndex, indexes) => {
      const p = s.players[index], cards = indexes.map(i => p.hand[i]);
      cards.forEach(c => assert.equal(blocked.has(c.id), false));
      p.hand = p.hand.filter(c => !cards.includes(c)); s.teams[0].melds[meldIndex].push(...cards); played++; return true;
    }, executeMeldNew: async (index, indexes) => {
      const p = s.players[index], cards = indexes.map(i => p.hand[i]); cards.forEach(c => assert.equal(blocked.has(c.id), false));
      p.hand = p.hand.filter(c => !cards.includes(c)); s.teams[0].melds.push(cards); played++; return true;
    }, executeDiscard: async (index, handIndex) => {
      assert.equal(isBossCardBlocked(s, index, s.players[index].hand[handIndex].id, 'discard'), false);
      s.discard.push(...s.players[index].hand.splice(handIndex, 1)); completeBossPlayerTurn(s, index); return true;
    } };
  await BossBuracoBot.processMelds(1, {}, engine);
  assert.ok(played > 0, 'BOT continues playing its unrestricted legal cards'); assert.ok(s.players[1].hand.some(c => blocked.has(c.id)));
  // The canonical discard routine must accept temporarily unplayable cards.
  s.players[1].hand = s.players[1].hand.filter(c => blocked.has(c.id));
  const before = s.players[1].hand.length;
  await BossBuracoBot.processDiscard(1, 1, engine);
  assert.equal(s.players[1].hand.length, before - 1); assert.equal(s.boss.grabbedByPlayer[1], undefined);
});
