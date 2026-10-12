import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { SPECIAL_STAGE_SELECTOR, SPECIAL_PRESENTATION, SPECIAL_CHARACTER_ASSETS } from '../js/boss/ui/cooperative-special-presentation.js';
import { getAudioBalance } from '../js/audio-balance.js';

// Called by the actual app-handler fixture, sharing its two-client CAS transport.
export async function runSpecialPresentationCases({a,b,width,height,evidence,setSnapshot,getSnapshot}) {
  let referenceFrame;
  const installMetrics = async page => page.evaluate(() => {
    window.specialMetrics={characters:0,flights:0,arrivals:0,audio:[],heroAt:null,gains:[]};
    const context=p0.specialAudioContext();
    context.originalCreateGain ||= context.createGain.bind(context);
    context.createGain=()=>{const node=context.originalCreateGain();specialMetrics.gains.push(node);return node;};
    if(!window.specialNativePlay){
      window.specialNativePlay=HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play=function(...args){
        if(this.src.includes('/sfx/special/')){
          const record={src:this.src,at:performance.now(),media:this,playing:false};specialMetrics.audio.push(record);
          this.addEventListener('playing',()=>record.playing=true,{once:true});
        }
        if(window.blockedSpecialPlay&&this.src.includes('/sfx/special/'))return Promise.reject(new DOMException('Blocked test','NotAllowedError'));
        return window.specialNativePlay.apply(this,args);
      };
    }
    window.specialObserver?.disconnect();
    window.specialObserver=new MutationObserver(records=>{
      for(const record of records)for(const el of record.addedNodes){
        if(el.classList?.contains('boss-special-character'))specialMetrics.characters++;
        if(el.classList?.contains('boss-special-stage')){specialMetrics.characters+=el.querySelectorAll('.boss-special-character').length;specialMetrics.heroAt=performance.now();}
        if(el.classList?.contains('boss-special-flight'))specialMetrics.flights++;
        if(el.classList?.contains('boss-special-arrival'))specialMetrics.arrivals++;
      }
    });window.specialObserver.observe(document.body,{childList:true});
  });
  const quiet = page => page.waitForFunction(()=>!document.querySelector('.boss-special-stage, .boss-special-character, .boss-special-flight, .boss-special-arrival'));
  const metrics = page => page.evaluate(()=>({characters:specialMetrics.characters,flights:specialMetrics.flights,arrivals:specialMetrics.arrivals,
    audio:specialMetrics.audio.map(a=>({src:a.src,at:a.at,paused:a.media.paused,playing:a.playing})),heroAt:specialMetrics.heroAt,gains:specialMetrics.gains.map(n=>n.gain.value)}));
  const gameRects = page => page.evaluate(()=>['#handContainer','#drawDiscardBtn','#drawStockBtn','.player-actions','#bossHud'].map(selector=>{
    const r=document.querySelector(selector).getBoundingClientRect();return [selector,...[r.left,r.top,r.width,r.height].map(n=>Math.round(n*100)/100)];
  }));
  const setup = async (bossId,bot=false) => {
    const json=await a.evaluate(({bossId,bot})=>{
      const s=p0.reset(bossId);s.discard.push(...s.stock.splice(-15));s.boss.cooperativeSpecial.points=300;
      if(bot){s.players[1].name='BOT Luana';s.players[1].isBot=true;}
      p0.render();return JSON.stringify(s);
    },{bossId,bot});
    setSnapshot(json);await b.evaluate(json=>p0.receive(json),json);
    for(const page of[a,b]){await page.emulateMedia({reducedMotion:'no-preference'});await page.mouse.click(5,5);await page.evaluate(()=>p0.specialAudioMode('all'));await installMetrics(page);}
    return JSON.parse(json);
  };
  const metadata=await a.evaluate(async()=>{
    const {SPECIAL_CHARACTER_ASSETS}=await import('/js/boss/ui/cooperative-special-assets.js');
    return Promise.all(Object.entries(SPECIAL_CHARACTER_ASSETS).map(([id,asset])=>new Promise((resolve,reject)=>{
      const audio=new Audio(asset.audioSrc);audio.preload='metadata';
      const timer=setTimeout(()=>reject(new Error('MP3 timeout '+id)),5000);
      audio.onloadedmetadata=()=>{clearTimeout(timer);resolve({id,duration:audio.duration});audio.src='';};
      audio.onerror=()=>{clearTimeout(timer);reject(new Error('MP3 failed '+id));};
    })));
  });
  assert.ok(metadata.every(a=>Number.isFinite(a.duration)&&a.duration>0));console.log('Six original MP3s decoded',width,JSON.stringify(metadata));
  for(const bossId of Object.keys(SPECIAL_CHARACTER_ASSETS))for(const beneficiary of ['self','partner','bot']){
    const before=await setup(bossId,beneficiary==='bot'),recipient=beneficiary==='self'?0:1;
    // Opening/dismissing the choice is not an event and cannot summon a hero.
    await a.locator('.boss-special-button').tap();await a.keyboard.press('Escape');
    assert.equal((await metrics(a)).characters,0);
    assert.equal((await metrics(a)).audio.length,0);
    const start=Date.now();await a.evaluate(recipient=>p0.special(recipient),recipient);
    assert.equal(await a.evaluate(()=>window.bossSpecialOperationPending),false,'action gate released before presentation');
    const saved=JSON.parse(getSnapshot());
    assert.equal(saved.discard.length,before.discard.length-5);assert.equal(saved.stock.length,before.stock.length);
    assert.equal(saved.players[recipient].hand.length,before.players[recipient].hand.length+5);
    await b.evaluate(json=>p0.receive(json),getSnapshot());
    const restingGameRects=await gameRects(a);
    for(const page of[a,b])await page.locator('.boss-special-character').waitFor({state:'attached',timeout:2000});
    const layout=await a.locator('.boss-special-character').evaluate((el,selector)=>{
      const r=el.getBoundingClientRect();
      // The resting rectangle is style-based: entry/exit transform must not be
      // mistaken for a changed layout or the image's intrinsic aspect ratio.
      const p={left:parseFloat(el.style.left),top:parseFloat(el.style.top),width:parseFloat(el.style.width),height:parseFloat(el.style.height)};
      const obstacles=[...document.querySelectorAll(selector)].map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height);
      return {src:el.getAttribute('src'),ratio:p.width/p.height,natural:el.naturalWidth/el.naturalHeight,
        clippedJourney:el.parentElement.classList.contains('boss-special-stage')&&getComputedStyle(el.parentElement).clipPath.startsWith('inset('),
        pointer:getComputedStyle(el).pointerEvents,fit:getComputedStyle(el).objectFit,position:getComputedStyle(el).position,
        inside:p.left>=0&&p.top>=0&&p.left+p.width<=innerWidth&&p.top+p.height<=innerHeight,
        safe:obstacles.every(r=>p.left+p.width<=r.left||p.left>=r.right||p.top+p.height<=r.top||p.top>=r.bottom),p,zoom:visualViewport.scale};
    },SPECIAL_STAGE_SELECTOR);
    assert.ok(layout.safe&&layout.inside&&layout.clippedJourney,JSON.stringify({width,bossId,layout}));assert.ok(Math.abs(layout.ratio-2/3)<.0001);
    assert.equal(layout.pointer,'none');assert.equal(layout.fit,'contain');assert.equal(layout.position,'fixed');assert.equal(layout.zoom,1);
    assert.equal(layout.src,SPECIAL_CHARACTER_ASSETS[bossId].src);
    for(const page of[a,b]){
      await page.waitForFunction(()=>specialMetrics.audio.length===1&&specialMetrics.audio[0].playing);
      const m=await metrics(page);assert.equal(m.audio.length,1,'one soundtrack per confirmed event per client');
      assert.ok(m.audio[0].src.endsWith(SPECIAL_CHARACTER_ASSETS[bossId].audioSrc));
      assert.ok(Math.abs(m.gains[0]-getAudioBalance(SPECIAL_CHARACTER_ASSETS[bossId].audioSrc).gain)<.00001,'real Web Audio node uses the measured per-file coefficient');
      assert.ok(Math.abs(m.audio[0].at-m.heroAt)<250,'sound starts with the slide, not snapshot acceptance or card arrival');
    }
    if(!referenceFrame)referenceFrame=layout.p;
    for(const key of ['left','top','width','height'])assert.ok(Math.abs(layout.p[key]-referenceFrame[key])<=1,'shared Jill frame, allowing at most one CSS pixel of obstacle/font rounding: '+JSON.stringify({bossId,key,actual:layout.p,referenceFrame}));
    // Sample the animation clock, not elapsed test-runner time: loading/snapshot
    // assertions can otherwise sample exit rather than the intended hold.
    await a.evaluate(({durationMs,flightStart,flightDuration})=>{
      for(const el of document.querySelectorAll('.boss-special-character, .boss-special-flight'))
        for(const animation of el.getAnimations()) {
          animation.pause();
          const timing=animation.effect.getTiming();
          animation.currentTime=el.classList.contains('boss-special-character')?durationMs*.45:timing.delay+timing.duration*.35;
        }
    },SPECIAL_PRESENTATION);
    const held=await a.locator('.boss-special-character').evaluate(el=>({x:el.getBoundingClientRect().left,left:parseFloat(el.style.left),opacity:parseFloat(getComputedStyle(el).opacity)}));
    assert.ok(Math.abs(held.x-held.left)<1&&held.opacity>.99,'character holds fully on screen during the flight');
    assert.deepEqual(await gameRects(a),restingGameRects,'cosmetic overlay does not move/scale cards, HUD or controls');
    assert.equal(await a.locator('.boss-special-flight').count(),5);
    const flights=await a.locator('.boss-special-flight').evaluateAll(els=>els.map(el=>({width:parseFloat(el.style.width),opacity:parseFloat(getComputedStyle(el).opacity),pointer:getComputedStyle(el).pointerEvents,color:el.style.getPropertyValue('--special-color'),border:getComputedStyle(el).borderTopWidth})));
    assert.ok(flights.every(f=>f.width>=36&&f.opacity>.99&&f.pointer==='none'),JSON.stringify({message:'all five backs visibly fly above the character',flights}));
    assert.ok(flights.every(f=>f.color&&f.border==='1px'),'card-back outlines have real CSS color variables');
    assert.equal(await b.locator('.boss-special-flight img, .boss-special-flight [data-card-id]').count(),0);
    assert.ok((await b.locator('.boss-special-flight').allTextContents()).every(t=>t===''));
    if(beneficiary==='partner')await a.screenshot({path:resolve(evidence,`hero-${bossId}-${width}.png`)});
    await a.evaluate(()=>{for(const el of document.querySelectorAll('.boss-special-character, .boss-special-flight'))for(const animation of el.getAnimations())animation.play();});
    // Accepted duplicate, remote repeated snapshots and renderer refresh never
    // restart even while the image is on screen.
    await a.evaluate(()=>{p0.render();void p0.specialReplay();});
    await b.evaluate(json=>{p0.receive(json);p0.receive(json);p0.reload();},getSnapshot());
    await quiet(a);await quiet(b);
    for(const page of[a,b])await page.waitForFunction(()=>specialMetrics.audio.every(a=>a.media.paused));
    for(const page of[a,b]){const m=await metrics(page);assert.equal(m.characters,1);assert.equal(m.flights,5);assert.equal(m.arrivals,1);assert.equal(m.audio.length,1);assert.ok(m.audio.every(a=>a.paused),'sound cleaned up with presentation');}
    assert.ok(Date.now()-start<6000,'no hung animation');
    console.log('Hero Special two clients',width,bossId,beneficiary,JSON.stringify(layout),'PASS');
  }
  // Actual local undo and remote undo during the slide remove nodes at once;
  // replaying the old confirmed snapshot does not repeat the appearance.
  await setup('nemesis');await a.evaluate(()=>p0.special(1));const accepted=getSnapshot();
  await b.evaluate(json=>p0.receive(json),accepted);await a.locator('.boss-special-character').waitFor();
  await a.evaluate(()=>p0.specialUndo());
  const undone=await a.evaluate(()=>{const s=p0.state();s.bossStateRevision=2;return JSON.stringify(s);});
  await b.evaluate(json=>p0.receive(json),undone);await quiet(a);await quiet(b);
  for(const page of[a,b])assert.ok((await metrics(page)).audio.every(a=>a.paused),'undo stops the soundtrack');
  await b.evaluate(json=>p0.receive(json),accepted);await b.waitForTimeout(50);assert.equal((await metrics(b)).characters,1);
  await setup('dimitrescu');await a.evaluate(()=>p0.special(0));await a.locator('.boss-special-character').waitFor();
  await a.evaluate(()=>p0.reset('banker'));await quiet(a);
  // Full reload sees a baseline, not a new live special.
  await b.reload();await b.waitForFunction(()=>window.p0);await installMetrics(b);
  await b.evaluate(json=>p0.receive(json),accepted);await b.waitForTimeout(50);assert.equal((await metrics(b)).characters,0);
  assert.equal((await metrics(b)).audio.length,0,'reload baseline never replays audio');
  await b.evaluate(()=>p0.observer(1));
  // Missing/broken/slow images and a cancelled load use no synthetic artwork.
  const fallback=await a.evaluate(async()=>{
    const {presentCooperativeSpecial,SPECIAL_PRESENTATION}=await import('/js/boss/ui/cooperative-special-presentation.js');
    const rect={left:20,top:100,width:30,height:50};
    const p=presentCooperativeSpecial({document,from:rect,to:{...rect,left:200,top:500},count:5,bossId:'nemesis',
      assets:{nemesis:{src:'assets/images/special/not-supplied.png'}},config:{...SPECIAL_PRESENTATION,imageTimeoutMs:80}});
    await new Promise(r=>setTimeout(r,120));const flight=document.querySelectorAll('.boss-special-flight').length;
    const hero=document.querySelectorAll('.boss-special-character').length;await p;return {flight,hero,left:document.querySelectorAll('.boss-special-flight, .boss-special-arrival').length};
  });assert.deepEqual(fallback,{flight:5,hero:0,left:0});
  // Bounded slow load falls back; abort during an image load cannot resurrect
  // a character after the delayed response arrives.
  await a.route('**/special-delayed.png',async route=>{
    await new Promise(r=>setTimeout(r,350));
    await route.fulfill({path:resolve('assets/images/special/jill-valentine.png'),contentType:'image/png'});
  });
  const loading=await a.evaluate(async()=>{
    const {presentCooperativeSpecial,SPECIAL_PRESENTATION}=await import('/js/boss/ui/cooperative-special-presentation.js');
    const rect={left:20,top:100,width:30,height:50};
    const args={document,from:rect,to:{...rect,left:200,top:500},count:5,bossId:'nemesis',assets:{nemesis:{src:'/special-delayed.png'}}};
    const slow=presentCooperativeSpecial({...args,config:{...SPECIAL_PRESENTATION,imageTimeoutMs:70}});
    await new Promise(r=>setTimeout(r,110));const flights=document.querySelectorAll('.boss-special-flight').length;await slow;
    const controller=new AbortController();
    const aborted=presentCooperativeSpecial({...args,assets:{nemesis:{src:'/special-delayed.png?cancel=1'}},signal:controller.signal});
    controller.abort();await aborted;await new Promise(r=>setTimeout(r,450));
    return {flights,left:document.querySelectorAll('.boss-special-character, .boss-special-flight, .boss-special-arrival').length};
  });assert.deepEqual(loading,{flights:5,left:0});
  await a.unroute('**/special-delayed.png');
  // Missing PNG uses the existing five-card flight plus one cancellable sound.
  await setup('banker');await a.route('**/special/banker.png',route=>route.fulfill({status:404,body:''}));
  await a.evaluate(()=>p0.special(1));await quiet(a);
  await a.waitForFunction(()=>specialMetrics.flights===5&&specialMetrics.audio.every(a=>a.media.paused));
  assert.equal((await metrics(a)).characters,0);assert.equal((await metrics(a)).audio.length,1);
  await a.unroute('**/special/banker.png');
  // A missing MP3 or browser policy rejection does not remove the PNG/flight.
  for(const failure of ['missing','blocked']){
    await setup('banker');const original=await a.evaluate(failure=>{
      const source=p0.specialAudioSource('banker'),src=source.src;
      if(failure==='missing')source.src='/assets/sfx/special/not-supplied.mp3';else window.blockedSpecialPlay=true;
      return src;
    },failure);
    await a.evaluate(()=>p0.special(0));await a.locator('.boss-special-character').waitFor({state:'attached'});await quiet(a);
    assert.equal((await metrics(a)).characters,1);assert.equal((await metrics(a)).flights,5);assert.equal((await metrics(a)).audio.length,1);
    assert.equal((await metrics(a)).audio[0].playing,false);
    await a.evaluate(src=>{p0.specialAudioSource('banker').src=src;window.blockedSpecialPlay=false;},original);
  }
  // System mute is authoritative; music-off still allows this short SFX.
  await setup('nehelenia');for(const page of[a,b])await page.evaluate(()=>p0.specialAudioMode('muted'));
  await a.evaluate(()=>p0.special(1));await b.evaluate(json=>p0.receive(json),getSnapshot());
  await quiet(a);await quiet(b);for(const page of[a,b])assert.equal((await metrics(page)).audio.length,0);
  await setup('dominadora');await a.evaluate(()=>p0.specialAudioMode('music_off'));
  await a.evaluate(()=>p0.special(0));await a.locator('.boss-special-character').waitFor({state:'attached'});await quiet(a);
  const tail=await metrics(a);assert.equal(tail.characters,1);assert.equal(tail.audio.length,1);assert.equal(tail.audio[0].playing,true);
  assert.equal(tail.audio[0].paused,false,'full original spoken tail continues after three-second slide');
  await a.evaluate(()=>p0.specialCancel());assert.ok((await metrics(a)).audio.every(a=>a.paused),'cancellation stops even a sound-only tail');
  await setup('dominadora');await a.evaluate(()=>p0.special(0));await a.locator('.boss-special-character').waitFor({state:'attached'});
  await a.evaluate(()=>window.dispatchEvent(new Event('resize')));await quiet(a);
  assert.ok((await metrics(a)).audio.every(a=>a.paused),'resize cancels audio and visuals');
  // Reduced motion still grants the real cards immediately, with no movement.
  await setup('nehelenia');for(const page of[a,b])await page.emulateMedia({reducedMotion:'reduce'});
  await a.evaluate(()=>p0.special(1));await b.evaluate(json=>p0.receive(json),getSnapshot());
  for(const page of[a,b])assert.deepEqual(await metrics(page),{characters:0,flights:0,arrivals:0,audio:[],heroAt:null,gains:[]});
  assert.equal(JSON.parse(getSnapshot()).boss.cooperativeSpecial.points,200);
  console.log('Special undo/reload/session/fallback/reduced-motion/audio failure-mute-cancel-full-tail',width,'PASS');
}
