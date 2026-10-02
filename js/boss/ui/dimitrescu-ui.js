function matchesMeld(target, meldId, meldIndex) {
  if (!target) return false;
  if (target.meldId && meldId) return target.meldId === meldId;
  return Number(target.meldIndex) === Number(meldIndex);
}

export const dimitrescuBossUi = Object.freeze({
  id: 'dimitrescu',
  meldContribution(contribution) {
    const value = Number(contribution?.dimitrescuBloodRelief) || 0;
    return value > 0 ? { type: 'blood', value, icon: '&#129656;', title: 'Sede de Sangue reduzida por este jogo' } : null;
  },
  meld({ boss, meldId, meldIndex } = {}) {
    const intent = boss?.currentIntent;
    const cassandraObjective = intent?.abilityId === 'three_daughters' ? intent.payload?.objectives?.find((objective) => objective.type === 'cassandra') : null;
    const cassandraMarked =
      intent?.abilityId === 'cassandra_feast'
        ? !intent.payload?.fed && matchesMeld(intent.payload, meldId, meldIndex)
        : cassandraObjective?.status === 'active' && matchesMeld(cassandraObjective, meldId, meldIndex);

    return {
      divClasses: cassandraMarked ? ['feasted-by-cassandra'] : [],
      cardDecoration: cassandraMarked ? { classes: ['boss-card-cassandra-feast'], bloodProfile: 'feast' } : null,
    };
  },
});
