import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadBossBaseline} from '../scripts/boss-baseline-loader.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),baseline=await loadBossBaseline(process.env.BOT_BASELINE||'f0d4551');
const server=createServer(async(req,res)=>{
  try {
    const path=new URL(req.url,'http://localhost').pathname;
    if(path==='/fixture'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body>BOT performance fixture</body>');}
    const old=path.startsWith('/baseline/'),base=old?baseline.directory:root;
    const file=resolve(base,'.'+decodeURIComponent(old?path.slice('/baseline'.length):path));
    if(!file.startsWith(base+sep))throw Error('outside root');
    res.setHeader('Content-Type',{'.js':'text/javascript','.mjs':'text/javascript'}[extname(file)]||'text/plain');res.end(await readFile(file));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));let browser;const results=[];
try {
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const [width,cpu] of [[1920,1],[1376,4],[390,6]]) {
    const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<1920}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/fixture');
    const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
    const measurements=await page.evaluate(async()=>{
      const {BossBuracoBot:New}=await import('/boss-bot.js'),{BossBuracoBot:Old}=await import('/baseline/boss-bot.js');
      const {scenario,fixtureEngine,card}=await import('/tests/boss-cooperative-fixture.mjs');
      const run=(prefix,ranks,suit='♣')=>ranks.map(r=>card(prefix+r,r,suit));
      const out=[],longTasks=[];
      const observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>e.duration)));
      observer.observe({type:'longtask',buffered:false});
      for(const kind of ['Lixo20','Lixo50','destinations20','destinations50','hand17','hand50']) {
        for(let sample=-1;sample<9;sample++) for(const [version,Bot] of sample%2?[['new',New],['old',Old]]:[['old',Old],['new',New]]) {
          const s=scenario({stock:8});let worker=false;
          class Fast extends Bot {
            static async paceBetweenActions(){}
            static getPlannerWorker(){const w=super.getPlannerWorker();worker ||= !!w;return w;}
          }
          if(kind.startsWith('hand')) {
            s.players[0].hand=kind==='hand17'?[...run('c',['3','4','5','6','7','8','9','10','J','Q','K','A']),...run('h',['3','4','5','6'],'♥'),card('keep')]:[];
            if(kind==='hand50')for(const suit of ['♣','♥','♠','♦'])for(const rank of ['A','2','3','4','5','6','7','8','9','10','J','Q','K'])
              if(s.players[0].hand.length<50)s.players[0].hand.push(card('large:'+suit+':'+rank,rank,suit));
            s.deadPiles=[[card('dead')]];
          } else {
            const size=kind.endsWith('50')?50:20,many=kind.startsWith('destinations');
            s.players[0].hand=[...run('own',many?['4','5','7']:['3','4']),card('keep')];
            if(many)s.teams[0].melds=Array.from({length:20},(_,i)=>run('table:'+i+':',['3','4','5']));
            s.discard=[...Array.from({length:size-1},(_,i)=>card('pile:'+i,String(3+i%8),'♥')),card('top',many?'6':'5','♣')];
          }
          longTasks.length=0;const start=performance.now();let pickup;
          if(kind.startsWith('hand')) {try {await Fast.processMelds(0,{},fixtureEngine(s));}catch(e){if(e.name!=='AbortError'||!s.boss.result?.victory)throw e;}}
          else pickup=Fast.evaluateDiscard(s,s.players[0].hand,s.teams[0],fixtureEngine(s),{isDuo:true,tookMorto:true});
          const ms=performance.now()-start;
          await new Promise(r=>setTimeout(r,30));
          const clean=s.teams[0].melds.some(m=>m.length>=7&&!m.some(c=>c.joker));
          if(version==='new'&&kind.startsWith('hand')&&!clean)throw Error('clean route lost');
          if(version==='new'&&!kind.startsWith('hand')&&pickup?.action!=='new')throw Error('full pickup starved');
          if(kind.startsWith('hand')&&!worker)throw Error('real Worker not exercised');
          if(sample>=0)out.push({kind,version,ms,maxLongTaskMs:Math.max(0,...longTasks),worker,clean,pickup:pickup?.action||false});
          Fast.destroyPlannerWorker();
        }
      }
      const stale=scenario();stale.players[0].hand=Array.from({length:20},(_,i)=>card('stale:'+i,String(3+i%8),'♣'));
      class SyncBot extends New {static async planTriples(s,i,e,signal){const pending=super.planTriples(s,i,e,signal);s.boss.danger++;return pending;}}
      let rejected=false;
      try{await SyncBot.planTriples(stale,0,fixtureEngine(stale));}catch(e){if(e.code!=='BOT_PLAN_STALE')throw e;rejected=true;}
      SyncBot.destroyPlannerWorker();observer.disconnect();if(!rejected)throw Error('stale real Worker accepted');
      const nativeYield=typeof globalThis.scheduler?.yield==='function',descriptor=Object.getOwnPropertyDescriptor(globalThis,'scheduler'),fallback=[];
      Object.defineProperty(globalThis,'scheduler',{configurable:true,value:undefined});
      try {
        for(let sample=-1;sample<3;sample++) {
          const s=scenario({stock:8});s.players[0].hand=[];
          for(const suit of ['♣','♥','♠','♦'])for(const rank of ['A','2','3','4','5','6','7','8','9','10','J','Q','K'])
            if(s.players[0].hand.length<50)s.players[0].hand.push(card('fallback:'+suit+':'+rank,rank,suit));
          s.deadPiles=[[card('dead')]];
          class Fast extends New {static async paceBetweenActions(){}}
          const start=performance.now();try {await Fast.processMelds(0,{},fixtureEngine(s));}catch(e){if(e.name!=='AbortError'||!s.boss.result?.victory)throw e;}
          if(!s.teams[0].melds.some(m=>m.length>=7&&!m.some(c=>c.joker)))throw Error('fallback clean route lost');
          if(sample>=0)fallback.push(performance.now()-start);Fast.destroyPlannerWorker();
        }
        const controller=new AbortController();controller.abort();
        try {await New.cooperativeYield(fixtureEngine(scenario()),controller.signal);throw Error('fallback accepted cancellation');}
        catch(e){if(e.name!=='AbortError')throw e;}
      } finally {if(descriptor)Object.defineProperty(globalThis,'scheduler',descriptor);else delete globalThis.scheduler;}
      return {samples:out,staleRejected:rejected,nativeYield,messageChannelFallbackMs:fallback};
    });
    assert.deepEqual(errors,[]);const result={width,cpuThrottle:cpu,baseline:baseline.revision,...measurements};
    results.push(result);console.log(JSON.stringify({width,cpuThrottle:cpu,samples:measurements.samples.length,staleRejected:measurements.staleRejected,nativeYield:measurements.nativeYield}));await context.close();
  }
  if(process.env.BOT_PERF_OUTPUT)await writeFile(process.env.BOT_PERF_OUTPUT,JSON.stringify(results,null,2));
} finally {await browser?.close();await new Promise(done=>server.close(done));await baseline.dispose();}
