import { collection, getDocsFromServer, query, orderBy, limit, startAfter } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from './firebase.js';

export async function loadHistoryPage(uid, cursor = null) {
  const constraints = [orderBy('finishedAt', 'desc'), limit(30)];
  if (cursor) constraints.push(startAfter(cursor));
  const page = await getDocsFromServer(query(collection(db, 'userProfiles', uid, 'matches'), ...constraints));
  return { matches: page.docs.map(doc => doc.data()), cursor: page.docs.at(-1) || null, hasMore: page.size === 30 };
}
