// Read-only audio-level audit. Does not play audio or alter game assets.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = path.join(__dirname, '..');
(async () => {
  global.window = {};
  global.Audio = class { constructor(src) { this.src = src; this.volume = 1; this.dataset = {}; } };
  const config = await import(pathToFileURL(path.join(root, 'js/audio.js')));
  const entries = [];
  const add = (label, audio, volume = audio.volume) => entries.push({ label, src: audio.src, gain: volume * Number(audio.dataset?.systemGain || 1) });
  for (const [kind, audio] of Object.entries(config.CANASTRA_SFX)) add(`canastra/${kind}`, audio, .9);
  for (const [theme, sounds] of Object.entries(config.TABLE_CANASTRA_SFX)) {
    for (const [kind, audio] of Object.entries(sounds)) add(`canastra/${theme}/${kind}`, audio);
  }
  for (const [theme, audio] of Object.entries(config.DECK_MOVE_SFX)) add(`movimento/${theme}`, audio);
  for (const [boss, sounds] of Object.entries(config.BOSS_SFX)) for (const [kind, audio] of Object.entries(sounds)) add(`${boss}/${kind}`, audio);
  for (const key of ['sfxCardMove', 'sfxMyTurn', 'sfxSearch', 'sfxSteal', 'sfxHeartbeat']) add(key, config[key]);
  for (const name of ['entrada', 'saida', 'turno-extra']) add(`amiga/${name}`, { src: `assets/sfx/amiga-${name}.mp3`, volume: .9 });
  const { FRIEND_EXTRA_TURN_MP3 } = await import(pathToFileURL(path.join(root, 'js/game/domination-friend-sound.js')));
  for (const [name, src] of Object.entries(FRIEND_EXTRA_TURN_MP3)) add(`amiga/voz/${name}`, { src, volume: .9 });
  for (const [theme, cfg] of Object.entries(config.TABLE_AMBIENT_MUSIC)) {
    add(`musica/${theme}`, cfg);
    if (cfg.intro) add(`intro/${theme}`, { src: cfg.intro, volume: .35 });
  }
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    for (const entry of entries) {
      if (process.argv.length > 2 && !process.argv.slice(2).some(filter => entry.label.includes(filter))) continue;
      try {
        const data = fs.readFileSync(path.join(root, entry.src)).toString('base64');
        const result = await page.evaluate(async ({ data, gain }) => {
          const ctx = new OfflineAudioContext(2, 1, 44100);
          const pcm = await ctx.decodeAudioData(Uint8Array.from(atob(data), c => c.charCodeAt(0)).buffer);
          const blockSize = Math.round(pcm.sampleRate * .1);
          let total = 0, peak = 0, activeSum = 0, activeCount = 0;
          for (let start = 0; start < pcm.length; start += blockSize) {
            const end = Math.min(pcm.length, start + blockSize);
            let sum = 0;
            for (let ch = 0; ch < pcm.numberOfChannels; ch++) {
              const samples = pcm.getChannelData(ch);
              for (let i = start; i < end; i++) { sum += samples[i] ** 2; peak = Math.max(peak, Math.abs(samples[i])); }
            }
            const count = (end - start) * pcm.numberOfChannels;
            total += sum;
            if (sum / count > 1e-5) { activeSum += sum; activeCount += count; }
          }
          const db = value => +(20 * Math.log10(value)).toFixed(1);
          return { seconds: +pcm.duration.toFixed(2), rms: db(Math.sqrt(total / (pcm.length * pcm.numberOfChannels)) * gain), activeRms: db(Math.sqrt(activeSum / activeCount) * gain), peak: db(peak * gain) };
        }, { data, gain: entry.gain });
        console.log(JSON.stringify({ ...entry, ...result }));
      } catch (error) { console.log(JSON.stringify({ ...entry, error: error.message })); }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
