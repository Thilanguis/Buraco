// Offline layout fixture only: no app scripts, Firebase or simulated match.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { cardFrontHTML } from '../js/game/card-face.js';
import { DECK_THEME_IDS } from '../js/themes.js';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = new URL('../', import.meta.url);
const html = (await readFile(new URL('index.html', root), 'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const touch of [false, true]) {
    const page = await browser.newPage({ hasTouch: touch });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'http://layout.test') return route.abort();
      if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: html });
      if (!/^\/(styles|assets)\/[\w/.-]+$/.test(url.pathname)) return route.abort();
      try {
        await route.fulfill({ body: await readFile(new URL(url.pathname.slice(1), root)),
          contentType: url.pathname.endsWith('.css') ? 'text/css' : 'image/webp' });
      } catch { await route.abort(); }
    });
    await page.goto('http://layout.test/');
    await page.evaluate(() => {
      const game = document.querySelector('#gameSection');
      document.body.replaceChildren(game);
      Object.assign(document.body.style, { margin: '0', height: '100vh' });
      Object.assign(game.style, { display: 'flex', height: '100vh', animation: 'none' });
      for (const child of game.children) if (!child.matches('.board')) child.style.display = 'none';
      const label = document.querySelector('#localPlayerLabel');
      label.textContent = 'Biel (23)'; label.style.display = 'block';
      document.querySelector('#currentPlayerLabel').textContent = 'SUA VEZ (23)';
      document.querySelector('#message').textContent = 'Cartas adicionadas!';
      for (const id of ['undoBtn', 'powerBtn', 'callFriendBtn', 'seekCardBtn']) {
        const button = document.getElementById(id); button.hidden = false; button.style.display = '';
      }
    });
    for (const [width, height] of [[2544,1256], [1366,768], [1024,768], [768,1024], [844,390], [390,844]]) {
      await page.setViewportSize({ width, height });
      for (const theme of DECK_THEME_IDS) {
        for (const mode of ['1x1_dominacao', '2x2']) {
          await page.evaluate(({ theme, mode, faces }) => {
            document.body.dataset.deckTheme = theme;
            document.body.dataset.tableTheme = theme;
            document.querySelector('.board').dataset.mode = mode;
            document.querySelector('.cards-row').innerHTML = faces;
            document.querySelector('#meldsP1').innerHTML = `<div class="meld-line"><div class="meld-line-cards">${faces.replaceAll('class="carta"', 'class="carta mini"')}</div><div class="meld-meta">Jogo</div></div>`;
          }, { theme, mode, faces: Array.from({ length: 23 }, (_, i) => `<div class="carta">${cardFrontHTML({ rank: ['3','4','5','Q','K'][i % 5], suit: '♠' })}</div>`).join('') });
          const result = await page.evaluate(() => {
            const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
            const buttons = [...document.querySelectorAll('.player-actions button')].filter(b => b.getBoundingClientRect().width);
            const hand = document.querySelector('#handContainer');
            hand.scrollLeft = hand.scrollWidth;
            return { card: rect('.cards-row .carta'), last: rect('.cards-row .carta:last-child'),
              hand: rect('#handContainer'), actions: rect('.player-actions'),
              stock: rect('#drawStockBtn .pile-card'), discard: rect('#drawDiscardBtn .pile-card'),
              meld: rect('#meldsP1 .carta'), meldRow: rect('#meldsP1 .meld-line-cards'),
              labelInHud: !!document.querySelector('.board-status #localPlayerLabel'),
              buttons: buttons.map(b => b.getBoundingClientRect().toJSON()), overflow: document.documentElement.scrollWidth };
          });
          const key = `${touch}/${width}/${theme}/${mode}`;
          assert.ok(result.labelInHud, key);
          assert.ok(result.actions.bottom <= result.hand.top + 1, `actions above hand: ${key}`);
          assert.ok(result.last.right <= width + 1 && result.last.bottom <= height + 1, `last card reachable: ${key}`);
          assert.ok(result.overflow <= width + 1, `no page overflow: ${key}`);
          const small = width <= 768 || height <= 600;
          const scale = 1.2;
          for (const [rect, baseWidth, baseHeight] of [
            [result.card, small ? 50.4 : 72, small ? 74.4 : 108],
            [result.stock, small ? 48 : 66, small ? 69.6 : 96],
            [result.discard, small ? 48 : 66, small ? 69.6 : 96],
            [result.meld, small ? 40.8 : 66, small ? 60 : 96],
          ]) {
            assert.ok(Math.abs(rect.width - baseWidth * scale) < 1, `uniform width scale: ${key}`);
            assert.ok(Math.abs(rect.height - baseHeight * scale) < 1, `uniform height scale: ${key}`);
          }
          assert.ok(result.meldRow.height >= result.meld.height, `meld row accommodates larger cards: ${key}`);
          for (const b of result.buttons) assert.ok(b.height >= (touch ? 40 : 28) && b.left >= 0 && b.right <= width + 1, `button fits: ${key} ${JSON.stringify(b)}`);
          for (let i = 0; i < result.buttons.length; i++) for (let j = i + 1; j < result.buttons.length; j++) {
            const a = result.buttons[i], b = result.buttons[j];
            assert.ok(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top, `buttons don't overlap: ${key}`);
          }
          if (process.env.HAND_PREVIEW && !touch && width === 1366 && theme === 'resident' && mode === '1x1_dominacao') {
            await page.screenshot({ path: process.env.HAND_PREVIEW });
          }
        }
      }
    }
    await page.close();
  }
  console.log(`PASS: compact hand, all ${DECK_THEME_IDS.length} decks × 6 viewports × 2 modes × mouse/touch; no gameplay launched.`);
} finally { await browser.close(); }
