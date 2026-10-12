import { SPECIAL_CHARACTER_ASSETS } from './boss/ui/cooperative-special-assets.js';
import { getAudioBalance } from './audio-balance.js';

export const CANASTRA_SFX = {
  suja: createBossSfx('assets/sfx/canastra-suja.mp3'),
  limpa: createBossSfx('assets/sfx/canastra-limpa.mp3'),
  real: createBossSfx('assets/sfx/canastra-real.mp3'),
  asas: createBossSfx('assets/sfx/canastra-as-a-as.mp3'),
};

// Legacy arguments are fallback only; every measured master uses its central profile.
function createBossSfx(src, volume = 0.9, systemGain = 1) {
  const audio = new Audio(src);
  audio.preload = 'auto';
  const balance = getAudioBalance(src);
  audio.volume = balance ? Math.min(1, balance.gain) : volume;
  audio.dataset.systemGain = String(balance ? Math.max(1, balance.gain) : systemGain);
  return audio;
}

export const BOSS_SFX = Object.freeze({
  nemesis: Object.freeze({
    special: createBossSfx(SPECIAL_CHARACTER_ASSETS.nemesis.audioSrc, 0.8),
    resource: createBossSfx('assets/sfx/ganho-infeccao-nemesis.mp3'),
  }),
  banker: Object.freeze({
    special: createBossSfx(SPECIAL_CHARACTER_ASSETS.banker.audioSrc, 0.8),
    resource: createBossSfx('assets/sfx/habilidade-banqueiro.mp3'),
    vaultClose: createBossSfx('assets/audio/cofre-fechando.mp3'),
    vaultOpen: createBossSfx('assets/audio/cofre-abrindo.mp3'),
    victory: createBossSfx('assets/sfx/fim-de-jogo-banqueiro.mp3'),
  }),
  dominadora: Object.freeze({
    special: createBossSfx(SPECIAL_CHARACTER_ASSETS.dominadora.audioSrc, 0.8),
    resource: createBossSfx('assets/sfx/habilidade-dominadora.mp3'),
    victory: createBossSfx('assets/sfx/fim-de-jogo-dominadora.mp3'),
  }),
  matriarca_esmeralda: Object.freeze({
    special: createBossSfx(SPECIAL_CHARACTER_ASSETS.matriarca_esmeralda.audioSrc, 0.8),
    resource: createBossSfx('assets/sfx/habilidade-matriarca.mp3', 0.9, 2),
    heal: createBossSfx('assets/sfx/cura-matriarca.mp3', 0.9, 2),
    rebirth: createBossSfx('assets/sfx/renascimento-matriarca.mp3', 0.9, 2),
    victory: createBossSfx('assets/sfx/fim-de-jogo-matriarca.mp3', 0.9, 2),
  }),
  dimitrescu: Object.freeze({
    special: createBossSfx(SPECIAL_CHARACTER_ASSETS.dimitrescu.audioSrc, 0.8),
    daughterDeath: createBossSfx('assets/sfx/what-have-you-done-to-my-daughter.mp3', 0.95),
    blood: createBossSfx('assets/sfx/ganho-sangue-dimitresco.mp3', 0.92),
    phase2: createBossSfx('assets/sfx/transformacao-dimitrescu-fase2.mp3', 0.95),
    phase3: createBossSfx('assets/sfx/transformacao-dimitrescu-fase3.mp3', 0.95),
  }),
  nehelenia: Object.freeze({
    special: createBossSfx(SPECIAL_CHARACTER_ASSETS.nehelenia.audioSrc, 0.8),
    laugh: createBossSfx('assets/sfx/risada-nehelenia.mp3', 0.95),
  }),
});

