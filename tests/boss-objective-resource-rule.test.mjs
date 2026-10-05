import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createBossState, applyBossMeldTransition } from '../js/boss/boss-engine.js';
import { buildBossAbilityHelp, buildBossActionPresentation } from '../js/boss/boss-presentation.js';
import { nemesisBossMechanics } from '../js/boss/mechanics/nemesis.js';
import { bankerBossPresentation } from '../js/boss/presentation/banker.js';
import { buildBossDebugScenario, getBossDebugCatalog } from '../js/boss/boss-debug-scenarios.js';
import { selectNextBossIntent, normalizeBossState, getBossChains } from '../js/boss/boss-engine.js';

// Exercise real state transitions without adding production exports for tests.
const url = new URL('../js/boss/boss-engine.js', import.meta.url);
const source = (await readFile(url, 'utf8')).replace(/from '(\.\/[^']+)'/g,
  (_, path) => `from '${new URL(path, url).href}'`);
const { resolveIntent, applyDamageToBoss, succeedNatureThreat, chooseDominatrixFavoriteTargets } = await import(`data:text/javascript;base64,${Buffer.from(`${source}\nexport { resolveIntent, applyDamageToBoss, succeedNatureThreat, chooseDominatrixFavoriteTargets };`).toString('base64')}`);

function game(abilityId, payload, phase = 2, bossId = 'dimitrescu') {
  const boss = createBossState(bossId, 4242);
  boss.phase = phase; boss.danger = 40;
  boss.currentIntent = { id: `rule-${abilityId}`, abilityId, name: abilityId, announcedPhase: phase, payload };
  return { mode: `boss_${bossId}`, currentPlayer: 0, turnNumber: 4, stock: [], discard: [],
    deadChunksTaken: [0, 0], deadPiles: [[], []],
    players: [{ id: 0, name: 'Biel', teamId: 0, hand: [] }, { id: 1, name: 'Luana', teamId: 0, hand: [] }],
    teams: [{ id: 0, playerIndexes: [0, 1], melds: [[]] }, { id: 1, playerIndexes: [], melds: [] }], boss };
}

for (const phase of [2, 3]) {
  for (const chains of [{ 0: 2, 1: 1 }, { 0: 1, 1: 2 }]) {
    test(`Favorita F${phase} ${JSON.stringify(chains)}: poupa sem recuperação, pune menor +8 e não duplica no snapshot`, () => {
      let state = game('favorite', {}, phase, 'dominadora');
      state.boss.chainsByPlayer = { ...chains };
      const targets = chooseDominatrixFavoriteTargets(state);
      assert.equal(chains[targets.punishedPlayerId], 1);
      state.boss.currentIntent.payload = targets;
      const protectedBefore = getBossChains(state, targets.protectedPlayerId);
      const punishedBefore = getBossChains(state, targets.punishedPlayerId);
      resolveIntent(state);
      assert.equal(getBossChains(state, targets.protectedPlayerId), protectedBefore);
      assert.ok(Math.abs((getBossChains(state, targets.punishedPlayerId) - punishedBefore) * 12.5 - 8) < 1e-8);
      const after = { ...state.boss.chainsByPlayer };
      state = JSON.parse(JSON.stringify(state)); normalizeBossState(state);
      resolveIntent(state);
      assert.deepEqual(state.boss.chainsByPlayer, after);
    });
  }
}
test('Dominadora: recuperação por canastras mantém valores e idempotência', () => {
  const state = game('favorite', {}, 2, 'dominadora'); state.boss.currentIntent = null;
  state.boss.chainsByPlayer = { 0: 2, 1: 1 };
  for (const [oldKind, newKind] of [['simple', 'limpa'], ['limpa', 'real'], ['real', 'asas']]) {
    const before = getBossChains(state, 0);
    applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind, newKind, cardsAdded: [] });
    assert.ok(Math.abs((before - getBossChains(state, 0)) * 12.5 - 4) < 1e-8);
    const after = getBossChains(state, 0);
    applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: newKind, newKind, cardsAdded: [] });
    assert.equal(getBossChains(state, 0), after);
  }
});
test('Renascimento preserva o gasto interno aprovado de uma Flor', () => {
  const state = game('rebirth', {}, 3, 'matriarca_esmeralda');
  state.boss.currentIntent = null; state.boss.hp = 10;
  state.boss.bloom = 2; state.boss.danger = 2;
  applyDamageToBoss(state, 20, { sourceActionId: 'approved-rebirth' });
  assert.equal(state.boss.bloom, 1); assert.equal(state.boss.hp, 300);
});

