export function createVersionTapGesture({ now = Date.now, onUnlock, count = 7, windowMs = 5000 }) {
  let taps = [];
  return () => {
    const time = now();
    taps = taps.filter(t => time - t <= windowMs);
    taps.push(time);
    if (taps.length < count) return false;
    taps = [];
    onUnlock();
    return true;
  };
}

export function validDevToolsClaims(claims, now = Date.now()) {
  return claims?.devtools === true && Number(claims.devtoolsUntil) > now;
}
