import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {createSpecialAudioCue} from '../js/boss/ui/cooperative-special-audio.js';
import {createCooperativeSpecialPresenter,presentCooperativeSpecial} from '../js/boss/ui/cooperative-special-presentation.js';
import {SPECIAL_CHARACTER_ASSETS} from '../js/boss/ui/cooperative-special-assets.js';
import {getAudioBalance} from '../js/audio-balance.js';

test('new PNGs and six MP3s are byte-identical to the supplied originals',()=>{
  const hashes={
    'assets/images/special/banker.png':'f7d5f32fc60525b9b7bf255f153940b6c9ae58e9c3d8a799c7801317956096e1',
    'assets/images/special/dominadora.png':'44ea7cc9b08cf9c3bec0e736db5f54030c0cc6510494fa801e5c54a747baca70',
    'assets/images/special/matriarca-esmeralda.png':'a38da126f894d9577abd861fd2d500d018cc7a9f7c57badc370722780345b4ec',
    'assets/sfx/special/ada-wong.mp3':'6f8aa2ffb72cd1804bfaab6a55e2490e6cf37bbc3df9a2f3a2ddcaff77e6b646',
    'assets/sfx/special/jill-valentine.mp3':'5d975012c2db0c63a56288fd4f634bd2b7e94d0c89385b7f0544d394dd6337d0',
    'assets/sfx/special/sailor-moon.mp3':'ae6205ca9be03cab80f006ae0753f2d0b9594e5638aff3f080ae6e72021dc919',
    'assets/sfx/special/banker.mp3':'6f0a8d1e8406ee2e3afc354d17500fa524925ec971d9abf821960f72a14453a7',
    'assets/sfx/special/dominadora.mp3':'5ed159801225d02bc293b3962f31266e92e2aa78a47c74627d2085cc7939c4dc',
    'assets/sfx/special/matriarca-esmeralda.mp3':'f28827d527ece41e63f3028f93b16a3ea683273de80d7e664bf8466ac17e8241',
  };
  for(const [file,hash] of Object.entries(hashes)){
    const bytes=readFileSync(new URL('../'+file,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,file);
    if(file.endsWith('.png')){assert.equal(bytes.readUInt32BE(16),1024);assert.equal(bytes.readUInt32BE(20),1536);assert.equal(bytes[25],6,'RGBA preserved');}
  }
});

test('entry is the only sound cue; one attempt with bounded cleanup, failure/missing source/stale events stay harmless',async()=>{
  const source={},sound=new EventTarget();let plays=0,stops=0;
  const cue=createSpecialAudioCue({bossId:'banker',getSource:()=>source,play:()=>{plays++;return sound;},stop:()=>stops++});
  assert.equal(cue('arrival'),undefined);const cleanup=cue('entry');cue('entry');assert.equal(plays,1);
  sound.dispatchEvent(new Event('ended'));await cleanup.finished;cleanup();cleanup();assert.equal(stops,1);
  const mutedSound=new EventTarget();
  const mutedCue=createSpecialAudioCue({bossId:'banker',getSource:()=>source,play:()=>mutedSound,stop:()=>stops++});
  const mutedCleanup=mutedCue('entry');mutedSound.dispatchEvent(new Event('pause'));await mutedCleanup.finished;mutedCleanup();assert.equal(stops,2);
  for(const variant of ['missing','throws','blocked','stale','aborted']){
    const fail=createSpecialAudioCue({bossId:'banker',getSource:()=>variant==='missing'?null:source,
      play:()=>{if(variant==='throws')throw Error('decoder');return null;},stop:()=>{},isCurrent:()=>variant!=='stale'});
    assert.equal(fail('entry',{signal:variant==='aborted'?AbortSignal.abort():undefined}),undefined);assert.equal(fail('entry'),undefined);
  }
});

test('both clients hear each confirmed event once for all six bosses; reload, undo, rejects and old revisions never replay',async()=>{
  for(const bossId of Object.keys(SPECIAL_CHARACTER_ASSETS))for(const recipientId of [0,1,2]){
    const a={id:`${bossId}-${recipientId}`,type:'bossSpecial',count:5,recipientId};
    const base={mode:'boss_'+bossId,matchStartedAt:1,bossStateRevision:0,boss:{id:bossId,cooperativeSpecial:{resolvedActionIds:[]}}};
    const accepted={...base,bossStateRevision:1,boss:{...base.boss,cooperativeSpecial:{resolvedActionIds:[a.id]}},lastAction:a};
    for(let client=0;client<2;client++){
      let plays=0;const present=async options=>{
        const cue=createSpecialAudioCue({bossId:options.bossId,getSource:id=>SPECIAL_CHARACTER_ASSETS[id].audioSrc,play:()=>{plays++;return new EventTarget();},stop:()=>{}});
        const cleanup=cue('entry',{signal:options.signal});cue('arrival');cue('entry');cleanup();await cleanup.finished;
      };
      const presenter=createCooperativeSpecialPresenter({present});presenter.observe(base);
      await Promise.all([presenter.playConfirmed(accepted,a,{}),presenter.playConfirmed(accepted,presenter.observe(accepted),{})]);
      presenter.observe({...accepted,bossStateRevision:2,lastAction:{type:'undoMove'}});
      await presenter.playConfirmed({...accepted,bossStateRevision:3},a,{});
      assert.equal(plays,1);
      const reload=createCooperativeSpecialPresenter({present});reload.observe(accepted);await reload.playConfirmed(accepted,a,{});assert.equal(plays,1);
    }
  }
});

async function audioHarness(){
  const old={Audio:globalThis.Audio,window:globalThis.window,localStorage:globalThis.localStorage};
  class Audio extends EventTarget {
    constructor(src=''){super();this.src=src;this.dataset={};this.volume=1;this.currentTime=0;this.paused=true;this.plays=0;}
    cloneNode(){const clone=new Audio(this.src);clone.dataset={...this.dataset};return clone;}
    play(){this.plays++;this.paused=false;return this.reject?Promise.reject(Error('NotAllowedError')):Promise.resolve();}
    pause(){this.paused=true;}
  }
  globalThis.Audio=Audio;globalThis.window={};globalThis.localStorage={getItem:()=>null,setItem(){}};
  const src=readFileSync(new URL('../js/audio.js',import.meta.url),'utf8').replace("'./boss/ui/cooperative-special-assets.js'",JSON.stringify(new URL('../js/boss/ui/cooperative-special-assets.js',import.meta.url).href))
    .replace("'./audio-balance.js'",JSON.stringify(new URL('../js/audio-balance.js',import.meta.url).href));
  const module=await import('data:text/javascript;base64,'+Buffer.from(src+'\n// '+Math.random()).toString('base64'));
  return {module,Audio,restore:()=>Object.assign(globalThis,old)};
}

test('real SFX cloning respects mute/music-off, failure, cancellation and delayed AudioContext resume without resurrecting audio',async()=>{
  const h=await audioHarness();try{
    const m=h.module;assert.equal(Object.keys(m.BOSS_SFX).length,6);
    for(const [boss,asset] of Object.entries(SPECIAL_CHARACTER_ASSETS))assert.equal(m.BOSS_SFX[boss].special.src,asset.audioSrc);
    m.setSystemAudioMode('muted',false);assert.equal(m.playSfxClone(m.BOSS_SFX.banker.special),null);
    m.setSystemAudioMode('music_off',false);const sound=m.playSfxClone(m.BOSS_SFX.banker.special);assert.equal(sound.plays,1);m.stopSfxClone(sound);assert.equal(sound.paused,true);
    const controller=new AbortController();const active=m.playSfxClone(m.BOSS_SFX.nemesis.special,{signal:controller.signal});controller.abort();assert.equal(active.paused,true);
    let resume;const late=m.playSfxClone(m.BOSS_SFX.dominadora.special,{audioContext:{state:'suspended',resume:()=>new Promise(r=>resume=r)}});
    m.stopSfxClone(late);resume();await Promise.resolve();assert.equal(late.plays,0);
    let resumeMute;const lateMute=m.playSfxClone(m.BOSS_SFX.dominadora.special,{audioContext:{state:'suspended',resume:()=>new Promise(r=>resumeMute=r)}});
    m.setSystemAudioMode('muted',false);m.setSystemAudioMode('all',false);resumeMute();await Promise.resolve();assert.equal(lateMute.plays,0);
    let failed=0;const badSource=new h.Audio();badSource.cloneNode=()=>{const bad=new h.Audio();bad.reject=true;return bad;};
    m.playSfxClone(badSource,{onPlaybackFailure:()=>failed++});await new Promise(r=>setTimeout(r,0));assert.equal(failed,1);
    m.stopAllGameSfx();
  }finally{h.restore();}
});

test('first click audio unlock never plays the six Special clips before a confirmed action',async()=>{
  const h=await audioHarness();try{
    const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
    const source=app.slice(app.indexOf('function unlockAudio()'),app.indexOf('\nfunction isMovableTwoOrJoker'));
    const m=h.module,regular=new h.Audio('regular');
    const ctx={audioUnlocked:false,audioCtx:null,window:{},isSystemMuted:m.isSystemMuted,BOSS_SFX:m.BOSS_SFX,
      ALL_CANASTRA_SFX:[],DECK_MOVE_SFX:{},sfxCardMove:regular,sfxMyTurn:regular,sfxSearch:regular,sfxSteal:regular,sfxHeartbeat:regular,syncTableAmbientMusic(){}};
    vm.createContext(ctx);vm.runInContext(source,ctx);ctx.unlockAudio();
    assert.equal(ctx.audioUnlocked,true);assert.ok(regular.plays>0);
    for(const sounds of Object.values(m.BOSS_SFX))assert.equal(sounds.special.plays,0);
  }finally{h.restore();}
});

test('real SFX gain nodes apply one calibrated coefficient, including attenuation and boosting, without legacy double gain',async()=>{
  const h=await audioHarness();try{
    const gains=[],nodes=[];
    const context={createMediaElementSource:()=>{const node={connect(){},disconnect(){node.disconnected=true;}};nodes.push(node);return node;},createGain:()=>{const node={gain:{},connect(){},disconnect(){}};gains.push(node);return node;},destination:{}};
    for(const id of Object.keys(SPECIAL_CHARACTER_ASSETS)){
      const sound=h.module.playSfxClone(h.module.BOSS_SFX[id].special,{audioContext:context});
      assert.equal(sound.volume,1);assert.equal(gains.at(-1).gain.value,getAudioBalance(SPECIAL_CHARACTER_ASSETS[id].audioSrc).gain);h.module.stopSfxClone(sound);
    }
    assert.ok(nodes.every(n=>n.disconnected));
  }finally{h.restore();}
});

test('finished visuals leave no DOM while a spoken tail remains cancellable; natural end and abort release everything',async()=>{
  for(const cancel of [false,true]){
    const nodes=new Set(),sound=new EventTarget();let stopped=0,done=false;
    const document={defaultView:null,body:{append:el=>nodes.add(el)},createElement:()=>({
      style:{setProperty(){}},setAttribute(){},remove(){nodes.delete(this);},animate(){return{finished:Promise.resolve(),cancel(){}};},
    })};
    const rect={left:10,top:10,width:30,height:50},controller=new AbortController();
    const onCue=createSpecialAudioCue({bossId:'banker',getSource:()=>({}),play:()=>sound,stop:()=>stopped++});
    const pending=presentCooperativeSpecial({document,from:rect,to:rect,count:5,bossId:'banker',assets:{},signal:controller.signal,onCue}).then(()=>done=true);
    await new Promise(resolve=>setImmediate(resolve));assert.equal(nodes.size,0);assert.equal(done,false);assert.equal(stopped,0);
    if(cancel)controller.abort();else sound.dispatchEvent(new Event('ended'));
    await pending;assert.equal(stopped,1);assert.equal(nodes.size,0);
  }
});
