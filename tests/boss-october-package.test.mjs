import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createBossState, normalizeBossState, inspectBossAbilityEligibility, isBossCardBlocked, getBossCardEffect,
  isBossDiscardBlocked, applyBossMeldTransition, completeBossPlayerTurn, applyBossFinalStrike, setBossDamageTarget,
  notifyBossDiscardTaken, quoteBossDiscardPickup, resolveBossChoice, isValidBossSequence, getBossCombatPriorities } from '../js/boss/boss-engine.js';
import { BossBuracoBot } from '../boss-bot.js';
import { nemesisBossMechanics } from '../js/boss/mechanics/nemesis.js';
import { matriarchBossUi } from '../js/boss/ui/matriarch-ui.js';
import { neheleniaBossPresentation } from '../js/boss/presentation/nehelenia.js';
import { canReceiveNeheleniaIllusionLock } from '../js/boss/mechanics/nehelenia.js';
import { createUndoTransaction, restoreUndoTransaction } from '../js/game/undo-transaction.js';

const card = (id, rank = '7', suit = '♠') => ({ id, rank, suit });
function game(id = 'nemesis') {
  const mode = { nemesis: 'boss_nemesis', banker: 'boss_banker', dominadora: 'boss_dominadora',
    matriarca_esmeralda: 'boss_matriarca', dimitrescu: 'boss_dimitrescu', nehelenia: 'boss_nehelenia' }[id];
  const s = { mode, variant: 'fechado', currentPlayer: 0, turnNumber: 1,
    players: [{ id: 0, name: 'Biel', teamId: 0, hand: [card('a'), card('b', '8'), card('c', '9'), card('keep', 'K', '♥')] },
      { id: 1, name: 'BOT Luana', teamId: 0, hand: [card('x', '7', '♥'), card('y', '8', '♥'), card('z', '9', '♥'), card('keep1', 'K', '♦')] }],
    teams: [{ id: 0, melds: [['4','5','6'].map(r => card(`base-${r}`, r)), ['4','5','6'].map(r => card(`base1-${r}`, r, '♥'))] }, { id: 1, melds: [] }],
    stock: Array.from({ length: 60 }, (_, i) => card(`stock-${i}`)), discard: [card('buried', 'Q', '♦'), card('top', '7')],
    deadPiles: [[], []], deadChunksTaken: [1, 0], deadChunksMax: [1, 0], boss: createBossState(id, 31) };
  s.boss.phase = 3; s.boss.phaseTransitions = [1, 2, 3]; s.boss.bossFlow = null;
  return s;
}
function feeding({ mutated = false, reinforced = false } = {}) {
  const s = game(); s.boss.phase = mutated ? 3 : 1; s.boss.hp = 1000;
  const d = s.boss.combatEntities.find(e => e.id === 'devourer'); d.status = 'persistent'; d.mutated = mutated;
  if (reinforced) s.boss.hordeBuff = { entityId: 'devourer', expiresRound: 10 };
  normalizeBossState(s); return s;
}
function add(s, ids, { player = 0, meldIndex = 0, isNewMeld = false } = {}) {
  s.currentPlayer = player;
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const existing = s.teams[0].melds[meldIndex], table = s.teams[0].melds.flat();
  let next = isNewMeld ? 6 : ranks.indexOf(existing.at(-1).rank) + 1;
  const cards = ids.map(id => table.find(c => c.id === id) || card(id, ranks[next++], meldIndex === 1 ? '♥' : '♠'));
  if (isNewMeld) s.teams[0].melds.push(cards);
  else s.teams[0].melds[meldIndex].push(...cards.filter(c => !s.teams[0].melds.flat().some(existing => existing.id === c.id)));
  assert.equal(isValidBossSequence(isNewMeld ? cards : existing), true, 'regression contributions form legal sequences');
  return applyBossMeldTransition(s, { teamId: 0, playerId: player, meldIndex: isNewMeld ? s.teams[0].melds.length - 1 : meldIndex,
    oldKind: 'simple', newKind: 'simple', cardsAdded: cards, isNewMeld });
}
const feed = s => s.boss.devourerFeed;

