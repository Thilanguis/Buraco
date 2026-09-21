// Shared face markup for hands, discard piles and card flights.
export function suitClass(card) {
  return card.joker ? 'joker-card' : card.suit === '♥' || card.suit === '♦' ? 'hearts' : 'spades';
}

export function deckFaceClass(card) {
  return card?.back === 'blue' ? 'deck-blue' : 'deck-red';
}

const lunarSuits = Object.freeze({ '♠': 'spades', '♥': 'hearts', '♣': 'clubs', '♦': 'diamonds' });
const lunarRanks = new Set(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);

export function lunarCardAsset(card) {
  if (!card) return '';
  if (card.joker) return `assets/lunar/joker-${card.back === 'blue' ? 'blue' : 'red'}.webp`;
  const suit = lunarSuits[card.suit];
  return suit && lunarRanks.has(String(card.rank)) ? `assets/lunar/${suit}-${card.rank}.webp` : '';
}

export function cardFrontHTML(card) {
  if (!card) return '';
  // CSS activates the image only for this theme, including already-rendered faces.
  // No image requests for other decks; ordinary rank/suit markup remains available.
  const asset = lunarCardAsset(card);
  // URLs in this custom property resolve relative to styles/lunar.css.
  const art = asset ? `<span class="lunar-card-art" aria-hidden="true" style="--lunar-face: url('../${asset}')"></span>` : '';
  if (card.joker) {
    return `${art}<div class="carta-canto top joker-label"><span class="card-rank">JOKER</span></div><div class="carta-meio joker-symbol">★</div><div class="carta-canto bottom joker-label"><span class="card-rank">JOKER</span></div>`;
  }
  return `${art}<div class="carta-canto top"><span class="card-rank">${card.rank}</span><span class="card-suit">${card.suit}</span></div><div class="carta-meio">${card.suit}</div><div class="carta-canto bottom"><span class="card-rank">${card.rank}</span><span class="card-suit">${card.suit}</span></div>`;
}
