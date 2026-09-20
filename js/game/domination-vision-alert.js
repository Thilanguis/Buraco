import { VISION_FOCUS_DURATION } from './domination-vision-focus.js';

// Silent intro once per turn; visual reminder lasts while available.
export function createVisionAlert({ schedule = setTimeout, cancel = clearTimeout, busy, valid, pulse, intro = () => {}, remember = () => {}, recalled = () => false }) {
  let currentKey, timer, introTimer;
  const seen = new Set();
  function stop() {
    cancel(timer);
    cancel(introTimer);
    intro(false);
    pulse(false);
  }
  return (key, eligible) => {
    if (key !== currentKey || !eligible) stop();
    currentKey = key;
    if (!eligible) return;
    pulse(true);
    if (seen.has(key) || recalled(key)) return;
    seen.add(key);
    let attempts = 0;
    const start = () => {
      if (key !== currentKey) return;
      if (!valid()) { stop(); return; }
      if (busy()) {
        if (++attempts < 100) timer = schedule(start, 100);
        return;
      }
      remember(key);
      intro(true);
      introTimer = schedule(() => intro(false), VISION_FOCUS_DURATION);
    };
    timer = schedule(start, 250);
  };
}
