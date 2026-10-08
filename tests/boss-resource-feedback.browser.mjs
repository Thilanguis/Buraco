import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const app=await readFile(resolve(root,'app.js'),'utf8'),html=await readFile(resolve(root,'index.html'),'utf8');
const controls=app.slice(app.indexOf('  function refreshBossLabCombatControls('),app.indexOf('  async function refreshBossLabObserved('));
const options=app.slice(app.indexOf('  const setBossLabOptions ='),app.indexOf('  const setBossLabError ='));
const markup=html.match(/<fieldset id="debugBossLabCombat"[\s\S]*?<\/fieldset>/)[0];
const fixture=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/styles/boss-mode.css">
<link rel="stylesheet" href="/styles/boss/nemesis.css"><link rel="stylesheet" href="/styles/boss/dimitrescu.css">
<style>body{margin:20px;background:#140c14;color:white;font:14px sans-serif}#bossHud{display:block;position:static;width:auto;margin:0;padding:12px;max-width:none}.boss-portrait{width:100px;height:70px;background:#522}#bossDangerMeter{max-width:500px;margin:10px 0}.boss-meter-track{height:14px;background:#302a35}#bossDebtBar{display:block;height:100%;width:0;transition:width .2s}#aux{display:flex;gap:12px;margin:30px 0}#aux>div{width:130px;height:90px;background-size:cover;background-position:center}select,input,button{font-size:14px;max-width:100%}fieldset{max-width:460px;box-sizing:border-box}#debugBossLabCombatModifiers:not([hidden]){display:flex;flex-wrap:wrap}#debugBossLabCombatInfo{overflow-wrap:anywhere}</style>
<section id="bossHud"><div class="boss-portrait">CHEFE</div><div id="bossDangerMeter" class="boss-debt-meter"><strong id="bossDebtText">0 / 100</strong><div class="boss-meter-track"><span id="bossDebtBar"></span></div></div></section>
<div id="aux"><div data-entity-id="bela" style="background-image:url('/assets/images/boss-dimitrescu-bela.png')"></div><div data-entity-id="infected" style="background-image:url('/assets/images/nemesis-infectado.png')"></div></div>
<label>Chefe <select id="debugBossLabBoss"><option value="nemesis">Nemesis</option><option value="dimitrescu">Dimitrescu</option><option value="nehelenia">Nehelenia</option></select></label>${markup}<pre id="error"></pre>
<script type="module">
import {createResourceFeedbackPresenter} from '/js/boss/ui/resource-feedback.js';
import * as module from '/js/boss/boss-debug-scenarios.js';
let state,undos=[];const bossLabElement=id=>document.getElementById(id);
${options}
const loadBossDebugLabModule=async()=>module,setBossLabError=text=>document.getElementById('error').textContent=text;
const saveStateForUndo=()=>undos.push(module.createBossDebugSnapshot(state));
const renderAll=()=>{},commitState=async()=>{},refreshBossLabObserved=async()=>{},showMessage=()=>{};
const refreshBossLabResourceControls=async()=>refreshBossLabCombatControls(module);
${controls}
window.setupLab=id=>{bossLabElement('debugBossLabBoss').value=id;state=module.buildBossDebugScenario(null,{bossId:id,abilityId:id==='nemesis'?'stars_hunt':'blood_tithe',phase:1,variant:'interactive',target:'auto'}).state;refreshBossLabCombatControls(module);};
bossLabElement('debugBossLabBoss').onchange=()=>refreshBossLabCombatControls(module);
bossLabElement('debugBossLabCombatEntity').onchange=()=>refreshBossLabCombatControls(module);
bossLabElement('debugBossLabCombatApply').onclick=applyBossLabCombatEntity;
window.info=()=>module.getBossDebugCombatState(state);window.undo=()=>{state=module.restoreBossDebugSnapshot(undos.pop());refreshBossLabCombatControls(module);};
const presenter=createResourceFeedbackPresenter({document,reducedMotion:()=>matchMedia('(prefers-reduced-motion: reduce)').matches});
window.transferHistory=[];new MutationObserver(records=>{for(const r of records) for(const n of r.addedNodes) if(n.classList?.contains('boss-resource-arrival')) window.transferHistory.push({source:n.dataset.sourceId,text:n.textContent,value:bossLabElement('bossDebtText').textContent});}).observe(document.body,{childList:true});
const selectTransferBoss=id=>{document.body.dataset.bossId=id;bossLabElement('bossDangerMeter').classList.toggle('boss-blood-meter',id==='dimitrescu');};
window.transfer=id=>{presenter.clear();window.transferHistory=[];selectTransferBoss(id);const boss={id,seed:1,maxDanger:100,danger:id==='nemesis'?16:11};presenter.sync(boss);
  const events=id==='nemesis'?[{type:'nemesisObjective',actionId:'n',dangerBefore:0,danger:16,amount:16,resourceSources:[{entityId:'boss',amount:8},{entityId:'infected',amount:6},{entityId:'boss',amount:2}]}]
    :[{type:'bloodChange',actionId:'daughter_bela_1',sourceEntityId:'bela',amount:3,dangerBefore:0,danger:3},{type:'bossAbility',actionId:'d',dangerDelta:8,dangerBefore:3,danger:11}];
  for(const e of events){presenter.enqueue(boss,e);presenter.enqueue(boss,e);} };
window.clearTransfer=()=>presenter.clear();window.setupLab('nemesis');
window.transferFrom19=id=>{presenter.clear();window.transferHistory=[];selectTransferBoss(id);
  const amount=id==='nemesis'?6:3,boss={id,seed:1,maxDanger:100,danger:19+amount};
  // Reproduce the HUD writing the resolved value before the presenter holds it.
  bossLabElement('bossDebtBar').style.width=boss.danger+'%';
  presenter.enqueue(boss,{type:id==='nemesis'?'infection':'bloodChange',actionId:'from19',
    sourceEntityId:id==='nemesis'?'infected':'bela',amount,dangerBefore:19,danger:boss.danger});};
</script>`;
const server=createServer(async(req,res)=>{
  try {if(req.url==='/fixture'){res.setHeader('Content-Type','text/html');res.end(fixture);return;}
    const path=resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
    if(!path.startsWith(root)){res.writeHead(403);res.end();return;}
    res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
  browser=await chromium.launch({channel:'msedge',headless:true});await mkdir(resolve(root,'.cache/resource-feedback'),{recursive:true});
  for(const width of [1920,1376,390]) {
    const context=await browser.newContext({viewport:{width,height:950},hasTouch:width<1920});const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/fixture`);
    assert.deepEqual(errors,[]);await page.waitForFunction(()=>!!window.transfer);
    const activate=selector=>width<1920?page.locator(selector).tap():page.locator(selector).click();
    await page.evaluate(()=>window.transfer('dimitrescu'));
    await page.waitForSelector('.boss-resource-transfer[data-source-id="bela"]');
    assert.equal(await page.locator('.boss-resource-transfer').evaluate(el=>getComputedStyle(el).getPropertyValue('--resource-color').trim()),'#ef405c');
    assert.equal(await page.locator('.boss-resource-transfer').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
    await page.waitForFunction(()=>window.transferHistory.length===2 && !document.querySelector('.boss-resource-arrival'));
    assert.deepEqual(await page.evaluate(()=>window.transferHistory.map(e=>[e.source,e.text,e.value])),[['bela','+3 Sede','3 / 100'],['boss','+8 Sede','11 / 100']]);
    await page.evaluate(()=>window.transfer('nemesis'));
    await page.waitForFunction(()=>!!document.querySelector('.boss-resource-transfer[data-source-id="infected"]'));
    assert.equal(await page.locator('.boss-resource-transfer').evaluate(el=>getComputedStyle(el).getPropertyValue('--resource-color').trim()),'#9cde4d');
    await page.waitForFunction(()=>{const el=document.querySelector('.boss-resource-transfer');return el&&Number(getComputedStyle(el).opacity)>.9;});
    await page.evaluate(()=>{const a=document.querySelector('.boss-resource-transfer').getAnimations()[0];a.pause();a.currentTime=350;});
    await page.screenshot({path:resolve(root,`.cache/resource-feedback/transfer-${width}.png`)});
    await page.evaluate(()=>document.querySelector('.boss-resource-transfer').getAnimations()[0].play());
    await page.waitForFunction(()=>window.transferHistory.length===3 && !document.querySelector('.boss-resource-arrival'));
    assert.deepEqual(await page.evaluate(()=>window.transferHistory.map(e=>e.value)),['8 / 100','14 / 100','16 / 100']);
    for(const id of ['nemesis','dimitrescu']) {
      await page.evaluate(id=>window.transferFrom19(id),id);
      await page.waitForFunction(()=>!!document.querySelector('.boss-resource-transfer'));
      const landing=await page.evaluate(()=>{
        const ray=document.querySelector('.boss-resource-transfer'),animation=ray.getAnimations()[0];
        const duration=animation.effect.getTiming().duration;
        animation.pause();animation.currentTime=duration-1;
        const bar=document.getElementById('bossDebtBar'),track=bar.parentElement,fill=bar.getBoundingClientRect();
        const destination=new DOMMatrix(animation.effect.getKeyframes().at(-1).transform);
        return {duration,x:parseFloat(ray.style.left)+destination.m41,y:parseFloat(ray.style.top)+destination.m42,
          edge:fill.right,centerY:track.getBoundingClientRect().top+track.getBoundingClientRect().height/2,
          ratio:fill.width/track.clientWidth,value:document.getElementById('bossDebtText').textContent,
          arrivals:window.transferHistory.length};
      });
      assert.equal(landing.duration,700);assert.ok(Math.abs(landing.x-landing.edge)<.1);
      assert.ok(Math.abs(landing.y-landing.centerY)<.1);assert.ok(Math.abs(landing.ratio-.19)<.001);
      assert.equal(landing.value,'19 / 100');assert.equal(landing.arrivals,0);
      // Paused just before impact, the bar still holds the pre-flight value.
      await page.screenshot({path:resolve(root,`.cache/resource-feedback/landing-${id}-${width}.png`)});
      assert.equal(await page.locator('#bossDebtText').textContent(),'19 / 100');
      await page.evaluate(()=>document.querySelector('.boss-resource-transfer').getAnimations()[0].play());
      await page.waitForFunction(()=>window.transferHistory.length===1 && !document.querySelector('.boss-resource-arrival'));
      assert.equal(await page.locator('#bossDebtText').textContent(),`${id==='nemesis'?25:22} / 100`);
      const ratio=await page.locator('#bossDebtBar').evaluate(el=>el.getBoundingClientRect().width/el.parentElement.clientWidth);
      assert.ok(Math.abs(ratio-(id==='nemesis'?.25:.22))<.001);
    }
    await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.transfer('dimitrescu'));
    assert.equal(await page.locator('.boss-resource-transfer').count(),0);
    await page.waitForFunction(()=>window.transferHistory.length===2 && !document.querySelector('.boss-resource-arrival'));
    await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>window.transfer('dimitrescu'));await page.evaluate(()=>window.clearTransfer());
    assert.equal(await page.locator('.boss-resource-transfer,.boss-resource-arrival').count(),0);
    await page.selectOption('#debugBossLabCombatEntity','infected');await page.selectOption('#debugBossLabCombatStatus','persistent');await page.fill('#debugBossLabCombatHp','80');
    await page.locator('#debugBossLabCombatMutated').check();await page.locator('#debugBossLabCombatReinforced').check();
    await activate('#debugBossLabCombatApply');await page.waitForFunction(()=>window.info().entities.find(e=>e.id==='infected').hp===80);
    const infected=await page.evaluate(()=>window.info().entities.find(e=>e.id==='infected'));assert.equal(infected.status,'persistent');assert.equal(infected.mutated,true);assert.equal(infected.reinforced,true);
    const labRect=await page.locator('#debugBossLabCombat').boundingBox();assert.ok(labRect.x>=0&&labRect.x+labRect.width<=width);
    await page.evaluate(()=>window.undo());assert.equal((await page.evaluate(()=>window.info().entities.find(e=>e.id==='infected'))).status,'absent');
    await page.evaluate(()=>window.setupLab('dimitrescu'));assert.ok(await page.locator('#debugBossLabCombatModifiers').isHidden());
    await page.selectOption('#debugBossLabCombatStatus','dead');await activate('#debugBossLabCombatApply');await page.waitForFunction(()=>window.info().entities[0].status==='dead');
    await page.selectOption('#debugBossLabCombatStatus','alive');await page.fill('#debugBossLabCombatHp','120');
    await page.locator('#debugBossLabCombatApply').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>window.info().entities[0].hp===120);
    await page.selectOption('#debugBossLabBoss','nehelenia');assert.ok(await page.locator('#debugBossLabCombat').isHidden());
    assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${width}px: fill-edge landing at 19/100, growth after impact, sequential sources/colors, dedup, cancellation, reduced motion, laboratory/undo`);
  }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
