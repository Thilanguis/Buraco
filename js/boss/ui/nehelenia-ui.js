function matchesMeld(target, meldId, meldIndex) {
  return !!target && ((target.meldId && meldId && target.meldId === meldId) || Number(target.meldIndex) === Number(meldIndex));
}

export const neheleniaBossUi = Object.freeze({
  id: 'nehelenia',
  meldContribution(contribution) {
    const value = Number(contribution?.neheleniaMirrorRelief) || 0;
    return value > 0 ? { type: 'mirror', value: Math.round(value * 20 * 10) / 10, icon: '&#9671;', title: 'Mundo do Espelho reduzido por este jogo' } : null;
  },
  meld({ boss, players = [], meldId, contributionMeldId = null, meldIndex } = {}) {
    const intent = boss?.currentIntent;
    let mirrorLabel = '';
    let mirrorChoice = false;

    if (intent?.abilityId === 'mirrored_meld' && matchesMeld(intent.payload, meldId, meldIndex)) {
      mirrorLabel = intent.payload?.fed ? 'JOGO ESPELHADO · QUEBRADO' : 'JOGO ESPELHADO';
      mirrorChoice = !intent.payload?.resolved;
    } else if (intent?.abilityId === 'mirror_prison' && matchesMeld(intent.payload, meldId, meldIndex)) {
      const trappedName = players.find((player) => player.id === intent.payload?.trappedPlayerId)?.name || 'PARCEIRO';
      mirrorLabel = `PRISÃO · LIBERTE ${trappedName}`;
    }

    const labels = [];
    const rowClasses = [];
    const rowDataset = {};
    let tigerVisual = false;
    let tigerDone = false;
    let tigerClaw = false;
    let hawkVisual = false;

    if (intent?.abilityId === 'tiger_link') {
      const linkedIndex = (intent.payload?.targets || []).findIndex((target) => matchesMeld(target, contributionMeldId, meldIndex));
      if (linkedIndex >= 0) {
        const target = intent.payload.targets[linkedIndex];
        const fed = new Set(intent.payload?.fedMeldIds || []).has(target.meldId);
        tigerVisual = true;
        tigerDone = fed;
        labels.push(`<span class="boss-meld-nehelenia-attendant boss-meld-nehelenia-tiger${fed ? ' is-done' : ''}">LAÇO ${linkedIndex + 1}</span>`);
      }
    } else if (intent?.abilityId === 'tiger_prey' && matchesMeld(intent.payload, contributionMeldId, meldIndex)) {
      tigerVisual = true;
      tigerDone = !!intent.payload?.fed;
      labels.push(`<span class="boss-meld-nehelenia-attendant boss-meld-nehelenia-tiger${intent.payload?.fed ? ' is-done' : ''}">PRESA MARCADA</span>`);
    } else if (intent?.abilityId === 'hawk_watch' && matchesMeld(intent.payload, contributionMeldId, meldIndex)) {
      hawkVisual = true;
      labels.push('<span class="boss-meld-nehelenia-attendant boss-meld-nehelenia-hawk">VIGILÂNCIA</span>');
    }

    const persistentTiger = (boss?.effects || []).filter((effect) => effect?.attendant === 'tiger' && matchesMeld(effect, contributionMeldId, meldIndex));
    if (persistentTiger.some((effect) => effect.id === 'nehelenia_tiger_prey')) {
      tigerVisual = true;
      labels.push('<span class="boss-meld-nehelenia-attendant boss-meld-nehelenia-tiger">PRESA PERSISTENTE</span>');
    }
    if (persistentTiger.some((effect) => effect.id === 'nehelenia_tiger_claw')) {
      tigerVisual = true;
      tigerClaw = true;
      labels.push('<span class="boss-meld-nehelenia-attendant boss-meld-nehelenia-tiger">GARRAS · DANO SELADO</span>');
    }

    if (mirrorLabel) {
      rowClasses.push('nehelenia-mirror-card-frame');
      rowDataset.neheleniaMirror = mirrorLabel;
      if (mirrorLabel.startsWith('PRISÃO')) rowClasses.push('is-prison');
    }
    if (tigerVisual) rowClasses.push('boss-meld-nehelenia-tiger-mark');
    if (tigerDone) rowClasses.push('is-attendant-done');
    if (tigerClaw) rowClasses.push('is-tiger-claw');
    if (hawkVisual) rowClasses.push('boss-meld-nehelenia-hawk-mark');

    return {
      divClasses: mirrorLabel ? ['mirrored-by-nehelenia'] : [],
      divDataset: mirrorLabel ? { neheleniaMirror: mirrorLabel } : {},
      rowClasses,
      rowDataset,
      labels,
      mirror: mirrorLabel ? { label: mirrorLabel, choice: mirrorChoice, intent } : null,
    };
  },
});
