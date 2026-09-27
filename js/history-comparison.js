// Somente resumos já autorizados do próprio histórico. Identidade por UID, nunca nome.
export function comparisonMatches(matches, uid) {
  const seen = new Set();
  return matches.filter(m => {
    if (seen.has(m.matchId)) return false;
    seen.add(m.matchId);
    return m.category !== 'test' && m.category !== 'bots'
      && !m.participants.some(p => p.bot || /bot/i.test(p.name))
      && m.participants.some(p => p.uid === uid);
  }).sort((a,b) => b.finishedAt - a.finishedAt);
}

export function comparisonPlayers(matches, uid) {
  const people = new Map();
  for (const m of comparisonMatches(matches, uid)) for (const p of m.participants) {
    if (p.uid && p.uid !== uid && !people.has(p.uid)) people.set(p.uid, { uid:p.uid, name:p.name });
  }
  return [...people.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}

export function comparePlayers(matches, uid, otherUid, relation = 'opponents', mode = 'all') {
  const selected = comparisonMatches(matches, uid).filter(m => {
    const me=m.participants.find(p=>p.uid===uid), other=m.participants.find(p=>p.uid===otherUid);
    return other && uid !== otherUid && (mode==='all'||m.mode===mode)
      && (relation==='partners' ? me.teamId===other.teamId : me.teamId!==other.teamId);
  });
  const outcomes=selected.map(m=>m.winnerTeamId===null?'draw':m.winnerTeamId===m.participants.find(p=>p.uid===uid).teamId?'win':'loss');
  function scores(id) {
    const values=selected.map(m=>m.teams.find(t=>t.id===m.participants.find(p=>p.uid===id).teamId)?.score).filter(Number.isFinite);
    return { best:values.length?Math.max(...values):null, average:values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null };
  }
  let streak=0;
  for (const outcome of outcomes) { if(outcome!==outcomes[0])break; streak++; }
  return { matches:selected, played:selected.length, wins:outcomes.filter(x=>x==='win').length,
    losses:outcomes.filter(x=>x==='loss').length, draws:outcomes.filter(x=>x==='draw').length,
    mine:scores(uid), theirs:scores(otherUid), streak:{ outcome:outcomes[0]||null,count:streak } };
}
