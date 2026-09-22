import { createDeck } from '../deck.js';

export const FRIEND_NAMES = Object.freeze(['Bruna', 'Nathalia', 'Thayanne']);
export const FRIEND_PRESENTATION_TIMING = Object.freeze({ spinMs: 3600, resultMs: 1400, dealMs: 1600 });
const MODE = '1x1_dominacao';
const WEIGHT = { simple: 0, suja: 1, limpa: 2, real: 3, asas: 4 };
const BONUS = { simple: 0, suja: 0, limpa: 1, real: 1, asas: 1 };

export function normalizeDominationOptions(options) {
  return { friend: options?.friend !== false, plus: options?.plus !== false, vision: options?.vision !== false,
    friendCapacity: options?.friendCapacity === 0 || options?.friendCapacity === '0' ? 0
      : Number(options?.friendCapacity) === 2 ? 2 : 1 };
}

export function hasDominationFriendSelection(mode, options) {
  return mode !== MODE || options?.friend === false || [1, 2].includes(Number(options?.friendCapacity));
}

export function dominationFeatureEnabled(state, feature) {
  return state?.mode === MODE && normalizeDominationOptions(state.dominationOptions)[feature] === true;
}

// Canonical persisted state. Legacy piles move once, never get copied per guest.
export function normalizeDominationFriends(state) {
  if (!state || state.mode !== MODE) return state;
  if (!Array.isArray(state.dominationFriends)) {
    const old = state.dominationFriend;
    state.dominationFriends = old ? [old] : [];
    state.dominationFriendShared ||= {
      stock: old?.stock || [], discard: old?.discard || [],
      rewardedMeldTiers: { ...old?.rewardedMeldTiers }, bonusIds: [],
    };
  }
  state.dominationFriendShared ||= { stock: [], discard: [], rewardedMeldTiers: {}, bonusIds: [] };
  const shared = state.dominationFriendShared;
  shared.rewardedMeldTiers ||= {};
  shared.bonusIds ||= [];
  state.dominationFriends.forEach((friend, index) => {
    friend.seat ||= index === 0 ? 'left' : 'right';
    for (const [key, tier] of Object.entries(friend.rewardedMeldTiers || {})) {
      shared.rewardedMeldTiers[key] = Math.max(shared.rewardedMeldTiers[key] || 0, tier);
    }
    for (const event of friend.events || []) {
      if (event.type === 'cardBonus') {
        const key = event.id.replace(friend.id + ':bonus:', 'bonus:').replace(/:[^:]+$/, '');
        if (!shared.bonusIds.includes(key)) shared.bonusIds.push(key);
      }
    }
    delete friend.stock;
    delete friend.discard;
    delete friend.rewardedMeldTiers;
  });
  delete state.dominationFriend;
  return state;
}

export function dominationFriends(state) {
  normalizeDominationFriends(state);
  return state?.mode === MODE ? state.dominationFriends : [];
}

export function activeDominationFriends(state) {
  return dominationFriends(state).filter(friend => friend.active);
}

// One deterministic actor, including while the committed result is animating.
export function getDominationFriend(state, id = null) {
  const friends = dominationFriends(state);
  if (id) return friends.find(friend => friend.id === id);
  const presenting = friends.find(friend => friend.id === state?.dominationFriendShared?.presentation?.friendId);
  if (presenting) return presenting;
  const active = friends.filter(friend => friend.active);
  return active.find(friend => friend.pendingTurnId)
    || active.find(friend => friend.presentationUntil) || active[0];
}

export function remainingFriendCalls(state) {
  const used = dominationFriends(state).length || (state?.friendUsed ? 1 : 0);
  return used ? 0 : normalizeDominationOptions(state?.dominationOptions).friendCapacity;
}

export function completeDominationFriendPresentation(state, turnId, owner) {
  normalizeDominationFriends(state);
  const shared = state?.dominationFriendShared;
  if (!shared?.presentation || shared.presentation.id !== turnId || shared.presentation.owner !== owner) return false;
  shared.presentation = null;
  return true;
}

export function canCallDominationFriend(state, playerId) {
  return dominationFeatureEnabled(state, 'friend') && !state.finished && !state.surrender?.active
    && !state.debugPaused && playerId === 1 && state.currentPlayer === 1
    && remainingFriendCalls(state) > 0 && !isDominationFriendBusy(state);
}

