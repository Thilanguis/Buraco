import { createDeck } from '../deck.js';

export const FRIEND_NAMES = Object.freeze(['Bruna', 'Nathalia', 'Thayanne']);
export const FRIEND_PRESENTATION_TIMING = Object.freeze({ spinMs: 3600, resultMs: 1400, dealMs: 1600 });
const MODE = '1x1_dominacao';
const WEIGHT = { simple: 0, suja: 1, limpa: 2, real: 3, asas: 4 };
const BONUS = { simple: 0, suja: 0, limpa: 1, real: 2, asas: 3 };

export function canCallDominationFriend(state, playerId) {
  return state?.mode === MODE && !state.finished && !state.surrender?.active
    && !state.debugPaused && playerId === 1 && state.currentPlayer === 1
    && !state.friendUsed && !state.dominationFriend;
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
    id, name, active: true, hand: stock.splice(-11), stock,
    initialTurns, turnsRemaining: initialTurns, farewell: false,
    pendingTurnId: null, lastExecutedTurnId: null, presentationUntil: 0,
  };
}

export function callDominationFriend(state, playerId, invitation, now = Date.now(), rules = null) {
  if (!canCallDominationFriend(state, playerId)) return false;
  state.friendUsed = true;
  state.dominationFriend = structuredClone(invitation);
  const friend = state.dominationFriend;
  friend.extraTurns = 0;
  friend.rewardedMeldTiers = {};
  if (rules) {
    const team = state.teams.find((entry) => entry.id === state.players[1].teamId);
    team?.melds.forEach((meld, index) => {
      friend.rewardedMeldTiers[`${team.id}:${index}`] = WEIGHT[rules.classify(rules.prepare(meld))] || 0;
    });
  }
  friend.events = [{ id: `${friend.id}:arrival`, type: 'arrival', name: friend.name, turnsRemaining: friend.turnsRemaining }];
  // Both rolls and the entire auxiliary deck are committed before presentation.
  const { spinMs, resultMs, dealMs } = FRIEND_PRESENTATION_TIMING;
  state.dominationFriend.presentationUntil = now + 2 * (spinMs + resultMs) + dealMs;
  return true;
}

export function grantDominationFriendExtraTurn(state, playerId, oldKind, newKind, meldIndex) {
  const friend = state?.dominationFriend;
  if (state?.mode !== MODE || state.finished || state.surrender?.active || !friend?.active
    || (playerId !== 1 && playerId !== 'friend') || !Number.isInteger(meldIndex) || meldIndex < 0) return null;
  const teamId = state.players[1].teamId;
  const key = `${teamId}:${meldIndex}`;
  friend.rewardedMeldTiers ||= {};
  const previous = Math.max(friend.rewardedMeldTiers[key] || 0, WEIGHT[oldKind] || 0);
  const next = WEIGHT[newKind] || 0;
  friend.rewardedMeldTiers[key] = Math.max(previous, next);
  // One extra turn per newly reached clean tier, not per added card or reload.
  if (!BONUS[newKind] || next <= previous) return null;
  friend.turnsRemaining++;
  friend.extraTurns = (friend.extraTurns || 0) + 1;
  friend.farewell = false;
  const event = {
    id: `${friend.id}:extra:${key}:${newKind}`, type: 'extraTurn', name: friend.name,
    playerId, actorName: playerId === 'friend' ? friend.name : (state.players[1].name || 'Dominador'),
    kind: newKind, turnsRemaining: friend.turnsRemaining, extraTurns: friend.extraTurns,
  };
  (friend.events ||= []).push(event);
  return event;
}

export function isDominationFriendTurn(state) {
  return state?.mode === MODE && state.dominationFriend?.active
    && !!state.dominationFriend.pendingTurnId;
}

export function isDominationFriendBusy(state, now = Date.now()) {
  return state?.mode === MODE && (isDominationFriendTurn(state)
    || (state.dominationFriend?.presentationUntil || 0) > now);
}

