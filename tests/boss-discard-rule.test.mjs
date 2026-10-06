import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteBossDiscardPickup, isBossCardNaturalInSequence, isValidBossSequence, createBossState } from '../js/boss/boss-engine.js';
import { listBossDefinitions } from '../js/boss/boss-registry.js';
const card = (rank, id = rank, suit = '♥') => ({ id, rank, suit, joker: rank === 'JOKER' });
const state = (top, hand, melds = []) => ({ mode: 'boss_nemesis', boss: createBossState('nemesis', 123),
  players: [{ id: 0, teamId: 0, hand }], teams: [{ id: 0, melds }], discard: [card('K', 'lower'), top] });

const cases = [
  ['natural existente', card('6'), [], [[card('3'), card('4'), card('5')]], 0, 1],
  ['natural novo', card('10'), [card('8'), card('9')], [], null, 2],
  ['Joker existente', card('JOKER'), [], [[card('3'), card('4'), card('5')]], 0, 1],
  ['Joker novo', card('JOKER'), [card('8'), card('9')], [], null, 1],
  ['2 natural existente', card('2'), [], [[card('3'), card('4'), card('5')]], 0, 1],
  ['2 coringa existente', card('2', '2', '♣'), [], [[card('3'), card('4'), card('5')]], 0, 1],
  ['2 coringa novo', card('2'), [card('8'), card('10')], [], null, 1],
  ['2 natural novo', card('2'), [card('3'), card('4')], [], null, 2],
];
for (const boss of listBossDefinitions()) for (const [name, top, hand, melds, meldIndex, count] of cases) {
  test(`${boss.name}: retirada ${name}`, () => {
    const game = state(top, hand, melds); game.mode = boss.mode; game.boss = createBossState(boss.id, 123);
    const before = JSON.stringify(game);
    const quote = quoteBossDiscardPickup(game, 0, { meldIndex, handCardIds: hand.map(card => card.id) });
    assert.equal(quote.allowed, true); assert.equal(quote.count, count);
    assert.equal(quote.message, count === 1 ? 'Retirada protegida · 1 carta' : 'Retirada completa · 2 cartas');
    assert.equal(JSON.stringify(game), before, 'quote does not mutate cards, flags or state');
  });
}
test('fora de modo Chefe: regra não limita retirada', () => {
  for (const mode of ['1x1', '2x2', '1x1_dominacao', '1x1_duploMorto']) {
    const game = state(card('JOKER'), [card('8'), card('9')]); game.mode = mode;
    assert.equal(quoteBossDiscardPickup(game, 0, { handCardIds: ['8', '9'] }).count, 2);
  }
});
test('2 natural usa validador oficial e independe de ordem/flags visuais antigas', () => {
  for (const ranks of [['2', '3', '4'], ['3', '4', '2'], ['4', '2', '3']]) {
    const cards = ranks.map(rank => ({ ...card(rank), forceWild: rank === '2' }));
    assert.equal(isValidBossSequence(cards), true);
    assert.equal(isBossCardNaturalInSequence(cards, '2'), true);
  }
  assert.equal(isBossCardNaturalInSequence([card('2'), card('8'), card('10')], '2'), false);
});
test('duas justificativas: destino real decide, não a opção pública mais restritiva', () => {
  const game = state(card('7'), [card('8'), card('9')], [[card('4'), card('5'), card('6')]]);
  assert.equal(quoteBossDiscardPickup(game, 0, { meldIndex: 0 }).count, 1);
  assert.equal(quoteBossDiscardPickup(game, 0, { handCardIds: ['8', '9'] }).count, 2);
});
test('tentativas inválidas e cartas bloqueadas não justificam nem mutam retirada', () => {
  const game = state(card('7'), [card('8'), card('9')]);
  game.boss.combatEntities[0].status = 'persistent';
  game.boss.grabbedByPlayer[0] = { cardIds: ['8'], turnId: '0:0' };
  const before = JSON.stringify(game);
  for (const destination of [{ handCardIds: ['8', '9'] }, { handCardIds: ['9', '9'] }, { meldIndex: 99 }, { handCardIds: ['missing'] }]) {
    assert.equal(quoteBossDiscardPickup(game, 0, destination).allowed, false);
    assert.equal(JSON.stringify(game), before);
  }
});
