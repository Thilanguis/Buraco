import { planTripleIndexes } from './bot-planner.js';

self.addEventListener('message', (event) => {
  const { requestId, token, kind, payload } = event.data || {};
  try {
    if (kind !== 'triples') throw new Error(`Planner desconhecido: ${kind}`);
    const result = planTripleIndexes(payload?.hand || []);
    self.postMessage({ requestId, token, ok: true, result });
  } catch (error) {
    self.postMessage({ requestId, token, ok: false, error: error?.message || String(error) });
  }
});
