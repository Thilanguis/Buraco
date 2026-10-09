import {writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {loadBossBaseline} from './boss-baseline-loader.mjs';
import {BossBuracoBot} from '../boss-bot.js';
import * as current from '../js/boss/boss-bot-strategy.js';
import {wildcardFixture} from '../tests/boss-wildcard-preservation-fixture.mjs';
import {fixtureEngine} from '../tests/boss-cooperative-fixture.mjs';
const baseline=await loadBossBaseline(process.argv[2]||'946c2ad');
try {
  const previous=await import(pathToFileURL(join(baseline.directory,'js/boss/boss-bot-strategy.js')));
  const rows=[];
  for(const kind of ['joker','two'])for(const situation of ['early','cheap','fatal','rich','victory','natural'])for(const seed of [41,73,901,7307]) {
    const {state,pickup,move}=wildcardFixture({kind,danger:situation==='fatal'?99:8,
      obligation:['cheap','fatal'].includes(situation),rich:situation==='rich',lethal:situation==='victory',natural:situation==='natural'});
    state.boss.seed=seed;pickup.boss.seed=seed;
    for(const [version,Bot,strategy] of [['old',baseline.BossBuracoBot,previous],['new',BossBuracoBot,current]]) {
      const choices=strategy.rankBossDiscardPickups(pickup,0),rank=strategy.rankBossMoves(state,0,[move]);
      const intent=Bot.evaluateDiscard(pickup,pickup.players[0].hand,pickup.teams[0],fixtureEngine(pickup),{});
      const probe=structuredClone(state),engine=fixtureEngine(probe,{auditWildcards:true});
      class Fast extends Bot {static getPlannerWorker(){return null;} static async paceBetweenActions(){}}
      try {await Fast.processMelds(0,{},engine);}
      catch(error) {if(error.name!=='AbortError'||!probe.boss.result?.victory)throw error;}
      rows.push({kind,situation,seed,version,handScore:rank[0]?.score,pickupScore:choices[0]?.score,
        stockPreferred:!intent,pickupCount:intent?choices.find(c=>JSON.stringify(c.intent)===JSON.stringify(intent))?.quote.count:0,
        handMoves:engine.metrics.moves,wildcardSpent:engine.metrics.wildcardSpent,
        diagnostics:choices[0]?.diagnostics||null,alternatives:choices.map(c=>({intent:c.intent,score:c.score,quote:c.quote})),
        stockScore:current.inspectBossBotDecision(pickup,0).stockScore});
    }
  }
  await mkdir('.cache',{recursive:true});
  await writeFile('.cache/bot-wildcard-preservation-audit.json',JSON.stringify({baseline:baseline.revision,rows},null,2));
  for(const kind of ['joker','two'])for(const situation of ['early','cheap','fatal','rich','victory','natural']) {
    console.log(JSON.stringify({kind,situation,rows:rows.filter(r=>r.kind===kind&&r.situation===situation&&r.seed===73)}));
  }
}finally {await baseline.dispose();}
