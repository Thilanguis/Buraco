import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyBossMeldTransition,
  canBossCreateMeld,
  canBossUseMeld,
  completeBossPlayerTurn,
  createBossState,
  getBossCardEffect,
  getBossNeheleniaPriorities,
  inspectBossAbilityEligibility,
  isBossCardBlocked,
  isBossDiscardBlocked,
  notifyBossCardDiscarded,
  resolveNeheleniaMirroredMeldChoice,
  selectNextBossIntent,
  validateBossMeldPlay,
} from '../js/boss/boss-engine.js';
import { getBossDefinition } from '../js/boss/boss-registry.js';
import { buildBossActionPresentation } from '../js/boss/boss-presentation.js';
import { buildBossDebugScenario } from '../js/boss/boss-debug-scenarios.js';

const card = (id, rank, suit) => ({ id, rank, suit });

function game() {
  return {
    mode: 'boss_nehelenia',
    variant: 'fechado',
    currentPlayer: 0,
    turnNumber: 10,
    stock: Array.from({ length: 50 }, (_, i) => card(`s-${i}`, String((i % 7) + 3), '♦')),
    discard: [card('d-1', 'Q', '♠'), card('d-2', 'K', '♠')],
    players: [
      { id: 0, name: 'Biel', teamId: 0, hand: [card('p0-8', '8', '♣'), card('p0-9', '9', '♣'), card('p0-10', '10', '♣'), card('p0-x', '4', '♦'), card('p0-y', '5', '♦')] },
      { id: 1, name: 'BOT Luana', teamId: 0, hand: [card('p1-8', '8', '♥'), card('p1-9', '9', '♥'), card('p1-10', '10', '♥'), card('p1-x', '4', '♠'), card('p1-y', '5', '♠')] },
    ],
    teams: [
      { id: 0, playerIndexes: [0, 1], melds: [
        ['3','4','5','6','7'].map((r, i) => card(`m0-${i}`, r, '♣')),
        ['3','4','5','6','7'].map((r, i) => card(`m1-${i}`, r, '♥')),
      ] },
      { id: 1, playerIndexes: [], melds: [] },
    ],
    deadChunksTaken: [0, 0],
    deadPiles: [[], []],
    boss: createBossState('nehelenia', 777),
  };
}

function takeLegalCard(state, playerId, meldIndex) {
  const player = state.players.find((entry) => entry.id === playerId);
  const suit = state.teams[0].melds[meldIndex][0].suit;
  const index = player.hand.findIndex((entry) => entry.suit === suit && ['8', '9', '10'].includes(String(entry.rank)));
  assert.ok(index >= 0, 'carta legal para o jogo refletido');
  return { player, index, card: player.hand[index] };
}

function feed(state, playerId, meldIndex, count = 1) {
  const player = state.players.find((entry) => entry.id === playerId);
  const suit = state.teams[0].melds[meldIndex][0].suit;
  const picked = player.hand.filter((entry) => entry.suit === suit && ['8', '9', '10'].includes(String(entry.rank))).slice(0, count);
  assert.equal(picked.length, count, 'cartas legais suficientes');
  player.hand = player.hand.filter((entry) => !picked.some((c) => c.id === entry.id));
  state.teams[0].melds[meldIndex].push(...picked);
  applyBossMeldTransition(state, { teamId: 0, playerId, meldIndex, oldKind: 'simple', newKind: 'simple', cardsAdded: picked });
  return picked;
}