test('Fish Dead remains play-only and legacy overlapping illusion lock is removed, not other locks', () => {
  const s = game('nehelenia');
  s.boss.effects = [{ id: 'nehelenia_fish_dead_card', playerId: 0, cardId: 'a' },
    { id: 'nehelenia_illusion_lock', playerId: 0, cardId: 'a' }, { id: 'nehelenia_illusion_lock', playerId: 0, cardId: 'b' }];
  const restored = JSON.parse(JSON.stringify(s)); normalizeBossState(restored);
  assert.equal(isBossCardBlocked(restored, 0, 'a', 'play'), true);
  assert.equal(isBossCardBlocked(restored, 0, 'a', 'discard'), false);
  assert.equal(getBossCardEffect(restored, 0, 'a'), 'nehelenia-fish-dead');
  assert.equal(isBossCardBlocked(restored, 0, 'b', 'play'), true);
  assert.equal(isBossCardBlocked(restored, 0, 'b', 'discard'), true);
  assert.equal(restored.boss.effects.length, 2);
});
for (const ability of ['false_image', 'shattered_mirror']) test(`${ability} never selects Fish Dead, across deterministic seeds`, () => {
  // These legacy abilities are no longer in the active definition. Exercise
  // their actual payload builder without restoring them to the rotation.
  const engine = fs.readFileSync(new URL('../js/boss/boss-engine.js', import.meta.url), 'utf8');
  const builder = engine.slice(engine.indexOf('function buildNeheleniaReflectionChoice('), engine.indexOf('\nfunction ', engine.indexOf('function buildNeheleniaReflectionChoice(') + 1));
  const build = new Function('chooseCard', 'chooseCards', 'canReceiveNeheleniaIllusionLock', 'compactCardLabel',
    'neheleniaFakeCardLabel', 'neheleniaShuffle', `${builder}; return buildNeheleniaReflectionChoice;`)(
    (p, s, salt) => p.hand[(s.boss.seed + salt) % p.hand.length],
    (p, s, salt, count) => [...p.hand.slice((s.boss.seed + salt) % p.hand.length), ...p.hand.slice(0, (s.boss.seed + salt) % p.hand.length)].slice(0, count),
    canReceiveNeheleniaIllusionLock, c => `${c.rank}${c.suit}`, () => 'fake', entries => entries);
  for (let seed = 0; seed < 30; seed++) {
    const s = game('nehelenia'); s.boss.seed = seed; s.boss.phase = ability === 'false_image' ? 1 : 3;
    s.boss.effects = s.players.flatMap(p => p.hand.slice(0, 2).map(c => ({ id: 'nehelenia_fish_dead_card', playerId: p.id, cardId: c.id })));
    const payload = build(s, s.players[seed % 2], 373, { locksCards: true, pickFake: ability === 'shattered_mirror' });
    assert.ok(payload);
    const ids = payload.realCardIds || [payload.cardId];
    assert.ok(ids.every(id => !s.boss.effects.some(e => e.cardId === id)));
  }
});
test('old pending reflection choices cannot newly lock Fish Dead', () => {
  const s = game('nehelenia'); s.boss.effects = [{ id: 'nehelenia_fish_dead_card', playerId: 0, cardId: 'a' }];
  s.boss.pendingChoices = [{ id: 'legacy', type: 'shattered_mirror', playerId: 0, options: ['bad', 'good'], correctOption: 'good', realCardIds: ['a', 'b'] }];
  resolveBossChoice(s, 0, 'bad');
  assert.equal(isBossCardBlocked(s, 0, 'a', 'discard'), false);
  assert.equal(isBossCardBlocked(s, 0, 'b', 'discard'), true);
});
test('Espelho do Lixo uses the canonical discard blocking predicate and recovers eligibility', () => {
  for (const effects of [[{ id: 'nehelenia_hawk_guarded_discard', cardId: 'top' }],
    [0, 1].map(playerId => ({ id: 'nehelenia_discard_lock', playerId }))]) {
    const s = game('nehelenia'); s.boss.effects = effects;
    assert.equal(isBossDiscardBlocked(s), true);
    assert.equal(inspectBossAbilityEligibility(s, 'discard_mirror').eligible, false);
    const restored = JSON.parse(JSON.stringify(s)); normalizeBossState(restored);
    assert.equal(inspectBossAbilityEligibility(restored, 'discard_mirror').eligible, false);
    restored.boss.effects = []; assert.equal(inspectBossAbilityEligibility(restored, 'discard_mirror').eligible, true);
  }
  const s = game('nehelenia'); s.boss.neheleniaDiscardSealRound = s.boss.roundNumber;
  assert.equal(inspectBossAbilityEligibility(s, 'discard_mirror').eligible, false);
});
test('legacy Espelho do Lixo on a Hawk-guarded top is cancelled without incompatible UI', () => {
  const s = game('nehelenia'); const p = inspectBossAbilityEligibility(s, 'discard_mirror').payload;
  s.boss.currentIntent = { id: 'old', abilityId: 'discard_mirror', payload: p };
  s.boss.pendingChoices = [{ id: 'choice', type: 'discard_mirror', playerId: p.targetPlayerId }];
  s.boss.effects.push({ id: 'nehelenia_hawk_guarded_discard', cardId: 'top' });
  normalizeBossState(s);
  assert.equal(s.boss.currentIntent.payload.cancelled, true); assert.equal(s.boss.pendingChoices.length, 0);
  assert.match(neheleniaBossPresentation.compactAction({ gameState: s, intent: s.boss.currentIntent }).instruction, /encerrado/);
  assert.match(neheleniaBossPresentation.help({ gameState: s, intent: s.boss.currentIntent }), /encerrado sem punição/);
});
function pollen(s, id) {
  s.boss.natureThreats = [{ id: 'pollen', type: 'pollen', status: 'active', discardCardId: id, targetPlayerId: null,
    sourceIntentId: 'pollen-intent', deadlineRound: 9, bloomAmount: 1, healAmount: 30 }];
}
test('Pollen UI follows the exact card, distinguishes buried and survives reload', () => {
  const s = game('matriarca_esmeralda'); pollen(s, 'buried');
  assert.deepEqual(matriarchBossUi.pollenDiscard({ gameState: s }), { pollenOnTop: false, pollenBuried: true });
  assert.deepEqual(matriarchBossUi.pollenDiscard({ gameState: JSON.parse(JSON.stringify(s)) }), { pollenOnTop: false, pollenBuried: true });
  s.discard.pop(); assert.deepEqual(matriarchBossUi.pollenDiscard({ gameState: s }), { pollenOnTop: true, pollenBuried: false });
});
test('protected pickup leaves buried Pollen unpunished; acquiring that card punishes once', () => {
  const s = game('matriarca_esmeralda'); pollen(s, 'buried');
  const q = quoteBossDiscardPickup(s, 0, { meldIndex: 0 }); assert.equal(q.count, 1);
  const top = s.discard.pop(); s.players[0].hand.push(top); notifyBossDiscardTaken(s, 0, [top]);
  assert.equal(s.boss.bloom, 0); assert.equal(s.boss.natureThreats[0].status, 'active');
  const lower = s.discard.pop(); s.players[0].hand.push(lower); notifyBossDiscardTaken(s, 0, [lower]);
  assert.equal(s.boss.bloom, 1); notifyBossDiscardTaken(s, 0, [lower]); assert.equal(s.boss.bloom, 1);
});

