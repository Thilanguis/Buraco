const MELD_TIER = Object.freeze({ simple: 0, suja: 0, limpa: 1, real: 2, asas: 3 });

function activeNatureThreats(boss) {
  return (boss?.natureThreats || []).filter((threat) => threat?.status === 'active');
}

export const matriarchBossMechanics = Object.freeze({
  id: 'matriarca_esmeralda',

  onMeldTransition({
    boss,
    gameState,
    playerId = null,
    meldId = null,
    meldIndex = null,
    newKind = 'simple',
    cardsAdded = [],
    canastraDamage = 0,
    succeedNatureThreat = null,
  } = {}) {
    if (!boss) return null;

    const addedIds = new Set(cardsAdded.map((card) => card?.id).filter(Boolean));
    if (addedIds.size && typeof succeedNatureThreat === 'function') {
      for (const threat of [...activeNatureThreats(boss)]) {
        if (['seed', 'royal_seed', 'pollen', 'royal_pollen'].includes(threat.type) && addedIds.has(threat.cardId)) {
          succeedNatureThreat(threat, 'A carta marcada foi usada legalmente.');
        } else if (['root', 'twin_root', 'royal_root'].includes(threat.type) && threat.meldId === meldId) {
          threat.progressCardIds ||= [];
          addedIds.forEach((cardId) => {
            if (!threat.progressCardIds.includes(cardId)) threat.progressCardIds.push(cardId);
          });
          if (threat.strengthened) {
            threat.contributorPlayerIds ||= [];
            if (playerId != null && !threat.contributorPlayerIds.includes(playerId)) threat.contributorPlayerIds.push(playerId);
            const required = Math.max(1, Number(threat.requiredContributorCount) || Math.min(2, (gameState?.players || []).length));
            if (threat.contributorPlayerIds.length >= required) {
              succeedNatureThreat(threat, `Cada cooperador alimentou a Raiz Fortalecida do jogo ${Number(meldIndex) + 1}.`);
            }
          } else {
            succeedNatureThreat(threat, `O jogo ${Number(meldIndex) + 1} alimentou a raiz.`);
          }
        } else if (threat.type === 'graft' && threat.meldIds?.includes(meldId)) {
          threat.fedMeldIds ||= [];
          if (!threat.fedMeldIds.includes(meldId)) threat.fedMeldIds.push(meldId);
          if (new Set(threat.fedMeldIds).size >= 2) succeedNatureThreat(threat, 'Os dois lados do Enxerto foram alimentados.');
        } else if (threat.type === 'dew') {
          threat.countedCardIds ||= [];
          addedIds.forEach((cardId) => {
            if (!threat.countedCardIds.includes(cardId)) threat.countedCardIds.push(cardId);
          });
          if (boss.currentIntent?.abilityId === 'restorative_dew' && threat.sourceIntentId === boss.currentIntent.id) {
            boss.currentIntent.payload ||= {};
            boss.currentIntent.payload.countedCardIds = [...threat.countedCardIds];
          }
        }
      }
    }

    const breaksCocoon = Math.max(0, Number(canastraDamage) || 0) > 0 && (MELD_TIER[newKind] || 0) >= 1;
    return { breaksCocoon };
  },

  onMeldContribution({
    boss,
    contribution,
    newKind = 'simple',
    meldId = null,
    changeBloom = null,
  } = {}) {
    if (!boss || !contribution) return {};

    const bloomTier = MELD_TIER[newKind] || 0;
    const previousTier = Number(contribution.matriarchBloomTier) || 0;
    const tierIncrease = Math.max(0, bloomTier - previousTier);
    contribution.matriarchBloomTier = Math.max(previousTier, bloomTier);

    let bloomRemoved = 0;
    if (tierIncrease > 0 && boss.bloom > 0 && typeof changeBloom === 'function') {
      const bloomEvent = changeBloom(
        -Math.min(tierIncrease, boss.bloom),
        `Canastra ${newKind === 'asas' ? 'As-a-As' : newKind}`,
        `meld_bloom_${meldId}_${bloomTier}`,
      );
      bloomRemoved = Math.abs(bloomEvent?.amount || 0);
      contribution.matriarchBloomRemoved += bloomRemoved;
    }

    return { bloomRemoved };
  },

  afterMeldResolution({ bloomRemoved = 0, newKind = 'simple' } = {}) {
    const removed = Math.max(0, Number(bloomRemoved) || 0);
    return {
      dangerChangeLabel: removed ? `Canastra ${newKind === 'asas' ? 'As-a-As' : newKind}: Florescimento -${removed}` : '',
    };
  },

});
