import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  applyBossCardDamageMechanics,
  applyBossMeldContributionMechanics,
  applyBossMeldMechanics,
  applyBossPlayerTurnEndMechanics,
  prepareBossRoundResolutionMechanics,
  finalizeBossTurnResolutionMechanics,
  advanceBossRoundMechanics,
  confirmBossTurnDefeatMechanics,
  finalizeBossMeldCardDamageMechanics,
  finalizeBossMeldResolutionMechanics,
  getBossMechanicsAdapter,
} from '../js/boss/mechanics/boss-mechanics-registry.js';

const engine = fs.readFileSync(new URL('../js/boss/boss-engine.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');

function transitionSource() {
  const start = engine.indexOf('export function applyBossMeldTransition');
  const end = engine.indexOf('\nexport function ', start + 1);
  assert.ok(start >= 0 && end > start, 'applyBossMeldTransition deve existir');
  return engine.slice(start, end);
}

function playerTurnSource() {
  const start = engine.indexOf('export function completeBossPlayerTurn');
  const end = engine.indexOf('\nexport function ', start + 1);
  assert.ok(start >= 0 && end > start, 'completeBossPlayerTurn deve existir');
  return engine.slice(start, end);
}

function bossWith(intent) {
  return { id: 'dimitrescu', currentIntent: intent };
}

test('registry de mecanicas isola os cinco chefes', () => {
  for (const bossId of ['dimitrescu', 'dominadora', 'nehelenia', 'matriarca_esmeralda', 'banker']) {
    assert.ok(getBossMechanicsAdapter(bossId), `${bossId} deve possuir adaptador`);
  }
  assert.equal(getBossMechanicsAdapter('inexistente'), null);
});

test('Caçada de Bela e Banquete de Cassandra reagem ao jogo correto', () => {
  const bela = bossWith({ abilityId: 'bela_hunt', payload: { targetPlayerId: 1, cardId: 'bela-card', used: false } });
  applyBossMeldMechanics('dimitrescu', { boss: bela, playerId: 1, meldId: 'm1', meldIndex: 0, cardsAdded: [{ id: 'bela-card' }] });
  assert.equal(bela.currentIntent.payload.used, true);

  const cassandra = bossWith({ abilityId: 'cassandra_feast', payload: { meldId: 'm2', meldIndex: 4, fed: false } });
  applyBossMeldMechanics('dimitrescu', { boss: cassandra, playerId: 1, meldId: 'wrong', meldIndex: 4, cardsAdded: [{ id: 'x' }] });
  assert.equal(cassandra.currentIntent.payload.fed, false, 'meldId estável deve prevalecer quando existe');
  applyBossMeldMechanics('dimitrescu', { boss: cassandra, playerId: 1, meldId: 'm2', meldIndex: 9, cardsAdded: [{ id: 'x' }] });
  assert.equal(cassandra.currentIntent.payload.fed, true);
});

test('Marca Carmesim altera somente a marca ativa do jogador e carta usados', () => {
  const boss = bossWith({
    abilityId: 'crimson_brand',
    payload: {
      marks: [
        { status: 'active', playerId: 0, cardId: 'a' },
        { status: 'active', playerId: 1, cardId: 'b' },
        { status: 'failed', playerId: 0, cardId: 'c' },
      ],
    },
  });
  applyBossMeldMechanics('dimitrescu', { boss, playerId: 0, meldId: 'm1', meldIndex: 0, cardsAdded: [{ id: 'a' }, { id: 'c' }] });
  assert.deepEqual(boss.currentIntent.payload.marks.map((mark) => mark.status), ['success', 'active', 'failed']);
});

test('Três Filhas resolve Bela e Cassandra sem tocar no objetivo de Daniela', () => {
  const boss = bossWith({
    abilityId: 'three_daughters',
    payload: { passiveVersion:2 },
  });
  boss.combatEntities=[
    { id:'bela',status:'alive',passive:{status:'active',targetPlayerId:0,cardId:'bela'} },
    { id:'cassandra',status:'alive',passive:{status:'active',meldId:'m7',meldIndex:7} },
    { id:'daniela',status:'alive',passive:{status:'active'} },
  ];
  applyBossMeldMechanics('dimitrescu', { boss, playerId: 0, meldId: 'm7', meldIndex: 2, cardsAdded: [{ id: 'bela' }] });
  assert.deepEqual(boss.combatEntities.map(d=>d.passive.status), ['success', 'success', 'active']);
});

test('applyBossMeldTransition delega mecanica da Dimitrescu e nao contem suas habilidades', () => {
  const source = transitionSource();
  assert.match(source, /applyBossMeldMechanics\(boss\.id/);
  for (const ability of ['bela_hunt', 'cassandra_feast', 'crimson_brand', 'three_daughters']) {
    assert.doesNotMatch(source, new RegExp(ability));
  }
});



test('Posse da Dominadora suprime dano ate cooperacao ou evolucao liberar o jogo', () => {
  const boss = {
    id: 'dominadora',
    roundNumber: 3,
    currentIntent: null,
    activeOrders: [],
    possessions: [{
      id: 'posse-1',
      teamId: 0,
      meldId: 'meld-1',
      meldIndex: 0,
      createdTier: 0,
      suppressedDamage: 225,
      progressCardIds: [],
      contributorPlayerIds: [],
    }],
  };
  const gameState = { players: [{ id: 0 }, { id: 1 }] };

  const first = applyBossMeldMechanics('dominadora', {
    boss,
    gameState,
    teamId: 0,
    playerId: 0,
    meldId: 'meld-1',
    meldIndex: 0,
    oldKind: 'simple',
    newKind: 'simple',
    cardsAdded: [{ id: 'card-a' }],
    canastraDamage: 100,
  });
  assert.equal(first.canastraDamage, 0);
  assert.equal(first.possessionProgressed, true);
  assert.equal(first.possessionReleased, false);
  assert.equal(first.possessionProgress, 1);
  assert.equal(boss.possessions.length, 1);

  const second = applyBossMeldMechanics('dominadora', {
    boss,
    gameState,
    teamId: 0,
    playerId: 1,
    meldId: 'meld-1',
    meldIndex: 0,
    oldKind: 'simple',
    newKind: 'simple',
    cardsAdded: [{ id: 'card-b' }],
    canastraDamage: 0,
  });
  assert.equal(second.possessionReleased, true);
  assert.equal(second.possessionReappliedDamage, 225);
  assert.equal(boss.possessions.length, 0);
});

test('Mãos Atadas e Separação ficam no adaptador da Dominadora', () => {
  const hands = {
    id: 'dominadora',
    possessions: [],
    activeOrders: [],
    currentIntent: { abilityId: 'hands_tied', payload: { teamMeldAvailable: true } },
  };
  applyBossMeldMechanics('dominadora', {
    boss: hands,
    gameState: { players: [{ id: 0 }, { id: 1 }] },
    teamId: 0,
    playerId: 1,
    meldId: 'new-meld',
    meldIndex: 2,
    isNewMeld: true,
  });
  assert.equal(hands.currentIntent.payload.teamMeldAvailable, false);
  assert.equal(hands.currentIntent.payload.consumedByPlayerId, 1);
  assert.equal(hands.currentIntent.payload.consumedMeldId, 'new-meld');

  const separation = {
    id: 'dominadora',
    possessions: [],
    activeOrders: [],
    currentIntent: { abilityId: 'separation', payload: { meldOwners: {} } },
  };
  applyBossMeldMechanics('dominadora', {
    boss: separation,
    gameState: { players: [{ id: 0 }, { id: 1 }] },
    teamId: 0,
    playerId: 0,
    meldId: 'm-3',
    meldIndex: 3,
  });
  applyBossMeldMechanics('dominadora', {
    boss: separation,
    gameState: { players: [{ id: 0 }, { id: 1 }] },
    teamId: 0,
    playerId: 1,
    meldId: 'm-3',
    meldIndex: 3,
  });
  assert.equal(separation.currentIntent.payload.meldOwners[3], 0, 'primeiro dono do jogo nao deve ser sobrescrito');
});

test('Ordens ligadas a jogo sao decididas pelo adaptador e finalizadas pelo callback unico do engine', () => {
  const calls = [];
  const finishOrder = (order, status, outcome, options = {}) => {
    calls.push({ id: order.id, status, outcome, addChain: !!options.addChain });
    order.status = status;
    return { actionId: `event-${order.id}`, status };
  };
  const boss = {
    id: 'dominadora',
    possessions: [],
    currentIntent: null,
    activeOrders: [
      { id: 'new', status: 'active', targetPlayerId: 0, type: 'no_new_meld' },
      { id: 'feed', status: 'active', targetPlayerId: 0, type: 'feed_specific_meld', meldId: 'ordered' },
      { id: 'evolve', status: 'active', targetPlayerId: 0, type: 'evolve_specific_meld', meldId: 'played' },
    ],
  };
  const result = applyBossMeldMechanics('dominadora', {
    boss,
    gameState: { players: [{ id: 0 }, { id: 1 }] },
    teamId: 0,
    playerId: 0,
    meldId: 'played',
    meldIndex: 1,
    oldKind: 'limpa',
    newKind: 'real',
    cardsAdded: [{ id: 'card-x' }],
    isNewMeld: true,
    finishOrder,
  });

  assert.deepEqual(calls.map(({ id, status, addChain }) => ({ id, status, addChain })), [
    { id: 'new', status: 'disobeyed', addChain: true },
    { id: 'feed', status: 'disobeyed', addChain: true },
    { id: 'evolve', status: 'obeyed', addChain: false },
  ]);
  assert.equal(result.orderEvents.length, 3);
});

test('applyBossMeldTransition nao contem mais as regras de jogo da Dominadora', () => {
  const source = transitionSource();
  for (const marker of ['hands_tied', 'separation', 'feed_specific_meld', 'evolve_specific_meld', 'resolveOrdersFromMeldAction']) {
    assert.doesNotMatch(source, new RegExp(marker));
  }
  assert.match(source, /finishOrder: \(order, status, outcome, options\) => finishDominatrixOrder/);
});


test('Jogo Espelhado, Prisao e Siga o Reflexo ficam no adaptador da Nehelenia', () => {
  const mirrored = {
    id: 'nehelenia', actionSequence: 0, effects: [],
    currentIntent: { abilityId: 'mirrored_meld', payload: { targetPlayerId: 0, meldId: 'm-1', meldIndex: 7, fed: false, resolved: false, realChosen: true, fedCardIds: ['old'] } },
  };
  applyBossMeldMechanics('nehelenia', {
    boss: mirrored, gameState: { players: [{ id: 0, name: 'Biel' }] }, playerId: 0,
    meldId: 'm-1', meldIndex: 2, cardsAdded: [{ id: 'a' }, { id: 'a' }, { id: 'b' }],
  });
  assert.equal(mirrored.currentIntent.payload.fed, true);
  assert.equal(mirrored.currentIntent.payload.resolved, true);
  assert.equal(mirrored.currentIntent.payload.realChosen, false);
  assert.deepEqual(mirrored.currentIntent.payload.fedCardIds, ['old', 'a', 'b']);

  const prison = {
    id: 'nehelenia', actionSequence: 0, effects: [],
    currentIntent: { abilityId: 'mirror_prison', payload: { rescuerPlayerId: 1, meldIndex: 3, fed: false, fedCardIds: [] } },
  };
  applyBossMeldMechanics('nehelenia', {
    boss: prison, gameState: { players: [{ id: 1, name: 'BOT' }] }, playerId: 1,
    meldId: 'whatever', meldIndex: 3, cardsAdded: [{ id: 'p' }],
  });
  assert.equal(prison.currentIntent.payload.fed, true);
  assert.deepEqual(prison.currentIntent.payload.fedCardIds, ['p']);

  const follow = {
    id: 'nehelenia', actionSequence: 0, effects: [],
    currentIntent: { abilityId: 'follow_reflection', payload: { firstPlayerId: 0, secondPlayerId: 1, firstPlayedCount: 1, secondPlayedCount: 0, cardsPlayedByPlayer: {} } },
  };
  applyBossMeldMechanics('nehelenia', {
    boss: follow, gameState: { players: [{ id: 0 }, { id: 1 }] }, playerId: 0,
    meldId: 'm', meldIndex: 0, cardsAdded: [{ id: 'f1' }, { id: 'f2' }],
  });
  assert.equal(follow.currentIntent.payload.firstPlayedCount, 3);
  assert.equal(follow.currentIntent.payload.cardsPlayedByPlayer[0], 2);
});

test('Tiger e Fish liberam efeitos persistentes sem duplicar o registrador de eventos', () => {
  const events = [];
  const boss = {
    id: 'nehelenia',
    actionSequence: 10,
    effects: [
      { id: 'nehelenia_tiger_prey', playerId: 0, meldId: 'prey', meldIndex: 0 },
      { id: 'nehelenia_inverted_reflection', playerId: 0 },
    ],
    currentIntent: { abilityId: 'fish_inverted', payload: { targetPlayerId: 0, fedExisting: false } },
  };
  applyBossMeldMechanics('nehelenia', {
    boss,
    gameState: { players: [{ id: 0, name: 'Biel' }] },
    playerId: 0,
    meldId: 'prey',
    meldIndex: 0,
    cardsAdded: [{ id: 'x' }],
    isNewMeld: false,
    recordBossEvent: (event) => { events.push(event); return event; },
  });
  assert.equal(boss.currentIntent.payload.fedExisting, true);
  assert.equal(boss.effects.some((effect) => effect.id === 'nehelenia_tiger_prey'), false);
  assert.equal(boss.effects.some((effect) => effect.id === 'nehelenia_inverted_reflection'), false);
  assert.deepEqual(events.map((event) => event.abilityId), ['tiger_prey', 'fish_inverted']);
  assert.deepEqual(events.map((event) => event.actionId), ['tiger_prey_release_0_11', 'fish_inverted_release_0_12']);
});

test('Laço do Tigre, Presa e Mao no Espelho atualizam somente seus objetivos', () => {
  const link = {
    id: 'nehelenia', actionSequence: 0, effects: [],
    currentIntent: { abilityId: 'tiger_link', payload: { targets: [{ meldId: 'left', meldIndex: 0 }, { meldId: 'right', meldIndex: 1 }], fedMeldIds: [] } },
  };
  applyBossMeldMechanics('nehelenia', { boss: link, playerId: 0, meldId: 'right', meldIndex: 1, cardsAdded: [{ id: 'x' }] });
  assert.deepEqual(link.currentIntent.payload.fedMeldIds, ['right']);

  const prey = {
    id: 'nehelenia', actionSequence: 0, effects: [],
    currentIntent: { abilityId: 'tiger_prey', payload: { targetPlayerId: 1, meldId: 'prey', meldIndex: 0, fed: false } },
  };
  applyBossMeldMechanics('nehelenia', { boss: prey, playerId: 1, meldId: 'prey', meldIndex: 9, cardsAdded: [{ id: 'p' }] });
  assert.equal(prey.currentIntent.payload.fed, true);

  const fish = {
    id: 'nehelenia', actionSequence: 0, effects: [],
    currentIntent: { abilityId: 'fish_marked_card', payload: { targetPlayerId: 0, cardId: 'marked', used: false } },
  };
  applyBossMeldMechanics('nehelenia', { boss: fish, playerId: 0, meldId: 'm', meldIndex: 0, cardsAdded: [{ id: 'marked' }] });
  assert.equal(fish.currentIntent.payload.used, true);
});

test('applyBossMeldTransition nao contem mais regras especificas da Nehelenia', () => {
  const source = transitionSource();
  for (const marker of [
    'mirrored_meld', 'mirror_prison', 'follow_reflection', 'tiger_prey', 'fish_marked_card', 'fish_inverted',
    'nehelenia_inverted_reflection', 'nehelenia_tiger_claw', 'new_moon', 'dream_mirror',
  ]) {
    assert.doesNotMatch(source, new RegExp(marker));
  }
  assert.match(source, /applyBossCardDamageMechanics\(boss\.id/);
  assert.match(source, /finalizeBossMeldCardDamageMechanics\(boss\.id/);
  assert.match(source, /applyBossMeldContributionMechanics\(boss\.id/);
});


test('Lua Nova e Espelho dos Sonhos transformam dano pelo adaptador da Nehelenia', () => {
  const newMoonBoss = {
    id: 'nehelenia',
    currentIntent: { abilityId: 'new_moon', payload: { suit: '♥', required: 3, progress: 0, countedCardIds: [] } },
  };
  const first = applyBossCardDamageMechanics('nehelenia', {
    boss: newMoonBoss,
    playerId: 0,
    card: { id: 'h1', rank: '8', suit: '♥' },
    damage: 10,
  });
  assert.equal(first.damage, 0);
  assert.equal(first.newMoonSuppressedDamage, 10);
  assert.equal(newMoonBoss.currentIntent.payload.progress, 1);

  const mirrorBoss = {
    id: 'nehelenia',
    currentIntent: { abilityId: 'dream_mirror', payload: { targetPlayerId: 1, cardId: 'dream', bonusDamage: 0 } },
  };
  const mirror = applyBossCardDamageMechanics('nehelenia', {
    boss: mirrorBoss,
    playerId: 1,
    card: { id: 'dream', rank: 'A', suit: '♠' },
    damage: 15,
  });
  assert.equal(mirror.damage, 15);
  assert.equal(mirror.dreamBonusDamage, 15);
  assert.equal(mirrorBoss.currentIntent.payload.bonusDamage, 15);
});

test('Garra do Tiger suprime dano individual e registra liberacao depois do lote', () => {
  const events = [];
  const boss = { id: 'nehelenia', actionSequence: 4, effects: [], currentIntent: null };
  const cardResult = applyBossCardDamageMechanics('nehelenia', {
    boss,
    playerId: 0,
    card: { id: 'x', rank: 'K', suit: '♣' },
    damage: 10,
    cardDamageContext: { tigerClawEffect: { id: 'nehelenia_tiger_claw' } },
  });
  assert.equal(cardResult.damage, 0);
  assert.equal(cardResult.tigerClawSuppressedDamage, 10);
  finalizeBossMeldCardDamageMechanics('nehelenia', {
    boss,
    playerId: 0,
    meldId: 'm-1',
    meldIndex: 0,
    cardDamageContext: { tigerClawEffect: { id: 'nehelenia_tiger_claw' } },
    tigerClawSuppressedDamage: 10,
    recordBossEvent: (event) => { events.push(event); return event; },
  });
  assert.equal(boss.actionSequence, 5);
  assert.equal(events[0].abilityId, 'tiger_link');
  assert.equal(events[0].suppressedDamage, 10);
});

test('evolucao de canastra recupera Fragmento pelo hook de contribuicao da Nehelenia', () => {
  const calls = [];
  const boss = { id: 'nehelenia', danger: 3 };
  const contribution = { neheleniaMirrorTier: 0, neheleniaMirrorRelief: 0 };
  const result = applyBossMeldContributionMechanics('nehelenia', {
    boss,
    gameState: { boss },
    contribution,
    oldKind: 'simple',
    newKind: 'limpa',
    meldId: 'm-2',
    restoreDreamMirror: (...args) => { calls.push(args); return { dangerDelta: -1 }; },
  });
  assert.equal(result.mirrorFragmentRelief, 1);
  assert.equal(contribution.neheleniaMirrorTier, 1);
  assert.equal(contribution.neheleniaMirrorRelief, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][2], 'Canastra limpa');
  assert.equal(calls[0][3], 'dream_mirror_relief_m-2_1');
});

test('novos modulos de mecanica ficam disponiveis offline', () => {
  assert.match(sw, /js\/boss\/mechanics\/boss-mechanics-registry\.js/);
  assert.match(sw, /js\/boss\/mechanics\/dimitrescu\.js/);
  assert.match(sw, /js\/boss\/mechanics\/dominatrix\.js/);
  assert.match(sw, /js\/boss\/mechanics\/nehelenia\.js/);
});


test('Semente, Raiz, Enxerto e Orvalho ficam no adaptador da Matriarca', () => {
  const resolved = [];
  const boss = {
    id: 'matriarca_esmeralda',
    currentIntent: { id: 'dew-intent', abilityId: 'restorative_dew', payload: { countedCardIds: [] } },
    natureThreats: [
      { id: 'seed', status: 'active', type: 'seed', cardId: 'seed-card' },
      { id: 'root', status: 'active', type: 'root', meldId: 'm-root', progressCardIds: [] },
      { id: 'graft', status: 'active', type: 'graft', meldIds: ['m-root', 'm-other'], fedMeldIds: ['m-other'] },
      { id: 'dew', status: 'active', type: 'dew', sourceIntentId: 'dew-intent', countedCardIds: [] },
    ],
  };
  applyBossMeldMechanics('matriarca_esmeralda', {
    boss,
    gameState: { players: [{ id: 0 }, { id: 1 }] },
    playerId: 0,
    meldId: 'm-root',
    meldIndex: 2,
    cardsAdded: [{ id: 'seed-card' }, { id: 'extra-card' }],
    newKind: 'simple',
    succeedNatureThreat: (threat, outcome) => { threat.status = 'success'; resolved.push({ id: threat.id, outcome }); return threat; },
  });
  assert.deepEqual(resolved.map((entry) => entry.id), ['seed', 'root', 'graft']);
  assert.deepEqual(boss.natureThreats.find((entry) => entry.id === 'dew').countedCardIds, ['seed-card', 'extra-card']);
  assert.deepEqual(boss.currentIntent.payload.countedCardIds, ['seed-card', 'extra-card']);
});

test('Raiz Fortalecida exige cooperadores diferentes antes de concluir', () => {
  const boss = {
    id: 'matriarca_esmeralda',
    currentIntent: null,
    natureThreats: [{ id: 'root', status: 'active', type: 'root', meldId: 'm', strengthened: true, requiredContributorCount: 2, progressCardIds: [], contributorPlayerIds: [] }],
  };
  const resolved = [];
  const context = {
    boss,
    gameState: { players: [{ id: 0 }, { id: 1 }] },
    meldId: 'm', meldIndex: 0, newKind: 'simple',
    succeedNatureThreat: (threat) => { threat.status = 'success'; resolved.push(threat.id); },
  };
  applyBossMeldMechanics('matriarca_esmeralda', { ...context, playerId: 0, cardsAdded: [{ id: 'a' }] });
  assert.equal(resolved.length, 0);
  assert.deepEqual(boss.natureThreats[0].contributorPlayerIds, [0]);
  applyBossMeldMechanics('matriarca_esmeralda', { ...context, playerId: 1, cardsAdded: [{ id: 'b' }] });
  assert.deepEqual(resolved, ['root']);
});

test('evolucao de canastra remove Florescimento pelo hook de contribuicao', () => {
  const boss = { id: 'matriarca_esmeralda', bloom: 3 };
  const contribution = { matriarchBloomTier: 0, matriarchBloomRemoved: 0 };
  const calls = [];
  const result = applyBossMeldContributionMechanics('matriarca_esmeralda', {
    boss,
    contribution,
    oldKind: 'simple',
    newKind: 'real',
    meldId: 'm-bloom',
    changeBloom: (amount, origin, eventId) => { calls.push({ amount, origin, eventId }); boss.bloom += amount; return { amount }; },
  });
  assert.equal(result.bloomRemoved, 2);
  assert.equal(contribution.matriarchBloomTier, 2);
  assert.equal(contribution.matriarchBloomRemoved, 2);
  assert.equal(boss.bloom, 1);
  assert.deepEqual(calls.map((entry) => entry.amount), [-2]);
});

test('Matriarca informa quebra do Casulo e applyBossMeldTransition nao contem regras naturais especificas', () => {
  const result = applyBossMeldMechanics('matriarca_esmeralda', {
    boss: { id: 'matriarca_esmeralda', natureThreats: [] },
    gameState: { players: [] },
    newKind: 'limpa',
    canastraDamage: 100,
    cardsAdded: [],
  });
  assert.equal(result.breaksCocoon, true);

  const source = transitionSource();
  for (const marker of ['royal_seed', 'royal_root', 'twin_root', 'restorative_dew', 'matriarchBloomTier', 'matriarchBloomRemoved']) {
    assert.doesNotMatch(source, new RegExp(marker));
  }
  assert.doesNotMatch(source, /boss\.id === 'matriarca_esmeralda'/);
  assert.match(source, /changeBloom: \(amount, origin, eventId\) => changeMatriarchBloom/);
});

test('modulo de mecanica da Matriarca fica disponivel offline', () => {
  assert.match(sw, /js\/boss\/mechanics\/matriarch\.js/);
});


test('Banqueiro resolve Auditoria, alivio de Divida e Limite de Credito no proprio adaptador', () => {
  const boss = {
    id: 'banker',
    roundNumber: 4,
    currentIntent: { abilityId: 'suit_audit', payload: { suit: '♣', required: 3, progress: 0, countedCardIds: [] } },
    creditLimit: {
      status: 'active', round: 4, allowance: 1, debtPerCard: 4, maxCharge: 12,
      countedCardIds: [], chargedDebt: 0, eventIds: [],
    },
  };
  const result = applyBossMeldMechanics('banker', {
    boss,
    cardsAdded: [{ id: 'hand-c', suit: '♣' }, { id: 'hand-h', suit: '♥' }],
    previousDangerReliefValue: 4,
    nextDangerReliefValue: 8,
    creditEligibleCardIds: ['hand-c', 'hand-h'],
    cardOriginsById: { 'hand-c': 'hand', 'hand-h': 'hand' },
  });
  assert.equal(result.debtReduction, 4);
  assert.equal(result.creditLimitDebt, 4);
  assert.equal(result.creditLimitEventId, 'credit_limit_4_hand-c_hand-h');
  assert.equal(boss.currentIntent.payload.progress, 1);
  assert.deepEqual(boss.currentIntent.payload.countedCardIds, ['hand-c']);
  assert.deepEqual(boss.creditLimit.countedCardIds, ['hand-c', 'hand-h']);
  assert.equal(boss.creditLimit.chargedDebt, 4);

  const contribution = { bankerDebtRelief: 0 };
  const finalized = finalizeBossMeldResolutionMechanics('banker', {
    contribution,
    appliedDebtReduction: 3,
    creditLimitDebt: 4,
    newKind: 'real',
  });
  assert.equal(contribution.bankerDebtRelief, 3);
  assert.equal(finalized.dangerChangeLabel, 'Limite de Credito: Divida +4');
});

test('applyBossMeldTransition fica agnostico aos cinco chefes', () => {
  const source = transitionSource();
  assert.doesNotMatch(source, /boss\.id\s*===/);
  for (const bossId of ["'banker'", "'dominadora'", "'matriarca_esmeralda'", "'dimitrescu'", "'nehelenia'"]) {
    assert.doesNotMatch(source, new RegExp(bossId));
  }
  for (const ability of ['suit_audit', 'credit_limit', 'bela_hunt', 'cassandra_feast', 'mirrored_meld', 'mirror_prison', 'restorative_dew', 'hands_tied', 'separation']) {
    assert.doesNotMatch(source, new RegExp(ability));
  }
  assert.match(source, /applyBossMeldMechanics\(boss\.id/);
  assert.match(source, /applyBossCardDamageMechanics\(boss\.id/);
  assert.match(source, /applyBossMeldContributionMechanics\(boss\.id/);
  assert.match(source, /finalizeBossMeldResolutionMechanics\(boss\.id/);
});

test('modulo de mecanica do Banqueiro fica disponivel offline', () => {
  assert.match(sw, /js\/boss\/mechanics\/banker\.js/);
});

test('fim de turno do Banqueiro fica no adaptador e preserva Tarifa + expiracoes', () => {
  const boss = {
    id: 'banker', roundNumber: 3, danger: 10, maxDanger: 100, actionSequence: 4,
    effects: [
      { id: 'financed_card', playerId: 0, cardId: 'used', debtPerCard: 4, sourceActionId: 'fee' },
      { id: 'financed_card', playerId: 0, cardId: 'held', debtPerCard: 4, sourceActionId: 'fee' },
    ],
    creditLimit: { status: 'active', round: 3 },
    discardSurcharge: { status: 'active', createdRound: 3 },
  };
  const gameState = { discard: [], teams: [{ melds: [[{ id: 'used' }]] }] };
  const player = { id: 0, teamId: 0, hand: [{ id: 'held' }] };
  const events = [];
  let deferred = 0;
  applyBossPlayerTurnEndMechanics('banker', {
    boss, gameState, playerId: 0, player,
    recordBossEvent: (event) => { events.push(event); return event; },
    deferVault: () => { deferred += 1; },
  });
  assert.equal(boss.danger, 14);
  assert.equal(boss.effects.length, 0);
  assert.deepEqual(events[0].usedInMeldCardIds, ['used']);
  assert.deepEqual(events[0].chargedCardIds, ['held']);
  assert.equal(deferred, 1);
  prepareBossRoundResolutionMechanics('banker', { boss });
  assert.equal(boss.creditLimit.status, 'expired');
  assert.equal(boss.discardSurcharge.status, 'expired');
});

test('hooks de fechamento de rodada permanecem isolados por chefe', () => {
  const matriarch = { id: 'matriarca_esmeralda', roundNumber: 6, natureHealingRound: 5, natureHealingThisRound: 90, propagationUsedThisRound: true };
  let propagation = 0;
  advanceBossRoundMechanics('matriarca_esmeralda', { boss: matriarch, createPendingRootPropagation: () => { propagation += 1; } });
  assert.equal(matriarch.natureHealingRound, 6);
  assert.equal(matriarch.natureHealingThisRound, 0);
  assert.equal(matriarch.propagationUsedThisRound, false);
  assert.equal(propagation, 1);

  const nehelenia = { id: 'nehelenia', neheleniaDiscardSealRound: 5 };
  advanceBossRoundMechanics('nehelenia', { boss: nehelenia });
  assert.equal(nehelenia.neheleniaDiscardSealRound, 0);

  const fallback = { actionId: 'blood_round' };
  const dimBoss = { roundNumber: 1, combatEntities: [], castleRegeneratedRound: 0 };
  const dimResult = finalizeBossTurnResolutionMechanics('dimitrescu', { boss: dimBoss, gameState: { boss: dimBoss },
    changeBlood: () => {}, recordBossEvent: () => {}, allPlayersActed: true, resolveBloodRound: () => [fallback] });
  assert.equal(dimResult.fallbackEvent, fallback);
});

test('checagem de derrota de recurso e roteada pelo adaptador correto', () => {
  let banker = 0;
  let blood = 0;
  let mirrors = 0;
  confirmBossTurnDefeatMechanics('banker', { sourceActionId: 'x', confirmBankerDefeat: () => { banker += 1; } });
  confirmBossTurnDefeatMechanics('dimitrescu', { sourceActionId: 'x', confirmDimitrescuDefeat: () => { blood += 1; } });
  confirmBossTurnDefeatMechanics('nehelenia', { sourceActionId: 'x', confirmNeheleniaDefeat: () => { mirrors += 1; } });
  confirmBossTurnDefeatMechanics('dominadora', { sourceActionId: 'x', confirmBankerDefeat: () => { banker += 100; } });
  assert.deepEqual([banker, blood, mirrors], [1, 1, 1]);
});

test('completeBossPlayerTurn fica agnostico as regras especificas dos cinco chefes', () => {
  const source = playerTurnSource();
  assert.doesNotMatch(source, /boss\.id\s*===/);
  for (const marker of [
    'financed_card', 'choice_exposure', 'final_order_mark', 'follow_reflection',
    'neheleniaDiscardSealRound', 'natureHealingRound', 'natureHealingThisRound',
    'propagationUsedThisRound', 'creditLimit', 'discardSurcharge', 'interdicts',
  ]) assert.doesNotMatch(source, new RegExp(marker));
  assert.match(source, /applyBossPlayerTurnEndMechanics\(boss\.id/);
  assert.match(source, /prepareBossRoundResolutionMechanics\(boss\.id/);
  assert.match(source, /finalizeBossTurnResolutionMechanics\(boss\.id/);
  assert.match(source, /advanceBossRoundMechanics\(boss\.id/);
  assert.match(source, /confirmBossTurnDefeatMechanics\(boss\.id/);
});
