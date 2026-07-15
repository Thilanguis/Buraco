import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyBossDeadTaken,
  applyBossFinalStrike,
  applyBossMeldTransition,
  advanceBossTurn,
  beginBossTurn,
  canBossCreateMeld,
  canBossUseMeld,
  completeBossPlayerTurn,
  consumeBossExtraDraw,
  createBossState,
  getBossChains,
  getBossCardEffect,
  getBossPendingChoice,
  getBossVault,
  hasPendingBossChoices,
  canBossPerformCommonAction,
  isBossCardBlocked,
  isBossDiscardBlocked,
  isBossMeldLocked,
  isBossMeldPossessed,
  isBossTurnActive,
  isBossVaultDrawRequired,
  normalizeBossState,
  reclaimBossVault,
  resolveBossChoice,
  selectNextBossIntent,
  validateBossClosedDiscardSelection,
  validateBossMeldPlay,
} from '../js/boss/boss-engine.js';

function advanceFlowStage(state) {
  const flow = state.boss.bossFlow;
  assert.ok(flow);
  return advanceBossTurn(state, Math.max(Date.now(), flow.endsAt + 1));
}

function game() {
  const state = {
    mode: 'boss_banker',
    turnNumber: 0,
    stock: Array.from({ length: 63 }, (_, index) => ({ id: `stock-${index}` })),
    players: [
      { id: 0, teamId: 0, hand: [{ rank: '3', suit: '♠' }] },
      { id: 1, teamId: 0, hand: [{ rank: '4', suit: '♠' }] },
    ],
    teams: [
      { id: 0, playerIndexes: [0, 1], melds: [] },
      { id: 1, playerIndexes: [], melds: [] },
    ],
    deadChunksTaken: [0, 0],
    boss: createBossState('banker', 1234),
  };
  selectNextBossIntent(state);
  return state;
}

function dominatrixGame() {
  const state = game();
  state.mode = 'boss_dominadora';
  state.boss = createBossState('dominadora', 4321);
  state.players[0].hand = [{ id: 'd0-a', rank: '3', suit: '♠' }, { id: 'd0-b', rank: '4', suit: '♠' }];
  state.players[1].hand = [{ id: 'd1-a', rank: '5', suit: '♥' }, { id: 'd1-b', rank: '6', suit: '♥' }];
  return state;
}

test('dano de canastra usa somente a diferenca e e idempotente', () => {
  const state = game();
  const first = applyBossMeldTransition(state, { teamId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'suja', cardsAdded: [] });
  assert.equal(first.damage, 100);
  assert.equal(state.boss.hp, 2100);

  const duplicate = applyBossMeldTransition(state, { teamId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'suja', cardsAdded: [] });
  assert.equal(duplicate, null);
  assert.equal(state.boss.hp, 2100);

  const upgrade = applyBossMeldTransition(state, { teamId: 0, meldIndex: 0, oldKind: 'suja', newKind: 'limpa', cardsAdded: [] });
  assert.equal(upgrade.damage, 80);
  assert.equal(upgrade.debtReduction, 4);
  assert.equal(state.boss.hp, 2020);
});

test('morto reduz divida uma vez por morto', () => {
  const state = game();
  state.boss.danger = 30;
  state.deadChunksTaken[0] = 1;
  assert.equal(applyBossDeadTaken(state).amount, 5);
  assert.equal(state.boss.danger, 25);
  assert.equal(applyBossDeadTaken(state), null);
  state.deadChunksTaken[0] = 2;
  applyBossDeadTaken(state);
  assert.equal(state.boss.danger, 20);
});

test('alteracoes de divida preservam a origem no evento', () => {
  const state = game();
  state.boss.danger = 30;
  state.deadChunksTaken[0] = 1;
  assert.equal(applyBossDeadTaken(state).dangerChangeLabel, 'Morto conquistado: Dívida -5');
  const meld = applyBossMeldTransition(state, { teamId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'limpa', cardsAdded: [] });
  assert.equal(meld.dangerChangeLabel, 'Canastra limpa: Dívida -4');
});

test('Auditoria reduz cinco de divida uma unica vez no fim da rodada', () => {
  const state = game();
  state.boss.danger = 20;
  state.boss.currentIntent = { id: 'audit-once', abilityId: 'suit_audit', name: 'Auditoria', duration: 'full_round', payload: { suit: '♦', suitLabel: 'Ouros', required: 3, progress: 3, successDelta: -5, failureDelta: 10 } };
  completeBossPlayerTurn(state, 0);
  const event = completeBossPlayerTurn(state, 1);
  assert.equal(event.dangerDelta, -5);
  assert.equal(event.dangerChangeLabel, 'Auditoria concluída: Dívida -5');
  assert.equal(state.boss.danger, 15);
  assert.equal(completeBossPlayerTurn(state, 1), null);
  assert.equal(state.boss.danger, 15);
  assert.equal(state.boss.eventLog.filter((entry) => entry.abilityId === 'suit_audit').length, 1);
});

test('reacao a dano relevante nao bloqueia controles e ocorre no maximo uma vez por rodada', () => {
  const state = game();
  const first = applyBossMeldTransition(state, { teamId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'limpa', cardsAdded: [] });
  assert.ok(first.reaction?.text);
  assert.ok(first.reaction.until - first.reaction.at <= 2500);
  assert.equal(canBossPerformCommonAction(state), true);
  const reactionId = state.boss.damageReaction.id;
  const second = applyBossMeldTransition(state, { teamId: 0, meldIndex: 1, oldKind: 'simple', newKind: 'real', cardsAdded: [] });
  assert.equal(second.reaction, undefined);
  assert.equal(state.boss.damageReaction.id, reactionId);
});

test('chefe resolve uma vez depois dos dois jogadores', () => {
  const state = game();
  state.boss.currentIntent = { id: 'fixed', abilityId: 'fixed_interest', name: 'Juros Fixos', payload: {} };
  assert.equal(completeBossPlayerTurn(state, 0), null);
  assert.equal(state.boss.eventLog.at(-1).type, 'playerTurn');
  const event = completeBossPlayerTurn(state, 1);
  assert.equal(event.abilityId, 'fixed_interest');
  assert.equal(event.round, 1);
  assert.equal(typeof event.at, 'number');
  assert.equal(state.boss.danger, 6);
  assert.equal(state.boss.roundNumber, 2);
  assert.equal(completeBossPlayerTurn(state, 1), null);
});

test('auditoria contabiliza somente cartas do naipe anunciado', () => {
  const state = game();
  state.boss.currentIntent = { id: 'audit', abilityId: 'suit_audit', name: 'Auditoria', payload: { suit: '♦', suitLabel: 'Ouros', required: 3, progress: 0 } };
  applyBossMeldTransition(state, {
    teamId: 0,
    meldIndex: 0,
    oldKind: 'simple',
    newKind: 'simple',
    cardsAdded: [
      { id: 'audit-3', rank: '3', suit: '♦' },
      { id: 'audit-4', rank: '4', suit: '♦' },
      { id: 'audit-5', rank: '5', suit: '♣' },
    ],
  });
  assert.equal(state.boss.currentIntent.payload.progress, 2);
  applyBossMeldTransition(state, {
    teamId: 0,
    meldIndex: 0,
    oldKind: 'simple',
    newKind: 'simple',
    cardsAdded: [{ id: 'audit-3', rank: '3', suit: '♦' }],
  });
  assert.equal(state.boss.currentIntent.payload.progress, 2);
});

test('bloqueios e compra extra derivam do estado serializado', () => {
  const state = game();
  state.boss.currentIntent = { abilityId: 'credit_block', payload: {} };
  assert.equal(isBossDiscardBlocked(state), true);
  state.boss.currentIntent = { abilityId: 'pledge', payload: { meldIndex: 2 } };
  assert.equal(isBossMeldLocked(state, 0, 2), true);
  state.boss.effects.push({ id: 'maintenance_fee', extraDraw: 2, pendingPlayerIds: [0, 1] });
  assert.equal(consumeBossExtraDraw(state, 0), 2);
  assert.equal(consumeBossExtraDraw(state, 0), 0);
});

