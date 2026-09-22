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
