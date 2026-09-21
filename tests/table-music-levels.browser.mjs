// Compare whole-track RMS at the configured playback gain (not a LUFS meter).
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const source = await readFile(new URL('../js/audio.js', import.meta.url), 'utf8');
const config = Function(`return (${source.match(/TABLE_AMBIENT_MUSIC = Object.freeze\((\{[\s\S]*?\})\);/)[1]})`)();
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage();
  const levels = [];
  for (const [theme, { src, volume }] of Object.entries(config)) {
    const bytes = await readFile(new URL(`../${src}`, import.meta.url));
    const level = await page.evaluate(async ({ data, volume }) => {
      const ctx = new OfflineAudioContext(2, 1, 44100);
      const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
      const audio = await ctx.decodeAudioData(bytes.buffer);
      let sum = 0, peak = 0;
      for (let ch = 0; ch < audio.numberOfChannels; ch++) {
        const samples = audio.getChannelData(ch);
        for (let i = 0; i < samples.length; i++) { sum += samples[i] ** 2; peak = Math.max(peak, Math.abs(samples[i])); }
      }
      const rms = Math.sqrt(sum / (audio.length * audio.numberOfChannels));
      return { seconds: audio.duration, rms, peak, outputDb: 20 * Math.log10(rms * volume) };
    }, { data: bytes.toString('base64'), volume });
    assert.ok(level.seconds > 0 && Number.isFinite(level.outputDb));
    assert.ok(volume > 0 && volume <= 0.35);
    levels.push({ theme, volume, ...level });
  }
  console.table(levels);
  const references = levels.filter(l => l.theme !== 'lunar').map(l => l.outputDb).sort((a, b) => a - b);
  const target = (references[2] + references[3]) / 2;
  const lunar = levels.find(l => l.theme === 'lunar');
  if (lunar) {
    console.log('Suggested lunar gain:', Math.min(0.35, 10 ** (target / 20) / lunar.rms).toFixed(3));
    // Respect the shared volume ceiling; match the quieter existing tables.
    const feltro = levels.find(l => l.theme === 'feltro');
    assert.ok(Math.abs(lunar.outputDb - feltro.outputDb) < 1, 'lunar must match Feltro within 1 dB RMS');
    assert.ok(lunar.outputDb >= references[0] - 1 && lunar.outputDb <= references.at(-1) + 1);
  }
} finally { await browser.close(); }
