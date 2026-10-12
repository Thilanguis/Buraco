import { readFileSync } from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const slice=(start,end)=>app.slice(app.indexOf(start),app.indexOf(end,app.indexOf(start)));
const debugFreezeVisual=slice('  // --- SISTEMA DE CONGELAMENTO VISUAL (DEBUG) ---', '\n}\n\nfunction activeMatriarchTargetPlayerIds');
export const devToolsHandlers = slice('function ensureDevToolsAction(', '\nwindow.debugRestartGame')
  +slice('window.debugRestartGame =', '\nfunction replayDebugBossTerminalPresentation')
  +slice('window.debugEndGame =', '\nfunction showDebugBossDamageReaction')
  +slice('window.debugMeld =', '\nwindow.debugSetupVision')
  +slice('window.debugSetupVision =', '\nwindow.debugSetupDead')
  +slice('window.debugSetupDead =', '\n// VALIDAÇÃO E ENVIO')
  +slice('window.debugSetTableTheme =', '\nwindow.setTableAmbientEnabled')
  +slice('window.debugSetDeckTheme =', '\nif (isDebugMode)')
  +slice('window.debugSetFriends =', '\nfunction friendHostIndex')
  +app.slice(app.indexOf('function interruptDevToolsGameplay()'));
export const devToolsFixture = `
let state, isDebugMode=true, myPlayerIndex=0, committing=false, pendingCommit=false, friendOperationPending=false, friendAutomationTimer=null, friendPlayback=null, friendAutomationRunning=false;
let botTurnController=new AbortController(), localActionGate={pending:null,cancel(){this.pending=null;}};
let localUndoStack=[],selectedHandIndexes=new Set(),selectedMeldTarget=null,movingWild=null,lastSeenActionId=null,ignoreOwnActionId=null,activeTurnNumber=-1;
const debugLog={commits:[],cancels:0,normal:0,messages:[],actors:[]};
let debugCommitInterceptor=null;
let debugActionSerial=0;
const newActionId=()=> 'debug-action-'+(++debugActionSerial);
window.gameSessionId=1;
const currentPlayer=()=>state.players[state.currentPlayer],currentTeam=()=>state.teams[currentPlayer().teamId];
const ensureMyTurn=()=>{debugLog.normal++;return false;};
const ensureCardId=()=>{},sortHand=()=>{},stopTurnTimer=()=>{},clearBossBotWatchdog=()=>{},startTurnTimerIfNeeded=()=>{},scheduleDominationFriend=()=>{};
const cancelPendingBotTurns=()=>{debugLog.cancels++;};
const cancelGameAnimations=()=>{},showMessage=m=>debugLog.messages.push(m);
const renderAll=()=>{if(document.querySelector('.board')){${debugFreezeVisual}}};
const commitState=async()=>{debugLog.commits.push(JSON.parse(JSON.stringify(state)));if(debugCommitInterceptor)await debugCommitInterceptor();};
const takeDeadIfAvailableForPlayer=()=>null,canTeamTakeDeadNow=()=>true,animateDeadToHandLocal=async()=>{},teamHasGoodCanastra=()=>false;
const finishGame=async teamId=>{state.finished=true;state.winnerTeamId=teamId;await commitState();};
const replayDebugBossTerminalPresentation=()=>{},isDominationFriendBusy=()=>false;
const optimizeMeld=()=>{},normalizeMeldOrder=()=>{},classifyMeldForUi=()=>({kind:'limpa'});
const normalizeDeckTheme=value=>value,normalizeTableTheme=value=>value,normalizeDominationOptions=value=>value,syncTableAmbientMusic=()=>{},dominationFeatureEnabled=()=>true;
const recoverFinishedHistory=async()=>{},startGame=async(mode,names)=>{const next=structuredClone(state);next.mode=mode;next.players.forEach((p,i)=>p.name=names[i]);next.matchStartedAt++;next.finished=false;window.gameSessionId++;return next;};
const createFriendInvitation=()=>({}),setDebugFriends=(_state,count)=>{debugLog.actors.push('friends:'+count);return true;};
const processDominationReward=async()=>null,processBossMeldChange=async actor=>{debugLog.actors.push(actor.id);return null;};
const showDebugBossDamageReaction=()=>{},bossHasActiveRebirthVisual=()=>false,triggerMatriarchRebirthVisual=()=>{};
const playDominationFriendSharedDraw=async()=>{},renderHand=()=>{},cardElById=()=>null;
const friendMeldRules={},debugFriendMeld=()=>true,performDominationDevOperation=async operation=>{debugLog.actors.push('friend');operation(state);await commitState();};
window.toggleDebugPanel=show=>{const panel=document.getElementById('debugPanel');if(panel?.style)panel.style.display=show?'flex':'none';window.isDevToolsOpen=show;};
${devToolsHandlers}
window.devScenario={reset(mode='1x1',access=true){isDebugMode=access;myPlayerIndex=0;debugCommitInterceptor=null;state={mode,matchStartedAt:1,currentPlayer:1,turnNumber:7,stock:Array.from({length:100},(_,i)=>({id:'s'+i})),discard:[],deadChunksTaken:[0,0],deadChunksMax:[1,1],teams:[{id:0,melds:[]},{id:1,melds:[]}],players:[{id:0,teamId:0,name:'Humano',hand:Array.from({length:15},(_,i)=>({id:'h'+i}))},{id:1,teamId:1,name:'BOT',hand:[{id:'b'}]}]};debugLog.commits=[];debugLog.normal=0;debugLog.actors=[];debugLog.messages=[];document.getElementById('debugMeldActor').value='local';renderAll();return state;},seat(index){myPlayerIndex=index;},state:()=>state,log:()=>debugLog,controller:()=>botTurnController,gate(p){localActionGate.pending=p;},access(v){isDebugMode=v;},interceptCommit(fn){debugCommitInterceptor=fn;},run:queueDevToolsMutation};
`;

