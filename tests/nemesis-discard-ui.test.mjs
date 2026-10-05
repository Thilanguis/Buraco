import test from 'node:test';
import assert from 'node:assert/strict';
import { nemesisBossUi } from '../js/boss/ui/nemesis-ui.js';
const state = () => ({ players: [{ id: 0 }, { id: 1 }], currentPlayer: 0, boss: { currentIntent: { abilityId: 'contaminated_zone', payload: { targetPlayerId: 0 } }, roundNumber: 2 } });
test('Sem Zona de Impacto: null/undefined e jogo sem ID não quebram o render', () => {
  for (const impactZone of [null, undefined, {}, { meldId: 'm', expiresRound: 2 }]) {
    for (const meldId of [null, undefined]) {
      assert.deepEqual(nemesisBossUi.meld({ boss: { impactZone, roundNumber: 2 }, meldId }).divClasses, []);
    }
  }
  for (const impactZone of [null, undefined]) {
    assert.deepEqual(nemesisBossUi.meld({ boss: { impactZone, roundNumber: 2 }, meldId: 'm' }).divClasses, []);
  }
});
test('Contaminação acompanha o turno do alvo, snapshot e encerramento', () => {
  const gameState = state();
  assert.equal(nemesisBossUi.discard({ gameState }), true);
  assert.equal(nemesisBossUi.discard({ gameState: JSON.parse(JSON.stringify(gameState)) }), true);
  gameState.currentPlayer = 1; assert.equal(nemesisBossUi.discard({ gameState }), false);
  gameState.currentPlayer = 0; gameState.boss.currentIntent.payload.resolved = true;
  assert.equal(nemesisBossUi.discard({ gameState }), false);
  gameState.boss.currentIntent.payload.resolved = false; gameState.finished = true;
  assert.equal(nemesisBossUi.discard({ gameState }), false);
  gameState.finished = false; gameState.boss.result = { victory: false };
  assert.equal(nemesisBossUi.discard({ gameState }), false);
});
test('Zona Contaminada não cria Zona de Impacto; efeito válido anterior é independente', () => {
  const gameState = state(); const boss = gameState.boss;
  assert.deepEqual(nemesisBossUi.meld({ boss, meldId: 'm' }).divClasses, []);
  boss.impactZone = { meldId: 'm', expiresRound: 2 };
  assert.deepEqual(nemesisBossUi.meld({ boss, meldId: 'm' }).divClasses, ['nemesis-impact-zone']);
  boss.roundNumber = 3;
  assert.deepEqual(nemesisBossUi.meld({ boss, meldId: 'm' }).divClasses, []);
  boss.currentIntent.abilityId = 'rocket_launcher';
  assert.equal(nemesisBossUi.discard({ gameState }), false);
});