export function queueDominationFriendTurn(state, outgoingPlayerId) {
  const friend = state?.dominationFriend;
  if (state?.mode !== MODE || state.finished || outgoingPlayerId !== 1
    || !friend?.active || friend.turnsRemaining <= 0) return false;
  const id = `${friend.id}:after:${state.turnNumber || 0}`;
  if (friend.lastExecutedTurnId === id || friend.pendingTurnId) return false;
  friend.pendingTurnId = id;
  friend.farewell = friend.turnsRemaining === 1;
  return true;
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

function growPlan(base, hand, rules, farewell) {
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
        if (!best || candidate.value > best.value) best = candidate;
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

function bestNewMeld(hand, melds, rules, farewell) {
  let best = null;
  const seen = new Set();
  for (let i = 0; i < hand.length - 2; i++) {
    for (let j = i + 1; j < hand.length - 1; j++) {
      for (let k = j + 1; k < hand.length; k++) {
        let added = [hand[i], hand[j], hand[k]];
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

export function executeDominationFriendTurn(state, turnId, rules) {
  const friend = state?.dominationFriend;
  if (!isDominationFriendTurn(state) || state.finished || state.surrender?.active
    || friend.pendingTurnId !== turnId || friend.lastExecutedTurnId === turnId) return null;
  const team = state.teams.find((entry) => entry.id === state.players[1].teamId);
  if (!team) return null;
  const farewell = friend.turnsRemaining === 1;
  const steps = [];
  const draw = (count) => {
    const cards = [];
    for (let i = 0; i < count && friend.stock.length; i++) {
      const card = friend.stock.pop();
      friend.hand.push(card);
      cards.push({ ...card });
    }
    if (cards.length) steps.push({ type: 'drawStock', playerId: 'friend', cards });
  };
  draw(2);
  const bonuses = new Map();
  const plays = [];
  // Each iteration places cards; the finite auxiliary deck bounds bonus chains.
  for (let step = 0; step < 108 && friend.hand.length; step++) {
    let chosen = null;
    team.melds.forEach((base, meldIndex) => {
      let available = friend.hand;
      if (!farewell && !isClean(rules.prepare(base), rules)) {
        available = available.filter((card) => !spendsReservedNaturals({ added: [card] }, friend.hand, team.melds, rules, meldIndex));
      }
      const candidate = growPlan(base, available, rules, farewell);
      if (candidate && (!chosen || candidate.value > chosen.value)) chosen = { ...candidate, meldIndex };
    });
    if (!chosen) {
      const candidate = bestNewMeld(friend.hand, team.melds, rules, farewell);
      if (candidate) chosen = { ...candidate, meldIndex: team.melds.length };
    }
    if (!chosen) break;
    const oldKind = rules.classify(team.melds[chosen.meldIndex] || []);
    const newKind = rules.classify(chosen.meld);
    const isNew = chosen.meldIndex === team.melds.length;
    const ids = new Set(chosen.added.map((card) => card.id));
    friend.hand = friend.hand.filter((card) => !ids.has(card.id));
    team.melds[chosen.meldIndex] = chosen.meld;
    const friendEvent = grantDominationFriendExtraTurn(state, 'friend', oldKind, newKind, chosen.meldIndex);
    plays.push({ meldIndex: chosen.meldIndex, cardIds: [...ids], oldKind, newKind });
    steps.push({
      type: isNew ? 'meldNew' : 'meldExtend', playerId: 'friend', teamId: team.id,
      meldIndex: chosen.meldIndex, cards: chosen.added.map((card) => ({ ...card })),
      meld: chosen.meld.map((card) => ({ ...card })),
      friendEvent,
    });
    // Same per-turn tier/difference rule; the guest only uses her own resources.
    if (oldKind !== newKind && BONUS[newKind]) {
      const previous = bonuses.get(chosen.meldIndex) || 0;
      draw(Math.max(0, BONUS[newKind] - previous));
      bonuses.set(chosen.meldIndex, Math.max(previous, BONUS[newKind]));
    }
  }
  friend.lastExecutedTurnId = turnId;
  friend.pendingTurnId = null;
  friend.turnsRemaining -= 1;
  friend.farewell = friend.turnsRemaining === 1;
  const departed = friend.turnsRemaining === 0;
  if (departed) {
    friend.active = false;
    friend.farewell = false;
    friend.hand = [];
    friend.stock = [];
    (friend.events ||= []).push({ id: `${friend.id}:departure`, type: 'departure', name: friend.name, turnsRemaining: 0 });
  }
  // No shared discard, dead-pile acquisition, hand penalty or finishing hook.
  return { friendId: friend.id, name: friend.name, turnId, plays, steps, farewell, departed };
}
