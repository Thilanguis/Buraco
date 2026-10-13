// Reproducible batches. One independent module graph per scenario/worker.
import { isMainThread, Worker, parentPort, workerData } from 'node:worker_threads';
import { mkdirSync, writeFileSync, appendFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { installExperimentHooks, CURRENT_HP, CURRENT_DAMAGE, PROPOSED_DAMAGE } from './canastra-hp-loader.mjs';

if (!isMainThread) {
  const changes = installExperimentHooks(workerData);
  const { battle } = await import('./canastra-hp-battle.mjs');
  for (let i = 0; i < workerData.count; i++) {
    const start = performance.now();
    try {
      const row = await battle(workerData.bossId, workerData.start + i, workerData);
      parentPort.postMessage({ row, elapsedMs: performance.now() - start });
    } catch (error) {
      parentPort.postMessage({ error: { bossId: workerData.bossId, seed: workerData.start + i,
        system: workerData.system, hp: workerData.hp, message: error.message, stack: error.stack,
        state: error.simulationState } });
      break;
    }
  }
  parentPort.postMessage({ done: true, changes });
} else {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => { const [k,...v] = arg.replace(/^--/,'').split('='); return [k,v.join('=')]; }));
  const count = Number(args.count || 100), start = Number(args.start || 120000);
  const output = resolve(args.output || 'docs/metrics/canastra-hp-2026-10-12');
  const bosses = args.bosses ? args.bosses.split(',') : Object.keys(CURRENT_HP);
  const scenarios = args.scenarios ? args.scenarios.split(',') : ['current','proposed'];
  const hpMap = args.hp ? JSON.parse(args.hp) : {};
  const concurrency = Number(args.workers || 4), batch = Number(args.batch || 10);
  mkdirSync(output, { recursive: true });
  const tracked = execFileSync('git', ['ls-files','app.js','boss-bot.js','js','scripts/canastra-hp-loader.mjs',
    'scripts/canastra-hp-battle.mjs','scripts/canastra-hp-experiment.mjs'], { encoding: 'utf8' }).trim().split('\n')
    .filter(p => /\.m?js$/.test(p));
  const hashes = Object.fromEntries(tracked.map(p => [p, createHash('sha256').update(readFileSync(p)).digest('hex')]));
  const manifest = { startedAt: new Date().toISOString(), node: process.version,
    revision: execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), count, start, bosses, scenarios,
    hpMap, currentDamage: CURRENT_DAMAGE, proposedDamage: PROPOSED_DAMAGE, currentHp: CURRENT_HP,
    pair: 'production BossBuracoBot + production BossBuracoBot',
    scheduling: 'No animation sleeps or worker scheduling; unchanged decision algorithm, canonical app.js botEngine',
    special: 'Existing BOT has no automatic activation of team Special; no artificial policy added.',
    productionHashes: hashes, command: process.argv };
  writeFileSync(resolve(output,'manifest.json'), JSON.stringify(manifest,null,2));
  const definitions = bosses.flatMap(bossId => scenarios.map(system => ({ bossId, system: system === 'current' ? 'current':'proposed',
    label: args.label || system, hp: system === 'candidate' ? (hpMap[bossId] ?? CURRENT_HP[bossId]) : CURRENT_HP[bossId] })));
  for (const job of definitions) writeFileSync(resolve(output,`${job.bossId}-${job.label}.jsonl`),'');
  writeFileSync(resolve(output,'errors.jsonl'),'');
  const queue = definitions.flatMap(job => Array.from({length:Math.ceil(count/batch)},(_,i) =>
    ({...job, count:Math.min(batch,count-i*batch),start:start+i*batch})));
  let active = 0, delivered = 0, failed = 0;
  await new Promise((done,reject) => {
    const dispatch = () => {
      while (active < concurrency && queue.length) {
        const job = queue.shift(); active++;
        const path = resolve(output,`${job.bossId}-${job.label}.jsonl`);
        const worker = new Worker(new URL(import.meta.url), { workerData: job });
        let jobCount = 0;
        worker.on('message', message => {
          if (message.row) {
            appendFileSync(path, JSON.stringify({ ...message.row, scenario: job.label, wallMs: message.elapsedMs })+'\n');
            delivered++; jobCount++;
            if (jobCount % 10 === 0 || jobCount === count) console.log(JSON.stringify({ bossId:job.bossId,
              scenario:job.label, completed:jobCount, total:count, delivered, complete:message.row.complete,
              victory:message.row.victory, wallMs:Math.round(message.elapsedMs) }));
          }
          if (message.error) { failed++; appendFileSync(resolve(output,'errors.jsonl'),JSON.stringify(message.error)+'\n'); console.error(message.error); }
        });
        worker.on('error', reject);
        worker.on('exit', code => {
          active--; if (code) return reject(Error(`Worker exited ${code}`));
          if (!active && !queue.length) done(); else dispatch();
        });
      }
    };
    dispatch();
  });
  const changed = tracked.filter(p => createHash('sha256').update(readFileSync(p)).digest('hex') !== hashes[p]);
  writeFileSync(resolve(output,'completion.json'),JSON.stringify({ endedAt:new Date().toISOString(),delivered,failed,
    productionFilesChanged:changed },null,2));
  console.log(JSON.stringify({ delivered,failed,productionFilesChanged:changed,output }));
  if (changed.length || failed) process.exitCode = 1;
}
