// Focused offline test of the fullscreen-to-button presentation, no Firebase.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const source = await readFile(new URL('../js/game/domination-vision-focus.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../styles/domination.css', import.meta.url), 'utf8');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.setContent('<style>body{margin:0;background:#25070a;color:white}#powerBtn{position:fixed;left:36%;bottom:100px;width:125px;height:36px;border-radius:20px;background:#261c0d;color:white;border:1px solid gold}</style><button id="powerBtn">ROUBAR MÃO</button>');
    await page.addStyleTag({ content: css });
    await page.evaluate(async source => {
      const module = await import(`data:text/javascript;base64,${btoa(source)}`);
      window.focusVision = module.createVisionFocus();
      window.focusVision(true);
      document.getAnimations().forEach(animation => animation.pause());
    }, source);
    const result = await page.evaluate(() => {
      const wash = document.querySelector('.vision-focus-frame');
      const animation = wash.getAnimations()[0];
      animation.currentTime = 224;
      const wide = wash.firstElementChild.getBoundingClientRect();
      animation.currentTime = 1064;
      wash.querySelectorAll('rect').forEach(rect => rect.getAnimations().forEach(a => { a.currentTime = 1064; }));
      const tight = wash.firstElementChild.getBoundingClientRect();
      const button = document.getElementById('powerBtn').getBoundingClientRect();
      return { wide: [wide.width, wide.height], tight: [tight.width, tight.height], button: [button.width, button.height],
        fill: wash.firstElementChild.getAttribute('fill'), background: getComputedStyle(wash).backgroundColor,
        radiusX: parseFloat(getComputedStyle(wash.firstElementChild).rx) * tight.width / Number(wash.firstElementChild.getAttribute('width')),
        radiusY: parseFloat(getComputedStyle(wash.firstElementChild).ry) * tight.height / Number(wash.firstElementChild.getAttribute('height')),
        dx: tight.x + tight.width / 2 - button.x - button.width / 2,
        dy: tight.y + tight.height / 2 - button.y - button.height / 2,
        hit: document.elementFromPoint(button.x + 20, button.y + 20).id };
    });
    assert.ok(result.wide[0] > viewport.width * .8);
    assert.ok(result.wide[1] > viewport.height * .8);
    assert.ok(Math.abs(result.tight[0] - result.button[0] - 16) < 1);
    assert.ok(Math.abs(result.tight[1] - result.button[1] - 16) < 1);
    assert.equal(result.fill, 'none');
    assert.ok(Math.abs(result.radiusX - (result.button[1] / 2 + 8)) < 1, 'arrival keeps button pill radius horizontally');
    assert.ok(Math.abs(result.radiusY - result.radiusX) < 1, 'arrival corners remain circular, not flattened');
    assert.equal(result.background, 'rgba(0, 0, 0, 0)');
    assert.ok(Math.abs(result.dx) < 1 && Math.abs(result.dy) < 1, 'light must converge on button');
    assert.equal(result.hit, 'powerBtn', 'overlay must not swallow clicks');
    assert.equal(await page.locator('.vision-focus-frame rect[fill="none"]').count(), 36);
    assert.equal(await page.locator('.vision-focus-frame filter').count(), 0);
    if (process.env.BURACO_VISUAL_OUTPUT) {
      await page.evaluate(() => { document.getAnimations().forEach(a => { a.currentTime = 1064; }); });
      await page.screenshot({ path: `${process.env.BURACO_VISUAL_OUTPUT}/vision-halo-${viewport.width}.png` });
    }
    await page.evaluate(() => window.focusVision(false));
    assert.equal(await page.locator('.vision-focus-overlay').count(), 0);
    await page.evaluate(() => { window.focusVision(true); window.focusVision(true); });
    assert.equal(await page.locator('.vision-focus-overlay').count(), 1);
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    assert.equal(await page.locator('.vision-focus-overlay').count(), 0);
    await page.evaluate(async () => {
      window.focusVision(true);
      const animation = document.querySelector('.vision-focus-frame').getAnimations()[0];
      animation.finish();
      await animation.finished;
    });
    assert.equal(await page.locator('.vision-focus-overlay').count(), 0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => window.focusVision(true));
    assert.equal(await page.locator('.vision-focus-overlay').count(), 0);
    console.log(`PASS ${viewport.width}x${viewport.height}: fullscreen, target, clicks, cleanup, reduced motion`);
    await page.close();
  }
} finally { await browser.close(); }
