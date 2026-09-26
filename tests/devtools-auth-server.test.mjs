import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';

function server(secret = 'test-only-secret') {
  const buckets = new Map();
  let issued = null;
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
  const db = { doc: path => path, runTransaction: async callback => callback({
    get: async path => ({ data: () => buckets.get(path) }),
    set: (path, data) => buckets.set(path, data),
  }) };
  const context = { createHash, timingSafeEqual, HttpsError, Date, initializeApp() {},
    defineSecret: () => ({ value: () => secret }), getFirestore: () => db,
    getAuth: () => ({ createCustomToken: async (uid, claims) => { issued = { uid, claims }; return 'test-token'; } }),
    onCall: (_options, handler) => handler };
  const source = readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export const unlockDevTools =', 'this.unlockDevTools =');
  vm.runInNewContext(source, context);
  return { invoke: password => context.unlockDevTools({ data: { password }, rawRequest: { ip: '192.0.2.1' } }), issued: () => issued, buckets };
}

test('server issues an expiring devtools token only for the secret', async () => {
  const s = server();
  await assert.rejects(s.invoke('incorrect'), { code: 'permission-denied' });
  assert.equal(s.issued(), null);
  assert.equal((await s.invoke('test-only-secret')).token, 'test-token');
  assert.equal(s.issued().claims.devtools, true);
  assert.ok(s.issued().claims.devtoolsUntil > Date.now());
  assert.ok(s.issued().claims.devtoolsUntil <= Date.now() + 3600000);
  assert.ok(!JSON.stringify([...s.buckets]).includes('test-only-secret'));
});

test('five failed attempts block further attempts even with the correct password', async () => {
  const s = server();
  for (let i = 0; i < 5; i++) await assert.rejects(s.invoke('incorrect'), { code: 'permission-denied' });
  await assert.rejects(s.invoke('test-only-secret'), { code: 'resource-exhausted' });
  assert.equal(s.issued(), null);
});

test('missing secret and malformed input never grant access', async () => {
  const s = server('');
  await assert.rejects(s.invoke(''), { code: 'permission-denied' });
  await assert.rejects(s.invoke({}), { code: 'invalid-argument' });
  await assert.rejects(s.invoke('x'.repeat(129)), { code: 'invalid-argument' });
  assert.equal(s.issued(), null);
});
