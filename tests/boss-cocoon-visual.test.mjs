import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles/boss-mode.css', import.meta.url), 'utf8');

test('Casulo Esmeralda possui protecao no retrato e medidor junto ao HP', () => {
  assert.match(html, /class="boss-cocoon-ward"/);
  assert.match(html, /id="bossCocoonMeter"/);
  assert.match(html, /id="bossCocoonText"/);
  assert.match(app, /boss\.emeraldCocoon\?\.status === 'active'/);
  assert.match(app, /cocoonText\.textContent = `\$\{cocoonRemaining\} \/ \$\{cocoonMaximum\}`/);
});

test('feedback do Casulo reage somente a dano realmente absorvido', () => {
  assert.match(app, /Number\(feedback\.absorbedDamage\) > 0/);
  assert.match(app, /boss-cocoon-impact/);
  assert.match(app, /boss-cocoon-breaking/);
  assert.match(app, /CASULO ABSORVEU/);
});

test('protecao usa camada leve e respeita movimento reduzido', () => {
  assert.match(css, /\.boss-cocoon-ward\s*\{/);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /@keyframes bossCocoonImpact/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.boss-cocoon-ward[\s\S]*animation:\s*none !important/);
  assert.doesNotMatch(css.match(/\.boss-cocoon-ward\s*\{[\s\S]*?\n\}/)?.[0] || '', /mix-blend-mode|filter:/);
});
