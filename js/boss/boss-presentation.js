import { getBossDefinition } from './boss-registry.js';
import { getRestorativeDewHealing } from './boss-balance.js';
import {
  buildBossCompactAction,
  buildBossPresentationDetails,
  buildBossPresentationHelp,
  buildBossPendingChoicePresentation,
  buildBossPresentationRangeMeters,
  buildBossRuleSummary as buildBossRuleSummaryFromAdapter,
  buildBossStatusPresentation,
  getBossActionCategory,
  getBossFinalDangerPresentation,
  getBossPresentationSpeech,
  getBossResultCategory,
  isBossPresentationFeminine,
} from './presentation/boss-presentation-registry.js';

const playerById = (gameState, id) => gameState.players?.find((player) => player.id === id);
const playerName = (gameState, id) => playerById(gameState, id)?.name || (id == null ? '' : `Jogador ${Number(id) + 1}`);
const cardLabel = (gameState, playerId, cardId) => {
  if (!cardId) return '';
  const card = playerById(gameState, playerId)?.hand?.find((entry) => entry.id === cardId);
  return card ? `${card.rank}${card.suit}` : '';
};
const cardLabels = (gameState, playerId, cardIds = []) => cardIds.map((cardId) => cardLabel(gameState, playerId, cardId)).filter(Boolean);
const chains = (gameState, playerId) => gameState.boss?.chainsByPlayer?.[playerId] || 0;

function cardLabelAnywhere(gameState, cardId) {
  if (!cardId) return 'carta marcada';
  const zones = [...(gameState.players || []).map((player) => player.hand || []), ...(gameState.teams || []).flatMap((team) => team.melds || []), gameState.discard || [], gameState.stock || [], ...(gameState.deadPiles || [])];
  const card = zones.flat().find((entry) => entry?.id === cardId);
  return card ? `${card.rank}${card.suit}` : 'carta marcada';
}


function objectiveProgress(currentValue, requiredValue, status = 'active', labels = {}) {
  const required = Math.max(1, Number(requiredValue) || 1);
  const current = Math.max(0, Math.min(required, Number(currentValue) || 0));
  const completed = status === 'success' || (status === 'active' && current >= required);
  const suffix = (label) => label ? ` · ${label}` : '';
  if (completed) return `✅ ${required}/${required}${suffix(labels.success)}`;
  if (status === 'failed') return `❌ ${current}/${required}${suffix(labels.failed)}`;
  if (status === 'cancelled') return `— ${current}/${required}${suffix(labels.cancelled)}`;
  return `⬜ ${current}/${required}${suffix(labels.pending)}`;
}

function stateProgress(status = 'active', labels = {}) {
  if (status === 'success') return `✅ ${labels.success || 'Concluído'}`;
  if (status === 'failed') return `❌ ${labels.failed || 'Falhou'}`;
  if (status === 'cancelled' || status === 'expired') return `— ${labels.cancelled || 'Cancelado'}`;
  return labels.active || 'Ativo';
}

function groupedObjectiveProgress(threats = []) {
  const required = threats.length;
  if (!required) return 'Aguardando';
  const completed = threats.filter((threat) => threat.status === 'success').length;
  const active = threats.some((threat) => threat.status === 'active');
  const failed = threats.filter((threat) => threat.status === 'failed').length;
  const cancelled = threats.filter((threat) => threat.status === 'cancelled').length;
  if (active) return objectiveProgress(completed, required, 'active');
  if (completed === required) return objectiveProgress(completed, required, 'success');
  if (failed) return `❌ ${completed}/${required}`;
  if (cancelled) return `— ${completed}/${required}`;
  return objectiveProgress(completed, required, 'active');
}












const detailFields = (entries) => entries.filter(([, value]) => value !== '' && value != null).map(([label, value]) => `${label}: ${value}`);







function buildBossRangeMeters(gameState, intent) {
  if (!intent?.abilityId) return [];
  return buildBossPresentationRangeMeters(gameState?.boss?.id, {
    gameState,
    intent,
    helpers: { playerById, getRestorativeDewHealing },
  }) || [];
}




