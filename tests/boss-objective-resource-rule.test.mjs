import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createBossState, applyBossMeldTransition, completeBossPlayerTurn } from '../js/boss/boss-engine.js';
import { buildBossAbilityHelp, buildBossActionPresentation } from '../js/boss/boss-presentation.js';
import { nemesisBossMechanics } from '../js/boss/mechanics/nemesis.js';
import { bankerBossPresentation } from '../js/boss/presentation/banker.js';
import { buildBossDebugScenario, getBossDebugCatalog } from '../js/boss/boss-debug-scenarios.js';
import { selectNextBossIntent, normalizeBossState, getBossChains } from '../js/boss/boss-engine.js';
import { damageDaughter, bloodLinkRemaining } from '../js/boss/dimitrescu-castle.js';
import { createUndoTransaction, restoreUndoTransaction } from '../js/game/undo-transaction.js';

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

for (const phase of [1, 2, 3]) {
  const [medium, heavy, brand] = { 1: [3, 6, 5], 2: [4, 8, 7], 3: [6, 10, 9] }[phase];
  for (const deaths of [0, 1, 2, 3]) {
    const prepare = (id, payload) => {
      const state = game(id, payload, phase);
      state.boss.danger = 0;
      for (const d of state.boss.combatEntities.slice(0, deaths)) { d.hp = 0; d.status = 'dead'; }
      return state;
    };
    test(`Sede Lady F${phase}, ${deaths} mortes: Tributo/faixas, marcas, Fúria e HUD usam valores aprovados`, () => {
      for (const [cards, base] of [[7, 0], [8, medium], [10, medium], [11, heavy]]) {
        const state = prepare('blood_tithe', {});
        state.players[0].hand = Array.from({ length: cards }, (_, i) => ({ id: `c${i}` }));
        const expected = base ? base + deaths * 2 : 0;
        assert.match(buildBossActionPresentation(state).consequence, new RegExp(`\\+${expected} Sede`));
        assert.equal(resolveIntent(state).dangerDelta, expected);
      }
      const state = prepare('crimson_brand', { marks: [{ status: 'active' }, { status: 'active' }] });
      const expected = brand * 2 + deaths * 2;
      assert.match(buildBossAbilityHelp(state).text, new RegExp(`Cada carta não usada causa \\+${brand} Sede`));
      assert.match(buildBossActionPresentation(state).consequence, new RegExp(`\\+${expected} Sede`));
      assert.equal(resolveIntent(state).dangerDelta, expected, 'Fúria uma vez por resolução, não por marca');
      const success = prepare('crimson_brand', { marks: [{ status: 'success' }] });
      assert.equal(resolveIntent(success).dangerDelta, 0, 'sucesso não gera Fúria nem recuperação');
      const both = prepare('blood_tithe', {});
      both.players[0].hand = Array.from({ length: 8 }, (_, i) => ({ id: `a${i}` }));
      both.players[1].hand = Array.from({ length: 11 }, (_, i) => ({ id: `b${i}` }));
      assert.equal(resolveIntent(both).dangerDelta, medium + heavy + deaths * 2, 'Fúria uma vez, não por jogador');
    });
  }
}

for (const isBot of [false, true]) {
  for (const protection of [1500,40,0]) test(`Vínculo ${protection}: absorção/excedente e alvo Lady ${isBot?'BOT':'humano'}`,()=>{
    const state=game('blood_tithe',{});state.players[0].isBot=isBot;
    state.boss.combatTargetsByPlayer[0]='boss';state.boss.bloodLinkProtection=protection;
    const result=applyDamageToBoss(state,100,{playerId:0,sourceActionId:'direct'});
    assert.equal(result.bloodLinkAbsorbed,Math.min(protection,100));
    assert.equal(state.boss.hp,2000-Math.max(0,100-protection));
    assert.equal(state.boss.bloodLinkProtection,Math.max(0,protection-100));
    assert.deepEqual(state.boss.combatEntities.map(d=>d.hp),[450,450,450]);
  });
  test(`Coágulo -> Vínculo -> vida no mesmo golpe ${isBot?'BOT':'humano'}`,()=>{
    const state=game('blood_tithe',{});state.players[0].isBot=isBot;state.boss.combatTargetsByPlayer[0]='boss';
    state.boss.crimsonClot={status:'active',max:60,remaining:60};state.boss.bloodLinkProtection=30;
    const result=applyDamageToBoss(state,100,{playerId:0,sourceActionId:'three-layers'});
    assert.equal(result.bloodClotAbsorbed,60);assert.equal(result.bloodLinkAbsorbed,30);
    assert.equal(result.hpDamage,10);assert.equal(state.boss.hp,1990);assert.equal(state.boss.bloodLinkProtection,0);
    const daughter=state.boss.combatEntities[0];state.boss.combatTargetsByPlayer[0]=daughter.id;
    applyDamageToBoss(state,10,{playerId:0,sourceActionId:'daughter'});
    assert.equal(daughter.hp,440);assert.equal(state.boss.hp,1990);
  });
  for (const protection of [180, 60]) test(`Lady: Coágulo absorve antes da vida, ${isBot ? 'BOT' : 'humano'}, proteção ${protection}`, () => {
    const state = game('blood_tithe', {});
    state.players[0].isBot = isBot;
    state.boss.crimsonClot = { status: 'active', remaining: protection, max: protection };
    const result = applyDamageToBoss(state, 100, { playerId: 0, sourceActionId: 'shield-regression' });
    assert.equal(result.absorbed, 100);
    assert.equal(result.bloodClotAbsorbed, Math.min(protection, 100));
    assert.equal(state.boss.hp, 2000);
    assert.equal(state.boss.bloodLinkProtection,1500-Math.max(0,100-protection));
    assert.equal(state.boss.crimsonClot.remaining, Math.max(0, protection - 100));
    assert.deepEqual(state.boss.combatEntities.map(d => d.hp), [450, 450, 450]);
  });
  test(`Lady: Vínculo consumível, ${isBot ? 'BOT' : 'humano'} usa o mesmo pipeline`, () => {
    const state = game('blood_tithe', {}); state.players[0].isBot = isBot;
    const result = applyDamageToBoss(state, 100, { playerId: 0, sourceActionId: 'link-regression' });
    assert.equal(result.hpDamage, 0); assert.equal(state.boss.hp, 2000);assert.equal(state.boss.bloodLinkProtection,1400);
    assert.deepEqual(state.boss.combatEntities.map(d => d.hp), [450, 450, 450]);
  });
}

