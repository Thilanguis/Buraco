import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { buildBossDebugScenario, getBossDebugCatalog } from '../js/boss/boss-debug-scenarios.js';
import { buildBossActionPresentation, buildBossAbilityHelp } from '../js/boss/boss-presentation.js';
import { getBossDefinition } from '../js/boss/boss-registry.js';
import { selectNextBossIntent } from '../js/boss/boss-engine.js';

const technical = /PASSIVA F\d|\bF[123]\b|\btier\b|\bpayload\b|propagação comum|resolvid[ao] separadamente|0 HP \+|50\/50–74|objetivo\(s\)/i;

test('todas as habilidades dos seis chefes têm ajuda legível, em cada fase disponível', () => {
  let checked = 0;
  for (const boss of getBossDebugCatalog()) {
    for (const ability of getBossDefinition(boss.id).abilities) {
      for (const phase of ability.phases) {
        const { state } = buildBossDebugScenario(null, { bossId: boss.id, abilityId: ability.id, phase, variant: 'interactive', target: 'auto' });
        selectNextBossIntent(state, { debug: true });
        if (ability.id === 'rebirth') state.boss.currentIntent = { id: 'copy-rebirth', abilityId: 'rebirth', name: 'Renascimento', announcedPhase: 3, payload: {}, description: 'PASSIVA F3: 0 HP + 1 Flor → volta com 300 HP (1x).' };
        assert.equal(state.boss.currentIntent?.abilityId, ability.id, `${boss.id}/${ability.id}: cenário precisa testar a habilidade solicitada`);
        const before = JSON.stringify(state);
        const action = buildBossActionPresentation(state);
        const help = buildBossAbilityHelp(state);
        assert.ok(action?.instruction, `${boss.id}/${ability.id}: falta texto no HUD`);
        assert.ok(help?.text, `${boss.id}/${ability.id}: falta ajuda`);
        assert.doesNotMatch([action.instruction, action.consequence, help.text].join('\n'), technical, `${boss.id}/${ability.id}/${phase}`);
        assert.equal(JSON.stringify(state), before, 'Ler os textos não altera a partida');
        assert.doesNotMatch(ability.describe({ phase, targetCount: 2, suitLabel: 'copas' }), technical, `${boss.id}/${ability.id}: guia`);
        checked++;
      }
    }
  }
  assert.equal(checked, 136, `Cobertura incompleta: ${checked}`);
});

test('Renascimento explica condição, custo, cura e limite mesmo em partida salva antiga', () => {
  const { state } = buildBossDebugScenario(null, { bossId: 'matriarca_esmeralda', abilityId: 'rebirth', phase: 3, variant: 'interactive', target: 'auto' });
  state.boss.currentIntent = { id: 'old-rebirth', abilityId: 'rebirth', name: 'Renascimento', payload: {}, description: 'PASSIVA F3: 0 HP + 1 Flor → volta com 300 HP (1x).' };
  const action = buildBossActionPresentation(state), help = buildBossAbilityHelp(state);
  assert.match(action.instruction, /consome 1 Flor.*300 HP/);
  assert.match(action.instruction, /^Se morrer,/);
  assert.match(help.text, /Se morrer e tiver pelo menos uma Flor/);
  assert.doesNotMatch(action.instruction + help.text, /Se cair|for derrotada/);
  assert.match(action.consequence, /Uma vez.*fase final/);
  assert.match(help.text, /Sem Flores, não renasce/);
});

test('guia não mantém o Enxerto antigo nem abrevia Renascimento como código', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /Falha parcial ou total: \+1 Flor|rebirth: 'Fase 3:/);
  assert.match(app, /graft: '.*Só um alimentado permite uma cura/);
});
