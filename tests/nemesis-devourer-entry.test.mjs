import assert from 'node:assert/strict';
import test from 'node:test';
import { buildBossDebugScenario, simulateBossDebugReload, createBossDebugSnapshot, restoreBossDebugSnapshot } from '../js/boss/boss-debug-scenarios.js';
import { beginBossTurn, advanceBossTurn, applyBossMeldTransition, inspectBossAbilityEligibility, getBossCombatPriorities, isValidBossSequence, completeBossPlayerTurn } from '../js/boss/boss-engine.js';
import { nemesisBossMechanics } from '../js/boss/mechanics/nemesis.js';
import { nemesisBossPresentation } from '../js/boss/presentation/nemesis.js';
import { createUndoTransaction, restoreUndoTransaction } from '../js/game/undo-transaction.js';

const card = (id, rank, suit = '♠') => ({ id, rank, suit });
function fixture(phase = 2) {
  const s = buildBossDebugScenario(null, { bossId: 'nemesis', abilityId: 'horde_invasion', phase, target: 'zombie_devourer' }).state;
  s.teams[0].melds = [['4','5','6'].map(rank => card(`base-${rank}`, rank))];
  s.players[0].hand = ['7','8','9'].map(rank => card(`add-${rank}`, rank)).concat(card('keep-0', 'K', '♥'));
  s.players[1].hand = [card('keep-1', 'K', '♦')];
  return s;
}
function announce(s) {
  beginBossTurn(s, { first: true, now: 1000, debug: true });
  for (let i = 0; i < 15 && s.boss.bossFlow.stage !== 'players'; i++) advanceBossTurn(s, s.boss.bossFlow.endsAt + 1);
  assert.equal(s.boss.currentIntent.payload.entryKind, 'devourer');
  return s.boss.currentIntent.payload;
}
const zombie = s => s.boss.combatEntities.find(e => e.id === 'devourer');
function add(s, ranks, { player = 0, index = 0, suit = '♠', isNewMeld = false } = {}) {
  const cards = ranks.map(rank => s.players[player].hand.find(c => c.rank === rank && c.suit === suit));
  assert.ok(cards.every(Boolean));
  assert.ok(isValidBossSequence([...s.teams[0].melds[index], ...cards]));
  s.players[player].hand = s.players[player].hand.filter(c => !cards.includes(c));
  s.teams[0].melds[index].push(...cards);
  applyBossMeldTransition(s, { teamId: 0, playerId: player, meldIndex: index, oldKind: 'simple', newKind: 'simple', cardsAdded: cards, isNewMeld });
  return cards;
}