test('Nehelenia usa Mundo do Espelho contínuo sobre cinco espelhos visuais e rotação de mesa/ilusão', () => {
  const definition = getBossDefinition('nehelenia');
  assert.equal(definition.maxHp, 2400);
  assert.equal(definition.maxDanger, 5);
  assert.deepEqual(definition.abilities.map((ability) => ability.id), [
    'mirrored_meld', 'follow_reflection', 'discard_mirror', 'mirror_prison', 'eternal_nightmare',
    'tiger_link', 'tiger_prey', 'hawk_suit', 'hawk_watch', 'fish_marked_card', 'fish_inverted',
  ]);
  assert.deepEqual(definition.abilities.map((ability) => ability.weight), [5, 5, 4, 2, 5, 4, 3, 3, 3, 3, 3]);
  assert.deepEqual(definition.abilities.find((ability) => ability.id === 'mirror_prison').phases, [1, 2, 3]);
  assert.equal(definition.attendants.tiger.portrait, 'assets/images/nehelenia-tigers-eye.png');
  assert.equal(definition.attendants.hawk.portrait, 'assets/images/nehelenia-hawks-eye.png');
  assert.equal(definition.attendants.fish.portrait, 'assets/images/nehelenia-fish-eye.png');
});



test('Prisão no Espelho entra na rotação, prioriza o mais pressionado e só aparece com resgate legal', () => {
  const state = game();
  state.boss.dreamMirrorMarksMigrated = true;
  state.boss.dreamMirrorMarksByPlayer = { 0: 1.4, 1: 0.6 };
  state.boss.danger = 2;
  const eligibility = inspectBossAbilityEligibility(state, 'mirror_prison');
  assert.equal(eligibility.eligible, true);
  assert.equal(eligibility.payload.trappedPlayerId, 0, 'deve prender quem tem mais pressão');
  assert.equal(eligibility.payload.rescuerPlayerId, 1);
  assert.equal(eligibility.payload.failureMirrorPoints, 8);

  state.teams[0].melds = [];
  assert.equal(inspectBossAbilityEligibility(state, 'mirror_prison').eligible, false, 'sem jogo alimentável a Prisão sai do pool');
});

test('Prisão no Espelho: libertar não altera o Mundo; falhar aplica +8/+10/+12 conforme a fase', () => {
  for (const [phase, expectedPoints] of [[1, 8], [2, 10], [3, 12]]) {
    const success = game();
    success.boss.phase = phase;
    success.boss.phaseModel = 'progress-v1';
    success.boss.dreamMirrorMarksMigrated = true;
    success.boss.dreamMirrorMarksByPlayer = { 0: 1.2, 1: 0.4 };
    success.boss.danger = 1.6;
    const successIntent = selectNextBossIntent(success, { debug: true, forcedAbilityId: 'mirror_prison' });
    const beforeSuccess = success.boss.danger;
    feed(success, successIntent.payload.rescuerPlayerId, successIntent.payload.meldIndex, 1);
    completeBossPlayerTurn(success, 0);
    completeBossPlayerTurn(success, 1);
    assert.ok(Math.abs(success.boss.danger - beforeSuccess) < 1e-9, `sucesso F${phase} não deve alterar o Mundo`);
    assert.equal(success.boss.lastEvent?.success, true);

    const failure = game();
    failure.boss.phase = phase;
    failure.boss.phaseModel = 'progress-v1';
    failure.boss.dreamMirrorMarksMigrated = true;
    failure.boss.dreamMirrorMarksByPlayer = { 0: 1.2, 1: 0.4 };
    failure.boss.danger = 1.6;
    const failureIntent = selectNextBossIntent(failure, { debug: true, forcedAbilityId: 'mirror_prison' });
    const beforeFailure = failure.boss.danger;
    completeBossPlayerTurn(failure, 0);
    completeBossPlayerTurn(failure, 1);
    const expectedDanger = beforeFailure + expectedPoints / 20;
    assert.ok(Math.abs(failure.boss.danger - expectedDanger) < 1e-9, `falha F${phase} deve acrescentar ${expectedPoints}/100`);
    assert.equal(failure.boss.lastEvent?.success, false);
    assert.equal(failure.boss.lastEvent?.failureMirrorPoints, expectedPoints);
    assert.equal(failureIntent.payload.failureMirrorPoints, expectedPoints);
  }
});

