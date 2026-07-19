import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildBossActionPresentation, buildBossFinalPresentation, buildBossResultPresentation } from '../js/boss/boss-presentation.js';

const baseState = (id = 'banker') => ({
  players: [
    { id: 0, name: 'Biel', hand: [{ id: 'c1', rank: 'A', suit: '♠' }, { id: 'c2', rank: '7', suit: '♦' }] },
    { id: 1, name: 'BOT Luana', hand: [{ id: 'c3', rank: 'Q', suit: '♥' }] },
  ],
  boss: { id, phase: 2, roundNumber: 3, chainsByPlayer: { 0: 2, 1: 1 }, currentIntent: null, lastEvent: null },
});

test('resultado recente nunca usa currentIntent e habilidades diferentes nao se misturam', () => {
  const state = baseState();
  state.boss.currentIntent = { abilityId: 'credit_block', name: 'Bloqueio de Credito', description: 'NAO PODE VAZAR', payload: {} };
  state.boss.lastEvent = {
    type: 'bossAbility',
    abilityId: 'fixed_interest',
    name: 'Juros Fixos',
    outcome: 'Juros aplicados: +6 de Divida.',
    dangerDelta: 6,
    presentation: { details: ['Cobranca inevitavel'] },
  };
  const result = buildBossResultPresentation(state.boss.lastEvent);
  assert.equal(result.name, 'Juros Fixos');
  assert.match(result.description, /\+6/);
  assert.doesNotMatch(JSON.stringify(result), /Bloqueio|NAO PODE VAZAR/);
});

test('primeira habilidade possui dialogo tematico e objetivo durante ability', () => {
  const state = baseState('dominadora');
  state.boss.bossFlow = { stage: 'ability' };
  state.boss.currentIntent = { abilityId: 'collar', name: 'Coleira', description: 'A carta fica presa.', payload: { targetPlayerId: 0, cardId: 'c1' } };
  const action = buildBossActionPresentation(state);
  assert.equal(action.name, 'Coleira');
  assert.ok(action.speech);
  assert.match(action.instruction, /Biel|carta|turno/i);
});

test('balao de habilidade ignora lastEvent e resultado anterior nao repete fala tematica', () => {
  const state = baseState();
  state.boss.bossFlow = { stage: 'ability' };
  state.boss.currentIntent = { abilityId: 'fixed_interest', name: 'Juros Fixos', description: 'Nova cobranca.', payload: { amount: 6 } };
  state.boss.lastEvent = { type: 'bossAbility', abilityId: 'credit_block', name: 'Bloqueio antigo', outcome: 'Bloqueio encerrado.', presentation: { speech: 'FALA ANTIGA', details: [] } };
  const action = buildBossActionPresentation(state);
  const result = buildBossResultPresentation(state.boss.lastEvent);
  assert.doesNotMatch(JSON.stringify(action), /FALA ANTIGA|Bloqueio antigo/);
  assert.equal(result.speech, '');
});

test('acao atual nunca usa lastEvent', () => {
  const state = baseState();
  state.boss.currentIntent = { abilityId: 'credit_block', name: 'Bloqueio de Credito', description: 'Lixo bloqueado.', payload: {} };
  state.boss.lastEvent = { type: 'bossAbility', abilityId: 'fixed_interest', name: 'JUROS ANTIGOS', outcome: 'RESULTADO ANTIGO' };
  const action = buildBossActionPresentation(state);
  assert.equal(action.name, 'Bloqueio de Credito');
  assert.match(action.details.join(' '), /Lixo bloqueado agora/);
  assert.doesNotMatch(JSON.stringify(action), /JUROS ANTIGOS|RESULTADO ANTIGO/);
});

test('Auditoria mostra naipe, valores e progresso', () => {
  const state = baseState();
  state.boss.phase = 3;
  state.boss.currentIntent = { abilityId: 'suit_audit', name: 'Auditoria de Naipe', description: 'Auditoria ativa.', payload: { suitLabel: 'Copas', progress: 2, required: 4 } };
  const text = buildBossActionPresentation(state).details.join(' | ');
  assert.match(text, /Copas/);
  assert.match(text, /2\/4/);
  assert.match(text, /-5/);
  assert.match(text, /\+12/);
});