export function shouldBotCallDominationFriend(state, rules) {
  if (!canCallDominationFriend(state, 1)) return false;
  const owner = state.players[1];
  const team = state.teams.find(entry => entry.id === owner.teamId);
  if (!team) return false;
  // Public endgame pressure: do not save the invitation until it is too late.
  const noDead = !state.deadPiles?.some(pile => pile?.length);
  const rival = state.players[0];
  const rivalTeam = state.teams.find(entry => entry.id === rival.teamId);
  if ((noDead && state.stock.length <= 12)
    || (state.deadChunksTaken?.[rival.teamId] > 0 && rival.hand.length <= 3
      && rivalTeam?.melds.some(meld => BONUS[rules.classify(rules.prepare(meld))]))) return true;
  const melds = team.melds.map(meld => rules.prepare(meld));
  const cleanGrowing = melds.filter(meld => isClean(meld, rules) && meld.length < 14);
  if (cleanGrowing.some(meld => (meld.length >= 5 && meld.length < 7) || meld.length >= 11)) return true;
  if (cleanGrowing.filter(meld => meld.length >= 4).length >= 2) return true;
  // Call before cashing in a tier already reachable with the bot's own hand.
  // Never inspect the opponent's cards, future stock or the unsorted guest deck.
  if (melds.some(base => extensionOptions(base, owner.hand, rules, false).some(plan => {
    const kind = rules.classify(plan.meld);
    return BONUS[kind] && WEIGHT[kind] > WEIGHT[rules.classify(base)];
  }))) return true;
  const opening = bestNewMeld(owner.hand, melds, rules, false, 3);
  return !!opening && !!BONUS[rules.classify(opening.meld)];
}

export function rollFriendDuration(random = Math.random) {
  const roll = random();
  return roll < 0.2 ? 3 : roll < 0.55 ? 4 : 5;
}

export function createFriendInvitation(id, random = Math.random) {
  const name = FRIEND_NAMES[Math.min(2, Math.floor(random() * 3))];
  const initialTurns = rollFriendDuration(random);
  const stock = createDeck(['♠', '♦', '♣', '♥'], ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);
  stock.forEach((card, index) => { card.id = `friend_${id}_${index}`; });
  for (let index = stock.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [stock[index], stock[other]] = [stock[other], stock[index]];
  }
  return {
    id, name, active: true, hand: stock.splice(-11), stock, discard: [],
    companionName: FRIEND_NAMES.filter(entry => entry !== name)[Math.min(1, Math.floor(random() * 2))],
    initialTurns, turnsRemaining: initialTurns, farewell: false,
    pendingTurnId: null, lastExecutedTurnId: null, presentationUntil: 0,
  };
}

export function callDominationFriend(state, playerId, invitation, now = Date.now(), rules = null) {
  if (!canCallDominationFriend(state, playerId)) return false;
  const friends = dominationFriends(state);
  if (friends.some(friend => friend.id === invitation.id)) return false;
  const shared = state.dominationFriendShared;
  const capacity = normalizeDominationOptions(state.dominationOptions).friendCapacity;
  const { spinMs, resultMs, dealMs } = FRIEND_PRESENTATION_TIMING;
  shared.stock = structuredClone([...invitation.stock, ...invitation.hand]);
  // One atomic call, one duration roll, distinct hands dealt from one deck.
  for (let index = 0; index < capacity; index++) {
    const friend = structuredClone(invitation);
    friend.id = index === 0 ? invitation.id : `${invitation.id}:2`;
    friend.callId = invitation.id;
    friend.name = index === 0 ? invitation.name
      : invitation.companionName || FRIEND_NAMES.find(name => name !== invitation.name);
    friend.hand = shared.stock.splice(-11);
    friend.turnsRemaining = invitation.initialTurns;
    friend.extraTurns = 0;
    friend.seat = index === 0 ? 'left' : 'right';
    friend.presentationUntil = now + 2 * (spinMs + resultMs) + dealMs;
    friend.events = [{ id: `${friend.id}:arrival`, type: 'arrival', name: friend.name, turnsRemaining: friend.turnsRemaining }];
    delete friend.stock;
    delete friend.discard;
    delete friend.companionName;
    friends.push(friend);
  }
  state.friendUsed = true;
  shared.rewardedMeldTiers ||= {};
  if (rules) {
    const team = state.teams.find((entry) => entry.id === state.players[1].teamId);
    team?.melds.forEach((meld, index) => {
      const key = `${team.id}:${index}`;
      shared.rewardedMeldTiers[key] = Math.max(shared.rewardedMeldTiers[key] || 0, WEIGHT[rules.classify(rules.prepare(meld))] || 0);
    });
  }
  return true;
}

