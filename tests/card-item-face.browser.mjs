import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const root=resolve('.'),app=await readFile('app.js','utf8');
const pack=app.slice(app.indexOf('function packCard('),app.indexOf('\nfunction ensureCardId('));
const fly=app.slice(app.indexOf('function makeFlyEl('),app.indexOf('\nfunction setBox('));
const base=(await readFile('index.html','utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('class="account-pending"','');
const html=base.replace('</body>',`<script type="module">
import {cardFrontHTML,suitClass,deckFaceClass} from '/js/game/card-face.js';
import {ITEM_DEFINITIONS} from '/js/boss/dimitrescu-castle.js';
const game=document.getElementById('gameSection');document.body.replaceChildren(game);game.style.display='flex';game.style.height='100vh';game.style.animation='none';
for(const el of game.children)if(!el.matches('.board'))el.style.display='none';
document.body.classList.add('boss-mode');document.body.dataset.bossId='dimitrescu';document.body.dataset.deckTheme='resident';document.body.dataset.tableTheme='dimitrescu';
const ensureCardId=()=>{};${pack}\n${fly}
window.faces={types:Object.keys(ITEM_DEFINITIONS),show(type){
  const card={id:'physical-'+type,rank:'7',suit:'♠',back:'red',castleItem:{type,consumed:false}};
  const hand=document.getElementById('handContainer');hand.replaceChildren();const c=document.createElement('div');c.className='carta spades deck-red';c.innerHTML=cardFrontHTML(card);hand.append(c);
  const received=JSON.parse(JSON.stringify(packCard(card)));
  const melds=document.getElementById('meldsP1');melds.innerHTML='<div class="meld-line"><div class="meld-line-cards"><div class="carta mini spades deck-red">'+cardFrontHTML(received)+'</div></div></div>';
  const discard=document.getElementById('discardFace');discard.innerHTML=cardFrontHTML(received);discard.className='discard-face spades deck-red';
  document.querySelectorAll('.fly-card').forEach(el=>el.remove());const flight=makeFlyEl(received,'front');flight.style.visibility='hidden';
  const hidden=makeFlyEl(received,'back');hidden.style.visibility='hidden';
  return {same:received.castleItem.type===type&&received.id===card.id,hiddenEmblems:hidden.querySelectorAll('.castle-item-overlay').length};
},consume(){document.getElementById('discardFace').innerHTML=cardFrontHTML({rank:'7',suit:'♠',castleItem:{type:'relic',consumed:true}});}};
</script></body>`);
await mkdir('.cache/card-item-face',{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});
try{for(const [width,height] of [[1024,768],[1376,1032],[1920,1080],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true});
  await page.route('http://faces.test/**',route=>new URL(route.request().url()).pathname==='/'?route.fulfill({contentType:'text/html',body:html}):route.fulfill({path:resolve(root,'.'+new URL(route.request().url()).pathname)}));
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://faces.test/');await page.waitForFunction(()=>window.faces);
  for(const type of await page.evaluate(()=>faces.types)){
    assert.deepEqual(await page.evaluate(type=>faces.show(type),type),{same:true,hiddenEmblems:0});
    for(const selector of ['#handContainer .castle-item-overlay','#meldsP1 .castle-item-overlay','#discardFace .castle-item-overlay']){
      const image=page.locator(selector);await image.evaluate(el=>el.decode());
      const info=await image.evaluate(el=>{const r=el.getBoundingClientRect(),card=el.parentElement.getBoundingClientRect(),style=getComputedStyle(el);return{src:el.getAttribute('src'),width:r.width,ratio:r.width/el.parentElement.clientWidth,inside:r.left>=card.left&&r.right<=card.right&&r.top>=card.top&&r.bottom<=card.bottom,pointer:style.pointerEvents,background:style.backgroundImage,title:el.title};});
      assert.ok(info.inside&&info.width>=14&&Math.abs(info.ratio-.64)<.02,JSON.stringify({width,type,selector,info}));
      assert.equal(info.pointer,'none');assert.ok(info.title);assert.match(info.background,/24, 46, 69/);
      assert.equal(await image.locator('..').locator('.card-rank').first().textContent(),'7');assert.equal(await image.locator('..').locator('.card-suit').first().textContent(),'♠');
    }
    await page.screenshot({path:resolve('.cache/card-item-face',type+'-'+width+'.png')});
  }
  await page.evaluate(()=>faces.consume());assert.equal(await page.locator('#discardFace .castle-item-overlay').count(),0);assert.deepEqual(errors,[]);
  console.log('Five item faces / hand-meld-discard-front flight / packed metadata / hidden back / consumed',width,'PASS');await page.close();
}}finally{await browser.close();}