test('Juros Compostos mostra cartas e estimativa calculada agora', () => {
  const state = baseState();
  state.boss.currentIntent = { abilityId: 'compound_interest', name: 'Juros Compostos', description: 'Variavel.', payload: {} };
  const text = buildBossActionPresentation(state).details.join(' | ');
  assert.match(text, /Cartas nas maos agora: 3/);
  assert.match(text, /Estimativa atual: \+4/);
});

test('efeitos da Dominadora mostram alvo e consequencia', () => {
  const state = baseState('dominadora');
  state.boss.currentIntent = { abilityId: 'collar', name: 'Coleira', description: 'Restricao.', payload: { targetPlayerId: 0, cardId: 'c1' } };
  const text = buildBossActionPresentation(state).details.join(' | ');
  assert.match(text, /Alvo: Biel/);
  assert.match(text, /Carta: A♠/);
  assert.match(text, /nao pode jogar nem descartar/i);
  assert.match(text, /fim do turno/);
  assert.doesNotMatch(text, /Jogo alvo|Correntes|nao se aplica/i);
  const compact = buildBossActionPresentation(state);
  assert.doesNotMatch([compact.instruction, compact.progress, compact.consequence].join(' '), /Nao se aplica/i);
});

test('Escolha Forcada e imediata, mas as demais escolhas continuam preparadas', () => {
  const state = baseState('dominadora');
  state.boss.pendingChoices = [];
  state.boss.currentIntent = { abilityId: 'forced_choice', name: 'Escolha Forcada', payload: { targetPlayerId: 0 } };
  const immediate = buildBossActionPresentation(state);
  assert.equal(immediate.category, 'Escolha imediata');
  assert.match(immediate.instruction, /Biel devera escolher agora/i);

  state.boss.currentIntent = { abilityId: 'break_will', name: 'Quebra de Vontade', payload: { targetPlayerId: 0 } };
  const prepared = buildBossActionPresentation(state);
  assert.equal(prepared.category, 'Escolha preparada');
  assert.match(prepared.instruction, /Ao final da rodada/i);

  state.boss.currentIntent = null;
  state.boss.pendingChoices = [{ id: 'choice-1', type: 'forced_choice', playerId: 0, options: ['draw2', 'chain'] }];
  const mandatory = buildBossActionPresentation(state);
  assert.equal(mandatory.category, 'Escolha obrigatoria agora');
  assert.match(mandatory.instruction, /Biel precisa decidir/i);
});


test('Etiqueta resolvida nao reaparece sobre a habilidade seguinte', () => {
  const state = baseState('dominadora');
  state.boss.activeOrders = [{
    id: 'etiquette_old',
    type: 'discard_suit',
    targetPlayerId: 0,
    suit: '♠',
    suitLabel: 'Espadas',
    status: 'obeyed',
    resolvedEventId: 'order_old_obeyed',
  }];
  state.boss.eventLog = [
    {
      type: 'dominatrixOrder',
      actionId: 'order_old_obeyed',
      orderId: 'etiquette_old',
      orderType: 'discard_suit',
      status: 'obeyed',
    },
    {
      type: 'bossAbility',
      actionId: 'boss_new_hands_tied',
      abilityId: 'hands_tied',
      name: 'Maos Atadas',
    },
  ];
  state.boss.lastEvent = state.boss.eventLog.at(-1);
  state.boss.currentIntent = null;
  state.boss.bossFlow = {
    stage: 'result',
    eventActionId: 'boss_new_hands_tied',
  };

  const action = buildBossActionPresentation(state);
  assert.notEqual(action.name, 'Etiqueta de Ferro');
  assert.doesNotMatch(JSON.stringify(action), /cumpriu a Etiqueta|0\/1|1\/1/);
});

test('Etiqueta resolvida continua visivel somente no proprio ciclo', () => {
  const state = baseState('dominadora');
  state.boss.activeOrders = [{
    id: 'etiquette_intent_1',
    type: 'discard_suit',
    targetPlayerId: 0,
    suit: '♠',
    suitLabel: 'Espadas',
    status: 'obeyed',
  }];
  state.boss.currentIntent = {
    id: 'intent_1',
    abilityId: 'iron_etiquette',
    name: 'Etiqueta de Ferro',
    payload: { targetPlayerId: 0, suit: '♠', suitLabel: 'Espadas' },
  };
  state.boss.bossFlow = { stage: 'players' };

  const action = buildBossActionPresentation(state);
  assert.equal(action.name, 'Etiqueta de Ferro');
  assert.match(action.progress, /1\/1.*Conclu[ií]do/i);
});