test('ataque final decide vitoria ou derrota imediatamente', () => {
  const victory = game();
  victory.boss.hp = 550;
  const winEvent = applyBossFinalStrike(victory, 400);
  assert.equal(winEvent.damage, 600);
  assert.equal(victory.boss.result.victory, true);

  const defeat = game();
  defeat.boss.hp = 900;
  applyBossFinalStrike(defeat, 0);
  assert.equal(defeat.boss.hp, 400);
  assert.equal(defeat.boss.result.reason, 'insufficient_final_strike');
});

test('estado recarregado preserva a idempotencia do dano', () => {
  const state = game();
  applyBossMeldTransition(state, { teamId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'real', cardsAdded: [] });
  const restored = JSON.parse(JSON.stringify(state));
  const duplicate = applyBossMeldTransition(restored, { teamId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'real', cardsAdded: [] });
  assert.equal(duplicate, null);
  assert.equal(restored.boss.hp, 1900);
});

test('fase tres mantem habilidade de rodada ate os dois jogadores agirem', () => {
  const state = game();
  state.stock = state.stock.slice(0, 18);
  state.boss.currentIntent = { id: 'phase3-fixed', abilityId: 'fixed_interest', name: 'Juros Fixos', duration: 'full_round', announcedPhase: 3, payload: { amount: 8 } };
  const first = completeBossPlayerTurn(state, 0);
  assert.equal(state.boss.phase, 1);
  assert.equal(state.boss.pendingPhase, 3);
  assert.equal(first, null);
  const event = completeBossPlayerTurn(state, 1);
  assert.equal(event.dangerDelta, 8);
  assert.equal(state.boss.danger, 8);
  assert.equal(state.boss.roundNumber, 2);
  assert.equal(state.boss.phase, 3);
  assert.equal(state.boss.bossFlow.stage, 'result');
});

test('fases acompanham mortos, monte e os limites de HP', () => {
  const healthyProgress = game();
  healthyProgress.boss.hp = 1;
  healthyProgress.boss.currentIntent = { id: 'still-phase1', abilityId: 'credit_block', name: 'Bloqueio', payload: {} };
  completeBossPlayerTurn(healthyProgress, 0);
  assert.equal(healthyProgress.boss.phase, 1);
  assert.equal(healthyProgress.boss.pendingPhase, 3);
  completeBossPlayerTurn(healthyProgress, 1);
  assert.equal(healthyProgress.boss.phase, 3);

  const lowStock = game();
  lowStock.stock = lowStock.stock.slice(0, 40);
  lowStock.boss.currentIntent = { id: 'phase2-stock', abilityId: 'credit_block', name: 'Bloqueio', payload: {} };
  completeBossPlayerTurn(lowStock, 0);
  assert.equal(lowStock.boss.phase, 1);
  assert.equal(lowStock.boss.pendingPhase, 2);
  completeBossPlayerTurn(lowStock, 1);
  assert.equal(lowStock.boss.phase, 2);

  const firstDead = game();
  firstDead.deadChunksTaken[0] = 1;
  applyBossDeadTaken(firstDead);
  assert.equal(firstDead.boss.phase, 1);
  assert.equal(firstDead.boss.pendingPhase, 2);
  completeBossPlayerTurn(firstDead, 0);
  completeBossPlayerTurn(firstDead, 1);
  assert.equal(firstDead.boss.phase, 2);

  const secondDead = game();
  secondDead.deadChunksTaken[0] = 2;
  applyBossDeadTaken(secondDead);
  completeBossPlayerTurn(secondDead, 0);
  completeBossPlayerTurn(secondDead, 1);
  assert.equal(secondDead.boss.phase, 3);
});

test('auditoria anunciada na fase dois nao muda ao entrar na fase tres', () => {
  const state = game();
  state.boss.phase = 2;
  state.boss.phaseTransitions = [1, 2];
  state.stock = state.stock.slice(0, 18);
  state.boss.currentIntent = { id: 'audit-transition', abilityId: 'suit_audit', name: 'Auditoria', payload: { suit: '♦', suitLabel: 'Ouros', required: 3, progress: 0 } };
  applyBossMeldTransition(state, { teamId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'suja', cardsAdded: [] });
  assert.equal(state.boss.phase, 2);
  assert.equal(state.boss.pendingPhase, 3);
  assert.equal(state.boss.currentIntent.payload.required, 3);
  completeBossPlayerTurn(state, 0);
  completeBossPlayerTurn(state, 1);
  assert.equal(state.boss.phase, 3);
});

test('divida maxima encerra a batalha no turno do chefe', () => {
  const state = game();
  state.boss.danger = 96;
  state.boss.currentIntent = { id: 'fatal-fixed', abilityId: 'fixed_interest', name: 'Juros Fixos', payload: {} };
  completeBossPlayerTurn(state, 0);
  completeBossPlayerTurn(state, 1);
  assert.equal(state.boss.danger, 100);
  assert.equal(state.boss.result.victory, false);
  assert.equal(state.boss.result.reason, 'max_debt');
});

test('intencao anunciada permanece ate o fim da rodada', () => {
  const state = game();
  state.boss.currentIntent = { id: 'announced', abilityId: 'credit_block', name: 'Bloqueio', payload: {} };
  completeBossPlayerTurn(state, 0);
  assert.equal(state.boss.currentIntent.id, 'announced');
  completeBossPlayerTurn(state, 1);
  assert.notEqual(state.boss.currentIntent?.id, 'announced');
});

test('Dominadora usa 1800 HP e bloqueia cartas individuais', () => {
  const state = dominatrixGame();
  state.teams[0].melds = [[{ id: 'effect-base-5', rank: '5', suit: '♠' }, { id: 'effect-base-6', rank: '6', suit: '♠' }]];
  assert.equal(state.boss.hp, 1800);
  state.boss.currentIntent = { abilityId: 'collar', payload: { targetPlayerId: 0, cardId: 'd0-a' } };
  assert.equal(isBossCardBlocked(state, 0, 'd0-a', 'play'), true);
  assert.equal(isBossCardBlocked(state, 0, 'd0-a', 'discard'), true);
  assert.equal(isBossCardBlocked(state, 0, 'd0-b', 'play'), false);

  state.boss.currentIntent = { abilityId: 'exposure', payload: { targetPlayerId: 0, cardId: 'd0-b' } };
  assert.equal(getBossCardEffect(state, 0, 'd0-b'), 'exposed');
  assert.equal(isBossCardBlocked(state, 0, 'd0-b', 'play'), false);
  assert.equal(isBossCardBlocked(state, 0, 'd0-b', 'discard'), true);
});

test('Correntes são individuais e derrotam a equipe somente quando ambos chegam a quatro', () => {
  const state = dominatrixGame();
  state.boss.chainsByPlayer = { 0: 3, 1: 3 };
  state.boss.pendingChoices = [
    { id: 'c0', playerId: 0, type: 'forced_choice', options: ['chain'] },
    { id: 'c1', playerId: 1, type: 'forced_choice', options: ['chain'] },
  ];
  resolveBossChoice(state, 0, 'chain');
  assert.equal(getBossChains(state, 0), 4);
  assert.equal(state.boss.result, null);
  resolveBossChoice(state, 1, 'chain');
  assert.equal(getBossChains(state, 1), 4);
  assert.equal(state.boss.result.reason, 'both_players_dominated');
});

test('Mãos Atadas e Separação persistem no estado da intenção', () => {
  const state = dominatrixGame();
  state.boss.currentIntent = { abilityId: 'hands_tied', payload: { newMeldCounts: {} } };
  assert.equal(canBossCreateMeld(state, 0), true);
  applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'simple', cardsAdded: [], isNewMeld: true });
  assert.equal(canBossCreateMeld(state, 0), false);
  assert.equal(canBossCreateMeld(state, 1), true);

  state.boss.currentIntent = { abilityId: 'separation', payload: { meldOwners: {} } };
  applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'simple', cardsAdded: [{ id: 'x' }] });
  assert.equal(canBossUseMeld(state, 0, 0), true);
  assert.equal(canBossUseMeld(state, 1, 0), false);
});

