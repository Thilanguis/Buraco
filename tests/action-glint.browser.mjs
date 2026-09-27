import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:600,height:180}});
 await page.setContent('<body style="background:#080b14;padding:45px"><button id="callFriendBtn" style="border-radius:18px">📞 CHAMAR AMIGAS</button><button id="seekCardBtn" style="border-radius:18px;background:#169d52;color:white;border:1px solid #85dda5;padding:8px 12px;margin-left:12px">🔎 CARTA</button></body>');
 await page.addStyleTag({content:await readFile(new URL('../styles/domination.css',import.meta.url),'utf8')});
 for(const id of ['callFriendBtn','seekCardBtn']) {
  assert.equal(await page.locator('#'+id).evaluate(el=>getComputedStyle(el,'::before').animationName),'action-item-glint');
  assert.equal(await page.locator('#'+id).evaluate(el=>getComputedStyle(el,'::after').pointerEvents),'none');
 }
 await page.evaluate(()=>document.getAnimations().forEach(a=>{a.pause();a.currentTime=320;}));
 if(process.env.GLINT_SCREENSHOT)await page.screenshot({path:process.env.GLINT_SCREENSHOT});
 await page.locator('#callFriendBtn').evaluate(el=>el.disabled=true);
 assert.equal(await page.locator('#callFriendBtn').evaluate(el=>getComputedStyle(el,'::before').content),'none');
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('#seekCardBtn').evaluate(el=>getComputedStyle(el,'::before').animationName),'none');
 console.log('PASS: brilhos pontuais sem bloquear clique, desativados quando indisponível ou movimento reduzido.');
} finally {await browser.close();}