function bossAbilityHelpSupplement(gameState, intent) {
  return buildBossPresentationHelp(gameState?.boss?.id, {
    gameState,
    intent,
    helpers: { playerById, playerName, cardLabel, cardLabelAnywhere, getRestorativeDewHealing },
  }) || '';
}

export function buildBossRuleSummary(gameState) {
  return String(buildBossRuleSummaryFromAdapter(gameState?.boss?.id, gameState) || '').trim().replace(/\. (?=[A-ZÁÉÍÓÚÂÊÔÃÕ])/g, '.\n');
}

export function buildBossAbilityHelp(gameState) {
  if (gameState?.boss?.pendingChoices?.length && gameState?.boss?.id !== 'dominadora') return null;
  const intent = gameState?.boss?.currentIntent;
  if (!intent) return null;

  const text = String(bossAbilityHelpSupplement(gameState, intent) || '').trim();
  if (!text) return null;

  return {
    title: intent.name || 'Ajuda da habilidade',
    // Short reading blocks, without truncating rules, deadlines or exceptions.
    text: text.replace(/\. (?=[A-ZÁÉÍÓÚÂÊÔÃÕ])/g, '.\n'),
  };
}


function compactAction(gameState, intent) {
  return buildBossCompactAction(gameState?.boss?.id, {
    gameState,
    intent,
    helpers: {
      playerName,
      playerById,
      cardLabel,
      cardLabels,
      cardLabelAnywhere,
      objectiveProgress,
      groupedObjectiveProgress,
      getRestorativeDewHealing,
    },
  }) || { instruction: intent?.description || 'Habilidade ativa.', progress: '', consequence: '' };
}

function flowResultEvent(gameState) {
  const boss = gameState?.boss;
  if (boss?.bossFlow?.stage !== 'result') return null;
  const actionId = boss.bossFlow.eventActionId;
  if (!actionId) return null;
  return (boss.eventLog || []).find((event) => event.actionId === actionId) || null;
}




function pendingChoicePresentation(gameState, choice) {
  return buildBossPendingChoicePresentation(gameState?.boss?.id, {
    gameState,
    choice,
    helpers: { playerName, cardLabelAnywhere, detailFields },
  }) || {
    category: 'Escolha obrigatoria agora',
    name: 'Decisao obrigatoria',
    speech: '',
    description: '',
    details: detailFields([['Alvo', playerName(gameState, choice?.playerId)], ['Estado', 'a partida permanece pausada ate a decisao']]),
    instruction: `${playerName(gameState, choice?.playerId)} precisa decidir antes de a partida continuar.`,
    progress: '',
    consequence: 'Acoes comuns bloqueadas',
  };
}

