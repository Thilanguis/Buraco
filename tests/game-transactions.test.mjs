import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  canRestoreUndoTransaction,
  createUndoTransaction,
  restoreUndoTransaction,
} from '../js/game/undo-transaction.js';
import {
  applyWildcardOption,
  enumerateWildcardOptions,
} from '../js/game/wildcard-choice.js';

const appSource = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function sequenceValidator(cards) {
  const order = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const naturals = cards.filter((card) => !card.joker && !card.forceWild);
  const wilds = cards.filter((card) => card.joker || card.forceWild);
  if (wilds.length !== 1 || naturals.length !== cards.length - 1) return false;
  const positions = naturals.map((card) => order.indexOf(card.rank)).sort((a, b) => a - b);
  if (positions.some((position) => position < 0)) return false;
  return positions.at(-1) - positions[0] + 1 <= cards.length;
}

function gameState() {
  return {
    currentPlayer: 0,
    turnNumber: 4,
    stock: [{ id: 'stock-1', rank: 'A', suit: 'spades' }],
    discard: [{ id: 'discard-1', rank: '4', suit: 'clubs' }],
    players: [
      { id: 0, hand: [{ id: 'hand-1', rank: '3', suit: 'clubs' }] },
      { id: 1, hand: [{ id: 'hand-2', rank: '5', suit: 'hearts' }] },
    ],
    teams: [{ melds: [] }],
    boss: { hp: 2100, bloom: 2, eventLog: [{ actionId: 'boss-1' }] },
    lastAction: { id: 'before', playerId: 0, type: 'drawStock' },
  };
}

test('desfazer restaura o estado completo sem compartilhar referencias', () => {
  const initial = gameState();
  const transaction = createUndoTransaction(initial, { selectedCardIds: ['hand-1'], selectedMeldTarget: '0:0' }, { actorPlayerId: 0, actionType: 'meldNew' });
  initial.stock.pop();
  initial.players[0].hand.push({ id: 'new-card', rank: 'K', suit: 'diamonds' });
  initial.boss.hp = 1900;
  initial.boss.eventLog.push({ actionId: 'boss-2' });

  const restored = restoreUndoTransaction(transaction);
  assert.deepEqual(restored.state.stock.map((card) => card.id), ['stock-1']);
  assert.deepEqual(restored.state.players[0].hand.map((card) => card.id), ['hand-1']);
  assert.equal(restored.state.boss.hp, 2100);
  assert.deepEqual(restored.state.boss.eventLog.map((event) => event.actionId), ['boss-1']);
  assert.deepEqual(restored.ui.selectedCardIds, ['hand-1']);
  restored.state.players[0].hand[0].rank = 'Q';
  assert.equal(transaction.state.players[0].hand[0].rank, '3');
});

test('transacao cobre os tipos de acao e varios ciclos de fazer e desfazer', () => {
  const actionTypes = ['meldNew', 'meldExtend', 'meldReorder', 'meldMoveWild', 'drawDiscardFechado', 'drawStock', 'discard', 'bossMarkedCard', 'wildcardPosition'];
  let current = gameState();
  for (const actionType of actionTypes) {
    const transaction = createUndoTransaction(current, {}, { actorPlayerId: 0, actionType });
    current.stock.push({ id: `mutation-${actionType}`, rank: '7', suit: 'clubs' });
    current.lastAction = { id: actionType, playerId: 0, type: actionType };
    assert.equal(canRestoreUndoTransaction(transaction, current, 0), true);
    current = restoreUndoTransaction(transaction).state;
    assert.equal(current.stock.some((card) => card.id === `mutation-${actionType}`), false);
  }
  assert.equal(canRestoreUndoTransaction(createUndoTransaction(current, {}, { actorPlayerId: 0 }), current, 1), false);
});

test('coringa com duas interpretacoes exige escolha e aplica somente a opcao selecionada', () => {
  const cards = [
    { id: '3c', rank: '3', suit: 'clubs' },
    { id: '4c', rank: '4', suit: 'clubs' },
    { id: '5c', rank: '5', suit: 'clubs' },
    { id: 'jc', rank: 'JOKER', suit: 'joker', joker: true },
  ];
  const options = enumerateWildcardOptions(cards, sequenceValidator);
  assert.ok(options.length >= 2);
  assert.deepEqual(new Set(options.map((option) => option.targetRank)), new Set(['2', '6']));
  const chosen = options.find((option) => option.targetRank === '6');
  const resolved = applyWildcardOption(cards, chosen);
  assert.equal(resolved.find((card) => card.id === 'jc').wildTargetRank, '6');
  assert.deepEqual(resolved.map((card) => card.id), chosen.orderedCardIds);
});

test('uma unica posicao valida segue direta e opcoes equivalentes nao duplicam', () => {
  const cards = [
    { id: '5d', rank: '5', suit: 'diamonds' },
    { id: '7d', rank: '7', suit: 'diamonds' },
    { id: 'jd', rank: 'JOKER', suit: 'joker', joker: true },
  ];
  const options = enumerateWildcardOptions(cards, sequenceValidator);
  assert.equal(options.length, 1);
  assert.equal(options[0].targetRank, '6');
});

test('coringa ambiguo volta ao fluxo de clicar no jogo sem abrir modal', () => {
  assert.doesNotMatch(indexSource, /wildcardChoicePanel/);
  assert.doesNotMatch(appSource, /requestWildcardPosition|renderWildcardChoice/);
  assert.match(appSource, /enumerateWildcardOptions\(combinedCheck, isValidBossSequence\)\.length > 1[\s\S]*?return 'select-target'/);
  assert.match(appSource, /selectedMeldTarget = key;\s*makeMeldFromSelection\(false\)/);
});
