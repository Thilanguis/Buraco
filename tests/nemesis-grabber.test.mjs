import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBossDebugScenario, createBossDebugSnapshot, restoreBossDebugSnapshot, simulateBossDebugReload } from '../js/boss/boss-debug-scenarios.js';
import { notifyBossPurchaseCompleted, notifyBossDiscardTaken, isBossCardBlocked, completeBossPlayerTurn, getBossCombatPriorities,
  normalizeBossState, beginBossTurn, advanceBossTurn, applyBossMeldTransition, notifyBossCardDiscarded, isValidBossSequence, getBossCardEffect } from '../js/boss/boss-engine.js';
import { createUndoTransaction, restoreUndoTransaction } from '../js/game/undo-transaction.js';
import { nemesisBossMechanics, getNemesisZombieEffect } from '../js/boss/mechanics/nemesis.js';
import { BossBuracoBot } from '../boss-bot.js';
import { nemesisBossUi } from '../js/boss/ui/nemesis-ui.js';

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

test('A sole non-playable card is grabbed without blocking its legal final discard; partial purchase does not trigger', () => {
  const s = fixture(); s.players[0].hand = [{ id: 'x', rank: '4', suit: '♠' }]; s.teams[0].melds = [];
  s.hasDrawnThisTurn = true; s.partialDraw = true;
  assert.deepEqual(notifyBossPurchaseCompleted(s, 0), []); assert.equal(s.boss.grabbedTurnIds.length, 0);
  s.partialDraw = false;
  const before = JSON.stringify([s.players, s.stock, s.discard, s.boss.hp, s.boss.danger]);
  assert.equal(notifyBossPurchaseCompleted(s, 0).length, 1);
  assert.deepEqual(s.boss.grabbedByPlayer[0].cardIds, ['x']);
  assert.equal(isBossCardBlocked(s, 0, 'x', 'discard'), false);
  assert.equal(JSON.stringify([s.players, s.stock, s.discard, s.boss.hp, s.boss.danger]), before);
  assert.equal(s.boss.eventLog.filter(e => e.type === 'nemesisGrab').length, 1);
});

for (const abilityId of ['stars_hunt','infectious_tentacle','tentacle_barrage','stars_extermination']) test(`Grabber preserves an actual solution to ${abilityId}`, () => {
  const s = buildBossDebugScenario(null, { bossId: 'nemesis', abilityId, phase: 3, variant: 'interactive' }).state;
  grabber(s).status = 'persistent'; s.boss.hordeBuff = { entityId: 'grabber', expiresRound: 9 };
  beginBossTurn(s, { first: true, now: 1000, debug: true });
  for (let i = 0; i < 15 && s.boss.bossFlow.stage !== 'players'; i++) advanceBossTurn(s, s.boss.bossFlow.endsAt + 1);
  const id = s.boss.currentIntent.payload.targetPlayerId; s.currentPlayer = id;
  const before = getBossCombatPriorities(s, id); assert.ok(before.plan, 'canonical route exists before restriction');
  buy(s, id);
  const after = getBossCombatPriorities(s, id).plan;
  assert.ok(after, 'a complete legal route still exists after restriction');
  for (const cardId of after.playedCardIds) assert.equal(isBossCardBlocked(s, id, cardId), false);
  if (after.discardCardId) assert.equal(isBossCardBlocked(s, id, after.discardCardId, 'discard'), false);
});

