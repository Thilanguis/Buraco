import { collection, getDocsFromServer, query, orderBy, limit, startAfter, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from './firebase.js';

// Um listener compartilhado por conta. Menu e perfil recebem a mesma coleção
// completa; a paginação da lista nunca determina o total de partidas.
const histories = new Map();
export function subscribeHistory(uid, onMatches, onError = () => {}) {
  if (!uid) throw new Error('Conta necessária para consultar o histórico');
  let entry = histories.get(uid);
  if (!entry) {
    entry = { listeners: new Set(), matches: null, stop: null, failed: false };
    histories.set(uid, entry);
  }
  const listener = { onMatches, onError };
  entry.listeners.add(listener);
  if (!entry.stop || entry.failed) {
    entry.stop?.();
    entry.failed = false;
    entry.stop = onSnapshot(query(collection(db, 'userProfiles', uid, 'matches'), orderBy('finishedAt', 'desc')), snapshot => {
      entry.matches = snapshot.docs.map(doc => doc.data());
      for (const listener of entry.listeners) listener.onMatches(entry.matches);
    }, error => {
      entry.matches = null;
      entry.failed = true;
      for (const listener of entry.listeners) listener.onError(error);
    });
  }
  if (entry.matches) queueMicrotask(() => { if (entry.listeners.has(listener)) onMatches(entry.matches); });
  return () => {
    entry.listeners.delete(listener);
    if (!entry.listeners.size) { entry.stop(); histories.delete(uid); }
  };
}

export async function loadHistoryPage(uid, cursor = null) {
  const constraints = [orderBy('finishedAt', 'desc'), limit(30)];
  if (cursor) constraints.push(startAfter(cursor));
  const page = await getDocsFromServer(query(collection(db, 'userProfiles', uid, 'matches'), ...constraints));
  return { matches: page.docs.map(doc => doc.data()), cursor: page.docs.at(-1) || null, hasMore: page.size === 30 };
}
