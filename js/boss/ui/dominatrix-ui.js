function matchesMeld(target, meldId, meldIndex) {
  if (!target) return false;
  if (target.meldId && meldId && target.meldId === meldId) return true;
  return Number(target.meldIndex) === Number(meldIndex);
}

export const dominatrixBossUi = Object.freeze({
  id: 'dominadora',
  meldContribution(contribution) {
    const value = Number(contribution?.dominatrixChainsBroken) || 0;
    return value > 0 ? { type: 'chains', value, icon: '&#9939;&#65039;', title: 'Chicotes removidos por este jogo' } : null;
  },
  meld({ boss, players = [], teamId, meldIndex, meldId, meldInfo } = {}) {
    const activeInterdict = (boss?.interdicts || []).find(
      (entry) => entry?.status === 'active' && Number(entry.teamId ?? 0) === Number(teamId) && matchesMeld(entry, meldId, meldIndex),
    );

    const activeOrder = (boss?.activeOrders || []).find((order) => {
      if (order?.status !== 'active' || !['feed_specific_meld', 'evolve_specific_meld'].includes(order.type)) return false;
      const targetPlayer = players.find((player) => player.id === order.targetPlayerId);
      if (targetPlayer && Number(targetPlayer.teamId) !== Number(teamId)) return false;
      return matchesMeld(order, meldId, meldIndex);
    });

    const labels = [];
    if (activeInterdict) {
      const evolutionLabel = meldInfo?.kind === 'real' ? 'REAL → ÁS-A-ÁS' : 'LIMPA → REAL';
      labels.push(`<span class="boss-meld-interdict-seal">INTERDITO · ${evolutionLabel}</span>`);
    }

    return {
      divClasses: activeInterdict ? ['interdicted-by-boss'] : [],
      rowClasses: activeOrder ? ['boss-meld-dominatrix-order-mark'] : [],
      rowDataset: activeOrder ? { dominatrixOrder: activeOrder.type } : {},
      labels,
    };
  },
});
