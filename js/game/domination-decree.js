const MODE = '1x1_dominacao';
const DOMINATOR_ID = 1;
const SLAVE_ID = 0;

function currentPlayerId(state) {
  const current = state?.currentPlayer;
  return state?.players?.[current]?.id ?? current;
}

export function dominationDecreeEnabled(state) {
  if (state?.mode !== MODE) return false;
  const options = state.dominationOptions || {};
  const configured = options.decree ?? options.search;
  return configured !== false;
}

export function dominationDecreeUsed(state) {
  // A partida pode ter sido aberta antes da troca da antiga Busca pelo Decreto.
  // Se a Busca antiga já foi gasta, não concedemos um segundo poder 1x/partida.
  return state?.dominatorDecreeUsed === true || state?.dominatorSearchUsed === true;
}

export function isDominationDiscardDecreeActive(state, playerId = currentPlayerId(state)) {
  return state?.mode === MODE
    && Number(playerId) === SLAVE_ID
    && Number(state?.dominatorDiscardBlockTurn) === Number(state?.turnNumber)
    && state?.hasDrawnThisTurn !== true;
}

export function canUseDominationDecree(state, actorId = DOMINATOR_ID) {
  if (!dominationDecreeEnabled(state) || Number(actorId) !== DOMINATOR_ID) return false;
  if (!state || state.finished || state.debugPaused || state.surrender?.active) return false;
  if (state.pause?.paused || state.pause?.request) return false;
  if (dominationDecreeUsed(state) || state.hasDrawnThisTurn) return false;
  if (currentPlayerId(state) !== SLAVE_ID) return false;
  if (!Array.isArray(state.discard) || state.discard.length === 0) return false;
  return true;
}

export function applyDominationDecree(state, actorId = DOMINATOR_ID) {
  if (!canUseDominationDecree(state, actorId)) return false;
  state.dominatorDecreeUsed = true;
  state.dominatorDiscardBlockTurn = state.turnNumber;
  return true;
}
