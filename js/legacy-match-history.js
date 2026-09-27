import { buildMatchSummary } from './match-history.js';

// Migração administrativa pontual: aliases exatos, confirmados pelo titular.
// Nunca atribuir bots nem substituir um UID já existente.
export function buildLegacySummary(gameId, original, aliases, scores, sourceUpdatedAt) {
  if (!original?.finished) return null;
  const state = structuredClone(original);
  for (const player of state.players) {
    if (/bot/i.test(player.name)) { player.accountUid = null; continue; }
    const uid = aliases[player.name.trim().toLocaleLowerCase('pt-BR')];
    if (player.accountUid && uid && player.accountUid !== uid) throw new Error('Conta divergente: ' + gameId);
    player.accountUid ||= uid || null;
  }
  const startedAt = Number.isFinite(state.matchStartedAt) && state.matchStartedAt > 0 ? state.matchStartedAt : null;
  const exactEnd = Number.isFinite(state.matchFinishedAt) && state.matchFinishedAt > 0 ? state.matchFinishedAt : null;
  const finishedAt = exactEnd || state.lastAction?.ts || sourceUpdatedAt;
  if (!Number.isFinite(finishedAt) || finishedAt <= 0) throw new Error('Data indisponível: ' + gameId);
  if (startedAt && startedAt > finishedAt) throw new Error('Datas inconsistentes: ' + gameId);
  // Placeholder apenas para o construtor normal; não persistir início inventado.
  state.matchStartedAt = startedAt || finishedAt;
  state.matchFinishedAt = finishedAt;
  const summary = buildMatchSummary(gameId, state, scores);
  if (!summary) return null;
  summary.matchId = startedAt ? summary.matchId : `legacy_${gameId}`;
  summary.startedAt = startedAt;
  summary.durationSeconds = startedAt && exactEnd ? summary.durationSeconds : null;
  summary.legacyImport = { version: 1, approximateDate: !exactEnd, testStatus: state.historyTest || state.debugScenario?.active ? 'test' : 'not_recorded', scoring: 'current_game_rules' };
  return summary;
}
