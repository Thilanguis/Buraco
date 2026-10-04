import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyBossMeldTransition,
  createBossState,
  getBossChains,
} from '../js/boss/boss-engine.js';

const MODE_BY_BOSS = Object.freeze({
  banker: 'boss_banker',
  dominadora: 'boss_dominadora',
  matriarca_esmeralda: 'boss_matriarca',
  dimitrescu: 'boss_dimitrescu',
  nehelenia: 'boss_nehelenia',
});

function gameFor(bossId) {
  return {
    mode: MODE_BY_BOSS[bossId],
    variant: 'fechado',
    currentPlayer: 0,
    turnNumber: 7,
    stock: [],
    discard: [],
    players: [
      { id: 0, name: 'Biel', teamId: 0, hand: [] },
      { id: 1, name: 'BOT Luana', teamId: 0, hand: [] },
    ],
    teams: [
      { id: 0, playerIndexes: [0, 1], melds: [[{ id: 'base-3', rank: '3', suit: '♣' }]] },
      { id: 1, playerIndexes: [], melds: [] },
    ],
    deadChunksTaken: [0, 0],
    deadPiles: [[], []],
    boss: createBossState(bossId, 4242),
  };
}

function evolveSameTurn(state, playerId = 0) {
  applyBossMeldTransition(state, { teamId: 0, playerId, meldIndex: 0, oldKind: 'simple', newKind: 'limpa', cardsAdded: [] });
  applyBossMeldTransition(state, { teamId: 0, playerId, meldIndex: 0, oldKind: 'limpa', newKind: 'real', cardsAdded: [] });
  applyBossMeldTransition(state, { teamId: 0, playerId, meldIndex: 0, oldKind: 'real', newKind: 'asas', cardsAdded: [] });
}

test('Limpa -> Real -> As-a-As alivia cada tier mesmo no mesmo turno: Banqueiro', () => {
  const state = gameFor('banker');
  state.boss.danger = 60;
  evolveSameTurn(state);
  assert.equal(state.boss.danger, 48, '4 + 4 + 4 de alivio devem acumular no mesmo turno');
});

test('Limpa -> Real -> As-a-As alivia cada tier mesmo no mesmo turno: Dimitrescu', () => {
  const state = gameFor('dimitrescu');
  state.boss.danger = 60;
  evolveSameTurn(state);
  assert.equal(state.boss.danger, 48, '4 + 4 + 4 de alivio devem acumular no mesmo turno');
});

test('Limpa -> Real -> As-a-As alivia cada tier mesmo no mesmo turno: Matriarca', () => {
  const state = gameFor('matriarca_esmeralda');
  state.boss.bloom = 4;
  state.boss.danger = 4;
  evolveSameTurn(state);
  assert.equal(state.boss.bloom, 1, 'cada tier deve remover 1 Flor no mesmo turno');
});

test('Limpa -> Real -> As-a-As alivia cada tier mesmo no mesmo turno: Nehelenia', () => {
  const state = gameFor('nehelenia');
  state.boss.dreamMirrorMarksMigrated = true;
  state.boss.dreamMirrorMarksByPlayer = { 0: 2, 1: 1 };
  state.boss.dreamMirrorsByPlayer = { 0: 'stolen', 1: 'stolen' };
  state.boss.danger = 3;
  evolveSameTurn(state);
  assert.ok(Math.abs(state.boss.danger - 2.4) < 1e-9, `esperado 2.4, veio ${state.boss.danger}`);
});

test('Dominadora: alivio de canastra transborda para o parceiro quando o autor esta zerado', () => {
  const state = gameFor('dominadora');
  state.boss.chainsByPlayer = { 0: 0, 1: 3.2 }; // 0/50 e 40/50
  applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'limpa', cardsAdded: [] });
  assert.equal(getBossChains(state, 0), 0);
  assert.ok(Math.abs(getBossChains(state, 1) - 2.88) < 1e-9, 'os 4 pontos da Limpa devem sair do parceiro');
});

test('Dominadora: Limpa -> Real -> As-a-As acumula 12 pontos de alivio no mesmo turno e pode ir todo ao parceiro', () => {
  const state = gameFor('dominadora');
  state.boss.chainsByPlayer = { 0: 0, 1: 3.2 }; // parceiro em 40/50
  evolveSameTurn(state, 0);
  assert.equal(getBossChains(state, 0), 0);
  assert.ok(Math.abs(getBossChains(state, 1) - 2.24) < 1e-9, `esperado 28/50 no parceiro, veio ${getBossChains(state, 1) * 12.5}/50`);
});
