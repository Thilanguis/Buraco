const MELD_TIER = Object.freeze({ simple: 0, suja: 0, limpa: 1, real: 2, asas: 3 });

function matchesPossession(entry, teamId, meldId, meldIndex) {
  return entry?.teamId === teamId && (entry.meldId ? entry.meldId === meldId : entry.meldIndex === meldIndex);
}

function resolveMeldOrders({ boss, playerId, meldId, isNewMeld, oldKind, newKind, cardsAdded = [], finishOrder }) {
  if (playerId == null || typeof finishOrder !== 'function') return [];
  const events = [];

  for (const order of (boss?.activeOrders || []).filter((entry) => entry.status === 'active' && entry.targetPlayerId === playerId)) {
    if (order.type === 'discard_suit' && cardsAdded.some((card) => order.eligibleCardIds?.includes(card?.id))) {
      order.ownOptionsConsumed = true;
    }

    if (order.type === 'no_new_meld' && isNewMeld) {
      events.push(finishOrder(order, 'disobeyed', 'A ordem proibia criar um jogo novo.', { addChain: true }));
    } else if (order.type === 'feed_specific_meld') {
      const obeyed = order.meldId === meldId;
      events.push(finishOrder(
        order,
        obeyed ? 'obeyed' : 'disobeyed',
        obeyed ? 'O jogo ordenado foi alimentado primeiro.' : 'Outro jogo foi alimentado antes do jogo ordenado.',
        { addChain: !obeyed },
      ));
    } else if (order.type === 'evolve_specific_meld' && order.meldId === meldId && MELD_TIER[newKind] > MELD_TIER[oldKind]) {
      events.push(finishOrder(order, 'obeyed', 'O jogo ordenado evoluiu de tier.'));
    }
  }

  return events.filter(Boolean);
}

