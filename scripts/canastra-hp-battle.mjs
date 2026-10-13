// Headless execution of the actual app.js botEngine methods and BossBuracoBot.
// DOM/audio/network are no-ops; deck, choices, melds, items and turns are not mocked.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { CURRENT_DAMAGE, PROPOSED_DAMAGE } from './canastra-hp-loader.mjs';
import * as rules from '../js/boss/boss-engine.js';
import * as registry from '../js/boss/boss-registry.js';
import { selectBossRecoveryDiscardIndex } from '../js/boss/boss-bot-strategy.js';
import { BossBuracoBot } from '../boss-bot.js';
import { createDeck, dealInitialDeck } from '../js/deck.js';
import { stockIsExhausted, pauseBlocksPlay } from '../js/game/match-control.js';
import { isDominationDiscardDecreeActive } from '../js/game/domination-decree.js';
import { random } from './boss-battle-experiment.mjs';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
function fn(name) {
  const start = app.indexOf(`function ${name}(`);
  if (start < 0) throw Error(`Missing canonical function ${name}`);
  const end = app.indexOf('\n}', start) + 2;
  return (app.slice(start - 6, start) === 'async ' ? 'async ' : '') + app.slice(start, end);
}
const helperNames = ['isCurrentBossMode', 'canPerformCommonGameAction', 'passTurn', 'takeDeadIfAvailableForPlayer',
  'canTeamTakeDeadNow', 'teamHasGoodCanastra', 'processBossDeadReward', 'processBossMeldChange', 'finishGame',
  'shuffle', 'recycleDeadToStockIfPossible', 'sortHand', 'cardBasePoints', 'computeTeamMeldScore',
  'classifyMeldForUi', 'isWildcard', 'optimizeMeld', 'normalizeMeldOrder', 'missingRankBetween',
  'pushWildToEdge', 'autoSwapWildWhenFillingGap', 'isValidSequenceMeld'];
const helpersSource = helperNames.map(fn).join('\n');
const start = app.indexOf('const botEngine = {');
const engineSource = app.slice(start, app.indexOf('\n};\n\nfunction createBotEngineForSession', start) + 4);
const noop = () => {};

class FastBot extends BossBuracoBot {
  static getPlannerWorker() { return null; }
  static async sleep(_ms, engine, signal) { this.assertActive(engine, signal); }
  static async paceBetweenActions(engine, signal) { this.assertActive(engine, signal); }
  static async cooperativeYield(engine, signal) { this.assertActive(engine, signal); }
}

function physicalCards(s) {
  return [...s.players.flatMap(p => p.hand), ...s.teams.flatMap(t => t.melds.flat()), ...s.stock,
    ...s.discard, ...s.deadPiles.flat(), ...Object.values(s.boss.vaultsByPlayer || {}).map(v => v.card),
    ...(s.boss.combatEntities || []).flatMap(e => e.sacrificedCards || [])].filter(Boolean);
}
function assertConservation(s) {
  const cards = physicalCards(s);
  if (cards.length !== 108 || new Set(cards.map(c => c.id)).size !== 108) {
    throw Error(`Deck conservation failed: ${cards.length} cards / ${new Set(cards.map(c => c.id)).size} IDs`);
  }
  for (const meld of s.teams[0].melds) if (!rules.isValidBossSequence(meld)) throw Error('Illegal real meld');
}