export const sfxCardMove = createBossSfx('assets/sfx/barulho-cartas.mp3');
// All card movement sounds follow the deck; celebrations and intros follow the table.
export const DECK_MOVE_SFX = Object.freeze({
  resident: createBossSfx('assets/sfx/compra-resident.mp3', 0.18),
  lunar: createBossSfx('assets/sfx/compra-lunar.mp3', 0.5),
  wwe: createBossSfx('assets/sfx/compra-wwe.mp3', 0.5),
});
export const TABLE_ASAS_SFX = Object.freeze({
  resident: createBossSfx('assets/sfx/canastra-as-a-as-resident.mp3', 0.45),
  get dimitrescu() { return this.resident; },
  lunar: createBossSfx('assets/sfx/canastra-as-a-as-lunar.mp3', 0.9),
  // Legacy supplied filename was inverted; this is the WWE counting effect.
  wwe: createBossSfx('assets/sfx/asas-lunar.mp3', 1),
});
export const TABLE_CANASTRA_SFX = Object.freeze({
  get dimitrescu() { return this.resident; },
  resident: Object.freeze({
    // Supplied masters have different levels; balance without rewriting audio.
    suja: createBossSfx('assets/sfx/canastra-suja-resident.mp3', 0.45),
    limpa: createBossSfx('assets/sfx/canastra-limpa-resident.mp3', 0.28),
    real: createBossSfx('assets/sfx/canastra-real-resident.mp3', 0.34),
    asas: TABLE_ASAS_SFX.resident,
  }),
  lunar: Object.freeze({
    suja: createBossSfx('assets/sfx/canastra-suja-lunar.mp3'),
    limpa: createBossSfx('assets/sfx/canastra-limpa-lunar.mp3'),
    real: createBossSfx('assets/sfx/canastra-real-lunar.mp3'),
    asas: TABLE_ASAS_SFX.lunar,
  }),
  wwe: Object.freeze({
    // These masters are louder than the existing effects: keep their output
    // around the default canastras instead of applying the same raw gain.
    suja: createBossSfx('assets/sfx/canastra-suja-wwe.mp3', 0.35),
    limpa: createBossSfx('assets/sfx/canastra-limpa-wwe.mp3', 0.4),
    real: createBossSfx('assets/sfx/canastra-real-wwe.mp3', 0.7),
    asas: TABLE_ASAS_SFX.wwe,
  }),
});
export const ALL_CANASTRA_SFX = [...Object.values(CANASTRA_SFX), ...Object.values(TABLE_CANASTRA_SFX).flatMap(Object.values)];
sfxCardMove.preload = 'auto';

export const sfxMyTurn = createBossSfx('assets/sfx/seu-turno.mp3');
export const sfxSearch = createBossSfx('assets/sfx/procurar-carta.mp3', 0.9);
sfxMyTurn.preload = 'auto';

export const sfxSteal = window.sfxSteal || createBossSfx('assets/sfx/roubo-mao.mp3');
sfxSteal.preload = 'auto';
window.sfxSteal = sfxSteal;

export const sfxHeartbeat = createBossSfx('assets/sfx/coracao-batendo.mp3');
sfxHeartbeat.preload = 'auto';
sfxHeartbeat.loop = true;

export const TABLE_AMBIENT_MUSIC = Object.freeze({
  resident: { src: 'assets/music/mesa-resident.mp3', volume: 0.35, intro: 'assets/sfx/abertura-resident.mp3' },
  // Changing the castle artwork does not replace the existing soundtrack.
  get dimitrescu() { return this.resident; },
  feltro: { src: 'assets/music/mesa-feltro.mp3', volume: 0.35 },
  cassino: { src: 'assets/music/mesa-cassino.mp3', volume: 0.32 },
  masmorra: { src: 'assets/music/mesa-masmorra.mp3', volume: 0.31 },
  ostentacao: { src: 'assets/music/mesa-ostentacao.mp3', volume: 0.23 },
  submissao: { src: 'assets/music/mesa-submissao.mp3', volume: 0.32 },
  findom: { src: 'assets/music/mesa-findom.mp3', volume: 0.34 },
  // Play the original magical vignette before the full Lunar soundtrack.
  lunar: { src: 'assets/music/mesa-lunar-abertura.mp3', volume: 0.28, intro: 'assets/sfx/abertura-lunar-curta.wav' },
  wwe: { src: 'assets/music/mesa-wwe.mp3', volume: 0.10, intro: 'assets/sfx/abertura-wwe.mp3' },
});