export function grantDominationFriendExtraTurn(state, playerId, oldKind, newKind, meldIndex, friendId = null) {
  const friend = playerId === 'friend' ? getDominationFriend(state, friendId) : activeDominationFriends(state)[0];
  if (state?.mode !== MODE || state.finished || state.surrender?.active || !friend?.active
    || (playerId !== 1 && playerId !== 'friend') || !Number.isInteger(meldIndex) || meldIndex < 0) return null;
  const shared = state.dominationFriendShared;
  const teamId = state.players[1].teamId;
  const key = `${teamId}:${meldIndex}`;
  shared.rewardedMeldTiers ||= {};
  const previous = Math.max(shared.rewardedMeldTiers[key] || 0, WEIGHT[oldKind] || 0);
  const next = WEIGHT[newKind] || 0;
  shared.rewardedMeldTiers[key] = Math.max(previous, next);
  // One extra turn per newly reached clean tier, not per added card or reload.
  if (!BONUS[newKind] || next <= previous) return null;
  const events = activeDominationFriends(state).map(recipient => {
    recipient.turnsRemaining++;
    recipient.extraTurns = (recipient.extraTurns || 0) + 1;
    recipient.farewell = isDominationFriendEndgame(state);
    const event = {
      id: `${recipient.id}:extra:${key}:${newKind}`, type: 'extraTurn', name: recipient.name,
      friendId: recipient.id,
      groupId: `extra:${key}:${newKind}`,
      playerId, actorName: playerId === 'friend' ? friend.name : (state.players[1].name || 'Dominador'),
      kind: newKind, turnsRemaining: recipient.turnsRemaining, extraTurns: recipient.extraTurns,
    };
    (recipient.events ||= []).push(event);
    return event;
  });
  // Preserve the singular result for old callers; playback also needs all recipients.
  return events.length === 1 ? events[0] : { ...events.find(event => event.friendId === friend.id), recipients: events };
}

// The Dominador's reward calculation supplies the same-turn tier difference.
// This is an auxiliary draw only: it neither starts nor consumes a friend turn.
export function grantDominationFriendSharedBonus(state, playerId, kind, count, meldIndex) {
  const friend = activeDominationFriends(state)[0];
  if (state?.mode !== MODE || state.finished || state.surrender?.active || !friend?.active
    || playerId !== 1 || !BONUS[kind] || !Number.isInteger(count) || count <= 0
    || !Number.isInteger(meldIndex) || meldIndex < 0) return null;
  if (!dominationFeatureEnabled(state, 'plus')) return null;
  const shared = state.dominationFriendShared;
  const bonusKey = `bonus:${state.turnNumber || 0}:${meldIndex}`;
  if (shared.bonusIds.includes(bonusKey)) return null;
  shared.bonusIds.push(bonusKey);
  const events = activeDominationFriends(state).map(recipient => {
    const cards = [];
    for (let i = 0; i < Math.min(count, BONUS[kind]) && shared.stock.length; i++) {
      const card = shared.stock.pop();
      recipient.hand.push(card);
      cards.push({ ...card });
    }
    const event = { id: `${recipient.id}:${bonusKey}:${kind}`, type: 'cardBonus', friendId: recipient.id, kind, cards };
    (recipient.events ||= []).push(event);
    return event;
  });
  return events.length === 1 ? events[0] : { ...events[0], recipients: events };
}

export function isDominationFriendTurn(state) {
  return state?.mode === MODE && (activeDominationFriends(state).some(friend => !!friend.pendingTurnId)
    || !!state.dominationFriendShared?.presentation);
}

export function isDominationFriendBusy(state, now = Date.now()) {
  return state?.mode === MODE && (isDominationFriendTurn(state)
    || activeDominationFriends(state).some(friend => (friend.presentationUntil || 0) > now));
}

export function isDominationFriendEndgame(state) {
  return state?.mode === MODE && Array.isArray(state.stock) && state.stock.length < 6
    && Array.isArray(state.deadPiles) && !state.deadPiles.some((pile) => pile?.length);
}

