import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { cardFrontHTML, lunarCardAsset } from '../js/game/card-face.js';
import { normalizeDeckTheme, normalizeTableTheme } from '../js/themes.js';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const cards = ['♠', '♥', '♣', '♦'].flatMap(suit => ranks.map(rank => ({ suit, rank })));
cards.push({ joker: true, back: 'red' }, { joker: true, back: 'blue' });
assert.equal(new Set(cards.map(lunarCardAsset)).size, 54);
assert.equal(lunarCardAsset({ rank: '../oops', suit: '♠' }), '');
assert.equal(normalizeDeckTheme('lunar'), 'lunar');
assert.equal(normalizeTableTheme('lunar'), 'lunar');
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
assert.equal((index.match(/<option value="lunar">/g) || []).length, 4);
const styles = ['base-menu', 'game', 'table-themes', 'domination', 'cards', 'hud', 'responsive', 'effects', 'boss-mode', 'lunar'];
const fixture = `<!doctype html><html><head>${styles.map(n => `<link rel="stylesheet" href="/styles/${n}.css">`).join('')}</head>
<body data-deck-theme="classico"><main id="gameSection" style="display:block;min-height:100vh;padding:30px">
<div style="display:flex;gap:20px;flex-wrap:wrap">${cards.map((c, i) => `<div id="card${i}" class="carta ${i % 2 ? 'mini' : ''}">${cardFrontHTML(c)}</div>`).join('')}</div>
<div style="display:flex;gap:20px;margin:30px">
${['back-red', 'back-blue', 'opponent-card-back', 'morto-card-back', 'carta mini back back-blue'].map(c => `<div class="sample-back ${c}" style="width:60px;height:90px"></div>`).join('')}
<div id="drawStockBtn"><div class="pile-card back-blue empty-pile"></div></div>
<div class="discard-face" style="width:60px;height:90px">${cardFrontHTML(cards[0])}</div></div></main></body></html>`;
const server = createServer(async (req, res) => {
  try {
    if (req.url === '/fixture') { res.setHeader('Content-Type', 'text/html'); return res.end(fixture); }
    const url = new URL(`..${req.url}`, import.meta.url);
    const bytes = await readFile(url);
    res.setHeader('Content-Type', req.url.endsWith('.css') ? 'text/css' : req.url.endsWith('.webp') ? 'image/webp' : 'text/javascript');
    res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }]) {
    const page = await browser.newPage({ viewport });
    const requested = [];
    page.on('request', r => { if (r.url().includes('/assets/lunar/')) requested.push(r.url()); });
    await page.goto(`http://127.0.0.1:${server.address().port}/fixture`);
    assert.equal(requested.length, 0, 'unselected image deck must not request images');
    const dimensions = () => page.locator('#card0').evaluate(e => [e.offsetWidth, e.offsetHeight]);
    const before = await dimensions();
    const semanticColors = () => page.locator('#gameSection').evaluate(e => {
      const css = getComputedStyle(e);
      return ['--table-panel-self-border', '--table-panel-rival-border', '--hud-danger'].map(name => css.getPropertyValue(name).trim());
    });
    const originalSemanticColors = await semanticColors();
    await page.evaluate(() => { document.body.dataset.deckTheme = 'lunar'; document.body.dataset.tableTheme = 'lunar'; });
    await page.waitForLoadState('networkidle');
    assert.deepEqual(await dimensions(), before);
    assert.deepEqual(await semanticColors(), originalSemanticColors, 'player identities and warnings remain unchanged');
    const palette = await page.locator('#gameSection').evaluate(e => {
      const css = getComputedStyle(e);
      return ['--hud-accent', '--hud-muted', '--table-pile-glow', '--dom-border-glow-boost', '--table-light-animation', '--table-flash-animation'].map(name => css.getPropertyValue(name).trim());
    });
    assert.deepEqual(palette, ['#f5ce83', '#b9bfd9', 'rgba(227, 164, 237, .14)', '.9', 'none', 'none']);
    const result = await page.evaluate(async () => {
      const arts = [...document.querySelectorAll('.lunar-card-art')];
      const sources = arts.map(e => getComputedStyle(e).backgroundImage.match(/url\("?(.*?)"?\)/)[1]);
      await Promise.all([...new Set(sources), ...['back-blue', 'back-red', 'table'].map(n => `/assets/lunar/${n}.webp`)].map(src => new Promise((resolve, reject) => {
        const image = new Image(); image.onload = () => resolve(); image.onerror = () => reject(new Error(`Missing image: ${src}`)); image.src = src;
      })));
      return {
        artVisible: arts.every(e => getComputedStyle(e).display === 'block'),
        textHidden: getComputedStyle(document.querySelector('.carta-canto')).opacity === '0',
        backs: [...document.querySelectorAll('.sample-back')].map(e => getComputedStyle(e).backgroundImage),
        empty: getComputedStyle(document.querySelector('.empty-pile')).backgroundImage,
        table: getComputedStyle(document.getElementById('gameSection')).backgroundImage,
      };
    });
    assert.ok(result.artVisible && result.textHidden);
    assert.match(result.backs[0], /back-red.webp/);
    assert.match(result.backs[1], /back-blue.webp/);
    assert.match(result.backs[4], /back-blue.webp/);
    assert.equal(result.empty, 'none');
    assert.match(result.table, /table.webp/);
    if (process.env.LUNAR_SCREENSHOT) await page.screenshot({ path: process.env.LUNAR_SCREENSHOT, fullPage: true });
    await page.evaluate(() => { document.body.dataset.deckTheme = 'classico'; });
    assert.equal(await page.locator('.lunar-card-art').first().evaluate(e => getComputedStyle(e).display), 'none');
    assert.deepEqual(await dimensions(), before);
    await page.evaluate(() => { document.body.dataset.tableTheme = 'feltro'; });
    assert.equal(await page.locator('#gameSection').evaluate(e => getComputedStyle(e).getPropertyValue('--hud-accent').trim()), '#4ade80', 'other table palettes remain independent');
    await page.close();
  }
  console.log('Lunar: 54 faces + 2 backs + table decode; theme switching, empty stock and geometry pass on desktop/tablet.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
