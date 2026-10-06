import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { BossBuracoBot } from '../boss-bot.js';

const appSource = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const engineSource = fs.readFileSync(new URL('../js/boss/boss-engine.js', import.meta.url), 'utf8');

function hand(prefix, count = 10) {
  return Array.from({ length: count }, (_, index) => ({ id: `${prefix}${index}` }));
}

function state({ own = 0, partner = 0, hp = 1800, handSize = 10 } = {}) {
  return {
    mode: 'boss_dominadora',
    players: [
      { id: 0, hand: hand('a', handSize) },
      { id: 1, hand: hand('b', handSize) },
    ],
    boss: {
      id: 'dominadora',
      phase: 3,
      maxHp: 2600,
      hp,
      chainsByPlayer: { 0: own, 1: partner },
    },
  };
}

test('risco da Dominadora usa pontos fracionarios e valoriza cruzar Sob Controle', () => {
  const low = BossBuracoBot.dominatrixRiskScore(state({ own: 0.4 }), 0, 8);
  const crossing = BossBuracoBot.dominatrixRiskScore(state({ own: 2.8 }), 0, 8);
  assert.ok(crossing > low * 2, `cruzar 37,5 deve pesar muito mais: low=${low}, crossing=${crossing}`);
});

test('risco considera transbordamento e derrota 50/50', () => {
  const game = state({ own: 4, partner: 3.9 });
  assert.equal(BossBuracoBot.dominatrixRiskScore(game, 0, 8), 1000);
});

test('Escolha Forcada compara dificuldade da ordem com a barra atual', () => {
  const hardOrder = { type: 'evolve_specific_meld', eligibleCardIds: ['a0'] };
  const choice = { type: 'forced_choice', options: ['chain', 'order'], announcedPhase: 3, order: hardOrder };
  assert.equal(BossBuracoBot.chooseDominatrixPendingChoice(state({ own: 0 }), 0, choice), 'chain');
  assert.equal(BossBuracoBot.chooseDominatrixPendingChoice(state({ own: 3.4 }), 0, choice), 'order');
});

test('Quebra de Vontade compara +8 de Dominação com cura real da chefe', () => {
  const choice = { type: 'break_will', options: ['chain', 'break_meld'], announcedPhase: 3 };
  assert.equal(BossBuracoBot.chooseDominatrixPendingChoice(state({ own: 0, hp: 1800 }), 0, choice), 'chain');
  assert.equal(BossBuracoBot.chooseDominatrixPendingChoice(state({ own: 2.8, hp: 1800 }), 0, choice), 'break_meld');
});

test('Ordem Final continua cega mas muda a decisão conforme o risco da barra', () => {
  const choice = { type: 'final_order', options: ['obey', 'chain'], announcedPhase: 3 };
  assert.equal(BossBuracoBot.chooseDominatrixPendingChoice(state({ own: 0.5 }), 0, choice), 'obey');
  assert.equal(BossBuracoBot.chooseDominatrixPendingChoice(state({ own: 3.2 }), 0, choice), 'chain');
});

test('app delega escolhas da Dominadora ao BossBuracoBot e não usa a heuristica antiga fixa', () => {
  assert.match(appSource, /BossBuracoBot\.chooseDominatrixPendingChoice\(state, playerId, choice\)/);
  assert.doesNotMatch(appSource, /ownChains >= 2\.5 \|\| partnerChains >= 3/);
});

test('prioridades da Dominadora incluem a carta de Exposição para o bot tentar cumpri-la', () => {
  const block = engineSource.slice(
    engineSource.indexOf('export function getBossDominatrixPriorities'),
    engineSource.indexOf('export function getBossDimitrescuPriorities'),
  );
  assert.match(block, /boss\.currentIntent\?\.abilityId === 'exposure'/);
  assert.match(block, /markedCardIds\.push\(boss\.currentIntent\.payload\.cardId\)/);
});
