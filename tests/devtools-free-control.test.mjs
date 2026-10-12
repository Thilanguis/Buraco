import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {devToolsFixture} from './devtools-free-control-fixture.mjs';
import {isBossMode} from '../js/boss/boss-engine.js';
import {bossStateRevision,sameBossRevision} from '../js/game/boss-state-transaction.js';
import {pauseBlocksPlay,createActionGate} from '../js/game/match-control.js';
import {BossBuracoBot} from '../boss-bot.js';
function setup(mode='1x1',access=true){
  const select={value:'local'};
  const context={window:{},document:{body:{dataset:{}},getElementById:()=>select,querySelector:()=>null},crypto:{randomUUID:()=> 'test-friend'},AbortController,console,setTimeout,clearTimeout,structuredClone};
  vm.createContext(context);vm.runInContext(devToolsFixture,context);
  context.window.devScenario.reset(mode,access);return {w:context.window,select,api:context.window.devScenario};
}
for(const mode of ['1x1','1x1_duploMorto','1x1_dominacao','1x2','2x2','1x3','boss_nemesis','boss_dimitrescu','boss_nehelenia','boss_banker','boss_matriarca','boss_dominadora'])
test(`DevTools ${mode}: own hand on BOT turn, no permanent auto-pause, frozen edits, recipient choice, canastra, resume`,async()=>{
  const {w,select,api}=setup(mode),s=api.state(),old=api.controller();
  await w.debugDraw5();assert.equal(s.players[0].hand.length,20);assert.equal(s.players[1].hand.length,1);
  assert.equal(s.debugPaused,false);assert.ok(s.historyTest&&old.signal.aborted);assert.equal(s.currentPlayer,1);
  assert.equal(s.debugMutationFreezeId,undefined);
  await w.debugDraw30();assert.equal(s.players[0].hand.length,50);
  await w.debugDiscard5();assert.equal(s.players[0].hand.length,45);assert.equal(s.discard.length,5);
  select.value='player:1';await w.debugDraw5();assert.equal(s.players[1].hand.length,6);
  select.value='player:0';await w.debugMeld('limpa');assert.equal(s.teams[0].melds[0].length,7);
  assert.equal(api.log().actors[0],0);assert.equal(api.log().normal,0);
  assert.equal(s.debugPaused,false);
  await w.debugTogglePause();assert.equal(s.debugPaused,true);
  await w.debugDraw5();assert.equal(s.debugPaused,true); // User pause stays paused.
  await w.debugTogglePause();assert.equal(s.debugPaused,false);assert.equal(w.devToolsMutationActive,false);
  assert.ok(api.log().commits.some(snapshot=>snapshot.debugPaused&&snapshot.players[0].hand.length===45));
});
test('unauthorized/finished clients cannot mutate, pause, consume stock or mark history',async()=>{
  const {w,api}=setup('boss_nemesis',false),s=api.state();
  for(const name of ['debugDraw5','debugDraw30','debugDiscard5','debugMeld','debugTogglePause','debugEndGame'])await w[name]('limpa');
  assert.equal(s.stock.length,100);assert.equal(api.log().commits.length,0);assert.equal(s.historyTest,undefined);
  api.access(true);s.finished=true;await w.debugDraw5();assert.equal(s.stock.length,100);
});
test('two rapid tools serialize without waiting for a stuck gameplay gate or BOT; changed session cancels queued edits',async()=>{
  const {w,api}=setup();api.gate(new Promise(()=>{}));w.activeBotTurn={promise:new Promise(()=>{})};
  const a=w.debugDraw5(),b=w.debugDraw30();
  await Promise.race([Promise.all([a,b]),new Promise((_,reject)=>setTimeout(()=>reject(new Error('DEV waited for gameplay')),200))]);
  assert.equal(api.state().stock.length,65);assert.equal(w.activeBotTurn,null);
  const stale=w.debugDraw5();w.gameSessionId++;await stale;
  assert.equal(api.state().stock.length,65);
});
test('normal controls and remote BOT/boss automation remain blocked during debug freeze',()=>{
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert.match(app,/function canPerformCommonGameAction[\s\S]*?!gameState\?\.debugPaused/);
  assert.match(app,/if \(pauseBlocksPlay\(newState\) \|\| newState.debugPaused\)/);
  assert.match(app,/const active = !heldDebugResult && !state\?\.debugPaused/);
  assert.match(app,/!state.debugPaused && !pauseBlocksPlay\(state\)/);
  assert.match(app,/if \(state.debugPaused\) \{\s*showMessage/);
});
test('concurrent BOT freeze rejection retries safely, with a bounded stop and no card mutation',async()=>{
  for(const rejectAlways of [false,true]){
    const {w,api}=setup('boss_nemesis');let tries=0;
    api.interceptCommit(()=>{tries++;if(tries===1||rejectAlways){api.state().debugPaused=false;delete api.state().debugMutationFreezeId;}});
    await w.debugDraw5();
    assert.equal(api.state().stock.length,rejectAlways?100:95);
    assert.equal(tries,rejectAlways?3:4); // retries + draw + automatic resume.
    assert.equal(api.state().debugPaused,false);
    assert.equal(w.devToolsMutationActive,false);
    if(rejectAlways)assert.match(api.log().messages.at(-1),/congelar.*segurança/);
  }
});
test('an explicit remote pause is not cleared by automatic resume',async()=>{
  const {w,api}=setup('boss_nemesis');let commits=0;
  api.interceptCommit(()=>{if(++commits===2){api.state().debugPaused=true;delete api.state().debugMutationFreezeId;}});
  await w.debugDraw5();assert.equal(api.state().stock.length,95);
  assert.equal(api.state().debugPaused,true);assert.equal(commits,2);
});
test('temporary pause is cleaned up even if the tool throws',async()=>{
  const {w,api}=setup();let commits=0;
  api.interceptCommit(()=>{if(++commits===2)throw new Error('tool failure');});
  await w.debugDraw5();assert.match(api.log().messages.at(-1),/tool failure/);
  assert.equal(api.state().debugPaused,false);
  assert.equal(api.state().debugMutationFreezeId,undefined);
  assert.equal(w.devToolsMutationActive,false);
});
test('automatic resume retries a rejected canonical write without overriding another pause',async()=>{
  const {w,api}=setup('boss_nemesis');let commits=0,freeze;
  api.interceptCommit(()=>{
    if(++commits===1)freeze=api.state().debugMutationFreezeId;
    if(commits===3){api.state().debugPaused=true;api.state().debugMutationFreezeId=freeze;}
  });
  await w.debugDraw5();assert.equal(commits,4);assert.equal(api.state().debugPaused,false);
  assert.equal(api.state().debugMutationFreezeId,undefined);
});
test('canonical commits allow trusted debug edits during pause without bypassing revision/session protection',async()=>{
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const source=app.slice(app.indexOf('async function commitState()'),app.indexOf('\nwindow.bossSpecialOperationPending ='));
  for(const [access,debug,revision,expectedWrites] of [[true,true,3,1],[false,true,3,0],[true,false,3,0],[true,true,4,0]]){
    const latest={mode:'boss_nemesis',matchStartedAt:1,currentPlayer:1,turnNumber:7,stock:[{}],pause:{paused:true},debugPaused:true,bossStateRevision:revision,boss:{id:'nemesis',seed:9}};
    const writes=[];
    const ctx={state:{...structuredClone(latest),bossStateRevision:3,historyTest:true},window:{isClosingGame:false,devToolsMutationActive:debug},isDebugMode:access,committing:false,pendingCommit:false,
      isBossMode,bossStateRevision,sameBossRevision,pauseBlocksPlay,structuredClone,db:{},gameRef:{},console,localUndoStack:[],renderAll(){},showMessage(){},
      prepareMatchHistory:async()=>()=>{},runTransaction:async(_db,fn)=>fn({get:async()=>({exists:()=>true,data:()=>({stateJson:JSON.stringify(latest)})}),update:(_ref,data)=>writes.push(JSON.parse(data.stateJson))})};
    vm.createContext(ctx);vm.runInContext(source,ctx);await ctx.commitState();
    assert.equal(writes.length,expectedWrites);
    if(writes.length){assert.equal(writes[0].bossStateRevision,4);assert.equal(writes[0].currentPlayer,1);assert.equal(writes[0].pause.paused,true);assert.equal(writes[0].debugPaused,true);}
  }
});

test('cancelled gameplay cannot release the next action gate or overwrite a newer debug commit',async()=>{
  const gate=createActionGate();let releaseOld,releaseNew;
  const old=gate.run(()=>new Promise(resolve=>{releaseOld=resolve;}));const waiting=gate.pending;
  gate.cancel();await waiting;assert.equal(gate.pending,null);
  const next=gate.run(()=>new Promise(resolve=>{releaseNew=resolve;}));const newPending=gate.pending;
  releaseOld();await old;assert.equal(gate.pending,newPending);releaseNew();await next;
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const source=app.slice(app.indexOf('async function commitState()'),app.indexOf('\nwindow.bossSpecialOperationPending ='));
  const latest={mode:'boss_nemesis',matchStartedAt:1,currentPlayer:1,stock:[{}],bossStateRevision:3,boss:{id:'nemesis',seed:9}};
  let releaseRead,reads=0;const writes=[];
  const ctx={state:structuredClone(latest),window:{gameSessionId:1,isClosingGame:false},isDebugMode:true,committing:false,pendingCommit:false,
    isBossMode,bossStateRevision,sameBossRevision,pauseBlocksPlay,structuredClone,db:{},gameRef:{},console,localUndoStack:[],renderAll(){},showMessage(){},prepareMatchHistory:async()=>()=>{},
    runTransaction:async(_db,fn)=>fn({get:async()=>{if(++reads===1)await new Promise(resolve=>releaseRead=resolve);return{exists:()=>true,data:()=>({stateJson:JSON.stringify(latest)})};},update:(_ref,data)=>writes.push(JSON.parse(data.stateJson))})};
  vm.createContext(ctx);vm.runInContext(source,ctx);const oldCommit=ctx.commitState();
  ctx.window.devToolsGameplayEpoch=1;ctx.state={...structuredClone(latest),historyTest:true};ctx.committing=false;ctx.pendingCommit=false;
  await ctx.commitState();releaseRead();await oldCommit;
  assert.equal(writes.length,1);assert.equal(writes[0].historyTest,true);assert.equal(ctx.state.bossStateRevision,4);assert.equal(ctx.committing,false);
});

test('all laboratory mutations bypass the player gate and use the authorized priority lane',()=>{
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const labInit=app.slice(app.indexOf('  async function initBossDebugLab()'),app.indexOf('\n  initBossDebugLab().catch('));
  for(const id of ['Prepare','BotSuccess','BotFailure','ResourceMinus','ResourcePlus','ResourceNear','ResourceZero','CombatApply','ZombiePassive','ZombieObjective','DaughterPrepare','Undo','Reset'])
    assert.match(labInit,new RegExp("bossLabElement\\('debugBossLab"+id+"'\\).*addEventListener\\('click'.*queueDevToolsMutation"));
  assert.doesNotMatch(labInit,/localActionGate\.run/);
  const runner=app.slice(app.indexOf('function interruptDevToolsGameplay()'));
  assert.doesNotMatch(runner,/await (running|localActionGate\.pending)|while \(committing/);
});

test('all canastras, preparations and end-game commands edit the chosen player without a turn wait',async()=>{
  for(const type of ['suja','limpa','real','asas']){
    const {w,api}=setup('boss_dimitrescu');api.gate(new Promise(()=>{}));w.activeBotTurn={promise:new Promise(()=>{})};
    await w.debugMeld(type);assert.equal(api.state().teams[0].melds.length,1);assert.equal(api.state().currentPlayer,1);
    assert.equal(api.state().debugPaused,false);
  }
  const {w,api}=setup();await w.debugSetupDead();assert.equal(api.state().players[0].hand.length,1);
  await w.debugSetupWin();assert.equal(api.state().deadChunksTaken[0],1);assert.equal(api.state().players[0].hand[0].rank,'K');
  await w.debugEndGame();assert.equal(api.state().finished,true);assert.equal(api.state().winnerTeamId,0);
});

test('manual lab BOT alone may run during debug pause; permission expires on takeover and abort remains effective',async()=>{
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const source=app.slice(app.indexOf('function createBotEngineForSession('),app.indexOf('\nfunction getDiceSpawnPosition'));
  const controller=new AbortController();
  const ctx={botEngine:{},state:{debugPaused:true},isDebugMode:true,window:{gameSessionId:1,devToolsMutationActive:true},isGameSessionActive:()=>false,console};
  vm.createContext(ctx);vm.runInContext(source,ctx);
  const ordinary=ctx.createBotEngineForSession(1,controller.signal),manual=ctx.createBotEngineForSession(1,controller.signal,{debugExecution:true,delayScale:.001});
  assert.equal(ordinary.isActive(),false);assert.equal(ordinary.canRunDuringDebugPause(),false);
  assert.equal(manual.canRunDuringDebugPause(),true);
  await Promise.race([BossBuracoBot.sleep(1,manual,controller.signal),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Manual BOT waited for debug pause')),200))]);
  ctx.window.devToolsGameplayEpoch=1;assert.equal(manual.isActive(),false);assert.equal(manual.canRunDuringDebugPause(),false);
  await assert.rejects(BossBuracoBot.sleep(1,manual,controller.signal),{name:'AbortError'});
  ctx.window.devToolsGameplayEpoch=0;ctx.isDebugMode=false;assert.equal(manual.canRunDuringDebugPause(),false);
  ctx.isDebugMode=true;ctx.window.devToolsMutationActive=false;assert.equal(manual.canRunDuringDebugPause(),false);
  ctx.window.devToolsMutationActive=true;controller.abort();assert.equal(manual.canRunDuringDebugPause(),false);
});

test('all top-level mutation buttons/selects are covered; opening/closing the panel never freezes gameplay',()=>{
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const panel=html.slice(html.indexOf('id="debugPanel"'),html.indexOf('id="debugPanel"')+17000);
  const wrapped=app.slice(app.indexOf("for (const name of ['debugDraw5'"));
  for(const match of panel.matchAll(/(?:onclick|onchange)="(debug\w+)\(/g))assert.ok(wrapped.includes("'"+match[1]+"'"),match[1]);
  const toggle=app.slice(app.indexOf('window.toggleDebugPanel ='),app.indexOf('window.debugSetTableTheme ='));
  assert.doesNotMatch(toggle,/debugPaused\s*=|commitState|queueDevToolsMutation/);
  const discard=app.slice(app.indexOf('window.debugDiscard5 ='),app.indexOf('window.debugRestartGame ='));
  assert.doesNotMatch(discard,/await animate/);
});

test('a remote DEV freeze cancels the pending gesture before snapshot waits; obsolete freezes do not cancel',async()=>{
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const source=app.slice(app.indexOf('  const prioritySnapshot ='),app.indexOf('  const newState = normalizeDominationFriends(JSON.parse(data.stateJson))'));
  for(const mode of ['1x1','boss_nemesis','1x1_dominacao']){
    const old={mode,matchStartedAt:1,bossStateRevision:3,friendRevision:3,friendGameId:'same'};
    const localActionGate=createActionGate();let release;
    const action=localActionGate.run(()=>new Promise(resolve=>release=resolve));
    const ctx={state:old,data:{stateJson:JSON.stringify({...old,debugPaused:true})},localActionGate,isBossMode,bossStateRevision,
      window:{},gameSnapshotSequence:1,snapshotSequence:1,snapshotGameplayEpoch:0};
    ctx.interruptDevToolsGameplay=()=>{ctx.window.devToolsGameplayEpoch=1;localActionGate.cancel();};
    vm.createContext(ctx);vm.runInContext('async function receive(){'+source+'return true;}',ctx);
    assert.equal(await Promise.race([ctx.receive(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Remote DEV waited for gesture')),200))]),true);
    assert.equal(ctx.snapshotGameplayEpoch,1);release();await action;
    for(const incoming of [{...old,matchStartedAt:2,debugPaused:true},{...old,bossStateRevision:2,friendRevision:2,debugPaused:true}]){
      ctx.window.devToolsGameplayEpoch=0;ctx.snapshotGameplayEpoch=0;ctx.data.stateJson=JSON.stringify(incoming);
      await ctx.receive();
      if(incoming.matchStartedAt!==1||mode!=='1x1')assert.equal(ctx.window.devToolsGameplayEpoch,0);
    }
  }
});

test('ordinary canonical writes cannot overwrite a DEV freeze in any mode',async()=>{
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const source=app.slice(app.indexOf('async function commitState()'),app.indexOf('\nwindow.bossSpecialOperationPending ='));
  for(const mode of ['1x1','boss_nemesis','1x1_dominacao']){
    const latest={mode,matchStartedAt:1,friendGameId:'same',friendRevision:3,bossStateRevision:3,debugPaused:true,stock:[{}],boss:{id:'nemesis'}};
    const writes=[];const ctx={state:{...structuredClone(latest),debugPaused:false},window:{},isDebugMode:true,committing:false,pendingCommit:false,
      isBossMode,bossStateRevision,sameBossRevision,pauseBlocksPlay,structuredClone,db:{},gameRef:{},console,localUndoStack:[],renderAll(){},showMessage(){},startTurnTimerIfNeeded(){},scheduleDominationFriend(){},
      runTransaction:async(_db,fn)=>fn({get:async()=>({exists:()=>true,data:()=>({stateJson:JSON.stringify(latest)})}),update:(_ref,data)=>writes.push(data)})};
    vm.createContext(ctx);vm.runInContext(source,ctx);await ctx.commitState();assert.equal(writes.length,0);assert.equal(ctx.state.debugPaused,true);
  }
});

test('themes, friends, Vision and restart share the same takeover without leaving a pause behind',async()=>{
  const {w,api}=setup('1x1_dominacao');api.seat(1);api.state().currentPlayer=0;
  api.gate(new Promise(()=>{}));w.activeBotTurn={promise:new Promise(()=>{})};
  await w.debugSetTableTheme('cassino');assert.equal(api.state().tableTheme,'cassino');
  await w.debugSetDeckTheme('resident');assert.equal(api.state().deckTheme,'resident');
  for(const count of [1,2]){await w.debugSetFriends(count);assert.ok(api.log().actors.includes('friends:'+count));}
  for(const count of [1,2]){await w.debugSetupVision(count);assert.equal(api.state().teams[1].melds[0].length,count===1?6:5);}
  assert.equal(api.state().debugPaused,false);assert.equal(api.log().normal,0);
  const oldMatch=api.state().matchStartedAt;api.state().debugPaused=true;
  await w.debugRestartGame();assert.equal(api.state().matchStartedAt,oldMatch+1);assert.equal(api.state().debugPaused,false);
  assert.equal(w.devToolsMutationActive,false);
});

test('real lab BOT discard and real passTurn finish under a freeze without unlocking normal turns or pending choices',async()=>{
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const start=app.indexOf('  async executeDiscard(botIndex, cardIndex)',app.indexOf('const botEngine ='));
  const discard=app.slice(start,app.indexOf('  async recoverBotTurn(',start));
  const pass=app.slice(app.indexOf('function passTurn('),app.indexOf('\nasync function autoPlayTimeout()'));
  for(const allowed of [false,true]){
    let writes=0;
    const ctx={state:{mode:'boss_nemesis',debugPaused:true,currentPlayer:1,hasDrawnThisTurn:true,turnNumber:3,discard:[],players:[{id:0},{id:1,hand:[{id:'c1'},{id:'c2'}]}]},
      window:{devToolsMutationActive:true},isDebugMode:true,localUndoStack:[],canPerformCommonGameAction:()=>false,hasPendingBossChoices:()=>false,isBossTurnActive:()=>false,
      queueDominationFriendTurn(){},isCurrentBossMode:()=>true,completeBossPlayerTurn:()=>({outcome:'completed'}),prepareBossVaultTurn(){},isBossCardBlocked:()=>false,notifyBossCardDiscarded:()=>[],stockIsExhausted:()=>false,
      newActionId:()=> 'debug-discard',packCard:card=>card};
    vm.createContext(ctx);vm.runInContext(pass+'\nconst actualEngine={'+discard+'};',ctx);
    ctx.actualGetState=()=>ctx.state;ctx.actualCommit=async()=>writes++;ctx.allowed=allowed;
    vm.runInContext('actualEngine.getState=actualGetState;actualEngine.commitState=actualCommit;actualEngine.canRunDuringDebugPause=()=>allowed;globalThis.discard=()=>actualEngine.executeDiscard(1,0);',ctx);
    assert.equal(await ctx.discard(),allowed);assert.equal(writes,allowed?1:0);
    assert.equal(ctx.state.currentPlayer,allowed?0:1);assert.equal(ctx.state.debugPaused,true);assert.equal(ctx.passTurn(),false);
    if(allowed){ctx.hasPendingBossChoices=()=>true;ctx.showPendingBossChoiceMessage=()=>{};assert.equal(ctx.passTurn({debugExecution:true}),false);}
  }
});
