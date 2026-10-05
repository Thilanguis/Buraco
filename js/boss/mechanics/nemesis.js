import { NEMESIS_ZOMBIES } from '../bosses/nemesis.js';
import { createCombatEntities, normalizeCombatEntities, damageCombatEntity, healCombatEntity, reviveCombatEntity } from '../boss-combat.js';

const persistent = (entry) => entry.status === 'persistent' && entry.hp > 0;
const alive = (boss, id) => boss.combatEntities.find((entry) => entry.id === id && persistent(entry));
export const nemesisPersistentCount = (boss) => boss.combatEntities.filter(persistent).length;
const hand = (state, id) => state.players.find((player) => player.id === id)?.hand || [];
const turnKey = (state, playerId) => `${state.turnNumber || 0}:${playerId}`;
const boosted = (boss, id) => boss.hordeBuff?.entityId === id && boss.roundNumber <= boss.hordeBuff.expiresRound;
const objectiveIds = new Set(['stars_hunt', 'infectious_tentacle', 'tentacle_barrage', 'stars_extermination']);

export function changeNemesisInfection(boss, amount, eventId, { failure = false } = {}) {
  if (boss.result || boss.infectionEventIds.includes(eventId)) return 0;
  boss.infectionEventIds.push(eventId);
  if (boss.infectionEventIds.length > 100) boss.infectionEventIds.splice(0, boss.infectionEventIds.length - 100);
  let bonus = 0;
  if (failure && amount > 0) {
    const infected = alive(boss, 'infected');
    if (infected) bonus += (infected.mutated ? 4 : 2) + (boosted(boss, 'infected') ? 2 : 0);
    if (boss.omegaBuff && boss.roundNumber <= boss.omegaBuff.expiresRound) bonus += boss.danger < 50 ? 2 : boss.danger < 75 ? 4 : 6;
  }
  const before = boss.danger;
  boss.danger = Math.max(0, Math.min(100, before + amount + bonus));
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
    if (helpers.canLeaveHand && !helpers.canLeaveHand(player, moves)) return null;
    const played = moves.flatMap((move) => move.cardIds);
    const remaining = hand(state, player.id).filter((card) => !played.includes(card.id));
    const discard = remaining.find((card) => card.id !== state.pickedDiscardCardId && !helpers.blocked(player.id, card.id, 'discard'));
    if (remaining.length && !discard) return null;
    const plan = { moves, playedCardIds: played, discardCardId: discard?.id || null };
    return predicate(plan) ? plan : null;
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

function entryPlayers(state) {
  const acted = state.boss.playersActedThisRound || [];
  const firstId = acted.length ? state.players[state.currentPlayer]?.id : state.boss.roundFirstPlayerId ?? state.players[state.currentPlayer]?.id;
  const firstIndex = Math.max(0, state.players.findIndex((player) => player.id === firstId));
  return [...state.players.slice(firstIndex), ...state.players.slice(0, firstIndex)].filter((player) => !acted.includes(player.id));
}

// Prove a cooperative solution by applying the first player's legal plan to a
// private preview, then validating the second plan against that resulting table.
function teamEntryPlan(state, helpers, kind) {
  const players = entryPlayers(state);
  const satisfies = (plans) => kind === 'infected'
    ? plans.flatMap((plan) => plan.playedCardIds).length >= 2
    : new Set(plans.flatMap((plan) => plan.moves.filter((move) => move.meldIndex != null && move.meldIndex < state.teams[0].melds.length).map((move) => move.meldIndex))).size >= 2;
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
        const discard = helpers.canLeaveHand?.(player, []) === false ? null : player.hand.find((card) => card.id !== state.pickedDiscardCardId && !helpers.blocked(player.id, card.id, 'discard'));
        const plan = discard ? { moves: [], playedCardIds: [], discardCardId: discard.id } : findNemesisLegalPlan(state, player, helpers);
        if (plan) return [{ entityId: entity.id, entryKind: entity.id, duration: 'target_turn', targetPlayerId: player.id, targetPlayerName: player.name,
          cardIds: [plan.discardCardId || plan.playedCardIds[0]], required: 1, exitedCardIds: [], solution: plan }];
      }
      return [];
    }
    const plans = teamEntryPlan(state, helpers, entity.id);
    return plans ? [{ entityId: entity.id, entryKind: entity.id, duration: 'full_round', contributionCardIds: [], fedMeldIds: [], entryMeldIds: state.teams[0].melds.map((_meld, index) => helpers.meldId(0, index)),
      solution: { teamPlans: plans, moves: [], playedCardIds: [], discardCardId: null } }] : [];
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
    const resultingSize = player.hand.length - selected.length + state.discard.length - 1;
    // Include the mandatory top in canastra classification and the lower pile
    // in finishing math, without making those lower cards available to play.
    const afterPickup = { ...player, hand: [...player.hand, ...state.discard] };
    return resultingSize > 1 || helpers.canLeaveHand?.(afterPickup, moves) !== false;
  } };
  return !!findNemesisLegalPlan(preview, previewPlayer, pickupHelpers, (plan) => plan.playedCardIds.includes(top.id));
}