test('Posse segura o dano até a equipe romper o controle', () => {
  const state = dominatrixGame();
  state.teams[0].melds = [[{ id: 'base-possession', rank: '3', suit: '♠' }]];
  state.boss.currentIntent = { id: 'another-order', abilityId: 'hands_tied', name: 'Mãos Atadas', payload: { newMeldCounts: {} } };
  state.boss.possessions = [{ id: 'possession-0', teamId: 0, meldIndex: 0, progress: 0, required: 2 }];
  const suppressed = applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'suja', cardsAdded: [{ id: 'p1' }] });
  assert.equal(suppressed.damage, 0);
  assert.equal(state.boss.hp, 1800);
  assert.equal(state.boss.possessions[0].progress, 1);
  const breakEvent = applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'suja', cardsAdded: [{ id: 'p2' }] });
  assert.equal(breakEvent.possessionReleased, true);
  assert.equal(breakEvent.damage, 100);
  assert.equal(state.boss.possessions.length, 0);
  assert.equal(state.boss.currentIntent.abilityId, 'hands_tied');
  const released = applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'suja', cardsAdded: [{ id: 'p3' }] });
  assert.equal(released, null);
  assert.equal(state.boss.hp, 1700);
});

test('Resistência remove Corrente de quem causou dano', () => {
  const state = dominatrixGame();
  state.boss.chainsByPlayer[0] = 2;
  const event = applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'limpa', cardsAdded: [] });
  assert.equal(event.damage, 180);
  assert.equal(event.chainsRemoved, 1);
  assert.equal(getBossChains(state, 0), 1);
});

test('Troca Forçada e Favorita alteram as mãos e Correntes sem destruir cartas', () => {
  const swapState = dominatrixGame();
  const beforeIds = swapState.players.flatMap((player) => player.hand.map((card) => card.id)).sort();
  swapState.boss.currentIntent = { id: 'swap', abilityId: 'forced_swap', name: 'Troca Forçada', payload: {} };
  completeBossPlayerTurn(swapState, 0);
  const swapEvent = completeBossPlayerTurn(swapState, 1);
  assert.equal(swapEvent.abilityId, 'forced_swap');
  assert.deepEqual(swapState.players.flatMap((player) => player.hand.map((card) => card.id)).sort(), beforeIds);
  assert.ok(swapState.players[0].hand.some((card) => card.id.startsWith('d1-')));

  const favoriteState = dominatrixGame();
  favoriteState.boss.chainsByPlayer = { 0: 1, 1: 0 };
  favoriteState.boss.currentIntent = { id: 'favorite', abilityId: 'favorite', name: 'Favorita', payload: { protectedPlayerId: 0, punishedPlayerId: 1 } };
  completeBossPlayerTurn(favoriteState, 0);
  completeBossPlayerTurn(favoriteState, 1);
  assert.equal(getBossChains(favoriteState, 0), 0);
  assert.equal(getBossChains(favoriteState, 1), 1);
});

test('Ordem Final cria escolhas diferentes para os dois cooperadores', () => {
  const state = dominatrixGame();
  state.boss.phase = 3;
  state.stock.length = 18;
  state.boss.currentIntent = { id: 'final-order', abilityId: 'final_order', name: 'Ordem Final', payload: { orderedPlayerIds: [0, 1] } };
  assert.equal(completeBossPlayerTurn(state, 0), null);
  const event = completeBossPlayerTurn(state, 1);
  assert.equal(event.abilityId, 'final_order');
  assert.deepEqual(state.boss.pendingChoices.map((choice) => choice.options), [
    ['draw2', 'chain'],
    ['lock_card', 'chain'],
  ]);
});

test('Ataque final perde força quando o jogador está Dominado', () => {
  const normal = dominatrixGame();
  normal.boss.hp = 1000;
  const normalEvent = applyBossFinalStrike(normal, 400, 0);

  const dominated = dominatrixGame();
  dominated.boss.hp = 1000;
  dominated.boss.chainsByPlayer[0] = 4;
  const dominatedEvent = applyBossFinalStrike(dominated, 400, 0);
  assert.equal(normalEvent.damage, 600);
  assert.equal(dominatedEvent.damage, 390);
});

test('escolha pendente bloqueia acoes, sobrevive ao reload e impede nova intencao', () => {
  const state = dominatrixGame();
  state.boss.currentIntent = null;
  state.boss.presentationUntil = Date.now() - 1000;
  state.boss.pendingChoices = [{ id: 'mandatory', playerId: 0, type: 'forced_choice', options: ['draw2', 'chain'] }];
  assert.equal(hasPendingBossChoices(state), true);
  assert.equal(canBossPerformCommonAction(state), false);
  assert.equal(selectNextBossIntent(state), null);
  assert.equal(completeBossPlayerTurn(state, 0), null);

  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(hasPendingBossChoices(restored), true);
  assert.equal(canBossPerformCommonAction(restored), false);
  assert.equal(restored.boss.currentIntent, null);
});

test('ultima escolha inicia o turno formal antes da proxima intencao e opcoes invalidas nao executam', () => {
  const state = dominatrixGame();
  state.boss.currentIntent = null;
  state.boss.pendingChoices = [{ id: 'mandatory', playerId: 0, type: 'forced_choice', options: ['draw2', 'chain'] }];
  assert.equal(resolveBossChoice(state, 0, 'lock_card'), null);
  assert.equal(state.boss.pendingChoices.length, 1);
  const event = resolveBossChoice(state, 0, 'chain');
  assert.equal(event.option, 'chain');
  assert.equal(state.boss.pendingChoices.length, 0);
  assert.equal(state.boss.bossFlow.stage, 'result');
  assert.equal(state.boss.currentIntent, null);
  advanceFlowStage(state);
  assert.ok(state.boss.currentIntent);
  assert.equal(state.boss.bossFlow.stage, 'ability');
});

test('comprar duas cartas recicla morto e usa Corrente se a compra for impossivel', () => {
  const recycled = dominatrixGame();
  recycled.stock = [];
  recycled.deadPiles = [[{ id: 'dead-a' }, { id: 'dead-b' }], []];
  recycled.boss.currentIntent = null;
  recycled.boss.pendingChoices = [{ id: 'draw', playerId: 0, type: 'forced_choice', options: ['draw2', 'chain'] }];
  const before = recycled.players[0].hand.length;
  const recycledEvent = resolveBossChoice(recycled, 0, 'draw2');
  assert.equal(recycled.players[0].hand.length, before + 2);
  assert.equal(recycled.deadPiles[0].length, 0);
  assert.equal(recycledEvent.drawnCount, 2);
  assert.deepEqual(new Set(recycledEvent.drawnCardIds), new Set(['dead-a', 'dead-b']));
  assert.match(recycledEvent.outcome, /^2 cartas compradas;/);
  assert.ok(recycledEvent.drawnCardIds.includes(recycledEvent.lockedCardId));
  assert.ok(recycledEvent.lockedCardLabel);
  assert.equal(isBossCardBlocked(recycled, 0, recycledEvent.lockedCardId, 'play'), true);

  const fallback = dominatrixGame();
  fallback.stock = [];
  fallback.deadPiles = [[], []];
  fallback.boss.currentIntent = null;
  fallback.boss.pendingChoices = [{ id: 'draw-fail', playerId: 0, type: 'forced_choice', options: ['draw2', 'chain'] }];
  resolveBossChoice(fallback, 0, 'draw2');
  assert.equal(getBossChains(fallback, 0), 1);
});

test('lock_card exige carta valida', () => {
  const state = dominatrixGame();
  state.players[0].hand = [];
  state.boss.currentIntent = null;
  state.boss.pendingChoices = [{ id: 'lock', playerId: 0, type: 'final_order_lock', options: ['lock_card', 'chain'] }];
  assert.equal(resolveBossChoice(state, 0, 'lock_card'), null);
  assert.equal(state.boss.pendingChoices.length, 1);
  assert.equal(state.boss.effects.length, 0);
});

test('Dupla Coleira afeta os dois durante a rodada', () => {
  const state = dominatrixGame();
  state.boss.currentIntent = {
    id: 'double', abilityId: 'double_collar', name: 'Dupla Coleira', duration: 'full_round',
    payload: { lockedCards: [{ playerId: 0, cardId: 'd0-a' }, { playerId: 1, cardId: 'd1-a' }] },
  };
  assert.equal(isBossCardBlocked(state, 0, 'd0-a'), true);
  assert.equal(isBossCardBlocked(state, 1, 'd1-a'), true);
  completeBossPlayerTurn(state, 0);
  assert.equal(isBossCardBlocked(state, 1, 'd1-a'), true);
});

