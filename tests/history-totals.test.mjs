import test from 'node:test';
import assert from 'node:assert/strict';
import { loadHistoryTotals, playerHistoryStats } from '../js/history-totals.js';
const match=(id,winner,category='players')=>({matchId:id,category,winnerTeamId:winner,participants:[{uid:'me',teamId:0}],teams:[{id:0,score:100}]});
test('total inclui todas as páginas, sem bots, chefes, testes ou duplicatas',async()=>{
 const calls=[];
 const result=await loadHistoryTotals('me',async(uid,cursor)=>{
  calls.push([uid,cursor]);
  return cursor?{matches:[match('1',0),match('3',null),match('4',0,'test'),match('5',0,'bots'),match('6',0,'boss')],hasMore:false}:{matches:[match('1',0),match('2',1)],cursor:'next',hasMore:true};
 });
 assert.equal(result.played,3);assert.equal(result.winRate,33);assert.deepEqual(calls,[['me',null],['me','next']]);
});
test('exemplo da tela: 21 partidas entre jogadores, uma vitória, 5%',()=>{
 const matches=[...Array.from({length:21},(_,i)=>match(String(i),i===0?0:1)),...Array.from({length:8},(_,i)=>match('bot'+i,0,'bots')),match('boss',1,'boss'),match('test',0,'test')];
 const stats=playerHistoryStats(matches,'me');
 assert.equal(stats.played,21);assert.equal(stats.wins,1);assert.equal(stats.winRate,5);
});
test('sem partidas e erro de consulta',async()=>{
 assert.equal((await loadHistoryTotals('me',async()=>({matches:[],hasMore:false}))).played,0);
 await assert.rejects(loadHistoryTotals('me',async()=>{throw Error('offline');}),/offline/);
});
test('a 31ª partida real aumenta a contagem',async()=>{
 const first=Array.from({length:30},(_,i)=>match(String(i),1));
 const load=items=>async(uid,cursor)=>cursor?{matches:items.slice(30),hasMore:false}:{matches:items.slice(0,30),hasMore:items.length>30,cursor:'next'};
 assert.equal((await loadHistoryTotals('me',load(first))).played,30);
 assert.equal((await loadHistoryTotals('me',load([match('new',0),...first]))).played,31);
});