test('Jogo Espelhado falso manda a carta ao fundo e Desorienta', () => {
  const state = game();
  const intent = selectNextBossIntent(state, { debug: true, forcedAbilityId: 'mirrored_meld' });
  const { player, card: chosen } = takeLegalCard(state, intent.payload.targetPlayerId, intent.payload.meldIndex);
  const fakeSlot = intent.payload.realSlot === 'left' ? 'right' : 'left';
  const beforeStock = state.stock.length;
  const event = resolveNeheleniaMirroredMeldChoice(state, player.id, fakeSlot, chosen.id);
  assert.equal(event.allowed, true);
  assert.equal(event.real, false);
  assert.equal(state.stock.length, beforeStock + 1);
  assert.equal(state.stock[0].id, chosen.id, 'stock.pop compra do topo, portanto unshift é o fundo');
  assert.ok(state.boss.effects.some((effect) => effect.id === 'nehelenia_disoriented' && effect.playerId === player.id));
  assert.match(validateBossMeldPlay(state, player.id, [player.hand[0]]).message, /Desorientado/);
});

test('Jogo Espelhado verdadeiro libera a jogada real', () => {
  const state = game();
  const intent = selectNextBossIntent(state, { debug: true, forcedAbilityId: 'mirrored_meld' });
  const { player, card: chosen } = takeLegalCard(state, intent.payload.targetPlayerId, intent.payload.meldIndex);
  const result = resolveNeheleniaMirroredMeldChoice(state, player.id, intent.payload.realSlot, chosen.id);
  assert.equal(result.real, true);
  feed(state, player.id, intent.payload.meldIndex, 1);
  assert.equal(state.boss.currentIntent.payload.fed, true);
  assert.match(buildBossActionPresentation(state).progress, /verdadeiro/i);
});

test('Siga o Reflexo fecha o padrão pelo turno inteiro e não bloqueia excesso', () => {
  const state = game();
  const intent = selectNextBossIntent(state, { debug: true, forcedAbilityId: 'follow_reflection' });
  feed(state, 0, 0, 2);
  feed(state, 0, 0, 1);
  assert.equal(intent.payload.firstPlayedCount, 3);
  assert.equal(intent.payload.patternCount, null);
  completeBossPlayerTurn(state, 0);
  assert.equal(intent.payload.patternLocked, true);
  assert.equal(intent.payload.patternCount, 3);

  const second = state.players[1];
  const freePlay = validateBossMeldPlay(state, 1, second.hand.slice(0, 4));
  assert.equal(freePlay.allowed, true, 'Siga o Reflexo cobra no fim; não bloqueia excesso');
});

test('Siga o Reflexo considera zero um padrão válido e pune se o segundo baixar algo', () => {
  const state = game();
  const intent = selectNextBossIntent(state, { debug: true, forcedAbilityId: 'follow_reflection' });
  completeBossPlayerTurn(state, 0);
  assert.equal(intent.payload.patternCount, 0);
  feed(state, 1, 1, 1);
  state.turnNumber += 1;
  completeBossPlayerTurn(state, 1);
  assert.equal(state.boss.danger, 0.8, 'falhar em Siga o Reflexo acrescenta 16/100');
});

test('Espelho do Lixo cria dois reflexos idênticos com escolha 50/50', () => {
  const state = game();
  state.boss.phase = 2;
  const intent = selectNextBossIntent(state, { debug: true, forcedAbilityId: 'discard_mirror' });
  assert.equal(intent.payload.reflections.length, 2);
  assert.equal(new Set(intent.payload.reflections.map((entry) => entry.label)).size, 1);
  assert.ok(intent.payload.reflections.some((entry) => entry.option === intent.payload.correctOption));
});

