import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { buildBossDebugScenario, getBossDebugCatalog } from '../js/boss/boss-debug-scenarios.js';
import { buildBossActionPresentation, buildBossAbilityHelp } from '../js/boss/boss-presentation.js';
import { selectNextBossIntent } from '../js/boss/boss-engine.js';

const MANUAL_ONLY = new Set(['rebirth', 'mirror_prison']);

function preparedPresentation(bossId, abilityId) {
  const prepared = buildBossDebugScenario(null, { bossId, abilityId, phase: 'auto', variant: 'interactive', target: 'auto' });
  selectNextBossIntent(prepared.state, { debug: true });
  return { state: prepared.state, presentation: buildBossActionPresentation(prepared.state) };
}

test('HUD ativo mantém objetivo, progresso e consequência dentro de uma régua compacta', () => {
  for (const boss of getBossDebugCatalog()) {
    for (const ability of boss.abilities) {
      if (MANUAL_ONLY.has(ability.id)) continue;
      const { presentation } = preparedPresentation(boss.id, ability.id);
      const instruction = String(presentation?.instruction || '');
      const progress = String(presentation?.progress || '');
      const consequence = String(presentation?.consequence || '');
      assert.ok(instruction.length <= 56, `${boss.id}/${ability.id}: instruction ${instruction.length} chars: ${instruction}`);
      assert.ok(consequence.length <= 44, `${boss.id}/${ability.id}: consequence ${consequence.length} chars: ${consequence}`);
      assert.ok(progress.length <= 70, `${boss.id}/${ability.id}: progress ${progress.length} chars: ${progress}`);
      for (const line of progress.split('\n')) assert.ok(line.length <= 46, `${boss.id}/${ability.id}: progress line ${line.length} chars: ${line}`);
    }
  }
});

test('explicações longas ficam no botão de ajuda, não no objetivo principal', () => {
  const mirrored = preparedPresentation('nehelenia', 'mirrored_meld');
  const mirroredHelp = buildBossAbilityHelp(mirrored.state)?.text || '';
  assert.match(mirroredHelp, /Desorientado/i);
  assert.match(mirroredHelp, /fundo do Monte/i);
  assert.doesNotMatch(mirrored.presentation.consequence, /carta ao monte/i);

  const daughters = preparedPresentation('dimitrescu', 'crimson_clot');
  const daughtersHelp = buildBossAbilityHelp(daughters.state)?.text || '';
  assert.match(daughtersHelp, /Coágulo/);
  assert.match(daughtersHelp, /Coágulo antes da Lady/);
  assert.ok(String(daughters.presentation.progress || '').length <= 40);
});


test('ajudas atuais da Dimitrescu cabem em blocos curtos sem linguagem de implementação', () => {
  const boss=getBossDebugCatalog().find(b=>b.id==='dimitrescu');
  for(const ability of boss.abilities) {
    const {state}=preparedPresentation('dimitrescu',ability.id);
    const help=buildBossAbilityHelp(state)?.text;
    assert.ok(help,ability.id);assert.ok(help.length<=300,`${ability.id}: ${help.length}`);
    assert.doesNotMatch(help,/payload|janela|resolvid[ao] separadamente|não existe punição extra/);
  }
});

test('referências de carta recebem destaque visual sem transformar o resto do texto em HTML', async () => {
  const [app, css] = await Promise.all([
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles/boss-mode.css', import.meta.url), 'utf8'),
  ]);
  assert.match(app, /function renderBossHudRichText/);
  assert.match(app, /\(10\|\[2-9AJQK\]\)\(\[♠♦♣♥\]\)/);
  assert.match(app, /renderBossHudRichText\(intentDescription/);
  assert.match(app, /renderBossHudRichText\(intentProgress/);
  assert.match(app, /renderBossHudRichText\(text, help\.text\)/);
  assert.match(css, /\.boss-card-ref/);
  assert.match(css, /\.boss-card-ref\.suit-red/);
  assert.match(css, /\.boss-card-ref\.suit-dark/);
});
