// One visual seat map for hands and animation anchors. Auxiliary occupants
// never become players and never participate in turn/rules calculations.
export const OPPONENT_SEAT_IDS = { top: 'opponentTop', left: 'opponentLeft', right: 'opponentRight' };

export function opponentSeats(state, viewer, bossMode = false) {
  const total = state.players.length;
  const base = viewer === -1 ? 0 : viewer;
  const others = Array.from({ length: Math.max(0, total - 1) }, (_, i) => (base + i + 1) % total);
  const seats = { top: null, left: null, right: null };
  if (total === 2) seats[bossMode ? 'right' : 'top'] = others[0];
  else if (total === 3) [seats.right, seats.left] = others;
  else if (total >= 4) [seats.right, seats.top, seats.left] = others;
  return seats;
}

export function renderOpponentBacks(container, hand) {
  const count = Math.min(hand.length, 12);
  while (container.children.length > count) container.lastChild.remove();
  for (let i = 0; i < count; i++) {
    let card = container.children[i];
    if (!card) {
      card = document.createElement('div');
      container.append(card);
    }
    const arcadeRun = card.classList.contains('arcade-car-run');
    const back = `back-${hand[i]?.back === 'blue' ? 'blue' : 'red'}`;
    if (!card.classList.contains('opponent-card-back') || !card.classList.contains(back)) {
      card.className = `opponent-card-back ${back}`;
    }
    if (arcadeRun) card.classList.add('arcade-car-run');
    card.dataset.cardId = hand[i]?.id || '';
  }
}