test('full quoted pickup includes buried Pollen and triggers only its actual card once', () => {
  const s = game('matriarca_esmeralda'); pollen(s, 'buried');
  s.discard.push(card('top-j', 'J'));
  s.players[0].hand = ['9', '10'].map(rank => card(`bridge-${rank}`, rank));
  const q = quoteBossDiscardPickup(s, 0, { handCardIds: s.players[0].hand.map(c => c.id) });
  assert.equal(q.count, 3); assert.equal(q.allowed, true);
  const acquired = s.discard.splice(0); s.players[0].hand.push(...acquired);
  notifyBossDiscardTaken(s, 0, acquired);
  assert.equal(s.boss.bloom, 1); assert.equal(s.boss.natureThreats[0].status, 'failed');
  notifyBossDiscardTaken(s, 0, acquired); assert.equal(s.boss.bloom, 1);
});
for (const score of [0, 1000, 2000, 5000]) test(`fixed finish damage ignores projected score ${score}`, () => {
  for (const id of ['banker', 'dominadora', 'dimitrescu', 'nehelenia', 'nemesis']) {
    const s = game(id); s.boss.hp = 101;
    // This test isolates the fixed amount with no protected blood bands.
    // Blood Link and daughter targeting have their own rework regressions.
    if (id === 'dimitrescu') s.boss.combatEntities.forEach(d => { d.hp = 0; d.status = 'dead'; });
    const event = applyBossFinalStrike(s, score); assert.equal(event.damage, 100);
    assert.equal(s.boss.hp, 1); assert.equal(s.boss.result.reason, 'insufficient_final_strike');
    assert.equal(s.boss.stats.finalStrike, 100);
  }
});
for (const hp of [100, 80]) test(`fixed finish kills a boss at ${hp} HP`, () => {
  const s = game('banker'); s.boss.hp = hp;
  assert.equal(applyBossFinalStrike(s, 5000).damage, 100); assert.equal(s.boss.result.victory, true);
});
test('fixed finish keeps canonical Matriarch absorption/rebirth and Nemesis target', () => {
  const s = game('matriarca_esmeralda'); s.boss.hp = 80; s.boss.bloom = s.boss.danger = 2;
  const e = applyBossFinalStrike(s); assert.equal(e.reborn, true); assert.equal(s.boss.hp, 300);
  assert.equal(s.boss.bloom, 1); assert.equal(s.boss.result, null);
  const n = feeding(); n.boss.hp = 80; setBossDamageTarget(n, 0, 'devourer');
  const event = applyBossFinalStrike(n); assert.equal(event.targetId, 'devourer');
  assert.equal(n.boss.hp, 80); assert.equal(n.boss.result.victory, false);
  const normal = game(); normal.mode = '1x1'; const before = JSON.stringify(normal);
  assert.equal(applyBossFinalStrike(normal), null); assert.equal(JSON.stringify(normal), before);
});
test('real BOT finish simulation uses the canonical fixed strike, including rebirth', () => {
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const body = app.slice(app.indexOf('  canSafelyFinishBoss: () => {') + '  canSafelyFinishBoss: () => {'.length, app.indexOf('\n  isDiscardBlocked:', app.indexOf('  canSafelyFinishBoss: () => {'))).replace(/},\s*$/, '');
  const canFinish = s => new Function('state', 'isCurrentBossMode', 'applyBossFinalStrike', 'structuredClone', body)(s, () => s.mode.startsWith('boss_'), applyBossFinalStrike, structuredClone);
  const s = game(); s.boss.hp = 900; assert.equal(canFinish(s), false);
  s.boss.hp = 80; assert.equal(canFinish(s), true); assert.equal(s.boss.hp, 80, 'simulation is pure');
  const m = game('matriarca_esmeralda'); m.boss.hp = 80; m.boss.bloom = m.boss.danger = 2;
  assert.equal(canFinish(m), false); assert.equal(m.boss.rebirthUsed, false);
});
for (const chunks of [[['a','b','c']], [['a'],['b'],['c']]]) test(`Devorador same-turn contributions ${chunks.map(c => c.length).join('+')} heal once`, () => {
  const s = feeding(); for (const ids of chunks) add(s, ids);
  assert.equal(s.boss.devourerHealingTotal, 20); assert.equal(feed(s).credits, 0);
});
for (const player of [0, 1]) test(`Devorador credits cross turns and player ${player}`, () => {
  const s = feeding(); add(s, ['a', 'b']); assert.equal(feed(s).credits, 2);
  s.turnNumber++; add(s, ['c'], { player, meldIndex: player });
  assert.equal(s.boss.devourerHealingTotal, 20); assert.equal(feed(s).credits, 0);
});
test('Devorador counts different existing games and new games', () => {
  const s = feeding(); add(s, ['one'], { meldIndex: 0 }); add(s, ['two'], { meldIndex: 1 }); add(s, ['three']);
  assert.equal(s.boss.devourerHealingTotal, 20);
  s.turnNumber++; add(s, ['new1','new2','new3'], { isNewMeld: true }); assert.equal(s.boss.devourerHealingTotal, 40);
});

