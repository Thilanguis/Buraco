import fs from 'node:fs';
import vm from 'node:vm';
import * as rules from '../js/boss/boss-engine.js';
import { selectBossRecoveryDiscardIndex } from '../js/boss/boss-bot-strategy.js';
import { scenario,card } from './boss-cooperative-fixture.mjs';
export function castleScenario(type='explosive') {
  const s=scenario({bossId:'dimitrescu'});s.boss.bossFlow={stage:'players'};
  s.players[0].hand=[card('item','K','♥'),card('ordinary','3','♦'),card('reserve','Q','♠')];
  s.boss.castleItems={item:{type,consumed:false}};return s;
}
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
export function appItemEngine(s) {
  const metrics={commits:0,renders:0,actions:[]};let serial=0;
  const context=vm.createContext({state:s,...rules,selectBossRecoveryDiscardIndex,
    canPerformCommonGameAction:x=>!x.finished&&!x.boss?.result&&!x.boss?.pendingChoices?.length,
    newActionId:()=>`action:${++serial}`,renderAll:()=>metrics.renders++,packCard:c=>structuredClone(c),
    takeDeadIfAvailableForPlayer:()=>null,canTeamTakeDeadNow:()=>false,teamHasGoodCanastra:()=>true,
    stockIsExhausted:()=>false,finishGame:async()=>{s.finished=true;},
    passTurn:()=>{rules.completeBossPlayerTurn(s,s.players[s.currentPlayer].id,{deferNextBossTurn:true});s.currentPlayer=1-s.currentPlayer;s.turnNumber++;s.hasDrawnThisTurn=false;}});
  const itemMethod=app.slice(app.indexOf('  async executeCastleItems(playerId) {'),app.indexOf('  getNeheleniaPriorities:',app.indexOf('  async executeCastleItems(playerId) {')));
  const discardMethod=app.slice(app.indexOf('  async executeDiscard(botIndex, cardIndex) {'),app.indexOf('\n};\n\nfunction createBotEngineForSession',app.indexOf('  async executeDiscard(botIndex, cardIndex) {')));
  const methods=vm.runInContext(`({${itemMethod}\n${discardMethod}})`,context);
  const engine={...methods,getState:()=>s,isActive:()=>!s.finished,canRunDuringDebugPause:()=>false,
    commitState:async()=>{metrics.commits++;metrics.actions.push(structuredClone(s.lastAction));}};
  return {engine,metrics,context};
}
export async function runWatchdog(s,engine,context) {
  Object.assign(context,{AbortController,botTurnController:new AbortController(),myPlayerIndex:1,
    window:{gameSessionId:'same-session',activeBotTurn:{promise:Promise.resolve()}},
    createBotEngineForSession:()=>engine,showMessage:()=>{}});
  s.players[0].name='BOT Luana';s.players[1].name='Humano';
  const start=app.indexOf('async function recoverTimedOutBotTurn()');
  const tail=app.slice(start);const next=/\n(?:async )?function /.exec(tail.slice(1));
  const fn=tail.slice(0,next.index+1);
  await vm.runInContext(`(${fn})()`,context);
}
