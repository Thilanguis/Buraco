import { getNemesisZombieEffect, getNemesisGrabberTarget } from '../mechanics/nemesis.js';
function devourerProgress(boss, gameState) {
  const credits=Math.max(0,Math.floor(Number(boss.devourerFeed?.credits)||0));
  return {text:`Falta${3-credits===1?'':'m'} ${3-credits} carta${3-credits===1?'':'s'} para a próxima cura (${credits}/3).`};
}
const passiveText = (boss, entity) => {
  if (entity.status === 'corpse') return 'CADÁVER · pode ser reanimado';
  if (entity.status === 'entering') return 'INVADINDO · cumpra o objetivo para expulsar';
  if (entity.status === 'repelled') return 'REPELIDO · ameaça expulsa';
  const buff = boss.hordeBuff?.entityId === entity.id && boss.roundNumber <= boss.hordeBuff.expiresRound;
  if (entity.id === 'grabber') return `Após a compra do jogador perseguido: prende ${(entity.mutated ? 2 : 1) + Number(buff)} carta(s) da mão`;
  if (entity.id === 'infected') return `Falha: +${(entity.mutated ? 4 : 2) + (buff ? 2 : 0)} Infecção`;
  return `A cada 3 cartas da equipe: cura ${getNemesisZombieEffect(boss, entity).value} HP`;
};
const passiveHelp = (boss, entity, reinforced, gameState) => {
  const effect = getNemesisZombieEffect(boss, entity);
  const rule = entity.id === 'grabber' ? grabberHelp(effect)
    : entity.id === 'infected' ? 'Cada falha que já causa Infecção acrescenta mais 2; Mutado, mais 4. Reforçado acrescenta outros 2. Falhar na Invasão não causa esse aumento.'
      : devourerHelp(boss, entity, gameState);
  return `${rule} Passiva só com o zumbi ATIVO.${reinforced ? ' Reforço temporário ativo.' : ''}`;
};
function devourerHelp(boss, entity, gameState) {
  return `${devourerProgress(boss,gameState).text}\nA cada 3 cartas novas que vocês jogam na mesa, cura até ${getNemesisZombieEffect(boss,entity).value} HP do Nemesis. As cartas dos dois jogadores somam, mesmo em jogos e turnos diferentes.\nPode curar várias vezes na mesma jogada: 6 cartas dão 2 curas, 9 dão 3. O progresso parcial continua no próximo turno; reorganizar cartas não conta. Quando o Devorador morre, a contagem zera.`;
}
function grabberHelp(effect) {
  return `Persegue um jogador por rodada e troca de jogador na próxima. Depois que o alvo compra do Monte ou Lixo, sorteia até ${effect.value} cartas da mão e prende até o fim do turno.\nCartas agarradas podem ser descartadas, mas não jogadas. Matar o Agarrador libera as cartas. Só prende menos se faltarem cartas ou para preservar uma saída legal.`;
}
function zombieChips(boss, entity, reinforced, gameState) {
  if (entity.status === 'entering') return [{ label: 'INVADINDO', text: 'Cumpra o objetivo para expulsá-lo. Enquanto invade, não pode ser atacado nem usa sua passiva. Se falhar, ele entra na mesa com a vida cheia.' }];
  if (entity.status === 'corpse') return [{ label: 'CADÁVER', text: 'Foi derrotado. Pode voltar por Reanimação Viral; um repelido não é cadáver.' }];
  if (entity.status !== 'persistent' || entity.hp <= 0) return [];
  const effect = getNemesisZombieEffect(boss, entity);
  const rule = entity.id === 'grabber' ? grabberHelp(effect)
    : entity.id === 'infected' ? `Uma falha que aumenta Infecção recebe +${effect.value}, uma vez por evento.\nFalha na invasão não gera esse bônus.`
      : devourerHelp(boss, entity, gameState);
  return [
    { label: 'ATIVO', text: 'Está na mesa: passiva ativa e pode receber dano. Toque na arte para escolhê-lo como alvo.' },
    ...(entity.mutated ? [{ label: 'MUTADO', text: `Mutação da fase 3: ${entity.id === 'grabber' ? 'cartas agarradas' : entity.id === 'infected' ? 'bônus de Infecção por falha' : 'cura por contribuição'} passa de ${effect.normal} para ${effect.mutated}.\nComando da Horda soma seu reforço à parte.` }] : []),
    ...(reinforced ? [{ label: 'REFORÇADO', text: `Comando da Horda: +${effect.bonus} ${entity.id === 'grabber' ? 'carta agarrada' : entity.id === 'infected' ? 'Infecção por falha' : 'HP de cura'}.\nDura até o fim da rodada ${boss.hordeBuff.expiresRound}, inclusive.` }] : []),
    { label: effect.label, text: rule,
      ...(entity.id==='devourer'?{charge:Math.min(3,Math.max(0,Math.floor(Number(boss.devourerFeed?.credits)||0)))}:{}) },
    ...(entity.id === 'grabber' ? [{ label: `ALVO: ${gameState.players.find(p => p.id === getNemesisGrabberTarget(gameState))?.name || '—'}`,
      text: 'Só prende cartas deste jogador nesta rodada. Na próxima rodada, persegue o outro. O primeiro alvo é sorteado no início da batalha.' }] : []),
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
          chips: zombieChips(boss, entity, reinforced, gameState),
          description: passiveText(boss, entity), help: passiveHelp(boss, entity, reinforced, gameState) };
      }),
      effects: [boss.hordeBuff ? `Horda: até fim da rodada ${boss.hordeBuff.expiresRound}` : '', boss.omegaBuff ? `Ômega: até fim da rodada ${boss.omegaBuff.expiresRound}` : ''].filter(Boolean).join(' · '),
    };
  },
});