function resolveEntry(boss, intent) {
  const payload = intent.payload;
  if (payload.resolved) return;
  const entity = boss.combatEntities.find((entry) => entry.id === payload.entityId && entry.status === 'entering');
  if (!entity) return;
  const success = payload.entryKind === 'grabber' ? payload.exitedCardIds.length >= 1
    : payload.entryKind === 'infected' ? payload.contributionCardIds.length >= 2 : payload.fedMeldIds.length >= 2;
  entity.status = success ? 'repelled' : 'persistent';
  entity.hp = entity.maxHp;
  entity.mutated = !success && boss.phase >= 3;
  entity.diedAt = null;
  entity.transitionEventId = `${intent.id}:${entity.status}`;
  entity.transitionAt = Date.now();
  if (success) boss.lastRepelledZombieId = entity.id;
  payload.resolved = true; payload.entrySuccess = success;
  payload.infectionApplied = 0;
  payload.resolutionText = `${entity.name}: ${success ? 'repelido; saiu da mesa' : 'persistiu; debuff ativo'}.`;
}

function buildPayload({ gameState: state, helpers }, abilityId) {
  const boss = state.boss;
  const base = { phase: boss.phase, failure: 6 + boss.phase * 2 };
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
    const entity = boss.combatEntities.find((entry) => entry.status === 'corpse');
    return entity && nemesisPersistentCount(boss) < boss.phase && !boss.reanimationsByPhase[boss.phase] ? { ...base, entityId: entity.id } : null;
  }
  if (abilityId === 'rocket_launcher') {
    const melds = state.teams?.[0]?.melds || [];
    for (let index = 0; index < melds.length; index += 1) {
      if (!helpers.validSequence(melds[index])) continue;
      // The zone must accept a real legal continuation, not mark a finished Asas.
      const feedable = state.players.some((player) => findNemesisLegalPlan(state, player, helpers, (plan) => plan.moves.some((move) => move.meldIndex === index)));
      if (feedable) return { ...base, meldId: helpers.meldId(0, index), meldIndex: index, infectionCost: boss.phase === 3 ? 12 : 10 };
    }
    return null;
  }
  if (abilityId === 'omega_outbreak') return base;
  for (const player of preferredPlayers(state)) {
    const cards = hand(state, player.id).filter((card) => card?.id);
    const legalDiscards = cards.filter((card) => card.id !== state.pickedDiscardCardId && !helpers.blocked(player.id, card.id, 'discard'));
    if (abilityId === 'contaminated_zone') {
      if (canLegallyTakeDiscard(state, player, helpers)) return { ...base, targetPlayerId: player.id };
    } else if (abilityId === 'stars_hunt') {
      const plan = findNemesisLegalPlan(state, player, helpers);
      if (plan) return { ...base, targetPlayerId: player.id, contributed: false, solution: plan };
    } else if (abilityId === 'infectious_tentacle' && cards.length >= 2) {
      const plan = legalDiscards.length ? { moves: [], playedCardIds: [], discardCardId: legalDiscards[0].id } : findNemesisLegalPlan(state, player, helpers);
      if (!plan) continue;
      const firstId = plan.discardCardId || plan.playedCardIds[0];
      return { ...base, targetPlayerId: player.id, cardIds: [firstId, cards.find((card) => card.id !== firstId).id], required: 1, exitedCardIds: [], solution: plan };
    } else if (abilityId === 'tentacle_barrage' && cards.length >= 3) {
      const plan = findNemesisLegalPlan(state, player, helpers, (entry) => entry.playedCardIds.length + Number(!!entry.discardCardId) >= 2);
      if (!plan) continue;
      const exits = [...plan.playedCardIds, plan.discardCardId].filter(Boolean);
      const cardIds = [...new Set([...exits, ...cards.map((card) => card.id)])].slice(0, 3);
      return { ...base, targetPlayerId: player.id, cardIds, required: 2, failure: 16, exitedCardIds: [], solution: plan };
    } else if (abilityId === 'stars_extermination') {
      const plan = findNemesisLegalPlan(state, player, helpers, (entry) => entry.playedCardIds.length + Number(!!entry.discardCardId) >= 2);
      if (!plan) continue;
      const secondCardId = plan.discardCardId || plan.playedCardIds[1];
      return { ...base, targetPlayerId: player.id, contributed: false, secondCardId, secondExited: false, solution: plan, failure: 16 };
    }
  }
  return null;
}

