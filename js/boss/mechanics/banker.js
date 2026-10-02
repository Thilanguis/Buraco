function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function quoteBankerCreditLimit(boss, cards = [], { creditEligibleCardIds = null, cardOriginsById = null } = {}) {
  const limit = boss?.id === 'banker' ? boss.creditLimit : null;
  if (!limit || limit.status !== 'active' || limit.round !== boss.roundNumber) return null;
  const counted = new Set(limit.countedCardIds || []);
  const eligible = Array.isArray(creditEligibleCardIds) ? new Set(creditEligibleCardIds.filter(Boolean)) : null;
  const newCardIds = [...new Set((cards || []).map((card) => card?.id).filter((cardId) => {
    if (!cardId || counted.has(cardId)) return false;
    if (eligible && !eligible.has(cardId)) return false;
    if (cardOriginsById && cardOriginsById[cardId] !== 'hand') return false;
    return true;
  }))];
  const countBefore = counted.size;
  const countAfter = countBefore + newCardIds.length;
  const allowance = Math.max(0, Number(limit.allowance) || 0);
  const debtPerCard = Math.max(0, Number(limit.debtPerCard) || 1);
  const maxCharge = Math.max(0, Number(limit.maxCharge) || 0);
  const chargedDebt = Math.max(0, Number(limit.chargedDebt) || 0);
  const excessBefore = Math.max(0, countBefore - allowance);
  const excessAfter = Math.max(0, countAfter - allowance);
  const rawDebt = Math.max(0, excessAfter - excessBefore) * debtPerCard;
  const debt = Math.max(0, Math.min(rawDebt, maxCharge - chargedDebt));
  return {
    round: boss.roundNumber,
    allowance,
    countBefore,
    countAfter,
    newCardIds,
    excessCards: Math.max(0, excessAfter - excessBefore),
    debt,
    debtPerCard,
    chargedDebt,
    maxCharge,
  };
}