// Real laboratory controls/handlers and scenario engine; persistence is local.
const labUi = slice('  let bossDebugLabModulePromise', '\n  initBossDebugLab().catch(')
  .replace(/import\('\.\/js\/boss\/boss-debug-scenarios\.js[^']*'\)/, 'Promise.resolve(window.labModules.lab)');
const labSessionEngine = slice('function createBotEngineForSession(', '\nfunction getDiceSpawnPosition');
const labDiscardStart = app.indexOf('  async executeDiscard(botIndex, cardIndex)', app.indexOf('const botEngine ='));
const labDiscard = app.slice(labDiscardStart, app.indexOf('  async recoverBotTurn(', labDiscardStart));
const labPassTurn = slice('function passTurn(', '\nasync function autoPlayTimeout()');
export const devToolsLabFixture = `
const {beginBossTurn,advanceBossTurn,isBossTurnActive,hasPendingBossChoices,completeBossPlayerTurn,prepareBossVaultTurn,isBossCardBlocked,notifyBossCardDiscarded}=window.labModules.engine;
const {getBossDefinitionForMode}=window.labModules.registry;
const {restoreUndoTransaction,createUndoTransaction}=window.labModules.undo;
const {bossStateRevision}=window.labModules.revisions;
let renderedBossFeedbackCount=null,renderedBossFeedbackEventIds=null;
const restoreUndoUiState=()=>{};
const queueDominationFriendTurn=()=>{},isCurrentBossMode=()=>!!state?.boss,packCard=card=>card;
const stockIsExhausted=s=>!s.finished&&!s.stock?.length&&!s.deadPiles?.some(p=>p?.length);
const canPerformCommonGameAction=s=>!s?.debugPaused&&!hasPendingBossChoices(s)&&!isBossTurnActive(s);
const showPendingBossChoiceMessage=()=>{};
${labPassTurn}
const saveStateForUndo=action=>localUndoStack.push(createUndoTransaction(state,{}, {actionType:action,actorPlayerId:0}));
const isGameSessionActive=(session,signal)=>!signal?.aborted&&!state?.debugPaused&&session===window.gameSessionId;
const botEngine={getState:()=>state,isActive:()=>!botTurnController.signal.aborted,botDelayScale:.0001,
  computeTeamMeldScore:()=>({total:0}),teamHasGoodCanastra:()=>true,showMessage,shouldForceStockDraw:()=>true,
  isValidSequenceMeld:()=>false,isCardBlocked:()=>false,hasPendingBossChoice:()=>hasPendingBossChoices(state),
  resolvePendingBossChoice:async playerId=>{const choice=window.labModules.engine.getBossPendingChoice(state,playerId);if(!choice)return null;return window.labModules.engine.resolveBossChoice(state,playerId,choice.options[0]);},
  executeDrawStock:async index=>{state.players[index].hand.push(state.stock.pop());state.hasDrawnThisTurn=true;await commitState();},
  ${labDiscard}
};
${labSessionEngine}
const BossBuracoBot=window.labModules.BossBuracoBot;
window.toggleDebugPanel=show=>{document.getElementById('debugPanel').style.display=show?'flex':'none';window.isDevToolsOpen=show;};
window.debugInstantStart=async(_mode,_seat,prepared)=>{myPlayerIndex=_seat;window.gameSessionId++;state=prepared;state.matchStartedAt=Date.now();state.historyTest=true;botTurnController=new AbortController();await commitState();};
${labUi}
window.devLab={async init(){await initBossDebugLab();},async start(bossId,abilityId=null){
  myPlayerIndex=0;
  const abilities=window.labModules.lab.getBossDebugCatalog().find(b=>b.id===bossId).abilities;
  const ability=abilityId?abilities.find(a=>a.id===abilityId):abilities[0];
  const config={bossId,abilityId:ability.id,phase:'auto',variant:'interactive',target:'auto'};
  const prepared=window.labModules.lab.buildBossDebugScenario(null,config);state=prepared.state;state.matchStartedAt=Date.now();
  beginBossTurn(state,{first:true,debug:true,now:Date.now()});state.currentPlayer=1;state.debugScenario.pauseAutomation=true;
  bossDebugLabBaseSnapshot=window.labModules.lab.createBossDebugSnapshot(state);bossDebugLabLastConfig=config;
  bossDebugLabObservedBaseline=structuredClone(state);document.getElementById('debugBossLabBoss').value=bossId;
  syncBossLabBossControls();document.getElementById('debugBossLabAbility').value=ability.id;syncBossLabAbilityControls({preservePhase:false});document.getElementById('debugBossLab').open=true;await refreshBossLabResourceControls();
  renderAll();return config;
},errors:()=>document.getElementById('debugBossLabError').textContent};
`;
