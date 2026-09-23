// Optional files supplied by the game owner. Missing MP3s never block gameplay.
export const FRIEND_MP3 = Object.freeze({
  arrival: 'assets/sfx/amiga-entrada.mp3',
  departure: 'assets/sfx/amiga-saida.mp3',
  extraTurn: 'assets/sfx/amiga-turno-extra.mp3',
});

export const FRIEND_EXTRA_TURN_MP3 = Object.freeze({
  Bruna: 'assets/sfx/amiga-bruna-turno-extra.mp3',
  Nathalia: 'assets/sfx/amiga-nathalia-turno-extra.mp3',
  Thayanne: 'assets/sfx/amiga-thayanne-turno-extra.mp3',
  dominador: 'assets/sfx/dominador-luana-turno-extra.mp3',
});

export function friendNoticeSound(event) {
  if (event.type === 'arrival') return null;
  if (event.type !== 'extraTurn') return FRIEND_MP3[event.type];
  // A single achievement may reward several friends: use its actor, not
  // the first recipient's name, and let the existing notice grouping play once.
  return event.playerId === 1 ? FRIEND_EXTRA_TURN_MP3.dominador
    : FRIEND_EXTRA_TURN_MP3[event.actorName] || FRIEND_MP3.extraTurn;
}

export function waitForPlayingCanastras(sounds) {
  return Promise.all(sounds.filter((audio) => !audio.paused && !audio.ended).map((audio) => new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      for (const name of ['ended', 'pause', 'error']) audio.removeEventListener(name, finish);
      resolve();
    };
    // A stalled pre-existing sound must not hold the queue indefinitely.
    const timer = setTimeout(() => { audio.pause(); finish(); }, 120000);
    for (const name of ['ended', 'pause', 'error']) audio.addEventListener(name, finish, { once: true });
  })));
}

export function createFriendSoundQueue({
  createAudio = (src) => new Audio(src), enabled = () => true,
  onBusy = () => {}, waitForCanastras = async () => {},
} = {}) {
  let tail = Promise.resolve();
  let generation = 0;
  let pending = 0;
  let cancelAudio = null;

  const play = (source, { signal, loop = false } = {}) => new Promise((resolve) => {
    if (!source || !enabled() || signal?.aborted) { resolve(); return; }
    const audio = createAudio(typeof source === 'string' ? source : source.src);
    audio.loop = loop;
    audio.volume = typeof source === 'string' ? 0.9 : source.volume;
    audio.preload = 'auto';
    let done = false;
    let timer;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      for (const name of ['ended', 'error']) audio.removeEventListener(name, finish);
      audio.removeEventListener('playing', playing);
      signal?.removeEventListener('abort', finish);
      audio.pause();
      audio.currentTime = 0;
      if (cancelAudio === finish) cancelAudio = null;
      resolve();
    };
    const playing = () => {
      clearTimeout(timer);
      timer = setTimeout(finish, 120000);
    };
    cancelAudio = finish;
    audio.addEventListener('ended', finish, { once: true });
    audio.addEventListener('error', finish, { once: true });
    audio.addEventListener('playing', playing, { once: true });
    signal?.addEventListener('abort', finish, { once: true });
    timer = setTimeout(finish, 8000);
    try { Promise.resolve(audio.play()).catch(finish); } catch { finish(); }
  });

  return {
    get busy() { return pending > 0; },
    enqueue(source, onStart = () => {}, options = {}) {
      const ticket = generation;
      pending++;
      onBusy();
      const job = tail.then(async () => {
        if (ticket !== generation || options.signal?.aborted) return;
        if (enabled()) await waitForCanastras();
        if (ticket !== generation || options.signal?.aborted) return;
        // A cancelled visual must not release the next sound before this one ends.
        await Promise.allSettled([Promise.resolve().then(onStart), play(source, options)]);
      }).catch(() => {}).finally(() => {
        if (ticket !== generation) return;
        pending--;
        onBusy();
      });
      tail = job;
      return job;
    },
    cancel() {
      generation++;
      pending = 0;
      cancelAudio?.();
      tail = Promise.resolve();
      onBusy();
    },
  };
}
