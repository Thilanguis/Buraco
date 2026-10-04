import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { dominatrixDefinition } from '../js/boss/bosses/dominatrix.js';
import { dominatrixBossMechanics } from '../js/boss/mechanics/dominatrix.js';

const engineSource = fs.readFileSync(new URL('../js/boss/boss-engine.js', import.meta.url), 'utf8');

test('F3 preserva ~55–65% do peso como pressão de Dominação', () => {
  const phase3 = dominatrixDefinition.abilities.filter((a) => a.phases.includes(3));
  const pressure = new Set(['forced_choice', 'exposure', 'iron_etiquette', 'favorite', 'absolute_control', 'break_will', 'final_order']);
  const total = phase3.reduce((sum, a) => sum + a.weight, 0);
  const pressureWeight = phase3.filter((a) => pressure.has(a.id)).reduce((sum, a) => sum + a.weight, 0);
  const ratio = pressureWeight / total;
  assert.ok(ratio >= 0.55 && ratio <= 0.65, `pressão F3 fora da faixa: ${ratio}`);
});

test('valores de pressão escalam por fase e o guia mantém texto curto', () => {
  assert.match(engineSource, /1:\s*Object\.freeze\(\{ direct: 6, obey: 2, fail: 12 \}\)/);
  assert.match(engineSource, /2:\s*Object\.freeze\(\{ direct: 7, obey: 3, fail: 14 \}\)/);
  assert.match(engineSource, /3:\s*Object\.freeze\(\{ direct: 8, obey: 3, fail: 16 \}\)/);
  assert.match(engineSource, /final_order:\s*Object\.freeze\(\{ direct: 7, accept: 2, miss: 6 \}\)/);

  for (const ability of dominatrixDefinition.abilities) {
    const copy = ability.describe({ phase: 3 });
    assert.ok(copy.length <= 90, `${ability.id}: texto do guia longo demais (${copy.length})`);
  }
  assert.match(dominatrixDefinition.abilities.find((a) => a.id === 'final_order').describe({ phase: 3 }), /às cegas/);
});


test('Escolha Forçada mantém risco esperado próximo da opção segura em cada fase', () => {
  const cases = [
    { phase: 1, success: 0.70, direct: 6, obey: 2, fail: 12 },
    { phase: 2, success: 0.70, direct: 7, obey: 3, fail: 14 },
    { phase: 3, success: 0.70, direct: 8, obey: 3, fail: 16 },
  ];
  for (const c of cases) {
    const expectedOrder = c.obey + (1 - c.success) * c.fail;
    assert.ok(Math.abs(c.direct - expectedOrder) <= 1.6, `F${c.phase}: escolha ficou óbvia (${c.direct} vs ${expectedOrder})`);
  }
});

test('Mãos Atadas compromete cada jogador ao primeiro jogo tocado', () => {
  const boss = { currentIntent: { abilityId: 'hands_tied', payload: { teamMeldAvailable: true, playerMeldIds: {} } }, possessions: [] };
  dominatrixBossMechanics.onMeldTransition({
    boss,
    gameState: { players: [{ id: 0 }, { id: 1 }] },
    playerId: 0,
    teamId: 0,
    meldId: 'meld-A',
    meldIndex: 0,
    cardsAdded: [{ id: 'c1' }],
    isNewMeld: false,
  });
  assert.equal(boss.currentIntent.payload.playerMeldIds[0], 'meld-A');
  assert.equal(boss.currentIntent.payload.teamMeldAvailable, true);

  dominatrixBossMechanics.onMeldTransition({
    boss,
    gameState: { players: [{ id: 0 }, { id: 1 }] },
    playerId: 1,
    teamId: 0,
    meldId: 'meld-B',
    meldIndex: 1,
    cardsAdded: [{ id: 'c2' }],
    isNewMeld: true,
  });
  assert.equal(boss.currentIntent.payload.playerMeldIds[1], 'meld-B');
  assert.equal(boss.currentIntent.payload.teamMeldAvailable, false);
});

test('Real direta continua removendo 8 pontos de Dominação', () => {
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
  assert.equal(delta, -0.64);
});

test('Ordem Final não escolhe nem revela cartas antes do aceite', () => {
  const builder = engineSource.slice(
    engineSource.indexOf('function buildFinalOrderTargets'),
    engineSource.indexOf('function legalDiscardCards'),
  );
  assert.ok(!builder.includes('cardIds:'), 'cartas ainda são pré-selecionadas antes da escolha');

  const resolution = engineSource.slice(
    engineSource.indexOf("option === 'obey' && choice.type === 'final_order'"),
    engineSource.indexOf("option === 'lock_card'"),
  );
  assert.match(resolution, /dominatrixPlayableCards\(gameState, player\)/);
  assert.match(resolution, /chooseCards\(/);
  assert.ok(!resolution.includes('choice.cardIds'), 'resolução ainda espia cartas guardadas na escolha');
});

test('motor remove ordem no_new_meld do pool e exige cura relevante para Quebra de Vontade', () => {
  const orderBody = engineSource.slice(engineSource.indexOf('function buildDominatrixOrder'), engineSource.indexOf('function eligibleExposureCards'));
  assert.ok(!orderBody.includes("type: 'no_new_meld'"), 'no_new_meld ainda é gerada');
  assert.match(engineSource, /minMeaningfulHeal:\s*120/);
  assert.match(engineSource, /final_order:\s*Object\.freeze\(\{ direct: 7, accept: 2, miss: 6 \}\)/);
  assert.match(engineSource, /function chooseDominatrixFavoriteTargets/);
  assert.match(engineSource, /function chooseDominatrixBreakWillTarget/);
});