test('Proteção consumida: morte retira 500 restantes, sem cura, duplicação ou piso de vida',()=>{
  const state=game('blood_tithe',{});
  applyDamageToBoss(state,300,{playerId:0,sourceActionId:'consume'});
  assert.equal(bloodLinkRemaining(state.boss),1200);
  const d=state.boss.combatEntities[0];damageDaughter(state,d,500,'death',()=>{});
  assert.equal(state.boss.bloodLinkProtection,700);assert.equal(state.boss.hp,2000);
  damageDaughter(state,d,500,'death',()=>{});assert.equal(state.boss.bloodLinkProtection,700);
  damageDaughter(state,state.boss.combatEntities[1],500,'second',()=>{});
  assert.equal(state.boss.bloodLinkProtection,200);
  damageDaughter(state,state.boss.combatEntities[2],500,'third',()=>{});
  assert.equal(state.boss.bloodLinkProtection,0);assert.equal(state.boss.hp,2000);
});

test('Vínculo: migração única, cap por filhas e snapshot/reload/undo preservam consumo e zero',()=>{
  const state=game('blood_tithe',{});delete state.boss.bloodLinkProtection;
  normalizeBossState(state);assert.equal(state.boss.bloodLinkProtection,1500);
  const undo=createUndoTransaction(state);
  applyDamageToBoss(state,1500,{playerId:0,sourceActionId:'exhaust'});
  assert.equal(state.boss.bloodLinkProtection,0);assert.equal(state.boss.hp,2000);
  const loaded=JSON.parse(JSON.stringify(state));normalizeBossState(loaded);normalizeBossState(loaded);
  assert.equal(loaded.boss.bloodLinkProtection,0);
  applyDamageToBoss(loaded,1900,{playerId:0,sourceActionId:'exposed'});
  assert.equal(loaded.boss.hp,100,'vida exposta mesmo com três filhas vivas');
  const restored=restoreUndoTransaction(undo).state;normalizeBossState(restored);
  assert.equal(restored.boss.bloodLinkProtection,1500);assert.equal(restored.boss.hp,2000);
  restored.boss.combatEntities[0].hp=0;restored.boss.combatEntities[0].status='dead';
  delete restored.boss.bloodLinkProtection;normalizeBossState(restored);
  assert.equal(restored.boss.bloodLinkProtection,1000);
  restored.boss.bloodLinkProtection=9999;normalizeBossState(restored);assert.equal(restored.boss.bloodLinkProtection,1000);
});

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
    ...(phase === 3 ? [['three_daughters', { passiveVersion:2 }]] : []),
  ]) test(`${id} F${phase}: sucesso não reduz Sede, inclusive após reload`, () => {
    const state = JSON.parse(JSON.stringify(game(id, payload, phase)));
    const event = resolveIntent(state);
    assert.equal(event.dangerDelta, 0); assert.equal(state.boss.danger, 40);
    assert.equal(resolveIntent(state), null); assert.equal(state.boss.danger, 40);
  });
  test(`Marca Carmesim F${phase}: sucesso parcial não desconta falha`, () => {
    const state = game('crimson_brand', { marks: [{ status: 'success' }, { status: 'active' }] }, phase);
    assert.equal(resolveIntent(state).dangerDelta, { 1: 5, 2: 7, 3: 9 }[phase]);
  });
  test(`Caçada de Bela F${phase}: punição preservada`, () => {
    assert.equal(resolveIntent(game('bela_hunt', { used: false }, phase)).dangerDelta, phase === 3 ? 16 : 14);
  });
}
test('As Três Filhas: dois sucessos não descontam a falha restante', () => {
  const state = game('three_daughters', { passiveVersion:2 }, 3);
  state.boss.combatEntities.forEach(d=>d.passive={round:1,status:d.id==='cassandra'?'active':'success'});
  completeBossPlayerTurn(state,0);completeBossPlayerTurn(state,1);
  assert.equal(state.boss.danger,43,'two successes never reduce the standard +3 failure');
});
for (const phase of [2, 3]) {
  test(`Coágulo F${phase}: romper não reduz Sede nem altera dano excedente`, () => {
    const state = game('crimson_clot', { amount: phase === 3 ? 260 : 180 }, phase);
    resolveIntent(state);
    const damage = applyDamageToBoss(state, state.boss.crimsonClot.max + 10, { sourceActionId: 'break' });
    assert.equal(damage.bloodClotBroken, true); assert.equal(damage.hpDamage, 0);
    assert.equal(damage.bloodLinkAbsorbed,10);assert.equal(state.boss.bloodLinkProtection,1490);
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