export function queueDominationFriendTurn(state, outgoingPlayerId) {
  if (state?.mode !== MODE || state.finished || outgoingPlayerId !== 1) return false;
  let queued = false;
  for (const friend of activeDominationFriends(state)) {
    const id = `${friend.id}:after:${state.turnNumber || 0}`;
    if (friend.turnsRemaining <= 0 || friend.lastExecutedTurnId === id || friend.pendingTurnId) continue;
    friend.pendingTurnId = id;
    friend.farewell = friend.turnsRemaining === 1 || isDominationFriendEndgame(state);
    queued = true;
  }
  return queued;
}

// Preparation and classification come from the game's existing meld rules.
// All previews are copies: rejecting a candidate cannot mutate the table.
export function previewFriendExtension(base, added, rules) {
  const before = rules.prepare(base);
  const after = rules.prepare([...base, ...added]);
  if (!rules.valid(after)) return null;
  // Existing games only receive natural cards, even when still small or
  // already dirty. Never replace an existing natural 2's role with a wild.
  // A same-suit 2 is allowed if preparation actually makes it natural.
  const addedIds = new Set(added.map((card) => card.id));
  const naturalIds = new Set([
    ...base.filter((card) => !rules.isWild(card, base)),
    ...before.filter((card) => !rules.isWild(card, before)),
  ].map((card) => card.id));
  if (after.some((card) => rules.isWild(card, after)
    && (addedIds.has(card.id) || naturalIds.has(card.id)))) return null;
  if (WEIGHT[rules.classify(after)] < WEIGHT[rules.classify(before)]) return null;
  return after;
}

function isClean(meld, rules) {
  return !meld.some((card) => rules.isWild(card, meld));
}

function meldSuit(meld, rules) {
  return meld.find((card) => !rules.isWild(card, meld))?.suit;
}

function playValue(base, meld, added, rules, farewell) {
  const before = WEIGHT[rules.classify(base)];
  const after = WEIGHT[rules.classify(meld)];
  const clean = isClean(meld, rules);
  const wildsAdded = meld.filter((card) => added.some((entry) => entry.id === card.id) && rules.isWild(card, meld)).length;
  // Compare progress, not the old canastra's accumulated value. The convex
  // length term favors concentrating naturals toward Real and Ace-to-Ace.
  return Math.max(0, after - before) * 12000
    + (clean ? (meld.length ** 2 - base.length ** 2) * 120 : added.length * 35)
    + (after === WEIGHT.asas ? 80000 : after === WEIGHT.real ? 30000 : 0)
    + added.length * (farewell ? 900 : 50) - wildsAdded * 1200;
}

function extensionOptions(base, hand, rules, farewell) {
  const options = [];
  const consider = (added) => {
    const meld = previewFriendExtension(base, added, rules);
    if (!meld) return;
    options.push({ meld, added, value: playValue(base, meld, added, rules, farewell) });
  };
  for (let i = 0; i < hand.length; i++) {
    consider([hand[i]]);
    // A pair can bridge a gap or bring the natural 2 together with the Ace.
    for (let j = i + 1; j < hand.length; j++) consider([hand[i], hand[j]]);
  }
  return options.sort((a, b) => b.value - a.value);
}

function growPlan(base, hand, rules, farewell, requiredId = null) {
  let frontier = [{ meld: base, added: [] }];
  let best = null;
  const visited = new Set();
  // Look ahead through several possible natural continuations instead of
  // committing the first valid single/pair. No randomness or hidden stock read.
  for (let depth = 0; depth < 14 - base.length && frontier.length; depth++) {
    const next = [];
    for (const plan of frontier) {
      const used = new Set(plan.added.map((card) => card.id));
      const remaining = hand.filter((card) => !used.has(card.id));
      for (const extension of extensionOptions(plan.meld, remaining, rules, farewell)) {
        const added = [...plan.added, ...extension.added];
        const key = added.map((card) => card.id).sort().join('|');
        if (visited.has(key)) continue;
        visited.add(key);
        const candidate = { meld: extension.meld, added, value: playValue(base, extension.meld, added, rules, farewell) };
        next.push(candidate);
        if ((!requiredId || added.some((card) => card.id === requiredId))
          && (!best || candidate.value > best.value)) best = candidate;
      }
    }
    frontier = next.sort((a, b) => b.value - a.value).slice(0, 6);
  }
  return best;
}