test('Devorador is eligible with one feedable game, even if three cards are not available', () => {
  const s = fixture(); s.players[0].hand = [card('only-seven', '7'), card('keep', 'K', '♥')];
  assert.equal(inspectBossAbilityEligibility(s, 'horde_invasion').eligible, true);
  const p = announce(s); assert.equal(p.entryMeldIds.length, 1); assert.deepEqual(p.devourerCardIds, []);
});
test('Devorador is ineligible without any legal existing-game contribution', () => {
  const s = fixture(); s.players[0].hand = [card('no-play', 'K', '♥')];
  assert.equal(inspectBossAbilityEligibility(s, 'horde_invasion').eligible, false);
  s.teams[0].melds = []; assert.equal(inspectBossAbilityEligibility(s, 'horde_invasion').eligible, false);
});
for (const batches of [[['7','8','9']], [['7'], ['8'], ['9']]]) test(`Three cards in one existing game repel: ${JSON.stringify(batches)}`, () => {
  const s = fixture(); const p = announce(s);
  for (const batch of batches) add(s, batch);
  assert.equal(p.devourerCardIds.length, 3); assert.equal(zombie(s).status, 'repelled');
  assert.equal(p.entrySuccess, true); assert.equal(p.infectionApplied, 0);
  assert.match(nemesisBossPresentation.help({ gameState: s, intent: s.boss.currentIntent }), /jogos existentes com 3 cartas/);
});
test('2 + 1 in different initial games accumulate across both players', () => {
  const s = fixture(); s.teams[0].melds.push(['4','5','6'].map(rank => card(`heart-${rank}`, rank, '♥')));
  s.players[1].hand.push(card('partner-seven', '7', '♥'));
  const p = announce(s); add(s, ['7','8']);
  assert.equal(zombie(s).status, 'entering'); assert.equal(p.devourerCardIds.length, 2);
  const hud = nemesisBossPresentation.compactAction({ gameState: s, intent: s.boss.currentIntent });
  assert.equal(hud.instruction, 'Alimente jogos existentes com 3 cartas nesta rodada.');
  assert.match(hud.progress, /2\/3 cartas/);
  add(s, ['7'], { player: 1, index: 1, suit: '♥' });
  assert.equal(p.devourerCardIds.length, 3); assert.equal(zombie(s).status, 'repelled');
});
test('Two cards fail at round end and phase 3 persists Mutated with unchanged HP', () => {
  const s = fixture(3); const p = announce(s); add(s, ['7','8']);
  assert.equal(zombie(s).status, 'entering');
  completeBossPlayerTurn(s, 0); completeBossPlayerTurn(s, 1);
  for (let i = 0; i < 15 && !p.resolved; i++) advanceBossTurn(s, (s.boss.bossFlow?.endsAt || 1000) + 1);
  assert.equal(p.entrySuccess, false); assert.equal(zombie(s).status, 'persistent');
  assert.equal(zombie(s).mutated, true); assert.equal(zombie(s).hp, 260);
});
test('A game created after announcement, including later feeding, never counts', () => {
  const s = fixture(); const p = announce(s);
  s.teams[0].melds.push(['4','5','6'].map(rank => card(`new-${rank}`, rank, '♥')));
  s.players[0].hand.push(...['7','8','9'].map(rank => card(`new-add-${rank}`, rank, '♥')));
  applyBossMeldTransition(s, { teamId: 0, playerId: 0, meldIndex: 1, oldKind: 'simple', newKind: 'simple', cardsAdded: s.teams[0].melds[1], isNewMeld: true });
  add(s, ['7','8','9'], { index: 1, suit: '♥' });
  assert.deepEqual(p.devourerCardIds, []); assert.equal(zombie(s).status, 'entering');
});
test('Reorganization and duplicate card IDs cannot advance entry', () => {
  const s = fixture(); const p = announce(s);
  const event = cardsAdded => applyBossMeldTransition(s, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'simple', cardsAdded });
  event([]); event(s.teams[0].melds[0]); assert.deepEqual(p.devourerCardIds, []);
  const cards = add(s, ['7']); event(cards); event(cards);
  assert.deepEqual(p.devourerCardIds, ['add-7']); assert.equal(zombie(s).status, 'entering');
});
test('Reload, snapshot and undo preserve progress and replay never duplicates it', () => {
  const s = fixture(); announce(s); const cards = add(s, ['7','8']);
  const undo = createUndoTransaction(s, {}, { actorPlayerId: 0 });
  for (const restored of [simulateBossDebugReload(s), restoreBossDebugSnapshot(createBossDebugSnapshot(s)), restoreUndoTransaction(undo).state]) {
    applyBossMeldTransition(restored, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'simple', cardsAdded: cards });
    assert.equal(restored.boss.currentIntent.payload.devourerCardIds.length, 2);
    add(restored, ['9']); assert.equal(restored.boss.currentIntent.payload.devourerCardIds.length, 3);
    assert.equal(zombie(restored).status, 'repelled');
    nemesisBossMechanics.resolveIntent({ boss: restored.boss, intent: restored.boss.currentIntent });
    assert.equal(zombie(restored).status, 'repelled');
  }
});
test('BOT canonical priorities keep feeding the same initial game until three, not a new game', () => {
  const s = fixture(); const p = announce(s);
  for (let i = 0; i < 3; i++) {
    const priority = getBossCombatPriorities(s, 0); assert.equal(priority.active, true); assert.ok(priority.plan);
    for (const move of priority.plan.moves) {
      assert.equal(move.meldIndex, 0);
      add(s, move.cardIds.map(id => s.players[0].hand.find(c => c.id === id).rank));
    }
    if (p.resolved) break;
  }
  assert.equal(zombie(s).status, 'repelled'); assert.equal(getBossCombatPriorities(s, 0).active, false);
});
