import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { DECK_THEME_IDS } from '../js/themes.js';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const start = app.indexOf('function renderHand()');
const renderSource = app.slice(start, app.indexOf('\n}', start) + 2);
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const styles = [...index.matchAll(/<link rel="stylesheet" href="(styles\/[^"]+)"/g)].map(m => m[1]);
const fixture = `<!doctype html><html><head>${styles.map(n=>`<link rel="stylesheet" href="/${n}">`).join('')}</head>
<body data-deck-theme="classico" data-table-theme="feltro"><main id="gameSection" style="display:block;padding-top:40px"><div id="handContainer" class="hand-container"><div class="cards-row"></div></div></main></body></html>`;
const server = createServer(async (req,res) => {
  try {
    if(req.url==='/fixture') {res.setHeader('Content-Type','text/html');return res.end(fixture);}
    const bytes=await readFile(new URL(`..${req.url}`,import.meta.url));
    res.setHeader('Content-Type',req.url.endsWith('.css')?'text/css':req.url.endsWith('.webp')?'image/webp':'text/javascript');res.end(bytes);
  } catch {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {
  for(const viewport of [{width:1200,height:800},{width:390,height:844}]) {
    const page=await browser.newPage({viewport});
    await page.goto(`http://127.0.0.1:${server.address().port}/fixture`);
    await page.evaluate(async source=>{
      const faces=await import('/js/game/card-face.js');
      Object.assign(window,faces,{
        state:{currentPlayer:0,players:[{id:0,hand:['A','10','Q','K','3','7'].map((rank,i)=>({id:`c${i}`,rank,suit:i%2?'♥':'♠',back:'red'}))}],boughtCardIds:['c1','c3']},
        myPlayerIndex:0, pendingStockCardIds:new Set(), selectedHandIndexes:new Set(),bossSwapReceivedHighlights:new Map(),
        ensureCardId:()=>{},getBossPendingChoice:()=>null,getBossCardEffect:()=>null,getBossCardBlockFeedback:()=>null,
        canPerformCommonGameAction:()=>true,renderMelds:()=>{},selectedMeldTarget:null,
      });
      window.renderHand=new Function(`${source};renderHand();`);
      renderHand();
    },renderSource);
    for(const theme of DECK_THEME_IDS) {
      await page.evaluate(theme=>{document.body.dataset.deckTheme=theme;selectedHandIndexes.clear();state.boughtCardIds=['c1','c3'];renderHand();},theme);
      const result=await page.evaluate(()=>{
        const card=document.querySelector('[data-card-id="c1"]');
        const marker=card.querySelector('.bought-card-marker');
        const badge=marker.firstElementChild;
        const r=badge.getBoundingClientRect();
        const next=card.nextElementSibling.getBoundingClientRect();
        const corners=[...card.querySelectorAll('.carta-canto')].map(e=>e.getBoundingClientRect());
        const overlaps=corners.some(c=>r.left<c.right&&r.right>c.left&&r.top<c.bottom&&r.bottom>c.top);
        marker.style.pointerEvents='auto';
        const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
        const visible=marker.contains(hit);
        marker.style.pointerEvents='';
        return {count:document.querySelectorAll('.bought-card-marker').length,text:badge.textContent,
          visible,overlaps,uncovered:r.right<=next.left,animation:getComputedStyle(card).animationName,
          z:+getComputedStyle(marker).zIndex,artZ:+getComputedStyle(card.querySelector('.lunar-card-art')).zIndex,
          color:getComputedStyle(badge).color,background:getComputedStyle(badge).backgroundColor,
          badgeRect:r.toJSON(),corners:corners.map(c=>c.toJSON())};
      });
      assert.equal(result.count,2,theme);assert.equal(result.text,'NOVA');
      assert.ok(result.visible&&result.uncovered,`${theme}: marker must remain visible in overlapping hand`);
      assert.equal(result.overlaps,false,`${theme}: marker must not obscure corner values ${JSON.stringify(result)}`);
      assert.equal(result.animation,'none');
      assert.equal(result.color,'rgb(255, 255, 255)');assert.equal(result.background,'rgb(8, 47, 73)');
      if(theme==='lunar') assert.ok(result.z>result.artZ);
      await page.locator('[data-card-id="c1"]').click();
      assert.equal(await page.locator('.selected.just-bought .bought-card-marker').count(),1,'clicks pass through marker and selection coexists');
      if(process.env.BOUGHT_SCREENSHOT_DIR && ['cassino','lunar'].includes(theme)) {
        await page.waitForLoadState('networkidle');
        await page.locator('#handContainer').screenshot({path:`${process.env.BOUGHT_SCREENSHOT_DIR}/bought-${theme}-${viewport.width}.png`});
      }
      await page.evaluate(()=>{state.boughtCardIds=[];renderHand();});
      assert.equal(await page.locator('.bought-card-marker').count(),0,'turn reset removes marker');
    }
    // Boss restrictions still take precedence, and spectator hands stay private.
    await page.evaluate(()=>{state.boughtCardIds=['c1'];getBossCardEffect=(_s,_p,id)=>id==='c1'?'locked':null;renderHand();});
    assert.equal(await page.locator('.bought-card-marker').count(),0);
    assert.equal(await page.locator('.boss-card-status-locked').count(),1);
    await page.evaluate(()=>{myPlayerIndex=-1;renderHand();});
    assert.equal(await page.locator('.bought-card-marker').count(),0);
    assert.equal(await page.locator('.carta.back').count(),6);
    console.log(`OK purchase marker, selection, reset, boss and spectator: 8 decks at ${viewport.width}px`);
    await page.close();
  }
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