export function buildBossActionPresentation(gameState) {
  const pendingChoice = gameState?.boss?.pendingChoices?.[0];
  if (pendingChoice) return pendingChoicePresentation(gameState, pendingChoice);
  const intent = gameState?.boss?.currentIntent;
  const flow = gameState?.boss?.bossFlow;
  const definition = getBossDefinition(gameState?.boss?.id);
  const feminineBoss = isBossPresentationFeminine(definition?.id);
  if (flow?.stage === 'phase') {
    const phaseName = definition?.phaseNames?.[flow.phase] || '';
    return {
      category: `Turno d${feminineBoss ? 'a' : 'o'} ${definition?.name?.replace(/^(A|O) /, '') || 'Chefe'}`,
      name: `FASE ${flow.phase} - ${phaseName}`,
      speech: '',
      description: '',
      details: [],
      instruction: `A batalha entrou na fase ${flow.phase}.`,
      progress: '',
      consequence: '',
    };
  }
  if (flow?.stage === 'taunt') {
    const phaseName = definition?.phaseNames?.[flow.phase] || '';
    return {
      category: `Turno d${feminineBoss ? 'a' : 'o'} ${definition?.name?.replace(/^(A|O) /, '') || 'Chefe'}`,
      name: `FASE ${flow.phase} - ${phaseName}`,
      speech: definition?.phaseTaunts?.[flow.phase] || '',
      description: '',
      details: [],
      instruction: definition?.phaseTaunts?.[flow.phase] || '',
      progress: '',
      consequence: '',
    };
  }
  if (flow?.stage === 'result') {
    const isolatedStatus = buildBossStatusPresentation(gameState?.boss?.id, {
      gameState,
      mode: 'result',
      helpers: { flowResultEvent, objectiveProgress, groupedObjectiveProgress, playerName, playerById, cardLabel, cardLabelAnywhere, detailFields, getBossDefinition, getBossResultCategory, getRestorativeDewHealing },
    });
    if (isolatedStatus) return isolatedStatus;


    const dimitrescuStatus = buildBossStatusPresentation(gameState?.boss?.id, {
      gameState,
      mode: 'persistent',
      helpers: { flowResultEvent, objectiveProgress, groupedObjectiveProgress, playerName, playerById, cardLabel, cardLabelAnywhere, detailFields, getBossDefinition, getBossResultCategory, getRestorativeDewHealing },
    });
    if (dimitrescuStatus) return dimitrescuStatus;


    const isolatedPersistentStatus = buildBossStatusPresentation(gameState?.boss?.id, {
      gameState,
      mode: 'persistent',
      helpers: { flowResultEvent, objectiveProgress, groupedObjectiveProgress, playerName, playerById, cardLabel, cardLabelAnywhere, detailFields, getBossDefinition, getBossResultCategory, getRestorativeDewHealing },
    });
    if (isolatedPersistentStatus) return isolatedPersistentStatus;

    return {
      category: `Turno d${feminineBoss ? 'a' : 'o'} ` + `${definition?.name?.replace(/^(A|O) /, '') || 'Chefe'}`,
      name: 'Preparando nova ordem',
      speech: '',
      description: '',
      details: [],
      instruction: 'O resultado foi registrado. A próxima habilidade será anunciada em instantes.',
      progress: '',
      consequence: '',
    };
  }
  if (intent?.abilityId === 'iron_etiquette') {
    const etiquettePresentation = buildBossStatusPresentation(gameState?.boss?.id, {
      gameState,
      mode: 'etiquette',
      helpers: { flowResultEvent, objectiveProgress, groupedObjectiveProgress, playerName, playerById, cardLabel, cardLabelAnywhere, detailFields, getBossDefinition, getBossResultCategory, getRestorativeDewHealing },
    });
    if (etiquettePresentation) return etiquettePresentation;
  }

  if (intent?.abilityId === 'interdict' || (gameState.boss?.interdicts || []).some((entry) => entry.status === 'active')) {
    const interdictStatus = buildBossStatusPresentation(gameState?.boss?.id, {
      gameState,
      mode: 'interdict',
      helpers: { flowResultEvent, objectiveProgress, groupedObjectiveProgress, playerName, playerById, cardLabel, cardLabelAnywhere, detailFields, getBossDefinition, getBossResultCategory, getRestorativeDewHealing },
    });
    if (interdictStatus) return interdictStatus;
  }

  if (!intent) {
    const dimitrescuStatus = buildBossStatusPresentation(gameState?.boss?.id, {
      gameState,
      mode: 'persistent',
      helpers: { flowResultEvent, objectiveProgress, groupedObjectiveProgress, playerName, playerById, cardLabel, cardLabelAnywhere, detailFields, getBossDefinition, getBossResultCategory, getRestorativeDewHealing },
    });
    if (dimitrescuStatus) return dimitrescuStatus;

    const isolatedPersistentStatus = buildBossStatusPresentation(gameState?.boss?.id, {
      gameState,
      mode: 'persistent',
      helpers: { flowResultEvent, objectiveProgress, groupedObjectiveProgress, playerName, playerById, cardLabel, cardLabelAnywhere, detailFields, getBossDefinition, getBossResultCategory, getRestorativeDewHealing },
    });
    if (isolatedPersistentStatus) return isolatedPersistentStatus;

    return {
      category: 'Acao atual',
      name: 'Aguardando a virada da rodada',
      speech: 'Aguardem.',
      description: 'Nenhuma habilidade esta ativa.',
      details: [],
      instruction: 'A proxima acao sera anunciada na nova rodada.',
      progress: '',
      consequence: '',
    };
  }
  const phase = gameState.boss.phase || 1;
  const payload = intent.payload || {};
  const collarCards = intent.abilityId === 'collar' ? cardLabels(gameState, payload.targetPlayerId, payload.cardIds || (payload.cardId ? [payload.cardId] : [])) : [];
  let details = [];

  const isolatedDetails = buildBossPresentationDetails(gameState.boss.id, {
    gameState,
    intent,
    helpers: { playerName, playerById, cardLabel, cardLabels, chains, cardLabelAnywhere, objectiveProgress, groupedObjectiveProgress, detailFields, getRestorativeDewHealing },
  });
  if (isolatedDetails != null) details = isolatedDetails;

  const compact = compactAction(gameState, intent);

  return {
    category: flow?.stage === 'ability' ? `Turno d${feminineBoss ? 'a' : 'o'} ${definition?.name?.replace(/^(A|O) /, '') || 'Chefe'}` : getBossActionCategory(gameState.boss.id, intent.abilityId),
    name: intent.name,
    speech: getBossPresentationSpeech(gameState.boss.id, intent.abilityId, { gameState, intent, collarCards, helpers: { playerName } }) || intent.name,
    description: intent.description || '',
    details,
    instruction: compact.instruction,
    progress: compact.progress,
    consequence: compact.consequence,
    rangeMeters: buildBossRangeMeters(gameState, intent),
  };
}

