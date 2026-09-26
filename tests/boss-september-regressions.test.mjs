import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { BuracoBot } from '../bot.js';
import { createBossState, selectNextBossIntent, advanceBossTurn, consumeBossExtraDraw,
  completeBossPlayerTurn, applyBossMeldTransition, normalizeBossState, isValidBossSequence,
  isBossCardBlocked, getBossChains, getBossNaturePriorities, notifyBossDiscardTaken } from '../js/boss/boss-engine.js';
import { buildBossActionPresentation } from '../js/boss/boss-presentation.js';

const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const cards = (prefix, values, suit = '♠') => values.map((rank, i) => ({ id: `${prefix}-${i}`, rank, suit }));
function game(id = 'banker') {
  return { mode: id === 'matriarca_esmeralda' ? 'boss_matriarca' : `boss_${id}`, variant: 'fechado',
    currentPlayer: 0, turnNumber: 1, hasDrawnThisTurn: true,
    players: [0,1].map(id => ({ id, teamId: 0, name: id ? 'BOT Ana' : 'Biel', hand: cards(`p${id}`, ['A','4','5','6','9']) })),
    teams: [{ id: 0, melds: [], playerIndexes: [0,1] }, { id: 1, melds: [] }],
    stock: cards('stock', Array(60).fill('7')), discard: [], deadPiles: [[], []], deadChunksTaken: [0,0],
    boss: createBossState(id, 9191) };
}
function activate(s, ability) {
  const intent = selectNextBossIntent(s, { debug: true, forcedAbilityId: ability });
  assert.ok(intent);
  s.boss.bossFlow = { id: 'test-flow', stage: 'ability', endsAt: 0, queue: [] };
  advanceBossTurn(s, Date.now());
  return intent;
}
test('crédito tem franquia compartilhada 3/2/1, sem aumentar o teto de cobrança', () => {
  for (const phase of [1,2,3]) {
    const s = game(); s.boss.phase = phase;
    activate(s, 'credit_limit');
    assert.equal(s.boss.creditLimit.allowance, 4 - phase);
    assert.equal(s.boss.creditLimit.maxCharge, phase + 3);
  }
});
test('tarifa já está ativa antes da primeira compra, sem repetir na rodada seguinte', () => {
  const s = game(); activate(s, 'maintenance_fee');
  assert.equal(consumeBossExtraDraw(s, 0), 1);
  assert.equal(consumeBossExtraDraw(s, 0), 0);
  completeBossPlayerTurn(s, 0);
  s.currentPlayer = 1; s.turnNumber++;
  assert.equal(consumeBossExtraDraw(s, 1), 1);
  completeBossPlayerTurn(s, 1);
  assert.equal(consumeBossExtraDraw(s, 0), 0);
});
test('Exposição esquecida cobra Chicote; última carta exposta não trava nem perdoa', () => {
  for (const last of [false, true]) {
    const s = game('dominadora');
    s.boss.currentIntent = { id: 'exposure-test', abilityId: 'exposure', name: 'Exposição', duration: 'target_turn', payload: { targetPlayerId: 0, cardId: 'p0-0' } };
    s.boss.bossFlow = { stage: 'players', queue: [] };
    if (last) s.players[0].hand = [s.players[0].hand[0]];
    if (last) {
      assert.equal(isBossCardBlocked(s, 0, 'p0-0', 'discard'), false);
      assert.equal(getBossChains(s, 0), 0, 'não cobra antes do prazo');
      s.discard.push(s.players[0].hand.pop());
    }
    completeBossPlayerTurn(s, 0);
    assert.equal(getBossChains(s, 0), 1);
    normalizeBossState(s);
    assert.equal(getBossChains(s, 0), 1);
  }
});

