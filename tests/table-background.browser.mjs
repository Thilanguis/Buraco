// Isolated presentation fixture: no game or automated match is started.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  await page.route('**/*', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/fit.js') return route.fulfill({ contentType: 'text/javascript', body: await readFile(new URL('../js/game/table-background.js', import.meta.url)) });
    if (/^\/(lunar|wwe|resident)\.webp$/.test(pathname)) return route.fulfill({ contentType: 'image/webp', body: await readFile(new URL(`../assets/${pathname.slice(1, -5)}/table.webp`, import.meta.url)) });
    return route.fulfill({ contentType: 'text/html', body: `<style>${(await readFile(new URL('../styles/resident.css', import.meta.url), 'utf8')).split('.resident-card-art')[0]}body{margin:0}#gameSection{position:relative;overflow:hidden;width:100vw;height:100vh;background:linear-gradient(black,green)}${['lunar','wwe','resident'].map(theme => `body[data-table-theme='${theme}'] #gameSection{background:url('/${theme}.webp') center/cover no-repeat}`).join('')}</style><body><div id="gameSection"></div><script type="module" src="/fit.js"></script></body>` });
  });
  await page.goto('http://background.test/');
  for (const theme of ['lunar', 'wwe', 'resident']) {
    await page.evaluate(theme => { document.body.dataset.tableTheme = theme; }, theme);
    for (const [width, height] of [[1920, 900], [1366, 768], [844, 390], [768, 1024]]) {
      await page.setViewportSize({ width, height });
      await page.waitForFunction(theme => theme === 'resident' ? document.querySelector('.table-preserved-art') : document.querySelector('#gameSection').style.backgroundSize.includes('px'), theme);
      // Allow ResizeObserver and pending image callbacks to settle.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const result = await page.evaluate(async theme => {
        const image = new Image(); image.src = `/${theme}.webp`; await image.decode();
        const size = theme === 'resident' ? document.querySelector('.table-preserved-art').style.getPropertyValue('--preserved-size') : document.querySelector('#gameSection').style.backgroundSize;
        return { iw: image.naturalWidth, ih: image.naturalHeight, size: size.trim().split(' ').map(parseFloat) };
      }, theme);
      const cover = Math.max(width / result.iw, height / result.ih);
      if (theme === 'resident') {
        const contain = Math.min(width / result.iw, height / result.ih);
        const scale = cover / contain <= 1.04 ? cover : contain;
        assert.ok(Math.abs(result.size[0] - result.iw * scale) < .02);
        assert.ok(Math.abs(result.size[1] - result.ih * scale) < .02);
        assert.ok(Math.abs(result.size[0] / result.size[1] - result.iw / result.ih) < .001, 'no distortion');
        if (process.env.TABLE_ART_PREVIEW && width === 1920) await page.screenshot({ path: process.env.TABLE_ART_PREVIEW });
        continue;
      }
      assert.ok(result.size[0] >= width && result.size[1] >= height, 'no empty bands');
      assert.ok(Math.abs(result.size[0] - Math.max(width, result.iw * cover * .85)) < .02);
      assert.ok(Math.abs(result.size[1] - Math.max(height, result.ih * cover * .85)) < .02);
    }
  }
  await page.evaluate(() => { document.body.dataset.tableTheme = 'feltro'; });
  await page.waitForFunction(() => document.querySelector('#gameSection').style.backgroundSize === '');
  assert.equal(await page.locator('.table-preserved-art').count(), 0);
  console.log('PASS: 3 image themes × 4 viewports; reduced cropping, bounded compression, full coverage, reset on gradient theme.');
} finally { await browser.close(); }