const card = (id, rank, suit = '♠') => ({id, rank, suit});
for (const [mutated, reinforced, count] of [[true,false,2],[false,true,2],[true,true,3]]) {
  test(`Barragem: three marked cards preserve two real exits with AGARRA ${count} (${mutated}/${reinforced})`, () => {
    const s = fixture(); grabber(s).mutated = mutated;
    s.boss.hordeBuff = reinforced ? {entityId:'grabber',expiresRound:9} : null;
    s.teams[0].melds = [['3','4','5'].map(rank => card(`base-${rank}`,rank,'♣'))];
    s.players[0].hand = [card('safe','4'),...['6','7','8'].map(rank => card(`marked-${rank}`,rank,'♣'))];
    s.boss.currentIntent = {id:'barrage',abilityId:'tentacle_barrage',payload:{targetPlayerId:0,cardIds:['marked-6','marked-7','marked-8'],required:2,exitedCardIds:[],failure:14}};
    s.hasDrawnThisTurn = true; s.partialDraw = false;
    const untouched = JSON.stringify(s);
    const duplicate = JSON.parse(untouched);
    notifyBossPurchaseCompleted(s,0); notifyBossPurchaseCompleted(duplicate,0);
    const ids = s.boss.grabbedByPlayer[0].cardIds;
    assert.equal(ids.length,count);
    assert.deepEqual(duplicate.boss.grabbedByPlayer[0].cardIds,ids,'seeded combination selection is deterministic');
    const dual = ids.find(id => s.boss.currentIntent.payload.cardIds.includes(id));
    assert.ok(dual);
    assert.deepEqual(getBossCardEffect(s,0,dual),['nemesis-marked','nemesis-grabbed']);
    const visual = nemesisBossUi.card(getBossCardEffect(s,0,dual));
    assert.deepEqual(visual.classes,['nemesis-marked','nemesis-grabbed']);
    assert.deepEqual(visual.labels,['MARCADA','AGARRADA']);
    assert.equal(isBossCardBlocked(s,0,dual,'play'),true);
    assert.equal(isBossCardBlocked(s,0,dual,'discard'),false);
    assert.deepEqual(getBossCardEffect(simulateBossDebugReload(s),0,dual),['nemesis-marked','nemesis-grabbed']);
    const plan = getBossCombatPriorities(s,0).plan;
    assert.ok(plan); assert.ok(ids.includes(plan.discardCardId),'an AGARRADA may be the legal marked discard');
    const exits = [...plan.playedCardIds,plan.discardCardId].filter(id => s.boss.currentIntent.payload.cardIds.includes(id));
    assert.ok(new Set(exits).size >= 2,'two legal marked exits remain, not just two abstract playable candidates');
    // Execute the canonical plan, not only an existence assertion.
    for (const move of plan.moves) {
      const played = s.players[0].hand.filter(c => move.cardIds.includes(c.id));
      played.forEach(c => assert.equal(isBossCardBlocked(s,0,c.id,'play'),false));
      const index = move.meldIndex ?? s.teams[0].melds.length;
      const before = move.meldIndex == null ? [] : s.teams[0].melds[index];
      assert.equal(isValidBossSequence([...before,...played]),true);
      s.players[0].hand = s.players[0].hand.filter(c => !played.includes(c));
      if (move.meldIndex == null) s.teams[0].melds.push(played); else before.push(...played);
      applyBossMeldTransition(s,{teamId:0,playerId:0,meldIndex:index,oldKind:'simple',newKind:'simple',cardsAdded:played,isNewMeld:move.meldIndex==null});
    }
    const discarded = s.players[0].hand.find(c => c.id === plan.discardCardId);
    assert.equal(isBossCardBlocked(s,0,discarded.id,'discard'),false);
    s.players[0].hand = s.players[0].hand.filter(c => c !== discarded);
    s.discard.push(discarded); notifyBossCardDiscarded(s,0,discarded);
    assert.ok(s.boss.currentIntent.payload.exitedCardIds.length >= 2);
    completeBossPlayerTurn(s,0);
    assert.equal(s.boss.currentIntent.payload.infectionApplied,0);
  });
}