function spendsReservedNaturals(candidate, hand, melds, rules, targetIndex = -1) {
  const spent = new Set(candidate.added.map((card) => card.id));
  return melds.some((raw, index) => {
    if (index === targetIndex) return false;
    const meld = rules.prepare(raw);
    if (!isClean(meld, rules) || meld.length >= 14) return false;
    const suit = meldSuit(meld, rules);
    // Retain missing natural ranks for each growing clean sequence. Duplicate
    // copies are free to use elsewhere, as are cards already present there.
    return candidate.added.some((card) => {
      if (card.joker || card.suit !== suit) return false;
      const needed = (card.rank === 'A' ? 2 : 1) - meld.filter((entry) => entry.rank === card.rank).length;
      if (needed <= 0) return false;
      return hand.filter((entry) => !entry.joker && entry.suit === suit && entry.rank === card.rank && !spent.has(entry.id)).length < needed;
    });
  });
}

function bestNewMeld(hand, melds, rules, farewell, turnsRemaining, requiredId = null) {
  let best = null;
  const seen = new Set();
  for (let i = 0; i < hand.length - 2; i++) {
    for (let j = i + 1; j < hand.length - 1; j++) {
      for (let k = j + 1; k < hand.length; k++) {
        let added = [hand[i], hand[j], hand[k]];
        // A closed pickup must justify its top with cards already in hand.
        if (requiredId && !added.some((card) => card.id === requiredId)) continue;
        let meld = rules.prepare(added);
        if (!rules.valid(meld)) continue;
        const extension = growPlan(meld, hand.filter((card) => !added.includes(card)), rules, farewell);
        if (extension) {
          meld = extension.meld;
          added = [...added, ...extension.added];
        }
        const key = added.map((card) => card.id).sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        const clearsHand = added.length === hand.length;
        if (!farewell) {
          const clean = isClean(meld, rules);
          // Before farewell, keep weak triples and small wild games in hand.
          // A separate wild opening needs a concrete payoff: a canastra or
          // emptying the hand. Existing clean melds are never dirtied for this.
          if (clean ? meld.length < 4 : meld.length < 7 && !clearsHand) continue;
          if (spendsReservedNaturals({ added }, hand, melds, rules)) continue;
          // With time to wait, do not fragment a growing clean suit into small
          // parallel games just because duplicate ranks make that legal.
          if (turnsRemaining >= 3 && meld.length < 7 && melds.some((base) => {
            const existing = rules.prepare(base);
            return existing.length < 14 && isClean(existing, rules)
              && meldSuit(existing, rules) === meldSuit(meld, rules);
          })) continue;
          // Even a scoring opening must not spend a 2 that can seed its own
          // natural sequence, unless the hand contains another copy of that 2.
          const spendsUsefulTwo = meld.some((card) => card.rank === '2' && rules.isWild(card, meld)
            && hand.filter((entry) => !entry.joker && entry.suit === card.suit && entry.rank !== '2').length >= 2
            && !hand.some((entry) => entry.id !== card.id && entry.rank === '2' && entry.suit === card.suit));
          if (spendsUsefulTwo) continue;
        }
        // On departure, favor a complete separate opening over a weak natural
        // fragment that strands its wild. This heuristic stays below the 12000
        // tier weight: making a clean canastra still beats merely shedding.
        // It is a planning score, not a change to card/canastra rewards.
        const value = playValue([], meld, added, rules, farewell) + (farewell && clearsHand ? 6000 : 0);
        if (!best || value > best.value) best = { meld, added, value };
      }
    }
  }
  return best;
}

