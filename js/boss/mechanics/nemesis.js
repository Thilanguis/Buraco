import { NEMESIS_ZOMBIES, NEMESIS_OBJECTIVE_BALANCE, nemesisDefinition } from '../bosses/nemesis.js';
import { createCombatEntities, normalizeCombatEntities, damageCombatEntity, healCombatEntity, reviveCombatEntity } from '../boss-combat.js';

const persistent = (entry) => entry.status === 'persistent' && entry.hp > 0;
const alive = (boss, id) => boss.combatEntities.find((entry) => entry.id === id && persistent(entry));
// A zombie may return from death only once in an entire match, even if it
// dies again in a later phase. The persisted `revivals` field tracks this.
const canReanimateZombie = (entry) => entry?.status === 'corpse' && (entry.revivals || 0) < 1;
export const nemesisPersistentCount = (boss) => boss.combatEntities.filter(persistent).length;
const hand = (state, id) => state.players.find((player) => player.id === id)?.hand || [];
const turnKey = (state, playerId) => `${state.turnNumber || 0}:${playerId}`;
const boosted = (boss, id) => boss.hordeBuff?.entityId === id && boss.roundNumber <= boss.hordeBuff.expiresRound;
const objectiveIds = new Set(['stars_hunt', 'infectious_tentacle', 'tentacle_barrage', 'stars_extermination']);