test('Pesadelo Eterno gera original + dois reflexos idênticos para embaralhamento', () => {
  const state = game();
  state.boss.phase = 3;
  const intent = selectNextBossIntent(state, { debug: true, forcedAbilityId: 'eternal_nightmare' });
  assert.equal(intent.payload.reflections.length, 3);
  assert.equal(new Set(intent.payload.reflections.map((entry) => entry.label)).size, 1);
  assert.equal(intent.payload.reflections.filter((entry) => entry.real).length, 1);
  assert.ok(intent.payload.correctOption);
});

test('Mundo do Espelho chega a 100 e Canastra Limpa recupera 4 antes disso', () => {
  const state = game();
  state.boss.dreamMirrorMarksMigrated = true;
  state.boss.dreamMirrorMarksByPlayer = { 0: 2, 1: 2 };
  state.boss.danger = 4; // 80/100

  const clean = card('clean-extra', '8', '♣');
  state.teams[0].melds[0].push(clean);
  const relief = applyBossMeldTransition(state, { teamId: 0, playerId: 0, meldIndex: 0, oldKind: 'simple', newKind: 'limpa', cardsAdded: [clean] });
  assert.ok(Math.abs(state.boss.danger - 3.8) < 1e-9, 'Limpa deve reduzir 4/100');
  assert.ok(Math.abs(relief.mirrorFragmentRelief - 0.2) < 1e-9);

  // 84/100 + falha de Siga o Reflexo (+16) = 100/100.
  state.boss.dreamMirrorMarksByPlayer = { 0: 2.1, 1: 2.1 };
  state.boss.danger = 4.2;
  state.boss.result = null;
  state.boss.currentIntent = null;
  state.boss.playersActedThisRound = [];
  const intent = selectNextBossIntent(state, { debug: true, forcedAbilityId: 'follow_reflection' });
  completeBossPlayerTurn(state, intent.payload.firstPlayerId);
  const second = intent.payload.secondPlayerId;
  const secondMeld = second === 1 ? 1 : 0;
  feed(state, second, secondMeld, 1);
  state.turnNumber += 1;
  completeBossPlayerTurn(state, second);
  assert.equal(state.boss.danger, 5);
  assert.equal(state.boss.result?.reason, 'five_dream_mirrors');
});


test('Laço do Tigre não cura nem bloqueia; o lado ignorado vira Garra persistente que anula o próximo dano individual', () => {
  const state = game();
  state.boss.hp = 2200;
  const intent = selectNextBossIntent(state, { debug: true, forcedAbilityId: 'tiger_link' });
  assert.equal(intent.payload.targets.length, 2);
  const [first, second] = intent.payload.targets;
  const firstPlayer = first.eligiblePlayerIds[0];
  feed(state, firstPlayer, first.meldIndex, 1);
  completeBossPlayerTurn(state, 0);
  state.turnNumber += 1;
  completeBossPlayerTurn(state, 1);
  assert.equal(state.boss.hp, 2190, 'Tiger não cura; só ficou o dano normal da primeira carta');
  assert.equal(state.boss.lastEvent?.abilityId, 'tiger_link');
  assert.equal(state.boss.lastEvent?.success, false);
  assert.equal(state.boss.lastEvent?.healAmount, undefined);
  const claw = state.boss.effects.find((effect) => effect.id === 'nehelenia_tiger_claw' && effect.meldId === second.meldId);
  assert.ok(claw, 'o lado ignorado deve continuar sob as garras');
  assert.equal(canBossUseMeld(state, 0, second.meldIndex), true, 'a garra não bloqueia o jogo');
  assert.equal(canBossUseMeld(state, 1, second.meldIndex), true, 'a garra não bloqueia o jogo para o parceiro');

  const breaker = second.eligiblePlayerIds[0];
  const hpBeforeBreak = state.boss.hp;
  feed(state, breaker, second.meldIndex, 1);
  assert.equal(state.boss.hp, hpBeforeBreak, 'a carta que rompe a garra perde o dano individual');
  assert.equal(state.boss.effects.some((effect) => effect.id === 'nehelenia_tiger_claw' && effect.meldId === second.meldId), false);
});

