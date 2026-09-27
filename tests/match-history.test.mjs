import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { buildMatchSummary, historyIdentity, historyStats, resultFor, prepareHistoryWrites } from '../js/match-history.js';

const state = { finished: true, matchStartedAt: 1000, matchFinishedAt: 61000, mode: '1x1', variant: 'aberto', winnerTeamId: 0, players: [{id:0,name:'Maria',accountUid:'u1',teamId:0},{id:1,name:'João',accountUid:'u2',teamId:1}] };
const scores = [{team:{id:0,name:'Time 1',pix:'secret-pix'},score:200,meldPoints:300,sujaBonus:100,handPenalty:200,bonusBatida:100},{team:{id:1,name:'Time 2'},score:600,limpaBonus:200,realBonus:500,asasBonus:1000}];

test('resumo usa placar, separa batida, não inclui Pix, cartas ou e-mail', () => {
  const summary = buildMatchSummary('room',state,scores);
  assert.equal(summary.matchId,'room_1000');
  assert.equal(summary.durationSeconds,60);
  assert.equal(summary.winnerTeamId,1);
  assert.equal(summary.finisherTeamId,0);
  assert.equal(resultFor(summary,'u1'),'loss');
  assert.equal(resultFor(summary,'u2'),'win');
  assert.equal(summary.teams[1].canastras.asas,1);
  assert.equal(summary.teams[1].canastras.limpa,1);
  assert.doesNotMatch(JSON.stringify(summary),/secret-pix|hand"|email"/);
  assert.equal(buildMatchSummary('room',{...state,finished:false},scores),null);
  assert.equal(buildMatchSummary('room',{...state,players:[{name:'BOT',id:0,teamId:0}]},scores),null);
});

test('empate, chefes, bots e testes têm classificação própria', () => {
  const tie = buildMatchSummary('room',state,scores.map(s=>({...s,score:100})));
  assert.equal(resultFor(tie,'u1'),'draw');
  const boss = buildMatchSummary('room',{...state,mode:'boss_matriarca',boss:{result:{victory:true,reason:'boss_defeated'}}},scores);
  assert.equal(boss.category,'boss');
  assert.equal(resultFor(boss,'u1'),'win');
  const bot = buildMatchSummary('room',{...state,players:[state.players[0],{...state.players[1],name:'BOT João',accountUid:null}]},scores);
  assert.equal(bot.category,'bots');
  assert.deepEqual(bot.participantIds,['u1']);
  const debug = buildMatchSummary('room',{...state,historyTest:true},scores);
  assert.equal(debug.category,'test');
  const stats = historyStats([tie,boss,debug],'u1');
  assert.equal(stats.played,2); assert.equal(stats.wins,1); assert.equal(stats.draws,1); assert.equal(stats.winRate,50);
});

test('encerramento grava todos os participantes; repetição não duplica e revanche tem outro ID', async () => {
  const data = new Map();
  const transaction = {update:(ref,value)=>data.set(ref,value),set:(ref,value)=>data.set(ref,value)};
  const summary = buildMatchSummary('room',state,scores);
  const options = {db:{},doc:(_db,...path)=>path.join('/'),gameRef:'game',summary,uid:'u1'};
  (await prepareHistoryWrites(transaction,options))();
  (await prepareHistoryWrites(transaction,options))();
  assert.equal(data.size,3);
  assert.deepEqual(data.get('userProfiles/u2/matches/room_1000'),summary);
  assert.notEqual(historyIdentity('room',state),historyIdentity('room',{...state,matchStartedAt:2000}));
  data.clear(); (await prepareHistoryWrites(transaction,{...options,uid:'spectator'}))();
  assert.equal(data.size,0);
});

test('commit final integra escrita do histórico na mesma transação', async () => {
  const app = readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const source = app.slice(app.indexOf('async function commitState()'),app.indexOf('function passTurn('));
  const writes=[];
  const ctx = {state:{...state,stock:[{}],lastAction:{},pauseControlRevision:0},window:{isClosingGame:false},pendingCommit:false,committing:false,structuredClone,db:{},gameRef:'game',pauseBlocksPlay:()=>false,localUndoStack:[],console,
    prepareMatchHistory: async tx => () => tx.set('history',{finished:true}),
    runTransaction: async (_db,fn) => fn({get:async()=>({exists:()=>true,data:()=>({stateJson:JSON.stringify(ctx.state)})}),update:(...args)=>writes.push(['update',...args]),set:(...args)=>writes.push(['set',...args])})};
  vm.createContext(ctx); vm.runInContext(source,ctx); await ctx.commitState();
  assert.deepEqual(writes.map(w=>w[0]),['update','set']);
});
