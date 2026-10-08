import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const source = await readFile(resolve(root,'app.js'),'utf8'), html = await readFile(resolve(root,'index.html'),'utf8');
const markup = html.match(/<section id="bossHud"[\s\S]*?<\/section>(?=\s*<div id="bossDaughterStrip")/)[0].replace('style="display: none"','style="display: grid"');
const functions = source.slice(source.indexOf('function closeBossIntentHelp('),source.indexOf('\nfunction syncBossDiscardHelp('));
const discardHud = source.slice(source.indexOf("  const discardButton = document.getElementById('drawDiscardBtn');", source.indexOf('function renderBossHud(')), source.indexOf('\n  const event = resolvingEvent ||'));
const fixture = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${['base-menu','themes','game','cards','hud','responsive','boss-mode','resident','boss/dimitrescu','boss/nemesis','boss/nehelenia'].map(n=>`<link rel="stylesheet" href="/styles/${n}.css">`).join('')}
<body class="boss-mode theme-resident" data-deck-theme="resident" data-boss-id="dimitrescu"><main style="padding:12px;max-width:1440px;margin:auto">${markup}<div style="display:flex;align-items:center;justify-content:center;gap:20px"><button id="sampleStock">MONTE</button><button id="drawDiscardBtn"><span class="pile-card">LIXO</span></button></div><section id="sampleHand" style="display:flex;gap:9px;margin-top:10px"></section></main>
<script type="module">
import { createBossState, distributeCastleItems, getBossPhaseProgress, canUseCastleItem, useCastleItem, startDimitrescuRound, getBossCardEffect, selectNextBossIntent } from '/js/boss/boss-engine.js';
import { ITEM_DEFINITIONS } from '/js/boss/dimitrescu-castle.js';
import { renderCastleHud, castleItemHelp } from '/js/boss/ui/dimitrescu-castle-view.js';
import { cardFrontHTML } from '/js/game/card-face.js';
import { createDeck } from '/js/deck.js';
const buildBossAbilityHelp=()=>({title:'Ajuda',text:'Objetivo'}), renderBossHudRichText=(el,text)=>el.textContent=text;
let state, myPlayerIndex=0, committing=false;
const getBossUiAdapter=()=>null, isBossDiscardBlocked=()=>false;
const selectedHandIndexes=new Set(), localActionGate={run:fn=>fn()}, canPerformCommonGameAction=()=>true, saveStateForUndo=()=>{}, commitState=async()=>{}, newActionId=()=>Date.now().toString(), flyRectToRect=async()=>{};
${functions}
function renderAll() {
  const boss=state.boss;
  ${discardHud}
  syncBossIntentHelp(state);
  document.getElementById('bossName').textContent='LADY DIMITRESCU';
  document.getElementById('bossPortraitImage').src='/assets/images/boss-dimitrescu.png';
  document.getElementById('bossPhase').textContent='FASE 1 · A Caçada';
  document.getElementById('bossDangerLabel').textContent='SEDE DE SANGUE';
  document.getElementById('bossDangerMeter').classList.add('boss-blood-meter');
  document.getElementById('bossDebtText').textContent=state.boss.danger+' / 100';
  document.getElementById('bossIntentName').textContent='Marca Carmesim';
  document.getElementById('bossIntentDescription').textContent='Use cada carta marcada em um jogo.';
  document.getElementById('bossIntentProgress').textContent='Sem punição no sucesso';
  renderBossPhaseAndHealth(state,getBossPhaseProgress(state));
  renderCastleHud({document,hud:document.getElementById('bossHud'),state,createHelp:createBossCombatHelp,cardFrontHTML,disabled:false,selectTarget:id=>{state.boss.combatTargetsByPlayer[0]=id;renderAll();}});
  const hand=document.getElementById('sampleHand'); hand.replaceChildren();
  for(const c of state.players[0].hand) {
    const el=document.createElement('div');el.className='carta deck-red';el.style.cssText='position:relative;flex:0 0 60px;width:60px;height:90px'; el.dataset.cardId=c.id;
    el.innerHTML=cardFrontHTML(c);
    if(getBossCardEffect(state,0,c.id)==='dimitrescu-hunt') {
      el.classList.add('boss-card-dimitrescu-hunt');el.insertAdjacentHTML('beforeend','<span class="boss-card-status boss-card-status-blood-hunt"><b>BELA</b></span>');
    }
    const button=castleItemUseButton(c);if(button)el.append(button);hand.append(el);
  }
}
window.resetSample=(normal=false)=>{
  const deck=createDeck(['♠','♥','♦','♣'],['A','2','3','4','5','6','7','8','9','10','J','Q','K']);
  const boss=createBossState('dimitrescu',1234);distributeCastleItems(boss,deck);
  const chosen=Object.keys(ITEM_DEFINITIONS).map(type=>deck.find(c=>c.castleItem?.type===type));
  state={mode:'boss_dimitrescu',currentPlayer:0,hasDrawnThisTurn:true,stock:deck.filter(c=>!chosen.includes(c)),discard:[],deadChunksTaken:[0,0],players:[{id:0,name:'Biel',teamId:0,hand:chosen},{id:1,name:'BOT Luana',teamId:0,hand:[]}],teams:[{melds:[]}],boss};
  boss.combatEntities[0].passive={status:'active',targetPlayerId:0,cardId:chosen[0].id};
  boss.combatEntities[1].passive={status:'active',meldIndex:0};
  boss.combatEntities[2].passive={status:'active'};
  if(normal)startDimitrescuRound(state);
  boss.bossFlow={stage:'players'};window.sampleState=state; renderAll();
}; window.renderSample=renderAll;window.resetSample();
window.forceThreeSample=()=>{
  state.boss.phase=2;state.boss.roundNumber++;
  state.teams[0].melds=[['3','4','5'].map(rank=>({id:'base-'+rank,rank,suit:'♠'}))];
  state.players[0].hand.push({id:'six-legal',rank:'6',suit:'♠'});
  selectNextBossIntent(state,{debug:true,forcedAbilityId:'three_daughters'});renderAll();
};
window.startEmptySample=()=>{
  state.boss.currentIntent=null;state.boss.roundNumber++;
  state.players.forEach(p=>p.hand=[]);state.teams[0].melds=[];state.discard=[];
  startDimitrescuRound(state);renderAll();
};
</script>`;
const server=createServer(async(req,res)=>{
  try {const path=new URL(req.url,'http://localhost').pathname;if(path==='/fixture'){res.setHeader('Content-Type','text/html');return res.end(fixture);}
    const file=resolve(root,`.${decodeURIComponent(path)}`);if(!file.startsWith(root))throw Error('outside');
    res.setHeader('Content-Type',{'.css':'text/css','.js':'text/javascript','.png':'image/png'}[extname(file)]||'application/octet-stream');res.end(await readFile(file));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));let browser;
try {
  browser=await chromium.launch({channel:'msedge',headless:true});await mkdir(resolve(root,'.cache/dimitrescu-ux'),{recursive:true});
  for(const width of [1920,1376,390]) {
    const context=await browser.newContext({viewport:{width,height:width===390?844:1080},hasTouch:width<1920});const page=await context.newPage(),errors=[];
    const activate = selector => width<1920 ? page.locator(selector).tap() : page.locator(selector).click();
    page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/fixture`);await page.waitForFunction(()=>window.sampleState);
    assert.equal(await page.locator('.castle-daughter').count(),3);assert.equal(await page.locator('#castleItemRibbon img').count(),5);
    assert.equal(await page.locator('#sampleHand .castle-item-overlay').count(),5);
    const daughterMeter=page.locator('.castle-daughter meter').first();
    const daughterPixels=(await daughterMeter.screenshot()).toString('base64');
    const nemesisPixels=await page.evaluate(async()=>{
      document.body.dataset.bossId='nemesis';
      const article=document.createElement('article');article.id='referenceZombie';article.className='boss-daughter-card boss-combat-entity';article.style.cssText='position:relative;width:300px;height:140px';
      const content=document.createElement('div');content.className='boss-combat-content';
      const meter=document.createElement('meter');meter.min=0;meter.max=500;meter.value=500;meter.dataset.health='normal';content.append(meter);article.append(content);document.body.append(article);
    }).then(async()=>{
      const png=(await page.locator('#referenceZombie meter').screenshot()).toString('base64');
      await page.evaluate(()=>{document.getElementById('referenceZombie').remove();document.body.dataset.bossId='dimitrescu';});return png;
    });
    const thickness=await page.evaluate(async images=>{
      const rows=[];for(const data of images){const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(Math.floor(img.width*.3),0,1,img.height).data;let green=0;for(let y=0;y<img.height;y++){const i=y*4;if(pixels[i+1]>pixels[i]+20&&pixels[i+1]>pixels[i+2]+20)green++;}rows.push(green);}return rows;
    },[daughterPixels,nemesisPixels]);
    // Native meter rasterization can straddle a fractional CSS pixel between rows.
    // Both tracks must be 9 CSS px; the visible fill may differ by at most one raster row.
    assert.equal(await daughterMeter.evaluate(el=>el.getBoundingClientRect().height),9);
    assert.ok(thickness[0]>0&&Math.abs(thickness[0]-thickness[1])<=1,`native HP fill thickness at ${width}px: ${thickness}`);
    console.log(`HP fill ${width}px: daughters ${thickness[0]}px / zombies ${thickness[1]}px`);
    const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,
      ribbon:document.getElementById('castleItemRibbon').getBoundingClientRect().bottom,phase:document.getElementById('bossPhaseProgress').getBoundingClientRect().top,
      pictures:[...document.querySelectorAll('.castle-item-overlay')].map(el=>({loaded:el.complete&&el.naturalWidth>0,width:el.getBoundingClientRect().width,card:el.parentElement.getBoundingClientRect().width,pointer:getComputedStyle(el).pointerEvents}))}));
    assert.ok(layout.scroll<=layout.width,`no horizontal overflow at ${width}`);assert.ok(layout.ribbon<=layout.phase,'ribbon before phase');
    assert.ok(await page.evaluate(()=>{
      const hud=document.getElementById('bossHud').getBoundingClientRect(), panel=document.getElementById('dimitrescuCastlePanel').getBoundingClientRect();
      const cards=[...document.querySelectorAll('.castle-daughter')];
      return Math.abs(hud.left-panel.left)<2&&Math.abs(hud.width-panel.width)<2&&cards.every(card=>{
        const box=card.getBoundingClientRect(),image=card.querySelector('.boss-combat-portrait').getBoundingClientRect();
        return box.width<=panel.width/3&&box.left>=panel.left-1&&box.right<=panel.right+1&&Math.abs(image.height-box.height)<3&&Math.abs(box.width-cards[0].getBoundingClientRect().width)<1;
      });
    }), 'aligned thirds with full-height portraits');
    assert.equal(await page.locator('.castle-link-label').innerText(),'1500 PROT.');
    assert.equal(await page.locator('#bossHpText').innerText(),'3500 / 3500');
    await page.evaluate(()=>{window.sampleState.boss.bloodLinkProtection=900;window.renderSample();window.renderSample();});
    assert.equal(await page.locator('#bossHpText').innerText(),'2900 / 3500');
    assert.equal(await page.locator('.castle-link-label').innerText(),'900 PROT.');
    assert.equal(await page.locator('.castle-link-fill').evaluate(el=>el.style.width),'60%');
    await activate('#castleBloodLink button');
    assert.match(await page.locator('#bossIntentHelpText').innerText(),/gastam a proteção antes da vida.*excedente/s);
    assert.match(await page.locator('#bossIntentHelpText').innerText(),/não volta.*Coágulo absorve primeiro/s);
    await page.keyboard.press('Escape');
    await page.screenshot({path:resolve(root,`.cache/dimitrescu-ux/link-consumed-${width}.png`),fullPage:true});
    await page.evaluate(()=>{window.sampleState.boss.bloodLinkProtection=0;window.renderSample();});
    assert.equal(await page.locator('#bossHpText').innerText(),'2000 / 3500');
    assert.equal(await page.locator('.castle-link-label').innerText(),'0 PROT.');
    assert.equal(await page.locator('.castle-link-fill').evaluate(el=>el.style.width),'0%');
    await page.evaluate(()=>window.resetSample());
    assert.equal(await page.locator('#castleBloodLink').evaluate(el=>Boolean(el.closest('.boss-meter-track'))),true);
    assert.equal(await page.locator('#castleItemRibbon [data-item-type="dagger"] .castle-item-count').innerText(),'3/3');
    assert.ok(await page.locator('#castleItemRibbon [data-item-type]').evaluateAll(buttons=>buttons.every(button=>{
      const art=button.querySelector('img').getBoundingClientRect(), count=button.querySelector('.castle-item-count').getBoundingClientRect();
      const track=document.querySelector('#bossDangerMeter .boss-meter-track').getBoundingClientRect();
      const frame=getComputedStyle(document.querySelector('#bossDangerMeter .boss-meter-track'),'::after');
      const frameBottom=track.top+track.height/2+parseFloat(frame.height)/2;
      return count.left>=art.right && Math.abs((count.top+count.height/2)-(art.top+art.height/2))<1 && art.top>=frameBottom;
    })), 'counters sit beside art; item art stays below Sede');
    assert.equal(await page.evaluate(()=>window.sampleState.boss.maxHp),2000);
    assert.equal(await page.locator('.castle-daughter .boss-combat-content small').count(),0);
    assert.ok(await page.locator('.castle-daughter').evaluateAll(cards=>cards.every(card=>card.querySelector('.boss-combat-content').getBoundingClientRect().bottom<=card.getBoundingClientRect().bottom)), 'daughter HP/passive content is not clipped');
    assert.ok(layout.pictures.every(p=>p.loaded&&p.width<=p.card*.66&&p.pointer==='none'));
    assert.ok(await page.locator('#sampleHand .castle-item-overlay').evaluateAll(arts=>arts.every(art=>art.getBoundingClientRect().width>=art.parentElement.getBoundingClientRect().width*.6)), 'hand item art is enlarged');
    assert.ok(await page.evaluate(()=>{
      const hud=document.getElementById('bossHud'),height=hud.getBoundingClientRect().height;
      const old=document.createElement('style');old.textContent="body[data-boss-id='dimitrescu'] #castleItemRibbon { flex-wrap:wrap; gap:6px; } body[data-boss-id='dimitrescu'] #castleItemRibbon > b { flex:initial;min-width:0;margin-right:auto; } body[data-boss-id='dimitrescu'] #castleItemRibbon button:has(img) { flex:initial;width:38px;height:55px; } body[data-boss-id='dimitrescu'] #castleItemRibbon img {height:38px;transform:none;}";
      document.head.append(old);const before=hud.getBoundingClientRect().height;old.remove();return Math.abs(height-before)<1;
    }), 'larger ribbon items do not increase the HUD height');
    const purchaseGeometry=()=>page.evaluate(()=>['sampleStock','drawDiscardBtn','sampleHand'].map(id=>{
      const r=document.getElementById(id).getBoundingClientRect();return [r.top,r.height];
    }));
    const purchaseBefore=await purchaseGeometry();
    for(const name of ['Bela','Cassandra','Daniela','Bela']) {
      await activate(`.castle-daughter button[aria-label="Atacar ${name}"]`);
      assert.deepEqual(await purchaseGeometry(),purchaseBefore,'portrait target must not move purchase area');
      assert.equal(await page.locator('#drawDiscardBtn').evaluate(el=>el.classList.contains('boss-daniela-discard')),false,'permanent Daniela does not activate legacy swarm label');
      assert.equal(await page.locator('#drawDiscardBtn').evaluate(el=>el.classList.contains('boss-pollen-discard')),false,'missing pollen stays inactive on every rerender');
    }
    const targetBefore=await page.evaluate(()=>window.sampleState.boss.combatTargetsByPlayer[0]);
    assert.equal(await page.locator('.castle-lady-target').count(),0);
    await activate('.castle-daughter[data-entity-id="bela"] > button[aria-label="Explicar Bela"]');
    assert.match(await page.locator('#bossIntentHelpText').innerText(),/Regenera 50 no fim da rodada/);
    assert.equal(await page.evaluate(()=>window.sampleState.boss.combatTargetsByPlayer[0]),targetBefore,'help does not select attack target');
    await page.keyboard.press('Escape');
    await page.locator('.boss-combat-main-target').focus();await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>window.sampleState.boss.combatTargetsByPlayer[0]),'boss');
    assert.equal(await page.locator('.boss-combat-main-target').getAttribute('aria-pressed'),'true');
    await activate('.castle-daughter[data-entity-id="bela"] [aria-label="Atacar Bela"]');
    await activate('.boss-combat-main-target');assert.equal(await page.evaluate(()=>window.sampleState.boss.combatTargetsByPlayer[0]),'boss');
    assert.equal(await page.locator('.boss-combat-chips').evaluateAll(groups=>groups.some(group=>/REGEN \+50/.test(group.textContent))),false);
    const markedItem=page.locator('#sampleHand .boss-card-dimitrescu-hunt').first();
    assert.equal(await markedItem.locator('.castle-item-overlay').count(),1);
    assert.equal(await markedItem.locator('.castle-use-item').innerText(),'');
    assert.equal(await markedItem.evaluate(el=>getComputedStyle(el,'::before').content),'none','Bela mark does not paint over the item');
    await page.locator('.castle-daughter[data-entity-id="cassandra"] .castle-passive-chips button').first().focus();
    await page.keyboard.press('Enter');assert.match(await page.locator('#bossIntentHelpText').innerText(),/Alimente o Jogo 1/);await page.keyboard.press('Escape');
    assert.equal(await page.locator('.boss-combat-content .castle-passive-chips').count(),0);
    assert.equal(await page.locator('.boss-combat-chips .castle-passive-chips').count(),3);
    await page.locator('#castleItemRibbon [data-item-type="dagger"]').focus();await page.keyboard.press('Enter');assert.ok(await page.locator('#bossIntentHelpPopover').isVisible());await page.keyboard.press('Escape');
    await activate('#castleItemRibbon [data-item-type="dagger"]');assert.match(await page.locator('#bossIntentHelpText').innerText(),/50/);
    const pop=await page.locator('#bossIntentHelpPopover').boundingBox();assert.ok(pop.x>=0&&pop.x+pop.width<=width+1);
    await page.keyboard.press('Escape');assert.ok(await page.locator('#bossIntentHelpPopover').isHidden());
    await activate('#castleItemRibbon [data-item-type="dagger"]');if(width<1920)await page.touchscreen.tap(2,2);else await page.mouse.click(2,2);assert.ok(await page.locator('#bossIntentHelpPopover').isHidden());
    assert.ok(await page.locator('.castle-daughter').evaluateAll(cards=>cards.every(card=>card.querySelector('.boss-combat-card-target').getBoundingClientRect().width<=card.getBoundingClientRect().width)), 'target hitboxes stay inside their own card');
    await activate('.castle-daughter [aria-label="Atacar Bela"]');assert.equal(await page.evaluate(()=>window.sampleState.boss.combatTargetsByPlayer[0]),'bela');
    if(width<1920)await page.locator('#sampleHand .castle-use-item').first().tap();else await page.locator('#sampleHand .castle-use-item').first().click();
    if(width<1920)await page.locator('.castle-item-targets button').first().tap();else await page.locator('.castle-item-targets button').first().click();
    assert.equal(await page.locator('.castle-sacrifice-card').count(),1);assert.equal(await page.locator('#sampleHand .castle-item-overlay').count(),4);
    assert.equal(await page.evaluate(()=>window.sampleState.boss.combatEntities[0].hp),300);
    assert.match(await page.locator('.castle-daughter .boss-combat-content').first().innerText(),/300 \/ 450 HP/);
    assert.equal(await page.locator('.castle-daughter meter').first().getAttribute('max'),'450');
    assert.equal(await page.locator('.castle-max-loss').first().innerText(),'↓ MÁX −100');
    assert.ok(Math.abs(await page.locator('.castle-hp-petrified').first().evaluate(el=>parseFloat(el.style.width))-100/450*100)<0.001);
    assert.equal(await page.locator('.castle-sacrifice-stack').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
    for(const [hp,status,color] of [[300,'normal','#73ce54'],[150,'tension','#e7a622'],[80,'danger','#ef2944']]) {
      await page.evaluate(hp=>{window.sampleState.boss.combatEntities[0].hp=hp;window.renderSample();},hp);
      assert.equal(await page.locator('.castle-daughter meter').first().getAttribute('data-health'),status);
      assert.equal(await page.locator('.castle-daughter meter').first().evaluate(el=>getComputedStyle(el).getPropertyValue('--combat-hp-color').trim()),color);
    }
    await page.evaluate(()=>{window.sampleState.boss.combatEntities[0].hp=300;window.renderSample();});
    assert.equal(await page.locator('#castleItemRibbon [data-item-type="dagger"] .castle-item-count').innerText(),'2/3');
    await activate('#castleItemRibbon [data-item-type="dagger"]');assert.match(await page.locator('#bossIntentHelpText').innerText(),/2\/3 disponíveis · 1 usados · 1 nas filhas/);await page.keyboard.press('Escape');
    await activate('#castleFury');assert.match(await page.locator('#bossIntentHelpText').innerText(),/Cada filha derrotada acrescenta \+10%/);await page.keyboard.press('Escape');
    await page.evaluate(()=>{const d=window.sampleState.boss.combatEntities[0];d.cold=true;d.regeneration=25;d.relicRound=window.sampleState.boss.roundNumber;d.passive={status:'suppressed'};window.renderSample();});
    await activate('[aria-label="Explicar debuff FRIO de Bela"]');
    assert.match(await page.locator('#bossIntentHelpText').innerText(),/Não regenera no próximo/);
    await page.keyboard.press('Escape');
    await page.locator('[aria-label="Explicar debuff ANTICOAGULANTE de Bela"]').focus();await page.keyboard.press('Enter');
    assert.match(await page.locator('#bossIntentHelpText').innerText(),/25 HP por rodada/);await page.keyboard.press('Escape');
    await activate('[aria-label="Explicar debuff RELÍQUIA de Bela"]');
    assert.match(await page.locator('#bossIntentHelpText').innerText(),/Passiva suspensa nesta rodada/);await page.keyboard.press('Escape');
    await page.locator('.castle-sacrifice-card').click();
    const attachedHelp=await page.locator('#bossIntentHelpText').innerText();
    assert.match(attachedHelp,/50 de dano imediato/);assert.match(attachedHelp,/petrifica 100 HP/);
    assert.match(attachedHelp,/fundo do Lixo/);assert.doesNotMatch(attachedHelp,/já foi usado|reutilizável/);
    assert.ok(attachedHelp.length<300);await page.keyboard.press('Escape');
    await page.screenshot({path:resolve(root,`.cache/dimitrescu-ux/castle-${width}.png`),fullPage:true});
    for(const [hp,status] of [[1600,'normal'],[900,'tension'],[400,'danger']]) {
      await page.evaluate(hp=>{window.sampleState.boss.hp=hp;window.renderSample();},hp);
      assert.equal(await page.locator('#bossHpBar').getAttribute('data-health'),status);
    }
    for (const [dead, protection] of [[1,1000],[2,500]]) {
      await page.evaluate(dead=>{window.sampleState.boss.hp=2000;for(let i=0;i<dead;i++){const d=window.sampleState.boss.combatEntities[i];d.hp=0;d.status='dead';}window.renderSample();},dead);
      assert.equal(await page.locator('#bossHpText').innerText(),`${2000+protection} / ${2000+protection}`);
      assert.ok(await page.locator('#castleBloodLink').evaluate(marker=>{
        const track=marker.parentElement.getBoundingClientRect(),r=marker.getBoundingClientRect(),hp=document.getElementById('bossHpBar').getBoundingClientRect();
        return Math.abs(r.right-track.right)<2&&hp.right<=r.left+1&&marker.scrollWidth<=marker.clientWidth+1;
      }), 'protection appended to the right, without overlaying HP or overflowing');
    }
    await page.evaluate(()=>{for(const d of window.sampleState.boss.combatEntities){d.hp=0;d.status='dead';}window.renderSample();});
    assert.equal(await page.locator('.castle-daughter.is-dead').count(),3);assert.equal(await page.locator('#castleFury').innerText(),'FÚRIA FINAL');assert.ok(await page.locator('#castleBloodLink').isHidden());
    await activate('#castleFury');assert.match(await page.locator('#bossIntentHelpText').innerText(),/cura da Lady \+30% e \+6 Sede/);await page.keyboard.press('Escape');
    await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.resetSample());
    const chipStyles=await page.evaluate(()=>{
      const results=[];
      for(const boss of ['nemesis','nehelenia','dimitrescu']) {
        document.body.dataset.bossId=boss;
        const card=document.createElement('article');card.className='boss-daughter-card boss-combat-entity castle-daughter boss-nehelenia-attendant-card is-active';
        card.style.cssText='position:relative;width:200px;height:140px;';
        const group=document.createElement('div');group.className='boss-combat-chips';
        const chip=document.createElement('small');chip.className='boss-daughter-state';chip.textContent='ATIVO';group.append(chip);card.append(group);
        document.body.append(card);
        const metrics=el=>{const s=getComputedStyle(el);return {font:s.fontSize,height:el.getBoundingClientRect().height,padding:s.padding,radius:s.borderRadius,color:s.color,background:s.backgroundColor};};
        results.push(metrics(chip));
        if(boss==='nehelenia') {
          const context=document.createElement('small');context.className='boss-attendant-context-line is-persistent';context.textContent='PERSISTE';card.append(context);
          results.push(metrics(context));
        }
        card.remove();
      }
      document.body.dataset.bossId='dimitrescu';return results;
    });
    for(const style of chipStyles) assert.deepEqual(style,chipStyles[0], 'status/context chips share Nemesis sizing, shape and active colors');
    assert.equal(chipStyles[0].font,width<=650?'7px':'8px');assert.ok(chipStyles[0].height>=16);
    await page.evaluate(()=>window.resetSample(true));
    assert.equal(await page.evaluate(()=>window.sampleState.boss.castleSelectedDaughterIds.length),1);
    assert.equal(await page.locator('.castle-passive-chip').count(),3);
    assert.ok(await page.locator('.castle-passive-chip.is-highlighted').count()<=1);
    assert.ok(await page.locator('.castle-passive-chips').evaluateAll(groups=>groups.every(group=>group.childElementCount===2)));
    assert.deepEqual(await page.locator('.castle-passive-indicator').allTextContents(),['PASSIVA','PASSIVA','PASSIVA']);
    assert.equal(await page.locator('.castle-passive-indicator.is-highlighted').count(),1,'only the chosen daughter has a painted PASSIVA indicator');
    await activate('.castle-passive-indicator.is-highlighted');
    assert.match(await page.locator('#bossIntentHelpText').innerText(),/\+3 Sede/);await page.keyboard.press('Escape');
    const stateBeforeHelp=await page.evaluate(()=>JSON.stringify(window.sampleState));
    for(const [id,rule] of [['bela',/carta que o alvo pode jogar legalmente.*Falha: \+3 Sede/s],['cassandra',/contribuição legal.*fim da rodada.*Falha: \+3 Sede/s],['daniela',/retirada efetiva.*uma única vez.*Monte não ativa/s]]) {
      await activate('.castle-daughter[data-entity-id="'+id+'"] .castle-passive-chip');
      assert.match(await page.locator('#bossIntentHelpText').innerText(),rule);
      await page.keyboard.press('Escape');
    }
    assert.equal(await page.evaluate(()=>JSON.stringify(window.sampleState)),stateBeforeHelp,'chip help does not change targets or mechanics');
    const neutral=await page.locator('.castle-passive-chip:not(.is-highlighted)').first().evaluate(el=>{
      const s=getComputedStyle(el);return {color:s.color,height:el.getBoundingClientRect().height,font:s.fontSize};
    });
    assert.equal(neutral.color,'rgb(209, 206, 210)');assert.equal(neutral.height,16);
    assert.equal(neutral.font,width<=650?'7px':'8px');
    await page.evaluate(()=>window.forceThreeSample());
    assert.equal(await page.locator('.castle-passive-chip.is-highlighted').count(),3);
    assert.equal(await page.locator('.castle-passive-indicator.is-highlighted').count(),3,'As Três Filhas is the existing simultaneous exception');
    assert.match(await page.locator('[data-entity-id="bela"] .castle-passive-chip').innerText(),/^CAÇADA · /);
    assert.equal(await page.locator('[data-entity-id="cassandra"] .castle-passive-chip').innerText(),'BANQUETE · JOGO 1');
    assert.equal(await page.locator('[data-entity-id="daniela"] .castle-passive-chip').innerText(),'LIXO +3');
    await page.screenshot({path:resolve(root,'.cache/dimitrescu-ux/passive-chips-'+width+'.png'),fullPage:true});
    await page.evaluate(()=>{
      for(const [i,d] of window.sampleState.boss.combatEntities.entries())d.passive.status=['success','failed','triggered'][i];
      window.renderSample();
    });
    assert.deepEqual(await page.locator('.castle-passive-chip').allTextContents(),['CAÇADA','BANQUETE','LIXO +3']);
    assert.equal(await page.locator('.castle-passive-chip.is-highlighted').count(),3,'tint follows the chosen daughters for this round, not the pending result');
    assert.equal(await page.locator('.boss-combat-chips').evaluateAll(groups=>groups.some(group=>/SEM PUNIÇÃO|REGEN \+50|AGUARDANDO|INATIVA/.test(group.textContent))),false);
    const selection=await page.evaluate(()=>JSON.stringify(window.sampleState.boss.castleSelectedDaughterIds));
    for(let i=0;i<3;i++)await page.evaluate(()=>window.renderSample());
    assert.equal(await page.evaluate(()=>JSON.stringify(window.sampleState.boss.castleSelectedDaughterIds)),selection);
    await page.evaluate(()=>window.startEmptySample());
    const chosen=await page.evaluate(()=>window.sampleState.boss.castleSelectedDaughterIds[0]);
    assert.equal(await page.locator('.castle-passive-chip').count(),3,'empty table/discard do not hide passive identities');
    assert.equal(await page.locator('.castle-passive-chip.is-highlighted').count(),1);
    assert.equal(await page.locator('.castle-passive-indicator.is-highlighted').count(),1);
    assert.equal(await page.locator('[data-entity-id="'+chosen+'"] .castle-passive-chip.is-highlighted').count(),1,'selected daughter is tinted even without a legal objective');
    await page.evaluate(()=>{
      const s=window.sampleState,selected=s.boss.castleSelectedDaughterIds[0];
      s.boss.castleSelectedDaughterIds=[s.boss.combatEntities.find(d=>d.id!==selected).id];window.renderSample();
    });
    const nextChosen=await page.evaluate(()=>window.sampleState.boss.castleSelectedDaughterIds[0]);
    assert.equal(await page.locator('[data-entity-id="'+chosen+'"] .castle-passive-chip.is-highlighted').count(),0,'previous pending/idle passive must not dictate the tint');
    assert.equal(await page.locator('[data-entity-id="'+nextChosen+'"] .castle-passive-chip.is-highlighted').count(),1,'selection-only update repaints the correct chip');
    assert.deepEqual(errors,[]);console.log(`PASS Dimitrescu ${width}px: arts, targets, item sacrifice, help, viewport, reduced motion`);await context.close();
  }
}finally{await browser?.close();await new Promise(done=>server.close(done));}
