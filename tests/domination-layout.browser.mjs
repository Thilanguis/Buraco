// Focused, offline visual regression check. Never starts app.js/Firebase.
// Run with Playwright installed (or PLAYWRIGHT_PATH pointing to its package).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const html = (await readFile(resolve(root, 'index.html'), 'utf8'))
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<video\b[^>]*>[\s\S]*?<\/video>/gi, '');
const app = await readFile(resolve(root, 'app.js'), 'utf8');
const appFunction = name => {
  const start = app.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  return app.slice(start, app.indexOf('\n}', start) + 2);
};
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep) && path !== root.slice(0, -1)) {
      res.writeHead(403).end(); return;
    }
    const data = req.url === '/' ? html : await readFile(path);
    const type = req.url === '/' ? 'text/html' : { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' }[extname(path)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type }); res.end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
  for (const [width, height, touch] of [[3759, 1850, false], [1440, 1000, false], [1024, 768, true], [768, 1024, true], [390, 844, true], [844, 390, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.evaluate(async functions => {
      const ui = await import('/js/game/domination-friend-ui.js');
      const seats = await import('/js/game/opponent-seats.js');
      const engine = await import('/js/game/domination-friend.js');
      const card = i => ({ id: `card-${i}`, rank: String(3 + i % 7), suit: '♠', back: i % 2 ? 'red' : 'blue' });
      const hand = Array.from({ length: 11 }, (_, i) => card(i));
      const state = { mode: '1x1_dominacao', currentPlayer: 1, turnNumber: 1, stock: hand, deadPiles: [hand],
        players: [{ id: 0, name: 'Adversário', hand }, { id: 1, name: 'Dominador', hand: [...hand] }] };
      const deps = { state, myPlayerIndex: 1, ...seats, ...engine, isCurrentBossMode: () => false,
        activeMatriarchTargetPlayerIds: () => new Set(), renderBossVaultSlot: el => { el.style.display = 'none'; },
        dominationFeatureEnabled: () => true, syncMythicPhase: () => {}, ensureCardId: () => {},
        getBossPendingChoice: () => null, getBossCardEffect: () => null, getBossCardBlockFeedback: () => null,
        bossSwapReceivedHighlights: new Map(), selectedHandIndexes: new Set(), suitClass: () => 'black', deckFaceClass: () => '',
        cardFrontHTML: c => `<span>${c.rank} ${c.suit}</span>` };
      const renderers = new Function(...Object.keys(deps), `${functions}\nreturn {renderHand,renderOpponentHands,opponentAnchorRect};`)(...Object.values(deps));
      for (const id of ['loadingScreen', 'configSection', 'videoContainer']) document.getElementById(id)?.remove();
      document.getElementById('gameSection').style.display = 'flex';
      document.body.dataset.tableTheme = 'cassino';
      document.body.dataset.deckTheme = 'dominacao';
      document.getElementById('powerBtn').style.display = 'inline-block';
      document.querySelector('#drawStockBtn .pile-card-inner').className += ' back-blue';
      document.getElementById('discardFace').textContent = '7 ♠';
      document.getElementById('message').textContent = 'Partida iniciada!';
      // Dense melds expose side collisions, but use the real table/card CSS.
      for (const id of ['meldsP1', 'meldsP2']) document.getElementById(id).innerHTML = Array.from({length: 6}, () =>
        `<div class="meld-line"><div class="meld-line-cards">${hand.slice(0, 7).map(c => `<div class="carta mini">${c.rank} ♠</div>`).join('')}</div><div class="meld-meta">Canastra limpa</div></div>`).join('');
      const render = () => { renderers.renderOpponentHands(); renderers.renderHand(); ui.renderDominationFriend(state, 1); };
      window.fixture = { state, render, ...renderers, ui, engine, hand, card };
      render();
      // Finish only the intro transition so screenshots compare settled play.
      for (const animation of document.getElementById('gameSection').getAnimations()) {
        if (animation.animationName === 'smoothTableReveal') animation.finish();
      }
    }, ['renderHand', 'renderOpponentHands', 'seatForPlayer', 'opponentAnchorRect', 'getOpponentAnchorRectById', 'fallbackSeatRect'].map(appFunction).join('\n'));
    const measure = () => page.evaluate(() => Object.fromEntries(['#opponentTop', '.board-center', '.board-melds', '.board-middle', '#handContainer', '#drawStockBtn', '#drawDiscardBtn', '.player-actions'].map(selector => {
      const el = document.querySelector(selector), r = el.getBoundingClientRect(), css = getComputedStyle(el);
      return [selector, [r.x, r.y, r.width, r.height, css.paddingLeft, css.paddingRight]];
    })));
    const before = await measure();
    const assertAxis = async () => {
      const after = await measure();
      for (const selector of Object.keys(before)) {
        assert.equal(after[selector][0], before[selector][0], `${selector} moved sideways`);
        assert.equal(after[selector][2], before[selector][2], `${selector} changed width`);
      }
      assert.deepEqual(after['#opponentTop'], before['#opponentTop']);
    };
    assert.ok(before['.board-melds'][2] >= width * .85, 'melds must use the useful width, not a fixed central cap');
    assert.ok(Math.abs(before['#opponentTop'][0] + before['#opponentTop'][2] / 2 - width / 2) < 1, 'opponent remains centered above');
    assert.equal(await page.locator('#opponentLeft > *, #dominationFriendStock, #dominationFriendDiscard, #dominationFriendSpotlight, .friend-seat-clearance').count(), 0);
    await page.evaluate(() => {
      const f = window.fixture;
      f.state.friendUsed = true;
      f.state.dominationFriends = [{ id: 'visual', name: 'Nathalia', active: true, hand: [...f.hand], stock: Array.from({ length: 97 }, (_, i) => f.card(i + 20)), discard: [f.card(200)], turnsRemaining: 4, extraTurns: 1, seat: 'left' }];
      f.state.dominationFriendShared = { stock: f.state.dominationFriends[0].stock, discard: f.state.dominationFriends[0].discard };
      f.render();
    });
    await assertAxis();
    await page.waitForSelector('#dominationFriendSpotlight.is-playing');
    assert.equal(await page.locator('#dominationFriendSpotlight').getAttribute('data-source'), 'drawStockBtn', 'normal turn lights the main stock while guests are present');
    assert.equal(await page.locator('#dominationFriendDiscard .carta-canto').count(), 2, 'private discard uses the normal card face');
    await page.evaluate(() => { fixture.state.dominationFriends[0].pendingTurnId = 'turn'; fixture.render(); });
    await page.waitForSelector('#dominationFriendSpotlight.is-playing');
    assert.equal(await page.locator('#dominationFriendSpotlight').getAttribute('data-source'), 'dominationFriendStock');
    await assertAxis();
    const checks = await page.evaluate(() => {
      const beam = document.querySelector('#dominationFriendSpotlight path');
      const friend = document.getElementById('opponentLeft');
      const auxiliary = document.getElementById('dominationFriendStock');
      return { parent: auxiliary.parentElement.className, position: getComputedStyle(auxiliary).position, animation: getComputedStyle(beam).animationName,
        filter: getComputedStyle(beam).filter, anchor: fixture.opponentAnchorRect('friend'),
        cards: friend.querySelector('.opponent-cards').getBoundingClientRect().toJSON(),
        seat: friend.getBoundingClientRect().toJSON(), melds: document.querySelector('.board-melds').getBoundingClientRect().toJSON(),
        board: document.querySelector('.board').getBoundingClientRect().toJSON() };
    });
    assert.equal(checks.parent, 'board-middle');
    assert.equal(checks.position, 'relative');
    const rows = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
      return { auxiliary: rect('#dominationFriendStock'), privateDiscard: rect('#dominationFriendDiscard'),
        main: rect('#drawStockBtn'), discard: rect('#drawDiscardBtn'), melds: rect('.board-melds'),
        middle: rect('.board-middle'), parent: document.getElementById('dominationFriendDiscard').parentElement.className };
    });
    assert.equal(rows.parent, 'board-middle');
    assert.ok(Math.abs(rows.auxiliary.x + rows.auxiliary.width / 2 - rows.main.x - rows.main.width / 2) < 1);
    assert.ok(Math.abs(rows.privateDiscard.x + rows.privateDiscard.width / 2 - rows.discard.x - rows.discard.width / 2) < 1);
    assert.equal(rows.auxiliary.y, rows.privateDiscard.y);
    assert.ok(rows.auxiliary.bottom + 25 <= rows.main.top, 'labels need room between rows');
    assert.equal(await page.evaluate(() => {
      const stock = document.querySelector('#dominationFriendStock small');
      const trash = document.querySelector('#dominationFriendDiscard small');
      const a = stock.getBoundingClientRect(), b = trash.getBoundingClientRect();
      const main = document.getElementById('drawStockBtn').getBoundingClientRect();
      const valid = getComputedStyle(stock).whiteSpace === 'nowrap' && getComputedStyle(trash).whiteSpace === 'nowrap'
        && a.right < b.left && Math.max(a.bottom, b.bottom) + 20 < main.top;
      return valid || { stock: a.toJSON(), trash: b.toJSON(), main: main.toJSON() };
    }), true, 'single-line captions must not collide with each other or the main stack');
    assert.ok(rows.melds.bottom <= rows.middle.top, 'growing melds must precede all piles in flow');
    assert.ok(rows.middle.height > before['.board-middle'][3] + 80, 'guest row must reserve real vertical room');
    assert.equal(checks.filter, 'none');
    assert.equal(checks.animation, touch ? 'none' : 'friend-stock-spotlight');
    assert.ok(checks.anchor.left >= checks.cards.left - 20 && checks.anchor.left <= checks.cards.right);
    assert.equal(await page.evaluate(() => {
      const seat = document.getElementById('opponentLeft').getBoundingClientRect();
      return [...document.querySelectorAll('.meld-line-cards')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.right > seat.left && r.left < seat.right && r.bottom > seat.top && r.top < seat.bottom;
      }).length;
    }), 0, `meld cards overlap guest ${width}x${height}`);
    if (process.env.BURACO_VISUAL_OUTPUT) await page.screenshot({ path: resolve(process.env.BURACO_VISUAL_OUTPUT, `friend-${width}x${height}.png`) });
    // Stable rerenders must not rebuild the beam or keep mutating its geometry.
    assert.equal(await page.evaluate(async () => {
      const beam = document.querySelector('#dominationFriendSpotlight path');
      let writes = 0;
      const observer = new MutationObserver(records => { writes += records.length; });
      observer.observe(beam, { attributes: true });
      fixture.render(); fixture.render(); fixture.render();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      observer.disconnect(); return writes;
    }), 0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('#dominationFriendSpotlight path').evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // The stock and fan remain connected while counters/turn state change.
    assert.equal(await page.evaluate(() => {
      const card = document.querySelector('#opponentLeft .opponent-card-back');
      const stock = document.querySelector('#dominationFriendStock .friend-stock-stack');
      fixture.state.dominationFriends[0].extraTurns++;
      fixture.render();
      return card === document.querySelector('#opponentLeft .opponent-card-back')
        && stock === document.querySelector('#dominationFriendStock .friend-stock-stack');
    }), true);
    await page.evaluate(() => { fixture.state.dominationFriends[0].pendingTurnId = null; fixture.render(); });
    assert.equal(await page.locator('#dominationFriendSpotlight').getAttribute('data-source'), 'drawStockBtn');
    await page.evaluate(() => { fixture.state.dominationFriends[0].active = false; fixture.render(); });
    assert.deepEqual(await measure(), before, `departure moved center ${width}x${height}`);
    assert.equal(await page.locator('#opponentLeft > *').count(), 0);
    assert.equal(await page.locator('.friend-seat-clearance').count(), 0, 'no exclusion survives departure');
    assert.equal(await page.locator('#opponentTop .opponent-cards').count(), 1);
    assert.equal(await page.locator('#opponentRight > *').count(), 0);
    // Vision stays with the original, centered opponent.
    await page.evaluate(() => {
      window.isStealModeActive = true;
      fixture.state.powerActiveThisTurn = true;
      fixture.renderOpponentHands();
    });
    assert.equal(await page.locator('#opponentTop.reveal-mode .carta').count(), 11);
    assert.equal(await page.locator('#opponentTop').evaluate(el => getComputedStyle(el).pointerEvents), 'auto');
    await page.evaluate(() => { window.isStealModeActive = false; fixture.renderOpponentHands(); });
    // A stationary mouse over rerendered cards must not lift the next card.
    const firstCard = page.locator('#handContainer .carta').first();
    await firstCard.scrollIntoViewIfNeeded();
    const cardRect = await firstCard.boundingBox();
    const margin = await firstCard.evaluate(el => getComputedStyle(el).marginRight);
    if (!touch) {
      await page.mouse.move(cardRect.x + 5, cardRect.y + 30);
      await page.waitForTimeout(300);
      assert.notEqual(await firstCard.evaluate(el => getComputedStyle(el).transform), 'none');
      assert.equal(await firstCard.evaluate(el => getComputedStyle(el).marginRight), margin);
    }
    await page.evaluate(() => { fixture.state.players[1].hand.shift(); fixture.renderHand(); });
    await page.waitForTimeout(300);
    assert.equal(await firstCard.evaluate(el => getComputedStyle(el).transform), 'none');
    if (touch) {
      // Touch pointer movement cannot re-enable PC-only hover.
      await firstCard.dispatchEvent('pointermove', { pointerType: 'touch', movementX: 5 });
      assert.equal(await page.locator('#handContainer.hand-hover-reset').count(), 1);
    }
    // Two independent temporary seats, one pair of piles and the same axis.
    await page.evaluate(() => {
      const f = fixture;
      f.state.dominationOptions = { friendCapacity: 2 };
      f.state.dominationFriends[0].active = true;
      f.state.dominationFriends[0].pendingTurnId = 'first-turn';
      f.state.dominationFriends.push({ id: 'second', name: 'Bruna', seat: 'right', active: true,
        hand: f.hand.map((card, i) => ({ ...card, id: `second-${i}` })), turnsRemaining: 3, pendingTurnId: 'second-turn' });
      f.sharedStack = document.getElementById('dominationFriendStock');
      f.render();
    });
    await assertAxis();
    assert.equal(await page.locator('.domination-friend-seat').count(), 2);
    assert.equal(await page.locator('#dominationFriendStock').count(), 1);
    assert.equal(await page.locator('#dominationFriendDiscard').count(), 1);
    assert.equal(await page.locator('#opponentLeft.active-turn-glow').count(), 1);
    await page.evaluate(() => { fixture.state.dominationFriends[0].pendingTurnId = null; fixture.render(); });
    assert.equal(await page.locator('#opponentRight.active-turn-glow').count(), 1);
    assert.equal(await page.locator('#opponentLeft.active-turn-glow').count(), 0);
    assert.match(await page.locator('#opponentRight .friend-seat-status').textContent(), /JOGANDO/);
    assert.equal(await page.evaluate(() => {
      const right = document.getElementById('opponentRight').getBoundingClientRect();
      const anchor = fixture.opponentAnchorRect('friend', 'second');
      const center = anchor.left + anchor.width / 2;
      return center >= right.left && center <= right.right;
    }), true, 'second friend flights use her own seat');
    await page.evaluate(() => {
      fixture.sharedStack = document.getElementById('dominationFriendStock');
      fixture.state.dominationFriends[0].active = false;
      fixture.render();
    });
    await assertAxis();
    assert.equal(await page.locator('#opponentLeft > *').count(), 0);
    assert.equal(await page.locator('#opponentRight .opponent-card-back').count(), 11);
    assert.equal(await page.evaluate(() => fixture.sharedStack === document.getElementById('dominationFriendStock')), true);
    await page.evaluate(() => { fixture.state.dominationFriends[1].active = false; fixture.render(); });
    assert.equal(await page.locator('#dominationFriendStock, #dominationFriendDiscard, #dominationFriendSpotlight, .friend-seat-clearance').count(), 0);
    // Dense games grow above the piles; both rows stay reachable by scrolling.
    await page.evaluate(async () => {
      fixture.state.dominationFriends[0].active = true;
      fixture.state.dominationFriends[0].pendingTurnId = 'dense';
      fixture.state.dominationFriends[1].active = true;
      fixture.state.dominationFriends[1].pendingTurnId = null;
      for (const container of document.querySelectorAll('.meld-container')) {
        const sample = container.querySelector('.meld-line');
        for (let i = 0; i < 24; i++) container.append(sample.cloneNode(true));
      }
      fixture.render();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      // Wait for the local seat clearance to settle as rows pass the seat.
      for (let pass = 0; pass < 4; pass++) {
        for (const selector of ['.board-center', '.board']) {
          const element = document.querySelector(selector);
          element.scrollTop = element.scrollHeight;
        }
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }
    });
    const dense = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
      return { melds: rect('.board-melds'), middle: rect('.board-middle'), main: rect('#drawStockBtn'),
        auxiliary: rect('#dominationFriendStock'), controls: rect('.player-interface'), center: rect('.board-center'),
        scroll: [...document.querySelectorAll('.board, .board-center')].map(el => [el.scrollTop, el.scrollHeight, el.clientHeight, getComputedStyle(el).overflowY]) };
    });
    assert.ok(dense.melds.bottom <= dense.middle.top, 'dense melds must not cover piles');
    assert.ok(dense.auxiliary.top >= 0 && dense.main.bottom <= dense.controls.top, `piles hidden by hand ${width}x${height}: ${JSON.stringify(dense)}`);
    // Switching to real four-player games must reclaim the guest's seat.
    await page.evaluate(() => {
      fixture.state.dominationFriends[0].active = true;
      fixture.state.dominationFriends[0].pendingTurnId = 'turn';
      fixture.render();
      fixture.state.mode = '2x2';
      fixture.state.players.push({ id: 2, name: 'P3', hand: [...fixture.hand] }, { id: 3, name: 'P4', hand: [...fixture.hand] });
      fixture.render();
    });
    assert.equal(await page.locator('#dominationFriendSpotlight, #dominationFriendStock, #dominationFriendDiscard, .friend-seat-status, .friend-seat-clearance').count(), 0);
    for (const id of ['opponentRight', 'opponentTop', 'opponentLeft']) {
      assert.equal(await page.locator(`#${id} .opponent-card-back`).count(), 11);
    }
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}x${height}: center stable, shared seat/anchors, spotlight, hover`);
    await context.close();
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
