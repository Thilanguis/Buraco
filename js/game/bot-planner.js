const RANK_HIGH = Object.freeze(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']);
const RANK_LOW = Object.freeze(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);

function rankOf(card) {
  return card?.rank == null ? '' : String(card.rank);
}

function isTwo(card) {
  return !card?.joker && rankOf(card) === '2';
}

function neededWilds(naturals, order, acePosition) {
  if (!naturals.length) return null;
  const index = new Map(order.map((rank, i) => [rank, i]));
  const sorted = naturals.slice().sort((a, b) => (index.get(rankOf(a)) ?? 99) - (index.get(rankOf(b)) ?? 99));
  const aceIndex = sorted.findIndex((card) => rankOf(card) === 'A');
  if (aceIndex >= 0) {
    if (acePosition === 'high' && aceIndex !== sorted.length - 1) return null;
    if (acePosition === 'low' && aceIndex !== 0) return null;
  }
  let needed = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const previous = index.get(rankOf(sorted[i - 1]));
    const current = index.get(rankOf(sorted[i]));
    if (!Number.isFinite(previous) || !Number.isFinite(current) || current <= previous) return null;
    needed += Math.max(0, current - previous - 1);
  }
  return needed;
}

function assignmentCanSequence(cards, naturalTwoIds) {
  const naturalTwoSet = new Set(naturalTwoIds);
  const naturals = [];
  let wilds = 0;

  for (const card of cards) {
    if (!card) return false;
    if (card.joker) {
      wilds += 1;
      continue;
    }
    if (isTwo(card) && !naturalTwoSet.has(card.id)) {
      wilds += 1;
      continue;
    }
    naturals.push(card);
  }

  if (wilds > 1 || !naturals.length) return false;
  const suit = naturals[0]?.suit;
  if (!suit || naturals.some((card) => card.suit !== suit)) return false;

  const high = neededWilds(naturals, RANK_HIGH, 'high');
  const low = neededWilds(naturals, RANK_LOW, 'low');
  if ((high != null && high <= wilds) || (low != null && low <= wilds)) return true;

  // Keep Ace-to-Ace candidates conservative. It normally matters only for
  // longer melds, but accepting them here cannot create an illegal move: the
  // authoritative game validator still runs before execution.
  return naturals.filter((card) => rankOf(card) === 'A').length >= 2
    && naturals.some((card) => rankOf(card) === 'K');
}

export function isPlausibleSequenceTriple(cards) {
  if (!Array.isArray(cards) || cards.length !== 3 || cards.some((card) => !card)) return false;

  const twos = cards.filter(isTwo);
  const candidates = [[]];
  for (const two of twos) {
    const snapshot = candidates.slice();
    for (const base of snapshot) candidates.push([...base, two.id]);
  }

  // A 2 can be natural only in its own suit. Reject impossible assignments
  // before the expensive live rules engine sees them.
  for (const naturalIds of candidates) {
    const naturalSet = new Set(naturalIds);
    if (naturalIds.some((id) => {
      const two = twos.find((card) => card.id === id);
      const hardNatural = cards.find((card) => !card.joker && !isTwo(card));
      return hardNatural && two?.suit !== hardNatural.suit;
    })) continue;
    if (assignmentCanSequence(cards, naturalSet)) return true;
  }
  return false;
}

export function planTripleIndexes(hand) {
  const cards = Array.isArray(hand) ? hand : [];
  const result = [];
  for (let i = 0; i < cards.length - 2; i += 1) {
    for (let j = i + 1; j < cards.length - 1; j += 1) {
      for (let k = j + 1; k < cards.length; k += 1) {
        if (isPlausibleSequenceTriple([cards[i], cards[j], cards[k]])) result.push([i, j, k]);
      }
    }
  }
  return result;
}

export function planPairIndexesWithTop(hand, topCard) {
  const cards = Array.isArray(hand) ? hand : [];
  const result = [];
  if (!topCard) return result;
  for (let i = 0; i < cards.length - 1; i += 1) {
    for (let j = i + 1; j < cards.length; j += 1) {
      if (isPlausibleSequenceTriple([cards[i], cards[j], topCard])) result.push([i, j]);
    }
  }
  return result;
}

export function plannerFingerprint(state, botIndex) {
  const player = state?.players?.[botIndex];
  const team = player ? state?.teams?.[player.teamId] : null;
  const ids = (cards) => (cards || []).map((card) => card?.id || `${card?.rank || '?'}${card?.suit || '?'}`).join(',');
  const melds = (team?.melds || []).map(ids).join('/');
  const discard = state?.discard || [];
  return [
    state?.turnNumber ?? -1,
    state?.currentPlayer ?? -1,
    state?.hasDrawnThisTurn ? 1 : 0,
    state?.partialDraw ? 1 : 0,
    state?.stock?.length ?? -1,
    discard.length,
    discard.at?.(-1)?.id || '',
    ids(player?.hand),
    melds,
  ].join('|');
}
