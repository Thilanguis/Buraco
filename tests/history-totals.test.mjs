import test from 'node:test';
import assert from 'node:assert/strict';
import { loadHistoryTotals } from '../js/history-totals.js';
const match=(id,winner,category='players')=>({matchId:id,category,winnerTeamId:winner,participants:[{uid:'me',teamId:0}],teams:[{id:0,score:100}]});
test('total percorre páginas, deduplica e conta somente entre jogadores',async()=>{
 const calls=[];
 const result=await loadHistoryTotals('me',async(uid,cursor)=>{
  calls.push([uid,cursor]);
  return cursor?{matches:[match('1',0),match('3',null),match('4',0,'test'),match('5',0,'bots'),match('6',0,'boss')],hasMore:false}:{matches:[match('1',0),match('2',1)],cursor:'next',hasMore:true};
 });
 assert.equal(result.played,3);assert.equal(result.winRate,33);assert.deepEqual(calls,[['me',null],['me','next']]);
});
test('sem partidas, falha parcial e cursor inválido',async()=>{
 assert.equal((await loadHistoryTotals('me',async()=>({matches:[],hasMore:false}))).played,0);
 await assert.rejects(loadHistoryTotals('me',async()=>{throw Error('offline');}),/offline/);
 await assert.rejects(loadHistoryTotals('me',async()=>({matches:[],hasMore:true,cursor:null})),/Paginação/);
});
