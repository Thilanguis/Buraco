// Reproduce the expanded sample's worst Nemesis turn, separating actual action
// execution from planning. CPU profiler is enabled only around that turn.
import inspector from 'node:inspector';
import {writeFile} from 'node:fs/promises';
import {BossBuracoBot} from '../boss-bot.js';
import {deal,fixtureEngine,advance} from '../tests/boss-cooperative-fixture.mjs';
const seed=Number(process.argv[2]||7307),target=Number(process.argv[3]||30);
const s=deal('nemesis',seed),engine=fixtureEngine(s),actions=[];
for(const name of ['executeDrawStock','executeDrawDiscardFechado','executeMeldNew','executeMeldExtend','executeDiscard']) {
  const fn=engine[name];engine[name]=async(...args)=>{const start=performance.now();try{return await fn(...args);}
    finally{actions.push({name,ms:performance.now()-start});}};
}
class Fast extends BossBuracoBot {
  static getPlannerWorker(){return null;}
  static async sleep(_ms,e,signal){this.assertActive(e,signal);}
  static async paceBetweenActions(e,signal){this.assertActive(e,signal);}
}
const session=new inspector.Session();session.connect();
const post=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(e,r)=>e?reject(e):resolve(r)));
try {
  for(let turn=0;turn<=target&&!s.boss.result;turn++) {
    advance(s);actions.length=0;
    if(turn===target){await post('Profiler.enable');await post('Profiler.start');}
    const start=performance.now();
    try{await Fast.playTurn(s,s.currentPlayer,engine);}catch(e){if(!s.boss.result)throw e;}
    const ms=performance.now()-start;
    if(turn===target){const {profile}=await post('Profiler.stop');await writeFile('.cache/boss-tail.cpuprofile',JSON.stringify(profile));}
    console.log(JSON.stringify({seed,turn,ms,actions}));
  }
} finally {session.disconnect();}
