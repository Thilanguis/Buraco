import { dominationFeatureEnabled } from './domination-friend.js';

export function canShowVisionHint(state, viewer, actionsAllowed = true) {
  return dominationFeatureEnabled(state, 'vision') && viewer === 1
    && state.currentPlayer === 1 && !state.finished && !state.debugPaused
    && !state.surrender?.active && !state.hasDrawnThisTurn && !state.partialDraw
    && !state.dominatorUsedPower && !state.powerActiveThisTurn && actionsAllowed;
}

const messages = {
  special: '👁️ A Visão pode ajudar a formar Real ou Ás-a-Ás.',
  complete: '👁️ A Visão pode ajudar a completar uma canastra.',
  clean: '👁️ A Visão pode ajudar a limpar uma canastra.',
};

// Preview only: never expose card IDs/counts, mutate hands or run live actions.
export function findVisionOpportunity(melds, enemyHand, rules) {
  let priority = 0;
  const cards = (enemyHand || []).filter(Boolean);
  for (const source of melds || []) {
    const meld = (source || []).filter(Boolean);
    const before = rules.classify(meld);
    const inspect = additions => {
      const preview = rules.prepare([...meld, ...additions].map(card => ({ ...card })));
      if (!rules.valid(preview)) return;
      const after = rules.classify(preview);
      if ((after === 'asas' && before !== 'asas')
        || (after === 'real' && !['real', 'asas'].includes(before))) priority = 3;
      else if (meld.length < 7 && preview.length >= 7 && after !== 'simple') priority = Math.max(priority, 2);
      else if (before === 'suja' && ['limpa', 'real', 'asas'].includes(after)) priority = Math.max(priority, 1);
    };
    for (let i = 0; i < cards.length; i++) {
      inspect([cards[i]]);
      for (let j = i + 1; j < cards.length; j++) {
        inspect([cards[i], cards[j]]);
        if (priority === 3) return messages.special;
      }
      if (priority === 3) return messages.special;
    }
  }
  return priority === 2 ? messages.complete : priority === 1 ? messages.clean : '';
}

export function createVisionHintEvaluator(rules) {
  let previousKey, previousMessage = '';
  return (state, viewer, actionsAllowed = true) => {
    if (!canShowVisionHint(state, viewer, actionsAllowed)) return '';
    const teamId = state.players?.[1]?.teamId;
    const melds = state.teams?.find(team => team.id === teamId)?.melds || [];
    const hand = state.players?.[0]?.hand || [];
    const key = JSON.stringify([melds, hand]);
    if (key !== previousKey) {
      previousMessage = findVisionOpportunity(melds, hand, rules);
      previousKey = key;
    }
    return previousMessage;
  };
}
