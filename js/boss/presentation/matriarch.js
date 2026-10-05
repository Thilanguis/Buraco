const SPEECHES = Object.freeze({
  living_seed: 'Eu só preciso de uma semente. O resto da mão fará o trabalho.',
  hungry_root: 'Minhas raízes não pedem muito. Só o bastante para continuarem vivas.',
  restorative_dew: 'Cada instante desperdiçado volta para mim em forma de vida.',
  twin_vines: 'Uma raiz distrai. Duas ensinam respeito.',
  graft: 'Agora seus jogos dividem o mesmo caule. Tentem cortar um sem ferir o outro.',
  discard_pollen: 'Até aquilo que vocês jogam fora floresce para mim.',
  harvest: 'Mãos pesadas fazem colheitas generosas.',
  royal_bloom: 'O jardim inteiro despertou. Quero ver qual flor vocês deixam morrer.',
  emerald_cocoon: 'Antes de tocar em mim, terão de atravessar o que eu cultivei.',
  spring_crown: 'Uma ameaça será coroada. Escolham com cuidado o que deixam crescer.',
});

function dialogueTarget(context = {}) {
  const gameState = context.gameState;
  const targetPlayerId = context.intent?.payload?.targetPlayerId;
  if (targetPlayerId == null) return '';
  return context.helpers?.playerName?.(gameState, targetPlayerId)
    || gameState?.players?.find((player) => player.id === targetPlayerId)?.name
    || '';
}


const RESULT_CATEGORIES = Object.freeze({
  living_seed: 'Objetivo resolvido',
  hungry_root: 'Objetivo resolvido',
  restorative_dew: 'Cura resolvida',
  twin_vines: 'Objetivos resolvidos',
  graft: 'Objetivo resolvido',
  discard_pollen: 'Objetivo resolvido',
  harvest: 'Colheita resolvida',
  royal_bloom: 'Objetivos resolvidos',
  emerald_cocoon: 'Protecao encerrada',
  spring_crown: 'Efeito encerrado',
});

const ACTION_CATEGORIES = Object.freeze({
  living_seed: 'Ameaca natural ativa',
  hungry_root: 'Ameaca natural ativa',
  restorative_dew: 'Ameaca natural ativa',
  twin_vines: 'Ameaca natural ativa',
  graft: 'Ameaca natural ativa',
  discard_pollen: 'Ameaca natural ativa',
  harvest: 'Ameaca natural ativa',
  royal_bloom: 'Ameaca natural ativa',
  emerald_cocoon: 'Efeito natural ativo',
  spring_crown: 'Efeito natural ativo',
});

const CROWN_THREAT_NAMES = Object.freeze({
  seed: 'Semente Viva',
  royal_seed: 'Semente Real',
  root: 'Raiz Faminta',
  twin_root: 'Trepadeira',
  royal_root: 'Raiz Real',
  pollen: 'Polen do Lixo',
  royal_pollen: 'Polen Real',
  graft: 'Enxerto',
  dew: 'Orvalho Restaurador',
  harvest: 'Colheita',
});

const ABILITY_NAMES = Object.freeze({
  living_seed: 'Semente Viva',
  hungry_root: 'Raiz Faminta',
  restorative_dew: 'Orvalho Restaurador',
  twin_vines: 'Trepadeiras Gêmeas',
  graft: 'Enxerto',
  discard_pollen: 'Pólen do Lixo',
  harvest: 'Colheita',
  royal_bloom: 'Florescimento Real',
  emerald_cocoon: 'Casulo Esmeralda',
  spring_crown: 'Coroa da Primavera',
});

function natureThreatsForIntent(gameState, intent) {
  if (!intent?.id) return [];
  return (gameState?.boss?.natureThreats || []).filter((threat) => threat.sourceIntentId === intent.id);
}

function helpersFor(context = {}) {
  const helpers = context.helpers || {};
  return {
    playerById: helpers.playerById || ((gameState, id) => gameState?.players?.find((player) => player.id === id)),
    playerName: helpers.playerName || ((gameState, id) => gameState?.players?.find((player) => player.id === id)?.name || (id == null ? '' : `Jogador ${Number(id) + 1}`)),
    cardLabel: helpers.cardLabel || (() => ''),
    cardLabelAnywhere: helpers.cardLabelAnywhere || (() => 'carta marcada'),
    objectiveProgress: helpers.objectiveProgress || ((current, required) => `${current}/${required}`),
    groupedObjectiveProgress: helpers.groupedObjectiveProgress || ((threats = []) => `${threats.filter((threat) => threat.status === 'success').length}/${threats.length}`),
    detailFields: helpers.detailFields || ((entries) => entries.filter(([, value]) => value !== '' && value != null).map(([label, value]) => `${label}: ${value}`)),
    flowResultEvent: helpers.flowResultEvent || (() => null),
    getRestorativeDewHealing: helpers.getRestorativeDewHealing || (() => 0),
  };
}

