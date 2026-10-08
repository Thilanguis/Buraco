import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBossDebugScenario } from '../js/boss/boss-debug-scenarios.js';
import { beginBossTurn, advanceBossTurn } from '../js/boss/boss-engine.js';
import { buildBossActionPresentation } from '../js/boss/boss-presentation.js';
import { daughterRegenerationChip } from '../js/boss/ui/dimitrescu-castle-view.js';
import { matriarchBloomFlowersHTML } from '../js/boss/ui/matriarch-bloom-view.js';

test('Enxerto: medidor canônico 0/1/2 sem lista de consequências no HUD', () => {
  const state=buildBossDebugScenario(null,{bossId:'matriarca_esmeralda',abilityId:'graft',phase:2,variant:'interactive',target:'auto'}).state;
  beginBossTurn(state,{first:true,now:1000,debug:true});
  for(let i=0;i<20&&state.boss.bossFlow.stage!=='players';i++)advanceBossTurn(state,state.boss.bossFlow.endsAt+1);
  const threat=state.boss.natureThreats.find(t=>t.type==='graft');
  for(let fed=0;fed<=2;fed++) {
    threat.fedMeldIds=threat.meldIds.slice(0,fed);const before=JSON.stringify(state);
    const action=buildBossActionPresentation(state),meter=action.rangeMeters[0];
    assert.equal(meter.value,fed);assert.equal(meter.max,2);
    assert.equal(action.progress,'');assert.equal(action.consequence,'');
    assert.equal(meter.currentEffect,['+1 Flor','cura até 50 HP','SEM EFEITO'][fed]);
    assert.equal(JSON.stringify(state),before,'presentation does not mutate mechanics');
  }
  delete threat.partialHeal;
  threat.fedMeldIds=[threat.meldIds[0]];
  assert.equal(buildBossActionPresentation(state).rangeMeters[0].currentEffect,'+1 Flor','legacy expectation follows saved rule');
});
test('PASSIVA mostra regeneração nominal e debuffs sem trocar suas regras',()=>{
  assert.equal(daughterRegenerationChip({regeneration:50,cold:false}),'PASSIVA +50 HP');
  assert.equal(daughterRegenerationChip({regeneration:25,cold:false}),'PASSIVA +25 HP');
  assert.equal(daughterRegenerationChip({regeneration:25,cold:true}),'PASSIVA +0 HP');
});
test('cinco Flores PNG, cores/abertura/perda seguem bloom real',()=>{
  const html=matriarchBloomFlowersHTML({bloom:2,previous:1,changed:true});
  assert.equal((html.match(/<img /g)||[]).length,5);
  assert.equal((html.match(/class="boss-lotus-flower open/g)||[]).length,2);
  assert.equal((html.match(/opening/g)||[]).length,1);
  assert.match(html,/Flor 3: apagada/);
  assert.equal((matriarchBloomFlowersHTML({bloom:0,previous:2,changed:true}).match(/wilting/g)||[]).length,2);
});