test('Banqueiro mostra progresso e conclusao da Auditoria no quadro principal', () => {
  const state = baseState('banker');
  state.boss.currentIntent = {
    id: 'audit_1',
    abilityId: 'suit_audit',
    name: 'Auditoria de Naipe',
    payload: { suitLabel: 'Copas', progress: 0, required: 3, successDelta: -5, failureDelta: 10 },
  };

  assert.match(buildBossActionPresentation(state).progress, /0\/3.*Pendente/i);
  state.boss.currentIntent.payload.progress = 3;
  assert.match(buildBossActionPresentation(state).progress, /3\/3.*Conclu[ií]do/i);
});

test('Tarifa do Banqueiro informa continuidade sem transformar a restricao em objetivo', () => {
  const state = baseState('banker');
  state.boss.currentIntent = {
    id: 'fee_1',
    abilityId: 'maintenance_fee',
    name: 'Tarifa de Manutencao',
    immediateApplied: true,
    payload: { extraDraw: 1 },
  };
  state.boss.effects = [{ id: 'maintenance_fee', sourceActionId: 'fee_1', pendingPlayerIds: [1] }];

  const progress = buildBossActionPresentation(state).progress;
  assert.match(progress, /Tarifa ativa.*1\/2 compras aplicadas/i);
  assert.doesNotMatch(progress, /⬜|0\/1|1\/1/);
});

test('Tarifa concluida nao volta para 0/2 depois que o ultimo jogador recebe a compra', () => {
  const state = baseState('banker');
  state.boss.roundNumber = 4;
  state.boss.lastMaintenanceRound = 4;
  state.boss.effects = [];
  state.boss.currentIntent = {
    id: 'fee_done',
    abilityId: 'maintenance_fee',
    name: 'Tarifa de Manutencao',
    payload: { extraDraw: 1 },
  };

  const action = buildBossActionPresentation(state);
  assert.match(action.progress, /Tarifa aplicada/i);
  assert.doesNotMatch(action.progress, /0\/2/);
});


test('Semente Viva acompanha 0/1, conclusao e falha usando a ameaca real', () => {
  const state = baseState('matriarca_esmeralda');
  state.boss.currentIntent = {
    id: 'seed_1',
    abilityId: 'living_seed',
    name: 'Semente Viva',
    payload: { targetPlayerId: 0, cardId: 'c1' },
  };
  state.boss.natureThreats = [{
    id: 'threat_seed_1',
    sourceIntentId: 'seed_1',
    sourceAbilityId: 'living_seed',
    type: 'seed',
    targetPlayerId: 0,
    cardId: 'c1',
    status: 'active',
  }];

  assert.match(buildBossActionPresentation(state).progress, /0\/1.*Pendente/i);
  state.boss.natureThreats[0].status = 'success';
  assert.match(buildBossActionPresentation(state).progress, /1\/1.*Conclu[ií]do/i);
  state.boss.natureThreats[0].status = 'failed';
  assert.match(buildBossActionPresentation(state).progress, /0\/1.*Falhou/i);
});

test('Matriarca mostra o resultado resolvido no quadro sem misturar a proxima habilidade', () => {
  const state = baseState('matriarca_esmeralda');
  state.boss.currentIntent = null;
  state.boss.natureThreats = [{
    id: 'threat_seed_done',
    sourceIntentId: 'seed_done',
    sourceAbilityId: 'living_seed',
    type: 'seed',
    targetPlayerId: 0,
    cardId: 'c1',
    status: 'failed',
  }];
  state.boss.lastEvent = {
    type: 'natureThreat',
    actionId: 'threat_seed_done_failed',
    threatId: 'threat_seed_done',
    status: 'failed',
    bloomApplied: 1,
    outcome: 'Biel terminou o turno com a carta marcada.',
  };
  state.boss.eventLog = [state.boss.lastEvent];
  state.boss.bossFlow = { stage: 'result', eventActionId: state.boss.lastEvent.actionId };

  const action = buildBossActionPresentation(state);
  assert.equal(action.name, 'Semente Viva');
  assert.match(action.progress, /0\/1.*Falhou/i);
  assert.match(action.consequence, /\+1 Flor/i);
  assert.doesNotMatch(JSON.stringify(action), /Preparando nova ordem/i);
});

