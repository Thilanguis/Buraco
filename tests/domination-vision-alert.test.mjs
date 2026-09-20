import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisionAlert } from '../js/game/domination-vision-alert.js';

function setup() {
  let sequence = 0;
  const timers = new Map();
  const f = { busy: true, valid: true, get plays() { return this.intros.filter(Boolean).length; }, pulses: [], intros: [], saved: '' };
  f.update = createVisionAlert({
    schedule(fn) { timers.set(++sequence, fn); return sequence; }, cancel(id) { timers.delete(id); },
    busy: () => f.busy, valid: () => f.valid,
    pulse: active => f.pulses.push(active),
    intro: active => f.intros.push(active),
    remember: key => { f.saved = key; }, recalled: key => f.saved === key,
  });
  f.tick = () => { const entry = timers.entries().next().value; if (entry) { timers.delete(entry[0]); entry[1](); } };
  return f;
}

test('entrada visual espera turno e nao repete; pulso continua ate oportunidade terminar', () => {
  const f = setup();
  f.update('turn-1', true);
  f.tick();
  assert.equal(f.plays, 0);
  f.busy = false;
  f.tick();
  assert.equal(f.plays, 1);
  assert.equal(f.pulses.at(-1), true);
  assert.equal(f.intros.at(-1), true);
  f.update('turn-1', true);
  f.tick();
  assert.equal(f.intros.at(-1), false);
  assert.equal(f.intros.filter(Boolean).length, 1);
  assert.equal(f.pulses.at(-1), true);
  assert.equal(f.plays, 1);
  f.update('turn-1', false);
  assert.equal(f.pulses.at(-1), false);
  assert.equal(f.intros.at(-1), false);
  f.update('turn-1', true);
  f.tick();
  assert.equal(f.pulses.at(-1), true);
  assert.equal(f.plays, 1);
  f.update('turn-2', true);
  f.tick();
  assert.equal(f.plays, 2);
});

test('comprar, usar Visao ou sair cancela alerta pendente e pulso', () => {
  const f = setup();
  f.update('turn-1', true);
  f.update('turn-1', false);
  f.busy = false;
  f.tick();
  assert.equal(f.plays, 0);
  assert.equal(f.pulses.at(-1), false);
  f.update('turn-2', true);
  f.valid = false;
  f.tick();
  assert.equal(f.plays, 0);
});

test('reload de turno ja avisado nao repete entrada visual', () => {
  const f = setup();
  f.saved = 'turn-1';
  f.busy = false;
  f.update('turn-1', true);
  f.tick();
  assert.equal(f.plays, 0);
  assert.equal(f.pulses.at(-1), true);
});
