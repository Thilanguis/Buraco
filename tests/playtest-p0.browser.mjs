import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { runSpecialPresentationCases } from './cooperative-special-presentation.browser-cases.mjs';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const baseline=process.env.P0_BASELINE==='1';
const source = baseline ? execFileSync('git',['show','HEAD:app.js'],{cwd:root,encoding:'utf8'}) : await readFile(resolve(root,'app.js'),'utf8');
const extract = (start,end) => source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const helpers = extract('function closeBossIntentHelp(', '\nfunction syncBossDiscardHelp(');
const discardHelp = extract('function syncBossDiscardHelp(', '\nfunction renderBossCombatPanel(');
const hand = extract('function renderHand()', '\nfunction seatForPlayer(');
const combat = extract('function renderBossCombatPanel(', '\nfunction renderBossHud(');
const strip = extract('function renderBossDaughterStrip(', '\nfunction bossFlowHostIndex(');
const timers = extract('function updateTimerLabel()', '\nlet committing = false;') + extract('let activeTurnNumber = -1;', '\nasync function recoverTimedOutBotTurn(');
const duration = extract('let matchDurationTimer = null;', '\nfunction canActivateDominationDecree(');
const blood = extract('function applyDimitrescuBloodScatter(', '\nfunction syncDimitrescuDeadPileVisual(');
const rich = extract('function renderBossHudRichText(', '\nfunction renderBossRangeMeters(');
const specialHandlers = extract('window.bossSpecialOperationPending = false;', '\nfunction passTurn(');
const discardStart=source.indexOf('  const discardButton = document.getElementById(\'drawDiscardBtn\');',source.indexOf('function renderBossHud('));
const discard=source.slice(discardStart,source.indexOf('\n  const event = resolvingEvent ||',discardStart));
const base = (await readFile(resolve(root,'index.html'),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('class="account-pending"','');
const fixture = base.replace('</body>',`<script type="module">
import * as engine from '/js/boss/boss-engine.js';
import { ITEM_DEFINITIONS, normalizeCastle } from '/js/boss/dimitrescu-castle.js';
import * as castleView from '/js/boss/ui/dimitrescu-castle-view.js';
const { renderCastleHud, castleItemHelp, castleItemChip, danielaDiscardActive }=castleView;
import { getBossUiAdapter } from '/js/boss/ui/boss-ui-registry.js';
import { getBossDefinition } from '/js/boss/boss-registry.js';
import { buildBossAbilityHelp, buildBossActionPresentation } from '/js/boss/boss-presentation.js';
import { buildBossDebugScenario, getBossDebugCatalog } from '/js/boss/boss-debug-scenarios.js';
import { cardFrontHTML, suitClass, deckFaceClass } from '/js/game/card-face.js';
import { createDeck } from '/js/deck.js';
import { createActionGate } from '/js/game/match-control.js';
import { renderCooperativeSpecial, presentCooperativeSpecial } from '/js/boss/ui/cooperative-special-ui.js';
import { createCooperativeSpecialPresenter, SPECIAL_PROTECTED_SELECTOR } from '/js/boss/ui/cooperative-special-presentation.js';
import { saveBossSpecialTransaction, sameBossRevision, bossStateRevision } from '/js/game/boss-state-transaction.js';
import { createUndoTransaction } from '/js/game/undo-transaction.js';
const { createBossState, distributeCastleItems, getBossPhaseProgress, canUseCastleItem, useCastleItem, getCastleItemUseStatus,
  getBossPendingChoice, getBossCardEffect, getBossCardBlockFeedback, isBossMode, isBossTurnActive, setBossDamageTarget, isBossDiscardBlocked,
  canBossPerformCommonAction, activateBossSpecial, getBossSpecialUseStatus }=engine;
const prepareMatchHistory=async()=>()=>{};
const game=document.getElementById('gameSection');document.body.replaceChildren(game);game.style.display='flex';game.style.height='100vh';game.style.animation='none';
for(const el of game.children)if(!el.matches('.board'))el.style.display='none';
document.body.classList.add('boss-mode');document.body.dataset.deckTheme='resident';document.body.dataset.tableTheme='dimitrescu';
let state,myPlayerIndex=0,committing=false,selectedMeldTarget=null,selectedBossCollateralChoiceId,selectedBossCollateralCardId,matchSequence=0;
let turnTimerId=null,turnTimerRemaining=60,timeoutCalls=0,watchdogCalls=0,undo;
let pendingCommit=false,localUndoStack=[],ignoreOwnActionId,actionSequence=0;
const db={},gameRef={};window.gameSessionId=1;
const captureUndoUiState=()=>({}),getRect=el=>el.getBoundingClientRect();
const opponentAnchorRect=()=>document.getElementById('opponentRight').getBoundingClientRect();
const runTransaction=async(_db,operation)=>{
  for(let n=0;n<10;n++){
    const json=window.specialRead?await window.specialRead():JSON.stringify(state);let write;
    const result=await operation({get:async()=>({exists:()=>true,data:()=>({stateJson:json})}),update:(_ref,data)=>{write=data.stateJson;}});
    if(!write)return result;
    if(!window.specialWrite||await window.specialWrite(json,write))return result;
  }throw Error('transaction retries exhausted');
};
const selectedHandIndexes=new Set(), pendingStockCardIds=new Set(),bossSwapReceivedHighlights=new Map(),localActionGate=createActionGate();
const pauseBlocksPlay=s=>!!s.pauseControl?.paused,isBossLabAutomationPaused=()=>false,isDominationFriendBusy=()=>false,isDominationFriendTurn=()=>false,friendOperationPending=false;
const hasPendingBossChoices=s=>!!s?.boss?.pendingChoices?.length;
const canPerformCommonGameAction=()=>!state.finished&&!isBossTurnActive(state)&&!hasPendingBossChoices(state);
const ensureCardId=()=>{},activeMatriarchTargetPlayerIds=()=>new Set(),renderMelds=()=>{},showPendingBossChoiceMessage=()=>{};
const audioCtx=null,playTone=()=>{},autoPlayTimeout=async()=>{timeoutCalls++;},recoverTimedOutBotTurn=async()=>{watchdogCalls++;};
const showMessage=()=>{};
const saveStateForUndo=()=>{undo=structuredClone(state);},newActionId=()=>String(++actionSequence),flyRectToRect=async()=>{};
const commitState=async()=>{await window.deliverSnapshot?.(JSON.stringify(state));};
${helpers}
${discardHelp}
${combat}
${strip}
${hand}
${timers}
${duration}
${blood}
${rich}
${specialHandlers}
function renderAll(){
  const boss=state.boss,hud=document.getElementById('bossHud');document.body.dataset.bossId=boss.id;
  hud.style.display='grid';document.getElementById('bossName').textContent=getBossDefinition(boss.id).name;
  document.getElementById('bossPortraitImage').src='/'+getBossDefinition(boss.id).portrait;
  document.getElementById('bossDangerMeter').classList.toggle('boss-blood-meter',boss.id==='dimitrescu');
  document.getElementById('bossDangerLabel').textContent=boss.id==='dimitrescu'?'SEDE DE SANGUE':'INFECÇÃO';
  document.getElementById('bossDebtText').textContent=boss.danger+' / 100';document.getElementById('bossIntentName').textContent='Objetivo da rodada';
  const presentation=buildBossActionPresentation(state);
  document.getElementById('bossIntentName').textContent=presentation.name;
  renderBossHudRichText(document.getElementById('bossIntentDescription'),presentation.instruction);
  renderBossHudRichText(document.getElementById('bossIntentProgress'),[presentation.progress,presentation.consequence].filter(Boolean).join('\\n'));
  renderBossDetailFields(document.getElementById('bossActionDetails'),presentation.details || []);
  renderBossPhaseAndHealth(state,getBossPhaseProgress(state));renderBossCombatPanel(hud,boss);renderBossDaughterStrip(getBossDefinition(boss.id),boss);
  ${discard}
  const top=state.discard.at(-1);document.getElementById('discardFace').innerHTML=cardFrontHTML(top);
  document.getElementById('discardFace').style.display=top?'flex':'none';
  renderHand();syncBossIntentHelp(state);startTurnTimerIfNeeded();
  renderCooperativeSpecial({document,state,canActivate:canActivateCooperativeSpecial,onActivate:useCooperativeSpecial,
    getUseStatus:recipientId=>getBossSpecialUseStatus(state,{actorId:state.players[myPlayerIndex].id,recipientId})});
  syncBossDiscardHelp(true);
}
function reset(bossId='dimitrescu'){
  cooperativeSpecialPresenter.cancel();
  const deck=createDeck(['♠','♥','♦','♣'],['A','2','3','4','5','6','7','8','9','10','J','Q','K']);
  const boss=createBossState(bossId,834);if(bossId==='dimitrescu')distributeCastleItems(boss,deck);boss.bossFlow={stage:'players'};
  const chosen=bossId==='dimitrescu'?Object.keys(ITEM_DEFINITIONS).flatMap(type=>deck.filter(c=>c.castleItem?.type===type).slice(0,2)):deck.slice(0,10);
  const remaining=deck.filter(c=>!chosen.includes(c));
  state={mode:getBossDefinition(bossId).mode,matchStartedAt:++matchSequence,currentPlayer:0,turnNumber:1,hasDrawnThisTurn:true,finished:false,boss,
    players:[{id:0,name:'Biel',teamId:0,hand:chosen.filter((c,i)=>i%2===0).concat(remaining.splice(0,5))},{id:1,name:'Luana',teamId:0,hand:chosen.filter((c,i)=>i%2===1).concat(remaining.splice(0,5))}],
    teams:[{id:0,melds:[]},{id:1,melds:[]}],stock:remaining,discard:[],deadPiles:[],deadChunksTaken:[0,0]};
  cooperativeSpecialPresenter.observe(state,{initial:true});selectedHandIndexes.clear();renderAll();return state;
}
window.p0={reset,state:()=>state,render:renderAll,observer:i=>{myPlayerIndex=i;renderAll();},
  special:useCooperativeSpecial,specialUndo:()=>{cooperativeSpecialPresenter.cancel();state=structuredClone(localUndoStack.at(-1).state);state.lastAction={id:'test-undo',type:'undoMove'};renderAll();},
  specialCancel:()=>cooperativeSpecialPresenter.cancel(),specialReplay:()=>animateCooperativeSpecial(state.lastAction),
  catalog:()=>getBossDebugCatalog().flatMap(b=>getBossDefinition(b.id).abilities.flatMap(a=>a.phases.map(phase=>({bossId:b.id,abilityId:a.id,phase})))),
  sample:options=>{state=buildBossDebugScenario(null,{...options,variant:'interactive',target:'auto'}).state;engine.selectNextBossIntent(state,{debug:true});renderAll();},
  receive:s=>{const next=JSON.parse(s),event=observeCooperativeSpecialSnapshot(next);state=next;selectedHandIndexes.clear();renderAll();if(event)void animateCooperativeSpecial(event);},undo:()=>{state=structuredClone(undo);renderAll();},
  selected:()=>[...selectedHandIndexes],timer:()=>({turnTimerId,turnTimerRemaining,timeoutCalls,watchdogCalls}),
  close:closeBossIntentHelp,resetTimer:resetTurnTimer,
  chip:caption=>{const button=createBossCombatHelp('Teste de referência','Carta', 'Use Q♥ em um jogo. · Falha: +3 Sede.',caption);const parent=[...document.querySelectorAll('.boss-combat-chips, .boss-attendant-context')].find(el=>el.getBoundingClientRect().width>0);button.classList.add(parent.classList.contains('boss-attendant-context')?'boss-attendant-context-line':'boss-daughter-state');parent.append(button);return button;},
  effectChip:caption=>{const group=document.getElementById('bossEffects');document.getElementById('bossHud').append(group);group.style.display='flex';const chip=document.createElement('span');chip.className='boss-effect-chip';chip.textContent=caption;group.append(chip);renderBossEffectChipReferences();return chip;},
  clockStart:()=>{state.matchStartedAt=Date.now();renderMatchDuration();},
  reload:()=>{state=structuredClone(state);renderAll();},share:()=>commitState()};
reset();
</script></body>`);
const browser=await chromium.launch({channel:'msedge',headless:true});
const evidence=resolve(root,'.cache/playtest-p0');await mkdir(evidence,{recursive:true});
try{
  for(const [width,height] of [[1024,768],[1376,1032],[1920,1080],[390,844]].filter(([width])=>!process.env.P0_WIDTH||width===Number(process.env.P0_WIDTH))){
    const context=await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'});
    await context.route('**/*',async route=>{
      const u=new URL(route.request().url());if(u.origin!=='http://p0.test')return route.abort();
      if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:fixture});
      if(u.pathname==='/video'){
        const bytes=await readFile('C:/Users/gabri/Videos/Captures/Buraco – Firebase - Google Chrome 2026-10-10 09-54-04.mp4');
        const range=route.request().headers().range?.match(/bytes=(\d+)-(\d*)/);
        const start=range?Number(range[1]):0,end=range&&range[2]?Number(range[2]):bytes.length-1;
        return route.fulfill({status:range?206:200,contentType:'video/mp4',headers:{'accept-ranges':'bytes',...(range?{'content-range':`bytes ${start}-${end}/${bytes.length}`}:{})},body:bytes.subarray(start,end+1)});
      }
      try{return route.fulfill({body:baseline&&u.pathname.endsWith('.css')?execFileSync('git',['show','HEAD:'+u.pathname.slice(1)],{cwd:root}):await readFile(resolve(root,'.'+decodeURIComponent(u.pathname))),contentType:u.pathname.endsWith('.js')?'text/javascript':u.pathname.endsWith('.css')?'text/css':'image/png'});}catch{return route.abort();}
    });
    const a=await context.newPage(),b=await context.newPage(),errors=[];for(const page of[a,b])page.on('pageerror',e=>errors.push({message:e.message,stack:e.stack,name:e.name,string:String(e)}));
    await a.goto('http://p0.test/');await b.goto('http://p0.test/');
    try {await a.waitForFunction(()=>window.p0,{},{timeout:5000});await b.waitForFunction(()=>window.p0,{},{timeout:5000});} catch(e){console.log(errors);throw e;}
    await b.evaluate(()=>p0.observer(1));
    await a.exposeFunction('deliverSnapshot',s=>b.evaluate(s=>p0.receive(s),s));
    await b.exposeFunction('deliverSnapshot',s=>a.evaluate(s=>p0.receive(s),s));
    let specialJson=null;
    for(const page of[a,b]){
      await page.exposeFunction('specialRead',()=>specialJson);
      await page.exposeFunction('specialWrite',(previous,next)=>{if(specialJson!==previous)return false;specialJson=next;return true;});
    }
    await runSpecialPresentationCases({a,b,width,height,evidence,setSnapshot:json=>{specialJson=json;},getSnapshot:()=>specialJson});
    if(process.env.SPECIAL_VISUAL_ONLY==='1'){assert.deepEqual(errors,[]);await context.close();continue;}
    for(const bossId of ['banker','dominadora','matriarca_esmeralda','dimitrescu','nehelenia','nemesis']){
      specialJson=await a.evaluate(id=>{const s=p0.reset(id);s.discard.push(...s.stock.splice(-15));s.boss.cooperativeSpecial.points=200;s.hasDrawnThisTurn=false;p0.render();return JSON.stringify(s);},bossId);
      await b.evaluate(json=>p0.receive(json),specialJson);
      const geometry=await a.evaluate(()=>{
        const button=document.querySelector('.boss-special-button'),r=button.getBoundingClientRect(),x=document.getElementById('endGameBtn').getBoundingClientRect();
        return {width:r.width,height:r.height,inside:!document.getElementById('bossHud').contains(button)&&r.left>=x.right&&r.left-x.right<=12&&Math.abs((r.top+r.height/2)-(x.top+x.height/2))<=8&&r.right<=innerWidth,
          hit:button.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),cover:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML.slice(0,300),rect:{x:r.x,y:r.y},zoom:visualViewport.scale};
      });
      assert.equal(geometry.inside,true,JSON.stringify({width,bossId,geometry}));assert.equal(geometry.hit,true,JSON.stringify({width,bossId,geometry}));assert.equal(geometry.zoom,1);
      assert.equal(geometry.height,16);assert.ok(geometry.width>=92&&geometry.width<=100);
      await a.locator('.boss-special-button').tap();
      assert.match(await a.locator('#bossSpecialPopover').innerText(),/25 pontos/);
      await a.keyboard.press('Escape');assert.equal(await a.locator('#bossSpecialPopover').count(),0);
      await a.locator('.boss-special-button').focus();await a.keyboard.press('Enter');
      await a.screenshot({path:resolve(evidence,'special-'+bossId+'-'+width+'.png'),fullPage:true});
      await a.keyboard.press('Escape');
      const before=JSON.parse(specialJson),results=await Promise.all([a.evaluate(()=>p0.special(0)),b.evaluate(()=>p0.special(1))]);
      const saved=JSON.parse(specialJson);
      assert.equal(saved.boss.cooperativeSpecial.points,100);assert.equal(saved.discard.length,before.discard.length-5);assert.equal(saved.stock.length,before.stock.length);
      assert.equal(saved.boss.cooperativeSpecial.activations,1);assert.equal(saved.hasDrawnThisTurn,false);
      await a.evaluate(json=>p0.receive(json),specialJson);await b.evaluate(json=>p0.receive(json),specialJson);
      assert.deepEqual(await a.evaluate(()=>p0.state().boss.cooperativeSpecial),await b.evaluate(()=>p0.state().boss.cooperativeSpecial));
      await a.evaluate(()=>p0.special(1));assert.equal(JSON.parse(specialJson).boss.cooperativeSpecial.activations,2);
      assert.equal(await a.evaluate(()=>window.bossSpecialOperationPending),false);
      await a.waitForFunction(()=>!document.querySelector('.boss-special-flight'));
      const nodes=await a.evaluate(()=>document.querySelectorAll('.boss-special-flight').length);assert.equal(nodes,0);
      await a.evaluate(()=>{const s=p0.state();s.boss.cooperativeSpecial.points=100;s.stock.push(...s.discard.splice(4));p0.render();});
      await a.locator('.boss-special-button').tap();
      assert.match(await a.locator('#bossSpecialPopover').innerText(),/precisa ter 5 cartas/);
      assert.equal(await a.locator('.boss-special-choices button:disabled').count(),2);
      await a.keyboard.press('Escape');
      console.log('Special real browser / transaction retry double:',width,bossId,geometry,'PASS');
    }
    await a.evaluate(()=>{const s=p0.reset('dominadora');s.discard.push(...s.stock.splice(-8));s.boss.cooperativeSpecial.points=100;s.boss.chainsByPlayer[1]=4;p0.render();});
    await a.locator('.boss-special-button').tap();
    const recipients=a.locator('.boss-special-choices button');
    assert.equal(await recipients.nth(0).isEnabled(),true);
    assert.equal(await recipients.nth(1).isDisabled(),true);
    assert.match(await recipients.nth(1).getAttribute('title'),/bloqueou/);
    await a.keyboard.press('Escape');
    await a.bringToFront();
    const animatic=await a.evaluate(async()=>{
      const {presentCooperativeSpecial}=await import('/js/boss/ui/cooperative-special-ui.js');
      const rect={left:20,top:20,width:30,height:50},durations=[];let peak=0;
      const before=document.querySelectorAll('*').length;
      const heapBefore=performance.memory?.usedJSHeapSize ?? null;
      for(let i=0;i<20;i++){
        const start=performance.now(),flight=presentCooperativeSpecial({document,from:rect,to:{...rect,left:250,top:500},count:5,bossId:p0.state().boss.id,reducedMotion:false});
        peak=Math.max(peak,document.querySelectorAll('.boss-special-flight').length);await flight;durations.push(performance.now()-start);
      }
      await presentCooperativeSpecial({document,from:rect,to:rect,count:5,reducedMotion:true});
      return {before,after:document.querySelectorAll('*').length,peak,residual:document.querySelectorAll('.boss-special-flight').length,
        heapBefore,heapAfter:performance.memory?.usedJSHeapSize ?? null,maxDurationMs:Math.max(...durations)};
    });
    assert.equal(animatic.before,animatic.after);assert.equal(animatic.peak,5);assert.equal(animatic.residual,0);
    console.log('Animatic desktop/tablet/mobile emulated, 20 cycles:',width,JSON.stringify(animatic));
    await a.evaluate(()=>p0.reset());await b.evaluate(()=>p0.reset());
    await a.screenshot({path:resolve(evidence,(baseline?'before':'after')+'-'+width+'.png'),fullPage:true});
    const geometry=await a.evaluate(()=>{
      const hud=document.getElementById('bossHud').getBoundingClientRect(),panel=document.getElementById('dimitrescuCastlePanel').getBoundingClientRect();
      const buttons=[...document.querySelectorAll('#handContainer .castle-use-item')];
      return {hudBottom:hud.bottom,panelTop:panel.top,intentBottom:document.getElementById('bossIntent').getBoundingClientRect().bottom,
        hits:buttons.map(el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {id:el.closest('[data-card-id]').dataset.cardId,hit:el===hit||el.contains(hit)};})};
    });
    console.log(JSON.stringify({width,baseline,geometry,errors}));
    if(baseline){
      // Changing a marker on an existing physical card used to serialize away
      // the item onclick, while the neighboring unchanged Relíquia still worked.
      const result=await a.evaluate(()=>{
        const s=p0.state(),c=s.players[0].hand.find(c=>c.castleItem?.type==='explosive');s.boughtCardIds=[c.id];p0.render();
        const item=document.querySelector('[data-card-id="'+c.id+'"] .castle-use-item');item.click();
        return {hasHandler:typeof item.onclick==='function',opened:!document.getElementById('bossIntentHelpPopover').hidden};
      });console.log('baseline explosive after rerender',result);assert.equal(result.hasHandler,false);
      if(width===1024){
        const v=await context.newPage();await v.goto('http://p0.test/');
        await v.evaluate(()=>{document.body.innerHTML='<video src="/video" muted style="width:100%;height:auto"></video>';});
        await v.waitForFunction(()=>document.querySelector('video').readyState>=2);
        for(const t of [3,9,12]){
          await v.evaluate(t=>new Promise(done=>{const el=document.querySelector('video');el.onseeked=done;el.currentTime=t;}),t);
          await v.evaluate(async()=>{const video=document.querySelector('video');await video.play();await new Promise(done=>setTimeout(done,200));video.pause();});
          console.log('video frame',await v.evaluate(()=>({time:document.querySelector('video').currentTime,duration:document.querySelector('video').duration})));
          await v.screenshot({path:resolve(evidence,'video-'+t+'.png'),fullPage:true});
        }await v.close();
      }
    }
    if(!baseline){
      assert.deepEqual(errors,[]);assert.ok(geometry.panelTop>=geometry.hudBottom-1);assert.ok(geometry.intentBottom<=geometry.hudBottom+1);
      assert.ok(geometry.hits.every(h=>h.hit),'all item icons reachable without selection');
      assert.equal(await a.locator('#handContainer .carta:has(.castle-use-item)').first().evaluate(el=>getComputedStyle(el).marginRight),
        await a.locator('#handContainer .carta:not(:has(.castle-use-item))').first().evaluate(el=>getComputedStyle(el).marginRight),'item cards keep the original hand overlap');
      // Both mouse and actual touch on adjacent items; card selection remains separate.
      for(const type of ['explosive','relic','cold_flask','dagger','anticoagulant']){
        const selector='#handContainer .castle-use-item[data-item-type="'+type+'"]';
        if(!await a.locator(selector).count())continue;
        const expected={explosive:'100 DANO · SANGRA 15',relic:'DANO +20%',cold_flask:'CONGELA AS 3',dagger:'VÍNCULO 80%',anticoagulant:'REGEN 20→10'};
        assert.ok((await a.locator(selector+' .castle-use-caption').allTextContents()).every(t=>t===expected[type]));
        const captionGeometry=await a.locator(selector+' .castle-use-caption').evaluateAll(labels=>labels.map(el=>{
          const r=el.getBoundingClientRect(),c=el.closest('.carta').getBoundingClientRect();
          const text=document.createRange();text.selectNodeContents(el);
          const visible=[...text.getClientRects()].every(t=>{
            const hit=document.elementFromPoint(t.right-1,(t.top+t.bottom)/2);
            return !hit || el.closest('.carta').contains(hit);
          });
          return {text:el.textContent,width:r.width,scroll:el.scrollWidth,client:el.clientWidth,visible,
            inside:r.top>=c.top+c.height*.25&&r.bottom<=c.bottom+1};
        }));
        assert.ok(captionGeometry.every(r=>r.inside&&r.scroll<=r.client+1&&r.visible), 'caption remains below rank/suit, contained and readable at zoom 1: '+JSON.stringify(captionGeometry));
        await a.locator(selector+' .castle-use-caption').first().tap();
        assert.equal(await a.locator('#bossIntentHelpPopover').isVisible(),true);assert.deepEqual(await a.evaluate(()=>p0.selected()),[]);await a.keyboard.press('Escape');
        for(const method of ['click','tap']){
          await a.locator(selector).first()[method]();assert.equal(await a.locator('#bossIntentHelpPopover').isVisible(),true);
          assert.match(await a.locator('#bossIntentHelpText').innerText(),/Petrifica/);assert.deepEqual(await a.evaluate(()=>p0.selected()),[]);
          await a.keyboard.press('Escape');
        }
      }
      const card=a.locator('#handContainer .carta').first();
      await card.scrollIntoViewIfNeeded();
      await card.tap({position:{x:4,y:4}});
      assert.equal((await a.evaluate(()=>p0.selected())).length,1);
      await card.tap({position:{x:4,y:4}});assert.deepEqual(await a.evaluate(()=>p0.selected()),[]);
      // Interleave item and ordinary cards, then reverse physical order. Even a
      // selected neighbour must not intercept the other card's item control.
      await a.evaluate(()=>{const s=p0.state(),hand=s.players[0].hand,items=hand.filter(c=>c.castleItem),plain=hand.filter(c=>!c.castleItem);s.players[0].hand=items.flatMap((c,i)=>[c,plain[i]]);p0.render();});
      const plain=a.locator('#handContainer .carta:not(:has(.castle-use-item))').first();await plain.tap({position:{x:4,y:4}});
      for(const type of ['explosive','relic','cold_flask','dagger','anticoagulant']){
        await a.locator('#handContainer [data-item-type="'+type+'"]').tap();assert.equal(await a.locator('#bossIntentHelpPopover').isVisible(),true);await a.keyboard.press('Escape');
      }
      await a.evaluate(()=>{p0.state().players[0].hand.reverse();p0.render();});
      for(const type of ['explosive','relic']){await a.locator('#handContainer [data-item-type="'+type+'"]').click();assert.equal(await a.locator('#bossIntentHelpPopover').isVisible(),true);await a.keyboard.press('Escape');}
      await a.evaluate(()=>p0.reset());
      // A marker change on a reused card must retain the live item listener.
      await a.evaluate(()=>{const s=p0.state();s.boughtCardIds=[s.players[0].hand.find(c=>c.castleItem?.type==='explosive').id];p0.render();});
      await a.locator('#handContainer [data-item-type="explosive"]').tap();assert.equal(await a.locator('#bossIntentHelpPopover').isVisible(),true);
      await a.locator('.castle-item-targets button').filter({hasText:'Bela'}).click();
      await b.waitForFunction(()=>p0.state().boss.combatEntities[0].sacrificedCards.length===1);
      assert.equal(await b.evaluate(()=>p0.state().boss.combatEntities[0].hp),350);
      await a.evaluate(async()=>{p0.undo();await p0.share();});
      assert.equal(await b.evaluate(()=>p0.state().boss.combatEntities[0].hp),500);
      // Both humans use a flask on Cassandra on successive turns.
      await a.locator('#handContainer [data-item-type="cold_flask"]').tap();await a.locator('.castle-item-targets button').filter({hasText:'Cassandra'}).tap();
      await b.waitForFunction(()=>p0.state().boss.castleFreeze?.remainingTurns===2);
      await a.evaluate(async()=>{p0.state().currentPlayer=1;p0.state().turnNumber++;p0.render();await p0.share();});
      await b.locator('#handContainer [data-item-type="cold_flask"]').click();await b.locator('.castle-item-targets button').filter({hasText:'Cassandra'}).tap();
      await a.waitForFunction(()=>p0.state().boss.castleFreeze?.remainingTurns===2);
      assert.equal(await a.locator('.castle-daughter.is-frozen').count(),3);
      assert.equal(await b.locator('.castle-freeze-chip').count(),3);
      for(const label of ['Bela','Cassandra','Daniela']) {
        await a.locator('[aria-label="Explicar debuff CONGELADA de '+label+'"]').tap();
        assert.match(await a.locator('#bossIntentHelpText').innerText(),/turnos restantes/);await a.keyboard.press('Escape');
      }
      await a.screenshot({path:resolve(root,'.cache/playtest-p0/freeze-'+width+'.png'),fullPage:true});
      await a.emulateMedia({reducedMotion:'reduce'});
      assert.equal(await a.locator('.castle-daughter.is-frozen').first().evaluate(el=>getComputedStyle(el,'::after').animationName),'none');
      await a.emulateMedia({reducedMotion:'no-preference'});
      await b.evaluate(()=>p0.reload());
      assert.equal(await b.evaluate(()=>p0.state().boss.combatEntities[1].maxHp),300);
      // Legitimate disablement is explained; it must not select/consume a card.
      await b.evaluate(()=>{p0.state().hasDrawnThisTurn=false;p0.render();});
      await b.locator('#handContainer [data-item-type="relic"]').tap();
      assert.match(await b.locator('.castle-item-targets').innerText(),/Termine a compra/);
      assert.equal(await b.locator('.castle-item-targets button:disabled').count(),3);
      await b.evaluate(()=>p0.close());
      // Trash face uses the same item art styling, including after reload.
      await a.evaluate(()=>{p0.reset();const s=p0.state(),c=s.players[0].hand.pop();s.discard.push(c);const item=s.players[0].hand.find(c=>c.castleItem?.type==='explosive');s.players[0].hand.splice(s.players[0].hand.indexOf(item),1);s.discard.push(item);p0.reload();});
      assert.equal(await a.locator('#discardFace .castle-item-overlay').count(),1);
      assert.equal(await a.locator('#discardFace .castle-item-overlay').evaluate(el=>getComputedStyle(el).position),'absolute');
      // Daniela's permanent passive, not the removed legacy intent, drives the marker.
      for(const status of ['active','triggered','suppressed','idle']){
        await a.evaluate(status=>{const s=p0.state();s.boss.castlePassiveRound=s.boss.roundNumber;s.boss.combatEntities[2].passive={status,round:s.boss.roundNumber};p0.render();},status);
        assert.equal(await a.locator('#drawDiscardBtn').evaluate(el=>el.classList.contains('boss-daniela-discard')),status==='active');
      }
      for(const phase of [2,3]){
        await a.evaluate(phase=>{p0.reset();const s=p0.state();s.boss.phase=phase;s.boss.combatEntities[0].maxHp=300;s.boss.combatEntities[0].hp=125;
          const item=s.players[0].hand.find(c=>c.castleItem?.type==='relic');s.players[0].hand.splice(s.players[0].hand.indexOf(item),1);
          s.boss.castleItems[item.id].consumed=true;item.castleItem.consumed=true;s.boss.combatEntities[0].sacrificedCards.push(item);p0.render();},phase);
        assert.equal(await a.evaluate(()=>{const hud=document.getElementById('bossHud').getBoundingClientRect(),bar=document.getElementById('bossPhaseProgress').getBoundingClientRect();return bar.bottom<=hud.bottom&&document.getElementById('dimitrescuCastlePanel').getBoundingClientRect().top>=hud.bottom;}),true);
      }
      // Rounded hand blood varies per physical card/mark, but not across rerenders.
      await a.evaluate(()=>{const s=p0.reset();s.boss.currentIntent={id:'blood-a',abilityId:'crimson_brand',payload:{marks:s.players[0].hand.slice(0,4).map(c=>({playerId:0,cardId:c.id,status:'active'}))}};p0.render();});
      const bloodMark=a.locator('.boss-card-dimitrescu-blood-mark').first();
      const seedStyle=await bloodMark.getAttribute('style');
      await a.evaluate(()=>p0.render());assert.equal(await bloodMark.getAttribute('style'),seedStyle);
      assert.notEqual(await a.locator('.boss-card-dimitrescu-blood-mark').nth(1).getAttribute('style'),seedStyle);
      const drops=await bloodMark.evaluate(el=>getComputedStyle(el,'::after').backgroundImage);
      assert.match(drops,/radial-gradient/);assert.doesNotMatch(drops,/linear-gradient/);
      await a.screenshot({path:resolve(evidence,'blood-rounded-'+width+'.png'),fullPage:true});
      await a.evaluate(()=>{p0.state().boss.currentIntent.id='blood-b';p0.render();});assert.notEqual(await bloodMark.getAttribute('style'),seedStyle);
      // Fish Eye can have a new objective alongside prior unresolved effects.
      await a.evaluate(()=>{const s=p0.reset('nehelenia');s.boss.currentIntent={id:'fish-now',abilityId:'fish_marked_card',payload:{targetPlayerId:0,cardId:s.players[0].hand[0].id}};
        s.boss.effects=[{id:'nehelenia_fish_dead_card',attendant:'fish',playerId:1,cardId:s.players[1].hand[0].id},{id:'nehelenia_inverted_reflection',attendant:'fish',playerId:0}];p0.render();});
      assert.equal(await a.locator('.boss-attendant-context-line.is-current').count(),1);
      assert.equal(await a.locator('.boss-attendant-context-line.is-persistent').count(),2);
      assert.equal(await a.locator('.boss-attendant-context-line.is-current').innerText(),'BIEL · CARTA MARCADA');
      assert.doesNotMatch((await a.locator('.boss-attendant-context-line').allTextContents()).join(' '),/ATUAL|PERSISTENTE/);
      assert.notEqual(await a.locator('.boss-attendant-context-line.is-current').evaluate(el=>getComputedStyle(el).backgroundColor),
        await a.locator('.boss-attendant-context-line.is-persistent').first().evaluate(el=>getComputedStyle(el).backgroundColor));
      for(const selector of ['.boss-attendant-context-line.is-current','.boss-attendant-context-line.is-persistent']){
        await a.locator(selector).first().tap();assert.equal(await a.locator('#bossIntentHelpPopover').isVisible(),true);await a.keyboard.press('Escape');
        await a.locator(selector).first().focus();await a.keyboard.press('Enter');assert.equal(await a.locator('#bossIntentHelpPopover').isVisible(),true);await a.keyboard.press('Escape');
      }
      await a.screenshot({path:resolve(evidence,'fish-'+width+'.png'),fullPage:true});
      await a.evaluate(()=>{p0.state().boss.currentIntent={id:'hawk-now',abilityId:'hawk_suit',payload:{targetPlayerId:1,suitLabel:'Espadas'}};p0.render();});
      assert.equal(await a.locator('[data-attendant="fish"] .is-current').count(),0);
      assert.equal(await a.locator('[data-attendant="fish"] .is-persistent').count(),2);
      assert.equal(await a.locator('[data-attendant="hawk"] .is-current').count(),1);
      // Existing mirror PNG gets temporary clearance, not a new size.
      const pile=a.locator('.board-middle'),mirror=a.locator('#drawDiscardBtn');
      const beforeMirror=await pile.evaluate(el=>getComputedStyle(el).marginTop);
      await a.evaluate(()=>document.getElementById('drawDiscardBtn').classList.add('boss-nehelenia-seal-preview'));
      assert.notEqual(await pile.evaluate(el=>getComputedStyle(el).marginTop),beforeMirror);
      assert.equal(await mirror.locator('.pile-info').evaluate(el=>getComputedStyle(el).visibility),'hidden');
      assert.equal(await a.locator('#bossDiscardHelpButton').evaluate(el=>getComputedStyle(el).visibility),'visible');
      await a.locator('#bossDiscardHelpButton').tap();assert.equal(await a.locator('#bossIntentHelpPopover').isVisible(),true);await a.keyboard.press('Escape');
      const clearance=await mirror.evaluate(el=>{const r=el.getBoundingClientRect(),css=getComputedStyle(el,'::before');return {frameTop:r.top+parseFloat(css.top)-parseFloat(css.height)/2,frameWidth:parseFloat(css.width),frameHeight:parseFloat(css.height),lineBottom:document.querySelector('.board-melds').getBoundingClientRect().bottom};});
      assert.ok(clearance.frameTop>=clearance.lineBottom+3,JSON.stringify(clearance));
      await a.screenshot({path:resolve(evidence,'mirror-clearance-'+width+'.png'),fullPage:true});
      await a.evaluate(()=>document.getElementById('drawDiscardBtn').classList.remove('boss-nehelenia-seal-preview'));
      assert.equal(await pile.evaluate(el=>getComputedStyle(el).marginTop),beforeMirror);
      await a.evaluate(()=>document.getElementById('bossHud').classList.add('boss-nehelenia-dream-stolen'));
      assert.equal(await a.locator('.boss-portrait').evaluate(el=>getComputedStyle(el,'::after').content),'none');
      // Long names stay inside the actual Nemesis portrait/chips, with full help.
      for(const length of [12,24,40]){
        await a.evaluate(length=>{const s=p0.reset('nemesis');s.players.forEach(p=>p.name='J'.repeat(length));s.boss.starsPlayerId=0;
          for(const e of s.boss.combatEntities){e.status='persistent';e.hp=e.maxHp;}
          s.boss.grabberTargetPlayerId=0;p0.render();},length);
        assert.equal(await a.locator('#nemesisStarsOverlay').evaluate(el=>el.getBoundingClientRect().right<=el.parentElement.getBoundingClientRect().right+1),true);
        await a.locator('#nemesisStarsOverlay button').tap();assert.match(await a.locator('#bossIntentHelpText').innerText(),new RegExp('J'.repeat(length)));await a.keyboard.press('Escape');
        assert.equal(await a.locator('.boss-combat-chips .boss-daughter-state').evaluateAll(chips=>chips.every(el=>el.getBoundingClientRect().width<=el.parentElement.getBoundingClientRect().width+1)),true);
        await a.getByRole('button',{name:/Agarrador: ALVO:/}).tap();assert.match(await a.locator('#bossIntentHelpText').innerText(),new RegExp('J'.repeat(length)));await a.keyboard.press('Escape');
      }
      await a.screenshot({path:resolve(evidence,'nemesis-'+width+'.png'),fullPage:true});
      // Every registered ability/phase uses the real presentation and help renderer.
      for(const bossId of ['nemesis','nehelenia','dimitrescu','matriarca_esmeralda','banker','dominadora']){
        await a.evaluate(bossId=>p0.sample(['nemesis','nehelenia','dimitrescu'].includes(bossId)
          ?{bossId,abilityId:bossId==='nemesis'?'horde_command':bossId==='nehelenia'?'fish_marked_card':'three_daughters',phase:2}
          :p0.catalog().find(s=>s.bossId===bossId&&s.phase===2)),bossId);
        const metrics=await a.evaluate(bossId=>{
          const records=[];
          for(const caption of ['ALVO: 2♣','CAÇADA · Q♥','Biel · J♠','ALVO: 10♦','Biel: 10♣ MARCADA']){
            const support=['nemesis','nehelenia','dimitrescu'].includes(bossId);
            const chip=support?p0.chip(caption):p0.effectChip(caption),ref=chip.querySelector('.boss-chip-card-ref'),plain=chip.cloneNode(false);plain.textContent=caption;chip.after(plain);
            const r=chip.getBoundingClientRect(),p=plain.getBoundingClientRect(),cs=getComputedStyle(chip),rs=getComputedStyle(ref);
            const rr=ref.getBoundingClientRect();
            records.push({caption,width:r.width,plainWidth:p.width,height:r.height,plainHeight:p.height,font:cs.fontSize,refFont:rs.fontSize,scale:rs.transform,color:rs.color,gap:cs.gap,padding:cs.padding,plainPadding:getComputedStyle(plain).padding,
              contained:rr.left>=r.left&&rr.right<=r.right&&rr.top>=r.top-1&&rr.bottom<=r.bottom+1});
            plain.remove();chip.remove();
          }
          return records;
        },bossId);
        for(const m of metrics){assert.equal(m.height,m.plainHeight,JSON.stringify(m));assert.ok(Math.abs(m.width-m.plainWidth)<1,JSON.stringify(m));assert.equal(m.font,m.refFont);assert.match(m.scale,/1\.5/,bossId+JSON.stringify(m));assert.equal(m.padding,m.plainPadding);assert.equal(m.contained,true,bossId+JSON.stringify(m));}
        assert.notEqual(metrics[0].color,metrics[1].color);
        if(['nemesis','nehelenia','dimitrescu'].includes(bossId)){
          await a.evaluate(()=>{p0.chip('CAÇADA · Q♥').click();});
          assert.doesNotMatch(await a.locator('#bossIntentHelpText').innerText(),/[·•]/);
          assert.equal(await a.locator('#bossIntentHelpText .boss-card-ref').innerText(),'Q♥');await a.keyboard.press('Escape');
        }else await a.evaluate(()=>p0.effectChip('Biel: 10♦'));
        await a.evaluate(()=>{document.querySelector('.board').scrollTop=0;});
        await a.screenshot({path:resolve(evidence,'chip-reference-'+bossId+'-'+width+'.png'),fullPage:true});
        console.log('Focal reference only; unchanged chip geometry:',width,bossId,JSON.stringify(metrics));
      }
      const catalog=await a.evaluate(()=>p0.catalog());assert.equal(catalog.length,136);
      for(const sample of catalog){
        await a.evaluate(sample=>p0.sample(sample),sample);
        const copy=await a.locator('#bossIntent').evaluate(el=>({text:el.innerText,descriptionSize:parseFloat(getComputedStyle(document.getElementById('bossIntentDescription')).fontSize),progressSize:parseFloat(getComputedStyle(document.getElementById('bossIntentProgress')).fontSize),bottom:el.getBoundingClientRect().bottom,hudBottom:document.getElementById('bossHud').getBoundingClientRect().bottom}));
        assert.doesNotMatch(copy.text,/[·•]/,JSON.stringify(sample));assert.ok(copy.descriptionSize>0&&copy.progressSize>0,JSON.stringify(sample));assert.ok(copy.bottom<=copy.hudBottom+1,JSON.stringify(sample));
        assert.equal(await a.evaluate(()=>window.visualViewport.scale),1);
        const emphasis=await a.locator('#bossIntent').evaluate(el=>({copy:parseFloat(getComputedStyle(document.getElementById('bossIntentDescription')).fontSize),original:parseFloat(getComputedStyle(el).getPropertyValue('--boss-fs-intent-copy')),title:parseFloat(getComputedStyle(document.getElementById('bossIntentName')).fontSize),refs:[...el.querySelectorAll('.boss-card-ref')].map(ref=>({size:parseFloat(getComputedStyle(ref).fontSize),base:parseFloat(getComputedStyle(ref.parentElement).fontSize)}))}));
        // Custom properties can contain clamp(); compare against the unchanged small-text sibling.
        assert.equal(emphasis.copy,copy.progressSize);for(const ref of emphasis.refs)assert.ok(ref.size>ref.base&&ref.size<=ref.base*1.31);
        // Native click exercises the real handler; mouse/touch/keyboard opening is covered above.
        await a.evaluate(()=>document.getElementById('bossIntentHelpButton').click());assert.doesNotMatch(await a.locator('#bossIntentHelpText').innerText(),/[·•]/,JSON.stringify(sample));await a.evaluate(()=>p0.close());
        if(['crimson_brand','fish_marked_card','rebirth','blood_tithe'].includes(sample.abilityId)&&sample.phase===1 || sample.abilityId==='rebirth'){
          await a.evaluate(()=>document.querySelector('.board').scrollTop=0);
          await a.screenshot({path:resolve(evidence,'copy-'+sample.bossId+'-'+sample.abilityId+'-'+sample.phase+'-'+width+'.png'),fullPage:true});
        }
      }
      console.log('All 136 ability/phase HUD and help combinations:',width,'PASS');
      // Accelerated real browser clock: humans have no countdown or timeout on any boss.
      await a.clock.install();
      for(const id of ['nemesis','dimitrescu','nehelenia','matriarca_esmeralda','banker','dominadora']){
        await a.evaluate(id=>{p0.reset(id);p0.resetTimer();p0.clockStart();},id);await a.clock.runFor(65000);
        assert.equal(await a.evaluate(()=>p0.timer().turnTimerId),null);assert.equal(await a.evaluate(()=>p0.timer().timeoutCalls),0);
        assert.equal(await a.evaluate(()=>p0.state().turnNumber),1);assert.equal(await a.locator('#turnTimerLabel').innerText(),'');
        // The 1-second display interval is shared across resets and may be between ticks.
        assert.match(await a.locator('#matchDuration').innerText(),/01:0[45]/);
        await a.evaluate(()=>p0.reload());assert.equal(await a.evaluate(()=>p0.timer().turnTimerId),null);
      }
      await a.evaluate(()=>{const s=p0.reset('nemesis');s.players[1].name='BOT Luana';s.currentPlayer=1;p0.render();});
      await a.clock.runFor(60001);assert.equal(await a.evaluate(()=>p0.timer().watchdogCalls),1);
      await a.evaluate(()=>{p0.state().turnNumber++;p0.state().pauseControl={paused:true};p0.render();});
      await a.clock.runFor(65000);assert.equal(await a.evaluate(()=>p0.timer().watchdogCalls),1);
      await a.evaluate(()=>{p0.state().pauseControl=null;p0.observer(1);});await a.clock.runFor(65000);
      assert.equal(await a.evaluate(()=>p0.timer().watchdogCalls),1,'only host recovers a stuck BOT');
      await a.evaluate(()=>p0.observer(0));
      await a.evaluate(()=>{const s=p0.reset('nemesis');s.mode='1x1';p0.render();});
      await a.clock.runFor(60000);
      await a.evaluate(()=>{p0.state().mode='boss_nemesis';p0.render();});await a.clock.runFor(3000);
      assert.equal(await a.evaluate(()=>p0.timer().timeoutCalls),0,'old queued human timeout cannot act after switching to boss mode');
      await a.evaluate(()=>{const s=p0.reset('nemesis');s.mode='1x1';p0.render();});
      await a.clock.runFor(64000);assert.equal(await a.evaluate(()=>p0.timer().timeoutCalls),1,'normal modes retain timeout autoplay');
      assert.deepEqual(errors,[]);
      console.log('P0 mouse/touch, two humans, undo/reload, Fish Eye, long names, six timers and BOT watchdog:',width,'PASS');
    }
    await context.close();
  }
}finally{await browser.close();}
