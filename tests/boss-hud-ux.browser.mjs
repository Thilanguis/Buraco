import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const source = await readFile(resolve(root, 'app.js'), 'utf8');
const index = await readFile(resolve(root, 'index.html'), 'utf8');
const markup = html => html.match(/<section id="bossHud"[\s\S]*?<\/section>(?=\s*<div id="bossDaughterStrip")/)[0].replace('style="display: none"', 'style="display: grid"');
const help = source.slice(source.indexOf('function closeBossIntentHelp('), source.indexOf('\nfunction createBossCombatHelp('));
const render = source.slice(source.indexOf('function createBossCombatHelp('), source.indexOf('\nfunction syncBossDiscardHelp('));
const styles = ['base-menu', 'game', 'cards', 'hud', 'responsive', 'boss-mode', 'boss/nemesis', 'boss/nehelenia'];
const fixture = `<!doctype html><meta charset="utf-8">
${styles.map(name => `<link rel="stylesheet" href="/styles/${name}.css">`).join('')}
<body class="boss-mode" data-boss-id="nemesis"><main style="padding:14px;max-width:1440px;margin:auto">${markup(index)}</main>
<script type="module">
import { getBossPhaseProgress } from '/js/boss/boss-engine.js';
${help}
${render}
const buildBossAbilityHelp = () => ({title:'Ajuda',text:'Objetivo'});
const renderBossHudRichText = (el, text) => el.textContent = text;
let state;
window.renderSample = (bossId = 'nemesis', ratio = 1, phase = 1) => {
  state = {boss:{id:bossId, hp:2200 * ratio, maxHp:2200, phase}, stock:Array(49), deadChunksTaken:[0]};
  document.body.dataset.bossId = bossId;
  const mirrors = document.getElementById('bossBloomFlowers');
  mirrors.innerHTML = bossId === 'nehelenia' ? Array.from({length:5}, (_, i) => '<i class="boss-dream-mirror-orb intact"><span class="boss-dream-mirror-glass"></span><b>'+(i+1)+'</b></i>').join('') : '';
  mirrors.style.display = bossId === 'nehelenia' ? 'flex' : 'none';
  document.getElementById('bossDangerMeter').querySelector('.boss-meter-track').hidden = bossId === 'nehelenia';
  document.getElementById('bossName').textContent = bossId.toUpperCase();
  document.getElementById('bossPhase').textContent = 'FASE ' + phase;
  document.getElementById('bossIntentName').textContent = 'Objetivo do turno';
  document.getElementById('bossIntentDescription').textContent = 'Cumpra o objetivo neste turno.';
  syncBossIntentHelp(state);
  renderBossPhaseAndHealth(state, getBossPhaseProgress(state));
};
window.renderSample();
</script>`;
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/fixture') { res.setHeader('Content-Type', 'text/html'); return res.end(fixture); }
    const file = resolve(root, `.${decodeURIComponent(path)}`);
    if (!file.startsWith(root)) throw new Error('outside root');
    res.setHeader('Content-Type', {'.css':'text/css','.js':'text/javascript','.png':'image/png'}[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  await mkdir(resolve(root, '.cache/boss-hud-ux'), {recursive:true});
  for (const viewport of [{width:1920,height:1080}, {width:1376,height:1032}, {width:1024,height:768}]) {
    const context = await browser.newContext({viewport, hasTouch: viewport.width < 1920});
    const page = await context.newPage();
    const errors = []; page.on('pageerror', err => errors.push(err.message));
    const url = `http://127.0.0.1:${server.address().port}`;
    await page.goto(url + '/fixture'); await page.waitForFunction(() => !!window.renderSample);
    const height = (await page.locator('#bossPhaseProgress').boundingBox()).height;
    // Measured pre-patch heights: 40.3 / 37.6 / 46.5px. Fixed budget avoids coupling to Git HEAD.
    assert.ok(height <= 34, `${viewport.width}: compact phase rail ${height} <= 34px`);
    assert.doesNotMatch(await page.locator('#bossPhaseProgress').innerText(), /ALVO|GATILHO|≤/);
    for (const id of ['banker', 'dominadora', 'matriarca_esmeralda', 'dimitrescu', 'nehelenia', 'nemesis']) {
      for (const [ratio, expected] of [[1,'normal'],[.51,'normal'],[.5,'tension'],[.26,'tension'],[.25,'danger'],[.1,'danger']]) {
        await page.evaluate(([id, ratio]) => window.renderSample(id, ratio), [id, ratio]);
        assert.equal(await page.locator('#bossHpBar').getAttribute('data-health'), expected);
        assert.equal(await page.locator('#bossHpText').innerText(), `${2200 * ratio} / 2200`);
        assert.ok(await page.locator('#bossHpText').isVisible());
      }
    }
    await page.evaluate(() => window.renderSample('nehelenia'));
    const flow = await page.locator('#bossHpBar').evaluate(el => {
      const current = getComputedStyle(el, '::after'), surface = getComputedStyle(el, '::before');
      return { size: current.backgroundSize, duration: current.animationDuration, surfaceAnimation: surface.animationName, filter: current.filter };
    });
    assert.equal(flow.size, '160px 100%', 'one small cell texture covers the vessel height');
    assert.equal(flow.surfaceAnimation, 'none', 'surface highlight stays static');
    assert.equal(flow.filter, 'none', 'no animated blur/filter cost');
    assert.equal(flow.duration, viewport.width === 1920 ? '14s' : '20s', 'touch uses a slower, compositor-only current');
    await page.locator('.boss-hp-meter').screenshot({path:resolve(root, `.cache/boss-hud-ux/vessel-${viewport.width}.png`)});
    const mirrorLayout = await page.evaluate(() => {
      const mirrors = document.getElementById('bossBloomFlowers').getBoundingClientRect();
      const phase = document.getElementById('bossPhaseProgress').getBoundingClientRect();
      const row = [...document.querySelectorAll('.boss-dream-mirror-orb')].map(el => el.getBoundingClientRect());
      return { end: mirrors.bottom, phase: phase.top, width: mirrors.width, available: document.getElementById('bossDangerMeter').getBoundingClientRect().width, spread: row.at(-1).right-row[0].left };
    });
    assert.ok(mirrorLayout.end <= mirrorLayout.phase, 'mirrors never overlap phase rail');
    assert.ok(mirrorLayout.spread >= mirrorLayout.width * .9, 'mirrors occupy the available width');
    assert.ok(mirrorLayout.width >= mirrorLayout.available * .95, 'mirror row fills the meter column');
    await page.screenshot({path:resolve(root, `.cache/boss-hud-ux/nehelenia-${viewport.width}.png`)});
    for (const ratio of [1, .5, .25]) {
      await page.evaluate(ratio => window.renderSample('nemesis', ratio), ratio);
      const background = await page.locator('#bossHpBar').evaluate(el => getComputedStyle(el).backgroundImage);
      if (ratio === .5) assert.match(background, /245, 187, 67/, 'Nemesis tension is visibly amber across the fill');
      if (ratio === .25) assert.match(background, /237, 24, 57/, 'Nemesis danger is vivid red');
      await page.screenshot({path:resolve(root, `.cache/boss-hud-ux/hud-${viewport.width}-hp-${ratio * 100}.png`)});
    }
    assert.ok(await page.locator('#bossPhase').isVisible());
    assert.ok(await page.locator('#bossRoundNumber').isVisible());
    const railBox = await page.locator('#bossPhaseProgress').boundingBox();
    const roundBox = await page.locator('#bossRoundSummary').boundingBox();
    assert.ok(railBox.y + railBox.height <= roundBox.y, 'phase rail must not overlap round');
    await page.evaluate(() => window.renderSample('nemesis', 0, 3));
    assert.equal(await page.locator('#bossHpBar').evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.evaluate(() => window.renderSample('nemesis', .85, 1));
    assert.equal(await page.locator('#bossPhaseProgressBar').evaluate(el => el.style.width), '50%');
    const button = page.locator('#bossPhaseHelpButton');
    if (viewport.width < 1920) await button.tap(); else { await button.focus(); await page.keyboard.press('Enter'); }
    const popover = page.locator('#bossIntentHelpPopover');
    assert.ok(await popover.isVisible());
    assert.match(await popover.innerText(), /70%[\s\S]*40 cartas[\s\S]*1 Morto[\s\S]*Basta uma dessas condições/);
    const box = await popover.boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height);
    const anchor = await button.boundingBox();
    assert.ok(Math.min(Math.abs(box.x - anchor.x - anchor.width), Math.abs(anchor.x - box.x - box.width)) <= 11, 'official help stays beside its trigger');
    await page.keyboard.press('Escape'); assert.equal(await popover.isVisible(), false);
    await button.click(); await page.mouse.click(viewport.width - 5, viewport.height - 5);
    assert.equal(await popover.isVisible(), false);
    await page.evaluate(() => window.renderSample('nemesis', .5, 2));
    await button.click(); assert.match(await popover.innerText(), /35%[\s\S]*18 cartas[\s\S]*2 Mortos?/);
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.renderSample('nemesis', .2, 3));
    assert.doesNotMatch(await page.locator('#bossPhaseProgress').innerText(), /MONTE|MORTO/);
    assert.equal(await page.locator('.boss-phase-progress-bar').isVisible(), false);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('#bossHpBar').evaluate(el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.locator('#bossHpBar').evaluate(el => getComputedStyle(el, '::after').animationName), 'none');
    await page.emulateMedia({reducedMotion:'no-preference'});
    assert.equal(await page.locator('#bossHpBar').evaluate(el => getComputedStyle(el, '::after').animationName), 'boss-hp-flow');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({path:resolve(root, `.cache/boss-hud-ux/hud-${viewport.width}.png`)});
    assert.deepEqual(errors, []);
    console.log(`${viewport.width}×${viewport.height}: phase ${height.toFixed(1)}px; six bosses, HP thresholds, help, touch/keyboard, reduced motion OK`);
    await context.close();
  }
  const mobile = await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
  await mobile.goto(`http://127.0.0.1:${server.address().port}/fixture`);
  await mobile.waitForFunction(() => !!window.renderSample);
  await mobile.evaluate(() => window.renderSample('dimitrescu', .8));
  assert.equal(await mobile.locator('#bossHpBar').evaluate(el => getComputedStyle(el, '::after').animationName), 'boss-hp-flow');
  const start = await mobile.locator('#bossHpBar').evaluate(el => getComputedStyle(el, '::after').transform);
  await mobile.waitForTimeout(350);
  assert.notEqual(await mobile.locator('#bossHpBar').evaluate(el => getComputedStyle(el, '::after').transform), start, 'blood actually flows on touch, not merely a static texture');
  await mobile.locator('.boss-hp-meter').screenshot({path:resolve(root, '.cache/boss-hud-ux/vessel-390.png')});
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await mobile.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await mobile.locator('#bossHpBar').evaluate(el => getComputedStyle(el, '::after').animationName), 'none');
  await mobile.close();
  console.log('390×844: lightweight vessel flow, clipping, viewport and reduced motion OK');
} finally { await browser?.close(); await new Promise(done => server.close(done)); }
