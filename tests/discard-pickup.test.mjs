import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { isValidBossSequence } from '../js/boss/boss-engine.js';
import { animateDiscardTransfer } from '../js/game/discard-presentation.js';
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
function fn(name) {
  const pos = app.indexOf(`function ${name}(`);
  return `${app.slice(pos - 6, pos) === 'async ' ? 'async ' : ''}${app.slice(pos, app.indexOf('\n}', pos) + 2)}`;
}
let serial = 0;
const cards = ranks => ranks.map(rank => ({ id: `c${serial++}`, rank, suit: '♥', joker: false }));
function fixture(mode = '1x1_duploMorto', variant = 'fechado') {
  const state = { mode, variant, currentPlayer: 1, turnNumber: 3, stock: cards(['K']),
    players: [{ id: 0, teamId: 0, hand: [] }, { id: 1, teamId: 1, hand: cards(['J', 'Q', 'K', 'A']) }],
    teams: [{ id: 0, melds: [] }, { id: 1, melds: [cards(['3', '4', '5', '6']), cards(['3', '4', '5', '6'])] }],
    discard: cards(['9', '7']), hasDrawnThisTurn: false };
  const messages = [], presentations = [], commits = [];
  const context = vm.createContext({ state, myPlayerIndex: 1, selectedHandIndexes: new Set(), selectedMeldTarget: null,
    pendingDiscardChoice: null, window: {},
    ensureMyTurn: () => true, canPerformCommonGameAction: () => true,
    currentPlayer: () => state.players[1], currentTeam: () => state.teams[1],
    isBossVaultDrawRequired: () => false, isBossDiscardBlocked: () => false, hasPendingBossChoices: () => false,
    ensureCardId() {}, validateBossClosedDiscardSelection: () => ({ allowed: true }),
    isBossMeldLocked: () => false, canBossUseMeld: () => true, canBossCreateMeld: () => true,
    isValidSequenceMeld: isValidBossSequence, validateBossMeldPlay: () => ({ allowed: true }),
    canTeamTakeDeadNow: () => false, isCurrentBossMode: () => false,
    confirmBossDiscardPickup: () => ({ allowed: true }), saveStateForUndo() {},
    classifyMeldForUi: () => ({ kind: 'simple' }), classifyMeldPreview: () => ({ kind: 'simple' }),
    prepareBossMeldMutation: async () => ({ allowed: true }),
    notifyBossDiscardTaken() {}, sortHand() {}, optimizeMeld() {}, normalizeMeldOrder() {}, autoSwapWildWhenFillingGap() {},
    drawBossTurnExtras: async () => [], deferBossVault: () => null,
    processDominationReward: async () => null, processBossMeldChange: async () => null, checkPostMeldStatus: async () => null,
    renderAll() {}, renderHand() {}, renderMelds() {}, resetTurnTimer() {},
    document: { querySelector: () => ({}) }, getRect: () => ({ left: 10, top: 20, width: 60, height: 90 }), cardElById: () => null,
    animateLocalDiscardPickup: async presentation => presentations.push(structuredClone(presentation)),
    packCard: c => ({ ...c }), newActionId: () => `action${serial++}`,
    showMessage: text => messages.push(text), commitState: async () => commits.push(state.lastAction),
  });
  vm.runInContext(['discardChoiceIsCurrent', 'chooseDiscardDestination', 'drawFromDiscard'].map(fn).join('\n'), context);
  return { state, context, presentations, commits, messages };
}

test('fechado aguarda escolha e respeita o segundo jogo em Humilhacao e demais modos', async () => {
  for (const mode of ['1x1_duploMorto', '1x1_dominacao', '1x1', '2x2']) {
    const f = fixture(mode);
    const before = JSON.stringify(f.state);
    await f.context.drawFromDiscard();
    assert.equal(JSON.stringify(f.state), before, 'waiting must not consume or mutate cards');
    assert.equal(f.presentations.length, 0);
    assert.equal(f.commits.length, 0);
    assert.equal(await f.context.chooseDiscardDestination(1, 1), true);
    assert.equal(f.state.teams[1].melds[0].length, 4);
    assert.equal(f.state.teams[1].melds[1].length, 5);
    assert.equal(f.state.discard.length, 0);
    assert.equal(f.presentations[0].topCard.rank, '7');
    assert.equal(f.presentations[0].cards[0].rank, '9');
    assert.equal(f.commits[0].discardPresentation.meldIndex, 1);
  }
});

