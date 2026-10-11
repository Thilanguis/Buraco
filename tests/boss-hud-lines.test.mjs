import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildBossDebugScenario, getBossDebugCatalog } from '../js/boss/boss-debug-scenarios.js';
import { getBossDefinition } from '../js/boss/boss-registry.js';
import { selectNextBossIntent } from '../js/boss/boss-engine.js';
import { buildBossAbilityHelp, buildBossActionPresentation } from '../js/boss/boss-presentation.js';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const source=app.slice(app.indexOf('function renderBossHudRichText('),app.indexOf('\nfunction renderBossDetailFields('));
const node=()=>({children:[],textContent:'',setAttribute(){},appendChild(c){this.children.push(c);},replaceChildren(...children){this.children=children;}});
const document={createDocumentFragment:node,createElement:node,createTextNode:text=>({textContent:text,children:[]})};
const render=new Function('document',`${source};return renderBossHudRichText;`)(document);
const text=n=>n.textContent+n.children.map(text).join('');
test('renderer real: 136 habilidades/fases e ajuda em linhas, sem mudar texto factual nem estado',()=>{
  let checked=0;
  for(const boss of getBossDebugCatalog())for(const ability of getBossDefinition(boss.id).abilities)for(const phase of ability.phases){
    const {state}=buildBossDebugScenario(null,{bossId:boss.id,abilityId:ability.id,phase,variant:'interactive',target:'auto'});selectNextBossIntent(state,{debug:true});
    const before=JSON.stringify(state),presentation=buildBossActionPresentation(state);
    for(const value of [presentation.instruction,[presentation.progress,presentation.consequence].filter(Boolean).join('\n'),...presentation.details,buildBossAbilityHelp(state).text]){
      const el=node();render(el,value);assert.equal(text(el),String(value).replace(/[ \t]*[·•][ \t]*/g,'\n'));assert.doesNotMatch(text(el),/[·•]/);
    }
    assert.equal(JSON.stringify(state),before);checked++;
  }
  assert.equal(checked,136);
});
test('cartas recebem marcação legível sem HTML interpretado; mão mantém sobreposição original',()=>{
  const el=node();render(el,'Biel: 8♥ · Falha: +3 Sede <script>');
  assert.equal(text(el),'Biel: 8♥\nFalha: +3 Sede <script>');
  const card=el.children[0].children.find(c=>c.className?.startsWith('boss-card-ref'));assert.equal(card.textContent,'8♥');
  const css=readFileSync(new URL('../styles/boss/dimitrescu.css',import.meta.url),'utf8');
  assert.doesNotMatch(css,/#handContainer[^{}]*:has\(\.castle-use-item\)[^{}]*\{[^}]*margin-right/s);
});
test('chips preservam identidade e separadores; somente a referência da carta recebe destaque',()=>{
  for(const caption of ['CAÇADA · 2♣','ALVO: Q♥','Biel · REFLEXO MORTO · J♠','Biel: 10♦ MARCADA','BANQUETE · JOGO 2','LIXO +3']){
    const el=node();render(el,caption,{chip:true});assert.equal(text(el),caption);
    const tokens=el.children[0].children[0].children.filter(c=>c.className?.startsWith('boss-chip-card-ref'));
    assert.equal(tokens.length,/[♠♦♣♥]/.test(caption)?1:0);
    if(tokens.length)assert.equal(tokens[0].className.includes('suit-red'),/[♥♦]/.test(caption));
  }
  const css=readFileSync(new URL('../styles/boss-mode.css',import.meta.url),'utf8');
  assert.match(css,/\.boss-chip-card-ref\s*\{[^}]*font-size:inherit;[^}]*margin:0; padding:0;[^}]*transform:scale\(1\.5\)/s);
  assert.match(app,/function createBossCombatHelp[\s\S]*?renderBossHudRichText\(button, caption, \{ chip: true \}\)/);
  assert.match(app,/function renderBossEffectChipReferences[\s\S]*?#bossEffects \.boss-effect-chip/);
  assert.match(app,/renderBossEffectChipReferences\(\);/,'persistent effect captions use the shared reference renderer');
});
