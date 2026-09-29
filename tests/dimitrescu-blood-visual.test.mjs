import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const bossCss = fs.readFileSync(new URL('../styles/boss-mode.css', import.meta.url), 'utf8');

test('efeitos de sangue da Dimitrescu usam perfis separados por contexto', () => {
  assert.match(app, /function applyDimitrescuBloodScatter\(element, key = '', profile = 'card'\)/);
  assert.match(app, /syncDimitrescuDeadPileVisual\(container, active, key = ''\)/);
  assert.match(app, /applyDimitrescuBloodScatter\(div, card\.id, 'card'\)/);
  assert.match(app, /applyDimitrescuBloodScatter\(discardFace, discardTop\?\.id \|\| 'daniela-discard', 'discard'\)/);
  assert.match(app, /applyDimitrescuBloodScatter\(miniCard, card\.id \|\| `\$\{midx\}:\$\{cardIndex\}`, 'feast'\)/);
  assert.match(app, /applyDimitrescuBloodScatter\(closedCard, lastCard\.id \|\| `\$\{midx\}:closed`, 'feast'\)/);
  assert.match(app, /syncDimitrescuDeadPileVisual\(s0, bloodiedDead\?\.deadIndex === 0 && m0\.length > 0, m0\[m0\.length - 1\]\?\.id \|\| 'dead-0'\)/);
  assert.match(app, /syncDimitrescuDeadPileVisual\(s1, bloodiedDead\?\.deadIndex === 1 && m1\.length > 0, m1\[m1\.length - 1\]\?\.id \|\| 'dead-1'\)/);
});

test('marcacoes sangram com manchas irregulares e escorrimento em mao, jogos, lixo e morto', () => {
  assert.match(bossCss, /--blood-blob-x1/);
  assert.match(bossCss, /--blood-drip-x1/);
  assert.match(bossCss, /dimitrescuCardBloodWet/);
  assert.match(bossCss, /boss-card-cassandra-feast::after\s*\{/);
  assert.match(bossCss, /boss-discard-dimitrescu-card::before/);
  assert.match(bossCss, /boss-dead-blood-layer/);
});