test('Presa Marcada persiste até ser alimentada e impede o alvo de alimentar outros jogos existentes', () => {
  const state = game();
  const intent = selectNextBossIntent(state, { debug: true, forcedAbilityId: 'tiger_prey' });
  const target = state.players.find((player) => player.id === intent.payload.targetPlayerId);
  const otherIndex = intent.payload.meldIndex === 0 ? 1 : 0;
  assert.equal(canBossUseMeld(state, target.id, intent.payload.meldIndex), true);
  assert.equal(canBossUseMeld(state, target.id, otherIndex), false, 'a presa deve ser a única rota existente liberada');

  completeBossPlayerTurn(state, target.id);
  const prey = state.boss.effects.find((effect) => effect.id === 'nehelenia_tiger_prey' && effect.playerId === target.id);
  assert.ok(prey, 'ignorar a presa deve deixá-la ativa entre turnos');
  assert.equal(canBossUseMeld(state, target.id, otherIndex), false);
  feed(state, target.id, intent.payload.meldIndex, 1);
  assert.equal(state.boss.effects.some((effect) => effect.id === 'nehelenia_tiger_prey' && effect.playerId === target.id), false);
  assert.equal(canBossUseMeld(state, target.id, otherIndex), true, 'alimentar a presa libera as outras rotas');
});

test('Olho do Falcão não cura; descarte errado fica vigiado no topo do lixo até outro descarte cobri-lo', () => {
  const successState = game();
  successState.boss.hp = 2200;
  const successIntent = selectNextBossIntent(successState, { debug: true, forcedAbilityId: 'hawk_suit' });
  const successTarget = successState.players.find((player) => player.id === successIntent.payload.targetPlayerId);
  const index = successTarget.hand.findIndex((card) => !card.joker && card.suit === successIntent.payload.suit);
  assert.ok(index >= 0);
  const [discarded] = successTarget.hand.splice(index, 1);
  successState.discard.push(discarded);
  notifyBossCardDiscarded(successState, successTarget.id, discarded);
  completeBossPlayerTurn(successState, successTarget.id);
  assert.equal(successState.boss.hp, 2200);
  assert.equal(successState.boss.lastEvent?.success, true);

  const failState = game();
  failState.boss.hp = 2200;
  const failIntent = selectNextBossIntent(failState, { debug: true, forcedAbilityId: 'hawk_suit' });
  const failTarget = failState.players.find((player) => player.id === failIntent.payload.targetPlayerId);
  const wrongIndex = failTarget.hand.findIndex((card) => !card.joker && card.suit !== failIntent.payload.suit);
  assert.ok(wrongIndex >= 0);
  const [wrongDiscard] = failTarget.hand.splice(wrongIndex, 1);
  failState.discard.push(wrongDiscard);
  notifyBossCardDiscarded(failState, failTarget.id, wrongDiscard);
  completeBossPlayerTurn(failState, failTarget.id);
  assert.equal(failState.boss.hp, 2200, 'Hawk não cura Nehelenia');
  assert.ok(failState.boss.effects.some((effect) => effect.id === 'nehelenia_hawk_guarded_discard' && effect.cardId === wrongDiscard.id));
  const partner = failState.players.find((player) => player.id !== failTarget.id);
  failState.currentPlayer = failState.players.findIndex((player) => player.id === partner.id);
  assert.equal(isBossDiscardBlocked(failState), true, 'o parceiro não pode recolher o lixo enquanto a carta vigiada está no topo');
  const [coverCard] = partner.hand.splice(0, 1);
  failState.discard.push(coverCard);
  notifyBossCardDiscarded(failState, partner.id, coverCard);
  assert.equal(isBossDiscardBlocked(failState), false, 'outro descarte cobre a carta vigiada e libera o lixo');
});