export const dominatrixBossMechanics = Object.freeze({
  id: 'dominadora',
  onMeldTransition({
    boss,
    gameState,
    teamId,
    playerId = null,
    meldId = null,
    meldIndex = null,
    oldKind = 'simple',
    newKind = 'simple',
    cardsAdded = [],
    isNewMeld = false,
    canastraDamage = 0,
    finishOrder = null,
  } = {}) {
    if (!boss) return null;

    let nextCanastraDamage = canastraDamage;
    let possessionProgressed = false;
    let possessionReleased = false;
    let possessionProgress = null;
    let possessionSuppressesDamage = false;
    let possessionReappliedDamage = 0;
    let possessionQualifiedByTier = false;

    const intent = boss.currentIntent;
    const possession = (boss.possessions || []).find((entry) => matchesPossession(entry, teamId, meldId, meldIndex));
    if (possession) {
      possession.progressCardIds ||= [];
      possession.contributorPlayerIds ||= [];
      const newProgressCards = cardsAdded.filter((card) => card?.id && !possession.progressCardIds.includes(card.id));
      newProgressCards.forEach((card) => possession.progressCardIds.push(card.id));
      possessionProgressed = newProgressCards.length > 0;
      if (possessionProgressed && playerId != null && !possession.contributorPlayerIds.includes(playerId)) possession.contributorPlayerIds.push(playerId);
      possession.progress = possession.contributorPlayerIds.length;
      possession.required = Math.max(1, (gameState?.players || []).length);
      possessionProgress = possession.progress;
      possessionQualifiedByTier = MELD_TIER[newKind] > Math.max(Number(possession.createdTier) || 0, MELD_TIER[oldKind] || 0);
      if (possession.contributorPlayerIds.length >= possession.required || possessionQualifiedByTier) {
        possessionReleased = true;
        possessionReappliedDamage = Math.max(0, Number(possession.suppressedDamage) || 0);
        possession.releasedEventId = `possession_release_${possession.id}_${boss.roundNumber}`;
        boss.possessions = boss.possessions.filter((entry) => entry.id !== possession.id);
      } else {
        possessionSuppressesDamage = true;
      }
      if (possessionSuppressesDamage) nextCanastraDamage = 0;
    }

    if (intent?.abilityId === 'hands_tied' && playerId != null) {
      intent.payload.playerMeldIds ||= {};
      if (intent.payload.playerMeldIds[playerId] == null && meldId) intent.payload.playerMeldIds[playerId] = meldId;
      if (isNewMeld) {
        intent.payload.teamMeldAvailable = false;
        intent.payload.consumedByPlayerId = playerId;
        intent.payload.consumedMeldId = meldId;
      }
    }

    if (intent?.abilityId === 'separation' && playerId != null) {
      intent.payload.meldOwners ||= {};
      if (intent.payload.meldOwners[meldIndex] == null) intent.payload.meldOwners[meldIndex] = playerId;
    }

    const orderEvents = resolveMeldOrders({ boss, playerId, meldId, isNewMeld, oldKind, newKind, cardsAdded, finishOrder });

    return {
      canastraDamage: nextCanastraDamage,
      possessionProgressed,
      possessionReleased,
      possessionProgress,
      possessionSuppressesDamage,
      possessionReappliedDamage,
      possessionQualifiedByTier,
      orderEvents,
    };
  },

  afterMeldResolution({
    boss,
    gameState,
    playerId = null,
    meldId = null,
    newKind = 'simple',
    contribution = null,
    possessionSuppressesDamage = false,
    possessionReleased = false,
    suppressDominatrixResistance = false,
    changeChains = null,
    recordBossEvent = null,
  } = {}) {
    if (!boss) return null;
    let chainsRemoved = 0;
    let resistanceSuppressedByInterdict = false;

    if (playerId != null && (!possessionSuppressesDamage || possessionReleased)) {
      const tier = MELD_TIER[newKind] || 0;
      const previousResistanceTier = Number(contribution?.dominatrixResistanceTier) || 0;
      if (contribution) contribution.dominatrixResistanceTier = Math.max(previousResistanceTier, tier);
      if (tier > previousResistanceTier && tier > 0) {
        if (suppressDominatrixResistance) {
          resistanceSuppressedByInterdict = true;
          boss.actionSequence += 1;
          recordBossEvent?.({
            type: 'resistanceSuppressed',
            actionId: `resistance_interdict_${meldId}_${tier}_${boss.roundNumber}`,
            playerId,
            meldId,
            tier,
            outcome: 'A desobediencia ao Interdito anulou a remocao de Chicote desta evolucao.',
          });
        } else if (typeof changeChains === 'function') {
          chainsRemoved = Math.abs(Math.min(0, changeChains(playerId, -0.32 * (tier - previousResistanceTier), 'resistance')));
        }
      }
    }

    if (contribution) contribution.dominatrixChainsBroken += chainsRemoved;
    return { chainsRemoved, resistanceSuppressedByInterdict };
  },


  onPlayerTurnEnd({ boss, gameState, playerId, player, changeChains = null, finishOrder = null, recordBossEvent = null } = {}) {
    if (!boss) return {};
    const expiringExposures = (boss.effects || []).filter((effect) => effect.id === 'choice_exposure' && effect.playerId === playerId && effect.expiresAfterTurn);
    const exposedCardsHeld = expiringExposures.filter((effect) => player?.hand?.some((card) => card?.id === effect.cardId));
    const finalOrderMarks = (boss.effects || []).filter((effect) => effect.id === 'final_order_mark' && effect.playerId === playerId && effect.expiresAfterTurn);
    const teamMeldCardIds = new Set((gameState?.teams?.[player?.teamId]?.melds || []).flatMap((meld) => (meld || []).map((card) => card?.id).filter(Boolean)));
    const finalOrderUsed = finalOrderMarks.filter((effect) => teamMeldCardIds.has(effect.cardId));
    const finalOrderMissed = finalOrderMarks.filter((effect) => !teamMeldCardIds.has(effect.cardId));
    if (boss.choiceDrawnCardIdsByPlayer) delete boss.choiceDrawnCardIdsByPlayer[playerId];
    boss.effects = (boss.effects || []).filter((effect) => !(effect.expiresAfterTurn && effect.playerId === playerId));
    exposedCardsHeld.forEach((effect) => changeChains?.(playerId, 0.64, `forced_choice_exposure:${effect.cardId}`));
    finalOrderMissed.forEach((effect) => changeChains?.(playerId, 0.48, `final_order:${effect.cardId}`));
    if (finalOrderMarks.length) {
      boss.actionSequence += 1;
      recordBossEvent?.({
        type: 'finalOrderResolved',
        actionId: `final_order_${playerId}_${boss.actionSequence}`,
        playerId,
        usedCardIds: finalOrderUsed.map((effect) => effect.cardId),
        missedCardIds: finalOrderMissed.map((effect) => effect.cardId),
        chainsApplied: finalOrderMissed.length * 0.48,
        dominationApplied: finalOrderMissed.length * 6,
        outcome: finalOrderMissed.length
          ? `${finalOrderUsed.length}/2 cartas da Ordem Final entraram em jogo; Dominação +${finalOrderMissed.length * 6}.`
          : 'As 2 cartas da Ordem Final entraram em jogo; a Dominação não avançou.',
      });
    }

    for (const order of (boss.activeOrders || []).filter((entry) => entry.status === 'active' && entry.targetPlayerId === playerId)) {
      if (order.type === 'no_new_meld') {
        finishOrder?.(order, 'obeyed', 'O jogador encerrou o turno sem criar um jogo novo.');
      } else if (order.type === 'reduce_hand') {
        const obeyed = (player?.hand?.length || 0) <= Number(order.handLimit);
        finishOrder?.(
          order,
          obeyed ? 'obeyed' : 'disobeyed',
          obeyed ? `A mao terminou dentro do limite de ${order.handLimit}.` : `A mao terminou acima do limite de ${order.handLimit}.`,
          { addChain: !obeyed },
        );
      } else {
        finishOrder?.(
          order,
          'disobeyed',
          'O turno terminou sem cumprir a ordem aceita.',
          { addChain: true },
        );
      }
    }
    return {};
  },

  beforeRoundResolve({ boss, recordBossEvent = null } = {}) {
    if (!boss) return {};
    (boss.interdicts || []).filter((entry) => entry.status === 'active').forEach((interdict) => {
      interdict.status = 'expired';
      boss.actionSequence += 1;
      const expired = recordBossEvent?.({
        type: 'interdictExpired',
        actionId: `interdict_expired_${interdict.id}_${boss.actionSequence}`,
        interdictId: interdict.id,
        outcome: 'O Interdito expirou sem uma tentativa de evolucao.',
      });
      interdict.resolvedEventId = expired?.actionId || null;
    });
    return {};
  },

});
