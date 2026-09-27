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

// A convenience UI lock only, not server-side authorization.
export function matchesDevToolsPassword(config, password) {
  return config?.enabled !== false && typeof config?.password === 'string'
    && config.password.length > 0 && typeof password === 'string' && password === config.password;
}