test('escolha antiga e destino invalido nao consomem lixo', async () => {
  const f = fixture();
  await f.context.drawFromDiscard();
  assert.equal(await f.context.chooseDiscardDestination(1, 99), false);
  f.state.discard.push(...cards(['10']));
  assert.equal(await f.context.chooseDiscardDestination(1, 1), false);
  assert.equal(f.state.discard.length, 3);
  assert.equal(f.commits.length, 0);
});

test('fechado permite escolher jogo novo em vez de encaixe existente', async () => {
  const f = fixture();
  f.state.players[1].hand.push(...cards(['8', '9']));
  f.context.selectedHandIndexes = new Set([4, 5]);
  await f.context.drawFromDiscard();
  assert.equal(f.context.pendingDiscardChoice.canCreateNew, true);
  await f.context.chooseDiscardDestination(1);
  assert.equal(f.state.teams[1].melds.length, 3);
  assert.equal(f.state.teams[1].melds[0].length, 4);
  assert.equal(f.state.teams[1].melds[2].length, 3);
  assert.equal(f.presentations[0].meldCards.length, 3);
});

test('aberto anima toda compra local e publica dados para oponentes sem compra extra', async () => {
  const f = fixture('1x1_duploMorto', 'aberto');
  await f.context.drawFromDiscard();
  assert.equal(f.presentations[0].cards.length, 2);
  assert.equal(f.state.players[1].hand.length, 6);
  assert.equal(f.state.stock.length, 1);
  assert.equal(f.state.hasDrawnThisTurn, true);
  assert.equal(f.commits[0].count, 2);
  assert.equal(f.commits[0].discardPresentation.cards.length, 2);
});

test('animacao separa topo e cartas da mao para mesa, restante do lixo para mao', async () => {
  const [top, spare, handCard] = cards(['7', '9', '8']);
  const flights = [];
  await animateDiscardTransfer({ cards: [spare], topCard: top, meldCards: [top, handCard],
    fromDiscard: 'discard', fromHand: () => 'hand', toHand: () => 'hand', toMeld: () => 'meld',
    fly: async (card, from, to) => flights.push([card.id, from, to]) });
  assert.deepEqual(flights, [[spare.id, 'discard', 'hand'], [top.id, 'discard', 'meld'], [handCard.id, 'hand', 'meld']]);
});

test('compras remotas e bots animam aberto e fechado nos destinos corretos', async () => {
  const f = fixture();
  const flights = [];
  Object.assign(f.context, { animateDiscardTransfer, opponentAnchorRect: () => 'opponent',
    meldDropRect: () => 'table', flyRectToRect: async (card, from, to) => flights.push([card.rank, from, to]),
    impactAtRect() {}, getRect: el => el.source,
    document: { querySelector: selector => ({ source: selector.includes('Discard') ? 'discard' : 'stock' }), getElementById: () => null },
  });
  vm.runInContext(fn('playRemoteAction'), f.context);
  const [top, spare, selected] = cards(['7', '9', '8']);
  await f.context.playRemoteAction({ type: 'drawDiscard', playerId: 0, discardPresentation: { cards: [spare, top] } });
  assert.deepEqual(flights, [['9', 'discard', 'opponent'], ['7', 'discard', 'opponent']]);
  flights.length = 0;
  await f.context.playRemoteAction({ type: 'drawDiscardFechado', playerId: 0,
    discardPresentation: { cards: [spare], topCard: top, meldCards: [top, selected], teamId: 0, meldIndex: 0 } });
  assert.deepEqual(flights, [['9', 'discard', 'opponent'], ['7', 'discard', 'table'], ['8', 'opponent', 'table']]);
});

test('voo local bloqueia acoes e restaura cartas mesmo se animacao for cancelada', async () => {
  const f = fixture();
  const node = { style: { visibility: '' } };
  let finish;
  Object.assign(f.context, { animateDiscardTransfer, discardPickupAnimating: false,
    cardElById: () => node, flyRectToRect: () => new Promise((resolve, reject) => { finish = reject; }),
    isDominationFriendBusy: () => false, friendOperationPending: false, friendPlayback: null, canBossPerformCommonAction: () => true,
  });
  vm.runInContext([fn('animateLocalDiscardPickup'), fn('canPerformCommonGameAction')].join('\n'), f.context);
  const pending = f.context.animateLocalDiscardPickup({ cards: cards(['9']) }, {});
  assert.equal(f.context.canPerformCommonGameAction(), false);
  assert.equal(node.style.visibility, 'hidden');
  finish(new Error('cancelled'));
  await assert.rejects(pending, /cancelled/);
  assert.equal(node.style.visibility, '');
  assert.equal(f.context.canPerformCommonGameAction(), true);
});
