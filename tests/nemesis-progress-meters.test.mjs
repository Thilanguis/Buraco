import test from 'node:test';
import assert from 'node:assert/strict';
import { nemesisBossPresentation } from '../js/boss/presentation/nemesis.js';
const meters = (abilityId, payload = {}) => nemesisBossPresentation.rangeMeters({ intent: { abilityId, payload } });
test('Extermínio: uma barra com faixas reais e snapshot', () => {
  for (const [contributed, secondExited, value, amount] of [[false,false,0,16], [true,false,1,8], [false,true,1,8], [true,true,2,0]]) {
    const result = meters('stars_extermination', JSON.parse(JSON.stringify({ contributed, secondExited })));
    assert.equal(result.length, 1); assert.equal(result[0].value, value); assert.equal(result[0].max, 2);
    assert.equal(result[0].currentEffect, `+${amount} INFECÇÃO BASE`);
    assert.deepEqual(result[0].segments.map(s => s.effect), ['+16 Infecção', '+8 Infecção', 'sem punição']);
  }
});
test('Objetivos binários e efeitos sem faixa não recebem barras', () => {
  for (const id of ['horde_invasion','stars_hunt','infectious_tentacle','tentacle_barrage','contaminated_zone','horde_command','rocket_launcher','parasite_regeneration','viral_reanimation','omega_outbreak']) assert.equal(meters(id), null);
  assert.equal(nemesisBossPresentation.rangeMeters(), null);
});
test('Texto identifica as exigências sem repetir faixas', () => {
  const result = nemesisBossPresentation.compactAction({ gameState: { players: [], boss: { phase: 3 } }, intent: { abilityId: 'stars_extermination', payload: { contributed: true, secondExited: false, secondCardId: 'x' } } });
  assert.match(result.progress, /✓ Contribuição · ○ Segunda carta: x/);
  assert.doesNotMatch(result.consequence, /2\/1\/0/);
});
