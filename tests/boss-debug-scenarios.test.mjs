import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  bossDebugScenarioRegistry,
  applyBossDebugBotOutcome,
  buildBossDebugScenario,
  canContinueBossDebugScenario,
  compareBossDebugExpectations,
  completeBossDebugBotOutcome,
  createBossDebugSnapshot,
  executeBossDebugScenarioVariant,
  getBossDebugCatalog,
  restoreBossDebugSnapshot,
  runBossDebugSweep,
  simulateBossDebugReload,
  validateBossDebugScenario,
} from '../js/boss/boss-debug-scenarios.js';
import { advanceBossTurn, beginBossTurn, selectNextBossIntent } from '../js/boss/boss-engine.js';
import { listBossDefinitions } from '../js/boss/boss-registry.js';

const [appSource, htmlSource, bossCssSource] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../styles/boss-mode.css', import.meta.url), 'utf8'),
]);

function build(bossId = 'banker', abilityId = 'fixed_interest', overrides = {}) {
  return buildBossDebugScenario(null, {
    bossId,
    abilityId,
    phase: 'auto',
    variant: 'interactive',
    target: 'auto',
    ...overrides,
  });
}

test('catalogo do laboratorio nasce do registro oficial e cobre as 31 habilidades ativas', () => {
  const definitions = listBossDefinitions();
  const catalog = getBossDebugCatalog();
  assert.deepEqual(catalog.map((boss) => boss.id), definitions.map((boss) => boss.id));
  assert.equal(catalog.reduce((total, boss) => total + boss.abilities.length, 0), 31);
  assert.equal(Object.keys(bossDebugScenarioRegistry).length, 31);
  for (const definition of definitions) {
    for (const ability of definition.abilities) {
      const scenario = bossDebugScenarioRegistry[`${definition.id}:${ability.id}`];
      assert.ok(scenario, `${definition.id}:${ability.id} sem cenario`);
      assert.ok(scenario.variants.some((variant) => variant.id === 'interactive'));
      assert.equal(typeof scenario.build, 'function');
    }
  }
  assert.ok(catalog.every((boss) => boss.abilities.every((ability) => ability.id !== 'hierarchy' && ability.name !== 'Hierarquia')));
});