test('Marked and grabbed have independent lifetimes and one combined visual model', () => {
  const s = fixture(); s.hasDrawnThisTurn = true;
  const id = s.players[0].hand[0].id;
  s.boss.currentIntent = {abilityId:'infectious_tentacle',payload:{targetPlayerId:0,cardIds:[id],required:1,exitedCardIds:[]}};
  s.boss.grabbedByPlayer[0] = {cardIds:[id],turnId:`${s.turnNumber}:0`};
  assert.deepEqual(getBossCardEffect(s,0,id),['nemesis-marked','nemesis-grabbed']);
  s.boss.currentIntent.payload.resolved = true;
  assert.equal(getBossCardEffect(s,0,id),'nemesis-grabbed');
  s.boss.currentIntent.payload.resolved = false;
  grabber(s).hp = 0; grabber(s).status = 'corpse';
  assert.equal(getBossCardEffect(s,0,id),'nemesis-marked');
  assert.equal(isBossCardBlocked(s,0,id),false);
});
for (const [mutated, reinforced, count] of [[false,false,1],[true,false,2],[false,true,2],[true,true,3]]) {
  for (const source of ['stock','discard']) for (const playerId of [0,1]) {
    test(`Grabber fills ${count} with safe fallback cards after ${source}, player ${playerId}`, () => {
      const s = fixture(); grabber(s).mutated = mutated;
      s.boss.hordeBuff = reinforced ? {entityId:'grabber',expiresRound:9} : null;
      s.teams[0].melds = [['4','5','6'].map(rank => card(`base-${rank}`,rank))];
      s.players[playerId].hand = [card('playable','7'),card('safe1','K','♣'),card('safe2','Q','♥'),card('safe3','J','♦')];
      s.stock = [card('stock-draw','A','♥')]; s.discard = [card('discard-draw','A','♥')];
      buy(s, playerId, source);
      const ids = s.boss.grabbedByPlayer[playerId].cardIds;
      assert.equal(ids.length, count); assert.equal(new Set(ids).size, count);
      assert.ok(ids.includes('playable'), 'real legal play has priority over fallback');
      assert.equal(getNemesisZombieEffect(s.boss,grabber(s)).label, `AGARRA ${count}`);
      assert.equal(s.boss.eventLog.at(-1).cardIds.length, count);
      for (const restored of [simulateBossDebugReload(s), restoreBossDebugSnapshot(createBossDebugSnapshot(s)),
        restoreUndoTransaction(createUndoTransaction(s, {}, {actorPlayerId:playerId})).state]) {
        const events = restored.boss.eventLog.length;
        assert.deepEqual(notifyBossPurchaseCompleted(restored,playerId), []);
        assert.deepEqual(restored.boss.grabbedByPlayer[playerId].cardIds,ids);
        assert.equal(restored.boss.eventLog.length,events);
      }
      completeBossPlayerTurn(s,playerId);
      ids.forEach(id => assert.equal(isBossCardBlocked(s,playerId,id),false));
    });
  }
}

for (const size of [0,1,2]) test(`Grabber AGARRA 3 uses the physical maximum of ${size} safe cards`, () => {
  const s = fixture(); grabber(s).mutated = true; s.boss.hordeBuff = {entityId:'grabber',expiresRound:9};
  s.teams[0].melds = []; s.players[0].hand = [card('a','K','♣'),card('b','Q','♥')].slice(0,size);
  s.hasDrawnThisTurn = true; s.partialDraw = false;
  const events = notifyBossPurchaseCompleted(s,0);
  assert.equal(s.boss.grabbedByPlayer[0].cardIds.length,size);
  assert.equal(events.length,size ? 1 : 0);
  assert.equal(getNemesisZombieEffect(s.boss,grabber(s)).value,3);
});

test('Grabber protects a unique required play, not its safe final discard or the entire quota', () => {
  const s = fixture(); grabber(s).mutated = true; s.boss.hordeBuff = {entityId:'grabber',expiresRound:9};
  s.teams[0].melds = [['4','5','6'].map(rank => card(`base-${rank}`,rank))];
  s.players[0].hand = [card('needed','7'),card('safe1','K','♣'),card('safe2','Q','♥'),card('safe3','J','♦')];
  s.boss.currentIntent = {abilityId:'stars_hunt',payload:{targetPlayerId:0,contributed:false}};
  s.hasDrawnThisTurn = true; s.partialDraw = false;
  notifyBossPurchaseCompleted(s,0);
  assert.deepEqual(new Set(s.boss.grabbedByPlayer[0].cardIds),new Set(['safe1','safe2','safe3']));
  assert.ok(getBossCombatPriorities(s,0).plan);
});

test('Grabber keeps one objective alternative, but may grab the other marked cards', () => {
  const s = fixture(); grabber(s).mutated = true; s.boss.hordeBuff = {entityId:'grabber',expiresRound:9};
  s.teams[0].melds = [['4','5','6'].map(rank => card(`base-${rank}`,rank))];
  s.players[0].hand = [card('option1','7'),card('option2','7'),card('safe1','K','♣'),card('safe2','Q','♥')];
  s.boss.currentIntent = {abilityId:'infectious_tentacle',payload:{targetPlayerId:0,cardIds:['option1','option2'],required:1,exitedCardIds:[]}};
  s.hasDrawnThisTurn = true; s.partialDraw = false;
  notifyBossPurchaseCompleted(s,0);
  assert.equal(s.boss.grabbedByPlayer[0].cardIds.length,3);
  assert.ok(getBossCombatPriorities(s,0).plan);
});

