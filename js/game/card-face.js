// Shared face markup for hands, discard piles and card flights.
export function suitClass(card) {
  return card.joker ? 'joker-card' : card.suit === '♥' || card.suit === '♦' ? 'hearts' : 'spades';
}

export function deckFaceClass(card) {
  return card?.back === 'blue' ? 'deck-blue' : 'deck-red';
}

export function cardFrontHTML(card) {
  if (!card) return '';
  if (card.joker) {
    return `<div class="carta-canto top joker-label"><span class="card-rank">JOKER</span></div><div class="carta-meio joker-symbol">★</div><div class="carta-canto bottom joker-label"><span class="card-rank">JOKER</span></div>`;
  }
  return `<div class="carta-canto top"><span class="card-rank">${card.rank}</span><span class="card-suit">${card.suit}</span></div><div class="carta-meio">${card.suit}</div><div class="carta-canto bottom"><span class="card-rank">${card.rank}</span><span class="card-suit">${card.suit}</span></div>`;
}
