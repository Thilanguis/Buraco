import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const start = app.indexOf('function renderMelds()');
const source = app.slice(start, app.indexOf('\n}', start) + 2);
const styles = await Promise.all(['base-menu', 'game', 'table-themes', 'domination', 'cards', 'hud', 'responsive', 'effects', 'card-readability'].map(name => readFile(new URL(`../styles/${name}.css`, import.meta.url), 'utf8')));
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  for (const [width, height, touch] of [[1440, 900, false], [768, 1024, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch });
    await page.setContent(`<div id="gameSection"><div class="board"><div class="board-melds">
      ${[1, 2].map(i => `<div class="grow"><div class="team-panel" id="teamPanel${i}"><div class="meld-title"></div><div class="meld-container" id="meldsP${i}"></div></div></div>`).join('')}
      </div></div></div>`);
    for (const css of styles) await page.addStyleTag({ content: css.replace(/@import\s+[^;]+;/g, '') });
    await page.evaluate(source => {
      const noop = () => {}, no = () => false;
      Object.assign(window, {
        state: { mode: '1x1_dominacao', currentPlayer: 1,
          players: [{ id: 0, teamId: 0, name: 'Human' }, { id: 1, teamId: 1, name: 'Bot' }],
          teams: [{ id: 0, name: 'Escravo', melds: [], score: 0 }, { id: 1, name: 'Dominador', score: 2700,
            melds: [[{ rank: '3', suit: 'C' }], [{ rank: '4', suit: 'C' }]] }] },
        myPlayerIndex: 0, selectedHandIndexes: new Set(), pendingDiscardChoice: null,
        discardChoiceIsCurrent: no, isDominationFriendBusy: no, isDominationFriendTurn: no,
        computeTeamMeldScore: team => ({ total: team.score }), dominationFeatureEnabled: no,
        optimizeMeld: noop, isBossMeldLocked: no, isBossMeldPossessed: no,
        isCurrentBossMode: no, classifyMeldForUi: () => ({ kind: 'simple', base: 'Jogo' }),
        suitClass: () => '', deckFaceClass: () => '', cardFrontHTML: card => card.rank,
        scheduleMatriarchGraftLinks: noop, getBossCardEffect: () => null,
        renderedBossMeldContributions: new Map(),
      });
      document.getElementById('gameSection').style.display = 'flex';
      window.render = new Function(source + ';renderMelds();');
      window.update = () => { window.lastScores = state.teams.map(t => t.score); render(); };
      update();
    }, source);
    const result = await page.evaluate(async () => {
      const badge = document.getElementById('statusDom2');
      const frame = badge.querySelector('.brasao-frame');
      const meld = document.querySelector('[data-meld-key="1:0"]');
      const other = document.querySelector('[data-meld-key="1:1"]');
      const clearance = document.createElement('span');
      clearance.className = 'friend-seat-clearance';
      document.getElementById('meldsP2').prepend(clearance);
      const panel = document.getElementById('teamPanel2').closest('.grow');
      const rect = () => { const r = panel.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
      const before = rect();
      const animations = document.getAnimations();
      for (let i = 0; i < 10; i++) { update(); await new Promise(requestAnimationFrame); }
      const stable = document.getElementById('statusDom2') === badge && badge.querySelector('.brasao-frame') === frame
        && document.querySelector('[data-meld-key="1:0"]') === meld && clearance.isConnected;
      const sameAnimations = animations.every(a => document.getAnimations().includes(a));
      const after = rect();
      state.teams[1].melds[1].push({ rank: '5', suit: 'C' });
      state.teams[1].score += 10; update();
      const incremental = document.querySelector('[data-meld-key="1:0"]') === meld
        && !other.isConnected && document.getElementById('statusDom2') === badge;
      state.teams[1].score = 3600; update();
      const evolves = document.getElementById('statusDom2') === badge && badge.dataset.level === '5'
        && badge.querySelector('.brasao-pontos').textContent === '+3600';
      state.teams[1].melds = []; update();
      const removed = !meld.isConnected && clearance.isConnected;
      state.teams[1].score = 0; update();
      return { stable, sameAnimations, before, after, incremental, evolves, removed,
        noBadge: !document.getElementById('statusDom2') };
    });
    assert.equal(result.stable, true);
    assert.equal(result.sameAnimations, true, 'unchanged renders must not restart effects');
    assert.deepEqual(result.after, result.before, 'layout must remain unchanged');
    for (const key of ['incremental', 'evolves', 'removed', 'noBadge']) assert.equal(result[key], true, key);
    console.log(`OK stable render ${width}x${height}, touch=${touch}`);
    await page.close();
  }
} finally { await browser.close(); }
