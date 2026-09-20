import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { BuracoBot } from '../bot.js';
import { isValidBossSequence } from '../js/boss/boss-engine.js';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const fn = name => {
  const start = app.indexOf(`function ${name}(`);
  return app.slice(start, app.indexOf('\n}', start) + 2);
};
const rules = vm.createContext({ isValidSequenceMeld: isValidBossSequence,
  RANKS_SEQ: ['2','3','4','5','6','7','8','9','10','J','Q','K','A'],
  RANKS_SEQ_LOW: ['A','2','3','4','5','6','7','8','9','10','J','Q','K'] });
vm.runInContext(['optimizeMeld', 'normalizeMeldOrder', 'isWildcard', 'missingRankBetween', 'pushWildToEdge', 'autoSwapWildWhenFillingGap'].map(fn).join('\n'), rules);
rules.IDX_HIGH = Object.fromEntries(rules.RANKS_SEQ.map((rank, i) => [rank, i]));
rules.IDX_LOW = Object.fromEntries(rules.RANKS_SEQ_LOW.map((rank, i) => [rank, i]));
rules.showMessage = () => {};
const cards = ranks => ranks.map((rank, i) => ({ id: `${rank}-${i}`, rank, suit: '♦', joker: false }));
function setup(baseRanks, topRank = '2') {
  const base = cards(baseRanks);
  const top = { ...cards([topRank])[0], id: 'top' };
  const state = { mode: '1x1_dominacao', variant: 'fechado', currentPlayer: 1,
    players: [{ id: 0, teamId: 0, hand: [] }, { id: 1, teamId: 1, hand: [top] }],
    teams: [{ id: 0, melds: [] }, { id: 1, melds: [base] }], stock: Array(20).fill({}), discard: [top], deadChunksTaken: [0, 0] };
  const engine = { getState: () => state, isActive: () => true, isValidSequenceMeld: isValidBossSequence,
    normalizeMeld(meld) {
      rules.optimizeMeld(meld); rules.normalizeMeldOrder(meld);
      rules.autoSwapWildWhenFillingGap(meld); rules.optimizeMeld(meld); rules.normalizeMeldOrder(meld);
    }, canTeamTakeDeadNow: () => true, teamHasGoodCanastra: () => true };
  engine.normalizeMeld(base);
  return { state, engine, base, top };
}

test('Dominador nao encaixa segundo 2 do lixo numa Real, mesmo em panico', () => {
  for (const panic of [false, true]) {
    const { state, engine } = setup(['2','3','4','5','6','7','8','9','10','J','Q','K','A']);
    const before = JSON.stringify(state);
    const intent = BuracoBot.evaluateDiscard(state, state.players[1].hand, state.teams[1], engine,
      { isVip: true, isDesperate: panic, isPanicDump: panic });
    assert.notEqual(intent?.action, 'extend');
    assert.equal(JSON.stringify(state), before, 'simulation must not mutate cards on table');
  }
});

test('Dominador conserva canastra mesmo quando o segundo 2 e sua ultima carta', async () => {
  const { state, engine } = setup(['2','3','4','5','6','7','8','9','10','J','Q','K','A']);
  engine.executeMeldExtend = async () => assert.fail('must not dirty existing canastra');
  await BuracoBot.processMelds(1, { isVip: true, isDesperate: true, isPanicDump: true }, engine);
  assert.equal(state.players[1].hand.length, 1);
  assert.equal(state.teams[1].melds[0].length, 13);
});

test('2 natural e As que evolui para As-a-As continuam permitidos', () => {
  for (const [ranks, rank] of [[['3','4','5','6','7','8','9'], '2'],
    [['2','3','4','5','6','7','8','9','10','J','Q','K','A'], 'A']]) {
    const { state, engine, base, top } = setup(ranks, rank);
    const after = BuracoBot.simulateMeld(base, [top], engine);
    assert.equal(BuracoBot.preservesDominationMeld(state, 1, base, after, engine), true);
    const intent = BuracoBot.evaluateDiscard(state, state.players[1].hand, state.teams[1], engine, { isVip: true });
    assert.equal(intent.action, 'extend');
  }
});
