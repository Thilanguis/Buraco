// Presentation only: callers own the state mutation and validate the pickup.
export async function animateDiscardTransfer({ cards = [], meldCards = [], topCard, fromDiscard, fromHand, toHand, toMeld, fly, isActive = () => true }) {
  const flights = [
    ...cards.map(card => ({ card, from: fromDiscard, to: toHand(card) })),
    ...meldCards.map(card => ({ card, from: card.id === topCard?.id ? fromDiscard : fromHand(card), to: toMeld(card) })),
  ].filter(flight => flight.from && flight.to);
  if (!isActive()) return;
  await Promise.all(flights.map(({ card, from, to }) => fly(card, from, to, 'front')));
}