test('Vigilância bloqueia só o jogo marcado e mantém outra rota disponível', () => {
  const state = game();
  state.boss.phase = 2;
  state.boss.phaseModel = 'progress-v1';
  state.players[0].hand.push(card('p0-heart8', '8', '♥'));
  const intent = selectNextBossIntent(state, { debug: true, forcedAbilityId: 'hawk_watch' });
  const targetId = intent.payload.targetPlayerId;
  assert.equal(canBossUseMeld(state, targetId, intent.payload.meldIndex), false);
  const otherIndex = intent.payload.meldIndex === 0 ? 1 : 0;
  assert.equal(canBossUseMeld(state, targetId, otherIndex), true);
});

test('Mão no Espelho não cura; falhar cria Reflexo Morto que só pode sair pelo descarte', () => {
  const successState = game();
  successState.boss.hp = 2200;
  const successIntent = selectNextBossIntent(successState, { debug: true, forcedAbilityId: 'fish_marked_card' });
  const successTarget = successState.players.find((player) => player.id === successIntent.payload.targetPlayerId);
  assert.equal(getBossCardEffect(successState, successTarget.id, successIntent.payload.cardId), 'nehelenia-fish-mark');
  const index = successTarget.hand.findIndex((card) => card.id === successIntent.payload.cardId);
  const [discarded] = successTarget.hand.splice(index, 1);
  successState.discard.push(discarded);
  notifyBossCardDiscarded(successState, successTarget.id, discarded);
  completeBossPlayerTurn(successState, successTarget.id);
  assert.equal(successState.boss.hp, 2200);
  assert.equal(successState.boss.lastEvent?.success, true);

  const failState = game();
  failState.boss.hp = 2200;
  const failIntent = selectNextBossIntent(failState, { debug: true, forcedAbilityId: 'fish_marked_card' });
  const failTarget = failState.players.find((player) => player.id === failIntent.payload.targetPlayerId);
  completeBossPlayerTurn(failState, failTarget.id);
  assert.equal(failState.boss.hp, 2200, 'Fish Eye não cura Nehelenia');
  assert.equal(getBossCardEffect(failState, failTarget.id, failIntent.payload.cardId), 'nehelenia-fish-dead');
  assert.equal(isBossCardBlocked(failState, failTarget.id, failIntent.payload.cardId, 'play'), true);
  assert.equal(isBossCardBlocked(failState, failTarget.id, failIntent.payload.cardId, 'discard'), false, 'Reflexo Morto precisa poder ser descartado');
  const deadIndex = failTarget.hand.findIndex((card) => card.id === failIntent.payload.cardId);
  const [deadCard] = failTarget.hand.splice(deadIndex, 1);
  failState.discard.push(deadCard);
  notifyBossCardDiscarded(failState, failTarget.id, deadCard);
  assert.equal(failState.boss.effects.some((effect) => effect.id === 'nehelenia_fish_dead_card' && effect.cardId === deadCard.id), false);
});

test('Reflexo Invertido permanece entre turnos até alimentar um jogo existente', () => {
  const state = game();
  state.boss.phase = 2;
  state.boss.phaseModel = 'progress-v1';
  const intent = selectNextBossIntent(state, { debug: true, forcedAbilityId: 'fish_inverted' });
  const targetId = intent.payload.targetPlayerId;
  assert.equal(canBossCreateMeld(state, targetId), false);

  completeBossPlayerTurn(state, targetId);
  assert.equal(state.boss.currentIntent, null, 'a habilidade sai da rotação ativa, mas deixa o efeito persistente');
  assert.ok(state.boss.effects.some((effect) => effect.id === 'nehelenia_inverted_reflection' && effect.playerId === targetId));
  assert.equal(canBossCreateMeld(state, targetId), false);

  state.turnNumber += 2;
  const target = state.players.find((player) => player.id === targetId);
  const candidateMeld = state.teams[0].melds.findIndex((meld) => target.hand.some((card) => isFinite(card.rank) && card.suit === meld[0].suit && ['8', '9', '10'].includes(String(card.rank))));
  assert.ok(candidateMeld >= 0);
  feed(state, targetId, candidateMeld, 1);
  assert.equal(state.boss.effects.some((effect) => effect.id === 'nehelenia_inverted_reflection' && effect.playerId === targetId), false);
  assert.equal(canBossCreateMeld(state, targetId), true);
});

