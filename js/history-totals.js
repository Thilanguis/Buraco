import { historyStats } from './match-history.js';

// Mesma seleção e cálculo do filtro “Entre jogadores” do perfil.
export function playerHistoryStats(matches, uid) {
  return historyStats(matches.filter(match => match.category === 'players'), uid);
}

export async function loadHistoryTotals(uid, loadPage) {
  const matches = new Map();
  let cursor = null;
  do {
    const page = await loadPage(uid, cursor);
    for (const match of page.matches) matches.set(match.matchId, match);
    if (!page.hasMore) break;
    if (!page.cursor || page.cursor === cursor) throw new Error('Paginação não avançou');
    cursor = page.cursor;
  } while (true);
  return playerHistoryStats([...matches.values()], uid);
}