// Every current/future registered active ability is covered; only named,
// approved internal resource spends are exempt. No canastra is played here.
for (const boss of getBossDebugCatalog()) for (const ability of boss.abilities) {
  if (['rebirth', 'red_wine'].includes(ability.id)) continue;
  for (const phase of ability.phases) test(`Regra global: ${boss.id}/${ability.id} F${phase} não recupera recurso ao resolver`, () => {
    const { state } = buildBossDebugScenario(null, { bossId: boss.id, abilityId: ability.id, phase });
    selectNextBossIntent(state, { debug: true });
    assert.equal(state.boss.currentIntent?.abilityId, ability.id, 'test must resolve the requested ability, not a fallback');
    if (boss.id === 'dominadora') state.boss.chainsByPlayer = { 0: 1, 1: 2 };
    else if (boss.id === 'matriarca_esmeralda') { state.boss.bloom = 2; state.boss.danger = 2; }
    else if (boss.id === 'nehelenia') {
      state.boss.dreamMirrorMarksMigrated = true;
      state.boss.dreamMirrorMarksByPlayer = { 0: 1, 1: 1 }; state.boss.danger = 2;
    } else state.boss.danger = 40;
    normalizeBossState(state);
    const before = { danger: state.boss.danger, bloom: state.boss.bloom, chains: { ...state.boss.chainsByPlayer } };
    resolveIntent(state);
    if (boss.id === 'dominadora') {
      for (const player of state.players) assert.ok(getBossChains(state, player.id) >= (before.chains[player.id] || 0), ability.id);
    } else {
      assert.ok(state.boss.danger >= before.danger, ability.id);
      if (boss.id === 'matriarca_esmeralda') assert.ok(state.boss.bloom >= before.bloom, ability.id);
    }
  });
}

for (const phase of [1, 2, 3]) {
  for (const [id, payload] of [
    ['bela_hunt', { targetPlayerId: 0, used: true }],
    ['crimson_brand', { marks: [{ status: 'success' }, { status: 'success' }] }],
    ...(phase >= 2 ? [['cassandra_feast', { fed: true, meldIndex: 0 }], ['daniela_swarm', { triggered: false }]] : []),
    ...(phase === 3 ? [['three_daughters', { objectives: ['bela', 'cassandra', 'daniela'].map(type => ({ type, status: 'success' })) }]] : []),
  ]) test(`${id} F${phase}: sucesso não reduz Sede, inclusive após reload`, () => {
    const state = JSON.parse(JSON.stringify(game(id, payload, phase)));
    const event = resolveIntent(state);
    assert.equal(event.dangerDelta, 0); assert.equal(state.boss.danger, 40);
    assert.equal(resolveIntent(state), null); assert.equal(state.boss.danger, 40);
  });
  test(`Marca Carmesim F${phase}: sucesso parcial não desconta falha`, () => {
    const state = game('crimson_brand', { marks: [{ status: 'success' }, { status: 'active' }] }, phase);
    assert.equal(resolveIntent(state).dangerDelta, phase === 3 ? 9 : 7);
  });
  test(`Caçada de Bela F${phase}: punição preservada`, () => {
    assert.equal(resolveIntent(game('bela_hunt', { used: false }, phase)).dangerDelta, phase === 3 ? 16 : 14);
  });
}
test('As Três Filhas: dois sucessos não descontam a falha restante', () => {
  const state = game('three_daughters', { objectives: [
    { type: 'bela', status: 'success' }, { type: 'cassandra', status: 'active' }, { type: 'daniela', status: 'active' },
  ] }, 3);
  assert.equal(resolveIntent(state).dangerDelta, 8); assert.equal(state.boss.danger, 48);
});
for (const phase of [2, 3]) {
  test(`Coágulo F${phase}: romper não reduz Sede nem altera dano excedente`, () => {
    const state = game('crimson_clot', { amount: phase === 3 ? 260 : 180 }, phase);
    resolveIntent(state);
    const damage = applyDamageToBoss(state, state.boss.crimsonClot.max + 10, { sourceActionId: 'break' });
    assert.equal(damage.bloodClotBroken, true); assert.equal(damage.hpDamage, 10);
    assert.equal(state.boss.danger, 40);
  });
  test(`Banquete F${phase}: punição preservada`, () => {
    assert.equal(resolveIntent(game('cassandra_feast', { fed: false }, phase)).dangerDelta, phase === 3 ? 18 : 16);
  });
}
test('Auditoria: snapshot antigo com recompensa negativa é ignorado', () => {
  const state = game('suit_audit', { required: 3, progress: 3, successDelta: -10, failureDelta: 12 }, 1, 'banker');
  const event = resolveIntent(state);
  assert.equal(event.dangerDelta, 0); assert.equal(state.boss.danger, 40);
  assert.equal(event.success, true);
  const status = bankerBossPresentation.status({ gameState: state, helpers: { flowResultEvent: () => event } });
  assert.equal(status.category, 'Objetivo concluído');
});
test('Vinho Carmesim preserva gasto próprio de Sede por cura', () => {
  const state = game('red_wine', { bloodCost: 15, healAmount: 200 }); state.boss.hp -= 300;
  const hp = state.boss.hp;
  assert.equal(resolveIntent(state).dangerDelta, -15);
  assert.equal(state.boss.danger, 25); assert.equal(state.boss.hp, hp + 200);
});
test('Canastras continuam aliviando Sede: Limpa, Real e Ás-a-Ás', () => {
  const state = game('bela_hunt', { used: true }); state.boss.currentIntent = null;
  for (const [oldKind, newKind] of [['simple', 'limpa'], ['limpa', 'real'], ['real', 'asas']]) {
    applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind, newKind, cardsAdded: [] });
  }
  assert.equal(state.boss.danger, 28);
});
test('HUD e ajuda das seis habilidades não prometem alívio por sucesso', () => {
  for (const id of ['bela_hunt', 'crimson_brand', 'cassandra_feast', 'daniela_swarm', 'crimson_clot', 'three_daughters']) {
    const state = game(id, { marks: [], objectives: [] }, 3);
    const text = JSON.stringify([buildBossAbilityHelp(state), buildBossActionPresentation(state)]);
    assert.doesNotMatch(text, /Sede -[2346]|sucesso reduz|reduz [2346] de Sede|Evitar -3/i, id);
  }
});

