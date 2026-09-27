export function historyIdentity(gameId, state) {
  return `${gameId}_${state.matchStartedAt}`;
}

export function buildMatchSummary(gameId, state, scores) {
  if (!state?.finished || !state.matchStartedAt || !state.matchFinishedAt) return null;
  const participants = state.players.map(p => ({ seat: p.id, uid: p.accountUid || null, name: p.name, teamId: p.teamId, bot: /bot/i.test(p.name) }));
  const participantIds = [...new Set(participants.map(p => p.uid).filter(Boolean))];
  if (!participantIds.length) return null;
  const boss = state.mode.startsWith('boss_');
  const test = !!(state.historyTest || state.debugScenario?.active);
  const best = Math.max(...scores.map(s => s.score));
  const leaders = scores.filter(s => s.score === best);
  // Quem bateu (winnerTeamId no motor) e quem venceu por pontos podem ser diferentes.
  const winnerTeamId = boss ? (state.boss?.result?.victory ? 0 : 1) : leaders.length === 1 ? leaders[0].team.id : null;
  return {
    version: 1, matchId: historyIdentity(gameId, state), gameId,
    startedAt: state.matchStartedAt, finishedAt: state.matchFinishedAt,
    durationSeconds: Math.max(0, Math.round((state.matchFinishedAt - state.matchStartedAt) / 1000)),
    mode: state.mode, variant: state.variant || '',
    category: test ? 'test' : boss ? 'boss' : participants.some(p => p.bot) ? 'bots' : 'players',
    participants, participantIds, winnerTeamId, finisherTeamId: state.winnerTeamId ?? null,
    reason: boss ? state.boss?.result?.reason || 'boss_result' : state.winnerTeamId == null ? 'stock_exhausted' : 'finished',
    teams: scores.map(s => ({ id: s.team.id, name: s.team.name, score: s.score,
      meldPoints: s.meldPoints || 0, handPenalty: s.handPenalty || 0,
      deadPenalty: s.penaltyMorto || 0, finishBonus: s.bonusBatida || 0,
      canastras: { suja: (s.sujaBonus || 0) / 100, limpa: (s.limpaBonus || 0) / 200, real: (s.realBonus || 0) / 500, asas: (s.asasBonus || 0) / 1000 } })),
  };
}

export function resultFor(summary, uid) {
  const player = summary.participants.find(p => p.uid === uid);
  if (!player) return 'unknown';
  if (summary.winnerTeamId === null) return 'draw';
  return player.teamId === summary.winnerTeamId ? 'win' : 'loss';
}

export function historyStats(matches, uid) {
  const valid = matches.filter(m => m.category !== 'test' && resultFor(m, uid) !== 'unknown');
  const wins = valid.filter(m => resultFor(m, uid) === 'win').length;
  const draws = valid.filter(m => resultFor(m, uid) === 'draw').length;
  const ownScores = valid.map(m => m.teams.find(t => t.id === m.participants.find(p => p.uid === uid).teamId)?.score || 0);
  return { played: valid.length, wins, draws, losses: valid.length - wins - draws,
    winRate: valid.length ? Math.round(wins * 100 / valid.length) : 0,
    bestScore: ownScores.length ? Math.max(...ownScores) : null };
}

// O ID estável evita duplicação; regras permitem repetir apenas o mesmo resumo imutável.
export async function prepareHistoryWrites(transaction, { db, doc, gameRef, summary, uid }) {
  if (!summary || !summary.participantIds.includes(uid)) return () => {};
  const refs = summary.participantIds.map(id => doc(db, 'userProfiles', id, 'matches', summary.matchId));
  return () => {
    transaction.update(gameRef, { historySummary: summary, matchParticipantIds: summary.participantIds });
    refs.forEach(ref => transaction.set(ref, summary));
  };
}