test('Fechado nega o lixo quando a justificativa usa carta presa pela Coleira sem mutar a mesa', () => {
  const state = dominatrixGame();
  const threeClubs = { id: 'three-clubs', rank: '3', suit: '\u2663' };
  const fiveClubs = { id: 'five-clubs', rank: '5', suit: '\u2663' };
  state.variant = 'fechado';
  state.players[0].hand = [threeClubs, fiveClubs];
  state.discard = [{ id: 'four-clubs', rank: '4', suit: '\u2663' }];
  state.teams[0].melds = [];
  state.boss.currentIntent = {
    id: 'collar-closed-discard',
    abilityId: 'collar',
    name: 'Coleira',
    duration: 'target_turn',
    payload: { targetPlayerId: 0, cardId: threeClubs.id },
  };
  const before = structuredClone({ hand: state.players[0].hand, discard: state.discard, melds: state.teams[0].melds });

  const result = validateBossClosedDiscardSelection(state, 0, [threeClubs, fiveClubs]);

  assert.equal(result.allowed, false);
  assert.equal(result.blockedCardId, threeClubs.id);
  assert.match(result.message, /carta.*presa/i);
  assert.deepEqual({ hand: state.players[0].hand, discard: state.discard, melds: state.teams[0].melds }, before);
});

test('Fechado permite a mesma justificativa do lixo quando o 3 de paus nao esta preso', () => {
  const state = dominatrixGame();
  const threeClubs = { id: 'three-clubs-free', rank: '3', suit: '\u2663' };
  const fiveClubs = { id: 'five-clubs-free', rank: '5', suit: '\u2663' };
  state.variant = 'fechado';
  state.players[0].hand = [threeClubs, fiveClubs];
  state.discard = [{ id: 'four-clubs-free', rank: '4', suit: '\u2663' }];
  state.teams[0].melds = [];
  state.boss.currentIntent = null;

  const result = validateBossClosedDiscardSelection(state, 0, [threeClubs, fiveClubs]);

  assert.equal(result.allowed, true);
  assert.equal(result.message, '');
});

test('Separacao e Maos Atadas duram a rodada inteira', () => {
  for (const abilityId of ['separation', 'hands_tied']) {
    const state = dominatrixGame();
    state.boss.currentIntent = { id: abilityId, abilityId, name: abilityId, duration: 'full_round', payload: abilityId === 'separation' ? { meldOwners: {} } : { newMeldCounts: {} } };
    completeBossPlayerTurn(state, 0);
    assert.equal(state.boss.currentIntent.abilityId, abilityId);
    completeBossPlayerTurn(state, 1);
    assert.notEqual(state.boss.currentIntent?.id, abilityId);
  }
});

test('Controle Absoluto permanece ate o jogador alvo concluir o turno', () => {
  const state = dominatrixGame();
  state.boss.currentIntent = { id: 'control', abilityId: 'absolute_control', name: 'Controle Absoluto', duration: 'target_turn', payload: { targetPlayerId: 1, cardId: 'd1-a' } };
  completeBossPlayerTurn(state, 0);
  assert.equal(state.boss.currentIntent.id, 'control');
  completeBossPlayerTurn(state, 1);
  assert.notEqual(state.boss.currentIntent?.id, 'control');
});

test('valor anunciado na fase dois fica congelado ao entrar na fase tres', () => {
  const state = game();
  state.boss.currentIntent = { id: 'frozen', abilityId: 'fixed_interest', name: 'Juros Fixos', duration: 'full_round', announcedPhase: 2, payload: { amount: 6 } };
  state.stock = state.stock.slice(0, 18);
  completeBossPlayerTurn(state, 0);
  const event = completeBossPlayerTurn(state, 1);
  assert.equal(state.boss.phase, 3);
  assert.equal(event.dangerDelta, 6);
});

test('Coleira no primeiro jogador nao permite outra habilidade resolver no mesmo round', () => {
  const state = dominatrixGame();
  state.boss.currentIntent = { id: 'collar-r1', abilityId: 'collar', name: 'Coleira', duration: 'target_turn', activatedRound: 1, payload: { targetPlayerId: 0, cardId: 'd0-a' } };
  const collarEvent = completeBossPlayerTurn(state, 0);
  assert.equal(collarEvent.abilityId, 'collar');
  assert.equal(state.boss.currentIntent, null);
  const secondTurnEvent = completeBossPlayerTurn(state, 1);
  assert.equal(secondTurnEvent, null);
  assert.equal(state.boss.roundNumber, 2);
  assert.equal(state.boss.eventLog.filter((entry) => entry.type === 'bossAbility').length, 1);
  assert.equal(state.boss.bossFlow.stage, 'result');
  advanceFlowStage(state);
  assert.equal(state.boss.currentIntent.activatedRound, 2);
});

test('habilidade anunciada na virada so resolve no ciclo seguinte', () => {
  const state = dominatrixGame();
  state.teams[0].melds = [[{ id: 'exposure-base-1', rank: '4', suit: '♠' }, { id: 'exposure-base-2', rank: '5', suit: '♠' }]];
  state.boss.currentIntent = { id: 'exposure-r1', abilityId: 'exposure', name: 'Exposicao', duration: 'target_turn', activatedRound: 1, payload: { targetPlayerId: 0, cardId: 'd0-a' } };
  completeBossPlayerTurn(state, 0);
  completeBossPlayerTurn(state, 1);
  advanceFlowStage(state);
  const nextIntent = state.boss.currentIntent;
  assert.equal(nextIntent.activatedRound, 2);
  assert.equal(state.boss.eventLog.filter((entry) => entry.type === 'bossAbility').length, 1);
  completeBossPlayerTurn(state, 0);
  assert.ok(state.boss.eventLog.filter((entry) => entry.type === 'bossAbility').length <= 2);
});

test('Posse 0 de 2 atravessa a rodada e termina exatamente em 2 de 2', () => {
  const state = dominatrixGame();
  state.teams[0].melds = [[{ id: 'base-possession-round', rank: '3', suit: '♠' }]];
  state.boss.possessions = [{ id: 'possession-r1', teamId: 0, meldIndex: 0, progress: 0, required: 2 }];
  state.boss.currentIntent = { id: 'hands-r1', abilityId: 'hands_tied', name: 'Mãos Atadas', duration: 'full_round', activatedRound: 1, payload: { newMeldCounts: {} } };
  completeBossPlayerTurn(state, 0);
  completeBossPlayerTurn(state, 1);
  assert.equal(state.boss.roundNumber, 2);
  assert.equal(state.boss.possessions[0].id, 'possession-r1');
  assert.equal(state.boss.possessions[0].progress, 0);
  applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'suja', cardsAdded: [{ id: 'pos-1' }] });
  assert.equal(state.boss.possessions[0].progress, 1);
  applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'suja', cardsAdded: [{ id: 'pos-2' }] });
  assert.equal(state.boss.possessions.length, 0);
  assert.match(state.boss.lastEvent.outcome, /rompeu a Posse/);
});

test('Coleira e Exposicao nunca recebem cardId nulo', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const state = dominatrixGame();
    state.boss.seed = seed;
    state.boss.phase = 1;
    state.players[0].hand = [];
    state.players[1].hand = [{ id: `valid-${seed}`, rank: '8', suit: '♥' }];
    const intent = selectNextBossIntent(state);
    if (intent?.abilityId === 'collar' || intent?.abilityId === 'exposure') {
      assert.equal(intent.payload.targetPlayerId, 1);
      assert.equal(intent.payload.cardId, `valid-${seed}`);
    }
  }
});

test('Ordem Final encontra primeiro a escolha do jogador local', () => {
  const state = dominatrixGame();
  state.boss.pendingChoices = [
    { id: 'choice-player-0', playerId: 0, options: ['draw2', 'chain'] },
    { id: 'choice-player-1', playerId: 1, options: ['lock_card', 'chain'] },
  ];
  assert.equal(getBossPendingChoice(state, 1).id, 'choice-player-1');
});

