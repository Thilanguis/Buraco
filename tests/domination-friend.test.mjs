import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { isValidBossSequence } from '../js/boss/boss-engine.js';
import {
  FRIEND_NAMES, canCallDominationFriend, createFriendInvitation, rollFriendDuration,
  callDominationFriend, queueDominationFriendTurn, executeDominationFriendTurn,
  previewFriendExtension, isDominationFriendBusy, grantDominationFriendExtraTurn, isDominationFriendEndgame, grantDominationFriendSharedBonus,
  normalizeDominationOptions, dominationFeatureEnabled, shouldBotCallDominationFriend,
} from '../js/game/domination-friend.js';
import { renderDominationFriend, friendWheelSegments, playDominationFriendTimeline, createFriendNoticeTracker, friendSpotlightGeometry } from '../js/game/domination-friend-ui.js';

// Exercise precisely the live app's meld rules without starting Firebase or UI.
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
test('visao usada continua visivel e desabilitada sem mudar texto dos outros modos', () => {
  const start = app.indexOf("  const powerBtn = document.getElementById('powerBtn');");
  const code = app.slice(start, app.indexOf('// Oculta botões', start));
  const button = { style: {} };
  const state = { mode: '1x1_dominacao', currentPlayer: 1, dominatorUsedPower: true };
  const live = vm.createContext({ state, dominationFeatureEnabled, myPlayerIndex: 1, window: {}, document: { getElementById: () => button } });
  vm.runInContext(code, live);
  assert.equal(button.style.display, 'block');
  assert.equal(button.disabled, true);
  assert.equal(button.innerHTML, '✓ VISÃO USADA');
});

test('descarte privado pousa antes de atualizar mao e persiste sem repetir no reload', async () => {
  const state = invite();
  state.dominationFriend.hand = [...cards(['K'], '♥', 'spare'), ...cards(['2'], '♣', 'keep')];
  state.dominationFriend.stock = [];
  const view = structuredClone(state);
  const shared = structuredClone(state.discard);
  const result = friendTurn(state);
  assert.equal(result.steps.at(-1).type, 'discard');
  assert.equal(state.dominationFriend.discard[0].rank, 'K');
  assert.equal(state.dominationFriend.hand[0].rank, '2');
  await playDominationFriendTimeline(view, result, { isActive: () => true, render() {}, animate: async step => {
    assert.equal(step.type, 'discard');
    assert.equal(view.dominationFriend.discard.length, 0);
    assert.ok(view.dominationFriend.hand.some(card => card.id === step.card.id));
  } });
  assert.deepEqual(view.dominationFriend.discard, state.dominationFriend.discard);
  assert.deepEqual(state.discard, shared);
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(executeDominationFriendTurn(restored, result.turnId, rules), null);
  assert.deepEqual(restored.dominationFriend.discard, state.dominationFriend.discard);
});
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

test('opcoes independentes iniciam ligadas, persistem na partida e nao alteram outros modos', async () => {
  assert.deepEqual(normalizeDominationOptions(), { friend: true, plus: true, vision: true });
  const elements = Object.fromEntries(['friend', 'plus', 'vision'].map((key) => [`dominationOption_${key}`, { checked: true }]));
  const live = vm.createContext({
    normalizeDominationOptions, document: { getElementById: (id) => elements[id] || { value: '', open: false } },
    activateGameSession() {}, normalizeVariantForMode: (_mode, variant) => variant,
    isBossMode: () => false, shuffle: (deck) => deck, createDeck: () => [], SUITS: [], RANKS: [], DEAD_CHUNK_SIZE: 11,
    dealInitialDeck: (_deck, count) => ({ stock: [], discard: [], deadPiles: [], hands: Array.from({ length: count }, () => []) }),
    sortHand() {}, crypto: { randomUUID: () => 'test-options' }, gameRef: {}, lastSeenBossLogKey: null,
    setDoc: async (_ref, data) => { live.saved = JSON.parse(data.stateJson); }, showMessage() {},
  });
  vm.runInContext(`${appFunction('readDominationMenuOptions')}\n${appFunction('syncDominationMenuOptions')}\nasync ${appFunction('startGame')}`, live);
  for (const feature of ['friend', 'plus', 'vision']) {
    const options = normalizeDominationOptions({ [feature]: false });
    live.syncDominationMenuOptions(options);
    assert.deepEqual(live.readDominationMenuOptions(), options);
    await live.startGame('1x1_dominacao', ['J1', 'J2'], 'aberto');
    assert.deepEqual(live.saved.dominationOptions, options);
    for (const key of ['friend', 'plus', 'vision']) assert.equal(dominationFeatureEnabled(live.saved, key), key !== feature);
    const restored = JSON.parse(JSON.stringify(live.saved));
    restored.currentPlayer = 1;
    assert.equal(canCallDominationFriend(restored, 1), feature !== 'friend');
  }
  await live.startGame('1x1', ['J1', 'J2'], 'aberto');
  assert.equal(live.saved.dominationOptions, undefined);
  for (const feature of ['friend', 'plus', 'vision']) assert.equal(dominationFeatureEnabled(live.saved, feature), false);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const key of ['friend', 'plus', 'vision']) assert.match(html, new RegExp(`id="dominationOption_${key}" type="checkbox" checked onchange="pushLobby\\(\\)"`));
});

test('desmarcar Plus desativa compras dos dois, mas preserva turno extra e compra normal da amiga', async () => {
  const state = invite();
  state.dominationOptions = normalizeDominationOptions({ plus: false });
  const live = vm.createContext({ state, grantDominationFriendExtraTurn, dominationFeatureEnabled });
  vm.runInContext(`async ${appFunction('processDominationReward')}`, live);
  const before = structuredClone(state);
  assert.equal(await live.processDominationReward(state.players[1], 'simple', 'real', 0), null);
  assert.deepEqual(state.players, before.players);
  assert.deepEqual(state.stock, before.stock);
  assert.deepEqual(state.dominationFriend.hand, before.dominationFriend.hand);
  assert.equal(state.dominationFriend.turnsRemaining, before.dominationFriend.turnsRemaining + 1);
  state.teams[1].melds = [cards(['3', '4', '5', '6', '7', '8'])];
  state.dominationFriend.hand = [];
  state.dominationFriend.stock = [...cards(['K', 'K', 'K'], '♥', 'aux'), ...cards(['9'], '♣', 'next')];
  state.dominationFriend.rewardedMeldTiers = {};
  const extraBefore = state.dominationFriend.extraTurns;
  const result = friendTurn(state);
  assert.equal(result.plays[0].newKind, 'limpa');
  assert.equal(state.dominationFriend.extraTurns, extraBefore + 1);
  assert.equal(result.steps.filter((step) => step.type === 'drawStock').flatMap((step) => step.cards).length, 2);
  assert.equal(result.steps.some((step) => step.type === 'dominatorBonus'), false);
  assert.deepEqual(state.players, before.players);
  assert.deepEqual(state.stock, before.stock);
});

