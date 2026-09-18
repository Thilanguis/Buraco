import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { isValidBossSequence } from '../js/boss/boss-engine.js';
import {
  FRIEND_NAMES, canCallDominationFriend, createFriendInvitation, rollFriendDuration,
  callDominationFriend, queueDominationFriendTurn, executeDominationFriendTurn,
  previewFriendExtension, isDominationFriendBusy, grantDominationFriendExtraTurn,
} from '../js/game/domination-friend.js';
import { renderDominationFriend, friendWheelSegments, playDominationFriendTimeline, createFriendNoticeTracker } from '../js/game/domination-friend-ui.js';

// Exercise precisely the live app's meld rules without starting Firebase or UI.
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
function appFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  return app.slice(start, app.indexOf('\n}', start) + 2);
}
const functions = ['isWildcard', 'optimizeMeld', 'normalizeMeldOrder', 'classifyMeldForUi'].map(appFunction).join('\n');
const context = vm.createContext({
  isValidSequenceMeld: isValidBossSequence,
  RANKS_SEQ: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'],
  RANKS_SEQ_LOW: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
});
vm.runInContext(functions, context);
const rules = {
  prepare(cards) {
    const copy = cards.map((card) => ({ ...card }));
    context.optimizeMeld(copy);
    context.normalizeMeldOrder(copy);
    return copy;
  },
  valid: isValidBossSequence,
  classify: (cards) => context.classifyMeldForUi(cards).kind,
  isWild: (card, meld) => context.isWildcard(card, meld),
};
const cards = (ranks, suit = '♣', prefix = 'table') => ranks.map((rank, i) => ({ id: `${prefix}_${i}`, rank, suit, joker: rank === 'JOKER' }));
function game(mode = '1x1_dominacao') {
  return {
    mode, currentPlayer: 1, turnNumber: 1, friendUsed: false, finished: false,
    players: [{ id: 0, teamId: 0, hand: cards(['K'], '♥', 'enemy') }, { id: 1, teamId: 1, hand: cards(['Q'], '♦', 'owner') }],
    teams: [{ id: 0, melds: [] }, { id: 1, melds: [] }],
    stock: cards(['A', '2', '3'], '♠', 'main'), discard: cards(['5'], '♥', 'discard'),
    deadPiles: [cards(['7'], '♥', 'dead0'), cards(['8'], '♥', 'dead1')], deadChunksTaken: [0, 0],
  };
}
const invitation = () => createFriendInvitation('test-invitation', () => 0.1);
function invite(state = game()) {
  assert.equal(callDominationFriend(state, 1, invitation(), 0), true);
  return state;
}
function friendTurn(state) {
  assert.equal(queueDominationFriendTurn(state, 1), true);
  state.currentPlayer = 0;
  state.turnNumber++;
  return executeDominationFriendTurn(state, state.dominationFriend.pendingTurnId, rules);
}

test('botao aparece somente na Dominacao Completa para o Dominador no proprio turno', () => {
  const button = { hidden: true };
  globalThis.document = { getElementById: (id) => id === 'callFriendBtn' ? button : null };
  try {
    for (const mode of ['1x1_duploMorto', '1x1', 'boss_banker', 'boss_dominadora', '2x2', '1x1_dominacao']) {
      for (const seat of [-1, 0, 1]) {
        renderDominationFriend(game(mode), seat);
        assert.equal(!button.hidden, mode === '1x1_dominacao' && seat === 1);
      }
    }
    const state = game();
    state.currentPlayer = 0;
    assert.equal(canCallDominationFriend(state, 1), false);
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /id="callFriendBtn" hidden onclick="callDominationFriend\(\)"/);
  } finally { delete globalThis.document; }
});

test('chamada e unica, inclusive entre clientes e depois da saida, e rejeita outros modos', async () => {
  const state = invite();
  const saved = JSON.stringify(state.dominationFriend);
  assert.equal(callDominationFriend(state, 1, createFriendInvitation('another')), false);
  assert.equal(JSON.stringify(state.dominationFriend), saved);
  state.dominationFriend.active = false;
  assert.equal(canCallDominationFriend(JSON.parse(JSON.stringify(state)), 1), false);
  const other = game('1x1_duploMorto');
  const before = JSON.stringify(other);
  assert.equal(callDominationFriend(other, 1, invitation()), false);
  assert.equal(JSON.stringify(other), before);

  // Run the production transaction callback against concurrent snapshot reads.
  let persisted = game();
  let version = 0;
  const transactionContext = vm.createContext({
    state: persisted, window: { gameSessionId: 1, isClosingGame: false }, db: {}, gameRef: {},
    runTransaction: async (_db, callback) => {
      for (;;) {
        const readVersion = version;
        const json = JSON.stringify(persisted);
        let update;
        const result = await callback({
          get: async () => ({ exists: () => true, data: () => ({ stateJson: json }) }),
          update: (_ref, value) => { update = value; },
        });
        if (version !== readVersion) continue;
        if (update) { persisted = JSON.parse(update.stateJson); version++; }
        return result;
      }
    },
  });
  vm.runInContext(`async ${appFunction('saveFriendOperation')}`, transactionContext);
  const calls = await Promise.all(['client-a', 'client-b'].map((id) => {
    const choice = createFriendInvitation(id, () => 0.1);
    return transactionContext.saveFriendOperation((latest) => callDominationFriend(latest, 1, choice, 0));
  }));
  assert.equal(calls.filter(Boolean).length, 1);
  assert.equal(persisted.friendUsed, true);
  assert.equal(persisted.dominationFriend.hand.length, 11);
  assert.equal(persisted.friendRevision, 1);
});