function chooseFriendDiscardPickup(state, friend, team, rules, farewell) {
  const shared = state.dominationFriendShared;
  const pile = shared.discard || [];
  if (!pile.length || !['aberto', 'fechado'].includes(state.variant)) return null;
  const closed = state.variant === 'fechado';
  const top = pile[pile.length - 1];
  const pool = [...friend.hand, ...(closed ? [top] : pile)];
  const requiredId = closed ? top.id : null;
  const discardedIds = new Set(pile.map((card) => card.id));
  let best = null;
  let baseline = 0;
  team.melds.forEach((base, meldIndex) => {
    const existing = growPlan(base, friend.hand, rules, farewell);
    baseline = Math.max(baseline, existing?.value || 0);
    const candidate = growPlan(base, pool, rules, farewell, requiredId);
    if (!candidate || !candidate.added.some((card) => discardedIds.has(card.id))) return;
    if (!farewell && !isClean(rules.prepare(base), rules)
      && spendsReservedNaturals(candidate, pool, team.melds, rules, meldIndex)) return;
    if (!best || candidate.value > best.value) best = { ...candidate, meldIndex };
  });
  const existingNew = bestNewMeld(friend.hand, team.melds, rules, farewell, friend.turnsRemaining);
  baseline = Math.max(baseline, existingNew?.value || 0);
  const opening = bestNewMeld(pool, team.melds, rules, farewell, friend.turnsRemaining, requiredId);
  if (opening?.added.some((card) => discardedIds.has(card.id)) && (!best || opening.value > best.value)) {
    best = { ...opening, meldIndex: team.melds.length };
  }
  if (!best) return null;
  // Do not recycle an unhelpful pile forever or peek at the auxiliary stock.
  // Extra dead weight is especially costly with little time left to unload it.
  const usable = best.added.filter((card) => discardedIds.has(card.id)).length;
  const burden = (pile.length - usable) * (farewell ? 900 : 250);
  return best.value > baseline + burden ? best : null;
}

export function drawDominadorSharedBonus(state, count, kind, steps, rules) {
  const owner = state.players[1];
  for (let i = 0; i < count; i++) {
    let recycledIndex = null;
    let recycledStock = null;
    if (!state.stock.length) {
      const index = state.deadPiles?.findIndex((pile) => pile?.length) ?? -1;
      if (index >= 0) {
        state.stock = state.deadPiles[index];
        state.deadPiles[index] = [];
        for (let j = state.stock.length - 1; j > 0; j--) {
          const other = Math.floor(Math.random() * (j + 1));
          [state.stock[j], state.stock[other]] = [state.stock[other], state.stock[j]];
        }
        recycledIndex = index;
        recycledStock = state.stock.map((card) => ({ ...card }));
      }
    }
    const victim = state.players[0];
    const stolen = !state.stock.length;
    const card = stolen
      ? victim.hand.splice(Math.floor(Math.random() * victim.hand.length), 1)[0]
      : state.stock.pop();
    if (!card) break;
    card._isEndgameSteal = stolen;
    owner.hand.push(card);
    (state.boughtCardIds ||= []).push(card.id);
    steps.push({ type: 'dominatorBonus', playerId: 1, kind, cards: [{ ...card }], recycledIndex, recycledStock });
  }
  rules.sortHand?.(owner.hand);
}

