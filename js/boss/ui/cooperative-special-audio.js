// Called only by a confirmed, per-client deduplicated cosmetic presentation.
// Audio failures are cosmetic too: never await playback or block the action gate.
export function createSpecialAudioCue({ bossId, getSource, play, stop, isCurrent = () => true }) {
  let attempted = false;
  return (phase, { signal } = {}) => {
    if (phase !== 'entry' || attempted || signal?.aborted || !isCurrent()) return;
    attempted = true;
    try {
      const source = getSource(bossId);
      if (!source) return;
      let resolveFinished, sound, timer;
      const finished = new Promise(resolve => { resolveFinished = resolve; });
      const finish = () => {
        clearTimeout(timer);
        sound?.removeEventListener?.('ended', finish);
        sound?.removeEventListener?.('error', finish);
        sound?.removeEventListener?.('pause', finish);
        resolveFinished();
      };
      sound = play(source, { signal, isCurrent, onPlaybackFailure: finish });
      if (!sound) return;
      sound.addEventListener?.('ended', finish, { once: true });
      sound.addEventListener?.('error', finish, { once: true });
      sound.addEventListener?.('pause', finish, { once: true });
      // A failed decoder must not retain a cosmetic run indefinitely.
      timer = setTimeout(finish, 5000);
      let stopped = false;
      const cleanup = () => {
        if (stopped) return;
        stopped = true;
        finish();
        try { stop(sound); } catch { /* Detached or failed media must not break cleanup. */ }
      };
      cleanup.finished = finished;
      return cleanup;
    } catch { /* Missing/blocked audio keeps the visual fallback working. */ }
  };
}
