import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

test('app inteiro compila como modulo de navegador', () => {
  const input = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], { input, encoding: 'utf8' });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
});

test('laboratorio da Visao tem painel e declaracoes unicos', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal((app.match(/const debugVisionLab\b/g) || []).length, 1);
  assert.equal((app.match(/async function debugSetupVision\b/g) || []).length, 1);
  assert.equal((html.match(/id="debugVisionLab"/g) || []).length, 1);
});
