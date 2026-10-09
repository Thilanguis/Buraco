import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const root=fileURLToPath(new URL('..',import.meta.url));
const old=execFileSync('git',['show','9faa112348b1ba2656a28b342d8f6799a612cc45:boss-bot.js'],{encoding:'utf8'});
const server=createServer(async(req,res)=>{
  try{const path=new URL(req.url,'http://localhost').pathname;
    if(path==='/old.js'){res.setHeader('Content-Type','text/javascript');return res.end(old);}
    if(path==='/fixture'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body>BOT cooperative performance fixture</body>');}
    const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root))throw Error('outside root');
    res.setHeader('Content-Type',{'.js':'text/javascript','.mjs':'text/javascript'}[extname(file)]||'text/plain');res.end(await readFile(file));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));let browser;
try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const [width,cpu] of [[1920,1],[1376,4],[390,6]]){
    const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<1920}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/fixture');
    const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
    const samples=await page.evaluate(async()=>{
      const {BossBuracoBot:New}=await import('/boss-bot.js'),{BossBuracoBot:Old}=await import('/old.js');
      const {scenario,fixtureEngine,card}=await import('/tests/boss-cooperative-fixture.mjs');
      const out=[];
      for(const [version,Bot] of [['old',Old],['new',New]])for(const size of [20,50]){
        const s=scenario({stock:8});s.players[0].hand=[card('a','3','♣'),card('b','4','♣'),card('keep')];
        s.discard=[...Array.from({length:size-1},(_,i)=>card(`pile:${i}`,String(3+i%8),'♥')),card('top','5','♣')];
        const engine=fixtureEngine(s),start=performance.now();const decision=Bot.evaluateDiscard(s,s.players[0].hand,s.teams[0],engine,{isDuo:true,tookMorto:true});
        out.push({version,size,ms:performance.now()-start,pickup:!!decision?.wants});
      }
      class Fast extends New {static async paceBetweenActions(){} }
      const s=scenario();s.players[0].hand=[...['3','4','5','6','7','8','9','10','J','Q','K','A'].map(r=>card('own:'+r,r,'♣')),
        ...['3','4','5','6'].map(r=>card('other:'+r,r,'♥')),card('keep')];s.deadPiles=[[card('dead')]];
      const start=performance.now();await Fast.processMelds(0,{},fixtureEngine(s));
      out.push({version:'new',kind:'Worker + ranked melds',ms:performance.now()-start,clean:s.teams[0].melds.some(m=>m.length>=7&&!m.some(c=>c.joker))});
      const large=scenario();large.players[0].hand=[];
      for(const suit of ['♣','♥','♠','♦'])for(const rank of ['A','2','3','4','5','6','7','8','9','10','J','Q','K'])
        if(large.players[0].hand.length<50)large.players[0].hand.push(card(`large:${suit}:${rank}`,rank,suit));
      large.deadPiles=[[card('large:dead')]];
      const largeStart=performance.now();await Fast.processMelds(0,{},fixtureEngine(large));
      out.push({version:'new',kind:'50-card hand stress',ms:performance.now()-largeStart,
        clean:large.teams[0].melds.some(m=>m.length>=7&&!m.some(c=>c.joker))});
      New.destroyPlannerWorker();return out;
    });
    assert.ok(samples.filter(s=>s.version==='new'&&s.size).every(s=>s.pickup));
    assert.ok(samples.at(-1).clean);assert.deepEqual(errors,[]);
    console.log(JSON.stringify({width,cpuThrottle:cpu,samples}));await context.close();
  }
}finally{await browser?.close();await new Promise(done=>server.close(done));}