test('painel existe no DevTools atual e o modulo so e importado dentro do modo debug', () => {
  for (const id of ['debugBossLab', 'debugBossLabBoss', 'debugBossLabPhase', 'debugBossLabAbility', 'debugBossLabVariant', 'debugBossLabTarget', 'debugBossLabPrepare', 'debugBossLabBotSuccess', 'debugBossLabBotFailure']) {
    assert.match(htmlSource, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(htmlSource, />Executar sucesso</);
  assert.doesNotMatch(htmlSource, />Executar falha</);
  assert.doesNotMatch(htmlSource, />Simular reload</);
  const debugBlock = appSource.slice(appSource.indexOf('if (isDebugMode) {'), appSource.indexOf('window.debugDraw5'));
  assert.match(debugBlock, /import\('\.\/js\/boss\/boss-debug-scenarios\.js'\)/);
  assert.match(appSource, /pauseAutomation/);
  assert.match(appSource, /isBossLabAutomationPaused/);
  assert.match(htmlSource, /class="boss-spring-crown"/);
  assert.match(bossCssSource, /boss-spring-crown-buffed[\s\S]*?boss-spring-crown/);
});

test('Ordem Final pode criar as duas escolhas pelo Laboratorio', () => {
  const prepared = build('dominadora', 'final_order', { variant: 'success' });
  beginBossTurn(prepared.state, { first: true, now: 1000, debug: true });
  while (prepared.state.boss.bossFlow?.stage !== 'players') {
    const flow = prepared.state.boss.bossFlow;
    advanceBossTurn(prepared.state, Math.max(1001, Number(flow?.endsAt || 0) + 1));
  }

  const result = executeBossDebugScenarioVariant(prepared.state);

  assert.equal(result.executed, true);
  assert.deepEqual(result.choiceTypes, ['final_order_draw', 'final_order_lock']);
  assert.deepEqual(prepared.state.boss.pendingChoices.map((choice) => choice.playerId), [0, 1]);
});

test('fase automatica usa a primeira fase elegivel e fase incompativel e rejeitada', () => {
  assert.equal(build('banker', 'suit_audit').phase, 2);
  assert.equal(build('dominadora', 'double_collar').phase, 3);
  assert.throws(
    () => build('banker', 'suit_audit', { phase: 1 }),
    /nao e elegivel na Fase 1/,
  );
});

test('cenarios usam 108 cartas oficiais com IDs unicos e jogos validos', () => {
  for (const definition of listBossDefinitions()) {
    const ability = definition.abilities[0];
    const prepared = build(definition.id, ability.id);
    const validation = validateBossDebugScenario(prepared.state, {
      bossId: definition.id,
      abilityId: ability.id,
      phase: prepared.phase,
    });
    assert.equal(validation.valid, true, validation.errors.join(' '));
    assert.equal(validation.totalCards, 108);
    assert.equal(validation.uniqueCardIds, 108);
    assert.deepEqual(validation.duplicates, []);
    assert.equal(prepared.state.variant, 'fechado');
  }
});

test('Laboratorio fornece alvos reais sem reorganizar as maos preparadas', () => {
  const seed = build('matriarca_esmeralda', 'living_seed', { target: 'human' });
  const handOrder = seed.state.players.map((player) => player.hand.map((card) => card.id));
  const seedIntent = selectNextBossIntent(seed.state, { debug: true });
  const seedTarget = seed.state.players.find((player) => player.id === seedIntent.payload.targetPlayerId);
  assert.ok(seedTarget?.hand.some((card) => card.id === seedIntent.payload.cardId));
  assert.deepEqual(seed.state.players.map((player) => player.hand.map((card) => card.id)), handOrder);

  const pledge = build('banker', 'pledge');
  const pledgeIntent = selectNextBossIntent(pledge.state, { debug: true });
  assert.ok(pledge.state.teams[0].melds[pledgeIntent.payload.meldIndex]?.length > 0);

  const surcharge = build('banker', 'discard_surcharge');
  selectNextBossIntent(surcharge.state, { debug: true });
  assert.ok(surcharge.state.discard.at(-1)?.id);

  const pollen = build('matriarca_esmeralda', 'discard_pollen');
  assert.equal(pollen.state.boss.maxHp - pollen.state.boss.hp, 100);
  assert.equal(pollen.state.boss.natureHealingThisRound, 0);
});

test('marcadores contextuais distinguem lixo, jogo, carta e jogador afetados', () => {
  for (const marker of ['boss-surcharge-discard', 'boss-pollen-discard', 'boss-player-targeted', 'boss-card-nature-seed', 'rooted-by-matriarch', 'locked-by-boss']) {
    assert.match(appSource, new RegExp(marker));
  }
  assert.match(bossCssSource, /boss-surcharge-discard/);
  assert.match(bossCssSource, /boss-player-targeted/);
});

test('mesmo cenario produz alvo e payload deterministas', () => {
  const first = build('dominadora', 'collar', { target: 'human' });
  const second = build('dominadora', 'collar', { target: 'human' });
  assert.equal(first.state.boss.seed, second.state.boss.seed);
  assert.deepEqual(first.expectedIntent, second.expectedIntent);
});

test('habilidade debug forçada passa pela elegibilidade e e consumida uma unica vez', () => {
  const prepared = build('banker', 'maintenance_fee', { phase: 3 });
  const first = selectNextBossIntent(prepared.state, { debug: true });
  assert.equal(first.abilityId, 'maintenance_fee');
  assert.equal(first.selectionSource, 'debug_forced');
  assert.equal(prepared.state.boss.debugForcedAbilityId, undefined);

  prepared.state.boss.currentIntent = null;
  const second = selectNextBossIntent(prepared.state, { debug: true });
  assert.ok(second);
  assert.notEqual(second.selectionSource, 'debug_forced');
});

test('modo normal ignora a fila debug e habilidade inelegivel falha claramente', () => {
  const normal = build('banker', 'fixed_interest');
  const normalIntent = selectNextBossIntent(normal.state);
  assert.ok(normalIntent);
  assert.notEqual(normalIntent.selectionSource, 'debug_forced');

  const invalid = build('dominadora', 'collar');
  invalid.state.players.forEach((player) => { player.hand = []; });
  assert.throws(() => selectNextBossIntent(invalid.state, { debug: true }), /nao encontrou um alvo legal/);
  assert.equal(invalid.state.boss.debugForcedAbilityId, undefined);
});

test('reload preserva cenario, intencao e IDs sem duplicacao', () => {
  const prepared = build('matriarca_esmeralda', 'living_seed');
  const intent = selectNextBossIntent(prepared.state, { debug: true });
  const restored = simulateBossDebugReload(prepared.state);
  assert.equal(restored.boss.currentIntent.abilityId, intent.abilityId);
  assert.deepEqual(restored.boss.currentIntent.payload, intent.payload);
  const validation = validateBossDebugScenario(restored);
  assert.equal(validation.totalCards, 108);
  assert.equal(validation.uniqueCardIds, 108);
  assert.deepEqual(validation.duplicates, []);
});

test('snapshot de reset e ciclo de Voltar preservam o estado sem timers ou cartas extras', () => {
  const prepared = build('dominadora', 'forced_swap');
  const snapshot = createBossDebugSnapshot(prepared.state);
  prepared.state.stock.pop();
  prepared.state.boss.danger = 3;
  const restored = restoreBossDebugSnapshot(snapshot);
  const validation = validateBossDebugScenario(restored, { bossId: 'dominadora', abilityId: 'forced_swap', phase: 2 });
  assert.equal(validation.valid, true, validation.errors.join(' '));
  assert.equal(restored.debugScenario.pauseAutomation, true);
  assert.equal('timerId' in restored.debugScenario, false);
  assert.equal(restored.boss.danger, 0);
});

test('varredura prepara todas as habilidades e denuncia qualquer lacuna', () => {
  const report = runBossDebugSweep();
  assert.equal(report.total, 31);
  assert.equal(report.passed, 31);
  assert.deepEqual(report.failed, []);
  assert.equal(report.results.every((entry) => entry.ok), true);
});

test('variantes do laboratorio executam estados e consequencias realmente distintas', () => {
  const interactive = build('matriarca_esmeralda', 'living_seed', { variant: 'interactive' });
  const success = build('matriarca_esmeralda', 'living_seed', { variant: 'success' });
  const failure = build('matriarca_esmeralda', 'living_seed', { variant: 'failure' });
  const cancelled = build('matriarca_esmeralda', 'living_seed', { variant: 'external_cancel' });

  assert.equal(interactive.state.hasDrawnThisTurn, false);
  assert.equal(success.state.hasDrawnThisTurn, true);
  assert.deepEqual(failure.state.boss.playersActedThisRound, [1]);

  assert.equal(executeBossDebugScenarioVariant(success.state).action, 'marked_card_played');
  assert.equal(success.state.boss.natureThreats.at(-1)?.status, 'success');
  assert.equal(executeBossDebugScenarioVariant(failure.state).action, 'deadline_advanced');
  assert.equal(failure.state.boss.natureThreats.at(-1)?.status, 'failed');
  assert.equal(executeBossDebugScenarioVariant(cancelled.state).action, 'target_card_removed');
  assert.equal(cancelled.state.boss.natureThreats.at(-1)?.status, 'cancelled');
});

test('variante sem alvo rejeita a habilidade solicitada e escolhe fallback legal', () => {
  const prepared = build('dominadora', 'collar', { variant: 'no_target' });
  selectNextBossIntent(prepared.state, { debug: true });
  const result = executeBossDebugScenarioVariant(prepared.state);
  assert.equal(result.action, 'fallback_selected');
  assert.equal(result.requestedAbilityId, 'collar');
  assert.ok(result.selectedAbilityId);
  assert.notEqual(result.selectedAbilityId, 'collar');
});

test('relatorio do laboratorio acusa consequencia observada incorreta', () => {
  const prepared = build('matriarca_esmeralda', 'living_seed', { variant: 'failure' });
  const before = restoreBossDebugSnapshot(createBossDebugSnapshot(prepared.state));
  executeBossDebugScenarioVariant(prepared.state);
  const comparison = compareBossDebugExpectations(before, prepared.state, {
    bloomDelta: 99,
    threatStatus: 'cancelled',
  });
  assert.equal(comparison.ok, false);
  assert.equal(comparison.checks.find((entry) => entry.label === 'Flores')?.ok, false);
  assert.equal(comparison.checks.find((entry) => entry.label === 'Ameaca')?.ok, false);
});

test('laboratorio usa o bot real e limpa seu unico timer ao fechar ou resetar', () => {
  assert.match(appSource, /async function executeBossLabBotAction[\s\S]*?BuracoBot\.playTurn/);
  assert.match(appSource, /executeBossLabBotAction\(outcome\)[\s\S]*?if \(!module\.canContinueBossDebugScenario\(state, activeConfig\) && !\(await prepareBossLab\(overrides\)\)\) return;/);
  assert.match(appSource, /advanceBossLabPresentationToPlayers/);
  assert.match(appSource, /createBotEngineForSession\(sessionId, signal, \{ delayScale: 0\.12, bossLabOutcome: outcome \}\)/);
  assert.match(appSource, /applyBossDebugBotOutcome\(state, outcome, botPlayer\.id\)/);
  assert.match(appSource, /completeBossDebugBotOutcome\(state, outcome, botPlayer\.id, preparedResult\)/);
  assert.match(appSource, /completedBotTurnsAfter > completedBotTurnsBefore/);
  assert.match(appSource, /shouldForceStockDraw/);
  assert.match(appSource, /shouldSkipMelds/);
  assert.match(appSource, /let bossDebugLabReportTimerId = null/);
  assert.match(appSource, /let renderedBossFeedbackEventIds = null/);
  assert.match(appSource, /renderedBossFeedbackEventIds\.has\(event\.actionId\)/);
  assert.match(appSource, /function stopBossLabReportTimer\(\)[\s\S]*?clearInterval\(bossDebugLabReportTimerId\)/);
  assert.match(appSource, /resetBossLabScenario\(\)[\s\S]*?stopBossLabReportTimer\(\)/);
  assert.match(appSource, /debugBossLab[^\n]*addEventListener\('toggle'[\s\S]*?stopBossLabReportTimer\(\)/);
});

test('botoes do bot continuam o cenario preparado sem recriar o turno do jogador', () => {
  const prepared = build('matriarca_esmeralda', 'royal_bloom', { phase: 3 });
  prepared.state.boss.playersActedThisRound = [prepared.state.players[0].id];
  prepared.state.currentPlayer = 1;
  prepared.state.turnNumber = 1;

  assert.equal(canContinueBossDebugScenario(prepared.state, {
    bossId: 'matriarca_esmeralda',
    abilityId: 'royal_bloom',
  }), true);
  assert.deepEqual(prepared.state.boss.playersActedThisRound, [prepared.state.players[0].id]);
  assert.equal(canContinueBossDebugScenario(prepared.state, {
    bossId: 'matriarca_esmeralda',
    abilityId: 'graft',
  }), false);
  prepared.state.debugScenario.executionCount = 1;
  assert.equal(canContinueBossDebugScenario(prepared.state, {
    bossId: 'matriarca_esmeralda',
    abilityId: 'royal_bloom',
  }), false);
});

test('Laboratorio resolve resultados distintos para sucesso e falha do bot', () => {
  const success = build('matriarca_esmeralda', 'living_seed', { variant: 'success', target: 'bot' });
  beginBossTurn(success.state, { first: true, now: 1000, debug: true });
  const successPrepared = applyBossDebugBotOutcome(success.state, 'success', 1);
  assert.equal(successPrepared.executed, true);
  assert.equal(successPrepared.action, 'bot_success_policy_active');
  const successResult = completeBossDebugBotOutcome(success.state, 'success', 1, successPrepared);
  assert.equal(successResult.action, 'bot_success_completed');

  const failure = build('matriarca_esmeralda', 'living_seed', { variant: 'failure', target: 'bot' });
  beginBossTurn(failure.state, { first: true, now: 1000, debug: true });
  const failurePrepared = applyBossDebugBotOutcome(failure.state, 'failure', 1);
  assert.equal(failurePrepared.action, 'bot_failure_policy_active');
  const failureResult = completeBossDebugBotOutcome(failure.state, 'failure', 1, failurePrepared);
  assert.equal(failureResult.action, 'bot_failure_completed');
});

test('Laboratorio da Coroa resolve especificamente a ameaca marcada', () => {
  const success = build('matriarca_esmeralda', 'spring_crown', { phase: 3, variant: 'success' });
  beginBossTurn(success.state, { first: true, now: 1000, debug: true });
  const successPrepared = applyBossDebugBotOutcome(success.state, 'success', 1);
  assert.equal(successPrepared.action, 'spring_crown_mark_succeeded');
  const successResult = completeBossDebugBotOutcome(success.state, 'success', 1, successPrepared);
  assert.equal(successResult.executed, true);
  assert.equal(success.state.boss.springCrown.status, 'completed');
  assert.equal(success.state.boss.pendingRootPropagation, null);

  const failure = build('matriarca_esmeralda', 'spring_crown', { phase: 3, variant: 'failure' });
  beginBossTurn(failure.state, { first: true, now: 1000, debug: true });
  const failurePrepared = applyBossDebugBotOutcome(failure.state, 'failure', 1);
  assert.equal(failurePrepared.action, 'spring_crown_mark_failed');
  const failureResult = completeBossDebugBotOutcome(failure.state, 'failure', 1, failurePrepared);
  assert.equal(failureResult.executed, true);
  assert.ok(failure.state.boss.natureThreats.some((threat) => threat.propagated && threat.strengthened));
  assert.match(
    failure.state.boss.eventLog.find((event) => event.actionId === failureResult.resultActionId)?.outcome || '',
    /Raiz Fortalecida/i,
  );
});


test('BOT do Laboratorio congela o painel no resultado da habilidade selecionada', () => {
  const prepared = build('matriarca_esmeralda', 'living_seed', { variant: 'failure', target: 'bot' });
  beginBossTurn(prepared.state, { first: true, now: 1000, debug: true });
  const preparedResult = applyBossDebugBotOutcome(prepared.state, 'failure', 1);
  const result = completeBossDebugBotOutcome(prepared.state, 'failure', 1, preparedResult);

  assert.equal(result.executed, true);
  assert.equal(prepared.state.boss.bossFlow.stage, 'result');
  assert.deepEqual(prepared.state.boss.bossFlow.queue, []);
  assert.equal(prepared.state.boss.bossFlow.eventActionId, result.resultActionId);
  assert.equal(prepared.state.debugScenario.heldResultActionId, result.resultActionId);
  assert.equal(prepared.state.boss.currentIntent, null);

  const heldEvent = prepared.state.boss.eventLog.find((event) => event.actionId === result.resultActionId);
  const heldThreat = prepared.state.boss.natureThreats.find((threat) => threat.id === heldEvent?.threatId);
  assert.equal(heldThreat?.sourceAbilityId, 'living_seed');
});

test('Laboratorio encerra Florescimento Real mesmo com marcadores de turno ja sincronizados', () => {
  const prepared = build('matriarca_esmeralda', 'royal_bloom', { phase: 3, variant: 'success' });
  beginBossTurn(prepared.state, { first: true, now: 1000, debug: true });
  let guard = 0;
  while (prepared.state.boss.bossFlow?.stage !== 'players' && guard < 20) {
    advanceBossTurn(prepared.state, Number(prepared.state.boss.bossFlow?.endsAt || 0) + 1);
    guard += 1;
  }

  const startingRound = prepared.state.boss.roundNumber;
  prepared.state.boss.playersActedThisRound = prepared.state.players.map((player) => player.id);
  prepared.state.boss.resolvedTurnIds = prepared.state.players.map(
    (player) => `turn_${prepared.state.turnNumber}_${player.id}`,
  );

  completeBossDebugBotOutcome(prepared.state, 'success', 1, { action: 'bot_success_policy_active' });

  assert.equal(prepared.state.boss.roundNumber, startingRound + 1);
  assert.equal(prepared.state.boss.playersActedThisRound.length, 0);
  assert.equal(
    prepared.state.boss.natureThreats.find((threat) => threat.type === 'royal_pollen')?.status,
    'cancelled',
  );
});

test('Enxerto usa SVG absoluto com especificidade maior que os filhos do gameSection', () => {
  assert.match(
    bossCssSource,
    /body\.boss-mode #gameSection > svg\.boss-graft-links \{[\s\S]*?position: absolute;[\s\S]*?flex: none;[\s\S]*?pointer-events: none;/,
  );
  assert.match(bossCssSource, /\.boss-mode \.boss-graft-links path \{[\s\S]*?fill: none;[\s\S]*?stroke:/);
});


test('Interdito permanece desativado no registro e no Laboratorio', () => {
  const dominadora = getBossDebugCatalog().find((boss) => boss.id === 'dominadora');
  assert.ok(dominadora);
  assert.equal(dominadora.abilities.some((ability) => ability.id === 'interdict'), false);
  assert.equal(Boolean(bossDebugScenarioRegistry['dominadora:interdict']), false);
});
