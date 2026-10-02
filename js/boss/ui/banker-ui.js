export const bankerBossUi = Object.freeze({
  id: 'banker',
  meldContribution(contribution) {
    const value = Number(contribution?.bankerDebtRelief) || 0;
    return value > 0 ? { type: 'debt', value, icon: '&#129689;', title: 'Divida reduzida por este jogo' } : null;
  },
});