test('BOT may defer a small contribution that would heal Devorador more than its damage', async () => {
  const s = feeding(); add(s, ['human-a', 'human-b']);
  s.turnNumber++; s.currentPlayer = 1;
  s.players[1].hand = [card('bot-new', '7', '♥'), card('bot-keep', 'K', '♦')];
  let contributions = 0;
  const engine = { getState: () => s, isActive: () => true, getCombatPriorities: id => getBossCombatPriorities(s, id),
    isCardBlocked: (id, cardId, action) => isBossCardBlocked(s, id, cardId, action), isValidSequenceMeld: isValidBossSequence,
    canCreateMeld: () => true, canTeamTakeDeadNow: () => true, teamHasGoodCanastra: () => true, paceBetweenActions: async () => {},
    executeMeldExtend: async (index, meldIndex, indexes) => {
      const p = s.players[index], cards = indexes.map(i => p.hand[i]), meld = s.teams[0].melds[meldIndex];
      assert.equal(isValidBossSequence([...meld, ...cards]), true);
      assert.equal(cards.length, 1, 'BOT may play its normal one-card extension');
      p.hand = p.hand.filter(c => !cards.includes(c)); meld.push(...cards); contributions++;
      applyBossMeldTransition(s, { teamId: 0, playerId: p.id, meldIndex, oldKind: 'simple', newKind: 'simple', cardsAdded: cards });
      return true;
    }, executeMeldNew: async () => { assert.fail('this hand cannot open a new game'); } };
  await BossBuracoBot.processMelds(1, {}, engine);
  assert.equal(contributions, 0); assert.equal(s.boss.devourerHealingTotal || 0, 0); assert.equal(feed(s).credits, 2);
});
test('Devorador deduplicates cards, existing table/reorganization, replay and reload', () => {
  const s = feeding(); add(s, ['a', 'b']); const restored = JSON.parse(JSON.stringify(s));
  for (let i = 0; i < 3; i++) normalizeBossState(restored);
  add(restored, ['a', 'b']); add(restored, ['base-4']);
  assert.equal(feed(restored).credits, 2); assert.equal(restored.boss.devourerHealingTotal, 0);
  add(restored, ['c']); assert.equal(restored.boss.devourerHealingTotal, 20);
  normalizeBossState(restored); add(restored, ['c']); assert.equal(restored.boss.devourerHealingTotal, 20);
});
test('six cards heal twice now; later empty turns never heal', () => {
  const s=feeding();add(s,['a','b','c','d','e','f']);
  assert.equal(s.boss.devourerHealingTotal,40);assert.equal(feed(s).credits,0);
  const events=s.boss.eventLog.filter(e=>e.type==='bossHeal');assert.equal(events.length,2);
  completeBossPlayerTurn(s,0);s.turnNumber++;s.currentPlayer=1;completeBossPlayerTurn(s,1);
  assert.equal(s.boss.devourerHealingTotal,40);assert.equal(feed(s).credits,0);
});
test('death clears partial and queued credits; reanimation starts zero', () => {
  for (const ids of [['a','b'], ['a','b','c','d','e','f']]) {
    const s = feeding(); add(s, ids);
    setBossDamageTarget(s, 0, 'devourer'); s.boss.combatEntities.find(e => e.id === 'devourer').hp = 5; add(s, ['kill']);
    assert.equal(s.boss.combatEntities.find(e => e.id === 'devourer').hp, 0); assert.equal(feed(s).credits, 0); assert.equal(feed(s).active, false);
    s.boss.phase = 3;
    nemesisBossMechanics.resolveIntent({ boss: s.boss, gameState: s, intent: { id: 'revive', abilityId: 'viral_reanimation', announcedPhase: 3, payload: { entityId: 'devourer' } } });
    assert.equal(feed(s).credits, 0); assert.equal(feed(s).active, true);
  }
});
for (const status of ['absent','entering','repelled','corpse']) test(`Devorador ${status} never credits or heals`, () => {
  const s = feeding(); const d = s.boss.combatEntities.find(e => e.id === 'devourer'); d.status = status;
  if (status === 'corpse') d.hp = 0;
  add(s, ['a','b','c']); assert.equal(feed(s).credits, 0); assert.equal(s.boss.devourerHealingTotal, 0);
});
for (const [mutated, reinforced, expected] of [[false,false,20],[true,false,35],[false,true,35],[true,true,50]]) test(`Devorador canonical heal ${expected}, mutated=${mutated}, reinforced=${reinforced}`, () => {
  const s = feeding({ mutated, reinforced }); add(s, ['a','b','c']); assert.equal(s.boss.devourerHealingTotal, expected);
});
test('Devorador caps HP and undo restores credits/dedup/event sequence together', () => {
  const s = feeding(); s.boss.hp = s.boss.maxHp - 10; add(s, ['a','b']);
  const before = createUndoTransaction(s); add(s, ['c']); const after = JSON.parse(JSON.stringify(s));
  assert.ok(s.boss.hp <= s.boss.maxHp);
  assert.equal(s.boss.devourerHealingTotal, 20, 'healing cannot exceed missing HP after canonical contribution damage');
  const restored = restoreUndoTransaction(before).state; add(restored, ['c']);
  assert.deepEqual(restored.boss.devourerFeed, after.boss.devourerFeed);
  assert.equal(restored.boss.devourerHealingTotal, after.boss.devourerHealingTotal);
  const old = feeding(); delete old.boss.devourerFeed; normalizeBossState(old);
  assert.equal(feed(old).credits, 0); assert.ok(feed(old).countedCardIds.includes('base-4'));
});
