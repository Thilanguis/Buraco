import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { matchesDevToolsPassword } from '../js/game/devtools-access.js';

test('simple password accepts only exact configured strings', () => {
  assert.equal(matchesDevToolsPassword({ password: 'test-only' }, 'test-only'), true);
  assert.equal(matchesDevToolsPassword({ password: 'test-only' }, 'wrong'), false);
  assert.equal(matchesDevToolsPassword({ password: 'test-only', enabled: false }, 'test-only'), false);
  assert.equal(matchesDevToolsPassword(null, 'test-only'), false);
  assert.equal(matchesDevToolsPassword({ password: '' }, ''), false);
  assert.equal(matchesDevToolsPassword({ password: 1234 }, '1234'), false);
});

test('production gate reads the server document without Functions or Auth', () => {
  const source = readFileSync(new URL('../js/game/devtools-auth.js', import.meta.url), 'utf8');
  assert.match(source, /getDocFromServer\(doc\(db, 'appConfig', 'devtools'\)\)/);
  assert.doesNotMatch(source, /httpsCallable|signInWithCustomToken|firebase-auth|firebase-functions/);
});
