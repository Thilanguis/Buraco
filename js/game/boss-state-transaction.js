// Shared by normal Boss commits, Special transactions and undo. A stale writer
// must never replace cards/power received by a concurrent authoritative action.
export const bossStateRevision = state => Number(state?.bossStateRevision) || 0;
export function sameBossRevision(latest, proposal) {
  return latest.mode === proposal.mode && latest.matchStartedAt === proposal.matchStartedAt
    && bossStateRevision(latest) === bossStateRevision(proposal);
}

export async function saveBossSpecialTransaction({ runTransaction, db, gameRef,
  expectedState, request, activate, blocked = () => false, prepareHistory = async () => () => {} }) {
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(gameRef);
    if (!snapshot.exists() || !snapshot.data().stateJson) return null;
    const latest = JSON.parse(snapshot.data().stateJson);
    if (!sameBossRevision(latest, expectedState) || blocked(latest)
      || (latest.pauseControlRevision || 0) !== (expectedState.pauseControlRevision || 0)) {
      return { accepted: false, state: latest };
    }
    const action = activate(latest, request);
    if (!action) return { accepted: false, state: latest };
    const before = JSON.parse(snapshot.data().stateJson);
    latest.bossStateRevision = bossStateRevision(latest) + 1;
    latest.lastAction = action;
    const saveHistory=latest.finished ? await prepareHistory(transaction,latest) : () => {};
    transaction.update(gameRef, { stateJson: JSON.stringify(latest), updatedAt: Date.now() });
    saveHistory();
    return { accepted: true, state: latest, before, action };
  });
}