test('nomes tem intervalos iguais e sao somente Bruna, Nathalia e Thayanne', () => {
  const counts = Object.fromEntries(FRIEND_NAMES.map((name) => [name, 0]));
  for (let i = 0; i < 300; i++) counts[createFriendInvitation(`name-${i}`, () => (i + 0.5) / 300).name]++;
  assert.deepEqual(counts, { Bruna: 100, Nathalia: 100, Thayanne: 100 });
});

test('duracao retorna 3, 4 ou 5 nos limites exatos dos intervalos', () => {
  for (const [value, expected] of [[0, 3], [0.199999, 3], [0.2, 4], [0.549999, 4], [0.55, 5], [0.999999, 5]]) {
    assert.equal(rollFriendDuration(() => value), expected);
  }
});

test('amostragem uniforme da roleta produz pesos 20%, 35% e 45%', () => {
  const counts = { 3: 0, 4: 0, 5: 0 };
  for (let i = 0; i < 10000; i++) counts[rollFriendDuration(() => (i + 0.5) / 10000)]++;
  assert.deepEqual(counts, { 3: 2000, 4: 3500, 5: 4500 });
});

test('roletas circulares representam os pesos e param com o resultado salvo no ponteiro', () => {
  const names = friendWheelSegments(FRIEND_NAMES);
  assert.deepEqual(names.map((segment) => segment.end - segment.start), [120, 120, 120]);
  const turns = friendWheelSegments([3, 4, 5], [20, 35, 45]);
  assert.deepEqual(turns.map((segment) => segment.end - segment.start), [72, 126, 162]);
  for (const segment of [...names, ...turns]) {
    const rotation = 360 * 5 + 360 - segment.center;
    assert.equal((segment.center + rotation) % 360, 0);
  }
});

test('amiga ocupa assento lateral com os mesmos versos da partida e sai ao mudar de modo', () => {
  // Minimal DOM for the production renderer, not a second rendering algorithm.
  function element() {
    const node = { children: [], dataset: {}, className: '', setAttribute() {} };
    node.classList = {
      contains: (name) => node.className.split(' ').includes(name),
      toggle(name, enabled) {
        const classes = new Set(node.className.split(' ').filter(Boolean));
        if (enabled) classes.add(name); else classes.delete(name);
        node.className = [...classes].join(' ');
      },
      add(...names) { names.forEach((name) => this.toggle(name, true)); },
      remove(...names) { names.forEach((name) => this.toggle(name, false)); },
    };
    node.append = (...children) => children.forEach((child) => { node.children.push(child); child.parent = node; });
    node.replaceChildren = () => { node.children = []; };
    node.remove = () => { node.parent.children = node.parent.children.filter((child) => child !== node); };
    return node;
  }
  const section = element();
  const table = element();
  section.append(table);
  const button = element();
  globalThis.document = {
    createElement: element,
    getElementById: (id) => id === 'gameSection' ? section : id === 'callFriendBtn' ? button : table.children.find((node) => node.id === id),
    querySelector: (selector) => selector === '#gameSection > .board' ? table : null,
  };
  try {
    const state = invite();
    renderDominationFriend(state, 1);
    const seat = table.children[0];
    assert.equal(seat.parent, table, 'assento pertence a board, nunca direto a gameSection');
    assert.deepEqual(section.children, [table], 'amiga nao pode criar uma linha extra abaixo da mesa');
    assert.ok(seat.classList.contains('opponent-hand-right'));
    assert.ok(seat.classList.contains('domination-friend-seat'));
    const hand = seat.children.find((node) => node.className === 'opponent-cards');
    assert.equal(hand.children.length, 11);
    state.dominationFriend.hand.forEach((card, index) => {
      assert.ok(hand.children[index].classList.contains('opponent-card-back'));
      assert.ok(hand.children[index].classList.contains(`back-${card.back}`));
    });
    renderDominationFriend(state, 0);
    assert.ok(seat.classList.contains('opponent-hand-left'));
    assert.equal(seat.classList.contains('opponent-hand-right'), false);
    assert.equal(table.children.length, 1);
    assert.equal(state.players.length, 2);
    state.mode = '1x1';
    renderDominationFriend(state, 1);
    assert.equal(table.children.length, 0);
  } finally { delete globalThis.document; }
});

