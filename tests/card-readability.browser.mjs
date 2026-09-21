import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const styles = [...index.matchAll(/<link rel="stylesheet" href="(styles\/[^"]+)"/g)].map(m => m[1]);
const fixture = `<!doctype html><html><head>${styles.map(n => `<link rel="stylesheet" href="/${n}">`).join('')}</head>
<body class="view-team0" data-deck-theme="classico" data-table-theme="feltro"><div id="gameSection" style="display:flex">
<div class="board" data-mode="1x1_dominacao">
<div id="opponentTop" class="opponent-hand opponent-hand-top"></div>
<div id="opponentLeft" class="opponent-hand opponent-hand-left"></div>
<div id="opponentRight" class="opponent-hand opponent-hand-right"></div>
<div class="board-center"><div class="board-melds">${[1,2].map(i => `<div class="grow"><div class="team-panel" id="teamPanel${i}"><div class="meld-title">${i === 1 ? 'Dominado' : 'Dominadora'}</div><div id="meldsP${i}" class="meld-container"></div></div></div>`).join('')}</div>
<div class="board-middle"><div class="pile-area" id="drawStockBtn"><div class="pile-card back-blue"></div><div class="pile-info">Monte (80)</div></div>
<div class="pile-area" id="drawDiscardBtn"><div class="pile-card discard-pile"><div id="discardFace" class="discard-face"></div></div><div class="pile-info">Lixo (3)</div></div></div></div>
<div class="player-interface"><div class="hand-container" id="handContainer"><div class="cards-row"></div></div></div>
</div></div></body></html>`;
const server = createServer(async (req,res) => {
  try {
    if (req.url === '/fixture') { res.setHeader('Content-Type','text/html'); return res.end(fixture); }
    const bytes = await readFile(new URL(`..${req.url}`,import.meta.url));
    res.setHeader('Content-Type',req.url.endsWith('.css') ? 'text/css' : req.url.endsWith('.webp') ? 'image/webp' : 'text/javascript');
    res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const browser = await chromium.launch({headless:true,channel:'msedge'});
try {
  for (const viewport of [{width:1440,height:900},{width:768,height:1024},{width:844,height:390}]) {
    const page = await browser.newPage({viewport});
    await page.goto(`http://127.0.0.1:${server.address().port}/fixture`);
    await page.evaluate(async () => {
      const { renderDominationFriend } = await import('/js/game/domination-friend-ui.js');
      const { cardFrontHTML } = await import('/js/game/card-face.js');
      const cards = Array.from({length:80},(_,i) => ({id:`c${i}`,rank:String(3+i%7),suit:'♠',back:'blue'}));
      const state = {mode:'1x1_dominacao',currentPlayer:0,turnNumber:12,stock:cards.slice(),deadPiles:[cards.slice(0,11)],
        dominationOptions:{friend:true,friendCapacity:2},
        dominationFriends:['left','right'].map((seat,i) => ({id:`friend${i}`,seat,name:i?'Nathalia':'Bruna',active:true,hand:cards.slice(i*12,i*12+12),turnsRemaining:5,events:[]})),
        dominationFriendShared:{stock:cards.slice(),discard:[cards[40]],rewardedMeldTiers:{},bonusIds:[]}};
      window.refresh = () => renderDominationFriend(state,0);
      window.fixtureState = state;
      const face = (card,mini=false) => `<div class="carta${mini?' mini':''}">${cardFrontHTML(card)}</div>`;
      document.querySelector('.cards-row').innerHTML = cards.slice(0,18).map(c=>face(c)).join('');
      document.getElementById('discardFace').innerHTML = cardFrontHTML(cards[1]);
      for (const id of ['meldsP1','meldsP2']) document.getElementById(id).innerHTML = Array.from({length:12},(_,i) => `<div class="meld-line"><div class="meld-line-cards">${cards.slice(0,3+i%5).map(c=>face(c,true)).join('')}</div></div>`).join('');
      refresh();
    });
    await page.waitForTimeout(200);
    const metrics = await page.evaluate(async () => {
      const dimensions = selector => { const css=getComputedStyle(document.querySelector(selector)); return [parseFloat(css.width),parseFloat(css.height)]; };
      const stack=document.querySelector('.friend-stock-stack');
      const layers=[...stack.children];
      const right=document.querySelector('#opponentRight .opponent-cards').firstChild;
      const meld=document.querySelector('.meld-line');
      const rect=()=> { const r=meld.getBoundingClientRect(); return [r.x,r.y,r.width,r.height]; };
      const before=rect();
      for(let i=0;i<10;i++) { fixtureState.dominationFriendShared.stock.pop(); refresh(); await new Promise(requestAnimationFrame); }
      return {hand:dimensions('.hand-container .carta'),meld:dimensions('.carta.mini'),pile:dimensions('.pile-card'),
        auxiliary:dimensions('#dominationFriendStock'),auxiliaryDiscard:dimensions('.friend-discard-face'),
        stableLayers:[...stack.children].every((node,i)=>node===layers[i]),stableRight:right===document.querySelector('#opponentRight .opponent-cards').firstChild,
        gap:getComputedStyle(meld).marginRight,lastMargin:getComputedStyle(meld.querySelector('.carta:last-child')).marginRight,
        before,after:rect(),overflow:document.documentElement.scrollWidth>innerWidth};
    });
    const small=viewport.width<=768||viewport.height<=600;
    const close=(actual,expected) => actual.forEach((value,i)=>assert.ok(Math.abs(value-expected[i])<.1,`${actual} != ${expected}`));
    close(metrics.hand,small?[50.4,74.4]:[72,108]);
    close(metrics.meld,small?[40.8,60]:[66,96]);
    close(metrics.pile,small?[48,69.6]:[66,96]);
    close(metrics.auxiliary,metrics.pile); close(metrics.auxiliaryDiscard,metrics.pile);
    assert.ok(metrics.stableLayers && metrics.stableRight);
    assert.deepEqual(metrics.after,metrics.before);
    assert.equal(metrics.gap,'8px'); assert.equal(metrics.lastMargin,'0px'); assert.equal(metrics.overflow,false);
    if(process.env.READABILITY_SCREENSHOT && !small) await page.screenshot({path:process.env.READABILITY_SCREENSHOT,fullPage:true});
    console.log(`OK enlarged cards + dense layout + stable friends ${viewport.width}x${viewport.height}`);
    await page.close();
  }
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
