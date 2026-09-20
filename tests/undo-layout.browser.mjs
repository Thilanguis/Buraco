import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const start = app.indexOf("  const undoBtn = document.getElementById('undoBtn');");
const code = app.slice(start, app.indexOf('  const powerBtn =', start));
const css = await Promise.all(['base-menu', 'game', 'table-themes', 'domination', 'cards', 'hud', 'responsive', 'effects', 'boss-mode'].map(name => readFile(new URL(`../styles/${name}.css`, import.meta.url), 'utf8')));
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  for (const [width, height] of [[1440, 900], [768, 1024], [390, 844], [844, 390]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent('<div id="gameSection"><div class="board" data-mode="1x1_dominacao"><div class="player-interface"><div class="player-actions"><button id="undoBtn">VOLTAR</button><button id="powerBtn">ROUBAR MÃO</button><button id="endGameBtn">X</button><button id="callFriendBtn">CHAMAR AMIGA</button></div></div></div></div>');
    for (const content of css) await page.addStyleTag({ content: content.replace(/@import\s+[^;]+;/g, '') });
    await page.evaluate(() => {
      document.getElementById('gameSection').style.display = 'flex';
      document.body.dataset.tableTheme = 'cassino';
      document.getAnimations().forEach(animation => { if (animation.effect.getTiming().iterations !== Infinity) animation.finish(); });
    });
    await page.evaluate(code => {
      window.updateUndo = (allowed, viewer = 1, finished = false) => {
        new Function('state', 'myPlayerIndex', 'isDominationFriendBusy', 'friendOperationPending', 'canRestoreUndoTransaction', 'localUndoStack', code)({ finished }, viewer, () => false, false, () => allowed, []);
      };
    }, code);
    for (const mode of ['1x1_dominacao', '1x1_duploMorto']) {
      await page.locator('.board').evaluate((el, mode) => { el.dataset.mode = mode; }, mode);
      const measure = () => page.locator('.player-actions button').evaluateAll(buttons => buttons.map(b => {
        const r = b.getBoundingClientRect(); return [r.x, r.y, r.width, r.height];
      }));
      await page.evaluate(() => window.updateUndo(false));
      const before = await measure();
      if (mode === '1x1_dominacao') {
        const axis = await page.locator('.player-actions').evaluate(el => { const r = el.getBoundingClientRect(); return r.x + r.width / 2; });
        assert.ok(Math.abs(before[2][0] + before[2][2] / 2 - axis) < 1, 'central X must align with table axis, not just stay stationary');
        assert.ok(Math.abs(before[1][2] - before[3][2]) < 1, 'main controls must balance around centre');
        assert.equal(before[2][2], before[2][3], 'close button must stay circular, not flattened');
        assert.equal(await page.locator('#endGameBtn').evaluate(el => getComputedStyle(el).borderRadius), '50%');
        for (let i = 0; i < before.length; i++) for (let j = i + 1; j < before.length; j++) {
          const a = before[i], b = before[j];
          assert.ok(a[0] + a[2] <= b[0] + 1 || b[0] + b[2] <= a[0] + 1 || a[1] + a[3] <= b[1] + 1 || b[1] + b[3] <= a[1] + 1, 'buttons must not overlap');
        }
      }
      assert.equal(await page.locator('#undoBtn').isDisabled(), true);
      assert.equal(await page.locator('#undoBtn').isVisible(), true);
      await page.evaluate(() => window.updateUndo(true));
      assert.deepEqual(await measure(), before);
      assert.equal(await page.locator('#undoBtn').isDisabled(), false);
      await page.evaluate(() => window.updateUndo(false));
      assert.deepEqual(await measure(), before);
      await page.evaluate(() => window.updateUndo(false, -1));
      assert.equal(await page.locator('#undoBtn').isVisible(), false);
      await page.evaluate(() => window.updateUndo(false, 1, true));
      assert.equal(await page.locator('#undoBtn').isVisible(), false);
    }
    console.log(`PASS ${width}x${height}: undo availability keeps control positions stable`);
    await page.close();
  }
} finally { await browser.close(); }
