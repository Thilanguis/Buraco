// Keep full coverage while recovering artwork otherwise lost to cover cropping.
// Only the overflowing axis is compressed, by at most 15%; never stretch cards.
export function fittedBackgroundSize(width, height, imageWidth, imageHeight) {
  const scale = Math.max(width / imageWidth, height / imageHeight);
  return [Math.max(width, imageWidth * scale * 0.85), Math.max(height, imageHeight * scale * 0.85)];
}

const table = document.getElementById('gameSection');
const sources = new Map();
let revision = 0;
let preservedArt;

// Fill tiny gaps only (up to 4% zoom); otherwise keep the entire composition.
export function preservedBackgroundSize(width, height, imageWidth, imageHeight) {
  const contain = Math.min(width / imageWidth, height / imageHeight);
  const cover = Math.max(width / imageWidth, height / imageHeight);
  const scale = cover / contain <= 1.04 ? cover : contain;
  return [imageWidth * scale, imageHeight * scale];
}

async function fitBackground() {
  const current = ++revision;
  // Clear our previous sizing before inspecting the currently selected theme.
  table.style.removeProperty('background-size');
  preservedArt?.remove();
  const background = getComputedStyle(table).backgroundImage;
  // Only single raster-image backgrounds; leave gradients and tiled SVGs intact.
  const match = /^url\(["']?(.*?)["']?\)$/.exec(background);
  if (!match || !/\.(?:webp|png|jpe?g)(?:[?#].*)?$/i.test(match[1])) return;
  const src = match[1];
  if (!sources.has(src)) sources.set(src, new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
    image.onerror = () => resolve(null);
    image.src = src;
  }));
  const dimensions = await sources.get(src);
  if (current !== revision || !dimensions) return;
  const { width, height } = table.getBoundingClientRect();
  if (!width || !height) return;
  if (document.body.dataset.tableTheme === 'resident') {
    if (!preservedArt) {
      preservedArt = document.createElement('div');
      preservedArt.className = 'table-preserved-art';
      preservedArt.setAttribute('aria-hidden', 'true');
      preservedArt.innerHTML = '<div class="table-art-fill"></div><div class="table-art-original"></div>';
    }
    const size = preservedBackgroundSize(width, height, ...dimensions);
    preservedArt.style.setProperty('--preserved-image', background);
    preservedArt.style.setProperty('--preserved-size', size.map(value => `${value}px`).join(' '));
    table.prepend(preservedArt);
    return;
  }
  const size = fittedBackgroundSize(width, height, ...dimensions);
  table.style.backgroundSize = size.map(value => `${value}px`).join(' ');
}

if (table) {
  new ResizeObserver(fitBackground).observe(table);
  new MutationObserver(fitBackground).observe(document.body, {
    attributes: true, attributeFilter: ['data-table-theme'],
  });
  fitBackground();
}
