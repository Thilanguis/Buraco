import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`async function ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

const discardCode = extractFunction(app, 'discardSelectedCardOnce');

function fixture({ dead = false, blocked = false } = {}) {
  const hand = Array.from({ length: dead ? 1 : 3 }, (_, i) => ({ id: `card-${i}`, rank: '5', suit: '♣' }));
  const selection = new Set([dead ? 0 : 1]);
  const state = {
    hasDrawnThisTurn: true,
    variant: 'aberto',
    players: [{ id: 0, teamId: 0, hand }],
    discard: [],
    stock: [{ id: 'stock-1' }],
  };
  const renders = [];
  const handRenders = [];
  let releaseCommit;
  const server = new Promise((resolve) => {
    releaseCommit = resolve;
  });
  const checkCleared = () => {
    assert.equal(selection.size, 0, 'selection must be cleared before rendering or awaiting dead animations');
    assert.equal(context.selectedMeldTarget, null);
  };
  const context = vm.createContext({
    state,
    selectedHandIndexes: selection,
    selectedMeldTarget: '0:0',
    myPlayerIndex: 0,
    ensureMyTurn: () => true,
    currentPlayer: () => state.players[0],
    ensureCardId() {},
    getBossCardBlockFeedback: () => (blocked ? { message: 'blocked' } : null),
    resetDeniedCardSelection() {},
    showMessage() {},
    saveStateForUndo() {},
    canTeamTakeDeadNow: () => dead,
    teamHasGoodCanastra: () => true,
    isCurrentBossMode: () => false,
    confirmBossFinalStrike: () => true,
    notifyBossCardDiscarded: () => [],
    cardElById: () => ({ style: {} }),
    document: { querySelector: () => ({}) },
    getRect: () => ({}),
    flyRectToRect: async () => {
      assert.equal(selection.size, 1, 'keep selection while original card flies');
    },
    renderHand() {
      checkCleared();
      handRenders.push(state.players[0].hand.map((card) => card.id));
    },
    takeDeadIfAvailableForPlayer(player) {
      checkCleared();
      assert.deepEqual(handRenders.at(-1), [], 'the hand must be visibly empty before the dead pile is moved in');
      player.hand.push({ id: 'dead-card', rank: 'K', suit: '♣' });
      return { deadIndex: 0 };
    },
    animateDeadToHandLocal: async () => {
      checkCleared();
      assert.deepEqual(handRenders.at(-1), [], 'the old last card must stay gone during the dead animation');
    },
    finishGame: async () => checkCleared(),
    stockIsExhausted: () => false,
    passTurn() {
      state.currentPlayer = 1;
    },
    newActionId: () => 'discard-test',
    packCard: (card) => card,
    renderAll() {
      checkCleared();
      renders.push([...selection]);
    },
    commitState: () => server,
  });
  vm.runInContext(discardCode, context);
  return { context, state, selection, renders, handRenders, releaseCommit };
}

test('descarte nao transfere selecao para carta seguinte enquanto aguarda servidor', async () => {
  const f = fixture();
  const pending = f.context.discardSelectedCardOnce();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.state.players[0].hand[1].id, 'card-2');
  assert.equal(f.state.discard[0].id, 'card-1');
  assert.deepEqual(f.handRenders[0], ['card-0', 'card-2']);
  assert.equal(f.renders.length, 1, 'test observes local render before server response');
  assert.equal(f.selection.size, 0);
  f.releaseCommit();
  await pending;
});

test('ultima carta some visualmente antes da animacao do morto', async () => {
  const f = fixture({ dead: true });
  f.releaseCommit();
  await f.context.discardSelectedCardOnce();
  assert.deepEqual(f.handRenders[0], []);
  assert.equal(f.state.players[0].hand[0].id, 'dead-card');
  assert.equal(f.selection.size, 0);
});

test('descarte rejeitado nao remove carta nem passa turno', async () => {
  const f = fixture({ blocked: true });
  await f.context.discardSelectedCardOnce();
  assert.equal(f.state.players[0].hand.length, 3);
  assert.equal(f.state.discard.length, 0);
  assert.equal(f.renders.length, 0);
  assert.equal(f.handRenders.length, 0);
});

test('baixar a ultima carta tambem esvazia a mao antes de pegar o morto', () => {
  const start = app.indexOf('async function checkPostMeldStatus');
  const end = app.indexOf('async function attemptExtendExistingMeld', start);
  const block = app.slice(start, end);
  const renderPos = block.indexOf('renderHand()');
  const takeDeadPos = block.indexOf('takeDeadIfAvailableForPlayer(player)');
  assert.ok(renderPos >= 0 && takeDeadPos > renderPos, 'meld flow must render the empty hand before taking the dead pile');
});

test('tela remota esvazia a mao antiga antes do voo do morto', () => {
  const helperStart = app.indexOf('function renderRemoteHandEmptyBeforeDeadPickup');
  const remoteStart = app.indexOf('async function playRemoteAction');
  assert.ok(helperStart >= 0 && helperStart < remoteStart);
  const helper = app.slice(helperStart, remoteStart);
  assert.match(helper, /querySelector\('\.opponent-cards'\)\?\.replaceChildren\(\)/);
  assert.match(helper, /\$\{player\.name\} \(0\)/);

  const deadStart = app.indexOf('const animateRemoteDeadIfAny = async () => {', remoteStart);
  const deadEnd = app.indexOf('const animateRemotePlayerDraws', deadStart);
  const deadBlock = app.slice(deadStart, deadEnd);
  const clearPos = deadBlock.indexOf('renderRemoteHandEmptyBeforeDeadPickup(a.playerId)');
  const flightPos = deadBlock.indexOf('flyRectToRect');
  assert.ok(clearPos >= 0 && flightPos > clearPos, 'remote hand must be emptied before the dead pile flies');
});
