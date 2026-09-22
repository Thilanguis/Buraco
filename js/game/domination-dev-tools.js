import { FRIEND_NAMES, activeDominationFriends, dominationFriends, grantDominationFriendExtraTurn, grantDominationFriendSharedBonus, drawDominadorSharedBonus, dominationFeatureEnabled } from './domination-friend.js';

// Called only by the explicit Dev UI. Never changes the selected game capacity.
export function setDebugFriends(state, count, invitation, rules) {
  if (![1, 2].includes(count)) return false;
  const friends = dominationFriends(state);
  const shared = state.dominationFriendShared;
  if (!friends.length && !shared.stock.length && !shared.discard.length) {
    shared.stock = structuredClone([...invitation.stock, ...invitation.hand]);
  }
  const wanted = ['left', 'right'].slice(0, count);
  for (const friend of friends) {
    if (friend.active && !wanted.includes(friend.seat)) {
      shared.stock.push(...friend.hand);
      friend.hand = [];
      friend.active = false;
      friend.pendingTurnId = null;
    }
  }
  for (const [index, seat] of wanted.entries()) {
    if (friends.some(f => f.active && f.seat === seat)) continue;
    const friend = {
      id: `${invitation.id}:${seat}`, callId: invitation.id, seat,
      name: index ? invitation.companionName : invitation.name,
      active: true, hand: shared.stock.splice(-11), initialTurns: 5, turnsRemaining: 5,
      extraTurns: 0, farewell: false, pendingTurnId: null, lastExecutedTurnId: null,
      presentationUntil: 0, events: [],
    };
    if (friends.some(f => f.active && f.name === friend.name)) friend.name = FRIEND_NAMES.find(name => !friends.some(f => f.active && f.name === name));
    const existing = friends.findIndex(f => f.seat === seat);
    if (existing >= 0) friends[existing] = friend;
    else friends.push(friend);
  }
  state.dominationOptions = { ...state.dominationOptions, friend: true };
  state.friendUsed = true;
  const weights = { simple: 0, suja: 1, limpa: 2, real: 3, asas: 4 };
  const team = state.teams.find(t => t.id === state.players[1].teamId);
  team.melds.forEach((meld, i) => {
    const key = `${team.id}:${i}`;
    shared.rewardedMeldTiers[key] = Math.max(shared.rewardedMeldTiers[key] || 0, weights[rules.classify(rules.prepare(meld))] || 0);
  });
  return true;
}

export function debugFriendMeld(state, friendId, meld, rules) {
  const friend = activeDominationFriends(state).find(f => f.id === friendId);
  if (friendId && !friend) return null;
  const team = state.teams.find(t => t.id === state.players[1].teamId);
  const meldIndex = team.melds.push(structuredClone(meld)) - 1;
  const kind = rules.classify(meld);
  grantDominationFriendExtraTurn(state, friendId ? 'friend' : 1, 'simple', kind, meldIndex, friendId);
  const steps = [];
  let friendBonus = null;
  if (dominationFeatureEnabled(state, 'plus') && ['limpa', 'real', 'asas'].includes(kind)) {
    friendBonus = grantDominationFriendSharedBonus(state, 1, kind, 1, meldIndex);
    drawDominadorSharedBonus(state, 1, kind, steps, rules);
  }
  return { type: 'dominatorBonus', playerId: 1, friendBonus,
    drawnCards: steps.flatMap(step => step.cards), autoRecycledIndex: steps.find(step => step.recycledIndex != null)?.recycledIndex ?? null };
}