test('turno grava e anima compra, baixada, bonus e extensao na ordem sem alterar o estado salvo', async () => {
  const state = invite();
  state.dominationFriend.hand = cards(['3', '4', '5', '6', '7', '8'], '♣', 'guest');
  state.dominationFriend.stock = [...cards(['10'], '♣', 'bonus'), ...cards(['K'], '♥', 'spare'), ...cards(['9'], '♣', 'aux')];
  const before = structuredClone(state);
  const result = friendTurn(state);
  const saved = JSON.stringify(state);
  assert.deepEqual(result.steps.map((step) => step.type), ['drawStock', 'meldNew', 'drawStock', 'meldExtend']);
  const view = structuredClone(before);
  const flown = [];
  const rendered = [];
  await playDominationFriendTimeline(view, JSON.parse(JSON.stringify(result)), {
    animate: async (step) => {
      assert.equal(JSON.stringify(state), saved);
      if (step.type.startsWith('meld')) {
        assert.ok(step.cards.every((card) => view.dominationFriend.hand.some((entry) => entry.id === card.id)), 'cartas permanecem na mao ate o voo terminar');
      }
      flown.push(step.type);
    },
    render: () => rendered.push(view.dominationFriend.hand.length),
    isActive: () => true,
  });
  assert.deepEqual(flown, result.steps.map((step) => step.type));
  assert.deepEqual(rendered, [8, 1, 2, 1]);
  assert.deepEqual(view.teams, state.teams);
  assert.deepEqual(view.dominationFriend.hand, state.dominationFriend.hand);
  assert.deepEqual(view.dominationFriend.stock, state.dominationFriend.stock);
  assert.equal(JSON.stringify(state), saved);
});

test('despedida mantem amiga visivel ate acabar o voo e cancelamento interrompe etapas', async () => {
  const state = invite();
  state.dominationFriend.turnsRemaining = 1;
  state.dominationFriend.hand = cards(['3', '4', '5'], '♣', 'guest');
  state.dominationFriend.stock = cards(['K'], '♥', 'aux');
  const before = structuredClone(state);
  const result = friendTurn(state);
  assert.equal(result.departed, true);
  assert.equal(state.dominationFriend.active, false);
  const view = structuredClone(before);
  await playDominationFriendTimeline(view, result, {
    animate: async () => assert.equal(view.dominationFriend.active, true),
    render() {}, isActive: () => true,
  });
  assert.deepEqual(view.teams, state.teams);
  let active = true;
  let calls = 0;
  const cancelled = structuredClone(before);
  await playDominationFriendTimeline(cancelled, result, {
    animate: async () => { calls++; active = false; },
    render: () => assert.fail('nao renderizar depois de fechar a partida'),
    isActive: () => active,
  });
  assert.equal(calls, 1);
  assert.deepEqual(cancelled, before);
});

test('host e snapshot compartilham animacao, bloqueiam acoes e reload nao repete o turno', async () => {
  const state = invite();
  const before = structuredClone(state);
  const result = friendTurn(state);
  let finishFlight;
  let flights = 0;
  const pendingFlight = new Promise((resolve) => { finishFlight = resolve; });
  const playbackContext = vm.createContext({
    state: before, window: { gameSessionId: 1, isClosingGame: false }, structuredClone, console,
    friendPlayback: null, friendActionPresentations: new Map(), friendOperationPending: false,
    stopTurnTimer() {}, renderAll() {}, isDominationFriendBusy, canBossPerformCommonAction: () => true,
    playDominationFriendTimeline,
    playRemoteAction: async () => { flights++; await pendingFlight; },
  });
  vm.runInContext(`async ${appFunction('playFriendTurnPresentation')}\n${appFunction('canPerformCommonGameAction')}`, playbackContext);
  const action = { id: 'friend-animation-test', friendResult: result };
  const host = playbackContext.playFriendTurnPresentation(action);
  const snapshot = playbackContext.playFriendTurnPresentation(action);
  await Promise.resolve();
  assert.equal(playbackContext.canPerformCommonGameAction(state), false, 'estado final nao deve liberar acoes durante o voo');
  finishFlight();
  await Promise.all([host, snapshot]);
  assert.equal(flights, result.steps.length);
  assert.equal(playbackContext.friendPlayback, null);
  assert.equal(playbackContext.canPerformCommonGameAction(state), true);
  assert.deepEqual(playbackContext.state, before);
  playbackContext.state = JSON.parse(JSON.stringify(state));
  playbackContext.friendActionPresentations.clear();
  await playbackContext.playFriendTurnPresentation(action);
  assert.equal(flights, result.steps.length, 'reload nao repete os voos');
  playbackContext.state = game('1x1');
  await playbackContext.playFriendTurnPresentation(action);
  assert.equal(flights, result.steps.length, 'outros modos nao animam a amiga');
});