function royalBloomObjectiveLabel(gameState, threat, helpers) {
  const { playerName, cardLabelAnywhere } = helpers;
  if (threat.type === 'royal_seed') return `Semente: ${playerName(gameState, threat.targetPlayerId)} deve usar ${cardLabelAnywhere(gameState, threat.cardId)}`;
  if (threat.type === 'royal_root') return `Raiz: adicionar 1 carta legal ao Jogo ${Number(threat.meldIndex) + 1}`;
  if (threat.type === 'royal_pollen') return `Pólen: não recolher ${cardLabelAnywhere(gameState, threat.discardCardId)} do lixo`;
  return 'Objetivo natural';
}

function royalBloomProgress(gameState, intent, helpers) {
  const threats = natureThreatsForIntent(gameState, intent);
  if (!threats.length) return 'Objetivos sendo preparados';
  return threats.map((threat) => {
    const marker = threat.status === 'success' ? '✅' : threat.status === 'failed' ? '✕' : threat.status === 'cancelled' ? '—' : '☐';
    const result = threat.status === 'success' ? ' · concluído' : threat.status === 'failed' ? ` · falhou${threat.bloomApplied ? ` (+${threat.bloomApplied} Flor)` : ''}` : threat.status === 'cancelled' ? ' · cancelado sem efeito' : '';
    return `${marker} ${royalBloomObjectiveLabel(gameState, threat, helpers)}${result}`;
  }).join('\n');
}

function compactNatureProgress(gameState, intent, helpers) {
  const { objectiveProgress, groupedObjectiveProgress, playerById, playerName, cardLabelAnywhere } = helpers;
  const threats = natureThreatsForIntent(gameState, intent);
  if (intent.abilityId === 'living_seed') {
    const threat = threats[0];
    return objectiveProgress(threat?.status === 'success' ? 1 : 0, 1, threat?.status || 'active');
  }
  if (intent.abilityId === 'hungry_root') {
    const threat = threats[0];
    if (!threat) return objectiveProgress(0, 1);
    if (threat.strengthened) return objectiveProgress(new Set(threat.contributorPlayerIds || []).size, threat.requiredContributorCount || 2, threat.status);
    return objectiveProgress(threat.status === 'success' ? 1 : new Set(threat.progressCardIds || []).size, 1, threat.status);
  }
  if (intent.abilityId === 'twin_vines') return groupedObjectiveProgress(threats);
  if (intent.abilityId === 'royal_bloom') return royalBloomProgress(gameState, intent, helpers);
  if (intent.abilityId === 'graft') {
    const threat = threats[0];
    return objectiveProgress(threat?.status === 'success' ? 2 : new Set(threat?.fedMeldIds || []).size, 2, threat?.status || 'active');
  }
  if (intent.abilityId === 'discard_pollen') {
    const threat = threats[0];
    if (!threat) return 'Lixo ainda não contaminado';
    const contaminatedCard = cardLabelAnywhere(gameState, threat.discardCardId);
    if (threat.status === 'cancelled') return '✅ CARTA EVITADA · sem efeito';
    if (threat.status === 'failed') {
      const effects = [threat.bloomApplied ? `+${threat.bloomApplied} Flor` : '', threat.healApplied ? `cura ${threat.healApplied} HP` : ''].filter(Boolean).join(' · ');
      return `❌ CARTA CONTAMINADA RECOLHIDA${effects ? ` · ${effects}` : ''}`;
    }
    return `☣️ ${contaminatedCard} no Lixo`;
  }
  if (intent.abilityId === 'harvest') {
    const player = playerById(gameState, intent.payload?.targetPlayerId);
    const threat = threats[0];
    const cards = Number.isFinite(Number(threat?.observedHandSize)) ? Number(threat.observedHandSize) : player?.hand?.length || 0;
    const reductionNeeded = Math.max(0, cards - 7);
    const targetName = player?.name || playerName(gameState, intent.payload?.targetPlayerId) || 'Jogador';
    if (threat?.status === 'success') return `✅ ${targetName} — terminou com ${cards} carta${cards === 1 ? '' : 's'} · meta cumprida`;
    if (threat?.status === 'failed') {
      const result = [threat.bloomApplied ? `+${threat.bloomApplied} Flor` : '', threat.healApplied ? `cura ${threat.healApplied} HP` : ''].filter(Boolean).join(' · ');
      return `✕ ${targetName} — terminou com ${cards} cartas${result ? ` · ${result}` : ''}`;
    }
    if (threat?.status === 'cancelled') return `— ${targetName} — Colheita cancelada`;
    if (cards <= 7) return `✅ ${targetName}: ${cards} cartas`;
    return `☐ ${targetName}: ${cards} cartas · tire ${reductionNeeded}`;
  }
  if (intent.abilityId === 'restorative_dew') {
    const threat = threats[0];
    const current = new Set(threat?.countedCardIds || intent.payload?.countedCardIds || []).size;
    return objectiveProgress(current, 6, threat?.status || 'active', { pending: 'Cura sendo reduzida', failed: 'Cura aplicada' });
  }
  return threats.length ? groupedObjectiveProgress(threats) : '';
}

