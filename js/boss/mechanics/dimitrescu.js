function matchesMeld(target, meldId, meldIndex) {
  if (!target) return false;
  if (target.meldId && meldId) return target.meldId === meldId;
  return Number(target.meldIndex) === Number(meldIndex);
}

function objective(intent, type) {
  return intent?.payload?.objectives?.find((entry) => entry?.type === type) || null;
}

export const dimitrescuBossMechanics = Object.freeze({
  id: 'dimitrescu',
  onMeldTransition({
    boss,
    playerId = null,
    meldId = null,
    meldIndex = null,
    cardsAdded = [],
    previousDangerReliefValue = 0,
    nextDangerReliefValue = 0,
  } = {}) {
    if (!boss) return null;
    const bloodReduction = Math.max(0, Number(nextDangerReliefValue) - Number(previousDangerReliefValue));
    const intent = boss.currentIntent;

    const addedIds = new Set(cardsAdded.map((card) => card?.id).filter(Boolean));
    if (!intent || !addedIds.size) return { bloodReduction };

    if (intent.abilityId === 'bela_hunt' && intent.payload?.targetPlayerId === playerId && addedIds.has(intent.payload?.cardId)) {
      intent.payload.used = true;
    }

    if (intent.abilityId === 'cassandra_feast' && matchesMeld(intent.payload, meldId, meldIndex)) {
      intent.payload.fed = true;
    }

    if (intent.abilityId === 'crimson_brand') {
      for (const mark of intent.payload?.marks || []) {
        if (mark.status === 'active' && mark.playerId === playerId && addedIds.has(mark.cardId)) mark.status = 'success';
      }
    }

    if (intent.abilityId === 'three_daughters') {
      const bela = objective(intent, 'bela');
      const cassandra = objective(intent, 'cassandra');
      if (bela?.status === 'active' && bela.targetPlayerId === playerId && addedIds.has(bela.cardId)) bela.status = 'success';
      if (cassandra?.status === 'active' && matchesMeld(cassandra, meldId, meldIndex)) cassandra.status = 'success';
    }

    return { bloodReduction };
  },

  afterMeldResolution({ boss, contribution, appliedBloodReduction = 0, newKind = 'simple' } = {}) {
    const applied = Math.max(0, Number(appliedBloodReduction) || 0);
    if (contribution) contribution.dimitrescuBloodRelief += applied;
    return {
      dangerChangeLabel: applied ? `Canastra ${newKind === 'asas' ? 'Ás-a-Ás' : newKind}: Sede -${applied}` : '',
      eventFields: {
        bloodClotRemaining: boss?.crimsonClot?.status === 'active' ? Math.max(0, Number(boss.crimsonClot.remaining) || 0) : null,
      },
    };
  },

  afterIntentResolve({ allPlayersActed = false, resolveBloodRound = null } = {}) {
    if (!allPlayersActed || typeof resolveBloodRound !== 'function') return {};
    const bloodEvents = (resolveBloodRound() || []).filter(Boolean);
    return { bloodEvents, fallbackEvent: bloodEvents.at(-1) || null };
  },

  confirmTurnDefeat({ confirmDimitrescuDefeat = null, sourceActionId = null } = {}) {
    return typeof confirmDimitrescuDefeat === 'function'
      ? { defeatEvent: confirmDimitrescuDefeat(sourceActionId) }
      : {};
  },

});