export const TABLE_AMBIENT_MAX_VOLUME = 0.35;
export const TABLE_AMBIENT_STORAGE_KEY = 'buraco_table_ambient_enabled';
export const SYSTEM_AUDIO_STORAGE_KEY = 'buraco_system_audio_mode';
export const SYSTEM_AUDIO_MODES = Object.freeze({
  ALL: 'all',
  MUSIC_OFF: 'music_off',
  MUTED: 'muted',
});

function savedSystemAudioMode() {
  try {
    const saved = localStorage.getItem(SYSTEM_AUDIO_STORAGE_KEY);
    if (Object.values(SYSTEM_AUDIO_MODES).includes(saved)) return saved;
    // Existing two-state preference is respected on first load after upgrade.
    return localStorage.getItem(TABLE_AMBIENT_STORAGE_KEY) === 'false'
      ? SYSTEM_AUDIO_MODES.MUSIC_OFF
      : SYSTEM_AUDIO_MODES.ALL;
  } catch {
    return SYSTEM_AUDIO_MODES.ALL;
  }
}

let systemAudioMode = savedSystemAudioMode();
const activeMedia = new Set();
const observedMedia = new WeakSet();
const videosMutedBySystem = new Set();

export function getSystemAudioMode() { return systemAudioMode; }
export function isSystemMuted() { return systemAudioMode === SYSTEM_AUDIO_MODES.MUTED; }

function observeMedia(media) {
  if (observedMedia.has(media)) return;
  observedMedia.add(media);
  media.addEventListener('pause', () => activeMedia.delete(media));
  media.addEventListener('ended', () => activeMedia.delete(media));
  media.addEventListener('error', () => activeMedia.delete(media));
}

function silenceMediaNow() {
  // Audio created with `new Audio()` usually isn't in the document.
  // Track those elements as well as any media played through DOM markup.
  const domMedia = typeof document === 'undefined' ? [] : document.querySelectorAll('audio, video');
  for (const media of [...activeMedia, ...domMedia]) {
    if (media.tagName?.toLowerCase() === 'video') {
      // Preserve video animations (e.g. muted menu backgrounds).
      if (!media.muted) {
        media.muted = true;
        videosMutedBySystem.add(media);
      }
      continue;
    }
    try {
      media.pause();
      media.currentTime = 0;
    } catch { /* A detached element may no longer be usable. */ }
    activeMedia.delete(media);
  }
}

// Covers native HTML audio played directly by the app, boss effects, cloned SFX,
// and the friend queue, without changing each source's volume setting.
if (typeof HTMLMediaElement !== 'undefined') {
  const nativePlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    const isVideo = this.tagName?.toLowerCase() === 'video';
    if (isSystemMuted()) {
      if (isVideo) {
        if (!this.muted) {
          this.muted = true;
          videosMutedBySystem.add(this);
        }
      } else {
        try { this.pause(); this.currentTime = 0; } catch { /* noop */ }
        return Promise.resolve();
      }
    }
    if (!isVideo) {
      observeMedia(this);
      activeMedia.add(this);
    }
    return nativePlay.apply(this, args);
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('play', (event) => {
      const media = event.target;
      if (!(media instanceof HTMLMediaElement)) return;
      if (isSystemMuted()) {
        if (media.tagName?.toLowerCase() === 'video') {
          if (!media.muted) { media.muted = true; videosMutedBySystem.add(media); }
        } else {
          try { media.pause(); media.currentTime = 0; } catch { /* noop */ }
        }
      } else if (media.tagName?.toLowerCase() !== 'video') {
        observeMedia(media);
        activeMedia.add(media);
      }
    }, true);
  }
}

export function setSystemAudioMode(mode, persist = true) {
  if (!Object.values(SYSTEM_AUDIO_MODES).includes(mode)) return systemAudioMode;
  systemAudioMode = mode;
  if (persist) {
    try {
      localStorage.setItem(SYSTEM_AUDIO_STORAGE_KEY, mode);
      // Legacy consumers continue to see the correct music preference.
      localStorage.setItem(TABLE_AMBIENT_STORAGE_KEY, String(mode === SYSTEM_AUDIO_MODES.ALL));
    } catch { /* Storage may be unavailable in private browsing. */ }
  }
  if (isSystemMuted()) {
    stopAllGameSfx();
    silenceMediaNow();
    try { window.speechSynthesis?.cancel(); } catch { /* Speech API optional. */ }
  } else {
    for (const video of videosMutedBySystem) video.muted = false;
    videosMutedBySystem.clear();
  }
  return mode;
}