test('última carta exposta ainda pode cumprir a tarefa sem Chicote antecipado', () => {
  const s = game('dominadora');
  const exposed = { id: 'last-exposed', rank: '6', suit: '♠' };
  s.players[0].hand = [exposed];
  s.teams[0].melds = [cards('exposed-run', ['3','4','5'])];
  s.boss.currentIntent = { id: 'last-exposure', abilityId: 'exposure', name: 'Exposição', duration: 'target_turn', payload: { targetPlayerId: 0, cardId: exposed.id } };
  s.boss.bossFlow = { stage: 'players', queue: [] };
  normalizeBossState(s);
  assert.equal(getBossChains(s, 0), 0);
  s.teams[0].melds[0].push(s.players[0].hand.pop());
  completeBossPlayerTurn(s, 0);
  assert.equal(getBossChains(s, 0), 0);
});
test('Enxerto conta ambos os lados mesmo quando a carta termina Ás-a-Ás', () => {
  const s = game('matriarca_esmeralda'); s.boss.phase = 2;
  s.teams[0].melds = [cards('m0', ranks), cards('m1', ranks, '♥')];
  const a = { id: 'last-spade', rank: 'A', suit: '♠' }, b = { id: 'last-heart', rank: 'A', suit: '♥' };
  s.players[0].hand.push(a, b);
  activate(s, 'graft');
  const threat = s.boss.natureThreats.find(t => t.type === 'graft');
  assert.ok(threat);
  for (const [i, card] of [a,b].entries()) {
    s.players[0].hand = s.players[0].hand.filter(c => c.id !== card.id);
    s.teams[0].melds[i].push(card);
    applyBossMeldTransition(s, { teamId: 0, playerId: 0, meldIndex: i, oldKind: 'real', newKind: 'asas', cardsAdded: [card] });
    normalizeBossState(s);
    assert.equal(threat.fedMeldIds.length, i + 1);
  }
  assert.equal(threat.status, 'success');
});
test('bot alimenta raiz com carta natural antes do coringa que sujaria a canastra', async () => {
  const s = game('matriarca_esmeralda'); s.currentPlayer = 1;
  s.teams[0].melds = [cards('clean', ['3','4','5','6','7','8','9'])];
  s.players[1].hand = [{ id: 'wild-first', joker: true }, ...cards('natural', ['10','K','Q'])];
  let played = null;
  const engine = { getState: () => s, isActive: () => !played, getNaturePriorities: () => ({ meldIndexes: [0], markedCardIds: [] }),
    getDominatrixPriorities: () => null, isValidSequenceMeld: isValidBossSequence, isCardBlocked: () => false,
    teamHasGoodCanastra: () => true, executeMeldExtend: async (_p, _m, indexes) => { played = s.players[1].hand[indexes[0]]; return true; } };
  await assert.rejects(BuracoBot.processMelds(1, {}, engine), { name: 'AbortError' });
  assert.equal(played.rank, '10');
});

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
test('ordem aceita preserva o tipo visual do HUD, sem ser substituído pelo ID único', () => {
  const source = app.slice(app.indexOf('  (boss.activeOrders || [])'), app.indexOf("  if (boss.creditLimit?.status === 'active') tacticalEffects"));
  const context = { boss: { activeOrders: [{ id: 'order-unique', status: 'active', label: 'alimente jogo 2' }], interdicts: [] }, tacticalEffects: [] };
  vm.runInNewContext(source, context);
  assert.equal(context.tacticalEffects[0].id, 'dominatrix_order');
  assert.equal(context.tacticalEffects[0].label, 'alimente jogo 2');
});

test('Escolha Forçada mantém a tarefa no painel principal até o prazo', () => {
  const s = game('dominadora');
  s.boss.bossFlow = { stage: 'players', queue: [] };
  s.boss.currentIntent = null;
  s.boss.activeOrders = [{ id: 'order-visible', sourceAbilityId: 'forced_choice', status: 'active', targetPlayerId: 0,
    type: 'no_new_meld', description: 'não crie um jogo novo no próximo turno' }];
  const view = buildBossActionPresentation(s);
  assert.equal(view.name, 'Escolha Forçada');
  assert.match(view.instruction, /Biel: não crie um jogo novo/);
  assert.match(view.progress, /fim do turno/);
  assert.match(view.consequence, /\+1 Chicote/);
});

test('Raiz Fortalecida não pede contribuição repetida de quem já a alimentou', () => {
  const s = game('matriarca_esmeralda');
  s.teams[0].melds = [cards('root', ['3','4','5'])];
  normalizeBossState(s);
  // Use the same stable ID assigned by the real ability, not the array index.
  activate(s, 'hungry_root');
  const threat = s.boss.natureThreats.find(t => t.type === 'root');
  assert.ok(threat);
  Object.assign(threat, { strengthened: true, requiredContributorCount: 2, contributorPlayerIds: [1] });
  assert.deepEqual(getBossNaturePriorities(s, 1).meldIndexes, []);
  assert.deepEqual(getBossNaturePriorities(s, 0).meldIndexes, [0]);
});

