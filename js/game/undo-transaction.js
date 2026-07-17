export function cloneGameValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function createUndoTransaction(gameState, uiState = {}, metadata = {}) {
  if (!gameState) return null;
  return {
    version: 1,
    state: cloneGameValue(gameState),
    ui: cloneGameValue(uiState),
    actorPlayerId: metadata.actorPlayerId ?? gameState.currentPlayer ?? null,
    actionType: metadata.actionType || 'gameAction',
    createdAt: metadata.createdAt || Date.now(),
  };
}

export function restoreUndoTransaction(transaction) {
  if (!transaction?.state) return null;
  return {
    state: cloneGameValue(transaction.state),
    ui: cloneGameValue(transaction.ui || {}),
    actorPlayerId: transaction.actorPlayerId ?? null,
    actionType: transaction.actionType || 'gameAction',
  };
}

export function canRestoreUndoTransaction(transaction, gameState, localPlayerId) {
  if (!transaction?.state || !gameState || gameState.finished) return false;
  if (transaction.actorPlayerId !== localPlayerId) return false;
  const lastActor = gameState.lastAction?.playerId;
  return lastActor == null || lastActor === localPlayerId;
}
