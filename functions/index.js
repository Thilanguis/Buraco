import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { createHash, timingSafeEqual } from 'node:crypto';

initializeApp();
const passwordSecret = defineSecret('DEVTOOLS_ADMIN_PASSWORD');
const digest = text => createHash('sha256').update(text).digest();

export const unlockDevTools = onCall({ region: 'us-central1', secrets: [passwordSecret], maxInstances: 2 }, async request => {
  const password = request.data?.password;
  if (typeof password !== 'string' || password.length > 128) throw new HttpsError('invalid-argument', 'Requisição inválida.');
  const now = Date.now();
  const db = getFirestore();
  const ipKey = digest(request.rawRequest.ip || 'unknown').toString('hex');
  const bucket = db.doc(`devtoolsSecurity/${ipKey}`);
  // Count before checking the secret, including concurrent requests.
  const allowed = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(bucket);
    const previous = snapshot.data();
    const current = previous?.until > now ? previous : { attempts: 0, until: now + 15 * 60 * 1000 };
    if (current.attempts >= 5) return false;
    transaction.set(bucket, { attempts: current.attempts + 1, until: current.until });
    return true;
  });
  if (!allowed) throw new HttpsError('resource-exhausted', 'Aguarde 15 minutos.');
  const expected = passwordSecret.value();
  if (!expected || !timingSafeEqual(digest(password), digest(expected))) throw new HttpsError('permission-denied', 'Senha incorreta.');
  const token = await getAuth().createCustomToken('devtools-admin', { devtools: true, devtoolsUntil: now + 60 * 60 * 1000 });
  return { token };
});