test('Visao desativada bloqueia ativacao e roubo, inclusive chamada direta', async () => {
  const state = game();
  state.dominationOptions = normalizeDominationOptions({ vision: false });
  const live = vm.createContext({ state, window: {}, dominationFeatureEnabled, ensureMyTurn() { assert.fail('Visao desligada deve sair antes da acao'); } });
  for (const name of ['toggleStealMode', 'stealCard']) {
    const start = app.indexOf(`window.${name} =`);
    vm.runInContext(app.slice(start, app.indexOf('\n};', start) + 3), live);
    await live.window[name]('enemy_0');
  }
});

test('canastra da amiga respeita reposicao do morto e roubo final do bonus do Dominador', async () => {
  const state = invite();
  state.stock = [];
  state.deadPiles = [cards(['7'], '♥', 'dead'), []];
  state.dominationFriend.hand = [];
  state.dominationFriend.stock = cards(['K', 'K', 'K', 'K', 'K', 'A'], '♣', 'aux');
  state.teams[1].melds = [rules.prepare(cards(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']))];
  const view = structuredClone(state);
  const result = friendTurn(state);
  const purchases = result.steps.filter((step) => step.type === 'dominatorBonus');
  assert.equal(purchases.length, 1, 'As-a-As concede somente uma carta, do morto disponivel');
  assert.equal(purchases[0].recycledIndex, 0);
  assert.equal(purchases[0].cards[0]._isEndgameSteal, false);
  assert.equal(state.players[0].hand.length, 1, 'nao rouba carta extra do adversario');
  const saved = JSON.stringify(state);
  await playDominationFriendTimeline(view, result, { animate: async () => {}, render() {}, isActive: () => true });
  assert.deepEqual(view.players, state.players);
  assert.deepEqual(view.deadPiles, state.deadPiles);
  assert.deepEqual(view.stock, state.stock);
  assert.equal(JSON.stringify(state), saved);
  assert.equal(executeDominationFriendTurn(state, result.turnId, rules), null);
});

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

test('bot Dominador respeita opcoes, chama amiga e rouba uma vez por partida', async () => {
  for (const friend of [false, true]) for (const vision of [false, true]) {
    const state = game();
    state.players[1].name = 'BOT Dominador';
    state.teams[1].melds = [rules.prepare(cards(['3', '4', '5', '6', '7']))];
    state.dominationOptions = { friend, vision, plus: false };
    state.players[0].hand = cards(['3', '4', '5', '6'], '♣', 'victim');
    state.hasDrawnThisTurn = false;
    let calls = 0;
    const actions = [];
    const engine = { isActive: () => true, showMessage() {}, commitState: async () => {
      if (state.lastAction) actions.push(state.lastAction);
    } };
    const live = vm.createContext({ state, dominationFeatureEnabled, canCallDominationFriend, shouldBotCallDominationFriend, friendMeldRules: rules,
      performDominationFriendCall: async (id, bot) => {
        assert.equal(id, 1); assert.equal(bot, true); calls++;
        callDominationFriend(state, id, invitation(), 0);
      }, sortHand() {}, packCard: card => ({ ...card }), newActionId: () => `steal-${actions.length}`,
      BuracoBot: { sleep: async () => {} },
    });
    vm.runInContext(`${appFunction('chooseBotDominationSteal')}\nasync ${appFunction('executeBotDominationPowers')}`, live);
    await live.executeBotDominationPowers(engine, 1);
    assert.equal(calls, friend ? 1 : 0);
    assert.equal(actions.length, vision ? 2 : 0);
    assert.equal(state.players[0].hand.length, vision ? 2 : 4);
    assert.equal(state.hasDrawnThisTurn, vision);
    if (vision) {
      assert.equal(state.partialDraw, false);
      assert.equal(state.powerActiveThisTurn, false);
      assert.equal(state.dominatorUsedPower, true);
    }
    state.hasDrawnThisTurn = false;
    await live.executeBotDominationPowers(engine, 1);
    assert.equal(calls, friend ? 1 : 0);
    assert.equal(actions.length, vision ? 2 : 0);
  }
});

test('bot guarda amiga ate haver potencial de canastra ou pressao de fim de partida', () => {
  const state = game();
  assert.equal(shouldBotCallDominationFriend(state, rules), false, 'mesa vazia no inicio');
  state.teams[1].melds = [rules.prepare(cards(['3', '4', '5']))];
  assert.equal(shouldBotCallDominationFriend(state, rules), false, 'uma trinca nao gasta a chamada');
  state.teams[1].melds = [rules.prepare(cards(['3', '4', '5', '6', '7']))];
  assert.equal(shouldBotCallDominationFriend(state, rules), true, 'perto de fechar limpa');
  state.teams[1].melds = [rules.prepare(cards(['3', '4', '5', '6'])), rules.prepare(cards(['6', '7', '8', '9'], '♥', 'second'))];
  assert.equal(shouldBotCallDominationFriend(state, rules), true, 'duas frentes naturais');
  state.teams[1].melds = [rules.prepare(cards(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']))];
  assert.equal(shouldBotCallDominationFriend(state, rules), true, 'evolucao para As-a-As');
  state.teams[1].melds = [];
  state.players[1].hand = cards(['3', '4', '5', '6', '7', '8'], '♣', 'owner');
  assert.equal(shouldBotCallDominationFriend(state, rules), false);
  state.players[1].hand.push(...cards(['9'], '♣', 'purchase'));
  assert.equal(shouldBotCallDominationFriend(state, rules), true, 'compra tornou canastra possivel antes da baixada');
  state.players[1].hand = [];
  state.deadPiles = [[], []];
  assert.equal(shouldBotCallDominationFriend(state, rules), true, 'nao guarda a habilidade ate acabar');
  state.dominationOptions = { friend: false };
  assert.equal(shouldBotCallDominationFriend(state, rules), false);
  state.dominationOptions = { friend: true, plus: false };
  assert.equal(shouldBotCallDominationFriend(state, rules), true, 'turnos extras continuam sem Plus');
  state.friendUsed = true;
  assert.equal(shouldBotCallDominationFriend(state, rules), false);
});

test('Visao do bot retoma compra parcial e repoe mao vazia sem pegar morto', async () => {
  const state = game();
  state.players[1].name = 'BOT Dominador';
  state.dominationOptions = { friend: false, vision: true };
  state.dominatorUsedPower = true;
  state.powerActiveThisTurn = true;
  state.partialDraw = true;
  const dead = structuredClone(state.deadPiles);
  const engine = { isActive: () => true, showMessage() {}, commitState: async () => {} };
  const live = vm.createContext({ state, dominationFeatureEnabled, canCallDominationFriend, shouldBotCallDominationFriend, friendMeldRules: rules,
    sortHand() {}, ensureCardId() {}, packCard: card => ({ ...card }), newActionId: () => 'resumed',
    BuracoBot: { sleep: async () => {} },
  });
  vm.runInContext(`${appFunction('chooseBotDominationSteal')}\nasync ${appFunction('executeBotDominationPowers')}`, live);
  await live.executeBotDominationPowers(engine, 1);
  assert.equal(state.players[1].hand.length, 2);
  assert.equal(state.players[0].hand.length, 1);
  assert.equal(state.stock.length, 2);
  assert.ok(state.lastAction.escravoAutoDraw);
  assert.equal(state.hasDrawnThisTurn, true);
  assert.deepEqual(state.deadPiles, dead);
});

test('Visao prefere natural para canastra e nao age em outro modo ou jogador', async () => {
  const state = game();
  state.players[1].name = 'BOT Dominador';
  state.teams[1].melds = [rules.prepare(cards(['3', '4', '5', '6', '7', '8']))];
  state.players[0].hand = [...cards(['JOKER'], '★', 'wild'), ...cards(['9'], '♣', 'needed')];
  const live = vm.createContext({ state, friendMeldRules: rules });
  vm.runInContext(`${appFunction('chooseBotDominationSteal')}\nasync ${appFunction('executeBotDominationPowers')}`, live);
  assert.equal(live.chooseBotDominationSteal(state).id, 'needed_0');
  const engine = { isActive: () => true, commitState: async () => assert.fail('nao deve agir') };
  await live.executeBotDominationPowers(engine, 0);
  state.mode = '1x1';
  await live.executeBotDominationPowers(engine, 1);
});

test('turno real do bot nao compra monte ou lixo novamente depois da Visao', async () => {
  const source = readFileSync(new URL('../bot.js', import.meta.url), 'utf8');
  const live = vm.createContext({ console: { error: (...args) => assert.fail(args.join(' ')), warn() {} } });
  vm.runInContext(source.replace('export class BuracoBot', 'class BuracoBot') + '\nthis.TestBot = BuracoBot;', live);
  live.TestBot.sleep = async () => {};
  live.TestBot.processMelds = async () => {};
  live.TestBot.processDiscard = async () => true;
  for (const mode of ['1x1_dominacao', '1x1']) {
    const state = game(mode);
    let powers = 0;
    let draws = 0;
    const engine = {
      isActive: () => true, getState: () => state, showMessage() {},
      computeTeamMeldScore: () => ({ total: 0 }), teamHasGoodCanastra: () => false,
      isDiscardBlocked: () => true,
      executeDominationPowers: async () => { powers++; state.hasDrawnThisTurn = true; },
      executeDrawStock: async () => { draws++; state.hasDrawnThisTurn = true; },
    };
    await live.TestBot.playTurn(state, 1, engine);
    assert.equal(powers, mode === '1x1_dominacao' ? 2 : 0);
    assert.equal(draws, mode === '1x1_dominacao' ? 0 : 1);
  }
});

test('botao da amiga mantem lugar e so habilita a chamada no proprio turno', () => {
  const button = { hidden: true };
  globalThis.document = { getElementById: (id) => id === 'callFriendBtn' ? button : null, querySelector: () => null };
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
    renderDominationFriend(state, 1);
    assert.equal(button.hidden, false);
    assert.equal(button.disabled, true);
    state.friendUsed = true;
    renderDominationFriend(state, 1);
    assert.equal(button.hidden, false);
    assert.equal(button.disabled, true);
    assert.equal(button.textContent, '✓ AMIGA CHAMADA');
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

test('holofote parte de fora do topo e acompanha a posicao do auxiliar em cada tela', () => {
  for (const [width, left, top, cardWidth, cardHeight] of [[390, 130, 540, 40, 58], [844, 340, 180, 40, 58], [1440, 680, 600, 55, 80]]) {
    const rect = { left, top, width: cardWidth, height: cardHeight };
    const geometry = friendSpotlightGeometry(rect, width);
    assert.equal(geometry.x, left + cardWidth / 2);
    assert.ok(geometry.y >= top && geometry.y <= top + cardHeight);
    assert.ok(geometry.origin >= 24 && geometry.origin <= width - 24);
    assert.ok(geometry.path.startsWith(`M ${geometry.origin - 9} -30 L ${geometry.origin + 9} -30`));
    const moved = friendSpotlightGeometry({ ...rect, top: top - 90 }, width);
    assert.ok(Math.abs(moved.y - (geometry.y - 90)) < 1e-9);
    assert.equal(moved.origin, geometry.origin);
  }
});

test('amiga ocupa assento lateral com os mesmos versos da partida e sai ao mudar de modo', () => {
  // Minimal DOM for the production renderer, not a second rendering algorithm.
  function element() {
    const node = { children: [], dataset: {}, style: {}, className: '', setAttribute() {} };
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
  const middle = element();
  table.append(middle);
  const mainStock = element();
  const discard = element();
  middle.append(mainStock, discard);
  const findNode = (node, id) => node.id === id ? node : node.children.map((child) => findNode(child, id)).find(Boolean);
  const button = element();
  globalThis.document = {
    createElement: element,
    getElementById: (id) => id === 'gameSection' ? section : id === 'callFriendBtn' ? button : findNode(table, id),
    querySelector: (selector) => selector === '#gameSection > .board' ? table : selector === '#gameSection .board-middle' ? middle : null,
  };
  try {
    const state = invite();
    const beforeArrival = game();
    renderDominationFriend(beforeArrival, 1);
    assert.ok(table.classList.contains('friend-layout'));
    assert.ok(table.classList.contains('friend-layout-right'));
    renderDominationFriend(state, 1);
    const seat = document.getElementById('dominationFriendPanel');
    const auxiliary = document.getElementById('dominationFriendStock');
    assert.equal(auxiliary.parent, middle, 'monte auxiliar pertence ao centro, junto de monte/lixo');
    assert.equal(auxiliary.children[0].children[0].dataset.cardId, state.dominationFriend.stock.at(-1).id);
    assert.equal(auxiliary.children[0].children.length, 16);
    assert.equal(auxiliary.classList.contains('is-playing'), false);
    assert.ok(table.classList.contains('friend-present'));
    assert.equal(table.classList.contains('friend-playing'), false);
    for (const [count, expected] of [[7, 3], [3, 1], [1, 1]]) {
      const savedStock = state.dominationFriend.stock;
      state.dominationFriend.stock = savedStock.slice(0, count);
      state.dominationFriend.pendingTurnId = 'visual-test';
      renderDominationFriend(state, 1);
      assert.equal(auxiliary.children[0].children.length, expected);
      assert.equal(auxiliary.children[0].children[0].style.bottom, `${(expected - 1) * 1.2}px`);
      assert.equal(auxiliary.classList.contains('is-playing'), true);
      assert.ok(table.classList.contains('friend-playing'));
      state.dominationFriend.stock = savedStock;
    }
    state.dominationFriend.pendingTurnId = null;
    renderDominationFriend(state, 1);
    assert.equal(auxiliary.classList.contains('is-playing'), false);
    assert.match(auxiliary.children[1].textContent, /MONTE AUXILIAR \(97\)/);
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
    assert.equal(table.children.length, 2);
    assert.equal(document.getElementById('dominationFriendStock'), auxiliary, 'ancora central e estavel entre renders e espectadores');
    assert.equal(state.players.length, 2);
    state.dominationFriend.hand = Array.from({ length: 30 }, (_, index) => ({ ...state.dominationFriend.hand[0], id: `many-${index}` }));
    state.dominationFriend.turnsRemaining = 9;
    state.dominationFriend.extraTurns = 7;
    renderDominationFriend(state, 0);
    assert.equal(seat.children.find((node) => node.className === 'opponent-cards').children.length, 12);
    assert.match(seat.children.find((node) => node.className === 'friend-seat-status').textContent, /9 turnos restantes · \+7 ganhos/);
    assert.equal(state.dominationFriend.hand.length, 30, 'limite somente visual, sem descartar cartas');
    state.dominationFriend.stock = [];
    renderDominationFriend(state, 0);
    assert.equal(document.getElementById('dominationFriendStock'), auxiliary, 'ancora permanece disponivel para o voo da ultima carta');
    assert.equal(auxiliary.children[0].children.length, 0);
    assert.match(auxiliary.children[1].textContent, /MONTE AUXILIAR \(0\)/);
    state.dominationFriend.active = false;
    renderDominationFriend(state, 1);
    assert.deepEqual(middle.children, [mainStock, discard], 'saida remove so o auxiliar');
    assert.ok(table.classList.contains('friend-layout'), 'saida preserva o espaco reservado');
    assert.equal(table.classList.contains('friend-present'), false);
    assert.equal(table.classList.contains('friend-playing'), false);
    state.dominationFriend.active = true;
    renderDominationFriend(state, 1);
    state.mode = '1x1';
    renderDominationFriend(state, 1);
    assert.deepEqual(table.children, [middle]);
    assert.equal(table.classList.contains('friend-layout'), false);
    assert.deepEqual(middle.children, [mainStock, discard]);
  } finally { delete globalThis.document; }
});

test('turno grava e anima compra, baixada, bonus e extensao na ordem sem alterar o estado salvo', async () => {
  const state = invite();
  state.dominationFriend.hand = cards(['3', '4', '5', '6', '7', '8'], '♣', 'guest');
  state.dominationFriend.stock = [...cards(['10'], '♣', 'bonus'), ...cards(['K'], '♥', 'spare'), ...cards(['9'], '♣', 'aux')];
  const before = structuredClone(state);
  const result = friendTurn(state);
  const saved = JSON.stringify(state);
  assert.deepEqual(result.steps.map((step) => step.type), ['drawStock', 'meldNew', 'drawStock', 'dominatorBonus', 'meldExtend', 'discard']);
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
  assert.deepEqual(flown, ['drawStock', 'drawStock', 'meldNew', 'drawStock', 'dominatorBonus', 'meldExtend', 'discard']);
  assert.deepEqual(rendered, [7, 8, 1, 2, 2, 1, 0]);
  assert.deepEqual(view.players, state.players);
  assert.deepEqual(view.stock, state.stock);
  assert.deepEqual(view.teams, state.teams);
  assert.deepEqual(view.dominationFriend.hand, state.dominationFriend.hand);
  assert.deepEqual(view.dominationFriend.stock, state.dominationFriend.stock);
  assert.equal(JSON.stringify(state), saved);
});

test('amiga pensa entre acoes, mantem bonus juntos e cancela durante a pausa', async () => {
  const state = invite();
  state.dominationFriend.hand = cards(['3', '4', '5', '6', '7', '8'], '♣', 'guest');
  state.dominationFriend.stock = [...cards(['10'], '♣', 'bonus'), ...cards(['K'], '♥', 'spare'), ...cards(['9'], '♣', 'aux')];
  const before = structuredClone(state);
  const result = friendTurn(state);
  const stages = [];
  const events = [];
  await playDominationFriendTimeline(structuredClone(before), result, {
    isActive: () => true, render() {}, animate: async step => events.push(step.type),
    pace: async stage => { stages.push(stage); events.push(`pause:${stage}`); },
  });
  assert.deepEqual(stages, ['think', 'card', 'organize', 'play', 'discard']);
  assert.equal(events[0], 'pause:think');
  const sharedBonus = events.indexOf('dominatorBonus');
  assert.equal(events[sharedBonus - 1], 'drawStock', 'compras do bonus permanecem juntas, sem pausa entre parceiros');
  const cancelled = structuredClone(before);
  let active = true;
  await playDominationFriendTimeline(cancelled, result, {
    isActive: () => active, render() {}, animate: async () => assert.fail('nao deve voar apos cancelamento'),
    pace: async () => { active = false; },
  });
  assert.deepEqual(cancelled, before);
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
    BuracoBot: { randomDelay: (min) => min, sleep: async () => {} }, botTurnController: { signal: undefined },
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
  const frameCount = result.steps.reduce((sum, step) => sum + (step.type === 'drawStock' ? step.cards.length : 1), 0);
  assert.equal(flights, frameCount);
  assert.equal(playbackContext.friendPlayback, null);
  assert.equal(playbackContext.canPerformCommonGameAction(state), true);
  assert.deepEqual(playbackContext.state, before);
  playbackContext.state = JSON.parse(JSON.stringify(state));
  playbackContext.friendActionPresentations.clear();
  await playbackContext.playFriendTurnPresentation(action);
  assert.equal(flights, frameCount, 'reload nao repete os voos');
  playbackContext.state = game('1x1');
  await playbackContext.playFriendTurnPresentation(action);
  assert.equal(flights, frameCount, 'outros modos nao animam a amiga');
});

test('motor normal anima cartas reais do monte auxiliar e do assento para o jogo do Dominador', async () => {
  const friendState = invite();
  const auxiliary = { left: 800, top: 500, width: 30, height: 44 };
  const privateDiscard = { left: 800, top: 650, width: 40, height: 58 };
  const seat = { left: 800, top: 250, width: 40, height: 60 };
  const meld = { left: 500, top: 100, width: 22, height: 30 };
  const flights = [];
  const impacts = [];
  const flightContext = vm.createContext({
    state: friendState, myPlayerIndex: 1, window: { gameSessionId: 1, isClosingGame: false },
    document: {
      querySelector: (selector) => selector === '#dominationFriendStock .opponent-card-back' ? auxiliary
        : selector === '#dominationFriendDiscard .friend-discard-face' ? privateDiscard : null,
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
  await flightContext.playRemoteAction({ type: 'drawDiscard', playerId: 'friend', card: drawn[0], cards: [drawn[0]] });
  assert.deepEqual(flights.at(-1), { card: drawn[0], from: privateDiscard, to: seat, face: 'front' });
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

test('lixo proprio encerra compra no aberto e fechado sem retirar carta do auxiliar', async () => {
  for (const variant of ['aberto', 'fechado']) {
    const state = invite();
    state.variant = variant;
    state.dominationOptions = { plus: false };
    state.teams[1].melds = [rules.prepare(cards(['3', '4', '5', '6']))];
    const friend = state.dominationFriend;
    friend.hand = cards(['Q'], '♦', 'hand');
    friend.discard = cards(['K', '7'], '♣', 'private');
    friend.stock = cards(['J', '10', '9'], '♥', 'aux');
    const before = structuredClone(state);
    const result = friendTurn(state);
    assert.equal(result.steps[0].type, 'drawDiscard');
    assert.equal(result.steps[0].cards.length, 2);
    assert.equal(result.steps[1].type, 'meldExtend');
    assert.equal(result.steps.filter(s => s.type === 'drawStock' && s.reason === 'turn').flatMap(s => s.cards).length, 0);
    assert.deepEqual(friend.stock, before.dominationFriend.stock);
    assert.ok(state.teams[1].melds[0].some(card => card.id === 'private_1'));
    for (const key of ['stock', 'discard', 'deadPiles', 'players']) assert.deepEqual(state[key], before[key]);
    const view = structuredClone(before);
    const saved = JSON.stringify(state);
    const flights = [];
    await playDominationFriendTimeline(view, result, { isActive: () => true, render() {}, animate: async step => {
      if (step.type === 'drawDiscard') {
        assert.ok(view.dominationFriend.discard.some(card => card.id === step.card.id));
        flights.push(step.card.id);
      }
      assert.equal(JSON.stringify(state), saved);
    } });
    assert.deepEqual(flights, ['private_1', 'private_0']);
    assert.deepEqual(view.dominationFriend.discard, friend.discard);
    assert.deepEqual(view.teams, state.teams);
    assert.deepEqual(view.dominationFriend.hand.map(c => c.id).sort(), friend.hand.map(c => c.id).sort());
    const restored = JSON.parse(saved);
    assert.equal(executeDominationFriendTurn(restored, result.turnId, rules), null);
    assert.equal(JSON.stringify(restored), saved);
  }
});

test('fechado nao usa cartas enterradas nem compra futura para justificar o topo', () => {
  for (const source of ['buried', 'stock']) {
    const state = invite();
    state.variant = 'fechado';
    state.dominationFriend.turnsRemaining = 1;
    state.dominationFriend.hand = cards(['3'], '♣', 'hand');
    state.dominationFriend.discard = source === 'buried' ? cards(['4', '5'], '♣', 'private') : cards(['5'], '♣', 'private');
    state.dominationFriend.stock = cards(['4'], '♣', 'future');
    const result = friendTurn(state);
    assert.equal(result.steps[0].type, 'drawStock');
    assert.equal(result.steps.some(s => s.type === 'drawDiscard'), false);
  }
  const open = invite();
  open.variant = 'aberto';
  open.dominationFriend.turnsRemaining = 1;
  open.dominationFriend.hand = cards(['3'], '♣', 'hand');
  open.dominationFriend.discard = cards(['4', '5'], '♣', 'private');
  open.dominationFriend.stock = [];
  assert.equal(friendTurn(open).steps[0].type, 'drawDiscard');
});

test('canastra feita com lixo mantem bonus dos dois mas nao concede compra complementar', () => {
  for (const size of [0, 1, 3]) {
    const state = invite();
    state.variant = 'fechado';
    state.teams[1].melds = [rules.prepare(cards(['3', '4', '5', '6', '7', '8']))];
    state.dominationFriend.hand = [];
    state.dominationFriend.discard = cards(['9'], '♣', 'private');
    state.dominationFriend.stock = cards(Array(size).fill('K'), '♥', 'aux');
    const result = friendTurn(state);
    assert.deepEqual(result.steps.slice(0, 2).map(s => s.type), ['drawDiscard', 'meldExtend']);
    assert.equal(result.steps.filter(s => s.type === 'drawStock' && s.reason === 'canastra').flatMap(s => s.cards).length, Math.min(1, size));
    assert.equal(result.steps.filter(s => s.type === 'drawStock' && s.reason === 'turn').flatMap(s => s.cards).length, 0);
    assert.equal(result.steps.filter(s => s.type === 'dominatorBonus').flatMap(s => s.cards).length, 1);
    assert.equal(state.dominationFriend.extraTurns, 1);
    assert.equal(rules.classify(state.teams[1].melds[0]), 'limpa');
  }
});

test('fechado abre jogo com o topo, preserva limpos e ignora lixo sem vantagem', () => {
  const opening = invite();
  opening.variant = 'fechado';
  opening.dominationFriend.turnsRemaining = 1;
  opening.dominationFriend.hand = cards(['3', '4'], '♣', 'hand');
  opening.dominationFriend.discard = cards(['5'], '♣', 'private');
  opening.dominationFriend.stock = [];
  const result = friendTurn(opening);
  assert.deepEqual(result.steps.slice(0, 2).map(s => s.type), ['drawDiscard', 'meldNew']);
  for (const rank of ['JOKER', 'K']) {
    const state = invite();
    state.variant = 'fechado';
    state.teams[1].melds = [rules.prepare(cards(['3', '4', '5', '6']))];
    state.dominationFriend.hand = [];
    state.dominationFriend.discard = cards([rank], '♥', 'private');
    state.dominationFriend.stock = cards(['Q', 'Q'], '♦', 'aux');
    const before = structuredClone(state.teams);
    const result = friendTurn(state);
    assert.equal(result.steps.some(s => s.type === 'drawDiscard'), false);
    assert.equal(result.steps[0].cards.length, 2);
    assert.deepEqual(state.teams, before);
  }
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
  assert.equal(feed.dominationFriend.hand.length, 1);
  const state = invite();
  const real = rules.prepare(cards(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']));
  state.teams[1].melds = [real];
  state.dominationFriend.hand = cards(['A', 'JOKER'], '♣', 'friend-extra');
  state.dominationFriend.stock = [];
  const event = friendTurn(state);
  assert.equal(rules.classify(state.teams[1].melds[0]), 'asas');
  assert.equal(event.plays[0].meldIndex, 0);
  assert.equal(state.dominationFriend.hand.length, 0);
  assert.equal(state.dominationFriend.discard.length, 1);
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
    assert.equal(state.dominationFriend.hand.length, Math.max(0, expected - 1));
    assert.equal(state.dominationFriend.discard.length, expected ? 1 : 0);
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
    state.dominationFriend.hand = [...cards(['K'], '♠', 'discard-first'), ...hand];
    state.dominationFriend.stock = [];
    assert.equal(friendTurn(state).plays.length, 0);
    assert.deepEqual(state.dominationFriend.hand, hand);
    assert.deepEqual(state.teams[1].melds, [clean]);
    state.currentPlayer = 1;
    state.dominationFriend.hand.push(...cards(['K'], '♠', 'discard-second'));
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

test('canastra da amiga concede bonus a ambos, cada um usando seu proprio monte', () => {
  const cases = [
    [['3', '4', '5', '6', '7', '8'], '9', 'limpa', 1],
    [['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q'], 'K', 'real', 1],
    [['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], 'A', 'asas', 1],
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
    assert.deepEqual(state.stock, mainStock.slice(0, -bonus));
    assert.equal(state.players[1].hand.length, 1 + bonus);
    assert.deepEqual(state.players[1].hand.slice(1).map((card) => card.id), mainStock.slice(-bonus).reverse().map((card) => card.id));
    assert.equal(state.dominationFriend.extraTurns, 1);
    const restored = JSON.parse(JSON.stringify(state));
    assert.equal(executeDominationFriendTurn(restored, result.turnId, rules), null);
    assert.deepEqual(restored, state);
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
  assert.equal(state.dominationFriend.hand.length, 3);
  assert.equal(state.dominationFriend.discard.length, 1);
  assert.deepEqual(state.teams[1].melds, [clean, dirty]);
});

test('abertura prioriza sequencia natural e permite 2 coringa para canastra imediata', () => {
  const natural = invite();
  natural.dominationFriend.hand = [...cards(['3', '4', '5', '6'], '♣', 'guest'), ...cards(['2'], '♥', 'two')];
  natural.dominationFriend.stock = [];
  friendTurn(natural);
  assert.equal(natural.teams[1].melds[0].length, 4);
  assert.ok(natural.teams[1].melds[0].every((card) => !rules.isWild(card, natural.teams[1].melds[0])));
  assert.equal(natural.dominationFriend.discard[0].rank, '2');

  const scoring = invite();
  scoring.dominationFriend.hand = [...cards(['3', '4', '5', '7', '8', '9'], '♣', 'guest'), ...cards(['2'], '♥', 'two')];
  scoring.dominationFriend.stock = [];
  friendTurn(scoring);
  assert.equal(scoring.teams[1].melds[0].length, 7);
  assert.equal(rules.classify(scoring.teams[1].melds[0]), 'suja');
});

test('sobras da despedida nao entram no lixo comum nem penalizam o adversario', () => {
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
    state, dominationFeatureEnabled, grantDominationFriendExtraTurn, grantDominationFriendSharedBonus, ensureCardId() {}, packCard: (card) => ({ ...card }),
    sortHand() {}, showMessage() {},
  });
  vm.runInContext(`async ${appFunction('processDominationReward')}`, rewardContext);
  let previous = 'simple';
  for (const [kind, expected] of [['limpa', 4], ['real', 5], ['asas', 6]]) {
    const reward = await rewardContext.processDominationReward(state.players[1], previous, kind, 0);
    assert.equal(state.dominationFriend.turnsRemaining, expected);
    if (kind === 'limpa') assert.equal(reward.drawnCards.length, 1);
    else assert.equal(reward, null, 'evolucao do mesmo jogo no mesmo turno nao repete +1');
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

test('DevTools concede o mesmo bonus ao Dominador e a amiga fora do turno dela', async () => {
  for (const [kind, count] of [['limpa', 1], ['real', 1], ['asas', 1]]) {
    const state = invite();
    const before = structuredClone(state);
    const live = vm.createContext({
      state, window: {}, dominationFeatureEnabled, grantDominationFriendExtraTurn, grantDominationFriendSharedBonus,
      ensureMyTurn: () => true, currentTeam: () => state.teams[1], currentPlayer: () => state.players[1],
      optimizeMeld: context.optimizeMeld, normalizeMeldOrder: context.normalizeMeldOrder,
      classifyMeldForUi: context.classifyMeldForUi,
      ensureCardId() {}, packCard: (card) => ({ ...card }), sortHand() {}, showMessage() {},
      processBossMeldChange: async () => {}, showDebugBossDamageReaction() {},
      renderHand() {}, cardElById: () => null, renderAll() {}, commitState: async () => {},
      playDominationFriendSharedDraw: async () => {},
    });
    vm.runInContext(`async ${appFunction('processDominationReward')}`, live);
    vm.runInContext(app.slice(app.indexOf('window.debugMeld ='), app.indexOf('window.debugSetupDead =')), live);
    await live.window.debugMeld(kind);
    const friend = state.dominationFriend;
    assert.equal(state.players[1].hand.length, before.players[1].hand.length + count);
    assert.equal(state.stock.length, before.stock.length - count);
    assert.equal(friend.hand.length, before.dominationFriend.hand.length + count);
    assert.equal(friend.stock.length, before.dominationFriend.stock.length - count);
    assert.equal(friend.turnsRemaining, before.dominationFriend.turnsRemaining + 1);
    assert.equal(friend.pendingTurnId, null);
    assert.equal(friend.lastExecutedTurnId, null);
    const bonus = friend.events.find((event) => event.type === 'cardBonus');
    assert.equal(bonus.kind, kind);
    assert.equal(bonus.cards.length, count);
    assert.deepEqual(bonus.cards, before.dominationFriend.stock.slice(-count).reverse());
    live.state = JSON.parse(JSON.stringify(state));
    const saved = JSON.stringify(live.state);
    await live.processDominationReward(live.state.players[1], 'simple', kind, 0);
    assert.equal(JSON.stringify(live.state), saved, 'reload/repeticao nao concede outra compra');
  }
});

test('bonus compartilhado respeita diferenca por turno, adversario, saida e limite do auxiliar', async () => {
  const state = invite();
  const live = vm.createContext({
    state, dominationFeatureEnabled, grantDominationFriendExtraTurn, grantDominationFriendSharedBonus,
    ensureCardId() {}, packCard: (card) => ({ ...card }), sortHand() {}, showMessage() {},
  });
  vm.runInContext(`async ${appFunction('processDominationReward')}`, live);
  state.stock = cards(Array(20).fill('K'), '♥', 'rewards');
  let previous = 'simple';
  const initial = state.dominationFriend.hand.length;
  for (const [kind, delta] of [['limpa', 1], ['real', 1], ['asas', 1]]) {
    await live.processDominationReward(state.players[1], previous, kind, 0);
    assert.equal(state.dominationFriend.hand.length, initial + delta);
    previous = kind;
  }
  const friendBefore = JSON.stringify(state.dominationFriend);
  await live.processDominationReward(state.players[0], 'simple', 'real', 0);
  assert.equal(JSON.stringify(state.dominationFriend), friendBefore);
  assert.equal(grantDominationFriendSharedBonus(state, 'friend', 'real', 2, 1), null, 'bonus proprio nao duplica');
  state.dominationFriend.stock = cards(['7'], '♥', 'last-aux');
  const mainBefore = JSON.stringify(state.stock);
  const last = grantDominationFriendSharedBonus(state, 1, 'asas', 3, 1);
  assert.equal(last.cards.length, 1);
  assert.equal(JSON.stringify(state.stock), mainBefore, 'auxiliar vazio nao retira do monte principal');
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(grantDominationFriendSharedBonus(restored, 1, 'asas', 3, 1), null);
  restored.dominationFriend.active = false;
  assert.equal(grantDominationFriendSharedBonus(restored, 1, 'limpa', 1, 2), null);
  restored.dominationFriend.active = true;
  restored.mode = '2x2';
  const otherBefore = JSON.stringify(restored);
  assert.equal(grantDominationFriendSharedBonus(restored, 1, 'limpa', 1, 2), null);
  assert.equal(JSON.stringify(restored), otherBefore);
});

test('compra compartilhada anima nas duas telas uma vez, sem vinheta extra ou replay no reload', async () => {
  const state = invite();
  for (const count of [1, 2, 3]) {
    const clients = [createFriendNoticeTracker(), createFriendNoticeTracker()].map((tracker) => {
      tracker.collect(state);
      const flights = [];
      const presentations = new Map();
      const live = vm.createContext({
        state, window: { gameSessionId: 1 }, friendNoticeTracker: tracker, friendOperationPending: false,
        myPlayerIndex: 1, friendActionPresentations: presentations, renderDominationFriend() {},
        FRIEND_MP3: {}, friendSoundQueue: { enqueue() { assert.fail('compra nao deve entrar na fila de audio'); } },
        playRemoteAction: async (action) => flights.push(action),
        showDominationFriendNotice() { assert.fail('bonus de cartas nao e despedida'); },
      });
      vm.runInContext(`${appFunction('playDominationFriendSharedDraw')}\n${appFunction('syncDominationFriendNotices')}`, live);
      return { live, presentations, flights };
    });
    const kind = ['limpa', 'real', 'asas'][count - 1];
    grantDominationFriendSharedBonus(state, 1, kind, count, count);
    for (const { live, presentations, flights } of clients) {
      live.syncDominationFriendNotices();
      live.syncDominationFriendNotices();
      await Promise.all(presentations.values());
      assert.equal(flights.length, 1);
      assert.equal(flights[0].type, 'drawStock');
      assert.equal(flights[0].playerId, 'friend');
      assert.equal(flights[0].kind, kind);
      assert.equal(flights[0].cards.length, 1, 'valores legados 2/3 tambem ficam limitados a uma carta');
      live.friendNoticeTracker = createFriendNoticeTracker();
      live.state = JSON.parse(JSON.stringify(state));
      live.syncDominationFriendNotices();
      assert.equal(flights.length, 1);
    }
  }
});

test('canastra do Dominador inicia as duas compras juntas sem esperar audio e sem replay', async () => {
  const state = invite();
  const started = [];
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const friendBonus = grantDominationFriendSharedBonus(state, 1, 'limpa', 1, 0);
  const live = vm.createContext({
    state, window: { gameSessionId: 1 }, myPlayerIndex: 1,
    friendActionPresentations: new Map(), renderDominationFriend() {}, showMessage() {},
    document: { querySelector: () => ({}), getElementById: () => null }, getRect: (node) => node,
    opponentAnchorRect: (playerId) => ({ playerId }), impactAtRect() {},
    flyRectToRect: async (_card, _from, to) => { started.push(to.playerId); await gate; },
    friendSoundQueue: { enqueue() { assert.fail('voos nao aguardam sons'); } },
  });
  vm.runInContext(`${appFunction('playDominationFriendSharedDraw')}\nasync ${appFunction('playRemoteAction')}`, live);
  const playback = live.playRemoteAction({ type: 'drawDiscardFechado', playerId: 1,
    drawnCards: cards(['7'], '♣', 'bonus-owner'), friendBonus });
  try {
    await new Promise(setImmediate);
    assert.deepEqual(started, [1, 'friend'], 'ambos iniciam antes que qualquer voo termine');
    const duplicate = live.playDominationFriendSharedDraw(friendBonus);
    await new Promise(setImmediate);
    assert.equal(started.length, 2);
    release();
    await Promise.all([playback, duplicate]);
  } finally { release(); await playback; }
});

test('canastra da amiga compra para os dois em paralelo e cancelamento nao altera contadores', async () => {
  for (const cancel of [false, true]) {
    const view = invite();
    const initial = structuredClone(view);
    const friendCard = view.dominationFriend.stock.at(-1);
    const ownerCard = { ...view.stock.at(-1), _isEndgameSteal: false };
    let active = true;
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const started = [];
    const playback = playDominationFriendTimeline(view, { steps: [
      { type: 'drawStock', playerId: 'friend', reason: 'canastra', kind: 'limpa', cards: [friendCard] },
      { type: 'dominatorBonus', playerId: 1, kind: 'limpa', cards: [ownerCard] },
    ] }, {
      animate: async (step) => { started.push(step.playerId); await gate; },
      render() {}, isActive: () => active,
    });
    try {
      await new Promise(setImmediate);
      assert.deepEqual(started, ['friend', 1]);
      assert.deepEqual(view, initial, 'estado visual so muda apos o voo');
      if (cancel) active = false;
      release();
      await playback;
      if (cancel) assert.deepEqual(view, initial);
      else {
        assert.equal(view.dominationFriend.hand.length, initial.dominationFriend.hand.length + 1);
        assert.equal(view.players[1].hand.length, initial.players[1].hand.length + 1);
        assert.equal(view.stock.length, initial.stock.length - 1);
      }
    } finally { release(); await playback; }
  }
});

test('conquista da amiga na despedida prolonga presenca e persiste uma unica vez', () => {
  for (const [ranks, next, kind, bonus] of [
    [['3', '4', '5', '6', '7', '8'], '9', 'limpa', 1],
    [['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q'], 'K', 'real', 1],
    [['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], 'A', 'asas', 1],
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

test('sorteio de cinco turnos cresce alem de cinco com conquistas do Dominador e da amiga', async () => {
  const state = game();
  callDominationFriend(state, 1, createFriendInvitation('unlimited', () => 0.9), 0, rules);
  assert.equal(state.dominationFriend.turnsRemaining, 5);
  const human = vm.createContext({
    state, dominationFeatureEnabled, grantDominationFriendExtraTurn, grantDominationFriendSharedBonus, ensureCardId() {}, packCard: (card) => ({ ...card }),
    sortHand() {}, showMessage() {},
  });
  vm.runInContext(`async ${appFunction('processDominationReward')}`, human);
  state.teams[1].melds = [cards(['3', '4', '5', '6', '7', '8', '9'])];
  await human.processDominationReward(state.players[1], 'simple', rules.classify(state.teams[1].melds[0]), 0);
  assert.equal(state.dominationFriend.turnsRemaining, 6);
  state.dominationFriend.hand = [...cards(['3', '4', '5', '6', '7', '8', '9'], '♦', 'diamond'), ...cards(['3', '4', '5', '6', '7', '8', '9'], '♠', 'spade')];
  state.dominationFriend.stock = cards(['K', 'K', 'K', 'K'], '♥', 'aux');
  const result = friendTurn(state);
  assert.equal(result.plays.filter((play) => play.newKind === 'limpa').length, 2);
  assert.equal(state.dominationFriend.extraTurns, 3);
  assert.equal(state.dominationFriend.turnsRemaining, 7, '6 + 2 ganhos - 1 turno utilizado');
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(executeDominationFriendTurn(restored, result.turnId, rules), null);
  assert.equal(restored.dominationFriend.turnsRemaining, 7);
});

test('reta final depende do monte principal e de todos os mortos, nao encerra a presenca antecipadamente', () => {
  for (const [stockCount, hasDead, urgent] of [[5, false, true], [0, false, true], [6, false, false], [5, true, false]]) {
    const state = invite();
    state.stock = cards(Array(stockCount).fill('K'), '♥', 'main');
    state.deadPiles = [[], hasDead ? cards(['J'], '♥', 'dead') : []];
    state.dominationFriend.hand = [...cards(['9', '10'], '♦', 'pair'), ...cards(['JOKER', 'K'], '♥', 'guest')];
    state.dominationFriend.stock = [];
    const base = cards(['3', '4', '5', '6', '7', '8', '9']);
    state.teams[1].melds = [base];
    assert.equal(isDominationFriendEndgame(state), urgent);
    const before = structuredClone(base);
    const result = friendTurn(state);
    assert.equal(result.farewell, urgent);
    assert.equal(result.plays.length, urgent ? 1 : 0);
    assert.deepEqual(state.teams[1].melds[0], before);
    assert.equal(state.dominationFriend.active, true);
    assert.equal(state.dominationFriend.turnsRemaining, 2);
    assert.equal(result.departed, false);
  }
  assert.equal(isDominationFriendEndgame({ mode: '1x1', stock: [], deadPiles: [] }), false);
});

test('com varios turnos espera em vez de abrir fragmento duplicado do mesmo naipe', () => {
  for (const turns of [5, 3, 2, 1]) {
    const state = invite();
    const base = cards(['3', '4', '5', '6']);
    state.teams[1].melds = [base];
    state.dominationFriend.turnsRemaining = turns;
    state.dominationFriend.hand = cards(['3', '4', '5', '6'], '♣', 'duplicates');
    state.dominationFriend.stock = [];
    const before = structuredClone(base);
    const result = friendTurn(state);
    assert.deepEqual(state.teams[1].melds[0], before);
    assert.equal(result.plays.length, turns >= 3 ? 0 : 1);
  }
});

test('bonus animado mostra uma carta em qualquer categoria e atualiza contadores por voo', async () => {
  for (const [ranks, next, kind, count] of [
    [['3', '4', '5', '6', '7', '8'], '9', 'limpa', 1],
    [['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q'], 'K', 'real', 1],
    [['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], 'A', 'asas', 1],
  ]) {
    const state = invite();
    state.teams[1].melds = [rules.prepare(cards(ranks))];
    state.dominationFriend.hand = [];
    state.dominationFriend.stock = [...cards(Array(5).fill('K'), '♥', 'aux'), ...cards([next], '♣', 'next')];
    const view = structuredClone(state);
    const result = friendTurn(state);
    const flights = [];
    const stocks = [];
    await playDominationFriendTimeline(view, result, {
      animate: async (step) => {
        if (step.type !== 'drawStock') return;
        assert.equal(step.cards.length, 1);
        assert.ok(view.dominationFriend.stock.some((card) => card.id === step.cards[0].id));
        flights.push(step);
      },
      render: () => stocks.push(view.dominationFriend.stock.length), isActive: () => true,
    });
    const bonuses = flights.filter((step) => step.reason === 'canastra');
    assert.equal(bonuses.length, count);
    assert.ok(bonuses.every((step) => step.kind === kind && step.drawTotal === count));
    assert.deepEqual(bonuses.map((step) => step.drawIndex), Array.from({ length: count }, (_, i) => i));
    assert.deepEqual(stocks, [5, 4, 4, ...Array.from({ length: count }, (_, i) => [3 - i, 3 - i]).flat(), 4 - count]);
    assert.deepEqual(view.dominationFriend.hand, state.dominationFriend.hand);
    assert.deepEqual(view.dominationFriend.stock, state.dominationFriend.stock);
  }
});