test('Quota reduces only where the only objective solution requires protecting the remaining card', () => {
  const s = fixture(); grabber(s).mutated = true; s.boss.hordeBuff = {entityId:'grabber',expiresRound:9};
  s.teams[0].melds = [['4','5','6'].map(rank => card(`base-${rank}`,rank))];
  s.players[0].hand = [card('needed','7'),card('discard','K','♣')];
  s.boss.currentIntent = {abilityId:'stars_hunt',payload:{targetPlayerId:0,contributed:false}};
  s.hasDrawnThisTurn = true; s.partialDraw = false; notifyBossPurchaseCompleted(s,0);
  assert.deepEqual(s.boss.grabbedByPlayer[0].cardIds,['discard']);
  assert.equal(isBossCardBlocked(s,0,'needed'),false);
  assert.equal(isBossCardBlocked(s,0,'discard','discard'),false);
  assert.ok(getBossCombatPriorities(s,0).plan);
});

test('No legal discard: Grabber never takes away the legal Morto/batida route', () => {
  const s = fixture(); s.players[0].hand = [card('picked','7')];
  s.teams[0].melds = [['4','5','6'].map(rank => card(`base-${rank}`,rank))];
  s.pickedDiscardCardId = 'picked'; s.hasDrawnThisTurn = true; s.partialDraw = false;
  notifyBossPurchaseCompleted(s,0);
  assert.equal(isBossCardBlocked(s,0,'picked'),false);
  assert.equal(s.boss.grabbedByPlayer[0].cardIds.length,0);
});

test('Killing Grabber clears fallback locks immediately', () => {
  const s = fixture(); s.players[0].hand = [card('safe','K','♣')]; s.teams[0].melds = [];
  s.hasDrawnThisTurn = true; notifyBossPurchaseCompleted(s,0);
  assert.equal(isBossCardBlocked(s,0,'safe'),true);
  s.boss.combatTargetsByPlayer[0] = 'grabber';
  nemesisBossMechanics.applyDamage({boss:s.boss,gameState:s,playerId:0,damage:999});
  assert.equal(isBossCardBlocked(s,0,'safe'),false);
  assert.deepEqual(s.boss.grabbedByPlayer,{});
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
  if (kind === 'devourer') s.players[1].hand.push({ id: 'third-entry-card', rank: '8', suit: '♥' });
  beginBossTurn(s, { first: true, now: 1000, debug: true });
  for (let i = 0; i < 15 && s.boss.bossFlow.stage !== 'players'; i++) advanceBossTurn(s, s.boss.bossFlow.endsAt + 1);
  assert.equal(s.boss.currentIntent.payload.entryKind, kind);
  const objectivePayload = s.boss.currentIntent.payload;
  for (const p of s.players) {
    buy(s, p.id);
    assert.ok(grabber(s).hp > 0); assert.ok(s.boss.grabbedTurnIds.includes(`${s.turnNumber}:${p.id}`));
    let plan = getBossCombatPriorities(s, p.id).plan;
    assert.ok(plan, 'remaining objective is legal after restriction and partner progress');
    let discardId;
    for (let step = 0; plan && step < 3; step++) {
      discardId = plan.discardCardId;
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
      plan = kind === 'devourer' ? getBossCombatPriorities(s, p.id).plan : null;
    }
    const discard = p.hand.find(c => c.id === discardId);
    assert.ok(discard); p.hand = p.hand.filter(c => c !== discard); s.discard.push(discard);
    notifyBossCardDiscarded(s, p.id, discard); completeBossPlayerTurn(s, p.id); s.turnNumber++;
  }
  assert.ok(kind === 'infected' ? objectivePayload.contributionCardIds.length >= 2 : objectivePayload.devourerCardIds.length >= 3);
  assert.equal(s.boss.combatEntities.find(e => e.id === kind).status, 'repelled');
});

test('Cooperative protection only counts the Devorador games present at announcement, not a later new game', () => {
  const s = buildBossDebugScenario(null, { bossId: 'nemesis', abilityId: 'horde_invasion', phase: 2, target: 'zombie_devourer' }).state;
  grabber(s).status = 'persistent'; grabber(s).hp = grabber(s).maxHp;
  s.teams[0].melds = ['♦','♥'].map((suit, i) => ['4','5','6'].map(rank => ({ id: `base-${i}-${rank}`, rank, suit })));
  s.players[0].hand = [{ id: 'needed', rank: '7', suit: '♦' }, { id: 'keep', rank: 'K', suit: '♠' }, { id: 'unrelated', rank: '7', suit: '♣' }];
  s.players[1].hand = [{ id: 'partner-needed', rank: '7', suit: '♥' }, { id: 'keep1', rank: 'K', suit: '♣' }, { id: 'keep2', rank: 'Q', suit: '♠' }];
  s.players[1].hand.push({ id: 'partner-third', rank: '8', suit: '♥' });
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