test('Combo Tiger + Fish: Presa persistente e Reflexo Invertido convergem para a mesma jogada', () => {
  const state = game();
  state.boss.phase = 2;
  state.boss.phaseModel = 'progress-v1';
  state.boss.effects.push({
    id: 'nehelenia_tiger_prey', attendant: 'tiger', playerId: 0, teamId: 0,
    meldId: state.teams[0].melds[0].bossMeldId || 'boss-meld-0-0', meldIndex: 0,
  });
  // resolveBossMeldId ainda não foi materializado; deixa o índice como fallback autoritativo.
  const intent = selectNextBossIntent(state, { debug: true, forcedAbilityId: 'fish_inverted' });
  assert.equal(intent.payload.targetPlayerId, 0, 'Fish deve preferir o jogador que já está sob a Presa do Tiger');
  assert.equal(canBossCreateMeld(state, 0), false);
  assert.equal(canBossUseMeld(state, 0, 1), false, 'Tiger impede alimentar outro jogo existente');
  feed(state, 0, 0, 1);
  assert.equal(state.boss.effects.some((effect) => effect.id === 'nehelenia_tiger_prey' && effect.playerId === 0), false);
  assert.equal(intent.payload.fedExisting, true);
  assert.equal(canBossCreateMeld(state, 0), true, 'a mesma jogada rompe Tiger e Fish');
});

test('Combo Tiger + Hawk: Vigilância pode fechar temporariamente a própria Presa marcada', () => {
  const state = game();
  state.boss.phase = 2;
  state.boss.phaseModel = 'progress-v1';
  state.players[0].hand.push(card('p0-heart8-combo', '8', '♥'));
  state.boss.effects.push({ id: 'nehelenia_tiger_prey', attendant: 'tiger', playerId: 0, teamId: 0, meldIndex: 0 });
  const intent = selectNextBossIntent(state, { debug: true, forcedAbilityId: 'hawk_watch' });
  assert.equal(intent.payload.targetPlayerId, 0);
  assert.equal(intent.payload.meldIndex, 0, 'Hawk deve mirar a Presa persistente quando o combo é possível');
  assert.equal(intent.payload.comboWithTiger, true);
  assert.equal(canBossUseMeld(state, 0, 0), false, 'Hawk fecha a Presa neste turno');
  assert.equal(canBossUseMeld(state, 0, 1), false, 'Tiger continua impedindo as outras rotas existentes');
});

test('Combo Fish + Hawk: se houver Reflexo Morto compatível, Olho do Falcão usa o mesmo naipe', () => {
  const state = game();
  const deadCard = state.players[0].hand.find((card) => card.id === 'p0-x');
  assert.ok(deadCard);
  state.boss.effects.push({ id: 'nehelenia_fish_dead_card', attendant: 'fish', playerId: 0, cardId: deadCard.id });
  const intent = selectNextBossIntent(state, { debug: true, forcedAbilityId: 'hawk_suit' });
  assert.equal(intent.payload.targetPlayerId, 0);
  assert.equal(intent.payload.suit, deadCard.suit);
  assert.equal(intent.payload.comboWithFish, true);
});

test('Laboratório das habilidades novas da Nehelenia prefere Biel no modo interativo automático', () => {
  for (const abilityId of ['tiger_prey', 'hawk_suit', 'hawk_watch', 'fish_marked_card', 'fish_inverted']) {
    const scenario = buildBossDebugScenario(null, { bossId: 'nehelenia', abilityId, phase: 'auto', variant: 'interactive', target: 'auto' });
    assert.equal(scenario.targetPlayerId, 0, `${abilityId} deve marcar Biel por padrão no Laboratório`);
    assert.equal(scenario.state.debugScenario.target, 'auto');
    assert.equal(scenario.state.debugScenario.effectiveTarget, 'human');
  }
});

