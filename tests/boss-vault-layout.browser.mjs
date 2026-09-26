// Offline renderer fixture only: no Firebase, app initialization or gameplay.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { DECK_THEME_IDS } from '../js/themes.js';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = new URL('../', import.meta.url);
const app = await readFile(new URL('app.js', root), 'utf8');
const renderSource = app.slice(app.indexOf('function renderBossVaultSlot('), app.indexOf('function snapshotVisibleCardRects()'));
const index = await readFile(new URL('index.html', root), 'utf8');
const styles = [...index.matchAll(/<link rel="stylesheet" href="(styles\/[^"]+)"/g)].map(m => m[1]);
const html = `<!doctype html><html><head>${styles.map(s => `<link rel="stylesheet" href="/${s}">`).join('')}</head>
<body data-deck-theme="cassino" data-table-theme="findom"><main id="gameSection" style="display:block;padding:30px">
<div class="boss-vault-slot" id="local"></div><div class="boss-vault-slot boss-vault-opponent" id="remote" style="position:relative;right:auto;top:auto;transform:none;margin-top:25px"></div>
<div id="handContainer" class="hand-container"><div class="cards-row"></div></div></main></body></html>`;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://vault.test') return route.abort();
    if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: html });
    if (!/^\/(styles|assets|js)\/[\w/.-]+$/.test(url.pathname)) return route.abort();
    try {
      const ext = url.pathname.split('.').pop();
      await route.fulfill({ body: await readFile(new URL(url.pathname.slice(1), root)),
        contentType: { css: 'text/css', js: 'text/javascript', png: 'image/png', webp: 'image/webp' }[ext] || 'application/octet-stream' });
    } catch { await route.abort(); }
  });
  await page.goto('http://vault.test/');
  await page.evaluate(async source => {
    const faces = await import('/js/game/card-face.js');
    Object.assign(window, faces, {
      state: { currentPlayer: 0, hasDrawnThisTurn: true },
      locallyAnimatingBossVaultStates: new Map(), hasPendingBossChoices: () => false, isBossTurnActive: () => false,
      getBossVault: () => ({ card: { id: 'sample', rank: '7', suit: '♥', back: 'red' } }),
      getBossVaultQuote: () => ({ state: 'closed', baseDebt: 3, currentDebt: 3 }), reclaimLocalBossVault: () => {},
    });
    window.renderFixture = new Function(`${source};renderBossVaultSlot(document.getElementById('local'),{id:0,name:'Biel'},true);renderBossVaultSlot(document.getElementById('remote'),{id:1,name:'BOT Ana'},false);`);
    renderFixture();
    const face = faces.cardFrontHTML({ rank: '7', suit: '♥' });
    document.querySelector('.cards-row').innerHTML = `<div class="carta hearts just-bought">${face}<span class="bought-card-marker"><span>NOVA</span></span></div>`;
  }, renderSource);
  for (const [width, height] of [[1366,768],[1024,768],[768,1024],[844,390],[390,844]]) {
    await page.setViewportSize({ width, height });
    for (const theme of DECK_THEME_IDS) {
      const result = await page.evaluate(theme => {
        document.body.dataset.deckTheme = theme;
        const local = document.querySelector('#local .boss-vault-card');
        const remote = document.querySelector('#remote .boss-vault-card');
        renderFixture();
        const read = el => {
          const card = el.getBoundingClientRect(), frame = el.parentElement.getBoundingClientRect();
          return { width: card.width, height: card.height, inside: card.left >= frame.left && card.top >= frame.top && card.right <= frame.right && card.bottom <= frame.bottom };
        };
        const hand = document.querySelector('#handContainer .carta');
        const corner = getComputedStyle(hand.querySelector('.carta-canto'));
        const marker = getComputedStyle(hand.querySelector('.bought-card-marker'));
        return { local: read(local), remote: read(remote), stable: local === document.querySelector('#local .boss-vault-card') && remote === document.querySelector('#remote .boss-vault-card'),
          hidden: remote.classList.contains('back') && !remote.querySelector('.card-rank'),
          padding: corner.padding, markerInset: [marker.top, marker.left, marker.right, marker.bottom],
          handWidth: hand.getBoundingClientRect().width };
      }, theme);
      const key = `${theme}/${width}`;
      assert.deepEqual([result.local.width,result.local.height,result.remote.width,result.remote.height],[46,64,32,44],key);
      assert.ok(result.local.inside && result.remote.inside, `vault frame contains card: ${key}`);
      assert.ok(result.stable, `no DOM replacement on unchanged render: ${key}`);
      assert.ok(result.hidden, `other player's face stays private: ${key}`);
      assert.ok(Math.abs(result.handWidth - (width <= 768 || height <= 600 ? 60.48 : 86.4)) < 1, `hand remains enlarged: ${key}`);
      if (!['lunar','wwe','resident'].includes(theme)) assert.equal(result.padding,'3px',`small CSS inset: ${key}`);
      assert.deepEqual(result.markerInset,['0px','0px','0px','0px'],`new-card outline unchanged: ${key}`);
      if (process.env.VAULT_PREVIEW && width === 1366 && theme === 'cassino') await page.screenshot({ path: process.env.VAULT_PREVIEW });
    }
  }
  console.log(`PASS: vault sizes/privacy/render stability and rank padding; ${DECK_THEME_IDS.length} decks × 5 viewports; no gameplay launched.`);
} finally { await browser.close(); }
