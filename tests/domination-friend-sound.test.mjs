import assert from 'node:assert/strict';
import test from 'node:test';
import { createFriendSoundQueue, waitForPlayingCanastras } from '../js/game/domination-friend-sound.js';
import { presentDominationFriend } from '../js/game/domination-friend-ui.js';

test('vinheta espera canastra, nao sobrepoe sons e falhas/cancelamento nao prendem a fila', async (t) => {
  const played = [];
  const audios = [];
  class FakeAudio extends EventTarget {
    constructor(src) { super(); this.src = src; this.paused = true; this.ended = false; }
    play() {
      played.push(this.src);
      if (this.src === 'missing.mp3') return Promise.reject(new Error('arquivo ainda nao fornecido'));
      this.paused = false;
      this.dispatchEvent(new Event('playing'));
      return Promise.resolve();
    }
    pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
    end() { this.ended = true; this.paused = true; this.dispatchEvent(new Event('ended')); }
  }
  const existing = new FakeAudio('canastra-ja-tocando.mp3');
  existing.paused = false;
  const queue = createFriendSoundQueue({
    createAudio: (src) => { const audio = new FakeAudio(src); audios.push(audio); return audio; },
    waitForCanastras: () => waitForPlayingCanastras([existing]),
  });
  t.after(() => { existing.end(); queue.cancel(); });
  const flush = () => new Promise(setImmediate);
  const first = queue.enqueue('canastra-limpa.mp3');
  const extra = queue.enqueue('amiga-turno-extra.mp3', () => Promise.reject(new Error('animacao cancelada')));
  const last = queue.enqueue('canastra-real.mp3');
  await flush();
  assert.deepEqual(played, []);
  existing.end();
  await flush();
  assert.deepEqual(played, ['canastra-limpa.mp3']);
  audios[0].end();
  await flush();
  assert.deepEqual(played, ['canastra-limpa.mp3', 'amiga-turno-extra.mp3']);
  assert.equal(queue.busy, true);
  audios[1].end();
  await flush();
  assert.equal(played.at(-1), 'canastra-real.mp3');
  audios[2].end();
  await Promise.all([first, extra, last]);
  assert.equal(queue.busy, false);
  let noticeShown = false;
  await queue.enqueue('missing.mp3', () => { noticeShown = true; });
  assert.equal(noticeShown, true, 'aviso visual funciona mesmo sem MP3');
  assert.equal(queue.busy, false);
  const cancelled = queue.enqueue('entrada.mp3');
  const skipped = queue.enqueue('nao-deve-tocar.mp3');
  await flush();
  const current = audios.at(-1);
  queue.cancel();
  await Promise.all([cancelled, skipped]);
  assert.equal(current.paused, true);
  assert.ok(!played.includes('nao-deve-tocar.mp3'));
  assert.equal(queue.busy, false);
});

test('musica da roleta repete e para ao fechar, sem cancelar vinhetas seguintes', async (t) => {
  const audios = [];
  const queue = createFriendSoundQueue({
    createAudio(src) {
      const audio = Object.assign(new EventTarget(), {
        src, paused: true, currentTime: 10,
        play() { this.paused = false; return Promise.resolve(); },
        pause() { this.paused = true; },
      });
      audios.push(audio);
      return audio;
    },
  });
  t.after(() => queue.cancel());
  const close = new AbortController();
  const music = queue.enqueue('amiga-entrada.mp3', undefined, { signal: close.signal, loop: true });
  const next = queue.enqueue('amiga-turno-extra.mp3');
  await new Promise(setImmediate);
  assert.equal(audios[0].loop, true);
  assert.equal(audios[0].paused, false);
  close.abort();
  assert.equal(audios[0].paused, true);
  assert.equal(audios[0].currentTime, 0);
  await new Promise(setImmediate);
  assert.equal(audios[1].src, 'amiga-turno-extra.mp3');
  assert.equal(audios[1].loop, false);
  audios[1].dispatchEvent(new Event('ended'));
  await Promise.all([music, next]);
  await queue.enqueue('nao-tocar-apos-fechar.mp3', undefined, { signal: close.signal, loop: true });
  assert.equal(audios.length, 2);
});

test('apresentacao inicia musica nos giros e corta antes da distribuicao, inclusive no cancelamento', async () => {
  const originalDocument = globalThis.document;
  const originalTimeout = globalThis.setTimeout;
  try {
    for (const cancelled of [false, true]) {
      const events = [];
      const element = () => ({
        style: {}, setAttribute() {}, append() {}, replaceChildren() {},
        remove() { events.push('close'); },
        animate() { events.push('spin'); return { finished: Promise.resolve() }; },
      });
      globalThis.document = {
        createElement: element,
        body: { append() { events.push('open'); } },
        getElementById() { events.push('deal'); return null; },
      };
      globalThis.setTimeout = (callback) => { callback(); return 0; };
      await presentDominationFriend({ name: 'Bruna', initialTurns: 3 }, () => !cancelled, {
        startRouletteSound() {
          events.push('music');
          return () => { if (!events.includes('stop')) events.push('stop'); };
        },
      });
      assert.deepEqual(events, cancelled
        ? ['open', 'music', 'spin', 'stop', 'close']
        : ['open', 'music', 'spin', 'spin', 'stop', 'close', 'deal', 'close']);
    }
  } finally {
    globalThis.document = originalDocument;
    globalThis.setTimeout = originalTimeout;
  }
});
