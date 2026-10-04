import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const appSource = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const cssSource = fs.readFileSync(new URL('../styles/boss-mode.css', import.meta.url), 'utf8');
const engineSource = fs.readFileSync(new URL('../js/boss/boss-engine.js', import.meta.url), 'utf8');
const bossPresentationSource = fs.readFileSync(new URL('../js/boss/boss-presentation.js', import.meta.url), 'utf8');
const dominatrixPresentationSource = fs.readFileSync(new URL('../js/boss/presentation/dominatrix.js', import.meta.url), 'utf8');
const bossBotSource = fs.readFileSync(new URL('../boss-bot.js', import.meta.url), 'utf8');

test('Ordem Final só sorteia cartas depois do aceite', () => {
  const builder = engineSource.slice(
    engineSource.indexOf('function buildFinalOrderTargets'),
    engineSource.indexOf('function legalDiscardCards'),
  );
  assert.ok(!builder.includes('cardIds:'), 'Ordem Final ainda pré-seleciona cartas');

  const resolver = engineSource.slice(
    engineSource.indexOf("option === 'obey' && choice.type === 'final_order'"),
    engineSource.indexOf("option === 'lock_card'"),
  );
  assert.match(resolver, /dominatrixPlayableCards\(gameState, player\)/);
  assert.match(resolver, /chooseCards\(/);
  assert.ok(!resolver.includes('choice.cardIds'), 'resolução ainda usa cartas reveláveis antes da decisão');

  const effectBlock = engineSource.slice(
    engineSource.indexOf('export function getBossCardEffect'),
    engineSource.indexOf('export function canBossCreateMeld'),
  );
  assert.ok(!effectBlock.includes("pendingChoices.some((choice) => choice.type === 'final_order'"), 'cartas pendentes ainda recebem marca antes do aceite');
});

test('bot também decide Ordem Final às cegas usando risco da barra', () => {
  assert.match(appSource, /BossBuracoBot\.chooseDominatrixPendingChoice\(state, playerId, choice\)/);
  const block = bossBotSource.slice(
    bossBotSource.indexOf('static chooseDominatrixPendingChoice'),
    bossBotSource.indexOf('static bossStrategicMeldKind'),
  );
  assert.match(block, /choice\.type === 'final_order'/);
  assert.ok(!block.includes('choice.cardIds'));
  assert.ok(!block.includes('markedCards'));
  assert.match(block, /dominatrixRiskScore/);
});

test('guia da Dominadora mantém textos curtos e detalhes ficam no sistema de ajuda', () => {
  const start = appSource.indexOf('// Dominadora — texto de jogo curto');
  const end = appSource.indexOf('// Matriarca Esmeralda.', start);
  const block = appSource.slice(start, end);
  for (const id of ['forced_choice', 'exposure', 'forced_swap', 'hands_tied', 'iron_etiquette', 'favorite', 'absolute_control', 'break_will', 'final_order']) {
    assert.match(block, new RegExp(`\\b${id}:`));
  }
  assert.match(block, /final_order: 'Aceite a Ordem às cegas ou sofra Dominação\.'/);
});

test('painel de escolha da Dominadora fica contido no HUD do tablet largo', () => {
  const start = cssSource.indexOf('Dominadora — escolha obrigatória no tablet largo');
  const block = cssSource.slice(start);
  assert.match(block, /position:\s*absolute/);
  assert.match(block, /right:\s*12px/);
  assert.match(block, /bottom:\s*9px/);
  assert.match(block, /\.boss-choice-panel > span\s*\{\s*display:\s*none;/s);
  assert.match(block, /\.boss-intent\s*\{\s*padding-bottom:\s*44px;/s);
});


test('Dominadora usa barras 0-50 com quatro cortes em vez de Chicotes fracionarios', () => {
  const start = appSource.indexOf('if (isDominatrix) {', appSource.indexOf('const chainStatus'));
  const end = appSource.indexOf('} else {', start);
  const block = appSource.slice(start, end);
  assert.match(block, /boss-domination-player/);
  assert.match(block, /boss-domination-track/);
  assert.match(block, /aria-valuemax="50"/);
  assert.match(block, /left:25%/);
  assert.match(block, /left:50%/);
  assert.match(block, /left:75%/);
  assert.doesNotMatch(block, /boss-chain-link/);
  assert.match(cssSource, /Dominadora — leitura principal por barra 0–50/);
  assert.match(cssSource, /\.boss-domination-fill/);
});

test('HUD da Dominadora fica curto e o detalhe continua no ponto de ajuda', () => {
  assert.match(dominatrixPresentationSource, /details\(\{ intent \} = \{\}\) \{[\s\S]*?return intent \? \[\] : \[\];/);
  assert.match(dominatrixPresentationSource, /Escolha: Ordem às cegas ou \+\$\{pressure\.direct\} Dominação/);
  assert.match(dominatrixPresentationSource, /Escolha: \+8 Dominação ou \+180 HP para a chefe/);
  assert.match(bossPresentationSource, /pendingChoices\?\.length && gameState\?\.boss\?\.id !== 'dominadora'/);
});
