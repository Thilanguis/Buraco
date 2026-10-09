import { scenario, card, fixtureEngine } from '../tests/boss-cooperative-fixture.mjs';
import { BossBuracoBot as Current } from '../boss-bot.js';
import { rankBossDiscardPickups as currentRank } from '../js/boss/boss-bot-strategy.js';
import {loadBossBaseline} from './boss-baseline-loader.mjs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const baseline=process.argv[2]?await loadBossBaseline(process.argv[2]):null;
const BossBuracoBot=baseline?.BossBuracoBot||Current;
const rankBossDiscardPickups=baseline?(await import(pathToFileURL(join(baseline.directory,'js/boss/boss-bot-strategy.js')).href)).rankBossDiscardPickups:currentRank;
const s=scenario({stock:8});
for(const suit of ['♣','♥','♠','♦'])for(const rank of ['A','2','3','4','5','6','7','8','9','10','J','Q','K'])
  if(s.players[0].hand.length<50)s.players[0].hand.push(card(`h:${suit}:${rank}`,rank,suit));
s.discard=Array.from({length:50},(_,i)=>card(`p:${i}`,String(3+i%8),'♥'));
s.discard[s.discard.length-1]=card('top','5','♣');
try {
const pickupStart=performance.now();for(let i=0;i<20;i++)rankBossDiscardPickups(s,0);
const pickupMs=performance.now()-pickupStart;
class Fast extends BossBuracoBot { static async paceBetweenActions(){} }
const start=performance.now();try {await Fast.processMelds(0,{},fixtureEngine(s));}
catch(e){if(e.name!=='AbortError'||!s.boss.result?.victory)throw e;}
console.log(JSON.stringify({baseline:baseline?.revision||'workspace',pickup20RunsMs:pickupMs,stressMs:performance.now()-start}));
} finally {await baseline?.dispose();}
