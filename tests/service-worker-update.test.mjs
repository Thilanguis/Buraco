import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [app, worker] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../service-worker.js', import.meta.url), 'utf8'),
]);

test('atualização só é marcada como aplicada quando o novo controller assume', () => {
  assert.match(app, /navigator\.serviceWorker\.addEventListener\('controllerchange'/);
  assert.match(app, /serviceWorkerActivationRequested/);
  const controllerBlock = app.slice(app.indexOf("navigator.serviceWorker.addEventListener('controllerchange'"), app.indexOf("navigator.serviceWorker.register('service-worker.js')"));
  assert.match(controllerBlock, /localStorage\.setItem\('buraco_current_version'/);
  const promptBlock = app.slice(app.indexOf('function showUpdatePrompt'), app.indexOf('const urlParams'));
  assert.doesNotMatch(promptBlock, /localStorage\.setItem\('buraco_current_version'/);
  assert.match(controllerBlock, /!serviceWorkerActivationRequested/);
});

test('checagem ignora cache HTTP e o fluxo oferece retry sem reload prematuro', () => {
  assert.match(app, /version_check=\$\{Date\.now\(\)\}/);
  assert.match(app, /cache: 'no-store'/);
  assert.match(app, /btn-update-retry/);
  assert.doesNotMatch(app, /newVersionNum\s*=\s*93/);
  assert.doesNotMatch(app, /window\.location\.reload\(\);\s*\},\s*1000/);
});

test('service worker novo mantém skipWaiting e sobe a versão de cache', () => {
  assert.match(worker, /CACHE_NAME = 'buraco-v258'/);
  assert.match(worker, /event\.data === 'skipWaiting'/);
});


test('apresentação de atualização preserva o contador antigo sem antecipar a ativação', () => {
  const promptBlock = app.slice(app.indexOf('function showUpdatePrompt'), app.indexOf('const urlParams'));
  assert.match(promptBlock, /Sincronizando Módulos/);
  assert.match(promptBlock, /Compilando pacotes \(1\/\$\{steps\}\)/);
  assert.match(promptBlock, /Compilando pacotes \(\$\{currentStep\}\/\$\{steps\}\)/);
  assert.match(promptBlock, /Mesa pronta!/);
  assert.match(promptBlock, /setTimeout\(requestAndWaitForActivation, 600\)/);
  assert.doesNotMatch(promptBlock, /localStorage\.setItem\('buraco_current_version'/);
});