test('Matriarca: conter ameaças, inclusive Coroa, não remove Flores', () => {
  const state = game('living_seed', {}, 3, 'matriarca_esmeralda');
  state.boss.bloom = 3; state.boss.danger = 3;
  for (const type of ['living_seed', 'graft', 'discard_pollen']) {
    const threat = { id: `rule-${type}`, type, status: 'active' };
    state.boss.springCrown = { status: 'active', markedThreatId: threat.id };
    succeedNatureThreat(state, threat);
    assert.equal(threat.status, 'success');
    assert.equal(state.boss.bloom, 3); assert.equal(state.boss.danger, 3);
  }
});
test('Dominadora: cumprir Exposição não concede redução de Dominação', () => {
  const state = game('exposure', { targetPlayerId: 0, cardId: 'exposed' }, 1, 'dominadora');
  state.boss.chainsByPlayer = { 0: 1, 1: 1 };
  state.teams[0].melds = [[{ id: 'exposed', rank: '4', suit: '♠' }]];
  const before = state.boss.chainsByPlayer[0] + state.boss.chainsByPlayer[1];
  const event = resolveIntent(state);
  assert.equal(event.exposureSuccess, true);
  assert.ok(state.boss.chainsByPlayer[0] + state.boss.chainsByPlayer[1] >= before);
});
test('Nehelenia: libertar da Prisão não alivia Mundo do Espelho', () => {
  const state = game('mirror_prison', { fed: true, trappedPlayerId: 0, rescuerPlayerId: 1 }, 2, 'nehelenia');
  state.boss.danger = 1.6;
  state.boss.dreamMirrorMarksMigrated = true;
  state.boss.dreamMirrorMarksByPlayer = { 0: 0.8, 1: 0.8 };
  resolveIntent(state);
  assert.equal(state.boss.danger, 1.6);
});
test('Nemesis: cumprir objetivos não reduz Infecção nem repete evento no reload', () => {
  for (const [id, payload] of [
    ['stars_hunt', { contributed: true }],
    ['stars_extermination', { contributed: true, secondExited: true }],
    ['infectious_tentacle', { required: 2, exitedCardIds: ['a', 'b'] }],
    ['tentacle_barrage', { required: 2, exitedCardIds: ['a', 'b'] }],
  ]) {
    const state = game(id, { ...payload, targetPlayerId: 0, failure: 16 }, 3, 'nemesis');
    nemesisBossMechanics.onPlayerTurnEnd({ boss: state.boss, gameState: state, playerId: 0, recordBossEvent: () => {} });
    assert.equal(state.boss.currentIntent.payload.resolved, true, id);
    assert.equal(state.boss.danger, 40, id);
    const reloaded = JSON.parse(JSON.stringify(state));
    nemesisBossMechanics.onPlayerTurnEnd({ boss: reloaded.boss, gameState: reloaded, playerId: 0, recordBossEvent: () => {} });
    assert.equal(reloaded.boss.danger, 40, id);
  }
});