test('primeira rodada comeca pelo turno formal do chefe e bloqueia controles durante a apresentacao', () => {
  const state = dominatrixGame();
  state.boss.currentIntent = null;
  const started = beginBossTurn(state, { first: true, now: 1000 });
  assert.equal(started.stage, 'ability');
  assert.equal(state.boss.bossFlow.endsAt, 7000);
  assert.ok(state.boss.currentIntent);
  assert.equal(isBossTurnActive(state), true);
  assert.equal(canBossPerformCommonAction(state), false);
  assert.equal(advanceBossTurn(state, 6999), null);

  let guard = 0;
  while ((isBossTurnActive(state) || getBossPendingChoice(state, 0)) && guard++ < 8) {
    const choice = getBossPendingChoice(state, 0);
    if (choice) resolveBossChoice(state, 0, choice.options.includes('chain') ? 'chain' : choice.options[0]);
    else advanceFlowStage(state);
  }
  assert.equal(state.boss.bossFlow.stage, 'players');
  assert.equal(canBossPerformCommonAction(state), true);
});

test('mudanca de fase apresenta resultado, fase, provocacao e so depois escolhe a nova habilidade', () => {
  const state = game();
  state.stock = state.stock.slice(0, 40);
  state.boss.currentIntent = { id: 'old-phase-intent', abilityId: 'fixed_interest', name: 'Juros Fixos', duration: 'full_round', announcedPhase: 1, payload: { amount: 6 } };
  completeBossPlayerTurn(state, 0);
  completeBossPlayerTurn(state, 1);
  assert.equal(state.boss.phase, 2);
  assert.equal(state.boss.currentIntent, null);
  assert.equal(state.boss.bossFlow.stage, 'result');
  assert.equal(advanceFlowStage(state).stage, 'phase');
  assert.equal(state.boss.currentIntent, null);
  assert.equal(advanceFlowStage(state).stage, 'taunt');
  assert.equal(state.boss.currentIntent, null);
  assert.equal(advanceFlowStage(state).stage, 'ability');
  assert.ok(state.boss.currentIntent);
  assert.notEqual(state.boss.currentIntent.id, 'old-phase-intent');
  assert.equal(state.boss.currentIntent.announcedPhase, 2);
});

test('Coleira escolhe ate duas cartas distintas e nunca anuncia alvo nulo', () => {
  let twoCardIntent = null;
  for (let seed = 1; seed <= 120 && !twoCardIntent; seed++) {
    const state = dominatrixGame();
    state.boss.seed = seed;
    const intent = selectNextBossIntent(state);
    if (intent?.abilityId === 'collar') twoCardIntent = intent;
  }
  assert.ok(twoCardIntent);
  assert.ok(twoCardIntent.payload.targetPlayerId != null);
  assert.equal(twoCardIntent.payload.cardIds.length, 1);
  assert.equal(new Set(twoCardIntent.payload.cardIds).size, 1);

  let oneCardIntent = null;
  for (let seed = 1; seed <= 120 && !oneCardIntent; seed++) {
    const state = dominatrixGame();
    state.boss.seed = seed;
    state.players.forEach((player, index) => { player.hand = [{ id: `only-${index}`, rank: '8', suit: '♥' }]; });
    const intent = selectNextBossIntent(state);
    if (intent?.abilityId === 'collar') oneCardIntent = intent;
  }
  assert.equal(oneCardIntent, null);
});

test('Exposicao permite jogar, impede descarte e registra sucesso ou Corrente por falha', () => {
  const success = dominatrixGame();
  success.teams[0].melds = [[{ id: 'exposure-success-1', rank: '4', suit: '♠' }, { id: 'exposure-success-2', rank: '5', suit: '♠' }]];
  success.boss.currentIntent = { id: 'exposure-success', abilityId: 'exposure', name: 'Exposicao', duration: 'target_turn', payload: { targetPlayerId: 0, cardId: 'd0-a' } };
  assert.equal(isBossCardBlocked(success, 0, 'd0-a', 'play'), false);
  assert.equal(isBossCardBlocked(success, 0, 'd0-a', 'discard'), true);
  success.players[0].hand = success.players[0].hand.filter((card) => card.id !== 'd0-a');
  const successEvent = completeBossPlayerTurn(success, 0);
  assert.equal(successEvent.exposureSuccess, true);
  assert.match(successEvent.outcome, /evitou/);

  const failure = dominatrixGame();
  failure.teams[0].melds = [[{ id: 'exposure-failure-1', rank: '4', suit: '♠' }, { id: 'exposure-failure-2', rank: '5', suit: '♠' }]];
  failure.boss.currentIntent = { id: 'exposure-failure', abilityId: 'exposure', name: 'Exposicao', duration: 'target_turn', payload: { targetPlayerId: 0, cardId: 'd0-a' } };
  const failureEvent = completeBossPlayerTurn(failure, 0);
  assert.equal(failureEvent.exposureSuccess, false);
  assert.equal(getBossChains(failure, 0), 1);
  assert.match(failureEvent.outcome, /1 Corrente/);
});

test('Comprar 2 prende as duas cartas recebidas ate o fim do proximo turno e sobrevive ao reload', () => {
  const state = dominatrixGame();
  state.stock = [{ id: 'choice-a', rank: '9', suit: '♣' }, { id: 'choice-b', rank: '10', suit: '♣' }];
  state.boss.currentIntent = null;
  state.boss.pendingChoices = [{ id: 'draw-lock', playerId: 0, type: 'forced_choice', options: ['draw2', 'chain'] }];
  const event = resolveBossChoice(state, 0, 'draw2');
  assert.equal(event.drawnCount, 2);
  assert.equal(event.lockedCardIds.length, 2);

  const restored = JSON.parse(JSON.stringify(state));
  event.lockedCardIds.forEach((cardId) => {
    assert.equal(isBossCardBlocked(restored, 0, cardId, 'play'), true);
    assert.equal(isBossCardBlocked(restored, 0, cardId, 'discard'), true);
  });
  let guard = 0;
  while ((isBossTurnActive(restored) || getBossPendingChoice(restored, 0)) && guard++ < 10) {
    const choice = getBossPendingChoice(restored, 0);
    if (choice) resolveBossChoice(restored, 0, choice.options.includes('chain') ? 'chain' : choice.options[0]);
    else advanceFlowStage(restored);
  }
  completeBossPlayerTurn(restored, 0);
  event.lockedCardIds.forEach((cardId) => assert.equal(isBossCardBlocked(restored, 0, cardId, 'play'), false));
});

test('Escolha Forcada bloqueia imediatamente apos o anuncio e libera o turno depois da decisao', () => {
  const state = dominatrixGame();
  state.stock = [{ id: 'choice-a', rank: '9', suit: '♣' }, { id: 'choice-b', rank: '10', suit: '♣' }];
  state.boss.currentIntent = {
    id: 'forced-now',
    abilityId: 'forced_choice',
    name: 'Escolha Forcada',
    duration: 'until_choice',
    payload: { targetPlayerId: 0 },
  };
  state.boss.bossFlow = { id: 'flow-forced', stage: 'ability', queue: [], startedAt: 1000, endsAt: 2000 };

  const choiceStep = advanceBossTurn(state, 2001);
  assert.equal(choiceStep.stage, 'choice');
  assert.equal(getBossPendingChoice(state, 0)?.type, 'forced_choice');
  assert.equal(canBossPerformCommonAction(state), false);

  const event = resolveBossChoice(state, 0, 'draw2');
  assert.equal(event.drawnCount, 2);
  assert.equal(state.boss.pendingChoices.length, 0);
  assert.equal(state.boss.currentIntent, null);
  assert.equal(state.boss.bossFlow.stage, 'players');
  assert.equal(canBossPerformCommonAction(state), true);
});

test('Comprar 2 para o segundo jogador permanece na mao ate o turno dele', () => {
  const state = dominatrixGame();
  state.currentPlayer = 0;
  state.turnNumber = 7;
  state.stock = [{ id: 'second-a', rank: '9', suit: '♣' }, { id: 'second-b', rank: '10', suit: '♣' }];
  state.boss.currentIntent = {
    id: 'forced-second',
    abilityId: 'forced_choice',
    name: 'Escolha Forcada',
    duration: 'until_choice',
    payload: { targetPlayerId: 1 },
  };
  state.boss.bossFlow = { id: 'flow-second', stage: 'ability', queue: [], startedAt: 1000, endsAt: 2000 };

  advanceBossTurn(state, 2001);
  const before = state.players[1].hand.length;
  const event = resolveBossChoice(state, 1, 'draw2');
  assert.equal(event.drawnCount, 2);
  assert.equal(state.players[1].hand.length, before + 2);
  assert.deepEqual(new Set(state.boss.choiceDrawnCardIdsByPlayer[1]), new Set(event.drawnCardIds));

  completeBossPlayerTurn(state, 0);
  assert.equal(state.players[1].hand.length, before + 2);
  assert.deepEqual(new Set(state.boss.choiceDrawnCardIdsByPlayer[1]), new Set(event.drawnCardIds));

  state.turnNumber += 1;
  completeBossPlayerTurn(state, 1);
  assert.equal(state.boss.choiceDrawnCardIdsByPlayer[1], undefined);
});

