import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  bossDebugScenarioRegistry,
  adjustBossDebugResource,
  applyBossDebugBotOutcome,
  buildBossDebugScenario,
  canContinueBossDebugScenario,
  compareBossDebugExpectations,
  completeBossDebugBotOutcome,
  createBossDebugSnapshot,
  executeBossDebugScenarioVariant,
  getBossDebugCatalog,
  getBossDebugResourceState,
  restoreBossDebugSnapshot,
  runBossDebugSweep,
  simulateBossDebugReload,
  validateBossDebugScenario,
} from '../js/boss/boss-debug-scenarios.js';
import { advanceBossTurn, beginBossTurn, inspectBossAbilityEligibility, resolveBossChoice, selectNextBossIntent } from '../js/boss/boss-engine.js';
import { listBossDefinitions } from '../js/boss/boss-registry.js';

const [appSource, htmlSource, bossCssSource] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  Promise.all(['boss-mode', 'boss/matriarch', 'boss/dominatrix'].map(name => readFile(new URL(`../styles/${name}.css`, import.meta.url), 'utf8'))).then(parts => parts.join('\n')),
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

test('catalogo do laboratorio nasce do registro oficial e cobre todas as habilidades ativas', () => {
  const definitions = listBossDefinitions();
  const catalog = getBossDebugCatalog();
  const abilityCount = definitions.reduce((total, boss) => total + boss.abilities.length, 0);
  assert.deepEqual(catalog.map((boss) => boss.id), definitions.map((boss) => boss.id));
  assert.equal(catalog.reduce((total, boss) => total + boss.abilities.length, 0), abilityCount);
  assert.equal(Object.keys(bossDebugScenarioRegistry).length, abilityCount);
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
  for (const id of ['debugBossLab', 'debugBossLabBoss', 'debugBossLabPhase', 'debugBossLabAbility', 'debugBossLabVariant', 'debugBossLabTarget', 'debugBossLabPrepare', 'debugBossLabBotSuccess', 'debugBossLabBotFailure', 'debugBossLabResourceValue', 'debugBossLabResourcePlus', 'debugBossLabResourceMinus', 'debugBossLabResourceNear', 'debugBossLabResourceZero']) {
    assert.match(htmlSource, new RegExp(`id="${id}"`));
  }
  assert.match(htmlSource, /Fase da habilidade/);
  assert.doesNotMatch(htmlSource, /Iniciar Lady Dimitrescu/);
  assert.doesNotMatch(htmlSource, /Iniciar Rainha Nehelenia/);
  assert.doesNotMatch(htmlSource, /Testar todas as habilidades/);
  assert.doesNotMatch(htmlSource, /Executar cancelamento externo/);
  assert.doesNotMatch(htmlSource, />Executar sucesso</);
  assert.doesNotMatch(htmlSource, />Executar falha</);
  assert.doesNotMatch(htmlSource, />Simular reload</);
  const debugBlock = appSource.slice(appSource.indexOf('if (isDebugMode) {'), appSource.indexOf('window.debugDraw5'));
  assert.match(debugBlock, /import\('\.\/js\/boss\/boss-debug-scenarios\.js(?:\?lab=[^']+)?'\)/);
  assert.match(appSource, /pauseAutomation/);
  assert.match(appSource, /isBossLabAutomationPaused/);
  assert.match(htmlSource, /class="boss-spring-crown"/);
  assert.match(bossCssSource, /boss-spring-crown-buffed[\s\S]*?boss-spring-crown/);
});


