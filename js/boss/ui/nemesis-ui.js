import { getNemesisZombieEffect } from '../mechanics/nemesis.js';
const passiveText = (boss, entity) => {
  if (entity.status === 'corpse') return 'CADÁVER · pode ser reanimado';
  if (entity.status === 'entering') return 'INVADINDO · cumpra o objetivo para expulsar';
  if (entity.status === 'repelled') return 'REPELIDO · ameaça expulsa';
  const buff = boss.hordeBuff?.entityId === entity.id && boss.roundNumber <= boss.hordeBuff.expiresRound;
  if (entity.id === 'grabber') return `Após comprar: prende ${(entity.mutated ? 2 : 1) + Number(buff)} carta(s) da mão`;
  if (entity.id === 'infected') return `Falha: +${(entity.mutated ? 4 : 2) + (buff ? 2 : 0)} Infecção`;
  return `3+ cartas no mesmo jogo: cura ${(entity.mutated ? 70 : 40) + (buff ? 30 : 0)} HP, 1x/turno`;
};
const passiveHelp = (entity, reinforced) => {
  const rule = entity.id === 'grabber' ? 'Após comprar do Monte ou Lixo: prende cartas da mão até o fim do turno. Prioriza jogáveis e completa com outras seguras. Não impede descarte.\nNormal: 1; Mutado: 2; Reforçado: 2; ambos: 3. Só prende menos por falta de cartas ou para preservar uma solução obrigatória.'
    : entity.id === 'infected' ? 'Falha com Infecção: +2 (Mutado: +4), uma vez por evento.\nHorda: +2 extra (total +4 normal / +6 Mutado). Falhar na invasão não gera Infecção.'
      : 'Primeira contribuição de 3+ cartas ao mesmo jogo por turno: cura Nemesis 40 HP (Mutado: 70).\nHorda: +30 (70 normal / 100 Mutado). Teto: HP máximo do Nemesis.';
  return `${rule} Passiva só com o zumbi ATIVO.${reinforced ? ' Reforço temporário ativo.' : ''}`;
};
function zombieChips(boss, entity, reinforced) {
  if (entity.status === 'entering') return [{ label: 'INVADINDO', text: 'Cumpra o objetivo de Invasão da Horda para expulsar.\nSem HP de combate, passiva ou seleção de alvo. Falha: ATIVO com HP cheio.' }];
  if (entity.status === 'corpse') return [{ label: 'CADÁVER', text: 'Foi derrotado. Pode voltar por Reanimação Viral; um repelido não é cadáver.' }];
  if (entity.status !== 'persistent' || entity.hp <= 0) return [];
  const effect = getNemesisZombieEffect(boss, entity);
  const rule = entity.id === 'grabber' ? `Após comprar do Monte ou Lixo: prende ${effect.value} cartas da mão. Prioriza jogáveis e completa com outras seguras. Só prende menos por falta de cartas ou proteção necessária.\nNão impede descarte. Libera no fim do turno ou ao matar o Agarrador.`
    : entity.id === 'infected' ? `Uma falha que aumenta Infecção recebe +${effect.value}, uma vez por evento.\nFalha na invasão não gera esse bônus.`
      : `Sua primeira contribuição de 3+ cartas ao mesmo jogo no turno cura Nemesis até ${effect.value} HP.\nUma vez por turno; não ultrapassa o HP máximo do Nemesis.`;
  return [
    { label: 'ATIVO', text: 'Está na mesa: passiva ativa e pode receber dano. Toque na arte para escolhê-lo como alvo.' },
    ...(entity.mutated ? [{ label: 'MUTADO', text: `Mutação da fase 3: ${entity.id === 'grabber' ? 'cartas agarradas' : entity.id === 'infected' ? 'bônus de Infecção por falha' : 'cura por contribuição'} passa de ${effect.normal} para ${effect.mutated}.\nComando da Horda soma seu reforço à parte.` }] : []),
    ...(reinforced ? [{ label: 'REFORÇADO', text: `Comando da Horda: +${effect.bonus} ${entity.id === 'grabber' ? 'carta agarrada' : entity.id === 'infected' ? 'Infecção por falha' : 'HP de cura'}.\nDura até o fim da rodada ${boss.hordeBuff.expiresRound}, inclusive.` }] : []),
    { label: effect.label, text: rule },
  ];
}
export const nemesisBossUi = Object.freeze({
  id: 'nemesis',
  finalStrikeWarning({ gameState, playerId }) {
    const boss = gameState.boss;
    const selected = boss.combatTargetsByPlayer[playerId];
    const entity = boss.combatEntities.find((entry) => entry.id === selected && entry.status === 'persistent' && entry.hp > 0);
    return entity ? `O ataque final está direcionado ao ${entity.name}, não ao Nemesis.\n\nO dano excedente será perdido e, se Nemesis continuar vivo, a equipe perderá. Cancele para trocar o alvo.` : null;
  },
  card(effect) {
    const classes = [...new Set(Array.isArray(effect) ? effect : [effect])].filter(value => ['nemesis-grabbed', 'nemesis-marked'].includes(value));
    if (!classes.length) return null;
    const marked = classes.includes('nemesis-marked'), grabbed = classes.includes('nemesis-grabbed');
    const labels = [marked && 'MARCADA', grabbed && 'AGARRADA'].filter(Boolean);
    return { classes, labels, label: labels.join(' · '), title: [marked && 'Carta marcada pelo objetivo atual do Nemesis.', grabbed && 'Não pode entrar em jogo neste turno; pode ser descartada.'].filter(Boolean).join(' ') };
  },
  decorateCard(element, effect) {
    element.querySelectorAll('.nemesis-infection-overlay, .boss-card-status-nemesis').forEach((node) => node.remove());
    element.classList.remove('nemesis-marked', 'nemesis-grabbed', 'nemesis-contaminated');
    const model = effect === 'nemesis-contaminated'
      ? { classes: [effect], label: 'CONTAMINADA' } : this.card(effect);
    if (!model) return;
    element.classList.add(...model.classes);
    const overlay = element.ownerDocument.createElement('span');
    overlay.className = 'nemesis-infection-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    const status = element.ownerDocument.createElement('span');
    status.className = 'boss-card-status boss-card-status-nemesis';
    status.setAttribute('aria-hidden', 'true');
    if (model.labels?.length > 1) {
      status.classList.add('nemesis-dual-status');
      model.labels.forEach((label, index) => {
        const line = element.ownerDocument.createElement('span');
        line.textContent = `${index === 0 ? '☣ ' : ''}${label}`;
        status.append(line);
      });
    } else status.textContent = `☣ ${model.label}`;
    element.append(overlay, status);
  },
  syncCardTransitions(root, boss, { reducedMotion = false } = {}) {
    const scope = String(boss?.seed);
    const initial = !root._nemesisSeenGrabs || root._nemesisGrabScope !== scope;
    if (initial) { root._nemesisSeenGrabs = new Set(); root._nemesisGrabScope = scope; }
    for (const event of boss?.eventLog || []) {
      if (event.type !== 'nemesisGrab') continue;
      const key = event.actionId || `${event.playerId}:${event.turnId}:${event.cardIds.join(',')}`;
      const unseen = !root._nemesisSeenGrabs.has(key);
      root._nemesisSeenGrabs.add(key);
      if (initial || !unseen || reducedMotion) continue;
      for (const node of root.querySelectorAll('.nemesis-grabbed[data-card-id]')) {
        if (!event.cardIds.includes(node.dataset.cardId)) continue;
        const overlay = node.querySelector('.nemesis-infection-overlay');
        const pulse = overlay?.animate?.([{ opacity: .25 }, { opacity: 1 }], { duration: 650, easing: 'ease-out' });
        if (pulse) pulse.id = 'nemesis-grab-entry';
      }
    }
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
          stateLabel: entity.status === 'persistent' ? reinforced ? 'DEBUFF REFORÇADO' : 'DEBUFF ATIVO' : entity.status === 'entering' ? 'INVADINDO' : entity.status === 'corpse' ? 'CADÁVER' : 'REPELIDO',
          visualEventId: reinforced ? `${boss.hordeBuff.sourceIntentId}:reinforced` : entity.transitionEventId,
          chips: zombieChips(boss, entity, reinforced),
          description: passiveText(boss, entity), help: passiveHelp(entity, reinforced) };
      }),
      effects: [boss.hordeBuff ? `Horda: até fim da rodada ${boss.hordeBuff.expiresRound}` : '', boss.omegaBuff ? `Ômega: até fim da rodada ${boss.omegaBuff.expiresRound}` : ''].filter(Boolean).join(' · '),
    };
  },
});
