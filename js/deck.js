export function assignStableCardIds(cards, prefix = 'deck') {
  const usedIds = new Set();

  cards.forEach((card, index) => {
    if (!card) return;
    const currentId = typeof card.id === 'string' ? card.id.trim() : '';
    if (currentId && !usedIds.has(currentId)) {
      card.id = currentId;
      usedIds.add(currentId);
      return;
    }

    let candidate = `${prefix}_${index}`;
    let suffix = 1;
    while (usedIds.has(candidate)) candidate = `${prefix}_${index}_${suffix++}`;
    card.id = candidate;
    usedIds.add(candidate);
  });

  return cards;
}

export function createDeck(suits, ranks) {
  const deck = [];
  for (let deckIndex = 0; deckIndex < 2; deckIndex++) {
    const back = deckIndex === 0 ? 'red' : 'blue';
    for (const suit of suits) {
      for (const rank of ranks) deck.push({ rank, suit, joker: false, back });
    }
    deck.push({ rank: 'JOKER', suit: '★', joker: true, back });
    deck.push({ rank: 'JOKER', suit: '★', joker: true, back });
  }
  return assignStableCardIds(deck);
}

export function dealInitialDeck(deck, playerCount, handSize, deadChunkSize) {
  const stock = deck;
  const hands = Array.from({ length: playerCount }, () => []);
  const deadPiles = [[], []];

  for (let index = 0; index < handSize; index++) {
    for (let playerIndex = 0; playerIndex < playerCount; playerIndex++) {
      hands[playerIndex].push(stock.pop());
    }
  }
  for (let index = 0; index < deadChunkSize; index++) {
    deadPiles[0].push(stock.pop());
    deadPiles[1].push(stock.pop());
  }

  return { stock, hands, deadPiles, discard: [stock.pop()] };
}