test('motor normal anima cartas reais do monte auxiliar e do assento para o jogo do Dominador', async () => {
  const friendState = invite();
  const auxiliary = { left: 800, top: 500, width: 30, height: 44 };
  const seat = { left: 800, top: 250, width: 40, height: 60 };
  const meld = { left: 500, top: 100, width: 22, height: 30 };
  const flights = [];
  const impacts = [];
  const flightContext = vm.createContext({
    state: friendState, myPlayerIndex: 1, window: { gameSessionId: 1, isClosingGame: false },
    document: {
      querySelector: (selector) => selector === '#dominationFriendStock .opponent-card-back' ? auxiliary : null,
      getElementById: () => null,
    },
    getRect: (element) => element,
    getOpponentAnchorRectById: (id, side) => {
      assert.equal(id, 'dominationFriendPanel'); assert.equal(side, 'right'); return seat;
    },
    meldDropRect: (key) => { assert.equal(key, '1:0'); return meld; },
    flyRectToRect: async (card, from, to, face) => { flights.push({ card, from, to, face }); },
    impactAtRect: (target) => impacts.push(target),
    setTimeout: (callback) => callback(),
  });
  vm.runInContext(`${appFunction('opponentAnchorRect')}\nasync ${appFunction('playRemoteAction')}`, flightContext);
  const drawn = cards(['7', '8'], '♣', 'aux');
  await flightContext.playRemoteAction({ type: 'drawStock', playerId: 'friend', cards: drawn });
  assert.deepEqual(flights.map((flight) => flight.card), drawn);
  assert.ok(flights.every((flight) => flight.from === auxiliary && flight.to === seat && flight.face === 'back'));
  for (const type of ['meldNew', 'meldExtend']) {
    await flightContext.playRemoteAction({ type, playerId: 'friend', teamId: 1, meldIndex: 0, cards: drawn });
  }
  assert.ok(flights.slice(2).every((flight) => flight.from === seat && flight.to.top >= meld.top && flight.face === 'front'));
  assert.equal(impacts.length, 6);
});

test('entrada distribui 11 cartas exclusivas sem tocar monte, lixo, mortos ou jogadores', () => {
  const state = game();
  const before = structuredClone(state);
  invite(state);
  for (const key of ['stock', 'discard', 'deadPiles', 'players', 'deadChunksTaken']) assert.deepEqual(state[key], before[key]);
  assert.equal(state.dominationFriend.hand.length, 11);
  const deck = [...state.dominationFriend.hand, ...state.dominationFriend.stock];
  assert.equal(deck.length, 108);
  assert.equal(new Set(deck.map((card) => card.id)).size, 108);
  assert.ok(deck.every((card) => card.id.startsWith('friend_test-invitation_')));
});

test('turno encaixa depois do Dominador, reduz contador uma vez e preserva recursos', () => {
  const state = invite();
  const before = structuredClone(state);
  assert.equal(queueDominationFriendTurn(state, 0), false);
  const turnContext = vm.createContext({
    state, localUndoStack: [], window: {}, queueDominationFriendTurn,
    canPerformCommonGameAction: (current) => !isDominationFriendBusy(current),
    hasPendingBossChoices: () => false, isCurrentBossMode: () => false,
  });
  vm.runInContext(appFunction('passTurn'), turnContext);
  assert.equal(turnContext.passTurn(), true);
  assert.equal(state.currentPlayer, 0);
  assert.equal(state.turnNumber, before.turnNumber + 1);
  const id = state.dominationFriend.pendingTurnId;
  assert.equal(queueDominationFriendTurn(state, 1), false);
  assert.equal(isDominationFriendBusy(state), true);
  assert.equal(turnContext.passTurn(), false);
  executeDominationFriendTurn(state, id, rules);
  assert.equal(state.dominationFriend.turnsRemaining, 2);
  assert.equal(state.dominationFriend.farewell, false);
  const after = JSON.stringify(state);
  assert.equal(executeDominationFriendTurn(state, id, rules), null);
  assert.equal(JSON.stringify(state), after);
  for (const key of ['stock', 'discard', 'deadPiles', 'players', 'deadChunksTaken', 'finished']) assert.deepEqual(state[key], before[key]);
  assert.equal(state.currentPlayer, 0);
});

