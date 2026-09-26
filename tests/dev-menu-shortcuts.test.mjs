import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createVersionTapGesture, validDevToolsClaims } from '../js/game/devtools-access.js';
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

test('both domination test seats force capacity two without changing normal games', async () => {
  const source = app.slice(app.indexOf('  window.debugInstantStart = async'), app.indexOf('  let bossDebugLabModulePromise'));
  for (const seat of [0, 1]) {
    const elements = new Map();
    const context = { window: { location: 'http://localhost/', history: { replaceState() {} }, updateMenuDynamic() {} },
      document: { getElementById: id => { if (!elements.has(id)) elements.set(id, {}); return elements.get(id); } },
      getBossDefinitionForMode: () => null, normalizeVariantForMode: (_mode, variant) => variant,
      readDominationMenuOptions: () => ({ friend: false, friendCapacity: 0, vision: false }),
      syncDominationMenuOptions: options => { context.synced = options; },
      startGame: async (...args) => args, URL, myPlayerIndex: 0, gameId: 'test', localStorage: { setItem() {} } };
    vm.runInNewContext(source, context);
    const args = await context.window.debugInstantStart('1x1_dominacao', seat);
    assert.equal(args[4].friendCapacity, 2);
    assert.equal(args[4].friend, true);
    assert.equal(args[4].vision, false);
    assert.equal(context.myPlayerIndex, seat);
    assert.equal(context.synced.friendCapacity, 2);
    assert.equal((await context.window.debugInstantStart('1x1', seat))[4], undefined);
  }
});

test('roulette presentation is visible for dominator and slave, once per invitation', async () => {
  const source = app.slice(app.indexOf('function playFriendInvitationPresentation('), app.indexOf('async function playFriendTurnPresentation('));
  for (const seat of [0, 1]) {
    let presentations = 0;
    const context = { myPlayerIndex: seat, state: { mode: '1x1_dominacao', friendGameId: 'match' },
      window: { gameSessionId: 1 }, friendPlayback: null, friendActionPresentations: new Map(),
      structuredClone, AbortController, stopTurnTimer() {}, renderAll() {},
      flyRectToRect() {}, impactAtRect() {}, getRect() {},
      presentDominationFriend: async (_friends, active) => { assert.equal(active(), true); presentations++; } };
    vm.runInNewContext(source, context);
    const friends = [{ id: 'friend-1', callId: 'call' }];
    await context.playFriendInvitationPresentation(friends);
    await context.playFriendInvitationPresentation(friends);
    assert.equal(presentations, 1);
  }
});

test('exit DevTools is attached outside menu/game screens and removes debug URL access', () => {
  const source = app.slice(app.indexOf('  if (!isLocalDevelopment) {'), app.indexOf('  window.toggleDebugPanel(true);', app.indexOf('  const exitDevTools')));
  const button = { style: {}, addEventListener: (_event, callback) => { button.click = callback; } };
  const authSource = readFileSync(new URL('../js/game/devtools-auth.js', import.meta.url), 'utf8');
  const leaveSource = authSource.slice(authSource.indexOf('export async function leaveDevTools()'), authSource.indexOf('export function installDevToolsAccessUI()')).replace('export ', '');
  const context = { isLocalDevelopment: false, URL, ready: Promise.resolve(), auth: {}, signOut: async () => {}, document: { createElement: () => button, body: { append: element => assert.equal(element, button) } },
    sessionStorage: { setItem: (key, value) => { context.saved = [key, value]; } },
    window: { location: { href: 'https://example.test/?game=test&debug=1', replace: url => { context.destination = url; } } } };
  context.location = context.window.location;
  vm.runInNewContext(leaveSource + source, context);
  return button.click().then(() => {
    assert.equal(new URL(context.destination).searchParams.has('debug'), false);
    assert.equal(new URL(context.destination).searchParams.get('game'), 'test');
    assert.equal(context.saved[1], '1');
  });
});

test('local development never loads production auth, and X only minimizes the panel', async () => {
  const source = app.slice(app.indexOf('const isLocalDevelopment ='), app.indexOf('window.debugSetTableTheme ='));
  const elements = { debugPanel: { style: {} }, debugMiniBtn: { style: {} } };
  const context = { isDebugMode: false, window: { location: { hostname: 'localhost' } }, document: { getElementById: id => elements[id] } };
  await vm.runInNewContext(`(async () => { ${source} })()`, context);
  assert.equal(context.isDebugMode, true);
  context.window.toggleDebugPanel(false);
  assert.equal(elements.debugPanel.style.display, 'none');
  assert.equal(elements.debugMiniBtn.style.display, 'block');
  assert.equal(context.isDebugMode, true);
  context.window.toggleDebugPanel(true);
  assert.equal(elements.debugPanel.style.display, 'flex');
});

test('local name is above the action row, not in the top HUD', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal((html.match(/id="localPlayerLabel"/g) || []).length, 1);
  assert.ok(html.indexOf('id="localPlayerLabel"') > html.indexOf('class="player-interface"'));
  assert.ok(html.indexOf('id="localPlayerLabel"') < html.indexOf('class="player-actions"'));
});

test('unlock requires seven taps within five seconds and resets after activation', () => {
  let time = 0, opened = 0;
  const tap = createVersionTapGesture({ now: () => time, onUnlock: () => opened++ });
  for (let i = 0; i < 6; i++) tap();
  assert.equal(opened, 0);
  time = 5001;
  tap();
  assert.equal(opened, 0);
  for (let i = 0; i < 6; i++) { time += 100; tap(); }
  assert.equal(opened, 1);
  tap();
  assert.equal(opened, 1);
});

test('production access fails closed for absent, forged flag-only or expired claims', () => {
  assert.equal(validDevToolsClaims(null, 100), false);
  assert.equal(validDevToolsClaims({ devtools: true }, 100), false);
  assert.equal(validDevToolsClaims({ devtools: true, devtoolsUntil: 100 }, 100), false);
  assert.equal(validDevToolsClaims({ devtools: 'true', devtoolsUntil: 200 }, 100), false);
  assert.equal(validDevToolsClaims({ devtools: true, devtoolsUntil: 200 }, 100), true);
});
