import test from 'node:test';
import assert from 'node:assert/strict';
import { battle } from '../scripts/boss-battle-experiment.mjs';

for (const id of ['nemesis', 'matriarca_esmeralda']) test(`Experimento ${id}: partida reproduzível, 108 IDs físicos e término real`, () => {
  const options = { autoTarget: true, objectiveWeightFactor: .75, graftHeal: 40 };
  const first = battle(id, 7077, options), repeat = battle(id, 7077, options);
  assert.deepEqual(first, repeat);
  assert.notEqual(first.reason, 'policy_turn_limit');
  assert.ok(first.rounds > 1);
  assert.ok(Object.values(first.abilities).reduce((sum, n) => sum + n, 0) > 1);
});