export function executeDominationFriendTurn(state, turnId, rules, { owner = 'local', now = Date.now() } = {}) {
  const friends = activeDominationFriends(state);
  const friend = friends.find(entry => entry.pendingTurnId);
  const shared = state?.dominationFriendShared;
  if (shared?.presentation && shared.presentation.expiresAt > now) return null;
  if (!friend || friends.some(entry => entry.presentationUntil > now) || !isDominationFriendTurn(state) || state.finished || state.surrender?.active
    || friend.pendingTurnId !== turnId || friend.lastExecutedTurnId === turnId) return null;
  const team = state.teams.find((entry) => entry.id === state.players[1].teamId);
  if (!team) return null;
  const farewell = friend.turnsRemaining === 1 || isDominationFriendEndgame(state);
  const steps = [];
  const draw = (count, kind = null, recipient = friend) => {
    const cards = [];
    for (let i = 0; i < count && shared.stock.length; i++) {
      const card = shared.stock.pop();
      recipient.hand.push(card);
      cards.push({ ...card });
    }
    if (cards.length) steps.push({ type: 'drawStock', playerId: 'friend', friendId: recipient.id, cards, reason: kind ? 'canastra' : 'turn', kind });
  };
  let pickupPlan = chooseFriendDiscardPickup(state, friend, team, rules, farewell);
  if (pickupPlan) {
    const pile = shared.discard.splice(0);
    friend.hand.push(...pile);
    steps.push({ type: 'drawDiscard', playerId: 'friend', cards: pile.map((card) => ({ ...card })), variant: state.variant });
    if (state.variant !== 'fechado') pickupPlan = null;
  } else draw(2);
  const bonuses = new Map();
  const plays = [];
  // Each iteration places cards; the finite auxiliary deck bounds bonus chains.
  for (let step = 0; step < 108 && friend.hand.length; step++) {
    // A canastra may have earned more time since the previous play.
    const unload = friend.turnsRemaining === 1 || isDominationFriendEndgame(state);
    let chosen = pickupPlan;
    pickupPlan = null;
    if (!chosen) team.melds.forEach((base, meldIndex) => {
      let available = friend.hand;
      if (!unload && !isClean(rules.prepare(base), rules)) {
        available = available.filter((card) => !spendsReservedNaturals({ added: [card] }, friend.hand, team.melds, rules, meldIndex));
      }
      const candidate = growPlan(base, available, rules, unload);
      if (candidate && (!chosen || candidate.value > chosen.value)) chosen = { ...candidate, meldIndex };
    });
    if (!chosen) {
      const candidate = bestNewMeld(friend.hand, team.melds, rules, unload, friend.turnsRemaining);
      if (candidate) chosen = { ...candidate, meldIndex: team.melds.length };
    }
    if (!chosen) break;
    const oldKind = rules.classify(team.melds[chosen.meldIndex] || []);
    const newKind = rules.classify(chosen.meld);
    const isNew = chosen.meldIndex === team.melds.length;
    const ids = new Set(chosen.added.map((card) => card.id));
    friend.hand = friend.hand.filter((card) => !ids.has(card.id));
    team.melds[chosen.meldIndex] = chosen.meld;
    const friendEvent = grantDominationFriendExtraTurn(state, 'friend', oldKind, newKind, chosen.meldIndex, friend.id);
    plays.push({ meldIndex: chosen.meldIndex, cardIds: [...ids], oldKind, newKind });
    steps.push({
      type: isNew ? 'meldNew' : 'meldExtend', playerId: 'friend', teamId: team.id,
      meldIndex: chosen.meldIndex, cards: chosen.added.map((card) => ({ ...card })),
      meld: chosen.meld.map((card) => ({ ...card })),
      friendEvent,
    });
    // Every active ally receives the reward, using the appropriate stock.
    if (dominationFeatureEnabled(state, 'plus') && oldKind !== newKind && BONUS[newKind]) {
      const previous = bonuses.get(chosen.meldIndex) || 0;
      const count = Math.max(0, BONUS[newKind] - previous);
      draw(count, newKind);
      for (const recipient of activeDominationFriends(state)) {
        if (recipient.id !== friend.id) draw(count, newKind, recipient);
      }
      drawDominadorSharedBonus(state, count, newKind, steps, rules);
      bonuses.set(chosen.meldIndex, Math.max(previous, BONUS[newKind]));
    }
  }
  // Discard only to her private pile; retain wilds and connected naturals.
  if (friend.hand.length) {
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const usefulness = (card) => {
      if (card.joker || card.rank === '2') return 100;
      const rank = ranks.indexOf(card.rank);
      const neighbors = (cards) => cards.filter((other) => other.id !== card.id && other.suit === card.suit
        && Math.abs(ranks.indexOf(other.rank) - rank) <= 2).length;
      return neighbors(friend.hand) * 3 + team.melds.reduce((sum, meld) => sum + neighbors(meld) * 5, 0);
    };
    const card = [...friend.hand].sort((a, b) => usefulness(a) - usefulness(b))[0];
    friend.hand = friend.hand.filter((entry) => entry.id !== card.id);
    (shared.discard ||= []).push(card);
    steps.push({ type: 'discard', playerId: 'friend', card: { ...card }, cards: [{ ...card }] });
  }
  friend.lastExecutedTurnId = turnId;
  friend.pendingTurnId = null;
  friend.turnsRemaining -= 1;
  friend.farewell = friend.turnsRemaining === 1 || isDominationFriendEndgame(state);
  const departed = friend.turnsRemaining === 0;
  if (departed) {
    friend.active = false;
    friend.farewell = false;
    friend.hand = [];
    (friend.events ||= []).push({ id: `${friend.id}:departure`, type: 'departure', name: friend.name, turnsRemaining: 0 });
  }
  for (const step of steps) if (step.playerId === 'friend') step.friendId ||= friend.id;
  // Persist the animation barrier with the gameplay transaction. Reloads only
  // release an expired barrier; they never execute an already committed turn.
  shared.presentation = { id: turnId, friendId: friend.id, owner, expiresAt: now + 120000 };
  // Private discards never enter the shared pile or trigger normal finishing.
  return { friendId: friend.id, name: friend.name, turnId, plays, steps, farewell, departed };
}