test('Correntes nao diminuem automaticamente no fim do turno', () => {
  const state = dominatrixGame();
  state.boss.chainsByPlayer[0] = 4;
  completeBossPlayerTurn(state, 0);
  assert.equal(state.boss.chainsByPlayer[0], 4);
  assert.equal(state.boss.eventLog.some((entry) => entry.type === 'chainChange' && entry.reason === 'domination_ended'), false);
});

test('primeira habilidade das fases novas usa a lista introdutoria de cada chefe', () => {
  const cases = [
    { create: game, phase: 2, allowed: ['suit_audit', 'pledge', 'compound_interest'] },
    { create: game, phase: 3, allowed: ['compound_interest', 'suit_audit', 'maintenance_fee'] },
    { create: dominatrixGame, phase: 2, allowed: ['forced_swap', 'hands_tied', 'possession', 'favorite'] },
    { create: dominatrixGame, phase: 3, allowed: ['double_collar', 'separation', 'absolute_control', 'break_will', 'final_order'] },
  ];
  cases.forEach(({ create, phase, allowed }) => {
    const state = create();
    state.boss.currentIntent = null;
    state.boss.phase = phase;
    state.boss.phaseTransitionId = `phase-${phase}`;
    state.boss.phaseIntroPending = phase;
    if (state.boss.id === 'dominadora') state.teams[0].melds = [[{ id: 'meld-card' }]];
    const intent = selectNextBossIntent(state);
    assert.ok(allowed.includes(intent.abilityId), `${state.boss.id} fase ${phase}: ${intent.abilityId}`);
    assert.equal(intent.selectionSource, 'phase_intro');
    assert.equal(intent.phaseTransitionId, `phase-${phase}`);
    assert.equal(state.boss.phaseIntroPending, null);
  });
});

test('depois da introducao da fase o sorteio volta ao fluxo normal', () => {
  const state = dominatrixGame();
  state.boss.phase = 2;
  state.boss.phaseTransitionId = 'phase-2';
  state.boss.phaseIntroPending = 2;
  state.teams[0].melds = [[{ id: 'meld-card' }]];
  const intro = selectNextBossIntent(state);
  assert.equal(intro.selectionSource, 'phase_intro');
  state.boss.lastAbilityId = intro.abilityId;
  state.boss.currentIntent = null;
  const next = selectNextBossIntent(state);
  assert.equal(next.selectionSource, 'normal');
  assert.equal(next.phaseTransitionId, null);
});

test('habilidade introdutoria inelegivel tenta outra da lista e fallback normal permanece seguro', () => {
  const banker = game();
  banker.boss.currentIntent = null;
  banker.boss.phase = 2;
  banker.boss.phaseIntroPending = 2;
  banker.teams[0].melds = [];
  const eligibleIntro = selectNextBossIntent(banker);
  assert.equal(eligibleIntro.selectionSource, 'phase_intro');
  assert.notEqual(eligibleIntro.abilityId, 'pledge');

  const fallback = dominatrixGame();
  fallback.players = [fallback.players[0]];
  fallback.teams[0].playerIndexes = [0];
  fallback.teams[0].melds = [];
  fallback.boss.phase = 2;
  fallback.boss.phaseIntroPending = 2;
  const normalIntent = selectNextBossIntent(fallback);
  assert.ok(normalIntent);
  assert.equal(normalIntent.selectionSource, 'phase_intro_fallback');
  assert.ok(['collar', 'forced_choice', 'exposure'].includes(normalIntent.abilityId));
  assert.ok(normalIntent.payload);
});

test('transicao de fase usa id estavel e ordena fase, provocacao e habilidade', () => {
  const state = game();
  state.stock = state.stock.slice(0, 40);
  state.boss.currentIntent = { id: 'old', abilityId: 'fixed_interest', name: 'Juros Fixos', duration: 'full_round', payload: { amount: 6 } };
  completeBossPlayerTurn(state, 0);
  completeBossPlayerTurn(state, 1);
  const transitionId = state.boss.phaseTransitionId;
  assert.ok(transitionId);
  assert.equal(state.boss.bossFlow.phaseTransitionId, transitionId);
  assert.equal(state.boss.bossFlow.stage, 'result');
  assert.equal(canBossPerformCommonAction(state), false);
  assert.equal(advanceFlowStage(state).stage, 'phase');
  assert.equal(canBossPerformCommonAction(state), false);
  assert.equal(state.boss.bossFlow.endsAt - state.boss.bossFlow.startedAt, 3000);
  assert.equal(advanceFlowStage(state).stage, 'taunt');
  assert.equal(canBossPerformCommonAction(state), false);
  assert.equal(state.boss.bossFlow.endsAt - state.boss.bossFlow.startedAt, 4000);
  assert.equal(advanceFlowStage(state).stage, 'ability');
  assert.equal(canBossPerformCommonAction(state), false);
  assert.equal(state.boss.currentIntent.selectionSource, 'phase_intro');
  assert.notEqual(state.boss.currentIntent.id, 'old');
});

test('Troca Forcada e anunciada antes de aplicar e snapshot nao duplica o efeito', () => {
  let state = null;
  for (let seed = 1; seed < 300 && !state; seed++) {
    const candidate = dominatrixGame();
    candidate.boss.seed = seed;
    candidate.boss.phase = 2;
    candidate.boss.phaseIntroPending = 2;
    candidate.teams[0].melds = [[{ id: 'meld-card' }]];
    beginBossTurn(candidate, { now: 1000 });
    if (candidate.boss.currentIntent?.abilityId === 'forced_swap') state = candidate;
  }
  assert.ok(state);
  const handsBefore = state.players.map((player) => player.hand.map((card) => card.id));
  const sequenceBefore = state.boss.actionSequence;
  assert.equal(state.boss.currentIntent.intentStatus, 'announced');
  assert.deepEqual(state.players.map((player) => player.hand.map((card) => card.id)), handsBefore);

  const reloaded = structuredClone(state);
  const resultStep = advanceBossTurn(reloaded, reloaded.boss.bossFlow.endsAt + 1);
  assert.equal(resultStep.stage, 'result');
  assert.equal(reloaded.boss.currentIntent.intentStatus, 'applied');
  assert.notDeepEqual(reloaded.players.map((player) => player.hand.map((card) => card.id)), handsBefore);
  assert.equal(reloaded.boss.actionSequence, sequenceBefore + 1);
  assert.equal(advanceBossTurn(reloaded, resultStep.endsAt - 1), null);
  assert.equal(reloaded.boss.actionSequence, sequenceBefore + 1);
});