test('Banqueiro apresenta o resultado concluido da Auditoria antes da proxima cobranca', () => {
  const state = baseState('banker');
  state.boss.currentIntent = null;
  state.boss.lastEvent = {
    type: 'bossAbility',
    actionId: 'audit_result_1',
    abilityId: 'suit_audit',
    name: 'Auditoria de Naipe',
    outcome: 'Auditoria concluida: Divida -5.',
    dangerDelta: -5,
    presentation: { details: ['Progresso: 3/3 cartas'] },
  };
  state.boss.eventLog = [state.boss.lastEvent];
  state.boss.bossFlow = { stage: 'result', eventActionId: 'audit_result_1' };

  const action = buildBossActionPresentation(state);
  assert.equal(action.name, 'Auditoria de Naipe');
  assert.match(action.progress, /3\/3.*Conclu[ií]do/i);
  assert.match(action.instruction, /D[ií]vida -5/i);
  assert.doesNotMatch(JSON.stringify(action), /Preparando nova ordem/i);
});

test('Matriarca resume objetivos multiplos com progresso conjunto', () => {
  const state = baseState('matriarca_esmeralda');
  state.boss.currentIntent = {
    id: 'vines_1',
    abilityId: 'twin_vines',
    name: 'Trepadeiras Gemeas',
    payload: {},
  };
  state.boss.natureThreats = [
    { id: 'vine_a', sourceIntentId: 'vines_1', status: 'success' },
    { id: 'vine_b', sourceIntentId: 'vines_1', status: 'active' },
  ];

  assert.match(buildBossActionPresentation(state).progress, /1\/2.*Pendente/i);
  state.boss.natureThreats[1].status = 'failed';
  assert.match(buildBossActionPresentation(state).progress, /1\/2.*n[aã]o conclu[ií]do/i);
});

test('restricoes do Banqueiro e efeitos passivos da Matriarca nao usam checkbox artificial', () => {
  const banker = baseState('banker');
  for (const intent of [
    { abilityId: 'credit_block', name: 'Bloqueio de Credito', payload: {} },
    { abilityId: 'pledge', name: 'Penhora', payload: { meldIndex: 0 } },
    { abilityId: 'discard_surcharge', name: 'Agio do Lixo', payload: { amount: 4 } },
  ]) {
    banker.boss.currentIntent = intent;
    if (intent.abilityId === 'discard_surcharge') banker.boss.discardSurcharge = { status: 'active', amount: 4 };
    assert.doesNotMatch(buildBossActionPresentation(banker).progress, /⬜|(?:^|\s)[01]\/1(?:\s|$)/);
  }

  const matriarch = baseState('matriarca_esmeralda');
  matriarch.boss.currentIntent = { abilityId: 'emerald_cocoon', name: 'Casulo Esmeralda', payload: { amount: 180 } };
  matriarch.boss.emeraldCocoon = { status: 'active', remaining: 140 };
  assert.match(buildBossActionPresentation(matriarch).progress, /Prote[cç][aã]o ativa.*140\/180/i);
  assert.doesNotMatch(buildBossActionPresentation(matriarch).progress, /⬜|(?:^|\s)[01]\/1(?:\s|$)/);

  matriarch.boss.currentIntent = { abilityId: 'spring_crown', name: 'Coroa da Primavera', payload: { markedThreatId: 'crown-root' } };
  matriarch.boss.springCrown = { status: 'active', markedThreatId: 'crown-root', markedThreatName: 'Raiz Faminta' };
  matriarch.boss.natureThreats = [{ id: 'crown-root', type: 'root', status: 'active', meldIndex: 0, progressCardIds: [] }];
  const crownPresentation = buildBossActionPresentation(matriarch);
  assert.match(crownPresentation.instruction, /A Coroa marcou: Raiz Faminta/i);
  assert.match(crownPresentation.progress, /0\/1.*Pendente/i);
  assert.doesNotMatch(crownPresentation.instruction, /primeira falha|segunda falha/i);
});

