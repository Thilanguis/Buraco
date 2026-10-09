import assert from 'node:assert/strict';
import { readFile,mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve,extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const root=fileURLToPath(new URL('..',import.meta.url));
const source=await readFile(resolve(root,'app.js'),'utf8'),index=await readFile(resolve(root,'index.html'),'utf8');
const markup=index.match(/<section id="bossHud"[\s\S]*?<\/section>(?=\s*<div id="bossDaughterStrip")/)[0].replace('style="display: none"','style="display: grid"');
const help=source.slice(source.indexOf('function closeBossIntentHelp('),source.indexOf('\nfunction createBossCombatHelp('));
const render=source.slice(source.indexOf('function createBossCombatHelp('),source.indexOf('\nfunction syncBossDiscardHelp('));
const ranges=source.slice(source.indexOf('function renderBossRangeMeters('),source.indexOf('\nconst BOSS_GUIDE_CORE'));
const fixture=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${['base-menu','game','cards','hud','responsive','boss-mode','boss/matriarch'].map(n=>`<link rel="stylesheet" href="/styles/${n}.css">`).join('')}
<body class="boss-mode" data-boss-id="matriarca_esmeralda"><main style="padding:14px">${markup}</main><script type="module">
import {buildBossDebugScenario} from '/js/boss/boss-debug-scenarios.js';
import {beginBossTurn,advanceBossTurn,getBossPhaseProgress} from '/js/boss/boss-engine.js';
import {buildBossActionPresentation,buildBossAbilityHelp} from '/js/boss/boss-presentation.js';
import {matriarchBloomFlowersHTML} from '/js/boss/ui/matriarch-bloom-view.js';
${help}\n${render}\n${ranges}
const renderBossHudRichText=(el,text)=>el.textContent=text;
let state;
window.sample=(fed,bloom=0)=>{
 state=buildBossDebugScenario(null,{bossId:'matriarca_esmeralda',abilityId:'graft',phase:2,variant:'interactive',target:'auto'}).state;
 beginBossTurn(state,{first:true,now:1000,debug:true});
 for(let i=0;i<20&&state.boss.bossFlow.stage!=='players';i++)advanceBossTurn(state,state.boss.bossFlow.endsAt+1);
 const t=state.boss.natureThreats.find(t=>t.type==='graft');t.fedMeldIds=t.meldIds.slice(0,fed);
 const action=buildBossActionPresentation(state);
 document.getElementById('bossName').textContent='A MATRIARCA ESMERALDA';
 document.querySelector('#bossHud .boss-portrait img').src='assets/images/boss-elfa.png';
 document.getElementById('bossDangerLabel').textContent='FLORESCIMENTO';
 document.getElementById('bossIntentName').textContent='Enxerto';
 document.getElementById('bossIntentDescription').textContent=action.instruction;
 renderBossRangeMeters(document.getElementById('bossIntentDescription'),action.rangeMeters);
 const flowers=document.getElementById('bossBloomFlowers');flowers.style.display='flex';flowers.innerHTML=matriarchBloomFlowersHTML({bloom});
 document.getElementById('bossDebtText').textContent=bloom+' / 5';
 renderBossPhaseAndHealth(state,getBossPhaseProgress(state));syncBossIntentHelp(state);
};window.sample(0);</script>`;
const server=createServer(async(req,res)=>{try {
 const path=new URL(req.url,'http://localhost').pathname;if(path==='/fixture'){res.setHeader('Content-Type','text/html');return res.end(fixture);}
 const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root))throw Error('outside root');
 res.setHeader('Content-Type',{'.js':'text/javascript','.css':'text/css','.png':'image/png'}[extname(file)]||'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});await mkdir(resolve(root,'.cache/hud-polish'),{recursive:true});
 for(const width of [1920,1376,390]){
  const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<1920}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/fixture');await page.waitForFunction(()=>window.sample);
  for(let fed=0;fed<=2;fed++){
   await page.evaluate(x=>window.sample(x,2),fed);
   const bar=page.locator('#bossRangeMeters [role="progressbar"]');assert.equal(await bar.getAttribute('aria-valuenow'),String(fed));
   assert.equal(await page.locator('.boss-range-meter-fill').evaluate(el=>el.style.width),fed*50+'%');
   assert.equal(await page.locator('.boss-lotus-flower img').count(),5);assert.equal(await page.locator('.boss-lotus-flower.open').count(),2);
  }
  assert.ok(await page.locator('.boss-lotus-flower img').evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0)));
  const filters=await page.locator('.boss-lotus-flower img').evaluateAll(imgs=>imgs.map(img=>getComputedStyle(img).filter));assert.equal(filters[0],'none');assert.match(filters[2],/grayscale/);
  const button=page.locator('#bossIntentHelpButton');if(width<1920)await button.tap();else await button.click();
  assert.match(await page.locator('#bossIntentHelpText').innerText(),/Dois jogos.*Só um.*50 HP/s);await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  const flowerLayout=await page.locator('#bossBloomFlowers').evaluate(el=>({row:el.getBoundingClientRect().toJSON(),flowers:[...el.children].map(f=>f.getBoundingClientRect().toJSON()),phase:document.getElementById('bossPhaseProgress').getBoundingClientRect().toJSON()}));
  assert.ok(flowerLayout.flowers[0].width>=39,'Flowers should be larger than the old 32px icons');
  assert.ok(flowerLayout.flowers.at(-1).right>=flowerLayout.row.right-7,'Flowers should span the available row');
  assert.ok(flowerLayout.flowers.every(f=>f.bottom<=flowerLayout.phase.top),'Flowers must not overlap phase progress');
  await page.screenshot({path:resolve(root,'.cache/hud-polish/matriarch-'+width+'.png'),fullPage:true});
  const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,
    nodes:[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(el=>[el.tagName,el.id,el.className,el.getBoundingClientRect().right])}));
  assert.ok(overflow.scroll<=overflow.width,JSON.stringify(overflow));
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.boss-lotus-flower img').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
  assert.deepEqual(errors,[]);console.log('PASS Matriarch '+width+'px: Enxerto fill, PNG states, help, reduced motion, no overflow');await context.close();
 }
}finally{await browser?.close();await new Promise(done=>server.close(done));}
