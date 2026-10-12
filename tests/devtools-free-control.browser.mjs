import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {devToolsFixture,devToolsLabFixture} from './devtools-free-control-fixture.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const root=resolve('.'),evidence=resolve('.cache/devtools-free-control');await mkdir(evidence,{recursive:true});
const html=(await readFile('index.html','utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('class="account-pending"','');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {for(const [width,height] of [[1024,768],[1376,1032],[1920,1080],[390,844]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true});
  const page=await context.newPage();
  await page.route('http://dev.test/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/')return route.fulfill({contentType:'text/html',body:html.replace('</body>',`<script>${devToolsFixture}\ndevScenario.reset();document.body.classList.remove('account-pending');document.getElementById('gameSection').style.display='flex';document.body.append(document.getElementById('debugPanel'));window.toggleDebugPanel(true);</script></body>`)});
    try {return route.fulfill({path:resolve(root,'.'+path)});}catch{return route.fulfill({status:404,body:''});}
  });
  await page.goto('http://dev.test/');await page.waitForFunction(()=>window.devScenario);
  for(const mode of ['1x1','1x1_duploMorto','1x1_dominacao','1x2','2x2','1x3','boss_nemesis','boss_dimitrescu','boss_nehelenia','boss_banker','boss_matriarca','boss_dominadora']){
    await page.evaluate(mode=>devScenario.reset(mode),mode);
    await page.evaluate(()=>{devScenario.gate(new Promise(()=>{}));window.activeBotTurn={promise:new Promise(()=>{})};});
    await page.evaluate(()=>devScenario.interceptCommit(()=>{
      if(devScenario.state().debugMutationFreezeId && document.getElementById('pauseWatermark').style.display!=='none')
        throw new Error('Temporary operation flashed the frozen overlay');
      if(devScenario.state().debugMutationFreezeId && document.getElementById('debugPauseBtn').textContent.includes('Descongelar'))
        throw new Error('Temporary operation changed the explicit pause button');
    }));
    await page.getByRole('button',{name:'+5 Mão',exact:true}).tap();
    await page.waitForFunction(()=>devScenario.state().players[0].hand.length===20);
    await page.waitForFunction(()=>!window.devToolsMutationActive);
    assert.equal(await page.evaluate(()=>devScenario.state().debugPaused),false);
    await page.getByRole('button',{name:'+30 Mão',exact:true}).click();
    await page.waitForFunction(()=>devScenario.state().players[0].hand.length===50);
    await page.getByRole('button',{name:'-5 Lixo',exact:true}).tap();
    await page.waitForFunction(()=>devScenario.state().discard.length===5);
    await page.getByRole('button',{name:'Canastra Limpa',exact:true}).tap();
    await page.waitForFunction(()=>devScenario.state().teams[0].melds.length===1);
    await page.waitForFunction(()=>!window.devToolsMutationActive);
    assert.equal(await page.evaluate(()=>devScenario.state().debugPaused),false);
    const panel=await page.locator('#debugPanel').evaluate(el=>({position:getComputedStyle(el).position,pointer:getComputedStyle(el).pointerEvents,z:getComputedStyle(el).zIndex}));
    assert.equal(panel.position,'fixed');assert.equal(panel.pointer,'auto');assert.equal(panel.z,'2147483646');
    assert.equal(await page.evaluate(()=>devScenario.log().normal),0);
    await page.locator('#debugPauseBtn').click();
    await page.waitForFunction(()=>devScenario.state().debugPaused&&!window.devToolsMutationActive);
    assert.equal(await page.locator('#pauseWatermark').evaluate(el=>el.style.display),'block');
    await page.getByRole('button',{name:'+5 Mão',exact:true}).tap();
    await page.waitForFunction(()=>devScenario.state().players[0].hand.length===50&&!window.devToolsMutationActive);
    assert.equal(await page.evaluate(()=>devScenario.state().debugPaused),true);
    await page.locator('#debugPauseBtn').click();
    await page.waitForFunction(()=>!devScenario.state().debugPaused);
    for(const name of ['Canastra Suja','Canastra Real','Canastra Ás-a-Ás']){
      const before=await page.evaluate(()=>devScenario.state().teams[0].melds.length);
      await page.getByRole('button',{name,exact:true}).tap();
      await page.waitForFunction(before=>devScenario.state().teams[0].melds.length===before+1&&!window.devToolsMutationActive,before);
    }
    await page.getByRole('button',{name:'Prep: Pegar Morto',exact:true}).tap();
    await page.waitForFunction(()=>devScenario.state().players[0].hand.length===1&&!window.devToolsMutationActive);
    await page.getByRole('button',{name:'Prep: Bater',exact:true}).click();
    await page.waitForFunction(()=>devScenario.state().deadChunksTaken[0]===1&&!window.devToolsMutationActive);
    await page.getByRole('button',{name:'❌ Terminar Jogo',exact:true}).tap();
    await page.waitForFunction(()=>devScenario.state().finished&&!window.devToolsMutationActive);
    await page.getByRole('button',{name:'🔄 Reiniciar Partida',exact:true}).tap();
    await page.waitForFunction(()=>!devScenario.state().finished&&!window.devToolsMutationActive);
    for(const [id,field] of [['debugTableThemeSelect','tableTheme'],['debugDeckThemeSelect','deckTheme']]){
      const value=await page.locator('#'+id+' option').first().getAttribute('value');
      await page.locator('#'+id).selectOption(value);
      await page.waitForFunction(([field,value])=>devScenario.state()[field]===value&&!window.devToolsMutationActive,[field,value]);
    }
  }
  await page.evaluate(()=>{devScenario.reset('1x1_dominacao');devScenario.seat(1);devScenario.state().currentPlayer=0;document.getElementById('debugFriendControls').hidden=false;document.getElementById('debugVisionLab').hidden=false;document.getElementById('debugVisionLab').open=true;});
  for(const name of ['Colocar 1 amiga','Colocar 2 amigas','1 carta útil','2 cartas juntas']){
    const before=await page.evaluate(()=>devScenario.log().commits.length);
    await page.getByRole('button',{name,exact:true}).tap();
    await page.waitForFunction(before=>devScenario.log().commits.length>before&&!window.devToolsMutationActive,before);
  }
  await page.addScriptTag({type:'module',content:`
    import * as lab from '/js/boss/boss-debug-scenarios.js';
    import * as engine from '/js/boss/boss-engine.js';
    import * as registry from '/js/boss/boss-registry.js';
    import * as undo from '/js/game/undo-transaction.js';
    import * as revisions from '/js/game/boss-state-transaction.js';
    import {BossBuracoBot} from '/boss-bot.js';
    window.labModules={lab,engine,registry,undo,revisions,BossBuracoBot};
  `});
  await page.waitForFunction(()=>window.labModules);
  await page.addScriptTag({content:devToolsLabFixture});await page.evaluate(()=>devLab.init());
  const labClick=async id=>{
    const commits=await page.evaluate(()=>devScenario.log().commits.length);
    await page.locator('#'+id).tap();
    await page.waitForFunction(before=>!window.devToolsMutationActive&&devScenario.log().commits.length>before,commits).catch(async error=>{
      console.log('Laboratory click failure',id,await page.evaluate(()=>({command:window.devToolsActiveCommand,error:devLab.errors(),messages:devScenario.log().messages.slice(-4),commits:devScenario.log().commits.length})));
      throw error;
    });
    assert.equal(await page.evaluate(()=>devLab.errors()),'',id);
  };
  for(const boss of ['banker','dominadora','matriarca_esmeralda','dimitrescu','nehelenia','nemesis']){
    await page.evaluate(boss=>devLab.start(boss),boss);
    await page.evaluate(()=>{devScenario.gate(new Promise(()=>{}));window.activeBotTurn={promise:new Promise(()=>{})};});
    for(const id of ['debugBossLabResourcePlus','debugBossLabResourceMinus','debugBossLabResourceNear','debugBossLabResourceZero'])await labClick(id);
    if(boss==='dimitrescu'||boss==='nemesis'){
      await page.locator('#debugBossLabCombatHp').fill('100');await labClick('debugBossLabCombatApply');
      assert.equal(await page.evaluate(()=>devScenario.state().boss.combatEntities[0].hp),100);
      await page.locator('#debugBossLabAdvanced').evaluate(el=>el.open=true);await labClick('debugBossLabUndo');
      assert.notEqual(await page.evaluate(()=>devScenario.state().boss.combatEntities[0].hp),100);
      const ids=await page.locator('#debugBossLabCombatEntity option').evaluateAll(options=>options.map(o=>o.value));
      for(const entity of ids){
        await page.locator('#debugBossLabCombatEntity').selectOption(entity);
        if(boss==='dimitrescu')await labClick('debugBossLabDaughterPrepare');
        await labClick('debugBossLabZombiePassive');
      }
      if(boss==='nemesis'){
        await page.evaluate(()=>devLab.start('nemesis','stars_hunt'));
        await page.locator('#debugBossLabCombatEntity').selectOption('infected');
        await page.locator('#debugBossLabZombiePlayer').selectOption('0');
        await page.waitForFunction(()=>!document.getElementById('debugBossLabZombieObjective').disabled);
        await labClick('debugBossLabZombieObjective');
      }
    }
    await page.locator('#debugBossLabAdvanced').evaluate(el=>el.open=true);await labClick('debugBossLabReset');
    await labClick('debugBossLabPrepare');
    for(const id of ['debugBossLabBotSuccess','debugBossLabBotFailure']){
      await page.evaluate(boss=>devLab.start(boss),boss);
      if(id==='debugBossLabBotFailure')await page.evaluate(()=>{devScenario.state().debugPaused=true;});
      await labClick(id);
      if(id==='debugBossLabBotFailure')assert.equal(await page.evaluate(()=>devScenario.state().debugPaused),true);
    }
    console.log('Laboratory priority / real handlers, resources, prepare/reset, BOT, auxiliary/undo where applicable',boss,width,'PASS');
  }
  await page.screenshot({path:resolve(evidence,`panel-${width}.png`)});
  await context.close();console.log('DevTools mouse/touch, 12 modes, BOT turn, no permanent auto-pause, explicit freeze preserved, resume, panel stacking',width,'PASS');
}}finally{await browser.close();}
