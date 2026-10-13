import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { distribution, summarize } from '../scripts/canastra-hp-summary.mjs';
import { gunzipSync } from 'node:zlib';
import { CURRENT_DAMAGE, PROPOSED_DAMAGE } from '../scripts/canastra-hp-loader.mjs';
import { readFileSync,existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const historicalManifest=new URL('../docs/metrics/canastra-hp-2026-10-12/manifest.json',import.meta.url);
const historicalInputsChanged=existsSync(historicalManifest) && (()=>{
  const manifest=JSON.parse(readFileSync(historicalManifest));
  return Object.entries(manifest.productionHashes).some(([p,hash])=>
    createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex')!==hash);
})();

function run(bossId, system='current', hp=2200) {
  return new Promise((resolve,reject) => {
    const worker = new Worker(new URL('../scripts/canastra-hp-experiment.mjs',import.meta.url),
      { workerData: { bossId,system,hp,start:120000,count:1 } });
    let row;
    worker.on('message',m => { if(m.error)reject(Error(m.error.message)); if(m.row)row=m.row; });
    worker.on('error',reject);
    worker.on('exit',code => code ? reject(Error(`exit ${code}`)) : resolve(row));
  });
}
test('Canastra HP: distribution includes zeros and proper median', () => {
  assert.deepEqual(distribution([0,0,1,3]), {n:4,mean:1,median:.5,min:0,max:3,p25:0,p75:1,histogram:{0:2,1:1,3:1}});
});
test('Canastra HP: old and proposed tables preserve incremental accounting', () => {
  assert.equal(CURRENT_DAMAGE.real-CURRENT_DAMAGE.limpa,120);
  assert.equal(PROPOSED_DAMAGE.real-PROPOSED_DAMAGE.limpa,300);
  assert.equal(PROPOSED_DAMAGE.asas-PROPOSED_DAMAGE.real,500);
});
test('Canastra HP: actual BOT battles are deterministic, physical deck and main damage reconcile', {skip:historicalInputsChanged}, async () => {
  const a=await run('nemesis'),b=await run('nemesis');
  const clean = r => { const {wallMs,...rest}=r; return rest; };
  assert.deepEqual(clean(a),clean(b));
  assert.ok(a.complete);
  assert.equal(a.damage.mainAttack+a.damage.dagger-a.damage.bossHealing, a.initialHp-a.hp);
  assert.ok(a.maxZombies <= 3);
  assert.ok(a.hits.every(h => h.targetId));
});
test('Canastra HP: proposed graph is isolated and candidate HP survives normalization', {skip:historicalInputsChanged}, async () => {
  const a=await run('nemesis','current',2200),b=await run('nemesis','proposed',2400);
  assert.equal(a.deckHash,b.deckHash);
  assert.equal(b.initialHp,2400);
  assert.ok(b.events.filter(e => e.type==='bossDamage').every(e => e.cardDamage >= 0));
  assert.ok(b.damage.bonuses > a.damage.bonuses);
});
test('Canastra HP: Dimitrescu uses real items, sacrifices conserve 108 physical cards', {skip:historicalInputsChanged}, async () => {
  const a=await run('dimitrescu','current',2000);
  assert.ok(a.complete);
  assert.ok(a.itemsUsed.length > 0);
  assert.ok(a.damage.bleed > 0);
  assert.ok(a.damage.mainAttack > 0);
  assert.equal(a.damage.mainAttack+a.damage.dagger-a.damage.bossHealing,a.initialHp-a.hp);
});
test('Canastra HP: incomplete BOT attempts are censored, not losses', () => {
  const row={complete:false,victory:null,reason:'bot_incomplete_turn',initialHp:2000,damage:{cards:0},errors:[],itemsUsed:[]};
  const s=summarize([row]);assert.equal(s.censored,1);assert.equal(s.losses,0);assert.equal(s.wins,0);
});
test('Canastra HP: official cohort has 600 + 600 + 600 complete, paired, independently simulated battles',
  {skip:!existsSync(new URL('../docs/metrics/canastra-hp-2026-10-12/cohort.json',import.meta.url))}, () => {
    const c=JSON.parse(readFileSync(new URL('../docs/metrics/canastra-hp-2026-10-12/cohort.json',import.meta.url)));
    assert.equal(c.totals.primaryBaseline,600);assert.equal(c.totals.primaryProposed,600);
    assert.equal(c.totals.primaryRecommended,600);assert.equal(c.totals.healthReconciled,c.totals.attempts);
    assert.equal(Object.keys(c.cohorts).length,6);
    for(const g of Object.values(c.cohorts)) {
      assert.equal(g.seeds.length,100);assert.equal(new Set(g.seeds).size,100);
      for(const key of ['current','proposed','recommended']) {
        assert.equal(g[key].completed,100);assert.equal(g[key].censored,0);
        assert.equal(g[key].wins+g[key].losses,100);
        assert.equal(Object.values(g[key].highestCounts.asas.histogram).reduce((a,b)=>a+b,0),100);
      }
    }
});
test('Canastra HP: replay matches the actual archived trajectory, not only another fresh run',
  {skip:historicalInputsChanged||!existsSync(new URL('../docs/metrics/canastra-hp-2026-10-12/nemesis-current.jsonl.gz',import.meta.url))},async()=>{
    const rows=gunzipSync(readFileSync(new URL('../docs/metrics/canastra-hp-2026-10-12/nemesis-current.jsonl.gz',import.meta.url)))
      .toString('utf8').trim().split('\n').map(JSON.parse);
    const archived=rows.find(r=>r.seed===120000),actual=await run('nemesis');
    assert.equal(actual.deckHash,archived.deckHash);
    assert.equal(actual.hp,archived.hp);assert.equal(actual.turns,archived.turns);
    // JSONL intentionally omits undefined optional properties, as Firebase packing does.
    const serialized=value=>JSON.parse(JSON.stringify(value));
    assert.deepEqual(serialized(actual.events),archived.events);
    assert.deepEqual(serialized(actual.actions),archived.actions);
});
