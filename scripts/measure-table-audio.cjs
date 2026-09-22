// Decode locally for level comparison; no gameplay/browser UI interaction.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = path.join(__dirname, '..');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const config = fs.readFileSync(path.join(root, 'js/audio.js'), 'utf8').split('export const TABLE_AMBIENT_MUSIC = Object.freeze({')[1].split('});')[0];
    const gains = Object.fromEntries([...config.matchAll(/(\w+): \{ src: '[^']+', volume: ([\d.]+)/g)].map(match => [match[1], Number(match[2])]));
    for (const [theme, gain] of Object.entries(gains)) {
      const data = fs.readFileSync(path.join(root, `assets/music/mesa-${theme}.mp3`)).toString('base64');
      const level = await page.evaluate(async ({ data, gain }) => {
        const ctx = new OfflineAudioContext(2, 1, 44100);
        const pcm = await ctx.decodeAudioData(Uint8Array.from(atob(data), c => c.charCodeAt(0)).buffer);
        let sum = 0, peak = 0;
        for (let ch = 0; ch < pcm.numberOfChannels; ch++) {
          for (const sample of pcm.getChannelData(ch)) { sum += sample * sample; peak = Math.max(peak, Math.abs(sample)); }
        }
        const rms = Math.sqrt(sum / (pcm.length * pcm.numberOfChannels));
        return { seconds: +pcm.duration.toFixed(1), rmsDb: +(20 * Math.log10(rms)).toFixed(2), outputRmsDb: +(20 * Math.log10(rms * gain)).toFixed(2), peakDb: +(20 * Math.log10(peak)).toFixed(2) };
      }, { data, gain });
      console.log(theme, JSON.stringify(level));
    }
    // Keep the source MP3 intact. Export exactly 3 s with a short tail fade.
    const data = fs.readFileSync(path.join(root, 'assets/sfx/abertura-lunar.mp3')).toString('base64');
    const result = await page.evaluate(async data => {
      const ctx = new OfflineAudioContext(2, 1, 44100);
      const pcm = await ctx.decodeAudioData(Uint8Array.from(atob(data), c => c.charCodeAt(0)).buffer);
      const frames = Math.min(pcm.length, Math.floor(pcm.sampleRate * 3));
      const channels = pcm.numberOfChannels;
      const bytes = new Uint8Array(44 + frames * channels * 2);
      const view = new DataView(bytes.buffer);
      const tag = (offset, str) => [...str].forEach((c, i) => bytes[offset + i] = c.charCodeAt(0));
      tag(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); tag(8, 'WAVE'); tag(12, 'fmt ');
      view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
      view.setUint32(24, pcm.sampleRate, true); view.setUint32(28, pcm.sampleRate * channels * 2, true);
      view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); tag(36, 'data'); view.setUint32(40, bytes.length - 44, true);
      for (let i = 0; i < frames; i++) {
        const fade = Math.min(1, (frames - 1 - i) / (pcm.sampleRate * .15));
        for (let ch = 0; ch < channels; ch++) {
          const sample = Math.max(-1, Math.min(1, pcm.getChannelData(ch)[i] * fade));
          view.setInt16(44 + (i * channels + ch) * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
        }
      }
      let str = '';
      for (let i = 0; i < bytes.length; i += 8192) str += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return { wav: btoa(str), originalSeconds: pcm.duration, trimmedSeconds: frames / pcm.sampleRate };
    }, data);
    fs.writeFileSync(path.join(root, 'assets/sfx/abertura-lunar-curta.wav'), Buffer.from(result.wav, 'base64'));
    console.log('Lunar intro:', result.originalSeconds, '->', result.trimmedSeconds, 'seconds');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
