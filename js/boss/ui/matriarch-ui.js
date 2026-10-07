export const matriarchBossUi = Object.freeze({
  id: 'matriarca_esmeralda',
  pollenDiscard({ gameState }) {
    const pile = gameState.discard || [], topId = pile.at(-1)?.id;
    const ids = new Set(pile.map(card => card.id));
    const threats = (gameState.boss?.natureThreats || []).filter(threat => threat.status === 'active'
      && ['pollen', 'royal_pollen'].includes(threat.type) && threat.targetPlayerId == null && ids.has(threat.discardCardId));
    return { pollenOnTop: threats.some(threat => threat.discardCardId === topId),
      pollenBuried: threats.some(threat => threat.discardCardId !== topId) };
  },
  meldContribution(contribution) {
    const value = Number(contribution?.matriarchBloomRemoved) || 0;
    return value > 0 ? { type: 'bloom', value, icon: '&#127800;', title: 'Florescimentos removidos por este jogo' } : null;
  },
  meld({ natureThreats = [] } = {}) {
    const rootThreat = natureThreats.find((threat) => ['root', 'twin_root', 'royal_root'].includes(threat?.type));
    const graftThreat = natureThreats.find((threat) => threat?.type === 'graft');
    const labels = [];
    const divDataset = {};

    if (rootThreat) labels.push(`<span class="boss-meld-nature-seal">RAIZ ${rootThreat.progress || 0}/${rootThreat.required || 1}</span>`);
    if (graftThreat) {
      const fed = new Set(graftThreat.fedMeldIds || []);
      const sideIndex = (graftThreat.meldIds || []).indexOf(graftThreat.matchedMeldId);
      const sideLabel = sideIndex === 1 ? 'B' : 'A';
      labels.push(`<span class="boss-meld-nature-seal boss-meld-nature-graft">ENXERTO ${sideLabel} · ${fed.size}/${graftThreat.required || 2}</span>`);
      divDataset.graftId = graftThreat.id;
      divDataset.graftSide = sideLabel;
    }

    return {
      divClasses: [rootThreat ? 'rooted-by-matriarch' : '', graftThreat ? 'grafted-by-matriarch' : ''].filter(Boolean),
      divDataset,
      labels,
    };
  },
});