test('resultado antigo da Coroa nao reaparece sobre a habilidade seguinte', () => {
  const state = baseState('matriarca_esmeralda');
  state.boss.bossFlow = { stage: 'ability' };
  state.boss.currentIntent = { abilityId: 'living_seed', name: 'Semente Viva', payload: { targetPlayerId: 0, cardId: 'c1' } };
  state.boss.lastEvent = { type: 'springCrown', abilityId: 'spring_crown', name: 'Coroa da Primavera', outcome: 'Raiz Fortalecida preparada.' };
  const presentation = buildBossActionPresentation(state);
  assert.equal(presentation.name, 'Semente Viva');
  assert.doesNotMatch(JSON.stringify(presentation), /Raiz Fortalecida preparada|Coroa da Primavera/);
});

test('Polen apresenta risco imediato no lixo sem criar progresso 0/1 artificial', () => {
  const state = baseState('matriarca_esmeralda');
  state.boss.currentIntent = { id: 'pollen_1', abilityId: 'discard_pollen', name: 'Polen do Lixo', payload: {} };
  state.boss.natureThreats = [{
    id: 'pollen_threat',
    sourceIntentId: 'pollen_1',
    sourceAbilityId: 'discard_pollen',
    type: 'pollen',
    status: 'active',
    targetPlayerId: null,
  }];

  state.discard = [{ id: 'pollen-card', rank: '8', suit: '♦' }];
  state.boss.natureThreats[0].discardCardId = 'pollen-card';

  const presentation = buildBossActionPresentation(state);
  assert.match(presentation.instruction, /carta 8♦ foi contaminada.*não recolha a pilha/i);
  assert.match(presentation.progress, /carta contaminada: 8♦.*não recolha a pilha/i);
  assert.match(presentation.consequence, /essa carta vier junto.*\+1 Flor.*40 HP/i);
  assert.doesNotMatch(presentation.progress, /turnos|0\/1|1\/1|⬜/i);

  state.boss.natureThreats[0].status = 'failed';
  state.boss.natureThreats[0].bloomApplied = 1;
  state.boss.natureThreats[0].healApplied = 40;
  const resolved = buildBossActionPresentation(state).progress;
  assert.match(resolved, /carta contaminada recolhida.*\+1 Flor.*cura 40 HP/i);
  assert.doesNotMatch(resolved, /0\/1|1\/1|⬜/);

  state.boss.natureThreats[0].status = 'cancelled';
  const avoided = buildBossActionPresentation(state).progress;
  assert.match(avoided, /carta evitada.*sem efeito/i);
});

test('Florescimento Real especifica e atualiza seus tres objetivos independentes', () => {
  const state = baseState('matriarca_esmeralda');
  state.discard = [{ id: 'royal-discard', rank: '8', suit: '♦' }];
  state.teams = [{ melds: [[{ id: 'royal-meld-3', rank: '3', suit: '♣' }]] }];
  state.boss.currentIntent = { id: 'royal_1', abilityId: 'royal_bloom', name: 'Florescimento Real', payload: { targetCount: 3 } };
  state.boss.natureThreats = [
    { id: 'royal-seed', sourceIntentId: 'royal_1', type: 'royal_seed', status: 'active', targetPlayerId: 0, cardId: 'c2' },
    { id: 'royal-root', sourceIntentId: 'royal_1', type: 'royal_root', status: 'active', meldIndex: 0 },
    { id: 'royal-pollen', sourceIntentId: 'royal_1', type: 'royal_pollen', status: 'active', discardCardId: 'royal-discard' },
  ];

  const pending = buildBossActionPresentation(state).progress;
  assert.match(pending, /0\/3 concluídos/i);
  assert.match(pending, /☐ Semente: Biel deve usar 7/i);
  assert.match(pending, /☐ Raiz: adicionar 1 carta legal ao Jogo 1/i);
  assert.match(pending, /☐ Pólen: não recolher 8.*do lixo/i);

  state.boss.natureThreats[0].status = 'success';
  state.boss.natureThreats[1].status = 'failed';
  state.boss.natureThreats[1].bloomApplied = 1;
  const updated = buildBossActionPresentation(state).progress;
  assert.match(updated, /1\/3 concluídos/i);
  assert.match(updated, /☑ Semente:.*concluído/i);
  assert.match(updated, /✕ Raiz:.*falhou.*\+1 Flor/i);
  assert.match(updated, /☐ Pólen:/i);
});

