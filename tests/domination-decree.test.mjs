import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  applyDominationDecree,
  canUseDominationDecree,
  dominationDecreeEnabled,
  dominationDecreeUsed,
  isDominationDiscardDecreeActive,
} from '../js/game/domination-decree.js';

function state(overrides = {}) {
  return {
    mode: '1x1_dominacao',
    dominationOptions: { decree: true },
    players: [{ id: 0, name: 'Escravo' }, { id: 1, name: 'Dominador' }],
    currentPlayer: 0,
    turnNumber: 7,
    hasDrawnThisTurn: false,
    discard: [{ id: 'd1', rank: '9', suit: '♣' }],
    finished: false,
    debugPaused: false,
    surrender: null,
    ...overrides,
  };
}

test('Monte Obrigatório só abre no turno do Escravo antes da compra e com Lixo', () => {
  assert.equal(canUseDominationDecree(state(), 1), true);
  assert.equal(canUseDominationDecree(state({ currentPlayer: 1 }), 1), false);
  assert.equal(canUseDominationDecree(state({ hasDrawnThisTurn: true }), 1), false);
  assert.equal(canUseDominationDecree(state({ discard: [] }), 1), false);
  assert.equal(canUseDominationDecree(state(), 0), false);
});

test('Decreto bloqueia só o turno atual e é 1x por partida', () => {
  const s = state();
  assert.equal(applyDominationDecree(s, 1), true);
  assert.equal(s.dominatorDecreeUsed, true);
  assert.equal(s.dominatorDiscardBlockTurn, 7);
  assert.equal(isDominationDiscardDecreeActive(s, 0), true);
  assert.equal(canUseDominationDecree(s, 1), false);
  s.turnNumber = 8;
  assert.equal(isDominationDiscardDecreeActive(s, 0), false);
});

test('saves antigos migram sem ganhar um segundo poder', () => {
  assert.equal(dominationDecreeEnabled(state({ dominationOptions: { search: false } })), false);
  assert.equal(dominationDecreeEnabled(state({ dominationOptions: { search: true } })), true);
  assert.equal(dominationDecreeUsed(state({ dominatorSearchUsed: true })), true);
});

test('integração remove Busca da interface e bloqueia humano/BOT antes da coleta', async () => {
  const [app, index, friend, bot, worker, focus] = await Promise.all([
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../js/game/domination-friend.js', import.meta.url), 'utf8'),
    readFile(new URL('../bot.js', import.meta.url), 'utf8'),
    readFile(new URL('../service-worker.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/game/domination-vision-focus.js', import.meta.url), 'utf8'),
  ]);

  assert.match(app, /domination-decree\.js/);
  assert.doesNotMatch(app, /chooseDominationSearchCard/);
  assert.match(app, /isDominationDiscardDecreeActive\(state, state\.currentPlayer\)/);
  assert.match(app, /waitForDominationDecreeReaction\(botIndex\)/);
  assert.match(app, /createVisionFocus\(document, window, 'decreeBtn'\)/);
  assert.match(app, /updateDecreeAlert/);
  assert.match(app, /lastAction\?\.type !== 'discard'/);
  assert.match(app, /Number\(lastAction\.playerId\) !== 1/);
  assert.match(app, /recalled: \(\) => false/);
  assert.match(app, /!canActivateDominationDecree\(state, 1\)/);
  assert.match(app, /show && !used && !slaveIsBot/);
  assert.match(app, /presentDecreeFocus\(true\);\s*playDominationSearchSound\(\);/);
  assert.match(app, /type: 'dominationDecree'/);
  assert.match(app, /\['friend', 'plus', 'vision', 'decree'\]/);

  assert.match(index, /id="dominationOption_decree"/);
  assert.match(index, /👑 Monte Obrigatório/);
  assert.match(index, /id="decreeBtn"/);
  assert.doesNotMatch(index, /🔎 Procurar carta/);
  assert.doesNotMatch(index, /id="cardSearchDialog"/);

  assert.match(friend, /const decree = options\?\.decree \?\? options\?\.search/);
  assert.match(friend, /decree: decree !== false/);

  const drawCall = bot.indexOf('const drawOk = usesClosedDiscard');
  const successMessage = bot.indexOf('puxou o Lixo!', drawCall);
  assert.ok(drawCall >= 0 && successMessage > drawCall, 'BOT só deve anunciar o Lixo depois da compra confirmada');

  assert.match(focus, /createVisionFocus\(doc = document, win = window, buttonId = 'powerBtn'\)/);
  assert.match(focus, /getElementById\(buttonId\)/);

  assert.match(worker, /CACHE_NAME = 'buraco-v258'/);
  assert.match(worker, /\.\/js\/game\/domination-decree\.js/);
  assert.doesNotMatch(worker, /\.\/js\/game\/domination-search\.js/);
});