test('Favorita aplica Correntes uma unica vez somente depois do anuncio', () => {
  let state = null;
  for (let seed = 1; seed < 300 && !state; seed++) {
    const candidate = dominatrixGame();
    candidate.boss.seed = seed;
    candidate.boss.phase = 2;
    candidate.boss.phaseIntroPending = 2;
    candidate.teams[0].melds = [[{ id: 'meld-card' }]];
    candidate.boss.chainsByPlayer = { 0: 1, 1: 1 };
    beginBossTurn(candidate, { now: 1000 });
    if (candidate.boss.currentIntent?.abilityId === 'favorite') state = candidate;
  }
  assert.ok(state);
  const before = structuredClone(state.boss.chainsByPlayer);
  assert.deepEqual(state.boss.chainsByPlayer, before);
  state = structuredClone(state);
  const resultStep = advanceBossTurn(state, state.boss.bossFlow.endsAt + 1);
  assert.equal(resultStep.stage, 'result');
  const applied = structuredClone(state.boss.chainsByPlayer);
  assert.notDeepEqual(applied, before);
  advanceBossTurn(state, resultStep.endsAt - 1);
  assert.deepEqual(state.boss.chainsByPlayer, applied);
});
function prepareFixedInterestChoice({ phase = 1, occupiedVaults = false } = {}) {
  const state = game();
  state.players[0].name = 'Biel';
  state.players[1].name = 'BOT Luana';
  state.players[0].hand = [{ id: 'guarantee-human', rank: '7', suit: '♣' }];
  state.players[1].hand = [{ id: 'guarantee-bot', rank: '8', suit: '♣' }];
  state.boss.phase = phase;
  state.boss.currentIntent = {
    id: `fixed-phase-${phase}`,
    abilityId: 'fixed_interest',
    name: 'Juros Fixos',
    duration: 'full_round',
    announcedPhase: phase,
    payload: { amount: phase === 3 ? 8 : 6, collateralAmount: phase === 3 ? 5 : 3 },
  };
  if (occupiedVaults) {
    state.boss.vaultsByPlayer = {
      0: { playerId: 0, card: { id: 'vault-human', rank: 'Q', suit: '♥' }, requiredDraw: true },
      1: { playerId: 1, card: { id: 'vault-bot', rank: 'K', suit: '♥' }, requiredDraw: true },
    };
  }
  completeBossPlayerTurn(state, 0);
  completeBossPlayerTurn(state, 1);
  return state;
}

test('Juros Fixos permite pagamento integral ou Garantia com valores congelados', () => {
  const full = prepareFixedInterestChoice();
  const fullChoice = getBossPendingChoice(full, 0);
  assert.deepEqual(fullChoice.options, ['full', 'guarantee:0', 'guarantee:1']);
  const fullEvent = resolveBossChoice(full, 0, 'full');
  assert.equal(fullEvent.dangerDelta, 6);
  assert.equal(full.boss.danger, 6);

  const collateral = prepareFixedInterestChoice({ phase: 3 });
  const guarantorEvent = resolveBossChoice(collateral, 0, 'guarantee:1');
  assert.equal(guarantorEvent.dangerDelta, 0);
  assert.equal(getBossPendingChoice(collateral, 1).type, 'banker_collateral_card');
  const collateralEvent = resolveBossChoice(collateral, 1, 'card:guarantee-bot');
  assert.equal(collateralEvent.dangerDelta, 5);
  assert.equal(collateral.boss.danger, 5);
  assert.equal(getBossVault(collateral, 1).card.id, 'guarantee-bot');
  assert.equal(collateral.players[1].hand.some((card) => card.id === 'guarantee-bot'), false);
});

test('Cofre bloqueia as compras e o resgate substitui a compra normal no turno do dono', () => {
  const state = prepareFixedInterestChoice();
  resolveBossChoice(state, 0, 'guarantee:0');
  resolveBossChoice(state, 0, 'card:guarantee-human');
  const restored = JSON.parse(JSON.stringify(state));
  restored.boss.bossFlow = { id: 'players', stage: 'players', queue: [] };
  restored.currentPlayer = 0;
  restored.hasDrawnThisTurn = false;

  assert.equal(isBossVaultDrawRequired(restored, 0), true);
  assert.equal(isBossDiscardBlocked(restored), true);
  const event = reclaimBossVault(restored, 0);
  assert.equal(event.cardId, 'guarantee-human');
  assert.equal(restored.hasDrawnThisTurn, true);
  assert.equal(getBossVault(restored, 0), null);
  assert.equal(isBossVaultDrawRequired(restored, 0), false);
  assert.equal(reclaimBossVault(restored, 0), null);
  assert.equal(restored.players[0].hand.filter((card) => card.id === 'guarantee-human').length, 1);
});

test('Garantia fica indisponivel quando os dois Cofres estao ocupados', () => {
  const state = prepareFixedInterestChoice({ occupiedVaults: true });
  assert.equal(state.boss.pendingChoices.length, 0);
  assert.equal(state.boss.danger, 6);
});

test('Penhora ignora As-a-As completo e jogos sem extensao legal', () => {
  const completeRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  for (let seed = 1; seed <= 80; seed += 1) {
    const state = game();
    state.boss.currentIntent = null;
    state.boss.phase = 2;
    state.boss.seed = seed;
    state.teams[0].melds = [completeRanks.map((rank, index) => ({ id: `complete-${index}`, rank, suit: '♠' }))];
    assert.notEqual(selectNextBossIntent(state)?.abilityId, 'pledge');
  }

  let pledge = null;
  for (let seed = 1; seed <= 200 && !pledge; seed += 1) {
    const state = game();
    state.boss.currentIntent = null;
    state.boss.phase = 2;
    state.boss.seed = seed;
    state.teams[0].melds = [
      completeRanks.map((rank, index) => ({ id: `complete-${index}`, rank, suit: '♠' })),
      ['4', '5', '6'].map((rank) => ({ id: `open-${rank}`, rank, suit: '♥' })),
    ];
    const intent = selectNextBossIntent(state);
    if (intent?.abilityId === 'pledge') pledge = intent;
  }
  assert.ok(pledge);
  assert.equal(pledge.payload.meldIndex, 1);
});

test('Exposicao so escolhe carta com jogada legal imediata', () => {
  let exposure = null;
  for (let seed = 1; seed <= 300 && !exposure; seed += 1) {
    const state = dominatrixGame();
    state.boss.seed = seed;
    state.boss.currentIntent = null;
    state.teams[0].melds = [[
      { id: 'meld-4', rank: '4', suit: '♠' },
      { id: 'meld-5', rank: '5', suit: '♠' },
      { id: 'meld-6', rank: '6', suit: '♠' },
    ]];
    state.players[0].hand = [
      { id: 'playable-3', rank: '3', suit: '♠' },
      { id: 'dead-q', rank: 'Q', suit: '♦' },
    ];
    state.players[1].hand = [{ id: 'dead-k', rank: 'K', suit: '♣' }];
    const intent = selectNextBossIntent(state);
    if (intent?.abilityId === 'exposure') exposure = intent;
  }
  assert.ok(exposure);
  assert.equal(exposure.payload.targetPlayerId, 0);
  assert.equal(exposure.payload.cardId, 'playable-3');

  for (let seed = 1; seed <= 80; seed += 1) {
    const state = dominatrixGame();
    state.boss.seed = seed;
    state.boss.currentIntent = null;
    state.players[0].hand = [{ id: 'isolated-q', rank: 'Q', suit: '♦' }];
    state.players[1].hand = [{ id: 'isolated-k', rank: 'K', suit: '♣' }];
    assert.notEqual(selectNextBossIntent(state)?.abilityId, 'exposure');
  }
});

test('tres Correntes controla novos jogos e quatro bloqueia o lixo de forma persistente', () => {
  const state = dominatrixGame();
  state.currentPlayer = 0;
  state.boss.chainsByPlayer[0] = 3;
  assert.equal(canBossCreateMeld(state, 0), false);
  assert.equal(canBossUseMeld(state, 0, 0), true);
  assert.equal(isBossDiscardBlocked(state), false);
  state.boss.chainsByPlayer[0] = 4;
  assert.equal(isBossDiscardBlocked(state), true);
  completeBossPlayerTurn(state, 0);
  assert.equal(getBossChains(state, 0), 4);
});

test('dano remove no maximo uma Corrente por jogador em cada rodada', () => {
  const state = dominatrixGame();
  state.boss.chainsByPlayer[0] = 4;
  const first = applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'limpa', cardsAdded: [] });
  const second = applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 1, oldKind: 'simple', newKind: 'limpa', cardsAdded: [] });
  assert.equal(first.chainsRemoved, 1);
  assert.equal(second.chainsRemoved, 0);
  assert.equal(getBossChains(state, 0), 3);
});

