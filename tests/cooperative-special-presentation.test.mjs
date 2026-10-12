import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCooperativeSpecialPresenter, specialCharacterPlacement, SPECIAL_CHARACTER_ASSETS, SPECIAL_PRESENTATION,
  presentCooperativeSpecial } from '../js/boss/ui/cooperative-special-presentation.js';

const game = (ids=[],lastAction=null,revision=0,start=1) => ({mode:'boss_nemesis',matchStartedAt:start,bossStateRevision:revision,
  boss:{id:'nemesis',cooperativeSpecial:{resolvedActionIds:ids}},lastAction});
const action = (id='real-action',recipientId=1) => ({id,type:'bossSpecial',count:5,recipientId,playerId:0});
const options={};
test('six supplied PNG/MP3 pairs and central 3000 ms preserve the original frame',()=>{
  assert.equal(SPECIAL_PRESENTATION.durationMs,3000);
  assert.deepEqual(Object.values(SPECIAL_CHARACTER_ASSETS).map(a=>a.name),['Ada Wong','Jill Valentine','Sailor Moon','Banqueiro','Matriarca Esmeralda','Dominadora']);
  for(const asset of Object.values(SPECIAL_CHARACTER_ASSETS)){
    assert.ok(readFileSync(new URL('../'+asset.src,import.meta.url)).length>1000);
    assert.ok(readFileSync(new URL('../'+asset.audioSrc,import.meta.url)).length>1000);
  }
});
test('two independent humans see each accepted ID once with local/remote/BOT beneficiary',async()=>{
  for(const recipient of [0,1,2]){
    const calls=[[],[]],clients=calls.map(log=>createCooperativeSpecialPresenter({present:async args=>log.push(args)}));
    clients.forEach(c=>c.observe(game()));
    const a=action(`recipient-${recipient}`,recipient),s=game([a.id],a,1);
    for(const c of clients){const event=c.observe(s);assert.equal(event.recipientId,recipient);await c.playConfirmed(s,event,options);assert.equal(c.observe(s),null);await c.playConfirmed(s,a,options);}
    assert.deepEqual(calls.map(c=>c.length),[1,1]);assert.deepEqual(calls.map(c=>c[0].count),[5,5]);
  }
});
test('first snapshot/reload is a baseline, rejected or unconfirmed IDs never present',async()=>{
  let calls=0;const c=createCooperativeSpecialPresenter({present:async()=>calls++}),a=action(),s=game([a.id],a,3);
  assert.equal(c.observe(s),null);await c.playConfirmed(s,a,options);assert.equal(calls,0);
  await c.playConfirmed(game([],a,4),a,options);await c.playConfirmed(game(['bad'],{...a,id:'bad',count:4},5),{...a,id:'bad',count:4},options);
  assert.equal(calls,0);
});
test('snapshot/local-accept race, persistent seen IDs and replay after undo/reconnect',async()=>{
  const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
  let calls=0;const create=()=>createCooperativeSpecialPresenter({storage,present:async()=>calls++});
  const c=create();c.observe(game());const a=action(),s=game([a.id],a,1);
  await Promise.all([c.playConfirmed(s,a,options),c.playConfirmed(s,c.observe(s),options)]);assert.equal(calls,1);
  c.observe(game([],{id:'undo',type:'undoMove'},2));assert.equal(c.observe(game([a.id],a,3)),null);
  const reconnect=create();reconnect.observe(game([a.id],a,3));await reconnect.playConfirmed(s,a,options);assert.equal(calls,1);
  const denied=createCooperativeSpecialPresenter({storage:{getItem(){throw Error('denied');},setItem(){throw Error('denied');}},present:async()=>{}});
  denied.observe(game());await denied.playConfirmed(s,a,options);
});
test('undo/match change/new confirmed action aborts loading/animation; stale revisions skipped',async()=>{
  const signals=[];const c=createCooperativeSpecialPresenter({present:args=>{signals.push(args.signal);return new Promise(r=>args.signal.addEventListener('abort',r,{once:true}));}});
  c.observe(game());const a=action(),s=game([a.id],a,3);const pending=c.playConfirmed(s,a,options);
  assert.equal(c.observe(game([],null,1)),null);assert.equal(signals[0].aborted,false);
  c.observe(game([],{type:'undoMove',id:'undo'},4));await pending;assert.equal(signals[0].aborted,true);
  const b=action('next'),next=game([a.id,b.id],b,5);const second=c.playConfirmed(next,b,options);
  c.observe(game([],null,0,2));await second;assert.equal(signals[1].aborted,true);
});
test('safe responsive placement preserves ratio, right entry space and protected rectangles',()=>{
  for(const [width,height] of [[1920,1080],[1376,1032],[1024,768],[390,844]]){
    const obstacles=[{left:0,top:height*.1,width,height:height*.25},{left:0,top:height*.83,width,height:height*.17},
      {left:width*.4,top:height*.6,width:width*.2,height:height*.15}];
    const p=specialCharacterPlacement({width,height},{width:1200,height:1800},obstacles);
    assert.ok(p);assert.ok(Math.abs(p.width/p.height-2/3)<.00001);assert.ok(p.left>=0&&p.top>=0&&p.left+p.width<=width&&p.top+p.height<=height);
    for(const r of obstacles)assert.ok(p.left+p.width<=r.left||p.left>=r.left+r.width||p.top+p.height<=r.top||p.top>=r.top+r.height);
  }
  assert.equal(specialCharacterPlacement({width:390,height:844},{width:941,height:1672},[{left:0,top:0,width:390,height:844}]),null);
});
test('Ada and Sailor use the identical Jill frame, independent of PNG proportions',()=>{
  for(const [width,height] of [[1920,1080],[1376,1032],[1024,768],[390,844]]) {
    const viewport={width,height}, obstacles=[{left:0,top:height*.83,width,height:height*.17}];
    const jill=specialCharacterPlacement(viewport,{width:1200,height:1800},obstacles);
    for(const image of [{width:1024,height:1536},{width:941,height:1672}])
      assert.deepEqual(specialCharacterPlacement(viewport,image,obstacles),jill);
  }
});
test('reduced motion and already aborted/stale effects produce no DOM or image load',async()=>{
  const document={createElement(){throw Error('must not create');}};
  await presentCooperativeSpecial({document,count:5,reducedMotion:true});
  await presentCooperativeSpecial({document,count:5,signal:AbortSignal.abort()});
  await presentCooperativeSpecial({document,count:5,isCurrent:()=>false});
});
test('production dispatch is post-render, detached from transaction and cleared on undo/session exit',()=>{
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert.match(app,/if \(specialPresentationAction\) \{\s*void animateCooperativeSpecial/);
  assert.match(app,/a\.type !== 'bossSpecial'/);
  assert.match(app,/function cancelGameAnimations\(\) \{\s*cooperativeSpecialPresenter\.cancel\(\)/);
  assert.match(app,/localUndoStack\.pop\(\);\s*cooperativeSpecialPresenter\.cancel\(\)/);
  assert.doesNotMatch(app,/await animateCooperativeSpecial/);
});