export function buildBossResultPresentation(lastEvent) {
  if (!lastEvent) return { category: 'Resultado recente', name: 'Nenhum resultado', speech: '', description: 'Aguardando a primeira resolucao.', details: [] };
  if (lastEvent.type !== 'bossAbility') {
    const value = lastEvent.damage ? `-${lastEvent.damage} HP` : lastEvent.amount ? `${lastEvent.amount}` : '';
    const details = value ? [value] : [];
    if (lastEvent.type === 'bossChoice' && lastEvent.lockedCardLabel) details.push(`Carta presa: ${lastEvent.lockedCardLabel}`);
    return { category: 'Resultado recente', name: lastEvent.name || 'Impacto registrado', speech: '', description: lastEvent.outcome || value || 'Evento concluido.', details };
  }
  const snapshot = lastEvent.presentation || {};
  const details = [...(snapshot.details || [])];
  if (lastEvent.dangerChangeLabel) details.push(lastEvent.dangerChangeLabel);
  return {
    category: getBossResultCategory(lastEvent.abilityId) || 'Resultado recente',
    name: lastEvent.name || 'Habilidade resolvida',
    speech: '',
    description: lastEvent.outcome || 'Habilidade concluida.',
    details,
  };
}

export function buildBossFinalPresentation(gameState) {
  const boss = gameState?.boss;
  const result = boss?.result;
  const definition = getBossDefinition(boss?.id);
  const playersWon = Boolean(result?.victory);
  const finalDanger = getBossFinalDangerPresentation(boss?.id, gameState);
  const finalStrike = [...(boss?.eventLog || [])].reverse().find((entry) => entry.type === 'finalStrike');
  return {
    outcome: playersWon ? 'VITÓRIA' : 'DERROTA',
    bossName: definition?.name || 'Chefe da Mesa',
    portrait: definition?.phasePortraits?.[Math.max(1, Number(boss?.phase) || 1)] || definition?.portrait || '',
    reason: result?.detail || (playersWon ? 'O chefe foi derrotado.' : 'A equipe foi derrotada.'),
    speech: definition?.finalSpeeches?.[playersWon ? 'victory' : 'defeat'] || '',
    hp: `${Math.max(0, boss?.hp || 0)} / ${boss?.maxHp || 0}`,
    dangerLabel: finalDanger.label,
    danger: finalDanger.value,
    totalDamage: Number(boss?.stats?.totalDamage || 0),
    canastras: Number(boss?.stats?.canastrasFormed || 0),
    rounds: Number(boss?.roundNumber || 1),
    finalStrike: Number(boss?.stats?.finalStrike || finalStrike?.damage || 0),
  };
}