function springCrownMarkedThreat(gameState) {
  const boss = gameState?.boss;
  const crown = boss?.springCrown;
  const announcedIntent = boss?.currentIntent?.abilityId === 'spring_crown' ? boss.currentIntent : null;
  const markedThreatId = crown?.markedThreatId || announcedIntent?.payload?.markedThreatId || null;
  return markedThreatId ? (boss?.natureThreats || []).find((threat) => threat.id === markedThreatId) || null : null;
}

function crownThreatName(gameState) {
  const boss = gameState?.boss;
  const crown = boss?.springCrown;
  const announcedIntent = boss?.currentIntent?.abilityId === 'spring_crown' ? boss.currentIntent : null;
  const threat = springCrownMarkedThreat(gameState);
  return crown?.markedThreatName || announcedIntent?.payload?.markedThreatName || CROWN_THREAT_NAMES[threat?.type] || threat?.name || 'Ameaca natural';
}

function crownThreatObjective(gameState, threat, helpers) {
  const { playerName, cardLabelAnywhere } = helpers;
  if (!threat) return 'A ameaca marcada nao possui mais um alvo valido.';
  if (['seed', 'royal_seed'].includes(threat.type)) return `${playerName(gameState, threat.targetPlayerId)} deve usar ${cardLabelAnywhere(gameState, threat.cardId)} antes do fim do turno.`;
  if (['pollen', 'royal_pollen'].includes(threat.type)) return `Nao recolher ${cardLabelAnywhere(gameState, threat.discardCardId)} do lixo.`;
  if (['root', 'twin_root', 'royal_root'].includes(threat.type)) return threat.strengthened ? `Cada cooperador deve adicionar uma carta legal ao Jogo ${Number(threat.meldIndex) + 1}.` : `Adicionar uma carta legal ao Jogo ${Number(threat.meldIndex) + 1}.`;
  if (threat.type === 'graft') return 'Adicionar uma carta legal em cada um dos dois jogos ligados.';
  if (threat.type === 'dew') return 'Colocar 6 cartas novas na mesa para zerar a cura preparada.';
  if (threat.type === 'harvest') return `${playerName(gameState, threat.targetPlayerId)} deve terminar o turno com 7 cartas ou menos.`;
  return 'Cumprir a ameaca natural marcada.';
}

function crownThreatCompactObjective(gameState, threat, helpers) {
  const { playerName, cardLabelAnywhere } = helpers;
  if (!threat) return 'Sem alvo válido';
  if (['seed', 'royal_seed'].includes(threat.type)) return `${playerName(gameState, threat.targetPlayerId)}: use ${cardLabelAnywhere(gameState, threat.cardId)}`;
  if (['pollen', 'royal_pollen'].includes(threat.type)) return `Não recolha ${cardLabelAnywhere(gameState, threat.discardCardId)}`;
  if (['root', 'twin_root', 'royal_root'].includes(threat.type)) return threat.strengthened ? `Cada jogador: Jogo ${Number(threat.meldIndex) + 1}` : `Alimente o Jogo ${Number(threat.meldIndex) + 1}`;
  if (threat.type === 'graft') return 'Alimente os 2 jogos';
  if (threat.type === 'dew') return 'Baixe 6 cartas';
  if (threat.type === 'harvest') return `${playerName(gameState, threat.targetPlayerId)}: até 7 cartas`;
  return 'Cumpra o objetivo marcado';
}