test('Pólen acompanha a carta enterrada no lixo, mas não contamina cartas novas', () => {
  const s = game('matriarca_esmeralda');
  s.boss.phase = 2;
  s.discard = cards('pollen', ['6']);
  activate(s, 'discard_pollen');
  const marked = s.discard[0];
  const next = cards('next', ['8'], '♥')[0];
  s.discard.push(next);
  normalizeBossState(s);
  assert.equal(notifyBossDiscardTaken(s, 0, [next]).length, 0);
  assert.equal(s.boss.bloom, 0);
  const taken = s.discard.splice(0);
  s.players[0].hand.push(...taken);
  assert.equal(notifyBossDiscardTaken(s, 0, taken).length, 1);
  assert.equal(s.boss.bloom, 1);
  assert.equal(notifyBossDiscardTaken(s, 0, [marked]).length, 0);
  assert.equal(s.boss.bloom, 1);
});
test('timeout do bot espera a jogada em voo e descarta uma única vez', async () => {
  const s = game(); s.currentPlayer = 1;
  let release, discarded = 0;
  const pending = new Promise(resolve => { release = resolve; });
  const controller = new AbortController();
  const context = { state: s, myPlayerIndex: 0, window: { gameSessionId: 3, activeBotTurn: { promise: pending } },
    botTurnController: controller, AbortController, canPerformCommonGameAction: () => true,
    isBossTurnActive: () => false, hasPendingBossChoices: () => false, showMessage() {},
    createBotEngineForSession: () => ({ recoverBotTurn: async () => { discarded++; s.currentPlayer = 0; } }) };
  const source = app.slice(app.indexOf('async function recoverTimedOutBotTurn()'), app.indexOf('function shuffle(array)'));
  vm.runInNewContext(`${source};this.recover = recoverTimedOutBotTurn;`, context);
  const job = context.recover();
  assert.equal(controller.signal.aborted, true); assert.equal(discarded, 0);
  release(); await job;
  assert.equal(discarded, 1);
});

test('timeout antigo não substitui o controlador de uma sessão nova', async () => {
  const s = game(); s.currentPlayer = 1;
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const context = { state: s, myPlayerIndex: 0, window: { gameSessionId: 3, activeBotTurn: { promise: pending } },
    botTurnController: new AbortController(), AbortController };
  const source = app.slice(app.indexOf('async function recoverTimedOutBotTurn()'), app.indexOf('function shuffle(array)'));
  vm.runInNewContext(`${source};this.recover = recoverTimedOutBotTurn;`, context);
  const job = context.recover();
  const nextController = new AbortController();
  context.botTurnController = nextController;
  context.window.gameSessionId++;
  release(); await job;
  assert.equal(context.botTurnController, nextController);
  assert.equal(nextController.signal.aborted, false);
});
test('recuperação conclui a jogada depois de receber o segundo morto', async () => {
  const s = game('dominadora'); s.currentPlayer = 1; s.players[1].hand = []; s.deadChunksTaken[0] = 1;
  s.deadChunksMax = [2,0]; s.deadPiles = [cards('second-dead', ['3','4','5','6']), []];
  const context = { state: s, DEAD_CHUNK_SIZE: 11, sortHand() {}, processBossDeadReward() {}, normalizeBossState,
    isBossCardBlocked, teamHasGoodCanastra: () => false, showMessage() {}, finishGame: async () => {} };
  const takeDead = app.slice(app.indexOf('function takeDeadIfAvailableForPlayer(p)'), app.indexOf('function canTeamTakeDeadNow'));
  const check = app.slice(app.indexOf('  async _checkBotMortoOrWin('), app.indexOf('  async executeMeldNew('));
  const recover = app.slice(app.indexOf('  async recoverBotTurn(botIndex)'), app.indexOf('\n};', app.indexOf('  async recoverBotTurn(botIndex)')));
  vm.runInNewContext(`${takeDead};this.engine = {${check}${recover}};`, context);
  context.engine.getState = () => s;
  context.engine.executeDiscard = async (_i, index) => { s.discard.push(...s.players[1].hand.splice(index,1)); s.currentPlayer = 0; return true; };
  assert.equal(await context.engine.recoverBotTurn(1), true);
  assert.equal(s.deadChunksTaken[0], 2); assert.equal(s.discard.length, 1); assert.equal(s.players[1].hand.length, 3);
});
