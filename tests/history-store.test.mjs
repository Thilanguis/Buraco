import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('snapshot completo compartilhado atualiza menu/perfil e encerra listener',async()=>{
 const calls=[];let stopped=0;
 globalThis.historyStoreFixture={db:{},collection:(_db,...path)=>path.join('/'),query:(...args)=>args,orderBy:(...args)=>args,limit:n=>n,startAfter:x=>x,getDocsFromServer:()=>{throw Error('não deveria paginar');},onSnapshot:(ref,next,error)=>{calls.push({ref,next,error});return()=>stopped++;}};
 const source=readFileSync(new URL('../js/history-store.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
 const mod=await import('data:text/javascript;base64,'+Buffer.from('const {db,collection,query,orderBy,limit,startAfter,getDocsFromServer,onSnapshot}=globalThis.historyStoreFixture;\n'+source).toString('base64'));
 const menu=[],profile=[],errors=[];
 const offMenu=mod.subscribeHistory('owner',m=>menu.push(m),e=>errors.push(e));
 const records=Array.from({length:31},(_,i)=>({matchId:String(i)}));
 const emit=items=>calls[0].next({docs:items.map(item=>({data:()=>item}))});
 emit(records);
 const offProfile=mod.subscribeHistory('owner',m=>profile.push(m));
 await Promise.resolve();
 assert.equal(calls.length,1);assert.match(calls[0].ref[0],/^userProfiles\/owner\/matches$/);
 assert.equal(menu.at(-1).length,31);assert.equal(profile.at(-1).length,31);
 emit([{matchId:'new'},...records]);
 assert.equal(menu.at(-1).length,32);assert.equal(profile.at(-1)[0].matchId,'new');
 calls[0].error(new Error('offline'));assert.equal(errors.length,1);
 offProfile();assert.equal(stopped,0);offMenu();assert.equal(stopped,1);
 const offAgain=mod.subscribeHistory('owner',()=>{});assert.equal(calls.length,2);offAgain();
 delete globalThis.historyStoreFixture;
});
