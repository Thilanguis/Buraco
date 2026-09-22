// Local presentation only: never reads hidden hands or changes game state.
const game = document.getElementById('gameSection');
const button = document.getElementById('inspectCardBtn');
const help = document.getElementById('inspectCardHelp');
const dialog = document.getElementById('cardArtDialog');
const image = document.getElementById('cardArtImage');
let armed = false;
let activeTheme = '';

function arm(value) {
  armed = value;
  button.setAttribute('aria-pressed', String(value));
  help.hidden = !value;
  game.classList.toggle('inspecting-card-art', value);
}

function sync() {
  const theme = document.body.dataset.deckTheme;
  const available = ['lunar', 'wwe'].includes(theme) && game.getClientRects().length > 0;
  button.hidden = !available;
  if (!available || theme !== activeTheme) {
    arm(false);
    if (dialog.open) dialog.close();
  }
  activeTheme = theme;
}

button.addEventListener('click', () => arm(!armed));
document.getElementById('closeCardArtBtn').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
dialog.addEventListener('close', () => {
  arm(false);
  image.removeAttribute('src');
  if (!button.hidden) button.focus({ preventScroll: true });
});

// Capture before the card/meld handlers, including touch and drag gestures.
// While armed, clicks on the table are inspection-only, even on covered cards.
function intercept(event) {
  if (!armed || !game.contains(event.target) || button.contains(event.target)) return;
  if (event.target.closest('dialog')) return;
  event.stopImmediatePropagation();
  if (event.type !== 'click') return;
  event.preventDefault();
  const card = event.target.closest('.carta, .discard-face');
  if (!card || card.closest('.back, .fly-card') || !card.getClientRects().length) return;
  const art = card.querySelector(`.${activeTheme}-card-art`);
  if (!art || getComputedStyle(art).display === 'none' || getComputedStyle(card).visibility !== 'visible') return;
  const asset = art.dataset.cardArt;
  if (!/^(?:(?:spades|hearts|clubs|diamonds)-(?:A|[2-9]|10|J|Q|K)|joker-(?:red|blue))$/.test(asset || '')) return;
  const rank = card.querySelector('.card-rank')?.textContent || 'Carta';
  const suit = card.querySelector('.card-suit')?.textContent || '';
  const label = `${rank} ${suit} — ${activeTheme === 'wwe' ? 'WWE' : 'Reino Lunar'}`;
  document.getElementById('cardArtTitle').textContent = label;
  image.alt = label;
  const base = `assets/${activeTheme}/${asset}.webp`;
  image.onerror = () => {
    image.onerror = null;
    image.src = base;
  };
  // Lunar originals are not available locally; use the existing game artwork.
  image.src = activeTheme === 'wwe' ? `assets/${activeTheme}/detail/${asset}.webp` : base;
  arm(false);
  dialog.showModal();
}
for (const type of ['click', 'dblclick', 'pointerdown', 'mousedown', 'touchstart', 'dragstart']) {
  window.addEventListener(type, intercept, { capture: true });
}
window.addEventListener('keydown', event => {
  if (dialog.open) { event.stopImmediatePropagation(); return; }
  if (!armed) return;
  event.stopImmediatePropagation();
  if (event.key === 'Escape') { event.preventDefault(); arm(false); button.focus(); }
}, true);
const observer = new MutationObserver(sync);
observer.observe(document.body, { attributes: true, attributeFilter: ['data-deck-theme'] });
observer.observe(game, { attributes: true, attributeFilter: ['style', 'hidden'] });
sync();