test('Colheita mostra uma meta direta e quantas cartas ainda precisam sair da mão', () => {
  const state = baseState('matriarca_esmeralda');
  state.boss.currentIntent = { id: 'harvest_1', abilityId: 'harvest', name: 'Colheita', payload: { targetPlayerId: 0 } };
  state.boss.natureThreats = [{
    id: 'harvest_threat',
    sourceIntentId: 'harvest_1',
    sourceAbilityId: 'harvest',
    type: 'harvest',
    status: 'active',
    targetPlayerId: 0,
  }];

  state.players[0].hand = Array.from({ length: 7 }, (_, index) => ({ id: `safe-${index}`, rank: '3', suit: '♣' }));
  let presentation = buildBossActionPresentation(state);
  assert.match(presentation.instruction, /termine o turno com no máximo 7 cartas/i);
  assert.match(presentation.progress, /meta atingida agora.*7 cartas na mão/i);
  assert.match(presentation.consequence, /8–10 ao final.*60 HP.*11\+ ao final.*\+1 Flor.*100 HP/i);

  state.players[0].hand = Array.from({ length: 9 }, (_, index) => ({ id: `heal-${index}`, rank: '8', suit: '♣' }));
  presentation = buildBossActionPresentation(state);
  assert.match(presentation.progress, /9 cartas na mão.*reduza 2 para ficar seguro/i);

  state.players[0].hand = Array.from({ length: 11 }, (_, index) => ({ id: `critical-${index}`, rank: 'Q', suit: '♣' }));
  presentation = buildBossActionPresentation(state);
  assert.match(presentation.progress, /11 cartas na mão.*reduza 4 para ficar seguro/i);
});

test('Colheita usa resultados finais curtos e sem repetir as três faixas', () => {
  const state = baseState('matriarca_esmeralda');
  state.boss.currentIntent = { id: 'harvest_1', abilityId: 'harvest', name: 'Colheita', payload: { targetPlayerId: 0 } };
  const threat = {
    id: 'harvest_threat',
    sourceIntentId: 'harvest_1',
    sourceAbilityId: 'harvest',
    type: 'harvest',
    status: 'success',
    targetPlayerId: 0,
    observedHandSize: 7,
  };
  state.boss.natureThreats = [threat];
  assert.match(buildBossActionPresentation(state).progress, /colheita evitada.*terminou com 7 cartas/i);

  threat.status = 'failed';
  threat.observedHandSize = 9;
  threat.healApplied = 60;
  assert.match(buildBossActionPresentation(state).progress, /colheita alimentada.*9 cartas.*cura 60 HP/i);

  threat.observedHandSize = 11;
  threat.bloomApplied = 1;
  threat.healApplied = 100;
  assert.match(buildBossActionPresentation(state).progress, /colheita crítica.*11 cartas.*\+1 Flor.*cura 100 HP/i);
});

test('resultado antigo nao reaparece quando o fluxo aponta para outro evento', () => {
  const state = baseState('banker');
  state.boss.lastEvent = {
    type: 'bossAbility',
    actionId: 'old_audit',
    abilityId: 'suit_audit',
    name: 'Auditoria antiga',
    outcome: 'RESULTADO ANTIGO',
    dangerDelta: -5,
  };
  state.boss.eventLog = [state.boss.lastEvent];
  state.boss.bossFlow = { stage: 'result', eventActionId: 'missing_new_event' };

  const action = buildBossActionPresentation(state);
  assert.equal(action.name, 'Preparando nova ordem');
  assert.doesNotMatch(JSON.stringify(action), /Auditoria antiga|RESULTADO ANTIGO/);
});


