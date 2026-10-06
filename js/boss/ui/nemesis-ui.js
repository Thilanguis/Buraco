const passiveText = (boss, entity) => {
  if (entity.status === 'corpse') return 'CADÁVER · pode ser reanimado';
  if (entity.status === 'entering') return 'ENTRANDO · impeça a invasão';
  if (entity.status === 'repelled') return 'REPELIDO · ameaça expulsa';
  const buff = boss.hordeBuff?.entityId === entity.id && boss.roundNumber <= boss.hordeBuff.expiresRound;
  if (entity.id === 'grabber') return `Lixo: prende ${(entity.mutated ? 2 : 1) + Number(buff)} carta(s)`;
  if (entity.id === 'infected') return `Falha: +${(entity.mutated ? 4 : 2) + (buff ? 2 : 0)} Infecção`;
  return `3+ cartas no mesmo jogo: cura ${(entity.mutated ? 70 : 40) + (buff ? 30 : 0)} HP, 1x/turno`;
};
const passiveHelp = (entity, reinforced) => {
  const rule = entity.id === 'grabber' ? 'Lixo: prende 1 carta para jogo neste turno (Mutado: 2). Descartar é permitido.\nHorda: +1 (2 normal / 3 Mutado). Topo obrigatório do Fechado fica livre.'
    : entity.id === 'infected' ? 'Falha com Infecção: +2 (Mutado: +4), uma vez por evento.\nHorda: +2 extra (total +4 normal / +6 Mutado). Falhar na invasão não gera Infecção.'
      : 'Primeira contribuição de 3+ cartas ao mesmo jogo por turno: cura Nemesis 40 HP (Mutado: 70).\nHorda: +30 (70 normal / 100 Mutado). Teto: 2600 HP.';
  return `${rule} Passiva só com o zumbi ATIVO.${reinforced ? ' Reforço temporário ativo.' : ''}`;
};
export const nemesisBossUi = Object.freeze({
  id: 'nemesis',
  finalStrikeWarning({ gameState, playerId }) {
    const boss = gameState.boss;
    const selected = boss.combatTargetsByPlayer[playerId];
    const entity = boss.combatEntities.find((entry) => entry.id === selected && entry.status === 'persistent' && entry.hp > 0);
    return entity ? `O ataque final está direcionado ao ${entity.name}, não ao Nemesis.\n\nO dano excedente será perdido e, se Nemesis continuar vivo, a equipe perderá. Cancele para trocar o alvo.` : null;
  },
  card(effect) {
    if (!['nemesis-grabbed', 'nemesis-marked'].includes(effect)) return null;
    return { classes: [effect], label: effect === 'nemesis-grabbed' ? 'AGARRADA' : 'MARCADA', title: effect === 'nemesis-grabbed' ? 'Não pode entrar em jogo neste turno; pode ser descartada.' : 'Carta marcada pelo objetivo atual do Nemesis.' };
  },
  decorateCard(element, effect) {
    element.querySelectorAll('.nemesis-infection-overlay, .boss-card-status-nemesis').forEach((node) => node.remove());
    element.classList.remove('nemesis-marked', 'nemesis-grabbed', 'nemesis-contaminated');
    const model = effect === 'nemesis-contaminated'
      ? { classes: [effect], label: 'CONTAMINADO' } : this.card(effect);
    if (!model) return;
    element.classList.add(...model.classes);
    const overlay = element.ownerDocument.createElement('span');
    overlay.className = 'nemesis-infection-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    const status = element.ownerDocument.createElement('span');
    status.className = 'boss-card-status boss-card-status-nemesis';
    status.setAttribute('aria-hidden', 'true');
    status.textContent = `☣ ${model.label}`;
    element.append(overlay, status);
  },
  meldContribution(contribution) {
    const value = contribution?.infectionRelief || 0;
    return value ? { type: 'infection', value, icon: '☣', title: 'Infecção reduzida por este jogo' } : null;
  },
  meld({ boss, meldId }) {
    const zone = boss.impactZone;
    return { divClasses: zone && zone.meldId != null && meldId != null && zone.meldId === meldId && boss.roundNumber <= zone.expiresRound ? ['nemesis-impact-zone'] : [] };
  },
  discard({ gameState }) {
    const intent = gameState.boss?.currentIntent;
    return !gameState.finished && !gameState.boss?.result && intent?.abilityId === 'contaminated_zone'
      && !intent.payload?.resolved && intent.payload?.targetPlayerId === gameState.players?.[gameState.currentPlayer]?.id;
  },
  combatHud({ gameState, playerId }) {
    const boss = gameState.boss;
    const selected = boss.combatTargetsByPlayer[playerId];
    const target = boss.combatEntities.some((entity) => entity.id === selected && entity.status === 'persistent' && entity.hp > 0) ? selected : 'boss';
    const stars = gameState.players.find((player) => player.id === boss.starsPlayerId)?.name || 'nenhum';
    return {
      target, stars, sessionKey: boss.seed, integratedTargets: true,
      choices: boss.combatEntities.some((entity) => entity.status === 'persistent' && entity.hp > 0) ? [{ id: 'boss', name: 'Nemesis', hp: boss.hp, maxHp: boss.maxHp }] : [],
      entities: boss.combatEntities.filter((entity) => ['entering', 'persistent', 'corpse'].includes(entity.status) || (entity.status === 'repelled' && Date.now() - entity.transitionAt < 900)).map((entity) => {
        const reinforced = entity.status === 'persistent' && boss.hordeBuff?.entityId === entity.id && boss.roundNumber <= boss.hordeBuff.expiresRound;
        return { ...entity, selectable: entity.status === 'persistent' && entity.hp > 0, reinforced,
          stateLabel: entity.status === 'persistent' ? reinforced ? 'DEBUFF REFORÇADO' : 'DEBUFF ATIVO' : entity.status === 'entering' ? 'ENTRANDO' : entity.status === 'corpse' ? 'CADÁVER' : 'REPELIDO',
          visualEventId: reinforced ? `${boss.hordeBuff.sourceIntentId}:reinforced` : entity.transitionEventId,
          description: passiveText(boss, entity), help: passiveHelp(entity, reinforced) };
      }),
      effects: [boss.hordeBuff ? `Horda: até fim da rodada ${boss.hordeBuff.expiresRound}` : '', boss.omegaBuff ? `Ômega: até fim da rodada ${boss.omegaBuff.expiresRound}` : ''].filter(Boolean).join(' · '),
    };
  },
});