export const bankerBossMechanics = Object.freeze({
  id: 'banker',

  onMeldTransition({
    boss,
    cardsAdded = [],
    previousDangerReliefValue = 0,
    nextDangerReliefValue = 0,
    creditEligibleCardIds = null,
    cardOriginsById = null,
  } = {}) {
    if (!boss) return null;

    const debtReduction = Math.max(0, Number(nextDangerReliefValue) - Number(previousDangerReliefValue));
    let creditLimitDebt = 0;
    let creditLimitEventId = null;

    const intent = boss.currentIntent;
    if (intent?.abilityId === 'suit_audit') {
      const suit = intent.payload?.suit;
      const countedCardIds = (intent.payload.countedCardIds ||= []);
      const matchingCards = cardsAdded.filter((card) => card && card.id && !countedCardIds.includes(card.id) && !card.joker && card.suit === suit);
      matchingCards.forEach((card) => countedCardIds.push(card.id));
      intent.payload.progress = clamp((intent.payload.progress || 0) + matchingCards.length, 0, intent.payload.required);
    }

    if (boss.creditLimit?.status === 'active' && boss.creditLimit.round === boss.roundNumber) {
      const limit = boss.creditLimit;
      limit.countedCardIds ||= [];
      limit.eventIds ||= [];
      const quote = quoteBankerCreditLimit(boss, cardsAdded, { creditEligibleCardIds, cardOriginsById });
      quote?.newCardIds.forEach((cardId) => limit.countedCardIds.push(cardId));
      creditLimitDebt = quote?.debt || 0;
      limit.chargedDebt = Math.min(limit.maxCharge, (limit.chargedDebt || 0) + creditLimitDebt);
      if (quote?.newCardIds.length) {
        const eventId = `credit_limit_${limit.round}_${quote.newCardIds.slice().sort().join('_')}`;
        if (!limit.eventIds.includes(eventId)) limit.eventIds.push(eventId);
        creditLimitEventId = eventId;
      }
    }

    return { debtReduction, creditLimitDebt, creditLimitEventId };
  },

  afterMeldResolution({ contribution, appliedDebtReduction = 0, creditLimitDebt = 0, newKind = 'simple' } = {}) {
    const applied = Math.max(0, Number(appliedDebtReduction) || 0);
    const creditDebt = Math.max(0, Number(creditLimitDebt) || 0);
    if (contribution) contribution.bankerDebtRelief += applied;
    return {
      dangerChangeLabel: creditDebt
        ? `Limite de Credito: Divida +${creditDebt}`
        : applied
          ? `Canastra ${newKind === 'asas' ? 'Ás-a-Ás' : newKind}: Dívida -${applied}`
          : '',
    };
  },

  afterMeldEvent({ creditLimitDebt = 0, creditLimitEventId = null, event = null, confirmDangerDefeat = null } = {}) {
    if (!(Number(creditLimitDebt) > 0) || typeof confirmDangerDefeat !== 'function') return {};
    return { defeatEvent: confirmDangerDefeat(creditLimitEventId || event?.actionId) };
  },

  onPlayerTurnEnd({ boss, gameState, playerId, player, recordBossEvent = null, deferVault = null } = {}) {
    if (!boss) return {};
    const financedCards = (boss.effects || []).filter((effect) => effect.id === 'financed_card' && effect.playerId === playerId);
    if (financedCards.length) {
      const heldCardIds = new Set((player?.hand || []).map((card) => card?.id).filter(Boolean));
      const discardedCardIds = new Set((gameState?.discard || []).map((card) => card?.id).filter(Boolean));
      const meldCardIds = new Set((gameState?.teams?.[player?.teamId]?.melds || []).flatMap((meld) => (meld || []).map((card) => card?.id).filter(Boolean)));
      const usedInMeldCards = financedCards.filter((effect) => meldCardIds.has(effect.cardId));
      const chargedCards = financedCards.filter((effect) => !meldCardIds.has(effect.cardId));
      const dangerDelta = chargedCards.reduce((total, effect) => total + (Number(effect.debtPerCard) || 0), 0);
      boss.effects = (boss.effects || []).filter((effect) => !(effect.id === 'financed_card' && effect.playerId === playerId));
      boss.danger = clamp(boss.danger + dangerDelta, 0, boss.maxDanger);
      boss.actionSequence += 1;
      recordBossEvent?.({
        type: 'financedCharge',
        actionId: `financed_charge_${playerId}_${boss.actionSequence}`,
        playerId,
        sourceActionId: financedCards[0]?.sourceActionId || null,
        financedCardIds: financedCards.map((effect) => effect.cardId),
        usedInMeldCardIds: usedInMeldCards.map((effect) => effect.cardId),
        heldCardIds: chargedCards.filter((effect) => heldCardIds.has(effect.cardId)).map((effect) => effect.cardId),
        discardedCardIds: chargedCards.filter((effect) => discardedCardIds.has(effect.cardId)).map((effect) => effect.cardId),
        chargedCardIds: chargedCards.map((effect) => effect.cardId),
        dangerDelta,
        danger: boss.danger,
        dangerChangeLabel: dangerDelta ? `Tarifa de Manutenção: Dívida +${dangerDelta}` : '',
        outcome: dangerDelta
          ? `${chargedCards.length} Carta${chargedCards.length === 1 ? '' : 's'} Financiada${chargedCards.length === 1 ? '' : 's'} não entraram em jogo.`
          : 'Todas as Cartas Financiadas foram usadas em jogo; nenhuma Dívida foi aplicada.',
      });
    }
    deferVault?.();
    return {};
  },

  beforeRoundResolve({ boss } = {}) {
    if (!boss) return {};
    if (boss.creditLimit?.status === 'active' && boss.creditLimit.round === boss.roundNumber) boss.creditLimit.status = 'expired';
    if (boss.discardSurcharge?.status === 'active' && boss.discardSurcharge.createdRound === boss.roundNumber) boss.discardSurcharge.status = 'expired';
    return {};
  },

  confirmTurnDefeat({ confirmBankerDefeat = null, sourceActionId = null } = {}) {
    return typeof confirmBankerDefeat === 'function'
      ? { defeatEvent: confirmBankerDefeat(sourceActionId) }
      : {};
  },
});
