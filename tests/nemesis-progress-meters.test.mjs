import test from 'node:test';
import assert from 'node:assert/strict';
import { nemesisBossPresentation } from '../js/boss/presentation/nemesis.js';
import { changeNemesisInfection, getNemesisObjectiveOutcome, nemesisBossMechanics } from '../js/boss/mechanics/nemesis.js';
const meters = (abilityId, payload = {}) => nemesisBossPresentation.rangeMeters({ intent: { abilityId, payload } });

test('Comando da Horda explains only its reinforced zombie, with no progress bar', () => {
  for (const [id, name, normal, mutated] of [['grabber', 'Agarrador', 2, 3], ['infected', 'Infectado', 4, 6], ['devourer', 'Devorador', 70, 100]]) {
    for (const mutation of [false, true]) {
      const entity = { id, name, status: 'persistent', hp: 300, mutated: mutation };
      const gameState = { players: [], boss: { roundNumber: 1, combatEntities: [entity], hordeBuff: { entityId: id, expiresRound: 2 }, combatTargetsByPlayer: { 0: 'boss' } } };
      const intent = { abilityId: 'horde_command', payload: { entityId: id, activated: true } };
      const context = { gameState, intent };
      const copy = nemesisBossPresentation.compactAction(context);
      assert.equal(copy.instruction, `${name} reforçado até fim da rodada 2.`);
      const value = mutation ? mutated : normal;
      assert.equal(copy.consequence, id === 'grabber' ? `Após compra: até ${value} cartas presas.` : id === 'infected' ? `Falha: +${value} Infecção extra.` : `A cada 3 cartas da equipe: cura até ${value} HP.`);
      assert.equal(nemesisBossPresentation.rangeMeters(context), null);
      const help = nemesisBossPresentation.help(context);
      assert.match(help, new RegExp(`Só ${name} recebe este reforço`));
      assert.doesNotMatch(help, /\+1 presa|\+2 falha|\+30 cura/);
      gameState.boss.combatTargetsByPlayer[0] = 'infected';
      assert.deepEqual(nemesisBossPresentation.compactAction(context), copy, 'damage selection does not change the reinforced zombie');
      gameState.boss.roundNumber = 3;
      assert.equal(nemesisBossPresentation.compactAction(context).instruction, 'Reforço encerrado.');
      gameState.boss.roundNumber = 1; entity.status = 'corpse'; entity.hp = 0;
      assert.equal(nemesisBossPresentation.compactAction(context).instruction, 'Reforço encerrado.');
    }
  }
});
test('Extermínio: uma barra com faixas reais e snapshot', () => {
  for (const [contributed, secondExited, value, amount] of [[false,false,0,16], [true,false,1,8], [false,true,1,8], [true,true,2,0]]) {
    const result = meters('stars_extermination', JSON.parse(JSON.stringify({ contributed, secondExited })));
    assert.equal(result.length, 1); assert.equal(result[0].value, value); assert.equal(result[0].max, 2);
    assert.equal(result[0].currentEffect, `+${amount} INFECÇÃO`);
    assert.deepEqual(result[0].segments.map(s => s.effect), ['+16 Infecção', '+8 Infecção', 'sem punição']);
  }
});

