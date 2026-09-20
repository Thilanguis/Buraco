export const VISION_FOCUS_DURATION = 1400;

// A hollow, soft light halo converges on the actual button rectangle.
// No fullscreen blur or layout writes; corner geometry softens at arrival.
export function createVisionFocus(doc = document, win = window) {
  let cleanup = () => {};
  return active => {
    cleanup();
    if (!active || win.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const button = doc.getElementById('powerBtn');
    if (!button || button.disabled || !button.getClientRects().length) return;
    const rect = button.getBoundingClientRect();
    const width = win.innerWidth, height = win.innerHeight;
    if (rect.bottom <= 0 || rect.top >= height || rect.right <= 0 || rect.left >= width) return;
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    const overlay = doc.createElement('div');
    overlay.className = 'vision-focus-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    const wash = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    wash.setAttribute('class', 'vision-focus-frame');
    wash.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const inset = Math.min(48, width * .08, height * .08);
    const radius = Math.min(110, width * .2, height * .2);
    // Approximate a Gaussian falloff with static translucent strokes. No sharp
    // outline, solid centre or fullscreen blur surface (tablet flicker).
    let previousAlpha = 0;
    for (let thickness = 144; thickness >= 4; thickness -= 4) {
      const alpha = .52 * Math.exp(-((thickness / 2) ** 2) / (2 * 30 ** 2));
      const outline = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
      for (const [name, value] of Object.entries({ x: inset, y: inset, width: width - inset * 2, height: height - inset * 2,
        rx: radius, ry: radius, fill: 'none', stroke: 'url(#vision-halo-light)', 'stroke-width': thickness,
        'stroke-opacity': (alpha - previousAlpha) / (1 - previousAlpha) })) {
        outline.setAttribute(name, String(value));
      }
      previousAlpha = alpha;
      wash.appendChild(outline);
    }
    const defs = doc.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = doc.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.id = 'vision-halo-light';
    gradient.setAttribute('x2', '85%');
    gradient.setAttribute('y2', '100%');
    for (const [offset, opacity] of [[0, .4], [.22, 1], [.5, .32], [.78, 1], [1, .45]]) {
      const stop = doc.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop.setAttribute('offset', String(offset));
      stop.setAttribute('stop-color', 'currentColor');
      stop.setAttribute('stop-opacity', String(opacity));
      gradient.appendChild(stop);
    }
    defs.appendChild(gradient);
    wash.appendChild(defs);
    overlay.appendChild(wash);
    doc.body.appendChild(overlay);
    const target = `translate(${x - width / 2}px, ${y - height / 2}px)`;
    const sx = (rect.width + 16) / (width - inset * 2), sy = (rect.height + 16) / (height - inset * 2);
    // Independent X/Y scales would flatten the original round corners. Match
    // the button's physical radius after scaling, including the 8px halo gap.
    const buttonRadius = Math.min(parseFloat(win.getComputedStyle(button).borderTopLeftRadius) || 0, rect.width / 2, rect.height / 2);
    const endRx = `${(buttonRadius + 8) / sx}px`, endRy = `${(buttonRadius + 8) / sy}px`;
    const corners = [...wash.querySelectorAll('rect')].map(outline => outline.animate([
      { rx: `${radius}px`, ry: `${radius}px`, offset: 0 },
      { rx: `${radius}px`, ry: `${radius}px`, offset: .45, easing: 'ease-in-out' },
      { rx: endRx, ry: endRy, offset: .76 },
      { rx: endRx, ry: endRy, offset: 1 },
    ], { duration: VISION_FOCUS_DURATION, fill: 'both' }));
    const travel = wash.animate([
      { opacity: 0, color: '#fffdf4', transform: 'translate(0, 0) scale(1)', offset: 0 },
      { opacity: .9, color: '#fffdf4', transform: 'translate(0, 0) scale(1)', offset: .16, easing: 'cubic-bezier(.35,0,.2,1)' },
      { opacity: .85, color: '#ffe39a', transform: `${target} scale(${sx}, ${sy})`, offset: .76 },
      { opacity: 0, color: '#ffe39a', transform: `${target} scale(${sx}, ${sy})`, offset: 1 },
    ], { duration: VISION_FOCUS_DURATION, easing: 'linear', fill: 'both' });
    const stop = () => {
      travel.cancel();
      corners.forEach(animation => animation.cancel());
      overlay.remove();
      win.removeEventListener('resize', stop);
      win.removeEventListener('scroll', stop, true);
      cleanup = () => {};
    };
    cleanup = stop;
    win.addEventListener('resize', stop);
    win.addEventListener('scroll', stop, true);
    travel.finished.then(stop, () => {});
  };
}
