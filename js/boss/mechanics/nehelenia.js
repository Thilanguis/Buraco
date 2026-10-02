const MELD_TIER = Object.freeze({ simple: 0, suja: 0, limpa: 1, real: 2, asas: 3 });

function matchesMeldTarget(target, meldId, meldIndex) {
  if (!target) return false;
  return Boolean((target.meldId && meldId && target.meldId === meldId) || Number(target.meldIndex) === Number(meldIndex));
}

function appendUnique(target, values) {
  return [...new Set([...(target || []), ...values])];
}

export const neheleniaBossMechanics = Object.freeze({
  id: 'nehelenia',
  onMeldTransition({
    boss,
    gameState,
    teamId = null,
    playerId = null,
    meldId = null,
    meldIndex = null,
    cardsAdded = [],
    isNewMeld = false,
    recordBossEvent = null,
  } = {}) {
    if (!boss) return null;

    const addedIds = new Set(cardsAdded.map((card) => card?.id).filter(Boolean));
    const addedCount = addedIds.size;
    if (!addedCount) return {};

    const intent = boss.currentIntent;
    if (intent?.abilityId === 'mirrored_meld' && intent.payload?.targetPlayerId === playerId && matchesMeldTarget(intent.payload, meldId, meldIndex)) {
      intent.payload.fed = true;
      intent.payload.resolved = true;
      intent.payload.realChosen = false;
      intent.payload.fedCardIds = appendUnique(intent.payload.fedCardIds, addedIds);
    }

    if (intent?.abilityId === 'mirror_prison' && intent.payload?.rescuerPlayerId === playerId && matchesMeldTarget(intent.payload, meldId, meldIndex)) {
      intent.payload.fed = true;
      intent.payload.fedCardIds = appendUnique(intent.payload.fedCardIds, addedIds);
    }

    if (intent?.abilityId === 'follow_reflection') {
      intent.payload.cardsPlayedByPlayer ||= {};
      intent.payload.cardsPlayedByPlayer[playerId] = (Number(intent.payload.cardsPlayedByPlayer[playerId]) || 0) + addedCount;
      if (playerId === intent.payload.firstPlayerId) {
        intent.payload.firstPlayedCount = (Number(intent.payload.firstPlayedCount) || 0) + addedCount;
      } else if (playerId === intent.payload.secondPlayerId) {
        intent.payload.secondPlayedCount = (Number(intent.payload.secondPlayedCount) || 0) + addedCount;
      }
    }

    if (intent?.abilityId === 'tiger_link') {
      intent.payload.fedMeldIds ||= [];
      const target = (intent.payload.targets || []).find((entry) => matchesMeldTarget(entry, meldId, meldIndex));
      if (target?.meldId && !intent.payload.fedMeldIds.includes(target.meldId)) intent.payload.fedMeldIds.push(target.meldId);
    }

    if (intent?.abilityId === 'tiger_prey' && intent.payload?.targetPlayerId === playerId
      && matchesMeldTarget(intent.payload, meldId, meldIndex)) intent.payload.fed = true;

    if (!isNewMeld) {
      const persistentPrey = (boss.effects || []).find((effect) => effect.id === 'nehelenia_tiger_prey' && effect.playerId === playerId
        && matchesMeldTarget(effect, meldId, meldIndex));
      if (persistentPrey) {
        boss.effects = (boss.effects || []).filter((effect) => effect !== persistentPrey);
        boss.actionSequence += 1;
        recordBossEvent?.({
          type: 'neheleniaAttendantRelease',
          actionId: `tiger_prey_release_${playerId}_${boss.actionSequence}`,
          abilityId: 'tiger_prey',
          attendant: 'tiger',
          playerId,
          meldId,
          meldIndex,
          outcome: `${gameState?.players?.find((player) => player.id === playerId)?.name || 'O alvo'} alimentou a Presa Marcada e saiu da mira de Tiger's Eye.`,
        });
      }
    }

    if (intent?.abilityId === 'fish_marked_card' && intent.payload?.targetPlayerId === playerId
      && addedIds.has(intent.payload?.cardId)) intent.payload.used = true;

    if (intent?.abilityId === 'fish_inverted' && intent.payload?.targetPlayerId === playerId && !isNewMeld) {
      intent.payload.fedExisting = true;
    }

    if (!isNewMeld) {
      const releasedInverted = (boss.effects || []).filter((effect) => effect.id === 'nehelenia_inverted_reflection' && effect.playerId === playerId);
      if (releasedInverted.length) {
        boss.effects = (boss.effects || []).filter((effect) => !(effect.id === 'nehelenia_inverted_reflection' && effect.playerId === playerId));
        boss.actionSequence += 1;
        recordBossEvent?.({
          type: 'neheleniaAttendantRelease',
          actionId: `fish_inverted_release_${playerId}_${boss.actionSequence}`,
          abilityId: 'fish_inverted',
          attendant: 'fish',
          playerId,
          meldId,
          meldIndex,
          outcome: `${gameState?.players?.find((player) => player.id === playerId)?.name || 'O alvo'} alimentou um jogo existente e rompeu o Reflexo Invertido persistente.`,
        });
      }
    }

    let tigerClawEffect = null;
    if (!isNewMeld) {
      tigerClawEffect = (boss.effects || []).find((effect) => effect.id === 'nehelenia_tiger_claw'
        && (effect.teamId == null || effect.teamId === teamId)
        && matchesMeldTarget(effect, meldId, meldIndex)) || null;
      if (tigerClawEffect) boss.effects = (boss.effects || []).filter((effect) => effect !== tigerClawEffect);
    }

    return tigerClawEffect ? { cardDamageContext: { tigerClawEffect } } : {};
  },

  onCardDamage({ boss, playerId = null, card, damage = 0, cardDamageContext = null } = {}) {
    let nextDamage = Math.max(0, Number(damage) || 0);
    let tigerClawSuppressedDamage = 0;
    let newMoonSuppressedDamage = 0;
    let dreamBonusDamage = 0;

    if (cardDamageContext?.tigerClawEffect && nextDamage > 0) {
      tigerClawSuppressedDamage += nextDamage;
      nextDamage = 0;
    }

    if (boss?.currentIntent?.abilityId === 'new_moon' && !card?.joker && card?.suit === boss.currentIntent.payload?.suit) {
      const payload = boss.currentIntent.payload;
      payload.countedCardIds ||= [];
      if (!payload.countedCardIds.includes(card.id)) {
        payload.countedCardIds.push(card.id);
        payload.progress = Math.min(Number(payload.required) || 3, Math.max(0, Number(payload.progress) || 0) + 1);
      }
      if (payload.countedCardIds.indexOf(card.id) < (Number(payload.required) || 3)) {
        newMoonSuppressedDamage += nextDamage;
        nextDamage = 0;
      }
    }

    if (boss?.currentIntent?.abilityId === 'dream_mirror'
      && boss.currentIntent.payload?.targetPlayerId === playerId
      && boss.currentIntent.payload?.cardId === card?.id
      && nextDamage > 0) {
      dreamBonusDamage += nextDamage;
      boss.currentIntent.payload.bonusDamage = Math.max(Number(boss.currentIntent.payload.bonusDamage) || 0, nextDamage);
    }

    return { damage: nextDamage, tigerClawSuppressedDamage, newMoonSuppressedDamage, dreamBonusDamage };
  },

  afterMeldCardDamage({ boss, playerId = null, meldId = null, meldIndex = null, cardDamageContext = null, tigerClawSuppressedDamage = 0, recordBossEvent = null } = {}) {
    if (!cardDamageContext?.tigerClawEffect || !boss) return {};
    boss.actionSequence += 1;
    recordBossEvent?.({
      type: 'neheleniaAttendantRelease',
      actionId: `tiger_claw_release_${meldId || meldIndex}_${boss.actionSequence}`,
      abilityId: 'tiger_link',
      attendant: 'tiger',
      playerId,
      meldId,
      meldIndex,
      suppressedDamage: tigerClawSuppressedDamage,
      outcome: `As garras de Tiger's Eye se romperam no Jogo ${Number(meldIndex) + 1}, mas engoliram ${tigerClawSuppressedDamage} de dano das cartas usadas para quebrá-las.`,
    });
    return {};
  },

  onMeldContribution({ boss, gameState, contribution, oldKind = 'simple', newKind = 'simple', meldId = null, restoreDreamMirror = null } = {}) {
    if (!boss || !contribution) return {};
    const mirrorTier = MELD_TIER[newKind] || 0;
    const previousMirrorTier = Math.max(Number(contribution.neheleniaMirrorTier) || 0, MELD_TIER[oldKind] || 0);
    const tierIncrease = Math.max(0, mirrorTier - previousMirrorTier);
    contribution.neheleniaMirrorTier = Math.max(previousMirrorTier, mirrorTier);
    contribution.neheleniaMirrorRelief = Math.max(0, Number(contribution.neheleniaMirrorRelief) || 0);
    let mirrorFragmentRelief = 0;
    if (tierIncrease > 0 && mirrorTier >= 1 && boss.danger > 0 && typeof restoreDreamMirror === 'function') {
      const reliefEvent = restoreDreamMirror(
        gameState,
        null,
        `Canastra ${newKind === 'asas' ? 'Ás-a-Ás' : newKind}`,
        `dream_mirror_relief_${meldId}_${mirrorTier}`,
      );
      mirrorFragmentRelief = Math.abs(reliefEvent?.dangerDelta || 0);
      contribution.neheleniaMirrorRelief += mirrorFragmentRelief;
    }
    return { mirrorFragmentRelief };
  },

  afterMeldResolution({ mirrorFragmentRelief = 0, newKind = 'simple' } = {}) {
    const relief = Math.max(0, Number(mirrorFragmentRelief) || 0);
    return {
      dangerChangeLabel: relief ? `Canastra ${newKind === 'asas' ? 'Ás-a-Ás' : newKind}: Fragmento -${relief}` : '',
    };
  },


  onPlayerTurnEnd({ boss, playerId, player, recordBossEvent = null } = {}) {
    if (!boss) return {};
    if (boss.currentIntent?.abilityId === 'follow_reflection') {
      const payload = boss.currentIntent.payload || {};
      if (payload.firstPlayerId === playerId && !payload.patternLocked) {
        payload.patternCount = Math.max(0, Number(payload.firstPlayedCount) || 0);
        payload.patternLocked = true;
        boss.actionSequence += 1;
        recordBossEvent?.({
          type: 'reflectionPattern',
          actionId: `follow_reflection_pattern_${boss.currentIntent.id}_${boss.actionSequence}`,
          playerId,
          patternCount: payload.patternCount,
          outcome: `${player?.name || 'O primeiro jogador'} definiu o padrão: ${payload.patternCount} carta${payload.patternCount === 1 ? '' : 's'}.`,
        });
      }
    }
    return {};
  },

  afterIntentResolve({ boss, gameState, playerId, allPlayersActed = false } = {}) {
    if (!boss) return {};
    const turnNumber = Number(gameState?.turnNumber) || 0;
    boss.effects = (boss.effects || []).filter((effect) => {
      if (effect.expiresAfterTurn && effect.playerId === playerId) {
        const appliedTurn = Number(effect.appliedTurnNumber);
        if (!Number.isFinite(appliedTurn) || appliedTurn < turnNumber) return false;
      }
      if (allPlayersActed && Number.isFinite(Number(effect.expiresAfterRound)) && Number(effect.expiresAfterRound) <= boss.roundNumber) return false;
      return true;
    });
    return {};
  },

  afterRoundAdvance({ boss } = {}) {
    if (boss) boss.neheleniaDiscardSealRound = 0;
    return {};
  },

  confirmTurnDefeat({ confirmNeheleniaDefeat = null, sourceActionId = null } = {}) {
    return typeof confirmNeheleniaDefeat === 'function'
      ? { mirrorWorldEvent: confirmNeheleniaDefeat(sourceActionId) }
      : {};
  },

});