export function chooseNemesisDamageTarget(state, damage) {
  const boss = state.boss;
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
  createState: () => ({ combatLifecycleVersion: 1, combatEntities: createCombatEntities(NEMESIS_ZOMBIES, { initialStatus: 'absent' }), lastRepelledZombieId: null, combatTargetsByPlayer: {}, starsPlayerId: null, grabbedByPlayer: {}, reanimationsByPhase: {}, infectionEventIds: [], devourerTurnIds: [], devourerHealingTotal: 0, hordeBuff: null, omegaBuff: null, impactZone: null }),
  normalize({ boss, gameState }) {
    normalizeCombatEntities(boss, NEMESIS_ZOMBIES, { lifecycle: true });
    boss.combatTargetsByPlayer ||= {}; boss.grabbedByPlayer ||= {}; boss.reanimationsByPhase ||= {};
    boss.infectionEventIds ||= []; boss.devourerTurnIds ||= [];
    boss.danger = Math.max(0, Math.min(100, Number(boss.danger) || 0));
    if (boss.starsPlayerId != null && !gameState.players.some((player) => player.id === boss.starsPlayerId)) boss.starsPlayerId = null;
    if (boss.danger >= 100 && !boss.result) boss.result = { victory: false, reason: 'max_infection', title: 'Infecção Total', detail: 'A Infecção atingiu 100.' };
  },
  buildPayload,
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
  resolveIntent({ boss, intent }) {
    const payload = intent.payload;
    if (intent.abilityId === 'horde_invasion') resolveEntry(boss, intent);
    if (intent.abilityId === 'parasite_regeneration') payload.healed = healCombatEntity(alive(boss, payload.entityId), 100);
    if (intent.abilityId === 'viral_reanimation' && nemesisPersistentCount(boss) < boss.phase && !boss.reanimationsByPhase[intent.announcedPhase]) {
      const entity = boss.combatEntities.find((entry) => entry.id === payload.entityId);
      if (reviveCombatEntity(entity, boss.phase)) boss.reanimationsByPhase[intent.announcedPhase] = intent.id;
    }
    return { outcome: payload.resolutionText || (payload.healed != null ? `Regeneração: +${payload.healed} HP.` : `${intent.name}: período resolvido.`), resultData: { infectionApplied: payload.infectionApplied || 0, targetEntityId: payload.entityId || null } };
  },
  applyDamage({ boss, gameState, damage, playerId, sourceActionId }) {
    if (boss.result) return { hpDamage: 0, targetId: 'boss', absorbed: 0, reborn: false };
    const player = gameState.players.find((entry) => entry.id === playerId);
    const selected = player?.isBot || player?.name?.toUpperCase().includes('BOT') ? chooseNemesisDamageTarget(gameState, damage) : boss.combatTargetsByPlayer[playerId] || 'boss';
    const entity = alive(boss, selected);
    // A stale target is rejected by the selector; if it dies between actions,
    // the next action safely defaults to boss (never spills the current hit).
    let hpDamage = 0;
    if (entity) hpDamage = damageCombatEntity(entity, damage, sourceActionId);
    else { hpDamage = Math.min(boss.hp, Math.max(0, damage)); boss.hp -= hpDamage; if (hpDamage && playerId != null) boss.starsPlayerId = playerId; }
    return { hpDamage, targetId: entity?.id || 'boss', absorbed: 0, reborn: false };
  },
  isCardBlocked(boss, playerId, cardId, action) { return action === 'play' && !!alive(boss, 'grabber') && !!boss.grabbedByPlayer?.[playerId]?.cardIds?.includes(cardId); },
  cardEffect({ boss, playerId, cardId }) {
    if (alive(boss, 'grabber') && boss.grabbedByPlayer[playerId]?.cardIds.includes(cardId)) return 'nemesis-grabbed';
    const intent = boss.currentIntent;
    if (intent?.payload.targetPlayerId === playerId && !intent.payload.resolved && (intent.payload.cardIds?.includes(cardId) || intent.payload.secondCardId === cardId)) return 'nemesis-marked';
    return null;
  },
  cardBlockFeedback: () => ({ effect: 'nemesis-grabbed', reason: 'grabbed', message: 'Carta Agarrada: não pode entrar em jogo neste turno. O descarte continua permitido.' }),
  onDiscardTaken({ boss, gameState, playerId, takenCards, recordBossEvent }) {
    const events = []; const grabber = alive(boss, 'grabber');
    if (grabber) {
      const ids = new Set(hand(gameState, playerId).map((card) => card.id));
      const count = (grabber.mutated ? 2 : 1) + (boosted(boss, 'grabber') ? 1 : 0);
      // Closed-discard pickup calls this hook before the remaining pile enters
      // the hand. Its last/top card is the mandatory immediate meld card.
      const inHand = takenCards.filter((card) => ids.has(card.id));
      const acquired = inHand.length ? inHand : takenCards.slice(0, -1);
      const cardIds = acquired.slice(0, count).map((card) => card.id);
      boss.grabbedByPlayer[playerId] = { cardIds, turnId: turnKey(gameState, playerId) };
      events.push(recordBossEvent({ type: 'nemesisGrab', playerId, cardIds, outcome: `${cardIds.length} carta(s) Agarrada(s) até o fim do turno.` }));
    }
    const intent = boss.currentIntent;
    if (intent?.abilityId === 'contaminated_zone' && intent.payload.targetPlayerId === playerId) {
      const eventId = `${intent.id}:trash:${playerId}:${turnKey(gameState, playerId)}:${takenCards.map((card) => card.id).join(',')}`;
      const applied = changeNemesisInfection(boss, 6, eventId);
      if (applied) events.push(recordBossEvent({ type: 'infection', actionId: eventId, danger: boss.danger, amount: applied, outcome: `Zona Contaminada: Infecção +${applied}.` }));
    }
    return events;
  },
  onCardDiscarded({ boss, playerId, card }) { this.markExit(boss, playerId, [card.id]); return []; },
  markExit(boss, playerId, cardIds) {
    const payload = boss.currentIntent?.payload;
    if (!payload || payload.targetPlayerId !== playerId || payload.resolved) return;
    payload.exitedCardIds = [...new Set([...(payload.exitedCardIds || []), ...cardIds.filter((id) => payload.cardIds?.includes(id))])];
    if (cardIds.includes(payload.secondCardId)) payload.secondExited = true;
  },
  onMeldTransition({ boss, gameState, playerId, meldId, cardsAdded, previousDangerReliefValue, nextDangerReliefValue, recordBossEvent }) {
    const fresh = cardsAdded.filter((card) => !boss.damagedCardIds.includes(card.id));
    if (fresh.length) {
      this.markExit(boss, playerId, fresh.map((card) => card.id));
      const payload = boss.currentIntent?.payload;
      if (boss.currentIntent?.abilityId === 'horde_invasion' && !payload.resolved) {
        payload.contributionCardIds = [...new Set([...(payload.contributionCardIds || []), ...fresh.map((card) => card.id)])];
        // Only the two existing, distinct melds matter for the Devorador.
        if (payload.entryMeldIds?.includes(meldId)) payload.fedMeldIds = [...new Set([...(payload.fedMeldIds || []), meldId])];
      }
      if (payload?.targetPlayerId === playerId && !payload.resolved) payload.contributed = true;
      const devourer = alive(boss, 'devourer'); const key = turnKey(gameState, playerId);
      if (devourer && fresh.length >= 3 && !boss.devourerTurnIds.includes(key)) {
        boss.devourerTurnIds.push(key); if (boss.devourerTurnIds.length > 60) boss.devourerTurnIds.shift();
        const amount = Math.min(boss.maxHp - boss.hp, (devourer.mutated ? 70 : 40) + (boosted(boss, 'devourer') ? 30 : 0));
        boss.hp += amount; boss.devourerHealingTotal = (boss.devourerHealingTotal || 0) + amount;
        if (amount) recordBossEvent({ type: 'bossHeal', amount, hp: boss.hp, outcome: `Devorador: Nemesis recuperou ${amount} HP.` });
      }
      if (boss.impactZone?.meldId === meldId && boss.roundNumber <= boss.impactZone.expiresRound) {
        const eventId = `${boss.impactZone.sourceIntentId}:impact:${fresh.map((card) => card.id).join(',')}`;
        const applied = changeNemesisInfection(boss, boss.impactZone.infectionCost * fresh.length, eventId);
        if (applied) recordBossEvent({ type: 'infection', actionId: eventId, danger: boss.danger, amount: applied, outcome: `Zona de Impacto: Infecção +${applied}.` });
      }
    }
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
    if (intent?.abilityId === 'horde_invasion' && payload.entryKind === 'grabber' && payload.targetPlayerId === playerId) resolveEntry(boss, intent);
    if (!intent || !objectiveIds.has(intent.abilityId) || payload.targetPlayerId !== playerId || payload.resolved) return {};
    let fulfilled = intent.abilityId === 'stars_hunt' ? Number(!!payload.contributed)
      : intent.abilityId === 'stars_extermination' ? Number(!!payload.contributed) + Number(!!payload.secondExited)
        : (payload.exitedCardIds || []).length >= payload.required ? 1 : 0;
    const failed = intent.abilityId === 'stars_extermination' ? fulfilled < 2 : !fulfilled;
    const amount = intent.abilityId === 'stars_extermination' ? fulfilled === 2 ? 0 : fulfilled === 1 ? 8 : 16 : failed ? payload.failure : 0;
    payload.infectionApplied = changeNemesisInfection(boss, amount, `${intent.id}:failure`, { failure: failed });
    payload.resolved = true; payload.fulfilled = fulfilled;
    payload.resolutionText = `${intent.name}: ${failed ? 'objetivo incompleto' : 'sucesso'}; Infecção +${payload.infectionApplied}.`;
    recordBossEvent({ type: 'nemesisObjective', actionId: `${intent.id}:objective`, outcome: payload.resolutionText, fulfilled, danger: boss.danger, amount: payload.infectionApplied });
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
      const fulfilled = payload.entryKind === 'grabber' ? payload.exitedCardIds.length >= 1 : payload.entryKind === 'infected' ? payload.contributionCardIds.length >= 2 : payload.fedMeldIds.length >= 2;
      const active = !fulfilled && (payload.entryKind !== 'grabber' || marked.length > 0);
      const predicate = (plan) => payload.entryKind === 'grabber' ? [...plan.playedCardIds, plan.discardCardId].some((id) => marked.includes(id))
        : payload.entryKind === 'infected' ? plan.playedCardIds.length > 0
          : plan.moves.some((move) => move.meldIndex != null && payload.entryMeldIds.includes(helpers.meldId(player.teamId, move.meldIndex)) && !payload.fedMeldIds.includes(helpers.meldId(player.teamId, move.meldIndex)));
      const plan = active ? findNemesisLegalPlan(gameState, player, helpers, predicate) : null;
      const discard = marked.find((id) => player.hand.some((card) => card.id === id) && id !== gameState.pickedDiscardCardId && !helpers.blocked(playerId, id, 'discard'));
      return { active, urgent: active, markedCardIds: marked, preferredDiscardCardIds: active ? [plan?.discardCardId || discard].filter(Boolean) : [], plan, infection: boss.danger };
    }
    const fulfilled = intent?.abilityId === 'stars_hunt' ? payload?.contributed
      : intent?.abilityId === 'stars_extermination' ? payload?.contributed && payload?.secondExited
        : payload?.required && (payload.exitedCardIds || []).length >= payload.required;
    const objective = payload?.targetPlayerId === playerId && !payload.resolved && !fulfilled && objectiveIds.has(intent.abilityId);
    const player = gameState.players.find((entry) => entry.id === playerId);
    const requiredIds = objective ? payload.cardIds || (payload.secondCardId ? [payload.secondCardId] : []) : [];
    const plan = objective ? findNemesisLegalPlan(gameState, player, helpers, (entry) => {
      if (intent.abilityId === 'stars_hunt') return true;
      const exits = [...entry.playedCardIds, entry.discardCardId].filter(Boolean);
      if (intent.abilityId === 'stars_extermination') return payload.secondExited || exits.includes(payload.secondCardId);
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
  debugSuccessPlan(state) {
    const intent = state.boss.currentIntent;
    return intent?.payload.solution || { moves: [], playedCardIds: [], discardCardId: null };
  },
});
