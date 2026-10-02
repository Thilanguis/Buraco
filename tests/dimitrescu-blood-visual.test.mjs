import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const dimitrescuUi = fs.readFileSync(new URL('../js/boss/ui/dimitrescu-ui.js', import.meta.url), 'utf8');
const coreBossCss = fs.readFileSync(new URL('../styles/boss-mode.css', import.meta.url), 'utf8');
const dimitrescuCss = fs.readFileSync(new URL('../styles/boss/dimitrescu.css', import.meta.url), 'utf8');

test('efeitos de sangue da Dimitrescu usam perfis separados por contexto', () => {
  assert.match(app, /function applyDimitrescuBloodScatter\(element, key = '', profile = 'card'\)/);
  assert.match(app, /syncDimitrescuDeadPileVisual\(container, active, key = ''\)/);
  assert.match(app, /applyDimitrescuBloodScatter\(div, card\.id, 'card'\)/);
  assert.match(app, /applyDimitrescuBloodScatter\(discardFace, discardTop\?\.id \|\| 'daniela-discard', 'discard'\)/);
  assert.match(app, /function applyBossMeldCardDecoration/);
  assert.match(app, /decoration\.bloodProfile\) applyDimitrescuBloodScatter\(element, key, decoration\.bloodProfile\)/);
  assert.match(dimitrescuUi, /cardDecoration: cassandraMarked \? \{ classes: \['boss-card-cassandra-feast'\], bloodProfile: 'feast' \} : null/);
  assert.match(app, /syncDimitrescuDeadPileVisual\(s0, bloodiedDead\?\.deadIndex === 0 && m0\.length > 0, m0\[m0\.length - 1\]\?\.id \|\| 'dead-0'\)/);
  assert.match(app, /syncDimitrescuDeadPileVisual\(s1, bloodiedDead\?\.deadIndex === 1 && m1\.length > 0, m1\[m1\.length - 1\]\?\.id \|\| 'dead-1'\)/);
});

test('marcacoes sangram com manchas irregulares e escorrimento em mao, jogos, lixo e morto', () => {
  assert.match(coreBossCss, /--blood-blob-x1/);
  assert.match(coreBossCss, /--blood-drip-x1/);
  assert.match(coreBossCss, /dimitrescuCardBloodWet/);
  assert.match(coreBossCss, /boss-card-cassandra-feast::after\s*\{/);
  assert.match(coreBossCss, /boss-discard-dimitrescu-card::before/);
  assert.match(coreBossCss, /boss-dead-blood-layer/);
});


test('molduras PNG da Dimitrescu usam caminho relativo correto após isolamento do CSS', () => {
  assert.match(dimitrescuCss, /url\(['"]?\.\.\/\.\.\/assets\/images\/dimitrescu-blood-meter-frame\.png/);
  assert.match(dimitrescuCss, /url\(['"]?\.\.\/\.\.\/assets\/images\/portas-castelo-lixo\.png/);
  assert.doesNotMatch(dimitrescuCss, /url\(['"]?\.\.\/assets\/images\/(?:dimitrescu-blood-meter-frame|portas-castelo-lixo)\.png/);
});


test('Marca Carmesim e Caçada não ampliam a área rolável vertical da mão', () => {
  assert.match(coreBossCss, /#handContainer \.carta\.boss-card-dimitrescu-hunt,\s*\.boss-mode #handContainer \.carta\.boss-card-dimitrescu-blood-mark\s*\{[^}]*overflow:\s*clip;[^}]*overflow-clip-margin:\s*0;/s);
  assert.match(coreBossCss, /#handContainer \.carta\.boss-card-dimitrescu-hunt::after,\s*\.boss-mode #handContainer \.carta\.boss-card-dimitrescu-blood-mark::after\s*\{[^}]*inset:\s*0;/s);
  assert.doesNotMatch(coreBossCss, /#handContainer \.carta\.boss-card-dimitrescu-(?:hunt|blood-mark)[^{]*\{[^}]*overflow-clip-margin:\s*18px;/s);
});