export async function battle(bossId, seed, { system = 'current', hp, maxTurns = 400 } = {}) {
  const rng = random(seed), policyRng = random(seed ^ 0x61cab), oldRandom = Math.random, oldNow = Date.now,
    oldConsole = globalThis.console;
  Math.random = policyRng;
  let clock = 1000;
  Date.now = () => clock;
  const shuffled = createDeck(['♠', '♦', '♣', '♥'], ['A','2','3','4','5','6','7','8','9','10','J','Q','K']);
  const boss = rules.createBossState(bossId, seed);
  if (bossId === 'dimitrescu') rules.distributeCastleItems(boss, shuffled);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const deckHash = createHash('sha256').update(shuffled.map(c => c.id).join('|')).digest('hex');
  const dealt = dealInitialDeck(shuffled, 2, 11, 11);
  const s = { mode: registry.getBossDefinition(bossId).mode, variant: 'fechado', matchStartedAt: clock,
    turnNumber: 0, currentPlayer: seed % 2, hasDrawnThisTurn: false, finished: false,
    players: [0,1].map(id => ({ id, name: `BOT ${id}`, isBot: true, teamId: 0, hand: dealt.hands[id] })),
    teams: [{ id: 0, name: 'Cooperadores', playerIndexes: [0,1], melds: [] }, { id: 1, melds: [] }],
    stock: dealt.stock, discard: dealt.discard, deadPiles: dealt.deadPiles, deadChunksTaken: [0,0], deadChunksMax: [2,0], boss };
  if (hp != null && s.boss.maxHp !== hp) throw Error(`HP hook failed: ${s.boss.maxHp} != ${hp}`);
  const events = [], hits = [], actions = [], errors = [];
  let lastObservedHp = boss.hp, observedHealing = 0, possessionRestored = 0;
  globalThis.__canastraExperimentEvent = (b, event) => {
    if (b === s.boss) {
      const rise = Math.max(0, b.hp - lastObservedHp);
      if (event.type !== 'rebirth') observedHealing += rise;
      if (event.suppressedDamage) possessionRestored += rise;
      lastObservedHp = b.hp;
      events.push({ turn: s.turnNumber, observedHpRise: rise, ...structuredClone(event) });
    }
  };
  globalThis.__canastraExperimentDamage = (state, damage, options, result, before) => {
    if (state !== s) return; // Planner projections are NOT observed battles.
    const target = before.entities.find(e => e.id === result.targetId);
    const amplified = target?.relicAttackBonus ? Math.floor(damage * 1.2) : damage;
    const available = result.mirrorReleasedDamage || amplified;
    hits.push({ turn: s.turnNumber, round: s.boss.roundNumber, damage, available,
      sourceActionId: options.sourceActionId, ...structuredClone(result),
      targetId: result.targetId || 'boss',
      overkill: Math.max(0, available - (result.hpDamage || 0) - (result.absorbed || 0)),
      relicAdded: amplified - damage, targetHpBefore: target?.hp ?? before.hp });
  };
  let commits = 0, serial = 0, recycled = 0;
  const fakeConsole = { log: noop, warn: (...args) => errors.push({ level: 'warn', text: args.map(String).join(' ') }),
    error: (...args) => errors.push({ level: 'error', text: args.map(String).join(' ') }) };
  globalThis.console = fakeConsole;
  const context = vm.createContext({ state: s, ...rules, ...registry, selectBossRecoveryDiscardIndex,
    BossBuracoBot: FastBot, stockIsExhausted, pauseBlocksPlay, isDominationDiscardDecreeActive,
    structuredClone, Date, Math, console: fakeConsole,
    SUITS: ['♠','♦','♣','♥'], RANKS_SEQ: ['2','3','4','5','6','7','8','9','10','J','Q','K','A'],
    RANKS_SEQ_LOW: ['A','2','3','4','5','6','7','8','9','10','J','Q','K'], DEAD_CHUNK_SIZE: 11,
    IDX_HIGH: Object.fromEntries(['2','3','4','5','6','7','8','9','10','J','Q','K','A'].map((v,i) => [v,i])),
    IDX_LOW: Object.fromEntries(['A','2','3','4','5','6','7','8','9','10','J','Q','K'].map((v,i) => [v,i])),
    window: {}, document: { querySelector: () => null, getElementById: () => null },
    setTimeout: cb => { cb(); return 0; }, localExitPending: false, isDebugMode: false,
    myPlayerIndex: 0, localUndoStack: [], discardPickupAnimating: false, friendOperationPending: false,
    friendPlayback: null, ignoreOwnActionId: null, isDominationFriendBusy: () => false,
    queueDominationFriendTurn: noop, waitForDominationDecreeReaction: async () => false,
    processDominationReward: async () => null, animateDeadToHandLocal: async () => {},
    renderAll: noop, showMessage: noop, showBotTurnMessage: noop, showPendingBossChoiceMessage: noop,
    playCanastraSfx: noop, startTurnTimerIfNeeded: noop, ensureCardId: c => { if (!c?.id) throw Error('Unidentified card'); },
    newActionId: () => `sim_${seed}_${++serial}`, packCard: c => structuredClone(c),
    commitState: async () => { commits++; assertConservation(s); actions.push(structuredClone(s.lastAction)); } });
  vm.runInContext(helpersSource + '\n' + engineSource + '\nglobalThis.engine = botEngine;', context);
  const engine = context.engine;
  context.sortHand(s.players[0].hand); context.sortHand(s.players[1].hand);
  const recycle = context.recycleDeadToStockIfPossible;
  context.recycleDeadToStockIfPossible = async () => { const result = await recycle(); if (result !== null) recycled++; return result; };
  const checkpoints = {};
  const snapshot = () => ({ turn: s.turnNumber, round: boss.roundNumber, phase: boss.phase, hp: boss.hp,
    danger: boss.danger, stock: s.stock.length, deadTaken: s.deadChunksTaken[0],
    player: s.currentPlayer, hasDrawn: s.hasDrawnThisTurn, hand: s.players[s.currentPlayer].hand,
    pending: boss.pendingChoices, flow: boss.bossFlow,
    daughters: (boss.combatEntities || []).map(e => ({ id: e.id, hp: e.hp, status: e.status })) });
  let turns = 0, stop = 'turn_limit', maxPhase = 1, maxZombies = 0;
  const settle = async () => {
    for (let n = 0; n < 100 && !s.finished && !boss.result; n++) {
      maxPhase = Math.max(maxPhase, boss.phase);
      maxZombies = Math.max(maxZombies, (boss.combatEntities || []).filter(e => e.status === 'persistent').length);
      if (boss.pendingChoices.length) {
        for (const c of [...boss.pendingChoices]) {
          const event = await engine.resolvePendingBossChoice(c.playerId);
          if (!event) throw Error(`Unsupported choice ${c.type}`);
        }
        continue;
      }
      if (!boss.bossFlow || boss.bossFlow.stage === 'players') return;
      clock = Math.max(clock, (boss.bossFlow.endsAt || 0) + 1);
      rules.advanceBossTurn(s, clock);
    }
    if (!boss.result && !s.finished && boss.bossFlow?.stage !== 'players') throw Error('Boss flow failed to settle');
  };
  try {
    rules.beginBossTurn(s, { first: true, now: clock }); await settle();
    assertConservation(s);
    for (; turns < maxTurns && !s.finished && !boss.result; turns++) {
      await settle(); if (boss.result || s.finished) break;
      if (stockIsExhausted(s)) { await context.finishGame(null); break; }
      const before = s.turnNumber;
      try { await FastBot.playTurn(s, s.currentPlayer, engine); }
      catch (error) {
        if (boss.result) errors.push({ level: 'terminal', text: error.message });
        else {
          stop = 'bot_incomplete_turn';
          errors.push({ level: 'censored', text: error.message, state: snapshot(),
            vaults: structuredClone(boss.vaultsByPlayer || {}) });
          break;
        }
      }
      assertConservation(s);
      maxPhase = Math.max(maxPhase, boss.phase);
      if (s.deadChunksTaken[0] === 2 && !checkpoints.bothDeadTaken) checkpoints.bothDeadTaken = snapshot();
      for (const limit of [30,20]) if (s.stock.length <= limit && !checkpoints[`stock${limit}`]) checkpoints[`stock${limit}`] = snapshot();
      if (before === s.turnNumber && !s.finished && !boss.result) { stop = 'adapter_stalled'; break; }
    }
    await settle();
    const physical = s.teams[0].melds.map((meld, index) => ({ index, id: boss.meldIdsByIndex?.[`0:${index}`] || `0:${index}`,
      cardIds: meld.map(c => c.id), kind: context.classifyMeldForUi(meld).kind,
      plannerKind: rules.classifyBossMeldKind(meld), length: meld.length }));
    const finalCounts = { suja: 0, limpa: 0, real: 0, asas: 0 };
    for (const m of physical) if (m.kind in finalCounts) finalCounts[m.kind]++;
    const reached = Object.fromEntries(Object.keys(finalCounts).map(k => [k, new Set()]));
    const evolution = [];
    // Indexes are stable physical games in this engine; category visits are separate
    // from exclusive final categories and never used to add full bonuses repeatedly.
    for (const e of events) if (e.type === 'bossDamage' && e.newKind in reached) {
      const action = e.actionId.match(/^meld_(.*)_\d+$/)?.[1] || e.actionId;
      reached[e.newKind].add(action);
      if (e.oldKind !== e.newKind) evolution.push({ actionId: e.actionId, meld: action, turn: e.turn,
        from: e.oldKind, to: e.newKind, grantedBonus: e.canastraDamage });
    }
    const counterfactual = Object.values(boss.meldProgress || {}).reduce((sum, p) => {
      const kind = Object.keys(CURRENT_DAMAGE).find(k => (system === 'current' ? CURRENT_DAMAGE : PROPOSED_DAMAGE)[k] === p.damageValue);
      return sum + (kind ? PROPOSED_DAMAGE[kind] - CURRENT_DAMAGE[kind] : 0);
    }, 0);
    const sum = (type, field) => events.filter(e => e.type === type).reduce((n,e) => n + Number(e[field] || 0), 0);
    return { bossId, seed, system, initialHp: boss.maxHp, deckHash, complete: !!boss.result,
      victory: boss.result?.victory ?? null, reason: boss.result?.reason || stop,
      turns, rounds: boss.roundNumber, phase: boss.phase, maxPhase, hp: boss.hp, danger: boss.danger,
      finalCounts, reachedCounts: Object.fromEntries(Object.entries(reached).map(([k,v]) => [k,v.size])),
      physicalMelds: physical, evolution, counterfactualBonusExtra: counterfactual,
      damage: { cards: sum('bossDamage','cardDamage'), bonuses: sum('bossDamage','canastraDamage'),
        suppressedCards: sum('bossDamage','newMoonSuppressedDamage') + sum('bossDamage','tigerClawSuppressedDamage'),
        possessionReapplied: sum('bossDamage','possessionReappliedDamage'),
        mainAttack: hits.filter(h => h.targetId === 'boss').reduce((n,h) => n + (h.hpDamage || 0),0),
        auxiliaryAttack: hits.filter(h => h.targetId !== 'boss').reduce((n,h) => n + (h.hpDamage || 0),0),
        absorbed: hits.reduce((n,h) => n + (h.absorbed || 0),0),
        overkill: hits.reduce((n,h) => n + h.overkill,0), relicAdded: hits.reduce((n,h) => n + h.relicAdded,0),
        dagger: sum('daggerTransfer','amount'), itemImpact: sum('castleItem','appliedDamage'),
        bleed: sum('daughterBleed','amount'), bossHealing: observedHealing,
        bossHealingEvents: sum('bossHeal','amount'), possessionRestored,
        daughterHealing: sum('daughterRegen','amount'), rebirth: sum('rebirth','reviveHp') || (boss.rebirthUsed ? 300 : 0) },
      deadTaken: s.deadChunksTaken[0], recycled, stock: s.stock.length, checkpoints,
      itemsUsed: events.filter(e => e.type === 'castleItem').map(e => ({ item: e.itemType, target: e.targetId, turn: e.turn })),
      maxZombies, flowerLimit: boss.maxBloom ?? (bossId === 'matriarca_esmeralda' ? 10 : null),
      specialChargesUnused: boss.cooperativeSpecial?.points ?? null,
      specialActivations: boss.cooperativeSpecial?.activations || 0, commits, errors, events, hits, actions };
  } finally {
    delete globalThis.__canastraExperimentEvent; delete globalThis.__canastraExperimentDamage;
    Math.random = oldRandom; Date.now = oldNow; globalThis.console = oldConsole;
  }
}
