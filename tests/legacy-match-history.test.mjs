import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLegacySummary } from '../js/legacy-match-history.js';
const aliases = { gabriel: 'g', biel: 'g', luana: 'l' };
const state = { finished: true, mode: '1x1', players: [{id:0,name:' Biel ',teamId:0},{id:1,name:'Luana',teamId:1}], winnerTeamId:0, lastAction:{ts:5000} };
const scores = [{team:{id:0,name:'Time 1'},score:100},{team:{id:1,name:'Time 2'},score:50}];
test('aliases confirmados, datas honestas e origem intacta', () => {
 const before=JSON.stringify(state);
 const s=buildLegacySummary('room',state,aliases,scores,9000);
 assert.deepEqual(s.participantIds,['g','l']);
 assert.equal(s.matchId,'legacy_room');assert.equal(s.startedAt,null);assert.equal(s.durationSeconds,null);
 assert.equal(s.finishedAt,5000);assert.equal(s.legacyImport.approximateDate,true);
 assert.equal(JSON.stringify(state),before);
 assert.deepEqual(s,buildLegacySummary('room',state,aliases,scores,9000));
});
test('bots nunca herdam a conta e testes continuam separados', () => {
 const s=buildLegacySummary('r',{...state,historyTest:true,players:[state.players[0],{...state.players[1],name:'BOT Luana',accountUid:'l'}]},aliases,scores,9000);
 assert.deepEqual(s.participantIds,['g']);assert.equal(s.participants[1].uid,null);assert.equal(s.category,'test');
 assert.equal(buildLegacySummary('r',{...state,finished:false},aliases,scores,9000),null);
 assert.equal(buildLegacySummary('r',{...state,players:[{name:'BOT Luana',id:0,teamId:0}]},aliases,scores,9000),null);
});
test('conflitos de conta bloqueiam e horários reais são preservados', () => {
 assert.throws(()=>buildLegacySummary('r',{...state,players:[{...state.players[0],accountUid:'other'}]},aliases,scores,9000));
 const s=buildLegacySummary('r',{...state,matchStartedAt:1000,matchFinishedAt:5000},aliases,scores,9000);
 assert.equal(s.durationSeconds,4);assert.equal(s.matchId,'r_1000');assert.equal(s.legacyImport.approximateDate,false);
});
