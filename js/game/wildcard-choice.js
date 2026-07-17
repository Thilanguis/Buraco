const RANKS_LOW = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANKS_HIGH = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function isPotentialWild(card) {
  return !!card && (card.joker || card.forceWild || (!card.forceNatural && String(card.rank) === '2'));
}

function stableCards(cards) {
  return (cards || []).filter(Boolean).map((card) => ({ ...card }));
}

function cardLabel(card) {
  if (!card) return '?';
  if (card.joker) return 'Coringa';
  const suit = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }[card.suit] || '';
  return `${card.rank}${suit}`;
}

function candidateWildIndexes(cards) {
  const jokers = cards.map((card, index) => (card?.joker ? index : -1)).filter((index) => index >= 0);
  if (jokers.length) return jokers;
  return cards.map((card, index) => (isPotentialWild(card) ? index : -1)).filter((index) => index >= 0);
}

function buildOption(cards, wildIndex, order, aceMode, validator) {
  const working = stableCards(cards);
  working.forEach((card, index) => {
    if (!card.joker && String(card.rank) === '2') {
      card.forceWild = index === wildIndex;
      card.forceNatural = index !== wildIndex;
    }
  });
  const wild = working[wildIndex];
  if (!wild || !validator(working)) return [];

  const positions = Object.fromEntries(order.map((rank, index) => [rank, index]));
  const naturals = working.filter((_, index) => index !== wildIndex).sort((a, b) => positions[a.rank] - positions[b.rank]);
  if (!naturals.length || naturals.some((card) => positions[card.rank] == null)) return [];
  const min = positions[naturals[0].rank];
  const max = positions[naturals[naturals.length - 1].rank];
  const occupied = new Set(naturals.map((card) => positions[card.rank]));
  const targets = [];
  for (let start = Math.max(0, max - working.length + 1); start <= Math.min(min, order.length - working.length); start += 1) {
    const windowRanks = order.slice(start, start + working.length);
    const missing = windowRanks.filter((rank) => !occupied.has(positions[rank]));
    if (missing.length !== 1) continue;
    const targetRank = missing[0];
    const orderedCards = windowRanks.map((rank) => (rank === targetRank ? wild : naturals.find((card) => card.rank === rank))).filter(Boolean);
    if (orderedCards.length !== working.length) continue;
    targets.push({
      id: `${wild.id || wildIndex}:${aceMode}:${targetRank}`,
      wildCardId: wild.id || null,
      wildIndex,
      targetRank,
      aceMode,
      orderedCardIds: orderedCards.map((card) => card.id),
      label: `${cardLabel(wild)} como ${targetRank}`,
      preview: windowRanks.join(' - '),
    });
  }
  return targets;
}

export function enumerateWildcardOptions(cards, validator) {
  if (typeof validator !== 'function') return [];
  const clean = stableCards(cards);
  if (clean.length < 3 || !clean.some(isPotentialWild)) return [];
  const options = [];
  for (const wildIndex of candidateWildIndexes(clean)) {
    options.push(...buildOption(clean, wildIndex, RANKS_LOW, 'low', validator));
    options.push(...buildOption(clean, wildIndex, RANKS_HIGH, 'high', validator));
  }
  const unique = new Map();
  for (const option of options) {
    const semanticKey = `${option.wildCardId || option.wildIndex}:${option.targetRank}:${option.preview}`;
    if (!unique.has(semanticKey)) unique.set(semanticKey, option);
  }
  return [...unique.values()];
}

export function applyWildcardOption(cards, option) {
  const clean = stableCards(cards);
  if (!option) return clean;
  clean.forEach((card, index) => {
    const isChosen = option.wildCardId ? card.id === option.wildCardId : index === option.wildIndex;
    if (!card.joker && String(card.rank) === '2') {
      card.forceWild = isChosen;
      card.forceNatural = !isChosen;
    }
    if (isChosen) {
      card.wildTargetRank = option.targetRank;
      card.wildAceMode = option.aceMode;
    }
  });
  const byId = new Map(clean.map((card) => [card.id, card]));
  const ordered = (option.orderedCardIds || []).map((id) => byId.get(id)).filter(Boolean);
  return ordered.length === clean.length ? ordered : clean;
}

export function createPendingWildcardChoice({ playerId, actionType, cards, options, context = {}, eventId }) {
  return {
    id: eventId,
    eventId,
    playerId,
    actionType,
    cardIds: cards.map((card) => card.id),
    options: options.map((option) => ({ ...option })),
    context: { ...context },
    createdAt: Date.now(),
  };
}