test('BOT da Nehelenia troca o foco do Laço do Tigre depois de alimentar um dos jogos', () => {
  const state = game();
  const intent = selectNextBossIntent(state, { debug: true, forcedAbilityId: 'tiger_link' });
  const [first, second] = intent.payload.targets;
  const sharedPlayerId = (first.eligiblePlayerIds || []).find((id) => (second.eligiblePlayerIds || []).includes(id));
  const playerId = sharedPlayerId ?? first.eligiblePlayerIds[0];
  const before = getBossNeheleniaPriorities(state, playerId);
  assert.ok(before.meldIndexes.includes(first.meldIndex));

  intent.payload.fedMeldIds = [first.meldId];
  const after = getBossNeheleniaPriorities(state, playerId);
  assert.equal(after.meldIndexes.includes(first.meldIndex), false, 'não deve continuar insistindo no lado já alimentado');
  if ((second.eligiblePlayerIds || []).includes(playerId)) assert.ok(after.meldIndexes.includes(second.meldIndex));
});

test('BOT da Nehelenia recebe instruções concretas para Hawk, Fish e Siga o Reflexo', () => {
  const hawk = game();
  const hawkIntent = selectNextBossIntent(hawk, { debug: true, forcedAbilityId: 'hawk_suit' });
  const hawkPlan = getBossNeheleniaPriorities(hawk, hawkIntent.payload.targetPlayerId);
  assert.equal(hawkPlan.discardSuit, hawkIntent.payload.suit);

  const fish = game();
  const fishIntent = selectNextBossIntent(fish, { debug: true, forcedAbilityId: 'fish_marked_card' });
  const fishPlan = getBossNeheleniaPriorities(fish, fishIntent.payload.targetPlayerId);
  assert.deepEqual(fishPlan.markedCardIds, [fishIntent.payload.cardId]);
  assert.deepEqual(fishPlan.preferredDiscardCardIds, [fishIntent.payload.cardId]);

  const follow = game();
  const followIntent = selectNextBossIntent(follow, { debug: true, forcedAbilityId: 'follow_reflection' });
  feed(follow, followIntent.payload.firstPlayerId, 0, 2);
  completeBossPlayerTurn(follow, followIntent.payload.firstPlayerId);
  const followPlan = getBossNeheleniaPriorities(follow, followIntent.payload.secondPlayerId);
  assert.equal(followPlan.exactPlayCount, 2);
  assert.equal(followPlan.exactPlayedCount, 0);
});

test('BOT reconhece os efeitos persistentes dos capangas sem trapacear', () => {
  const tiger = game();
  tiger.boss.effects.push({ id: 'nehelenia_tiger_prey', attendant: 'tiger', playerId: 0, teamId: 0, meldIndex: 0 });
  const tigerPlan = getBossNeheleniaPriorities(tiger, 0);
  assert.equal(tigerPlan.strictMeldTargets, true);
  assert.ok(tigerPlan.meldIndexes.includes(0));

  const claw = game();
  claw.boss.effects.push({ id: 'nehelenia_tiger_claw', attendant: 'tiger', teamId: 0, meldIndex: 0 });
  const clawPlan = getBossNeheleniaPriorities(claw, 0);
  assert.ok(clawPlan.meldIndexes.includes(0));
  assert.equal(clawPlan.strictMeldTargets, false);

  const fish = game();
  fish.boss.effects.push({ id: 'nehelenia_fish_dead_card', attendant: 'fish', playerId: 0, cardId: 'p0-x' });
  const fishPlan = getBossNeheleniaPriorities(fish, 0);
  assert.ok(fishPlan.preferredDiscardCardIds.includes('p0-x'));
  assert.ok(fishPlan.avoidCardIds.includes('p0-x'));
});
