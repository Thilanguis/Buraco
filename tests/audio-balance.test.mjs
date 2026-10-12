import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {AUDIO_BALANCE,getAudioBalance} from '../js/audio-balance.js';
import {ITEM_DEFINITIONS} from '../js/boss/dimitrescu-castle.js';
import {cardFrontHTML} from '../js/game/card-face.js';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('all 66 MP3s and the intro WAV have measured gains, unchanged bytes and bounded single-file sample peaks',()=>{
  const files=readdirSync(resolve('assets'),{recursive:true}).filter(p=>/\.(mp3|wav)$/i.test(p)).map(p=>'assets/'+p.replaceAll('\\','/')).sort();
  assert.deepEqual(Object.keys(AUDIO_BALANCE).sort(),files);assert.equal(files.filter(p=>p.endsWith('.mp3')).length,66);
  for(const path of files){
    const profile=getAudioBalance(path);assert.ok(profile.gain>0&&profile.gain<=4,path);
    assert.ok(profile.peakDb+20*Math.log10(profile.gain)<=-2.999,path);
    assert.equal(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex'),profile.sha256,path);
    assert.equal(getAudioBalance('https://example.test/'+path+'?v=310'),profile);
    assert.equal(getAudioBalance(path.replaceAll('/','\\')),profile);
  }
  assert.equal(getAudioBalance('assets/sfx/unknown.mp3'),null);assert.equal(getAudioBalance('assets/%broken'),null);
});

test('music is six dB below standard effects; cards/heartbeat stay discrete and original dynamics are not compressed',()=>{
  for(const p of Object.values(AUDIO_BALANCE)){
    assert.equal(p.targetDb,p.category==='effect'?-22:p.category==='cards'?-30:p.category==='heartbeat'?-32:-28);
    if(p.category==='music')assert.ok(Math.abs(p.inputRmsDb+20*Math.log10(p.gain)+28)<.002);
  }
  for(const file of ['ada-wong','dominadora','matriarca-esmeralda','sailor-moon']){
    const p=AUDIO_BALANCE['assets/sfx/special/'+file+'.mp3'];assert.ok(Math.abs(p.inputRmsDb+20*Math.log10(p.gain)+22)<.002);
  }
  assert.ok(getAudioBalance('assets/sfx/special/ada-wong.mp3').gain<.4);
  assert.ok(getAudioBalance('assets/sfx/special/matriarca-esmeralda.mp3').gain>2);
});

test('packed visible cards retain only validated item metadata and consumed items never regain an emblem',()=>{
  const source=app.slice(app.indexOf('function packCard('),app.indexOf('\nfunction ensureCardId('));
  const context={ITEM_DEFINITIONS,ensureCardId(){}};vm.createContext(context);vm.runInContext(source,context);
  for(const type of Object.keys(ITEM_DEFINITIONS))for(const consumed of [false,true]){
    const card={id:'physical',rank:'Q',suit:'♥',castleItem:{type,consumed,private:'not-sent'}};
    const packed=context.packCard(card);assert.equal(packed.id,card.id);assert.deepEqual(JSON.parse(JSON.stringify(packed.castleItem)),{type,consumed});
    const markup=cardFrontHTML(packed);assert.equal(markup.includes('castle-item-overlay'),!consumed);
    assert.ok(markup.includes('card-rank">Q'));assert.ok(markup.includes('card-suit">♥'));
  }
  assert.equal(context.packCard(null),null);assert.equal(context.packCard({castleItem:{type:'unknown'}}).castleItem,undefined);
});

test('hidden card flights render neither a face nor an item; visible flights retain the same emblem',()=>{
  const source=app.slice(app.indexOf('function makeFlyEl('),app.indexOf('\nfunction setBox('));
  const context={cardFrontHTML,suitClass:()=>'',deckFaceClass:()=>'',document:{body:{appendChild(){}},createElement:()=>({innerHTML:'',classList:{add(){}}})}};
  vm.createContext(context);vm.runInContext(source,context);
  const card={rank:'A',suit:'♠',castleItem:{type:'relic',consumed:false}};
  assert.equal(context.makeFlyEl(card,'back').innerHTML,'');assert.match(context.makeFlyEl(card,'front').innerHTML,/castle-item-overlay/);
});

test('actual ambient target and fade use the measured coefficient, preserving fade, safe ceiling and legacy fallback',()=>{
  const target=app.slice(app.indexOf('function getSafeAmbientVolume('),app.indexOf('\nfunction dominationAudioHasPriority('));
  const fade=app.slice(app.indexOf('function fadeTableAmbientTo('),app.indexOf('\nfunction stopTableAmbientMusic('));
  for(const [src,profile] of Object.entries(AUDIO_BALANCE).filter(([,p])=>p.category==='music')){
    let frame;
    const ctx={getAudioBalance,normalizeTableTheme:x=>x,TABLE_AMBIENT_MUSIC:{feltro:{src,volume:.35}},TABLE_AMBIENT_MAX_VOLUME:.35,sfxCardMove:{volume:.5},
      tableAmbientAudio:{src,volume:0,dataset:{}},tableAmbientFadeId:0,dominationAudioHasPriority:()=>false,
      clampMediaVolume:x=>Math.max(0,Math.min(1,x)),performance:{now:()=>0},requestAnimationFrame:fn=>frame=fn};
    vm.createContext(ctx);vm.runInContext(target+fade,ctx);assert.equal(ctx.getSafeAmbientVolume('feltro'),Math.min(1,profile.gain));
    ctx.fadeTableAmbientTo(1,850);frame(425);assert.ok(Math.abs(ctx.tableAmbientAudio.volume-profile.gain*.5)<.00001);frame(850);assert.equal(ctx.tableAmbientAudio.volume,profile.gain);
    ctx.tableAmbientAudio.src='assets/music/future.mp3';assert.equal(ctx.getSafeAmbientVolume('feltro'),.35);
    ctx.fadeTableAmbientTo(1,850);frame(850);assert.equal(ctx.tableAmbientAudio.volume,.35);
  }
});