test('Matriarca nao ressuscita resultado antigo quando o ciclo atual nao possui evento vinculado', () => {
  const state = baseState('matriarca_esmeralda');
  state.boss.currentIntent = null;
  state.boss.natureThreats = [{
    id: 'old_seed_threat',
    sourceIntentId: 'old_seed_intent',
    sourceAbilityId: 'living_seed',
    type: 'seed',
    targetPlayerId: 0,
    cardId: 'c1',
    status: 'failed',
  }];
  state.boss.lastEvent = {
    type: 'natureThreat',
    actionId: 'old_seed_failed',
    threatId: 'old_seed_threat',
    status: 'failed',
    bloomApplied: 1,
    outcome: 'RESULTADO ANTIGO DA SEMENTE',
  };
  state.boss.eventLog = [state.boss.lastEvent];
  state.boss.bossFlow = { stage: 'result', eventActionId: null };

  const action = buildBossActionPresentation(state);
  assert.equal(action.name, 'Preparando nova ordem');
  assert.doesNotMatch(JSON.stringify(action), /Semente Viva|RESULTADO ANTIGO DA SEMENTE|\+1 Flor/);
});

test('Matriarca mostra somente o evento explicitamente vinculado ao resultado atual', () => {
  const state = baseState('matriarca_esmeralda');
  state.boss.currentIntent = null;
  state.boss.natureThreats = [{
    id: 'old_root_threat',
    sourceIntentId: 'old_root_intent',
    sourceAbilityId: 'hungry_root',
    type: 'root',
    meldIndex: 0,
    status: 'failed',
  }];
  state.boss.lastEvent = {
    type: 'natureThreat',
    actionId: 'old_root_failed',
    threatId: 'old_root_threat',
    status: 'failed',
    bloomApplied: 1,
    outcome: 'RAIZ ANTIGA',
  };
  state.boss.eventLog = [state.boss.lastEvent];
  state.boss.bossFlow = { stage: 'result', eventActionId: 'evento_atual_ausente' };

  const action = buildBossActionPresentation(state);
  assert.equal(action.name, 'Preparando nova ordem');
  assert.doesNotMatch(JSON.stringify(action), /Raiz Faminta|RAIZ ANTIGA|\+1 Flor/);
});

test('apresentacao nao mascara carta sem alvo com texto generico', async () => {
  const source = await readFile(new URL('../js/boss/boss-presentation.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /Nenhuma carta/);
  assert.doesNotMatch(source, /Carta alvo: nao se aplica/i);
});

test('fontes dos apresentadores mantem a separacao estrutural', async () => {
  const source = await readFile(new URL('../js/boss/boss-presentation.js', import.meta.url), 'utf8');
  const actionSource = source.match(/export function buildBossActionPresentation[\s\S]*?\n}\n\nexport function buildBossResultPresentation/)?.[0] || '';
  const resultSource = source.match(/export function buildBossResultPresentation[\s\S]*$/)?.[0] || '';
  assert.doesNotMatch(actionSource, /lastEvent/);
  assert.doesNotMatch(resultSource, /currentIntent/);
});

test('tela final explicita vitoria ou derrota e usa a fala do chefe correto', () => {
  const victory = baseState('banker');
  victory.teams = [{ id: 0, melds: [] }];
  Object.assign(victory.boss, { hp: 0, maxHp: 2200, maxDanger: 100, danger: 12, stats: { totalDamage: 2200, canastrasFormed: 4, finalStrike: 600 }, eventLog: [], result: { victory: true, detail: 'Ataque final concluido.' } });
  const win = buildBossFinalPresentation(victory);
  assert.equal(win.outcome, 'VITÓRIA');
  assert.equal(win.speech, 'Isto não estava previsto nos meus cálculos.');

  const defeat = baseState('dominadora');
  defeat.teams = [{ id: 0, melds: [] }];
  Object.assign(defeat.boss, { hp: 900, maxHp: 1800, stats: { totalDamage: 900, canastrasFormed: 2, finalStrike: 0 }, eventLog: [], result: { victory: false, detail: 'A equipe foi dominada.' } });
  const loss = buildBossFinalPresentation(defeat);
  assert.equal(loss.outcome, 'DERROTA');
  assert.equal(loss.speech, 'No fim, vocês fizeram exatamente o que eu mandei.');
});