test('reload preserva sorteios, mao, baralho, turnos e idempotencia', () => {
  const original = invite();
  queueDominationFriendTurn(original, 1);
  const saved = JSON.stringify(original);
  const restored = JSON.parse(saved);
  assert.equal(JSON.stringify(restored), saved);
  const id = restored.dominationFriend.pendingTurnId;
  executeDominationFriendTurn(restored, id, rules);
  const again = JSON.parse(JSON.stringify(restored));
  const before = JSON.stringify(again);
  assert.equal(executeDominationFriendTurn(again, id, rules), null);
  assert.equal(JSON.stringify(again), before);
  assert.equal(canCallDominationFriend(again, 1), false);
});

test('IA nunca suja jogo limpo, prefere alimentar e evolui Real para As-a-As', () => {
  const clean = cards(['3', '4', '5', '6', '7', '8', '9']);
  const full = cards(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']);
  for (const base of [clean, full.slice(0, 13), full]) {
    const before = structuredClone(base);
    for (const wild of [cards(['JOKER'], '★', 'joker'), cards(['2'], '♥', 'wild-two')]) {
      assert.equal(previewFriendExtension(base, wild, rules), null);
      assert.deepEqual(base, before);
    }
  }
  assert.equal(previewFriendExtension(clean, cards(['JOKER'], '★', 'wild'), rules), null);
  assert.equal(previewFriendExtension(clean, cards(['2'], '♥', 'two'), rules), null);
  assert.equal(previewFriendExtension(clean.slice(0, 3), cards(['JOKER'], '★', 'wild'), rules), null);
  const feed = invite();
  feed.teams[1].melds = [clean];
  feed.dominationFriend.hand = [...cards(['JOKER', '2'], '♥', 'rejected'), ...cards(['10'], '♣', 'natural')];
  feed.dominationFriend.stock = [];
  friendTurn(feed);
  assert.equal(rules.classify(feed.teams[1].melds[0]), 'limpa');
  assert.equal(feed.teams[1].melds[0].length, 8);
  assert.equal(feed.dominationFriend.hand.length, 2);
  const state = invite();
  const real = rules.prepare(cards(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']));
  state.teams[1].melds = [real];
  state.dominationFriend.hand = cards(['A', 'JOKER'], '♣', 'friend-extra');
  state.dominationFriend.stock = [];
  const event = friendTurn(state);
  assert.equal(rules.classify(state.teams[1].melds[0]), 'asas');
  assert.equal(event.plays[0].meldIndex, 0);
  assert.equal(state.dominationFriend.hand.length, 1);
});

test('amiga nao acrescenta coringa a jogo existente em formacao, nem na despedida', () => {
  for (const turns of [3, 1]) {
    for (const rank of ['2', 'JOKER']) {
      const state = invite();
      // O 2 de paus ocupa o 3 neste jogo. Antes, a IA aceitava outro coringa
      // aqui, convertendo o 2 antigo em natural e mantendo o jogo sujo.
      const existing = rules.prepare(cards(['2', '4', '5', '6']));
      state.teams[1].melds = [existing];
      state.dominationFriend.turnsRemaining = turns;
      state.dominationFriend.hand = [...cards(['9', '10'], '♦', 'pair'), ...cards([rank], '♥', 'wild')];
      state.dominationFriend.stock = [];
      assert.equal(previewFriendExtension(existing, cards([rank], '♥', 'candidate'), rules), null);
      const before = structuredClone(existing);
      const result = friendTurn(state);
      assert.deepEqual(state.teams[1].melds[0], before);
      assert.equal(result.plays[0].meldIndex, 1, 'coringa somente no novo jogo separado');
      assert.equal(state.teams[1].melds[1].length, 3);
      assert.ok(state.teams[1].melds[1].some((card) => rules.isWild(card, state.teams[1].melds[1])));
    }
  }
});

test('extensao permite 2 natural do mesmo naipe mas nao transforma natural existente em coringa', () => {
  const base = cards(['3', '4', '5']);
  const natural = previewFriendExtension(base, cards(['2'], '♣', 'natural'), rules);
  assert.ok(natural);
  assert.ok(natural.every((card) => !rules.isWild(card, natural)));
  const low = rules.prepare(cards(['2', '3', '4']));
  assert.equal(previewFriendExtension(low, cards(['6'], '♣', 'gap'), rules), null);
});

test('compra duas cartas auxiliares uma vez por turno, respeitando monte vazio ou incompleto', () => {
  for (const size of [0, 1, 2, 3]) {
    const state = invite();
    state.dominationFriend.hand = [];
    state.dominationFriend.stock = cards(Array(size).fill('K'), '♥', 'aux');
    const before = structuredClone(state);
    const result = friendTurn(state);
    const expected = Math.min(2, size);
    assert.equal(state.dominationFriend.hand.length, expected);
    assert.equal(state.dominationFriend.stock.length, size - expected);
    assert.equal(result.steps.filter((step) => step.type === 'drawStock').flatMap((step) => step.cards).length, expected);
    for (const key of ['stock', 'discard', 'deadPiles', 'players']) assert.deepEqual(state[key], before[key]);
    const restored = JSON.parse(JSON.stringify(state));
    const saved = JSON.stringify(restored);
    assert.equal(executeDominationFriendTurn(restored, result.turnId, rules), null);
    assert.equal(JSON.stringify(restored), saved);
  }
});

test('despedida final remove amiga da rotacao e preserva todos os jogos baixados', () => {
  const state = invite();
  state.dominationFriend.hand = cards(['3', '4', '5', '6'], '♣', 'guest');
  state.dominationFriend.stock = [];
  friendTurn(state);
  const melds = structuredClone(state.teams[1].melds);
  assert.equal(melds.length, 1);
  state.currentPlayer = 1;
  assert.equal(friendTurn(state).departed, false);
  assert.equal(state.dominationFriend.turnsRemaining, 1);
  state.currentPlayer = 1;
  const event = friendTurn(state);
  assert.equal(event.farewell, true);
  assert.equal(event.departed, true);
  assert.equal(state.dominationFriend.active, false);
  assert.equal(state.dominationFriend.turnsRemaining, 0);
  assert.equal(queueDominationFriendTurn(state, 1), false);
  assert.deepEqual(state.teams[1].melds, melds);
  assert.equal(state.finished, false);
});

test('IA guarda trincas fracas e aberturas com 2 coringa para a despedida', () => {
  for (const hand of [cards(['7', '8', '9'], '♦', 'natural-triple'), [...cards(['7', '8'], '♦', 'pair'), ...cards(['2', 'K'], '♥', 'wild-two')]]) {
    const state = invite();
    const clean = cards(['3', '4', '5', '6', '7', '8', '9']);
    state.teams[1].melds = [clean];
    state.dominationFriend.hand = hand;
    state.dominationFriend.stock = [];
    assert.equal(friendTurn(state).plays.length, 0);
    assert.deepEqual(state.dominationFriend.hand, hand);
    assert.deepEqual(state.teams[1].melds, [clean]);
    state.currentPlayer = 1;
    assert.equal(friendTurn(state).plays.length, 0);
    state.currentPlayer = 1;
    const goodbye = friendTurn(state);
    assert.equal(goodbye.departed, true);
    assert.equal(goodbye.plays.length, 1);
    assert.equal(goodbye.plays[0].cardIds.length, 3);
    assert.deepEqual(state.teams[1].melds[0], clean);
    assert.equal(state.teams[1].melds[1].length, 3);
  }
});

test('IA pode esvaziar a mao com jogo sujo separado sem tocar no jogo limpo existente', () => {
  for (const rank of ['2', 'JOKER']) {
    const state = invite();
    const clean = cards(['3', '4', '5', '6', '7', '8', '9']);
    state.teams[1].melds = [clean];
    state.dominationFriend.hand = [...cards(['9', '10'], '♦', 'pair'), ...cards([rank], '♥', 'wild')];
    state.dominationFriend.stock = [];
    const result = friendTurn(state);
    assert.deepEqual(state.teams[1].melds[0], clean);
    assert.equal(state.dominationFriend.hand.length, 0);
    assert.equal(result.plays[0].meldIndex, 1);
    assert.ok(state.teams[1].melds[1].some((card) => rules.isWild(card, state.teams[1].melds[1])));
  }
});

test('IA na despedida prefere baixar toda a mao em jogo separado a deixar coringa sobrando', () => {
  for (const rank of ['2', 'JOKER']) {
    const state = invite();
    const clean = cards(['3', '4', '5', '6', '7', '8', '9']);
    state.teams[1].melds = [clean];
    state.dominationFriend.turnsRemaining = 1;
    state.dominationFriend.hand = [...cards(['3', '4', '5', '6'], '♦', 'natural'), ...cards([rank], '♥', 'wild')];
    state.dominationFriend.stock = [];
    const result = friendTurn(state);
    assert.equal(result.departed, true);
    assert.deepEqual(state.teams[1].melds[0], clean);
    assert.equal(result.plays.flatMap((play) => play.cardIds).length, 5, 'todas foram baixadas, nao apenas removidas na saida');
    assert.ok(state.teams[1].melds[1].some((card) => rules.isWild(card, state.teams[1].melds[1])));
  }
  const strong = invite();
  strong.dominationFriend.turnsRemaining = 1;
  strong.dominationFriend.hand = [...cards(['3', '4', '5', '6', '7', '8', '9']), ...cards(['JOKER'], '★', 'wild')];
  strong.dominationFriend.stock = [];
  friendTurn(strong);
  assert.equal(rules.classify(strong.teams[1].melds[0]), 'limpa', 'esvaziar nao deve superar uma canastra natural');
});

test('bonus de Limpa, Real e As-a-As continuam saindo somente do baralho auxiliar', () => {
  const cases = [
    [['3', '4', '5', '6', '7', '8'], '9', 'limpa', 1],
    [['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q'], 'K', 'real', 2],
    [['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], 'A', 'asas', 3],
  ];
  for (const [ranks, next, kind, bonus] of cases) {
    const state = invite();
    const mainStock = structuredClone(state.stock);
    state.teams[1].melds = [rules.prepare(cards(ranks))];
    state.dominationFriend.hand = [];
    state.dominationFriend.stock = [...cards(['K', 'K', 'K', 'K', 'K'], '♥', 'aux'), ...cards([next], '♣', 'next')];
    const result = friendTurn(state);
    assert.equal(result.plays[0].newKind, kind);
    assert.equal(result.steps.filter((step) => step.type === 'drawStock').flatMap((step) => step.cards).length, 2 + bonus);
    assert.equal(state.dominationFriend.stock.length, 4 - bonus);
    assert.deepEqual(state.stock, mainStock);
  }
});

test('IA concentra naturais na canastra maior e planeja varias extensoes ate As-a-As', () => {
  const state = invite();
  const small = cards(['3', '4', '5'], '♣', 'small');
  state.teams[1].melds = [small, cards(['6', '7', '8', '9', '10', 'J', 'Q', 'K'], '♣', 'large')];
  state.dominationFriend.hand = cards(['A', '2', '3', '4', '5', 'A'], '♣', 'guest');
  state.dominationFriend.stock = [];
  const result = friendTurn(state);
  assert.equal(result.plays[0].meldIndex, 1);
  assert.equal(rules.classify(state.teams[1].melds[1]), 'asas');
  assert.deepEqual(state.teams[1].melds[0], small);
  assert.equal(state.dominationFriend.hand.length, 0);
});

test('IA reserva naturais que faltam no jogo limpo em vez de abrir outro jogo ou alimentar sujo', () => {
  const state = invite();
  const clean = cards(['3', '4', '5'], '♣', 'clean');
  const dirty = rules.prepare([...cards(['6', '7'], '♣', 'dirty'), ...cards(['JOKER'], '★', 'wild')]);
  state.teams[1].melds = [clean, dirty];
  state.dominationFriend.hand = cards(['9', '10', 'J', 'Q'], '♣', 'guest');
  state.dominationFriend.stock = [];
  assert.equal(friendTurn(state).plays.length, 0);
  assert.equal(state.dominationFriend.hand.length, 4);
  assert.deepEqual(state.teams[1].melds, [clean, dirty]);
});

test('abertura prioriza sequencia natural e permite 2 coringa para canastra imediata', () => {
  const natural = invite();
  natural.dominationFriend.hand = [...cards(['3', '4', '5', '6'], '♣', 'guest'), ...cards(['2'], '♥', 'two')];
  natural.dominationFriend.stock = [];
  friendTurn(natural);
  assert.equal(natural.teams[1].melds[0].length, 4);
  assert.ok(natural.teams[1].melds[0].every((card) => !rules.isWild(card, natural.teams[1].melds[0])));
  assert.equal(natural.dominationFriend.hand[0].rank, '2');

  const scoring = invite();
  scoring.dominationFriend.hand = [...cards(['3', '4', '5', '7', '8', '9'], '♣', 'guest'), ...cards(['2'], '♥', 'two')];
  scoring.dominationFriend.stock = [];
  friendTurn(scoring);
  assert.equal(scoring.teams[1].melds[0].length, 7);
  assert.equal(rules.classify(scoring.teams[1].melds[0]), 'suja');
});

test('sobras impossiveis desaparecem sem descarte, penalidade ou efeito no adversario', () => {
  const state = invite();
  state.dominationFriend.turnsRemaining = 1;
  state.dominationFriend.hand = cards(['3', '9'], '♣', 'unplayable');
  state.dominationFriend.stock = [];
  const before = structuredClone(state);
  friendTurn(state);
  assert.deepEqual(state.dominationFriend.hand, []);
  assert.deepEqual(state.dominationFriend.stock, []);
  for (const key of ['stock', 'discard', 'deadPiles', 'players', 'teams', 'deadChunksTaken']) assert.deepEqual(state[key], before[key]);
});

test('fluxo real do Dominador concede +1 por categoria nova, sem mudar compras ou premiar adversario', async () => {
  const state = invite();
  state.stock = cards(Array(20).fill('K'), '♥', 'rewards');
  const rewardContext = vm.createContext({
    state, grantDominationFriendExtraTurn, ensureCardId() {}, packCard: (card) => ({ ...card }),
    sortHand() {}, showMessage() {},
  });
  vm.runInContext(`async ${appFunction('processDominationReward')}`, rewardContext);
  let previous = 'simple';
  for (const [kind, expected] of [['limpa', 4], ['real', 5], ['asas', 6]]) {
    const reward = await rewardContext.processDominationReward(state.players[1], previous, kind, 0);
    assert.equal(state.dominationFriend.turnsRemaining, expected);
    assert.equal(reward.drawnCards.length, 1, 'bonus de cartas continua sendo a diferenca no mesmo turno');
    assert.equal(await rewardContext.processDominationReward(state.players[1], kind, kind, 0), null);
    previous = kind;
  }
  await rewardContext.processDominationReward(state.players[0], 'simple', 'limpa', 0);
  assert.equal(state.dominationFriend.turnsRemaining, 6, 'adversario nao concede turno');
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(grantDominationFriendExtraTurn(restored, 1, 'simple', 'limpa', 0), null);
  assert.equal(grantDominationFriendExtraTurn(restored, 1, 'suja', 'asas', 0), null);
  assert.equal(restored.dominationFriend.turnsRemaining, 6);
  assert.ok(grantDominationFriendExtraTurn(restored, 1, 'simple', 'asas', 1));
  assert.equal(restored.dominationFriend.turnsRemaining, 7, 'canastra direta concede um turno, nao tres');
  assert.equal(grantDominationFriendExtraTurn(restored, 1, 'simple', 'suja', 2), null);
  restored.dominationFriend.active = false;
  assert.equal(grantDominationFriendExtraTurn(restored, 1, 'simple', 'limpa', 2), null);
  restored.dominationFriend.active = true;
  restored.mode = '1x1_duploMorto';
  const before = JSON.stringify(restored);
  assert.equal(grantDominationFriendExtraTurn(restored, 1, 'simple', 'limpa', 2), null);
  assert.equal(JSON.stringify(restored), before);
});

test('conquista da amiga na despedida prolonga presenca e persiste uma unica vez', () => {
  for (const [ranks, next, kind, bonus] of [
    [['3', '4', '5', '6', '7', '8'], '9', 'limpa', 1],
    [['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q'], 'K', 'real', 2],
    [['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], 'A', 'asas', 3],
  ]) {
    const state = game();
    state.teams[1].melds = [rules.prepare(cards(ranks))];
    callDominationFriend(state, 1, invitation(), 0, rules);
    assert.equal(state.dominationFriend.extraTurns, 0, 'canastras anteriores a entrada nao contam');
    state.dominationFriend.turnsRemaining = 1;
    state.dominationFriend.hand = [];
    state.dominationFriend.stock = [...cards(['K', 'K', 'K', 'K', 'K'], '♥', 'bonus'), ...cards([next], '♣', 'natural')];
    const result = friendTurn(state);
    assert.equal(result.farewell, true);
    assert.equal(result.departed, false);
    assert.equal(state.dominationFriend.turnsRemaining, 1);
    assert.equal(state.dominationFriend.active, true);
    assert.equal(state.dominationFriend.extraTurns, 1);
    assert.equal(state.dominationFriend.stock.length, 4 - bonus);
    const event = result.steps.find((step) => step.friendEvent)?.friendEvent;
    assert.equal(event.kind, kind);
    assert.equal(event.playerId, 'friend');
    const restored = JSON.parse(JSON.stringify(state));
    const saved = JSON.stringify(restored);
    assert.equal(executeDominationFriendTurn(restored, result.turnId, rules), null);
    assert.equal(JSON.stringify(restored), saved);
    const departure = friendTurn(restored);
    assert.equal(departure.departed, true, 'sem outra conquista, despede-se no turno seguinte');
  }
});

test('avisos chegam uma vez em cada cliente e nao repetem eventos salvos no reload', () => {
  const state = game();
  const host = createFriendNoticeTracker();
  const peer = createFriendNoticeTracker();
  assert.deepEqual(host.collect(state), []);
  assert.deepEqual(peer.collect(state), []);
  invite(state);
  assert.deepEqual(host.collect(state, true), [], 'aguarda roleta local');
  assert.equal(peer.collect(state)[0].type, 'arrival');
  assert.equal(host.collect(state)[0].type, 'arrival');
  const event = grantDominationFriendExtraTurn(state, 1, 'simple', 'limpa', 0);
  for (const tracker of [host, peer]) {
    assert.deepEqual(tracker.collect(state), [event]);
    assert.deepEqual(tracker.collect(state), []);
  }
  const reloaded = createFriendNoticeTracker();
  const restored = JSON.parse(JSON.stringify(state));
  assert.deepEqual(reloaded.collect(restored), []);
  const next = grantDominationFriendExtraTurn(restored, 'friend', 'limpa', 'real', 0);
  assert.deepEqual(reloaded.collect(restored), [next]);
});