const BOSS_AUDIO_ELEMENTS = Object.values(BOSS_SFX).flatMap((sounds) => Object.values(sounds));
const GAME_SFX = [...ALL_CANASTRA_SFX, ...Object.values(DECK_MOVE_SFX), ...BOSS_AUDIO_ELEMENTS, sfxCardMove, sfxMyTurn, sfxSearch, sfxSteal, sfxHeartbeat];
const transientSfx = new Set();
const transientSfxNodes = new Map();
const transientSfxReleases = new WeakMap();

function disconnectTransientSfx(audio) {
  const nodes = transientSfxNodes.get(audio);
  if (!nodes) return;
  try {
    nodes.sourceNode.disconnect();
  } catch (error) {}
  try {
    nodes.gainNode.disconnect();
  } catch (error) {}
  transientSfxNodes.delete(audio);
}

export function playSfxClone(source, options = {}) {
  if (!source || isSystemMuted() || options.signal?.aborted || options.isCurrent?.() === false) return null;

  const clone = source.cloneNode();
  const balance = getAudioBalance(source.src);
  const requestedGain = Number(balance ? Math.max(1, balance.gain) : source.dataset?.systemGain || options.gain || 1);
  const systemGain = Number.isFinite(requestedGain) && requestedGain > 0
    ? requestedGain
    : 1;
  const audioContext = options.audioContext || null;

  clone.volume = balance ? Math.min(1, balance.gain) : source.volume;
  transientSfx.add(clone);

  if ((balance || systemGain !== 1) && audioContext?.createMediaElementSource) {
    try {
      const sourceNode = audioContext.createMediaElementSource(clone);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = balance ? balance.gain : systemGain;
      sourceNode.connect(gainNode);
      gainNode.connect(audioContext.destination);
      transientSfxNodes.set(clone, { sourceNode, gainNode });
      if (balance) clone.volume = 1; // One calibrated gain, never gain × an old hand-tuned volume.
    } catch (error) {
      // Fallback do elemento HTML quando Web Audio não estiver disponível.
      clone.volume = clampMediaVolume(clone.volume * systemGain);
    }
  } else if (systemGain !== 1) {
    clone.volume = clampMediaVolume(clone.volume * systemGain);
  }

  let stopped = false;
  const release = () => {
    stopped = true;
    transientSfx.delete(clone);
    disconnectTransientSfx(clone);
    options.signal?.removeEventListener('abort', abort);
    transientSfxReleases.delete(clone);
  };
  const abort = () => { stopSfxClone(clone); release(); };
  transientSfxReleases.set(clone, release);
  options.signal?.addEventListener('abort', abort, { once: true });
  clone.addEventListener('ended', release, { once: true });
  clone.addEventListener('error', release, { once: true });

  const startPlayback = async () => {
    if (audioContext?.state === 'suspended') await audioContext.resume();
    if (stopped || options.signal?.aborted || options.isCurrent?.() === false || isSystemMuted()) { abort(); return; }
    await clone.play();
  };
  startPlayback().catch(() => {
    release();
    try { options.onPlaybackFailure?.(); } catch { /* Cosmetic failure callback. */ }
  });
  return clone;
}

export function stopSfxClone(audio) {
  if (!audio) return;
  try { audio.pause(); audio.currentTime = 0; } catch { /* Optional/failed media. */ }
  transientSfxReleases.get(audio)?.();
  transientSfx.delete(audio);
  disconnectTransientSfx(audio);
}

export function stopAllGameSfx() {
  for (const audio of [...GAME_SFX, ...transientSfx]) {
    stopSfxClone(audio);
  }
  transientSfx.clear();
}

export function clampMediaVolume(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}
