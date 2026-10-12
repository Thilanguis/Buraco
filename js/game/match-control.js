export const pauseBlocksPlay = state => !!(state?.pause?.paused || state?.pause?.request);
export const stockIsExhausted = state => !!state && !state.finished && state.stock?.length === 0 && !state.deadPiles?.some(pile => pile?.length);

// Merge votes into the latest transaction state, never a stale client vote map.
export function applyPauseVote(state, playerId, action, now = Date.now()) {
  if (!state || state.finished || state.surrender?.active || !state.players?.some(p => p.id === playerId && !p.name?.toUpperCase().includes('BOT'))) return false;
  const pause = state.pause ||= { paused: false, request: null, votes: {} };
  if (action === 'request') {
    if (pause.request) return false;
    pause.request = pause.paused ? 'resume' : 'pause';
    pause.votes = {};
    if (!pause.paused) pause.startedAt = now;
  } else if (!pause.request) return false;
  if (action === 'no') {
    pause.request = null;
    pause.votes = {};
  } else {
    pause.votes[playerId] = true;
    for (const p of state.players) if (p.name?.toUpperCase().includes('BOT')) pause.votes[p.id] = true;
    if (state.players.every(p => pause.votes[p.id] === true)) {
      pause.paused = pause.request === 'pause';
      pause.request = null;
      pause.votes = {};
    }
  }
  if (!pauseBlocksPlay(state) && pause.startedAt != null) {
    if (state.boss?.bossFlow?.endsAt) state.boss.bossFlow.endsAt += Math.max(0, now - pause.startedAt);
    delete pause.startedAt;
  }
  state.pauseControlRevision = (state.pauseControlRevision || 0) + 1;
  return true;
}

export function createActionGate() {
  let pending = null;
  let releasePending = null;
  return {
    get pending() { return pending; },
    cancel() {
      const release = releasePending;
      pending = null;
      releasePending = null;
      release?.();
    },
    async run(action) {
      if (pending) return;
      let release;
      pending = new Promise(resolve => { release = resolve; });
      const ownPending = pending;
      releasePending = release;
      try { return await action(); }
      catch (error) { if (error?.name !== 'AbortError') throw error; }
      finally {
        if (pending === ownPending) { pending = null; releasePending = null; }
        release();
      }
    },
  };
}
