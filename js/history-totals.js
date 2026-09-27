import { historyStats } from './match-history.js';

// Mesma seleção e cálculo do filtro “Entre jogadores” do perfil.
export function playerHistoryStats(matches, uid) {
  return historyStats(matches.filter(match => match.category === 'players'), uid);
}

export async function loadHistoryTotals(uid, loadPage) {
  const page = await loadPage(uid, null);
  return playerHistoryStats([...new Map(page.matches.map(match => [match.matchId, match])).values()], uid);
}