test('controle de recurso do laboratorio avanca os cinco chefes sem disparar derrota artificial', () => {
  const banker = build('banker', 'fixed_interest').state;
  adjustBossDebugResource(banker, { bossId: 'banker', action: 'zero' });
  adjustBossDebugResource(banker, { bossId: 'banker', action: 'increase' });
  assert.equal(banker.boss.danger, 10);
  assert.match(getBossDebugResourceState(banker, { bossId: 'banker' }).label, /Dívida 10\/100/);

  const dominatrix = build('dominadora', 'forced_choice').state;
  adjustBossDebugResource(dominatrix, { bossId: 'dominadora', action: 'near', target: 'human' });
  assert.equal(dominatrix.boss.chainsByPlayer[0], 3.6);
  assert.match(getBossDebugResourceState(dominatrix, { bossId: 'dominadora', target: 'human' }).label, /45\/50/);

  const matriarch = build('matriarca_esmeralda', 'living_seed').state;
  adjustBossDebugResource(matriarch, { bossId: 'matriarca_esmeralda', action: 'near' });
  assert.equal(matriarch.boss.bloom, 4);
  assert.equal(matriarch.boss.danger, 4);

  const dimitrescu = build('dimitrescu', 'crimson_brand').state;
  adjustBossDebugResource(dimitrescu, { bossId: 'dimitrescu', action: 'near' });
  assert.equal(dimitrescu.boss.danger, 90);

  const nehelenia = build('nehelenia', 'mirrored_meld').state;
  adjustBossDebugResource(nehelenia, { bossId: 'nehelenia', action: 'near' });
  assert.equal(nehelenia.boss.danger, 4.5);
  assert.match(getBossDebugResourceState(nehelenia, { bossId: 'nehelenia' }).label, /90\/100/);
});

test('Quebra de Vontade do Laboratorio prepara Dominação e HP faltante suficientes', () => {
  const prepared = build('dominadora', 'break_will', { variant: 'interactive' });
  assert.equal(prepared.invariants.valid, true);
  assert.ok(prepared.state.players.some((player) => Number(prepared.state.boss.chainsByPlayer?.[player.id] || 0) >= 2));
  assert.ok(Number(prepared.state.boss.maxHp) - Number(prepared.state.boss.hp) >= 120);
  assert.equal(prepared.invariants.eligibility?.eligible, true);
});

test('Ordem Final interativa prepara duas extensoes naturais por cooperador', () => {
  const prepared = build('dominadora', 'final_order', { variant: 'interactive' });
  assert.equal(prepared.invariants.valid, true);
  for (const [playerId, meldIndex] of [[0, 0], [1, 1]]) {
    const player = prepared.state.players.find((entry) => entry.id === playerId);
    const meld = prepared.state.teams[0].melds[meldIndex];
    const suit = meld[0].suit;
    assert.equal(meld.some((card) => String(card.rank) === '3' && card.suit === suit), false);
    assert.ok(player.hand.some((card) => String(card.rank) === '3' && card.suit === suit));
    assert.ok(player.hand.some((card) => String(card.rank) === '10' && card.suit === suit));
  }
});

test('Ordem Final do Laboratorio nasce elegivel e so revela cartas depois do aceite', () => {
  const prepared = build('dominadora', 'final_order', { variant: 'success' });
  beginBossTurn(prepared.state, { first: true, now: 1000, debug: true });
  for (let step = 0; step < 15 && prepared.state.boss.bossFlow?.stage !== 'choice'; step++) {
    const flow = prepared.state.boss.bossFlow;
    advanceBossTurn(prepared.state, Math.max(1001, Number(flow?.endsAt || 0) + 1));
  }

  assert.equal(prepared.state.boss.bossFlow?.stage, 'choice', 'Ordem Final waits for acceptance before the player turn');

  const result = executeBossDebugScenarioVariant(prepared.state);

  assert.equal(result.executed, true);
  assert.deepEqual(result.choiceTypes, ['final_order', 'final_order']);
  assert.deepEqual(prepared.state.boss.pendingChoices.map((choice) => choice.playerId), [0, 1]);
  assert.ok(prepared.state.boss.pendingChoices.every((choice) => !(choice.cardIds || []).length));
  assert.equal(prepared.state.boss.effects.some((effect) => effect.id === 'final_order_mark'), false);

  const first = prepared.state.boss.pendingChoices.find((choice) => choice.playerId === 0);
  const event = resolveBossChoice(prepared.state, first.playerId, 'obey');
  assert.equal(event.choiceType, 'final_order');
  assert.equal(event.markedCardIds.length, 2);
  assert.equal(prepared.state.boss.effects.filter((effect) => effect.id === 'final_order_mark' && effect.playerId === 0).length, 2);
});