test('HUD/help project the actual resolution for every offensive objective and active bonus', () => {
  for (const abilityId of ['stars_hunt', 'infectious_tentacle', 'tentacle_barrage', 'stars_extermination']) {
    for (const status of ['absent', 'entering', 'corpse', 'persistent']) for (const mutated of [false, true]) {
      for (const danger of [0, 49, 50, 74, 75, 95]) for (const expired of [false, true]) {
        for (const fulfilled of [0, 1, 2]) {
          const boss = { danger, phase: 3, roundNumber: 3, infectionEventIds: [], grabbedByPlayer: {},
            combatEntities: [{ id: 'infected', status, hp: status === 'corpse' ? 0 : 300, mutated }],
            hordeBuff: { entityId: 'infected', expiresRound: expired ? 2 : 3 }, omegaBuff: { expiresRound: expired ? 2 : 3 } };
          const payload = { targetPlayerId: 0, failure: abilityId === 'tentacle_barrage' ? 16 : 10, required: 2,
            exitedCardIds: fulfilled === 2 ? ['a', 'b'] : [], contributed: fulfilled >= 1, secondExited: fulfilled === 2 };
          const intent = { id: 'objective', name: abilityId, abilityId, payload };
          const state = { players: [], boss };
          const before = JSON.stringify(boss);
          const projected = getNemesisObjectiveOutcome(boss, intent);
          const compact = nemesisBossPresentation.compactAction({ gameState: state, intent });
          const help = nemesisBossPresentation.help({ gameState: state, intent });
          assert.equal(compact.consequence, `Falha: +${projected.applied} Infecção`);
          assert.match(help, new RegExp(`Total \\+${projected.applied} Infecção`));
          assert.doesNotMatch(help + compact.consequence, /\+ bônus|bônus de Infectado/);
          if (abilityId === 'stars_extermination') {
            const meter = nemesisBossPresentation.rangeMeters({ gameState: state, intent })[0];
            assert.equal(meter.currentEffect, `+${projected.applied} INFECÇÃO`);
          }
          assert.equal(JSON.stringify(boss), before, 'presentation is read-only');
          boss.currentIntent = intent;
          nemesisBossMechanics.onPlayerTurnEnd({ boss, gameState: state, playerId: 0, recordBossEvent: () => {} });
          assert.equal(payload.infectionApplied, projected.applied, 'HUD equals the actual turn resolution');
          assert.equal(boss.danger - danger, projected.applied);
          assert.equal(changeNemesisInfection(boss, projected.base, 'objective:failure', { failure: projected.failed }), 0, 'reload/event replay remains deduplicated');
        }
      }
    }
  }
});

test('Extermination progress and help show normal, mutated, reinforced and Omega composition', () => {
  const gameState = { players: [], boss: { danger: 50, roundNumber: 2, combatEntities: [{ id: 'infected', status: 'persistent', hp: 300, mutated: true }],
    hordeBuff: { entityId: 'infected', expiresRound: 2 }, omegaBuff: { expiresRound: 2 } } };
  for (const [contributed, secondExited, total] of [[false, false, 26], [true, false, 18], [true, true, 0]]) {
    const intent = { abilityId: 'stars_extermination', payload: { contributed, secondExited } };
    assert.equal(nemesisBossPresentation.rangeMeters({ gameState, intent })[0].currentEffect, `+${total} INFECÇÃO`);
    const help = nemesisBossPresentation.help({ gameState, intent });
    if (total) assert.match(help, /Infectado Mutado \+4\nReforçado \+2\nSurto Ômega \+4/);
    else assert.doesNotMatch(help, /Infectado|Reforçado|Ômega/);
  }
});

test('Base 10 plus mutated/reinforced Infectado is 16, without a generic bonus promise', () => {
  const gameState = { players: [], boss: { danger: 0, phase: 2, roundNumber: 2,
    combatEntities: [{ id: 'infected', status: 'persistent', hp: 300, mutated: true }], hordeBuff: { entityId: 'infected', expiresRound: 2 } } };
  const intent = { abilityId: 'stars_hunt', payload: { failure: 10, contributed: false } };
  assert.equal(nemesisBossPresentation.compactAction({ gameState, intent }).consequence, 'Falha: +16 Infecção');
  assert.match(nemesisBossPresentation.help({ gameState, intent }), /Base \+10\nInfectado Mutado \+4\nReforçado \+2\nTotal \+16 Infecção/);
  intent.payload.contributed = true;
  assert.equal(nemesisBossPresentation.compactAction({ gameState, intent }).consequence, 'Falha: +0 Infecção');
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
