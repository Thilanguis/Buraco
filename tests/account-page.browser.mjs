// Interface offline: nenhuma conta ou partida real é criada.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=new URL('../',import.meta.url);
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 for(const width of [390,844,1280]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url()); if(url.origin!=='http://profile.test')return route.abort();
   if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:`<link rel="stylesheet" href="/styles/profile.css"><style>body{background:radial-gradient(ellipse at top,#644623,#061226 70%);min-height:100vh;margin:0}#configSection{padding:40px}</style><div id="configSection"><button id="open">Meu perfil</button></div><script type="module">
    import {openAccountPage} from '/js/account-page.js'; import {normalizeProfile} from '/js/account-profile.js';
    const account={uid:'u1',name:'Gabriel Granado',email:'gabriel@example.test',pixKey:'pix-original'};
    const team=(id,score)=>({id,name:'Time '+(id+1),score,meldPoints:300,handPenalty:20,deadPenalty:0,finishBonus:100,canastras:{suja:1,limpa:2,real:0,asas:0}});
    const make=(id,category,winner,mode)=>({matchId:id,category,winnerTeamId:winner,finisherTeamId:0,mode,variant:'aberto',finishedAt:1789999000000,durationSeconds:1400,participants:[{uid:'u1',name:'Gabriel Granado',teamId:0},{uid:'u2',name:'<img src=x onerror=alert(1)>',teamId:1}],teams:[team(0,1240),team(1,780)]});
    const legacy=()=>({...make('m1','players',0,'1x1_dominacao'),durationSeconds:null,legacyImport:{approximateDate:true,testStatus:'not_recorded'}});
    window.fixture={saves:0,resets:0,loads:0,account};
    document.getElementById('open').onclick=()=>openAccountPage({account,
      saveProfile:async input=>{Object.assign(account,normalizeProfile(input));fixture.saves++;}, resetPassword:async()=>{fixture.resets++;},
      loadMatches:async(uid,cursor)=>{fixture.loads++;return cursor?{matches:[make('m4','players',null,'2x2')],cursor:null,hasMore:false}:{matches:[legacy(),make('m2','boss',1,'boss_matriarca'),make('m3','test',0,'1x1')],cursor:'next',hasMore:true};}});
   </script>`});
   if(!/^\/(js|styles)\/[\w.-]+\.(js|css)$/.test(url.pathname))return route.abort();
   return route.fulfill({body:await readFile(new URL(url.pathname.slice(1),root)),contentType:url.pathname.endsWith('.css')?'text/css':'text/javascript'});
  });
  await page.goto('http://profile.test');await page.locator('#open').click();
  await page.waitForFunction(()=>document.querySelectorAll('.profile-match').length===3);
  assert.equal(await page.locator('.profile-stat strong').first().textContent(),'2');
  assert.equal(await page.evaluate(()=>document.getElementById('accountPage').scrollWidth>innerWidth),false);
  assert.equal(await page.locator('#configSection').evaluate(el=>el.classList.contains('profile-menu-away')),true);
  const bounds=await page.locator('#accountPage').boundingBox();
  assert.ok(bounds.width < width && bounds.height < 900);
  assert.equal(await page.locator('#accountPage').evaluate(el=>getComputedStyle(el,'::backdrop').backgroundColor),'rgba(2, 6, 23, 0.094)');
  await page.locator('#accountPage').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished));});
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('configSection')).opacity==='0');
  if(process.env.PROFILE_SCREENSHOT && width===1280)await page.screenshot({path:process.env.PROFILE_SCREENSHOT});
  await page.locator('.profile-match summary').first().click();
  assert.match(await page.locator('.profile-match-detail').first().textContent(),/Data aproximada/);
  assert.match(await page.locator('.profile-match-detail').first().textContent(),/Duração não registrada/);
  assert.equal(await page.locator('.profile-match-detail img').count(),0);
  await page.locator('#historyFilter').selectOption('boss');assert.equal(await page.locator('.profile-match').count(),1);
  await page.locator('#historyFilter').selectOption('all');await page.locator('.profile-more').click();
  await page.waitForFunction(()=>document.querySelectorAll('.profile-match').length===4);
  await page.locator('#settingsTab').click();await page.locator('[name=name]').fill('Gabriel Novo');await page.locator('[name=pixKey]').fill('nova-chave');
  await page.locator('.profile-form [type=submit]').click();await page.waitForFunction(()=>window.fixture.saves===1);
  assert.equal(await page.locator('#profileTitle').textContent(),'Gabriel Novo');
  await page.locator('[data-reset]').click();await page.waitForFunction(()=>window.fixture.resets===1);
  await page.locator('[data-back]').click();await page.locator('#accountPage').waitFor({state:'detached'});
  assert.equal(await page.locator('#configSection').evaluate(el=>el.classList.contains('profile-menu-away')),false);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'open'); assert.deepEqual(errors,[]);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#open').click();await page.keyboard.press('Escape');
  await page.locator('#accountPage').waitFor({state:'detached'});
  assert.equal(await page.locator('#configSection').evaluate(el=>el.classList.contains('profile-menu-away')),false);
  await page.close();
 }
 console.log('PASS: perfil/histórico em 3 telas, filtros, paginação, edição, senha, retorno e conteúdo escapado.');
}finally{await browser.close();}