// Stateless event RNG: canonical ID order makes hand reordering irrelevant.
function eventRandom(boss, event) {
  let seed = 2166136261;
  for (const char of `${boss.seed}:${event}`) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return () => {
    seed += 0x6D2B79F5;
    let value = Math.imul(seed ^ seed >>> 15, seed | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
function shuffledIds(boss, event, ids) {
  const result = [...new Set(ids)].sort(), random = eventRandom(boss, event);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function getNemesisGrabberTarget(gameState) {
  const { boss, players } = gameState;
  const ids = players.map(p => p.id).sort((a,b) => String(a).localeCompare(String(b)));
  const saved = boss.grabberPursuit;
  const order = saved?.version === 1 && saved.playerIds?.length === ids.length && ids.every(id => saved.playerIds.includes(id))
    ? saved.playerIds : shuffledIds(boss, 'grabber:first-player', ids);
  return order[(Math.max(1, boss.roundNumber || 1) - 1) % order.length] ?? null;
}

function resetDevourerFeed(boss, gameState = null) {
  boss.devourerFeed = { version: 2, active: !!alive(boss, 'devourer'), credits: 0,
    countedCardIds: [...new Set([...(boss.damagedCardIds || []), ...(gameState?.teams?.[0]?.melds || []).flat().map(card => card.id)])] };
}

function healFromDevourerFeed(boss, gameState, playerId, recordBossEvent) {
  const entity = alive(boss, 'devourer'), feed = boss.devourerFeed;
  if (!entity || gameState.finished || boss.result || boss.defeated || boss.hp <= 0 || !feed?.active) return;
  while (feed.credits >= 3) {
    feed.credits -= 3;
    const sequence = ++boss.devourerHealSequence;
    const amount = Math.min(boss.maxHp - boss.hp, getNemesisZombieEffect(boss, entity).value);
    const hpBefore = boss.hp;
    boss.hp += amount;
    boss.devourerHealingTotal = (boss.devourerHealingTotal || 0) + amount;
    if (amount) recordBossEvent({ type: 'bossHeal', actionId: `devourer:v2:${sequence}`, sourceEntityId: 'devourer', playerId, turnId: turnKey(gameState, playerId), amount, hpBefore, hp: boss.hp,
      outcome: `Devorador: Nemesis recuperou ${amount} HP.` });
  }
}

export function getNemesisZombieEffect(boss, entity) {
  const reinforced = boosted(boss, entity.id);
  const normal = entity.id === 'grabber' ? 1 : entity.id === 'infected' ? 2 : 20;
  const mutated = entity.id === 'grabber' ? 2 : entity.id === 'infected' ? 4 : 35;
  const bonus = entity.id === 'grabber' ? 1 : entity.id === 'infected' ? 2 : 15;
  const value = (entity.mutated ? mutated : normal) + (reinforced ? bonus : 0);
  return { normal, mutated, bonus, value, reinforced,
    label: entity.id === 'grabber' ? `AGARRA ${value}` : entity.id === 'infected' ? `INFECÇÃO +${value}` : `CURA ${value}` };
}

export function projectNemesisInfection(boss, amount, { failure = false } = {}) {
  let infectedAmount = 0, reinforcedAmount = 0, omegaAmount = 0, mutated = false;
  if (failure && amount > 0) {
    const infected = (boss.combatEntities || []).find(entry => entry.id === 'infected' && persistent(entry));
    if (infected) {
      const effect = getNemesisZombieEffect(boss, infected);
      mutated = !!infected.mutated;
      infectedAmount = mutated ? effect.mutated : effect.normal;
      reinforcedAmount = effect.reinforced ? effect.bonus : 0;
    }
    if (boss.omegaBuff && boss.roundNumber <= boss.omegaBuff.expiresRound) omegaAmount = boss.danger < 50 ? 2 : boss.danger < 75 ? 4 : 6;
  }
  const before = boss.danger || 0;
  const total = amount + infectedAmount + reinforcedAmount + omegaAmount;
  return { base: amount, infectedAmount, reinforcedAmount, omegaAmount, mutated, total,
    applied: boss.result ? 0 : Math.max(0, Math.min(100, before + total)) - before };
}

export function getNemesisObjectiveOutcome(boss, intent) {
  const payload = intent.payload || {};
  // Live pre-rework snapshots finish their already announced v1 objective.
  const current = payload.objectiveVersion === 2;
  const fulfilled = intent.abilityId === 'stars_hunt' ? Number(current ? payload.directDamage >= payload.requiredDamage : !!payload.contributed)
    : intent.abilityId === 'stars_extermination' ? current ? Number(payload.directDamage >= payload.requiredDamage) + Number(!!payload.partnerContributed) : Number(!!payload.contributed) + Number(!!payload.secondExited)
      : intent.abilityId === 'infectious_tentacle' && current ? payload.playedMarkedCardIds?.length ? 2 : payload.exitedCardIds?.length ? 1 : 0
      : (payload.exitedCardIds || []).length >= payload.required ? 1 : 0;
  const graded = intent.abilityId === 'stars_extermination' || (current && intent.abilityId === 'infectious_tentacle');
  const failed = graded ? fulfilled < 2 : !fulfilled;
  const base = graded ? fulfilled === 2 ? 0 : fulfilled === 1 ? payload.partialFailure ?? 8 : payload.failure ?? 16 : failed ? payload.failure ?? 6 + boss.phase * 2 : 0;
  return { fulfilled, failed, ...projectNemesisInfection(boss, base, { failure: failed }) };
}

export function changeNemesisInfection(boss, amount, eventId, { failure = false } = {}) {
  if (boss.result || boss.infectionEventIds.includes(eventId)) return 0;
  boss.infectionEventIds.push(eventId);
  if (boss.infectionEventIds.length > 100) boss.infectionEventIds.splice(0, boss.infectionEventIds.length - 100);
  const before = boss.danger;
  boss.danger += projectNemesisInfection(boss, amount, { failure }).applied;
  if (boss.danger >= 100) boss.result = { victory: false, reason: 'max_infection', title: 'Infecção Total', detail: 'A Infecção atingiu 100. A batalha terminou.' };
  return boss.danger - before;
}

// Uses the existing engine's legal sequence and discard predicates. Every plan
// includes the remaining legal discard, so two individually possible moves are
// never mistaken for a jointly feasible objective.
export function findNemesisLegalPlan(state, player, helpers, predicate = () => true) {
  const cards = (player?.hand || []).filter((card) => card?.id && !helpers.blocked(player.id, card.id, 'play'));
  const melds = state.teams?.[player.teamId]?.melds || [];
  const consider = (moves) => {
    if (helpers.canLeaveHand && !helpers.canLeaveHand(player, moves, state)) return null;
    const played = moves.flatMap((move) => move.cardIds);
    const remaining = hand(state, player.id).filter((card) => !played.includes(card.id));
    const discards = remaining.filter((card) => card.id !== state.pickedDiscardCardId && !helpers.blocked(player.id, card.id, 'discard'));
    if (remaining.length && !discards.length) return null;
    // The first legal discard is not necessarily the objective's legal discard.
    // AGARRADA only blocks play, so consider every legal exit before rejecting.
    for (const discard of remaining.length ? discards : [null]) {
      const plan = { moves, playedCardIds: played, discardCardId: discard?.id || null };
      if (predicate(plan)) return plan;
    }
    return null;
  };
  const singles = [];
  for (let index = 0; index < melds.length; index += 1) {
    for (const card of cards) {
      if (!helpers.validSequence([...melds[index], card])) continue;
      const move = { meldIndex: index, cardIds: [card.id] };
      const plan = consider([move]);
      if (plan) return plan;
      singles.push(move);
    }
  }
  for (let a = 0; a < singles.length; a += 1) for (let b = a + 1; b < singles.length; b += 1) {
    if (singles[a].cardIds[0] === singles[b].cardIds[0]) continue;
    if (singles[a].meldIndex === singles[b].meldIndex && !helpers.validSequence([...melds[singles[a].meldIndex], ...cards.filter((card) => [singles[a].cardIds[0], singles[b].cardIds[0]].includes(card.id))])) continue;
    const plan = consider([singles[a], singles[b]]);
    if (plan) return plan;
  }
  for (let a = 0; a < cards.length; a += 1) for (let b = a + 1; b < cards.length; b += 1) for (let c = b + 1; c < cards.length; c += 1) {
    const trio = [cards[a], cards[b], cards[c]];
    if (!helpers.validSequence(trio)) continue;
    const plan = consider([{ meldIndex: null, cardIds: trio.map((card) => card.id) }]);
    if (plan) return plan;
  }
  // A two-card extension can fill a gap even if neither card works alone.
  for (let index = 0; index < melds.length; index += 1) for (let a = 0; a < cards.length; a += 1) for (let b = a + 1; b < cards.length; b += 1) {
    if (!helpers.validSequence([...melds[index], cards[a], cards[b]])) continue;
    const plan = consider([{ meldIndex: index, cardIds: [cards[a].id, cards[b].id] }]);
    if (plan) return plan;
  }
  return null;
}

function preferredPlayers(state) {
  return [...state.players].sort((a, b) => Number(b.id === state.boss.starsPlayerId) - Number(a.id === state.boss.starsPlayerId));
}

function starsCandidates(state) {
  return state.boss.starsPlayerId == null ? preferredPlayers(state)
    : state.players.filter(player => player.id === state.boss.starsPlayerId);
}

function previewPlan(state, player, plan) {
  const preview = { ...state, players: state.players.map(p => ({ ...p, hand: [...p.hand] })),
    teams: state.teams.map(team => ({ ...team, melds: team.melds.map(meld => [...meld]) })) };
  for (const move of plan.moves) {
    const cards = player.hand.filter(card => move.cardIds.includes(card.id));
    if (move.meldIndex == null) preview.teams[player.teamId].melds.push(cards);
    else preview.teams[player.teamId].melds[move.meldIndex].push(...cards);
  }
  preview.players.find(p => p.id === player.id).hand = player.hand.filter(card => !plan.playedCardIds.includes(card.id) && card.id !== plan.discardCardId);
  return preview;
}

// Joint proof in actual turn order. Both roles and the existing destination are
// frozen at announcement; later S.T.A.R.S. changes do not move this objective.
function exterminationPlan(state, helpers, payload) {
  const remaining = entryPlayers(state), plans = [];
  const needs = player => player.id === payload.targetPlayerId
    ? payload.directDamage < payload.requiredDamage : player.id === payload.partnerPlayerId && !payload.partnerContributed;
  const accepts = (player, plan, preview = state) => player.id === payload.targetPlayerId
    ? helpers.damageForPlan(player, plan, preview) > 0
    : plan.moves.some(move => move.meldIndex != null && payload.partnerMeldIds.includes(helpers.meldId(player.teamId, move.meldIndex)));
  const players = remaining.filter(needs);
  if (!players.length) return { teamPlans: plans, moves: [], playedCardIds: [], discardCardId: null };
  const [first, second] = players;
  let result = null;
  findNemesisLegalPlan(state, first, helpers, plan => {
    if (!accepts(first, plan)) return false;
    if (!second) { result = [{ ...plan, playerId: first.id }]; return true; }
    const preview = previewPlan(state, first, plan);
    const secondPlayer = preview.players.find(player => player.id === second.id);
    const next = findNemesisLegalPlan(preview, secondPlayer, helpers, candidate => accepts(secondPlayer, candidate, preview));
    if (!next) return false;
    result = [{ ...plan, playerId: first.id }, { ...next, playerId: second.id }]; return true;
  });
  return result ? { teamPlans: result, moves: [], playedCardIds: [], discardCardId: null } : null;
}

function entryPlayers(state) {
  const acted = state.boss.playersActedThisRound || [];
  const firstId = acted.length ? state.players[state.currentPlayer]?.id : state.boss.roundFirstPlayerId ?? state.players[state.currentPlayer]?.id;
  const firstIndex = Math.max(0, state.players.findIndex((player) => player.id === firstId));
  return [...state.players.slice(firstIndex), ...state.players.slice(0, firstIndex)].filter((player) => !acted.includes(player.id));
}

// Prove a cooperative solution by applying the first player's legal plan to a
// private preview, then validating the second plan against that resulting table.
function teamEntryPlan(state, helpers, kind, progress = {}) {
  const players = entryPlayers(state);
  const satisfies = (plans) => kind === 'infected'
    ? new Set([...(progress.contributionCardIds || []), ...plans.flatMap((plan) => plan.playedCardIds)]).size >= 2
    : new Set([...(progress.devourerCardIds || []), ...plans.flatMap((plan) => plan.moves
      .filter((move) => move.meldIndex != null && move.meldIndex < state.teams[0].melds.length)
      .filter((move) => !progress.entryMeldIds || progress.entryMeldIds.includes(helpers.meldId(0, move.meldIndex)))
      .flatMap((move) => move.cardIds))]).size >= 3;
  for (const player of players) {
    const plan = findNemesisLegalPlan(state, player, helpers, (candidate) => satisfies([candidate]));
    if (plan) return [{ ...plan, playerId: player.id }];
  }
  const [first, second] = players;
  if (!first || !second) return null;
  const candidates = [];
  findNemesisLegalPlan(state, first, helpers, (candidate) => {
    if (candidates.length < 32 && candidate.moves.some((move) => kind === 'infected' || move.meldIndex != null)) candidates.push(candidate);
    return false;
  });
  for (const plan of candidates) {
    const preview = { ...state, players: state.players.map((player) => ({ ...player, hand: [...player.hand] })), teams: state.teams.map((team) => ({ ...team, melds: team.melds.map((meld) => [...meld]) })) };
    for (const move of plan.moves) {
      const cards = first.hand.filter((card) => move.cardIds.includes(card.id));
      if (move.meldIndex == null) preview.teams[first.teamId].melds.push(cards);
      else preview.teams[first.teamId].melds[move.meldIndex].push(...cards);
    }
    const partnerPlan = findNemesisLegalPlan(preview, preview.players.find((player) => player.id === second.id), helpers, (candidate) => satisfies([plan, candidate]));
    if (partnerPlan) return [{ ...plan, playerId: first.id }, { ...partnerPlan, playerId: second.id }];
  }
  return null;
}

function entryCandidates(state, helpers) {
  const boss = state.boss;
  if (nemesisPersistentCount(boss) >= boss.phase) return [];
  return boss.combatEntities.filter((entity) => ['absent', 'repelled'].includes(entity.status)).flatMap((entity) => {
    if (entity.id === 'grabber') {
      for (const player of preferredPlayers(state).filter((player) => entryPlayers(state).some((entry) => entry.id === player.id))) {
        const cardIds = shuffledIds(boss, `mark:invasion:${boss.roundNumber}:${boss.actionSequence}:${player.id}`, helpers.objectiveExitCardIds(player));
        if (cardIds.length) return [{ entityId: entity.id, entryKind: entity.id, duration: 'target_turn', targetPlayerId: player.id, targetPlayerName: player.name,
          cardIds: [cardIds[0]], required: 1, exitedCardIds: [] }];
      }
      return [];
    }
    // Failure is legitimate. Devorador still needs an existing game capable of
    // extension, but neither invasion requires the cards to repel it in hand.
    const valid = entryPlayers(state).length > 0
      && (entity.id !== 'devourer' || helpers.extendableMeldIndexes().length > 0);
    return valid ? [{ entityId: entity.id, entryKind: entity.id, duration: 'full_round', contributionCardIds: [], entryMeldIds: state.teams[0].melds.map((_meld, index) => helpers.meldId(0, index)),
      ...(entity.id === 'devourer' ? { devourerCardIds: [], entryTableCardIds: state.teams[0].melds.flat().map(card => card.id) } : { fedMeldIds: [] }) }] : [];
  });
}

function canLegallyTakeDiscard(state, player, helpers) {
  const top = state.discard?.at(-1);
  if (!top || helpers.discardBlocked?.(player.id) || (!state.stock?.length && !state.deadPiles?.some((pile) => pile?.length))) return false;
  // The official sequence validator and boss blocking predicates are the same
  // used by drawFromDiscardOnce. Only the top enters the mandatory meld.
  const preview = { ...state, players: state.players.map((entry) => entry.id === player.id ? { ...entry, hand: [...entry.hand, top] } : entry) };
  const previewPlayer = preview.players.find((entry) => entry.id === player.id);
  const pickupHelpers = { ...helpers, canLeaveHand: (_player, moves) => {
    const selected = moves.flatMap((move) => move.cardIds).filter((id) => id !== top.id);
    const destination = moves.find((move) => move.cardIds.includes(top.id));
    if (!destination) return false;
    const quote = helpers.discardPickupQuote?.(player.id, { meldIndex: destination.meldIndex ?? null, handCardIds: destination.cardIds.filter(id => id !== top.id) });
    if (quote && !quote.allowed) return false;
    const count = quote?.count ?? state.discard.length;
    const resultingSize = player.hand.length - selected.length + count - 1;
    // Include the mandatory top in canastra classification and the lower pile
    // in finishing math, without making those lower cards available to play.
    const afterPickup = { ...player, hand: [...player.hand, ...state.discard.slice(-count)] };
    return resultingSize > 1 || helpers.canLeaveHand?.(afterPickup, moves) !== false;
  } };
  return !!findNemesisLegalPlan(preview, previewPlayer, pickupHelpers, (plan) => plan.playedCardIds.includes(top.id));
}

function resolveEntry(boss, intent, gameState) {
  const payload = intent.payload;
  if (payload.resolved) return;
  const entity = boss.combatEntities.find((entry) => entry.id === payload.entityId && entry.status === 'entering');
  if (!entity) return;
  const success = payload.entryKind === 'grabber' ? payload.exitedCardIds.length >= 1
    : payload.entryKind === 'infected' ? payload.contributionCardIds.length >= 2 : (payload.devourerCardIds || []).length >= 3;
  entity.status = success ? 'repelled' : 'persistent';
  entity.hp = entity.maxHp;
  entity.mutated = !success && boss.phase >= 3;
  entity.diedAt = null;
  entity.transitionEventId = `${intent.id}:${entity.status}`;
  entity.transitionAt = Date.now();
  if (entity.id === 'devourer') resetDevourerFeed(boss, gameState);
  if (success) boss.lastRepelledZombieId = entity.id;
  payload.resolved = true; payload.entrySuccess = success;
  payload.infectionApplied = 0;
  payload.resolutionText = `${entity.name}: ${success ? 'repelido; saiu da mesa' : 'persistiu; debuff ativo'}.`;
}

function buildPayload({ gameState: state, helpers }, abilityId) {
  const boss = state.boss;
  const base = { phase: boss.phase, failure: NEMESIS_OBJECTIVE_BALANCE.failure[boss.phase] };
  if (abilityId === 'stars_hunt' || abilityId === 'stars_extermination') {
    for (const player of starsCandidates(state).filter(player => entryPlayers(state).some(p => p.id === player.id))) {
      const payload = { ...base, objectiveVersion: 2, targetPlayerId: player.id,
        requiredDamage: NEMESIS_OBJECTIVE_BALANCE.directDamage, directDamage: 0, damageActionIds: [] };
      if (abilityId === 'stars_hunt') return payload;
      const partner = entryPlayers(state).find(p => p.id !== player.id);
      if (!partner) continue;
      payload.partnerPlayerId = partner.id; payload.partnerContributed = false;
      payload.partnerMeldIds = state.teams[player.teamId].melds.map((_meld,index) => helpers.meldId(player.teamId,index));
      payload.failure = NEMESIS_OBJECTIVE_BALANCE.exterminationFailure; payload.partialFailure = NEMESIS_OBJECTIVE_BALANCE.exterminationPartial;
      const targets = helpers.extendableMeldIndexes();
      if (!targets.length) continue;
      payload.partnerMeldIndex = targets[helpers.pickIndex(targets.length)];
      payload.partnerMeldIds = [helpers.meldId(partner.teamId, payload.partnerMeldIndex)];
      return payload;
    }
    return null;
  }
  if (abilityId === 'horde_invasion') {
    let candidates = entryCandidates(state, helpers);
    if (candidates.length > 1 && boss.lastRepelledZombieId) candidates = candidates.filter((candidate) => candidate.entityId !== boss.lastRepelledZombieId);
    return candidates.length ? { ...base, ...candidates[helpers.pickIndex(candidates.length)] } : null;
  }
  if (abilityId === 'horde_command') {
    const entries = boss.combatEntities.filter(persistent);
    const entity = entries[helpers.pickIndex(entries.length)];
    return entity ? { ...base, entityId: entity.id } : null;
  }
  if (abilityId === 'parasite_regeneration') {
    const entity = boss.combatEntities.filter((entry) => persistent(entry) && entry.hp < entry.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    return entity ? { ...base, entityId: entity.id } : null;
  }
  if (abilityId === 'viral_reanimation') {
    const entity = boss.combatEntities.find(canReanimateZombie);
    return entity && nemesisPersistentCount(boss) < boss.phase && !boss.reanimationsByPhase[boss.phase] ? { ...base, entityId: entity.id } : null;
  }
  if (abilityId === 'rocket_launcher') {
    const melds = state.teams?.[0]?.melds || [];
    for (let index = 0; index < melds.length; index += 1) {
      if (!helpers.validSequence(melds[index])) continue;
      // A real continuation must exist; a matching card need not be in hand now.
      const feedable = helpers.extendableMeldIndexes().includes(index);
      if (feedable) return { ...base, meldId: helpers.meldId(0, index), meldIndex: index, infectionCost: boss.phase === 3 ? 12 : 10 };
    }
    return null;
  }
  if (abilityId === 'omega_outbreak') return base;
  for (const player of preferredPlayers(state)) {
    const cards = hand(state, player.id).filter((card) => card?.id);
    if (abilityId === 'contaminated_zone') {
      if (canLegallyTakeDiscard(state, player, helpers)) return { ...base, targetPlayerId: player.id };
    } else if (abilityId === 'infectious_tentacle' && cards.length >= 2) {
      const cardIds = objectiveExitCards(state, player, helpers, 2, abilityId);
      if (!cardIds) continue;
      return { ...base, objectiveVersion: 2, partialFailure: NEMESIS_OBJECTIVE_BALANCE.tentaclePartial[boss.phase],
        targetPlayerId: player.id, cardIds, required: 1, playedMarkedCardIds: [], exitedCardIds: [] };
    } else if (abilityId === 'tentacle_barrage' && cards.length >= 3) {
      const cardIds = objectiveExitCards(state, player, helpers, 3, abilityId);
      if (!cardIds) continue;
      return { ...base, targetPlayerId: player.id, cardIds, required: 2, failure: 16, exitedCardIds: [] };
    }
  }
  return null;
}

function objectiveExitCards(state, player, helpers, count, abilityId) {
  const ids = shuffledIds(state.boss, `mark:${abilityId}:${state.boss.roundNumber}:${state.boss.actionSequence}:${player.id}`, helpers.objectiveExitCardIds(player));
  return ids.length >= count ? ids.slice(0, count) : null;
}

export function chooseNemesisDamageTarget(state, damage, playerId = state.players[state.currentPlayer]?.id) {
  const boss = state.boss;
  const intent = boss.currentIntent, payload = intent?.payload;
  if (payload?.objectiveVersion === 2 && ['stars_hunt', 'stars_extermination'].includes(intent.abilityId)
    && !payload.resolved && payload.targetPlayerId === playerId && payload.directDamage < payload.requiredDamage && damage > 0) return 'boss';
  if (damage >= boss.hp) return 'boss';
  let best = { id: 'boss', score: Math.min(damage, boss.hp) * (boss.hp < 600 ? 1.8 : 0.65) };
  for (const entity of boss.combatEntities.filter(persistent)) {
    const lethal = damage >= entity.hp;
    const utility = entity.id === 'infected' ? 75 + boss.danger * 3.5
      : entity.id === 'devourer' ? 140 + Math.min(180, boss.devourerHealingTotal || 0)
        : 90 + (entity.mutated ? 50 : 0);
    const score = Math.min(damage, entity.hp) * 0.5 + utility * (lethal ? 1.5 : 0.35);
    if (score > best.score) best = { id: entity.id, score };
  }
  return best.id;
}

export const nemesisBossMechanics = Object.freeze({
  id: 'nemesis',
  createState: () => ({ combatLifecycleVersion: 1, combatEntities: createCombatEntities(NEMESIS_ZOMBIES, { initialStatus: 'absent' }), lastRepelledZombieId: null, combatTargetsByPlayer: {}, starsPlayerId: null, grabbedByPlayer: {}, grabbedTurnIds: [], grabberPursuit: null, reanimationsByPhase: {}, infectionEventIds: [], devourerHealSequence: 0, devourerFeed: { version: 2, active: false, credits: 0, countedCardIds: [] }, devourerHealingTotal: 0, hordeBuff: null, omegaBuff: null, impactZone: null }),
  normalize({ boss, gameState }) {
    normalizeCombatEntities(boss, NEMESIS_ZOMBIES, { lifecycle: true });
    boss.combatTargetsByPlayer ||= {}; boss.grabbedByPlayer ||= {}; boss.reanimationsByPhase ||= {};
    boss.maxHp = nemesisDefinition.maxHp; boss.hp = Math.max(0, Math.min(boss.maxHp, boss.hp));
    boss.grabbedTurnIds ||= [];
    const first = getNemesisGrabberTarget({ ...gameState, boss: { ...boss, roundNumber: 1 } });
    boss.grabberPursuit = { version: 1, playerIds: [first, ...gameState.players.filter(p => p.id !== first).map(p => p.id)] };
    for (const [playerId, lock] of Object.entries(boss.grabbedByPlayer)) {
      const key = turnKey(gameState, playerId);
      if (lock.turnId && lock.turnId !== key) delete boss.grabbedByPlayer[playerId];
      else if (!boss.grabbedTurnIds.includes(key)) boss.grabbedTurnIds.push(key);
    }
    if (!alive(boss, 'grabber')) boss.grabbedByPlayer = {};
    boss.infectionEventIds ||= [];
    delete boss.devourerTurnIds; // v1 per-turn quota is no longer a gameplay rule.
    boss.devourerHealSequence = Math.max(0, Math.floor(Number(boss.devourerHealSequence) || 0),
      ...(boss.eventLog || []).map(e => Number(/^devourer:v2:(\d+)$/.exec(e.actionId)?.[1]) || 0));
    // Keep the partial group, discard legacy queued full groups, never heal on
    // load. Preserve counted IDs so the old table cannot be credited again.
    if (!boss.devourerFeed || !alive(boss, 'devourer')
      || !boss.devourerFeed.active) resetDevourerFeed(boss, gameState);
    boss.devourerFeed.credits = Math.max(0, Math.floor(Number(boss.devourerFeed.credits) || 0));
    if (boss.devourerFeed.version !== 2) {
      boss.devourerFeed.discardedLegacyCredits = boss.devourerFeed.credits - boss.devourerFeed.credits % 3;
      boss.devourerFeed.credits %= 3;
      boss.devourerFeed.version = 2;
    }
    boss.devourerFeed.countedCardIds = [...new Set(boss.devourerFeed.countedCardIds || [])];
    boss.danger = Math.max(0, Math.min(100, Number(boss.danger) || 0));
    if (boss.starsPlayerId != null && !gameState.players.some((player) => player.id === boss.starsPlayerId)) boss.starsPlayerId = null;
    if (boss.danger >= 100 && !boss.result) boss.result = { victory: false, reason: 'max_infection', title: 'Infecção Total', detail: 'A Infecção atingiu 100.' };
  },
  buildPayload,
  eligibilityDetails({ gameState, helpers }, abilityId) {
    const boss = gameState.boss;
    if (abilityId !== 'horde_invasion') return null;
    const candidates = new Set(entryCandidates(gameState, helpers).map(entry => entry.entityId));
    return boss.combatEntities.map(entity => ({
      entityId: entity.id, eligible: candidates.has(entity.id),
      reason: candidates.has(entity.id) ? null
        : nemesisPersistentCount(boss) >= boss.phase ? 'phase_cap'
        : !['absent', 'repelled'].includes(entity.status) ? `lifecycle:${entity.status}`
        : !entryPlayers(gameState).length ? 'no_remaining_player'
        : entity.id === 'devourer' ? 'no_extendable_existing_game' : 'no_legal_mark_exit',
    }));
  },
  validPayload: (_context, _id, payload) => !!payload,
  announceIntent({ boss, intent }) {
    if (intent.abilityId !== 'horde_invasion') return;
    const entity = boss.combatEntities.find((entry) => entry.id === intent.payload.entityId);
    if (!entity || !['absent', 'repelled'].includes(entity.status)) return;
    entity.status = 'entering'; entity.mutated = false;
    entity.entryIntentId = intent.id;
    entity.transitionEventId = `${intent.id}:entering`; entity.transitionAt = Date.now();
  },
  activateIntent({ boss, intent }) {
    if (!intent || intent.payload.activated) return;
    intent.payload.activated = true;
    if (intent.abilityId === 'horde_command') boss.hordeBuff = { entityId: intent.payload.entityId, expiresRound: boss.roundNumber + 1, sourceIntentId: intent.id };
    if (intent.abilityId === 'omega_outbreak') boss.omegaBuff = { expiresRound: boss.roundNumber + 1, sourceIntentId: intent.id };
    if (intent.abilityId === 'rocket_launcher') boss.impactZone = { ...intent.payload, expiresRound: boss.roundNumber, sourceIntentId: intent.id };
  },
  resolveIntent({ boss, intent, gameState }) {
    const payload = intent.payload;
    if (intent.abilityId === 'horde_invasion') resolveEntry(boss, intent, gameState);
    if (intent.abilityId === 'parasite_regeneration') payload.healed = healCombatEntity(alive(boss, payload.entityId), 100);
    if (intent.abilityId === 'viral_reanimation' && nemesisPersistentCount(boss) < boss.phase && !boss.reanimationsByPhase[intent.announcedPhase]) {
      const entity = boss.combatEntities.find((entry) => entry.id === payload.entityId);
      // An already announced intent must also honor the per-zombie limit.
      if (canReanimateZombie(entity) && reviveCombatEntity(entity, boss.phase)) {
        boss.reanimationsByPhase[intent.announcedPhase] = intent.id;
        if (entity.id === 'devourer') resetDevourerFeed(boss, gameState);
      }
    }
    return { outcome: payload.resolutionText || (payload.healed != null ? `Regeneração: +${payload.healed} HP.` : `${intent.name}: período resolvido.`), resultData: { infectionApplied: payload.infectionApplied || 0, targetEntityId: payload.entityId || null } };
  },
  applyDamage({ boss, gameState, damage, playerId, sourceActionId }) {
    if (boss.result) return { hpDamage: 0, targetId: 'boss', absorbed: 0, reborn: false };
    const player = gameState.players.find((entry) => entry.id === playerId);
    const selected = player?.isBot || player?.name?.toUpperCase().includes('BOT') ? chooseNemesisDamageTarget(gameState, damage, playerId) : boss.combatTargetsByPlayer[playerId] || 'boss';
    const entity = alive(boss, selected);
    // A stale target is rejected by the selector; if it dies between actions,
    // the next action safely defaults to boss (never spills the current hit).
    let hpDamage = 0;
    if (entity) {
      hpDamage = damageCombatEntity(entity, damage, sourceActionId);
      if (entity.id === 'grabber' && entity.hp === 0) boss.grabbedByPlayer = {};
      if (entity.id === 'devourer' && entity.hp === 0) resetDevourerFeed(boss);
    }
    else {
      hpDamage = Math.min(boss.hp, Math.max(0, damage)); boss.hp -= hpDamage;
      if (hpDamage && playerId != null) boss.starsPlayerId = playerId;
      const intent = boss.currentIntent, payload = intent?.payload;
      if (hpDamage && payload?.objectiveVersion === 2 && ['stars_hunt', 'stars_extermination'].includes(intent.abilityId)
        && payload.targetPlayerId === playerId && !payload.resolved && !payload.damageActionIds.includes(sourceActionId)) {
        payload.damageActionIds.push(sourceActionId); payload.directDamage += hpDamage;
      }
    }
    return { hpDamage, targetId: entity?.id || 'boss', absorbed: 0, reborn: false };
  },
  isCardBlocked(boss, playerId, cardId, action) { return action === 'play' && !!alive(boss, 'grabber') && !!boss.grabbedByPlayer?.[playerId]?.cardIds?.includes(cardId); },
  cardEffect({ boss, playerId, cardId }) {
    const grabbed = !!alive(boss, 'grabber') && !!boss.grabbedByPlayer[playerId]?.cardIds.includes(cardId);
    const intent = boss.currentIntent;
    const marked = intent?.payload.targetPlayerId === playerId && !intent.payload.resolved && (intent.payload.cardIds?.includes(cardId) || intent.payload.secondCardId === cardId);
    if (marked && grabbed) return ['nemesis-marked', 'nemesis-grabbed'];
    return marked ? 'nemesis-marked' : grabbed ? 'nemesis-grabbed' : null;
  },
  cardBlockFeedback: () => ({ effect: 'nemesis-grabbed', reason: 'grabbed', message: 'Carta Agarrada: não pode entrar em jogo neste turno. O descarte continua permitido.' }),
  onDebugCombatEffect(context) {
    const { boss, gameState, entityId, playerId, action, recordBossEvent } = context;
    const actionId = `nemesis_debug_passive_${++boss.actionSequence}`;
    // Repeat laboratory tests without moving the real turn. Grab's purchase
    // dedup remains real-game only; Devorador has no turn quota.
    const previewTurn = { ...gameState, turnNumber: actionId };
    const events = [];
    const record = event => { events.push(recordBossEvent(event)); return events.at(-1); };
    if (action === 'objective') this.onPlayerTurnEnd({ ...context, recordBossEvent: record });
    else if (entityId === 'grabber') {
      delete boss.grabbedByPlayer[playerId];
      this.onPurchaseCompleted({ ...context, debugPursuit: true, gameState: previewTurn, recordBossEvent: event => record({ ...event, turnId: turnKey(gameState, playerId) }) });
      if (boss.grabbedByPlayer[playerId]) boss.grabbedByPlayer[playerId].turnId = turnKey(gameState, playerId);
    }
    else if (entityId === 'devourer') {
      const credits = boss.devourerFeed.credits;
      boss.devourerFeed.credits = 3;
      healFromDevourerFeed(boss, previewTurn, playerId, record);
      boss.devourerFeed.credits = credits;
    } else {
      const before = boss.danger, amount = changeNemesisInfection(boss, getNemesisZombieEffect(boss, alive(boss, 'infected')).value, actionId);
      if (amount) record({ type: 'infection', actionId, sourceEntityId: 'infected', amount, dangerBefore: before, danger: boss.danger,
        outcome: `Infectado: Infecção +${amount}.` });
    }
    return events;
  },
  onPurchaseCompleted({ boss, gameState, playerId, helpers, recordBossEvent, debugPursuit = false }) {
    const grabber = alive(boss, 'grabber'), key = turnKey(gameState, playerId);
    if (!grabber || boss.result || (!debugPursuit && getNemesisGrabberTarget(gameState) !== playerId) || boss.grabbedTurnIds.includes(key)) return [];
    boss.grabbedTurnIds.push(key);
    if (boss.grabbedTurnIds.length > 100) boss.grabbedTurnIds.splice(0, boss.grabbedTurnIds.length - 100);
    const player = gameState.players.find(entry => entry.id === playerId);
    const intent = boss.currentIntent, payload = intent?.payload;
    const cooperative = intent?.abilityId === 'horde_invasion' && !payload.resolved && payload.entryKind !== 'grabber';
    const priorities = cooperative ? null : this.botPriorities({ boss, gameState, playerId, helpers });
    const preserveObjective = !!(priorities?.active && priorities.plan);
    const preserveTeamEntry = cooperative && !!teamEntryPlan(gameState, helpers, payload.entryKind, payload);
    const preserveExtermination = intent?.abilityId === 'stars_extermination' && payload.objectiveVersion === 2
      && !payload.resolved && !!exterminationPlan(gameState, helpers, payload);
    const hasDiscard = player.hand.some(card => card.id !== gameState.pickedDiscardCardId && !helpers.blocked(playerId, card.id, 'discard'));
    // Validate the resulting restrictions, not the cards used by the first plan.
    // A marked+grabbed card may still solve an objective via legal discard.
    const preservesSolution = (ids) => {
      if (!preserveObjective && !preserveTeamEntry && !preserveExtermination && hasDiscard) return true;
      const selected = new Set(ids);
      const trialBoss = { ...boss, grabbedByPlayer: { ...boss.grabbedByPlayer, [playerId]: { cardIds: ids, turnId: key } } };
      const preview = { ...gameState, boss: trialBoss };
      const trialHelpers = { ...helpers, blocked: (id, cardId, action) =>
        (id === playerId && action === 'play' && selected.has(cardId)) || helpers.blocked(id, cardId, action) };
      if (preserveObjective && !this.botPriorities({ boss: trialBoss, gameState: preview, playerId, helpers: trialHelpers }).plan) return false;
      if (preserveTeamEntry && !teamEntryPlan(preview, trialHelpers, payload.entryKind, payload)) return false;
      if (preserveExtermination && !exterminationPlan(preview, trialHelpers, payload)) return false;
      if (!hasDiscard && !findNemesisLegalPlan(preview, player, trialHelpers)) return false;
      return true;
    };
    const count = getNemesisZombieEffect(boss, grabber).value;
    const eligible = player.hand.filter(card => card?.id && !helpers.blocked(playerId, card.id, 'play'));
    const ordered = shuffledIds(boss, `grab:${boss.roundNumber}:${key}`, eligible.map(card => card.id));
    const checked = new Map();
    const valid = (ids) => {
      const signature = JSON.stringify([...ids].sort());
      if (!checked.has(signature)) checked.set(signature, preservesSolution(ids));
      return checked.get(signature);
    };
    const choose = (size, start = 0, chosen = []) => {
      // Adding play-only locks cannot restore a lost solution. Prove impossible
      // local branches early, without a search cap or reducing the quota.
      // The cooperative planner has its own candidate budget: only validate
      // full combinations there, since a partial false is not a proof.
      if (chosen.length && (chosen.length === size || (!preserveTeamEntry && !preserveExtermination)) && !valid(chosen)) return null;
      if (chosen.length === size) return chosen;
      for (let index = start; index <= ordered.length - (size - chosen.length); index++) {
        const found = choose(size, index + 1, [...chosen, ordered[index]]);
        if (found) return found;
      }
      return null;
    };
    let cardIds = [];
    for (let size = Math.min(count, ordered.length); size > 0; size--) {
      const found = choose(size);
      if (found) { cardIds = found; break; }
    }
    boss.grabbedByPlayer[playerId] = { cardIds, turnId: key };
    if (!cardIds.length) return [];
    return [recordBossEvent({ type: 'nemesisGrab', actionId: `nemesisGrab:${key}`, playerId, cardIds, turnId: key, outcome: `${cardIds.length} carta(s) Agarrada(s) até o fim do turno.` })];
  },
  onDiscardTaken({ boss, gameState, playerId, takenCards, recordBossEvent }) {
    const events = [];
    const intent = boss.currentIntent;
    if (intent?.abilityId === 'contaminated_zone' && intent.payload.targetPlayerId === playerId) {
      const eventId = `${intent.id}:trash:${playerId}:${turnKey(gameState, playerId)}:${takenCards.map((card) => card.id).join(',')}`;
      const applied = changeNemesisInfection(boss, 6, eventId);
      if (applied) events.push(recordBossEvent({ type: 'infection', actionId: eventId, danger: boss.danger, amount: applied, outcome: `Zona Contaminada: Infecção +${applied}.` }));
    }
    return events;
  },
  onCardDiscarded({ boss, playerId, card }) { this.markExit(boss, playerId, [card.id]); return []; },
  markExit(boss, playerId, cardIds, played = false) {
    const payload = boss.currentIntent?.payload;
    if (!payload || payload.targetPlayerId !== playerId || payload.resolved) return;
    payload.exitedCardIds = [...new Set([...(payload.exitedCardIds || []), ...cardIds.filter((id) => payload.cardIds?.includes(id))])];
    if (played) payload.playedMarkedCardIds = [...new Set([...(payload.playedMarkedCardIds || []), ...cardIds.filter(id => payload.cardIds?.includes(id))])];
    if (cardIds.includes(payload.secondCardId)) payload.secondExited = true;
  },
  onMeldTransition({ boss, gameState, teamId, playerId, meldId, cardsAdded, previousDangerReliefValue, nextDangerReliefValue, recordBossEvent }) {
    const fresh = cardsAdded.filter((card) => !boss.damagedCardIds.includes(card.id));
    let credited = 0;
    if (fresh.length) {
      this.markExit(boss, playerId, fresh.map((card) => card.id), true);
      const payload = boss.currentIntent?.payload;
      if (boss.currentIntent?.abilityId === 'horde_invasion' && !payload.resolved) {
        payload.contributionCardIds = [...new Set([...(payload.contributionCardIds || []), ...fresh.map((card) => card.id)])];
        if (payload.entryKind === 'devourer' && payload.entryMeldIds?.includes(meldId)) {
          const additions = fresh.filter(card => !(payload.entryTableCardIds || []).includes(card.id));
          payload.devourerCardIds = [...new Set([...(payload.devourerCardIds || []), ...additions.map(card => card.id)])];
          if (payload.devourerCardIds.length >= 3) resolveEntry(boss, boss.currentIntent, gameState);
        } else if (payload.entryKind !== 'devourer' && payload.entryMeldIds?.includes(meldId)) {
          payload.fedMeldIds = [...new Set([...(payload.fedMeldIds || []), meldId])];
        }
      }
      if (payload?.targetPlayerId === playerId && !payload.resolved) payload.contributed = true;
      if (boss.currentIntent?.abilityId === 'stars_extermination' && payload.objectiveVersion === 2 && !payload.resolved
        && payload.partnerPlayerId === playerId && payload.partnerMeldIds.includes(meldId)) payload.partnerContributed = true;
      if (teamId === 0 && alive(boss, 'devourer')) {
        const feed = boss.devourerFeed;
        const ids = [...new Set(fresh.map(card => card.id))].filter(id => !feed.countedCardIds.includes(id));
        feed.countedCardIds.push(...ids);
        feed.credits += ids.length;
        credited = ids.length;
      }
      if (boss.impactZone?.meldId === meldId && boss.roundNumber <= boss.impactZone.expiresRound) {
        const eventId = `${boss.impactZone.sourceIntentId}:impact:${fresh.map((card) => card.id).join(',')}`;
        const applied = changeNemesisInfection(boss, boss.impactZone.infectionCost * fresh.length, eventId);
        if (applied) recordBossEvent({ type: 'infection', actionId: eventId, danger: boss.danger, amount: applied, outcome: `Zona de Impacto: Infecção +${applied}.` });
      }
    }
    if (credited) healFromDevourerFeed(boss, gameState, playerId, recordBossEvent);
    // Shared engine progress tracks total tier relief; only the increment applies.
    return { resourceReduction: boss.result ? 0 : Math.max(0, nextDangerReliefValue - previousDangerReliefValue) };
  },
  afterMeldResolution({ contribution, appliedResourceReduction }) {
    if (contribution) contribution.infectionRelief = (contribution.infectionRelief || 0) + appliedResourceReduction;
    return { dangerChangeLabel: appliedResourceReduction ? `Canastra: Infecção −${appliedResourceReduction}` : '' };
  },
  onPlayerTurnEnd({ boss, gameState, playerId, recordBossEvent }) {
    delete boss.grabbedByPlayer[playerId];
    const intent = boss.currentIntent; const payload = intent?.payload;
    if (intent?.abilityId === 'horde_invasion' && payload.entryKind === 'grabber' && payload.targetPlayerId === playerId) resolveEntry(boss, intent, gameState);
    if (!intent || !objectiveIds.has(intent.abilityId) || payload.resolved) return {};
    if (intent.abilityId === 'stars_extermination' && payload.objectiveVersion === 2) {
      if (!gameState.players.every(player => boss.playersActedThisRound.includes(player.id))) return {};
    } else if (payload.targetPlayerId !== playerId) return {};
    const projection = getNemesisObjectiveOutcome(boss, intent);
    const { fulfilled, failed, base: amount } = projection;
    const dangerBefore = boss.danger;
    payload.infectionApplied = changeNemesisInfection(boss, amount, `${intent.id}:failure`, { failure: failed });
    payload.resolved = true; payload.fulfilled = fulfilled;
    payload.resolutionText = `${intent.name}: ${failed ? 'objetivo incompleto' : 'sucesso'}; Infecção +${payload.infectionApplied}.`;
    let remaining = payload.infectionApplied;
    const resourceSources = [{ entityId: 'boss', amount },
      { entityId: 'infected', amount: projection.infectedAmount + projection.reinforcedAmount },
      { entityId: 'boss', amount: projection.omegaAmount }].map(source => {
        const applied = Math.min(remaining, source.amount); remaining -= applied;
        return { ...source, amount: applied };
      }).filter(source => source.amount > 0);
    recordBossEvent({ type: 'nemesisObjective', actionId: `${intent.id}:objective`, outcome: payload.resolutionText, fulfilled, danger: boss.danger, dangerBefore,
      amount: payload.infectionApplied, resourceSources });
    return {};
  },
  afterRoundAdvance({ boss }) {
    for (const key of ['hordeBuff', 'omegaBuff', 'impactZone']) if (boss[key] && boss.roundNumber > boss[key].expiresRound) boss[key] = null;
  },
  botPriorities({ boss, gameState, playerId, helpers }) {
    const intent = boss.currentIntent; const payload = intent?.payload;
    if (intent?.abilityId === 'horde_invasion' && !payload.resolved) {
      const player = gameState.players.find((entry) => entry.id === playerId);
      const marked = payload.entryKind === 'grabber' && payload.targetPlayerId === playerId ? payload.cardIds : [];
      const fulfilled = payload.entryKind === 'grabber' ? payload.exitedCardIds.length >= 1 : payload.entryKind === 'infected' ? payload.contributionCardIds.length >= 2 : (payload.devourerCardIds || []).length >= 3;
      const active = !fulfilled && (payload.entryKind !== 'grabber' || marked.length > 0);
      const predicate = (plan) => payload.entryKind === 'grabber' ? [...plan.playedCardIds, plan.discardCardId].some((id) => marked.includes(id))
        : payload.entryKind === 'infected' ? plan.playedCardIds.length > 0
          : plan.moves.some((move) => move.meldIndex != null && payload.entryMeldIds.includes(helpers.meldId(player.teamId, move.meldIndex)) && move.cardIds.some(id => !(payload.devourerCardIds || []).includes(id) && !(payload.entryTableCardIds || []).includes(id)));
      const plan = active ? findNemesisLegalPlan(gameState, player, helpers, predicate) : null;
      const discard = marked.find((id) => player.hand.some((card) => card.id === id) && id !== gameState.pickedDiscardCardId && !helpers.blocked(playerId, id, 'discard'));
      return { active, urgent: active, markedCardIds: marked, preferredDiscardCardIds: active ? [plan?.discardCardId || discard].filter(Boolean) : [], plan, infection: boss.danger };
    }
    if (payload?.objectiveVersion === 2 && intent.abilityId === 'stars_extermination') {
      const role = playerId === payload.targetPlayerId ? 'damage' : playerId === payload.partnerPlayerId ? 'feed' : null;
      const active = !payload.resolved && !!role && (role === 'damage' ? payload.directDamage < payload.requiredDamage : !payload.partnerContributed);
      const joint = active ? exterminationPlan(gameState, helpers, payload) : null;
      const plan = joint?.teamPlans.find(plan => plan.playerId === playerId) || null;
      return { active, urgent: active, plan, infection: boss.danger, markedCardIds: [], preferredDiscardCardIds: [plan?.discardCardId].filter(Boolean), targetId: role === 'damage' ? 'boss' : null };
    }
    const fulfilled = intent?.abilityId === 'stars_hunt' ? payload?.objectiveVersion === 2 ? payload.directDamage >= payload.requiredDamage : payload?.contributed
      : intent?.abilityId === 'infectious_tentacle' && payload?.objectiveVersion === 2 ? payload.playedMarkedCardIds?.length > 0
      : intent?.abilityId === 'stars_extermination' ? payload?.contributed && payload?.secondExited
        : payload?.required && (payload.exitedCardIds || []).length >= payload.required;
    const objective = payload?.targetPlayerId === playerId && !payload.resolved && !fulfilled && objectiveIds.has(intent.abilityId);
    const player = gameState.players.find((entry) => entry.id === playerId);
    const requiredIds = objective ? payload.cardIds || (payload.secondCardId ? [payload.secondCardId] : []) : [];
    const plan = objective ? findNemesisLegalPlan(gameState, player, helpers, (entry) => {
      if (intent.abilityId === 'stars_hunt') return payload.objectiveVersion !== 2 || helpers.damageForPlan(player, entry) > 0;
      const exits = [...entry.playedCardIds, entry.discardCardId].filter(Boolean);
      if (intent.abilityId === 'stars_extermination') return payload.secondExited || exits.includes(payload.secondCardId);
      if (intent.abilityId === 'infectious_tentacle' && payload.objectiveVersion === 2) return entry.playedCardIds.some(id => requiredIds.includes(id));
      return new Set([...(payload.exitedCardIds || []), ...exits.filter((id) => requiredIds.includes(id))]).size >= payload.required;
    }) : null;
    const impactIndex = gameState.teams?.[0]?.melds?.findIndex((_meld, index) => helpers.meldId(0, index) === boss.impactZone?.meldId);
    const legalMarkedDiscard = requiredIds.find((id) => hand(gameState, playerId).some((card) => card.id === id) && id !== gameState.pickedDiscardCardId && !helpers.blocked(playerId, id, 'discard'));
    return { active: !!objective, urgent: !!objective, infection: boss.danger, markedCardIds: requiredIds,
      preferredDiscardCardIds: objective ? [plan?.discardCardId || legalMarkedDiscard].filter(Boolean) : [],
      plan, avoidMeldIndexes: boss.impactZone && impactIndex >= 0 ? [impactIndex] : [],
      impactCost: boss.impactZone?.infectionCost || 0,
      avoidDiscard: intent?.abilityId === 'contaminated_zone' && payload.targetPlayerId === playerId && boss.danger + 6 >= 100 };
  },
  shouldTakeDiscard({ boss, gameState, playerId }) {
    const cost = boss.currentIntent?.abilityId === 'contaminated_zone' && boss.currentIntent.payload.targetPlayerId === playerId ? 6 : 0;
    if (boss.danger + cost >= 100) return false;
    if (cost && boss.danger >= 85) return false;
    return null;
  },
  configureDebugState(state, abilityId, variant, target) {
    const boss = state.boss;
    if (abilityId === 'stars_extermination' && variant === 'failure') boss.playersActedThisRound = [];
    if (abilityId === 'contaminated_zone' && variant !== 'no_target') {
      const owner = state.players[target === 'bot' || variant === 'bot' ? 1 : 0];
      const index = owner.hand.findIndex((card) => card.rank === '10' && card.suit === state.teams[0].melds[owner.id]?.[0]?.suit);
      if (index >= 0) { state.stock.push(...state.discard); state.discard = owner.hand.splice(index, 1); }
    }
    // Fixtures may prepare existing combatants; this never changes createState.
    if (['horde_command', 'parasite_regeneration', 'viral_reanimation'].includes(abilityId)) for (const entity of boss.combatEntities) entity.status = 'persistent';
    if (abilityId === 'parasite_regeneration') boss.combatEntities[0].hp = 80;
    if (abilityId === 'viral_reanimation') { boss.combatEntities[0].hp = 0; boss.combatEntities[0].status = 'corpse'; boss.combatEntities[1].status = 'absent'; }
    if (abilityId === 'horde_invasion') {
      const zombie = target.startsWith('zombie_') ? target.slice(7) : null;
      if (zombie) for (const entity of boss.combatEntities) if (entity.id !== zombie) { entity.status = 'corpse'; entity.hp = 0; }
      if (variant === 'phase_cap') { for (const entity of boss.combatEntities.slice(0, boss.phase)) { entity.status = 'persistent'; entity.hp = entity.maxHp; } }
      if (variant === 'reentry') boss.combatEntities[0].status = 'repelled';
      if (variant === 'avoid_repeat') { boss.combatEntities[0].status = 'repelled'; boss.lastRepelledZombieId = 'grabber'; }
      if (variant === 'persistent_corpse') { boss.combatEntities[0].status = 'persistent'; boss.combatEntities[1].status = 'corpse'; boss.combatEntities[1].hp = 0; }
    }
    if (variant === 'no_target') {
      if (['stars_hunt', 'stars_extermination'].includes(abilityId)) boss.playersActedThisRound = state.players.map(player => player.id);
      if (['horde_command', 'parasite_regeneration'].includes(abilityId)) for (const entity of boss.combatEntities) entity.status = 'absent';
      if (abilityId === 'horde_invasion') for (const entity of boss.combatEntities) { entity.status = 'corpse'; entity.hp = 0; }
      if (abilityId === 'viral_reanimation') boss.reanimationsByPhase[boss.phase] = 'debug-used';
      if (abilityId === 'rocket_launcher') { state.stock.push(...state.teams[0].melds.flat()); state.teams[0].melds = []; }
      if (objectiveIds.has(abilityId) || abilityId === 'contaminated_zone') {
        for (const player of state.players) { state.stock.push(...player.hand); player.hand = []; }
        // A real living combatant leaves Horde available as a legal fallback.
        boss.combatEntities[0].status = 'persistent';
      }
    }
    boss.starsPlayerId = state.players[target === 'bot' || variant === 'bot' ? 1 : 0]?.id;
  },
  debugSuccessPlan(state, getPriorities) {
    const intent = state.boss.currentIntent;
    if (intent?.abilityId === 'stars_extermination' && intent.payload.objectiveVersion === 2) {
      const teamPlans = [intent.payload.partnerPlayerId, intent.payload.targetPlayerId].flatMap(playerId => {
        const plan = getPriorities?.(state, playerId)?.plan;
        return plan ? [{ ...plan, playerId }] : [];
      });
      return { teamPlans, moves: [], playedCardIds: [], discardCardId: null };
    }
    if (intent?.abilityId === 'horde_invasion' && intent.payload.entryKind === 'devourer' && getPriorities) {
      // Laboratory success uses the same incremental plans as the BOT. The
      // announcement only proved eligibility, never the whole expulsion.
      const preview = JSON.parse(JSON.stringify(state));
      const teamPlans = [];
      for (const player of entryPlayers(preview)) {
        const member = { playerId: player.id, moves: [], playedCardIds: [], discardCardId: null };
        for (let step = 0; step < 3; step++) {
          const plan = getPriorities(preview, player.id).plan;
          if (!plan) break;
          member.moves.push(...plan.moves); member.playedCardIds.push(...plan.playedCardIds); member.discardCardId = plan.discardCardId;
          for (const move of plan.moves) {
            const cards = player.hand.filter(card => move.cardIds.includes(card.id));
            preview.teams[player.teamId].melds[move.meldIndex].push(...cards);
            preview.boss.currentIntent.payload.devourerCardIds = [...new Set([...(preview.boss.currentIntent.payload.devourerCardIds || []), ...move.cardIds])];
          }
          player.hand = player.hand.filter(card => !plan.playedCardIds.includes(card.id));
        }
        if (member.moves.length) teamPlans.push(member);
      }
      return { teamPlans, moves: [], playedCardIds: [], discardCardId: null };
    }
    // Laboratory success may request a plan; eligibility never invokes this.
    if (intent?.payload.solution) return intent.payload.solution; // saved v1/v2
    if (intent?.abilityId === 'horde_invasion' && intent.payload.entryKind === 'infected') {
      const preview = JSON.parse(JSON.stringify(state));
      const teamPlans = [];
      for (const player of entryPlayers(preview)) {
        const plan = getPriorities?.(preview, player.id)?.plan;
        if (!plan) continue;
        teamPlans.push({ ...plan, playerId: player.id });
        for (const move of plan.moves) {
          const cards = player.hand.filter(card => move.cardIds.includes(card.id));
          if (move.meldIndex == null) preview.teams[player.teamId].melds.push(cards);
          else preview.teams[player.teamId].melds[move.meldIndex].push(...cards);
        }
        player.hand = player.hand.filter(card => !plan.playedCardIds.includes(card.id));
      }
      return { teamPlans, moves: [], playedCardIds: [], discardCardId: null };
    }
    return getPriorities?.(state, intent?.payload.targetPlayerId ?? state.players[0]?.id)?.plan
      || { moves: [], playedCardIds: [], discardCardId: null };
  },
});
