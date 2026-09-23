// Two clean sequences per suit: the eight Ace-to-Ace goals of Domination.
// Only public melds and the acting player's hand are used here.
export function cleanDominationMelds(melds, rules) {
  return melds.map(meld => rules.prepare(meld)).filter(meld =>
    meld.length && !meld.some(card => rules.isWild(card, meld)));
}

export function dominationOpeningCards(hand, melds, rules) {
  const clean = cleanDominationMelds(melds, rules);
  const reserved = new Map();
  for (const meld of clean) {
    if (meld.length >= 14) continue;
    const suit = meld[0].suit;
    for (const rank of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']) {
      const missing = (rank === 'A' ? 2 : 1) - meld.filter(card => String(card.rank) === rank).length;
      const key = `${suit}:${rank}`;
      reserved.set(key, (reserved.get(key) || 0) + Math.max(0, missing));
    }
  }
  return hand.filter(card => {
    if (card.joker) return false;
    if (clean.filter(meld => meld[0].suit === card.suit).length >= 2) return false;
    const key = `${card.suit}:${card.rank}`;
    const needed = reserved.get(key) || 0;
    if (!needed) return true;
    reserved.set(key, needed - 1);
    return false;
  });
}

export function dominationStockEndgame(state) {
  return state?.mode === '1x1_dominacao' && Array.isArray(state.stock) && state.stock.length <= 4
    && Array.isArray(state.deadPiles) && !state.deadPiles.some(pile => pile?.length);
}

// Friends build a second Ace-to-Ace only behind the first game of that suit.
// This policy also applies on departure; it must not consume future ranks.
export function friendDominationCards(hand, melds, rules, targetIndex = -1) {
  const games = melds.map((meld, index) => {
    const cards = rules.prepare(meld);
    const naturals = cards.filter(card => !rules.isWild(card, cards));
    return { index, naturals, suit: naturals[0]?.suit };
  });
  const reservedAces = new Map();
  return hand.filter(card => {
    // Wild openings on an empty suit retain the existing farewell policy.
    // The completed candidate is checked separately below.
    if (card.joker) return true;
    const sameSuit = games.filter(game => game.suit === card.suit);
    if (!sameSuit.length || sameSuit[0].index === targetIndex) return true;
    if (targetIndex < 0 ? sameSuit.length >= 2 : sameSuit[1]?.index !== targetIndex) return false;
    const primary = sameSuit[0].naturals;
    if (!primary.some(entry => String(entry.rank) === String(card.rank))) return false;
    if (card.rank === 'A') {
      const needed = Math.max(0, 2 - primary.filter(entry => entry.rank === 'A').length);
      const reserved = reservedAces.get(card.suit) || 0;
      if (reserved < needed) {
        reservedAces.set(card.suit, reserved + 1);
        return false;
      }
    }
    return true;
  });
}

export function friendDominationPlanAllowed(meld, melds, rules, targetIndex = -1) {
  const suit = meld.find(card => !rules.isWild(card, meld))?.suit;
  const sameSuit = melds.map((base, index) => ({ cards: rules.prepare(base), index }))
    .filter(({ cards }) => cards.find(card => !rules.isWild(card, cards))?.suit === suit);
  if (!sameSuit.length || sameSuit[0].index === targetIndex) return true;
  if (targetIndex < 0 ? sameSuit.length >= 2 : sameSuit[1]?.index !== targetIndex) return false;
  // A wildcard of another suit must not bypass the available-card filter.
  return !meld.some(card => rules.isWild(card, meld));
}
