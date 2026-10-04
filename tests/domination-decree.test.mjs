import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  applyDominationDecree,
  canUseDominationDecree,
  dominationDecreeEnabled,
  dominationDecreeUsed,
  isDominationDiscardDecreeActive,
  shouldShowDominationDecreeDiscardLock,
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

test('partida nova no turno 0 não nasce com Decreto ativo', () => {
  const fresh = state({ turnNumber: 0, dominatorDecreeUsed: false, dominatorDiscardBlockTurn: null });
  assert.equal(isDominationDiscardDecreeActive(fresh, 0), false);
  assert.equal(shouldShowDominationDecreeDiscardLock(fresh, 0), false);
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

test('moldura do Decreto permanece até o turno do Escravo acabar por completo', () => {
  const s = state();
  assert.equal(applyDominationDecree(s, 1), true);
  assert.equal(shouldShowDominationDecreeDiscardLock(s, 0), true);
  s.hasDrawnThisTurn = true;
  assert.equal(isDominationDiscardDecreeActive(s, 0), false, 'a compra do Monte encerra só o bloqueio de compra');
  assert.equal(shouldShowDominationDecreeDiscardLock(s, 0), true, 'a moldura continua até a virada completa do turno');
  s.currentPlayer = 1;
  assert.equal(shouldShowDominationDecreeDiscardLock(s, 1), false);
  s.currentPlayer = 0;
  s.turnNumber = 8;
  assert.equal(shouldShowDominationDecreeDiscardLock(s, 0), false);
});

test('saves antigos migram sem ganhar um segundo poder', () => {
  assert.equal(dominationDecreeEnabled(state({ dominationOptions: { search: false } })), false);
  assert.equal(dominationDecreeEnabled(state({ dominationOptions: { search: true } })), true);
  assert.equal(dominationDecreeUsed(state({ dominatorSearchUsed: true })), true);
});

test('integração remove Busca da interface e bloqueia humano/BOT antes da coleta', async () => {
  const [app, index, friend, bot, worker, focus, dominationCss] = await Promise.all([
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../js/game/domination-friend.js', import.meta.url), 'utf8'),
    readFile(new URL('../bot.js', import.meta.url), 'utf8'),
    readFile(new URL('../service-worker.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/game/domination-vision-focus.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles/domination.css', import.meta.url), 'utf8'),
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
  const alertBlock = app.slice(app.indexOf('const updateDecreeAlert = createVisionAlert'), app.indexOf('function renderDominationVisionHint'));
  assert.match(alertBlock, /intro: presentDecreeFocus/);
  assert.doesNotMatch(alertBlock, /playDominationSearchSound/);

  const botReactionBlock = app.slice(app.indexOf('async function waitForDominationDecreeReaction'), app.indexOf('async function performDominationDevOperation'));
  assert.match(botReactionBlock, /presentDecreeFocus\(true\)/);
  assert.doesNotMatch(botReactionBlock, /playDominationSearchSound/);

  const decreeClickBlock = app.slice(app.indexOf('async function performDominationDecree'), app.indexOf('async function waitForDominationDecreeReaction'));
  const savedGuard = decreeClickBlock.indexOf('if (!saved)');
  const clickSound = decreeClickBlock.indexOf('playDominationSearchSound()', savedGuard);
  assert.ok(savedGuard >= 0 && clickSound > savedGuard, 'som do Decreto só deve tocar depois do clique ser confirmado');
  assert.match(decreeClickBlock, /presentDecreeFocus\(true\);\s*playDominationSearchSound\(\);/);
  assert.match(app, /const sound = playSfxClone\(sfxSearch, \{ audioContext: audioCtx \}\)/);
  assert.doesNotMatch(app, /window\.isClosingGame \|\| !sfxSearch\.paused/);
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

  assert.match(app, /DOMINATION_DECREE_LOCK_ASSET = 'assets\/images\/domination-decree-lock\.png'/);
  assert.match(app, /animateDominationDecreeLockToDiscard/);
  assert.match(app, /DOMINATION_DECREE_LOCK_TARGET_SCALE = 1\.6/);
  assert.match(app, /document\.querySelector\('#gameSection \.board-middle'\)/);
  const decreePresentationBlock = app.slice(app.indexOf('async function animateDominationDecreeLockToDiscard'), app.indexOf('function renderDominationVisionHint'));
  assert.match(decreePresentationBlock, /getRect\(target\)/);
  assert.match(decreePresentationBlock, /targetHeight = toRect\.height \* DOMINATION_DECREE_LOCK_TARGET_SCALE/);
  assert.match(decreePresentationBlock, /scale\(1\)'/);
  assert.doesNotMatch(decreePresentationBlock, /scale\(\.58\)/);
  assert.doesNotMatch(decreePresentationBlock, /settle: true/);
  assert.doesNotMatch(decreePresentationBlock, /rotate\(/);
  assert.match(app, /await lockPresentation/);
  const remoteDecreeBlock = app.slice(app.indexOf("if (a.type === 'dominationDecree')"), app.indexOf("if (a.type === 'dominationSearch')"));
  assert.match(remoteDecreeBlock, /animateDominationDecreeLockToDiscard\(\{ force: true, persist: false \}\)/);
  assert.match(dominationCss, /\.domination-decree-lock-frame/);
  assert.match(dominationCss, /transform:\s*translate\(-50%, -50%\)/);
  assert.match(worker, /\.\/assets\/images\/domination-decree-lock\.png/);

  const startGameBlock = app.slice(app.indexOf('async function startGame'), app.indexOf('function currentPlayer'));
  assert.match(startGameBlock, /dominatorDecreeUsed:\s*false/);
  assert.match(startGameBlock, /dominatorDiscardBlockTurn:\s*null/);
  const restartBlock = app.slice(app.indexOf('window.debugRestartGame = async'), app.indexOf('function replayDebugBossTerminalPresentation'));
  assert.match(restartBlock, /const restartedState = await startGame/);
  assert.match(restartBlock, /state = restartedState;\s*cancelGameAnimations\(\);\s*renderAll\(\);/);

  assert.match(worker, /CACHE_NAME = 'buraco-v264'/);
  assert.match(worker, /\.\/js\/game\/domination-decree\.js/);
  assert.doesNotMatch(worker, /\.\/js\/game\/domination-search\.js/);
});
