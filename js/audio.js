export const CANASTRA_SFX = {
  suja: new Audio('assets/sfx/canastra-suja.mp3'),
  limpa: new Audio('assets/sfx/canastra-limpa.mp3'),
  real: new Audio('assets/sfx/canastra-real.mp3'),
  asas: new Audio('assets/sfx/canastra-as-a-as.mp3'),
};

function createBossSfx(src, volume = 0.9, systemGain = 1) {
  const audio = new Audio(src);
  audio.preload = 'auto';
  audio.volume = volume;
  audio.dataset.systemGain = String(systemGain);
  return audio;
}

export const BOSS_SFX = Object.freeze({
  banker: Object.freeze({
    resource: createBossSfx('assets/sfx/habilidade-banqueiro.mp3'),
    victory: createBossSfx('assets/sfx/fim-de-jogo-banqueiro.mp3'),
  }),
  dominadora: Object.freeze({
    resource: createBossSfx('assets/sfx/habilidade-dominadora.mp3'),
    victory: createBossSfx('assets/sfx/fim-de-jogo-dominadora.mp3'),
  }),
  matriarca_esmeralda: Object.freeze({
    resource: createBossSfx('assets/sfx/habilidade-matriarca.mp3', 0.9, 2),
    heal: createBossSfx('assets/sfx/cura-matriarca.mp3', 0.9, 2),
    victory: createBossSfx('assets/sfx/fim-de-jogo-matriarca.mp3', 0.9, 2),
  }),
});

export const sfxCardMove = new Audio('assets/sfx/barulho-cartas.mp3');
sfxCardMove.preload = 'auto';
sfxCardMove.volume = 0.5;

export const sfxMyTurn = new Audio('assets/sfx/seu-turno.mp3');
sfxMyTurn.preload = 'auto';
sfxMyTurn.volume = 0.8;

export const sfxSteal = window.sfxSteal || new Audio('assets/sfx/roubo-mao.mp3');
sfxSteal.preload = 'auto';
sfxSteal.volume = 0.95;
window.sfxSteal = sfxSteal;

export const sfxHeartbeat = new Audio('assets/sfx/coracao-batendo.mp3');
sfxHeartbeat.preload = 'auto';
sfxHeartbeat.volume = 1;
sfxHeartbeat.loop = true;

export const TABLE_AMBIENT_MUSIC = Object.freeze({
  feltro: { src: 'assets/music/mesa-feltro.mp3', volume: 0.35 },
  cassino: { src: 'assets/music/mesa-cassino.mp3', volume: 0.32 },
  masmorra: { src: 'assets/music/mesa-masmorra.mp3', volume: 0.31 },
  ostentacao: { src: 'assets/music/mesa-ostentacao.mp3', volume: 0.23 },
  submissao: { src: 'assets/music/mesa-submissao.mp3', volume: 0.32 },
  findom: { src: 'assets/music/mesa-findom.mp3', volume: 0.34 },
});

export const TABLE_AMBIENT_MAX_VOLUME = 0.35;
export const TABLE_AMBIENT_STORAGE_KEY = 'buraco_table_ambient_enabled';

const BOSS_AUDIO_ELEMENTS = Object.values(BOSS_SFX).flatMap((sounds) => Object.values(sounds));
const GAME_SFX = [...Object.values(CANASTRA_SFX), ...BOSS_AUDIO_ELEMENTS, sfxCardMove, sfxMyTurn, sfxSteal, sfxHeartbeat];
const transientSfx = new Set();
const transientSfxNodes = new Map();

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
  if (!source) return null;

  const clone = source.cloneNode();
  const requestedGain = Number(source.dataset?.systemGain || options.gain || 1);
  const systemGain = Number.isFinite(requestedGain) && requestedGain > 0
    ? requestedGain
    : 1;
  const audioContext = options.audioContext || null;

  clone.volume = source.volume;
  transientSfx.add(clone);

  if (systemGain !== 1 && audioContext?.createMediaElementSource) {
    try {
      const sourceNode = audioContext.createMediaElementSource(clone);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = systemGain;
      sourceNode.connect(gainNode);
      gainNode.connect(audioContext.destination);
      transientSfxNodes.set(clone, { sourceNode, gainNode });
    } catch (error) {
      // Fallback do elemento HTML quando Web Audio não estiver disponível.
      clone.volume = clampMediaVolume(source.volume * systemGain);
    }
  } else if (systemGain !== 1) {
    clone.volume = clampMediaVolume(source.volume * systemGain);
  }

  const release = () => {
    transientSfx.delete(clone);
    disconnectTransientSfx(clone);
  };
  clone.addEventListener('ended', release, { once: true });
  clone.addEventListener('error', release, { once: true });

  const startPlayback = async () => {
    if (audioContext?.state === 'suspended') await audioContext.resume();
    await clone.play();
  };
  startPlayback().catch(release);
  return clone;
}

export function stopAllGameSfx() {
  for (const audio of [...GAME_SFX, ...transientSfx]) {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (error) {}
    disconnectTransientSfx(audio);
  }
  transientSfx.clear();
}

export function clampMediaVolume(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}