test('Posse acumula progresso entre turnos, aceita duas simultaneas e volta ao sorteio apos liberar', () => {
  const state = dominatrixGame();
  state.boss.phase = 2;
  state.teams[0].melds = [
    ['3', '4', '5'].map((rank) => ({ id: `p0-${rank}`, rank, suit: '♣' })),
    ['7', '8', '9'].map((rank) => ({ id: `p1-${rank}`, rank, suit: '♥' })),
    ['9', '10', 'J'].map((rank) => ({ id: `p2-${rank}`, rank, suit: '♠' })),
  ];
  state.boss.possessions = [
    { id: 'pos-0', teamId: 0, meldIndex: 0, progress: 1, required: 2 },
    { id: 'pos-1', teamId: 0, meldIndex: 1, progress: 0, required: 2 },
  ];
  assert.equal(isBossMeldPossessed(state, 0, 0), true);
  for (let seed = 1; seed <= 80; seed += 1) {
    state.boss.seed = seed;
    state.boss.currentIntent = null;
    assert.notEqual(selectNextBossIntent(state)?.abilityId, 'possession');
  }
  applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'simple', cardsAdded: [{ id: 'release-card', rank: '6', suit: '♣' }] });
  assert.equal(state.boss.possessions.length, 1);
  assert.equal(isBossMeldPossessed(state, 0, 0), false);

  let selectedAgain = false;
  for (let seed = 1; seed <= 300 && !selectedAgain; seed += 1) {
    state.boss.seed = seed;
    state.boss.currentIntent = null;
    selectedAgain = selectNextBossIntent(state)?.abilityId === 'possession';
  }
  assert.equal(selectedAgain, true);
});

test('jogada e recusada quando deixaria somente uma carta presa para o descarte', () => {
  const state = dominatrixGame();
  state.boss.currentIntent = {
    id: 'safe-discard-collar',
    abilityId: 'collar',
    payload: { targetPlayerId: 0, cardId: 'd0-b', cardIds: ['d0-b'] },
  };
  const validation = validateBossMeldPlay(state, 0, [state.players[0].hand[0]]);
  assert.equal(validation.allowed, false);
  assert.equal(validation.message, 'Você precisa conservar uma carta livre para encerrar o turno.');
  assert.equal(state.players[0].hand.length, 2);

  const legacyState = dominatrixGame();
  legacyState.boss.effects = [
    { id: 'choice_lock', playerId: 0, cardId: 'd0-a', expiresAfterTurn: true },
    { id: 'choice_lock', playerId: 0, cardId: 'd0-b', expiresAfterTurn: true },
  ];
  normalizeBossState(legacyState);
  assert.equal(legacyState.boss.effects.some((effect) => effect.cardId === 'd0-a'), true);
  assert.equal(legacyState.boss.effects.some((effect) => effect.cardId === 'd0-b'), false);
  assert.equal(isBossCardBlocked(legacyState, 0, 'd0-b', 'discard'), false);
});

test('Escolha Forcada na fase tres expoe cada compra e cobra somente a carta mantida', () => {
  const state = dominatrixGame();
  state.currentPlayer = 0;
  state.boss.currentIntent = null;
  state.boss.bossFlow = { id: 'phase3-choice-flow', stage: 'choice', queue: [], endsAt: 0 };
  state.boss.awaitingBossTurn = { resumePlayersAfterChoice: true, flowId: 'phase3-choice-flow' };
  state.stock = [{ id: 'phase3-choice-a', rank: '8', suit: '♣' }, { id: 'phase3-choice-b', rank: '9', suit: '♣' }];
  state.boss.pendingChoices = [{ id: 'phase3-choice', playerId: 0, type: 'forced_choice', options: ['draw2', 'chain'], announcedPhase: 3 }];

  const event = resolveBossChoice(state, 0, 'draw2');
  assert.deepEqual(new Set(event.exposedCardIds), new Set(['phase3-choice-a', 'phase3-choice-b']));
  assert.equal(isBossCardBlocked(state, 0, 'phase3-choice-a', 'play'), false);
  assert.equal(isBossCardBlocked(state, 0, 'phase3-choice-a', 'discard'), true);

  state.players[0].hand = state.players[0].hand.filter((card) => card.id !== 'phase3-choice-a');
  completeBossPlayerTurn(state, 0);
  assert.equal(getBossChains(state, 0), 1);
  assert.equal(state.boss.effects.some((effect) => effect.id === 'choice_exposure' && effect.playerId === 0), false);
});

test('cartas causam dano individual uma vez sem aliviar Corrente', () => {
  const state = dominatrixGame();
  state.boss.chainsByPlayer[0] = 2;
  const cards = [
    { id: 'damage-3', rank: '3', suit: '♣' },
    { id: 'damage-8', rank: '8', suit: '♣' },
    { id: 'damage-a', rank: 'A', suit: '♣' },
    { id: 'damage-joker', rank: 'JOKER', suit: 'JOKER', joker: true },
  ];
  const first = applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'simple', cardsAdded: cards });
  assert.equal(first.cardDamage, 50);
  assert.equal(first.canastraDamage, 0);
  assert.equal(first.chainsRemoved, 0);
  assert.equal(getBossChains(state, 0), 2);

  const duplicate = applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'simple', cardsAdded: cards });
  assert.equal(duplicate, null);
  const canastra = applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'limpa', cardsAdded: [] });
  assert.equal(canastra.canastraDamage, 180);
  assert.equal(canastra.chainsRemoved, 1);
});

test('cartas colocadas sob Posse nunca recebem dano retroativo', () => {
  const state = dominatrixGame();
  state.teams[0].melds = [[{ id: 'possession-base', rank: '3', suit: '♥' }]];
  state.boss.possessions = [{ id: 'persistent-possession', teamId: 0, meldIndex: 0, progress: 0, required: 2, progressCardIds: [] }];
  const first = applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'simple', cardsAdded: [{ id: 'possessed-1', rank: 'K', suit: '♥' }] });
  const release = applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'simple', cardsAdded: [{ id: 'possessed-2', rank: 'K', suit: '♥' }] });
  assert.equal(first.damage, 0);
  assert.equal(release.damage, 0);
  assert.equal(state.boss.hp, state.boss.maxHp);
  assert.deepEqual(new Set(state.boss.suppressedDamageCardIds), new Set(['possessed-1', 'possessed-2']));

  const replay = applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'simple', cardsAdded: [{ id: 'possessed-2', rank: 'K', suit: '♥' }] });
  assert.equal(replay, null);
  assert.equal(state.boss.hp, state.boss.maxHp);
});

test('snapshot remove Cofre, Posse e Exposicao invalidos sem criar Corrente', () => {
  const banker = game();
  banker.boss.vaultsByPlayer[0] = { playerId: 0, card: null, requiredDraw: true };
  normalizeBossState(banker);
  assert.equal(getBossVault(banker, 0), null);
  assert.equal(isBossVaultDrawRequired(banker, 0), false);

  const dominatrix = dominatrixGame();
  dominatrix.currentPlayer = 0;
  dominatrix.boss.possessions = [{ id: 'ghost-possession', teamId: 0, meldIndex: 9, progress: 1, required: 2 }];
  dominatrix.boss.currentIntent = {
    id: 'impossible-exposure',
    abilityId: 'exposure',
    duration: 'target_turn',
    payload: { targetPlayerId: 1, cardId: 'd1-a' },
  };
  normalizeBossState(dominatrix);
  assert.equal(dominatrix.boss.possessions.length, 0);
  assert.equal(dominatrix.boss.currentIntent, null);
  assert.equal(getBossChains(dominatrix, 1), 0);
});

test('reload libera fluxo de escolha obsoleto e preserva escolha real', () => {
  const released = dominatrixGame();
  released.boss.bossFlow = { id: 'stale-choice', stage: 'choice', endsAt: 0 };
  released.boss.pendingChoices = [];
  normalizeBossState(released);
  assert.equal(released.boss.bossFlow.stage, 'players');
  assert.equal(canBossPerformCommonAction(released), true);

  const pending = dominatrixGame();
  pending.boss.bossFlow = { id: 'real-choice', stage: 'choice', endsAt: 0 };
  pending.boss.pendingChoices = [{ id: 'persisted', playerId: 0, type: 'forced_choice', options: ['chain'] }];
  normalizeBossState(pending);
  assert.equal(pending.boss.pendingChoices[0].id, 'persisted');
  assert.equal(canBossPerformCommonAction(pending), false);

  const interrupted = dominatrixGame();
  interrupted.boss.currentIntent = null;
  interrupted.boss.bossFlow = {
    id: 'interrupted-ability',
    stage: 'ability',
    queue: [],
    endsAt: 0,
  };
  normalizeBossState(interrupted);
  assert.equal(isBossTurnActive(interrupted), true);
  advanceBossTurn(interrupted, Date.now());
  assert.equal(interrupted.boss.bossFlow.stage, 'players');
  assert.equal(canBossPerformCommonAction(interrupted), true);
});