test('fase automatica usa a primeira fase elegivel e fase incompativel e rejeitada', () => {
  assert.equal(build('banker', 'suit_audit').phase, 2);
  assert.equal(build('dominadora', 'double_collar').phase, 3);
  assert.throws(
    () => build('banker', 'suit_audit', { phase: 1 }),
    /nao e elegivel na Fase 1/,
  );
});

test('Prisão no Espelho é habilidade normal de peso baixo em F1/F2/F3 e continua testável no Laboratório', () => {
  const official = listBossDefinitions().find((boss) => boss.id === 'nehelenia').abilities.find((ability) => ability.id === 'mirror_prison');
  assert.deepEqual(official.phases, [1, 2, 3]);
  assert.equal(official.weight, 2);
  const catalogEntry = getBossDebugCatalog().find((boss) => boss.id === 'nehelenia').abilities.find((ability) => ability.id === 'mirror_prison');
  assert.deepEqual(catalogEntry.phases, [1, 2, 3]);
  for (const phase of ['auto', 1, 2, 3]) {
    const prepared = build('nehelenia', 'mirror_prison', { phase });
    assert.equal(prepared.phase, phase === 'auto' ? 1 : phase);
    assert.equal(prepared.invariants.valid, true);
    assert.equal(inspectBossAbilityEligibility(prepared.state, 'mirror_prison').eligible, true);
    assert.equal(inspectBossAbilityEligibility(prepared.state, 'mirror_prison', { debug: true }).eligible, true);
    const restored = simulateBossDebugReload(prepared.state);
    const intent = selectNextBossIntent(restored, { debug: true });
    assert.equal(intent.abilityId, 'mirror_prison');
    assert.equal(intent.selectionSource, 'debug_forced');
    assert.equal(restored.boss.debugForcedAbilityId, undefined);
  }
  assert.throws(() => build('nehelenia', 'mirror_prison', { phase: 4 }), /nao e elegivel na Fase 4/);
});

test('Prisão no Espelho: sucesso não reduz recurso, falha aumenta o Mundo e sem alvo usa fallback', () => {
  const success = build('nehelenia', 'mirror_prison', { variant: 'success' }).state;
  const beforeSuccess = success.boss.danger;
  const result = executeBossDebugScenarioVariant(success);
  assert.equal(result.executed, true);
  assert.equal(result.action, 'mirror_prison_fed');
  assert.ok(Math.abs(success.boss.danger - beforeSuccess) < 1e-9, 'libertar não deve reduzir o Mundo do Espelho');
  assert.equal(validateBossDebugScenario(success).valid, true);

  const failure = build('nehelenia', 'mirror_prison', { variant: 'failure' }).state;
  const beforeFailure = failure.boss.danger;
  executeBossDebugScenarioVariant(failure);
  assert.ok(Math.abs(failure.boss.danger - (beforeFailure + 0.4)) < 1e-9, 'falha F1 deve acrescentar 8/100');

  const noTarget = build('nehelenia', 'mirror_prison', { variant: 'no_target' }).state;
  const fallback = selectNextBossIntent(noTarget, { debug: true });
  assert.ok(fallback);
  assert.notEqual(fallback.abilityId, 'mirror_prison');
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
  const abilityCount = listBossDefinitions().reduce((total, boss) => total + boss.abilities.length, 0);
  assert.equal(report.total, abilityCount);
  assert.equal(report.passed, abilityCount);
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
