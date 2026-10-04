import assert from 'node:assert/strict';
import test from 'node:test';
import { dominatrixDefinition } from '../js/boss/bosses/dominatrix.js';
import { neheleniaDefinition } from '../js/boss/bosses/nehelenia.js';
import { dominatrixBossMechanics } from '../js/boss/mechanics/dominatrix.js';
import { neheleniaBossMechanics } from '../js/boss/mechanics/nehelenia.js';

test('Dominadora mantém pool de controle e pressão sem transformar todos os efeitos em Dominação', () => {
  const phase3 = dominatrixDefinition.abilities.filter((a) => a.phases.includes(3));
  const pressure = new Set(['forced_choice', 'exposure', 'iron_etiquette', 'favorite', 'absolute_control', 'break_will', 'final_order']);
  const totalWeight = phase3.reduce((sum, a) => sum + a.weight, 0);
  const pressureWeight = phase3.filter((a) => pressure.has(a.id)).reduce((sum, a) => sum + a.weight, 0);
  const ratio = pressureWeight / totalWeight;
  assert.ok(ratio >= 0.55 && ratio <= 0.65, `pressão F3 esperada ~55–65%, obtido ${ratio}`);
});

test('Canastra Real direta reduz 8 pontos de Dominação', () => {
  let delta = 0;
  dominatrixBossMechanics.afterMeldResolution({
    boss: { actionSequence: 0 },
    gameState: {},
    playerId: 0,
    meldId: 'm1',
    newKind: 'real',
    contribution: { dominatrixResistanceTier: 0, dominatrixChainsBroken: 0 },
    changeChains: (_playerId, amount) => { delta = amount; return amount; },
  });
  assert.equal(delta, -0.64); // 0.64 Chicote fracionário × 12,5 = 8 pontos
});

test('Nehelenia tira Prisão do pool ofensivo e Real direta reduz 8 pontos', () => {
  const prison = neheleniaDefinition.abilities.find((a) => a.id === 'mirror_prison');
  assert.equal(prison.weight, 0);
  assert.deepEqual(prison.phases, []);

  let reliefAmount = 0;
  neheleniaBossMechanics.onMeldContribution({
    boss: { danger: 3 },
    gameState: {},
    contribution: { neheleniaMirrorTier: 0, neheleniaMirrorRelief: 0 },
    oldKind: 'simple',
    newKind: 'real',
    meldId: 'm1',
    restoreDreamMirror: (_state, _playerId, _origin, _key, amount) => {
      reliefAmount = amount;
      return { dangerDelta: -amount };
    },
  });
  assert.equal(reliefAmount, 0.4); // 0.4 Espelho × 20 = 8 pontos
});