function crownThreatProgress(threat) {
  if (!threat) return 'Cancelada sem punicao';
  if (threat.status === 'success') return 'Concluida · Coroa encerrada sem efeito extra';
  if (threat.status === 'failed') return 'Falhou · Raiz Fortalecida preparada';
  if (threat.status === 'cancelled') return 'Cancelada · sem punicao';
  if (['root', 'twin_root', 'royal_root'].includes(threat.type)) {
    const required = threat.strengthened ? threat.requiredContributorCount || 2 : 1;
    const current = threat.strengthened ? new Set(threat.contributorPlayerIds || []).size : Math.min(1, new Set(threat.progressCardIds || []).size);
    return `${current}/${required} · Pendente`;
  }
  if (threat.type === 'graft') return `${new Set(threat.fedMeldIds || []).size}/2 · Pendente`;
  if (threat.type === 'dew') return `${new Set(threat.countedCardIds || []).size}/6 · Pendente`;
  return 'Pendente';
}

export const matriarchBossPresentation = Object.freeze({
  id: 'matriarca_esmeralda',
  feminine: true,
  ruleSummary(gameState) {
    const limit = Math.max(1, Number(gameState?.boss?.maxDanger || 5));
    return `${limit} Flores = derrota · Fase 3: 1 Renascimento com 300 HP ao consumir 1 Flor.`;
  },
  speech(abilityId, context = {}) {
    const target = dialogueTarget(context);
    if (abilityId === 'living_seed' && target) return `Eu só preciso de uma semente, ${target}. O resto da sua mão fará o trabalho.`;
    return SPEECHES[abilityId] || '';
  },
  actionCategory(abilityId) { return ACTION_CATEGORIES[abilityId] || ''; },
  resultCategory(abilityId) { return RESULT_CATEGORIES[abilityId] || ''; },
  finalDanger(gameState) {
    const boss = gameState?.boss || {};
    return { label: 'Florescimento final', value: `${Number(boss.danger || 0)} / ${Number(boss.maxDanger || 0)}` };
  },

  details(context = {}) {
    const { gameState, intent } = context;
    if (!intent) return [];
    const helpers = helpersFor(context);
    const { playerName, cardLabel, detailFields, getRestorativeDewHealing } = helpers;
    const payload = intent.payload || {};
    const target = playerName(gameState, payload.targetPlayerId);
    const card = cardLabel(gameState, payload.targetPlayerId, payload.cardId);
    const meldLabel = (index) => (Number.isInteger(index) ? `Jogo #${index + 1}` : '');
    switch (intent.abilityId) {
      case 'living_seed': return detailFields([['Alvo', target], ['Carta', card], ['Prazo', 'fim do proximo turno do alvo'], ['Falha', '+1 Flor, sem cura']]);
      case 'hungry_root': return detailFields([['Jogo', meldLabel(payload.meldIndex)], ['Prazo', 'fim da rodada'], ['Objetivo', 'adicionar 1 carta legal'], ['Falha', '+1 Flor, sem cura, e pode propagar uma Raiz']]);
      case 'restorative_dew': {
        const threat = natureThreatsForIntent(gameState, intent)[0];
        const counted = new Set(threat?.countedCardIds || payload.countedCardIds || []).size;
        const phase = threat?.announcedPhase || payload.announcedPhase || intent.announcedPhase || gameState?.boss?.phase || 1;
        return detailFields([['Cartas contabilizadas', `${Math.min(counted, 6)}/6`], ['Cura prevista', `${getRestorativeDewHealing(phase, counted)} HP`], ['Faixas', '0-1 / 2-3 / 4-5 / 6+ cartas'], ['Prazo', 'fim da rodada']]);
      }
      case 'twin_vines': return detailFields([['Jogos', (payload.targets || []).map((entry) => meldLabel(entry.meldIndex)).join(' e ')], ['Objetivo', 'alimentar cada jogo separadamente'], ['Falhas da ativação', 'máximo +1 Flor no total, sem cura'], ['Falha dupla', 'pode propagar uma Raiz']]);
      case 'graft': return detailFields([['Jogos ligados', (payload.targets || []).map((entry) => meldLabel(entry.meldIndex)).join(' e ')], ['Objetivo', 'adicionar 1 carta em cada jogo'], ['Falha parcial', '+1 Flor, sem cura'], ['Falha total', '+1 Flor, sem cura, e pode propagar uma Raiz']]);
      case 'discard_pollen': {
        const discardCard = gameState?.discard?.find((entry) => entry.id === payload.discardCardId);
        return detailFields([['Carta', discardCard ? `${discardCard.rank}${discardCard.suit}` : 'topo do lixo'], ['Gatilho', 'pegar a carta contaminada do lixo'], ['Consequência imediata', '+1 Flor e cura de até 40 HP']]);
      }
      case 'harvest': return [];
      case 'royal_bloom': {
        const threats = natureThreatsForIntent(gameState, intent);
        const objectives = threats.length ? threats : (payload.objectives || []).map((objective) => ({ ...objective, type: objective.type === 'seed' ? 'royal_seed' : objective.type === 'root' ? 'royal_root' : 'royal_pollen' }));
        return detailFields([...objectives.map((objective, index) => [`Objetivo ${index + 1}`, royalBloomObjectiveLabel(gameState, objective, helpers)]), ['Falhas da ativação', 'máximo +1 Flor no total, sem cura'], ['Raiz falha', 'pode solicitar uma propagacao']]);
      }
      case 'emerald_cocoon': return detailFields([['Casulo', `${payload.amount || 180} de absorcao`], ['Ruptura', 'canastra limpa ou superior'], ['Fim da rodada', 'cura metade do valor restante']]);
      case 'spring_crown': {
        const threat = springCrownMarkedThreat(gameState);
        return detailFields([['A Coroa marcou', crownThreatName(gameState)], ['Objetivo', crownThreatObjective(gameState, threat, helpers)], ['Progresso', crownThreatProgress(threat)], ['Se cumprir', 'a Coroa termina sem efeito extra'], ['Se falhar', 'Raiz Fortalecida na proxima rodada'], ['Se for cancelada', 'a Coroa termina sem punicao']]);
      }
      default: return detailFields([['Efeito', intent.description || 'ameaca natural ativa']]);
    }
  },

  compactAction(context = {}) {
    const { gameState, intent } = context;
    if (!intent) return null;
    const helpers = helpersFor(context);
    const { playerName, cardLabel, cardLabelAnywhere, getRestorativeDewHealing } = helpers;
    const payload = intent.payload || {};
    const target = playerName(gameState, payload.targetPlayerId);
    const card = cardLabel(gameState, payload.targetPlayerId, payload.cardId);
    switch (intent.abilityId) {
      case 'living_seed': return { instruction: `${target}: use ${card}.`, progress: compactNatureProgress(gameState, intent, helpers), consequence: 'Falha: +1 Flor' };
      case 'hungry_root': return { instruction: `Alimente o Jogo ${Number(payload.meldIndex) + 1}.`, progress: compactNatureProgress(gameState, intent, helpers), consequence: 'Falha: +1 Flor' };
      case 'restorative_dew': {
        const threat = natureThreatsForIntent(gameState, intent)[0];
        const counted = new Set(threat?.countedCardIds || payload.countedCardIds || []).size;
        const phase = threat?.announcedPhase || payload.announcedPhase || intent.announcedPhase || gameState?.boss?.phase || 1;
        return { instruction: 'Baixe cartas para reduzir a cura.', progress: '', consequence: `Cura prevista: ${getRestorativeDewHealing(phase, counted)} HP` };
      }
      case 'twin_vines': return { instruction: `Alimente ${payload.targetCount || payload.targets?.length || 0} jogos marcados.`, progress: compactNatureProgress(gameState, intent, helpers), consequence: 'Uma ou duas falhas: +1 Flor no total' };
      case 'graft': return { instruction: 'Alimente os 2 jogos ligados.', progress: compactNatureProgress(gameState, intent, helpers), consequence: 'Falha parcial ou total: +1 Flor' };
      case 'discard_pollen': {
        const threat = natureThreatsForIntent(gameState, intent)[0];
        const contaminatedCard = cardLabelAnywhere(gameState, threat?.discardCardId || payload.discardCardId);
        return { instruction: `☣️ Não recolha ${contaminatedCard}.`, progress: compactNatureProgress(gameState, intent, helpers), consequence: 'Se vier: +1 Flor · cura até 40 HP' };
      }
      case 'harvest': return { instruction: `${target}: termine com até 7 cartas.`, progress: '', consequence: 'Mais cartas = efeito pior' };
      case 'royal_bloom': return { instruction: 'Cumpra cada objetivo marcado.', progress: compactNatureProgress(gameState, intent, helpers), consequence: 'Falhas: máximo +1 Flor nesta ativação' };
      case 'emerald_cocoon': {
        const boss = gameState?.boss;
        const cocoon = boss?.emeraldCocoon;
        const amount = payload.amount || 180;
        const events = boss?.eventLog || [];
        const activationActionId = intent.immediateEventActionId;
        let activationIndex = activationActionId ? events.findIndex((entry) => entry.actionId === activationActionId) : -1;
        if (activationIndex < 0) activationIndex = events.findLastIndex?.((entry) => entry.type === 'bossAbility' && entry.abilityId === 'emerald_cocoon') ?? -1;
        const eventsAfterActivation = activationIndex >= 0 ? events.slice(activationIndex + 1) : events.slice(-1);
        const breakEvent = [...eventsAfterActivation].reverse().find((entry) => entry.type === 'bossDamage' && entry.cocoonBroken);
        const wasBroken = cocoon?.status === 'broken' || Boolean(breakEvent);
        const absorbed = Math.max(0, amount - (cocoon?.remaining ?? (wasBroken ? 0 : amount)));
        const progress = wasBroken ? '💥 Casulo rompido · proteção encerrada' : cocoon?.status === 'expired' ? `— Casulo encerrado · ${absorbed} de dano absorvido` : cocoon?.status === 'active' ? `Proteção ativa · ${cocoon.remaining}/${amount}` : '— Casulo encerrado';
        return { instruction: 'Dano comum vai para o Casulo.', progress, consequence: wasBroken ? 'Proteção encerrada' : 'Canastra Limpa+ rompe' };
      }
      case 'spring_crown': {
        const crown = gameState?.boss?.springCrown;
        const threat = springCrownMarkedThreat(gameState);
        const name = crownThreatName(gameState);
        const progress = crown?.status === 'root_prepared' ? `❌ ${name}` : crown?.status === 'root_active' ? '🌿 Raiz Fortalecida' : crown?.status === 'completed' ? `✅ ${name}` : crown?.status === 'cancelled' ? `— ${name}` : crownThreatProgress(threat);
        const consequence = crown?.status === 'root_active' ? 'Raiz Fortalecida ativa' : crown?.status === 'root_prepared' ? 'Próxima rodada: Raiz Fortalecida' : crown?.status === 'completed' ? 'Sem efeito extra' : crown?.status === 'cancelled' ? 'Sem punição' : 'Falha: Raiz Fortalecida';
        return { instruction: `Cumpra a ameaça coroada: ${name}.`, progress, consequence };
      }
      default: return null;
    }
  },

  rangeMeters(context = {}) {
    const { gameState, intent } = context;
    if (!intent) return null;
    const helpers = helpersFor(context);
    const { playerById, getRestorativeDewHealing } = helpers;
    const payload = intent.payload || {};
    if (intent.abilityId === 'harvest') {
      const target = playerById(gameState, payload.targetPlayerId);
      const cards = target?.hand?.length || 0;
      return [{ label: target?.name || 'Alvo', value: cards, unit: cards === 1 ? 'carta' : 'cartas', max: Math.max(14, cards), tone: cards >= 11 ? 'danger' : cards >= 8 ? 'warning' : 'safe', currentEffect: cards >= 11 ? '+1 FLOR · CURA 80 HP' : cards >= 8 ? 'CURA 50 HP' : 'SEM EFEITO', segments: [{ from: 0, to: 7, label: '0–7', effect: 'sem efeito', tone: 'safe' }, { from: 8, to: 10, label: '8–10', effect: 'cura 50 HP', tone: 'warning' }, { from: 11, to: null, label: '11+', effect: '+1 Flor · cura 80 HP', tone: 'danger' }] }];
    }
    if (intent.abilityId === 'restorative_dew') {
      const threat = natureThreatsForIntent(gameState, intent)[0];
      const counted = new Set(threat?.countedCardIds || payload.countedCardIds || []).size;
      const phase = threat?.announcedPhase || payload.announcedPhase || intent.announcedPhase || gameState?.boss?.phase || 1;
      const healing = getRestorativeDewHealing(phase, counted);
      return [{ label: 'Cartas novas na mesa', value: counted, unit: counted === 1 ? 'carta' : 'cartas', max: Math.max(6, counted), tone: counted >= 6 ? 'safe' : counted >= 2 ? 'warning' : 'danger', currentEffect: healing > 0 ? `CURA ${healing} HP` : 'CURA ZERADA', segments: [{ from: 0, to: 1, label: '0–1', effect: `cura ${getRestorativeDewHealing(phase, 0)} HP`, tone: 'danger' }, { from: 2, to: 3, label: '2–3', effect: `cura ${getRestorativeDewHealing(phase, 2)} HP`, tone: 'warning' }, { from: 4, to: 5, label: '4–5', effect: `cura ${getRestorativeDewHealing(phase, 4)} HP`, tone: 'warning' }, { from: 6, to: null, label: '6+', effect: 'cura 0', tone: 'safe' }] }];
    }
    return null;
  },

  help(context = {}) {
    const { gameState, intent } = context;
    if (!intent) return null;
    const helpers = helpersFor(context);
    switch (intent.abilityId) {
      case 'living_seed':
        return 'A carta marcada precisa entrar legalmente em um jogo antes do fim do próximo turno do alvo. Se isso não acontecer, a Semente floresce e acrescenta 1 Flor. Descartar a carta não cumpre o objetivo.';
      case 'hungry_root':
        return 'Adicione 1 carta legal ao jogo nesta rodada. Falha: +1 Flor e pode nascer outra Raiz na próxima rodada. A Raiz propagada não se propaga de novo.';
      case 'restorative_dew':
        return 'Cada carta nova colocada legalmente na mesa reduz a cura prevista do Orvalho por faixas. O medidor mostra a faixa atual; com 6 ou mais cartas novas, a cura cai a zero.';
      case 'twin_vines':
        return 'Os jogos marcados são objetivos separados: cada um precisa receber ao menos 1 carta legal nesta rodada. Uma ou duas raízes sem alimentação geram +1 Flor no total nesta ativação. Falha dupla ainda pode propagar uma Raiz.';
      case 'graft':
        return 'Alimente os dois jogos ligados nesta rodada. Falha parcial ou total: +1 Flor no total. Falha total ainda pode propagar uma Raiz.';
      case 'discard_pollen':
        return 'A carta contaminada é o topo atual do Lixo. Se alguém recolher esse topo enquanto o Pólen estiver ativo, a Matriarca ganha 1 Flor e cura; comprar do Monte ou deixar o topo passar evita o gatilho.';
      case 'harvest':
        return 'A Colheita olha a quantidade de cartas na mão do alvo no fim do turno. 0–7 não gera efeito; 8–10 cura 50 HP; 11 ou mais acrescenta 1 Flor e cura 80 HP.';
      case 'royal_bloom':
        return 'Florescimento Real combina vários objetivos naturais, mas cada um é resolvido separadamente. Uma ou várias falhas geram no máximo +1 Flor nesta ativação. Cumprir todos evita a punição; raízes falhas ainda podem propagar.';
      case 'emerald_cocoon':
        return 'Casulo absorve 180 de dano; o excesso atinge o HP. Limpa ou superior rompe imediatamente. Se sobreviver à rodada, metade da proteção restante vira cura.';
      case 'spring_crown': {
        const threat = springCrownMarkedThreat(gameState);
        const name = crownThreatName(gameState);
        const objective = crownThreatObjective(gameState, threat, helpers);
        return `Coroa: ${name}. Faça: ${objective}. Falha: Raiz Fortalecida na próxima rodada; cada cooperador precisa contribuir. Essa Raiz não se propaga de novo.`;
      }
      default:
        return null;
    }
  },

  status(context = {}) {
    const { gameState } = context;
    const boss = gameState?.boss;
    if (boss?.id !== 'matriarca_esmeralda') return null;
    const helpers = helpersFor(context);
    const { flowResultEvent, detailFields } = helpers;
    const event = flowResultEvent(gameState);
    const crown = boss.springCrown;
    const relatedCrownEvent = event?.type === 'springCrown' ? event : event?.type === 'natureThreat' && crown?.markedThreatId === event.threatId && crown?.resolvedEventId ? (boss.eventLog || []).find((entry) => entry.actionId === crown.resolvedEventId) || null : null;
    if (relatedCrownEvent) {
      const markedName = relatedCrownEvent.markedThreatName || crownThreatName(gameState);
      const threatEvent = event?.type === 'natureThreat' ? event : (boss.eventLog || []).find((entry) => entry.type === 'natureThreat' && entry.threatId === relatedCrownEvent.threatId && entry.status === relatedCrownEvent.status) || null;
      const failed = relatedCrownEvent.status === 'failed';
      const succeeded = relatedCrownEvent.status === 'success';
      const rootState = crown?.status === 'root_active' ? 'Raiz Fortalecida ativa' : 'Raiz Fortalecida preparada para a próxima rodada';
      const originalEffects = [threatEvent?.bloomApplied ? `+${threatEvent.bloomApplied} Flor${threatEvent.bloomApplied === 1 ? '' : 'es'}` : '', threatEvent?.healApplied ? `+${threatEvent.healApplied} HP` : ''].filter(Boolean);
      return { category: failed ? 'Objetivo não concluído' : succeeded ? 'Objetivo concluído' : 'Objetivo cancelado', name: 'Coroa da Primavera', speech: '', description: '', details: detailFields([['Ameaça marcada', markedName], ['Efeito da ameaça', originalEffects.join(' · ')]]), instruction: relatedCrownEvent.outcome || 'A Coroa da Primavera foi resolvida.', progress: failed ? `❌ ${markedName} não cumprida` : succeeded ? `✅ ${markedName} cumprida` : `— ${markedName} cancelada`, consequence: failed ? [...originalEffects, rootState].join(' · ') : succeeded ? 'Sem efeito extra' : 'Sem punição' };
    }
    if (event?.type === 'bossAbility' && ABILITY_NAMES[event.abilityId]) {
      const currentIntent = boss.currentIntent;
      const sameAbility = currentIntent?.abilityId === event.abilityId;
      const sameResolution = !currentIntent?.immediateEventActionId || currentIntent.immediateEventActionId === event.actionId;
      const intent = sameAbility && sameResolution ? currentIntent : null;
      if (!intent) return { category: 'Efeito registrado', name: ABILITY_NAMES[event.abilityId], speech: '', description: '', details: event.abilityId === 'harvest' ? [] : [...(event.presentation?.details || [])], instruction: event.outcome || 'A habilidade foi registrada.', progress: '', consequence: '' };
      const compact = this.compactAction({ ...context, intent });
      return { category: ACTION_CATEGORIES[intent.abilityId] || 'Efeito ativo', name: intent.name || ABILITY_NAMES[event.abilityId], speech: '', description: '', details: this.details({ ...context, intent }), instruction: compact.instruction, progress: compact.progress, consequence: compact.consequence };
    }
    if (event?.type !== 'natureThreat') return null;
    const threat = (boss.natureThreats || []).find((entry) => entry.id === event.threatId);
    if (!threat) return null;
    const abilityId = threat.sourceAbilityId;
    const sourceIntentId = threat.sourceIntentId;
    const related = (boss.natureThreats || []).filter((entry) => entry.sourceIntentId === sourceIntentId);
    const intent = { id: sourceIntentId, abilityId, payload: { targetPlayerId: threat.targetPlayerId, countedCardIds: threat.countedCardIds || [] } };
    const completed = related.filter((entry) => entry.status === 'success').length;
    const failed = related.filter((entry) => entry.status === 'failed').length;
    const active = related.some((entry) => entry.status === 'active');
    const category = active ? 'Ameaça natural ativa' : failed ? 'Objetivo não concluído' : completed === related.length ? 'Objetivo concluído' : 'Objetivo resolvido';
    return { category, name: ABILITY_NAMES[abilityId] || threat.name || 'Ameaça natural', speech: '', description: '', details: detailFields([['Objetivos concluídos', related.length > 1 ? `${completed}/${related.length}` : ''], ['Flores aplicadas', event.bloomApplied || ''], ['Cura aplicada', event.healApplied ? `${event.healApplied} HP` : '']]), instruction: event.outcome || 'A ameaça natural foi resolvida.', progress: compactNatureProgress(gameState, intent, helpers), consequence: event.bloomApplied || event.healApplied ? [event.bloomApplied ? `+${event.bloomApplied} Flor${event.bloomApplied === 1 ? '' : 'es'}` : '', event.healApplied ? `+${event.healApplied} HP` : ''].filter(Boolean).join(' · ') : 'Sem consequência adicional' };
  },
});
