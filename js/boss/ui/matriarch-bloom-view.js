// Presentation only; the engine owns bloom, relief and the five-flower limit.
export const MATRIARCH_FLOWER_IMAGE = 'assets/images/matriarch-lotus.png';
export function matriarchBloomFlowersHTML({ bloom, changed = false, previous = null }) {
  return Array.from({ length: 5 }, (_, index) => {
    const open = index < bloom;
    const opening = changed && previous != null && bloom > previous && index >= previous && open;
    const wilting = changed && previous != null && bloom < previous && index >= bloom && index < previous;
    const classes = ['boss-lotus-flower', open && 'open', opening && 'opening', wilting && 'wilting'].filter(Boolean).join(' ');
    return `<i class="${classes}" role="img" aria-label="Flor ${index + 1}: ${open ? 'ativa' : 'apagada'}" title="Flor ${index + 1}"><img src="${MATRIARCH_FLOWER_IMAGE}" alt="" width="32" height="36"></i>`;
  }).join('');
}
