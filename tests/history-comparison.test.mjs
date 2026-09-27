import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisonPlayers, comparePlayers } from '../js/history-comparison.js';
function match(id, winner=0, team=1, extra={}) { return { matchId:id,finishedAt:Number(id),mode:'1x1',category:'players',winnerTeamId:winner,participants:[{uid:'g',name:'Gabriel',teamId:0},{uid:'l',name:'Luana',teamId:team}],teams:[{id:0,score:-100},{id:1,score:200}],...extra }; }
test('confrontos ordenam, deduplicam, calculam empates, sequência e pontos negativos',()=>{
 const list=[match('1',1),match('3'),match('2'),match('0',null),match('3')];
 const s=comparePlayers(list,'g','l');
 assert.equal(s.played,4);assert.equal(s.wins,2);assert.equal(s.losses,1);assert.equal(s.draws,1);
 assert.deepEqual(s.streak,{outcome:'win',count:2});assert.deepEqual(s.mine,{best:-100,average:-100});
 assert.equal(comparePlayers([match('2',null),match('1')],'g','l').streak.outcome,'draw');
});
test('parceiros, modalidades, bots e testes não se confundem',()=>{
 const list=[match('1'),match('2',0,0,{mode:'2x2'}),match('3',0,1,{category:'test'}),match('4',0,1,{category:'bots'}),match('5',0,1,{participants:[{uid:'g',name:'Gabriel',teamId:0},{uid:'l',name:'BOT Luana',teamId:1}]})];
 assert.equal(comparePlayers(list,'g','l').played,1);
 assert.equal(comparePlayers(list,'g','l','partners').played,1);
 assert.equal(comparePlayers(list,'g','l','opponents','2x2').played,0);
 assert.equal(comparePlayers(list,'g','g').played,0);
 assert.equal(comparePlayers(list,'g','missing').mine.best,null);
});
test('identidade usa UID, não nome, e preserva nome mais recente',()=>{
 const list=[match('1'),match('2',0,1,{participants:[{uid:'g',name:'Biel',teamId:0},{uid:'l',name:'Luana Nova',teamId:1},{uid:null,name:'Luana',teamId:1}]})];
 assert.deepEqual(comparisonPlayers(list,'g'),[{uid:'l',name:'Luana Nova'}]);
 assert.equal(comparePlayers(list,'g','l').played,2);
 assert.deepEqual(comparisonPlayers(list,'outsider'),[]);
});
